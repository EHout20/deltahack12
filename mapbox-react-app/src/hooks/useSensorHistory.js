import { useRef, useEffect } from 'react';

export function useSensorHistory() {
  const historyRef = useRef({});

  const addSensorReading = (mineId, mine) => {
    if (!historyRef.current[mineId]) {
      historyRef.current[mineId] = [];
    }

    const time = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });

    historyRef.current[mineId].push({
      time,
      ph: parseFloat(mine.ph.toFixed(2)),
      lead: parseFloat(mine.lead.toFixed(1)),
      pm25: parseFloat(mine.pm25.toFixed(1))
    });

    // Keep only last 30 readings to avoid performance issues
    if (historyRef.current[mineId].length > 30) {
      historyRef.current[mineId].shift();
    }
  };

  const getSensorHistory = (mineId) => {
    return historyRef.current[mineId] || [];
  };

  const clearHistory = (mineId) => {
    delete historyRef.current[mineId];
  };

  return { addSensorReading, getSensorHistory, clearHistory };
}
