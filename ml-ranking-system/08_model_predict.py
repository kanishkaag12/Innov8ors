"""
Batch inference bridge for SynapEscrow backend.
Reads feature rows from stdin JSON and returns model scores as stdout JSON.
"""

import json
import os
import sys

import joblib
import numpy as np
import xgboost as xgb

CORE_FEATURES = [
    "semantic_similarity_job_proposal",
    "semantic_similarity_job_freelancer_bio",
    "semantic_similarity_title_match",
    "skill_overlap_count",
    "skill_overlap_percentage",
    "required_skills_covered",
    "price_fit_score",
    "profile_completeness",
    "years_experience",
    "average_rating",
    "acceptance_rate",
    "completion_rate",
    "on_time_rate",
    "rehire_rate",
    "proposal_length",
]


def _safe_float(value, default=0.0):
    try:
        if value is None:
            return float(default)
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def main():
    payload = json.loads(sys.stdin.read() or "{}")

    rows = payload.get("rows") or []
    model_path = payload.get("modelPath") or os.path.join(os.path.dirname(__file__), "ranking_model.pkl")
    scaler_path = payload.get("scalerPath") or os.path.join(os.path.dirname(__file__), "scaler.pkl")

    if not rows:
        print(json.dumps({"scores": [], "count": 0}))
        return

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)

    matrix = []
    for row in rows:
        matrix.append([_safe_float(row.get(feature)) for feature in CORE_FEATURES])

    x = np.array(matrix, dtype=np.float32)
    x_scaled = scaler.transform(x)
    dtest = xgb.DMatrix(x_scaled)
    scores = model.predict(dtest).tolist()

    print(
        json.dumps(
            {
                "scores": [float(score) for score in scores],
                "count": len(scores),
                "featureNames": CORE_FEATURES,
                "xgboostVersion": xgb.__version__,
            }
        )
    )


if __name__ == "__main__":
    main()
