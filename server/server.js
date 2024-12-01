// server.js

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL database.');
});

// Make db accessible to routers
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Import API routes
const apiRoutes = require('./routes/api');

// Use API routes
app.use('/api', apiRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('TrackNest Backend is running.');
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});
