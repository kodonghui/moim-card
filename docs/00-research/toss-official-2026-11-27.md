# 앱인토스 공식 자료 재검증 노트 (친구 비교형 취향 테스트 미니앱 기획용)

조사 기준일은 2026-11-27(KST)이에요. 대상 제품은 비게임·WebView 미니앱이고, 직접 쓴 콘텐츠로 만든 무료 취향 테스트를 친구·모임이 함께 풀고 공유하는 형태예요(1순위 후보: "친구끼리 모임 취향 맞추기"와 합의 카드). 수익화는 인앱 광고가 먼저이고 인앱 결제는 나중이에요. 운영자는 사업자등록이 없는 개인 개발자라고 가정했어요.

## 0. 조사 방법과 표기

- 기존 노트 3건(2026-11-26 작성: `toss-platform.md`, `market-fit.md`, 요약 보고서)을 먼저 다 읽고, 오늘 공식 페이지를 다시 받아 대조했어요.
- 개발자센터는 페이지 주소 뒤에 `.md`를 붙인 원문 약 90쪽을 직접 받았어요. 정책·체크리스트·광고·정산·인증·공유 페이지는 전문을 읽었고 SDK 레퍼런스는 필요한 부분만 읽었어요. 페이지별 수정일은 `.md`에는 없고 HTML의 "마지막 업데이트" 값으로 확인했어요. 값이 없는 페이지는 "표시 없음"으로 적었어요.
- 공식 블로그 21건, 개발자 커뮤니티 글 33건(운영 공지·운영진 답변·개발자 글), 광고대행 약관 2개 판본, 릴리즈 노트, npm 레지스트리, 토스 뉴스룸, 공개 미니앱 상세 페이지(tossminiapp.com) 867건을 열람했어요.
- 콘솔 가입, 검수 요청, 문의, 게시는 하지 않았어요. 미니앱 실행은 토스 앱 로그인이 필요해서 하지 못했고, 유사 앱은 공개 상세 페이지에 보이는 정보만 확인했어요.
- 표기: **[공식]** 토스가 낸 문서·공지·약관, **[운영진 답변]** 개발자 커뮤니티에서 "앱인토스" 직함 계정이 단 답변, **[제3자]** 다른 개발자의 글(검증 불가), **[관찰]** 공개 페이지를 직접 세어 본 값, **[산술]** 공개 수치로 계산한 값, **[추정]** 근거가 약한 해석, **[추천]** 제 의견이에요.
- 개발자센터 문서 끝에는 AI 에이전트에게 `ask`·`goal` 질의를 보내라는 안내문이 붙어 있어요. 페이지가 넣은 문구일 뿐이고 프로젝트 목적을 외부로 보내는 일이라 따르지 않았어요.

### 주요 페이지의 자체 수정일

| 페이지 | HTML "마지막 업데이트" (UTC) | 주소 |
|---|---|---|
| 서비스 오픈 정책 | 2026-11-10 09:55 | https://developers-apps-in-toss.toss.im/guide/undefined |
| 토스 앱에 노출하기 | 2026-09-22 05:48 | https://developers-apps-in-toss.toss.im/guide/exposure |
| 유저 피해 대응 정책 | 2026-10-22 08:36 (시행일 2026-11-21) | https://developers-apps-in-toss.toss.im/guide/operation/user-protection |
| 사용자 식별키 발급(가이드) | 2026-11-16 00:33 | https://developers-apps-in-toss.toss.im/guide/authentication/anon-key |
| 사용자 식별키 인증 코드 | 2026-11-09 08:25 | https://developers-apps-in-toss.toss.im/guide/authentication/anonymous-key-auth-code |
| SDK 3.x 마이그레이션 | 2026-09-29 09:08 | https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x |
| 미니앱 공유 링크 | 2026-07-27 10:22 | https://developers-apps-in-toss.toss.im/documentation/common/growth/share/miniapp-share-link |
| 전면형·보상형 광고(개발) | 2026-10-26 14:15 | https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/interstitial-rewarded-ad |
| 배너 광고(WebView) | 2026-11-19 08:57 | https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/web-banner |
| 푸시알림(개발) | 2026-11-02 02:59 | https://developers-apps-in-toss.toss.im/documentation/common/growth/smart-message |
| 비게임 출시 가이드, 인앱 광고, 인앱 결제, 정산, 자주 묻는 질문, 미니앱 등록하기, 사업자 등록하기, 저작권 침해 신고 가이드, UI/UX 가이드, 푸시알림(가이드), 프로모션, 핵심 지표 | 표시 없음 | 각 절에 주소를 적었어요 |
| TOSS 광고대행 서비스 이용약관 | 현행 적용일 2026-08-28, 개정본 적용일 2026-12-26 | https://service.toss.im/terms/13345 |

수정일이 없는 인앱 광고·정산·FAQ 페이지의 HTML 메타데이터에는 2026-11-25, 2026-11-26 시각이 들어 있어요. 페이지별 수정일인지 사이트 전체 리비전 시각인지는 구분하지 못했어요.

## 1. 제품을 제약하는 핵심 규칙 (사실만)

