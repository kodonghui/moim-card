-- 0001_init: moim-card 첫 스키마(TBL-001~015). 05 ERD 체크포인트 전 초안이에요.
-- 적용: wrangler d1 migrations apply <DB 이름> (wrangler.toml의 migrations_dir = "db/migrations").
-- 적용된 뒤에는 이 파일을 고치지 않고 새 번호의 파일을 더해요.

-- TBL-001 users 사용자 (CTX-004) ← SPEC-002, SPEC-003, SPEC-029 | terms: TERM-034, TERM-029
-- 규칙: 사용자 식별키 원문 열이 없어요(REQ-074). key_hash는 HMAC-SHA256(서버 비밀 값, 식별키)의 16진수 64자예요.
-- 규칙: key_hash 유일 → 같은 사용자의 첫 요청 두 개가 한꺼번에 와도 사용자는 하나예요(SPEC-003 동시성).
-- 규칙: id는 서버가 만든 무작위 128비트(Crockford base32 26자). 내 데이터를 지우면 행이 사라지고, 다시 오면 새 id예요.
CREATE TABLE users (
  id         TEXT    NOT NULL PRIMARY KEY CHECK (length(id) = 26),
  key_hash   TEXT    NOT NULL UNIQUE CHECK (length(key_hash) = 64),
  created_at INTEGER NOT NULL
) STRICT;

-- TBL-002 sessions 세션 토큰 (CTX-004) ← SPEC-002, SPEC-029 | terms: none
-- 규칙(DEC-017): 토큰 원문은 저장하지 않고 SHA-256 해시만 둬요. 수명은 12시간이에요.
-- 규칙: 내 데이터 지우기는 먼저 revoked_at을 적고 사용자를 지워요(user_id는 NULL이 됨). 이 행은 만료까지 남아
--       같은 지우기 요청을 다시 보내면 성공으로 답하게 해요(SPEC-029 반복). 그 밖의 요청에는 401이에요.
CREATE TABLE sessions (
  token_hash TEXT    NOT NULL PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id    TEXT    REFERENCES users (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  CHECK (expires_at = created_at + 43200),
  CHECK (user_id IS NOT NULL OR revoked_at IS NOT NULL)
) STRICT;
CREATE INDEX sessions_user ON sessions (user_id);
CREATE INDEX sessions_expires ON sessions (expires_at);

-- TBL-003 themes 테마 (CTX-002) ← SPEC-004, SPEC-031, SPEC-032 | terms: TERM-007
-- 규칙: 테마 목록에 보이는 순서는 sort_order예요. 행은 문항 세트 배포 스크립트가 넣어요(SPEC-032).
CREATE TABLE themes (
  id         TEXT    NOT NULL PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 20 AND id NOT GLOB '*[^a-z_]*'),
  name       TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
  sort_order INTEGER NOT NULL UNIQUE
) STRICT;

-- TBL-004 question_sets 문항 세트 버전 (CTX-002) ← SPEC-004, SPEC-005, SPEC-031, SPEC-032 | terms: TERM-008, TERM-036
-- 규칙: 테마마다 버전 번호가 유일해요. 배포된 버전의 내용은 바꾸지 않고 새 버전으로 내요(content_sha256로 배포 스크립트가 확인, SPEC-031).
-- 규칙: 검토를 통과해 배포된 세트만 이 테이블에 와요. 초안·검토 상태는 저장소 파일에 있어요(SPEC-032).
-- 규칙: 저작권 신고 등으로 내린 세트는 status = 'withdrawn'이고, 새 방은 만들 수 없지만 이미 고정한 방은 계속 써요.
-- 리드 모델 테마 목록(TERM-036)은 테마마다 status = 'published'인 가장 큰 version이에요.
CREATE TABLE question_sets (
  id                  INTEGER NOT NULL PRIMARY KEY,
  theme_id            TEXT    NOT NULL REFERENCES themes (id) ON DELETE RESTRICT,
  version             INTEGER NOT NULL CHECK (version >= 1),
  status              TEXT    NOT NULL CHECK (status IN ('published', 'withdrawn')),
  default_next_action TEXT    NOT NULL CHECK (length(default_next_action) BETWEEN 1 AND 60),
  content_sha256      TEXT    NOT NULL CHECK (length(content_sha256) = 64),
  published_at        INTEGER NOT NULL,
  withdrawn_at        INTEGER,
  UNIQUE (theme_id, version),
  CHECK ((status = 'withdrawn') = (withdrawn_at IS NOT NULL))
) STRICT;

