#!/usr/bin/env python3
"""07 사이트맵 보기와 08 와이어프레임을 그려요.

  docs/07-sitemap/sitemap.yaml → docs/07-sitemap/sitemap.html(board, list, slides)과 README.md(Mermaid 보드, 목록)
  docs/08-screens/SCR-*.md의 상태 + 아래 FRAMES → docs/08-screens/wireframes.html(상태마다 한 장, 360px·430px)

와이어프레임은 구조와 상태만 보여 줘요: 회색, 시스템 글꼴, 실제 문구. 디자인 토큰은 09 단계에서 정해요.
실행: python3 scripts/draw-screens.py   (그린 뒤 python3 scripts/check-screens.py)
"""
import html
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
KST = timezone(timedelta(hours=9))
NOW = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")
e = html.escape

# ---------- 07 ----------
tree = yaml.safe_load((ROOT / "docs/07-sitemap/sitemap.yaml").read_text())
flat = []


def walk(nodes, depth=0, parent=None):
    for n in nodes:
        flat.append((depth, n, parent))
        walk(n.get("children") or [], depth + 1, n["id"])


walk(tree)


def board_box(n):
    kids = "".join(board_box(c) for c in n.get("children") or [])
    return ('<li><div class="box" data-scr="%s"><b>%s %s</b><code>%s</code><small>%s</small></div>%s</li>'
            % (n["id"], n["id"], e(n["name"]), e(n["path"]), e(n["access"]), "<ul>%s</ul>" % kids if kids else ""))


rows = "".join(
    '<tr data-scr="%s"><td>%s</td><td style="padding-left:%dpx">%s</td><td><code>%s</code></td><td>%s</td><td>%s</td><td>%s</td></tr>'
    % (n["id"], n["id"], 8 + 18 * d, e(n["name"]), e(n["path"]), e(n["access"]), ", ".join(n.get("flows") or []), e(n["status"]))
    for d, n, _ in flat)

root = tree[0]
slides = ['<div class="slide"><h3>뿌리</h3><ul><li data-scr="%s"><b>%s %s</b> <code>%s</code> · %s</li></ul></div>'
          % (root["id"], root["id"], e(root["name"]), e(root["path"]), ", ".join(root["flows"]))]
for branch in root.get("children") or []:
    items, fls = [], set()

    def collect(n, d):
        fls.update(n.get("flows") or [])
        items.append('<li data-scr="%s" style="margin-left:%dpx"><b>%s %s</b> <code>%s</code> · %s</li>'
                     % (n["id"], 16 * d, n["id"], e(n["name"]), e(n["path"]), ", ".join(n.get("flows") or [])))
        for c in n.get("children") or []:
            collect(c, d + 1)

    collect(branch, 0)
    slides.append('<div class="slide"><h3>%s %s 가지</h3><ul>%s</ul><p>지나는 흐름: %s</p></div>'
                  % (branch["id"], e(branch["name"]), "".join(items), ", ".join(sorted(fls))))

page7 = """<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>사이트맵 보기</title><style>
:root{--bg:#fff;--fg:#222;--muted:#666;--line:#bbb;--box:#f2f2f2}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;word-break:keep-all;overflow-wrap:anywhere}
h1{font-size:20px}h2{font-size:17px;margin-top:32px}code{font-size:13px}
.tree ul{list-style:none;margin:0;padding-left:24px;border-left:1px solid var(--line)}
.tree>ul{border:0;padding:0}.tree li{margin:8px 0}
.box{display:inline-flex;flex-direction:column;gap:2px;background:var(--box);border:1px solid var(--line);border-radius:8px;padding:8px 12px;max-width:100%%}
.box small{color:var(--muted)}
table{border-collapse:collapse;width:100%%;font-size:14px}td,th{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
.wrap{overflow-x:auto}.slide{border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0}.slide h3{margin:0 0 8px}
</style></head><body><h1>모임 합의 카드(가칭) 사이트맵</h1>
<p>그린 시각: %s · 원본: <code>docs/07-sitemap/sitemap.yaml</code> · 화면 %d개 · <code>python3 scripts/draw-screens.py</code>로 다시 그려요.</p>
<section id="board"><h2>보드</h2><div class="tree"><ul>%s</ul></div></section>
<section id="list"><h2>목록</h2><div class="wrap"><table><tr><th>SCR</th><th>화면</th><th>경로</th><th>누가</th><th>흐름</th><th>상태</th></tr>%s</table></div></section>
<section id="slides"><h2>슬라이드</h2>%s</section>
</body></html>
""" % (NOW, len(flat), board_box(root), rows, "".join(slides))
(ROOT / "docs/07-sitemap/sitemap.html").write_text(page7)

