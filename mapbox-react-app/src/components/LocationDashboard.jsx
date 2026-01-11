export default function LocationDashboard({
  locationSearch,
  theme,
  dateDisplay,
  onMineClick,
  onClose,
  onDateClick
}) {
  if (!locationSearch) return null;

  return (
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
              <h2 style={{ margin: 0, fontSize: '24px', color: theme === 'light' ? '#333' : '#fff' }}>
                {locationSearch.name}
              </h2>
              <p style={{ margin: '5px 0 0', color: theme === 'light' ? '#666' : '#aaa' }}>
                {locationSearch.mines.length} mines found in this area
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
        
        <div style={{ marginBottom: '20px' }}>
          {locationSearch.mines.map((mine, idx) => (
            <div 
              key={idx} 
              style={{
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
              onClick={() => onMineClick(mine)}
            >
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
