#!/usr/bin/env python3
"""09 목업을 그려요: design/mockups/mockup.html

방향(DEC-033): 시안 A 바탕(흰 바탕, 파란 버튼, TDS 배치)에 합의 카드만 시안 B의 카드 한 장 모양.
  design/base.tokens.json → CSS 사용자 정의 속성(페이지 안에 넣음)
  docs/08-screens/SCR-*.md의 상태 표 → 화면마다 그릴 상태 목록(08이 원본)
화면 15개(SCR-001~015)의 상태 70개를 360px·430px로 그리고, 버튼과 선택지를 눌러 볼 수 있어요(서버 요청 없음).
주소 매개변수:
  ?screen=SCR-009          한 화면의 모든 상태를 나란히(기본 SCR-002)
  ?w=430  ?long=1  ?role=member|visitor
  ?solo=SCR-007&state=normal    한 화면 한 상태만 화면 폭 전체로(검사용)
  ?capture=main            홈·문항·합의 카드 정상 상태를 끝까지 나란히(캡처용)
  ?capture=overview&set=1|2     나머지 12개 화면의 대표 상태를 3열로(캡처용)
실행: python3 scripts/draw-mockups.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESIGN = ROOT / "design"
OUT = DESIGN / "mockups"
FONT_CSS = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"


def css_value(kind, v):
    if kind == "color":
        r, g, b = (round(x * 255) for x in v["components"])
        if "alpha" in v and v["alpha"] != 1:
            return "rgba(%d, %d, %d, %s)" % (r, g, b, v["alpha"])
        return "#%02x%02x%02x" % (r, g, b)
    if kind in ("dimension", "duration"):
        return "%s%s" % (v["value"], v["unit"])
    if kind == "fontFamily":
        return ", ".join(x if re.fullmatch(r"[A-Za-z-]+", x) else '"%s"' % x for x in v)
    if kind == "cubicBezier":
        return "cubic-bezier(%s)" % ", ".join(str(x) for x in v)
    return str(v)


def flatten(node, path, kind, out):
    kind = node.get("$type", kind)
    for key, value in node.items():
        if key.startswith("$") or not isinstance(value, dict):
            continue
        if "$value" in value:
            out["--" + "-".join(path + [key])] = css_value(value.get("$type", kind), value["$value"])
        else:
            flatten(value, path + [key], kind, out)


def tokens_css():
    out = {}
    flatten(json.loads((DESIGN / "base.tokens.json").read_text()), [], None, out)
    return ":root{\n" + "".join("  %s: %s;\n" % kv for kv in sorted(out.items())) + "}"


def screens_from_08():
    """[(SCR, 이름, 경로, [상태...])] — 08 화면 정의의 상태 표에서 읽어요."""
    out = []
    for f in sorted((ROOT / "docs/08-screens").glob("SCR-*.md")):
        t = f.read_text()
        head = re.match(r"# (SCR-\d{3}) (.+)", t)
        path = re.search(r"경로 `([^`]+)`", t).group(1)
        states = re.findall(r"^\| SCR-\d{3}#([a-z-]+) \|", t, re.M)
        out.append([head.group(1), head.group(2).strip(), path, states])
    return out


DATA = {
    "normal": {
        "rooms": [["제주 3박", "여행", 4, 3, "host", True], ["금요일 팀 회식", "회식·저녁", 6, 1, "member", False]],
        "nick": "산", "room": "제주 3박", "theme": "여행", "party": 4, "done": 3,
        "questions": [
            ["숙소는 어디가 좋아요?", "바다가 보이는 곳", "시내 가까운 곳"],
            ["첫날 저녁은 뭘 먹을까요?", "횟집", "흑돼지"],
            ["이동은 어떻게 할까요?", "렌터카", "버스와 택시"],
            ["하루 일정은 어느 정도로 채울까요?", "여러 곳을 돌아요", "여유 있게 몇 곳만"],
            ["아침은 몇 시에 시작할까요?", "8시 전에", "10시쯤 천천히"],
            ["기념품은 어떻게 할까요?", "각자 알아서", "함께 골라서"],
            ["비가 오면 어떻게 할까요?", "실내 장소로 바꿔요", "계획대로 가요"],
            ["돌아오는 날 일정은?", "오전에 공항으로", "저녁까지 더 놀아요"],
        ],
        "next": "숙소 두 곳 가격을 같이 비교해 봐요",
        "past": [["제주 3박", "여행", "11월 28일", 3, "숙소 두 곳 가격을 같이 비교해 봐요"],
                 ["금요일 팀 회식", "회식·저녁", "11월 20일", 5, "8시 전에 끝나는 곳으로 정해요"]],
    },
    "long": {
        "rooms": [["다음 주 금요일 팀 회식 장소 정하기", "회식·저녁", 8, 7, "host", True], ["제주 3박 4일 가족 여행 일정 정하기", "여행", 6, 1, "member", False]],
        "nick": "바다좋아하는산책러다", "room": "다음 주 금요일 팀 회식 장소 정하기", "theme": "회식·저녁", "party": 8, "done": 7,
        "q0": ["숙소는 바다가 잘 보이는 곳과 시내에서 가까운 곳 중 어디가 더 좋아요?",
               "바다가 바로 보이는 오션뷰 숙소에서 이틀 동안 머물러요", "시내 정류장에서 걸어서 5분 안에 닿는 숙소에 묵어요"],
        "next": "숙소 두 곳의 가격과 위치를 같이 비교해 보고 오늘 안에 하나로 정해요. 예약은 방장이 맡아요",
        "past": [["다음 주 금요일 팀 회식 장소 정하기", "회식·저녁", "11월 28일", 7, "숙소 두 곳의 가격과 위치를 같이 비교해 보고 오늘 안에 하나로 정해요. 예약은 방장이 맡아요"],
                 ["제주 3박 4일 가족 여행 일정 정하기", "여행", "11월 20일", 5, "8시 전에 끝나는 곳으로 정해요"]],
    },
}
CARD = [  # 분류, 문항 번호, A 수, B 수, 상관없어요 수, 문구
    ["split", 0, 2, 1, 0, "두 곳 가격을 같이 비교해 봐요"],
    ["split", 1, 1, 2, 0, "첫날과 둘째 날로 나눠 봐요"],
    ["agreed", 2, 2, 0, 1, "렌터카로 정해요"],
    ["agreed", 3, 0, 3, 0, "여유 있게 몇 곳만 가요"],
    ["agreed", 6, 3, 0, 0, "비 오면 실내 장소로 바꿔요"],
    ["agreed", 7, 0, 2, 1, "저녁까지 더 놀다 와요"],
    ["open", 4, 0, 0, 3, "아무 때나 괜찮아요"],
    ["open", 5, 0, 0, 3, "편한 대로 해요"],
]
OVERVIEW = {"1": [["SCR-001", "loading"], ["SCR-003", "normal"], ["SCR-004", "normal"], ["SCR-005", "normal"], ["SCR-006", "normal"], ["SCR-008", "normal"]],
            "2": [["SCR-010", "normal"], ["SCR-011", "normal"], ["SCR-012", "normal"], ["SCR-013", "normal"], ["SCR-014", "normal"], ["SCR-015", "normal"]]}

CSS = r"""
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--color-bg-subtle);color:var(--color-text-primary);font-family:var(--font-family-sans);font-size:var(--font-size-body);line-height:1.5;word-break:keep-all;overflow-wrap:break-word;text-wrap:pretty}
button,input{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px}
.viewer{padding:var(--space-6) var(--space-4) var(--space-3);max-width:1600px;margin:0 auto}
.viewer h1{font-size:var(--font-size-title);margin:0 0 var(--space-2)}
.viewer p{margin:0 0 var(--space-3);color:var(--color-text-secondary)}
.controls{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-4);align-items:center;margin-bottom:var(--space-3)}
.seg{display:inline-flex;border:1px solid var(--color-border-control);border-radius:var(--radius-pill);overflow:hidden;background:var(--color-bg-page)}
.seg button{border:0;background:none;min-height:var(--size-touch-min);padding:0 var(--space-4);cursor:pointer;font-size:var(--font-size-small)}
.seg button[aria-pressed=true],.picker button[aria-pressed=true]{background:var(--color-accent-default);color:var(--color-text-on-accent);font-weight:var(--font-weight-bold)}
.seg-label{font-size:var(--font-size-small);color:var(--color-text-secondary);margin-right:var(--space-1)}
.picker{display:flex;flex-wrap:wrap;gap:var(--space-1)}
.picker button{border:1px solid var(--color-border-control);background:var(--color-bg-page);border-radius:var(--radius-pill);min-height:var(--size-touch-min);padding:0 var(--space-3);font-size:var(--font-size-small);cursor:pointer}
.grid{display:flex;flex-wrap:wrap;gap:var(--space-6);padding:var(--space-2) var(--space-4) var(--space-10);max-width:1600px;margin:0 auto;align-items:flex-start}
.cell{flex:none}
.cell-title{font-size:var(--font-size-label);font-weight:var(--font-weight-bold);margin:0 0 var(--space-2);font-family:var(--font-family-sans)}
.note{max-width:430px;font-size:var(--font-size-caption);color:var(--color-text-secondary);margin:var(--space-2) 0 0}
.phone{position:relative;height:760px;border:1px solid var(--color-frame-device-border);border-radius:28px;overflow:hidden;background:var(--color-bg-page);display:flex;flex-direction:column}
.nav{flex:none;height:var(--size-nav);display:flex;align-items:center;justify-content:center;background:var(--color-frame-nav-bg);font-size:var(--font-size-caption);color:var(--color-text-secondary);border-bottom:1px solid var(--color-border-divider)}
.screen{position:relative;flex:1;overflow-y:auto;overflow-x:hidden}
.body{padding:var(--space-5) var(--space-5) 240px}
.title{font-size:var(--font-size-title);font-weight:var(--font-weight-bold);line-height:1.36;margin:0}
.caption{font-size:var(--font-size-caption);color:var(--color-text-tertiary)}
.small{font-size:var(--font-size-small);color:var(--color-text-secondary)}
.section{font-size:var(--font-size-heading);font-weight:var(--font-weight-bold);margin:var(--space-8) 0 var(--space-3)}
.gap{height:var(--space-5)}
.btn{display:flex;align-items:center;justify-content:center;gap:var(--space-2);width:100%;min-height:var(--size-touch);padding:var(--space-3) var(--space-4);border-radius:var(--radius-button);border:1px solid transparent;font-size:var(--font-size-body);font-weight:var(--font-weight-bold);cursor:pointer;text-align:center;transition:opacity var(--motion-duration-fast) var(--motion-curve-standard),transform var(--motion-duration-fast) var(--motion-curve-standard)}
.btn+.btn{margin-top:var(--space-2)}
.btn:active{transform:scale(.98)}
.btn.primary{background:var(--color-accent-default);color:var(--color-text-on-accent)}
.btn.primary:hover{background:var(--color-accent-pressed)}
.btn.secondary{background:var(--color-accent-subtle);color:var(--color-accent-on-subtle)}
.btn.outline{background:var(--color-bg-page);border-color:var(--color-border-control);color:var(--color-text-primary)}
.btn[disabled]{background:var(--color-disabled-bg);color:var(--color-disabled-text);border-color:transparent;cursor:not-allowed;transform:none}
.spin{display:inline-block;width:18px;height:18px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .8s linear infinite}
.spin.sm{width:12px;height:12px}
@keyframes spin{to{transform:rotate(360deg)}}
.link{background:none;border:0;padding:0 var(--space-2);min-height:var(--size-touch-min);color:var(--color-accent-on-subtle);font-weight:var(--font-weight-bold);font-size:var(--font-size-small);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.row{display:flex;align-items:center;gap:var(--space-3);width:100%;min-height:64px;padding:var(--space-3) 0;background:none;border:0;border-bottom:1px solid var(--color-border-divider);text-align:left;cursor:pointer}
.row.plain{cursor:default}
.row .main{flex:1;min-width:0}
.row .name{display:block;font-weight:var(--font-weight-bold)}
.row .sub{display:block;font-size:var(--font-size-small);color:var(--color-text-secondary)}
.row .val{flex:none;font-weight:var(--font-weight-bold)}
.badge{flex:none;font-size:var(--font-size-caption);font-weight:var(--font-weight-bold);padding:2px var(--space-2);border-radius:var(--radius-chip);background:var(--color-accent-subtle);color:var(--color-accent-on-subtle)}
.badge.muted{background:var(--color-bg-subtle);color:var(--color-text-secondary)}
.chev{flex:none;color:var(--color-text-tertiary)}
.menu .row{min-height:var(--size-touch)}
.asof{display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap;font-size:var(--font-size-caption);color:var(--color-text-tertiary)}
.sk{background:var(--color-skeleton);border-radius:var(--radius-chip)}
.sk-row{height:64px;border-bottom:1px solid var(--color-border-divider);display:flex;flex-direction:column;justify-content:center;gap:var(--space-2)}
.sk-row .sk:first-child{height:16px;width:55%}.sk-row .sk:last-child{height:12px;width:75%}
.sk-block{height:44px;border-radius:var(--radius-button);margin-top:var(--space-2)}
.notice{border-radius:var(--radius-box);background:var(--color-bg-subtle);padding:var(--space-5);text-align:center}
.notice strong{display:block;font-size:var(--font-size-body);margin-bottom:var(--space-1)}
.notice .btn{margin-top:var(--space-4)}
.notice.error strong{color:var(--color-feedback-error)}
.notice.left{text-align:left;padding:var(--space-4)}
.banner{background:var(--color-accent-subtle);color:var(--color-text-primary);font-size:var(--font-size-small);font-weight:var(--font-weight-bold);padding:var(--space-3) var(--space-5)}
.center{min-height:520px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:var(--space-2);padding:0 var(--space-6)}
.center strong{font-size:var(--font-size-heading)}
.center .btn{margin-top:var(--space-4);max-width:280px}
.sticky{position:sticky;top:0;z-index:2;background:var(--color-bg-page);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border-divider)}
.status{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap}
.status strong{font-size:var(--font-size-body)}
.me{font-size:var(--font-size-caption);color:var(--color-text-tertiary);margin-top:var(--space-1)}
.progress{height:6px;border-radius:var(--radius-pill);background:var(--color-skeleton);overflow:hidden;margin:var(--space-2) 0 var(--space-1)}
.progress i{display:block;height:100%;background:var(--color-accent-default);transform-origin:left;transition:transform var(--motion-duration-base) var(--motion-curve-standard)}
.q{padding:var(--space-5) 0;border-bottom:1px solid var(--color-border-divider)}
.q .no{font-size:var(--font-size-caption);color:var(--color-text-tertiary);font-weight:var(--font-weight-bold)}
.q h3{font-size:var(--font-size-heading);margin:var(--space-1) 0 var(--space-3);line-height:1.45}
.q .miss{display:none;font-size:var(--font-size-small);color:var(--color-feedback-error);margin:0 0 var(--space-2)}
.q.missing .miss{display:block}
.opt{display:flex;align-items:center;gap:var(--space-3);width:100%;min-height:var(--size-touch);margin-top:var(--space-2);padding:var(--space-3) var(--space-4);border:1px solid var(--color-border-control);border-radius:var(--radius-button);background:var(--color-bg-page);text-align:left;cursor:pointer;font-size:var(--font-size-label)}
.opt .dot{flex:none;width:20px;height:20px;border-radius:50%;border:2px solid var(--color-border-control)}
.opt[aria-pressed=true]{border:2px solid var(--color-accent-default);background:var(--color-accent-subtle);font-weight:var(--font-weight-bold);padding:calc(var(--space-3) - 1px) calc(var(--space-4) - 1px)}
.opt[aria-pressed=true] .dot{border:6px solid var(--color-accent-default)}
.dock{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:var(--space-3) var(--space-5) var(--space-5);background:var(--color-bg-page);border-top:1px solid var(--color-border-divider);display:flex;flex-direction:column;gap:var(--space-2)}
.dock .btn+.btn{margin-top:0}
.dock .hint{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);font-size:var(--font-size-small);color:var(--color-text-secondary)}
.dock .err{font-size:var(--font-size-small);color:var(--color-feedback-error);background:var(--color-feedback-error-bg);border-radius:var(--radius-chip);padding:var(--space-2) var(--space-3)}
.field{margin-top:var(--space-5)}
.field label{display:block;font-size:var(--font-size-small);font-weight:var(--font-weight-bold);margin-bottom:var(--space-2)}
.field input{width:100%;min-height:var(--size-touch);border:1px solid var(--color-border-control);border-radius:var(--radius-button);padding:0 var(--space-4);background:var(--color-bg-page)}
.field input:disabled{background:var(--color-bg-subtle)}
.field .help{display:flex;justify-content:space-between;gap:var(--space-2);font-size:var(--font-size-caption);color:var(--color-text-tertiary);margin-top:var(--space-1)}
.field.bad input{border:2px solid var(--color-feedback-error)}
.field.bad .help{color:var(--color-feedback-error)}
.stepper{display:flex;align-items:center;gap:var(--space-3)}
.stepper button{width:var(--size-touch);height:var(--size-touch);border-radius:var(--radius-button);border:1px solid var(--color-border-control);background:var(--color-bg-page);font-size:var(--font-size-heading);cursor:pointer}
.stepper output{min-width:56px;text-align:center;font-weight:var(--font-weight-bold);font-size:var(--font-size-heading)}
.axis{margin-top:var(--space-4)}
.axis .bands{display:flex;gap:var(--space-1);margin-top:var(--space-1)}
.axis span{flex:1;text-align:center;border:1px solid var(--color-border-control);border-radius:var(--radius-chip);padding:var(--space-2) 0;font-size:var(--font-size-small)}
.axis span.on{background:var(--color-accent-default);border-color:var(--color-accent-default);color:var(--color-text-on-accent);font-weight:var(--font-weight-bold)}
.legal h2{font-size:var(--font-size-body);margin:var(--space-6) 0 var(--space-2)}
.legal p,.legal li{font-size:var(--font-size-small);color:var(--color-text-secondary)}
.legal ul{padding-left:var(--space-5);margin:0}
/* 합의 카드: 시안 B의 카드 한 장 모양, 주황·초록·회청색은 카드 안에서만(DEC-033) */
.sheet{background:var(--color-card-surface);border:1px solid var(--color-card-border);border-radius:var(--radius-card);overflow:hidden;margin-top:var(--space-4)}
.sheet-head{background:var(--color-card-header);padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--color-card-border)}
.sheet-head .gname{font-size:var(--font-size-heading);font-weight:var(--font-weight-bold)}
.sheet-body{padding:var(--space-4) var(--space-5) var(--space-5)}
.next{border-radius:var(--radius-box);background:var(--color-card-next-bg);padding:var(--space-4)}
.next .label{font-size:var(--font-size-caption);font-weight:var(--font-weight-bold);color:var(--color-card-next-label)}
.next p{margin:var(--space-1) 0 0;font-weight:var(--font-weight-bold)}
.cat{margin-top:var(--space-5);border-left:4px solid var(--cat);padding-left:var(--space-3)}
.cat-head{display:flex;align-items:center;gap:var(--space-2);font-weight:var(--font-weight-bold)}
.pill{font-size:var(--font-size-caption);font-weight:var(--font-weight-bold);padding:2px var(--space-2);border-radius:var(--radius-pill);background:var(--cat);color:var(--color-text-on-accent)}
.cat-head .n{color:var(--color-text-secondary);font-size:var(--font-size-small)}
.item{padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-divider)}
.item:last-child{border-bottom:0}
.item .p{font-weight:var(--font-weight-medium)}
.item .counts{font-size:var(--font-size-small);color:var(--color-text-secondary);margin-top:2px}
.item .t{font-size:var(--font-size-small);margin-top:2px}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-top:var(--space-5)}
.actions .btn+.btn{margin-top:0}
.host{margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--color-border-divider)}
.host .small{margin:0 0 var(--space-2)}
.center-link{display:flex;justify-content:center;margin-top:var(--space-3)}
.dim{position:absolute;inset:0;z-index:5;background:var(--color-overlay);display:flex;align-items:center;justify-content:center;padding:var(--space-5)}
.dialog{background:var(--color-bg-page);border-radius:var(--radius-card);padding:var(--space-6) var(--space-5) var(--space-5);width:100%}
.dialog h3{margin:0 0 var(--space-2);font-size:var(--font-size-heading)}
.dialog p{margin:0;color:var(--color-text-secondary);font-size:var(--font-size-label)}
.dialog .two{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-top:var(--space-5)}
.dialog .two .btn+.btn{margin-top:0}
.toast{position:absolute;left:var(--space-5);right:var(--space-5);bottom:120px;z-index:6;background:var(--color-text-primary);color:var(--color-text-on-accent);border-radius:var(--radius-button);padding:var(--space-3) var(--space-4);font-size:var(--font-size-small);opacity:0;transform:translateY(8px);transition:opacity var(--motion-duration-base) var(--motion-curve-standard),transform var(--motion-duration-base) var(--motion-curve-standard);pointer-events:none}
.toast.on{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:opacity var(--motion-duration-fast) linear!important}.btn:active{transform:none}}
.solo .viewer,.solo .cell-title,.solo .note{display:none}
.solo .grid{padding:0;display:block}
.solo .phone{width:100vw!important;height:100vh;border:0;border-radius:0}
.capture .controls,.capture .picker,.capture .note,.capture #scr-name{display:none}
.capture .viewer{padding-bottom:0}
.capture-main .phone{height:auto;min-height:760px}.capture-main .screen{overflow:visible}
.capture-overview .grid{display:grid;grid-template-columns:repeat(3,max-content)}
"""

JS = r"""
const D = __DATA__, CARD = __CARD__, SCREENS = __SCREENS__, OVERVIEW = __OVERVIEW__;
window.MOCK_SCREENS = SCREENS;
const q = new URLSearchParams(location.search);
const NAME = Object.fromEntries(SCREENS.map(s => [s[0], s[1]])), STATES = Object.fromEntries(SCREENS.map(s => [s[0], s[3]]));
const S = {w: q.get('w') === '430' ? 430 : 360, long: q.get('long') === '1', role: ['member', 'visitor'].includes(q.get('role')) ? q.get('role') : 'host',
  screen: STATES[q.get('screen')] ? q.get('screen') : 'SCR-002', answers: [0, 2, null, null, null, null, null, null], party: 4, over: {}};