mer = ["flowchart TD", "  %% grammar: structure"]
for d, n, p in flat:
    mer.append('  %s["%s %s<br/>%s · %s"]' % (n["id"].replace("-", ""), n["id"], n["name"], n["path"], n["access"].split("(")[0].split(".")[0]))
for d, n, p in flat:
    if p:
        mer.append("  %s --> %s" % (p.replace("-", ""), n["id"].replace("-", "")))
lst = "\n".join("| %s | %s%s | `%s` | %s | %s |" % (n["id"], "↳ " * d, n["name"], n["path"], n["access"], ", ".join(n.get("flows") or [])) for d, n, _ in flat)
readme7 = """# 모임 합의 카드(가칭): 사이트맵 (07)

상태: **체크포인트 통과**(2026-11-28, DEC-027) · 원본: [sitemap.yaml](sitemap.yaml)(truth: source) · 보기 세 개(보드, 목록, 슬라이드): [sitemap.html](sitemap.html) · 체크포인트 질문: [checkpoint-07.md](checkpoint-07.md)

이 파일과 sitemap.html은 `python3 scripts/draw-screens.py`가 sitemap.yaml에서 그려요(그린 시각 %s). 손으로 고치지 않아요.

## 보드

```mermaid
%s
```

그림 설명: SCR-001(진입 확인)이 뿌리이고, 초대 링크 없이 열면 홈(SCR-002) 가지로, 초대 링크나 내 방 목록에서 방을 고르면 방 소개(SCR-005) 가지로 가요. 방 가지의 다섯 화면은 SCR-005가 방 상태를 보고 골라 보내요.

## 목록

| SCR | 화면 | 경로 | 누가 | 흐름 |
| --- | --- | --- | --- | --- |
%s

## 화면이 없는 것

- 토스가 그리는 화면: 공유 시트(FL-007), 알림 동의문(FL-010), 내비게이션 바(뒤로가기·닫기). 흐름 단계 표의 SCR 칸에 "토스(…)"로 적었어요.
- 서버·운영 흐름: FL-005(카드 갱신), FL-013(방 만료), FL-014(문항 세트 배포, 저장소 스크립트). SCR 칸에 "서버"·"운영(저장소)"으로 적었어요.
- 화면이 없는 용어: TERM-008 문항 세트, TERM-040 점검 목록(운영자만 다룸).
""" % (NOW, "\n".join(mer), lst)
(ROOT / "docs/07-sitemap/README.md").write_text(readme7)

# ---------- 08 와이어프레임 ----------
# 블록: ("h", 글), ("p", 글), ("m", 흐린 글), ("b", 주 버튼), ("b2", 보조 버튼), ("off", 꺼진 버튼), ("a", 글자 링크),
#       ("in", 이름, 값, 안내), ("row", 큰 글, 작은 글), ("sk", 줄 수), ("note", 안내 상자), ("top", 맨 위에 붙은 줄),
#       ("bottom", 맨 아래 붙은 버튼), ("q", 번호, 질문, 고른 칸 0~3), ("item", 질문, 수, 문구), ("grp", 분류 그룹 이름),
#       ("center", 글), ("dlg", 제목, 본문, [버튼들]), ("axis", 이름, 칸 0~2)
NAV = ("nav",)
CARD = [("grp", "조율해요 2"), ("item", "숙소는 어디로 할까요?", "바다 앞 2 · 시내 1 · 상관없어요 0", "두 곳 가격을 같이 비교해 봐요"),
        ("item", "첫날 저녁은?", "횟집 1 · 흑돼지 2 · 상관없어요 0", "첫날과 둘째 날을 나눠 봐요"),
        ("grp", "모두 좋아요 4"), ("item", "이동은 어떻게 할까요?", "렌터카 2 · 버스 0 · 상관없어요 1", "렌터카로 정해요"),
        ("m", "… 문항 3개 더"), ("grp", "누구나 괜찮아요 2"), ("m", "문항 2개")]
