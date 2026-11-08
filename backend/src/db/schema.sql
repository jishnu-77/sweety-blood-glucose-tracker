CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- reading_date is a plain DATE (no time zone), so reports never shift days.
-- The CHECK on time_slot plus the UNIQUE constraint below also means a user
-- can never have more than 4 readings on one day, even under concurrent requests.
CREATE TABLE IF NOT EXISTS readings (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_date   DATE NOT NULL,
  time_slot      VARCHAR(20) NOT NULL
                 CHECK (time_slot IN ('morning', 'after_breakfast', 'after_lunch', 'after_dinner')),
  glucose_value  INTEGER NOT NULL CHECK (glucose_value BETWEEN 40 AND 600),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT readings_one_per_slot_per_day UNIQUE (user_id, reading_date, time_slot)
);

-- The UNIQUE constraint above creates an index on (user_id, reading_date, time_slot).
-- Its leading columns also serve every "this user's readings in a date range" query,
-- so no extra index is needed.
