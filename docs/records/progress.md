# 진행 기록

### 2026-11-28 · 변경 절차: SPEC-012 성향 계산 규칙과 SPEC-031 성향 문구(DEC-039)

- Done: 오랑이 결정(토링이 전달, Orca 작업 task_69da40c97347)을 변경 절차로 01부터 단계마다 봤어요. 01 변경 없음(TERM-024 성향 축·TERM-041 축 매핑의 뜻은 그대로, 방향은 이미 TBL-005 `axis_pole_a`에 있음). 02 변경 없음(REQ-026~029는 "한 줄 설명과 3개 축의 낮음·균형·높음"까지만 말하고 계산 규칙을 정하지 않음). 03 변경 없음(FL-004 "내 모임 성향 보기" 단계 그대로). 04 SPEC-012 주 동작·인수 조건, SPEC-031 주 동작·예외·인수 조건을 고침. 05 TBL-016 `profile_phrases`를 새 마이그레이션 `0002_profile_phrases.sql`로 더하고 TBL-005 주석에 높은 쪽 선택지를 적음(E-10). 06 API-007·API-008의 `x-corthex.tables`에 TBL-016을 더하고 설명만 고침(응답 모양 그대로). 07 변경 없음(화면·경로 그대로). 08 변경 없음(SCR-008이 한 줄 설명과 축 구간을 보여 주는 상태 7개 그대로). 09 변경 없음(모양 그대로). 10 TASK-003·009·012·014·015·021·023의 건드리는 것·완료 조건을 고침(의존·크기 그대로). 11은 열린 PR 3개에 영향(아래). 12·13은 시작 전이에요.
- Why: TASK-009(PR #19)가 SPEC-012에 축 구간 경계와 한 줄 설명 규칙이 없어 멈춤. 오랑이가 사용자님 주말 위임으로 정함.
- Result: SPEC 39행 그대로(바뀐 행 2개), TBL 15 → 16개, API operation·응답 모양 변화 없음, TASK 54개 그대로(바뀐 행 7개). 열린 PR 영향: #14(TASK-003) 테스트가 테이블 15개를 기대해 0002 병합 뒤 16개로 고쳐야 함. #18(TASK-012) 검사에 성향 문구 7개 검사를 더해야 함(높은 쪽 선택지는 이미 `axis_pole_a`로 검사). #19(TASK-009) 이 규칙으로 SPEC-012 부분을 구현.
- Checked: `python3 scripts/check-contract.py`, `python3 scripts/check-wbs.py`, `python3 scripts/check-screens.py`, term-check 결과는 PR 본문과 보고에 적어요.
- Next: 토링이가 PR 병합 → `push moim-card`(NEXUS 05 ERD 그림에 TBL-016이 새로 그려짐) → #14·#18·#19 작업자에게 영향 전달. 월요일(2026-11-30) 이후 사용자님 화면 확인 때 성향 문구 21개를 한 번에 보여 드림.

### 2026-11-28 · 10 WBS 체크포인트 통과

- Done: 토링이가 전한 오랑이 답을 DEC-037(질문 1 추천안 승인: TASK-001~054 그대로, 페이즈 0부터 Codex 작업자 gpt-6.1-terra xhigh)과 DEC-038(질문 2: 제품명·콘솔 앱 등록은 월요일 2026-11-30 이후 페이즈 0 진행과 함께 사용자님께, 본인인증 단계만 사용자님, 제품명은 후보 2~3개+추천 하나)로 기록했어요. DEC-036을 in force로 바꾸고, wbs.md 상태 줄·U-1·U-2의 "언제"·5절 문장, checkpoint-10.md 상태와 답, `.corthex/stages.json` 10-wbs `done`과 체크포인트를 고쳤어요.
- Why: 토링이 작업 지시(2026-11-28, Orca 작업 task_402f3ad9d599). 위임 근거는 사용자님 주말 위임 "너가 다른애들 승인을 하던 말던 해라"예요.
- Result: 10 통과. TASK와 의존·크기·완료 조건은 바뀌지 않았어요(결정된 문장만 반영).
- Checked: check-wbs, check-contract, check-screens, term-check 결과는 PR #11과 보고에 적어요.
- Next: 토링이가 PR #11 병합 → `push moim-card` → 11 개발 TASK-001. 월요일 이후 사용자님께 U-1(제품명 후보 2~3개+추천 하나)·U-2를 여쭘.

### 2026-11-28 · 10 WBS 초안(TASK-001~054)

- Done: `corthex-build` 10 WBS로 [wbs.md](../10-wbs/wbs.md)를 썼어요: TASK 54개(SPEC·REQ·API·TBL·SCR 연결, 의존, 담당, 크기, 완료 조건), 페이즈 0~3, 사용자님 일 U-1~U-10(언제 필요한지), 개발 단계 확인 항목 3개와 미확인 F-1·F-3의 TASK 위치, AI가 정한 B-1~B-10(DEC-036, proposed). 체크포인트 질문 2개는 [checkpoint-10.md](../10-wbs/checkpoint-10.md)예요. 검사 스크립트 `scripts/check-wbs.py`를 더하고, `.corthex/project.json`에 10-wbs(human NEXUS, truth source), `.corthex/stages.json`에 10-wbs `in_progress`를 넣었어요.
- Why: 토링이 작업 지시(2026-11-28, Orca 작업 task_6d1bf6a87904). 09 통과(DEC-035) 뒤 다음 단계예요.
- Result: 첫 개발 페이즈는 페이즈 0(TASK-001~012)이고 외부 계정·콘솔·사용자님 일이 없어요. 가장 긴 의존 사슬은 TASK 12개(약 13.5작업일)이고 TASK-050에서 U-1·U-2를 기다려요. 사업자등록(U-4)은 첫 버전에 필요 없어요.
- Checked: `python3 scripts/check-wbs.py` 통과 400·실패 0(SPEC 39/39, REQ 84/84, API 16/16, SCR 15/15, 순환 없음). `scripts/check-contract.py` 통과 1096·실패 0, `scripts/check-screens.py` 통과 1490·실패 0. term-check 0건. `hub.py snapshot --path .`(임시 home)에서 TASK 54개, 오류 0·경고 0. 화면·코드는 만들지 않아 실행 확인은 없어요. NEXUS는 병합·push 전이라 이 초안을 보여 주지 않아요.
- Next: 토링이가 PR을 병합하고 `push moim-card` → NEXUS 10 단계에 체크포인트 요청(checkpoint-10.md 3절 문안) → 질문 1·2 답 → 통과하면 11 개발 TASK-001부터.

### 2026-11-28 · 09 목업 확정과 토큰 고정

- Done: 토링이가 전한 오랑이 답(사용자님 주말 위임 "너가 다른애들 승인을 하던 말던 해라" 근거)을 DEC-035로 기록했어요: 09 목업 확정(A 바탕 + 합의 카드만 B 모양, PR #10 커밋 `e03ce6f`), 토큰 고정, PR #10 병합 승인(병합은 토링이). DEC-032를 in force로 바꾸고, `design/base.tokens.json` 설명에 고정 표시를 넣었어요. `.corthex/stages.json`의 09를 `done`으로 바꾸고 체크포인트를 적었어요. [09-mockup/README.md](../09-mockup/README.md)의 상태 줄과 질문 답을 고쳤어요.
- Why: 토링이 작업 지시(2026-11-28, Orca 작업 task_3aeb4fbf9b22). 09는 원래 사용자님이 직접 보는 단계였고, 이번 통과는 주말 위임에 따른 오랑이 답이에요.
- Result: 09 통과, 토큰 고정. 바꾸려면 새 결정이 필요해요.
- 개발 단계 확인 항목(목업에서 재지 않음, 11 개발·12 QA에서 확인):
  1. 실제 토스 앱 WebView에서 TDS 컴포넌트로 그렸을 때의 모습(버튼 모양, Toss Product Sans 글꼴, 합의 카드 색이 카드 안에만 있는지, 360·430px)
  2. 스크린 리더(iOS VoiceOver, Android TalkBack)가 읽는 순서와 이름(선택지, 진행 막대, 확인 창, 합의 카드의 분류와 수)
  3. 키보드 Tab 순서와 포커스 표시(확인 창 안에 포커스가 머무는지, 포커스가 붙은 아래 버튼에 가려지지 않는지)
- Checked: term-check, `scripts/check-screens.py`, `tokens.py check`, hub snapshot과 `push --dry-run` 결과는 PR #10과 보고에 적어요.
- Next: PR #10 병합(토링이) → `push moim-card` → 10 WBS.

### 2026-11-28 · 09 목업: A 바탕 + 카드만 B로 화면 15개

- Done: 사용자님 답(Orca 항목 256, e4535) "A 바탕 + 카드만 B(추천)"을 DEC-033으로, "방장 화면 버튼 3개 이대로"를 DEC-034로 기록했어요. 토큰을 `design/base.tokens.json` 한 벌로 합치고 합의 카드 색을 `color.card` 그룹에 뒀어요(시안별 토큰 파일과 시안 페이지는 지우고 캡처는 captures/candidates/에 남김). [scripts/draw-mockups.py](../../scripts/draw-mockups.py)를 다시 써서 08 상태 표에서 상태 목록을 읽어 화면 15개·상태 70개를 [design/mockups/mockup.html](../../design/mockups/mockup.html)에 그렸어요. 08 화면 정의 15개에 "목업" 절(목업 링크, 정한 배치와 문구)을 더했어요. 캡처 세 장을 [design/mockups/captures/](../../design/mockups/captures/)에 뒀어요. 사용자님 최종 확인 질문은 [09-mockup/README.md](../09-mockup/README.md) 3절이에요.
- Why: 사용자님 답. 토링이 작업 지시(2026-11-28, Orca 작업 task_893835285720).
- Result: 홈·문항은 시안 A 그대로, 합의 카드·최종 카드·지난 카드 자세히는 카드 한 장 모양이에요. DEC-032(AI 제안)를 08과 목업에 반영했고, 확정은 최종 확인 답을 기다려요.
- Checked: `tokens.py check` 색 29개·토큰 밖 0. page-check.js 292번(상태 70 × 360·430px × 보통·가장 긴 글자, 그리고 참여자·처음 온 사람 보기 12번) 오류 0·경고 0·참고 0. 대비는 손으로 계산해 모두 기준 이상. 스크립트로 누르기 23개 통과, 카드 색이 카드 밖에 쓰인 요소 0개. `scripts/check-screens.py` 통과 1490·실패 0. 눈으로 본 것은 캡처 세 장(정상 상태 15개 화면, 360px)이고 나머지 상태와 430px은 숫자로만 쟀어요. 키보드 순서·스크린 리더·실제 토스 WebView는 재지 않았어요.
- Next: 사용자님 최종 확인 → 통과 기록(토큰 고정) → 10 WBS.

### 2026-11-28 · 09 목업 시안 A·B (세 화면)

- Done: 사용자님 답 "A·B 두 시안, 세 화면만(추천)"(Orca 항목 256, e4475)을 DEC-031로 기록하고, `corthex-screen`·`corthex-uxui`로 시안 A(토스처럼 깔끔하게)와 B(모임 카드처럼 따뜻하게)를 SCR-002 홈, SCR-007 문항, SCR-009 합의 카드에 상태 18개씩, 360·430px로 누를 수 있는 HTML로 만들었어요([design/mockups/](../../design/mockups/), 그리기 [scripts/draw-mockups.py](../../scripts/draw-mockups.py)). 토큰은 [design/](../../design/)의 base·candidate-a·candidate-b·resolver예요(DEC-030). 캡처 두 장을 [design/mockups/captures/](../../design/mockups/captures/)에 뒀어요. 방장 화면의 버튼 수·문구 길이를 화면마다 아래에 보이게 했어요(DEC-028 요청). AI가 정한 것은 DEC-032(proposed).
- Why: 07·08 통과(DEC-027~029) 뒤 09 시작. 토링이 작업 지시(2026-11-28, Orca 작업 task_2e83e49bf143).
- Result: 사용자님께 질문 두 개(어느 시안으로 갈지, 방장 화면 버튼 수)를 [09-mockup/README.md](../09-mockup/README.md) 5절에 뒀어요. 추천은 시안 A, 버튼 수는 이대로예요.
- Checked: `tokens.py check` 색 54개·토큰 밖 0. page-check.js 144번(시안 2 × 폭 2 × 글자 2 × 상태 18) 오류 0·경고 0(처음 고아 단어 경고 20개를 고침). 컨트롤 테두리·상태 표시 3:1은 손으로 계산(B 바탕에서 2.89라 토큰을 #808A96으로 바꿈). 스크립트로 누르기 28개 통과. Orca 내장 브라우저를 이 호스트에서 쓸 수 없어, Playwright의 Chromium headless에 빠진 시스템 라이브러리를 스크래치 폴더에 풀어 렌더했어요(시스템 설치 없음). 눈으로 본 것은 세 화면 정상 상태 360px과 B 가장 긴 글자 위쪽이고, 나머지는 숫자로만 쟀어요. 키보드 순서·스크린 리더·실제 토스 WebView는 재지 않았어요.
- Next: 사용자님 답 → 결정 기록 → 고른 방향으로 나머지 12개 화면과 08 화면 정의 반영 → 토큰 고정 체크포인트.

### 2026-11-28 · 07·08 체크포인트 답 기록과 통과

- Done: 토링이가 전한 오랑이 답(사용자님 위임, 근거 2026-11-23 "추천 모두 승인", 2026-11-27 "DDD랑 목업때만")을 DEC-027(07 질문 1, 화면 15개 구조), DEC-028(08 질문 1, 화면 정의 15개·상태 70개), DEC-029(08 질문 2, 지운 뒤 자동으로 처음 화면에 가지 않음)로 기록하고 DEC-026을 in force로 바꿨어요. 결정된 문장과 상태 칸만 고쳤어요: FL-012 "지워졌어요 안내" 문장과 상태 줄, SCR-013 규칙, 두 체크포인트 파일의 상태 줄과 답, 07·08 README 상태 줄. `.corthex/stages.json`의 07·08을 `done`으로 바꾸고 체크포인트를 적었어요. 오랑이 요청(목업 때 방장 화면 버튼 수와 문구 길이를 사용자님과 같이 봄)을 [09 준비](../09-mockup/prep.md)에 한 줄 더했어요.
- Why: 07·08은 DDD·목업이 아니라 위임 답으로 통과를 기록해요(DEC-014). 토링이 작업 지시(2026-11-28, Orca 작업 task_e0e5326e02a0).
- Result: 07·08 통과. 승인 버전은 PR #9 커밋 `9d1f5c9`와 이 답을 반영한 커밋이에요. DDD(01)는 바꾸지 않았어요.
- Checked: term-check, `scripts/check-screens.py`, `hub push moim-card --dry-run` 결과는 PR #9와 보고에 적어요.
- Next: PR #9 병합(토링이) → `push moim-card` → 09 목업은 사용자님 답(Orca 항목 256)을 기다려요.

### 2026-11-28 · 07 사이트맵과 08 화면 정의 초안, 09 목업 준비

- Done: `corthex-screen`으로 07 사이트맵([sitemap.yaml](../07-sitemap/sitemap.yaml), SCR-001~015)과 08 화면 정의([08-screens](../08-screens/README.md), 화면 15개, 상태 70개, 공통 처리 G-1~G-10)를 썼어요. 03 흐름 16개의 단계 표에 SCR 칸을 더했어요(단계 161개, 뜻 바뀜 없음). 보기와 와이어프레임을 그리는 [scripts/draw-screens.py](../../scripts/draw-screens.py)와 연결 검사 [scripts/check-screens.py](../../scripts/check-screens.py)를 더했어요. 체크포인트 질문은 [checkpoint-07.md](../07-sitemap/checkpoint-07.md)(질문 1개)와 [checkpoint-08.md](../08-screens/checkpoint-08.md)(질문 2개)에, AI가 정한 것은 DEC-026(proposed)에 있어요. 09 목업은 만들지 않고 사용자님 질문 두 개를 [09-mockup/prep.md](../09-mockup/prep.md)에 준비했어요. `.corthex/project.json`에 07·08 단계 설정(human `nexus`, truth `source`)을 더했어요.
- Why: 05·06 통과(DEC-022~025) 뒤 다음 단계예요. 토링이 작업 지시(2026-11-28, Orca 작업 task_d7a9eefc6d8d).
- Result: 08을 쓰다 승인된 흐름 문장 하나를 바꾸자는 제안이 나왔어요: FL-012 "지워졌어요 안내"대로 처음 화면에 자동으로 가면 지운 직후 사용자 ID가 다시 생겨요(08 질문 2). 01 도메인 설계는 바꾸지 않았어요.
- Checked: `python3 scripts/check-screens.py` 통과 1490·실패 0. Orca 내장 브라우저로 sitemap.html(390px, 가로 넘침 없음)과 와이어프레임 4개 상태(SCR-007#normal·#loading, SCR-009#confirm-close, SCR-010#normal)를 360px·430px로 봤어요. 360px에서 한국어 단어 끊김을 찾아 `word-break: keep-all`로 고쳤어요. 나머지 66개 상태는 눈으로 보지 않았어요. 이 기기의 headless Chromium은 시스템 라이브러리가 없어 쓰지 못했어요. term-check와 hub 결과는 PR 본문에 적어요.
- Next: 토링이가 07 질문 1, 08 질문 1·2의 답(오랑이 위임)을 받아 줌 → DEC-027부터 기록하고 통과 → PR 병합(토링이) → `push moim-card` → 사용자님께 09 질문 두 개.

### 2026-11-28 · 05·06 체크포인트 답 기록과 통과

- Done: 토링이가 전한 오랑이 답(사용자님 위임, 근거 2026-11-23 "추천 모두 승인", 2026-11-27 "DDD랑 목업때만")을 DEC-022(05 질문 1, 스키마 고정), DEC-023(06 질문 1, 계약 승인), DEC-024(06 질문 2, 마지막 응답의 알림도 보냄), DEC-025(06 질문 3, 내 방 목록에 방 코드, 조건: 기기 로그에 남기지 않음)로 기록하고 DEC-021을 in force로 바꿨어요. 결정된 문장과 상태 칸만 고쳤어요: SPEC-025(마지막 응답 발송 문장), SPEC-026 [동시성](다른 요청의 발송으로 좁힘), SPEC-039 [노출](화면에 없음, 기기 로그 금지), API-007·API-012 설명의 `Open:`, 체크포인트 두 파일의 상태 줄과 답, erd.md·api.md 상태 줄. `.corthex/stages.json`의 05·06을 `done`으로 바꾸고 체크포인트를 적었어요.
- Why: 05·06은 DDD·목업이 아니라 위임 답으로 통과를 기록해요(DEC-014). 오랑이가 06 질문 3에 함께 든 "마감 뒤 응답한 사람만"은 사용자님 결정 DEC-013(e4225)과 01 변경(e4355)의 "누구나 보기"와 부딪혀 넣지 않았어요(토링이가 오랑이에게 정정).
- Result: 05·06 통과. 승인 버전은 PR #8 커밋 `f1e2c43`과 이 답을 반영한 커밋이에요. DDD(01)는 바꾸지 않았어요.
- Checked: term-check, `scripts/check-contract.py`, `hub push moim-card --dry-run` 결과는 PR #8 본문과 보고에 적어요.
- Next: PR #8 병합(토링이) → `push moim-card` → 07 사이트맵(SCR ID).

### 2026-11-28 · 05 ERD와 06 API 계약 초안, F-1~F-7 확인

- Done: 미확인 사실 F-1~F-7을 토스 공식 개발자센터 페이지 본문(`.md` 주소)으로 확인하고, 다르게 나온 사실에 걸린 04 행(SPEC-002, SPEC-018, SPEC-024, SPEC-025)과 C-5의 셈 오류만 고쳤어요(DEC-020, 근거 DEC-016). `corthex-contract`로 05 ERD([db/schema.sql](../../db/schema.sql), [0001_init.sql](../../db/migrations/0001_init.sql), [erd.md](../05-erd/erd.md), TBL-001~015)와 06 API 계약([api/openapi.yaml](../../api/openapi.yaml), [api.md](../06-api/api.md), API-001~016, 오류 코드 22개)을 썼어요. 검사 스크립트 [scripts/check-contract.py](../../scripts/check-contract.py)를 더했어요. 체크포인트 질문은 [checkpoint-05.md](../05-erd/checkpoint-05.md)(질문 1개)와 [checkpoint-06.md](../06-api/checkpoint-06.md)(질문 3개)에 있어요. `.corthex/project.json`에 05·06 단계 설정(human `nexus`, truth `source`)을, `.corthex/stages.json`에 05·06을 `in_progress`로 더했어요.
- Why: 04 통과(DEC-014~019) 뒤 다음 단계예요. 토링이 작업 지시(2026-11-28, Orca 작업 task_4b47409b8128).
- Result: F-7이 달랐어요: 알림 동의는 `Notification.requestAgreement`이고 토스 앱 5.255.0 이상이라 SPEC-001의 최소 버전(5.232.0)보다 높아요. 5.255.0 미만이면 [알림 받기]에서 업데이트를 안내해요. F-2는 SDK `Analytics.log`로만 남길 수 있어 서버가 전환 표시를 주고 화면이 기록해요. 계약을 쓰다 두 가지를 찾았어요: 마지막 응답으로 방이 마감되면 SPEC-026 문장대로는 알림이 가지 않아 REQ-058과 부딪힘(06 질문 2), SPEC-039의 "방 코드 없음"을 지키면 목록에서 방을 열 수 없음(06 질문 3). 두 질문 모두 01 도메인 설계를 바꾸지 않아요.
- Checked: `python3 scripts/check-contract.py` 통과 1095·실패 0(마이그레이션이 빈 DB에서 schema.sql과 같은 스키마, TBL·API ID 차례, 제약 검사 25개, 응답 표, 예시 200개 스키마 검사, 오류 코드·상태, 요청 필드 한계, 열 한계 = 계약 한계, SPEC 39/39 연결, 쓰지 않는 테이블 0). openapi-spec-validator 유효. Prism 5.12.0 목 서버가 계약을 읽고 예시·`Prefer` 헤더·401을 계약대로 돌려줌. Schemathesis 4.34.4가 16개 operation에서 367건을 만들었고, 실패 21건은 목 서버 자체의 동작(아무 토큰이나 받음 15건, Prism 자체 JSON 오류 모양 6건)이었어요. hub snapshot(이 브랜치 사본)은 TBL 15·API 16을 읽고 연결 경고 0이었고, hub의 ERD 그림 읽기는 테이블 15개와 "테이블 없는 용어" 4개를 경고 없이 읽었어요. 실제 서버 계약 테스트는 11 개발 단계예요. F-1의 콘솔 인증서 발급은 사용자님 계정이라 확인하지 못했어요.
- Next: 토링이가 05 질문 1, 06 질문 1~3 답을 받아 줌 → 답을 DEC-022부터 기록하고 Open 표시를 고침 → PR 병합(토링이) → `push moim-card` → 07 사이트맵.

### 2026-11-28 · 03 질문 2, 04 질문 3 답 기록과 변경 절차(01~04)

- Done: 사용자님 답(Orca 항목 249, 이벤트 e4355)을 DEC-018(03 질문 2 "더해(추천)")과 DEC-019(04 질문 3 "암호화해 두고 방 끝나면 삭제(추천)")로 기록하고, 변경 절차대로 01부터 04까지 고쳤어요. 01: domain.md에 리드 모델 "내 방 목록"(TERM-046), CTX-004 식별키 예외, CTX-006 정책과 이벤트 "알림 신청 삭제됨", 응답 규칙의 마감 뒤 누구나 보기 예외(DEC-013), 다음 행동의 테마 기본 문구(REQ-020), 핫스팟 H-04~H-14와 "review in stage 02" 세 줄의 상태, 새 용어 TERM-043~045를 넣고 board.md도 맞췄어요. 02: REQ-083(Should)·REQ-084(Must)를 더하고 REQ-074 문장을 바꿨어요(승인 문장은 비고, 4.6절 변경 기록). 03: FL-016(열린 방으로 돌아가기)을 더하고 FL-001(홈)·FL-010(식별키 암호화·삭제)을 고쳤어요. 04: SPEC-039(내 방 목록)를 더하고 SPEC-024~026을 active로, SPEC-003·025·033과 C-7에 암호문을 적었어요. `.corthex/stages.json`에서 03·04를 `done`으로, 01·02·03·04에 체크포인트를 적었어요.
- Why: 03 질문 2와 04 질문 3은 01을 바꾸는 질문이라 토링이가 사용자님께 여쭸어요. 01 변경은 사용자님이 Orca에서 말로 승인한 것(e4225, e4355)이라 NEXUS 재확정 없이 기록해요(사용자님 e4307).
- Result: REQ 84개(Must 68, Should 16), FL 16개, SPEC 39행(모두 active)이에요. 03·04 단계 통과. 01 domain.md를 바꿔 NEXUS 01 그림은 병합 뒤 push 때 새로 그려지고 앞 확정(`nk_000000000002`)은 무효가 되지만, 이 변경은 NEXUS 재확정 없이 기록해요.
- Checked: 흐름 정의 스크립트(REQ 84/84, 결정 가지·끝·닿지 않는 단계 0), diagram-check, spec 검사 스크립트(REQ 84/84, FL 16/16, 기능 Must 중 SPEC 없음 0), term-check, 요구사항 표 검사(84줄, 줄마다 "~야 해요" 1개), hub snapshot과 `push --dry-run` 결과는 PR #7 본문과 보고에 적어요.
- Next: PR #7 병합(토링이) → `push moim-card` → 05 ERD.

### 2026-11-28 · 03 질문 1, 04 질문 1·2 답 기록

- Done: 오랑이의 답(사용자님 위임, 근거는 사용자님 2026-11-23 "추천 모두 승인", 2026-11-27 "DDD랑 목업때만")을 DEC-015(03 질문 1, 흐름 15개 승인), DEC-016(04 질문 1, 명세 고정), DEC-017(04 질문 2, 진입 때 코드 교환 + 서버 세션 토큰)로 기록했어요. 결정된 문장과 상태 칸만 바꿨어요: 두 체크포인트 파일의 상태 줄과 질문 머리의 답, FL 파일 15개·README·spec.md의 상태 줄, spec.md의 C-1과 SPEC-002(주 동작 문장, 상태 `질문 대기` → `active`), REQ-041 비고("확인은 세션 시작 때").
- Why: 토링이가 전한 오랑이 답(2026-11-28, Orca 작업 task_53fa70f6bf99).
- Result: SPEC은 active 35, 질문 대기 3(SPEC-024~026)이에요. 03 질문 2(열린 방 목록)와 04 질문 3(알림 식별키)은 01을 바꾸는 질문이라 토링이가 사용자님께 여쭸고, 답이 올 때까지 질문 대기예요. 그래서 03·04 단계는 아직 통과가 아니라 `in_progress`예요. DEC-016대로 미확인 사실(F-1~F-7)이 06에서 다르게 나오면 그 행만 고치고 기록해요.
- Checked: 같은 PR의 앞 커밋에서 SPEC-024 주 동작과 C-1이 체크포인트 질문 번호를 잘못 가리켰어요("질문 2", "질문 1"). 이번에 C-1은 DEC-017로, SPEC-024는 "체크포인트 질문 3"으로 바로잡았어요. term-check 0건, diagram-check 0건, spec 검사 스크립트 REQ 82/82·FL 15/15를 다시 봤어요.
- Next: 사용자님의 03 질문 2·04 질문 3 답 → DEC-018부터 기록 → 03·04 통과 기록 → PR #7 병합(토링이) → `push moim-card` → 05 ERD.

### 2026-11-28 · 03 사용자 흐름과 04 기능 명세 초안

- Done: `corthex-define`의 03·04로 [03 사용자 흐름](../03-user-flow/README.md)(FL-001~015, 파일마다 Mermaid 흐름도·단계 표·실패 경로)과 [04 기능 명세](../04-functional-spec/spec.md)(공통 규칙 C-1~C-10, SPEC-001~038)를 썼어요. 체크포인트 질문은 [checkpoint-03.md](../03-user-flow/checkpoint-03.md)(질문 2개, AI가 정한 것 A-1~A-9)와 [checkpoint-04.md](../04-functional-spec/checkpoint-04.md)(질문 3개, AI가 정한 것 B-1~B-13)에 있어요. `.corthex/stages.json`에 03·04를 `in_progress`로 더했고, 02 진행 기록이 남긴 낡은 줄(requirements.md·checkpoint-02.md 머리의 "NEXUS 확정 대기/다음")을 DEC-014대로 고쳤어요.
- Why: 02 통과(DEC-014) 뒤 다음 단계예요. 토링이 작업 지시(2026-11-28): DDD·목업이 아닌 단계는 NEXUS 확정 없이 오랑이 위임 답으로 통과를 기록해요.
- Result: REQ 82개가 모두 흐름(단계 77개, 공통 5개)과 SPEC 행에 연결돼요. SPEC 38행 중 34행은 active, 4행(SPEC-002, SPEC-024~026)은 질문 대기예요. 명세를 쓰다 승인된 문장과 부딪히는 것 두 가지를 찾았어요: REQ-041을 글자대로 하면 요청마다 코드 교환(04 질문 2), 기능성 알림 발송에 식별키가 필요해 REQ-074·01 CTX-004 규칙과 부딪힘(04 질문 3). 03에서는 방장이 링크를 보내기 전에 앱을 닫으면 열린 방으로 돌아갈 수 없는 빈틈을 찾았어요(03 질문 2). 03 질문 2의 1번과 04 질문 3의 1번은 01을 바꿔 위임 밖일 수 있어요.
- Checked: 흐름 정의 스크립트로 결정 가지(2개 이상, 이름 있음), 흐름의 끝, 닿지 않는 단계 0개를 봤어요. `diagram-check.py`는 흐름 15개와 흐름 지도 모두 0건이에요. spec 검사 스크립트로 REQ 82/82, FL 15/15, 기능 Must 중 SPEC 없음 0개, 모든 행의 Given·When·Then과 예외 종류를 봤어요. term-check 0건이에요. 공식 개발자센터 검색으로 F-4(알림 발송은 `x-anon-key` 헤더), F-5(`File.saveBase64`), F-6(코드 교환 API, 5분 한 번), F-7(`requestNotificationAgreement`)을 찾았지만 검색 요약만 봤고 페이지 본문은 열지 않았어요(06 전에 확인). 01 domain.md는 바꾸지 않았어요(목업 단계 때 사용자님 확인과 함께 고침).
- Next: 토링이가 03·04 체크포인트 질문의 답을 받아 줌 → 답을 DEC-015부터 기록하고 질문 대기 행을 고침 → PR 병합(토링이) → `push moim-card` → 05 ERD.

### 2026-11-28 · 02 PRD 체크포인트 통과 기록

- Done: 사용자님 지시 "걍 해 꼭 넥서스에서 해야대?"(Orca 항목 244, 이벤트 e4307)를 DEC-014로 기록하고, `.corthex/stages.json`의 02-prd를 `done`으로 바꾸고 체크포인트(승인 근거 DEC-008~014, 버전 main `20d6423`)를 넣었어요. 이 기록 파일 셋만 바꿨어요.
- Why: DDD·목업이 아닌 단계는 NEXUS 확정을 기다리지 않기로 했어요. 02는 오랑이 위임 답(DEC-008~012)과 사용자님 답(DEC-013)으로 승인됐어요.
- Result: 02 PRD 단계 통과. 앞서 main에서 hub dry-run이 낸 경고 `records-invalid`(02-prd 기록에 `checkpoints` 칸이 없었음)는 이 PR이 병합되면 없어져요.
- Checked: term-check 0건. 02-prd의 검토 결과 F-1(mTLS 인증서 발급)·F-2(전환 이벤트 SDK 호출)는 기록이 고쳐지자 warn으로 보이기 시작했는데, 02의 결함이 아니라 05 ERD·06 API 전에 확인할 사실이라 info로 낮췄어요(requirements.md 3절에 그대로 있음). 이 브랜치를 default로 둔 임시 복제본의 hub snapshot과, 병합 전 main 기준 `push --dry-run` 결과는 PR 본문에 적었어요. NEXUS 02 확정은 누르지 않았어요(필요 없음).
- 남은 낡은 줄: requirements.md 머리와 checkpoint-02.md 머리에 "NEXUS 확정(버전 고정) 대기/다음"이 남아 있어요. 기록 파일만 바꾸는 PR이라 이번에는 고치지 않았어요. 03 작업 때 함께 고쳐요.
- Next: 이 PR 병합 → `push moim-card` → 01 후속 고침(domain.md 응답 규칙 마감 뒤 예외, 핫스팟 상태, 새 용어 3개, 01 다시 확정) → 03 사용자 흐름.

### 2026-11-28 · 질문 4 답 기록과 02 낡은 줄 정리

- Done: 사용자님 답 "누구나 보기(추천)"(Orca 항목 244, 이벤트 e4225)를 DEC-013으로 기록했어요. REQ-016을 `active`로 바꾸고 문장에 "응답하지 않은 참여자, 처음 온 사람 모두"를 더했고, [우리도 해 보기]는 한 줄에 한 동작 규칙에 따라 REQ-082(Should)로 새로 더했어요. checkpoint-02.md의 질문 4 답 줄을 바꿨어요. 02가 아직 NEXUS 확정 전이라, 앞 커밋에서 남겨 둔 낡은 줄도 정리했어요: requirements.md 머리의 상태, 4.3절 개수, 비고의 "답이 2번이면" 문장(→ DEC 번호), 출처 칸의 DEC 번호, 4.1절 처리 표, checkpoint-02.md의 상태 줄·답한 사람 줄·1절 표.
- Why: 질문 4는 01 규칙을 바꾸는 질문이라 오랑이의 위임 밖이어서 사용자님이 직접 답했어요.
- Result: 요구사항 82개(Must 67, Should 15, 기능 59, 비기능 23), 모두 `active`, 질문 대기 0개예요. 02 범위 고정 체크포인트의 질문은 모두 답이 있어요(DEC-008~013).
- Checked: term-check 0건, 요구사항 표 스크립트 검사(82줄, 줄마다 "해야 해요" 1개, 비기능 모두 측정 방법 있음). 01 domain.md는 바꾸지 않았어요.
- 후속 할 일(01 단계 고침, 따로 PR): domain.md CTX-001 응답 규칙("응답을 제출하기 전에는 다른 사람의 응답이나 합의 카드를 볼 수 없어요")에 마감 뒤 예외(DEC-013)를 적고, 핫스팟 H-04·H-05·H-06·H-07·H-08·H-10·H-11·H-13·H-14의 상태를 02 결정(DEC-009~013)과 요구사항으로 바꾸고, 새 용어(모임 이름, 지난 카드, 금칙어 목록)를 용어집에 더해요. 이 고침은 NEXUS 01 그림을 다시 그리게 해 01 확정(`nk_000000000002`)이 무효가 되므로, 01을 다시 확정해야 해요.
- Next: PR #5 병합(사용자님 승인 사항) → `push moim-card` → NEXUS 02 목록 확정 요청(버전 고정) → 위의 01 후속 고침.

### 2026-11-28 · 02 범위 고정과 질문 1·2·3·5 답 기록

- Done: 오랑이의 답(사용자님 위임, 근거는 사용자님 2026-11-23 "추천 모두 승인", 2026-11-27 "DDD랑 목업때만")을 DEC-008(범위 고정), DEC-009(질문 1), DEC-010(질문 2), DEC-011(질문 3), DEC-012(질문 5)로 기록했어요. requirements.md에서는 REQ-018, 025, 044, 045, 047, 058, 059, 060, 061의 상태 칸만 `질문 대기` → `active`로 바꿨고, checkpoint-02.md에서는 질문 머리줄의 답만 더했어요. 모두 추천안대로라 요구사항 문장은 바뀌지 않았어요.
- Why: NEXUS 규칙상 결정 기록 PR은 결정된 문장만 바꿔야 확정이 무효가 되지 않아요.
- Result: 질문 4(REQ-016, 01 응답 규칙의 마감 뒤 예외)는 01 규칙을 바꾸는 질문이라 오랑이의 위임 밖이에요. 토링이가 사용자님께 따로 여쭸고, 답이 올 때까지 01 규칙 그대로(응답한 사람만 카드를 봄)이고 REQ-016은 질문 대기예요.
- Checked: `git diff --word-diff`로 requirements.md에서 바뀐 단어가 상태 칸 9개뿐임을 확인했어요. 답이 Orca로 와서 NEXUS 02에 이을 댓글이 없어 hub `decide`는 하지 않았어요. 일부러 남긴 낡은 줄: requirements.md 머리의 "체크포인트 대기", 4.3절의 개수(active 71, 질문 대기 10 → 지금은 active 80, 질문 대기 1), 각 REQ 비고의 "답이 2번이면" 문장, checkpoint-02.md의 상태 줄과 위임 원문이 없다는 줄이에요. 결정된 문장이 아니라서 질문 4의 답과 함께 고쳐요.
- Next: 사용자님의 질문 4 답 → REQ-016 결정 기록과 낡은 줄 정리 → PR #5 병합(사용자님 승인 사항) → `push moim-card` → NEXUS 02 목록 확정 요청(버전 고정).

### 2026-11-28 08:50 KST · 02 PRD 초안과 체크포인트 질문

- Done: `corthex-define`의 02 PRD로 [requirements.md](../02-prd/requirements.md)(REQ-001~081, EARS)와 [checkpoint-02.md](../02-prd/checkpoint-02.md)(범위 고정 질문 1개, 질문 1~5)를 썼어요. 01 추측 9개 중 5개(추측 2, 5, 7, 8, 9)는 요구사항으로 정했고, 3개(추측 1, 3, 4)는 질문으로 남겼고, 1개(추측 6)는 사실 확인(F-1)으로 넘겼어요. 토스 정책(광고 500명 조건, `intoss://` 공유, 로그인 없음, 기능성 알림만, 중복 앱 금지, 혐오·차별 소재 금지, 권리 증빙)을 요구사항으로 넣었어요. `.corthex/stages.json`에 02-prd를 `in_progress`로 더했어요.
- Why: 01 통과(DEC-006, DEC-007) 뒤 다음 단계예요. 토링이 작업 지시(2026-11-28)에 따라 이 단계의 체크포인트는 사용자님 대신 오랑이가 답해요.
- Result: 요구사항 81개(Must 67, Should 14, 기능 58, 비기능 23), 그중 질문 대기 10개예요. 01에서 승인된 것 중 뜻이 바뀔 수 있는 것 2개(응답 전 열람 금지 규칙의 마감 뒤 예외, 기능성 알림 범위)는 질문 4, 5로 따로 물어요.
- Checked: 공식 문서로 F-1(mTLS 인증서는 콘솔에서 미니앱마다 발급, 출시 전에도 가능, 사업자 필요 목록에 없음, Cloudflare Workers `mtls_certificates` 바인딩으로 클라이언트 인증서 사용 가능)과 F-2(전환 지표는 콘솔에서 이벤트를 묶어 만듦)를 확인했어요. 콘솔에서 사업자 없이 인증서가 발급되는지와 전환 이벤트를 남기는 SDK 호출은 확인하지 못했어요. domain.md는 바꾸지 않았어요(바꾸면 NEXUS 01 확정 `nk_000000000002`가 무효가 돼요). NEXUS to-do는 에이전트 대기 0건, 사용자 대기 5건이에요.
- Next: 오랑이가 체크포인트 질문에 답함 → 답마다 DEC-008부터 기록하고 결정된 문장만 바꾸는 PR → 이 PR과 그 PR 병합(사용자님 승인 사항) → `push moim-card` → NEXUS 02 목록 확정 요청(버전 고정).

### 2026-11-28 03:05 KST · 01 다시 확정과 기록

- Done: PR #3을 squash 병합(커밋 `3e5c0b9`, 사용자님 '병합해', Orca 항목 232 e4082)한 뒤 `push moim-card --dry-run`(항목 48, checks 0) → `push moim-card`(revision 3, 그림 drawn 1, failed 0)를 보냈어요. 응답의 `confirmations_invalidated`가 1이었어요. 이어 `nk_000000000001`에 `record merged`(PR #3)를 보내 `recorded`가 됐어요. 사용자님 승인("모두 승인", "대신 눌러", e4132·e4135)으로 토링이가 새 그림을 다시 확정했어요(`nk_000000000002`). 이를 DEC-007로, `.corthex/stages.json`의 두 번째 체크포인트로 기록했어요.
- Why: PR #3이 domain.md의 핫스팟 상태를 바꿔 DDD 그림이 새로 그려졌어요. NEXUS 규칙상 새 그림은 이전 확정을 무효화하고, 무효화된 확정으로는 단계 통과가 쓰이지 않아요.
- Result: 이 PR이 병합되고 `record merged`를 보내면 NEXUS 01이 통과로 기록돼요. 이 PR은 `.corthex/stages.json`과 `docs/records/`만 바꿔요. DDD 그림이 읽는 domain.md는 바꾸지 않아 새 확정은 무효화되지 않아요.
- Checked: `hub.py show`로 `nk_000000000002`가 `state passed`, `confirmation confirmed`, 그림 `dw_000000000003`, 버전 `3e5c0b9`임을 확인했어요. 단계 통과 여부가 담긴 project read는 owner 로그인 전용이라 에이전트 토큰으로는 읽지 못했어요. 열린 스레드 5개(`nc_000000000001`, `003`, `004`, `006`, `007`)는 사용자 대기이고, NEXUS 규칙상 owner만 닫을 수 있어요.
- Next: 이 PR 병합(사용자님 승인 사항) → `push moim-card` → `nk_000000000002`에 `record merged` → NEXUS 01 통과 확인 → 02 PRD.

### 2026-11-28 02:30 KST · 01 도메인 설계 체크포인트 통과 기록

- Done: 사용자님 답 "질문 3개 추천대로"(Orca 항목 232, 이벤트 e4032)를 DEC-003(H-01), DEC-004(H-02), DEC-005(H-03)로, NEXUS 01 단계의 "확정"(체크포인트 `nk_000000000001`, 2026-11-27 22:07 KST)을 DEC-006으로 기록했어요. H-01~03을 `answered`로 닫고, domain.md·board.md·checkpoint-01.md에 반영했어요. `.corthex/stages.json`의 01-domain을 `done`으로, 승인 커밋을 그림 `e1139e7` / main `469dd3d`로 적었어요.
- Why: 사용자님이 질문 3개에 답하고 NEXUS에서 DDD 그림을 확정함.
- Result: 01 단계 통과(그린 대로 승인). AI 추측 9개는 질문으로 정해지지 않아 [추측]·[추론] 표시를 그대로 두고 02 PRD에서 다시 볼 것으로 표시했어요(H-04, H-06은 요구사항을 쓰기 전에 답 필요).
- Checked: `git diff e1139e7 469dd3d`로 domain.md·board.md가 같음을 확인했어요. NEXUS 스레드 상태는 `hub.py show`로 읽었어요: 질문 1 스레드(`nc_000000000002`)는 답 없이 사용자님이 닫은 상태였고(2026-11-27 21:59 KST), 질문 2는 `nc_000000000001`, 질문 3은 `nc_000000000003`이에요. 사람 댓글 2개(`nc_000000000005`, `nc_000000000006`)는 "스레드 닫기를 잘못 눌렀다"는 말이에요. 사람이 고친 항목 0개, 답은 대화(Orca)에서만 왔어요. `hub.py status --repository`는 이 작업공간이 아니라 profile에 등록된 checkout에 써서, 그 내용을 이 브랜치로 옮기고 그 checkout은 원래대로 되돌렸어요. NEXUS 주소는 공개 저장소라 기록에 넣지 않았어요.
- NEXUS: 체크포인트 `nk_000000000001`에 이 PR을 `record opened`로 알렸어요(record_state `in_review`). 질문 2(`nc_000000000001`), 질문 3(`nc_000000000003`), 체크포인트 요청(`nc_000000000004`)에 결정을 답글로 달고 `decide --link`(decisions.md, 커밋 `e1de339`)를 보냈어요. 질문 1 스레드(`nc_000000000002`)는 닫혀 있어 답글이 거절돼(`thread_closed`) CTX-001에 새 댓글(`nc_000000000007`)로 결정을 남기고 같은 링크로 `decide`를 보냈어요. `nc_000000000006`(스레드 닫기를 잘못 눌렀다는 말)에는 기능 설명을 답글로 달았어요. 서버는 decision 항목을 붙였지만 스레드는 모두 `open`, 사용자 대기로 남았어요(`show`로 확인). `push moim-card --dry-run`은 main 기준 항목 48, checks 0, 01 그림 1개예요.
- Next: PR 병합(사용자님 승인 사항) → 병합 뒤 `push moim-card` → NEXUS 체크포인트 `record merged` → 02 PRD.

### 2026-11-27 21:50 KST · NEXUS 첫 push와 01 체크포인트 요청

- Done: `hub.py can-send moim-card`(can_send true) → `push moim-card --dry-run`(항목 48: 컨텍스트 6, 용어 42, 01 그림 1개) → `push moim-card --first`(revision 1, commit `e1139e7`, 그림 drawn 1, failed 0). NEXUS 01 단계에 질문 3개를 항목 댓글로(nc_000000000001 합의 카드, nc_000000000002 CTX-001, nc_000000000003 CTX-003, 모두 추천안 포함) 올리고 체크포인트 요청(nc_000000000004)을 단계 전체 댓글로 올렸어요.
- Why: 사용자님이 체크포인트를 NEXUS에서 보고 정하기로 함(DEC-002, Orca 항목 232 "Nexus에 올려").
- Result: 서버가 moim-card를 commit `e1139e7`로 갖고 있고(그림 1, drawing 1), to-do의 사용자 대기 5건이에요.
- Checked: 첫 dry-run은 origin HEAD가 없어 그림을 빼서(경고 1), `git remote set-head origin --auto` 뒤 다시 돌려 경고 0으로 보냈어요. CI 자동 설정은 `CORTHEX_NEXUS_URL`이 없어 건너뛰었어요. NEXUS 단계 화면은 사용자님 로그인으로만 열려(owner_only) AI는 화면을 직접 보지 못했어요. 처음 두 질문 댓글은 그림에 없는 용어(TERM-016, TERM-023)를 가리켜 거절돼 CTX-001, CTX-003에 다시 올렸어요.
- Next: 사용자님이 NEXUS 01 단계에서 질문 3개에 답하고 체크포인트를 통과 → AI가 문서에 반영하고 통과를 기록 → 02 PRD.

### 2026-11-27 20:30 KST · CORTHEX 등록과 01 도메인 설계 초안

- Done: 저장소를 CORTHEX 프로젝트 `moim-card`로 등록하고(`.corthex/project.json`), 조사 노트 3개를 `docs/00-research/`에 남겼어요. `corthex-discover`의 one-pass draft로 01 도메인 설계 1~9단계 초안을 썼어요.
- Why: 사용자님이 방향 A를 고름(DEC-001). 작업 지시가 사람 확인 횟수가 가장 적은 진행 방식을 요구함.
- Result: [domain.md](../01-domain/domain.md)(CTX 6개, TERM 33개, 핫스팟 H-01~H-14), [board.md](../01-domain/board.md)(Miro 대신 텍스트 보드), [checkpoint-01.md](../01-domain/checkpoint-01.md)(추측 9개, 질문 3개, 핵심 규칙). 저장소가 공개로 바뀌어 6결 노트는 공개용 요약으로 넣었어요.
- Checked: term-check.py와 diagram-check.py 결과는 PR 본문에 적어요. Miro 보드는 만들지 않았어요(저장소 밖 쓰기 미허용). corthex-hub 스킬이 이 환경에 없어 hub 상태 기록은 하지 않았어요.
- Next: 사용자님이 체크포인트 질문 3개와 추측에 답함 → AI가 문서에 반영하고 체크포인트 통과를 기록 → 02 PRD.

### 2026-11-27 20:15 KST · NEXUS 준비

- Done: 사용자님 답 "Nexus에 올려" / "마찬가지"(Orca 항목 232)를 DEC-002로 기록하고 `on_nexus: true`를 넣었어요. hub 스냅샷(corthex-nexus 0.6.0)이 DDD 보드를 경고 없이 읽도록 용어집에 TERM-034~042(애그리거트·리드 모델)를 더하고 표 칸을 고쳤어요. 01 단계 저장소 기록 `.corthex/stages.json`을 `in_progress`로 만들었어요.
- Why: NEXUS가 01 단계 초안과 체크포인트를 보여 주게 하려고.
- Result: 이 브랜치를 default branch로 둔 복제본에서 스냅샷을 만들면 컨텍스트 6, 애그리거트 6, 리드 모델 8, 의존 13, 핫스팟 17, 타임라인 lane 6, 경고 0이에요(`hub.py snapshot` 결과).
- Checked: NEXUS로 보내지 못했어요. 이 기기에 프로필(`nexus.url`, `nexus.push`)과 토큰 환경 변수가 없어요. 또 NEXUS는 default branch만 그리므로 PR 병합이 먼저 필요해요(병합은 사용자님 승인 사항).
- Next: 사용자님이 이 기기에 NEXUS 주소·push 목록·토큰을 설정하고 PR 병합을 승인함 → `push moim-card --dry-run` 결과를 보여 드리고 첫 push(`--first`) 승인을 받음 → 체크포인트 요청.
