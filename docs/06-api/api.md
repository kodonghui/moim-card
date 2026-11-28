# 모임 합의 카드(가칭): API 계약 (06)

상태: **계약 승인, 체크포인트 통과**(2026-11-28, DEC-023~025) · 원본: [api/openapi.yaml](../../api/openapi.yaml)(OpenAPI 3.1, API-001~016) · 체크포인트 질문: [checkpoint-06.md](checkpoint-06.md)

- 입력: [04 기능 명세](../04-functional-spec/spec.md)(SPEC-001~039), [05 ERD](../05-erd/erd.md)(TBL-001~016, TBL-016은 DEC-039로 더함). 07 사이트맵 전이라 SCR ID는 아직 없어요.
- 계약이 먼저예요. 화면은 목 서버(`prism mock api/openapi.yaml`)로, 서버는 계약 테스트(`schemathesis run api/openapi.yaml --url <스테이징>`)로 맞춰요. 운영 서버에는 계약 테스트를 돌리지 않아요.
- 진실의 원천은 `api/openapi.yaml`이에요(`truth: source`). 이 문서는 읽기 쉽게 줄인 것이에요.

## 1. 공통 규칙

| 무엇 | 계약 | 출처 |
| --- | --- | --- |
| 인증 | API-001이 인증 코드를 교환해 세션 토큰을 줘요. 나머지는 `Authorization: Bearer <토큰>`. 없거나 끝나면 401 `unauthenticated` | C-1, DEC-017 |
| Origin | 허용된 두 Origin(실서비스, QR 테스트)만 받아요. 없거나 다르면 403 `origin_not_allowed`(모든 operation) | SPEC-038 |
| 같은 요청 두 번 | 상태를 바꾸는 6개(API-003, 005, 007, 010, 011, 015)는 `Idempotency-Key`(UUID) 필수. 같은 사용자·같은 키면 24시간 동안 첫 결과 | C-3, TBL-013 |
| 입력 오류 | 모두 400(`validation_failed`는 `errors[].field`·`reason`, 보낸 값은 넣지 않음). 422는 쓰지 않아요 | 04 SPEC 행이 400으로 적음 |
| 오류 모양 | `application/problem+json`: `type`·`title`(사용자 문구)·`status`·`code`·`traceId`, 선택 `detail`·`errors`. 라우터의 404·405도 이 모양으로 바꿔요(405는 `Allow` 헤더 유지) | 06 단계 기준, C-2 |
| 한도 | 쓰기 분당 60건, 방 만들기 24시간 30개, 토스 API 사용자당 분당 20건·미니앱당 분당 3,000건. 넘으면 429 `rate_limited`와 `Retry-After`. 읽기는 세지 않아요 | C-6, TBL-014 |
| 시각 | UTC, RFC 3339(`date-time`). 화면 기준 시각은 `asOf` | C-8, C-9 |
| 방 코드 | 형식이 틀린 코드도 404 `room_not_found`(없는 방과 같은 응답). 그래서 경로 매개변수에는 형식을 걸지 않고, 응답의 `roomCode`에만 걸어요 | C-5 |

## 2. Operation

