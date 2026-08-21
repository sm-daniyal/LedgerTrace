from typing import Dict, Any, List
from .tools import AgentTools

class ForensicInvestigator:
    # Autonomous agent responsible for deep root-cause analysis on discrepancies.
    
    def __init__(self, contracts: Dict[str, Any]):
        self.contracts = contracts

    def enrich_discrepancy(self, discrepancy: Dict[str, Any]) -> Dict[str, Any]:
        disc_type = discrepancy.get("type")
        impact = discrepancy.get("impact_amount", 0.0)
        order_id = discrepancy.get("order_id", "UNKNOWN")
        
        # Calculate downstream operational risk
        downstream_risk = "LOW"
        if impact > 25000 or disc_type == "SETTLEMENT_DELAY":
            downstream_risk = "HIGH - Merchant cashflow & scheduled vendor disbursements impacted"
        elif impact > 5000:
            downstream_risk = "MEDIUM - Revenue leakage requires month-end dispute"

        discrepancy["downstream_risk"] = downstream_risk
        return discrepancy
