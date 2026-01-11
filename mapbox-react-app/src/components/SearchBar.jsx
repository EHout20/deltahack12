export default function SearchBar({
  inputValue,
  onChange,
  searchSuggestions,
  onSuggestionClick,
  theme,
  popup,
  locationSearch
}) {
  return (
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
          onChange={onChange}
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
              onClick={() => onSuggestionClick(name)}
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
  );
}
