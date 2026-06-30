const express = require('express');
const crypto = require('crypto');
const { readDb, writeDb } = require('../db');
const { authRequired, ownerOnly } = require('../middleware/auth');

const router = express.Router();

// Public: browse available lockers with optional filters
router.get('/', (req, res) => {
  const db = readDb();
  const { city, size, maxPrice } = req.query;
  let lockers = db.lockers.filter((l) => l.status === 'available');
  if (city) lockers = lockers.filter((l) => l.city.toLowerCase().includes(String(city).toLowerCase()));
  if (size) lockers = lockers.filter((l) => l.size === size);
  if (maxPrice) lockers = lockers.filter((l) => l.price <= Number(maxPrice));

  lockers = lockers.map((l) => {
    const owner = db.users.find((u) => u.id === l.ownerId);
    return { ...l, ownerName: owner ? owner.name : 'Unknown' };
  });

  res.json(lockers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.get('/mine', authRequired, ownerOnly, (req, res) => {
  const db = readDb();
  const lockers = db.lockers.filter((l) => l.ownerId === req.user.id);
  res.json(lockers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.post('/', authRequired, ownerOnly, (req, res) => {
  const { title, size, price, city, address, description } = req.body;
  if (!title || !size || !price || !city || !address) {
    return res.status(400).json({ message: 'Title, size, price, city and address are required' });
  }
  if (!['small', 'medium', 'large'].includes(size)) {
    return res.status(400).json({ message: 'Size must be small, medium or large' });
  }
  const db = readDb();
  const locker = {
    id: crypto.randomUUID(),
    ownerId: req.user.id,
    title,
    size,
    price: Number(price),
    city,
    address,
    description: description || '',
    status: 'available',
    createdAt: new Date().toISOString(),
  };
  db.lockers.push(locker);
  writeDb(db);
  res.status(201).json(locker);
});

router.put('/:id', authRequired, ownerOnly, (req, res) => {
  const db = readDb();
  const locker = db.lockers.find((l) => l.id === req.params.id);
  if (!locker) return res.status(404).json({ message: 'Locker not found' });
  if (locker.ownerId !== req.user.id) return res.status(403).json({ message: 'You do not own this locker' });

  const { title, size, price, city, address, description } = req.body;
  if (title !== undefined) locker.title = title;
  if (size !== undefined) locker.size = size;
  if (price !== undefined) locker.price = Number(price);
  if (city !== undefined) locker.city = city;
  if (address !== undefined) locker.address = address;
  if (description !== undefined) locker.description = description;

  writeDb(db);
  res.json(locker);
});

router.delete('/:id', authRequired, ownerOnly, (req, res) => {
  const db = readDb();
  const locker = db.lockers.find((l) => l.id === req.params.id);
  if (!locker) return res.status(404).json({ message: 'Locker not found' });
  if (locker.ownerId !== req.user.id) return res.status(403).json({ message: 'You do not own this locker' });
  if (locker.status === 'booked') {
    return res.status(400).json({ message: 'Cannot delete a locker that is currently booked' });
  }
  db.lockers = db.lockers.filter((l) => l.id !== req.params.id);
  writeDb(db);
  res.json({ message: 'Locker deleted' });
});

module.exports = router;