const solo = q.get('solo'), capture = q.get('capture');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
function data() {
  const n = D.normal; if (!S.long) return n;
  const L = D.long; return {...n, ...L, questions: [L.q0, ...n.questions.slice(1)]};
}
const err = '<span class="caption">오류 번호 7f3a2c19</span>';
const go = (scr, label, cls = 'primary') => `<button class="btn ${cls}" data-go="${scr}">${label}</button>`;
const toastBtn = (label, msg, cls = 'outline', extra = '') => `<button class="btn ${cls}" data-act="toast" data-msg="${esc(msg)}" ${extra}>${label}</button>`;
const g2 = `<div class="center"><strong>지금은 쓸 수 없어요</strong><span class="small">토스 앱 밖에서 열었을 때만 보여요</span></div>`;
const skRows = n => '<div aria-busy="true" aria-label="불러오는 중">' + '<div class="sk-row"><div class="sk"></div><div class="sk"></div></div>'.repeat(n) + '</div>';
const asof = (scr, stale) => `<div class="asof">오후 3시 5분 기준${stale ? ' · 다시 불러오는 중 <span class="spin sm" aria-hidden="true"></span>' : ` <button class="link" data-act="refresh">새로고침</button>`}</div>`;
const dock = inner => `<div class="dock">${inner}</div>`;
const notFound = `<div class="center"><strong>이 방은 없거나 보관 기간이 지났어요</strong>${go('SCR-003', '방 만들기')}</div>`;

