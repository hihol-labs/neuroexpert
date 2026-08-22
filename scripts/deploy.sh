#!/bin/bash
# =============================================================================
# НейроЭксперт — Deploy to production (ADR-002: SHA-pinned, fail-loud)
# Запуск с локальной машины: bash scripts/deploy.sh
#
# Контракт:
#   - Деплоится ровно DEPLOY_SHA (по умолчанию локальный HEAD), не origin/main.
#     Если SHA нет на origin — скрипт падает с подсказкой «сначала git push».
#   - Основной путь доставки — DEPLOY_MODE=artifact: локально мнётся
#     `git archive DEPLOY_SHA`, digest сверяется на сервере. На проде НЕТ .git
#     (там rsync-дерево), поэтому checkout по SHA неприменим. DEPLOY_MODE=git —
#     легаси-путь для сервера с git-клоном.
#   - Инвариант «деплоим только опубликованное» проверяется ЛОКАЛЬНО (на сервере
#     проверять нечем). Осознанный обход — ALLOW_UNPUSHED=1, печатается громко.
#   - Кандидат обязан быть привязан к квитанции pre-deploy гейта: git-tree
#     DEPLOY_SHA обязан совпасть с candidate.reviewedTree PASSED-квитанции
#     (шаг 0). Инцидент 2026-08-16: коммит документации в середине деплоя
#     незаметно подменил кандидата. Осознанный обход — ALLOW_UNGATED=1.
#   - Транспорт под WARP: артефакт льётся ПОТОКОМ через ssh "cat > файл", а не
#     scp — SFTP-канал рвётся стабильно, поток проходит. Каждый сетевой вызов
#     под таймаутом; транспортные сбои (таймаут, обрыв ssh) ретраятся.
#     Ретрай безопасен: мутирующие удалённые шаги сериализованы на сервере
#     через flock (второй экземпляр ждёт первый, а не работает рядом с ним),
#     сами шаги идемпотентны (rsync --delete, docker build/up, миграции с
#     трекингом checksum и проверкой внутри транзакции), а lock переживает
#     повтор по ownership-токену.
#   - Миграции трекаются в public.neuroexpert_migrations (public.neuroexpert_migrations
#     занята внутренней таблицей Supabase-сервиса); ошибка миграции валит деплой.
#   - «Деплой завершён» печатается ТОЛЬКО после: health зелёный И
#     /api/version отдаёт DEPLOY_SHA. Иначе exit 1.
# =============================================================================

set -euo pipefail

SERVER="${SERVER:-hostland}"
APP_DIR="/opt/neuroexpert"
DOMAIN="neuroexpertise.ru"
DEPLOY_SHA="${DEPLOY_SHA:-$(git rev-parse HEAD)}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DEPLOY_MODE="${DEPLOY_MODE:-artifact}"      # artifact (по умолчанию) | git
ALLOW_UNPUSHED="${ALLOW_UNPUSHED:-0}"
ALLOW_UNGATED="${ALLOW_UNGATED:-0}"
GATE_RECEIPT="${GATE_RECEIPT:-}"            # пусто = искать среди всех квитанций

# --- Транспорт: таймауты и ретраи -------------------------------------------
# Соединение под WARP умирает МОЛЧА: два зависания стоили ~12 часов, потому что
# «процесс жив» принималось за «деплой идёт». Поэтому у каждого сетевого вызова
# есть потолок времени, а обрыв виден как ошибка, а не как тишина.
# ServerAlive* убивает сессию, которая перестала отвечать, не дожидаясь TCP.
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15
          -o ServerAliveInterval=15 -o ServerAliveCountMax=4)
NET_RETRIES="${NET_RETRIES:-3}"             # попыток на сетевой шаг
NET_BACKOFF="${NET_BACKOFF:-5}"             # базовая пауза между попытками, с
T_SHORT="${T_SHORT:-120}"                   # короткие команды (lock, .env, health-пробы)
T_UPLOAD="${T_UPLOAD:-900}"                 # заливка артефакта
T_SYNC="${T_SYNC:-600}"                     # распаковка + rsync на сервере
T_BUILD="${T_BUILD:-3600}"                  # docker build + up
T_MIGRATE="${T_MIGRATE:-1200}"              # миграции
T_HEALTH="${T_HEALTH:-300}"                 # ожидание health + проверка версии

# Дольше этого суммарного потолка деплой идти не может, значит lock старше —
# действительно брошенный. Переопределяется только осознанно.
# Потолок учитывает РЕТРАИ: потерянный ответ запускает шаг заново, и живой
# деплой законно идёт дольше одной суммы потолков (находка раунда 21).
STEP_CEILING=$(( T_UPLOAD + T_SYNC + T_BUILD + T_MIGRATE + 2 * T_HEALTH ))
BACKOFF_TOTAL=$(( NET_BACKOFF * NET_RETRIES * (NET_RETRIES + 1) / 2 * 5 ))
STALE_AFTER="${STALE_AFTER:-$(( STEP_CEILING * NET_RETRIES + BACKOFF_TOTAL + 600 ))}"

# Временные файлы удалённых шагов: heredoc нельзя переиспользовать при ретрае
# (stdin вычитан первой попыткой), поэтому тело каждого удалённого шага живёт
# в файле и перенаправляется заново на каждой попытке.
TMPDIR_RUN="$(mktemp -d -t nx-deploy-XXXXXX)"

# Состояние удалённой стороны, которое надо прибрать на ЛЮБОМ выходе.
# ERR-trap для этого не годится: `exit 1` его не вызывает, а таких выходов в
# скрипте много (пустой манифест, отказ mv, красный health) — каждый оставлял
# lock и недоставленный .part (находки раундов 14 и 15).
LOCK_TAKEN=0
REMOTE_PARTS=""   # список недоубранных кусков (по одному на попытку)

