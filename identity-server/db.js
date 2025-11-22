const { Pool } = require('pg');
const { config } = require('./config');

const pool = new Pool({ connectionString: config.databaseUrl });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cfe_identities (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      did TEXT NOT NULL,
      root_cid TEXT NOT NULL,
      ipfs_url TEXT NOT NULL,
      label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_cfe_identities_did ON cfe_identities (did);');
}

module.exports = { pool, initDb };
