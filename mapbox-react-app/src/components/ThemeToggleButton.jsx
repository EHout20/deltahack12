export default function ThemeToggleButton({ theme, onToggle }) {
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 30
    }}>
      <button
        onClick={onToggle}
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
  );
}
