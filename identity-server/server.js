const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { config, masterConfig } = require('./config');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const cfeRoutes = require('./routes/cfe');

async function createApp() {
  await initDb();

  const app = express();
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());

  app.get('/.well-known/cfe-root', (req, res) => {
    res.json(masterConfig);
  });

  app.use('/auth', authRoutes);
  app.use('/cfe', cfeRoutes);

  // Generic error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'ServerError', message: 'Unexpected server error.' });
  });

  const clientDir = path.join(__dirname, '../client/dist');
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  return app;
}

async function start() {
  const app = await createApp();
  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`CFE Identity & Connect Server listening on port ${config.port}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { createApp, start };
