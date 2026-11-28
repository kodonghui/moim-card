-- 0003: Preserve participant/subscription IDs referenced by notification_sends.
-- Rebuild from leaf to root so ON DELETE CASCADE cannot erase copied rows.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE participants_new (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('host', 'member')),
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 10 AND nickname = trim(nickname)),
  joined_at INTEGER NOT NULL,
  UNIQUE (room_id, user_id),
  UNIQUE (id, room_id)
) STRICT;
INSERT INTO participants_new SELECT * FROM participants;

CREATE TABLE responses_new (
  participant_id INTEGER NOT NULL PRIMARY KEY,
  room_id INTEGER NOT NULL,
  answers TEXT NOT NULL CHECK (length(answers) = 8 AND answers NOT GLOB '*[^ABN]*'),
  submitted_at INTEGER NOT NULL,
  UNIQUE (participant_id, room_id),
  FOREIGN KEY (participant_id, room_id) REFERENCES participants_new (id, room_id) ON DELETE CASCADE
) STRICT;
INSERT INTO responses_new SELECT * FROM responses;

CREATE TABLE notification_subscriptions_new (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL UNIQUE,
  room_id INTEGER NOT NULL,
  anon_key_ciphertext BLOB NOT NULL CHECK (length(anon_key_ciphertext) BETWEEN 17 AND 512),
  nonce BLOB NOT NULL CHECK (length(nonce) = 12),
  key_version INTEGER NOT NULL CHECK (key_version >= 1),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (participant_id, room_id) REFERENCES responses_new (participant_id, room_id) ON DELETE CASCADE
) STRICT;
INSERT INTO notification_subscriptions_new SELECT * FROM notification_subscriptions;

DROP TABLE notification_subscriptions;
DROP TABLE responses;
DROP TABLE participants;
ALTER TABLE participants_new RENAME TO participants;
ALTER TABLE responses_new RENAME TO responses;
ALTER TABLE notification_subscriptions_new RENAME TO notification_subscriptions;
CREATE UNIQUE INDEX participants_one_host ON participants (room_id) WHERE role = 'host';
CREATE INDEX participants_user_joined ON participants (user_id, joined_at);
CREATE INDEX responses_room ON responses (room_id);
CREATE INDEX notification_subscriptions_room ON notification_subscriptions (room_id);

-- Send records can outlive their subscription and participant; seed both sequences
-- above any surviving historical reference as well as any copied live row.
INSERT INTO sqlite_sequence(name,seq)
 SELECT 'participants',0 WHERE NOT EXISTS(SELECT 1 FROM sqlite_sequence WHERE name='participants');
UPDATE sqlite_sequence SET seq=MAX(seq,COALESCE((SELECT MAX(trigger_participant_id) FROM notification_sends),0)) WHERE name='participants';
INSERT INTO sqlite_sequence(name,seq)
 SELECT 'notification_subscriptions',0 WHERE NOT EXISTS(SELECT 1 FROM sqlite_sequence WHERE name='notification_subscriptions');
UPDATE sqlite_sequence SET seq=MAX(seq,COALESCE((SELECT MAX(subscription_id) FROM notification_sends),0)) WHERE name='notification_subscriptions';