FRAMES = {
    "SCR-001#loading": [("center", "모임 합의 카드(가칭)"), ("m", "확인하고 있어요")],
    "SCR-001#update-required": [("center", "토스 앱을 업데이트하면 쓸 수 있어요"), ("m", "앱스토어나 플레이스토어에서 토스를 업데이트해 주세요"), ("bottom", "닫기")],
    "SCR-001#error": [("center", "확인하지 못했어요"), ("m", "오류 번호 7f3a…"), ("b", "다시 시도"), ("b2", "닫기")],
    "SCR-001#permission": [("center", "지금은 쓸 수 없어요")],
    "SCR-002#normal": [("b", "방 만들기"), ("h", "참여 중인 방"), ("row", "제주 3박", "여행 · 4명 중 3명 답했어요 · 방장"), ("row", "금요일 팀 회식 장소 정하기", "회식·저녁 · 6명 중 1명 답했어요 · 답하기 전"), ("m", "오후 3시 5분 기준"), ("a", "새로고침"), ("row", "지난 카드", ""), ("row", "내 데이터 지우기", ""), ("row", "이용약관", ""), ("row", "개인정보처리방침", "")],
    "SCR-002#loading": [("b", "방 만들기"), ("h", "참여 중인 방"), ("sk", 2), ("row", "지난 카드", ""), ("row", "내 데이터 지우기", ""), ("row", "이용약관", ""), ("row", "개인정보처리방침", "")],
    "SCR-002#empty": [("b", "방 만들기"), ("h", "참여 중인 방"), ("note", "참여 중인 방이 없어요. 방을 만들고 친구를 불러 보세요"), ("row", "지난 카드", ""), ("row", "내 데이터 지우기", ""), ("row", "이용약관", ""), ("row", "개인정보처리방침", "")],
    "SCR-002#error": [("b", "방 만들기"), ("h", "참여 중인 방"), ("note", "잠시 뒤 다시 해 주세요"), ("b2", "다시 시도"), ("row", "지난 카드", ""), ("row", "내 데이터 지우기", ""), ("row", "이용약관", ""), ("row", "개인정보처리방침", "")],
    "SCR-002#permission": [("center", "지금은 쓸 수 없어요"), ("m", "401이면 이 화면 대신 화면 뒤에서 다시 확인해요(G-1)")],
    "SCR-002#stale": [("b", "방 만들기"), ("h", "참여 중인 방"), ("row", "제주 3박", "여행 · 4명 중 3명 답했어요 · 방장"), ("m", "오후 3시 5분 기준 · 다시 불러오는 중"), ("row", "지난 카드", ""), ("row", "내 데이터 지우기", "")],
    "SCR-003#normal": [("h", "어떤 모임인가요?"), ("row", "여행", ""), ("row", "회식·저녁", ""), ("row", "주말 나들이", "")],
    "SCR-003#loading": [("h", "어떤 모임인가요?"), ("sk", 3)],
    "SCR-003#empty": [("h", "어떤 모임인가요?"), ("note", "지금은 만들 수 있는 테마가 없어요")],
    "SCR-003#error": [("h", "어떤 모임인가요?"), ("note", "잠시 뒤 다시 해 주세요"), ("b2", "다시 시도")],
    "SCR-003#permission": [("center", "지금은 쓸 수 없어요")],
    "SCR-004#normal": [("m", "여행"), ("in", "모임 이름", "제주 3박", "3/20"), ("in", "인원", "4명", "2~8명"), ("in", "내 닉네임", "바다", "2/10 · 닉네임은 이 방에서 나만 봐요"), ("bottom", "방 만들기")],
    "SCR-004#loading": [("m", "여행"), ("in", "모임 이름", "제주 3박", ""), ("in", "인원", "4명", ""), ("in", "내 닉네임", "바다", ""), ("bottom", "만드는 중…")],
    "SCR-004#error": [("m", "여행"), ("in", "모임 이름", "", "모임 이름은 1~20자로 적어 주세요"), ("in", "인원", "4명", ""), ("in", "내 닉네임", "바다", ""), ("note", "409면: 이 테마는 지금 쓸 수 없어요 [테마 다시 고르기]"), ("bottom", "방 만들기")],
    "SCR-004#permission": [("center", "지금은 쓸 수 없어요"), ("m", "401이면 적은 값을 두고 화면 뒤에서 다시 확인해요(G-1)")],
    "SCR-005#normal": [("h", "제주 3박"), ("m", "여행"), ("p", "인원 4명 · 3명 답했어요"), ("p", "응답 받는 중"), ("note", "인원이 다 답하면 마감돼요"), ("m", "오후 3시 5분 기준"), ("bottom", "참여하기")],
    "SCR-005#loading": [("sk", 1), ("sk", 3), ("bottom", " ")],
    "SCR-005#full": [("h", "제주 3박"), ("note", "이 방은 8명이 다 찼어요"), ("bottom", "방 만들기")],
    "SCR-005#error": [("center", "이 방은 없거나 보관 기간이 지났어요"), ("b", "방 만들기")],
    "SCR-005#permission": [("center", "지금은 쓸 수 없어요")],
    "SCR-005#stale": [("h", "제주 3박"), ("p", "인원 4명 · 3명 답했어요"), ("m", "오후 3시 5분 기준 · 다시 불러오는 중"), ("bottom", "참여하기")],
    "SCR-006#normal": [("h", "제주 3박에서 쓸 닉네임을 적어 주세요"), ("in", "닉네임", "산", "1/10 · 닉네임은 이 방에서 나만 봐요"), ("bottom", "들어가기")],
    "SCR-006#loading": [("h", "제주 3박에서 쓸 닉네임을 적어 주세요"), ("in", "닉네임", "산", ""), ("bottom", "들어가는 중…")],
    "SCR-006#error": [("h", "제주 3박에서 쓸 닉네임을 적어 주세요"), ("in", "닉네임", "가나다라마바사아자차카", "닉네임은 1~10자로, 쓸 수 없는 말이 있어요"), ("note", "409 8명이면: 이 방은 8명이 다 찼어요 [방 만들기]"), ("off", "들어가기")],
    "SCR-006#permission": [("center", "지금은 쓸 수 없어요")],
    "SCR-006#stale": [("top", "방이 그사이 마감됐어요"), ("m", "→ SCR-010 최종 카드로 가요")],
    "SCR-007#normal": [("top", "8개 중 2개 골랐어요 · 산 님으로 참여 중"), ("q", 1, "숙소는 어디로 할까요?", 1), ("q", 2, "첫날 저녁은?", 3), ("q", 3, "이동은 어떻게 할까요?", 0), ("m", "… 문항 5개 더"), ("b2", "친구 부르기"), ("bottom", "제출하기(꺼짐)")],
    "SCR-007#loading": [("top", "8개 중 0개 골랐어요"), ("sk", 3), ("sk", 3), ("bottom", "제출하기(꺼짐)")],
    "SCR-007#error": [("top", "8개 중 8개 골랐어요"), ("q", 8, "돌아오는 날 일정은?", 2), ("note", "제출하지 못했어요. 고른 답은 그대로예요"), ("b2", "다시 시도"), ("bottom", "제출하기")],
    "SCR-007#permission": [("center", "지금은 쓸 수 없어요"), ("m", "참여자가 아니면 SCR-005로 가요")],
    "SCR-007#stale": [("top", "방이 그사이 마감됐어요"), ("m", "→ SCR-010 최종 카드로 가요(이미 답했으면 SCR-008)")],
    "SCR-008#normal": [("h", "산 님의 모임 성향"), ("p", "큰 틀만 정하고 가는 편이에요"), ("axis", "계획 속도", 0), ("axis", "지출 우선순위", 1), ("axis", "일정 변경 반응", 2), ("m", "4명 중 2명 답했어요 · 오후 3시 5분 기준"), ("b", "카드 보기"), ("b2", "친구 부르기"), ("b2", "알림 받기")],
    "SCR-008#loading": [("sk", 1), ("sk", 3), ("b", "카드 보기"), ("b2", "친구 부르기")],
    "SCR-008#error": [("h", "산 님의 모임 성향"), ("note", "잠시 뒤 다시 해 주세요"), ("b2", "다시 시도"), ("b", "카드 보기")],
    "SCR-008#permission": [("center", "지금은 쓸 수 없어요"), ("m", "응답 전이면 SCR-007, 참여자가 아니면 SCR-005로 가요")],
    "SCR-008#stale": [("top", "모두 답해서 카드가 완성됐어요"), ("h", "산 님의 모임 성향"), ("p", "큰 틀만 정하고 가는 편이에요"), ("axis", "계획 속도", 0), ("b", "카드 보기"), ("b2", "친구 부르기")],
    "SCR-008#notify-update": [("h", "산 님의 모임 성향"), ("p", "큰 틀만 정하고 가는 편이에요"), ("b", "카드 보기"), ("b2", "알림 받기"), ("note", "토스 앱을 업데이트하면 알림을 받을 수 있어요")],
    "SCR-008#notify-done": [("h", "산 님의 모임 성향"), ("p", "큰 틀만 정하고 가는 편이에요"), ("b", "카드 보기"), ("b2", "친구 부르기"), ("note", "알림을 신청했어요. 친구가 답을 마치면 알려 드려요")],
    "SCR-009#normal": [("top", "인원 4명 중 3명 답했어요 · 오후 3시 5분 기준 · 새로고침"), ("m", "3명 기준 중간 카드"), ("note", "다음 행동: 숙소 두 곳 가격을 같이 비교해 봐요")] + CARD + [("b", "카드 저장"), ("b2", "단톡방에 보내기"), ("b2", "지금 마감하기(방장)"), ("a", "내 모임 성향 다시 보기")],
    "SCR-009#loading": [("top", "인원 · 응답 수 불러오는 중"), ("sk", 1), ("sk", 4), ("sk", 3)],
    "SCR-009#empty": [("top", "인원 4명 중 1명 답했어요 · 오후 3시 5분 기준"), ("note", "친구를 부르면 카드가 생겨요. 2명 이상 답하면 카드가 만들어져요"), ("b", "친구 부르기"), ("off", "지금 마감하기(방장)"), ("m", "2명 이상이 답하면 마감할 수 있어요")],
    "SCR-009#error": [("top", "인원 4명 중 3명 답했어요"), ("note", "잠시 뒤 다시 해 주세요"), ("b2", "다시 시도"), ("m", "저장·링크 실패는 그 버튼 아래에: 저장하지 못했어요 [다시 시도]")],
    "SCR-009#permission": [("center", "답하면 볼 수 있어요"), ("m", "→ SCR-007로 가요. 마감 403이면 버튼을 감춰요")],
    "SCR-009#stale": [("top", "인원 4명 중 3명 답했어요 · 다시 불러오는 중"), ("note", "2명 이상이 답해야 마감할 수 있어요"), ("m", "그사이 마감됐으면 SCR-010으로(방이 마감됐어요)")] + CARD[:3],
    "SCR-009#confirm-close": [("top", "인원 4명 중 3명 답했어요")] + CARD[:2] + [("dlg", "지금 마감할까요?", "마감하면 더 답할 수 없어요. 지금 3명의 답으로 최종 카드가 만들어져요", ["취소", "마감하기"])],
    "SCR-010#normal": [("h", "제주 3박"), ("m", "여행 · 마감됐어요 · 3명 기준 · 11월 28일 확정"), ("note", "다음 행동: 숙소 두 곳 가격을 같이 비교해 봐요")] + CARD + [("b2", "카드 저장(응답한 참여자)"), ("b2", "단톡방에 보내기(응답한 참여자)"), ("a", "내 모임 성향 다시 보기(응답한 참여자)"), ("bottom", "우리도 해 보기")],
    "SCR-010#loading": [("sk", 1), ("sk", 4), ("sk", 3), ("bottom", "우리도 해 보기")],
    "SCR-010#empty": [("h", "제주 3박"), ("note", "답한 사람이 적어 카드 없이 마감됐어요"), ("bottom", "우리도 해 보기")],
    "SCR-010#error": [("center", "이 방은 없거나 보관 기간이 지났어요"), ("b", "방 만들기")],
    "SCR-010#permission": [("center", "지금은 쓸 수 없어요")],
    "SCR-011#normal": [("h", "지난 카드"), ("row", "제주 3박", "여행 · 11월 28일 · 3명 기준"), ("m", "숙소 두 곳 가격을 같이 비교해 봐요"), ("row", "금요일 팀 회식 장소 정하기", "회식·저녁 · 11월 20일 · 5명 기준"), ("m", "8시 전에 끝나는 곳으로 정해요"), ("b2", "더 보기")],
    "SCR-011#loading": [("h", "지난 카드"), ("sk", 3)],
    "SCR-011#empty": [("h", "지난 카드"), ("note", "아직 지난 카드가 없어요. 방이 마감되면 여기에 남아요"), ("b", "방 만들기")],
    "SCR-011#error": [("h", "지난 카드"), ("note", "잠시 뒤 다시 해 주세요"), ("b2", "다시 시도")],
    "SCR-011#permission": [("center", "지금은 쓸 수 없어요")],
    "SCR-012#normal": [("h", "제주 3박"), ("m", "여행 · 11월 28일 · 3명 기준"), ("note", "다음 행동: 숙소 두 곳 가격을 같이 비교해 봐요")] + CARD,
    "SCR-012#error": [("center", "지난 카드를 다시 불러와 주세요"), ("b", "지난 카드 목록으로")],
    "SCR-013#normal": [("h", "지우면 이것들이 사라져요"), ("row", "응답 3개 · 닉네임 3개", ""), ("row", "알림 신청 1개 · 지난 카드 2개", ""), ("row", "사용자 ID", ""), ("h", "남는 것"), ("p", "확정된 최종 카드 2개의 이름 없는 수"), ("note", "내가 만든 열린 방 1개는 바로 마감돼요"), ("bottom", "지우기")],
    "SCR-013#loading": [("h", "지우면 이것들이 사라져요"), ("sk", 3), ("h", "남는 것"), ("sk", 1), ("bottom", "지우기(꺼짐)")],
    "SCR-013#empty": [("h", "지우면 이것들이 사라져요"), ("note", "지울 응답과 알림 신청이 없어요. 사용자 ID는 지워요"), ("bottom", "지우기")],
    "SCR-013#error": [("h", "지우면 이것들이 사라져요"), ("note", "지우지 못했어요. 아무것도 지우지 않았어요"), ("b2", "다시 시도")],
    "SCR-013#permission": [("center", "지금은 쓸 수 없어요")],
    "SCR-013#confirm": [("h", "지우면 이것들이 사라져요"), ("row", "응답 3개 · 닉네임 3개", ""), ("dlg", "내 데이터를 지울까요?", "지운 것은 되돌릴 수 없어요", ["취소", "지우기"])],
    "SCR-013#done": [("center", "지웠어요"), ("m", "다시 쓰면 새 사용자로 시작해요"), ("b", "미니앱 닫기"), ("b2", "처음 화면으로")],
    "SCR-014#normal": [("h", "이용약관"), ("m", "변경일 2026년 ○월 ○일"), ("p", "제1조 목적"), ("sk", 3), ("p", "제2조 …"), ("sk", 2)],
    "SCR-015#normal": [("h", "개인정보처리방침"), ("m", "변경일 2026년 ○월 ○일"), ("p", "저장하는 것: 사용자 ID, 닉네임, 응답, 알림 신청과 그동안 암호화해 둔 식별키, 지난 카드"), ("p", "저장 위치: Cloudflare(해외 리전)"), ("p", "보관 기간: 방은 30일, 지난 카드는 지울 때까지"), ("p", "지우는 방법"), ("b2", "내 데이터 지우기로 가기")],
}


