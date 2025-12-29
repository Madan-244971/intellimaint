import pandas as pd

INPUT_PATH = "data/processed/features.csv"
OUTPUT_PATH = "data/processed/features_future.csv"

FUTURE_STEPS = 6  # 6 × 5 min = 30 minutes ahead

def create_future_labels():
    df = pd.read_csv(INPUT_PATH)
    df = df.sort_values(["machine_id", "timestamp"])

    df["future_failure"] = (
        df.groupby("machine_id")["failure"]
        .shift(-FUTURE_STEPS)
    )

    df = df.dropna()
    df["future_failure"] = df["future_failure"].astype(int)

    df.to_csv(OUTPUT_PATH, index=False)
    print("✔ Future-labeled data created:", OUTPUT_PATH)

if __name__ == "__main__":
    create_future_labels()