-- TBL-005 questions 문항 (CTX-002) ← SPEC-010, SPEC-011, SPEC-012, SPEC-013, SPEC-031 | terms: TERM-009, TERM-010, TERM-021, TERM-022, TERM-024, TERM-041, TERM-038
-- 규칙: 세트마다 문항 8개(position 1~8). "8개 모두 있음"은 형식 검사 스크립트가 봐요(SPEC-031).
-- 규칙: 성향 축은 없을 수 있어요. 축이 있으면 선택지 A가 그 축의 어느 쪽인지(axis_pole_a)도 있어야 해요(축 매핑, TERM-041).
-- 리드 모델 문항 화면(TERM-038)은 방에 고정된 question_set_id의 문항 8개예요.
CREATE TABLE questions (
  question_set_id  INTEGER NOT NULL REFERENCES question_sets (id) ON DELETE RESTRICT,
  position         INTEGER NOT NULL CHECK (position BETWEEN 1 AND 8),
  prompt           TEXT    NOT NULL CHECK (length(prompt) BETWEEN 1 AND 40),
  option_a         TEXT    NOT NULL CHECK (length(option_a) BETWEEN 1 AND 30),
  option_b         TEXT    NOT NULL CHECK (length(option_b) BETWEEN 1 AND 30),
  split_suggestion TEXT    NOT NULL CHECK (length(split_suggestion) BETWEEN 1 AND 60),
  agreed_text_a    TEXT    NOT NULL CHECK (length(agreed_text_a) BETWEEN 1 AND 60),
  agreed_text_b    TEXT    NOT NULL CHECK (length(agreed_text_b) BETWEEN 1 AND 60),
  axis             TEXT    CHECK (axis IN ('plan_speed', 'spending_priority', 'schedule_change')),
  axis_pole_a      TEXT    CHECK (axis_pole_a IN ('low', 'high')),
  PRIMARY KEY (question_set_id, position),
  CHECK ((axis IS NULL) = (axis_pole_a IS NULL))
) STRICT;

-- TBL-006 rooms 방 (CTX-001) ← SPEC-005, SPEC-006, SPEC-007, SPEC-011, SPEC-014, SPEC-015, SPEC-016, SPEC-017, SPEC-018, SPEC-021, SPEC-029, SPEC-030, SPEC-039 | terms: TERM-002, TERM-003, TERM-006, TERM-025, TERM-026, TERM-027, TERM-043, TERM-037, TERM-039
-- 규칙: 방 코드는 0·O·1·I·L을 뺀 31자에서 무작위 10자예요(C-5, DEC-020). 유일해요.
-- 규칙: 테마·문항 세트 버전·인원은 만든 뒤 바꾸지 않아요(01 CTX-001). question_set_id는 고정이고, 세트는 지울 수 없어요(RESTRICT).
-- 규칙: 참여자는 최대 8명(participant_count), 응답 완료는 인원(party_size)을 넘지 않아요. 입장·제출은 조건을 건 UPDATE로 세요(C-4).
-- 규칙: 열린 방은 closed_at·close_reason이 없고, 마감된 방은 둘 다 있어요. 마감은 되돌리지 않아요.
-- 규칙: 보관 기간은 만든 시각부터 30×24시간이에요(C-8, DEC-009). 만료 작업이 expires_at이 지난 방을 지워요(SPEC-030).
-- 규칙: conversion_logged는 대표 전환 기록을 방마다 한 번만 하게 해요(SPEC-018, DEC-020).
-- 리드 모델 방 소개(TERM-037)와 응답 현황(TERM-039)은 이 행의 모임 이름·인원·응답 완료 수·상태예요.
CREATE TABLE rooms (
  id                INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  code              TEXT    NOT NULL UNIQUE CHECK (length(code) = 10 AND code NOT GLOB '*[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]*'),
  gathering_name    TEXT    NOT NULL CHECK (length(gathering_name) BETWEEN 1 AND 20 AND gathering_name = trim(gathering_name)),
  party_size        INTEGER NOT NULL CHECK (party_size BETWEEN 2 AND 8),
  question_set_id   INTEGER NOT NULL REFERENCES question_sets (id) ON DELETE RESTRICT,
  status            TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  close_reason      TEXT    CHECK (close_reason IN ('all_submitted', 'host_closed', 'host_deleted')),
  participant_count INTEGER NOT NULL DEFAULT 1 CHECK (participant_count BETWEEN 0 AND 8),
  submitted_count   INTEGER NOT NULL DEFAULT 0 CHECK (submitted_count BETWEEN 0 AND 8),
  conversion_logged INTEGER NOT NULL DEFAULT 0 CHECK (conversion_logged IN (0, 1)),
  created_at        INTEGER NOT NULL,
  expires_at        INTEGER NOT NULL,
  closed_at         INTEGER,
  CHECK (expires_at = created_at + 2592000),
  CHECK (submitted_count <= party_size AND submitted_count <= participant_count),
  CHECK ((status = 'open') = (closed_at IS NULL)),
  CHECK ((status = 'open') = (close_reason IS NULL))
) STRICT;
CREATE INDEX rooms_expires ON rooms (expires_at);

