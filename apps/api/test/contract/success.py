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
errors = []


def call(path, method, expected, token=None, body=None, room=None, origin='https://example.test', request_key=None):
    headers = {'Origin': origin}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if method in ('POST', 'DELETE'):
        headers['Idempotency-Key'] = request_key or str(uuid.uuid4())
    params = {'roomCode': room} if room else None
    kwargs = {'path_parameters': params, 'headers': headers}
    if body is not None:
        kwargs.update(body=body, media_type='application/json')
    expected_statuses = (expected,) if isinstance(expected,int) else expected
    selected_checks = validation if max(expected_statuses) < 500 else validation[1:]
    response = schema[path][method].make_case(**kwargs).call_and_validate(checks=selected_checks, timeout=5)
    assert response.status_code in expected_statuses, f'{method} {path}: expected {expected}, got {response.status_code}'
    if response.status_code < 400:
        seen.add((path, method))
    else:
        errors.append((path, method, response.status_code))
    return response.json() if response.content else None


def run():
    session = '/v1/sessions'
    host = call(session, 'POST', 201, body={'authCode': 'contract-host'})['sessionToken']
    guest = call(session, 'POST', 201, body={'authCode': 'contract-guest'})['sessionToken']
    late = call(session, 'POST', 201, body={'authCode': 'contract-late'})['sessionToken']
    limited = call(session, 'POST', 201, body={'authCode': 'contract-limited'})['sessionToken']
    secrets.extend([host, guest, late, limited])
    call('/v1/themes', 'GET', 200, host)
    room_key = str(uuid.uuid4())
    room = call('/v1/rooms', 'POST', 201, host, {'themeId':'travel','gatheringName':'여행','partySize':3,'hostNickname':'하늘'},request_key=room_key)['roomCode']
    assert call('/v1/rooms','POST',409,host,{'themeId':'travel','gatheringName':'다른 여행','partySize':3,'hostNickname':'하늘'},request_key=room_key)['code'] == 'idempotency_conflict'
    call('/v1/rooms/{roomCode}', 'GET', 200, guest, room=room)
    for path, methods in schema.raw_schema['paths'].items():
        for method, operation in methods.items():
            if operation.get('security') == []:
                continue
            error = call(path, method.upper(), 401, room=room if '{roomCode}' in path else None)
            assert error['code'] == 'unauthenticated'
    assert call('/v1/themes','GET',403,host,origin='https://bad.test')['code'] == 'origin_not_allowed'
    assert call('/v1/rooms/{roomCode}/questions','GET',403,late,room=room)['code'] == 'not_participant'

    call('/v1/rooms/{roomCode}/participants', 'POST', 201, guest, {'nickname':'구름'}, room)
    call('/v1/rooms/{roomCode}/participants', 'POST', 201, late, {'nickname':'바다'}, room)
    assert call('/v1/rooms/{roomCode}/my-profile','GET',403,late,room=room)['code'] == 'response_required'
    assert call('/v1/rooms/{roomCode}/close','POST',403,guest,room=room)['code'] == 'not_host'
    call('/v1/rooms/{roomCode}/questions', 'GET', 200, host, room=room)
    answers = {'answers': [{'position': n, 'choice': 'A'} for n in range(1, 9)]}
    call('/v1/rooms/{roomCode}/responses', 'POST', 201, host, answers, room)
    call('/v1/rooms/{roomCode}/notification-subscription', 'POST', 201, host, {'authCode':'contract-host'}, room)
    call('/v1/rooms/{roomCode}/responses', 'POST', 201, guest, answers, room)
    assert call('/v1/rooms/{roomCode}/notification-subscription','POST',503,guest,{'authCode':'contract-unavailable'},room)['code'] == 'toss_unavailable'

    call('/v1/rooms/{roomCode}/my-profile', 'GET', 200, host, room=room)
    call('/v1/rooms/{roomCode}/card', 'GET', 200, host, room=room)
    call('/v1/me/rooms', 'GET', 200, host)
    call('/v1/me/data-summary', 'GET', 200, host)
    call('/v1/entries', 'POST', 204, host, {'referrerKind':'other'})
    for _ in range(121):
        result=call('/v1/entries','POST',(204,429),limited,{'referrerKind':'other'})
        if result and result.get('code')=='rate_limited':
            break
    else:
        raise AssertionError('write quota did not return 429')

    call('/v1/rooms/{roomCode}/close', 'POST', 200, host, room=room)
    assert call('/v1/rooms/{roomCode}/responses','POST',409,late,answers,room)['code'] == 'room_closed'

    call('/v1/me/past-cards', 'GET', 200, host)
    call('/v1/me', 'DELETE', 204, host)
    expected={(path,method.upper()) for path, methods in schema.raw_schema['paths'].items() for method in methods}
    assert seen == expected, f'operations not exercised: {expected-seen}'
    print(f'Schemathesis success cases: {len(seen)}/{len(expected)} operations passed')
    print(f'Schemathesis expected error cases: {len(errors)} responses passed schema validation')


try:
    run()
except Exception:
    message = traceback.format_exc()
    for secret in secrets:
        message = message.replace(secret, '[redacted]')
    print(message, file=sys.stderr)
    raise SystemExit(1)
