# 진행 기록

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
