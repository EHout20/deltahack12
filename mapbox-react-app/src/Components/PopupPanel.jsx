import React from 'react';

export default function PopupPanel({ popup, onClose }) {
  if (!popup) return null;

  return (
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
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
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

      <button
        onClick={onClose}
        style={{
          marginTop: 'auto',
          padding: '12px 20px',
          backgroundColor: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Close
      </button>
    </div>
  );
}