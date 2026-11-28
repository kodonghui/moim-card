# 모임 합의 카드(가칭): 화면 정의 (08)

상태: **초안, 체크포인트 대기**(2026-11-28) · 체크포인트 질문: [checkpoint-08.md](checkpoint-08.md) · 와이어프레임: [wireframes.html](wireframes.html)(회색 와이어프레임, 상태마다 한 장, 360px·430px)

- 입력: [07 사이트맵](../07-sitemap/sitemap.yaml)(SCR-001~015), [04 기능 명세](../04-functional-spec/spec.md)(SPEC-001~039, C-1~C-10), [06 API 계약](../../api/openapi.yaml)(API-001~016, 오류 코드 22개와 각 코드의 `client` 칸).
- 화면 하나에 파일 하나예요(`SCR-001.md` …). 파일마다 목적, 데이터와 출처 API, 동작(결과·실패), 상태, 응답과 상태, 경우의 종류, 규칙이 있어요.
- 상태 ID는 `SCR-002#empty`처럼 써요. 기본 상태는 normal(정상) · loading(불러오는 중) · empty(빈) · error(오류) · permission(권한) · stale(오래된 데이터)이고, 화면마다 그 화면만의 상태를 더할 수 있어요(예: `SCR-001#update-required`). 맞지 않는 기본 상태는 "해당하지 않는 상태"에 이유를 적어요.
- 화면 코드를 바꾸기 전에 이 정의를 먼저 고쳐요. 검사는 `python3 scripts/check-screens.py`예요.

## 1. 모든 화면에 걸리는 규칙 (G-1~G-10)

화면 파일의 "응답과 상태" 표는 같은 처리를 "G-n"으로 가리켜요.

| ID | 경우 | 상태 | 사용자가 보는 것과 할 수 있는 것 | 근거 |
| --- | --- | --- | --- | --- |
| G-1 | 401 `unauthenticated`(세션 없음·끝남) | permission | 보이는 것은 그대로 두고 SCR-001의 확인 단계(API-001)를 화면 뒤에서 한 번 다시 해요. 성공하면 같은 요청을 다시 보내고, 적거나 고른 값은 지우지 않아요. 다시 확인이 실패하면 SCR-001#error로 가요. | C-1, `unauthenticated.client` |
| G-2 | 403 `origin_not_allowed` | permission | 토스 앱 밖에서 연 경우예요. 화면 가운데 "지금은 쓸 수 없어요"만 보이고 버튼이 없어요. | SPEC-038, `origin_not_allowed.client` |
| G-3 | 429 `rate_limited` | error | "잠시 뒤 다시 해 주세요". [다시 시도]는 `Retry-After` 초 동안 꺼져 있고 남은 초를 보여 줘요. 적은 값은 그대로예요. | C-6, `rate_limited.client` |
| G-4 | `default`(500 `internal`), 연결 없음, 10초 시간 초과 | error | "잠시 뒤 다시 해 주세요"와 [다시 시도]. 적거나 고른 값은 지우지 않아요. `traceId`가 있으면 아래에 작게 "오류 번호 ○○○"를 적어요(문의할 때 쓰는 값, 개인 정보 아님). 화면의 나머지 부분은 그대로 써요. | C-2, `internal.client` |
| G-5 | 400 `invalid_request`, 404 `route_not_found`, 405 `method_not_allowed` | error | 앱 버그예요. 오류 보고에 남기고(방 코드는 넣지 않음, DEC-025) 사용자에게는 G-4와 같은 모양을 보여 줘요. | `invalid_request.client`, `route_not_found.client` |
| G-6 | 409 `idempotency_conflict` | 없음(화면 변화 없음) | 새 요청 ID로 한 번 다시 보내요. 또 실패하면 G-4예요. | C-3, `idempotency_conflict.client` |
| G-7 | 상태를 바꾸는 요청이 도는 동안 | loading | 누른 버튼에 진행 표시를 넣고 끝날 때까지 꺼 둬요(두 번 눌러도 요청은 하나). 10초 시간 초과 뒤 [다시 시도]는 **같은 요청 ID**로 보내 서버가 첫 결과를 돌려주게 해요. | C-3, C-10, W-10 |
| G-8 | 읽기 요청이 1초를 넘을 때 | loading | 정상 화면과 같은 배치에 회색 자리 표시를 보여 줘요. 데이터가 와도 배치가 움직이지 않게 같은 크기예요. 1초 안에 오면 아무것도 보이지 않아요. | C-10, W-3 |
| G-9 | 다시 불러오기 | stale | 방 소개·카드·응답 현황·내 방 목록은 화면을 열 때, 미니앱으로 돌아올 때(`visibilitychange`), [새로고침]을 누를 때 다시 불러와요. 화면에 "오후 3시 5분 기준"처럼 `asOf`를 적어요. 실시간 연결과 주기적 폴링은 없어요. | C-9 |
| G-10 | 토스 앱 버전이 기능의 최소 버전보다 낮음 | 화면마다 | 진입(5.232.0)은 SCR-001#update-required. 공유 링크 OG 이미지(Android 5.240.0, iOS 5.239.0)는 공유를 누를 때 "토스 앱을 업데이트하면 링크를 보낼 수 있어요", 알림 동의문(5.255.0)은 SCR-008#notify-update. 업데이트 방법은 글로 알려요(W-9). | REQ-073, SPEC-022, SPEC-024 |

