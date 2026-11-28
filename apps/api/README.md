# API 로컬 개발 설정

알림 신청은 `USER_HMAC_KEY`와 `NOTIFICATION_KEYS`, `NOTIFICATION_ACTIVE_KEY_VERSION`을 Workers 비밀 값으로 받습니다. `USER_HMAC_KEY`는 UTF-8 기준 32바이트 이상이고 사용자 식별키의 HMAC-SHA256에 사용합니다. `NOTIFICATION_KEYS`는 버전 번호를 이름으로, base64url 인코딩된 32바이트 AES 키를 값으로 가진 JSON 비밀 값이며 `NOTIFICATION_ACTIVE_KEY_VERSION`은 새 신청에 사용할 양의 정수 버전입니다. 실제 값은 저장소에 두지 않습니다.

각 신청의 식별키는 AES-256-GCM으로 암호화하고 무작위 12바이트 nonce를 매번 새로 만듭니다. 방 ID, 참여자 ID와 키 버전을 인증된 추가 데이터로 묶고 암호문·nonce·버전만 D1에 둡니다. 키 교체 때는 기존 암호문을 복호화할 수 있도록 이전 버전 키를 유지하며, 해당 버전의 신청과 진행 중 발송이 모두 없어졌음을 확인한 뒤에만 이전 키를 제거합니다. 방 마감·만료 또는 내 데이터 지우기 때 신청과 암호문은 해당 작업과 같은 트랜잭션에서 지웁니다.

로컬 테스트는 가짜 토스 바인딩과 임시 테스트 값만 사용합니다. 실제 비밀 값 등록과 스테이징 바인딩은 TASK-050에서 처리합니다.
