#!/usr/bin/env python3
"""10 WBS 검사: docs/10-wbs/wbs.md의 TASK 표를 04 SPEC, 06 API, 07 SCR, 02 REQ와 맞춰 봐요.

검사:
  - TASK ID가 겹치지 않음
  - active SPEC 행마다 TASK가 하나 이상
  - API operation 16개, 화면 15개가 모두 어느 TASK의 "건드리는 것"에 있음
  - REQ 칸이 SPEC 칸에서 모은 REQ와 같고, 모든 REQ가 어느 TASK에 닿음
  - 의존이 있는 TASK만 가리키고 순환이 없음
  - 담당이 한 명, 크기가 S·M·L, 완료 조건이 비지 않음
  - 제목이 API ID로 시작하는 TASK는 완료 조건이 "응답마다 테스트"를 요구함
사용: python3 scripts/check-wbs.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
WBS = ROOT / "docs/10-wbs/wbs.md"
SPEC = ROOT / "docs/04-functional-spec/spec.md"
REQS = ROOT / "docs/02-prd/requirements.md"
API = ROOT / "api/openapi.yaml"
SITEMAP = ROOT / "docs/07-sitemap/sitemap.yaml"


def expand(text, prefix):
    """'API-001~API-016', 'TBL-006~TBL-011'처럼 범위로 적은 것을 펼쳐요."""
    found = set(re.findall(rf"{prefix}-\d{{3}}", text))
    for a, b in re.findall(rf"{prefix}-(\d{{3}})~{prefix}-(\d{{3}})", text):
        for n in range(int(a), int(b) + 1):
            found.add(f"{prefix}-{n:03d}")
    return found


def main():
    fails, passes = [], 0

    def check(ok, msg):
        nonlocal passes
        if ok:
            passes += 1
        else:
            fails.append(msg)

    spec_req, spec_active = {}, set()
    for line in SPEC.read_text().splitlines():
        m = re.match(r"\| (SPEC-\d{3}) \| [^|]+ \| ([^|]+) \|", line)
        # 2절 SPEC 행 표만 읽어요(3절 점검 표도 SPEC ID로 시작하므로 첫 번째만).
        if m and m.group(1) not in spec_req:
            spec_req[m.group(1)] = set(re.findall(r"REQ-\d{3}", m.group(2)))
            status = line.rstrip(" |").rsplit("|", 1)[-1].strip()
            if status not in ("removed", "deferred"):
                spec_active.add(m.group(1))
    all_req = set(re.findall(r"^\| (REQ-\d{3}) \|", REQS.read_text(), re.M))
    all_api = set(re.findall(r"id: (API-\d{3})", API.read_text()))
    all_scr = set(re.findall(r"id: (SCR-\d{3})", SITEMAP.read_text()))

    rows, header = [], None
    for line in WBS.read_text().splitlines():
        if line.startswith("| ID | 작업 |"):
            header = [c.strip() for c in line.strip("|").split("|")]
            continue
        if header and line.startswith("| TASK-"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) != len(header):
                fails.append(f"{cells[0]}: 칸 수 {len(cells)} ≠ {len(header)}")
                continue
            rows.append(dict(zip(header, cells)))
        elif header and rows and not line.startswith("|"):
            break

    ids = [r["ID"] for r in rows]
    check(len(ids) == len(set(ids)), f"겹치는 TASK ID: {sorted({i for i in ids if ids.count(i) > 1})}")
    idset = set(ids)

    covered_spec, covered_req, covered_api, covered_scr = set(), set(), set(), set()
    deps = {}
    for r in rows:
        tid = r["ID"]
        specs = set(re.findall(r"SPEC-\d{3}", r["SPEC"]))
        check(bool(specs), f"{tid}: SPEC이 없음")
        covered_spec |= specs
        want = set().union(*(spec_req.get(s, set()) for s in specs)) if specs else set()
        got = set(re.findall(r"REQ-\d{3}", r["REQ(SPEC에서)"]))
        check(got == want, f"{tid}: REQ 칸이 SPEC에서 모은 것과 다름(더 있음 {sorted(got - want)}, 빠짐 {sorted(want - got)})")
        covered_req |= got
        touches = r["건드리는 것(API·TBL·SCR)"] + " " + r["작업"]
        covered_api |= expand(touches, "API")
        covered_scr |= expand(touches, "SCR")
        d = set(re.findall(r"TASK-\d{3}", r["의존"]))
        deps[tid] = d
        check(d <= idset, f"{tid}: 없는 TASK에 의존 {sorted(d - idset)}")
        check(tid not in d, f"{tid}: 자기 자신에 의존")
        owner = r["담당"]
        check(owner and "," not in owner and "·" not in owner, f"{tid}: 담당이 한 명이 아님({owner!r})")
        check(r["크기"] in ("S", "M", "L"), f"{tid}: 크기가 S·M·L이 아님({r['크기']!r})")
        check(len(r["완료 조건"]) >= 20, f"{tid}: 완료 조건이 비었거나 너무 짧음")
        if re.match(r"API-\d{3}", r["작업"]):
            check("응답마다 테스트" in r["완료 조건"], f"{tid}: API TASK인데 완료 조건에 '응답마다 테스트'가 없음")

    check(spec_active <= covered_spec, f"TASK가 없는 SPEC: {sorted(spec_active - covered_spec)}")
    check(all_req <= covered_req, f"TASK에 닿지 않는 REQ: {sorted(all_req - covered_req)}")
    check(all_api <= covered_api, f"TASK가 없는 API: {sorted(all_api - covered_api)}")
    check(all_scr <= covered_scr, f"TASK가 없는 SCR: {sorted(all_scr - covered_scr)}")

    # 순환 검사(위상 정렬)와 단계 나누기
    level, seen, stack = {}, set(), set()

    def depth(t):
        if t in level:
            return level[t]
        if t in stack:
            raise ValueError(t)
        stack.add(t)
        lv = 1 + max((depth(x) for x in deps.get(t, ()) if x in idset), default=0)
        stack.discard(t)
        level[t] = lv
        return lv

    try:
        for t in ids:
            depth(t)
        check(True, "")
    except ValueError as e:
        fails.append(f"의존 순환: {e}")

    print(f"TASK {len(rows)}개, SPEC {len(covered_spec & spec_active)}/{len(spec_active)}, "
          f"REQ {len(covered_req & all_req)}/{len(all_req)}, API {len(covered_api & all_api)}/{len(all_api)}, "
          f"SCR {len(covered_scr & all_scr)}/{len(all_scr)}")
    if level:
        longest = max(level.values())
        print(f"가장 긴 의존 사슬: TASK {longest}개")
        first = sorted(t for t, lv in level.items() if lv == 1)
        print(f"의존 없이 시작할 수 있는 TASK: {', '.join(first)}")
    print(f"통과 {passes}, 실패 {len(fails)}")
    for f in fails:
        print("  실패:", f)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
