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
  const lightStyle = 'mapbox://styles/markokosoric/cmk8z3ajc000y01s98ipybdn2';
  const darkStyle = 'mapbox://styles/markokosoric/cmk9062a3000u01s0ed52gb7g';
    
  const [theme, setTheme] = useState("light");
  const mapRef = useRef()
  const mapContainerRef = useRef()
  const [inputValue, setInputValue] = useState("");
  const [popup, setPopup] = useState(null);
  const [allMines, setAllMines] = useState([]);
  const [locationSearch, setLocationSearch] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [dateDisplay, setDateDisplay] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));

  useEffect(() => {
    // Telemetry loop: 1 second = 1 day of simulated time
    let elapsedDays = 0;
    const telemetryInterval = setInterval(() => {
      elapsedDays += 1;
      
      // Update date (add days to today)
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + elapsedDays);
      setDateDisplay(newDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));
      
      // Update all mines data based on elapsed time
      setAllMines(prevMines => prevMines.map(mine => {
        const timeFactorDays = elapsedDays;
        
        // Calculate degradation based on time
        // pH: decreases exponentially (becomes more acidic) - starts around 7, decreases
        const basePh = 7.0;
        const phDecay = basePh - (2.0 * (1 - Math.exp(-timeFactorDays / 50))); // Exponential decay towards acidic
        
        // Lead: increases exponentially (accumulation) - starts around 20, grows fast
        const baseLead = 20;
        const leadGrowth = baseLead * Math.exp(timeFactorDays / 100); // Exponential growth
        
        // PM2.5: increases logarithmically (gradual atmospheric buildup)
        const basePm25 = 15;
        const pm25Growth = basePm25 + (Math.log(1 + timeFactorDays / 5) * 8); // Logarithmic growth
        
        // Calculate risk score based on sensor values
        const phScore = Math.max(0, Math.min(100, (7 - phDecay) * 15)); // Lower pH = higher risk
        const leadScore = Math.max(0, Math.min(100, (leadGrowth / 100) * 50)); // Higher lead = higher risk
        const pm25Score = Math.max(0, Math.min(100, (pm25Growth / 50) * 50)); // Higher pm25 = higher risk
        const riskScore = Math.round((phScore + leadScore + pm25Score) / 3);
        
        // Determine color based on risk score
        let color = '#4caf50'; // Green
        if (riskScore >= 75) color = '#f44336'; // Red
        else if (riskScore >= 35) color = '#ff9800'; // Orange
        
        return {
          ...mine,
          ph: Math.max(2, Math.min(10, parseFloat(phDecay.toFixed(2)))), // Clamp between 2-10
          lead: Math.min(300, parseFloat(leadGrowth.toFixed(1))), // Cap at 300 ppm
          pm25: Math.min(200, parseFloat(pm25Growth.toFixed(1))), // Cap at 200 µg/m³
          riskScore,
          color
        };
      }));
    }, 1000);
    
    return () => clearInterval(telemetryInterval);
  }, []);

  useEffect(() => {

    mapboxgl.accessToken = accessToken

     mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      // use a base style that shows topo; change to your preferred Mapbox style
      style: theme === "light" ? lightStyle : darkStyle,
      center: canadaCenter,
      zoom: 3.5,
      // pitch: 40, // tilt for 3D look
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
            },
            paint: {
              'text-color': theme === 'light' ? '#000' : '#fff'
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
            const coordinates = feature.geometry.coordinates;
            
            // Zoom into the clicked mine
            mapRef.current.fitBounds(
              [
                [coordinates[0] - 0.1, coordinates[1] - 0.1],
                [coordinates[0] + 0.1, coordinates[1] + 0.1]
              ],
              { padding: 100, maxZoom: 14 }
            );
            
            // Add breathing circle at mine location
            if (!mapRef.current.getSource('search-marker')) {
              mapRef.current.addSource('search-marker', {
                type: 'geojson',
                data: {
                  type: 'FeatureCollection',
                  features: [{
                    type: 'Feature',
                    geometry: {
                      type: 'Point',
                      coordinates: coordinates
                    },
                    properties: { name: feature.properties.name }
                  }]
                }
              });
              
              // Add breathing circle layer
              mapRef.current.addLayer({
                id: 'search-marker-circle',
                type: 'circle',
                source: 'search-marker',
                paint: {
                  'circle-radius': 40,
                  'circle-color': '#ff6b6b',
                  'circle-opacity': 0.3,
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ff6b6b',
                  'circle-stroke-opacity': 0.6
                }
              });
              
              // Add marker symbol on top
              mapRef.current.addLayer({
                id: 'search-marker',
                type: 'symbol',
                source: 'search-marker',
                layout: {
                  'icon-image': 'marker-15',
                  'icon-size': 2,
                  'text-field': '⛏',
                  'text-size': 20,
                  'text-offset': [0, -0.6]
                }
              });
              
              // Breathing animation
              let pulseIndex = 0;
              const pulseInterval = setInterval(() => {
                pulseIndex = (pulseIndex + 1) % 100;
                const radiusScale = 0.8 + Math.sin((pulseIndex / 100) * Math.PI * 2) * 0.2;
                const opacityScale = 0.2 + Math.sin((pulseIndex / 100) * Math.PI * 2) * 0.2;
                
                mapRef.current.setPaintProperty('search-marker-circle', 'circle-radius', 40 * radiusScale);
                mapRef.current.setPaintProperty('search-marker-circle', 'circle-opacity', 0.3 * opacityScale);
              }, 30);
              
              // Store interval ID for cleanup
              mapRef.current.pulseInterval = pulseInterval;
            } else {
              mapRef.current.getSource('search-marker').setData({
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: coordinates
                  },
                  properties: { name: feature.properties.name }
                }]
              });
            }
            
            setPopup({
              coordinates: coordinates,
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
  }, [theme]);


