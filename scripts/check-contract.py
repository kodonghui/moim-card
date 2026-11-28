#!/usr/bin/env python3
"""Checks for stages 05 (db/schema.sql, db/migrations) and 06 (api/openapi.yaml).

Needs Python 3.8+, PyYAML and jsonschema. Run from the repository root:
    python3 scripts/check-contract.py [--base <git ref>]
Exit code 0 when every check passes, 1 otherwise.
"""
import argparse
import copy
import json
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

import jsonschema
import yaml

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "db" / "schema.sql"
MIGRATIONS = ROOT / "db" / "migrations"
OPENAPI = ROOT / "api" / "openapi.yaml"
SPEC_MD = ROOT / "docs" / "04-functional-spec" / "spec.md"

parser = argparse.ArgumentParser()
parser.add_argument("--base", default="origin/main")
args = parser.parse_args()

failures = []
notes = []


def check(ok, message):
    (notes if ok else failures).append(("PASS " if ok else "FAIL ") + message)
    return ok


# ---------------------------------------------------------------- inputs
spec_text = SPEC_MD.read_text(encoding="utf-8")
spec_rows = {}
for line in spec_text.splitlines():
    m = re.match(r"\| (SPEC-\d{3}) \| [^|]+ \|.*\| (active|질문 대기|removed|deferred) \|$", line)
    if m:
        spec_rows[m.group(1)] = m.group(2)
active_specs = {k for k, v in spec_rows.items() if v in ("active", "질문 대기")}
check(len(spec_rows) > 0, f"04 spec.md에서 SPEC 행 {len(spec_rows)}개를 읽음(active·질문 대기 {len(active_specs)}개)")

schema_sql = SCHEMA.read_text(encoding="utf-8")


def strip_line_comments(sql):
    return "\n".join(line.split("--", 1)[0] if not line.lstrip().startswith("--") else "" for line in sql.splitlines())


# ---------------------------------------------------------------- 05 ERD
def build(scripts):
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys = ON")
    for script in scripts:
        db.executescript(script)
    return db


def master(db):
    # SQLite quotes identifiers introduced by ALTER TABLE RENAME; these names
    # are equivalent to the same unquoted simple identifiers in schema.sql.
    def canonical(sql):
        return re.sub(r'"([A-Za-z_][A-Za-z_0-9]*)"', r'\1', re.sub(r"\s+", " ", sql or "").strip())
    return sorted(
        (t, n, tbl, canonical(sql))
        for t, n, tbl, sql in db.execute("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'")
    )


migration_files = sorted(MIGRATIONS.glob("[0-9][0-9][0-9][0-9]_*.sql"))
check(len(migration_files) >= 1, f"마이그레이션 {len(migration_files)}개: {', '.join(p.name for p in migration_files)}")
numbers = [int(p.name[:4]) for p in migration_files]
check(numbers == list(range(1, len(numbers) + 1)), "마이그레이션 번호가 0001부터 빈틈없이 이어짐")
try:
    from_migrations = build([p.read_text(encoding="utf-8") for p in migration_files])
    from_schema = build([schema_sql])
    same = master(from_migrations) == master(from_schema)
    check(same, "빈 데이터베이스에 마이그레이션을 차례로 적용한 결과가 db/schema.sql과 같음")
except sqlite3.Error as error:
    check(False, f"스키마를 빈 데이터베이스에 만들지 못함: {error}")
    from_schema = None

# TBL comments
tbl_blocks = re.findall(r"^-- (TBL-\d{3}) (\w+) [^\n]*?← ([^|\n]*)\|[^\n]*\n(?:--[^\n]*\n)*CREATE TABLE (\w+)", schema_sql, re.M)
create_tables = re.findall(r"^CREATE TABLE (\w+)", schema_sql, re.M)
tbl_ids = [b[0] for b in tbl_blocks]
check(len(tbl_blocks) == len(create_tables), f"CREATE TABLE {len(create_tables)}개 모두 바로 위에 TBL ID 주석이 있음({len(tbl_blocks)}개)")
check(len(set(tbl_ids)) == len(tbl_ids), "TBL ID가 겹치지 않음")
check(tbl_ids == [f"TBL-{i:03d}" for i in range(1, len(tbl_ids) + 1)], f"TBL ID가 TBL-001부터 차례로 {len(tbl_ids)}개")
tbl_by_table = {}
tbl_specs = {}
for tbl, name, specs, table in tbl_blocks:
    check(name == table, f"{tbl} 주석의 이름({name})과 테이블 이름({table})이 같음")
    ids = re.findall(r"SPEC-\d{3}", specs)
    unknown = [s for s in ids if s not in spec_rows]
    check(ids and not unknown, f"{tbl} {table}: SPEC {len(ids)}개, 04에 없는 SPEC {unknown or '없음'}")
    tbl_by_table[table] = tbl
    tbl_specs[tbl] = set(ids)