| ID | 메서드와 경로 | 동작 | SPEC | TBL | 응답 |
| --- | --- | --- | --- | --- | --- |
| API-001 | `POST /v1/sessions` | 인증 코드 교환, 세션 시작 | SPEC-002, SPEC-003, SPEC-038 | TBL-001, 002, 014 | 201, 400, 401, 403, 429, default |
| API-002 | `GET /v1/themes` | 테마 목록 | SPEC-004 | TBL-003, 004 | 200, 401, 403, default |
| API-003 | `POST /v1/rooms` | 방 만들기 | SPEC-005, SPEC-008 | TBL-003, 004, 006, 007, 013, 014 | 201, 400, 401, 403, 409, 429, default |
| API-004 | `GET /v1/rooms/{roomCode}` | 방 소개와 내 참여 상태(응답 현황 포함) | SPEC-006, SPEC-017, SPEC-021, SPEC-039 | TBL-006, 007, 008 | 200, 401, 403, 404, default |
| API-005 | `POST /v1/rooms/{roomCode}/participants` | 방 입장 | SPEC-007, SPEC-008 | TBL-006, 007, 013, 014 | 200, 201, 400, 401, 403, 404, 409, 429, default |
| API-006 | `GET /v1/rooms/{roomCode}/questions` | 문항 화면 | SPEC-010 | TBL-005~008 | 200, 401, 403, 404, 409, default |
| API-007 | `POST /v1/rooms/{roomCode}/responses` | 응답 제출(카드 갱신, 자동 마감, 전환 표시, 알림 발송의 시작) | SPEC-011, 012, 014, 015, 018, 025, 026 | TBL-005~014, 016 | 201, 400, 401, 403, 404, 409, 429, default |
| API-008 | `GET /v1/rooms/{roomCode}/my-profile` | 내 모임 성향 | SPEC-012 | TBL-005, 007, 008, 016 | 200, 401, 403, 404, default |
| API-009 | `GET /v1/rooms/{roomCode}/card` | 합의 카드(열린 방은 응답 뒤, 마감 뒤는 누구나) | SPEC-013, SPEC-019, SPEC-021 | TBL-005~009 | 200, 401, 403, 404, default |
| API-010 | `POST /v1/rooms/{roomCode}/close` | 방장이 일찍 마감 | SPEC-015, SPEC-016, SPEC-026 | TBL-006, 007, 009, 010, 011, 013, 014 | 200, 400, 401, 403, 404, 409, 429, default |
| API-011 | `POST /v1/rooms/{roomCode}/notification-subscription` | 알림 신청 | SPEC-024, SPEC-026 | TBL-001, 007, 008, 011, 013, 014 | 200, 201, 400, 401, 403, 404, 409, 429, 503, default |
| API-012 | `GET /v1/me/rooms` | 내 방 목록 | SPEC-039 | TBL-006, 007, 008 | 200, 401, 403, default |
| API-013 | `GET /v1/me/past-cards` | 지난 카드(20개씩, `cursor`) | SPEC-027 | TBL-010 | 200, 400, 401, 403, default |
| API-014 | `GET /v1/me/data-summary` | 내 데이터 현황 | SPEC-028 | TBL-007~011 | 200, 401, 403, default |
| API-015 | `DELETE /v1/me` | 내 데이터 지우기 | SPEC-014, 015, 026, 029 | TBL-001, 002, 006~011, 013, 014 | 204, 400, 401, 403, 409, 429, default (DEC-048) |
| API-016 | `POST /v1/entries` | 유입 경로 기록 | SPEC-001, SPEC-023 | TBL-014, 015 | 204, 400, 401, 403, 429, default |

목록에 없는 응답은 operation마다 `x-corthex.omit`에 이유가 있어요(예: 읽기만 하는 operation의 409, 형식이 틀린 방 코드의 400).

서버 안 작업(HTTP operation 아님, `components.x-corthex.jobs`):

| 작업 | 언제 | SPEC | TBL |
| --- | --- | --- | --- |
| 방 만료 | 매시간 Cron, 500개씩 | SPEC-030, SPEC-026 | TBL-006, 010, 011 |
| 알림 발송 | API-007 커밋 뒤 `ctx.waitUntil`, 토스 `send-message` | SPEC-025 | TBL-011, 012, 014 |
| 정리 | 매시간 Cron: 끝난 세션, 24시간 지난 요청 ID, 7일 지난 한도 계수 | SPEC-002, SPEC-038 | TBL-002, 013, 014 |

## 3. SPEC 연결

`scripts/check-contract.py` 결과(2026-11-28): **SPEC 39행 모두 연결, 빠진 것 0개.** operation에 28행, 서버 안 작업에만 1행(SPEC-030), 서버가 필요 없는 행 10개.

