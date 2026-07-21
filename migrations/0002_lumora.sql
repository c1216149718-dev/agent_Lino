ALTER TABLE moods ADD COLUMN spirit_id TEXT NOT NULL DEFAULT 'lino';
ALTER TABLE letters ADD COLUMN recipient_spirit_id TEXT NOT NULL DEFAULT 'lino';

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  spirit_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '新的对话',
  status TEXT NOT NULL DEFAULT 'active',
  messages_json TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  closed_at TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_spirit
  ON conversations(user_id, spirit_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_deleted
  ON conversations(user_id, deleted_at);

CREATE TABLE IF NOT EXISTS conversation_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL UNIQUE,
  spirit_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_points_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_memories_user
  ON conversation_memories(user_id, created_at DESC);

CREATE TABLE replies_v2 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  letter_date TEXT NOT NULL,
  reply_date TEXT NOT NULL,
  spirit_id TEXT NOT NULL DEFAULT 'lino',
  content TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, letter_date, spirit_id)
);

INSERT INTO replies_v2 (id, user_id, letter_date, reply_date, spirit_id, content, read_at, created_at)
SELECT id, user_id, letter_date, reply_date, 'lino', content, read_at, created_at FROM replies;

DROP TABLE replies;
ALTER TABLE replies_v2 RENAME TO replies;
CREATE INDEX IF NOT EXISTS idx_replies_user_date ON replies(user_id, letter_date, spirit_id);
