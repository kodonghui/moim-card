#!/usr/bin/env python3
"""09 목업 시안 A·B를 그려요.

  design/base.tokens.json + design/candidate-{a,b}.tokens.json → CSS 사용자 정의 속성
  → design/mockups/candidate-a.html, candidate-b.html

세 화면(SCR-002 홈, SCR-007 문항, SCR-009 합의 카드)을 08 화면 정의의 상태별로, 360px·430px로 그려요.
페이지 안에서 버튼과 선택지를 누를 수 있어요(목업이라 서버 요청은 없어요).
주소 매개변수: ?w=430, ?long=1(가장 긴 글자), ?role=member(참여자로 보기),
?solo=SCR-007&state=normal(한 화면만 화면 폭 전체로, 검사용), ?capture=1(세 화면 정상 상태 나란히, 캡처용).
실행: python3 scripts/draw-mockups.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESIGN = ROOT / "design"
OUT = DESIGN / "mockups"
FONT_CSS = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"


def flatten(node, path, out):
    kind = node.get("$type")
    for key, value in node.items():
        if key.startswith("$"):
            continue
        child_type = value.get("$type", kind) if isinstance(value, dict) else kind
        if isinstance(value, dict) and "$value" in value:
            out["--" + "-".join(path + [key])] = css_value(child_type, value["$value"])
        elif isinstance(value, dict):
            sub = dict(value)
            sub.setdefault("$type", kind) if kind else None
            flatten(sub, path + [key], out)


def css_value(kind, v):
    if kind == "color":
        r, g, b = (round(x * 255) for x in v["components"])
        if "alpha" in v and v["alpha"] != 1:
            return "rgba(%d, %d, %d, %s)" % (r, g, b, v["alpha"])
        return "#%02x%02x%02x" % (r, g, b)
    if kind in ("dimension", "duration"):
        return "%s%s" % (v["value"], v["unit"])
    if kind == "fontFamily":
        return ", ".join(x if x.replace("-", "").isalnum() and " " not in x else '"%s"' % x for x in v)
    if kind == "cubicBezier":
        return "cubic-bezier(%s)" % ", ".join(str(x) for x in v)
    return str(v)


def tokens_css(candidate):
    out = {}
    for name in ("base.tokens.json", "candidate-%s.tokens.json" % candidate):
        flatten(json.loads((DESIGN / name).read_text()), [], out)
    return ":root{\n" + "".join("  %s: %s;\n" % kv for kv in sorted(out.items())) + "}"


CANDIDATES = {
    "a": {"title": "시안 A · 토스처럼 깔끔하게",
          "desc": "흰 바탕에 파란 버튼 하나, 글자 위주예요. 합의 카드는 조율해요 → 모두 좋아요 → 누구나 괜찮아요를 줄 목록으로 보여 줘요."},
    "b": {"title": "시안 B · 모임 카드처럼 따뜻하게",
          "desc": "따뜻한 주황 강조색 하나와 연한 바탕이에요. 합의 카드는 저장·공유했을 때 눈에 띄는 카드 한 장 모양이고, 분류마다 색 띠와 이름표가 있어요."},
}

# 실제 문구: 08 화면 정의와 06 오류 코드의 사용자 문구. 문항·카드 문구는 예시예요(문항 세트는 FL-014에서 써요).
DATA = {
    "normal": {
        "rooms": [["제주 3박", "여행", 4, 3, "host", True], ["금요일 팀 회식", "회식·저녁", 6, 1, "member", False]],
        "nick": "산", "room": "제주 3박",
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
    },
    "long": {
        "rooms": [["다음 주 금요일 팀 회식 장소 정하기", "회식·저녁", 8, 7, "host", True], ["제주 3박 4일 가족 여행 일정 정하기", "여행", 6, 1, "member", False]],
        "nick": "바다좋아하는산책러다", "room": "다음 주 금요일 팀 회식 장소 정하기",
        "questions": [["숙소는 바다가 잘 보이는 곳과 시내에서 가까운 곳 중 어디가 더 좋아요?",
                       "바다가 바로 보이는 오션뷰 숙소에서 이틀 동안 머물러요", "시내 정류장에서 걸어서 5분 안에 닿는 숙소에 묵어요"]],
        "next": "숙소 두 곳의 가격과 위치를 같이 비교해 보고 오늘 안에 하나로 정해요. 예약은 방장이 맡아요",
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

STATES = {
    "SCR-002": ["normal", "loading", "empty", "error", "permission", "stale"],
    "SCR-007": ["normal", "loading", "error", "permission", "stale"],
    "SCR-009": ["normal", "loading", "empty", "error", "permission", "stale", "confirm-close"],
}
NAMES = {"SCR-002": "홈", "SCR-007": "문항", "SCR-009": "합의 카드"}

CSS = r"""
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--color-bg-subtle);color:var(--color-text-primary);font-family:var(--font-family-sans);font-size:var(--font-size-body);line-height:1.5;word-break:keep-all;overflow-wrap:break-word;text-wrap:pretty}
button{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px}
.viewer{padding:var(--space-6) var(--space-4) var(--space-4);max-width:1440px;margin:0 auto}
.viewer h1{font-size:var(--font-size-title);margin:0 0 var(--space-2)}
.viewer p{margin:0 0 var(--space-3);color:var(--color-text-secondary)}
.controls{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-4);align-items:center}
.seg{display:inline-flex;border:1px solid var(--color-border-control);border-radius:var(--radius-chip);overflow:hidden;background:var(--color-bg-page)}
.seg button{border:0;background:none;min-height:var(--size-touch-min);padding:0 var(--space-4);cursor:pointer;font-size:var(--font-size-small)}
.seg button[aria-pressed=true]{background:var(--color-accent-default);color:var(--color-text-on-accent);font-weight:var(--font-weight-bold)}
.seg-label{font-size:var(--font-size-small);color:var(--color-text-secondary);margin-right:var(--space-1)}
.columns{display:flex;gap:var(--space-6);padding:var(--space-2) var(--space-4) var(--space-10);overflow-x:auto;max-width:1440px;margin:0 auto;align-items:flex-start}
.col{flex:none}
.col-title{font-size:var(--font-size-heading);margin:0 0 var(--space-2)}
.tabs{display:flex;flex-wrap:wrap;gap:var(--space-1);margin-bottom:var(--space-3);max-width:430px}
.tabs button{border:1px solid var(--color-border-control);background:var(--color-bg-page);border-radius:var(--radius-chip);min-height:var(--size-touch-min);padding:0 var(--space-3);font-size:var(--font-size-small);cursor:pointer}
.tabs button[aria-pressed=true]{border-color:var(--color-accent-default);background:var(--color-accent-subtle);color:var(--color-accent-on-subtle);font-weight:var(--font-weight-bold)}
.note{max-width:430px;font-size:var(--font-size-small);color:var(--color-text-secondary);margin:var(--space-3) 0 0}
.phone{position:relative;height:760px;border:1px solid var(--color-frame-device-border);border-radius:28px;overflow:hidden;background:var(--color-surface-page);display:flex;flex-direction:column}
.nav{flex:none;height:var(--size-nav);display:flex;align-items:center;justify-content:center;background:var(--color-frame-nav-bg);font-size:var(--font-size-caption);color:var(--color-text-secondary);border-bottom:1px solid var(--color-border-divider)}
.screen{position:relative;flex:1;overflow-y:auto;overflow-x:hidden}
.body{padding:var(--space-5) var(--space-5) 220px}
.title{font-size:var(--font-size-title);font-weight:var(--font-weight-bold);line-height:1.36;margin:0}
.caption{font-size:var(--font-size-caption);color:var(--color-text-tertiary)}
.small{font-size:var(--font-size-small);color:var(--color-text-secondary)}
.section{font-size:var(--font-size-heading);font-weight:var(--font-weight-bold);margin:var(--space-8) 0 var(--space-3)}
.btn{display:flex;align-items:center;justify-content:center;gap:var(--space-2);width:100%;min-height:var(--size-touch);padding:var(--space-3) var(--space-4);border-radius:var(--radius-button);border:1px solid transparent;font-size:var(--font-size-body);font-weight:var(--font-weight-bold);cursor:pointer;text-align:center;transition:opacity var(--motion-duration-fast) var(--motion-curve-standard),transform var(--motion-duration-fast) var(--motion-curve-standard)}
.btn:active{transform:scale(.98)}
.btn.primary{background:var(--color-accent-default);color:var(--color-text-on-accent)}
.btn.primary:hover{background:var(--color-accent-pressed)}
.btn.secondary{background:var(--color-accent-subtle);color:var(--color-accent-on-subtle)}
.btn.outline{background:var(--color-bg-page);border-color:var(--color-border-control);color:var(--color-text-primary)}
.btn[disabled]{background:var(--color-disabled-bg);color:var(--color-disabled-text);border-color:transparent;cursor:not-allowed;transform:none}
.btn .spin{width:18px;height:18px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.link{background:none;border:0;padding:0 var(--space-2);min-height:var(--size-touch-min);color:var(--color-accent-on-subtle);font-weight:var(--font-weight-bold);font-size:var(--font-size-small);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.row{display:flex;align-items:center;gap:var(--space-3);width:100%;min-height:64px;padding:var(--space-3) 0;background:none;border:0;border-bottom:1px solid var(--color-border-divider);text-align:left;cursor:pointer}
.row .main{flex:1;min-width:0}
.row .name{display:block;font-weight:var(--font-weight-bold)}
.row .sub{display:block;font-size:var(--font-size-small);color:var(--color-text-secondary)}
.badge{flex:none;font-size:var(--font-size-caption);font-weight:var(--font-weight-bold);padding:2px var(--space-2);border-radius:var(--radius-chip);background:var(--color-accent-subtle);color:var(--color-accent-on-subtle)}
.badge.muted{background:var(--color-bg-subtle);color:var(--color-text-secondary)}
.chev{flex:none;color:var(--color-text-tertiary)}
.menu .row{min-height:var(--size-touch)}
.asof{display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap;font-size:var(--font-size-caption);color:var(--color-text-tertiary);margin-top:var(--space-2)}
.sk{background:var(--color-skeleton);border-radius:var(--radius-chip)}
.sk-row{height:64px;border-bottom:1px solid var(--color-border-divider);display:flex;flex-direction:column;justify-content:center;gap:var(--space-2)}
.sk-row .sk:first-child{height:16px;width:55%}.sk-row .sk:last-child{height:12px;width:75%}
.notice{border-radius:var(--radius-card);background:var(--color-bg-subtle);padding:var(--space-5);text-align:center}
.notice strong{display:block;font-size:var(--font-size-body);margin-bottom:var(--space-1)}
.notice .btn{margin-top:var(--space-4)}
.notice.error strong{color:var(--color-feedback-error)}
.center{min-height:520px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:var(--space-2);padding:0 var(--space-6)}
.center strong{font-size:var(--font-size-heading)}
.center .btn{margin-top:var(--space-4);max-width:280px}
.sticky{position:sticky;top:0;z-index:2;background:var(--color-surface-page);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border-divider)}
.progress{height:6px;border-radius:var(--radius-chip);background:var(--color-skeleton);overflow:hidden;margin:var(--space-2) 0 var(--space-1)}
.progress i{display:block;height:100%;background:var(--color-accent-default);transform-origin:left;transition:transform var(--motion-duration-base) var(--motion-curve-standard)}
.q{padding:var(--space-5) 0;border-bottom:1px solid var(--color-border-divider)}
.q .no{font-size:var(--font-size-caption);color:var(--color-text-tertiary);font-weight:var(--font-weight-bold)}
.q h3{font-size:var(--font-size-heading);margin:var(--space-1) 0 var(--space-3);line-height:1.45}
.q.missing h3{color:var(--color-feedback-error)}
.q .miss{display:none;font-size:var(--font-size-small);color:var(--color-feedback-error);margin:0 0 var(--space-2)}
.q.missing .miss{display:block}
.opt{display:flex;align-items:center;gap:var(--space-3);width:100%;min-height:var(--size-touch);margin-top:var(--space-2);padding:var(--space-3) var(--space-4);border:1px solid var(--color-border-control);border-radius:var(--radius-button);background:var(--color-bg-page);text-align:left;cursor:pointer;font-size:var(--font-size-label)}
.opt .dot{flex:none;width:20px;height:20px;border-radius:50%;border:2px solid var(--color-border-control)}
.opt[aria-pressed=true]{border:2px solid var(--color-accent-default);background:var(--color-accent-subtle);font-weight:var(--font-weight-bold);padding:calc(var(--space-3) - 1px) calc(var(--space-4) - 1px)}
.opt[aria-pressed=true] .dot{border:6px solid var(--color-accent-default)}
.dock{position:absolute;left:0;right:0;bottom:0;z-index:3;padding:var(--space-3) var(--space-5) var(--space-5);background:var(--color-surface-page);border-top:1px solid var(--color-border-divider);display:flex;flex-direction:column;gap:var(--space-2)}
.dock .hint{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);font-size:var(--font-size-small);color:var(--color-text-secondary)}
.dock .err{font-size:var(--font-size-small);color:var(--color-feedback-error);background:var(--color-feedback-error-bg);border-radius:var(--radius-chip);padding:var(--space-2) var(--space-3)}
.status{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap}
.status strong{font-size:var(--font-size-body)}
.me{font-size:var(--font-size-caption);color:var(--color-text-tertiary);margin-top:var(--space-1)}
.next{border-radius:var(--radius-card);background:var(--color-accent-subtle);padding:var(--space-4);margin:var(--space-4) 0}
.next .label{font-size:var(--font-size-caption);font-weight:var(--font-weight-bold);color:var(--color-accent-on-subtle)}
.next p{margin:var(--space-1) 0 0;font-size:var(--font-size-body);font-weight:var(--font-weight-bold)}
.cat{margin-top:var(--space-6)}
.cat-head{display:flex;align-items:center;gap:var(--space-2);font-weight:var(--font-weight-bold);font-size:var(--font-size-heading)}
.cat-head .n{color:var(--color-accent-on-subtle)}
.item{padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-divider)}
.item .p{font-weight:var(--font-weight-medium)}
.item .counts{font-size:var(--font-size-small);color:var(--color-text-secondary);margin-top:2px}
.item .t{font-size:var(--font-size-small);margin-top:2px}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-top:var(--space-6)}
.host{margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--color-border-divider)}
.host .small{margin:0 0 var(--space-2)}
.center-link{display:flex;justify-content:center;margin-top:var(--space-3)}
.dim{position:absolute;inset:0;z-index:5;background:var(--color-overlay);display:flex;align-items:center;justify-content:center;padding:var(--space-5)}
.dialog{background:var(--color-bg-page);border-radius:var(--radius-card);padding:var(--space-6) var(--space-5) var(--space-5);width:100%}
.dialog h3{margin:0 0 var(--space-2);font-size:var(--font-size-heading)}
.dialog p{margin:0;color:var(--color-text-secondary);font-size:var(--font-size-label)}
.dialog .two{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-top:var(--space-5)}
.toast{position:absolute;left:var(--space-5);right:var(--space-5);bottom:110px;z-index:6;background:var(--color-text-primary);color:var(--color-text-on-accent);border-radius:var(--radius-button);padding:var(--space-3) var(--space-4);font-size:var(--font-size-small);opacity:0;transform:translateY(8px);transition:opacity var(--motion-duration-base) var(--motion-curve-standard),transform var(--motion-duration-base) var(--motion-curve-standard);pointer-events:none}
.toast.on{opacity:1;transform:none}
.refreshing{display:inline-block;width:12px;height:12px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .8s linear infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:opacity var(--motion-duration-fast) linear!important}.btn:active{transform:none}}
/* 시안 B: 카드 한 장, 분류 색 띠, 테마 이름표 */
.cand-b .home-room{border:1px solid var(--color-surface-card-border);border-radius:var(--radius-card);background:var(--color-surface-card);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-2);border-bottom-width:1px}
.cand-b .the-card{background:var(--color-surface-card);border:1px solid var(--color-surface-card-border);border-radius:var(--radius-card);padding:var(--space-5);margin-top:var(--space-4)}
.cand-b .card-top{border-bottom:1px dashed var(--color-surface-card-border);padding-bottom:var(--space-3)}
.cand-b .card-top .gname{font-size:var(--font-size-heading);font-weight:var(--font-weight-bold)}
.cand-b .cat{border-left:4px solid var(--cat);padding-left:var(--space-3)}
.cand-b .cat-head .pill{font-size:var(--font-size-caption);padding:2px var(--space-2);border-radius:var(--radius-chip);background:var(--cat);color:var(--color-text-on-accent)}
.cand-b .cat-head .n{color:var(--color-text-secondary)}
.cand-b .item:last-child{border-bottom:0}
.cand-b .next{margin:var(--space-4) 0 0}
.cand-a .card-top{display:none}
.cand-a .pill{font-weight:var(--font-weight-bold)}
/* 단독 보기(검사용)와 캡처 */
.solo .viewer,.solo .tabs,.solo .note,.solo .col-title{display:none}
.solo .columns{padding:0;display:block}
.solo .phone{width:100vw!important;height:100vh;border:0;border-radius:0}
.capture .controls,.capture .tabs,.capture .note{display:none}
.capture .viewer{padding-bottom:0}
.capture .phone{height:auto;min-height:760px}.capture .screen{overflow:visible}
"""

JS = r"""
const D = __DATA__, CARD = __CARD__, STATES = __STATES__, NAMES = __NAMES__;
const q = new URLSearchParams(location.search);
const S = {w: q.get('w') === '430' ? 430 : 360, long: q.get('long') === '1', host: q.get('role') !== 'member',
  state: {'SCR-002': 'normal', 'SCR-007': 'normal', 'SCR-009': 'normal'}, answers: [0, 2, null, null, null, null, null, null]};