function sheet(kind, opts = {}) {
  const d = data(), based = opts.based ?? (S.long ? 7 : 3);
  const sub = kind === 'interim' ? `${esc(d.theme)} · ${based}명 기준 중간 카드` : kind === 'final' ? `${esc(d.theme)} · 마감됐어요 · ${based}명 기준 · 11월 28일 확정` : `${esc(opts.theme)} · ${esc(opts.date)} · ${based}명 기준`;
  const cats = [['split', '조율해요'], ['agreed', '모두 좋아요'], ['open', '누구나 괜찮아요']].map(([k, label]) => {
    const items = CARD.filter(c => c[0] === k);
    return `<section class="cat" style="--cat:var(--color-card-category-${k})"><div class="cat-head"><span class="pill">${label}</span><span class="n">${items.length}개</span></div>${items.map(c => { const x = d.questions[c[1]]; return `<div class="item"><div class="p">${esc(x[0])}</div><div class="counts">${esc(x[1])}&nbsp;${c[2]}&nbsp;· ${esc(x[2])}&nbsp;${c[3]}&nbsp;· 상관없어요&nbsp;${c[4]}</div><div class="t">${esc(c[5])}</div></div>`; }).join('')}</section>`;
  }).join('');
  return `<article class="sheet" aria-label="합의 카드"><div class="sheet-head"><div class="gname">${esc(opts.name || d.room)}</div><div class="caption">${sub}</div></div><div class="sheet-body"><div class="next"><div class="label">다음 행동</div><p>${esc(opts.next || d.next)}</p></div>${cats}</div></article>`;
}