if from_schema is not None:
    for table in create_tables:
        pk = [r for r in from_schema.execute(f"PRAGMA table_info({table})") if r[5] > 0]
        check(bool(pk), f"{tbl_by_table.get(table, table)} {table}: 기본 키 있음({', '.join(r[1] for r in pk)})")

# constraint behaviour on sample rows
def expect_error(db, sql, params=(), label=""):
    try:
        db.execute(sql, params)
    except sqlite3.DatabaseError:
        return check(True, f"제약: {label} → 거절")
    return check(False, f"제약: {label} → 거절돼야 하는데 들어감")


if from_schema is not None:
    db = build([schema_sql])
    u1, u2, u3 = "A" * 26, "B" * 26, "C" * 26
    now = 1764320000
    db.executemany("INSERT INTO users VALUES (?, ?, ?)", [(u1, "1" * 64, now), (u2, "2" * 64, now), (u3, "3" * 64, now)])
    expect_error(db, "INSERT INTO users VALUES (?, ?, ?)", ("D" * 26, "1" * 64, now), "같은 key_hash의 사용자 두 명(SPEC-003)")
    db.execute("INSERT INTO themes VALUES ('travel', '여행', 1)")
    db.execute("INSERT INTO question_sets VALUES (1, 'travel', 1, 'published', '기본 문구', ?, ?, NULL)", ("a" * 64, now))
    expect_error(db, "INSERT INTO question_sets VALUES (2, 'travel', 1, 'published', '기본 문구', ?, ?, NULL)", ("b" * 64, now), "같은 테마의 같은 버전(SPEC-031)")
    for p in range(1, 9):
        db.execute("INSERT INTO questions VALUES (1, ?, '문항', 'A', 'B', '조율', '확정A', '확정B', NULL, NULL)", (p,))
    expect_error(db, "INSERT INTO questions VALUES (1, 9, '문항', 'A', 'B', '조율', '확정A', '확정B', NULL, NULL)", (), "문항 번호 9")
    expect_error(db, "INSERT INTO questions VALUES (1, 1, '문항', 'A', 'B', '조율', '확정A', '확정B', 'plan_speed', NULL)", (), "축만 있고 축 방향이 없는 문항(축 매핑)")
    db.execute("INSERT INTO profile_phrases VALUES (1, 'balanced', '균형 문구')")
    expect_error(db, "INSERT INTO profile_phrases VALUES (1, 'balanced', '다른 문구')", (), "같은 세트의 같은 성향 문구 자리 두 번(SPEC-031)")
    expect_error(db, "INSERT INTO profile_phrases VALUES (1, 'plan_speed_mid', '문구')", (), "알 수 없는 성향 문구 자리(SPEC-031)")
    expect_error(db, "INSERT INTO profile_phrases VALUES (1, 'plan_speed_low', '')", (), "빈 성향 문구(SPEC-031)")
    room = "INSERT INTO rooms (code, gathering_name, party_size, question_set_id, created_at, expires_at) VALUES (?, ?, ?, 1, ?, ?)"
    db.execute(room, ("ABCDEFGH23", "제주 3박", 4, now, now + 2592000))
    expect_error(db, room, ("ABCDEFGH0O", "x", 4, now, now + 2592000), "0·O가 든 방 코드(C-5)")
    expect_error(db, room, ("ABCDEFGH24", "x", 9, now, now + 2592000), "인원 9(SPEC-005)")
    expect_error(db, room, ("ABCDEFGH25", "가" * 21, 4, now, now + 2592000), "모임 이름 21자(SPEC-005)")
    expect_error(db, room, ("ABCDEFGH26", "x", 4, now, now + 86400), "보관 기간이 30일이 아님(C-8)")
    expect_error(db, "UPDATE rooms SET status = 'closed' WHERE id = 1", (), "마감 시각·이유 없이 마감")
    part = "INSERT INTO participants (room_id, user_id, role, nickname, joined_at) VALUES (1, ?, ?, ?, ?)"
    db.execute(part, (u1, "host", "민지", now))
    expect_error(db, part, (u2, "host", "하늘", now), "한 방에 방장 두 명")
    db.execute(part, (u2, "member", "하늘", now))
    expect_error(db, part, (u2, "member", "하늘2", now), "같은 사용자가 같은 방에 두 번 참여(SPEC-007)")
    expect_error(db, part, (u3, "member", "가나다라마바사아자차카", now), "닉네임 11자(SPEC-008)")
    db.execute("INSERT INTO responses VALUES (1, 1, 'ABNABNAB', ?)", (now,))
    expect_error(db, "INSERT INTO responses VALUES (2, 1, 'ABNABNA', ?)", (now,), "답 7개(SPEC-011)")
    expect_error(db, "INSERT INTO responses VALUES (2, 1, 'ABNABNAX', ?)", (now,), "A·B·N 밖의 답(SPEC-011)")
    expect_error(db, "INSERT INTO responses VALUES (1, 1, 'AAAAAAAA', ?)", (now,), "같은 참여자의 두 번째 응답(SPEC-011)")
    expect_error(db, "INSERT INTO notification_subscriptions (participant_id, room_id, anon_key_ciphertext, nonce, key_version, created_at) VALUES (2, 1, ?, ?, 1, ?)",
                 (b"x" * 40, b"n" * 12, now), "응답 전 알림 신청(SPEC-024)")
    db.execute("INSERT INTO notification_subscriptions (participant_id, room_id, anon_key_ciphertext, nonce, key_version, created_at) VALUES (1, 1, ?, ?, 1, ?)", (b"x" * 40, b"n" * 12, now))
    items = json.dumps([{"position": p, "a": 1, "b": 1, "none": 0, "category": "split"} for p in range(1, 9)])
    db.execute("INSERT INTO consensus_cards VALUES (1, 'final', 2, ?, '다음 행동', ?, ?)", (items, now, now))
    expect_error(db, "UPDATE consensus_cards SET next_action = '바뀐 문구' WHERE room_id = 1", (), "확정된 최종 카드 고치기(SPEC-015)")
    expect_error(db, "INSERT INTO consensus_cards VALUES (1, 'interim', 1, ?, 'x', ?, NULL)", (items, now), "응답 1명 기준 카드")
    db.execute("INSERT INTO past_cards (user_id, room_ref, gathering_name, theme_name, based_on_count, summary, next_action, finalized_at) VALUES (?, 1, '제주 3박', '여행', 2, '[]', '다음 행동', ?)", (u1, now))
    expect_error(db, "INSERT INTO past_cards (user_id, room_ref, gathering_name, theme_name, based_on_count, summary, next_action, finalized_at) VALUES (?, 1, '제주 3박', '여행', 2, '[]', '다음 행동', ?)", (u1, now), "같은 방의 지난 카드 두 번(SPEC-015)")
    db.execute("INSERT INTO sessions VALUES (?, ?, ?, ?, NULL)", ("e" * 64, u1, now, now + 43200))
    expect_error(db, "DELETE FROM users WHERE id = ?", (u1,), "세션 revoked_at 없이 사용자 지우기(SPEC-029 순서)")
    db.execute("UPDATE sessions SET revoked_at = ? WHERE user_id = ?", (now, u1))
    db.execute("DELETE FROM users WHERE id = ?", (u1,))
    left = {t: db.execute(q, (u1,)).fetchone()[0] for t, q in {
        "participants": "SELECT count(*) FROM participants WHERE user_id = ?",
        "past_cards": "SELECT count(*) FROM past_cards WHERE user_id = ?",
        "sessions(user_id)": "SELECT count(*) FROM sessions WHERE user_id = ?",
    }.items()}
    left["responses(participant 1)"] = db.execute("SELECT count(*) FROM responses WHERE participant_id = 1").fetchone()[0]
    left["notification_subscriptions(participant 1)"] = db.execute("SELECT count(*) FROM notification_subscriptions WHERE participant_id = 1").fetchone()[0]
    check(all(v == 0 for v in left.values()), f"제약: 사용자를 지우면 참여자·응답·알림 신청·지난 카드가 함께 지워짐 {left}")
    check(db.execute("SELECT count(*) FROM consensus_cards WHERE room_id = 1").fetchone()[0] == 1, "제약: 사용자를 지워도 확정된 최종 카드는 남음(DEC-010)")
    check(db.execute("SELECT count(*) FROM sessions WHERE token_hash = ? AND revoked_at IS NOT NULL", ("e" * 64,)).fetchone()[0] == 1, "제약: 지운 사용자의 세션은 revoked로 남음(SPEC-029 반복)")
    db.execute("INSERT INTO past_cards (user_id, room_ref, gathering_name, theme_name, based_on_count, summary, next_action, finalized_at) VALUES (?, 1, '제주 3박', '여행', 2, '[]', '다음 행동', ?)", (u2, now))
    db.execute("DELETE FROM rooms WHERE id = 1")
    left_room = {t: db.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in ("participants", "responses", "consensus_cards", "notification_subscriptions")}
    check(all(v == 0 for v in left_room.values()), f"제약: 방이 만료돼 지워지면 참여자·응답·카드·알림 신청이 함께 지워짐 {left_room}")
    check(db.execute("SELECT count(*) FROM past_cards WHERE user_id = ?", (u2,)).fetchone()[0] == 1, "제약: 방이 지워져도 지난 카드 요약은 남음(SPEC-030)")

