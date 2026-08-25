"""
Statistical anomaly detection engine for financial transaction analysis.

Runs alongside the deterministic 3-way reconciliation matcher to detect
patterns that hardcoded rules miss  -  fee rate drift, settlement velocity
anomalies, amount outliers, volume spikes, and potential duplicates.

Inspired by LedgerTrace Autonomous Agent Architecture anomaly detection and variance analysis
capabilities that flag unusual patterns in real-time.
"""

import uuid
import datetime
import math
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class AnomalyAlert:
    """A statistical anomaly detected in the financial data."""
    alert_type: str
    severity: str
    metric_observed: float
    metric_expected: float
    deviation_score: float
    affected_transactions: List[str]
    description: str
    alert_id: str = field(default_factory=lambda: f"ANOM_{uuid.uuid4().hex[:8].upper()}")
    detected_at: str = field(default_factory=lambda: datetime.datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "alert_id": self.alert_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "metric_observed": self.metric_observed,
            "metric_expected": self.metric_expected,
            "deviation_score": self.deviation_score,
            "affected_transactions": self.affected_transactions,
            "description": self.description,
            "detected_at": self.detected_at
        }


def _mean(values: List[float]) -> float:
    """Calculate arithmetic mean."""
    return sum(values) / len(values) if values else 0.0


def _std_dev(values: List[float], mean_val: float) -> float:
    """Calculate population standard deviation."""
    if len(values) < 2:
        return 0.0
    variance = sum((x - mean_val) ** 2 for x in values) / len(values)
    return math.sqrt(variance)