const solo = q.get('solo'), capture = q.get('capture') === '1';
if (solo && q.get('state')) S.state[solo] = q.get('state');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
function data() {
  const n = D.normal; if (!S.long) return n;
  const L = D.long; return {...n, rooms: L.rooms, nick: L.nick, room: L.room, next: L.next, questions: [L.questions[0], ...n.questions.slice(1)]};
}
const err = '<span class="caption">오류 번호 7f3a2c19</span>';
function home(st) {
  const d = data();
  const rooms = d.rooms.map(r => `<button class="row home-room" data-act="toast" data-msg="방 소개(SCR-005)가 상태를 다시 보고 ${r[5] ? '합의 카드' : '문항'}로 보내요"><span class="main"><span class="name">${esc(r[0])}</span><span class="sub">${esc(r[1])} · ${r[2]}명 중 ${r[3]}명 답했어요</span></span>${r[4] === 'host' ? '<span class="badge">방장</span>' : ''}${r[5] ? '' : '<span class="badge muted">답하기 전</span>'}<span class="chev" aria-hidden="true">›</span></button>`).join('');
  if (st === 'permission') return `<div class="center"><strong>지금은 쓸 수 없어요</strong><span class="small">토스 앱 밖에서 열었을 때만 보여요</span></div>`;
  let list;
  if (st === 'loading') list = '<div aria-busy="true" aria-label="불러오는 중">' + '<div class="sk-row"><div class="sk"></div><div class="sk"></div></div>'.repeat(2) + '</div>';
  else if (st === 'empty') list = `<div class="notice"><strong>참여 중인 방이 없어요</strong><span class="small">방을 만들고 친구를 불러 보세요</span></div>`;
  else if (st === 'error') list = `<div class="notice error"><strong>잠시 뒤 다시 해 주세요</strong>${err}<button class="btn outline" data-act="retry" data-scr="SCR-002">다시 시도</button></div>`;
  else list = rooms + `<div class="asof">오후 3시 5분 기준${st === 'stale' ? ' · 다시 불러오는 중 <span class="refreshing" aria-hidden="true"></span>' : ' <button class="link" data-act="refresh" data-scr="SCR-002">새로고침</button>'}</div>`;
  const menu = ['지난 카드', '내 데이터 지우기', '이용약관', '개인정보처리방침'].map(m => `<button class="row" data-act="toast" data-msg="${m} 화면으로 가요"><span class="main"><span class="name">${m}</span></span><span class="chev" aria-hidden="true">›</span></button>`).join('');
  return `<div class="body"><h1 class="title">모임 합의 카드</h1><p class="caption" style="margin:var(--space-1) 0 var(--space-5)">가칭 · 이름은 정해지면 바꿔요</p>
  <button class="btn primary" data-act="toast" data-msg="테마 고르기(SCR-003)로 가요">방 만들기</button>
  <h2 class="section">참여 중인 방</h2>${list}<h2 class="section">더 보기</h2><div class="menu">${menu}</div></div>`;
}
function questions(st) {
  const d = data();
  if (st === 'permission') return `<div class="center"><strong>이 방에 먼저 들어와 주세요</strong><span class="small">방 소개(SCR-005)로 가요</span></div>`;
  if (st === 'stale') return `<div class="center"><strong>방이 그사이 마감됐어요</strong><span class="small">고른 답은 지우고 최종 카드(SCR-010)로 가요</span><button class="btn primary" data-act="toast" data-msg="최종 카드(SCR-010)로 가요">최종 카드 보기</button></div>`;
  const ans = st === 'error' ? [0, 1, 0, 1, 1, 0, 0, 1] : st === 'loading' ? Array(8).fill(null) : S.answers;
  const done = ans.filter(a => a !== null).length, left = 8 - done;
  const top = `<div class="sticky"><div class="status"><strong>${esc(d.room)}</strong><span class="small">8개 중 ${done}개 골랐어요</span></div><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="${done}" aria-label="고른 문항 수"><i style="transform:scaleX(${done / 8})"></i></div><div class="me">${esc(d.nick)} 님으로 참여 중</div></div>`;
  let list;
  if (st === 'loading') list = '<div aria-busy="true" aria-label="불러오는 중">' + '<div class="q"><div class="sk" style="height:14px;width:40px"></div><div class="sk" style="height:20px;width:70%;margin:12px 0 16px"></div><div class="sk" style="height:48px;margin-top:8px"></div><div class="sk" style="height:48px;margin-top:8px"></div><div class="sk" style="height:48px;margin-top:8px"></div></div>'.repeat(2) + '</div>';
  else list = d.questions.map((x, i) => `<div class="q" id="q${i}"><div class="no">${i + 1} / 8</div><h3>${esc(x[0])}</h3><p class="miss">아직 고르지 않았어요</p>${[x[1], x[2], '상관없어요'].map((o, j) => `<button class="opt" aria-pressed="${ans[i] === j}" data-act="pick" data-q="${i}" data-o="${j}"><span class="dot" aria-hidden="true"></span><span>${esc(o)}</span></button>`).join('')}</div>`).join('');
  const busy = S.submitting;
  const dock = `<div class="dock">${st === 'error' ? '<div class="err" role="alert">제출하지 못했어요. 고른 답은 그대로예요</div>' : left ? `<div class="hint"><span>${left}개 남았어요</span><button class="link" data-act="jump">남은 문항으로 가기</button></div>` : ''}
  <button class="btn outline" data-act="toast" data-msg="토스 공유 시트가 열려요(초대 링크에는 방 코드만)">친구 부르기</button>
  <button class="btn primary" data-act="submit" ${left || st === 'loading' || busy ? 'disabled' : ''}>${busy ? '<span class="spin" aria-hidden="true"></span>제출하는 중' : st === 'error' ? '다시 시도' : '제출하기'}</button></div>`;
  return `${top}<div class="body">${list}</div>${dock}`;
}
function card(st) {
  const d = data(), host = S.host;
  if (st === 'permission') return `<div class="center"><strong>답하면 볼 수 있어요</strong><span class="small">문항(SCR-007)으로 가요</span><button class="btn primary" data-act="toast" data-msg="문항(SCR-007)으로 가요">답하러 가기</button></div>`;
  const total = S.long ? 8 : 4, based = st === 'empty' ? 1 : (S.long ? 7 : 3);
  const status = `<div class="status"><strong>인원 ${total}명 중 ${based}명 답했어요</strong></div><div class="asof">오후 3시 5분 기준${st === 'stale' ? ' · 다시 불러오는 중 <span class="refreshing" aria-hidden="true"></span>' : ' <button class="link" data-act="refresh" data-scr="SCR-009">새로고침</button>'}</div><div class="me">${esc(d.nick)} 님으로 참여 중</div>`;
  const cats = [['split', '조율해요'], ['agreed', '모두 좋아요'], ['open', '누구나 괜찮아요']];
  const body = cats.map(([k, label]) => {
    const items = CARD.filter(c => c[0] === k);
    return `<section class="cat" style="--cat:var(--color-category-${k})"><div class="cat-head"><span class="pill">${label}</span><span class="n">${items.length}개</span></div>${items.map(c => { const x = d.questions[c[1]]; return `<div class="item"><div class="p">${esc(x[0])}</div><div class="counts">${esc(x[1])}&nbsp;${c[2]} · ${esc(x[2])}&nbsp;${c[3]} · 상관없어요&nbsp;${c[4]}</div><div class="t">${esc(c[5])}</div></div>`; }).join('')}</section>`;
  }).join('');
  let main;
  if (st === 'loading') main = '<div aria-busy="true" aria-label="불러오는 중"><div class="sk" style="height:96px;border-radius:var(--radius-card);margin:16px 0"></div>' + '<div class="sk-row"><div class="sk"></div><div class="sk"></div></div>'.repeat(4) + '</div>';
  else if (st === 'empty') main = `<div class="notice" style="margin-top:var(--space-5)"><strong>친구를 부르면 카드가 생겨요</strong><span class="small">2명 이상 답하면 카드가 만들어져요</span><button class="btn primary" data-act="toast" data-msg="토스 공유 시트가 열려요">친구 부르기</button></div>`;
  else if (st === 'error') main = `<div class="notice error" style="margin-top:var(--space-5)"><strong>잠시 뒤 다시 해 주세요</strong>${err}<button class="btn outline" data-act="retry" data-scr="SCR-009">다시 시도</button></div>`;
  else main = `<div class="the-card"><div class="card-top"><div class="gname">${esc(d.room)}</div><div class="caption">여행 · ${based}명 기준 중간 카드</div></div><p class="caption cand-a-only">${based}명 기준 중간 카드</p><div class="next"><div class="label">다음 행동</div><p>${esc(d.next)}</p></div>${body}</div>
    <div class="actions"><button class="btn secondary" data-act="toast" data-msg="저장했어요(moim-card-20261128.png)">카드 저장</button><button class="btn secondary" data-act="toast" data-msg="토스 공유 시트가 열려요">단톡방에 보내기</button></div>`;
  const canClose = st !== 'empty' && st !== 'loading' && st !== 'error';
  const hostBox = host ? `<div class="host"><p class="small">${canClose ? '방장에게만 보여요' : '2명 이상이 답하면 마감할 수 있어요'}</p><button class="btn outline" data-act="close" ${canClose ? '' : 'disabled'}>지금 마감하기</button></div>` : '';
  const link = (st === 'normal' || st === 'stale' || st === 'confirm-close') ? `<div class="center-link"><button class="link" data-act="toast" data-msg="내 결과(SCR-008)로 가요">내 모임 성향 다시 보기</button></div>` : '';
  const dlg = st === 'confirm-close' ? `<div class="dim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><h3 id="dlg-t">지금 마감할까요?</h3><p>마감하면 더 답할 수 없어요. 지금 ${based}명의 답으로 최종 카드가 만들어져요</p><div class="two"><button class="btn outline" data-act="cancel">취소</button><button class="btn primary" data-act="confirm">${S.closing ? '<span class="spin" aria-hidden="true"></span>마감하는 중' : '마감하기'}</button></div></div></div>` : '';
  return `<div class="body">${status}${main}${hostBox}${link}</div>${dlg}`;
}
const RENDER = {'SCR-002': home, 'SCR-007': questions, 'SCR-009': card};
function draw(scr) {
  const el = document.getElementById(scr); if (!el) return;
  const top = el.querySelector('.screen') ? el.querySelector('.screen').scrollTop : 0;
  el.querySelector('.phone').style.width = S.w + 'px';
  el.querySelector('.screen').innerHTML = RENDER[scr](S.state[scr]) + '<div class="toast" role="status"></div>';
  el.querySelector('.screen').scrollTop = top;
  el.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.state === S.state[scr]));
  note(scr);
}
function note(scr) {
  const el = document.getElementById(scr), n = el.querySelector('.note'); if (!n) return;
  const btns = [...el.querySelectorAll('.screen .btn')].filter(b => !b.closest('.dialog'));
  const links = el.querySelectorAll('.screen .link').length;
  const texts = [...el.querySelectorAll('.screen .name, .screen h3, .screen .opt span:last-child, .screen .next p, .screen .gname, .screen .status strong')].map(x => x.textContent.trim());
  const longest = texts.sort((a, b) => b.length - a.length)[0] || '';
  n.textContent = `이 상태의 버튼 ${btns.length}개(${btns.map(b => b.textContent.trim()).join(', ') || '없음'}), 글자 링크 ${links}개. 가장 긴 문구 ${longest.length}자: "${longest}"`;
}
function toast(scr, msg) {
  const t = document.querySelector('#' + scr + ' .toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-state],[data-set]'); if (!b) return;
  const col = b.closest('.col'), scr = col && col.id;
  if (b.dataset.state && col) { S.state[scr] = b.dataset.state; draw(scr); return; }
  if (b.dataset.set) { const [k, v] = b.dataset.set.split('='); S[k] = k === 'w' ? +v : v === '1'; document.querySelectorAll(`[data-set^="${k}="]`).forEach(x => x.setAttribute('aria-pressed', x === b)); Object.keys(RENDER).forEach(draw); return; }
  const a = b.dataset.act;
  if (a === 'toast') toast(scr, b.dataset.msg);
  if (a === 'pick') { S.answers[+b.dataset.q] = +b.dataset.o; document.querySelectorAll('.q.missing').forEach(x => x.classList.remove('missing')); draw(scr); }
  if (a === 'jump') { const i = S.answers.findIndex(x => x === null); const el = col.querySelector('#q' + i); if (el) { el.classList.add('missing'); col.querySelector('.screen').scrollTop = el.offsetTop - 120; } }
  if (a === 'submit') { S.submitting = true; draw(scr); setTimeout(() => { S.submitting = false; draw(scr); toast(scr, '제출했어요. 내 결과(SCR-008)로 가요'); }, 900); }
  if (a === 'retry' || a === 'refresh') { const back = S.state[scr]; S.state[scr] = a === 'retry' ? 'loading' : 'stale'; draw(scr); setTimeout(() => { S.state[scr] = 'normal'; draw(scr); }, 1000); }
  if (a === 'close') { S.state[scr] = 'confirm-close'; draw(scr); col.querySelector('[data-act=confirm]').focus(); }
  if (a === 'cancel') { S.state[scr] = 'normal'; draw(scr); }
  if (a === 'confirm') { S.closing = true; draw(scr); setTimeout(() => { S.closing = false; S.state[scr] = 'normal'; draw(scr); toast(scr, '마감했어요. 최종 카드(SCR-010)로 가요'); }, 900); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.state['SCR-009'] === 'confirm-close') { S.state['SCR-009'] = 'normal'; draw('SCR-009'); } });
