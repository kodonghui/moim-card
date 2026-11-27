# 진행 기록

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
