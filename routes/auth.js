const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { poolPromise, sql } = require('../db');
const { JWT_SECRET, authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password and role are required' });
  }
  if (!['owner', 'renter'].includes(role)) {
    return res.status(400).json({ message: 'Role must be owner or renter' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('Id', sql.UniqueIdentifier, userId)
      .input('Name', sql.NVarChar(100), name)
      .input('Email', sql.NVarChar(256), email)
      .input('Phone', sql.NVarChar(20), phone || '')
      .input('Role', sql.NVarChar(50), role)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .execute('sp_CreateUser');

    const user = result.recordset[0];
    const token = jwt.sign({ id: user.Id, role: user.Role, name: user.Name, email: user.Email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ token, user: { id: user.Id, name: user.Name, email: user.Email, role: user.Role, phone: user.Phone } });
  } catch (err) {
    if (err.message.includes('already exists')) return res.status(409).json({ message: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Email', sql.NVarChar(256), email)
      .execute('sp_GetUserByEmail');

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.Id, role: user.Role, name: user.Name, email: user.Email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.Id, name: user.Name, email: user.Email, role: user.Role, phone: user.Phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Id', sql.UniqueIdentifier, req.user.id)
      .execute('sp_GetUserById');

    const user = result.recordset[0];
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user.Id, name: user.Name, email: user.Email, role: user.Role, phone: user.Phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;