-- TBL-007 participants 참여자 (CTX-001) ← SPEC-005, SPEC-006, SPEC-007, SPEC-008, SPEC-010, SPEC-016, SPEC-017, SPEC-028, SPEC-029, SPEC-039 | terms: TERM-005, TERM-004, TERM-030, TERM-046
-- 규칙: 한 사용자는 한 방에 한 번만 참여해요(room_id, user_id 유일). 방장(role = 'host')은 방마다 한 명이에요(부분 유일 인덱스).
-- 규칙: 닉네임은 앞뒤 공백을 지운 1~10자예요(SPEC-008). 금칙어 검사는 서버 코드가 해요(TERM-045). 닉네임은 본인 화면에만 보여요.
-- 규칙: 사용자가 데이터를 지우면 그 사람의 참여자 행이 지워지고(CASCADE), 방의 계수는 SPEC-029가 같은 트랜잭션에서 줄여요.
-- 리드 모델 내 방 목록(TERM-046)은 내 참여자 행 중 열린 방을 joined_at 최근 순으로 20개까지예요(SPEC-039).
CREATE TABLE participants (
  id        INTEGER NOT NULL PRIMARY KEY,
  room_id   INTEGER NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  user_id   TEXT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role      TEXT    NOT NULL CHECK (role IN ('host', 'member')),
  nickname  TEXT    NOT NULL CHECK (length(nickname) BETWEEN 1 AND 10 AND nickname = trim(nickname)),
  joined_at INTEGER NOT NULL,
  UNIQUE (room_id, user_id),
  UNIQUE (id, room_id)
) STRICT;
CREATE UNIQUE INDEX participants_one_host ON participants (room_id) WHERE role = 'host';
CREATE INDEX participants_user_joined ON participants (user_id, joined_at);

-- TBL-008 responses 응답 (CTX-001) ← SPEC-011, SPEC-012, SPEC-013, SPEC-014, SPEC-015, SPEC-016, SPEC-019, SPEC-029 | terms: TERM-012, TERM-013, TERM-011
-- 규칙: 참여자마다 응답 하나(participant_id 기본 키). 행이 있으면 응답 완료(TERM-013)예요. 제출 뒤에는 바꾸지 않아요(SPEC-011).
-- 규칙: answers는 문항 1~8의 답을 차례로 적은 8자예요. A = 선택지 A, B = 선택지 B, N = 상관없어요(TERM-011).
-- 규칙: room_id는 그 참여자의 방이어야 해요(participants (id, room_id) 복합 외래 키).
CREATE TABLE responses (
  participant_id INTEGER NOT NULL PRIMARY KEY,
  room_id        INTEGER NOT NULL,
  answers        TEXT    NOT NULL CHECK (length(answers) = 8 AND answers NOT GLOB '*[^ABN]*'),
  submitted_at   INTEGER NOT NULL,
  UNIQUE (participant_id, room_id),
  FOREIGN KEY (participant_id, room_id) REFERENCES participants (id, room_id) ON DELETE CASCADE
) STRICT;
CREATE INDEX responses_room ON responses (room_id);

