import json
import datetime
from typing import Dict, Any

class AgentTools:
    # Deterministic tools invoked by forensic agents.

    @staticmethod
    def generate_double_entry_journal(discrepancy_id: str, disc_type: str, amount: float, order_id: str) -> Dict[str, Any]:
        voucher_no = f"JV-{datetime.date.today().strftime('%Y%m%d')}-{discrepancy_id[-4:]}"
        now = datetime.datetime.now().isoformat()
        
        if disc_type == "MDR_OVERCHARGE":
            entries = [
                {"account": "Gateway MDR Dispute Clearing (Asset)", "debit": amount, "credit": 0.0},
                {"account": "Payment Processing Expense (Expense Reversal)", "debit": 0.0, "credit": amount}
            ]
            narration = f"Adjustment voucher for excess MDR fee deducted on order {order_id} (Claim ref: {discrepancy_id})."
        elif disc_type == "DROPPED_WEBHOOK":
            entries = [
                {"account": "Gateway Settlement Clearing (Asset)", "debit": amount, "credit": 0.0},
                {"account": "Customer Accounts Receivable / Sales", "debit": 0.0, "credit": amount}
            ]
            narration = f"Recognizing revenue for captured order {order_id} following webhook resync confirmation."
        else:
            entries = [
                {"account": "Suspense Account", "debit": amount, "credit": 0.0},
                {"account": "Gateway Clearing Account", "debit": 0.0, "credit": amount}
            ]
            narration = f"Provisional ledger balancing entry for unclassified discrepancy {discrepancy_id} on order {order_id}."

        return {
            "voucher_no": voucher_no,
            "created_at": now,
            "discrepancy_id": discrepancy_id,
            "total_debit": amount,
            "total_credit": amount,
            "entries": entries,
            "narration": narration,
            "status": "POSTED"
        }

    @staticmethod
    def simulate_webhook_resync(order_id: str, gateway_payment_id: str) -> Dict[str, Any]:
        return {
            "order_id": order_id,
            "gateway_payment_id": gateway_payment_id,
            "event": "payment.captured",
            "http_status": 200,
            "response": "Merchant order state updated to SUCCESS",
            "resynced_at": datetime.datetime.now().isoformat()
        }

    @staticmethod
    def generate_dispute_dossier(discrepancy: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "dossier_id": f"DISP-{discrepancy.get('id', '9999')[-6:]}",
            "generated_at": datetime.datetime.now().isoformat(),
            "target_gateway": "Razorpay Settlement Desk",
            "order_id": discrepancy.get("order_id"),
            "gateway_payment_id": discrepancy.get("gateway_payment_id"),
            "claimed_overcharge_amount": discrepancy.get("impact_amount"),
            "evidence_chain": discrepancy.get("investigation_steps", []),
            "requested_action": "Credit memo reimbursement in next settlement cycle",
            "compliance_status": "READY_FOR_SUBMISSION"
        }

    # ─── Forensic Investigation Tools ─────────────────────────────────

    @staticmethod
    def lookup_rate_card(contracts: Dict[str, Any], payment_method: str,
                         card_network: str = None) -> Dict[str, Any]:
        """Look up contracted MDR rate for a payment method and card network."""
        default_rates = {"UPI": 0.0, "NET_BANKING": 1.5, "CREDIT_CARD": 1.8, "DEBIT_CARD": 0.9}
        rates = contracts.get("rates", default_rates)
        contracted_rate = rates.get(payment_method, 1.8)

        # AMEX typically has a premium surcharge
        if card_network and card_network.upper() == "AMEX":
            contracted_rate = max(contracted_rate, 2.0)

        return {
            "payment_method": payment_method,
            "card_network": card_network or "N/A",
            "contracted_rate": contracted_rate,
            "source": "merchant_contract_v1"
        }

    @staticmethod
    def calculate_expected_settlement(gross_amount: float, contracted_rate: float,
                                      gst_rate: float = 0.18) -> Dict[str, Any]:
        """Calculate the mathematically expected fee, GST, and net payout."""
        expected_fee = round((gross_amount * contracted_rate) / 100.0, 2)
        expected_gst = round(expected_fee * gst_rate, 2)
        expected_net = round(gross_amount - (expected_fee + expected_gst), 2)
        return {
            "gross_amount": gross_amount,
            "contracted_rate": contracted_rate,
            "expected_fee": expected_fee,
            "expected_gst": expected_gst,
            "expected_net": expected_net,
            "formula_applied": f"Fee = round(({gross_amount} * {contracted_rate}) / 100, 2)"
        }

    @staticmethod
    def check_settlement_sla(captured_at: str, settled_at: str,
                              sla_hours: int = 48) -> Dict[str, Any]:
        """Check whether a transaction's settlement is within the contracted SLA window."""
        try:
            captured_dt = datetime.datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            captured_dt = datetime.datetime.now()

        if settled_at and settled_at.strip():
            try:
                settled_dt = datetime.datetime.fromisoformat(settled_at.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                settled_dt = datetime.datetime.now()
        else:
            settled_dt = datetime.datetime.now()

        elapsed = settled_dt - captured_dt
        elapsed_hours = round(elapsed.total_seconds() / 3600, 2)
        sla_status = "WITHIN_SLA" if elapsed_hours <= sla_hours else "SLA_BREACHED"
        breach_hours = round(max(0, elapsed_hours - sla_hours), 2)

        return {
            "captured_at": captured_at,
            "settled_at": settled_at or "NOT_SETTLED",
            "elapsed_hours": elapsed_hours,
            "sla_hours": sla_hours,
            "sla_status": sla_status,
            "breach_hours": breach_hours
        }

    @staticmethod
    def query_historical_baseline(order_amount: float, payment_method: str,
                                   contracts: Dict[str, Any]) -> Dict[str, Any]:
        """Return historical baseline metrics for comparison against current transaction."""
        rates = contracts.get("rates", {"UPI": 0.0, "NET_BANKING": 1.5, "CREDIT_CARD": 1.8, "DEBIT_CARD": 0.9})
        rate = rates.get(payment_method, 1.8)
        min_fee = round((order_amount * max(rate - 0.2, 0)) / 100.0, 2)
        max_fee = round((order_amount * (rate + 0.2)) / 100.0, 2)

        return {
            "payment_method": payment_method,
            "average_order_value": order_amount,
            "typical_fee_range": {"min": min_fee, "max": max_fee},
            "contracted_rate": rate,
            "settlement_sla_hours": 48,
            "data_source": "historical_baseline_v1"
        }

    @staticmethod
    def assess_downstream_impact(amount: float, disc_type: str,
                                  total_merchant_volume: float = 0) -> Dict[str, Any]:
        """Assess the operational risk and downstream impact of a discrepancy."""
        impact_pct = round((amount / total_merchant_volume * 100), 2) if total_merchant_volume > 0 else 0.0

        # Determine risk level
        if impact_pct > 5.0 or amount > 100000:
            risk_level = "CRITICAL"
            urgency = "IMMEDIATE"
        elif amount > 25000 or disc_type == "SETTLEMENT_DELAY":
            risk_level = "HIGH"
            urgency = "PRIORITY"
        elif amount > 5000:
            risk_level = "MEDIUM"
            urgency = "ROUTINE"
        else:
            risk_level = "LOW"
            urgency = "ROUTINE"

        # Map affected operations by discrepancy type
        ops_map = {
            "MDR_OVERCHARGE": ["Revenue recognition accuracy", "Gateway dispute filing", "Month-end P&L adjustment"],
            "DROPPED_WEBHOOK": ["Order fulfillment pipeline", "Customer communication", "Inventory management"],
            "SETTLEMENT_DELAY": ["Vendor disbursement schedule", "Cash flow forecasting", "Working capital planning"],
            "MISSING_GATEWAY_RECORD": ["Checkout funnel analytics", "Customer recovery campaigns"]
        }
        affected_ops = ops_map.get(disc_type, ["General ledger reconciliation"])

        return {
            "impact_amount": amount,
            "impact_as_pct_of_volume": impact_pct,
            "risk_level": risk_level,
            "affected_operations": affected_ops,
            "recommended_urgency": urgency
        }
