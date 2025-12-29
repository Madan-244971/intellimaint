import numpy as np
import pandas as pd
from datetime import datetime, timedelta

np.random.seed(42)

START_TIME = datetime.now()
SAMPLE_INTERVAL = timedelta(minutes=5)

def generate_machine_data(machine_id, base_temp, base_vib, base_pressure):
    rows = []
    degradation = 0.0
    timestamp = START_TIME

    for _ in range(1000):
        degradation += np.random.choice([0.0005, 0.001, 0.002])

        temperature = base_temp + degradation * 60 + np.random.normal(0, 1)
        vibration = base_vib + degradation * 8 + np.random.normal(0, 0.05)
        pressure = base_pressure - degradation * 50 + np.random.normal(0, 2)
        rpm = 1500 + degradation * 400 + np.random.normal(0, 20)
        current = 10 + degradation * 15 + np.random.normal(0, 0.5)

        # ✅ GUARANTEED FAILURE LOGIC
        stress = 0
        if temperature > 75:
            stress += 1
        if vibration > 3.5:
            stress += 1
        if pressure < 90:
            stress += 1
        if current > 25:
            stress += 1

        failure = 1 if stress >= 2 else 0

        rows.append([
            timestamp,
            machine_id,
            round(temperature, 2),
            round(vibration, 3),
            round(pressure, 2),
            round(rpm, 1),
            round(current, 2),
            failure
        ])

        timestamp += SAMPLE_INTERVAL

    return rows

def main():
    data = []
    data += generate_machine_data("CNC_01", 60, 0.2, 120)
    data += generate_machine_data("HYD_01", 55, 0.15, 150)
    data += generate_machine_data("AIR_01", 50, 0.1, 180)
    data += generate_machine_data("CONV_01", 45, 0.25, 110)

    df = pd.DataFrame(
        data,
        columns=[
            "timestamp",
            "machine_id",
            "temperature",
            "vibration",
            "pressure",
            "rpm",
            "current",
            "failure"
        ]
    )

    df.to_csv("data/raw/sensor_data.csv", index=False)
    print("✔ sensor_data.csv created in data/raw/")

if __name__ == "__main__":
    main()
