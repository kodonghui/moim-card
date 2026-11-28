#!/usr/bin/env python3
"""07 사이트맵과 08 화면 정의의 연결 검사.

검사하는 것:
  07  SCR ID 차례·중복, 경로 중복, 접근·상태·용어 칸, 흐름 ID가 있는지,
      흐름 단계 표의 SCR 칸이 모두 채워졌는지, 단계 표가 가리키는 SCR·상태가 있는지,
      사이트맵의 flows가 단계 표에서 모은 흐름과 같은지, 보기(sitemap.html)에 화면마다 한 번씩
  08  활성 화면마다 정의 파일, 기본 상태 여섯 개가 상태 표나 "해당하지 않는 상태"에 있는지,
      화면이 부르는 API의 모든 응답(상태 코드와 오류 코드)이 "응답과 상태" 표에 있는지,
      표가 가리키는 상태가 있는지, 동작마다 결과와 실패가 있는지, SPEC 연결,
      상태마다 와이어프레임(wireframes.html의 data-state)이 있는지
표준 라이브러리와 PyYAML만 써요. 실행: python3 scripts/check-screens.py
"""
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
BASE = ("normal", "loading", "empty", "error", "permission", "stale")
passed, failed = [], []


def ok(cond, message):
    (passed if cond else failed).append(message)
    return cond


def table(text, heading):
    """heading 아래 첫 표의 행(머리줄 빼고)을 칸 목록으로."""
    m = re.search(r"^## " + re.escape(heading) + r"\s*$(.*?)(?=^## |\Z)", text, re.S | re.M)
    if not m:
        return None
    rows = [l for l in m.group(1).splitlines() if l.startswith("|")]
    return [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows[2:]]


