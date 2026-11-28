-- 0002_profile_phrases: 성향 문구 테이블(TBL-016)을 더해요(DEC-039, SPEC-012·SPEC-031 변경).
-- 적용: wrangler d1 migrations apply <DB 이름> (wrangler.toml의 migrations_dir = "db/migrations").
-- 적용된 뒤에는 이 파일을 고치지 않고 새 번호의 파일을 더해요.

-- TBL-016 profile_phrases 성향 문구 (CTX-002) ← SPEC-012, SPEC-031 | terms: TERM-024
-- 규칙: 문항 세트 버전마다 성향 문구 7개예요: 축 3개마다 '낮음'·'높음' 문구와 '균형' 문구 1개(DEC-039). "7개 모두 있음"은 형식 검사 스크립트가 봐요(SPEC-031).
-- 규칙: 한 줄 설명(SPEC-012)은 이 7개 중 하나예요. 길이는 06 PersonalProfile.summary와 같은 60자예요.
-- 규칙: 배포 스크립트가 TBL-004·TBL-005와 같은 batch에서 넣어요. 방이 쓰는 세트는 지울 수 없어요(RESTRICT).
CREATE TABLE profile_phrases (
  question_set_id INTEGER NOT NULL REFERENCES question_sets (id) ON DELETE RESTRICT,
  slot            TEXT    NOT NULL CHECK (slot IN ('plan_speed_low', 'plan_speed_high', 'spending_priority_low', 'spending_priority_high', 'schedule_change_low', 'schedule_change_high', 'balanced')),
  phrase          TEXT    NOT NULL CHECK (length(phrase) BETWEEN 1 AND 60),
  PRIMARY KEY (question_set_id, slot)
) STRICT;
