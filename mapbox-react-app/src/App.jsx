import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { SearchBox } from '@mapbox/search-js-react'

import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const center = [-71.05953, 42.36290];

function App() {

  const mapRef = useRef()
  const mapContainerRef = useRef()
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    mapboxgl.accessToken = accessToken

     mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center:  center,
      zoom: 13,
    });

    // Fetch and parse CSV data
    fetch('/data.csv')
      .then(response => response.text())
      .then(csvText => {
        // Parse CSV
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        // Find column indexes
        const latIndex = headers.indexOf('Lat_DD');
        const lngIndex = headers.indexOf('Long_DD');
        
        // Add markers for each row
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',');
          const lat = parseFloat(row[latIndex]);
          const lng = parseFloat(row[lngIndex]);
          
          // Only add marker if coordinates are valid
          if (!isNaN(lat) && !isNaN(lng)) {
            new mapboxgl.Marker()
              .setLngLat([lng, lat])
              .addTo(mapRef.current);
          }
        }
      })
      .catch(error => console.error('Error loading CSV:', error));

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
        zIndex: 10 }}>
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
  </>
  )
}

export default App

