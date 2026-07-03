const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: String(process.env.DB_SERVER || 'your-actual-server-address.database.windows.net'), 
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

// Create a global pool connection reference
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to SQL Server successfully!');
    return pool;
  })
  .catch(err => {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
  });

module.exports = {
  sql,
  poolPromise
};
// const fs = require('fs');
// const path = require('path');

// const DB_PATH = path.join(__dirname, 'data', 'db.json');

// function ensureDb() {
//   const dir = path.dirname(DB_PATH);
//   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//   if (!fs.existsSync(DB_PATH)) {
//     fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], lockers: [], bookings: [] }, null, 2));
//   }
// }

// function readDb() {
//   ensureDb();
//   return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
// }

// function writeDb(data) {
//   fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
// }

// module.exports = { readDb, writeDb };
