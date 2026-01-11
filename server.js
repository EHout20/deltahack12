import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.VITE_MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Mine Schema
const mineSchema = new mongoose.Schema({
  id: Number,
  name: String,
  location: String,
  county: String,
  jurisdiction: String,
  status: String,
  coordinates: [Number], // [lng, lat]
  commodity: String,
  mineType: String,
  // Sensor data
  ph: Number,
  lead: Number,
  pm25: Number,
  riskScore: Number,
  color: String,
  updatedAt: { type: Date, default: Date.now }
});

const Mine = mongoose.model('Mine', mineSchema);

// Seed initial data from GeoJSON
app.post('/api/seed', async (req, res) => {
  try {
    // Check if data already exists
    const count = await Mine.countDocuments();
    if (count > 0) {
      return res.json({ message: 'Database already seeded', count });
    }

    // Read GeoJSON file
    const geojsonPath = path.join(__dirname, 'mapbox-react-app/public/geojson/all-mines.geojson');
    const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

    // Transform and insert
    const mines = geojsonData.features.map((feature, idx) => ({
      id: idx,
      ...feature.properties,
      coordinates: feature.geometry.coordinates
    }));

    await Mine.insertMany(mines);
    res.json({ message: 'Database seeded successfully', count: mines.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all mines
app.get('/api/mines', async (req, res) => {
  try {
    const mines = await Mine.find();
    res.json(mines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single mine by ID
app.get('/api/mines/:id', async (req, res) => {
  try {
    const mine = await Mine.findById(req.params.id);
    res.json(mine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update mine sensor data
app.patch('/api/mines/:id', async (req, res) => {
  try {
    const mine = await Mine.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    res.json(mine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update multiple mines (for telemetry)
app.post('/api/mines/bulk-update', async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, ph, lead, pm25, riskScore, color }
    
    const results = await Promise.all(
      updates.map(update =>
        Mine.findByIdAndUpdate(
          update._id,
          { ...update, updatedAt: new Date() },
          { new: true }
        )
      )
    );
    
    res.json({ updated: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