# ---------------------------------------------------------------- 06 API
api = yaml.safe_load(OPENAPI.read_text(encoding="utf-8"))
components = api.get("components", {})
errors = components.get("x-corthex", {}).get("errors", {})
problem_codes = set(components["schemas"]["Problem"]["properties"]["code"]["enum"])
check(problem_codes == set(errors), f"Problem.code의 값 {len(problem_codes)}개가 오류 목록 {len(errors)}개와 같음")
check(str(api.get("openapi", "")).startswith("3.1"), f"OpenAPI 버전 {api.get('openapi')}")


def resolve(node, seen=()):
    """Inline local $refs so jsonschema can validate examples."""
    if isinstance(node, dict):
        if "$ref" in node and node["$ref"].startswith("#/"):
            ref = node["$ref"]
            if ref in seen:
                raise ValueError("recursive $ref " + ref)
            target = api
            for part in ref[2:].split("/"):
                target = target[part]
            merged = resolve(copy.deepcopy(target), seen + (ref,))
            rest = {k: v for k, v in node.items() if k != "$ref"}
            if rest:
                merged = {"allOf": [merged, resolve(rest, seen)]}
            return merged
        return {k: resolve(v, seen) for k, v in node.items()}
    if isinstance(node, list):
        return [resolve(v, seen) for v in node]
    return node