def block(b):
    k = b[0]
    if k == "h":
        return "<div class='h'>%s</div>" % e(b[1])
    if k == "p":
        return "<div class='p'>%s</div>" % e(b[1])
    if k == "m":
        return "<div class='m'>%s</div>" % e(b[1])
    if k in ("b", "b2", "off"):
        return "<div class='btn %s'>%s</div>" % (k, e(b[1]))
    if k == "a":
        return "<div class='a'>%s</div>" % e(b[1])
    if k == "in":
        return "<div class='in'><div class='m'>%s</div><div class='field'>%s</div><div class='m'>%s</div></div>" % (e(b[1]), e(b[2]) or "&nbsp;", e(b[3]))
    if k == "row":
        return "<div class='row'><div>%s</div><div class='m'>%s</div></div>" % (e(b[1]), e(b[2]))
    if k == "sk":
        return "".join("<div class='sk'></div>" for _ in range(b[1]))
    if k == "note":
        return "<div class='note'>%s</div>" % e(b[1])
    if k == "top":
        return "<div class='top'>%s</div>" % e(b[1])
    if k == "bottom":
        return "<div class='bottom'><div class='btn %s'>%s</div></div>" % ("off" if "(꺼짐)" in b[1] else "b", e(b[1]))
    if k == "q":
        opts = ["선택지 A", "선택지 B", "상관없어요"]
        return "<div class='q'><div class='m'>%d / 8</div><div class='p'>%s</div>%s</div>" % (b[1], e(b[2]), "".join(
            "<div class='opt%s'>%s</div>" % (" on" if b[3] == i + 1 else "", o) for i, o in enumerate(opts)))
    if k == "item":
        return "<div class='item'><div class='p'>%s</div><div class='m'>%s</div><div>%s</div></div>" % (e(b[1]), e(b[2]), e(b[3]))
    if k == "grp":
        return "<div class='grp'>%s</div>" % e(b[1])
    if k == "center":
        return "<div class='center'>%s</div>" % e(b[1])
    if k == "axis":
        return "<div class='axis'><div class='m'>%s</div><div class='bands'>%s</div></div>" % (e(b[1]), "".join(
            "<span%s>%s</span>" % (" class='on'" if b[2] == i else "", t) for i, t in enumerate(["낮음", "균형", "높음"])))
    if k == "dlg":
        return "<div class='dim'><div class='dlg'><div class='h'>%s</div><div class='p'>%s</div><div class='dbtn'>%s</div></div></div>" % (
            e(b[1]), e(b[2]), "".join("<div class='btn b2'>%s</div>" % e(x) for x in b[3]))
    raise ValueError(k)


