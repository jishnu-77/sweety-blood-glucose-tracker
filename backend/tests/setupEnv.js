const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// Tests wipe the tables, so they must never run against the development database.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set. Add it to .env before running backend tests.');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = 'test-secret';
process.env.APP_TIMEZONE = 'UTC';