| SPEC | 어디 |
| --- | --- |
| SPEC-001 | API-016 (버전 확인은 화면) |
| SPEC-002, SPEC-003 | API-001 |
| SPEC-004 | API-002 |
| SPEC-005 | API-003 |
| SPEC-006 | API-004 |
| SPEC-007 | API-005 |
| SPEC-008 | API-003, API-005 (같은 규칙을 화면도 씀) |
| SPEC-009 | 서버 없음: 토스 내비게이션 바 |
| SPEC-010 | API-006 |
| SPEC-011, SPEC-012 | API-007, API-008 |
| SPEC-013 | API-009 (계산은 API-007·010·015 안) |
| SPEC-014, SPEC-015 | API-007, API-010, API-015 |
| SPEC-016 | API-010 |
| SPEC-017 | API-004 (방장에게 같은 값으로 응답 현황) |
| SPEC-018 | API-007의 `logConversion` → 화면의 `Analytics.log` |
| SPEC-019 | API-009 |
| SPEC-020 | 서버 없음: `File.saveBase64` |
| SPEC-021 | API-004, API-009 |
| SPEC-022 | 서버 없음: `Share.createLink`·`Share.sendMessage`(방 코드는 API-004·012에서) |
| SPEC-023 | API-016 |
| SPEC-024 | API-011 |
| SPEC-025 | API-007 → 알림 발송 작업 |
| SPEC-026 | API-007, API-010, API-011, API-015, 방 만료 작업 |
| SPEC-027 | API-013 |
| SPEC-028 | API-014 |
| SPEC-029 | API-015 |
| SPEC-030 | 방 만료 작업 |
| SPEC-031, SPEC-032 | 서버 없음: 저장소 스크립트(배포가 TBL-003~005에 행을 넣음) |
| SPEC-033 | 서버 없음: 번들 안 화면 |
| SPEC-034, SPEC-035 | 서버 없음: 빌드 검사 |
| SPEC-036, SPEC-037 | 서버 없음: 09 목업·12 QA 측정 |
| SPEC-038 | API-001 (모든 operation의 Origin 403과 429) |
| SPEC-039 | API-012, API-004 |

## 4. 오류 코드

`components.x-corthex.errors`에 있는 것만 써요. Problem의 `code`는 이 목록의 enum이라, 서버가 다른 코드를 보내면 계약 테스트가 실패해요.

| code | 상태 | 뜻 | 사용자 문구 |
| --- | --- | --- | --- |
| invalid_request | 400 | JSON이 아님, 요청 ID 헤더 없음 | 요청을 처리하지 못했어요. 다시 해 주세요 |
| validation_failed | 400 | 입력 한계 밖(칸별 이유) | 칸 옆의 안내를 확인해 주세요 |
| auth_code_invalid | 400 | 알림 신청 때 인증 코드 무효(토스 4011) | 알림을 신청하지 못했어요 |
| unauthenticated | 401 | 세션 없음·끝남 | 다시 확인이 필요해요 |
| auth_failed | 401 | API-001에서 인증 코드를 확인하지 못함(무효, 토스 오류·시간 초과) | 확인하지 못했어요 |
| origin_not_allowed | 403 | 허용되지 않은 Origin | 지금은 쓸 수 없어요 |
| not_participant | 403 | 참여자가 아님 | 이 방에 먼저 들어와 주세요 |
| response_required | 403 | 열린 방에서 응답 전 | 답하면 볼 수 있어요 |
| not_host | 403 | 방장이 아님 | 방장만 마감할 수 있어요 |
| identity_mismatch | 403 | 알림 신청의 식별키가 세션 사용자와 다름 | 알림을 신청하지 못했어요 |
| room_not_found | 404 | 없는·형식이 틀린·만료된 방 | 이 방은 없거나 보관 기간이 지났어요 |
| route_not_found | 404 | 없는 경로 | 요청을 처리하지 못했어요 |
| method_not_allowed | 405 | 없는 메서드 | 요청을 처리하지 못했어요 |
| room_closed | 409 | 방이 마감됨 | 방이 그사이 마감됐어요 |
| room_full | 409 | 8명이 참 | 이 방은 8명이 다 찼어요 |
| already_submitted | 409 | 이미 응답함 | 이미 답했어요 |
| not_enough_responses | 409 | 응답 완료 2명 미만 | 2명 이상이 답해야 마감할 수 있어요 |
| theme_unavailable | 409 | 배포된 세트가 없는 테마 | 이 테마는 지금 쓸 수 없어요 |
| idempotency_conflict | 409 | 같은 요청 ID에 다른 내용 | 요청을 처리하지 못했어요. 다시 해 주세요 |
| rate_limited | 429 | 한도 초과(토스 4095 포함) | 잠시 뒤 다시 해 주세요 |
| internal | 500 | 예상하지 못한 오류(batch 되돌림) | 잠시 뒤 다시 해 주세요 |
| toss_unavailable | 503 | 알림 신청 때 토스 API 오류·시간 초과 | 알림을 신청하지 못했어요 |

화면이 각 오류에 무엇을 하는지는 openapi.yaml의 `client` 칸에 있어요(08 화면 상태가 이어받아요).

## 5. 오류와 성공의 경계 (DEC-021)

