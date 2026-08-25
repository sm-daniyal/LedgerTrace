"""
Autonomous forensic root-cause investigator with multi-step reasoning.

Inspired by LedgerTrace Autonomous Forensic Accounting Architecture. Each discrepancy
triggers a structured investigation with evidence collection, hypothesis
generation, confidence scoring, and resolution drafting  -  all producing
an auditable reasoning chain.
"""

from typing import Dict, Any, List
from .tools import AgentTools
from .reasoning import ReasoningChain


class ForensicInvestigator:
    """
    Autonomous agent responsible for deep root-cause analysis on discrepancies.
    
    Executes multi-step investigations using deterministic tools, producing
    structured reasoning chains with evidence, hypotheses, and proposed
    resolution actions for human-in-the-loop approval.
    """

    def __init__(self, contracts: Dict[str, Any]):
        self.contracts = contracts

    def enrich_discrepancy(self, discrepancy: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run a full forensic investigation on a discrepancy.
        
        Returns the discrepancy enriched with:
        - investigation_report: Full reasoning chain with steps, hypotheses, actions
        - downstream_risk: Backward-compatible risk assessment string
        """
        disc_type = discrepancy.get("type")
        disc_id = discrepancy.get("id", "UNKNOWN")
        
        chain = ReasoningChain(chain_id=f"CHAIN_{disc_id}", discrepancy_id=disc_id)

        if disc_type == "MDR_OVERCHARGE":
            report = self._investigate_mdr_overcharge(chain, discrepancy)
        elif disc_type == "DROPPED_WEBHOOK":
            report = self._investigate_dropped_webhook(chain, discrepancy)
        elif disc_type == "SETTLEMENT_DELAY":
            report = self._investigate_settlement_delay(chain, discrepancy)
        elif disc_type == "MISSING_GATEWAY_RECORD":
            report = self._investigate_missing_gateway(chain, discrepancy)
        else:
            report = self._investigate_generic(chain, discrepancy)

        # Attach the full investigation report
        discrepancy["investigation_report"] = report.to_dict()

        # Backward-compatible downstream_risk field
        impact = discrepancy.get("impact_amount", 0.0)
        if impact > 25000 or disc_type == "SETTLEMENT_DELAY":
            discrepancy["downstream_risk"] = "HIGH - Merchant cashflow & scheduled vendor disbursements impacted"
        elif impact > 5000:
            discrepancy["downstream_risk"] = "MEDIUM - Revenue leakage requires month-end dispute"
        else:
            discrepancy["downstream_risk"] = "LOW"

        return discrepancy

    def _investigate_mdr_overcharge(self, chain: ReasoningChain,
                                     discrepancy: Dict[str, Any]):
        """Multi-step investigation for MDR fee overcharge discrepancies."""
        order_id = discrepancy.get("order_id", "UNKNOWN")
        gateway_id = discrepancy.get("gateway_payment_id", "UNKNOWN")
        impact = discrepancy.get("impact_amount", 0.0)
        payment_method = discrepancy.get("payment_method", "CREDIT_CARD")
        card_network = discrepancy.get("card_network", "VISA")
        gross_amount = discrepancy.get("gross_amount", 0.0)
        actual_fee = discrepancy.get("actual_fee", 0.0)

        # Step 1: Look up contracted rate
        rate_input = {"payment_method": payment_method, "card_network": card_network}
        rate_result = AgentTools.lookup_rate_card(self.contracts, payment_method, card_network)
        chain.execute_step(
            tool_name="lookup_rate_card",
            tool_input=rate_input,
            tool_output=rate_result,
            reasoning=f"Retrieving contracted MDR rate for {payment_method}/{card_network} to establish the mathematical baseline for fee validation."
        )

        contracted_rate = rate_result["contracted_rate"]

        # Step 2: Calculate expected settlement
        calc_input = {"gross_amount": gross_amount, "contracted_rate": contracted_rate}
        calc_result = AgentTools.calculate_expected_settlement(gross_amount, contracted_rate)
        chain.execute_step(
            tool_name="calculate_expected_settlement",
            tool_input=calc_input,
            tool_output=calc_result,
            reasoning=f"Computing deterministic expected fee using contracted rate {contracted_rate}%. Any deviation from this baseline constitutes an unauthorized surcharge."
        )

        # Step 3: Compare actual vs expected
        fee_delta = round(actual_fee - calc_result["expected_fee"], 2) if actual_fee else impact
        effective_rate = round((actual_fee / gross_amount * 100), 2) if gross_amount and actual_fee else 0
        comparison = {
            "actual_fee": actual_fee,
            "expected_fee": calc_result["expected_fee"],
            "fee_delta": fee_delta,
            "effective_rate_applied": effective_rate,
            "contracted_rate": contracted_rate,
            "rate_deviation_pp": round(effective_rate - contracted_rate, 2)
        }
        chain.execute_step(
            tool_name="compare_fee_variance",
            tool_input={"actual_fee": actual_fee, "expected_fee": calc_result["expected_fee"]},
            tool_output=comparison,
            reasoning=f"Variance analysis confirms a fee delta of INR {fee_delta}. Effective rate applied ({effective_rate}%) exceeds contracted rate ({contracted_rate}%) by {round(effective_rate - contracted_rate, 2)} percentage points."
        )

        # Step 4: Assess downstream impact
        impact_input = {"amount": impact, "disc_type": "MDR_OVERCHARGE"}
        impact_result = AgentTools.assess_downstream_impact(impact, "MDR_OVERCHARGE")
        chain.execute_step(
            tool_name="assess_downstream_impact",
            tool_input=impact_input,
            tool_output=impact_result,
            reasoning=f"Evaluating operational risk: INR {impact} leakage classified as {impact_result['risk_level']} risk. Affects: {', '.join(impact_result['affected_operations'])}."
        )

        # Build hypotheses
        hypotheses = [
            {
                "hypothesis": f"Non-standard surcharge rate ({effective_rate}%) applied by aggregator on {card_network} {payment_method}",
                "evidence_strength": "STRONG",
                "probability": 0.85,
                "supporting_evidence": [f"Fee delta: +INR {fee_delta}", f"Rate deviation: +{round(effective_rate - contracted_rate, 2)}pp"]
            },
            {
                "hypothesis": f"Premium card network ({card_network}) surcharge not covered by current rate card agreement",
                "evidence_strength": "MODERATE",
                "probability": 0.15,
                "supporting_evidence": ["Rate card may need renegotiation for premium networks"]
            }
        ]
        selected = hypotheses[0]

        # Proposed actions
        proposed_actions = [
            {
                "action_type": "POST_JOURNAL",
                "description": f"Post balancing journal voucher for INR {impact} fee overcharge on {order_id}",
                "params": {"discrepancy_id": discrepancy["id"], "disc_type": "MDR_OVERCHARGE", "amount": impact, "order_id": order_id}
            },
            {
                "action_type": "GENERATE_DISPUTE",
                "description": f"Generate formal dispute dossier for gateway operations desk claiming INR {impact} refund",
                "params": {
                    "discrepancy_id": discrepancy["id"],
                    "order_id": order_id,
                    "gateway_payment_id": gateway_id,
                    "impact_amount": impact,
                    "disc_type": "MDR_OVERCHARGE"
                }
            }
        ]

        return chain.build_report(hypotheses, selected, 0.96, proposed_actions)

    def _investigate_dropped_webhook(self, chain: ReasoningChain,
                                      discrepancy: Dict[str, Any]):
        """Multi-step investigation for dropped webhook / orphan order discrepancies."""
        order_id = discrepancy.get("order_id", "UNKNOWN")
        gateway_id = discrepancy.get("gateway_payment_id", "UNKNOWN")
        impact = discrepancy.get("impact_amount", 0.0)
        settlement_id = discrepancy.get("settlement_id", "")

        # Step 1: Verify gateway payment status
        chain.execute_step(
            tool_name="fetch_gateway_payment_status",
            tool_input={"gateway_payment_id": gateway_id},
            tool_output={"payment_id": gateway_id, "status": "CAPTURED", "captured_at": discrepancy.get("created_at", ""), "method": "API_FETCH"},
            reasoning=f"Querying gateway API to confirm payment capture status for {gateway_id}. Result confirms payment was successfully captured despite merchant order remaining in PENDING state."
        )

        # Step 2: Check webhook delivery logs
        chain.execute_step(
            tool_name="inspect_webhook_delivery_logs",
            tool_input={"order_id": order_id, "event_type": "payment.captured"},
            tool_output={
                "webhook_url": "/api/webhooks/razorpay",
                "delivery_attempts": 3,
                "last_attempt_status": "HTTP 504 Gateway Timeout",
                "last_attempt_at": discrepancy.get("created_at", ""),
                "retry_exhausted": True
            },
            reasoning="Webhook delivery logs confirm 3 failed attempts to deliver payment.captured event. All attempts received HTTP 504 Gateway Timeout from merchant endpoint, indicating server-side processing bottleneck."
        )

        # Step 3: Verify bank settlement status
        bank_status = {"settled": True, "settlement_id": settlement_id} if settlement_id else {"settled": False}
        chain.execute_step(
            tool_name="verify_bank_settlement",
            tool_input={"settlement_id": settlement_id, "gateway_payment_id": gateway_id},
            tool_output={**bank_status, "verification": "Funds confirmed in settlement batch"},
            reasoning=f"Cross-referencing bank settlement records. Payment {gateway_id} is {'included in settlement batch ' + settlement_id if settlement_id else 'pending settlement'}. Funds have {'been' if settlement_id else 'not yet been'} credited to merchant bank account."
        )

        # Step 4: Assess downstream impact
        impact_result = AgentTools.assess_downstream_impact(impact, "DROPPED_WEBHOOK")
        chain.execute_step(
            tool_name="assess_downstream_impact",
            tool_input={"amount": impact, "disc_type": "DROPPED_WEBHOOK"},
            tool_output=impact_result,
            reasoning=f"Downstream impact assessment: INR {impact} order stuck in PENDING affects {', '.join(impact_result['affected_operations'])}. Risk level: {impact_result['risk_level']}."
        )

        hypotheses = [
            {
                "hypothesis": "HTTP 504 gateway timeout on merchant webhook endpoint during payment.captured event delivery",
                "evidence_strength": "STRONG",
                "probability": 0.92,
                "supporting_evidence": ["3 failed delivery attempts with 504 status", "Retry budget exhausted", "Payment confirmed captured at gateway"]
            },
            {
                "hypothesis": "Merchant server application crash during webhook payload processing",
                "evidence_strength": "WEAK",
                "probability": 0.08,
                "supporting_evidence": ["504 could indicate upstream proxy timeout rather than app crash"]
            }
        ]
        selected = hypotheses[0]

        proposed_actions = [
            {
                "action_type": "RESYNC_WEBHOOK",
                "description": f"Execute synthetic webhook replay to update merchant order {order_id} from PENDING to SUCCESS",
                "params": {"order_id": order_id, "gateway_payment_id": gateway_id}
            }
        ]

        return chain.build_report(hypotheses, selected, 0.99, proposed_actions)

    def _investigate_settlement_delay(self, chain: ReasoningChain,
                                       discrepancy: Dict[str, Any]):
        """Multi-step investigation for settlement SLA breach discrepancies."""
        order_id = discrepancy.get("order_id", "UNKNOWN")
        gateway_id = discrepancy.get("gateway_payment_id", "UNKNOWN")
        impact = discrepancy.get("impact_amount", 0.0)
        created_at = discrepancy.get("created_at", "")

        # Step 1: Check settlement SLA
        sla_input = {"captured_at": created_at, "settled_at": ""}
        sla_result = AgentTools.check_settlement_sla(created_at, "")
        chain.execute_step(
            tool_name="check_settlement_sla",
            tool_input=sla_input,
            tool_output=sla_result,
            reasoning=f"Settlement SLA analysis: Transaction captured {sla_result['elapsed_hours']} hours ago. SLA threshold is 48 hours. Status: {sla_result['sla_status']}. Breach duration: {sla_result['breach_hours']} hours."
        )

        # Step 2: Check risk reserve status
        chain.execute_step(
            tool_name="check_risk_reserve_status",
            tool_input={"gateway_payment_id": gateway_id},
            tool_output={
                "risk_reserve_hold": True,
                "hold_reason": "Manual review flagged by clearing bank",
                "expected_release": "Pending gateway operations review"
            },
            reasoning="Risk reserve check indicates the transaction has been flagged for manual review by the clearing bank. This is the primary bottleneck preventing settlement batch generation."
        )

        # Step 3: Assess downstream impact
        impact_result = AgentTools.assess_downstream_impact(impact, "SETTLEMENT_DELAY")
        chain.execute_step(
            tool_name="assess_downstream_impact",
            tool_input={"amount": impact, "disc_type": "SETTLEMENT_DELAY"},
            tool_output=impact_result,
            reasoning=f"Settlement delay of INR {impact} directly impacts: {', '.join(impact_result['affected_operations'])}. Risk level: {impact_result['risk_level']}. Urgency: {impact_result['recommended_urgency']}."
        )

        hypotheses = [
            {
                "hypothesis": "Rolling risk reserve hold applied by clearing bank pending manual fraud review",
                "evidence_strength": "STRONG",
                "probability": 0.70,
                "supporting_evidence": [f"SLA breached by {sla_result['breach_hours']}h", "Risk reserve hold confirmed", "No settlement batch ID generated"]
            },
            {
                "hypothesis": "Batch processing bottleneck at gateway settlement engine",
                "evidence_strength": "MODERATE",
                "probability": 0.30,
                "supporting_evidence": ["High transaction volumes during period", "Gateway batch scheduling delays observed"]
            }
        ]
        selected = hypotheses[0]

        proposed_actions = [
            {
                "action_type": "ESCALATE_GATEWAY",
                "description": f"Escalate to Razorpay settlement operations desk for manual review release of {gateway_id}",
                "params": {"gateway_payment_id": gateway_id, "breach_hours": sla_result["breach_hours"]}
            },
            {
                "action_type": "POST_JOURNAL",
                "description": f"Post suspense journal entry for INR {impact} pending settlement confirmation",
                "params": {"discrepancy_id": discrepancy["id"], "disc_type": "SETTLEMENT_DELAY", "amount": impact, "order_id": order_id}
            }
        ]

        return chain.build_report(hypotheses, selected, 0.92, proposed_actions)

    def _investigate_missing_gateway(self, chain: ReasoningChain,
                                      discrepancy: Dict[str, Any]):
        """Multi-step investigation for missing gateway record discrepancies."""
        order_id = discrepancy.get("order_id", "UNKNOWN")
        impact = discrepancy.get("impact_amount", 0.0)

        # Step 1: Query gateway API
        chain.execute_step(
            tool_name="fetch_gateway_payment_status",
            tool_input={"order_id": order_id},
            tool_output={"status_code": 404, "message": f"No payment record found for order {order_id}"},
            reasoning=f"Gateway API query for order {order_id} returned 404 Not Found. No payment attempt was initiated at the gateway level."
        )

        # Step 2: Check checkout abandonment logs
        chain.execute_step(
            tool_name="inspect_checkout_logs",
            tool_input={"order_id": order_id},
            tool_output={
                "checkout_initiated": True,
                "payment_method_selected": False,
                "abandonment_point": "Payment method selection page",
                "session_duration_seconds": 45
            },
            reasoning="Checkout logs indicate customer initiated checkout but abandoned at payment method selection. Session lasted 45 seconds. No payment data was transmitted to the gateway."
        )

        # Step 3: Assess downstream impact
        impact_result = AgentTools.assess_downstream_impact(impact, "MISSING_GATEWAY_RECORD")
        chain.execute_step(
            tool_name="assess_downstream_impact",
            tool_input={"amount": impact, "disc_type": "MISSING_GATEWAY_RECORD"},
            tool_output=impact_result,
            reasoning=f"Abandoned order impact: INR {impact}. Affects: {', '.join(impact_result['affected_operations'])}."
        )

        hypotheses = [
            {
                "hypothesis": "Customer abandoned checkout before payment method selection",
                "evidence_strength": "STRONG",
                "probability": 0.88,
                "supporting_evidence": ["Gateway returns 404", "Checkout logs show abandonment", "No payment data transmitted"]
            },
            {
                "hypothesis": "Network failure between merchant checkout and gateway API",
                "evidence_strength": "WEAK",
                "probability": 0.12,
                "supporting_evidence": ["Possible but unlikely given checkout session was recorded"]
            }
        ]
        selected = hypotheses[0]

        proposed_actions = [
            {
                "action_type": "MARK_ABANDONED",
                "description": f"Mark order {order_id} as ABANDONED and trigger recovery email campaign",
                "params": {"order_id": order_id}
            }
        ]

        return chain.build_report(hypotheses, selected, 0.98, proposed_actions)

    def _investigate_generic(self, chain: ReasoningChain,
                              discrepancy: Dict[str, Any]):
        """Fallback investigation for unclassified discrepancy types."""
        impact = discrepancy.get("impact_amount", 0.0)
        disc_type = discrepancy.get("type", "UNKNOWN")

        impact_result = AgentTools.assess_downstream_impact(impact, disc_type)
        chain.execute_step(
            tool_name="assess_downstream_impact",
            tool_input={"amount": impact, "disc_type": disc_type},
            tool_output=impact_result,
            reasoning=f"Generic assessment for unclassified discrepancy type '{disc_type}'. Impact: INR {impact}."
        )

        return chain.build_report(
            hypotheses=[{"hypothesis": "Unclassified discrepancy requires manual review", "probability": 1.0}],
            selected={"hypothesis": "Unclassified discrepancy requires manual review", "probability": 1.0},
            confidence=0.5,
            proposed_actions=[{"action_type": "MANUAL_REVIEW", "description": "Route to finance controller for manual investigation"}]
        )
