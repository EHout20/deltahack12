/**
 * simulating data. only looks at lead atm need to incorporte the other metals
 *
 */

  export function generateSensorData() {
    // Use the same formulas as useTelemetry hook, starting at day 0
    const timeFactorDays = 0;
    
    const phNoise = (Math.random() - 0.5) * 0.4;
    const leadNoise = (Math.random() - 0.5) * 8;
    const pm25Noise = (Math.random() - 0.5) * 6;
    
    const basePh = 7.0;
    const phTrend = basePh - (2.0 * (1 - Math.exp(-timeFactorDays / 50)));
    const ph = Math.max(2, Math.min(10, (phTrend + phNoise)));
    
    const baseLead = 20;
    const leadTrend = baseLead * Math.exp(timeFactorDays / 100);
    const lead = Math.max(0, Math.min(300, (leadTrend + leadNoise)));
    
    const basePm25 = 15;
    const pm25Trend = basePm25 + (Math.log(1 + timeFactorDays / 5) * 8);
    const pm25 = Math.max(0, Math.min(200, (pm25Trend + pm25Noise)));

    // Calculate risk score using same logic as telemetry
    const phScore = Math.max(0, Math.min(100, (7 - ph) * 15));
    const leadScore = Math.max(0, Math.min(100, (lead / 100) * 50));
    const pm25Score = Math.max(0, Math.min(100, (pm25 / 50) * 50));
    const totalRisk = Math.round((phScore + leadScore + pm25Score) / 3);

    let status = "LOW RISK";
    let color = "#4caf50"; 
    if (totalRisk >= 35) { status = "MODERATE"; color = "#ff9800"; }
    if (totalRisk >= 75) { status = "CRITICAL"; color = "#ff1744"; } 

    return {
        ph: parseFloat(ph.toFixed(2)),
        lead: parseFloat(lead.toFixed(1)),
        pm25: parseFloat(pm25.toFixed(1)),
        riskScore: totalRisk,
        status,
        color
    };
}