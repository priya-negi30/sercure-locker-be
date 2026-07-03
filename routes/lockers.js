const express = require('express');
const crypto = require('crypto');
const { poolPromise, sql } = require('../db');
const { authRequired, ownerOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { city, size, maxPrice } = req.query;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('City', sql.NVarChar(100), city || null)
      .input('Size', sql.NVarChar(50), size || null)
      .input('MaxPrice', sql.Decimal(18, 2), maxPrice ? Number(maxPrice) : null)
      .execute('sp_GetAvailableLockers');

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', authRequired, ownerOnly, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT * FROM Lockers WHERE OwnerId = '${req.user.id}' ORDER BY CreatedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authRequired, ownerOnly, async (req, res) => {
  const { title, size, price, city, address, description } = req.body;
  if (!title || !size || !price || !city || !address) {
    return res.status(400).json({ message: 'Title, size, price, city and address are required' });
  }
  if (!['small', 'medium', 'large'].includes(size)) {
    return res.status(400).json({ message: 'Size must be small, medium or large' });
  }

  try {
    const pool = await poolPromise;
    const id = crypto.randomUUID();
    const result = await pool.request()
      .input('Id', sql.UniqueIdentifier, id)
      .input('OwnerId', sql.UniqueIdentifier, req.user.id)
      .input('Title', sql.NVarChar(150), title)
      .input('Size', sql.NVarChar(50), size)
      .input('Price', sql.Decimal(18, 2), Number(price))
      .input('City', sql.NVarChar(100), city)
      .input('Address', sql.NVarChar(sql.MAX), address)
      .input('Description', sql.NVarChar(sql.MAX), description || '')
      .execute('sp_CreateLocker');

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authRequired, ownerOnly, async (req, res) => {
  const { title, size, price, city, address, description } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Id', sql.UniqueIdentifier, req.params.id)
      .input('OwnerId', sql.UniqueIdentifier, req.user.id)
      .input('Title', sql.NVarChar(150), title !== undefined ? title : null)
      .input('Size', sql.NVarChar(50), size !== undefined ? size : null)
      .input('Price', sql.Decimal(18, 2), price !== undefined ? Number(price) : null)
      .input('City', sql.NVarChar(100), city !== undefined ? city : null)
      .input('Address', sql.NVarChar(sql.MAX), address !== undefined ? address : null)
      .input('Description', sql.NVarChar(sql.MAX), description !== undefined ? description : null)
      .execute('sp_UpdateLocker');

    res.json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes('unauthorized')) return res.status(403).json({ message: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authRequired, ownerOnly, async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('Id', sql.UniqueIdentifier, req.params.id)
      .input('OwnerId', sql.UniqueIdentifier, req.user.id)
      .execute('sp_DeleteLocker');

    res.json({ message: 'Locker deleted' });
  } catch (err) {
    if (err.message.includes('booked')) return res.status(400).json({ message: err.message });
    if (err.message.includes('unauthorized')) return res.status(403).json({ message: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;