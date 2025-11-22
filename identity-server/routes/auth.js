const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { config } = require('../config');

const router = express.Router();

function createToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'ValidationError', message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingUser.rows.length) {
      return res.status(409).json({ error: 'Conflict', message: 'Email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [normalizedEmail, passwordHash],
    );
    const user = result.rows[0];
    return res.status(201).json({ token: createToken(user), user: { id: user.id, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'ValidationError', message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const userResult = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [normalizedEmail]);
    if (!userResult.rows.length) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials.' });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials.' });
    }

    return res.json({ token: createToken(user), user: { id: user.id, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
