import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
const dbPath = path.join(__dirname, 'telemetry.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database error:', err);
  else console.log('Connected to SQLite database');
});

// Create tables if they don't exist
db.serialize(() => {
  // Mines table
  db.run(`
    CREATE TABLE IF NOT EXISTS mines (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE,
      latitude REAL,
      longitude REAL,
      status TEXT,
      riskScore INTEGER,
      color TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sensor readings table
  db.run(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY,
      mine_id INTEGER,
      ph REAL,
      lead REAL,
      pm25 REAL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(mine_id) REFERENCES mines(id)
    )
  `);

  // Create index for faster queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_mine_timestamp ON sensor_readings(mine_id, timestamp)`);
});

// API Routes

// Get all mines
app.get('/api/mines', (req, res) => {
  db.all('SELECT * FROM mines', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add or update mine
app.post('/api/mines', (req, res) => {
  const { id, name, latitude, longitude, status, riskScore, color } = req.body;
  
  db.run(
    `INSERT OR REPLACE INTO mines (id, name, latitude, longitude, status, riskScore, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, latitude, longitude, status, riskScore, color],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Mine saved' });
    }
  );
});

// Record sensor reading
app.post('/api/sensor-readings', (req, res) => {
  const { mine_id, ph, lead, pm25 } = req.body;
  
  if (!mine_id || ph === undefined || lead === undefined || pm25 === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run(
    `INSERT INTO sensor_readings (mine_id, ph, lead, pm25)
     VALUES (?, ?, ?, ?)`,
    [mine_id, ph, lead, pm25],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Get sensor readings for a specific mine
app.get('/api/sensor-readings/:mine_id', (req, res) => {
  const { mine_id } = req.params;
  const { limit = 100, offset = 0 } = req.query;

  db.all(
    `SELECT * FROM sensor_readings 
     WHERE mine_id = ? 
     ORDER BY timestamp DESC 
     LIMIT ? OFFSET ?`,
    [mine_id, limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.reverse()); // Return in chronological order
    }
  );
});

// Get all sensor readings (for ML export)
app.get('/api/sensor-readings', (req, res) => {
  const { mine_id, start_date, end_date } = req.query;
  
  let query = 'SELECT sr.*, m.name FROM sensor_readings sr LEFT JOIN mines m ON sr.mine_id = m.id';
  const params = [];
  const conditions = [];

  if (mine_id) {
    conditions.push('sr.mine_id = ?');
    params.push(mine_id);
  }

  if (start_date) {
    conditions.push('sr.timestamp >= ?');
    params.push(start_date);
  }

  if (end_date) {
    conditions.push('sr.timestamp <= ?');
    params.push(end_date);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY sr.timestamp DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Export sensor data as JSON
app.get('/api/export/json', (req, res) => {
  db.all(
    `SELECT sr.*, m.name FROM sensor_readings sr 
     LEFT JOIN mines m ON sr.mine_id = m.id 
     ORDER BY sr.timestamp`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.setHeader('Content-Disposition', 'attachment; filename="telemetry_export.json"');
      res.setHeader('Content-Type', 'application/json');
      res.json(rows);
    }
  );
});

// Export sensor data as CSV
app.get('/api/export/csv', (req, res) => {
  db.all(
    `SELECT sr.*, m.name FROM sensor_readings sr 
     LEFT JOIN mines m ON sr.mine_id = m.id 
     ORDER BY sr.timestamp`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // Create CSV content
      let csv = 'Mine Name,Mine ID,pH,Lead (ppm),PM2.5 (µg/m³),Timestamp\n';
      rows.forEach(row => {
        csv += `"${row.name || 'Unknown'}",${row.mine_id},${row.ph},${row.lead},${row.pm25},"${row.timestamp}"\n`;
      });

      res.setHeader('Content-Disposition', 'attachment; filename="telemetry_export.csv"');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    }
  );
});

// Get statistics for a mine
app.get('/api/stats/mine/:mine_id', (req, res) => {
  const { mine_id } = req.params;

  db.get(
    `SELECT 
      COUNT(*) as total_readings,
      AVG(ph) as avg_ph,
      MIN(ph) as min_ph,
      MAX(ph) as max_ph,
      AVG(lead) as avg_lead,
      MIN(lead) as min_lead,
      MAX(lead) as max_lead,
      AVG(pm25) as avg_pm25,
      MIN(pm25) as min_pm25,
      MAX(pm25) as max_pm25
     FROM sensor_readings 
     WHERE mine_id = ?`,
    [mine_id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Telemetry API running on http://localhost:${PORT}`);
  console.log(`✓ Database: ${dbPath}`);
  console.log(`✓ Export endpoints:`);
  console.log(`  - JSON: http://localhost:${PORT}/api/export/json`);
  console.log(`  - CSV: http://localhost:${PORT}/api/export/csv`);
});
// Clear all telemetry data
app.post('/api/clear-all', (req, res) => {
  db.run(`DELETE FROM sensor_readings`, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'All sensor readings cleared' });
  });
});
