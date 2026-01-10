import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { SearchBox } from '@mapbox/search-js-react'
import { generateSensorData } from './risk';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const center = [-79.8711, 43.2557];

function App() {

  const mapRef = useRef()
  const mapContainerRef = useRef()
  const [inputValue, setInputValue] = useState("");
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    mapboxgl.accessToken = accessToken

     mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center:  center,
      zoom: 8,
      projection: 'mercator',
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
          
          // Build GeoJSON features array (much faster than individual markers)
          const features = [];
          
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            const lat = parseFloat(row[latIndex]);
            const lng = parseFloat(row[lngIndex]);
            
            if (!isNaN(lat) && !isNaN(lng)) {
              const simData = generateSensorData(); //sim data 
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                properties: {id: i,
                   ...simData
                  }
              });
            }
          }
          
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
          
          // Change cursor on hover
          mapRef.current.on('mouseenter', 'unclustered-point', () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          });
          mapRef.current.on('mouseleave', 'unclustered-point', () => {
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
    <div style={{
        margin: '10px 10px 0 0',
        width: 300,
        right: 0,
        top: 0,
        position: 'absolute',
        zIndex: 30 }}>
        <SearchBox
            accessToken={accessToken}
            map={mapRef.current}
            mapboxgl={mapboxgl}
            value={inputValue}
            proximity={center}
            onChange={(d) => {
            setInputValue(d);
            }}
            marker
        />
    </div>
    <div id='map-container' ref={mapContainerRef} />
    
    {/* Popup Box */}
    {popup && (
      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'white',
        padding: '24px',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 20,
        width: '400px', 
        overflowY: 'auto',
        fontFamily: 'Arial, sans-serif'
      }}>
        
        {/* HEADER */}
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>Analytics</h2>
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
            width: '100%',
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
    )}
  </>
  )
}

export default App