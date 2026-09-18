"""R-01 exact-tree oracle; dependencies must be supplied as hash-bound --input archive.

No env files, generated application outputs or source overlays are imported.
The dependency archive contains only the five node_modules roots listed below
(built 2026-09-08 after adding nodemailer to apps/worker).
"""
from pathlib import Path
import subprocess, tarfile

root = Path.cwd()
archive = root / '.itd-memory/r01-deps.tar.gz'
allowed = ['node_modules/', 'packages/shared/node_modules/', 'apps/worker/node_modules/', 'apps/web/node_modules/', 'apps/bot/node_modules/']
with tarfile.open(archive) as tar:
    for member in tar.getmembers():
        if not any(member.name == prefix.rstrip('/') or member.name.startswith(prefix) for prefix in allowed):
            raise RuntimeError('Unexpected dependency archive member')
    tar.extractall(root, filter='data')
commands = [
    ['pnpm', '--filter', 'shared', 'test'],
    ['pnpm', '--filter', 'worker', 'build'],
    ['node', '--test', 'apps/worker/tests/audit-delivery.test.cjs', 'apps/worker/tests/payment-reconcile.test.cjs', 'apps/worker/tests/operator-alerts.test.cjs'],
    ['node', 'scripts/tests/selfserve-path.test.mjs'],
    ['node', 'scripts/tests/preflight.test.mjs'],
    ['node', 'scripts/verify-preflight.mjs', '--repo-only', '--check-alerts'],
    ['node', 'scripts/verify-preflight.mjs', '--repo-only', '--check-paid-alert'],
    ['node', 'scripts/tests/expert-path.test.mjs'],
    ['node', 'scripts/verify-expert-path.mjs', '--stage=infra', '--repo-only'],
    ['pnpm', '--filter', 'bot', 'build'],
    ['node', 'scripts/verify-selfserve-path.mjs', '--stage=delivery', '--check-details', '--repo-only'],
    ['node', 'scripts/verify-selfserve-path.mjs', '--stage=delivery', '--check-money', '--repo-only'],
    ['pnpm', '--filter', 'web', 'exec', 'tsc', '--noEmit'],
]
for stage in ['order', 'pair', 'delivery', 'reconcile']:
    commands.append(['node', 'scripts/verify-selfserve-path.mjs', f'--stage={stage}', '--repo-only'])
for command in commands:
    print('RUN:', ' '.join(command), flush=True)
    subprocess.run(command, check=True, timeout=900)
print('PASS: exact staged reconcile candidate (local evidence; live canaries separate)')