return (
  <>
        {/* Theme Toggle Button */}
   <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 30
    }}>
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        style={{
          padding: '10px 16px',
         backgroundColor: theme === 'light' ? '#fff' : '#333',
          color: theme === 'light' ? '#333' : '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'all 0.3s ease'
        }}
      >
        {theme === 'light' ? ' Dark Mode' : ' Light Mode'}
      </button>
    </div>

    <div style={{
        margin: '10px 10px 0 0',
        width: 300,
        right: 0,
        top: 0,
        position: 'absolute',
        zIndex: 30 }}></div>        
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
            backgroundColor: theme === 'light' ? 'white' : '#2a2a2a',
            border: `1px solid ${theme === 'light' ? '#ccc' : '#444'}`,
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
                    Math.min(...lngs) - 0.2,
                    Math.min(...lats) - 0.2,
                    Math.max(...lngs) + 0.2,
                    Math.max(...lats) + 0.2
                  ];
                  
                  // Zoom to bounds with tighter padding
                  mapRef.current.fitBounds(bbox, { padding: 100, maxZoom: 14 });
                  
                  // Add a marker for the first mine at the location
                  const firstMine = matchingMines[0];
                  const el = document.createElement('div');
                  el.style.width = '30px';
                  el.style.height = '30px';
                  el.style.backgroundColor = '#ff6b6b';
                  el.style.borderRadius = '50%';
                  el.style.border = '3px solid white';
                  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                  el.style.display = 'flex';
                  el.style.alignItems = 'center';
                  el.style.justifyContent = 'center';
                  el.style.fontSize = '16px';
                  el.innerHTML = '⛏';
                  
                  if (!mapRef.current.getSource('search-marker')) {
                    mapRef.current.addSource('search-marker', {
                      type: 'geojson',
                      data: {
                        type: 'FeatureCollection',
                        features: [{
                          type: 'Feature',
                          geometry: {
                            type: 'Point',
                            coordinates: firstMine.coordinates
                          },
                          properties: { name: name }
                        }]
                      }
                    });
                    
                    // Add breathing circle layer
                    mapRef.current.addLayer({
                      id: 'search-marker-circle',
                      type: 'circle',
                      source: 'search-marker',
                      paint: {
                        'circle-radius': 40,
                        'circle-color': '#ff6b6b',
                        'circle-opacity': 0.3,
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ff6b6b',
                        'circle-stroke-opacity': 0.6
                      }
                    });
                    
                    // Add marker symbol on top
                    mapRef.current.addLayer({
                      id: 'search-marker',
                      type: 'symbol',
                      source: 'search-marker',
                      layout: {
                        'icon-image': 'marker-15',
                        'icon-size': 2,
                        'text-field': '⛏',
                        'text-size': 20,
                        'text-offset': [0, -0.6]
                      }
                    });
                    
                    // Breathing animation
                    let pulseIndex = 0;
                    const pulseInterval = setInterval(() => {
                      pulseIndex = (pulseIndex + 1) % 100;
                      const radiusScale = 0.8 + Math.sin((pulseIndex / 100) * Math.PI * 2) * 0.2;
                      const opacityScale = 0.2 + Math.sin((pulseIndex / 100) * Math.PI * 2) * 0.2;
                      
                      mapRef.current.setPaintProperty('search-marker-circle', 'circle-radius', 40 * radiusScale);
                      mapRef.current.setPaintProperty('search-marker-circle', 'circle-opacity', 0.3 * opacityScale);
                    }, 30);
                    
                    // Store interval ID for cleanup
                    mapRef.current.pulseInterval = pulseInterval;
                  } else {
                    mapRef.current.getSource('search-marker').setData({
                      type: 'FeatureCollection',
                      features: [{
                        type: 'Feature',
                        geometry: {
                          type: 'Point',
                          coordinates: firstMine.coordinates
                        },
                        properties: { name: name }
                      }]
                    });
                  }
                  
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
                  borderBottom: idx < searchSuggestions.length - 1 ? `1px solid ${theme === 'light' ? '#eee' : '#444'}` : 'none',
                  transition: 'background 0.2s',
                  color: theme === 'light' ? '#333' : '#fff'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === 'light' ? '#f5f5f5' : '#3a3a3a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme === 'light' ? 'white' : '#2a2a2a'}
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
        backgroundColor: theme === 'light' ? '#fff' : '#1e1e1e',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 20,
        width: '400px', 
        overflowY: 'auto',
        fontFamily: 'Arial, sans-serif',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ padding: '24px' }}>
          {/* HEADER */}
          <div style={{ borderBottom: theme === 'light' ? '1px solid #eee' : '1px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: theme === 'light' ? '#333' : '#fff' }}>{locationSearch.name}</h2>
                <p style={{ margin: '5px 0 0', color: theme === 'light' ? '#666' : '#aaa' }}>
                  {locationSearch.mines.length} mines found in this area
                </p>
              </div>
              <div style={{ fontSize: '12px', color: theme === 'light' ? '#888' : '#666', textAlign: 'right', cursor: 'pointer' }} onClick={() => setDateDisplay(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))}>
                {dateDisplay}
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            {locationSearch.mines.map((mine, idx) => (
              <div key={idx} style={{
                padding: '16px',
                marginBottom: '15px',
                border: theme === 'light' ? '1px solid #e0e0e0' : '1px solid #333',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                backgroundColor: theme === 'light' ? 'white' : '#2a2a2a'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'light' ? '#f8f9fa' : '#333';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'light' ? 'white' : '#2a2a2a';
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
                <div style={{ fontWeight: 'bold', color: theme === 'light' ? '#333' : '#fff', marginBottom: '8px', fontSize: '16px' }}>
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
                
                <div style={{ fontSize: '13px', color: theme === 'light' ? '#666' : '#aaa', marginTop: '6px' }}>
                  {mine.location !== 'Unknown' && `📍 ${mine.location}`}
                  {mine.county !== 'Unknown' && ` • ${mine.county}`}
                </div>
                
                <div style={{ fontSize: '12px', color: theme === 'light' ? '#888' : '#666', marginTop: '6px' }}>
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
              backgroundColor: theme === 'light' ? '#eee' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: theme === 'light' ? '#555' : '#aaa'
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
        backgroundColor: theme === 'light' ? 'white' : '#1e1e1e',
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
          <div style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#333'}`, paddingBottom: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: `${theme === 'light' ? '#eee' : '#333'}` }}>{popup.properties.name || 'Unknown Mine'}</h2>
                <p style={{ margin: '5px 0 0', color: '#666' }}>
                  Latitude: {popup.coordinates[1].toFixed(4)}, Longitude: {popup.coordinates[0].toFixed(4)}
                </p>
              </div>
              <div style={{ fontSize: '12px', color: '#888', textAlign: 'right', cursor: 'pointer' }} onClick={() => setDateDisplay(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))}>
                {dateDisplay}
              </div>
            </div>
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

        
       <h4 style={{ color: theme === 'light' ? '#888' : '#666', textTransform: 'uppercase', fontSize: '12px' }}>Live Sensor Readings</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
          
        {/*water */}
  <div style={{ background: theme === 'light' ? '#f8f9fa' : '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
    <div style={{ color: theme === 'light' ? '#666' : '#aaa', fontSize: '12px' }}>Water Acidity</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#fff' }}>
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
  <div style={{ background: theme === 'light' ? '#f8f9fa' : '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
    <div style={{ color: theme === 'light' ? '#666' : '#aaa', fontSize: '12px' }}>Soil Lead (Pb)</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#fff' }}>
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
  <div style={{ background: theme === 'light' ? '#f8f9fa' : '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
    <div style={{ color: theme === 'light' ? '#666' : '#aaa', fontSize: '12px' }}>Air Quality</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#fff' }}>
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
            backgroundColor: theme === 'light' ? '#eee' : '#333',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
           color: theme === 'light' ? '#555' : '#aaa'
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