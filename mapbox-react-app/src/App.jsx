import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'
import ThemeToggleButton from './components/ThemeToggleButton';
import SearchBar from './components/SearchBar';
import LocationDashboard from './components/LocationDashboard';
import MineDetailsDashboard from './components/MineDetailsDashboard';
import { useTelemetry } from './hooks/useTelemetry';
import { useMapboxInit, useMapboxTheme } from './hooks/useMapbox';
import Title from './components/Title';

function App() {
  const [isVisible, setIsVisible] = useState(true);
  const [theme, setTheme] = useState("light");
  const mapRef = useRef();
  const minesGeoRef = useRef(null);
  const mapContainerRef = useRef();
  const [inputValue, setInputValue] = useState("");
  const [popup, setPopup] = useState(null);
  const [allMines, setAllMines] = useState([]);
  const [locationSearch, setLocationSearch] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [dateDisplay, setDateDisplay] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));
  const [telemetryHistory, setTelemetryHistory] = useState({});
  const searchTimeoutRef = useRef(null);

  // Custom hooks
  const elapsedDaysRef = useTelemetry(allMines, setAllMines, setDateDisplay);

  // Memoize mine names for faster search (only updates when count changes)
  const mineNameMap = useMemo(() => {
    const map = {};
    allMines.forEach(mine => {
      if (!map[mine.name]) {
        map[mine.name] = true;
      }
    });
    return Object.keys(map);
  }, [allMines.length]); // Only re-compute when count changes

  // Debounced search handler
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setInputValue(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      if (popup) setPopup(null);
      if (locationSearch) setLocationSearch(null);
      
      if (query.length >= 2) {
        const uniqueNames = mineNameMap.filter(name => 
          name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
        setSearchSuggestions(uniqueNames);
      } else {
        setSearchSuggestions([]);
      }
    }, 150); // 150ms debounce delay
  }, [mineNameMap, popup, locationSearch]);

  // Track telemetry history only for the currently viewed mine
  useEffect(() => {
    if (popup && allMines.length > 0) {
      const currentMine = allMines.find(m => m.id === popup.properties.id);
      if (currentMine) {
        setTelemetryHistory(prevHistory => {
          // If this mine has no history yet, backfill it with historical data
          if (!prevHistory[currentMine.id]) {
            const totalReadings = Math.floor(elapsedDaysRef.current / 7);
            const readingsToGenerate = Math.min(totalReadings, 20);
            const historicalData = [];
            
            for (let i = 0; i < readingsToGenerate; i++) {
              const readingNumber = Math.floor(elapsedDaysRef.current / 7) - readingsToGenerate + i + 1;
              const days = readingNumber * 7; // Each reading represents 7 days
              const basePh = 7.0;
              const phTrend = basePh - (2.0 * (1 - Math.exp(-days / 50)));
              const leadTrend = 20 * Math.exp(days / 100);
              const pm25Trend = 15 + (Math.log(1 + days / 5) * 8);
              
              historicalData.push({
                timestamp: Date.now() - (readingsToGenerate - i) * 7000,
                ph: Math.max(2, Math.min(10, phTrend + (Math.random() - 0.5) * 0.4)),
                lead: Math.max(0, Math.min(300, leadTrend + (Math.random() - 0.5) * 8)),
                pm25: Math.max(0, Math.min(200, pm25Trend + (Math.random() - 0.5) * 6))
              });
            }
            
            return {
              ...prevHistory,
              [currentMine.id]: historicalData
            };
          }
          
          // Otherwise, add new reading
          const mineHistory = prevHistory[currentMine.id];
          const newEntry = {
            timestamp: Date.now(),
            ph: currentMine.ph,
            lead: currentMine.lead,
            pm25: currentMine.pm25
          };
          
          // Keep only last 20 readings - remove oldest if we're at capacity
          const updatedHistory = mineHistory.length >= 20 
            ? [...mineHistory.slice(1), newEntry]  // Drop first, add to end
            : [...mineHistory, newEntry];           // Just append
          
          return {
            ...prevHistory,
            [currentMine.id]: updatedHistory
          };
        });
      }
    }
  }, [allMines, popup, elapsedDaysRef]);

  useMapboxInit(mapRef, mapContainerRef, minesGeoRef, setAllMines, setPopup, setLocationSearch);
  useMapboxTheme(mapRef, minesGeoRef, theme);

  const handleSuggestionClick = useCallback((name) => {
    const matchingMines = allMines.filter(mine => mine.name === name);
    
    const lngs = matchingMines.map(m => m.coordinates[0]);
    const lats = matchingMines.map(m => m.coordinates[1]);
    const bbox = [
      Math.min(...lngs) - 0.2,
      Math.min(...lats) - 0.2,
      Math.max(...lngs) + 0.2,
      Math.max(...lats) + 0.2
    ];
    
    mapRef.current.fitBounds(bbox, { padding: 100, maxZoom: 14 });
    
    const firstMine = matchingMines[0];
    
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
      
      let pulseIndex = 0;
      const pulseInterval = setInterval(() => {
        pulseIndex = (pulseIndex + 1) % 100;
        const radiusScale = 0.8 + Math.sin((pulseIndex / 100) * Math.PI * 2) * 0.2;
        const opacityScale = 0.2 + Math.sin((pulseIndex / 100) * Math.PI * 2) * 0.2;
        
        mapRef.current.setPaintProperty('search-marker-circle', 'circle-radius', 40 * radiusScale);
        mapRef.current.setPaintProperty('search-marker-circle', 'circle-opacity', 0.3 * opacityScale);
      }, 30);
      
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
  }, [allMines, mapRef]);

  const handleLocationMineClick = useCallback((mine) => {
    mapRef.current.flyTo({
      center: mine.coordinates,
      zoom: 12
    });
    setLocationSearch(null);
    setPopup({
      coordinates: mine.coordinates,
      properties: mine
    });
  }, [mapRef]);

  const handleDateClick = useCallback(() => {
    setDateDisplay(new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }));
  }, []);

  useEffect(() => {
    const handleTitleVisibility = () => {
      setIsVisible(false);
    };

    const events = ['click', 'scroll', 'keydown', 'touchstart', 'mousemove'];
    
    events.forEach(event => {
      document.addEventListener(event, handleTitleVisibility);
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleTitleVisibility);
      });
    };
  }, []);

  return (
    <>
      <Title theme={theme} isVisible={isVisible} />
      <ThemeToggleButton 
        theme={theme} 
        onToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
      />

      <div style={{
        margin: '10px 10px 0 0',
        width: 300,
        right: 0,
        top: 0,
        position: 'absolute',
        zIndex: 30 
      }} />
      
      <SearchBar
        inputValue={inputValue}
        onChange={handleSearchChange}
        searchSuggestions={searchSuggestions}
        onSuggestionClick={handleSuggestionClick}
        theme={theme}
        popup={popup}
        locationSearch={locationSearch}
      />
      
      <div id='map-container' ref={mapContainerRef} />
      
      <LocationDashboard
        locationSearch={locationSearch}
        theme={theme}
        dateDisplay={dateDisplay}
        onMineClick={handleLocationMineClick}
        onClose={() => setLocationSearch(null)}
        onDateClick={handleDateClick}
      />
      
      <MineDetailsDashboard
        popup={popup}
        theme={theme}
        dateDisplay={dateDisplay}
        onClose={() => setPopup(null)}
        onDateClick={handleDateClick}
        telemetryHistory={telemetryHistory}
        allMines={allMines}
        totalReadings={Math.floor(elapsedDaysRef.current / 7)}
      />
    </>
  )
}

export default App
