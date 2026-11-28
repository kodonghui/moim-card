INSERT INTO themes VALUES ('travel','여행',1);
INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('travel',1,'published','정해요','ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',1700000000);
WITH RECURSIVE positions(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM positions WHERE n<8)
INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b,axis,axis_pole_a)
 SELECT 1,n,'어떻게 할까요?','A','B','함께 정해요','A로 해요','B로 해요','plan_speed','high' FROM positions;
INSERT INTO profile_phrases(question_set_id,slot,phrase) VALUES
 (1,'plan_speed_low','설명이에요'),(1,'plan_speed_high','설명이에요'),
 (1,'spending_priority_low','설명이에요'),(1,'spending_priority_high','설명이에요'),
 (1,'schedule_change_low','설명이에요'),(1,'schedule_change_high','설명이에요'),(1,'balanced','설명이에요');