def _percentile(sorted_values: List[float], p: float) -> float:
    """Calculate percentile using linear interpolation."""
    if not sorted_values:
        return 0.0
    k = (len(sorted_values) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_values[int(k)]
    return sorted_values[int(f)] * (c - k) + sorted_values[int(c)] * (k - f)


class AnomalyDetector:
    """
    Statistical anomaly detection engine.
    
    Runs AFTER the deterministic 3-way reconciliation to find patterns
    the hardcoded discrepancy rules miss. Uses statistical methods (IQR,
    z-scores, deviation analysis) rather than fixed thresholds.
    """

    def __init__(self, contracts: Dict[str, Any]):
        self.contracts = contracts
        self.rates = contracts.get("rates", {
            "UPI": 0.0, "NET_BANKING": 1.5, "CREDIT_CARD": 1.8, "DEBIT_CARD": 0.9
        })

    def detect_all(self, orders: List[Dict[str, Any]],
                   gateway_txns: List[Dict[str, Any]],
                   bank_records: List[Dict[str, Any]]) -> List[AnomalyAlert]:
        """Run all anomaly detection methods and return combined alerts."""
        alerts = []
        alerts.extend(self.detect_fee_rate_drift(gateway_txns))
        alerts.extend(self.detect_settlement_velocity_anomaly(gateway_txns))
        alerts.extend(self.detect_amount_outliers(orders))
        alerts.extend(self.detect_volume_spike(orders))
        alerts.extend(self.detect_duplicate_transactions(orders))
        return alerts

    def detect_fee_rate_drift(self, gateway_txns: List[Dict[str, Any]]) -> List[AnomalyAlert]:
        """
        Detect transactions where the effective MDR rate deviates significantly
        from the statistical norm or the contracted rate.
        """
        alerts = []
        
        # Calculate effective rates for transactions with non-zero fees
        rated_txns = []
        for txn in gateway_txns:
            gross = txn.get("gross_amount", 0)
            fee = txn.get("fee", 0)
            if gross > 0 and fee > 0:
                effective_rate = round((fee / gross) * 100, 4)
                rated_txns.append((txn, effective_rate))

        if len(rated_txns) < 2:
            return alerts

        rates = [r for _, r in rated_txns]
        mean_rate = _mean(rates)
        std = _std_dev(rates, mean_rate)

        for txn, effective_rate in rated_txns:
            # Check against statistical distribution
            deviation_from_mean = effective_rate - mean_rate
            z_threshold = 1.5

            # Also check against closest contracted rate
            min_rate_diff = min(
                abs(effective_rate - cr) for cr in self.rates.values() if cr > 0
            ) if any(cr > 0 for cr in self.rates.values()) else 0

            is_statistical_outlier = std > 0 and abs(deviation_from_mean) > z_threshold * std
            is_rate_deviation = min_rate_diff > 0.5

            if is_statistical_outlier or is_rate_deviation:
                deviation_pp = round(deviation_from_mean, 2)
                severity = "HIGH" if abs(deviation_pp) > 1.0 or min_rate_diff > 1.0 else "MEDIUM"

                alerts.append(AnomalyAlert(
                    alert_type="FEE_RATE_DRIFT",
                    severity=severity,
                    metric_observed=round(effective_rate, 2),
                    metric_expected=round(mean_rate, 2),
                    deviation_score=round(abs(deviation_from_mean / std) if std > 0 else min_rate_diff, 2),
                    affected_transactions=[txn.get("order_id", txn.get("gateway_payment_id", "UNKNOWN"))],
                    description=f"Effective MDR rate {effective_rate:.2f}% deviates from batch mean {mean_rate:.2f}% by {deviation_pp:+.2f}pp. Closest contracted rate differs by {min_rate_diff:.2f}pp."
                ))

        return alerts

    def detect_settlement_velocity_anomaly(self, gateway_txns: List[Dict[str, Any]]) -> List[AnomalyAlert]:
        """
        Detect transactions with abnormal settlement timing compared to
        the batch average and the 48-hour SLA.
        """
        alerts = []

        # Calculate settlement hours for settled transactions
        settled = []
        for txn in gateway_txns:
            created = txn.get("created_at", "")
            settled_at = txn.get("settled_at", "")
            if created and settled_at and settled_at.strip():
                try:
                    created_dt = datetime.datetime.fromisoformat(created.replace("Z", "+00:00"))
                    settled_dt = datetime.datetime.fromisoformat(settled_at.replace("Z", "+00:00"))
                    hours = round((settled_dt - created_dt).total_seconds() / 3600, 2)
                    if hours >= 0:
                        settled.append((txn, hours))
                except (ValueError, AttributeError):
                    continue

        if len(settled) < 2:
            return alerts

        hours_list = [h for _, h in settled]
        mean_hours = _mean(hours_list)
        std_hours = _std_dev(hours_list, mean_hours)

        for txn, hours in settled:
            is_sla_breach = hours > 48
            is_statistical_outlier = std_hours > 0 and hours > mean_hours + 2 * std_hours

            if is_sla_breach or is_statistical_outlier:
                severity = "HIGH" if hours > 72 else "MEDIUM"
                alerts.append(AnomalyAlert(
                    alert_type="SETTLEMENT_VELOCITY_ANOMALY",
                    severity=severity,
                    metric_observed=hours,
                    metric_expected=round(mean_hours, 2),
                    deviation_score=round((hours - mean_hours) / std_hours if std_hours > 0 else hours / 48, 2),
                    affected_transactions=[txn.get("order_id", txn.get("gateway_payment_id", "UNKNOWN"))],
                    description=f"Settlement took {hours:.1f}h vs batch average {mean_hours:.1f}h. {'SLA BREACHED (>48h).' if is_sla_breach else 'Statistical outlier.'}"
                ))

        return alerts

    def detect_amount_outliers(self, orders: List[Dict[str, Any]]) -> List[AnomalyAlert]:
        """
        Detect unusually large or small transaction amounts using the
        Interquartile Range (IQR) method.
        """
        alerts = []
        
        if len(orders) < 4:
            return alerts

        amounts = sorted([o.get("amount", 0) for o in orders])
        q1 = _percentile(amounts, 0.25)
        q3 = _percentile(amounts, 0.75)
        iqr = q3 - q1

        if iqr == 0:
            return alerts

        mild_lower = q1 - 1.5 * iqr
        mild_upper = q3 + 1.5 * iqr
        extreme_lower = q1 - 3.0 * iqr
        extreme_upper = q3 + 3.0 * iqr

        median = _percentile(amounts, 0.5)

        for order in orders:
            amount = order.get("amount", 0)
            order_id = order.get("order_id", "UNKNOWN")

            is_extreme = amount < extreme_lower or amount > extreme_upper
            is_mild = amount < mild_lower or amount > mild_upper

            if is_extreme:
                alerts.append(AnomalyAlert(
                    alert_type="AMOUNT_OUTLIER",
                    severity="HIGH",
                    metric_observed=amount,
                    metric_expected=round(median, 2),
                    deviation_score=round(abs(amount - median) / iqr, 2),
                    affected_transactions=[order_id],
                    description=f"Order amount INR {amount:,.2f} is an extreme outlier (3x IQR). Median: INR {median:,.2f}, IQR: INR {iqr:,.2f}. Possible data entry error or fraud."
                ))
            elif is_mild:
                alerts.append(AnomalyAlert(
                    alert_type="AMOUNT_OUTLIER",
                    severity="MEDIUM",
                    metric_observed=amount,
                    metric_expected=round(median, 2),
                    deviation_score=round(abs(amount - median) / iqr, 2),
                    affected_transactions=[order_id],
                    description=f"Order amount INR {amount:,.2f} is a mild outlier (1.5x IQR). Median: INR {median:,.2f}, IQR: INR {iqr:,.2f}."
                ))

        return alerts

    def detect_volume_spike(self, orders: List[Dict[str, Any]]) -> List[AnomalyAlert]:
        """
        Detect abnormal daily transaction volume spikes compared to the
        period average.
        """
        alerts = []

        # Group orders by date
        daily_orders: Dict[str, List[str]] = {}
        for order in orders:
            created = order.get("created_at", "")
            if created:
                date_str = created.split(" ")[0] if " " in created else created.split("T")[0]
                if date_str not in daily_orders:
                    daily_orders[date_str] = []
                daily_orders[date_str].append(order.get("order_id", "UNKNOWN"))

        if len(daily_orders) < 2:
            return alerts

        volumes = [len(ids) for ids in daily_orders.values()]
        mean_vol = _mean(volumes)

        for date_str, order_ids in daily_orders.items():
            vol = len(order_ids)
            spike_ratio = vol / mean_vol if mean_vol > 0 else 0

            if spike_ratio >= 2.0:
                severity = "HIGH" if spike_ratio >= 3.0 else "MEDIUM"
                alerts.append(AnomalyAlert(
                    alert_type="VOLUME_SPIKE",
                    severity=severity,
                    metric_observed=float(vol),
                    metric_expected=round(mean_vol, 1),
                    deviation_score=round(spike_ratio, 2),
                    affected_transactions=order_ids,
                    description=f"Date {date_str}: {vol} transactions vs daily average {mean_vol:.1f} ({spike_ratio:.1f}x spike). May indicate flash sale, system error, or fraudulent batch."
                ))

        return alerts

    def detect_duplicate_transactions(self, orders: List[Dict[str, Any]]) -> List[AnomalyAlert]:
        """
        Detect potential duplicate payments by matching amount + customer
        within a 5-minute time window.
        """
        alerts = []

        # Group by (customer_id, amount)
        groups: Dict[Tuple[str, float], List[Dict[str, Any]]] = {}
        for order in orders:
            key = (order.get("customer_id", ""), order.get("amount", 0))
            if key[0]:  # Only group if customer_id exists
                if key not in groups:
                    groups[key] = []
                groups[key].append(order)

        for key, group_orders in groups.items():
            if len(group_orders) < 2:
                continue

            # Check for pairs within 5-minute window
            for i in range(len(group_orders)):
                for j in range(i + 1, len(group_orders)):
                    try:
                        t1_str = group_orders[i].get("created_at", "")
                        t2_str = group_orders[j].get("created_at", "")
                        if not t1_str or not t2_str:
                            continue
                        t1 = datetime.datetime.fromisoformat(t1_str.replace("Z", "+00:00"))
                        t2 = datetime.datetime.fromisoformat(t2_str.replace("Z", "+00:00"))
                        diff_minutes = abs((t2 - t1).total_seconds()) / 60

                        if diff_minutes <= 5.0:
                            alerts.append(AnomalyAlert(
                                alert_type="POTENTIAL_DUPLICATE",
                                severity="HIGH",
                                metric_observed=diff_minutes,
                                metric_expected=5.0,
                                deviation_score=round(5.0 - diff_minutes, 2),
                                affected_transactions=[
                                    group_orders[i].get("order_id", "UNKNOWN"),
                                    group_orders[j].get("order_id", "UNKNOWN")
                                ],
                                description=f"Potential duplicate: Customer {key[0]} charged INR {key[1]:,.2f} twice within {diff_minutes:.1f} minutes. Orders: {group_orders[i].get('order_id')}, {group_orders[j].get('order_id')}."
                            ))
                    except (ValueError, AttributeError):
                        continue

        return alerts