const R = {};
R['SCR-001'] = st => {
  if (st === 'loading') return `<div class="center"><strong>모임 합의 카드</strong><span class="small">확인하고 있어요</span><span class="spin" aria-hidden="true"></span></div>`;
  if (st === 'update-required') return `<div class="center"><strong>토스 앱을 업데이트하면 쓸 수 있어요</strong><span class="small">앱스토어나 플레이스토어에서 토스를 업데이트해 주세요</span></div>` + dock(toastBtn('닫기', '미니앱을 닫아요', 'outline'));
  if (st === 'error') return `<div class="center"><strong>확인하지 못했어요</strong>${err}</div>` + dock(`<button class="btn primary" data-act="retry">다시 시도</button>${toastBtn('닫기', '미니앱을 닫아요', 'outline')}`);
  return g2;
};
R['SCR-002'] = st => {
  const d = data();
  if (st === 'permission') return g2;
  const rooms = d.rooms.map(r => `<button class="row" data-go="SCR-005"><span class="main"><span class="name">${esc(r[0])}</span><span class="sub">${esc(r[1])} · ${r[2]}명 중 ${r[3]}명 답했어요</span></span>${r[4] === 'host' ? '<span class="badge">방장</span>' : ''}${r[5] ? '' : '<span class="badge muted">답하기 전</span>'}<span class="chev" aria-hidden="true">›</span></button>`).join('');
  let list;
  if (st === 'loading') list = skRows(2);
  else if (st === 'empty') list = `<div class="notice"><strong>참여 중인 방이 없어요</strong><span class="small">방을 만들고 친구를 불러 보세요</span></div>`;
  else if (st === 'error') list = `<div class="notice error"><strong>잠시 뒤 다시 해 주세요</strong>${err}<button class="btn outline" data-act="retry">다시 시도</button></div>`;
  else list = rooms + asof('SCR-002', st === 'stale');
  const menu = [['지난 카드', 'SCR-011'], ['내 데이터 지우기', 'SCR-013'], ['이용약관', 'SCR-014'], ['개인정보처리방침', 'SCR-015']].map(([m, s]) => `<button class="row" data-go="${s}"><span class="main"><span class="name">${m}</span></span><span class="chev" aria-hidden="true">›</span></button>`).join('');
  return `<div class="body"><h1 class="title">모임 합의 카드</h1><p class="caption">가칭 · 이름은 정해지면 바꿔요</p><div class="gap"></div>${go('SCR-003', '방 만들기')}<h2 class="section">참여 중인 방</h2>${list}<h2 class="section">더 보기</h2><div class="menu">${menu}</div></div>`;
};
R['SCR-003'] = st => {
  if (st === 'permission') return g2;
  let list;
  if (st === 'loading') list = skRows(3);
  else if (st === 'empty') list = `<div class="notice"><strong>지금은 만들 수 있는 테마가 없어요</strong><span class="small">테마가 준비되면 여기에 보여요</span></div>`;
  else if (st === 'error') list = `<div class="notice error"><strong>잠시 뒤 다시 해 주세요</strong>${err}<button class="btn outline" data-act="retry">다시 시도</button></div>`;
  else list = ['여행', '회식·저녁', '주말 나들이'].map(t => `<button class="row" data-go="SCR-004"><span class="main"><span class="name">${t}</span></span><span class="chev" aria-hidden="true">›</span></button>`).join('');
  return `<div class="body"><h1 class="title">어떤 모임인가요?</h1><p class="small">테마마다 문항 8개가 정해져 있어요</p>${list}</div>`;
};
R['SCR-004'] = st => {
  const d = data();
  if (st === 'permission') return g2;
  const dis = st === 'loading' ? 'disabled' : '', bad = st === 'error';
  const name = bad ? '' : d.room;
  return `<div class="body"><span class="badge">${esc(d.theme)}</span><h1 class="title" style="margin-top:var(--space-2)">모임 정보를 적어 주세요</h1>
  <div class="field${bad ? ' bad' : ''}"><label for="f-name">모임 이름</label><input id="f-name" value="${esc(name)}" maxlength="20" ${dis} aria-describedby="h-name"><div class="help" id="h-name"><span>${bad ? '모임 이름은 1~20자로 적어 주세요' : '예: 제주 3박'}</span><span>${name.length}/20</span></div></div>
  <div class="field"><label id="l-party">인원</label><div class="stepper" role="group" aria-labelledby="l-party"><button data-act="party" data-d="-1" ${dis} aria-label="인원 줄이기">−</button><output aria-live="polite">${S.party}명</output><button data-act="party" data-d="1" ${dis} aria-label="인원 늘리기">+</button></div><div class="help"><span>나를 포함해 2~8명이에요. 이만큼 답하면 마감돼요</span></div></div>
  <div class="field"><label for="f-nick">내 닉네임</label><input id="f-nick" value="${esc(d.nick)}" maxlength="10" ${dis} aria-describedby="h-nick"><div class="help" id="h-nick"><span>닉네임은 이 방에서 나만 봐요</span><span>${d.nick.length}/10</span></div></div>
  ${bad ? '<div class="notice left" style="margin-top:var(--space-5)"><span class="small">테마가 그사이 내려가면: 이 테마는 지금 쓸 수 없어요 · 테마 다시 고르기</span></div>' : ''}</div>`
  + dock(st === 'loading' ? '<button class="btn primary" disabled><span class="spin" aria-hidden="true"></span>만드는 중</button>' : `<button class="btn primary" data-act="create" ${bad ? 'disabled' : ''}>방 만들기</button>`);
};
R['SCR-005'] = st => {
  const d = data();
  if (st === 'permission') return g2;
  if (st === 'error') return notFound;
  if (st === 'loading') return `<div class="body" aria-busy="true" aria-label="불러오는 중"><div class="sk" style="height:28px;width:60%"></div><div class="sk" style="height:14px;width:30%;margin-top:12px"></div>${skRows(3)}</div>` + dock('<button class="btn primary" disabled>참여하기</button>');
  if (st === 'full') return `<div class="body"><h1 class="title">${esc(d.room)}</h1><p class="small">${esc(d.theme)}</p><div class="notice"><strong>이 방은 8명이 다 찼어요</strong><span class="small">우리 모임 방을 새로 만들 수 있어요</span></div></div>` + dock(go('SCR-003', '방 만들기'));
  return `<div class="body"><h1 class="title">${esc(d.room)}</h1><p class="small">${esc(d.theme)}</p>
  <div class="row plain"><span class="main"><span class="name">인원</span></span><span class="val">${d.party}명</span></div>
  <div class="row plain"><span class="main"><span class="name">답한 사람</span></span><span class="val">${d.done}명</span></div>
  <div class="row plain"><span class="main"><span class="name">상태</span></span><span class="val">응답 받는 중</span></div>
  <div class="notice left" style="margin-top:var(--space-5)"><span class="small">인원이 다 답하면 마감돼요. 누가 무엇을 골랐는지는 아무에게도 보이지 않아요</span></div>
  <div style="margin-top:var(--space-3)">${asof('SCR-005', st === 'stale')}</div></div>` + dock(go('SCR-006', '참여하기'));
};
R['SCR-006'] = st => {
  const d = data();
  if (st === 'permission') return g2;
  if (st === 'stale') return `<div class="banner" role="status">방이 그사이 마감됐어요</div><div class="center"><strong>최종 카드로 가요</strong><span class="small">마감된 방은 누구나 최종 카드를 볼 수 있어요</span>${go('SCR-010', '최종 카드 보기')}</div>`;
  const bad = st === 'error', dis = st === 'loading' ? 'disabled' : '';
  const nick = bad ? '가나다라마바사아자차카' : d.nick;
  return `<div class="body"><h1 class="title">${esc(d.room)}에서 쓸 닉네임을 적어 주세요</h1>
  <div class="field${bad ? ' bad' : ''}"><label for="f-n2">닉네임</label><input id="f-n2" value="${esc(nick)}" ${dis} aria-describedby="h-n2"><div class="help" id="h-n2"><span>${bad ? '닉네임은 1~10자로, 쓸 수 없는 말이 있어요' : '닉네임은 이 방에서 나만 봐요'}</span><span>${nick.length}/10</span></div></div>
  ${bad ? '<div class="notice left" style="margin-top:var(--space-5)"><span class="small">8명이 그사이 차면: 이 방은 8명이 다 찼어요 · 방 만들기</span></div>' : ''}</div>`
  + dock(st === 'loading' ? '<button class="btn primary" disabled><span class="spin" aria-hidden="true"></span>들어가는 중</button>' : `<button class="btn primary" data-go="SCR-007" ${bad ? 'disabled' : ''}>들어가기</button>`);
};
R['SCR-007'] = st => {
  const d = data();
  if (st === 'permission') return `<div class="center"><strong>이 방에 먼저 들어와 주세요</strong><span class="small">방 소개로 가요</span>${go('SCR-005', '방 소개 보기')}</div>`;
  if (st === 'stale') return `<div class="banner" role="status">방이 그사이 마감됐어요</div><div class="center"><strong>최종 카드로 가요</strong><span class="small">고른 답은 지워요</span>${go('SCR-010', '최종 카드 보기')}</div>`;
  const ans = st === 'error' ? [0, 1, 0, 1, 1, 0, 0, 1] : st === 'loading' ? Array(8).fill(null) : S.answers;
  const done = ans.filter(a => a !== null).length, left = 8 - done;
  const top = `<div class="sticky"><div class="status"><strong>${esc(d.room)}</strong><span class="small">8개 중 ${done}개 골랐어요</span></div><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="${done}" aria-label="고른 문항 수"><i style="transform:scaleX(${done / 8})"></i></div><div class="me">${esc(d.nick)} 님으로 참여 중</div></div>`;
  const list = st === 'loading' ? '<div aria-busy="true" aria-label="불러오는 중">' + '<div class="q"><div class="sk" style="height:14px;width:40px"></div><div class="sk" style="height:20px;width:70%;margin:12px 0 16px"></div><div class="sk sk-block"></div><div class="sk sk-block"></div><div class="sk sk-block"></div></div>'.repeat(2) + '</div>'
    : d.questions.map((x, i) => `<div class="q" id="q${i}"><div class="no">${i + 1} / 8</div><h3>${esc(x[0])}</h3><p class="miss">아직 고르지 않았어요</p>${[x[1], x[2], '상관없어요'].map((o, j) => `<button class="opt" aria-pressed="${ans[i] === j}" data-act="pick" data-q="${i}" data-o="${j}"><span class="dot" aria-hidden="true"></span><span>${esc(o)}</span></button>`).join('')}</div>`).join('');
  const busy = S.submitting;
  return `${top}<div class="body">${list}</div>` + dock(`${st === 'error' ? '<div class="err" role="alert">제출하지 못했어요. 고른 답은 그대로예요</div>' : left ? `<div class="hint"><span>${left}개 남았어요</span><button class="link" data-act="jump">남은 문항으로 가기</button></div>` : ''}
  ${toastBtn('친구 부르기', '토스 공유 시트가 열려요(초대 링크에는 방 코드만)')}
  <button class="btn primary" data-act="submit" ${left || st === 'loading' || busy ? 'disabled' : ''}>${busy ? '<span class="spin" aria-hidden="true"></span>제출하는 중' : st === 'error' ? '다시 시도' : '제출하기'}</button>`);
};
R['SCR-008'] = st => {
  const d = data();
  if (st === 'permission') return `<div class="center"><strong>답하면 볼 수 있어요</strong><span class="small">문항으로 가요</span>${go('SCR-007', '답하러 가기')}</div>`;
  if (st === 'loading') return `<div class="body" aria-busy="true" aria-label="불러오는 중"><div class="sk" style="height:24px;width:55%"></div><div class="sk" style="height:16px;width:80%;margin-top:12px"></div>${'<div class="sk sk-block" style="margin-top:20px"></div>'.repeat(3)}</div>`;
  if (st === 'error') return `<div class="body"><h1 class="title">${esc(d.nick)} 님의 모임 성향</h1><div class="gap"></div><div class="notice error"><strong>잠시 뒤 다시 해 주세요</strong>${err}<button class="btn outline" data-act="retry">다시 시도</button></div></div>`;
  const axes = [['계획 속도', 0], ['지출 우선순위', 1], ['일정 변경 반응', 2]].map(([n, k]) => `<div class="axis"><div class="small">${n}</div><div class="bands" aria-label="${n}: ${['낮음', '균형', '높음'][k]}">${['낮음', '균형', '높음'].map((t, i) => `<span class="${i === k ? 'on' : ''}">${t}</span>`).join('')}</div></div>`).join('');
  const closed = st === 'stale';
  const notify = closed ? '' : st === 'notify-done' ? '<div class="notice left"><strong>알림을 신청했어요</strong><span class="small">친구가 답을 마치면 알려 드려요</span></div>'
    : `<button class="btn outline" data-act="notify">알림 받기</button>${st === 'notify-update' ? '<div class="notice left" style="margin-top:var(--space-2)"><span class="small">토스 앱을 업데이트하면 알림을 받을 수 있어요</span></div>' : ''}`;
  return `${closed ? '<div class="banner" role="status">모두 답해서 카드가 완성됐어요</div>' : ''}<div class="body"><h1 class="title">${esc(d.nick)} 님의 모임 성향</h1><p style="margin:var(--space-2) 0 0;font-weight:var(--font-weight-bold)">큰 틀만 정하고 가는 편이에요</p>${axes}
  <div style="margin-top:var(--space-5)" class="small">${d.party}명 중 ${closed ? d.party : 2}명 답했어요</div>${asof('SCR-008', false)}
  <div style="margin-top:var(--space-5)">${go(closed ? 'SCR-010' : 'SCR-009', closed ? '최종 카드 보기' : '카드 보기')}<div style="height:var(--space-2)"></div>${toastBtn('친구 부르기', '토스 공유 시트가 열려요')}<div style="height:var(--space-2)"></div>${notify}</div></div>`;
};
R['SCR-009'] = st => {
  const d = data(), host = S.role === 'host';
  if (st === 'permission') return `<div class="center"><strong>답하면 볼 수 있어요</strong><span class="small">문항으로 가요</span>${go('SCR-007', '답하러 가기')}</div>`;
  const based = st === 'empty' ? 1 : d.done;
  const status = `<div class="status"><strong>인원 ${d.party}명 중 ${based}명 답했어요</strong></div>${asof('SCR-009', st === 'stale')}<div class="me">${esc(d.nick)} 님으로 참여 중</div>`;
  let main;
  if (st === 'loading') main = '<div aria-busy="true" aria-label="불러오는 중"><div class="sk" style="height:300px;border-radius:var(--radius-card);margin-top:16px"></div></div>';
  else if (st === 'empty') main = `<div class="notice" style="margin-top:var(--space-5)"><strong>친구를 부르면 카드가 생겨요</strong><span class="small">2명 이상 답하면 카드가 만들어져요</span>${toastBtn('친구 부르기', '토스 공유 시트가 열려요', 'primary')}</div>`;
  else if (st === 'error') main = `<div class="notice error" style="margin-top:var(--space-5)"><strong>잠시 뒤 다시 해 주세요</strong>${err}<button class="btn outline" data-act="retry">다시 시도</button></div>`;
  else main = sheet('interim') + (st === 'stale' ? '<div class="notice left" style="margin-top:var(--space-3)"><span class="small">마감 요청이 거절되면: 2명 이상이 답해야 마감할 수 있어요</span></div>' : '')
    + `<div class="actions">${toastBtn('카드 저장', '저장했어요(moim-card-20261128.png)', 'secondary')}${toastBtn('단톡방에 보내기', '토스 공유 시트가 열려요', 'secondary')}</div>`;
  const canClose = !['empty', 'loading', 'error'].includes(st);
  const hostBox = host ? `<div class="host"><p class="small">${canClose ? '방장에게만 보여요' : '2명 이상이 답하면 마감할 수 있어요'}</p><button class="btn outline" data-act="close" ${canClose ? '' : 'disabled'}>지금 마감하기</button></div>` : '';
  const link = ['normal', 'stale', 'confirm-close'].includes(st) ? `<div class="center-link"><button class="link" data-go="SCR-008">내 모임 성향 다시 보기</button></div>` : '';
  const dlg = st === 'confirm-close' ? `<div class="dim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-c"><h3 id="dlg-c">지금 마감할까요?</h3><p>마감하면 더 답할 수 없어요. 지금 ${based}명의 답으로 최종 카드가 만들어져요</p><div class="two"><button class="btn outline" data-act="cancel">취소</button><button class="btn primary" data-act="confirm">${S.closing ? '<span class="spin" aria-hidden="true"></span>마감하는 중' : '마감하기'}</button></div></div></div>` : '';
  return `<div class="body">${status}${main}${hostBox}${link}</div>${dlg}`;
};
R['SCR-010'] = st => {
  const d = data(), resp = S.role !== 'visitor';
  if (st === 'permission') return g2;
  if (st === 'error') return notFound;
  if (st === 'loading') return `<div class="body" aria-busy="true" aria-label="불러오는 중"><div class="sk" style="height:340px;border-radius:var(--radius-card)"></div></div>` + dock('<button class="btn primary" disabled>우리도 해 보기</button>');
  const main = st === 'empty' ? `<div class="notice" style="margin-top:var(--space-4)"><strong>답한 사람이 적어 카드 없이 마감됐어요</strong><span class="small">우리 모임 방을 새로 만들 수 있어요</span></div>`
    : sheet('final') + (resp ? `<div class="actions">${toastBtn('카드 저장', '저장했어요(moim-card-20261128.png)', 'secondary')}${toastBtn('단톡방에 보내기', '토스 공유 시트가 열려요', 'secondary')}</div><div class="center-link"><button class="link" data-go="SCR-008">내 모임 성향 다시 보기</button></div>` : '');
  return `<div class="body">${st === 'empty' ? `<h1 class="title">${esc(d.room)}</h1><p class="small">${esc(d.theme)} · 마감됐어요</p>` : ''}${main}</div>` + dock(go('SCR-003', '우리도 해 보기'));
};
R['SCR-011'] = st => {
  const d = data();
  if (st === 'permission') return g2;
  let list;
  if (st === 'loading') list = skRows(3);
  else if (st === 'empty') list = `<div class="notice"><strong>아직 지난 카드가 없어요</strong><span class="small">방이 마감되면 여기에 남아요</span><button class="btn primary" data-go="SCR-003">방 만들기</button></div>`;
  else if (st === 'error') list = `<div class="notice error"><strong>잠시 뒤 다시 해 주세요</strong>${err}<button class="btn outline" data-act="retry">다시 시도</button></div>`;
  else list = d.past.map(p => `<button class="row" data-go="SCR-012"><span class="main"><span class="name">${esc(p[0])}</span><span class="sub">${esc(p[1])} · ${p[2]} · ${p[3]}명 기준</span><span class="sub">${esc(p[4])}</span></span><span class="chev" aria-hidden="true">›</span></button>`).join('') + `<div style="margin-top:var(--space-4)"><button class="btn outline" data-act="toast" data-msg="다음 20개를 붙여요">더 보기</button></div>`;
  return `<div class="body"><h1 class="title">지난 카드</h1><p class="small">마감된 방의 카드는 방이 지워져도 남아요</p>${list}</div>`;
};
R['SCR-012'] = st => {
  const d = data();
  if (st === 'error') return `<div class="center"><strong>지난 카드를 다시 불러와 주세요</strong>${go('SCR-011', '지난 카드 목록으로')}</div>`;
  const p = d.past[0];
  return `<div class="body">${sheet('past', {name: p[0], theme: p[1], date: p[2], based: p[3], next: p[4]})}</div>`;
};
R['SCR-013'] = st => {
  if (st === 'permission') return g2;
  if (st === 'done') return `<div class="center"><strong>지웠어요</strong><span class="small">다시 쓰면 새 사용자로 시작해요</span></div>` + dock(`${toastBtn('미니앱 닫기', '미니앱을 닫아요', 'primary')}<button class="btn outline" data-go="SCR-001">처음 화면으로</button>`);
  const head = `<h1 class="title">내 데이터 지우기</h1><p class="small">지우면 이것들이 사라져요</p>`;
  let body;
  if (st === 'loading') body = skRows(4);
  else if (st === 'error') body = `<div class="notice error"><strong>지우지 못했어요</strong><span class="small">아무것도 지우지 않았어요</span>${err}<button class="btn outline" data-act="retry">다시 시도</button></div>`;
  else if (st === 'empty') body = `<div class="notice left"><strong>지울 응답과 알림 신청이 없어요</strong><span class="small">사용자 ID는 지워요</span></div>`;
  else body = [['응답', '3개'], ['닉네임', '3개'], ['알림 신청', '1개'], ['지난 카드', '2개'], ['사용자 ID', '1개']].map(([a, b]) => `<div class="row plain"><span class="main"><span class="name">${a}</span></span><span class="val">${b}</span></div>`).join('')
    + `<h2 class="section">남는 것</h2><p class="small">확정된 최종 카드 2개의 이름 없는 수</p><div class="notice left"><span class="small">내가 만든 열린 방 1개는 바로 마감돼요</span></div>`;
  const dlg = st === 'confirm' ? `<div class="dim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-d"><h3 id="dlg-d">내 데이터를 지울까요?</h3><p>지운 것은 되돌릴 수 없어요</p><div class="two"><button class="btn outline" data-act="cancel">취소</button><button class="btn primary" data-act="erase">지우기</button></div></div></div>` : '';
  return `<div class="body">${head}${body}</div>` + dock(st === 'loading' ? '<button class="btn primary" disabled>지우기</button>' : '<button class="btn primary" data-act="ask-erase">지우기</button>') + dlg;
};
R['SCR-014'] = () => `<div class="body legal"><h1 class="title">이용약관</h1><p class="caption">변경일 2026년 ○월 ○일 · 문구는 13 출시 준비 전에 써요</p>
  <h2>제1조 목적</h2><p>이 약관은 모임 합의 카드(가칭)를 쓰는 방법과 책임을 정해요.</p><h2>제2조 서비스</h2><p>방을 만들고, 문항에 답하고, 합의 카드를 보고 저장·공유할 수 있어요.</p><h2>제3조 보관 기간</h2><p>방과 응답은 만든 날부터 30일 동안 보관하고 지워요.</p>`;
