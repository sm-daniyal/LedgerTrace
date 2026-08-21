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
