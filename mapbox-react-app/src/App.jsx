import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { generateSensorData } from './risk';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const canadaCenter = [-106.3, 56.1]; // Center of Canada
const canadaBounds = [
  [-145.0, 38.0],   // SW corner - extended bottom and left
  [-48.0, 83.1]     // NE corner - extended right
];

function App() {

  const mapRef = useRef()
  const mapContainerRef = useRef()
  const [inputValue, setInputValue] = useState("");
  const [popup, setPopup] = useState(null);
  const [allMines, setAllMines] = useState([]);
  const [locationSearch, setLocationSearch] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  useEffect(() => {
    mapboxgl.accessToken = accessToken

     mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: canadaCenter,
      zoom: 3.5,
      projection: 'mercator',
      maxBounds: canadaBounds,
      minZoom: 3,
      maxZoom: 15
    });

    // Wait for map to load before adding data
    mapRef.current.on('load', () => {
      // Fetch and parse CSV data once
      fetch('/data.csv')
        .then(response => response.text())
        .then(csvText => {
          // Parse CSV efficiently
          const lines = csvText.trim().split('\n');
          const headers = lines[0].split(',');
          
          const latIndex = headers.indexOf('Lat_DD');
          const lngIndex = headers.indexOf('Long_DD');
          const locationIndex = headers.indexOf('Location');
          const countyIndex = headers.indexOf('County');
          const nameIndex = headers.indexOf('Name');
          const statusIndex = headers.indexOf('Status');
          
          // Build GeoJSON features array (much faster than individual markers)
          const features = [];
          const minesData = [];
          
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            const lat = parseFloat(row[latIndex]);
            const lng = parseFloat(row[lngIndex]);
            
            if (!isNaN(lat) && !isNaN(lng)) {
              const simData = generateSensorData(); //sim data 
              const mineData = {
                id: i,
                coordinates: [lng, lat],
                location: row[locationIndex] || 'Unknown',
                county: row[countyIndex] || 'Unknown',
                name: row[nameIndex] || 'Unknown',
                status: row[statusIndex] || 'Unknown',
                ...simData
              };
              
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                properties: mineData
              });
              
              minesData.push(mineData);
            }
          }
          
          setAllMines(minesData);
          
          // Add source and layer once with all points
          mapRef.current.addSource('mines', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: features
            },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
          });
          
          // Add clustered circle layer
          mapRef.current.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'mines',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#51bbd6',
                100,
                '#f1f075',
                750,
                '#f28cb1'
              ],
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                20,
                100,
                30,
                750,
                40
              ]
            }
          });
          
          // Add cluster count label
          mapRef.current.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'mines',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12
            }
          });
          
          // Add unclustered points
          mapRef.current.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'mines',
            filter: ['!', ['has', 'point_count']],
            paint: {
              // --- OPTIONAL: COLOR DOTS BY RISK ---
                // If the risk status is 'CRITICAL', make the dot red on the map!
               'circle-color': [
                    'match',
                    ['get', 'status'], // check the 'status' property
                    'CRITICAL', '#f44336', // if Critical -> Red
                    'MODERATE', '#ff9800', // if Moderate -> Orange
                    '#4caf50' // Default -> Green
               ],
              'circle-radius': 8, // Made them slightly bigger
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'

              //'circle-color': '#11b4da',
              //'circle-radius': 6,
              //'circle-stroke-width': 1,
              //'circle-stroke-color': '#fff'
            }
          });
          
          // Add click listener to unclustered points
          mapRef.current.on('click', 'unclustered-point', (e) => {
            const feature = e.features[0];
            setPopup({
              coordinates: feature.geometry.coordinates,
              properties: feature.properties
            });
          });

          // Add click listener to clusters: zoom in to cluster expansion
          mapRef.current.on('click', 'clusters', (e) => {
            const features = mapRef.current.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            if (!features.length) return;
            const cluster = features[0];
            const clusterId = cluster.properties.cluster_id;

            mapRef.current.getSource('mines').getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) {
                console.error('getClusterExpansionZoom error:', err);
                return;
              }
              mapRef.current.easeTo({
                center: cluster.geometry.coordinates,
                zoom: zoom
              });
            });
          });
          
          // Change cursor on hover
          mapRef.current.on('mouseenter', 'unclustered-point', () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          });
          mapRef.current.on('mouseleave', 'unclustered-point', () => {
            mapRef.current.getCanvas().style.cursor = '';
          });
          // Change cursor on hover for clusters
          mapRef.current.on('mouseenter', 'clusters', () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          });
          mapRef.current.on('mouseleave', 'clusters', () => {
            mapRef.current.getCanvas().style.cursor = '';
          });
          
          console.log(`Loaded ${features.length} mine locations`);
        })
        .catch(error => console.error('Error loading CSV:', error));
    });

    return () => {
      mapRef.current.remove()
    }
  }, [])


