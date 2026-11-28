"""Exercise every OpenAPI operation successfully against local Wrangler and fake Toss."""
import os
import sys
import traceback
import uuid

import schemathesis
from schemathesis import checks

schemathesis.experimental.OPEN_API_3_1.enable()
schema = schemathesis.from_path('api/openapi.yaml', base_url=os.environ.get('CONTRACT_BASE_URL','http://127.0.0.1:8787'))
validation = (checks.not_a_server_error, checks.status_code_conformance,
              checks.content_type_conformance, checks.response_headers_conformance,
              checks.response_schema_conformance)
secrets = []
seen = set()


def call(path, method, expected, token=None, body=None, room=None):
    headers = {'Origin': 'https://example.test'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if method in ('POST', 'DELETE'):
        headers['Idempotency-Key'] = str(uuid.uuid4())
    params = {'roomCode': room} if room else None
    kwargs = {'path_parameters': params, 'headers': headers}
    if body is not None:
        kwargs.update(body=body, media_type='application/json')
    response = schema[path][method].make_case(**kwargs).call_and_validate(checks=validation, timeout=5)
    assert response.status_code == expected, f'{method} {path}: expected {expected}, got {response.status_code}'
    seen.add((path, method))
    return response.json() if response.content else None


def run():
    session = '/v1/sessions'
    host = call(session, 'POST', 201, body={'authCode': 'contract-host'})['sessionToken']
    guest = call(session, 'POST', 201, body={'authCode': 'contract-guest'})['sessionToken']
    secrets.extend([host, guest])
    call('/v1/themes', 'GET', 200, host)
    room = call('/v1/rooms', 'POST', 201, host, {'themeId':'travel','gatheringName':'여행','partySize':3,'hostNickname':'하늘'})['roomCode']
    call('/v1/rooms/{roomCode}', 'GET', 200, guest, room=room)
    call('/v1/rooms/{roomCode}/participants', 'POST', 201, guest, {'nickname':'구름'}, room)
    call('/v1/rooms/{roomCode}/questions', 'GET', 200, host, room=room)
    answers = {'answers': [{'position': n, 'choice': 'A'} for n in range(1, 9)]}
    call('/v1/rooms/{roomCode}/responses', 'POST', 201, host, answers, room)
    call('/v1/rooms/{roomCode}/notification-subscription', 'POST', 201, host, {'authCode':'contract-host'}, room)
    call('/v1/rooms/{roomCode}/responses', 'POST', 201, guest, answers, room)
    call('/v1/rooms/{roomCode}/my-profile', 'GET', 200, host, room=room)
    call('/v1/rooms/{roomCode}/card', 'GET', 200, host, room=room)
    call('/v1/me/rooms', 'GET', 200, host)
    call('/v1/me/data-summary', 'GET', 200, host)
    call('/v1/entries', 'POST', 204, host, {'referrerKind':'other'})
    call('/v1/rooms/{roomCode}/close', 'POST', 200, host, room=room)
    call('/v1/me/past-cards', 'GET', 200, host)
    call('/v1/me', 'DELETE', 204, host)
    expected={(path,method.upper()) for path, methods in schema.raw_schema['paths'].items() for method in methods}
    assert seen == expected, f'operations not exercised: {expected-seen}'
    print(f'Schemathesis success cases: {len(seen)}/{len(expected)} operations passed')


try:
    run()
except Exception:
    message = traceback.format_exc()
    for secret in secrets:
        message = message.replace(secret, '[redacted]')
    print(message, file=sys.stderr)
    raise SystemExit(1)