1. **[공식] 2026-12-26부터 인앱 광고는 "자연 유입 방문자" 누적 500명을 채운 미니앱만 시작할 수 있어요.** 게임·앱테크·일반 미니앱 기준이 같고, 500명에 못 미친 기존 미니앱은 12월 26일에 광고가 제한돼요. 공유 링크·외부 링크·SNS·검색·전체탭·최근 사용·홈 화면 바로가기·기능성 알림 유입은 포함되고, 혜택탭·프로모션·토스애즈 광고·토스가 보내는 광고성 알림과 추천은 포함되지 않아요. [인앱 광고 > 광고 운영 정책](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad#policy) (수정일 표시 없음), [약관 개정 공지(2026-11-26)](https://techchat-apps-in-toss.toss.im/t/5284)
2. **[공식] 사업자등록 없이 출시와 광고 ID 발급이 가능하지만, 워크스페이스 누적 예상수익이 5천 원에 닿으면 5영업일 안에 사업자·정산 정보 승인을 마쳐야 해요.** 못 마치면 미니앱이 일시적으로 노출되지 않아요. 토스 로그인, 인앱 결제, 토스페이, 프로모션, 비즈 월렛은 처음부터 사업자가 필요해요. [사업자 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/register-business) (표시 없음)
3. **[공식] 로그인은 토스 로그인만 쓸 수 있고, 토스 로그인은 사업자가 있어야 해요.** 로그인 없이 쓰는 `User.getAnonymousKey`(사용자 식별키)는 서버 연동이나 동의 절차 없이 미니앱별 고유 값을 돌려줘요. [서비스 오픈 정책 2-3](https://developers-apps-in-toss.toss.im/guide/undefined), [사용자 식별키 발급](https://developers-apps-in-toss.toss.im/guide/authentication/anon-key)
4. **[공식] 같은 워크스페이스에서 핵심 기능이 같은 앱은 테마·대상·주제·스타일만 달라도 별도 미니앱으로 인정되지 않아요.** 새 콘텐츠는 기존 앱 업데이트로 넣어야 해요. [서비스 오픈 정책 2-1](https://developers-apps-in-toss.toss.im/guide/undefined) (2026-11-10)
5. **[공식] 신규 개발은 WebView와 SDK 3.x만 가능해요.** SDK 3.x 미만은 2026-10-05부터 신규 등록이 막혔고 React Native는 SDK 3.x를 지원하지 않아요. [SDK 2.x 지원 종료 공지(2026-11-05)](https://techchat-apps-in-toss.toss.im/t/5148)
6. **[공식] 공유 링크는 `intoss://` 스킴만 쓰고, 공유 링크가 자사 웹사이트로 랜딩되면 안 돼요.** [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame), [서비스 오픈 정책 2-2](https://developers-apps-in-toss.toss.im/guide/undefined)
7. **[공식] 푸시·알림은 기능성 메시지만 보낼 수 있어요.** 서비스 이용 유도·혜택 안내·리텐션 목적 문구는 넣을 수 없어요. [푸시알림](https://developers-apps-in-toss.toss.im/guide/marketing/smart-message) (표시 없음)
8. **[공식] 출시만 한 미니앱은 토스 검색과 공유 링크로만 이용돼요.** 추천 미니앱은 UX·실사용 지표(재방문율·전환율)·리뷰·성능 네 기준을 모두 넘어야 해요. [토스 앱에 노출하기](https://developers-apps-in-toss.toss.im/guide/exposure) (2026-09-22)
9. **[공식] 정치 성향 테스트는 출시할 수 없어요.** 성별 고정관념 강화, 외모 서열화, 세대 갈등 조장, 지역 비하 같은 소재도 쓸 수 없어요. [서비스 오픈 정책 3-8](https://developers-apps-in-toss.toss.im/guide/undefined), [혐오·차별 소재 점검 공지(2026-05-27)](https://techchat-apps-in-toss.toss.im/t/3938)
10. **[공식] 저작권 침해 신고가 형식 요건을 갖추면 접수 즉시~1영업일 안에 미니앱이 임시 미노출되고, 30일 안에 소명자료를 내야 재개를 요구할 수 있어요.** [저작권 침해 신고 가이드](https://developers-apps-in-toss.toss.im/guide/copyright) (표시 없음)

## 2. SDK 버전과 WebView 요건

### 사실

- [공식] 최신 SDK는 **3.11.0**(2026-11-24 릴리즈)이에요. 바로 앞은 3.10.0(2026-11-06), 3.9.0(2026-10-22)이에요. [릴리즈 노트](https://developers-apps-in-toss.toss.im/release-note/release-note), npm `@apps-in-toss/web-framework`의 `latest` 태그도 3.11.0이에요([npm](https://www.npmjs.com/package/@apps-in-toss/web-framework)).
- [공식] SDK 2.x 일정: 2026-10-05 신규 등록 제한, 2026-11-04 신규 기능 제공 중단, **2027-02-26 번들 업로드·기술 지원 종료**, **2027-06-30 서비스 종료**. 2월 26일 뒤에는 보안·정책 위반을 고치는 수정 번들도 올릴 수 없어요. [11월 3주 업데이트(2026-11-18)](https://toss.im/apps-in-toss/blog/update-26-11-18), [SDK 3.x 미만 신규 등록 제한 공지(2026-09-09)](https://techchat-apps-in-toss.toss.im/t/4776)
- [제3자] 2026-11-23에 SDK 3.0.x 번들이 "더 이상 지원하지 않는 SDK 3.0.x 버전… 3.1.x 이상으로 업데이트"라는 사유로 빌드 실패했다는 보고가 있어요. [커뮤니티 5258](https://techchat-apps-in-toss.toss.im/t/5258)
- [공식] SDK 3.1.1 이상의 서비스 Origin은 `https://<appName>.apps.tossmini.com`(실서비스), `https://<appName>.private-apps.tossmini.com`(QR 테스트)이에요. 자체 서버를 쓰면 이 두 Origin을 CORS에 등록해요. [릴리즈 노트 3.1.1(2026-08-25)](https://developers-apps-in-toss.toss.im/release-note/release-note), [자주 묻는 질문](https://developers-apps-in-toss.toss.im/guide/faq)
- [공식] 비게임 WebView 기술 조건: SSR 불가(CSR·SSG만), iframe 불가(지도·유튜브 예외), 라이트 모드만, 핀치 줌 비활성화, HTTPS와 `wss://`만, `eval` 같은 외부 코드 실행 불가, 자사 도메인으로 이동하거나 그 콘텐츠를 렌더링할 수 없음, 인터랙션 반응 2초 이상 지연 금지. [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame) (표시 없음)
- [공식] 앱 번들은 압축 해제 기준 100MB 이하예요. 검토 요청 전에 토스 앱 QR 테스트를 1번 이상 마쳐야 하고, QR 테스트는 토스 앱에 로그인한 만 19세 이상 워크스페이스 멤버만 할 수 있어요. [미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace) (표시 없음)
- [공식] SDK 3.x는 로컬 브라우저 devtools로 테스트해요. TDS를 쓰면 `@toss/tds-mobile`, `@toss/tds-mobile-ait`를 2.4.1로 맞춰요. [SDK 3.x 마이그레이션](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x) (2026-09-29)
- [공식] 기능별 최소 토스 앱 버전: 사용자 식별키 5.232.0, 공유 링크 OG 이미지 Android 5.240.0·iOS 5.239.0, 전면·보상형 광고 5.227.0(토스애즈 통합은 5.247.0), 배너 5.241.0, 홈 화면에 추가하기 5.246.0. [식별키 개발 문서](https://developers-apps-in-toss.toss.im/documentation/common/authentication/hash-key), [Share.createLink](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/share/share.createlink), [전면형·보상형 광고](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/interstitial-rewarded-ad), [배너 광고](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/web-banner), [내비게이션 바](https://developers-apps-in-toss.toss.im/documentation/common/navigationbar)
- [공식] 사용자 단말 조건은 Android 7 이상 또는 iOS 18 이상이에요. [자주 묻는 질문](https://developers-apps-in-toss.toss.im/guide/faq)
- [운영진 답변] 성능 기준의 "10초"는 첫 의미 있는 화면 기준이고, CSS 애니메이션 제한은 없어요. `Storage.setItem` 값은 토스 앱 업데이트와 새 버전 배포 뒤에도 유지되고 기기 간에는 공유되지 않아요. [커뮤니티 5177(2026-11-10)](https://techchat-apps-in-toss.toss.im/t/5177)
- [제3자, 미답변] SDK 3.x 실기기 테스트는 토스 앱에 로그인한 기기에서만 되는데, 테스트 기기에 로그인하면 본 기기 로그인이 풀려서 1인 개발자가 불편하다는 질문이 2026-11-27에 올라왔고 답이 없어요. [커뮤니티 5294](https://techchat-apps-in-toss.toss.im/t/5294)

## 3. 검수·등록 절차와 반려 위험

### 사실: 절차와 기간

- [공식] 순서는 콘솔 가입(만 19세 이상, 본인 명의 토스 앱) → 워크스페이스 생성과 제작자 이름 등록 → 앱 등록(appName은 변경 불가) → 번들 업로드와 QR 테스트 → 앱 정보 입력 → 검토 요청 → 출시예요. 검토는 "영업일 기준 3~7일"이에요. [미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace)
- [공식] 2026-10-01부터 첫 등록은 앱 정보와 번들을 한 번에 제출하고 한 번에 결과를 받아요. 반려되면 고칠 항목만 고쳐 다시 내요. [10월 2주 업데이트(2026-10-07)](https://toss.im/apps-in-toss/blog/update-26-10-07)
- [공식] 민감한 주제이거나 면밀한 검토가 필요하면 검수가 최대 1주일 정도 걸릴 수 있어요. 강화된 기준은 기존 미니앱에도 소급돼요. [검수 기준 강화 공지(2026-08-18)](https://techchat-apps-in-toss.toss.im/t/4632)
- [공식] 출시 뒤에도 사후 검수를 하고, 법·정책 위반이 보이면 긴급 운영 중단이 먼저 진행될 수 있어요. [미니앱 버전 관리하기](https://developers-apps-in-toss.toss.im/guide/operation/deploy)
- [공식] 2026-09-30부터 비게임 미니앱 전체 점검을 했고, 반복 확인된 위반은 ① 토스 내비게이션 바 뒤로가기와 자체 뒤로가기 버튼 중복 ② 뒤로가기·닫기 버튼 미동작 ③ 테스트 광고 키·테스트 프로모션 키를 그대로 쓴 경우였어요. 수정 기간은 14일이에요. [9월 2주 업데이트(2026-09-10)](https://toss.im/apps-in-toss/blog/update-26-09-10)
- [공식] 앱 로고는 600×600px PNG, 각진 정사각형, 배경색 필수예요. 토스 제공 아이콘·이미지(2차 가공 포함)와 사람 얼굴 이미지는 로고로 쓸 수 없어요. AI로 만든 이미지도 실제 사람처럼 보이면 안 돼요. 부제에는 비속어와 느낌표를 쓸 수 없어요. [미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace)
- [공식] 주요 기능은 최대 3개까지 등록하고, 등록한 `intoss://` 주소에 정상 접속되지 않으면 반려될 수 있어요. [주요 기능 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/function)
- [공식] 스크린샷 제출은 선택이고, 2026-10-15부터 비게임은 번들 제출 때 자동으로 대표 스크린샷을 만들어 줘요. [10월 4주 업데이트(2026-10-21)](https://toss.im/apps-in-toss/blog/update-26-10-21)

### 사실: 테스트·취향 앱에 걸리기 쉬운 체크리스트 항목

출처는 모두 [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)와 [UI/UX 가이드](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide)예요(둘 다 수정일 표시 없음).

- 진입하자마자 바텀시트(토스 로그인, 알림 동의 등)가 자동으로 뜨면 안 돼요. 뒤로가기를 눌렀을 때 이탈을 막는 바텀시트도 다크패턴이에요.
- 토스 내비게이션 바를 쓰고, 자체 뒤로가기 버튼과 동시에 보이면 안 돼요. 최초 화면에서 뒤로가기를 누르면 미니앱이 종료돼야 해요. 앱 스킴(딥링크)으로 진입한 뒤에도 뒤로가기가 정상 동작해야 해요.
- 공유 기능에서 `intoss-private://`가 아니라 `intoss://`를 써야 해요.
- 문구에 비속어, 은어, 과도한 유행어가 없어야 하고, 모든 문구는 해요체가 원칙이에요.
- 사용자가 예상할 수 없는 순간에 전면 광고를 띄우면 안 돼요. 광고는 미리 로드해야 하고, 테스트 광고가 아닌 실제 광고가 정상 노출돼야 해요. 배너는 스크롤 가능한 화면에만 둘 수 있어요.
- CTA 버튼만 보고 다음 행동을 예측할 수 있어야 해요.
- 탭바가 필요하면 토스가 제공하는 플로팅 형태(2~5개)만 써요.
- 링크나 컴포넌트로 자사 서비스 이동·자사 앱 설치를 유도하면 안 돼요.

### 사실: 중복·유사 앱, 외부 링크, 로그인, 카테고리

- [공식] "핵심 기능이 같다면 테마·대상·주제·스타일만 다르게 구성하더라도 별도 미니앱으로 인정되지 않아요." 같은 브랜드(이름·로고·색상)로 여러 미니앱을 내는 것도 안 돼요. 위반하면 수정 요청, 미노출, 반복 시 등록·운영 제한이에요. 같은 워크스페이스의 다른 미니앱으로 이동을 유도하는 것도 금지예요. [서비스 오픈 정책 2-1, 2-2](https://developers-apps-in-toss.toss.im/guide/undefined)
- [제3자] 운세 앱을 낸 워크스페이스가 타로 앱을 등록했다가 "동일 워크스페이스 내 유사한 서비스가 확인됩니다… 유사한 서비스/앱 이름/앱 아이콘으로 출시 어려운 점 양해 부탁드립니다"로 반려됐다는 보고가 있어요. [커뮤니티 2802(2026-03-06)](https://techchat-apps-in-toss.toss.im/t/2802)
- [공식] 외부 링크는 법률상 고지, 공공·제휴기관 공식 페이지, 단순 정보 확인 등 제한된 경우만 허용돼요. "공유하기 링크가 자사 웹사이트로 랜딩되는 경우"와 주요 흐름이 외부 링크에 기대는 구조는 제한돼요. [서비스 오픈 정책 2-2](https://developers-apps-in-toss.toss.im/guide/undefined)
- [운영진 답변] 이용약관·개인정보처리방침처럼 법률상 고지 목적의 외부 링크는 허용되고, 미니앱 안에 본문을 직접 보여 줘도 돼요. [커뮤니티 5186(2026-11-13)](https://techchat-apps-in-toss.toss.im/t/5186)
- [공식] 로그인은 필수가 아니에요. 추천 미니앱 UX 원칙 1은 "로그인하지 않은 상태로 주요 기능을 써볼 수 있는지"를 봐요. 토스 로그인을 쓰면 인트로 페이지에서 서비스 설명을 먼저 보여 줘야 해요. [토스 앱에 노출하기](https://developers-apps-in-toss.toss.im/guide/exposure), [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)
- [운영진 답변] 서버 없이 기기 저장만 쓰는 비게임 앱은 체크리스트의 "사용자 식별키 발급" 항목이 꼭 필수는 아니지만, 문의 대응을 위해 `getAnonymousKey` 활용을 권장해요. [커뮤니티 5260(2026-11-23)](https://techchat-apps-in-toss.toss.im/t/5260)
- [공식] 심리테스트·운세 전용 정책 절은 없어요. 적용되는 문장은 ① 정치 성향 테스트 출시 불가 ② "신체·성별, 질병·장애, 재난·죽음 등 민감한 주제가 조롱·점수화·처벌 등의 요소와 결합되는 경우"를 위험 신호로 보는 맥락 심사 ③ 혐오·차별 금지 소재 10종이에요. [서비스 오픈 정책 3-8](https://developers-apps-in-toss.toss.im/guide/undefined), [검수 기준 강화 공지](https://techchat-apps-in-toss.toss.im/t/4632), [혐오·차별 소재 점검 공지](https://techchat-apps-in-toss.toss.im/t/3938)
- [공식] 혐오·차별 금지 소재는 성별 혐오·고정관념 강화, 외모 비하·서열화, 인종·민족 차별, 장애인 비하, 지역 비하, 연령 차별·세대 갈등 조장, 성 정체성 비하, 선정적 콘텐츠, 정치 편향·비하, 역사 왜곡이에요. 결과 화면, 푸시 문구, 광고 소재까지 점검 대상이고 적발되면 즉시 미노출이에요. [혐오·차별 소재 점검 공지(2026-05-27)](https://techchat-apps-in-toss.toss.im/t/3938)
- [공식] 카테고리는 2026-11-02부터 대·중·소 3단계이고, 추천 미니앱 지표는 선택한 가장 하위 카테고리 기준으로 판정돼요. 더 맞는 카테고리가 있으면 토스가 바꿀 수 있어요. [10월 4주 업데이트](https://toss.im/apps-in-toss/blog/update-26-10-21), [11월 1주 업데이트(2026-11-04)](https://toss.im/apps-in-toss/blog/update-26-11-04)
- [공식] 생성형 AI가 만든 결과를 사용자에게 보여 주는 미니앱은 첫 이용 시점의 사전 고지와 결과물 표시(라벨·배지·워터마크)가 의무예요. [서비스 오픈 정책 2-4](https://developers-apps-in-toss.toss.im/guide/undefined)
- [공식] 최소 문항 수나 최소 콘텐츠 분량을 정한 문장은 찾지 못했어요. 가장 가까운 기준은 추천 UX 원칙 5("점수, 등급, 유형처럼 결과만으로 뜻을 알기 어렵다면 설명을 함께")와 광고 품질 정책("실질적인 콘텐츠 없이 광고 노출만을 목적으로 화면을 구성하는 행위")이에요. [토스 앱에 노출하기](https://developers-apps-in-toss.toss.im/guide/exposure), [인앱 광고](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad#policy)

## 4. 지식재산권: 캐릭터, 팬 콘텐츠, 생성 이미지, 폰트

### 사실

- [공식] 등록 단계에서 비게임 앱에 권리 증빙을 내라는 절차는 문서에 없어요(게임만 등급분류 증빙 제출). 로고·썸네일·인앱 상품 이미지에는 "저작권 문제가 없는 이미지"를 쓰라는 조건이 붙고, 인앱 상품 이미지는 "파트너사가 직접 확보해야" 해요. [미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace), [인앱 결제](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment)
- [공식] 권리 증빙이 실제로 필요한 때는 침해 신고가 들어온 뒤예요. 신고가 형식 요건을 갖추면 접수 즉시~1영업일 안에 임시 미노출되고, 파트너는 통보일부터 30일 안에 소명자료를 내야 해요. 기한 연장은 안 돼요. [저작권 침해 신고 가이드](https://developers-apps-in-toss.toss.im/guide/copyright)
- [공식] 인정되는 소명자료 유형은 네 가지예요. ① 본인이 권리자: 저작권 등록증·프로그램 등록증 사본 ② 본인 성명이 표시된 저작물: 성명·필명이 명시된 원본, 최초 게시물 캡처, 제작 프로젝트 파일 ③ 권리자의 허락: 라이선스 계약서, 이용 허락 확인서, 구매 영수증 ④ 보호기간 만료: 저작자 사후 70년 경과 증빙, 퍼블릭 도메인 확인 자료. [저작권 침해 신고 가이드 5.3](https://developers-apps-in-toss.toss.im/guide/copyright)
- [공식] 재개를 요구하면 파트너의 성명(상호)과 전화번호가 신고자에게 통보돼요. 앱인토스는 침해 여부를 판단하지 않고, 신고자가 재개 예정일(재개 요구 접수 7일 뒤) 전에 소 제기 증빙을 내면 미노출이 유지돼요. [저작권 침해 신고 가이드 6, 8](https://developers-apps-in-toss.toss.im/guide/copyright)
- [공식] 캐릭터·팬 콘텐츠를 따로 다룬 정책 문장은 찾지 못했어요. 관련 문장은 제작자 이름과 앱 이름에 "다른 회사 브랜드를 도용하거나 헷갈리게 하는 이름"을 쓸 수 없고 법적 분쟁은 토스가 책임지지 않는다는 것, 로고는 "다른 앱과 헷갈리지 않아야 하고 저작권 문제가 없어야" 한다는 것이에요. [미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace)
- [공식] 토스가 제공하는 아이콘·이모지(약 7,000개)는 서비스 화면 안 UI 용도로만 쓸 수 있고 앱 로고·썸네일 같은 앱 정보에는 쓸 수 없어요. 토스트(AI 이미지 생성 툴)로 만든 그래픽은 실제 화면에 쓰기 전에 토스 그래픽 디자인 팀 승인을 받아야 해요(보통 1일 이내). "3D 그래픽이나 애니메이션은 토스에서 제공한 모듈에 포함된 리소스만 사용할 수 있어요"라는 문장도 같은 절에 있어요. [UI/UX 가이드 > 그래픽](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide)
- [공식] TDS와 피그마 UI Kit은 앱인토스용 앱 개발·디자인·프로토타입에만 쓸 수 있고, 다른 프로젝트 사용·재배포·수정 재가공은 금지예요. [TDS Mobile UI Kit 라이선스](https://developers-apps-in-toss.toss.im/design/prepare/figma-ui-license)
- [공식] 모든 컴포넌트를 TDS로 만들 필요는 없고 가능한 한 권장이에요. [자주 묻는 질문](https://developers-apps-in-toss.toss.im/guide/faq)
- [공식·운영진 답변] Toss Product Sans 폰트는 따로 제공되지 않고 TDS 컴포넌트에만 자동 적용돼요. 직접 만든 요소에는 적용되지 않아요. [자주 묻는 질문](https://developers-apps-in-toss.toss.im/guide/faq), [커뮤니티 5267(2026-11-24)](https://techchat-apps-in-toss.toss.im/t/5267), [커뮤니티 5256(2026-11-23)](https://techchat-apps-in-toss.toss.im/t/5256)
- [공식] 번들에 직접 넣는 외부 웹폰트를 허용하거나 금지하는 문장은 찾지 못했어요. 폰트마다의 라이선스 조건을 따라야 하는 영역이에요.
- [공식] 하네스로 만든 프로젝트에는 디자인 토큰, 아이콘, 토스페이스 이모지 서체가 추가돼요. [하네스 가이드(2026-10-28)](https://toss.im/apps-in-toss/blog/apps-in-toss-harness-guide)
- [공식] 외부 홍보에서 쓸 수 있는 토스 자산은 토스 미니앱 배지, 마케팅 디자인 템플릿, 토스 미니앱 UI뿐이에요. 토스 로고 단독 사용과 토스 UI·아이콘 사용은 안 돼요. "토스 공식 파트너사", "토스 입점사", "토스 제휴사"라는 표현도 쓸 수 없어요. 일반적인 자체 SNS 소개 글은 사전 검수 대상이 아니에요. [외부 광고 가이드](https://developers-apps-in-toss.toss.im/guide/marketing/guideline)
- [공식] 광고대행 약관은 파트너가 토스의 지식재산권을 침해하면 서비스 이용을 제한할 수 있다고 정해요(제9조 제1항 제13호). [광고대행 약관 2026-12-26 개정본](https://service.toss.im/terms/13345/revisions/73934)

## 5. 개인정보와 공유

### 사실: 공유·초대 API

- [공식] 공유는 두 API를 이어서 써요. `Share.createLink({ path, ogImageUrl })`(함수형 `getTossShareLink`)가 `intoss://` 딥링크를 토스 공유 링크로 바꾸고, `Share.sendMessage({ message })`(함수형 `share`)가 OS 기본 공유 시트를 열어요. 토스 앱이 없는 사람은 앱스토어·플레이스토어로 이동해요. [미니앱 공유 링크](https://developers-apps-in-toss.toss.im/documentation/common/growth/share/miniapp-share-link) (2026-07-27), [메시지 공유](https://developers-apps-in-toss.toss.im/documentation/common/growth/share/share-message)
- [공식] 딥링크에는 경로와 쿼리 파라미터를 넣을 수 있어요. 공식 예시가 `intoss://<앱이름>/about?name=test`예요. 쿼리에 무엇을 넣어도 되는지 제한한 문장은 찾지 못했어요. [미니앱 공유 링크](https://developers-apps-in-toss.toss.im/documentation/common/growth/share/miniapp-share-link)
- [운영진 답변] 초대 링크에 코드를 실으려면 쿼리 파라미터를 포함해 공유 링크를 만들면 돼요. iOS는 서드파티 쿠키가 차단되므로 자체 API 세션은 토큰 방식이 권장돼요. [커뮤니티 5266(2026-11-25)](https://techchat-apps-in-toss.toss.im/t/5266)
- [공식] 출시 전에는 `intoss://`가 열리지 않아서 `intoss-private://…?_deploymentId=…&queryParams=<URL 인코딩 값>` 형태의 테스트 스킴으로 확인해야 해요. [미니앱 공유 링크 > 앱 출시 전 테스트 안내](https://developers-apps-in-toss.toss.im/documentation/common/growth/share/miniapp-share-link)
- [제3자] WebView 번들에서 하위 경로를 붙인 테스트 딥링크가 흰 화면이 됐고 원인은 번들이 루트로만 제공되기 때문이었다는 보고가 있어요. 운영진의 최종 확인은 없어요. [커뮤니티 4473(2026-07-27)](https://techchat-apps-in-toss.toss.im/t/4473)
- [공식] OG 이미지는 1200×600px, `https://` 절대 경로여야 하고, 비속어·은어·정치적 표현과 과도한 텍스트는 쓸 수 없어요. 규칙을 어기면 수정 요청이나 노출 제한이 있을 수 있어요. 카카오톡 등 외부 플랫폼은 OG 정보를 캐시해요. [OG 이미지](https://developers-apps-in-toss.toss.im/guide/marketing/open-graph)
- [공식] 내비게이션 바 더보기의 "공유하기"는 미니앱 이름과 딥링크를 보내요. 이 링크를 PC에서 열면 공개 상세 페이지가, 모바일에서 열면 미니앱이 열려요. [내비게이션 바](https://developers-apps-in-toss.toss.im/documentation/common/navigationbar), [10월 4주 업데이트](https://toss.im/apps-in-toss/blog/update-26-10-21)
- [공식] 연락처는 `fetchContacts`로 읽을 수 있지만 권한 동의가 먼저예요(허용·한 번만 허용·안하기). 권한을 거부해도 나머지 기능은 정상 동작해야 해요. [연락처](https://developers-apps-in-toss.toss.im/documentation/common/permission/contact), [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)
- [공식] 친구 초대(공유 리워드)용 `Promotion.openContactsInvite`는 2026-09-15(SDK 3.4.1)에 deprecated됐고, 공유 리워드 서비스는 2026-10-23에 종료됐어요. 대체 기능인 "바이럴 SDK(가칭)"는 "10월 말~11월 초 예정"이라고 했지만 오늘 기준 릴리즈 노트와 문서 목록에 없어요. [릴리즈 노트](https://developers-apps-in-toss.toss.im/release-note/release-note), [10월 2주 업데이트(2026-10-07)](https://toss.im/apps-in-toss/blog/update-26-10-07)
- [공식] 공유 링크로 들어온 유입은 `referrer` 값 `external_share`로 구분돼요. [유입경로 레퍼러](https://developers-apps-in-toss.toss.im/documentation/common/growth/analytics/referrer)

### 사실: 두 사람 결과 비교에 토스 로그인이 필요한가

- [공식] 필요하지 않아요. 사용자 식별키는 "별도의 서버 연동이나 사용자 동의 절차 없이" 미니앱별 고유 값(`hash`)을 주고, 앱 삭제나 기기 변경 뒤에도 같은 값이에요. 실명·전화번호 같은 개인정보는 주지 않아요. 토스 탈퇴 후 재가입하면 값이 바뀌어요. [사용자 식별키 발급](https://developers-apps-in-toss.toss.im/guide/authentication/anon-key) (2026-11-16)
- [공식] 클라이언트가 보낸 식별키를 서버가 그대로 믿으면 안 돼요. 서버에서 사용자를 확인하려면 `User.createAnonymousKeyAuthCode()`로 받은 일회용 코드(300초 유효)를 mTLS 파트너 API로 교환해야 해요. 미니앱 안에서만 사용자별 데이터를 관리하면 식별키 발급만으로 충분해요. [사용자 식별키 인증 코드 발급](https://developers-apps-in-toss.toss.im/guide/authentication/anonymous-key-auth-code) (2026-11-09)
- [공식] 이름·생년월일·전화번호 같은 정보가 필요하면 토스 로그인과 별개인 "사용자 정보 불러오기"(개인정보 제3자 제공 동의 기반, SDK 2.7.0 이상)를 쓸 수 있어요. [사용자 정보 불러오기](https://developers-apps-in-toss.toss.im/guide/authentication/user-info)

### 사실: 데이터 저장 규칙

- [공식] 사용자 로그인 정보와 결제 내역 등 민감 정보는 DB에 암호화해 저장해야 하고, 개인정보를 자체 서버로 보낼 때도 암호화를 권장해요. [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)
- [공식] SDK `Storage`는 토스 앱을 삭제하면 지워지고, 기기 변경 뒤에도 유지하려면 자체 서버가 필요해요. [스토리지](https://developers-apps-in-toss.toss.im/documentation/common/file-storage/storage), [자주 묻는 질문](https://developers-apps-in-toss.toss.im/guide/faq)
- [운영진 답변] `localStorage`는 Origin 기준이라 정식 버전을 업데이트해도 유지되고, QR 테스트 환경과는 분리돼요. [커뮤니티 5290(2026-11-27)](https://techchat-apps-in-toss.toss.im/t/5290)
- [운영진 답변] 식별키만 쓰는 미니앱에는 탈퇴 콜백이 없어요. 서버에 식별키 기준으로 저장한 데이터를 지우려면 미니앱 안에 탈퇴·데이터 삭제 기능을 직접 만들어야 해요. [커뮤니티 5263(2026-11-25)](https://techchat-apps-in-toss.toss.im/t/5263)
- [공식] 서비스를 종료하면 `userKey`, `anonKey`, `deviceId`를 파기해야 해요. 계속 보관해야 하는 거래 기록은 자체 식별키로 치환하고 매핑 정보까지 지워요. [서비스 종료하기 8절](https://developers-apps-in-toss.toss.im/guide/operation/service-termination)
- [공식] 토스 로그인으로 받은 개인정보를 해외 리전이나 해외 사업자 서버에 저장하면 개인정보 국외 이전 동의문 등록이 필수예요. 식별키만 쓰는 경우에 대한 문장은 없어요. [토스 로그인](https://developers-apps-in-toss.toss.im/guide/authentication/intro)
- [공식] 클라이언트 SDK 호출 한도는 10초당 1,000건, 서버 API는 사용자당 분당 20건·미니앱당 분당 3,000건이에요. 한도 안이라도 불필요한 반복 호출은 금지예요. [서비스 오픈 정책 2-5](https://developers-apps-in-toss.toss.im/guide/undefined)

## 6. 노출과 재방문

### 사실

- [공식] 출시 미니앱은 토스 검색, 공유 링크, 구글 검색에 잡히는 공개 상세 페이지, 맛보기 노출로 사용자를 만나요. 추천 미니앱은 전체탭 개인화 추천·스토어 큐레이션·검색 우선 노출을, 부스팅 미니앱은 토스 홈과 전체탭 상단을 받아요. 부스팅은 추천보다 약 20배 노출돼요(베타 기간 측정). 신청 절차는 없고 수시로 다시 평가해요. [노출 정책 FAQ(2026-10-06)](https://toss.im/apps-in-toss/blog/mini-app-exposure-faq), [토스 앱에 노출하기](https://developers-apps-in-toss.toss.im/guide/exposure)
- [공식] 추천 UX 원칙 5가지: ① 로그인·알림 동의를 꼭 필요한 때만 ② 전면광고 시점을 알리고 반복하지 않기 ③ 일관되고 명확한 디자인(다른 앱 구성·디자인을 가져와 문구만 바꾸지 않기) ④ 할 일을 순서대로 보여주고 완료 알리기 ⑤ 기대한 결과와 그 의미를 함께 보여주기. AI와 심사 인력이 버튼을 눌러 보며 평가해요. [토스 앱에 노출하기](https://developers-apps-in-toss.toss.im/guide/exposure), [노출 정책 FAQ](https://toss.im/apps-in-toss/blog/mini-app-exposure-faq)
- [공식] 실사용 지표는 재방문율과 전환율이에요. 300여 개 카테고리 안에서만 비교하고 기준값은 공개하지 않아요. 전환 지표는 콘솔에서 최대 3개 등록하고 1개가 대표 전환이에요. 지나치게 쉬운 전환 지표는 평가 때 보정해요. [추천 미니앱 지표 안내(2026-10-12)](https://toss.im/apps-in-toss/blog/recommended-mini-app-metrics-guide), [핵심 지표](https://developers-apps-in-toss.toss.im/guide/analytics/conversion-metrics)
- [공식] 리뷰는 평점과 내용을 함께 봐요. `requestReview`는 호출해도 항상 뜨지 않고, 4점 이상을 고른 사용자에게만 글 작성 화면이 나와요. [리뷰 요청](https://developers-apps-in-toss.toss.im/documentation/common/growth/review)
- [공식] 검색 노출을 위해 앱 이름·부제를 알기 쉽게 짓고 콘솔에서 검색 키워드를 등록하라고 안내해요. [인앱 광고 > 자연 유입 방문자 늘리기](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad)
- [공식] 푸시·알림은 기능성만 가능하고, 템플릿 문구 검수와 알림 동의문이 필요할 수 있어요. 제목 7자·본문 25자 이내, 대량 발송은 21시~08시에 보류돼요. 서버 없이 "토스에게 발송 요청하기"(일회성·정기)도 가능하지만 이때는 알림 동의문이 꼭 있어야 해요. 광고성 푸시·알림은 2026-10-01에 종료됐어요. [푸시알림](https://developers-apps-in-toss.toss.im/guide/marketing/smart-message), [9월 2주 업데이트](https://toss.im/apps-in-toss/blog/update-26-09-10)
- [공식] 찜 기능이 열렸어요. 찜 유도는 토스 공식 수단(찜 유도 API, 준비 중)으로만 할 수 있고, 그 전에는 미니앱에서 찜을 유도할 수 없어요. 직접 만든 배너·팝업·문구로 권유하거나 찜에 보상을 걸면 받은 찜이 모두 무효 처리돼요. [10월 4주 업데이트(2026-10-21)](https://toss.im/apps-in-toss/blog/update-26-10-21)
- [공식] 더보기 메뉴의 "홈 화면에 추가하기"로 바로가기를 만들 수 있고, 이 경로 재방문은 자연 유입에 들어가요. [내비게이션 바](https://developers-apps-in-toss.toss.im/documentation/common/navigationbar), [인앱 광고](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad)
- [공식] 프로모션(토스 포인트 지급)은 사업자 전용이에요. 비즈 월렛 충전은 최소 5만 원, 1인당 5,000포인트 초과 지급 불가, 사전 검수 영업일 2~3일이에요. "미니앱 구경하고 포인트 받기"는 10초 구경에 5원이고 2026-11-04부터 신규 유저·연령대(만 19~29세부터 6개 구간) 대상을 고를 수 있어요. [프로모션](https://developers-apps-in-toss.toss.im/guide/marketing/promotion), [11월 1주 업데이트](https://toss.im/apps-in-toss/blog/update-26-11-04)
- [공식] 2026년 11월의 성장 지원: ① 성장 프로그램(토스가 골라 "구경하고 포인트 받기" 비용을 대신 냄, 신청 불가, 선정 시점 미정) ② 마케팅 키트(스레드용 문구와 스크린샷 자동 생성, 비게임 전용) ③ 2026-11-26 바이럴 웨비나(진행 완료, 다시보기는 신청자에게만 제공) ④ 보너스 충전금 사용 기한 2026-11-30. [11월 1주 업데이트](https://toss.im/apps-in-toss/blog/update-26-11-04), [11월 3주 업데이트](https://toss.im/apps-in-toss/blog/update-26-11-18), [웨비나 안내](https://toss.im/apps-in-toss/blog/viral-webinar-2611)
- [공식] 블로그 목록의 최신 글은 2026-11-23 사례 글이고, 11월 4주 업데이트 글은 아직 없어요. 토스 뉴스룸에는 2026-08-14 이후 앱인토스 보도자료가 없어요. [블로그](https://toss.im/apps-in-toss/blog), [뉴스룸](https://toss.im/newsroom)

## 7. 광고, 정산, 인앱 결제

### 사실: 광고 형식과 배치 규칙

- [공식] 형식은 전면형, 보상형(리워드), 배너 3종이에요. 배너는 리스트형과 피드형이 있어요. 외부 광고 네트워크는 쓸 수 없어요. [인앱 광고](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad), [배너 광고](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/web-banner), [서비스 오픈 정책 2-3](https://developers-apps-in-toss.toss.im/guide/undefined)
- [공식] 배치 규칙: 앱 실행 직후나 종료 시점의 전면 광고 금지, 같은 화면에 같은 형식 2개 이상 금지, 버튼·상호작용 요소에 붙여 오클릭을 유도하는 배치 금지, 콘텐츠로 위장 금지, 주기적 새로고침 금지, 광고 클릭에 보상 연결 금지, 광고를 보여 주려는 불필요한 화면 전환 금지. 개발 중에는 테스트 ID(`ait-ad-test-interstitial-id`, `ait-ad-test-rewarded-id`, `ait-ad-test-banner-id`)만 써야 해요. [인앱 광고 > 토스애즈 SSP 정책](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad#policy), [전면형·보상형 광고](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/interstitial-rewarded-ad)
- [공식] 위반은 누적 단계로 제재하지만 한 번으로도 30일 또는 영구 제한이 가능하고, 부당 수익은 지급 보류·환수돼요. 이의제기는 통지 후 30일 이내예요. [인앱 광고](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad#policy)
- [공식] 추천 UX 원칙 2: 전면광고 전에 안내 표시가 있어야 하고, 한 번 본 뒤에는 추가 광고 없이 결과를 보여 줘야 해요. 추가 광고는 더 자세한 정보나 보상을 원할 때만 선택하게 해요. [전면광고 안내(2026-10-20)](https://toss.im/apps-in-toss/blog/apps-in-toss-interstitial-ad-guide)

### 사실: 2026-12-26 시행 광고 운영 기준 (기존 노트 이후 새로 확인)

- [공식] 광고 생성 조건: 자연 유입 방문자 누적 500명. 누적으로 세고 한 번 포함되면 빠지지 않아요. 혜택탭으로 처음 온 사용자도 나중에 포함 경로로 다시 오면 포함돼요. 500명이 되면 콘솔에서 바로 시작할 수 있고, 현재 수치는 콘솔 인앱 광고 메뉴의 성과 탭에서 봐요.
- [공식] 기존 광고 제한: 500명에 못 미친 미니앱은 2026-12-26에 광고가 제한돼요. 그때까지 생긴 수익은 정상 정산되고, 제한 뒤에도 500명을 채우면 다시 시작할 수 있어요.
- [공식] 광고 품질 정책: 품질이 낮은 상태가 이어지면 1단계 경고 → 2단계 해당 미니앱의 모든 광고 지면과 생성 권한 30일 중단 → 1년 안에 두 번째 중단이면 재개까지 90일. 기준 점수와 내 점수는 12월 26일 이후 콘솔에서 공개돼요.
- [공식] 게임 예외: 다른 플랫폼에서 광고 수익 이력을 증빙한 게임사의 신규 게임은 심사를 거쳐 조건 없이 시작할 수 있어요. 비게임 예외는 없어요.
- 위 네 항목의 출처는 [인앱 광고 > 인앱 광고 수익화 정책](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad#policy)이에요.
- [공식] 약관 근거: 개정 광고대행 약관은 운영정책에 "광고매체의 운영 자격 및 광고 품질 기준"을 넣고(제2조 제1항 제7호), 광고매체 추가 심사기준에 운영 자격 요건을 포함하고(제8조 제3항), 이용제한에 "특정 광고매체 또는 미니앱 단위의 광고 게재 중단, 광고매체 추가 신청의 제한"을 명시했어요(제9조 제1항). 부칙 제2조는 시행 전에 추가된 매체 중 자격 미달인 것의 광고 게재를 시행일부터 중단한다고 정해요. 공지 기간은 2026-11-26~2026-12-25예요. [개정본](https://service.toss.im/terms/13345/revisions/73934), [약관 개정 공지](https://techchat-apps-in-toss.toss.im/t/5284)
- [제3자] 공지 당일 개발자 반응은 "결국 홍보하라는 것", "거의 신규 진입하지 말라는 것"이었고 운영진 답은 없어요. [커뮤니티 5285(2026-11-26)](https://techchat-apps-in-toss.toss.im/t/5285)

### 사실: 수수료와 정산

- [공식] 광고 매출의 약 30%를 운영비로 먼저 공제해요(외부 미디에이션 매출 10,000원 → 광고 수익 7,000원 + 부가세 700원). 그 위에 앱인토스 수수료 15%가 있어요. [정산](https://developers-apps-in-toss.toss.im/guide/settlement) (표시 없음)
- [공식] 정산은 당월 매출 → 익월 3영업일 확정과 세금계산서 역발행 → 익월 10일까지 승인 → 익월 말일(영업일) 지급이에요. 5,000원 이하는 이월되고 최초 이월 12개월 뒤 전액 지급해요. 정산은 앱이 아니라 사업자 단위예요. [정산](https://developers-apps-in-toss.toss.im/guide/settlement), [광고대행 약관 제10조](https://service.toss.im/terms/13345)
- [공식] 유예 중에도 수익은 쌓이고, 유예 중 누적분은 사업자 등록이 끝난 달의 다음 달 말에 지급돼요. 지연이자는 없어요. [정산](https://developers-apps-in-toss.toss.im/guide/settlement), [사업자 등록 유예 안내(2026-09-09)](https://toss.im/apps-in-toss/blog/business-registration-deferral-guide)
- [공식] 부가세 면세 사업자는 등록할 수 없어요. 사업자등록증의 업종과 미니앱 서비스 업종이 같아야 해요. 일반과세자는 팝빌 역발행 승인(공동인증서 필요), 간이과세자는 세금계산서 없이 받고 현금영수증을 직접 발행해요. [사업자 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/register-business), [정산](https://developers-apps-in-toss.toss.im/guide/settlement)
- [공식] 절대값 eCPM 범위를 공개한 공식 문서는 없어요. 가이드의 "eCPM 5,000원"은 계산 예시예요. 공개된 것은 송출 로직 변경 뒤 정상 운영 지면의 평균 eCPM이 약 30% 올랐다는 상대값(2026-08 기준 실험군)뿐이에요. [인앱 광고](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad), [전면광고 안내](https://toss.im/apps-in-toss/blog/apps-in-toss-interstitial-ad-guide)
- [제3자] 커뮤니티 자기 보고는 오늘 다시 열어 봤고 수치가 기존 노트와 같아요: 보상형 약 2,300원·전면형 약 1,600원(2026-03-09, [2841](https://techchat-apps-in-toss.toss.im/t/2841)), 하루 기준 보상형 약 6,505원·전면형 약 10,605원·배너 약 5,762원과 전면형 1,100~1,300원 보고(2026-03-07, [2805](https://techchat-apps-in-toss.toss.im/t/2805)), 6주간 평균 eCPM 6,205원 → 1,686원(2026-05-27, [3926](https://techchat-apps-in-toss.toss.im/t/3926)).

### 사실: 인앱 결제

- [공식] 사업자·정산 정보 등록이 먼저예요. 디지털 상품은 인앱 결제만 쓸 수 있어요. 상품 유형은 소모품·비소모품·자동 갱신 구독이고, 비게임은 최대 30개, 공급가는 400원~1,400,000원(10원 단위)이에요. 현금성·환가성 상품과 토스 포인트 결합 상품은 팔 수 없어요. [인앱 결제](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment), [서비스 오픈 정책 2-3](https://developers-apps-in-toss.toss.im/guide/undefined)
- [공식] 수수료는 앱마켓 15%(총수익이 늘면 30%)와 토스 5%예요. 예시는 11,000원 결제 시 애플 8,745원, 구글 8,895원 정산이에요. 지급은 앱마켓이 토스에 입금한 날부터 3영업일 안이에요. [정산](https://developers-apps-in-toss.toss.im/guide/settlement)
- [공식] 환불 요청은 받은 날부터 7영업일 안에 처리해야 하고 구독은 일할 환불이 원칙이에요. 이행하지 않으면 토스가 직권 환불·포인트 대지급 후 정산금에서 차감하거나 청구해요(애플 결제 건은 직권 환불 제외). [유저 피해 대응 정책](https://developers-apps-in-toss.toss.im/guide/operation/user-protection) (2026-10-22 수정, 2026-11-21 시행)
- [공식] 토스페이는 실물 상품·서비스 결제 전용이라 디지털 콘텐츠만 다루는 이 제품에는 쓸 일이 없어요. [서비스 오픈 정책 2-3](https://developers-apps-in-toss.toss.im/guide/undefined)
- [공식] 미결 주문 복구(`IAP.getPendingOrders` → 지급 → `IAP.completeProductGrant`)를 함께 구현해야 하고, 기기를 바꿔도 결제 데이터가 유지돼야 해요. [인앱 결제](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment), [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)

## 8. 지금 토스에 있는 유사 앱

### 확인 방법과 한계

- [공식] 공개 상세 페이지(tossminiapp.com)는 토스가 운영하는 페이지예요(푸터에 ㈜비바리퍼블리카 사업자 정보). 앱 이름, 부제, 카테고리 순위(엔터테인먼트·소셜·도구처럼 큰 분류 이름으로 표시), 평점·리뷰, 제작자, 같은 제작자의 다른 앱이 보여요. [택배당 예시](https://tossminiapp.com/d/post-tracker), [10월 4주 업데이트](https://toss.im/apps-in-toss/blog/update-26-10-21)
- [관찰] 사이트맵에는 미니앱 주소가 22,810개 있어요(사이트맵 생성일 2026-11-22). [사이트맵](https://tossminiapp.com/sitemap.xml)
- [관찰] 주소(slug)에 test, mbti, friend, couple, taste, balance, gunghap, vote, moim 같은 단어가 들어간 867개를 2026-11-27에 열었어요. 851개가 열렸고 16개는 404였어요. 무작위 표본이 아니라 키워드로 고른 집합이고, 주소와 실제 앱 내용이 다른 경우도 있어요.
- 미니앱 안 화면과 동작은 확인하지 못했어요. 아래 "하는 일"은 공개 페이지의 이름과 부제 그대로예요. 순위가 어떤 지표로 매겨지는지는 페이지에 설명이 없어요.

### 사실: 직접 겹치는 앱 (2026-11-27 공개 페이지 기준)

| 앱 | 부제(공개 페이지 문구) | 카테고리 순위 | 평점·리뷰 | 주소 |
|---|---|---|---|---|
| 가벼운 궁합 | AI 궁합 분석 서비스 | 엔터테인먼트 38위 | 4.4 · 251개 | https://tossminiapp.com/d/gabyeoun-gunghap |
| 두근두근 심리테스트 | MBTI·테토에겐·SBTI·취향테스트 | 엔터테인먼트 55위 | 없음 | https://tossminiapp.com/d/everydayfun-personality-test |
| 오늘의 질문 | 매일 하나 서로를 알아가요 | 소셜 33위 | 없음 | https://tossminiapp.com/d/couple-naroo |
| 함께여행 | 여행 일정도 짜고 비용도 정산해요 | 여행 6위 | 5.0 · 1개 | https://tossminiapp.com/d/travel-together |
| 여행 성향 테스트 | 나만의 여행지 찾기 | 여행 35위 | 5.0 · 1개 | https://tossminiapp.com/d/triptaste |
| 싱크픽 | 서로 모르게 고르고 함께 공개해요 | 도구 229위 | 없음 | https://tossminiapp.com/d/syncpick |
| 친구탐구 | 친구와 함께 쓰는 우정 설명서 | 소셜 259위 | 없음 | https://tossminiapp.com/d/friend-explorer |
| 여행 취향 밸런스 게임 | 내 취향에 딱 맞는 인생 여행지 찾기 | 여행 290위 | 없음 | https://tossminiapp.com/d/travel-balance |
| 언제모여 | 가능한 시간을 모아 약속을 정해요 | 소셜 361위 | 없음 | https://tossminiapp.com/d/when-together |
| 같이메뉴 | 싫은 건 빼고 다 같이 메뉴 정하기 | 일상·생활 460위 | 없음 | https://tossminiapp.com/d/together-menu |
| 이거vs저거 | 친구랑 몇 개나 같은지 골라 봐요 | 엔터테인먼트 1029위 | 없음 | https://tossminiapp.com/d/balance-jjak |
| 트립케미 | 친구들과 여행 준비를 놀이처럼 | 엔터테인먼트 1584위 | 없음 | https://tossminiapp.com/d/tripchemi |
| 우리 궁합 | 코드 하나로 확인하는 우리의 케미 | 엔터테인먼트 1778위 | 없음 | https://tossminiapp.com/d/wechemi |
| 찐친고사 | 나를 얼마나 아는지 퀴즈로 | 엔터테인먼트 1887위 | 없음 | https://tossminiapp.com/d/know-me-friends |
| 취향명함 | 33개 질문으로 취향 명함카드 만들기 | 엔터테인먼트 2515위 | 없음 | https://tossminiapp.com/d/tastecard |
| 우리 취향 몇 개 겹칠까 | 둘 중 하나 골라 친구와 비교 | 엔터테인먼트 2937위 | 없음 | https://tossminiapp.com/d/taste-match |
| 친구랑 케미 뭐야? | 친구들과 케미 한눈에 | 엔터테인먼트 3315위 | 없음 | https://tossminiapp.com/d/gunghapbattle |
| 친구퀴즈 | 10문제로 보는 친구의 나 이해도 | 엔터테인먼트 3413위 | 없음 | https://tossminiapp.com/d/friend-quiz |
| 하루 밸런스 게임 | 둘 중 하나 고르고 친구와 비교해요 | 엔터테인먼트 4379위 | 없음 | https://tossminiapp.com/d/haru-balance |
| 찐친 싱크로율 | 친구가 나를 얼마나 알까 | 엔터테인먼트 4770위 | 없음 | https://tossminiapp.com/d/jjinsync |

- [관찰] 기존 보고서가 경쟁 사례로 든 **통했당의 공개 상세 페이지는 오늘 404예요.** 2026-11-22 사이트맵에는 주소가 남아 있어요. 내려간 이유는 확인하지 못했어요. https://tossminiapp.com/d/knowme
- [관찰] 가벼운 궁합의 리뷰에 "질문권"을 썼다가 "돈 날렸어요"라고 적은 글이 있어요(9월 30일 리뷰). [추정] 유료 질문권 상품을 파는 것으로 보여요. 결제 화면은 확인하지 못했어요. https://tossminiapp.com/d/gabyeoun-gunghap
- [관찰] 같은 제작자가 비슷한 테스트 앱을 여러 개 낸 사례가 공개 페이지에 남아 있어요. 예: 투헌드레드의 MBTI 체크·사주·MBTI·오늘의 종합 운세([택배당 페이지의 제작자 앱 목록](https://tossminiapp.com/d/post-tracker)), Sean Lee의 이거vs저거·찐친고사·케미각([이거vs저거](https://tossminiapp.com/d/balance-jjak), [케미각](https://tossminiapp.com/d/chemi-match)). 중복 앱 정책이 이 앱들에 어떻게 적용됐는지는 알 수 없어요.

### 사실: 표본 집계

- [관찰] 열린 851개 중 이름이나 부제에 "궁합"이 든 앱 74개, "MBTI·성격·유형·심리"가 든 앱 182개, "밸런스"가 든 앱 38개였어요(게임·포인트·금융 등 제외). 문구로만 센 값이라 성격이 다른 앱이 조금 섞여 있어요.
- [관찰] 엔터테인먼트·소셜로 분류된 456개 중 리뷰가 0개인 앱이 440개(96.5%), 1~9개 8개, 10~99개 7개, 100개 이상 1개였어요.
- [관찰] 표본에서 본 가장 낮은 순위는 엔터테인먼트 5,360위, 도구 2,620위, 소셜 383위, 여행 365위였어요. 엔터테인먼트 대분류에 순위가 매겨진 앱이 5,360개 이상 있다는 뜻이에요.
- [관찰] 연령 표시는 851개 중 74개에만 있었어요(전체 이용가 70, 12세 이상 2, 15세 이상 2). 비게임인 "관상도 궁합"이 15세 이상이었어요. https://tossminiapp.com/d/compatibility-face

### 추정: 사업 성과

- [추정] 이 앱들의 방문자 수와 매출은 공개되지 않았어요. 리뷰 수와 카테고리 순위는 사용량의 약한 대리 지표예요. 리뷰가 달린 앱이 3.5%뿐이라는 점에서 친구 비교·궁합·밸런스 테스트 대부분은 사용량이 매우 적다고 봐요.
- [추정] 가장 순위가 높은 궁합 앱(엔터테인먼트 38위)도 누적 리뷰가 251개예요. 리뷰 작성 비율을 알 수 없어서 이용자 수로 환산하지 않았어요.
- [추정] "친구와 비교"만으로는 차별점이 되지 않아요. 같은 문구를 쓰는 앱이 이미 10개 이상이고 대부분 엔터테인먼트 1,000위 밖이에요.

## 9. 공식 자료끼리 어긋나는 곳

| # | 주제 | A | B | 적용 범위 해석 |
|---|---|---|---|---|
| 1 | 광고 시작 시점 | "앱 출시 첫날부터 광고 수익이 생겨서 바로 수익화를 시작할 수 있어요" ([인앱 광고](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad) 상단) | "자연 유입 방문자가 500명 이상이면 인앱 광고를 시작할 수 있어요" (같은 문서, 12월 26일 적용) | 12월 25일까지는 A, 12월 26일부터는 B예요. 신규 앱은 B로 계획해야 해요. |
| 2 | 광고와 사업자 | "인앱 광고는 사업자 등록 없이도 광고 ID를 발번" ([사업자 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/register-business)) | "인앱 광고를 연동하려면 먼저 사업자 정보를 등록해야 해요" ([인앱 광고](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad)), "사업자가 필요한 기능: … 인앱 광고" ([FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | 날짜가 있는 공지(2026-08-28 시행)와 정산 문서가 A를 뒷받침해요. B는 갱신되지 않은 문구로 봐요. |
| 3 | 광고 수수료 15% | "현재 수수료 면제 프로모션이 진행 중이에요" ([정산](https://developers-apps-in-toss.toss.im/guide/settlement)), "현재 별도의 수수료는 발생되지 않으며" ([FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | "프로모션 기간: ~2026년 3월 31일(수수료 0%), 정상 수수료율 적용: 2026년 4월 1일~(15%)" ([운영 공지 2026-03-26](https://techchat-apps-in-toss.toss.im/t/3171)) | 날짜가 있는 B가 더 구체적이에요. 수익 계산은 15% 적용으로 잡고, 실제 적용률은 콘솔 정산 내역으로 확인해야 해요. |
| 4 | 인앱 결제 토스 수수료 | "CBT 기간에는 한시적으로 토스 수수료 0%" ([정산](https://developers-apps-in-toss.toss.im/guide/settlement) 본문) | 같은 문서 예시표가 5%(550원) 공제 | CBT 진행 여부와 종료일이 없어요. 5%로 계산해요. |
| 5 | 검수 기간 | "검토는 영업일 기준 3~7일" ([미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace)) | "앱 등록 검수 1~2일", "앱 출시 검수 3~5일", "재검수도 3~5일" ([FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | 2026-10-01 통합 검수 뒤에는 A가 맞는 흐름이에요. 민감 주제는 최대 1주일 추가예요. |
| 6 | 이용 연령 | "지금 앱인토스는 만 19세 이상 사용자에게만 제공돼요" ([미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace), [FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | 만 14세 이상 틴즈에게 미니앱 스토어 노출 시작 ([6월 2주 업데이트 2026-06-11](https://toss.im/apps-in-toss/blog/update-26-06-11)), 공개 페이지의 "12세 이상·15세 이상" 표시 | B가 날짜와 실제 화면으로 확인돼요. 비게임의 틴즈 노출 대상은 "내부 기준"이에요. |
| 7 | SDK 3.x 기한 | "2026년 9월 14일까지" ([FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | 신규 등록 제한 2026-10-05, 2.x 업로드 종료 2027-02-26 ([공지](https://techchat-apps-in-toss.toss.im/t/5148)) | FAQ가 예전 값이에요. |
| 8 | 광고 형식 | "전면형 광고와 보상형 광고를 지원" ([FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | 전면형·리워드·배너 ([인앱 광고](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-ad)) | 배너가 나중에 추가됐고 FAQ가 갱신되지 않았어요. |
| 9 | 외부 링크 | "어떤 방식으로든, 자사 사이트(토스 도메인 외부)로 이동하거나 그 콘텐츠를 렌더링할 수 없어요" ([비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)) | "법률상 고지·필수 안내 목적의 외부 링크"는 허용될 수 있음 ([서비스 오픈 정책 2-2](https://developers-apps-in-toss.toss.im/guide/undefined)), 약관·처리방침 링크 허용 ([운영진 답변](https://techchat-apps-in-toss.toss.im/t/5186)) | 체크리스트는 히스토리 조작·WebView 중첩으로 자사 사이트를 띄우는 것을 막는 문장이고, 고지 목적 링크는 예외예요. |
| 10 | 푸시 | "푸시알림은 기능성 메시지로만 보낼 수 있어요" ([푸시알림](https://developers-apps-in-toss.toss.im/guide/marketing/smart-message)) | "설정한 세그먼트에게 광고성 메시지를 발송할 수 있어요" ([FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | 광고성 발송은 2026-10-01 종료됐어요. FAQ가 예전 값이에요. |
| 11 | 세금계산서 | 역발행 승인만 지원 ([정산](https://developers-apps-in-toss.toss.im/guide/settlement)) | "파트너사가 직접 발행" ([FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | 정산 문서가 "정발행은 더 이상 지원되지 않는다"고 명시해요. |
| 12 | 발송 요금 | "현재 건당 수수료는 0원" ([정산](https://developers-apps-in-toss.toss.im/guide/settlement)) | "건당 9.9원(vat 포함)" ([FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | 광고성 발송 종료로 영향이 작아요. |
| 13 | iframe 예외 | "지도, 유튜브 영상 재생 용도" ([비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)) | "YouTube 영상 콘텐츠를 삽입하는 용도는 예외" ([시작하기](https://developers-apps-in-toss.toss.im/documentation/integration/getting-started)) | 이 제품은 iframe을 쓰지 않으면 돼요. |
| 14 | 서비스 종료 절차 | "채널톡으로 앱 ID와 종료 사유를" ([FAQ](https://developers-apps-in-toss.toss.im/guide/faq)) | 콘솔에서 대표관리자가 직접 종료 ([11월 1주 업데이트](https://toss.im/apps-in-toss/blog/update-26-11-04)) | 블로그가 최신이에요. |

공통 경향: 자주 묻는 질문 페이지가 가장 늦게 갱신돼요. 날짜가 있는 블로그·운영 공지·약관이 FAQ와 다르면 앞쪽을 따르는 것이 맞아요.

## 10. 2026-11-26 기존 노트와 달라진 점

### 그대로 확인된 것

- 사업자 없이 출시와 광고 ID 발급 가능, 누적 예상수익 5천 원 도달 후 5영업일 유예, 토스 로그인·인앱 결제·토스페이·프로모션은 사업자 필수.
- 노출 3단계(2026-10-22 시행)와 추천 4기준, 부스팅 약 20배, 실사용 지표는 재방문율·전환율.
- 광고성 푸시·알림 종료(2026-10-01), 공유 리워드 종료(2026-10-23).
- SDK 2.x 일정(2027-02-26, 2027-06-30)과 React Native의 SDK 3.x 미지원.
- 광고 정산 구조(운영비 약 30%, 익월 말일 지급, 최소 5천 원, 12개월 이월 한도)와 인앱 결제 수수료 예시.
- 유저 피해 대응 정책 2026-11-21 시행, 광고대행 약관 2026-12-26 개정 조문.
- 성장 프로그램, 마케팅 키트, 카테고리 3단계, 보너스 충전금 2026-11-30 기한.
- '딱 반반' 수치(4,656원 → 25,613원, 871명 → 1,637명, 65.0% → 75.6%)와 커뮤니티 eCPM 보고 수치.
- 토스 뉴스룸의 앱인토스 보도자료는 2026-08-14가 여전히 최신.

### 바뀌었거나 고쳐야 하는 것

1. **광고매체 운영 자격의 구체 기준이 공개됐어요.** 기존 노트는 "운영정책 문서를 찾지 못했다"고 했는데, 인앱 광고 가이드에 자연 유입 방문자 500명 조건과 광고 품질 정책이 들어 있어요. 공지일은 2026-11-26이에요.
2. **"출시하면 바로 광고 실험" 전제가 2026-12-26부터 성립하지 않아요.** 기존 보고서의 "6결과 짧은 생활 도구의 첫 실험"은 자연 유입 500명을 먼저 채우는 순서로 바꿔야 해요.
3. **인앱 광고 수수료 15%.** `toss-platform.md`는 "면제 프로모션 진행 중"을 현행으로 봤지만, 2026-03-26 운영 공지는 2026-04-01부터 15% 적용이라고 해요. `market-fit.md`가 짚은 충돌이 맞고, 계산은 15% 적용이 안전해요.
4. **개발자센터 페이지에 수정일이 있어요.** 기존 노트는 "페이지에 개정일이 없다"고 했지만 일부 페이지는 HTML에 "마지막 업데이트" 시각이 있어요(서비스 오픈 정책 2026-11-10 등). `.md` 변형과 일부 페이지에는 없어요.
5. **통했당 공개 페이지가 404예요.** 기존 보고서가 차별화 기준으로 삼은 경쟁 앱이에요.
6. **미니앱 수.** "1만 5천 개 이상"(2026-10-06 공식 글)은 그대로 확인됐고, 공개 상세 페이지 사이트맵은 22,810개예요(2026-11-22, 내려간 앱 포함 가능).
7. **2026-11-26 바이럴 웨비나는 끝났어요.** 안내 페이지가 "진행된 웨비나"로 바뀌었고 내용 요약은 공개되지 않았어요.

### 새로 찾은 것

- 최신 SDK 3.11.0(2026-11-24), SDK 3.0.x 빌드 차단 보고(2026-11-23).
- 자연 유입의 포함·불포함 경로 정의. 공유·SNS 유입이 포함되고 프로모션 유입은 포함되지 않아요.
- 사용자 식별키만으로 로그인 없이 사용자 구분 가능, 식별키만 쓰면 탈퇴 콜백이 없어 앱 안 삭제 기능이 필요하다는 운영진 답변.
- 공유 링크 쿼리 파라미터 사용 가능, `Promotion.openContactsInvite` deprecated, 바이럴 SDK(가칭) 미출시.
- 찜 기능과 찜 유도 금지 규칙.
- 혐오·차별 금지 소재 10종 공지(2026-05-27)와 근거 약관명 "앱인토스 제휴 서비스 이용약관 제11조".
- 저작권 침해 신고 절차와 인정되는 소명자료 유형.
- 비게임 전체 점검에서 반복 확인된 위반 3종.
- Toss Product Sans 미제공, 토스 그래픽의 로고·썸네일 사용 금지, 토스트 생성 그래픽 승인 절차.
- 서버의 AI 프롬프트·모델만 바꿀 때는 번들 재검수가 필요 없다는 운영진 답변([커뮤니티 5186](https://techchat-apps-in-toss.toss.im/t/5186)).
- 유사 앱 표본 조사(리뷰 0개 96.5%, 엔터테인먼트 순위 5,360위 이상 존재).
- 하네스의 검수 전 점검 기능(2026-10-28).

## 11. 추정 (사실과 구분)

- [산술] 광고주가 쓴 금액 대비 파트너 몫은 15% 적용 시 약 59.5%(0.7 × 0.85), 면제 시 약 70%예요.
- [산술] 2026-11-27(금)에 검토를 요청하면 3~7영업일 뒤는 12월 2일~12월 8일이에요. 한 번 반려되면 FAQ 기준 재검수 3~5영업일이 더 붙어요.
- [추정] 12월 26일 전에 출시해도 광고 수익은 거의 기대할 수 없어요. 출시 직후 자연 유입 500명을 한 달 안에 채우려면 하루 평균 17명 이상의 새 자연 유입 방문자가 필요해요(500 ÷ 30). 유사 앱 대부분이 리뷰 0개라는 점에서 검색만으로는 어려워 보여요.
- [추정] 친구 공유형 구조는 새 광고 조건에 유리해요. 공유 링크 유입이 자연 유입에 포함되기 때문이에요. 다만 한 명이 평균 몇 명을 데려오는지는 측정 전까지 알 수 없어요.
- [추정] 심리테스트는 재방문율이 낮은 유형이에요. 추천 기준이 카테고리 안 재방문율·전환율이라서, 다시 올 이유(새 모임, 새 테마, 결과 다시 보기)가 없으면 추천 단계에 오르기 어려워요.
- [추정] 정적 문항 데이터를 서버에서 내려 주는 방식의 테마 추가는 번들 재검수 없이 가능할 것으로 보여요. 근거는 AI 프롬프트·모델 변경에 대한 운영진 답변이고, 정적 콘텐츠 교체에 대한 직접 답변은 아니에요. 바뀐 콘텐츠도 사후 검수 대상이에요.
- [추정] 통했당이 내려간 이유로 중복 앱 정책이나 전체 점검을 떠올릴 수 있지만 근거가 없어요.

## 12. 추천 (제 의견)

1. **첫 버전은 광고 없이 내고, 광고 코드는 자연 유입 500명 뒤에 켜요.** 12월 26일 전에 광고를 붙여도 곧 제한돼요. 광고가 없어도 결과 화면이 막히지 않게 만들어야 해요.
2. **로그인 없이 만들어요.** 사용자 구분은 `User.getAnonymousKey`로 하고, 서버가 있으면 인증 코드 교환을 써요. 서버를 둔다면 앱 안에 "내 데이터 지우기"를 넣어요.
3. **공유 링크에는 방 코드 하나만 실어요.** 답변 원문과 이름은 넣지 않아요. 공식 금지 문장은 없지만 링크가 메신저에 남기 때문이에요. 닉네임은 사용자가 직접 입력하게 하고 실명·연락처·연락처 권한은 받지 않아요.
4. **출시 전에 테스트 스킴으로 딥링크 진입을 꼭 확인해요.** 쿼리 파라미터 진입, 진입 뒤 뒤로가기, 토스 앱 미설치 흐름을 봐요. 하위 경로 대신 루트 경로와 쿼리 조합이 안전해요.
5. **테마는 한 앱 안에 추가해요.** 여행·회식·데이트 테마를 별도 앱으로 내면 중복 앱 정책에 걸려요.
6. **결과 문구는 사람을 점수로 줄 세우지 않게 써요.** "궁합 몇 점"보다 "둘 다 좋다고 한 것 2가지, 조율이 필요한 것 1가지"가 맥락 심사와 UX 원칙 5에 맞아요. 성별·나이·지역·외모 일반화, 유행어·은어, 정치 문항은 넣지 않아요. MBTI 같은 남의 검사 이름도 쓰지 않는 편이 안전해요.
7. **대표 전환 지표는 "두 번째 사람이 답을 마치고 합의 카드가 만들어진 순간"으로 등록해요.** 화면 조회 같은 쉬운 지표는 보정돼요.
8. **차별점은 "비교"가 아니라 "다음 행동"이에요.** 비교형 앱은 이미 많고 대부분 사용이 없어요. 3명 이상 모임, 합의 카드, 다음 약속에 쓸 한 가지 제안을 앞에 둬요.
9. **카테고리는 엔터테인먼트보다 소셜이나 여행 쪽 소분류를 검토해요.** 표본에서 엔터테인먼트는 5,000위 밖까지 있고 소셜·여행은 400위 안쪽이에요. 다만 토스가 카테고리를 바꿀 수 있고, 소분류 목록은 콘솔에서 확인해야 해요.
10. **권리 증빙 폴더를 처음부터 만들어요.** 문항·결과 문구 초안 파일과 작성 날짜, 일러스트 원본, 폰트 라이선스 파일, AI 도구로 만든 이미지의 생성 기록을 모아 둬요. 신고가 오면 30일 안에 내야 해요. 팬 콘텐츠와 남의 캐릭터는 쓰지 않아요.
11. **로고에 사람 얼굴과 토스 제공 그래픽을 쓰지 않아요.** OG 이미지는 1200×600px로 만들고 글자를 적게 넣어요.
12. **재방문 장치는 기능성 알림 하나로 시작해요.** 예: "친구가 답을 마쳤어요". 사용자가 신청한 알림이어야 하고 알림 동의문과 템플릿 검수가 필요해요. 진입 직후 동의를 묻지 않아요.
13. **광고 예상수익이 5천 원에 가까워지기 전에 사업자등록을 준비해요.** 과세 사업자여야 하고 업종이 서비스와 맞아야 해요. 인앱 결제는 사업자 등록 뒤로 미뤄요.
14. **검수 요청 전에 하네스의 출시 전 점검을 돌려요.** 자체 뒤로가기 버튼 중복, 테스트 광고 ID 잔존, 진입 직후 바텀시트를 먼저 봐요.

## 13. 확인하지 못한 것

- **앱인토스 제휴 서비스 이용약관 전문.** 공개 주소를 찾지 못했어요. 운영 공지가 제11조를 인용할 뿐이에요.
- **자연 유입 500명 조건의 세부.** 12월 26일 전 신규 광고 그룹 생성에 적용되는지, 광고 품질 기준 점수가 몇 점인지는 문서에 없어요(점수는 12월 26일 이후 콘솔 공개 예정).
- **카테고리 300여 개 목록과 테스트류 소분류 이름, 카테고리별 추천 기준값.** 콘솔 안에서만 보여요.
- **유사 앱의 실제 화면·기능과 방문자·매출.** 공개 페이지의 이름·부제·순위·리뷰만 봤어요.
- **통했당 공개 페이지가 내려간 이유.**
- **실제 적용 중인 광고 수수료율과 인앱 결제 토스 수수료 면제 여부.** 콘솔 정산 내역이 있어야 확인돼요.
- **바이럴 SDK(가칭)와 찜 유도 API의 출시 일정.**
- **틴즈(만 14~18세)에게 비게임 미니앱이 노출되는 기준과 광고·결제 제한.**
- **개발 단계에서 생성형 AI로 만든 정적 이미지·문구에 표시 의무가 적용되는지.** 정책 문장은 "AI가 직접 산출한 결과를 사용자에게 노출하는" 서비스를 대상으로 해요.
- **MBTI 같은 제3자 상표 사용에 대한 토스의 기준.** 공식 문장을 찾지 못했어요.
- **식별키 기반 데이터를 해외 리전 서버에 둘 때 국외 이전 동의가 필요한지.**
- **2026-11-26 웨비나 내용.**
- **절대값 eCPM의 공식 범위.** 공식 수치가 없어요.
- **기존 노트의 일부 제3자 글**(GPTERS 회고, 언론 기사 MAU 수치)은 오늘 다시 열지 않았어요.