validator_cls = jsonschema.Draft202012Validator
api_ids, op_specs, op_tables = [], {}, {}
example_count = 0
for path, item in api["paths"].items():
    for method, operation in item.items():
        label = f"{method.upper()} {path}"
        xc = operation.get("x-corthex", {})
        api_id = xc.get("id", "")
        api_ids.append(api_id)
        specs = xc.get("spec", [])
        tables = xc.get("tables", [])
        unknown = [s for s in specs if s not in spec_rows]
        check(re.fullmatch(r"API-\d{3}", api_id or "") is not None and specs and not unknown, f"{api_id} {label}: SPEC {len(specs)}개, 04에 없는 SPEC {unknown or '없음'}")
        bad_tables = [t for t in tables if t not in tbl_specs]
        check(tables and not bad_tables, f"{api_id}: TBL {len(tables)}개, 05에 없는 TBL {bad_tables or '없음'}")
        op_specs[api_id] = set(specs)
        op_tables[api_id] = set(tables)
        responses = operation.get("responses", {})
        omit = xc.get("omit", {}) or {}
        secured = operation.get("security", api.get("security")) not in ([], None)
        success = [c for c in responses if c in ("200", "201", "204")]
        check(bool(success), f"{api_id}: 성공 응답 {success}")
        required = ["400", "403", "404", "409", "default"] + (["401"] if secured else [])
        for code in required:
            if code == "401" and secured:
                check("401" in responses, f"{api_id}: 로그인이 필요한 operation에 401 있음")
            else:
                check(code in responses or code in omit, f"{api_id}: {code}는 응답에 있거나 omit에 이유가 있음")
        for code in omit:
            check(code not in responses, f"{api_id}: omit의 {code}가 응답에도 있지 않음")
        if any(p.get("$ref", "").endswith("IdempotencyKey") for p in operation.get("parameters", [])):
            check("400" in responses, f"{api_id}: Idempotency-Key가 필수라 400이 있음")
            check("409" in responses and "idempotency-conflict" in responses.get("409", {}).get("content", {}).get("application/problem+json", {}).get("examples", {}), f"{api_id}: 요청 ID 충돌 409 예시가 있음")
        # request body examples
        req = operation.get("requestBody")
        if req:
            for media, content in req["content"].items():
                schema = resolve(content["schema"])
                exs = content.get("examples", {})
                check(bool(exs), f"{api_id}: 요청 본문 예시 있음")
                for name, ex_ in exs.items():
                    errs = list(validator_cls(schema, format_checker=jsonschema.FormatChecker()).iter_errors(ex_["value"]))
                    check(not errs, f"{api_id} 요청 예시 {name}이 스키마에 맞음" + (f": {errs[0].message}" if errs else ""))
                    example_count += 1
            # request field limits
            schema = resolve(req["content"]["application/json"]["schema"])

            def walk(s, where):
                t = s.get("type")
                if t == "string":
                    check("maxLength" in s or "enum" in s, f"{api_id}: 요청 필드 {where}에 길이 제한이나 enum 있음")
                elif t == "integer":
                    check("minimum" in s and "maximum" in s, f"{api_id}: 요청 필드 {where}에 minimum·maximum 있음")
                elif t == "array":
                    check("maxItems" in s, f"{api_id}: 요청 필드 {where}에 maxItems 있음")
                    walk(s.get("items", {}), where + "[]")
                for k, v in (s.get("properties") or {}).items():
                    walk(v, f"{where}.{k}")

            walk(schema, "body")
        for param in operation.get("parameters", []):
            param = resolve(param)
            s = param["schema"]
            check("maxLength" in s, f"{api_id}: 매개변수 {param['name']}에 maxLength 있음")
        # response examples
        for code, response in responses.items():
            response = resolve(response)
            content = response.get("content")
            if not content:
                check(code == "204", f"{api_id} {code}: 본문 없는 응답은 204뿐")
                continue
            for media, body in content.items():
                schema = body["schema"]
                exs = body.get("examples", {})
                check(bool(exs), f"{api_id} {code}: 예시 있음")
                for name, ex_ in exs.items():
                    value = ex_["value"]
                    errs = list(validator_cls(schema, format_checker=jsonschema.FormatChecker()).iter_errors(value))
                    check(not errs, f"{api_id} {code} 예시 {name}이 스키마에 맞음" + (f": {errs[0].message}" if errs else ""))
                    example_count += 1
                    if media == "application/problem+json":
                        err = errors.get(value.get("code"))
                        check(err is not None, f"{api_id} {code} 예시 {name}: 오류 코드 {value.get('code')}가 목록에 있음")
                        if err:
                            check(err["status"] == value.get("status"), f"{api_id} {code} 예시 {name}: 목록의 상태 {err['status']} = 예시 status {value.get('status')}")
                            if code != "default":
                                check(str(value.get("status")) == code, f"{api_id} {code} 예시 {name}: status가 응답 코드와 같음")
                            else:
                                check(str(value.get("status")) not in responses, f"{api_id} default 예시 {name}: 다른 응답에 없는 상태({value.get('status')})")

