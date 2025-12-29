import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib

DATA_PATH = "data/processed/features_future.csv"
MODEL_DIR = "models"
MODEL_PATH = "models/failure_forecast_30min.pkl"

def train():
    df = pd.read_csv(DATA_PATH)

    X = df.drop(columns=["timestamp", "machine_id", "failure", "future_failure"])
    y = df["future_failure"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=14,
        class_weight="balanced",
        random_state=42
    )

    model.fit(X_train, y_train)

    preds = model.predict(X_test)

    print("\n--- CONFUSION MATRIX ---")
    print(confusion_matrix(y_test, preds))

    print("\n--- CLASSIFICATION REPORT ---")
    print(classification_report(y_test, preds))

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    print("\n✔ Forecast model saved to", MODEL_PATH)

if __name__ == "__main__":
    train()
