# 문항 세트 파일 형식

파일 이름은 `<theme>-v<version>.yaml`이에요. `theme`은 영문 소문자와 밑줄로 쓴 식별자이고, `version`은 1 이상 정수예요. 세트에는 `default_next_action`과 `questions` 배열이 필요해요. 문항은 정확히 8개이며 각각 `prompt`, `option_a`, `option_b`, `split_suggestion`, `agreed_text_a`, `agreed_text_b` 문자열이 있어야 해요. `axis`는 `plan_speed`, `spending_priority`, `schedule_change` 중 하나이거나 생략해요. 축이 있으면 A 선택지가 어느 쪽인지 `high_choice`에 `A` 또는 `B`를 함께 적어요. 배포 시 `A`는 `axis_pole_a=high`, `B`는 `axis_pole_a=low`로 저장해요. `profile_phrases`에는 `plan_speed_low`, `plan_speed_high`, `spending_priority_low`, `spending_priority_high`, `schedule_change_low`, `schedule_change_high`, `balanced` 문구를 각각 하나씩 적어요.

`published.json`은 배포된 파일 이름을 SHA-256 해시에 연결하는 객체예요. 배포 절차는 TASK-014에서 구현해요. 기준 브랜치에 기록된 해시는 바꾸거나 지울 수 없고 해당 파일을 고치면 검사가 실패하므로 새 버전 파일을 사용해요. 형식 검사는 `python3 scripts/check-question-sets.py`로 실행하고, 다른 기준 브랜치가 필요하면 `--base`로 지정해요.
