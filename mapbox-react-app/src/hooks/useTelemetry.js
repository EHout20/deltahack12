import { useEffect } from 'react';

export function useTelemetry(allMines, setAllMines, setDateDisplay) {
  useEffect(() => {
    let elapsedDays = 0;
    const telemetryInterval = setInterval(() => {
      elapsedDays += 1;
      
      // Update date
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + elapsedDays);
      setDateDisplay(newDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }));
      
      // Update mines data
      setAllMines(prevMines => prevMines.map(mine => {
        const timeFactorDays = elapsedDays;
        
        // pH: decreases exponentially
        const basePh = 7.0;
        const phDecay = basePh - (2.0 * (1 - Math.exp(-timeFactorDays / 50)));
        
        // Lead: increases exponentially
        const baseLead = 20;
        const leadGrowth = baseLead * Math.exp(timeFactorDays / 100);
        
        // PM2.5: increases logarithmically
        const basePm25 = 15;
        const pm25Growth = basePm25 + (Math.log(1 + timeFactorDays / 5) * 8);
        
        // Calculate risk score
        const phScore = Math.max(0, Math.min(100, (7 - phDecay) * 15));
        const leadScore = Math.max(0, Math.min(100, (leadGrowth / 100) * 50));
        const pm25Score = Math.max(0, Math.min(100, (pm25Growth / 50) * 50));
        const riskScore = Math.round((phScore + leadScore + pm25Score) / 3);
        
        // Determine color
        let color = '#4caf50';
        if (riskScore >= 75) color = '#f44336';
        else if (riskScore >= 35) color = '#ff9800';
        
        return {
          ...mine,
          ph: Math.max(2, Math.min(10, parseFloat(phDecay.toFixed(2)))),
          lead: Math.min(300, parseFloat(leadGrowth.toFixed(1))),
          pm25: Math.min(200, parseFloat(pm25Growth.toFixed(1))),
          riskScore,
          color
        };
      }));
    }, 1000);
    
    return () => clearInterval(telemetryInterval);
  }, [setAllMines, setDateDisplay]);
}
