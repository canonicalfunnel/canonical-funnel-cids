const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { masterConfig } = require('../config');

const router = express.Router();

router.post('/identities', authenticate, async (req, res, next) => {
  try {
    const { did, root_cid: rootCid, ipfs_url: ipfsUrl, label } = req.body;

    if (!did || !rootCid || !ipfsUrl) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'DID, Root CID, and IPFS URL are required.',
      });
    }

    const insertResult = await pool.query(
      `INSERT INTO cfe_identities (user_id, did, root_cid, ipfs_url, label)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, did, root_cid, ipfs_url, label, created_at`,
      [req.user.id, did, rootCid, ipfsUrl, label || null],
    );

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.get('/identities/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, did, root_cid, ipfs_url, label, created_at FROM cfe_identities WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id],
    );
    return res.json({ user: { id: req.user.id, email: req.user.email }, identities: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.get('/root', (req, res) => {
  res.json(masterConfig);
});

router.get('/:did', async (req, res, next) => {
  try {
    const { did } = req.params;
    const result = await pool.query(
      'SELECT did, root_cid, ipfs_url, label, created_at FROM cfe_identities WHERE did = $1 ORDER BY created_at DESC',
      [did],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'NotFound', message: 'CFE identity not found for provided DID.' });
    }

    return res.json({ did, identities: result.rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
