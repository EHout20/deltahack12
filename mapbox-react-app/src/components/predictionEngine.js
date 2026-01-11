/**
 * computes instability factor based on mine current risk score. (runaway effect)
 * critical mines degrade fast and safe mines remain usually stable
 */

export function getOneYearPrediction(currentValue, sensorType, riskScore) {
    const val = parseFloat(currentValue);
    let predicted, change, trendIcon;

    const instability = 1 + (riskScore / 50); 
    
    if (sensorType === 'ph') {
        
        const degradation = 0.2 * instability;
        change = degradation * (0.9 + Math.random() * 0.2); 
        
        predicted = (val - change).toFixed(1);
        
        // since pH cannot go below 0
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
        text: ` ${trendIcon} ${predicted} ${getUnit(sensorType)}`
    };
}

function getUnit(type) {
    if (type === 'ph') return 'pH';
    if (type === 'lead') return 'ppm';
    if (type === 'pm25') return 'µg/m³';
    return '';
}