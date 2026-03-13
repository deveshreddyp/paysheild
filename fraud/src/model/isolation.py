import os
import hashlib
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

class IsolationForestModel:
    def __init__(self, contamination=0.1, model_path='/tmp/isolation_model.pkl'):
        # 100 trees, auto/manual contamination rate
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42
        )
        self.model_path = model_path
        self._version = "untrained"
        
    def train_initial(self):
        """
        Trains the initial baseline model on 200 synthetic generic transactions.
        Used to bootstrap the system before real data flows.
        """
        print("[IsolationForest] Generating 200 synthetic transactions for baseline training...")
        np.random.seed(42)
        
        # 160 Normal transactions (80%)
        # Features: amount_zscore, vel_1min, vel_10min, geo_mismatch, bin_risk, hour_risk, device_seen
        normal_X = np.column_stack([
            np.random.normal(0, 1, 160),           # amount zscore ~ N(0,1)
            np.random.randint(0, 3, 160),          # vel 1min
            np.random.randint(0, 5, 160),          # vel 10min
            np.zeros(160),                         # geo mismatch = 0
            np.random.uniform(0, 0.3, 160),        # low bin risk
            np.random.choice([0.1, 0.8], 160, p=[0.9, 0.1]), # mostly normal hours
            np.ones(160)                           # device seen
        ])
        
        # 40 Fraudulent transactions (20%)
        fraud_X = np.column_stack([
            np.random.normal(4, 2, 40),            # amount zscore > 3
            np.random.randint(10, 30, 40),         # vel 1min high
            np.random.randint(15, 50, 40),         # vel 10min high
            np.ones(40),                           # geo mismatch = 1
            np.random.uniform(0.7, 1.0, 40),       # high bin risk
            np.random.choice([0.1, 0.8], 40, p=[0.2, 0.8]), # mostly night hours
            np.zeros(40)                           # device unseen
        ])
        
        X = np.vstack([normal_X, fraud_X])
        
        self.model.fit(X)
        self._update_version()
        self.save()
        print(f"[IsolationForest] Baseline trained. Version: {self._version}")

    def score(self, features_array: np.ndarray) -> float:
        """
        Scores a single transaction. Returns anomaly score bounded 0.0 - 1.0.
        """
        # decision_function returns positive for normal, negative for anomalies
        # Range is generally [-0.5, 0.5]
        raw_score = self.model.decision_function(features_array)[0]
        
        # Invert: higher score = more anomalous
        inverted = -raw_score
        
        # Min-max scale approximation to map [-0.2, 0.2] to [0.0, 1.0]
        # values outside are clipped
        normalized = (inverted + 0.2) / 0.4
        
        return float(np.clip(normalized, 0.0, 1.0))
        
    def _update_version(self):
        # Create a simple hash representing the model state
        state_str = str(self.model.get_params())
        self._version = hashlib.sha256(state_str.encode()).hexdigest()[:8]

    def get_version(self) -> str:
        return self._version
        
    def save(self):
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.model, self.model_path)
        
    def load(self):
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            self._update_version()
            print(f"[IsolationForest] Loaded from disk. Version: {self._version}")
            return True
        return False
