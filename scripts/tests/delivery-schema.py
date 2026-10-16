"""Real PG15 integration in a disposable local container; no production credentials."""
from pathlib import Path
import subprocess, time, uuid

ROOT = Path(__file__).resolve().parents[2]
name = 'g019-schema-' + uuid.uuid4().hex[:12]
def run(*args):
    return subprocess.run(['docker', *map(str,args)], check=True, capture_output=True, text=True, timeout=90)
started = False
try:
    run('run', '--pull=never', '--rm', '-d', '--name', name, '--network=none',
        '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
        '-v', f'{ROOT}:/workspace:ro', 'postgres:15')
    started = True
    for _ in range(30):
        try: run('exec', name, 'pg_isready', '-U', 'postgres'); break
        except subprocess.CalledProcessError: time.sleep(.5)
    result = run('exec', name, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-f', '/workspace/scripts/tests/delivery-schema.sql')
    print(result.stdout[-400:])
except subprocess.CalledProcessError as exc:
    print(exc.stdout); print(exc.stderr); raise
finally:
    if started: run('stop', '-t', '2', name)
