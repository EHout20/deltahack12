import { memo } from 'react';

// Memoize and isolate each mine's visualization independently
const SensorVisualization = memo(function SensorVisualization({ mine, theme, history, mineId }) {
  if (!mine || !history || history.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: theme === 'light' ? '#666' : '#aaa',
        fontSize: '14px'
      }}>
        Collecting sensor data...
      </div>
    );
  }

  const chartHeight = 120;
  const chartWidth = 350;
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };

  // Helper function to create SVG path - uses history data specific to this mine
  const createPath = (data, valueKey, minVal, maxVal) => {
    const xStep = (chartWidth - padding.left - padding.right) / (data.length - 1 || 1);
    
    return data.map((point, i) => {
      const x = padding.left + i * xStep;
      const normalizedValue = (point[valueKey] - minVal) / (maxVal - minVal || 1);
      const y = chartHeight - padding.bottom - normalizedValue * (chartHeight - padding.top - padding.bottom);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const textColor = theme === 'light' ? '#333' : '#ccc';
  const gridColor = theme === 'light' ? '#e0e0e0' : '#404040';
  const bgColor = theme === 'light' ? '#f8f9fa' : '#2a2a2a';

  return (
    <div style={{ marginTop: '30px' }}>
      <h4 style={{ 
        color: theme === 'light' ? '#888' : '#666', 
        textTransform: 'uppercase', 
        fontSize: '12px',
        marginBottom: '20px'
      }}>
        Sensor Trends ({history.length} readings)
      </h4>

      {/* pH Chart */}
      <div style={{ 
        background: bgColor, 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '15px' 
      }}>
        <div style={{ fontSize: '12px', color: textColor, marginBottom: '10px', fontWeight: 'bold' }}>
          Water pH Level
        </div>
        <svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom);
            return (
              <line
                key={i}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={gridColor}
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            );
          })}
          
          {/* Y-axis labels */}
          {[4, 5, 6, 7, 8].map((value, i) => {
            const y = chartHeight - padding.bottom - (i / 4) * (chartHeight - padding.top - padding.bottom);
            return (
              <text
                key={value}
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill={textColor}
              >
                {value}
              </text>
            );
          })}

          {/* Danger zone */}
          <rect
            x={padding.left}
            y={chartHeight - padding.bottom - ((5.0 - 4) / 4) * (chartHeight - padding.top - padding.bottom)}
            width={chartWidth - padding.left - padding.right}
            height={((5.0 - 4) / 4) * (chartHeight - padding.top - padding.bottom)}
            fill="#f443361a"
          />

          {/* Line */}
          <path
            d={createPath(history, 'ph', 4, 8)}
            fill="none"
            stroke="#2196f3"
            strokeWidth="2"
          />

          {/* Data points */}
          {history.map((point, i) => {
            const xStep = (chartWidth - padding.left - padding.right) / (history.length - 1 || 1);
            const x = padding.left + i * xStep;
            const normalizedValue = (point.ph - 4) / 4;
            const y = chartHeight - padding.bottom - normalizedValue * (chartHeight - padding.top - padding.bottom);
            return <circle key={i} cx={x} cy={y} r="3" fill="#2196f3" />;
          })}

          {/* X-axis label */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 5}
            textAnchor="middle"
            fontSize="10"
            fill={textColor}
          >
            Time (days simulated)
          </text>
        </svg>
      </div>

      {/* Lead Chart */}
      <div style={{ 
        background: bgColor, 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '15px' 
      }}>
        <div style={{ fontSize: '12px', color: textColor, marginBottom: '10px', fontWeight: 'bold' }}>
          Soil Lead Concentration (ppm)
        </div>
        <svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom);
            return (
              <line
                key={i}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={gridColor}
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            );
          })}
          
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((value, i) => {
            const y = chartHeight - padding.bottom - (i / 4) * (chartHeight - padding.top - padding.bottom);
            return (
              <text
                key={value}
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill={textColor}
              >
                {value}
              </text>
            );
          })}

          {/* Danger zone */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth - padding.left - padding.right}
            height={(30 / 100) * (chartHeight - padding.top - padding.bottom)}
            fill="#f443361a"
          />

          {/* Line */}
          <path
            d={createPath(history, 'lead', 0, 100)}
            fill="none"
            stroke="#ff9800"
            strokeWidth="2"
          />

          {/* Data points */}
          {history.map((point, i) => {
            const xStep = (chartWidth - padding.left - padding.right) / (history.length - 1 || 1);
            const x = padding.left + i * xStep;
            const normalizedValue = point.lead / 100;
            const y = chartHeight - padding.bottom - normalizedValue * (chartHeight - padding.top - padding.bottom);
            return <circle key={i} cx={x} cy={y} r="3" fill="#ff9800" />;
          })}

          {/* X-axis label */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 5}
            textAnchor="middle"
            fontSize="10"
            fill={textColor}
          >
            Time (days simulated)
          </text>
        </svg>
      </div>

      {/* PM2.5 Chart */}
      <div style={{ 
        background: bgColor, 
        padding: '15px', 
        borderRadius: '8px' 
      }}>
        <div style={{ fontSize: '12px', color: textColor, marginBottom: '10px', fontWeight: 'bold' }}>
          Air Quality PM2.5 (µg/m³)
        </div>
        <svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom);
            return (
              <line
                key={i}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={gridColor}
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            );
          })}
          
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((value, i) => {
            const y = chartHeight - padding.bottom - (i / 4) * (chartHeight - padding.top - padding.bottom);
            return (
              <text
                key={value}
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill={textColor}
              >
                {value}
              </text>
            );
          })}

          {/* Danger zone */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth - padding.left - padding.right}
            height={(20 / 100) * (chartHeight - padding.top - padding.bottom)}
            fill="#f443361a"
          />

          {/* Line */}
          <path
            d={createPath(history, 'pm25', 0, 100)}
            fill="none"
            stroke="#9c27b0"
            strokeWidth="2"
          />

          {/* Data points */}
          {history.map((point, i) => {
            const xStep = (chartWidth - padding.left - padding.right) / (history.length - 1 || 1);
            const x = padding.left + i * xStep;
            const normalizedValue = point.pm25 / 100;
            const y = chartHeight - padding.bottom - normalizedValue * (chartHeight - padding.top - padding.bottom);
            return <circle key={i} cx={x} cy={y} r="3" fill="#9c27b0" />;
          })}

          {/* X-axis label */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 5}
            textAnchor="middle"
            fontSize="10"
            fill={textColor}
          >
            Time (days simulated)
          </text>
        </svg>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if mine ID changed or new data is available
  return prevProps.mineId === nextProps.mineId && 
         prevProps.history.length === nextProps.history.length &&
         prevProps.theme === nextProps.theme;
});

export default SensorVisualization;
