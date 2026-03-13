class RuleEngine:
    def evaluate(self, features: dict, transaction: dict) -> tuple[float, list[str]]:
        """
        Evaluates the transaction against predefined rules.
        Returns a tuple of (anomaly_score, list_of_triggered_rules).
        Score is 0.0 - 1.0
        """
        score_sum = 0.0
        triggered_rules = []
        
        amount = transaction['amount']
        card_bin = transaction['card_bin']
        
        vel_1min = features['velocity_1min']
        vel_10min = features['velocity_10min']
        geo_mismatch = features['geo_mismatch']
        device_seen = features['device_seen_before']
        amount_z = features['amount_zscore']
        bin_risk = features['bin_risk_score']
        hour_risk = features['hour_of_day_risk']
        
        rules = []

        # Rule 1: VELOCITY_SPIKE
        if vel_1min > 5:
            rules.append(('VELOCITY_SPIKE', 0.9))
            
        # Rule 2: HIGH_AMOUNT_NEW_DEVICE
        if amount > 100000 and device_seen == 0.0:
            rules.append(('HIGH_AMOUNT_NEW_DEVICE', 0.8))
            
        # Rule 3: GEO_MISMATCH_HIGH_RISK_BIN
        if geo_mismatch == 1.0 and bin_risk > 0.5:
            rules.append(('GEO_MISMATCH_HIGH_RISK_BIN', 0.85))
            
        # Rule 4: NIGHT_TRANSACTION_HIGH_AMOUNT
        if hour_risk > 0.5 and amount_z > 2:
            rules.append(('NIGHT_TRANSACTION_HIGH_AMOUNT', 0.7))
            
        # Rule 5: RAPID_MERCHANT_CHURN
        if vel_10min > 15:
            rules.append(('RAPID_MERCHANT_CHURN', 0.75))
            
        # Rule 6: BLOCKED_BIN_PREFIX
        if card_bin in ['400010', '522222', '411110']:
            rules.append(('BLOCKED_BIN_PREFIX', 1.0))

        if not rules:
            return 0.0, []
            
        # Weighted average or Max strategy for rule score
        # Using average here to smooth the rule contributions
        for name, score in rules:
            score_sum += score
            triggered_rules.append(name)
            
        avg_score = score_sum / len(rules)
        return float(min(1.0, avg_score)), triggered_rules
