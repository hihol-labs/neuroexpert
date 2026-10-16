"""Exact-tree oracle; dependencies must be supplied as hash-bound --input archive.

No env files, generated application outputs or source overlays are imported.
The dependency archive contains only the five node_modules roots listed below.
"""
from pathlib import Path
import os, subprocess, tarfile

root = Path.cwd()
archive = root / '.itd-memory/g019-deps.tar.gz'
allowed = ['node_modules/', 'packages/shared/node_modules/', 'apps/worker/node_modules/', 'apps/web/node_modules/', 'apps/bot/node_modules/']
with tarfile.open(archive) as tar:
    for member in tar.getmembers():
        if not any(member.name == prefix.rstrip('/') or member.name.startswith(prefix) for prefix in allowed):
            raise RuntimeError('Unexpected dependency archive member')
    tar.extractall(root, filter='data')
commands = [
    ['pnpm','test'], ['pnpm','--filter','worker','build'],
    ['node','--test','apps/worker/tests/audit-delivery.test.cjs'],
    ['node','scripts/tests/delivery-mutations.mjs'],
    ['node','--test','scripts/tests/delivery-oracle.test.mjs'],
    ['node','--test','scripts/tests/delivery-route.test.cjs'],
    ['node','--test','scripts/tests/delivery-webhook.test.cjs'],
    ['node','scripts/tests/selfserve-path.test.mjs'],
    ['python3','scripts/tests/delivery-schema.py'],
    ['pnpm','--filter','web','exec','tsc','--noEmit'],
]
for stage in ['order','pair','delivery']:
    commands.append(['node','scripts/verify-selfserve-path.mjs',f'--stage={stage}','--repo-only'])
for command in commands:
    print('RUN:', ' '.join(command), flush=True)
    subprocess.run(command, check=True, timeout=600)
print('PASS: exact staged delivery candidate (local evidence; live canaries separate)')
