# 모임 합의 카드 (가칭)

앱인토스 미니앱. 제품명은 상표 확인 후 결정해요.

- 제품 방향 제안: https://app.notion.com/p/425bf16cc3ec8131a637cf27791aebcb

## 개발 명령

Node.js 22와 Corepack을 준비한 뒤 저장소 루트에서 실행해요.

```sh
corepack enable
python3 -m pip install -r requirements-checks.txt
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @moim-card/apps-web exec playwright install --with-deps chromium
pnpm --filter @moim-card/apps-web test:browser
python3 scripts/check-tokens.py
python3 -m unittest discover -s scripts -p test_check_build.py
python3 scripts/check-build.py
python3 -m unittest discover -s scripts -p test_check_question_sets.py
python3 scripts/check-question-sets.py
python3 scripts/check-contract.py
python3 scripts/check-screens.py
python3 scripts/check-wbs.py
```

워크스페이스는 `apps/web`, `apps/api`, `packages/shared`이고 문항 데이터는 `content/question-sets/`에 둬요. 환경 변수와 비밀 값은 저장소에 커밋하지 않아요.

웹 개발 서버와 OpenAPI 목 서버는 각각 아래 명령으로 실행해요.

```sh
pnpm --filter @moim-card/apps-web dev
pnpm dlx @stoplight/prism-cli mock api/openapi.yaml
```
