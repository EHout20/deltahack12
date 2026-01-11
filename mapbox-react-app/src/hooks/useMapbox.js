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

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: lightStyle,
      center: canadaCenter,
      zoom: 3.5,
      projection: 'mercator',
      maxBounds: canadaBounds,
      minZoom: 3,
      maxZoom: 15
    });
    
    mapRef.current.on('load', () => {
      fetch('/data.csv')
        .then(response => response.text())
        .then(csvText => {
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
          
          minesGeoRef.current = {
            type: 'FeatureCollection',
            features: features
          };
          
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
              'text-color': '#000'
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
                'CRITICAL', '#f44336',
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
        .catch(error => console.error('Error loading CSV:', error));
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

        mapRef.current.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'mines',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match',
              ['get', 'status'],
              'CRITICAL', '#f44336',
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
