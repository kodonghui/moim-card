# 문항 세트 파일 형식

파일 이름은 `<theme>-v<version>.yaml`이에요. `theme`은 영문 소문자와 밑줄로 쓴 식별자이고, `version`은 1 이상 정수예요. 세트에는 `default_next_action`과 `questions` 배열이 필요해요. 문항은 정확히 8개이며 각각 `prompt`, `option_a`, `option_b`, `split_suggestion`, `agreed_text_a`, `agreed_text_b` 문자열이 있어야 해요. `axis`는 `plan_speed`, `spending_priority`, `schedule_change` 중 하나이거나 생략해요. 축이 있으면 A 선택지가 어느 쪽인지 `high_choice`에 `A` 또는 `B`를 함께 적어요. 배포 시 `A`는 `axis_pole_a=high`, `B`는 `axis_pole_a=low`로 저장해요. `profile_phrases`에는 `plan_speed_low`, `plan_speed_high`, `spending_priority_low`, `spending_priority_high`, `schedule_change_low`, `schedule_change_high`, `balanced` 문구를 각각 하나씩 적어요.

`published.json`은 배포된 파일 이름을 SHA-256 해시에 연결하는 객체예요. 배포 절차는 TASK-014에서 구현해요. 기준 브랜치에 기록된 해시는 바꾸거나 지울 수 없고 해당 파일을 고치면 검사가 실패하므로 새 버전 파일을 사용해요. 형식 검사는 `python3 scripts/check-question-sets.py`로 실행하고, 다른 기준 브랜치가 필요하면 `--base`로 지정해요.

## 로컬 D1 배포

배포 전에 각 YAML의 SHA-256을 넣은 검토 기록 JSON과 권리 증빙 JSON을 준비해요. 검토 기록은 `sha256`, `reviewer`, `date`(YYYY-MM-DD), `checks`를 가지며 `checks`에는 `prohibited_categories`, `politics`, `polite_style`, `slang`, `six_conclusions`, `og_image` 여섯 항목이 모두 `true`여야 해요. 권리 증빙에는 같은 `sha256`, `author`, `date`, `creation_record`가 필요해요. 내용이 바뀌면 두 기록을 다시 작성해요. 자동 금칙어 검사는 공용 목록을 사용하며 사람 확인은 U-7에서 해요.

`db/migrations/`의 마이그레이션을 모두 적용한 로컬 D1 저장 경로와 로컬 데이터베이스 ID를 지정해요. Node 22, pnpm 의존성과 PyYAML을 설치한 뒤 다음 명령을 실행해요.

```sh
python3 scripts/publish-question-set.py content/question-sets/travel-v1.yaml --review content/question-sets/evidence/travel-v1.review.json --rights content/question-sets/evidence/travel-v1.rights.json --theme-name 여행 --sort-order 1 --persist /path/to/local/d1 --database-id local-id
```

여덟 문항과 일곱 성향 문구는 D1 batch 하나로 저장돼요. 같은 버전을 다시 넣으면 거절되고 기존 방이 참조하는 버전은 바뀌지 않아요. 이 명령은 로컬 Miniflare D1만 사용해요. 스테이징 배포는 TASK-050에서 검증하며(DEC-042) 운영 배포는 별도 절차예요. 운영 배포 전 U-7의 사람 확인이 필요해요. `published.json`은 저장소의 배포 버전 보호 목록이므로 실제 배포가 확정된 뒤 해당 파일 해시를 기록해요.