check(len(set(api_ids)) == len(api_ids), f"API ID {len(api_ids)}개가 겹치지 않음")
check(sorted(api_ids) == [f"API-{i:03d}" for i in range(1, len(api_ids) + 1)], f"API ID가 API-001부터 차례로 {len(api_ids)}개")
check(example_count > 0, f"예시 {example_count}개를 스키마로 검사함")

# SPEC coverage
xc_root = components.get("x-corthex", {})
job_specs = set()
for job in xc_root.get("jobs", {}).values():
    job_specs |= set(job.get("spec", []))
outside = set(xc_root.get("outside-the-server", {}))
cross = set(xc_root.get("cross-cutting", {}))
by_api = set().union(*op_specs.values()) if op_specs else set()
covered = by_api | job_specs | outside | cross
missing = sorted(active_specs - covered)
check(not missing, f"SPEC {len(active_specs)}행 연결: operation {len(by_api & active_specs)}, 서버 안 작업만 {len((job_specs - by_api) & active_specs)}, 서버 밖 {len(outside & active_specs)}, 공통 {len(cross - by_api)}; 빠진 것 {missing or '없음'}")
overlap = sorted(outside & (by_api | job_specs))
check(not overlap, f"서버 밖으로 적은 SPEC이 operation·작업에도 있지 않음 {overlap or ''}")
server_specs_without_tbl = sorted(s for s in (by_api | job_specs) if not any(s in v for v in tbl_specs.values()))
notes.append(f"INFO 테이블이 없는 서버 SPEC(계산만 하거나 기록하지 않음): {server_specs_without_tbl or '없음'}")
tbl_specs_not_in_api = sorted(s for t, v in tbl_specs.items() for s in v if s not in covered)
check(not tbl_specs_not_in_api, f"TBL이 가리키는 SPEC이 모두 06에 연결됨 {tbl_specs_not_in_api or ''}")

