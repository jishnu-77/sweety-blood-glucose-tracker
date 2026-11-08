const { Pool, types } = require('pg');
const config = require('../config');

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Date objects,
// which would be shifted by the server's time zone.
types.setTypeParser(types.builtins.DATE, (value) => value);

module.exports = new Pool({ connectionString: config.databaseUrl });
