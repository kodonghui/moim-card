#!/usr/bin/env python3
"""Run OpenAPI contract tests against local Wrangler, local D1, and a fake partner."""
import importlib.metadata
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'apps/api/test/contract/wrangler.toml'
FAKE = ROOT / 'apps/api/test/contract/fake-toss.toml'
WRANGLER = ['pnpm', '--filter', '@moim-card/apps-api', 'exec', 'wrangler']
ORIGIN = 'https://example.test'


def run():
    os.chdir(ROOT)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    with tempfile.TemporaryDirectory(prefix='moim-contract-') as directory:
        persist = str(Path(directory) / 'd1')
        for source in [*sorted((ROOT / 'db/migrations').glob('*.sql')), ROOT / 'apps/api/test/contract/seed.sql']:
            subprocess.run(WRANGLER + ['d1', 'execute', 'moim-contract-local', '--local', '--config', str(CONFIG), '--persist-to', persist, '--file', str(source)], check=True, stdout=subprocess.DEVNULL)
        env = {**os.environ, 'CONTRACT_BASE_URL': base, 'WRANGLER_SEND_METRICS': 'false'}
        with open(Path(directory) / 'wrangler.log', 'w+') as log:
            server = subprocess.Popen(WRANGLER + ['dev', '-c', str(CONFIG), '-c', str(FAKE), '--persist-to', persist, '--ip', '127.0.0.1', '--port', str(port), '--inspector-port', '0', '--show-interactive-dev-session=false'], env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                for _ in range(300):
                    if server.poll() is not None:
                        raise RuntimeError('local Wrangler exited during startup')
                    try:
                        urllib.request.urlopen(urllib.request.Request(base + '/v1/themes', headers={'Origin': ORIGIN}), timeout=1)
                    except urllib.error.HTTPError as error:
                        if error.code == 401:
                            break
                    except (urllib.error.URLError, TimeoutError):
                        pass
                    time.sleep(.1)
                else:
                    raise RuntimeError('local Wrangler did not become ready')
                print('Schemathesis:', importlib.metadata.version('schemathesis'), '; Wrangler:', subprocess.check_output(WRANGLER + ['--version'], text=True).strip(), '; D1 local, Toss fake; server:', base, '; commit:', subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(), flush=True)
                subprocess.run([sys.executable, 'apps/api/test/contract/success.py'], env=env, check=True)
                # Test deletion last so it cannot invalidate the other operations' session.
                token = session(base)
                checks = 'not_a_server_error,status_code_conformance,content_type_conformance,response_headers_conformance,response_schema_conformance'
                common = [sys.executable, '-c', 'from schemathesis.cli import schemathesis; schemathesis()', 'run', 'api/openapi.yaml', '--experimental', 'openapi-3.1', '--base-url', base, '--header', f'Origin: {ORIGIN}', '--header', f'Authorization: Bearer {token}', '--checks', checks, '--hypothesis-max-examples', '5', '--hypothesis-deadline', '5000', '--hypothesis-seed', '109', '--sanitize-output', 'true']
                for selection in (['--exclude-operation-id', 'deleteMyData'], ['--include-operation-id', 'deleteMyData']):
                    result = subprocess.run(common + selection, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                    print(result.stdout.replace(token, '[redacted]'), flush=True)
                    if result.returncode:
                        raise RuntimeError('Schemathesis failed')
            finally:
                if server.poll() is None:
                    os.killpg(server.pid, signal.SIGTERM)
                try:
                    server.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(server.pid, signal.SIGKILL)
                    server.wait()


def session(base):
    request = urllib.request.Request(base + '/v1/sessions', data=b'{"authCode":"contract-fuzz"}', headers={'Origin': ORIGIN, 'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.load(response)['sessionToken']


if __name__ == '__main__':
    run()