return (
  <>
    {/* Search bar - always visible, transitions position */}
    <div style={{
        position: 'absolute',
        right: (popup || locationSearch) ? '0' : '0',
        top: (popup || locationSearch) ? '0' : '0',
        width: (popup || locationSearch) ? '400px' : '300px',
        margin: (popup || locationSearch) ? '0' : '10px 10px 0 0',
        zIndex: 40,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
      <div style={{ 
        padding: (popup || locationSearch) ? '10px' : '0', 
        backgroundColor: (popup || locationSearch) ? '#f8f9fa' : 'transparent',
        borderBottom: (popup || locationSearch) ? '1px solid #e0e0e0' : 'none',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <input
          type="text"
          placeholder="Search mine names..."
          value={inputValue}
          onChange={(e) => {
            const query = e.target.value;
            setInputValue(query);
            
            // Close any open dashboards when user starts typing
            if (popup) setPopup(null);
            if (locationSearch) setLocationSearch(null);
            
            if (query.length >= 2) {
              // Filter mines by name
              const matches = allMines.filter(mine => 
                mine.name.toLowerCase().includes(query.toLowerCase())
              );
              
              // Get unique mine names
              const uniqueNames = [...new Set(matches.map(m => m.name))].slice(0, 10);
              setSearchSuggestions(uniqueNames);
            } else {
              setSearchSuggestions([]);
            }
          }}
          style={{
            width: (popup || locationSearch) ? 'calc(100% + 20px)' : '100%',
            marginLeft: (popup || locationSearch) ? '-10px' : '0',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: (popup || locationSearch) ? '0' : '8px',
            boxShadow: (popup || locationSearch) ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
        
        {/* Search Suggestions Dropdown */}
        {searchSuggestions.length > 0 && !popup && !locationSearch && (
          <div style={{
            position: 'absolute',
            top: '50px',
            width: '100%',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 40
          }}>
            {searchSuggestions.map((name, idx) => (
              <div
                key={idx}
                onClick={() => {
                  // Find all mines with this name
                  const matchingMines = allMines.filter(mine => mine.name === name);
                  
                  // Calculate bounds for all matching mines
                  const lngs = matchingMines.map(m => m.coordinates[0]);
                  const lats = matchingMines.map(m => m.coordinates[1]);
                  const bbox = [
                    Math.min(...lngs) - 0.5,
                    Math.min(...lats) - 0.5,
                    Math.max(...lngs) + 0.5,
                    Math.max(...lats) + 0.5
                  ];
                  
                  // Zoom to bounds
                  mapRef.current.fitBounds(bbox, { padding: 50 });
                  
                  setLocationSearch({
                    name: name,
                    mines: matchingMines
                  });
                  
                  setInputValue(name);
                  setSearchSuggestions([]);
                }}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  borderBottom: idx < searchSuggestions.length - 1 ? '1px solid #eee' : 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                {name}
              </div>
            ))}
          </div>
        )}
    </div>
    <div id='map-container' ref={mapContainerRef} />
    
    {/* Location Search Results Dashboard */}
    {locationSearch && !popup && (
      <div style={{
        position: 'absolute',
        right: 0,
        top: '60px',
        bottom: 0,
        backgroundColor: 'white',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 20,
        width: '400px', 
        overflowY: 'auto',
        fontFamily: 'Arial, sans-serif',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ padding: '24px' }}>
          {/* HEADER */}
          <div style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>{locationSearch.name}</h2>
            <p style={{ margin: '5px 0 0', color: '#666' }}>
              {locationSearch.mines.length} mines found in this area
            </p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            {locationSearch.mines.map((mine, idx) => (
              <div key={idx} style={{
                padding: '16px',
                marginBottom: '15px',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              }}
              onClick={() => {
                mapRef.current.flyTo({
                  center: mine.coordinates,
                  zoom: 12
                });
                setLocationSearch(null);
                setPopup({
                  coordinates: mine.coordinates,
                  properties: mine
                });
              }}>
                <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '8px', fontSize: '16px' }}>
                  {mine.name}
                </div>
                
                {/* Risk Badge */}
                <div style={{
                  display: 'inline-block',
                  backgroundColor: mine.color,
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {mine.status} - {mine.riskScore}/100
                </div>
                
                <div style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>
                  {mine.location !== 'Unknown' && `📍 ${mine.location}`}
                  {mine.county !== 'Unknown' && ` • ${mine.county}`}
                </div>
                
                <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                  Lat: {mine.coordinates[1].toFixed(4)}, Lng: {mine.coordinates[0].toFixed(4)}
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => setLocationSearch(null)}
            style={{
              width: 'calc(100% - 48px)',
              margin: '0 24px 24px 24px',
              padding: '12px',
              backgroundColor: '#eee',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#555'
            }}
          >
            Close Dashboard
          </button>
        </div>
      </div>
    )}
    
    {/* Popup Box */}
    {popup && (
      <div style={{
        position: 'absolute',
        right: 0,
        top: '60px',
        bottom: 0,
        backgroundColor: 'white',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 20,
        width: '400px', 
        overflowY: 'auto',
        fontFamily: 'Arial, sans-serif',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Search bar at top */}
        
        <div style={{ padding: '24px' }}>
          {/* HEADER */}
          <div style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>{popup.properties.name || 'Unknown Mine'}</h2>
            <p style={{ margin: '5px 0 0', color: '#666' }}>
            Latitude: {popup.coordinates[1].toFixed(4)}, Longitude: {popup.coordinates[0].toFixed(4)}
          </p>
        </div>

        {/* risk */}
        <div style={{ 
          backgroundColor: popup.properties.color, 
          color: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '25px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Ecological Risk Index
          </div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '10px 0' }}>
            {popup.properties.riskScore}/100
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {popup.properties.status}
          </div>
        </div>

        
        <h4 style={{ color: '#888', textTransform: 'uppercase', fontSize: '12px' }}>Live Sensor Readings</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
          
        {/*water */}
  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
    <div style={{ color: '#666', fontSize: '12px' }}>Water Acidity</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
      {popup.properties.ph} <span style={{fontSize:'14px'}}>pH</span>
    </div>
    <div style={{ 
        fontSize: '11px', 
        fontWeight: 'bold',
        color: popup.properties.ph < 5.0 ? '#f44336' : (popup.properties.ph < 6.8 ? '#ff9800' : '#4caf50') 
    }}>
      {popup.properties.ph < 5.0 ? '✗ Hazardous' : (popup.properties.ph < 6.8 ? '⚠ Warning' : '✓ Safe')}
    </div>
  </div>

  {/*soil */}
  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
    <div style={{ color: '#666', fontSize: '12px' }}>Soil Lead (Pb)</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
      {popup.properties.lead} <span style={{fontSize:'14px'}}>ppm</span>
    </div>
    <div style={{ 
        fontSize: '11px', 
        fontWeight: 'bold',
        color: popup.properties.lead > 70 ? '#f44336' : (popup.properties.lead > 40 ? '#ff9800' : '#4caf50') 
    }}>
      {popup.properties.lead > 70 ? '✗ Hazardous' : (popup.properties.lead > 40 ? '⚠ Warning' : '✓ Safe')}
    </div>
  </div>

  {/* air */}
  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
    <div style={{ color: '#666', fontSize: '12px' }}>Air Quality</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
      {popup.properties.pm25} <span style={{fontSize:'14px'}}>µg/m³</span>
    </div>
    <div style={{ 
        fontSize: '11px', 
        fontWeight: 'bold',
        color: popup.properties.pm25 > 80 ? '#f44336' : (popup.properties.pm25 > 20 ? '#ff9800' : '#4caf50') 
    }}>
      {popup.properties.pm25 > 80 ? '✗ Hazardous' : (popup.properties.pm25 > 20 ? '⚠ Warning' : '✓ Safe')}
    </div>
  </div>
</div>

        <button
          onClick={() => setPopup(null)}
          style={{
            width: 'calc(100% - 48px)',
            margin: '0 24px 24px 24px',
            padding: '12px',
            backgroundColor: '#eee',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#555'
          }}
        >
          Close Dashboard
        </button>
        </div>
      </div>
    )}
  </>
  )
}

export default App