R['SCR-015'] = () => `<div class="body legal"><h1 class="title">개인정보처리방침</h1><p class="caption">변경일 2026년 ○월 ○일 · 문구는 13 출시 준비 전에 써요</p>
  <h2>저장하는 것</h2><ul><li>사용자 ID, 닉네임, 응답</li><li>알림 신청과 그동안 암호화해 둔 식별키</li><li>지난 카드</li></ul>
  <h2>저장 위치</h2><p>Cloudflare(해외 리전)</p><h2>보관 기간</h2><p>방은 30일, 지난 카드는 지울 때까지</p><h2>지우는 방법</h2><p>홈의 내 데이터 지우기에서 지울 수 있어요.</p><div style="margin-top:var(--space-5)"><button class="btn outline" data-go="SCR-013">내 데이터 지우기로 가기</button></div></div>`;

function cellsFor() {
  if (solo) return [[solo, q.get('state') || STATES[solo][0]]];
  if (capture === 'main') return [['SCR-002', 'normal'], ['SCR-007', 'normal'], ['SCR-009', 'normal']];
  if (capture === 'overview') return OVERVIEW[q.get('set') || '1'];
  return STATES[S.screen].map(st => [S.screen, st]);
}
function drawAll() {
  const grid = document.querySelector('.grid');
  grid.innerHTML = cellsFor().map(([scr, st], i) => `<section class="cell" data-scr="${scr}" data-st="${st}" id="c${i}"><h2 class="cell-title">${scr}${capture ? ' ' + NAME[scr] : ''} #${st}</h2><div class="phone" style="width:${S.w}px"><div class="nav" aria-hidden="true">토스 내비게이션 바(뒤로가기·닫기는 토스가 그려요)</div><div class="screen"></div></div><p class="note"></p></section>`).join('');
  grid.querySelectorAll('.cell').forEach(draw);
  document.querySelectorAll('.picker button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.screen === S.screen)));
  const h = document.getElementById('scr-name'); if (h) h.textContent = `${S.screen} ${NAME[S.screen]} · 상태 ${STATES[S.screen].length}개`;
}
function draw(cell) {
  const sc = cell.querySelector('.screen'), top = sc.scrollTop;
  sc.innerHTML = R[cell.dataset.scr](cell.dataset.st) + '<div class="toast" role="status"></div>';
  sc.scrollTop = top;
  const btns = [...sc.querySelectorAll('.btn')].filter(b => !b.closest('.dialog'));
  const texts = [...sc.querySelectorAll('.name, h1, h3, .opt span:last-child, .next p, .gname, .status strong, .center strong')].map(x => x.textContent.trim());
  const longest = texts.sort((a, b) => b.length - a.length)[0] || '';
  cell.querySelector('.note').textContent = `버튼 ${btns.length}개(${btns.map(b => b.textContent.trim()).join(', ') || '없음'}), 글자 링크 ${sc.querySelectorAll('.link').length}개. 가장 긴 문구 ${longest.length}자`;
}
function toast(cell, msg) { const t = cell.querySelector('.toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200); }
function later(cell, st, ms, after) { setTimeout(() => { cell.dataset.st = st; draw(cell); if (after) after(); }, ms); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-go],[data-set],[data-screen]'); if (!b) return;
  if (b.dataset.screen) { S.screen = b.dataset.screen; history.replaceState(null, '', '?screen=' + S.screen); drawAll(); return; }
  if (b.dataset.set) { const [k, v] = b.dataset.set.split('='); S[k] = k === 'w' ? +v : k === 'role' ? v : v === '1'; document.querySelectorAll(`[data-set^="${k}="]`).forEach(x => x.setAttribute('aria-pressed', String(x === b))); drawAll(); return; }
  const cell = b.closest('.cell'); if (!cell) return;
  if (b.dataset.go) { if (solo || capture) { toast(cell, NAME[b.dataset.go] + '(' + b.dataset.go + ')로 가요'); return; } S.screen = b.dataset.go; history.replaceState(null, '', '?screen=' + S.screen); drawAll(); window.scrollTo(0, 0); return; }
  const a = b.dataset.act, st0 = cell.dataset.st;
  if (a === 'toast') toast(cell, b.dataset.msg);
  if (a === 'pick') { S.answers[+b.dataset.q] = +b.dataset.o; document.querySelectorAll('.cell[data-scr="SCR-007"]').forEach(c => { if (c.dataset.st === 'normal') draw(c); }); }
  if (a === 'jump') { const i = S.answers.findIndex(x => x === null); const el = cell.querySelector('#q' + i); if (el) { el.classList.add('missing'); cell.querySelector('.screen').scrollTop = el.offsetTop - 120; } }
  if (a === 'submit') { S.submitting = true; draw(cell); setTimeout(() => { S.submitting = false; draw(cell); toast(cell, '제출했어요. 내 결과(SCR-008)로 가요'); }, 900); }
  if (a === 'retry') { cell.dataset.st = 'loading'; draw(cell); later(cell, STATES[cell.dataset.scr].includes('normal') ? 'normal' : st0, 1000); }
  if (a === 'refresh') { cell.dataset.st = STATES[cell.dataset.scr].includes('stale') ? 'stale' : st0; draw(cell); later(cell, 'normal', 1000); }
  if (a === 'party') { S.party = Math.max(2, Math.min(8, S.party + +b.dataset.d)); draw(cell); }
  if (a === 'create') { cell.dataset.st = 'loading'; draw(cell); later(cell, 'normal', 900, () => toast(cell, '방을 만들었어요. 문항(SCR-007)으로 가요')); }
  if (a === 'notify') { toast(cell, '토스 알림 동의 화면이 떠요'); later(cell, 'notify-done', 900); }
  if (a === 'close') { cell.dataset.st = 'confirm-close'; draw(cell); cell.querySelector('[data-act=confirm]').focus(); }
  if (a === 'cancel') { cell.dataset.st = 'normal'; draw(cell); }
  if (a === 'confirm') { S.closing = true; draw(cell); setTimeout(() => { S.closing = false; cell.dataset.st = 'normal'; draw(cell); toast(cell, '마감했어요. 최종 카드(SCR-010)로 가요'); }, 900); }
  if (a === 'ask-erase') { cell.dataset.st = 'confirm'; draw(cell); cell.querySelector('[data-act=erase]').focus(); }
  if (a === 'erase') { cell.dataset.st = 'loading'; draw(cell); later(cell, 'done', 900); }
});
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; document.querySelectorAll('.cell').forEach(c => { if (c.dataset.st === 'confirm-close' || c.dataset.st === 'confirm') { c.dataset.st = 'normal'; draw(c); } }); });
function build() {
  if (solo) document.body.classList.add('solo');
  if (capture) document.body.classList.add('capture', 'capture-' + capture);
  const pk = document.querySelector('.picker');
  if (pk) pk.innerHTML = SCREENS.map(s => `<button data-screen="${s[0]}" aria-pressed="false">${s[0].slice(4)} ${s[1]}</button>`).join('');
  document.querySelectorAll('[data-set]').forEach(x => { const [k, v] = x.dataset.set.split('='); x.setAttribute('aria-pressed', String(k === 'w' ? S.w === +v : k === 'role' ? S.role === v : S[k] === (v === '1'))); });
  drawAll();
}
build();
"""

PAGE = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>모임 합의 카드 목업</title>
<link rel="stylesheet" href="__FONT__">
<style>
/* tokens: design/base.tokens.json (scripts/draw-mockups.py가 넣어요) */
__TOKENS__
__CSS__
</style></head>
<body>
<header class="viewer"><h1>모임 합의 카드(가칭) 목업</h1>
<p>방향: 시안 A 바탕(흰 바탕, 파란 버튼)에 합의 카드만 시안 B의 카드 한 장 모양이에요(DEC-033). 주황·초록·회청색은 합의 카드 안에서만 써요.</p>
<p class="caption">09 목업 · 화면 15개, 상태는 08 화면 정의 그대로. 화면을 고르면 그 화면의 상태가 모두 나란히 나와요. 버튼·선택지·입력을 눌러 볼 수 있고, 다른 화면으로 가는 버튼은 그 화면을 열어요(서버 요청 없음). 문항·카드·약관 문구는 예시예요.</p>
<div class="controls">
<span><span class="seg-label">폭</span><span class="seg"><button data-set="w=360">360px</button><button data-set="w=430">430px</button></span></span>
<span><span class="seg-label">글자</span><span class="seg"><button data-set="long=0">보통</button><button data-set="long=1">가장 긴 글자</button></span></span>
<span><span class="seg-label">보는 사람</span><span class="seg"><button data-set="role=host">방장</button><button data-set="role=member">참여자</button><button data-set="role=visitor">처음 온 사람</button></span></span>
</div>
<nav class="picker" aria-label="화면 고르기"></nav>
<p class="caption" id="scr-name" style="margin-top:var(--space-3)"></p>
</header>
<main class="grid"></main>
<script>
__JS__
</script>
</body></html>
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    screens = screens_from_08()
    js = (JS.replace("__DATA__", json.dumps(DATA, ensure_ascii=False)).replace("__CARD__", json.dumps(CARD, ensure_ascii=False))
          .replace("__SCREENS__", json.dumps(screens, ensure_ascii=False)).replace("__OVERVIEW__", json.dumps(OVERVIEW)))
    page = PAGE.replace("__TOKENS__", tokens_css()).replace("__CSS__", CSS).replace("__JS__", js).replace("__FONT__", FONT_CSS)
    (OUT / "mockup.html").write_text(page)
    L = DATA["long"]
    lens = {"모임 이름": len(L["rooms"][0][0]), "문항": len(L["q0"][0]), "선택지": max(len(L["q0"][1]), len(L["q0"][2])),
            "다음 행동": len(L["next"]), "닉네임": len(L["nick"])}
    for k, lim in {"모임 이름": 20, "문항": 40, "선택지": 30, "다음 행동": 60, "닉네임": 10}.items():
        assert lens[k] <= lim, (k, lens[k])
    print("screens %d, states %d; 가장 긴 글자 %s" % (len(screens), sum(len(s[3]) for s in screens), lens))


if __name__ == "__main__":
    main()
