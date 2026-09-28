-- 工单服务的表结构（D1 与本地 SQLite 共用）
CREATE TABLE IF NOT EXISTS tickets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  username      TEXT    NOT NULL DEFAULT '',
  display_name  TEXT    NOT NULL DEFAULT '',
  email         TEXT    NOT NULL DEFAULT '',
  title         TEXT    NOT NULL,
  category      TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'open',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id),
  author_id    INTEGER NOT NULL,
  author_name  TEXT    NOT NULL DEFAULT '',
  is_staff     INTEGER NOT NULL DEFAULT 0,
  content      TEXT    NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id, id);

CREATE TABLE IF NOT EXISTS images (
  id          TEXT    PRIMARY KEY,
  owner_id    INTEGER NOT NULL,
  message_id  INTEGER REFERENCES messages(id),
  mime        TEXT    NOT NULL,
  size        INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_images_message ON images(message_id);
CREATE INDEX IF NOT EXISTS idx_images_orphan ON images(message_id, created_at);
