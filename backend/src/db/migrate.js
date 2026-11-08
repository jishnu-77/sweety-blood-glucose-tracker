const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

module.exports = { migrate };

if (require.main === module) {
  migrate()
    .then(() => console.log('Database schema is up to date.'))
    .catch((error) => {
      console.error('Migration failed:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
