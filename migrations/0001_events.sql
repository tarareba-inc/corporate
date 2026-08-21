CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX idx_events_ip_hash ON events (ip_hash);
