const express = require('express');
const crypto = require('crypto');
const { readDb, writeDb } = require('../db');
const { authRequired, renterOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/', authRequired, renterOnly, (req, res) => {
  const { lockerId, startDate, durationMonths } = req.body;
  if (!lockerId || !startDate || !durationMonths) {
    return res.status(400).json({ message: 'lockerId, startDate and durationMonths are required' });
  }
  const db = readDb();
  const locker = db.lockers.find((l) => l.id === lockerId);
  if (!locker) return res.status(404).json({ message: 'Locker not found' });
  if (locker.status !== 'available') return res.status(400).json({ message: 'Locker is not available' });

  const booking = {
    id: crypto.randomUUID(),
    lockerId,
    lockerTitle: locker.title,
    ownerId: locker.ownerId,
    renterId: req.user.id,
    startDate,
    durationMonths: Number(durationMonths),
    totalPrice: locker.price * Number(durationMonths),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  locker.status = 'booked';
  db.bookings.push(booking);
  writeDb(db);
  res.status(201).json(booking);
});

router.get('/mine', authRequired, renterOnly, (req, res) => {
  const db = readDb();
  const bookings = db.bookings
    .filter((b) => b.renterId === req.user.id)
    .map((b) => ({ ...b, locker: db.lockers.find((l) => l.id === b.lockerId) || null }));
  res.json(bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.get('/owner', authRequired, (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ message: 'Only owners can view this' });
  const db = readDb();
  const bookings = db.bookings
    .filter((b) => b.ownerId === req.user.id)
    .map((b) => {
      const renter = db.users.find((u) => u.id === b.renterId);
      const locker = db.lockers.find((l) => l.id === b.lockerId);
      return { ...b, renterName: renter ? renter.name : 'Unknown', renterPhone: renter ? renter.phone : '', locker: locker || null };
    });
  res.json(bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.put('/:id/cancel', authRequired, (req, res) => {
  const db = readDb();
  const booking = db.bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.renterId !== req.user.id && booking.ownerId !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to cancel this booking' });
  }
  booking.status = 'cancelled';
  const locker = db.lockers.find((l) => l.id === booking.lockerId);
  if (locker) locker.status = 'available';
  writeDb(db);
  res.json(booking);
});

module.exports = router;
