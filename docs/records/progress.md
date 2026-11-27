# 진행 기록

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
