const express = require('express');
const crypto = require('crypto');
const { poolPromise, sql } = require('../db');
const { authRequired, renterOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/', authRequired, renterOnly, async (req, res) => {
  const { lockerId, startDate, durationMonths } = req.body;
  if (!lockerId || !startDate || !durationMonths) {
    return res.status(400).json({ message: 'lockerId, startDate and durationMonths are required' });
  }

  try {
    const pool = await poolPromise;
    const bookingId = crypto.randomUUID();
    const result = await pool.request()
      .input('Id', sql.UniqueIdentifier, bookingId)
      .input('LockerId', sql.UniqueIdentifier, lockerId)
      .input('RenterId', sql.UniqueIdentifier, req.user.id)
      .input('StartDate', sql.Date, startDate)
      .input('DurationMonths', sql.Int, Number(durationMonths))
      .execute('sp_CreateBooking');

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes('not available')) return res.status(400).json({ message: err.message });
    if (err.message.includes('not found')) return res.status(404).json({ message: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', authRequired, renterOnly, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT b.*, 
             (SELECT * FROM Lockers WHERE Id = b.LockerId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS locker
      FROM Bookings b
      WHERE b.RenterId = '${req.user.id}'
      ORDER BY b.CreatedAt DESC
    `);
    
    const configuredBookings = result.recordset.map(row => ({
      ...row,
      locker: JSON.parse(row.locker)
    }));
    res.json(configuredBookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/owner', authRequired, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ message: 'Only owners can view this' });
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT b.*, u.Name as renterName, u.Phone as renterPhone,
             (SELECT * FROM Lockers WHERE Id = b.LockerId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS locker
      FROM Bookings b
      LEFT JOIN Users u ON b.RenterId = u.Id
      WHERE b.OwnerId = '${req.user.id}'
      ORDER BY b.CreatedAt DESC
    `);

    const configuredBookings = result.recordset.map(row => ({
      ...row,
      renterName: row.renterName || 'Unknown',
      renterPhone: row.renterPhone || '',
      locker: JSON.parse(row.locker)
    }));
    res.json(configuredBookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/cancel', authRequired, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Id', sql.UniqueIdentifier, req.params.id)
      .input('UserId', sql.UniqueIdentifier, req.user.id)
      .execute('sp_CancelBooking');

    res.json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes('unauthorized')) return res.status(403).json({ message: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;