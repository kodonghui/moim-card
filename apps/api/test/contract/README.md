# 로컬 API 계약 검사

저장소 루트에서 `python3 -m pip install -r requirements-checks.txt -r requirements-contract.txt`와 `pnpm install --frozen-lockfile`을 실행한 뒤 `python3 scripts/test-contract-local.py`로 검사해요. CI도 같은 명령을 실행해요.

Wrangler 4.23.0은 임시 디렉터리에 D1을 만들고 0001부터 마이그레이션을 적용해요. 서비스 바인딩은 같은 프로세스의 가짜 토스 Worker를 가리키므로 원격 D1이나 실계정을 쓰지 않아요. 비밀 값처럼 생긴 설정은 모두 테스트 전용이며, 세션 토큰은 실행 중에만 만들고 출력에서 지워요.

Schemathesis 3.39.16으로 OpenAPI 3.1의 상태 코드·본문·콘텐츠 형식·헤더·서버 오류를 확인해요. 먼저 테스트 데이터와 정상 흐름으로 16개 operation 모두의 성공 응답을 검사해요. 인증이 필요한 15개 operation의 401과 403·409·429·503 대표 사례도 상태·콘텐츠 형식·헤더·본문 스키마로 검사하고, 별도로 생성한 입력으로 16개 operation을 검사해요. 의도적으로 주입한 503에는 5xx 금지 검사만 제외해요. 생성 검사에서 임의의 방 코드는 기존 방과 다를 수 있어 4xx만 나오는 경고가 생기며, 각 operation의 성공 응답은 앞의 정상 흐름이 별도로 확인해요. 내 데이터 지우기는 마지막에 검사해 다른 operation의 세션이 사라지지 않게 해요.

실행 결과에는 검사 도구 버전, 로컬 서버 주소, 검사한 커밋, 각 operation과 검사 수가 나와요. CI는 셋업, 정상 흐름 또는 생성 검사 중 하나라도 실패하면 실패해요.
