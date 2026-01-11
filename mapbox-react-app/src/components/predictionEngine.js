export function getOneYearPrediction(currentValue, sensorType, riskScore) {
    const val = parseFloat(currentValue);
    let predicted, change, trendIcon;

    // instability Factor: more risk = faster degradation
    const instability = 1 + (riskScore / 50); 
    
    if (sensorType === 'ph') {
        const degradation = 0.2 * instability;
        change = degradation * (0.9 + Math.random() * 0.2); 
        predicted = (val - change).toFixed(1);
        if (predicted < 0) predicted = "0.0";
        trendIcon = "↘"; 
    } 
    else if (sensorType === 'lead') {
        const degradationPercent = 0.05 * instability;
        change = val * degradationPercent;
        predicted = (val + change).toFixed(0);
        trendIcon = "↗"; 
    } 
    else if (sensorType === 'pm25') {
        const degradationUnits = 5 * instability;
        change = degradationUnits * (0.9 + Math.random() * 0.2);
        predicted = (val + change).toFixed(0);
        trendIcon = "↗"; 
    }

    return {
        predictedValue: predicted,
        changeAmount: Math.abs(change).toFixed(1),
        trend: trendIcon,
        text: `${trendIcon} ${predicted} ${getUnit(sensorType)}`
    };
}

// use lr on historical data to predict the risk score 1 year out
export function calculateFutureRiskScore(history, currentRisk) {
    if (!history || history.length < 5) return currentRisk;

    const getRisk = (ph, lead, pm25) => {
        const phRisk = Math.min((Math.abs(7 - ph) / 3) * 100, 100);
        const leadRisk = Math.min((lead / 70) * 100, 100);
        const airRisk = Math.min((pm25 / 50) * 100, 100);
        return (phRisk + leadRisk + airRisk) / 3;
    };

    const historicalRisks = history.map(h => getRisk(h.ph, h.lead, h.pm25));

    const n = historicalRisks.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += historicalRisks[i];
        sumXY += (i * historicalRisks[i]);
        sumXX += (i * i);
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    let predictedRisk = currentRisk + (slope * 365);


    const MAX_CHANGE = 15;
    if (predictedRisk > currentRisk + MAX_CHANGE) predictedRisk = currentRisk + MAX_CHANGE;
    if (predictedRisk < currentRisk - MAX_CHANGE) predictedRisk = currentRisk - MAX_CHANGE;

    return Math.max(0, Math.min(100, Math.round(predictedRisk)));
}

function getUnit(type) {
    if (type === 'ph') return 'pH';
    if (type === 'lead') return 'ppm';
    if (type === 'pm25') return 'µg/m³';
    return '';
}