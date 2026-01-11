import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { generateSensorData } from '../risk';
import { 
  accessToken, 
  canadaCenter, 
  canadaBounds, 
  lightStyle, 
  darkStyle 
} from '../constants/mapConfig';

export function useMapboxInit(mapRef, mapContainerRef, minesGeoRef, setAllMines, setPopup, setLocationSearch) {
  useEffect(() => {
    mapboxgl.accessToken = accessToken;
    
    // Hide map container initially until bounds are calculated
    if (mapContainerRef.current) {
      mapContainerRef.current.style.opacity = '0';
    }

    try {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: lightStyle,
        center: [-96.0, 60.0], // Better initial center for Canada
        zoom: 3.2, // Better initial zoom for Canada
        projection: 'mercator',
        maxBounds: canadaBounds,
        minZoom: 3,
        maxZoom: 15
      });

      console.log('Mapbox map created successfully');
      
      mapRef.current.on('error', (e) => {
        console.error('Mapbox error:', e);
      });
    } catch (error) {
      console.error('Failed to create Mapbox map:', error);
      return;
    }
    
    mapRef.current.on('load', () => {
      console.log('Map loaded, fetching CSV data...');
      fetch('/data.csv')
        .then(response => {
          console.log('CSV response status:', response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(csvText => {
          console.log('CSV data loaded, processing...');
          const lines = csvText.trim().split('\n');
          const headers = lines[0].split(',');
          
          const latIndex = headers.indexOf('Lat_DD');
          const lngIndex = headers.indexOf('Long_DD');
          const locationIndex = headers.indexOf('Location');
          const countyIndex = headers.indexOf('County');
          const nameIndex = headers.indexOf('Name');
          const statusIndex = headers.indexOf('Status');
          
          const features = [];
          const minesData = [];
          
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            const lat = parseFloat(row[latIndex]);
            const lng = parseFloat(row[lngIndex]);
            
            if (!isNaN(lat) && !isNaN(lng)) {
              const simData = generateSensorData();
              const mineName = row[nameIndex] || 'Unknown';
              const locationValue = row[locationIndex] || '';
              const countyValue = row[countyIndex] || '';
              
              // Replace NULL or empty location with mine name (check if contains NULL anywhere)
              const location = (locationValue.toUpperCase().includes('NULL') || !locationValue.trim()) ? mineName : locationValue;
              const county = (countyValue.toUpperCase().includes('NULL') || !countyValue.trim()) ? 'Unknown' : countyValue;
              
              const mineData = {
                id: i,
                coordinates: [lng, lat],
                location: location,
                county: county,
                name: mineName,
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
          
          minesGeoRef.current = {
            type: 'FeatureCollection',
            features: features
          };
          
          // Calculate bounds to fit all mines
          if (features.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            features.forEach(feature => {
              bounds.extend(feature.geometry.coordinates);
            });
            
            // Fit the map to show all mines with padding (instant, no animation)
            mapRef.current.fitBounds(bounds, {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              maxZoom: 10,
              duration: 0
            });
            
            // Show map after bounds are properly set
            if (mapContainerRef.current) {
              mapContainerRef.current.style.opacity = '1';
            }
          }
          
          mapRef.current.addSource('mines', {
            type: 'geojson',
            data: minesGeoRef.current,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
          });
          
          mapRef.current.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'mines',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#800000',
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                20,
                100,
                30,
                750,
                40
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });
          
          mapRef.current.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'mines',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': [
                'step',
                ['get', 'point_count'],
                12,
                100,
                15,
                750,
                18
              ]
            },
            paint: {
              'text-color': '#ffffff'
            }
          });
          
          mapRef.current.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'mines',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': [
                'match',
                ['get', 'status'],
                'CRITICAL', '#ff1744',
                'MODERATE', '#ff9800',
                '#4caf50'
              ],
              'circle-radius': 8,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
            }
          });
          
          // Click handler for individual mines
          mapRef.current.on('click', 'unclustered-point', (e) => {
            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates;
            
            mapRef.current.fitBounds(
              [
                [coordinates[0] - 0.1, coordinates[1] - 0.1],
                [coordinates[0] + 0.1, coordinates[1] + 0.1]
              ],
              { padding: 100, maxZoom: 14 }
            );
            
            if (!mapRef.current.getSource('search-marker')) {
              mapRef.current.addSource('search-marker', {
                type: 'geojson',
                data: {
                  type: 'FeatureCollection',
                  features: [{
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates },
                    properties: { name: feature.properties.name }
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
                  'circle-stroke-opacity': 0.6,
                  'circle-pitch-alignment': 'map',
                  'circle-pitch-scale': 'map'
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
                  geometry: { type: 'Point', coordinates },
                  properties: { name: feature.properties.name }
                }]
              });
            }
            
            setPopup({
              coordinates,
              properties: feature.properties
            });
          });

          // Click handler for clusters
          mapRef.current.on('click', 'clusters', (e) => {
            const features = mapRef.current.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            if (!features.length) return;
            const cluster = features[0];
            const clusterId = cluster.properties.cluster_id;

            mapRef.current.getSource('mines').getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;
              mapRef.current.easeTo({
                center: cluster.geometry.coordinates,
                zoom: zoom
              });
            });
          });
          
          // Cursor handlers
          mapRef.current.on('mouseenter', 'unclustered-point', () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          });
          mapRef.current.on('mouseleave', 'unclustered-point', () => {
            mapRef.current.getCanvas().style.cursor = '';
          });
          mapRef.current.on('mouseenter', 'clusters', () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
          });
          mapRef.current.on('mouseleave', 'clusters', () => {
            mapRef.current.getCanvas().style.cursor = '';
          });
        })
        .catch(error => {
          console.error('Error loading CSV:', error);
          // Show map even if CSV loading fails
          if (mapContainerRef.current) {
            mapContainerRef.current.style.opacity = '1';
          }
        });
    });

    return () => {
      mapRef.current.remove();
    };
  }, []);
}

export function useMapboxTheme(mapRef, minesGeoRef, theme) {
  useEffect(() => {
    if (!mapRef.current) return;

    const newStyle = theme === 'light' ? lightStyle : darkStyle;

    const applyStyle = () => {
      mapRef.current.setStyle(newStyle);

      mapRef.current.once('style.load', () => {
        if (!minesGeoRef.current) return;
        if (mapRef.current.getSource('mines')) return;

        mapRef.current.addSource('mines', {
          type: 'geojson',
          data: minesGeoRef.current,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        mapRef.current.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'mines',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#800000',
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100,
              30,
              750,
              40
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        mapRef.current.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'mines',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': [
              'step',
              ['get', 'point_count'],
              12,
              100,
              15,
              750,
              18
            ]
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        mapRef.current.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'mines',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match',
              ['get', 'status'],
              'CRITICAL', '#ff1744',
              'MODERATE', '#ff9800',
              '#4caf50'
            ],
            'circle-radius': 8,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        });
      });
    };

    if (mapRef.current.isStyleLoaded()) {
      applyStyle();
    } else {
      mapRef.current.once('load', applyStyle);
    }
  }, [theme, mapRef, minesGeoRef]);
}