function build() {
  if (solo) document.body.classList.add('solo');
  if (capture) document.body.classList.add('capture');
  const cols = document.querySelector('.columns');
  cols.innerHTML = Object.keys(RENDER).filter(s => !solo || s === solo).map(scr => `<section class="col" id="${scr}"><h2 class="col-title">${scr} ${NAMES[scr]}</h2><div class="tabs" role="group" aria-label="${NAMES[scr]} 상태">${STATES[scr].map(st => `<button data-state="${st}" aria-pressed="false">${st}</button>`).join('')}</div><div class="phone"><div class="nav" aria-hidden="true">토스 내비게이션 바(뒤로가기·닫기는 토스가 그려요)</div><div class="screen"></div></div><p class="note"></p></section>`).join('');
  document.querySelectorAll('[data-set]').forEach(x => { const [k, v] = x.dataset.set.split('='); x.setAttribute('aria-pressed', String(k === 'w' ? S.w === +v : S[k] === (v === '1'))); });
  Object.keys(RENDER).forEach(draw);
}
build();
"""

PAGE = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>__TITLE__</title>
<link rel="stylesheet" href="__FONT__">
<style>
/* tokens: design/base.tokens.json + design/candidate-__C__.tokens.json (scripts/draw-mockups.py가 넣어요) */
__TOKENS__
__CSS__
.cand-a .cand-a-only{display:block}.cand-b .cand-a-only{display:none}
</style></head>
<body class="cand-__C__">
<header class="viewer"><h1>__TITLE__</h1><p>__DESC__</p>
<p class="caption">09 목업 · 세 화면(SCR-002 홈, SCR-007 문항, SCR-009 합의 카드), 08 화면 정의의 상태별. 문항·카드 문구는 예시예요. 버튼과 선택지를 눌러 볼 수 있어요(서버 요청 없음). 다른 시안: <a href="candidate-__OTHER__.html">시안 __OTHERU__</a></p>
<div class="controls">
<span><span class="seg-label">폭</span><span class="seg"><button data-set="w=360">360px</button><button data-set="w=430">430px</button></span></span>
<span><span class="seg-label">글자</span><span class="seg"><button data-set="long=0">보통</button><button data-set="long=1">가장 긴 글자</button></span></span>
<span><span class="seg-label">카드 화면</span><span class="seg"><button data-set="host=1">방장으로 보기</button><button data-set="host=0">참여자로 보기</button></span></span>
</div></header>
<main class="columns"></main>
<script>
__JS__
</script>
</body></html>
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    js = (JS.replace("__DATA__", json.dumps(DATA, ensure_ascii=False)).replace("__CARD__", json.dumps(CARD, ensure_ascii=False))
          .replace("__STATES__", json.dumps(STATES)).replace("__NAMES__", json.dumps(NAMES, ensure_ascii=False)))
    for c, meta in CANDIDATES.items():
        other = "b" if c == "a" else "a"
        page = (PAGE.replace("__TOKENS__", tokens_css(c)).replace("__CSS__", CSS).replace("__JS__", js)
                .replace("__TITLE__", meta["title"]).replace("__DESC__", meta["desc"]).replace("__FONT__", FONT_CSS)
                .replace("__C__", c).replace("__OTHERU__", other.upper()).replace("__OTHER__", other))
        (OUT / ("candidate-%s.html" % c)).write_text(page)
    lens = {"모임 이름": len(DATA["long"]["rooms"][0][0]), "문항": len(DATA["long"]["questions"][0][0]),
            "선택지": max(len(DATA["long"]["questions"][0][1]), len(DATA["long"]["questions"][0][2])),
            "다음 행동": len(DATA["long"]["next"]), "닉네임": len(DATA["long"]["nick"])}
    limits = {"모임 이름": 20, "문항": 40, "선택지": 30, "다음 행동": 60, "닉네임": 10}
    for k, v in lens.items():
        assert v <= limits[k], (k, v)
    print("candidates a, b; 가장 긴 글자", lens)


if __name__ == "__main__":
    main()
