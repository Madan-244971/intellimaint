import pandas as pd

DATA_PATH = "data/raw/sensor_data.csv"
OUTPUT_PATH = "data/processed/features.csv"

WINDOW = 6  # 30 minutes (6 × 5min)

def create_features():
    df = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
    df = df.sort_values(["machine_id", "timestamp"])

    sensors = ["temperature", "vibration", "pressure", "rpm", "current"]

    for sensor in sensors:
        df[f"{sensor}_rolling_mean"] = (
            df.groupby("machine_id")[sensor]
              .transform(lambda x: x.rolling(WINDOW).mean())
        )

        df[f"{sensor}_rolling_std"] = (
            df.groupby("machine_id")[sensor]
              .transform(lambda x: x.rolling(WINDOW).std())
        )

        df[f"{sensor}_trend"] = (
            df.groupby("machine_id")[sensor]
              .transform(lambda x: x.diff())
        )

    df = df.dropna()
    df.to_csv(OUTPUT_PATH, index=False)
    print("✔ Feature file created:", OUTPUT_PATH)

if __name__ == "__main__":
    create_features()
