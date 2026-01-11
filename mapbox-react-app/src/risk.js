/**
 * simulating data. only looks at lead atm need to incorporte the other metals
 *
 */

  export function generateSensorData() {
    const rand = Math.random();

    let ph, lead, pm25;

    //  20% chance for red
    if (rand > 0.8) {
        ph = (Math.random() * (4.5 - 2.5) + 2.5).toFixed(1); 
        lead = Math.floor(Math.random() * (400 - 150) + 150); 
        pm25 = Math.floor(Math.random() * (300 - 100) + 100); 
    
    // 30 chance for moderate
    } else if (rand > 0.5) {
        ph = (Math.random() * (6.0 - 5.0) + 5.0).toFixed(1); 
        lead = Math.floor(Math.random() * (65 - 40) + 40);  
        pm25 = Math.floor(Math.random() * (45 - 20) + 20);   

    // 50% chance for green
    } else {
        ph = (Math.random() * (8.5 - 6.5) + 6.5).toFixed(1); 
        lead = Math.floor(Math.random() * (50 - 5) + 5);     
        pm25 = Math.floor(Math.random() * (30 - 5) + 5);     
    }

    // normalization (bc we cannot compare ph,air and lead on the same scale need to convert to risk percen)
    const phRisk = Math.min((Math.abs(7 - ph) / 3) * 100, 100); 
    const leadRisk = Math.min((lead / 70) * 100, 100);
    const airRisk = Math.min((pm25 / 50) * 100, 100); 

    const totalRisk = Math.floor((phRisk + leadRisk + airRisk) / 3);

    let status = "LOW RISK";
    let color = "#4caf50"; 
    if (totalRisk > 40) { status = "MODERATE"; color = "#ff9800"; }
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