cleanup_on_exit() {
  local rc=$?
  if [ -n "$REMOTE_PARTS" ]; then
    # Каждая попытка пишет в СВОЙ файл, поэтому убирать надо все, а не только
    # последний: иначе оборванные куски копятся в /tmp (находка раунда 21).
    ssh_cmd "$T_SHORT" "уборка .part" "rm -f $REMOTE_PARTS" >/dev/null 2>&1 \
      || echo "  ! Не смог убрать куски артефакта ($REMOTE_PARTS) — удали вручную."
    REMOTE_PARTS=""
  fi
  if [ "$LOCK_TAKEN" = "1" ]; then
    # Печатается ЯВНО: оператор должен видеть, что состояние сервера прибрано,
    # а тест — отличить сработавшую уборку от пропущенной.
    echo "  → Снимаю deploy-lock на выходе (код $rc)"
    release_lock
  fi
  rm -rf "$TMPDIR_RUN"
  return "$rc"
}
trap cleanup_on_exit EXIT

# Ретраятся ТОЛЬКО транспортные сбои: 124 (сработал timeout) и 255 (ssh не
# смог соединиться / соединение оборвалось). Ненулевой код удалённой команды —
# это отказ по существу (упавшая миграция, красный health), его повторять
# нельзя: он должен свалить деплой громко и сразу.
net_retryable() { [ "$1" = "124" ] || [ "$1" = "255" ]; }

# ssh_cmd <timeout> <label> <команда одной строкой>
# stdin закрыт (/dev/null): удалённая команда не должна съесть наш ввод.
ssh_cmd() {
  local timeout_s="$1" label="$2" cmd="$3" attempt=1 rc=0
  while :; do
    rc=0
    timeout "$timeout_s" ssh "${SSH_OPTS[@]}" "$SERVER" "$cmd" </dev/null || rc=$?
    [ "$rc" = "0" ] && return 0
    if net_retryable "$rc" && [ "$attempt" -lt "$NET_RETRIES" ]; then
      echo "  ! $label: транспортный сбой (код $rc), попытка $((attempt+1))/$NET_RETRIES через $((NET_BACKOFF*attempt))с"
      sleep $((NET_BACKOFF*attempt)); attempt=$((attempt+1)); continue
    fi
    if net_retryable "$rc"; then
      echo "  ✗ $label: связь не восстановилась за $NET_RETRIES попыток (код $rc)"
    fi
    return "$rc"
  done
}

# ssh_script <timeout> <label> <файл-со-скриптом> [аргументы удалённого скрипта…]
ssh_script() {
  local timeout_s="$1" label="$2" script="$3"; shift 3
  local attempt=1 rc=0
  while :; do
    rc=0
    timeout "$timeout_s" ssh "${SSH_OPTS[@]}" "$SERVER" bash -s -- "$@" < "$script" || rc=$?
    [ "$rc" = "0" ] && return 0
    if net_retryable "$rc" && [ "$attempt" -lt "$NET_RETRIES" ]; then
      echo "  ! $label: транспортный сбой (код $rc), попытка $((attempt+1))/$NET_RETRIES через $((NET_BACKOFF*attempt))с"
      sleep $((NET_BACKOFF*attempt)); attempt=$((attempt+1)); continue
    fi
    if net_retryable "$rc"; then
      echo "  ✗ $label: связь не восстановилась за $NET_RETRIES попыток (код $rc)"
    fi
    return "$rc"
  done
}

if [ "$DEPLOY_MODE" != "artifact" ] && [ "$DEPLOY_MODE" != "git" ]; then
  echo "✗ DEPLOY_MODE должен быть artifact или git, получено: '$DEPLOY_MODE'"
  exit 1
fi

