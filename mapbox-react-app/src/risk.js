/**
 * simulating data. only looks at lead atm need to incorporte the other metals
 *
 */

export function generateSensorData() {
    const isDangerous = Math.random() > 0.7;
  
    let ph, lead, pm25;
  
    if (isDangerous) {
      // Dangerous values
      ph = (Math.random() * (4.5 - 2.5) + 2.5).toFixed(1); // acidic
      lead = Math.floor(Math.random() * (400 - 80) + 80);  // high Lead
      pm25 = Math.floor(Math.random() * (300 - 60) + 60);  // highdust
    } else {
      // Safe values
      ph = (Math.random() * (8.5 - 6.5) + 6.5).toFixed(1); // neutral
      lead = Math.floor(Math.random() * (50 - 5) + 5);     // low lead level
      pm25 = Math.floor(Math.random() * (30 - 5) + 5);     // low dust clean
    }
  
    // normalization (bc we cannot compare ph,air and lead on the same scale need to convert to risk percen)
    const phRisk = Math.min((Math.abs(7 - ph) / 4) * 100, 100);
    const leadRisk = Math.min((lead / 70) * 100, 100);
    const airRisk = Math.min((pm25 / 200) * 100, 100);
  
    // computing the avg
    const totalRisk = Math.floor((phRisk + leadRisk + airRisk) / 3);
  
    
    let status = "LOW RISK";
    let color = "#4caf50"; 
    if (totalRisk > 40) { status = "MODERATE"; color = "#ff9800"; } // not showing up? 
    if (totalRisk > 70) { status = "CRITICAL"; color = "#f44336"; }
  
    return {
      ph,
      lead,
      pm25,
      riskScore: totalRisk,
      status,
      color
    };
  }