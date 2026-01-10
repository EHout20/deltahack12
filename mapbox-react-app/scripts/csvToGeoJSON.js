import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read CSV file
const csvPath = path.join(__dirname, '../public/data.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

// Get column indices
const latIndex = headers.indexOf('Lat_DD');
const lngIndex = headers.indexOf('Long_DD');
const nameIndex = headers.indexOf('Name');
const jurisdictionIndex = headers.indexOf('Jurisdiction');
const statusIndex = headers.indexOf('Status');
const commodityIndex = headers.indexOf('Commodity_Code');
const mineTypeIndex = headers.indexOf('Mine_Type');

// Group features by jurisdiction
const jurisdictionGroups = {};
const allFeatures = [];

// Parse each row
for (let i = 1; i < lines.length; i++) {
  const row = lines[i].split(',');
  const lat = parseFloat(row[latIndex]);
  const lng = parseFloat(row[lngIndex]);
  
  if (!isNaN(lat) && !isNaN(lng)) {
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: {
        name: row[nameIndex] || 'Unknown',
        jurisdiction: row[jurisdictionIndex] || 'Unknown',
        status: row[statusIndex] || 'Unknown',
        commodity: row[commodityIndex] || '',
        mineType: row[mineTypeIndex] || '',
        latitude: lat,
        longitude: lng
      }
    };
    
    // Add to all features
    allFeatures.push(feature);
    
    // Group by jurisdiction
    const jurisdiction = row[jurisdictionIndex] || 'Unknown';
    if (!jurisdictionGroups[jurisdiction]) {
      jurisdictionGroups[jurisdiction] = [];
    }
    jurisdictionGroups[jurisdiction].push(feature);
  }
}

// Create geojson output directory
const geojsonDir = path.join(__dirname, '../public/geojson');
if (!fs.existsSync(geojsonDir)) {
  fs.mkdirSync(geojsonDir, { recursive: true });
}

// Write all mines to single file
const allMinesGeoJSON = {
  type: 'FeatureCollection',
  features: allFeatures
};
fs.writeFileSync(
  path.join(geojsonDir, 'all-mines.geojson'),
  JSON.stringify(allMinesGeoJSON, null, 2)
);
console.log(`Created all-mines.geojson with ${allFeatures.length} features`);

// Write separate files for each jurisdiction
for (const [jurisdiction, features] of Object.entries(jurisdictionGroups)) {
  const geoJSON = {
    type: 'FeatureCollection',
    features: features
  };
  
  const filename = `mines-${jurisdiction.toLowerCase().replace(/\s+/g, '-')}.geojson`;
  fs.writeFileSync(
    path.join(geojsonDir, filename),
    JSON.stringify(geoJSON, null, 2)
  );
  console.log(`Created ${filename} with ${features.length} features`);
}

console.log('\nGeoJSON conversion complete!');
console.log(`Total jurisdictions: ${Object.keys(jurisdictionGroups).length}`);
console.log(`Total features: ${allFeatures.length}`);
