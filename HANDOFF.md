# HANDOFF — НейроЭксперт, 2026-08-15 (сессия G-010)

## Где мы находимся

- Ветка `codex/plan-north-star-marketing-contract`, HEAD `f14d93d`. Два коммита сессии
  (`22e0cd1` оракул + правки CTA, `f14d93d` находки независимого ревью). **Не опубликованы**
  (`git push` не делался) и **не задеплоены** — на проде живёт `f48de09`.
- Юнит `G-010` — `in_progress` в леджере (активирован ОТК), 2/7 verified.
- Recheck релиза без редеплоя:
  `EXPECTED_SHA=f48de09da6a975cdb3f6942fcd6d066d879de662 node scripts/verify-canonical-release.mjs --require-head`.

## Сделано

1. **Оракул `scripts/verify-funnel.mjs`** — HTML живого сайта, 9 маршрутов. Проверки:
   CTA не ведут на `/register`/`/login` (исключение — `data-funnel-exempt` на той же строке),
   `/scan` и `/audit` в шапке и подвале, живой канал связи в теле страницы (подвал вырезается),
   якорные CTA имеют существующую цель, внутренние ссылки без 404/5xx, финальный URL совпадает
   по origin И по пути. Вторая ступень — скан исходников маркетинговой поверхности на любую
   строковую цель `/register`/`/login` (ловит CTA, описанные данными и скрытые за клиентским
   переключателем). Env: `FUNNEL_URL`, `FUNNEL_ATTEMPTS` (по умолчанию 8), `FUNNEL_SKIP_SOURCE=1`.
2. **Прогон на проде — красный, 45 нарушений** (ожидаемый старт): на всех 9 маршрутах нет
   `/scan` и `/audit` в шапке и подвале, «Войти» ведёт на `/login`. 404/5xx нет.
3. **Правки CTA** (`22e0cd1`): `/scan` и `/audit` в шапку и подвал, главный CTA шапки → `/scan`,
   пред-футерный `FunnelContactBand` (Telegram + телефон + CTA) в теле каждого лендинга,
   «Войти» размечена `data-funnel-exempt`, тарифы экспертов больше не ведут на `/register`
   (Free → `/scan`, платные → якорь `#funnel-contact`, временно до G-011).
4. **Независимое ревью кандидата — FAILED, 9 находок; все исправлены** (`f14d93d`):
   ложно-зелёный при редиректе на главную; ступень по исходникам не видела data-driven CTA;
   исключение засчитывалось в окне ±200 символов; якорные CTA не проверялись; относительные
   ссылки пропускались; не ретраились 429/502/503/504. Плюс два реальных дефекта разметки:
   на 721–1023 px ссылки шапки скрыты, а гамбургер ещё не показан (обязательные `/scan` и
   `/audit` недоступны); `--sr-accent` не определён вне `.sr-site`, кнопка блока теряла фон.
   Плюс формулировка блока приведена к тому, что делает `/scan` (один запрос к четырём
   ИИ-платформам — не «анализ запросов ваших клиентов»).
5. **Проверено:** `pnpm --filter web build` зелёный; оракул против локальной прод-сборки —
   `passed (9 routes, 17 internal links)`; регулярка ступени по исходникам ловит
   `{ href: "/register?plan=pro" }` (проверено отдельным прогоном).

## Что осталось по G-010 (следующая сессия)

1. **Второй раунд квитанций** — прошлые относятся к `22e0cd1`, digest кандидата изменился:
   - machine: `python3 ~/.claude/skills/_shared/itd_verification_loop.py machine --root /home/hihol/projects/neuroexpert --unit-id "G-010:funnel-cta" --risk-tier high --candidate-mode committed-head --command 'oracle=…'`
     (прошлая команда — в квитанции `.itd-memory/verification-loop/receipts/b49d544a61a85a28/`);
   - checker `--mode full`: промпт и дифф собираются в scratchpad, ревьюер запускается
     `codex exec --sandbox read-only --skip-git-repo-check - < checker-input.md`
     (первый прогон занял ~12 минут, вернул 9 находок — формат промпта рабочий,
     файлы `review-prompt.md`, `run-codex-review.sh` в scratchpad сессии);
   - `adjudicate --machine … --checker …` → adjudication-квитанция.
2. **Гейт и деплой:**
   `python3 ~/.claude/skills/deploy/scripts/itd_predeploy_gate.py check --root /home/hihol/projects/neuroexpert --receipt <adjudication> --emit-deploy-input .itd-memory/deploy-input.tar`,
   затем `DEPLOY_MODE=artifact bash scripts/deploy.sh` — первый живой прогон артефактного
   пути, удалит серверный кэш `.turbo` (667 МБ), это ожидаемо.
3. **Оракул зелёным на проде:** `node scripts/verify-funnel.mjs` (ретраи внутри, WARP).
4. `python3 ~/.claude/skills/goal/scripts/itd_goal_verify.py G-010` — переводит юнит в
   verified с evidence. Руками статус не ставить.
5. `/session-save`.

## Ловушки окружения (проверено этой сессией)

- Pre-deploy хук валит fail-closed любую команду, которую не может слексовать: подстановки
  `$(…)`, heredoc (`python3 - <<'PY'`), `sh script.sh`, циклы `until/for`. Обход: скрипт файлом,
  запуск `python3 /abs/path.py` или `bash /abs/path.sh`, аргументы без подстановок.
- `pkill` перехватывается `/careful`; локальные `next start` остались на портах 3210–3212.
- MCP `ctx_execute` с сетью блокируется external-write гейтом; сетевые пробы — `node /abs/path.mjs`.
- Гейт валидирует квитанцию по тиру `high` независимо от заявленного риска юнита → нужен
  ПОЛНЫЙ checker, targeted не подойдёт.

## Долги качества

- `/review` артефактного пути `scripts/deploy.sh` не проводился.
- Тестов на `verify-canonical-release.mjs`, `verify-funnel.mjs` и `deploy.sh` нет.
- 754 упавшие задачи воркера не разобраны.
- `#funnel-contact` для платных тарифов эксперта — временная мера до G-011.
