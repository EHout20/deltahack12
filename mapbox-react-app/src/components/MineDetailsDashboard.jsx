import SensorVisualization from './SensorVisualization';

export default function MineDetailsDashboard({ 
  popup, 
  theme, 
  dateDisplay, 
  onClose,
  onDateClick,
  telemetryHistory,
  allMines
}) {
  if (!popup) return null;

  // Get current live data for this specific mine
  const currentMine = allMines.find(m => m.id === popup.properties.id) || popup.properties;
  // Each mine has its own independent telemetry history
  const mineHistory = telemetryHistory[currentMine.id] || [];
  const mineId = currentMine.id;

  return (
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
      <div style={{ padding: '24px' }}>
        {/* HEADER */}
        <div style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#333'}`, paddingBottom: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', color: theme === 'light' ? '#333' : '#fff' }}>
                {currentMine.name || 'Unknown Mine'}
              </h2>
              <p style={{ margin: '5px 0 0', color: theme === 'light' ? '#666' : '#aaa' }}>
                Latitude: {popup.coordinates[1].toFixed(4)}, Longitude: {popup.coordinates[0].toFixed(4)}
              </p>
            </div>
            <div 
              style={{ fontSize: '12px', color: theme === 'light' ? '#888' : '#666', textAlign: 'right', cursor: 'pointer' }} 
              onClick={onDateClick}
            >
              {dateDisplay}
            </div>
          </div>
        </div>

        {/* Risk Score */}
        <div style={{ 
          backgroundColor: currentMine.color, 
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
            {currentMine.riskScore}/100
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {currentMine.status}
          </div>
        </div>

        {/* Sensor Readings */}
        <h4 style={{ color: theme === 'light' ? '#888' : '#666', textTransform: 'uppercase', fontSize: '12px' }}>
          Live Sensor Readings
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
          {/* Water Acidity */}
          <div style={{ background: theme === 'light' ? '#f8f9fa' : '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
            <div className="tooltip-trigger" style={{ color: theme === 'light' ? '#666' : '#aaa', fontSize: '12px', marginBottom: '5px' }}>
              Water Acidity
              <span className="tooltip-text" style={{ textAlign: 'left' }}>
                <strong>pH Scale</strong><br/>
                Measures water acidity. Low pH (&lt;6.5) can kill fish and leach heavy metals.
              </span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#fff' }}>
              {currentMine.ph} <span style={{fontSize:'14px'}}>pH</span>
            </div>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 'bold',
              color: currentMine.ph < 5.0 ? '#f44336' : (currentMine.ph < 6.8 ? '#ff9800' : '#4caf50') 
            }}>
              {currentMine.ph < 5.0 ? '✗ Hazardous' : (currentMine.ph < 6.8 ? '⚠ Warning' : '✓ Safe')}
            </div>
          </div>

          {/* Soil Lead */}
          <div style={{ background: theme === 'light' ? '#f8f9fa' : '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
            <div className="tooltip-trigger" style={{ color: theme === 'light' ? '#666' : '#aaa', fontSize: '12px', marginBottom: '5px' }}>
              Soil Lead (Pb)
              <span className="tooltip-text" style={{ textAlign: 'left' }}>
                <strong>lead parts per million (ppm)</strong><br/>
                Concentration of lead in soil. Levels above 70 ppm are toxic to wildlife and humans.
              </span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#fff' }}>
              {currentMine.lead} <span style={{fontSize:'14px'}}>ppm</span>
            </div>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 'bold',
              color: currentMine.lead > 70 ? '#f44336' : (currentMine.lead > 40 ? '#ff9800' : '#4caf50') 
            }}>
              {currentMine.lead > 70 ? '✗ Hazardous' : (currentMine.lead > 40 ? '⚠ Warning' : '✓ Safe')}
            </div>
          </div>

          {/* Air Quality */}
          <div style={{ background: theme === 'light' ? '#f8f9fa' : '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
            <div className="tooltip-trigger" style={{ color: theme === 'light' ? '#666' : '#aaa', fontSize: '12px', marginBottom: '5px' }}>
              Air Quality 
              <span className="tooltip-text" style={{ textAlign: 'left' }}>
                <strong>particulate matter (µg/m³)</strong><br/>
                Measures microscopic dust particles. High levels indicate industrial pollution.
              </span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#fff' }}>
              {currentMine.pm25} <span style={{fontSize:'14px'}}>µg/m³</span>
            </div>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 'bold',
              color: currentMine.pm25 > 80 ? '#f44336' : (currentMine.pm25 > 20 ? '#ff9800' : '#4caf50') 
            }}>
              {currentMine.pm25 > 80 ? '✗ Hazardous' : (currentMine.pm25 > 20 ? '⚠ Warning' : '✓ Safe')}
            </div>
          </div>
        </div>

        {/* Each mine gets its own isolated graph with key={mineId} to force re-render on mine change */}
        <SensorVisualization 
          key={`sensor-${mineId}`}
          mine={currentMine} 
          theme={theme} 
          history={mineHistory}
          mineId={mineId}
        />

        <button
          onClick={onClose}
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
  );
}