-- TBL-009 consensus_cards 합의 카드 (CTX-001) ← SPEC-013, SPEC-014, SPEC-015, SPEC-016, SPEC-019, SPEC-021, SPEC-029 | terms: TERM-014, TERM-015, TERM-016, TERM-017, TERM-018, TERM-019, TERM-020
-- 규칙: 방마다 카드 하나예요(room_id 기본 키). 응답 완료가 2명 이상일 때만 있어요(based_on_count >= 2). 2명 미만이 되면 중간 카드 행을 지워요(SPEC-014).
-- 규칙: stage = 'final'인 카드는 바꾸지 않아요(아래 트리거가 UPDATE를 막아요, SPEC-015). 방이 만료되면 함께 지워져요.
-- 규칙: items는 문항 8개의 [{"position":1,"a":2,"b":2,"none":0,"category":"split"}, ...]예요. 닉네임·사용자 ID가 없고 수만 있어요(DEC-004).
--       category: agreed = 모두 좋아요, split = 조율해요, open = 누구나 괜찮아요.
-- 규칙: next_action은 다음 행동 문구 하나예요(SPEC-013의 고르는 규칙).
CREATE TABLE consensus_cards (
  room_id        INTEGER NOT NULL PRIMARY KEY REFERENCES rooms (id) ON DELETE CASCADE,
  stage          TEXT    NOT NULL CHECK (stage IN ('interim', 'final')),
  based_on_count INTEGER NOT NULL CHECK (based_on_count BETWEEN 2 AND 8),
  items          TEXT    NOT NULL CHECK (json_valid(items) AND json_array_length(items) = 8),
  next_action    TEXT    NOT NULL CHECK (length(next_action) BETWEEN 1 AND 60),
  computed_at    INTEGER NOT NULL,
  finalized_at   INTEGER,
  CHECK ((stage = 'final') = (finalized_at IS NOT NULL))
) STRICT;
CREATE TRIGGER consensus_cards_final_is_fixed
BEFORE UPDATE ON consensus_cards
WHEN OLD.stage = 'final'
BEGIN
  SELECT RAISE(ABORT, 'final consensus card is fixed');
END;

-- TBL-010 past_cards 지난 카드 요약 (CTX-001) ← SPEC-015, SPEC-016, SPEC-027, SPEC-028, SPEC-029, SPEC-030 | terms: TERM-044
-- 규칙: 최종 카드가 확정될 때 응답한 참여자마다 하나 생겨요(user_id, room_ref 유일 → 두 번 생기지 않음).
-- 규칙: 방이 만료돼도 남아요(room_ref는 외래 키가 아니고, rooms.id는 AUTOINCREMENT라 다시 쓰이지 않아요). 사용자가 데이터를 지우면 지워져요.
-- 규칙: 닉네임·방 코드가 없어요(SPEC-027). summary는 TBL-009의 items에 문항 문구와 분류별 문구를 붙인 사본이에요.
CREATE TABLE past_cards (
  id             INTEGER NOT NULL PRIMARY KEY,
  user_id        TEXT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  room_ref       INTEGER NOT NULL,
  gathering_name TEXT    NOT NULL CHECK (length(gathering_name) BETWEEN 1 AND 20),
  theme_name     TEXT    NOT NULL CHECK (length(theme_name) BETWEEN 1 AND 20),
  based_on_count INTEGER NOT NULL CHECK (based_on_count BETWEEN 2 AND 8),
  summary        TEXT    NOT NULL CHECK (json_valid(summary)),
  next_action    TEXT    NOT NULL CHECK (length(next_action) BETWEEN 1 AND 60),
  finalized_at   INTEGER NOT NULL,
  UNIQUE (user_id, room_ref)
) STRICT;
CREATE INDEX past_cards_user_recent ON past_cards (user_id, finalized_at, id);

-- TBL-011 notification_subscriptions 알림 신청 (CTX-006) ← SPEC-024, SPEC-025, SPEC-026, SPEC-028, SPEC-029, SPEC-030 | terms: TERM-035
-- 규칙(DEC-019): 발송용 사용자 식별키(TERM-028)는 AES-256-GCM 암호문으로만 둬요. 신청마다 새 12바이트 nonce,
--       키는 Workers 비밀 값이고 key_version으로 바꿀 수 있어요. 평문 열은 없어요.
-- 규칙: 응답을 낸 참여자만 신청할 수 있어요(responses (participant_id, room_id) 복합 외래 키). 참여자마다 하나예요.
-- 규칙(SPEC-026, REQ-084): 방 마감·만료·내 데이터 지우기와 같은 트랜잭션에서 지워요. 응답·참여자·방이 지워져도 CASCADE로 지워져요.
CREATE TABLE notification_subscriptions (
  id                  INTEGER NOT NULL PRIMARY KEY,
  participant_id      INTEGER NOT NULL UNIQUE,
  room_id             INTEGER NOT NULL,
  anon_key_ciphertext BLOB    NOT NULL CHECK (length(anon_key_ciphertext) BETWEEN 17 AND 512),
  nonce               BLOB    NOT NULL CHECK (length(nonce) = 12),
  key_version         INTEGER NOT NULL CHECK (key_version >= 1),
  created_at          INTEGER NOT NULL,
  FOREIGN KEY (participant_id, room_id) REFERENCES responses (participant_id, room_id) ON DELETE CASCADE
) STRICT;
CREATE INDEX notification_subscriptions_room ON notification_subscriptions (room_id);

