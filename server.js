require('dotenv').config();
const express = require('express');
const cors = require('cors');
const allowedOrigins = [
  'http://localhost:5173/', // Local development
  'https://aonapps.in:6075/',
];

const authRoutes = require('./routes/auth');
const lockerRoutes = require('./routes/lockers');
const bookingRoutes = require('./routes/bookings');

const app = express();

app.use(cors({
  origin: 'https://aonapps.in:6075',
  credentials: true // Enable if you send cookies/sessions
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/bookings', bookingRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// 🚀 THE FIX: Export the app instance so Vercel can handle it
module.exports = app;