states = []
for f in sorted((ROOT / "docs/08-screens").glob("SCR-*.md")):
    t = f.read_text()
    title = t.splitlines()[0][2:]
    for sid in re.findall(r"^\| (SCR-\d{3}#[a-z-]+) \|", t, re.M):
        states.append((title, sid))
missing = [s for _, s in states if s not in FRAMES]
extra = sorted(set(FRAMES) - {s for _, s in states})
if missing or extra:
    raise SystemExit("와이어프레임과 상태가 달라요: 빠짐 %s, 남음 %s" % (missing, extra))

out, last = [], None
for title, sid in states:
    if title != last:
        if last:
            out.append("</div>")
        out.append("<h2 id='%s'>%s</h2><div class='frames'>" % (sid.split("#")[0], e(title)))
        last = title
    body = "".join(block(b) for b in FRAMES[sid])
    out.append("<figure data-state='%s'><figcaption>%s</figcaption><div class='pair'>%s</div></figure>" % (
        sid, sid, "".join("<div class='phone' style='width:%dpx'><div class='nav'>토스 내비게이션 바 · %dpx</div><div class='body'>%s</div></div>" % (w, w, body) for w in (360, 430))))
out.append("</div>")
page8 = """<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>화면 와이어프레임</title><style>
:root{--bg:#fff;--fg:#222;--muted:#666;--line:#bdbdbd;--fill:#eee;--fill2:#d6d6d6;--dark:#555}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;word-break:keep-all;overflow-wrap:anywhere}
h1{font-size:20px}h2{font-size:17px;margin:32px 0 8px}
.frames{display:flex;flex-direction:column;gap:20px}figure{margin:0}figcaption{font:600 13px ui-monospace,monospace;margin-bottom:6px}
.pair{display:flex;gap:16px;overflow-x:auto;align-items:flex-start;padding-bottom:4px}
.phone{flex:none;min-height:560px;border:1px solid var(--line);border-radius:16px;overflow:hidden;position:relative;display:flex;flex-direction:column;background:#fff}
.nav{height:44px;line-height:44px;background:var(--fill);color:var(--muted);font-size:12px;padding:0 12px;border-bottom:1px solid var(--line)}
.body{padding:16px;display:flex;flex-direction:column;gap:10px;flex:1;position:relative;padding-bottom:84px}
.h{font-weight:700;font-size:18px}.p{font-size:15px}.m{color:var(--muted);font-size:13px}.a{text-decoration:underline;font-size:14px;min-height:44px;line-height:44px}
.btn{min-height:48px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:600;text-align:center;padding:0 12px}
.btn.b{background:var(--dark);color:#fff}.btn.b2{border:1px solid var(--dark);color:var(--fg)}.btn.off{background:var(--fill);color:#444;border:1px dashed var(--line)}
.field{border:1px solid var(--line);border-radius:8px;min-height:44px;padding:10px 12px;box-sizing:border-box}
.row{border-bottom:1px solid var(--fill2);min-height:44px;padding:8px 0;display:flex;flex-direction:column;justify-content:center}
.sk{height:44px;border-radius:8px;background:var(--fill)}
.note{background:var(--fill);border-radius:8px;padding:12px}
.top{position:sticky;top:0;background:var(--fill2);margin:-16px -16px 0;padding:10px 16px;font-size:13px}
.bottom{position:absolute;left:16px;right:16px;bottom:16px}
.q{border:1px solid var(--line);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px}
.opt{border:1px solid var(--line);border-radius:8px;min-height:44px;display:flex;align-items:center;padding:0 12px}.opt.on{border:2px solid var(--dark);font-weight:700}
.grp{font-weight:700;margin-top:6px}.item{border-left:3px solid var(--fill2);padding:4px 0 4px 10px}
.center{margin-top:120px;text-align:center;font-weight:700;font-size:17px}
.axis .bands{display:flex;gap:4px}.axis span{flex:1;text-align:center;border:1px solid var(--line);border-radius:6px;padding:6px 0;font-size:13px}.axis span.on{background:var(--dark);color:#fff}
.dim{position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:16px}
.dlg{background:#fff;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px;width:100%%}.dbtn{display:flex;gap:8px}.dbtn .btn{flex:1}
</style></head><body><h1>모임 합의 카드(가칭) 화면 와이어프레임</h1>
<p>그린 시각: %s · 상태 %d개, 상태마다 360px와 430px 한 장씩. 원본은 <code>docs/08-screens/SCR-*.md</code>이고 <code>python3 scripts/draw-screens.py</code>로 다시 그려요. 회색·시스템 글꼴만 써요. 색·글꼴·모양은 09 목업에서 정해요. 위 회색 띠는 토스가 그리는 내비게이션 바(뒤로가기·닫기)예요.</p>
%s</body></html>
""" % (NOW, len(states), "".join(out))
(ROOT / "docs/08-screens/wireframes.html").write_text(page8)
print("sitemap screens %d, wireframe states %d" % (len(flat), len(states)))