# unused tables
used_tables = set().union(*op_tables.values()) | {t for job in xc_root.get("jobs", {}).values() for t in job.get("tables", [])}
unused = sorted(set(tbl_specs) - used_tables)
check(not unused, f"쓰지 않는 테이블 없음(operation·작업이 TBL {len(used_tables)}개를 씀) {unused or ''}")

# column limits = contract limits
LIMITS = [
    ("NewRoom.gatheringName", "rooms", "gathering_name", 1, 20),
    ("NewRoom.hostNickname", "participants", "nickname", 1, 10),
    ("JoinRequest.nickname", "participants", "nickname", 1, 10),
    ("NewRoom.partySize", "rooms", "party_size", 2, 8),
    ("CardItem.prompt", "questions", "prompt", 1, 40),
    ("CardItem.optionA", "questions", "option_a", 1, 30),
    ("CardItem.text", "questions", "split_suggestion", 1, 60),
    ("PastCardPage.nextAction", "past_cards", "next_action", 1, 60),
    ("PersonalProfile.summary", "profile_phrases", "phrase", 1, 60),
]
for where, table, column, lo, hi in LIMITS:
    schema_name, field = where.split(".")
    s = components["schemas"][schema_name]
    if schema_name == "PastCardPage":
        s = s["properties"]["pastCards"]["items"]
    prop = s["properties"][field]
    normalized = prop.get("x-normalized-max-length")
    got = (prop.get("minimum", prop.get("minLength")), normalized if normalized is not None else prop.get("maximum", prop.get("maxLength")))
    if normalized is not None:
        check(prop.get("maxLength") == normalized + 20, f"원문 길이 여유 {where}: 정규화 뒤 {normalized}, 원문 {prop.get('maxLength')}")
    m = re.search(rf"\b{column}\s+\w+\s+NOT NULL[^\n]*?BETWEEN (\d+) AND (\d+)", schema_sql.split(f"CREATE TABLE {table} (")[1].split(") STRICT;")[0])
    col = (int(m.group(1)), int(m.group(2))) if m else None
    check(got == (lo, hi) == col, f"한계 {where} {got} = {table}.{column} {col}")

# breaking changes against a base ref
try:
    old_text = subprocess.run(["git", "show", f"{args.base}:api/openapi.yaml"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    old = yaml.safe_load(old_text)
except subprocess.CalledProcessError:
    old = None
if old is None:
    notes.append(f"INFO 깨지는 변경 검사: {args.base}에 api/openapi.yaml이 없어 첫 계약이에요. 비교 대상 없음, 깨지는 변경 0개")
else:
    breaking = []
    for path, item in old["paths"].items():
        for method, operation in item.items():
            new_op = api["paths"].get(path, {}).get(method)
            oid = operation.get("x-corthex", {}).get("id")
            if not new_op:
                breaking.append(f"{oid} {method.upper()} {path} 없어짐")
                continue
            for code in operation.get("responses", {}):
                if code not in new_op.get("responses", {}):
                    breaking.append(f"{oid} 응답 {code} 없어짐")
    for code in old.get("components", {}).get("x-corthex", {}).get("errors", {}):
        if code not in errors:
            breaking.append(f"오류 코드 {code} 없어짐")
    for name, schema in old.get("components", {}).get("schemas", {}).items():
        new_schema = components["schemas"].get(name)
        if new_schema is None:
            breaking.append(f"스키마 {name} 없어짐")
            continue
        for field in schema.get("properties", {}):
            if field not in new_schema.get("properties", {}):
                breaking.append(f"{name}.{field} 없어짐")
        for field in set(new_schema.get("required", [])) - set(schema.get("required", [])):
            breaking.append(f"{name}.{field} 새 필수 값")
    check(not breaking, f"깨지는 변경({args.base} 대비): {breaking or '없음'}")

for line in notes:
    print(line)
for line in failures:
    print(line)
print(f"\n결과: 통과 {sum(1 for n in notes if n.startswith('PASS'))}, 실패 {len(failures)}")
sys.exit(1 if failures else 0)
