import json
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from datetime import datetime
import os

# Set seaborn style
sns.set_style("darkgrid")
plt.rcParams['figure.figsize'] = (12, 6)

def generate_sensor_chart(sensor_history, mine_name, output_path='./sensor_charts'):
    """
    Generate a sensor chart from telemetry data using seaborn.
    
    Args:
        sensor_history: List of dicts with 'time', 'ph', 'lead', 'pm25'
        mine_name: Name of the mine for the title
        output_path: Directory to save the chart
    
    Returns:
        Path to saved chart image
    """
    
    # Create output directory if it doesn't exist
    if not os.path.exists(output_path):
        os.makedirs(output_path)
    
    # Convert to DataFrame
    df = pd.DataFrame(sensor_history)
    
    # Convert time strings to datetime for better plotting
    df['time'] = pd.to_datetime(df['time'], format='%I:%M:%S %p', errors='coerce')
    
    # Create figure with 3 subplots
    fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
    fig.suptitle(f'Sensor Data for {mine_name}', fontsize=16, fontweight='bold')
    
    # pH Chart
    sns.lineplot(data=df, x='time', y='ph', ax=axes[0], color='#2196F3', linewidth=2.5, marker='o')
    axes[0].set_title('Water Acidity (pH Level)', fontweight='bold')
    axes[0].set_ylabel('pH')
    axes[0].grid(True, alpha=0.3)
    axes[0].axhline(y=6.5, color='red', linestyle='--', alpha=0.5, label='Safety Threshold')
    axes[0].legend()
    
    # Lead Chart
    sns.lineplot(data=df, x='time', y='lead', ax=axes[1], color='#FF9800', linewidth=2.5, marker='s')
    axes[1].set_title('Soil Lead Concentration (ppm)', fontweight='bold')
    axes[1].set_ylabel('Lead (ppm)')
    axes[1].grid(True, alpha=0.3)
    axes[1].axhline(y=70, color='red', linestyle='--', alpha=0.5, label='Hazard Level (70 ppm)')
    axes[1].legend()
    
    # PM2.5 Chart
    sns.lineplot(data=df, x='time', y='pm25', ax=axes[2], color='#F44336', linewidth=2.5, marker='^')
    axes[2].set_title('Air Quality - PM2.5 Particulates (µg/m³)', fontweight='bold')
    axes[2].set_ylabel('PM2.5 (µg/m³)')
    axes[2].set_xlabel('Time')
    axes[2].grid(True, alpha=0.3)
    axes[2].axhline(y=80, color='red', linestyle='--', alpha=0.5, label='Hazard Level (80 µg/m³)')
    axes[2].legend()
    
    # Rotate x-axis labels for better readability
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    # Save the figure
    filename = f"{mine_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    filepath = os.path.join(output_path, filename)
    plt.savefig(filepath, dpi=300, bbox_inches='tight')
    plt.close()
    
    return filepath

def generate_comparison_chart(mines_data, output_path='./sensor_charts'):
    """
    Generate a comparison chart across multiple mines.
    
    Args:
        mines_data: Dict with mine names as keys and sensor histories as values
        output_path: Directory to save the chart
    
    Returns:
        Path to saved chart image
    """
    
    if not os.path.exists(output_path):
        os.makedirs(output_path)
    
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    fig.suptitle('Sensor Comparison Across Mines', fontsize=16, fontweight='bold')
    
    # Prepare data for each metric
    ph_data = []
    lead_data = []
    pm25_data = []
    
    for mine_name, history in mines_data.items():
        if history:  # Only process non-empty histories
            latest = history[-1]  # Get latest reading
            ph_data.append({'Mine': mine_name, 'pH': latest['ph']})
            lead_data.append({'Mine': mine_name, 'Lead': latest['lead']})
            pm25_data.append({'Mine': mine_name, 'PM2.5': latest['pm25']})
    
    # pH comparison
    ph_df = pd.DataFrame(ph_data)
    sns.barplot(data=ph_df, x='Mine', y='pH', ax=axes[0], palette='Blues')
    axes[0].set_title('Latest pH Levels', fontweight='bold')
    axes[0].axhline(y=6.5, color='red', linestyle='--', alpha=0.5)
    axes[0].set_ylabel('pH')
    axes[0].tick_params(axis='x', rotation=45)
    
    # Lead comparison
    lead_df = pd.DataFrame(lead_data)
    sns.barplot(data=lead_df, x='Mine', y='Lead', ax=axes[1], palette='Oranges')
    axes[1].set_title('Latest Lead Levels (ppm)', fontweight='bold')
    axes[1].axhline(y=70, color='red', linestyle='--', alpha=0.5)
    axes[1].set_ylabel('Lead (ppm)')
    axes[1].tick_params(axis='x', rotation=45)
    
    # PM2.5 comparison
    pm25_df = pd.DataFrame(pm25_data)
    sns.barplot(data=pm25_df, x='Mine', y='PM2.5', ax=axes[2], palette='Reds')
    axes[2].set_title('Latest PM2.5 Levels (µg/m³)', fontweight='bold')
    axes[2].axhline(y=80, color='darkred', linestyle='--', alpha=0.5)
    axes[2].set_ylabel('PM2.5 (µg/m³)')
    axes[2].tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    
    # Save the figure
    filename = f"mines_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    filepath = os.path.join(output_path, filename)
    plt.savefig(filepath, dpi=300, bbox_inches='tight')
    plt.close()
    
    return filepath

if __name__ == '__main__':
    # Example usage
    sample_history = [
        {'time': '10:00:00 AM', 'ph': 7.2, 'lead': 25.5, 'pm25': 18.3},
        {'time': '10:05:00 AM', 'ph': 7.1, 'lead': 26.1, 'pm25': 19.2},
        {'time': '10:10:00 AM', 'ph': 7.0, 'lead': 27.3, 'pm25': 20.5},
        {'time': '10:15:00 AM', 'ph': 6.9, 'lead': 28.7, 'pm25': 21.8},
        {'time': '10:20:00 AM', 'ph': 6.8, 'lead': 30.2, 'pm25': 23.1},
    ]
    
    # Generate example chart
    chart_path = generate_sensor_chart(sample_history, "Example Mine")
    print(f"Chart saved to: {chart_path}")
