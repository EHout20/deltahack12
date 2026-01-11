/**
 * simulating data. only looks at lead atm need to incorporte the other metals
 *
 */

  export function generateSensorData() {
    // Generate varied initial values that are compatible with telemetry formulas
    // Each mine simulates being at a different stage (0-400 days) for extreme variety
    const simulatedDays = Math.random() * 400; 
    
    // Use the same formulas as telemetry but with varied starting points
    const phNoise = (Math.random() - 0.5) * 0.8; // More noise
    const leadNoise = (Math.random() - 0.5) * 20; // More noise
    const pm25Noise = (Math.random() - 0.5) * 15; // More noise
    
    // Same base values and formulas as telemetry system
    const basePh = 7.0;
    const phTrend = basePh - (2.0 * (1 - Math.exp(-simulatedDays / 50)));
    const ph = Math.max(2, Math.min(10, (phTrend + phNoise)));
    
    const baseLead = 20;
    const leadTrend = baseLead * Math.exp(simulatedDays / 100);
    const lead = Math.max(0, Math.min(300, (leadTrend + leadNoise)));
    
    const basePm25 = 15;
    const pm25Trend = basePm25 + (Math.log(1 + simulatedDays / 5) * 8);
    const pm25 = Math.max(0, Math.min(200, (pm25Trend + pm25Noise)));

    // Calculate risk score using same logic as telemetry
    const phScore = Math.max(0, Math.min(100, (7 - ph) * 15));
    const leadScore = Math.max(0, Math.min(100, (lead / 100) * 50));
    const pm25Score = Math.max(0, Math.min(100, (pm25 / 50) * 50));
    const totalRisk = Math.round((phScore + leadScore + pm25Score) / 3);

    let status = "LOW RISK";
    let color = "#4caf50"; 
    if (totalRisk >= 30) { status = "MODERATE"; color = "#ff9800"; }
    if (totalRisk >= 60) { status = "CRITICAL"; color = "#ff1744"; } 

    return {
        ph: parseFloat(ph.toFixed(2)),
        lead: parseFloat(lead.toFixed(1)),
        pm25: parseFloat(pm25.toFixed(1)),
        riskScore: totalRisk,
        status,
        color,
        initialDaysOffset: simulatedDays // Track the initial time offset
    };
}