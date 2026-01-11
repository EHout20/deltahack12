/**
 * Export sensor data to CSV file
 * @param {Array} sensorHistory - Array of sensor readings with time, ph, lead, pm25
 * @param {String} mineName - Name of the mine for the filename
 */
export function exportSensorDataToCSV(sensorHistory, mineName) {
  if (!sensorHistory || sensorHistory.length === 0) {
    alert('No sensor data to export');
    return;
  }

  // Create CSV header
  const headers = ['Timestamp', 'pH Level', 'Lead (ppm)', 'PM2.5 (µg/m³)'];
  
  // Create CSV rows
  const rows = sensorHistory.map(reading => [
    reading.time || '',
    reading.ph || '',
    reading.lead || '',
    reading.pm25 || ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const sanitizedMineName = mineName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${sanitizedMineName}_sensor_data_${timestamp}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