| # | 정한 것 | 이유 |
| --- | --- | --- |
| R-1 | 입력 오류는 400 하나로 써요(422 안 씀). | 04 SPEC 행이 400으로 적었어요 |
| R-2 | 형식이 틀린 방 코드는 400이 아니라 404예요. | C-5: 방이 있는지 떠볼 수 없게 |
| R-3 | 이미 참여자인 입장(API-005), 이미 신청한 알림(API-011)은 200으로 기존 상태를 돌려줘요. 이미 마감된 방의 마감(API-010)도 200과 그 카드예요. | SPEC-007·016·024의 [반복]: "바꾸지 않고 돌려줌" |
| R-4 | 이미 응답한 사람의 제출은 409 `already_submitted`예요. 같은 요청 ID면 첫 201을 다시 돌려줘요. | SPEC-011: "바꾸지 않고 409". 저장된 결과는 API-008·009로 불러와요 |
| R-5 | 응답 완료 1명인 카드, 카드 없이 마감된 방은 200과 `stage: none`이에요(404가 아님). | 빈 결과는 오류가 아니에요(SPEC-019, SPEC-021) |
| R-6 | API-001의 모든 교환 실패(코드 무효, 토스 오류·시간 초과)는 401 `auth_failed`예요. 알림 신청(API-011)의 코드 무효는 400 `auth_code_invalid`, 토스 오류는 503 `toss_unavailable`이에요. | SPEC-002는 확인 실패를 C-1(401)로 묶었고, API-011은 이미 확인된 사용자라 401이 맞지 않아요 |
| R-7 | 같은 요청 ID를 다른 본문으로 보내면 409 `idempotency_conflict`예요. 결과가 정해진 응답(2xx, 400, 403, 404, 409)만 기록하고 401·429·5xx는 기록하지 않아 다시 시도할 수 있어요. | C-3의 "첫 결과"를 다시 시도할 수 있는 실패에 쓰지 않으려고 |
| R-8 | 내 데이터를 지운 뒤 같은 세션 토큰으로 `DELETE /v1/me`를 다시 부르면 204예요. 그 토큰으로 다른 operation을 부르면 401이에요. | SPEC-029 [반복]: "이미 지워진 사용자면 성공" |
| R-9 | 토스 API 결과는 HTTP 200이어도 `resultType`이 `SUCCESS`가 아니면 실패로 다뤄요. 토스 4095는 우리 429, 4011은 위 R-6이에요. 토스 한도를 우리 한도 오류로 바꾸는 것은 이 두 곳뿐이에요. | F-4, F-6 |
| R-10 | 방장 응답 현황(SPEC-017)은 따로 두지 않고 API-004의 `partySize`·`submittedCount`로 보여요. 방 소개도 응답 완료 수를 보이므로 방장만의 값이 없어요. | SPEC-006, SPEC-017 |
| R-11 | 참여자 수는 내보내지 않고 `isFull`(8명인지)만 내보내요. | SPEC-006 [노출]: 화면이 알릴 것은 "8명이 다 찼어요"뿐 |
| R-12 | 내 방 목록(API-012)은 `roomCode`를 내보내요. 화면에는 보이지 않고 방 API를 부르는 데만 써요. | 06 질문 3 → DEC-025. 조건: 화면은 방 코드를 기기 로그(console, `Analytics.log` 파라미터, 오류 보고)에 남기지 않아요 |

## 6. 검사 결과 (2026-11-28)

| 검사 | 결과 |
| --- | --- |
| `python3 scripts/check-contract.py` | 통과 1095, 실패 0(05 재생성·제약 동작, TBL·API ID, 응답 표, 예시 200개의 스키마 검사, 오류 코드·상태, 요청 필드 한계, 열 한계 = 계약 한계, SPEC 연결) |
| openapi-spec-validator(OpenAPI 3.1) | 유효 |
| Prism 5.12.0 목 서버 | 읽힘. `GET /v1/themes`가 예시를, `Prefer: code=409, example=not-enough`가 그 예시를, 토큰 없는 요청이 401을 돌려줌 |
| Schemathesis 4.34.4(목 서버 대상, examples·fuzzing) | 16개 operation을 모두 읽고 367건을 만듦. 실패 21건은 목 서버 자체의 동작이에요: 아무 토큰이나 받음(ST401 15건), Prism이 깨진 JSON에 자기 오류 모양으로 답함(ST105 6건). 계약 응답의 스키마 위반은 없었어요. 실제 서버로 하는 계약 테스트는 11 개발 단계예요 |
| 깨지는 변경 | 첫 계약이라 비교할 이전 계약이 없어요(main에 api/openapi.yaml 없음). 0개 |
