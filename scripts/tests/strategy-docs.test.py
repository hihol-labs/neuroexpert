#!/usr/bin/env python3
"""Мутационный тест оракула scripts/verify-strategy-docs.py.

Зачем: оракул, который всегда зелёный, бесполезен и опасен — он создаёт видимость
проверки. Этот тест вносит в КОПИЮ дерева заведомые регрессии и требует, чтобы
оракул на каждой из них покраснел. Репозиторий не изменяется.

Каждая мутация воспроизводит реальный дефект, а не выдуманный:
регрессия 1 — точный дефект, найденный независимым ревью 2026-08-30
(`GOAL.currentUnitId` указывал на заблокированный юнит, пока STATE.json и
SCOPE_LOCK.md уже были переведены на активный);
регрессия 6 — тот же класс, найденный review-гейтом в VERIFICATION_CONTRACT.json.

Запуск: `python3 scripts/tests/strategy-docs.test.py` из корня репозитория.
"""

import io
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.getcwd()

# Оракул читает документы кандидата и файлы леджера. Леджер (`.itd/`, `.itd-memory/`)
# не отслеживается git — в verification-loop он передаётся как declared inputs,
# здесь копируется явно.
TREE = [
    'scripts/verify-strategy-docs.py',
    'docs/adr/ADR-003-automation-first-ai-saas.md',
    'CURRENT_PLAN.md',
    'BACKLOG.md',
    'docs/plan/SELF_SERVE_PLAN.md',
    '.itd/SCOPE_LOCK.md',
    '.itd-memory/GOAL.json',
    '.itd-memory/STATE.json',
]

failures = []


def make_copy():
    d = tempfile.mkdtemp(prefix='strategy-oracle-')
    for rel in TREE:
        src = os.path.join(ROOT, rel)
        if not os.path.exists(src):
            print('ПРОПУСК: нет файла %s — тест требует полного дерева' % rel)
            shutil.rmtree(d)
            sys.exit(2)
        dst = os.path.join(d, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
    return d


def run_oracle(d):
    r = subprocess.run(['python3', 'scripts/verify-strategy-docs.py'],
                       cwd=d, capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


def patch_json(d, rel, mutate):
    p = os.path.join(d, rel)
    data = json.load(open(p))
    mutate(data)
    json.dump(data, open(p, 'w'), ensure_ascii=False, indent=2)


def patch_text(d, rel, old, new):
    p = os.path.join(d, rel)
    s = io.open(p, encoding='utf-8').read()
    if old not in s:
        raise AssertionError('мутация неприменима, фрагмент не найден в %s: %r' % (rel, old))
    io.open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))


def expect_red(name, mutate):
    """Оракул ОБЯЗАН покраснеть на внесённой регрессии."""
    d = make_copy()
    try:
        mutate(d)
        code, out = run_oracle(d)
        red = code != 0
        line = next((l.strip() for l in out.split('\n') if l.startswith(' FAIL')), '')
        print(('  ПОЙМАНО   ' if red else '  ПРОПУЩЕНО ') + name)
        if line:
            print('             -> ' + line)
        if not red:
            failures.append(name)
    finally:
        shutil.rmtree(d)


print('== Контроль: неизменённое дерево должно быть зелёным ==')
d = make_copy()
code, out = run_oracle(d)
shutil.rmtree(d)
print(('  OK   ' if code == 0 else ' FAIL ') + 'чистая копия, exit=%d' % code)
if code != 0:
    failures.append('чистая копия должна быть зелёной')
    print(out[-600:])

print()
print('== Мутации: на каждой оракул обязан покраснеть ==')

expect_red(
    'рассинхрон GOAL.currentUnitId -> заблокированный юнит (дефект ревью 2026-08-30)',
    lambda d: patch_json(d, '.itd-memory/GOAL.json',
                         lambda g: g.__setitem__('currentUnitId', 'G-011b')),
)

expect_red(
    'снята привязка пункта бэклога к каноническому блоку',
    lambda d: patch_text(d, 'BACKLOG.md',
                         '**AF-P0-1 → канонический `AF-0`.', '**AF-P0-1.'),
)

expect_red(
    'ADR откачен в PROPOSED',
    lambda d: patch_text(d, 'docs/adr/ADR-003-automation-first-ai-saas.md',
                         'Status:** ACCEPTED', 'Status:** PROPOSED'),
)

expect_red(
    'введена цена вне утверждённого списка (нарушение заморозки)',
    lambda d: patch_text(d, 'docs/adr/ADR-003-automation-first-ai-saas.md',
                         '## Контекст', '## Контекст\n\nНовый тариф Starter: 3 900 руб/мес.\n'),
)

expect_red(
    'у заблокированного юнита стёрта причина блокировки',
    lambda d: patch_json(
        d, '.itd-memory/GOAL.json',
        lambda g: [u.__setitem__('blockedReason', '')
                   for u in g['units'] if u['id'] == 'G-011b'],
    ),
)

expect_red(
    'SCOPE_LOCK откачен на прежнюю задачу',
    lambda d: patch_text(d, '.itd/SCOPE_LOCK.md', '**G-018**', 'STRAT-003-DRAFT'),
)

expect_red(
    'AF-0 разотмечен из verified (откат закрытого юнита)',
    lambda d: patch_json(
        d, '.itd-memory/GOAL.json',
        lambda g: [u.__setitem__('status', 'pending')
                   for u in g['units'] if u['id'] == 'AF-0'],
    ),
)

expect_red(
    'STATE.currentUnit разошёлся с GOAL',
    lambda d: patch_json(d, '.itd-memory/STATE.json',
                         lambda s: s['currentUnit'].__setitem__('id', 'G-011')),
)

print()
if failures:
    print('ЕСТЬ ПРОВАЛЫ: ' + '; '.join(failures))
    sys.exit(1)
print('ВСЕ ПРОВЕРКИ ПРОШЛИ')
