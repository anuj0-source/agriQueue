"""
AgriQueue ML Model Training Pipeline
Trains and evaluates regression models to accurately predict queue waiting times.
Selects the best performing model, saves the pipeline artifact (.joblib), and exports metrics JSON.
"""

import json
import os
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

NUMERICAL_FEATURES = [
    "farmers_ahead",
    "total_qty_ahead_kg",
    "quantity_kg",
    "active_counters",
    "staff_present",
    "center_daily_capacity_quintals",
    "slot_hour",
    "day_of_week",
    "is_harvest_peak_season",
]

CATEGORICAL_FEATURES = [
    "crop_type",
    "produce_quality_grade",
    "vehicle_type",
    "weather_condition",
]

TARGET = "actual_wait_time_minutes"


def train_and_evaluate():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "data", "agriqueue_wait_time_dataset.csv")
    models_dir = os.path.join(script_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Run generate_dataset.py first.")

    print(f"Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} records with {len(df.columns)} columns.")

    X = df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, shuffle=True
    )
    print(f"Train split: {len(X_train)} samples | Test split: {len(X_test)} samples")

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )

    models_to_test = {
        "Ridge_Regression": Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", Ridge(alpha=1.0)),
        ]),
        "Random_Forest": Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", RandomForestRegressor(
                n_estimators=120,
                max_depth=18,
                min_samples_leaf=3,
                n_jobs=-1,
                random_state=42,
            )),
        ]),
        "Hist_Gradient_Boosting": Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", HistGradientBoostingRegressor(
                max_iter=200,
                learning_rate=0.08,
                max_depth=12,
                min_samples_leaf=20,
                random_state=42,
            )),
        ]),
    }

    results = {}
    best_name = None
    best_r2 = -float("inf")
    best_model = None

    for name, pipeline in models_to_test.items():
        print(f"\n--- Training {name} ---")
        t0 = time.time()
        pipeline.fit(X_train, y_train)
        train_time = round(time.time() - t0, 2)

        preds = pipeline.predict(X_test)
        preds = np.clip(preds, 3.0, 240.0)

        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        r2 = r2_score(y_test, preds)
        mape = np.mean(np.abs((y_test - preds) / y_test)) * 100

        print(f"Metrics: R2={r2:.4f} | MAE={mae:.2f} min | RMSE={rmse:.2f} min | MAPE={mape:.2f}% (Fit: {train_time}s)")

        results[name] = {
            "r2": round(float(r2), 4),
            "mae": round(float(mae), 2),
            "rmse": round(float(rmse), 2),
            "mape": round(float(mape), 2),
            "fit_time_seconds": train_time,
        }

        if r2 > best_r2:
            best_r2 = r2
            best_name = name
            best_model = pipeline

    print(f"\n=======================================================")
    print(f"Best Model: {best_name} (R2: {best_r2:.4f})")
    print(f"=======================================================")

    # Feature Importance analysis
    feature_importances = {}
    if hasattr(best_model.named_steps["regressor"], "feature_importances_"):
        raw_importances = best_model.named_steps["regressor"].feature_importances_
        cat_encoder = best_model.named_steps["preprocessor"].named_transformers_["cat"]
        cat_names = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
        all_features = NUMERICAL_FEATURES + cat_names
        for feat, imp in zip(all_features, raw_importances):
            feature_importances[feat] = round(float(imp), 4)
        # Sort by importance descending
        feature_importances = dict(sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)[:15])

    # Save model artifact
    model_artifact_path = os.path.join(models_dir, "queue_wait_model.joblib")
    joblib.dump(best_model, model_artifact_path, compress=3)
    print(f"Saved best model artifact to: {model_artifact_path}")

    # Save metrics and metadata
    metrics_path = os.path.join(models_dir, "model_metrics.json")
    metadata = {
        "best_model_name": best_name,
        "metrics": results[best_name],
        "all_models_compared": results,
        "dataset_total_samples": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "numerical_features": NUMERICAL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "top_feature_importances": feature_importances,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(metrics_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved model metrics and metadata to: {metrics_path}")

    # Quick test predictions
    test_cases = pd.DataFrame([
        {
            "farmers_ahead": 0,
            "total_qty_ahead_kg": 0,
            "quantity_kg": 1000,
            "crop_type": "Wheat",
            "produce_quality_grade": "Grade A",
            "active_counters": 3,
            "staff_present": 6,
            "center_daily_capacity_quintals": 1500,
            "vehicle_type": "Tractor Trolley",
            "slot_hour": 10,
            "day_of_week": 1,
            "is_harvest_peak_season": 0,
            "weather_condition": "Clear",
        },
        {
            "farmers_ahead": 4,
            "total_qty_ahead_kg": 5000,
            "quantity_kg": 2000,
            "crop_type": "Cotton",
            "produce_quality_grade": "Grade B",
            "active_counters": 2,
            "staff_present": 4,
            "center_daily_capacity_quintals": 1000,
            "vehicle_type": "Mini Truck (Pickup)",
            "slot_hour": 11,
            "day_of_week": 2,
            "is_harvest_peak_season": 1,
            "weather_condition": "Light Rain",
        },
        {
            "farmers_ahead": 12,
            "total_qty_ahead_kg": 15000,
            "quantity_kg": 3500,
            "crop_type": "Paddy",
            "produce_quality_grade": "Grade A",
            "active_counters": 2,
            "staff_present": 5,
            "center_daily_capacity_quintals": 2000,
            "vehicle_type": "Tractor Trolley",
            "slot_hour": 12,
            "day_of_week": 0,
            "is_harvest_peak_season": 1,
            "weather_condition": "Heavy Rain",
        }
    ])

    test_preds = best_model.predict(test_cases)
    print("\n--- Validation Inferences ---")
    for idx, pred in enumerate(test_preds):
        fa = test_cases.iloc[idx]["farmers_ahead"]
        crop = test_cases.iloc[idx]["crop_type"]
        qty = test_cases.iloc[idx]["quantity_kg"]
        weather = test_cases.iloc[idx]["weather_condition"]
        print(f"Case {idx + 1}: [{crop}, {qty}kg, Ahead={fa}, Weather={weather}] => Predicted Wait: {pred:.1f} mins")


if __name__ == "__main__":
    train_and_evaluate()
