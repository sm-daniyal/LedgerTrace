from typing import Dict, Any
from .tools import AgentTools

class SelfHealingEngine:
    # Executes automated self-healing actions.
    
    @staticmethod
    def post_journal(discrepancy_id: str, disc_type: str, amount: float, order_id: str) -> Dict[str, Any]:
        return AgentTools.generate_double_entry_journal(discrepancy_id, disc_type, amount, order_id)

    @staticmethod
    def resync_webhook(order_id: str, gateway_payment_id: str) -> Dict[str, Any]:
        return AgentTools.simulate_webhook_resync(order_id, gateway_payment_id)

    @staticmethod
    def export_dispute(discrepancy: Dict[str, Any]) -> Dict[str, Any]:
        return AgentTools.generate_dispute_dossier(discrepancy)
