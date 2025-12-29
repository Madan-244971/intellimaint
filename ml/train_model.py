import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# -----------------------------
# Generate dummy training data
# -----------------------------
np.random.seed(42)

X = np.random.rand(1000, 5) * [100, 10, 200, 3000, 20]
y = (X[:, 0] > 70).astype(int)  # failure logic based on temperature

# -----------------------------
# Train model
# -----------------------------
model = RandomForestClassifier(n_estimators=100)
model.fit(X, y)

# -----------------------------
# Save model
# -----------------------------
MODEL_DIR = "ml/models"
MODEL_PATH = os.path.join(MODEL_DIR, "failure_model.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)
joblib.dump(model, MODEL_PATH)

print(f"✅ Model trained and saved at: {MODEL_PATH}")
