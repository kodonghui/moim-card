# FL-013 방 만료

상태: 승인(DEC-015) · 누가: 스케줄러(Cloudflare Cron Trigger) · 관련 흐름: 없음

목표: 만든 지 30일이 지난 방과 그 응답을 24시간 안에 지워요.

Serves: REQ-025, REQ-047, REQ-080

```mermaid
---
config:
  flowchart:
    wrappingWidth: 240
---
flowchart TD
  A(["매시간 Cron<br/>실행<br/>REQ-080"])
  B["30일 지난<br/>방 찾기<br/>REQ-047"]
  C{"지울 방이<br/>있나?<br/>REQ-047"}
  D1["방·응답·<br/>닉네임·알림<br/>신청 지우기<br/>REQ-047"]
  E["지난 카드<br/>요약은 남기기<br/>REQ-025"]
  F1{"모두<br/>지웠나?<br/>REQ-080"}
  G["남은 방은 다음<br/>실행에서 다시<br/>REQ-080"]
  Z(["끝"])
  A e1@--> B
  B e2@--> C
  C e3@-->|아니요| Z
  C e4@-->|예| D1
  D1 e5@--> E
  E e6@--> F1
  F1 e7@-->|아니요| G
  G e8@--> Z
  F1 e9@-->|예| Z
  %% legend: below
  classDef term fill:#e7f5ff,stroke:#1c7ed6,color:#212529
  classDef proc fill:#f8f9fa,stroke:#495057,color:#212529
  classDef decide fill:#f3f0ff,stroke:#7048e8,color:#212529
  classDef pass stroke:#868e96,stroke-width:1.5px
  class A,Z term
  class B,D1,E,G proc
  class C,F1 decide
  class e1,e2,e3,e4,e5,e6,e7,e8,e9 pass
```

| 모양 | 뜻 |
| --- | --- |
| 둥근 끝 상자 | 흐름의 시작이나 끝, 또는 이어지는 다른 흐름(FL ID) |
| 사각형 | 한 단계 |
| 마름모 | 결정. 가지마다 이름이 있어요 |
| 회색 선 | 다음 단계로 넘어감(저장소를 그리지 않아 쓰기·읽기 선은 없어요) |

그림 설명: 만료는 매시간 돌아, 한 번 실패해도 24시간 안에 다시 지울 기회가 있어요.

## 단계

| 단계 | 종류 | 하는 일 | REQ |
| --- | --- | --- | --- |
| 매시간 Cron 실행 | 시작·끝 |  | REQ-080 |
| 30일 지난 방 찾기 | 단계 |  | REQ-047 |
| 지울 방이 있나? | 결정 |  | REQ-047 |
| 방·응답·닉네임·알림 신청 지우기 | 단계 | 방 만료됨. | REQ-047 |
| 지난 카드 요약은 남기기 | 단계 |  | REQ-025 |
| 모두 지웠나? | 결정 |  | REQ-080 |
| 남은 방은 다음 실행에서 다시 | 단계 |  | REQ-080 |

## 실패 경로

- 일부 삭제 실패 → 다음 실행에서 다시 지워요(REQ-080).
