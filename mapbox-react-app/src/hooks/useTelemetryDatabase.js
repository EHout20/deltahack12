import { useCallback } from 'react';

const API_URL = 'http://localhost:3001/api';

export function useTelemetryDatabase() {
  // Send sensor reading to database
  const recordSensorReading = useCallback(async (mineId, ph, lead, pm25) => {
    try {
      const response = await fetch(`${API_URL}/sensor-readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mine_id: mineId, ph, lead, pm25 })
      });
      if (!response.ok) console.error('Failed to record sensor reading');
      return response.json();
    } catch (error) {
      console.error('Database error:', error);
    }
  }, []);

  // Save mine info to database
  const saveMine = useCallback(async (mineData) => {
    try {
      const response = await fetch(`${API_URL}/mines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mineData)
      });
      if (!response.ok) console.error('Failed to save mine');
      return response.json();
    } catch (error) {
      console.error('Database error:', error);
    }
  }, []);

  // Get sensor readings for a mine
  const getSensorReadings = useCallback(async (mineId, limit = 100) => {
    try {
      const response = await fetch(`${API_URL}/sensor-readings/${mineId}?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch readings');
      return response.json();
    } catch (error) {
      console.error('Database error:', error);
      return [];
    }
  }, []);

  // Get statistics for a mine
  const getMineStats = useCallback(async (mineId) => {
    try {
      const response = await fetch(`${API_URL}/stats/mine/${mineId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }, []);

  // Export data
  const exportData = useCallback(async (format = 'json') => {
    try {
      const endpoint = format === 'csv' ? '/export/csv' : '/export/json';
      const response = await fetch(`${API_URL}${endpoint}`);
      if (!response.ok) throw new Error(`Failed to export ${format.toUpperCase()}`);
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `telemetry_export.${format === 'csv' ? 'csv' : 'json'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  }, []);

  // Clear all telemetry data
  const clearAllData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/clear-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) console.error('Failed to clear data');
      return response.json();
    } catch (error) {
      console.error('Clear data error:', error);
    }
  }, []);

  return {
    recordSensorReading,
    saveMine,
    getSensorReadings,
    getMineStats,
    exportData,
    clearAllData
  };
}