# DEPLOY_SHA — только полный 40-hex SHA (никаких символических refs).
if ! [[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "✗ DEPLOY_SHA должен быть полным 40-hex SHA, получено: '$DEPLOY_SHA'"
  exit 1
fi
# DEPLOY_BRANCH — только имя ветки, не rev-выражение (main~2 и т.п.).
if ! [[ "$DEPLOY_BRANCH" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || [[ "$DEPLOY_BRANCH" == *..* ]]; then
  echo "✗ DEPLOY_BRANCH содержит недопустимые символы: '$DEPLOY_BRANCH'"
  exit 1
fi

echo "=== НейроЭксперт: Deploy ==="
echo "→ SHA: $DEPLOY_SHA (ветка: $DEPLOY_BRANCH, режим: $DEPLOY_MODE)"

# Любой сбой после захвата lock снимает его, но ТОЛЬКО свой: lock несёт
# ownership-токен (ревью-находка r6: безусловный trap второго запуска,
# упавшего на «lock busy», удалял lock первого и открывал третий параллельный).
# Токен обязан быть уникален МЕЖДУ МАШИНАМИ: PID+секунда совпадают у двух
# параллельных запусков с разных хостов, и каждый принял бы чужой lock за свой
# (находка раунда 6). Добавлены имя хоста и случайные байты.
RUN_ID="$(hostname -s 2>/dev/null || echo host)-$$-$(date +%s)-$(head -c 6 /dev/urandom | od -An -tx1 | tr -d ' \n')"

# Снятие lock идёт под таймаутом: на аварийном пути связь как раз и могла
# отвалиться, и висящий навсегда trap прятал бы исходную ошибку.
# Провал снятия глушить нельзя: молча оставленный lock блокирует следующий
# деплой, а причина теряется (находка раунда 2). Код возврата не роняет скрипт
# (на аварийном пути уже есть своя ошибка), но громко называет, что чинить руками.
release_lock() {
  local rc=0
  # Удалённая команда сама сообщает исход: `|| true` в конце маскировал бы и
  # неудачное rm (нет прав, занят диск) — ssh отдавал 0, предупреждение не
  # печаталось, и следующий деплой упирался в оставшийся lock (находка раунда 3).
  # Чужой lock — это НЕ ошибка (мы его и не должны трогать), поэтому выход 0.
  # Три исхода вместо двух: lock мой (снимаю), lock чужой или его нет (0, не
  # моё дело), lock есть, а владелец не читается — это НЕ «чужой»: чаще всего
  # это наш же оборванный запуск, и молчать про него нельзя (находка раунда 6).
  ssh_cmd "$T_SHORT" "release lock" \
    "if [ ! -e $APP_DIR/.deploy.lock ]; then exit 0; fi; \
     owner=\$(cat $APP_DIR/.deploy.lock/owner 2>/dev/null || true); \
     if [ -z \"\$owner\" ]; then exit 5; fi; \
     if [ \"\$owner\" = \"$RUN_ID\" ]; then \
       rm -rf $APP_DIR/.deploy.lock && [ ! -e $APP_DIR/.deploy.lock ]; \
     else exit 0; fi" \
    >/dev/null 2>&1 || rc=$?
  LOCK_TAKEN=0
  if [ "$rc" = "5" ]; then
    LOCK_STUCK=1
    echo "  ! На сервере есть deploy-lock без читаемого owner — снять сам не могу."
    echo "  ! Проверь и убери руками: ssh $SERVER 'ls -la $APP_DIR/.deploy.lock'"
    return 0
  fi
  if [ "$rc" != "0" ]; then
    LOCK_STUCK=1
    echo "  ! deploy-lock НЕ снят (код $rc): связь оборвалась на снятии."
    echo "  ! Следующий деплой упрётся в чужой lock. Снять вручную:"
    echo "  !   ssh $SERVER 'rm -rf $APP_DIR/.deploy.lock'  # проверь owner=$RUN_ID"
  fi
  return 0
}
LOCK_STUCK=0

# Прерывание с клавиатуры и TERM — тот же аварийный выход, что и ошибка: без
# них Ctrl+C оставлял lock на сервере. После снятия выходим с кодом сигнала,
# а не притворяемся успехом.
on_signal() {
  echo ""
  echo "  ! Прервано сигналом — снимаю свой deploy-lock."
  release_lock
  exit 130
}
trap 'release_lock' ERR
trap 'on_signal' INT TERM

# --- 0. Привязка кандидата к квитанции гейта ---
# Инцидент 2026-08-16: deploy.sh брал HEAD, а гейт одобрял другое дерево, и
# коммит документации, сделанный в середине деплоя, молча стал кандидатом.
# Проверка структурная: у деплоимого коммита обязана быть PASSED-квитанция
# ровно на его git-tree.
echo "[0/6] Сверка кандидата с квитанцией гейта..."
# GATE_UNIT обязателен: без него допуск строится только на совпадении дерева, и
# PASSED-квитанция ДРУГОГО юнита на том же дереве разрешила бы деплой (находка
# раунда 9). Кто деплоит — знает, какой юнит он выкатывает.
if [ -z "${GATE_UNIT:-}" ] && [ "$ALLOW_UNGATED" != "1" ]; then
  echo "  ✗ GATE_UNIT не задан: неизвестно, квитанция какого юнита должна одобрять деплой."
  echo "  → Пример: GATE_UNIT=G-010b:offer-language bash scripts/deploy.sh"
  echo "  → unitId берётся из самой квитанции: grep -h '\"unitId\"' .itd-memory/verification-loop/receipts/*/*adjudication*.json"
  exit 1
fi
GATE_ARGS=(--sha "$DEPLOY_SHA")
[ -n "${GATE_UNIT:-}" ] && GATE_ARGS+=(--unit "$GATE_UNIT")
[ -n "$GATE_RECEIPT" ] && GATE_ARGS+=(--receipt "$GATE_RECEIPT")
if ! node scripts/check-gate-receipt.mjs "${GATE_ARGS[@]}"; then
  if [ "$ALLOW_UNGATED" = "1" ]; then
    echo "  ! ALLOW_UNGATED=1 — осознанный обход: деплоится кандидат, который"
    echo "  !   гейт в этом виде не одобрял. Ровно этот класс подмены стоил"
    echo "  !   разбирательства 2026-08-16."
  else
    echo "  → Осознанный обход (если это точно нужно): ALLOW_UNGATED=1 bash scripts/deploy.sh"
    exit 1
  fi
fi

# --- 1. Lock + доставка кода на сервер ---
echo "[1/6] Lock и доставка кода (режим $DEPLOY_MODE, $DEPLOY_SHA)..."

# Инвариант «деплоится только то, что есть на origin» теперь проверяется ЛОКАЛЬНО:
# на проде нет .git, там проверять нечем. show-ref не парсит rev-выражения.
# Таймаут обязателен: это ЛОКАЛЬНАЯ команда, но сетевой вызов — под мёртвым
# каналом `git fetch` висит молча, и деплой замирает ещё до SSH-доставки
# (находка независимого ревью, раунд 1; ровно тот класс, что стоил двух зависаний).
timeout "${T_FETCH:-60}" git fetch origin --prune >/dev/null 2>&1 \
  || echo "  ! git fetch origin не прошёл за ${T_FETCH:-60}с (сеть?) — сверяю по локальным remote-ref"
TIP="$(git show-ref --hash --verify "refs/remotes/origin/$DEPLOY_BRANCH" 2>/dev/null || true)"
if [ "$TIP" != "$DEPLOY_SHA" ]; then
  if [ "$ALLOW_UNPUSHED" = "1" ]; then
    echo "  ! origin/$DEPLOY_BRANCH tip = '${TIP:-<ветки нет на origin>}'"
    echo "  ! ALLOW_UNPUSHED=1 — осознанный обход: деплоится неопубликованный код,"
    echo "  !   офсайт-копии этого коммита не существует."
  else
    echo "  ✗ origin/$DEPLOY_BRANCH tip = '${TIP:-<ветки нет на origin>}', ожидался $DEPLOY_SHA."
    echo "  → Запушь актуальный HEAD: git push origin HEAD"
    echo "  → Либо осознанно: ALLOW_UNPUSHED=1 bash scripts/deploy.sh"
    exit 1
  fi
fi

# Обе ветки доставки первым делом берут удалённый lock, поэтому флаг ставится
# ДО развилки: в git-ветке он раньше оставался нулём, и явный exit оставлял наш
# lock на сервере без единого слова (находка раунда 16). Лишний вызов
# release_lock безвреден: чужого lock он не трогает и возвращает 0.
LOCK_TAKEN=1

if [ "$DEPLOY_MODE" = "artifact" ]; then
  # Артефакт = ровно tracked-дерево коммита: тот же объект, который принимает
  # pre-release-гейт (git archive DEPLOY_SHA + sha256). Untracked/ignored файлы
  # в него не попадают by construction.
  ART="$(mktemp -t nx-release-XXXXXX.tar)"
  git archive --format=tar "$DEPLOY_SHA" > "$ART"
  DIGEST="$(sha256sum "$ART" | cut -d' ' -f1)"
  echo "  → Артефакт: $(wc -c < "$ART") байт, sha256 $DIGEST"

  # Доставка ПОТОКОМ, не scp: под WARP SFTP-канал рвётся стабильно, а поток
  # через ssh проходит. Пишем во временное имя .part и переименовываем только
  # после сверки digest — оборванная заливка никогда не выглядит как готовый
  # артефакт для следующего шага.
  # Кусок артефакта тоже убирает cleanup_on_exit, каким бы ни был выход.
REMOTE_ART="/tmp/nx-release-$RUN_ID.tar"
REMOTE_PARTS=""   # накапливается по попыткам
  upload_ok=0
  for attempt in $(seq 1 "$NET_RETRIES"); do
    rc=0
    # Имя уникально для попытки: оборванный писатель предыдущей попытки не
    # может дописать буфер в файл, который мы уже проверили и переименовали.
    PART="$REMOTE_ART.part.$attempt"
    REMOTE_PARTS="$REMOTE_PARTS $PART"
    timeout "$T_UPLOAD" ssh "${SSH_OPTS[@]}" "$SERVER" "cat > $PART" < "$ART" || rc=$?
    if [ "$rc" != "0" ]; then
      # Ретраится только транспорт (124/255). Отказ по существу — нет места на
      # диске, нет прав на /tmp — повтором не лечится и обязан свалить деплой
      # сразу и громко, а не после трёх пауз (находка раунда 3).
      if ! net_retryable "$rc"; then
        echo "  ✗ Заливка отвергнута сервером (код $rc) — это не обрыв связи."
        echo "  → Проверь на сервере права и место: ssh $SERVER 'df -h /tmp; ls -ld /tmp'"
        exit 1
      fi
      echo "  ! Заливка оборвалась (код $rc), попытка $((attempt+1))/$NET_RETRIES"
      sleep $((NET_BACKOFF*attempt)); continue
    fi
    # Сверка digest ДО переименования: поток может закрыться «успешно» на
    # усечённом файле, и тогда усечение поймается здесь, а не через два шага.
    # Коды удалённой проверки разведены намеренно: 3 — усечённая заливка (её
    # ЕСТЬ смысл повторить), 4 — отказ переименования (нет прав, нет места:
    # повтор не поможет). Раньше оба выглядели как «не сошёлся digest» и
    # отнимали три паузы перед провалом (находка раунда 4).
    rc=0
    ssh_cmd "$T_SHORT" "digest артефакта" \
      "[ \"\$(sha256sum $PART | cut -d' ' -f1)\" = \"$DIGEST\" ] || exit 3; \
       mv $PART $REMOTE_ART || exit 4" || rc=$?
    if [ "$rc" = "0" ]; then
      upload_ok=1
      # Этот кусок уже переименован в артефакт; остальные (если были) уберёт выход.
      REMOTE_PARTS="${REMOTE_PARTS/ $PART/}"
      break
    fi
    if [ "$rc" = "4" ]; then
      echo "  ✗ Артефакт доставлен, но не переименован на сервере (код 4)."
      echo "  → Проверь права и место: ssh $SERVER 'df -h /tmp; ls -l $PART'"
      exit 1
    fi
    if [ "$rc" != "3" ] && ! net_retryable "$rc"; then
      echo "  ✗ Сверка digest на сервере не выполнилась (код $rc) — это не обрыв связи."
      exit 1
    fi
    echo "  ! Артефакт на сервере не сошёлся по digest (код $rc), перезаливаю ($attempt/$NET_RETRIES)"
    ssh_cmd "$T_SHORT" "очистка .part" "rm -f $PART" >/dev/null 2>&1 || true
    sleep $((NET_BACKOFF*attempt))
  done
  rm -f "$ART"
  if [ "$upload_ok" != "1" ]; then
    echo "  ✗ Артефакт не доставлен за $NET_RETRIES попыток. Деплой НЕ начат."
    exit 1
  fi
  echo "  → Артефакт доставлен потоком, digest на сервере ✓"

  cat > "$TMPDIR_RUN/step1-artifact.sh" <<'REMOTE'
set -euo pipefail
# --- Сериализация шага на сервере (см. комментарий у ssh_script) -------------
exec 9>"/tmp/neuroexpert-deploy.step.lock" || { echo "  ✗ не открыть lock шага"; exit 1; }
# Файл намеренно ВНЕ /opt/neuroexpert: rsync --delete и git clean снесли бы
# его вместе с деревом релиза, а flock держится за inode — второй процесс
# создал бы новый файл и вошёл рядом с первым (находка раунда 21).
if ! flock -w 1800 9; then
  echo "  ✗ Предыдущий экземпляр этого шага всё ещё выполняется (ждал 30 минут)."
  echo "  → Это ретрай после потерянного ответа. Дождись завершения и повтори деплой."
  exit 1
fi
DEPLOY_SHA="$1"; RUN_ID="$2"; DIGEST="$3"; STALE_AFTER="${4:-7200}"
APP_DIR="/opt/neuroexpert"
LOCK="$APP_DIR/.deploy.lock"
mkdir -p "$APP_DIR"

# Deploy-lock: один запуск за раз. Порог протухания НЕ константа: одна только
# сборка допускает T_BUILD секунд, и фиксированный час позволял второму запуску
# увести lock у ЖИВОГО деплоя — шаги двух релизов чередовались бы, а первый
# отрапортовал бы успех о смешанном состоянии (находка раунда 20). Считаем от
# суммы потолков всех шагов плюс запас.
if ! mkdir "$LOCK" 2>/dev/null; then
  OWNER="$(cat "$LOCK/owner" 2>/dev/null || true)"
  AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK") ))
  if [ "$OWNER" = "$RUN_ID" ]; then
    # Наш собственный lock: шаг переигрывается после транспортного обрыва.
    # Без этой ветки ретрай сетевого сбоя утыкался бы в свой же lock.
    echo "  → Повтор шага после обрыва связи, lock свой (${AGE}s)"
  elif [ "$AGE" -gt "$STALE_AFTER" ]; then
    echo "  → Stale lock (${AGE}s > ${STALE_AFTER}s), переустанавливаю"
    rm -rf "$LOCK" && mkdir "$LOCK"
  else
    echo "  ✗ Идёт другой деплой (lock ${AGE}s). Повтори позже или удали $LOCK"
    exit 1
  fi
fi
date +%s > "$LOCK/started"
printf '%s\n' "$RUN_ID" > "$LOCK/owner"

# Шаг обязан переживать ПОВТОР: ответ мог потеряться уже после того, как
# сервер всё сделал и удалил артефакт. Тогда повтор с тем же RUN_ID видит
# собственную отметку и завершается успехом, а не падает на пропавшем файле
# (находка ревью, раунд 5).
if [ ! -f "/tmp/nx-release-$RUN_ID.tar" ]; then
  if [ "$(cat "$APP_DIR/.release-run" 2>/dev/null)" = "$RUN_ID" ] \
     && [ "$(cat "$APP_DIR/.release-sha" 2>/dev/null)" = "$DEPLOY_SHA" ]; then
    echo "  → Шаг уже выполнен этим запуском (.release-run = $RUN_ID), повтор пропущен"
    exit 0
  fi
  echo "  ✗ артефакт /tmp/nx-release-$RUN_ID.tar не найден, а дерево этим запуском не синхронизировано"
  rm -rf "$LOCK"; exit 1
fi

# Digest обязан совпасть с локально посчитанным: доставили ровно то, что мнули.
ACTUAL="$(sha256sum "/tmp/nx-release-$RUN_ID.tar" | cut -d' ' -f1)"
if [ "$ACTUAL" != "$DIGEST" ]; then
  echo "  ✗ digest артефакта на сервере '$ACTUAL' != локального '$DIGEST'"
  rm -rf "$LOCK"; exit 1
fi

STAGE="$APP_DIR/.release-stage"
rm -rf "$STAGE"; mkdir -p "$STAGE"
tar -xf "/tmp/nx-release-$RUN_ID.tar" -C "$STAGE"
[ -f "$STAGE/docker/docker-compose.prod.yml" ] \
  || { echo "  ✗ артефакт не похож на дерево проекта (нет docker-compose.prod.yml)"; rm -rf "$LOCK"; exit 1; }

# Дерево приводится к артефакту ровно (--delete): stale-файлы, включая untracked
# и ignored, уходят из build context. Сохраняются только серверные runtime-файлы
# и локальное состояние сервера (.env, рендеренный kong.yml, lock, бэкапы).
rsync -a --delete \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'docker/supabase/kong.yml' \
  --exclude '.deploy.lock' \
  --exclude '.release-stage' \
  --exclude '.release-sha' \
  --exclude '.release-run' \
  --exclude '.deploy-backups' \
  "$STAGE/" "$APP_DIR/"

printf '%s\n' "$DEPLOY_SHA" > "$APP_DIR/.release-sha"
# Отметка «этот запуск довёл шаг до конца» пишется ДО удаления артефакта:
# иначе повтор после потерянного ответа не отличил бы завершённый шаг от
# оборванного на середине.
printf '%s\n' "$RUN_ID" > "$APP_DIR/.release-run"
rm -rf "$STAGE" "/tmp/nx-release-$RUN_ID.tar"
echo "  → Дерево синхронизировано с артефактом (digest ✓), .release-sha = $DEPLOY_SHA"
REMOTE
  ssh_script "$T_SYNC" "распаковка и синхронизация" \
    "$TMPDIR_RUN/step1-artifact.sh" "$DEPLOY_SHA" "$RUN_ID" "$DIGEST" "$STALE_AFTER"

else
  # Легаси-путь: сервер с полноценным git-клоном.
  cat > "$TMPDIR_RUN/step1-git.sh" <<'REMOTE'
set -euo pipefail
# --- Сериализация шага на сервере (см. комментарий у ssh_script) -------------
exec 9>"/tmp/neuroexpert-deploy.step.lock" || { echo "  ✗ не открыть lock шага"; exit 1; }
# Файл намеренно ВНЕ /opt/neuroexpert: rsync --delete и git clean снесли бы
# его вместе с деревом релиза, а flock держится за inode — второй процесс
# создал бы новый файл и вошёл рядом с первым (находка раунда 21).
if ! flock -w 1800 9; then
  echo "  ✗ Предыдущий экземпляр этого шага всё ещё выполняется (ждал 30 минут)."
  echo "  → Это ретрай после потерянного ответа. Дождись завершения и повтори деплой."
  exit 1
fi
DEPLOY_SHA="$1"; DEPLOY_BRANCH="$2"; RUN_ID="$3"; STALE_AFTER="${4:-7200}"
APP_DIR="/opt/neuroexpert"
LOCK="$APP_DIR/.deploy.lock"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "  ✗ $APP_DIR не является git-репозиторием (на этом проде — rsync-дерево)."
  echo "  → Используй основной путь: DEPLOY_MODE=artifact (по умолчанию)."
  exit 1
fi

if ! mkdir "$LOCK" 2>/dev/null; then
  OWNER="$(cat "$LOCK/owner" 2>/dev/null || true)"
  AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK") ))
  if [ "$OWNER" = "$RUN_ID" ]; then
    echo "  → Повтор шага после обрыва связи, lock свой (${AGE}s)"
  elif [ "$AGE" -gt "$STALE_AFTER" ]; then
    echo "  → Stale lock (${AGE}s > ${STALE_AFTER}s), переустанавливаю"
    rm -rf "$LOCK" && mkdir "$LOCK"
  else
    echo "  ✗ Идёт другой деплой (lock ${AGE}s). Повтори позже или удали $LOCK"
    exit 1
  fi
fi
date +%s > "$LOCK/started"
printf '%s\n' "$RUN_ID" > "$LOCK/owner"

cd "$APP_DIR"
# Полная очистка: tracked-модификации сбрасываются, untracked и ignored
# удаляются из build context (ревью-находка: stale overlays в образе).
# Исключения — только серверные runtime-файлы: .env и рендеренный kong.yml.
git reset --hard HEAD
git clean -fdx -e .env -e '.env.*' -e docker/supabase/kong.yml -e .deploy.lock
git fetch origin --prune
# SHA обязан быть ровно tip задеплоиваемой ветки на origin — не «какой-то
# достижимый коммит». show-ref не парсит rev-выражения (защита от main~2).
TIP=$(git show-ref --hash --verify "refs/remotes/origin/$DEPLOY_BRANCH")
if [ "$TIP" != "$DEPLOY_SHA" ]; then
  echo "  ✗ origin/$DEPLOY_BRANCH tip = $TIP, ожидался $DEPLOY_SHA."
  echo "  → Запушь актуальный HEAD: git push origin HEAD"
  rm -rf "$LOCK"
  exit 1
fi
git checkout --detach "$DEPLOY_SHA"
printf '%s\n' "$DEPLOY_SHA" > "$APP_DIR/.release-sha"
echo "  → checked out $(git rev-parse --short HEAD)"
REMOTE
  ssh_script "$T_SYNC" "checkout на сервере" \
    "$TMPDIR_RUN/step1-git.sh" "$DEPLOY_SHA" "$DEPLOY_BRANCH" "$RUN_ID" "$STALE_AFTER"
fi

# --- 2. Check .env + render kong.yml ---
echo "[2/6] Проверка .env и kong.yml..."
cat > "$TMPDIR_RUN/step2-env.sh" <<'REMOTE'
set -euo pipefail
cd /opt/neuroexpert
if [ ! -f .env ]; then
  echo "  ✗ /opt/neuroexpert/.env не найден!"
  echo "  → Сгенерируй: bash scripts/generate-env.sh > .env и заполни ключи"
  exit 1
fi
bash scripts/render-kong.sh
echo "  → .env и kong.yml OK"
REMOTE
ssh_script "$T_SHORT" "проверка .env" "$TMPDIR_RUN/step2-env.sh"

# --- 3. Build & start (SHA baked into image) ---
echo "[3/6] Сборка и запуск..."
cat > "$TMPDIR_RUN/step3-build.sh" <<'REMOTE'
set -euo pipefail
# --- Сериализация шага на сервере (см. комментарий у ssh_script) -------------
exec 9>"/tmp/neuroexpert-deploy.step.lock" || { echo "  ✗ не открыть lock шага"; exit 1; }
# Файл намеренно ВНЕ /opt/neuroexpert: rsync --delete и git clean снесли бы
# его вместе с деревом релиза, а flock держится за inode — второй процесс
# создал бы новый файл и вошёл рядом с первым (находка раунда 21).
if ! flock -w 1800 9; then
  echo "  ✗ Предыдущий экземпляр этого шага всё ещё выполняется (ждал 30 минут)."
  echo "  → Это ретрай после потерянного ответа. Дождись завершения и повтори деплой."
  exit 1
fi
export GIT_SHA="$1" BUILD_TIME="$2"
cd /opt/neuroexpert
docker compose -f docker/docker-compose.prod.yml --env-file .env build --parallel
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d
echo "  → Контейнеры запущены"
REMOTE
ssh_script "$T_BUILD" "сборка и запуск" "$TMPDIR_RUN/step3-build.sh" "$DEPLOY_SHA" "$BUILD_TIME"

# --- 4. Migrations (tracked, fail-loud, atomic) ---
# BASELINE_THROUGH=<filename.sql> — явное операторское утверждение «на проде
# применены все миграции по этот файл включительно». Догадки по числу таблиц
# запрещены (ревью-находка: count-эвристика молча пропустила бы 020-024).
echo "[4/6] Миграции БД..."
# Перечень миграций берётся из КОММИТА (git ls-tree по DEPLOY_SHA), а не с сервера:
# там нет .git, а исполнять «что нашлось в каталоге» нельзя. base64 — чтобы
# многострочный список пережил склейку argv в ssh.
MIG_B64="$(git ls-tree -r --name-only "$DEPLOY_SHA" -- packages/supabase/migrations \
  | grep '\.sql$' | sort | base64 -w0)"
[ -n "$MIG_B64" ] || { echo "  ✗ в коммите $DEPLOY_SHA нет файлов миграций"; exit 1; }
cat > "$TMPDIR_RUN/step4-migrate.sh" <<'REMOTE'
set -euo pipefail
# --- Сериализация шага на сервере (см. комментарий у ssh_script) -------------
exec 9>"/tmp/neuroexpert-deploy.step.lock" || { echo "  ✗ не открыть lock шага"; exit 1; }
# Файл намеренно ВНЕ /opt/neuroexpert: rsync --delete и git clean снесли бы
# его вместе с деревом релиза, а flock держится за inode — второй процесс
# создал бы новый файл и вошёл рядом с первым (находка раунда 21).
if ! flock -w 1800 9; then
  echo "  ✗ Предыдущий экземпляр этого шага всё ещё выполняется (ждал 30 минут)."
  echo "  → Это ретрай после потерянного ответа. Дождись завершения и повтори деплой."
  exit 1
fi
BASELINE_THROUGH="${1:-}"
MIG_B64="${2:-}"
cd /opt/neuroexpert
COMPOSE="docker compose -f docker/docker-compose.prod.yml"

echo "  → Ожидание PostgreSQL..."
timeout 60 bash -c "until $COMPOSE exec -T supabase-db pg_isready -U postgres >/dev/null 2>&1; do sleep 2; done" \
  || { echo "  ✗ PostgreSQL не поднялся за 60с"; exit 1; }

PSQL="$COMPOSE exec -T supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1"

# Трекинг применённых миграций (checksum — против молчаливого пропуска
# изменённого уже-применённого файла, ревью-находка r2).
$PSQL -qAtc "CREATE TABLE IF NOT EXISTS public.neuroexpert_migrations (
  filename text PRIMARY KEY, checksum text, applied_at timestamptz NOT NULL DEFAULT now())"
$PSQL -qAtc "ALTER TABLE public.neuroexpert_migrations ADD COLUMN IF NOT EXISTS checksum text"

# Исполняем ровно файлы из манифеста коммита — stale/untracked SQL мимо.
MIGRATIONS=$(printf '%s' "$MIG_B64" | base64 -d)
[ -n "$MIGRATIONS" ] || { echo "  ✗ манифест миграций пуст"; exit 1; }
for f in $MIGRATIONS; do
  [ -f "$f" ] || { echo "  ✗ миграция из манифеста отсутствует в дереве: $f"; exit 1; }
done

TRACKED=$($PSQL -qAtc "SELECT count(*) FROM public.neuroexpert_migrations")
# Обжитость схемы — по pg_class (таблицы, вьюхи, секвенсы), не только по
# information_schema.tables (ревью-находка r5: обход guard схемой без таблиц).
TABLES=$($PSQL -qAtc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname <> 'neuroexpert_migrations' AND c.relkind IN ('r','v','m','S','p')")
if [ "$TRACKED" = "0" ] && [ "$TABLES" -gt "0" ]; then
  if [ -z "$BASELINE_THROUGH" ]; then
    echo "  ✗ Схема обжита ($TABLES таблиц), а neuroexpert_migrations пуст."
    echo "  → Fail-closed: укажи явно BASELINE_THROUGH=<последний применённый файл.sql>"
    echo "    (проверь на проде, какие миграции реально применены), например:"
    echo "    BASELINE_THROUGH=019_transliterate_slugs.sql bash scripts/deploy.sh"
    exit 1
  fi
  echo "$MIGRATIONS" | grep -qxF "packages/supabase/migrations/$BASELINE_THROUGH" \
    || { echo "  ✗ BASELINE_THROUGH='$BASELINE_THROUGH' не найден среди tracked-миграций"; exit 1; }
  echo "  → Baseline по операторскому указанию: файлы по $BASELINE_THROUGH включительно"
  # Все baseline-строки — ОДНОЙ транзакцией (ревью-находка r5: прерванный
  # построчный baseline оставлял частичную таблицу и обходил guard TRACKED=0).
  BASELINE_SQL=""
  for f in $MIGRATIONS; do
    NAME=$(basename "$f")
    SUM=$(sha256sum "$f" | cut -d' ' -f1)
    BASELINE_SQL="$BASELINE_SQL INSERT INTO public.neuroexpert_migrations(filename, checksum) VALUES ('$NAME','$SUM') ON CONFLICT DO NOTHING;"
    [ "$NAME" = "$BASELINE_THROUGH" ] && break
  done
  printf '%s\n' "$BASELINE_SQL" | $PSQL --single-transaction -f /dev/stdin
fi

APPLIED=0
for f in $MIGRATIONS; do
  NAME=$(basename "$f")
  SUM=$(sha256sum "$f" | cut -d' ' -f1)
  EXISTS=$($PSQL -qAtc "SELECT count(*) FROM public.neuroexpert_migrations WHERE filename='$NAME'")
  if [ "$EXISTS" != "0" ]; then
    STORED=$($PSQL -qAtc "SELECT coalesce(checksum,'') FROM public.neuroexpert_migrations WHERE filename='$NAME'")
    if [ -n "$STORED" ] && [ "$STORED" != "$SUM" ]; then
      echo "  ✗ $NAME изменён после применения (checksum mismatch)."
      echo "  → Уже применённые миграции неизменяемы; новая правка = новый файл."
      exit 1
    fi
    continue
  fi
  echo "  → Applying $NAME (single transaction)..."
  # Файл + запись трекинга в ОДНОЙ транзакции: неудача откатывает и то и другое.
  #
  # Проверка «применено ли» тоже ВНУТРИ этой транзакции и под ACCESS EXCLUSIVE:
  # ретрай после потерянного ответа мог идти параллельно с ещё живым первым
  # процессом, и внешняя проверка обоих пропускала — второй валил уже успешную
  # выкатку конфликтом (находка раунда 14). Второй процесс теперь ждёт на
  # блокировке, видит запись и не делает ничего.
  { printf 'BEGIN;\nLOCK TABLE public.neuroexpert_migrations IN ACCESS EXCLUSIVE MODE;\n'
    printf "SELECT count(*) = 0 AS need FROM public.neuroexpert_migrations WHERE filename='%s';\n" "$NAME"
    printf '\\gset\n\\if :need\n'
    cat "$f"
    printf "\nINSERT INTO public.neuroexpert_migrations(filename, checksum) VALUES ('%s','%s');\n" "$NAME" "$SUM"
    printf '\\else\n\\echo (уже применена параллельным прогоном, пропуск)\n\\endif\nCOMMIT;\n'
  } | $PSQL -f /dev/stdin
  APPLIED=$((APPLIED+1))
done
echo "  → Миграции OK (новых применено: $APPLIED)"
REMOTE
# Ретрай миграций безопасен: применённое трекается в neuroexpert_migrations с
# checksum, каждый файл идёт одной транзакцией — повтор пропускает применённое.
ssh_script "$T_MIGRATE" "миграции" "$TMPDIR_RUN/step4-migrate.sh" "${BASELINE_THROUGH:-}" "$MIG_B64"

# --- 5. Health + release identity (fail-loud) ---
echo "[5/6] Проверка health и версии релиза..."
cat > "$TMPDIR_RUN/step5-health.sh" <<'REMOTE'
set -euo pipefail
DEPLOY_SHA="$1"
COMPOSE="docker compose -f /opt/neuroexpert/docker/docker-compose.prod.yml"

HEALTHY=0
for i in $(seq 1 18); do
  if $COMPOSE exec -T web wget -q --spider http://localhost:3000/api/health 2>/dev/null; then
    HEALTHY=1; break
  fi
  echo "  → Ожидание health... ($i/18)"; sleep 5
done
if [ "$HEALTHY" != "1" ]; then
  echo "  ✗ Web не стал healthy за 90с"
  $COMPOSE ps
  $COMPOSE logs --tail 50 web
  exit 1
fi
echo "  → Web healthy ✓"

LIVE_SHA=$($COMPOSE exec -T web wget -qO- http://localhost:3000/api/version 2>/dev/null \
  | tr -d ' ' | sed -n 's/.*"sha":"\([^"]*\)".*/\1/p')
if [ "$LIVE_SHA" != "$DEPLOY_SHA" ]; then
  echo "  ✗ /api/version отдаёт '$LIVE_SHA', ожидался '$DEPLOY_SHA'."
  echo "  → Релиз НЕ состоялся: работает не тот код."
  exit 1
fi
echo "  → Release identity ✓ ($LIVE_SHA)"
$COMPOSE ps
REMOTE
ssh_script "$T_HEALTH" "health и версия релиза" "$TMPDIR_RUN/step5-health.sh" "$DEPLOY_SHA"

# --- 5b. Canonical host check (через публичный домен, с сервера) ---
echo "[5b] Проверка canonical-хоста https://$DOMAIN ..."
cat > "$TMPDIR_RUN/step5b-canonical.sh" <<'REMOTE'
set -euo pipefail
DEPLOY_SHA="$1"; DOMAIN="$2"
# Строгий статус: 200 без редиректов (ревью-находка r2: 3xx/5xx с телом,
# содержащим ожидаемый sha, не должны считаться успехом).
CODE=$(curl -sS -o /tmp/nx-version.json -w '%{http_code}' --max-redirs 0 --max-time 20 "https://$DOMAIN/api/version") \
  || { echo "  ✗ https://$DOMAIN/api/version недоступен с сервера"; exit 1; }
if [ "$CODE" != "200" ]; then
  echo "  ✗ https://$DOMAIN/api/version вернул HTTP $CODE (ожидался 200 без редиректов)."
  exit 1
fi
CANON_SHA=$(tr -d ' ' < /tmp/nx-version.json | sed -n 's/.*"sha":"\([^"]*\)".*/\1/p')
if [ "$CANON_SHA" != "$DEPLOY_SHA" ]; then
  echo "  ✗ Canonical-хост отдаёт sha='$CANON_SHA', ожидался '$DEPLOY_SHA'."
  echo "  → Прокси/edge ведёт не на этот релиз. Деплой НЕ завершён."
  exit 1
fi
echo "  → Canonical host ✓ ($CANON_SHA)"
REMOTE
ssh_script "$T_HEALTH" "canonical-хост" "$TMPDIR_RUN/step5b-canonical.sh" "$DEPLOY_SHA" "$DOMAIN"

# --- 6. Release lock (только свой, по ownership-токену) ---
echo "[6/6] Снятие deploy-lock..."
release_lock

echo ""
# Код доставлен и проверен, но состояние сервера осталось грязным — говорить
# «завершён» нельзя: следующий деплой упрётся в наш же lock (находка раунда 4).
if [ "$LOCK_STUCK" = "1" ]; then
  echo "=== Деплой ВЫКАЧЕН ($DEPLOY_SHA), но deploy-lock остался на сервере ==="
  echo "→ Снять вручную: ssh $SERVER 'rm -rf $APP_DIR/.deploy.lock'  # owner=$RUN_ID"
  echo "→ До снятия следующий деплой не стартует."
  exit 2
fi

echo "=== Деплой завершён: $DEPLOY_SHA на https://$DOMAIN ==="
echo "→ Внешняя проверка: EXPECTED_SHA=$DEPLOY_SHA node scripts/verify-canonical-release.mjs --require-head"
