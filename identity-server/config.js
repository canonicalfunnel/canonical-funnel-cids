const path = require('path');
const fs = require('fs');
const dotenvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(dotenvPath)) {
  // Load environment variables if present for local development
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: dotenvPath });
} else if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line global-require
  require('dotenv').config();
}

const masterConfig = {
  master_did: 'z6MknPNCcUaoLYzHyTMsbdrrvD4FRCA4k15yofsJ8DWVVUDK',
  master_cid: 'bafybeigt4mkbgrnp4ef7oltj6fpbd46a5kjjgpjq6pnq5hktqdm374r4xq',
};

const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cfe_identity',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  masterConfig,
};

module.exports = { config, masterConfig };