### 1.1 모든 화면에 같은 것

- 토스 내비게이션 바의 뒤로가기만 써요. 화면 안에 자체 뒤로가기 버튼이 없어요(SPEC-009, REQ-065). 초대 링크로 들어와 처음 보는 화면(SCR-005, SCR-007, SCR-008, SCR-010)과 홈(SCR-002)에서 뒤로가기는 미니앱을 닫아요. 그래서 SCR-001과 방 입구(SCR-005)는 다음 화면으로 갈 때 기록을 바꿔 끼워요(`history.replace`, S-2, S-3).
- 진입 직후 바텀시트를 띄우지 않아요(REQ-066). 확인 창(SCR-009#confirm-close, SCR-013#confirm)은 사용자가 버튼을 누를 때만 떠요.
- 라이트 모드만이에요. 기기가 다크 모드여도 색이 바뀌지 않아요(SPEC-035). 광고 영역이 없어요(SPEC-034).
- 본문 글자 명도 대비 4.5:1 이상, 꺼진 버튼의 글자도 4.5:1, 누르는 영역 44×44pt 이상이에요(SPEC-037).
- 방 코드는 어떤 화면에도 보이지 않고, 주소·console·`Analytics.log` 파라미터·오류 보고에 남기지 않아요(DEC-025, S-1). 닉네임은 본인 화면에만 "○○ 님으로 참여 중"으로 보여요(SPEC-008, 03 A-3).
- 폭: 휴대폰 폭 360~430px을 지원해요. 와이어프레임은 가장 좁은 360px과 가장 넓은 430px로 그려요. 20자 모임 이름과 40자 문항은 360px에서 두 줄까지 줄바꿈하고 자르지 않아요(W-1).
- 문구는 06 오류 코드의 사용자 문구(`message`)를 그대로 써요. 화면이 더 적는 것은 각 파일에 있어요.

## 2. 화면 목록

| SCR | 화면 | 경로 | 상태(기본 + 화면만의 것) | 부르는 API |
| --- | --- | --- | --- | --- |
| SCR-001 | [진입 확인](SCR-001.md) | `/` | loading, error, permission, update-required | API-001, API-016 |
| SCR-002 | [홈](SCR-002.md) | `/home` | normal, loading, empty, error, permission, stale | API-012 |
| SCR-003 | [테마 고르기](SCR-003.md) | `/rooms/new` | normal, loading, empty, error, permission | API-002 |
| SCR-004 | [방 정보 적기](SCR-004.md) | `/rooms/new/details` | normal, loading, error, permission | API-003 |
| SCR-005 | [방 소개](SCR-005.md) | `/room` | normal, loading, error, permission, stale, full | API-004 |
| SCR-006 | [닉네임 정하기](SCR-006.md) | `/room/join` | normal, loading, error, permission, stale | API-005 |
| SCR-007 | [문항](SCR-007.md) | `/room/questions` | normal, loading, error, permission, stale | API-006, API-007 |
| SCR-008 | [내 결과](SCR-008.md) | `/room/result` | normal, loading, error, permission, stale, notify-update, notify-done | API-008, API-004, API-011 |
| SCR-009 | [합의 카드](SCR-009.md) | `/room/card` | normal, loading, empty, error, permission, stale, confirm-close | API-009, API-004, API-010 |
| SCR-010 | [최종 카드](SCR-010.md) | `/room/final` | normal, loading, empty, error, permission | API-009, API-004 |
| SCR-011 | [지난 카드](SCR-011.md) | `/past-cards` | normal, loading, empty, error, permission | API-013 |
| SCR-012 | [지난 카드 자세히](SCR-012.md) | `/past-cards/:pastCardId` | normal, error | 없음(SCR-011의 API-013 결과) |
| SCR-013 | [내 데이터 지우기](SCR-013.md) | `/me/delete` | normal, loading, empty, error, permission, confirm, done | API-014, API-015 |
| SCR-014 | [이용약관](SCR-014.md) | `/legal/terms` | normal | 없음(번들 안 문서) |
| SCR-015 | [개인정보처리방침](SCR-015.md) | `/legal/privacy` | normal | 없음(번들 안 문서) |

화면 15개, 상태 70개예요(`scripts/check-screens.py` 결과).

## 3. 화면이 없는 SPEC

화면 정의가 가리키지 않는 SPEC 행과 그 이유예요. 나머지 SPEC은 모두 어느 화면 파일에 있어요(검사 결과).

| SPEC | 이유 |
| --- | --- |
| SPEC-003 | 서버 안 사용자 등록·찾기. 화면은 SCR-001의 결과만 받아요 |
| SPEC-014 | 서버 안 중간 카드 갱신. 화면은 결과(API-009)만 보여 줘요 |
| SPEC-025, SPEC-026, SPEC-030 | 서버 안 알림 발송·신청 정리·방 만료. 알림은 토스 앱이 보여 줘요 |
| SPEC-031, SPEC-032 | 운영자가 저장소 스크립트로 하는 문항 세트 검사·배포(FL-014) |

## 4. AI가 정한 것

[checkpoint-08.md](checkpoint-08.md) 2절의 W-1~W-12예요.
