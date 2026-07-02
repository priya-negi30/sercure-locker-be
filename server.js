require('dotenv').config();
const allowedOrigins = [
  'https://aonapps.in:6075/', // Local development
];
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const lockerRoutes = require('./routes/lockers');
const bookingRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'https://aonapps.in:6075'
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/bookings', bookingRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`Locker rental API running on http://localhost:${PORT}`);
});
