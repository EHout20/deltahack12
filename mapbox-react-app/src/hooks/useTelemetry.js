import { useEffect, useRef } from 'react';

export function useTelemetry(allMines, setAllMines, setDateDisplay) {
  const elapsedDaysRef = useRef(0);
  
  useEffect(() => {
    // Update date every second (1 simulated day)
    const dateInterval = setInterval(() => {
      elapsedDaysRef.current += 1;
      
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + elapsedDaysRef.current);
      setDateDisplay(newDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }));
    }, 1000);
    
    // Update sensor data every 7 seconds (7 simulated days)
    const telemetryInterval = setInterval(() => {
      setAllMines(prevMines => prevMines.map(mine => {
        const timeFactorDays = elapsedDaysRef.current;
        
        // Add random fluctuations (each mine gets unique random variations)
        const phNoise = (Math.random() - 0.5) * 0.4; // ±0.2 fluctuation
        const leadNoise = (Math.random() - 0.5) * 8; // ±4 ppm fluctuation
        const pm25Noise = (Math.random() - 0.5) * 6; // ±3 µg/m³ fluctuation
        
        // pH: overall trend down but with fluctuations
        const basePh = 7.0;
        const phTrend = basePh - (2.0 * (1 - Math.exp(-timeFactorDays / 50)));
        const phDecay = phTrend + phNoise;
        
        // Lead: overall trend up but with fluctuations
        const baseLead = 20;
        const leadTrend = baseLead * Math.exp(timeFactorDays / 100);
        const leadGrowth = leadTrend + leadNoise;
        
        // PM2.5: overall trend up but with fluctuations
        const basePm25 = 15;
        const pm25Trend = basePm25 + (Math.log(1 + timeFactorDays / 5) * 8);
        const pm25Growth = pm25Trend + pm25Noise;
        
        // Calculate risk score
        const phScore = Math.max(0, Math.min(100, (7 - phDecay) * 15));
        const leadScore = Math.max(0, Math.min(100, (leadGrowth / 100) * 50));
        const pm25Score = Math.max(0, Math.min(100, (pm25Growth / 50) * 50));
        const riskScore = Math.round((phScore + leadScore + pm25Score) / 3);
        
        // Determine color and status
        let color = '#4caf50';
        let status = 'LOW RISK';
        if (riskScore >= 75) {
          color = '#ff1744';
          status = 'CRITICAL';
        } else if (riskScore >= 35) {
          color = '#ff9800';
          status = 'MODERATE';
        }
        
        return {
          ...mine,
          ph: Math.max(2, Math.min(10, parseFloat(phDecay.toFixed(2)))),
          lead: Math.max(0, Math.min(300, parseFloat(leadGrowth.toFixed(1)))),
          pm25: Math.max(0, Math.min(200, parseFloat(pm25Growth.toFixed(1)))),
          riskScore,
          color,
          status
        };
      }));
    }, 7000); // Update sensor data every 7 seconds (7 simulated days)
    
    return () => {
      clearInterval(dateInterval);
      clearInterval(telemetryInterval);
    };
  }, [setAllMines, setDateDisplay]);
  
  return elapsedDaysRef;
}
