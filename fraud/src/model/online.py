import logging
from river import anomaly

logger = logging.getLogger("fraud_engine.online")

class OnlineModel:
    def __init__(self, batch_size=10):
        # Half-Space Trees for online anomaly detection
        self.model = anomaly.HalfSpaceTrees(
            n_trees=10,
            height=8,
            window_size=100,
            seed=42
        )
        self.batch_size = batch_size
        self.pending_batch = []
        self._learned_samples = 0
        
    def score_one(self, features_dict: dict) -> float:
        """
        Scores a single transaction dictionary.
        Returns anomaly score 0.0 to 1.0
        """
        # river score_one anomaly bounded [0, 1] natively most of the time
        score = self.model.score_one(features_dict)
        return float(max(0.0, min(1.0, score)))
        
    def learn_one(self, features_dict: dict):
        self.model.learn_one(features_dict)
        self._learned_samples += 1
        
    def batch_update(self, transactions_list: list):
        for tx in transactions_list:
            self.learn_one(tx)
            
        logger.info(f"[OnlineModel] Batch updated {len(transactions_list)} transactions. Total learned: {self._learned_samples}")
        
    def add_to_batch(self, features_dict: dict):
        self.pending_batch.append(features_dict)
        
        if len(self.pending_batch) >= self.batch_size:
            self.batch_update(self.pending_batch)
            self.pending_batch.clear()

    def get_stats(self):
        return {
            "learned_samples": self._learned_samples,
            "pending_batch_size": len(self.pending_batch)
        }