-- TBL-012 notification_sends 알림 발송 기록 (CTX-006) ← SPEC-025 | terms: TERM-033
-- 규칙: 같은 응답으로 같은 신청에 두 번 보내지 않아요(subscription_id, trigger_participant_id 유일).
-- 규칙: 식별키·메시지 문구·토스 응답 원문을 두지 않아요. 토스 오류 코드만 둬요(C-2, C-7).
-- 규칙: 두 ID는 외래 키가 아니에요. 신청이 지워져도 기록이 남아야 같은 응답으로 다시 보내지 않기 때문이에요. 방이 만료되면 함께 지워져요.
CREATE TABLE notification_sends (
  id                     INTEGER NOT NULL PRIMARY KEY,
  room_id                INTEGER NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  subscription_id        INTEGER NOT NULL,
  trigger_participant_id INTEGER NOT NULL,
  result                 TEXT    NOT NULL CHECK (result IN ('pending', 'sent', 'failed', 'skipped_limit')),
  toss_error_code        TEXT    CHECK (length(toss_error_code) BETWEEN 1 AND 20),
  created_at             INTEGER NOT NULL,
  UNIQUE (subscription_id, trigger_participant_id)
) STRICT;
CREATE INDEX notification_sends_room ON notification_sends (room_id);

-- TBL-013 idempotency_records 요청 ID 기록 (공통 C-3) ← SPEC-005, SPEC-007, SPEC-011, SPEC-016, SPEC-024, SPEC-029 | terms: none
-- 규칙: 같은 사용자의 같은 요청 ID에는 24시간 동안 첫 결과를 다시 돌려줘요. 다른 내용으로 같은 ID를 쓰면 409예요(DEC-021).
-- 규칙: 결과가 정해진 응답(2xx, 400, 403, 404, 409)만 둬요. 401·429·5xx는 다시 시도할 수 있게 두지 않아요(DEC-021).
-- 규칙: response_body에는 그 응답 본문만 있고 세션 토큰·식별키는 없어요. 만료 작업이 24시간 지난 행을 지워요.
CREATE TABLE idempotency_records (
  user_id        TEXT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  request_id     TEXT    NOT NULL CHECK (length(request_id) = 36),
  operation      TEXT    NOT NULL CHECK (length(operation) BETWEEN 1 AND 40),
  request_sha256 TEXT    NOT NULL CHECK (length(request_sha256) = 64),
  status_code    INTEGER NOT NULL CHECK (status_code BETWEEN 200 AND 499),
  response_body  TEXT    NOT NULL CHECK (json_valid(response_body)),
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (user_id, request_id)
) STRICT;
CREATE INDEX idempotency_records_created ON idempotency_records (created_at);

-- TBL-014 rate_counters 요청 한도 계수 (공통 C-6) ← SPEC-002, SPEC-005, SPEC-024, SPEC-025, SPEC-038 | terms: none
-- 규칙: (scope, subject, window_start)마다 한 행이고, 조건을 건 UPSERT로 세요. subject는 사용자 ID이거나 미니앱 전체를 뜻하는 'app'이에요.
--   toss_api_user  토스 API 호출, 사용자당 1분 20건       toss_api_app   토스 API 호출, 미니앱당 1분 3,000건(1분 구간 기록, SPEC-038)
--   toss_send_key  알림 발송, 식별키당 1분 10건(F-4)      room_create    방 만들기, 사용자당 24시간 30개
--   write          쓰기 요청, 사용자당 1분 60건
-- 규칙: 내 데이터 지우기 때 그 사용자 ID의 행을 지워요(SPEC-029). 만료 작업이 7일 지난 행을 지워요.
CREATE TABLE rate_counters (
  scope        TEXT    NOT NULL CHECK (scope IN ('toss_api_user', 'toss_api_app', 'toss_send_key', 'room_create', 'write')),
  subject      TEXT    NOT NULL CHECK (subject = 'app' OR length(subject) = 26),
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL CHECK (count >= 0),
  PRIMARY KEY (scope, subject, window_start)
) STRICT;
CREATE INDEX rate_counters_window ON rate_counters (window_start);

-- TBL-015 entry_stats 유입 경로 집계 (CTX-005) ← SPEC-001, SPEC-023 | terms: none
-- 규칙: 하루(UTC)와 유입 종류마다 수만 세요. 사용자 ID·방 코드·기기 값을 두지 않아요(SPEC-023 노출).
CREATE TABLE entry_stats (
  day           TEXT    NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  referrer_kind TEXT    NOT NULL CHECK (referrer_kind IN ('external_share', 'other')),
  count         INTEGER NOT NULL CHECK (count >= 0),
  PRIMARY KEY (day, referrer_kind)
) STRICT;
