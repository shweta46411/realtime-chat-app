CREATE TABLE users_online (
    user_id UUID PRIMARY KEY,
    display_name TEXT NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_name ON users_online (display_name);