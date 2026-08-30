#!/usr/bin/env python3
"""Оракул стратегического пакета ADR-003 / план v5.

Проверяет, что канонические документы стратегии и state-леджер не разъезжаются.
Появился после инцидента 2026-08-30: `GOAL.json.currentUnitId` указывал на
заблокированный юнит, пока `STATE.json` и `SCOPE_LOCK.md` уже были переведены на
активный, — расхождение поймало только независимое ревью, а не человек.

Запуск: `python3 scripts/verify-strategy-docs.py` из корня репозитория.
Ненулевой код возврата при любом расхождении.

Проверяются три группы:
  1. Статусы документов (ADR принят, план активен, следов draft не осталось).
  2. Три правки владельца от 2026-08-30 (G-011b blocked с условием выхода,
     разделение acceptance AF-1, маркетинговые страницы в AF-0).
  3. Согласованность леджера: GOAL.currentUnitId == STATE.currentUnit ==
     SCOPE_LOCK Current Task, и активный юнит не заблокирован.
"""

import io
import json
import re
import sys

ALLOWED_STATUS = {
    "pending",
    "in_progress",
    "recovery_required",
    "verified",
    "skipped",
    "blocked",
}

# Каталожные SKU и pilot-лестница ADR-002. Заморожены до gate AF-1-COMM:
# оракул падает, если в документах появляется цена вне этого списка.
KNOWN_PRICES = r"7[  ]?900|31[  ]?100|29[  ]?000|1[  ]?490|2[  ]?990|4[  ]?990"

failures = []


def read(path):
    return io.open(path, encoding="utf-8").read()


def check(name, condition, detail=""):
    ok = bool(condition)
    print(("  OK  " if ok else " FAIL ") + name + ((" — " + detail) if detail else ""))
    if not ok:
        failures.append(name)


adr = read("docs/adr/ADR-003-automation-first-ai-saas.md")
plan = read("CURRENT_PLAN.md")
backlog = read("BACKLOG.md")
scope = read(".itd/SCOPE_LOCK.md")
selfserve = read("docs/plan/SELF_SERVE_PLAN.md")
goal = json.load(open(".itd-memory/GOAL.json"))
state = json.load(open(".itd-memory/STATE.json"))

print("== 1. Статусы документов ==")
check("ADR-003 = ACCEPTED", "Status:** ACCEPTED" in adr)
check("ADR-003 без остатков PROPOSED", "PROPOSED" not in adr)
check("план v5 = ACTIVE", "Status: ACTIVE" in plan)
check("план v5 без пометки НЕ АКТИВЕН", "НЕ АКТИВЕН" not in plan)
check("BACKLOG без 'ожидает утверждения'", "ADR-003, ожидает утверждения" not in backlog)

print("== 2. Три правки владельца 2026-08-30 ==")
check("правка 1: G-011b помечен BLOCKED в плане", "G-011b — BLOCKED" in plan)
check(
    "правка 1: условие выхода записано",
    "YANDEX_FOLDER_ID" in plan and "Условие выхода" in plan,
)
check("правка 2: gate AF-1-COMM выделен", "AF-1-COMM" in plan)
check("правка 2: коммерческий gate не блокирует WIP", "НЕ блокирует закрытие AF-1" in plan)
check(
    "правка 3: маркетинговые страницы в AF-0",
    "маркетинговые страницы приведены в соответствие" in plan,
)
check(
    "термин deferred нигде не остался (схема леджера его не знает)",
    all("deferred" not in text for text in (plan, backlog, adr, scope)),
)

print("== 3. Согласованность леджера ==")
current = goal.get("currentUnitId")
status_by_id = {u["id"]: u["status"] for u in goal["units"]}
check("GOAL.currentUnitId == AF-0", current == "AF-0", str(current))
check("STATE.currentUnit == AF-0", state.get("currentUnit", {}).get("id") == "AF-0")
check("SCOPE_LOCK Current Task == AF-0", "**AF-0**" in scope and "STRAT-003-DRAFT" not in scope)
check(
    "активный юнит не заблокирован",
    status_by_id.get(current) != "blocked",
    "статус %s" % status_by_id.get(current),
)
check(
    "первый незакрытый юнит совпадает с currentUnitId",
    next(u["id"] for u in goal["units"] if u["status"] not in ("verified", "skipped", "blocked"))
    == current,
)
check("все статусы юнитов валидны", all(s in ALLOWED_STATUS for s in status_by_id.values()))
check(
    "каждый blocked юнит несёт причину",
    all(u.get("blockedReason") for u in goal["units"] if u["status"] == "blocked"),
)
check("G-011b = blocked", status_by_id.get("G-011b") == "blocked")

print("== 4. Схема идентификаторов BACKLOG ==")
backlog_ids = re.findall(r"\*\*(AF-P\d-\d)[^*]*?\*\*", backlog)
check("девять пунктов AF-P* на месте", len(backlog_ids) == 9, "%d шт" % len(backlog_ids))
unmapped = [i for i in backlog_ids if not re.search(re.escape(i) + r"\s*→", backlog)]
check("каждый AF-P* привязан к каноническому блоку", not unmapped, str(unmapped))
check("пояснение схемы присутствует", "Схема идентификаторов" in backlog)
referenced = set(re.findall(r"→ (?:канонический |после )?`(AF-\d)`", backlog))
declared = set(re.findall(r"### Block (AF-\d)", plan))
check(
    "все упомянутые канонические блоки объявлены в плане",
    referenced <= declared,
    "нет в плане: %s" % (referenced - declared),
)

print("== 5. Границы честности и заморозка цен ==")
check("Launch Start помечен как guided setup", "guided setup" in adr and "guided setup" in plan)
check("публичный шаг покупки остаётся dark", "dark" in plan.lower() and "атомарно" in adr)
check("фаза C сохранена", "Phase C" in adr and "sales-квота" in plan)
check("заморозка цен зафиксирована", "не меняются до" in adr and "AF-1-COMM" in plan)
# Цены проверяются по ADR-003: документ создан целиком этим решением, поэтому любая
# цена в нём обязана быть из утверждённого списка. CURRENT_PLAN так проверять нельзя —
# там исторически лежит финмодель со своими числами (4 000₽ подписка, 700₽ комиссия),
# это прогноз выручки, а не SKU. Оракул обязан работать в изолированном дереве, поэтому
# git здесь не используется.
stray = [
    line.strip()
    for line in adr.split("\n")
    if re.search(r"\b\d{1,3}[  ]?\d{3}\s*(₽|руб)", line) and not re.search(KNOWN_PRICES, line)
]
check("в ADR-003 нет цен вне утверждённого списка", not stray, str(stray[:2]))
check(
    "все три каталожных SKU названы в ADR-003",
    all(re.search(p, adr) for p in (r"7[  ]?900", r"31[  ]?100", r"29[  ]?000")),
)
check(
    "конфликт номера G-015 снят",
    "Номер устарел" in selfserve or "Исторический юнит 4" in selfserve,
)
check("recurring loop выделен в AF-3", "AF-3" in selfserve and "AF-3" in plan)

print()
if failures:
    print("СТРАТЕГИЧЕСКИЙ ПАКЕТ: FAILED — " + "; ".join(failures))
    sys.exit(1)
print("СТРАТЕГИЧЕСКИЙ ПАКЕТ: PASSED (все проверки пройдены)")
sys.exit(0)
