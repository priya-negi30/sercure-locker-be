const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'locker-secret-key-change-me';

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function ownerOnly(req, res, next) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Only locker owners can perform this action' });
  }
  next();
}

function renterOnly(req, res, next) {
  if (req.user.role !== 'renter') {
    return res.status(403).json({ message: 'Only renters can perform this action' });
  }
  next();
}

module.exports = { authRequired, ownerOnly, renterOnly, JWT_SECRET };
