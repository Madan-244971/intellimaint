import pandas as pd

DATA_PATH = "data/raw/sensor_data.csv"

def validate():
    df = pd.read_csv(DATA_PATH)

    print("\n--- BASIC DATA CHECKS ---")
    print("Total rows:", len(df))
    print("Missing values:\n", df.isnull().sum())

    print("\n--- SENSOR RANGE CHECKS ---")
    rules = {
        "temperature": (20, 120),
        "vibration": (0, 10),
        "pressure": (50, 300),
        "rpm": (500, 3000),
        "current": (0, 50),
    }

    for sensor, (min_val, max_val) in rules.items():
        invalid = df[(df[sensor] < min_val) | (df[sensor] > max_val)]
        print(f"{sensor}: {len(invalid)} invalid readings")

    print("\n--- FAILURE DISTRIBUTION ---")
    print(df["failure"].value_counts())

if __name__ == "__main__":
    validate()