def section(text, heading):
    m = re.search(r"^## " + re.escape(heading) + r"\s*$(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1) if m else None


# ---------- 07 사이트맵 ----------
sitemap = yaml.safe_load((ROOT / "docs/07-sitemap/sitemap.yaml").read_text())
screens = []


def walk(nodes, parent=None):
    for n in nodes:
        n["parent"] = parent
        screens.append(n)
        walk(n.get("children") or [], n["id"])


walk(sitemap)
ids = [s["id"] for s in screens]
ok(len(set(ids)) == len(ids), "07 SCR ID 중복 없음")
ok(sorted(int(x[4:]) for x in ids) == list(range(1, len(ids) + 1)), "07 SCR ID가 001부터 빈 번호 없음")
paths = [s["path"] for s in screens]
ok(len(set(paths)) == len(paths), "07 경로 중복 없음")
for s in screens:
    ok(bool(s.get("access")), "07 %s 접근(access)" % s["id"])
    ok(s.get("status") in ("active", "removed"), "07 %s 상태(status)" % s["id"])
    ok("terms" in s, "07 %s 용어(terms)" % s["id"])
active = [s for s in screens if s.get("status") == "active"]
ok(sum(1 for s in screens if s["parent"] is None) == 1, "07 뿌리 화면이 하나(모든 화면이 뿌리에서 닿음)")

domain = (ROOT / "docs/01-domain/domain.md").read_text()
known_terms = set(re.findall(r"^\| (TERM-\d{3}) \|", domain, re.M)) | set(re.findall(r"### (CTX-\d{3})", domain))
for s in screens:
    if isinstance(s.get("terms"), list):
        bad = [t for t in s["terms"] if t not in known_terms]
        ok(not bad, "07 %s 용어가 01에 있음 %s" % (s["id"], bad or ""))

# 흐름 단계 표의 SCR 칸
flow_files = sorted((ROOT / "docs/03-user-flow").glob("FL-0*.md"))
flow_ids = [f.name[:6] for f in flow_files]
cited = {}          # SCR -> set(FL)
cited_states = set()
for f in flow_files:
    rows = table(f.read_text(), "단계")
    ok(rows is not None and all(len(r) == 5 for r in rows), "03 %s 단계 표에 SCR 칸" % f.name[:6])
    for r in rows or []:
        cell = r[4] if len(r) == 5 else ""
        ok(bool(cell), "03 %s '%s' SCR 칸이 채워짐" % (f.name[:6], r[0]))
        for scr, state in re.findall(r"(SCR-\d{3})(?:#([a-z-]+))?", cell):
            cited.setdefault(scr, set()).add(f.name[:6])
            if state:
                cited_states.add(scr + "#" + state)
        leftover = re.sub(r"SCR-\d{3}(#[a-z-]+)?(\([^)]*\))?|서버(\([^)]*\))?|운영\([^)]*\)|토스\([^)]*\)|[ ,]", "", cell)
        ok(leftover == "", "03 %s '%s' SCR 칸 형식 %s" % (f.name[:6], r[0], leftover or ""))
for s in active:
    ok(s["id"] in cited, "03 단계 표가 %s를 가리킴" % s["id"])
    got = sorted(cited.get(s["id"], ()))
    ok(sorted(s.get("flows") or []) == got, "07 %s flows = 단계 표의 흐름 %s" % (s["id"], "" if sorted(s.get("flows") or []) == got else got))
    ok(all(x in flow_ids for x in s.get("flows") or []), "07 %s 흐름 ID가 있음" % s["id"])
ok(all(k in ids for k in cited), "03 단계 표의 SCR이 사이트맵에 있음 %s" % sorted(set(cited) - set(ids)))

html = ROOT / "docs/07-sitemap/sitemap.html"
if ok(html.exists(), "07 sitemap.html 있음"):
    h = html.read_text()
    for view in ("board", "list", "slides"):
        sec = re.search(r'<section id="%s".*?</section>' % view, h, re.S)
        sec = sec.group(0) if sec else ""
        counts = {i: len(re.findall(r'data-scr="%s"' % i, sec)) for i in ids}
        ok(all(c == 1 for c in counts.values()), "07 보기 %s에 화면마다 한 번 %s" % (view, {k: v for k, v in counts.items() if v != 1} or ""))

# ---------- 08 화면 정의 ----------
api = yaml.safe_load((ROOT / "api/openapi.yaml").read_text())
examples = api["components"].get("examples", {})
responses = {}  # API -> {status: set(codes)}
for p, ms in api["paths"].items():
    for m, op in ms.items():
        if not isinstance(op, dict) or "responses" not in op:
            continue
        aid = op["x-corthex"]["id"]
        responses[aid] = {}
        for status, r in op["responses"].items():
            codes = set()
            for v in (r.get("content") or {}).values():
                for ex in (v.get("examples") or {}).values():
                    if "$ref" in ex:
                        ex = examples[ex["$ref"].split("/")[-1]]
                    val = ex.get("value")
                    if isinstance(val, dict) and "code" in val:
                        codes.add(val["code"])
            responses[aid][str(status)] = codes

spec_text = (ROOT / "docs/04-functional-spec/spec.md").read_text()
all_specs = sorted(set(re.findall(r"^\| (SPEC-\d{3}) \|", spec_text, re.M)))
readme = (ROOT / "docs/08-screens/README.md").read_text()
no_screen_specs = set(re.findall(r"SPEC-\d{3}", section(readme, "3. 화면이 없는 SPEC") or ""))
wire = ROOT / "docs/08-screens/wireframes.html"
frames = re.findall(r'data-state=["\'](SCR-\d{3}#[a-z-]+)["\']', wire.read_text()) if wire.exists() else []
ok(wire.exists(), "08 wireframes.html 있음")

all_states, state_count = set(), 0
specs_used = set(re.findall(r"SPEC-\d{3}", section(readme, "1. 모든 화면에 걸리는 규칙 (G-1~G-10)") or ""))
for s in active:
    f = ROOT / "docs/08-screens" / (s["id"] + ".md")
    if not ok(f.exists(), "08 %s 정의 파일" % s["id"]):
        continue
    t = f.read_text()
    ok(t.startswith("# %s %s" % (s["id"], s["name"])), "08 %s 제목이 사이트맵 이름과 같음" % s["id"])
    ok(("경로 `%s`" % s["path"]) in t, "08 %s 경로가 사이트맵과 같음" % s["id"])
    specs_used |= set(re.findall(r"SPEC-\d{3}", t))
    data = table(t, "데이터") or []
    acts = table(t, "동작") or []
    states = table(t, "상태") or []
    na = section(t, "해당하지 않는 상태") or ""
    resp = table(t, "응답과 상태")
    ok(bool(data), "08 %s 데이터 표" % s["id"])
    for a in acts:
        ok(len(a) == 3 and a[1] and a[2], "08 %s 동작 '%s' 결과·실패" % (s["id"], a[0]))
    mine = set()
    for r in states:
        m = re.fullmatch(r"(SCR-\d{3})#([a-z-]+)", r[0])
        ok(bool(m) and m.group(1) == s["id"], "08 %s 상태 ID 형식 %s" % (s["id"], r[0]))
        ok(len(r) == 3 and bool(r[1]), "08 %s 상태 %s 설명" % (s["id"], r[0]))
        if m:
            mine.add(m.group(2))
    state_count += len(mine)
    all_states |= {s["id"] + "#" + x for x in mine}
    for b in BASE:
        ok(b in mine or re.search(r"^- (?:[a-z, ]*\b)?%s\b" % b, na, re.M) or "없음. 여섯 가지 모두" in na,
           "08 %s 기본 상태 %s가 있거나 이유가 있음" % (s["id"], b))
    if "없음. 여섯 가지 모두" in na:
        ok(all(b in mine for b in BASE), "08 %s 여섯 상태가 모두 있음" % s["id"])
    rows = resp or []
    called = sorted(set(r[0].split("#")[0] for r in rows))
    for r in data + acts:
        for aid in set(re.findall(r"API-\d{3}", " ".join(r))):
            ok(aid in called or "메모리" in " ".join(r), "08 %s '%s'의 %s를 부르거나 메모리에서 씀" % (s["id"], r[0], aid))
    for aid in called:
        for status, codes in responses[aid].items():
            hit = [r for r in rows if r[0] == "%s#%s" % (aid, status)]
            ok(bool(hit), "08 %s 응답 %s#%s가 표에 있음" % (s["id"], aid, status))
            if hit and status not in ("default",) and not status.startswith("2"):
                listed = set(re.findall(r"[a-z_]+", hit[0][1]))
                ok(codes <= listed, "08 %s 응답 %s#%s 오류 코드 %s" % (s["id"], aid, status, sorted(codes - listed) or ""))
            if hit:
                ok(len(hit[0]) == 4 and hit[0][2] and hit[0][3], "08 %s 응답 %s#%s 상태·할 일" % (s["id"], aid, status))
    for r in rows:
        ok(bool(re.fullmatch(r"API-\d{3}#(\d{3}|default)", r[0])) and r[0].split("#")[1] in responses[r[0].split("#")[0]],
           "08 %s 표의 %s가 계약에 있음" % (s["id"], r[0]))
    # 상태 칸이 가리키는 응답이 표에 있는지
    for r in states:
        for ref in re.findall(r"API-\d{3}#\d{3}|API-\d{3}#default", r[2] if len(r) > 2 else ""):
            ok(any(x[0] == ref for x in rows), "08 %s 상태 %s의 %s가 응답 표에 있음" % (s["id"], r[0], ref))

for st in sorted(cited_states):
    ok(st in all_states, "03 단계 표의 상태 %s가 08에 있음" % st)
for path in (ROOT / "docs/08-screens").glob("SCR-*.md"):
    t = path.read_text()
    for st in set(re.findall(r"(SCR-\d{3})#([a-z][a-z-]+)", t)):
        ref = "%s#%s" % st
        ok(ref in all_states, "08 %s가 가리키는 %s가 있음" % (path.name, ref))
missing_specs = [x for x in all_specs if x not in specs_used and x not in no_screen_specs]
ok(not missing_specs, "08 SPEC이 화면이나 '화면이 없는 SPEC'에 있음 %s" % (missing_specs or ""))
ok(not (specs_used & no_screen_specs), "08 '화면이 없는 SPEC'이 화면에도 있지 않음 %s" % sorted(specs_used & no_screen_specs))
fc = {}
for x in frames:
    fc[x] = fc.get(x, 0) + 1
ok(set(frames) == all_states, "08 상태마다 와이어프레임 %s %s" % (sorted(all_states - set(frames)) or "", sorted(set(frames) - all_states) or ""))
ok(all(v == 1 for v in fc.values()), "08 와이어프레임이 상태마다 한 장 %s" % {k: v for k, v in fc.items() if v != 1})

print(json.dumps({"screens": len(active), "states": state_count, "passed": len(passed), "failed": len(failed)}, ensure_ascii=False))
for m in failed:
    print("FAIL", m)
sys.exit(1 if failed else 0)
