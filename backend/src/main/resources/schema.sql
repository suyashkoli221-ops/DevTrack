
CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    priority TEXT NOT NULL DEFAULT 'Medium',
    assignee TEXT,
    reporter TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
