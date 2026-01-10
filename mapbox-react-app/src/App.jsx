import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { SearchBox } from '@mapbox/search-js-react'

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
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                properties: {}
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
              'circle-color': '#11b4da',
              'circle-radius': 6,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
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
        padding: '20px',
        boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.2)',
        zIndex: 20,
        width: '35%',
        overflowY: 'auto'
      }}>
        <button
          onClick={() => setPopup(null)}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '28px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#333',
            padding: '0',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>
        
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Mine Location</h3>
        <p><strong>Latitude:</strong> {popup.coordinates[1].toFixed(4)}</p>
        <p><strong>Longitude:</strong> {popup.coordinates[0].toFixed(4)}</p>
        {popup.properties && Object.keys(popup.properties).length > 0 && (
          <div>
            <h4>Details:</h4>
            {Object.entries(popup.properties).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {value}</p>
            ))}
          </div>
        )}
      </div>
    )}
  </>
  )
}

export default App

