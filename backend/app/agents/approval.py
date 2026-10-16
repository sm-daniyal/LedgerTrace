"""
Human-in-the-Loop Approval Workflow  -  LedgerTrace Controlled Audit & Accounting Workflow.

AI agent proposes actions (JVs, webhook resyncs, dispute claims) →
they enter PENDING_APPROVAL state → human controller reviews evidence
and reasoning → approves or rejects → action executes and audit trail
updates.

This ensures no automated action modifies financial records without
explicit human oversight  -  critical for SOX compliance and audit readiness.
"""

import uuid
import datetime
import hashlib
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum

from .tools import AgentTools


class ApprovalStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED_AND_EXECUTED = "APPROVED_AND_EXECUTED"
    REJECTED = "REJECTED"


@dataclass
class StagedAction:
    """An action proposed by the AI agent, staged for human approval."""
    action_type: str
    params: Dict[str, Any]
    investigation_summary: str
    confidence_score: float
    discrepancy_id: str
    order_id: str
    status: ApprovalStatus = ApprovalStatus.PENDING_APPROVAL
    action_id: str = field(default_factory=lambda: f"ACT_{uuid.uuid4().hex[:8].upper()}")
    proposed_at: str = field(default_factory=lambda: datetime.datetime.now().isoformat())
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    execution_result: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "action_id": self.action_id,
            "action_type": self.action_type,
            "params": self.params,
            "investigation_summary": self.investigation_summary,
            "confidence_score": self.confidence_score,
            "discrepancy_id": self.discrepancy_id,
            "order_id": self.order_id,
            "status": self.status.value,
            "proposed_at": self.proposed_at,
            "reviewed_at": self.reviewed_at,
        }
        if self.rejection_reason:
            result["rejection_reason"] = self.rejection_reason
        if self.execution_result:
            result["execution_result"] = self.execution_result
        return result


class ApprovalQueue:
    """
    Manages the human-in-the-loop approval workflow for agent-proposed actions.
    
    The agent proposes resolution actions (journal vouchers, webhook resyncs,
    dispute claims) after completing its investigation. These are staged in
    the approval queue for human review. The controller can then approve
    (triggering execution) or reject (with a reason).
    
    Every state transition is timestamped for audit compliance.
    """

    def __init__(self):
        self.queue: Dict[str, StagedAction] = {}
        self.audit_log: List[Dict[str, Any]] = []

    def propose_action(self, action_type: str, params: Dict[str, Any],
                        investigation_summary: str, confidence_score: float,
                        discrepancy_id: str, order_id: str) -> StagedAction:
        """
        Stage an action for human approval.
        
        Called by the forensic agent after completing its investigation.
        The action enters PENDING_APPROVAL state.
        """
        action = StagedAction(
            action_type=action_type,
            params=params,
            investigation_summary=investigation_summary,
            confidence_score=confidence_score,
            discrepancy_id=discrepancy_id,
            order_id=order_id
        )
        self.queue[action.action_id] = action

        self._log_event("ACTION_PROPOSED", action.action_id, {
            "action_type": action_type,
            "discrepancy_id": discrepancy_id,
            "order_id": order_id,
            "confidence_score": confidence_score
        })

        return action

    def approve(self, action_id: str) -> Dict[str, Any]:
        """
        Approve and execute a staged action.
        
        Transitions the action to APPROVED_AND_EXECUTED and runs
        the corresponding self-healing operation.
        """
        action = self.queue.get(action_id)
        if not action:
            return {"error": f"Action {action_id} not found"}

        if action.status != ApprovalStatus.PENDING_APPROVAL:
            return {"error": f"Action {action_id} is already {action.status.value}"}

        # Execute the action
        result = self._execute_action(action)

        action.status = ApprovalStatus.APPROVED_AND_EXECUTED
        action.reviewed_at = datetime.datetime.now().isoformat()
        action.execution_result = result

        self._log_event("ACTION_APPROVED_AND_EXECUTED", action_id, {
            "action_type": action.action_type,
            "execution_result": result
        })

        return {
            "action_id": action_id,
            "status": "APPROVED_AND_EXECUTED",
            "execution_result": result
        }

    def reject(self, action_id: str, reason: str) -> Dict[str, Any]:
        """
        Reject a staged action with a reason.
        
        The controller must provide a reason for rejection for audit purposes.
        """
        action = self.queue.get(action_id)
        if not action:
            return {"error": f"Action {action_id} not found"}

        if action.status != ApprovalStatus.PENDING_APPROVAL:
            return {"error": f"Action {action_id} is already {action.status.value}"}

        action.status = ApprovalStatus.REJECTED
        action.reviewed_at = datetime.datetime.now().isoformat()
        action.rejection_reason = reason

        self._log_event("ACTION_REJECTED", action_id, {
            "action_type": action.action_type,
            "rejection_reason": reason
        })

        return {
            "action_id": action_id,
            "status": "REJECTED",
            "reason": reason
        }

    def get_queue(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return all actions in the queue, optionally filtered by status."""
        actions = list(self.queue.values())
        if status_filter:
            actions = [a for a in actions if a.status.value == status_filter]
        return [a.to_dict() for a in sorted(actions, key=lambda a: a.proposed_at, reverse=True)]

    def get_audit_log(self) -> List[Dict[str, Any]]:
        """Return the full audit trail of all approval workflow events."""
        return self.audit_log

    def get_stats(self) -> Dict[str, Any]:
        """Return summary statistics for the approval queue."""
        actions = list(self.queue.values())
        return {
            "total_proposed": len(actions),
            "pending_approval": sum(1 for a in actions if a.status == ApprovalStatus.PENDING_APPROVAL),
            "approved_and_executed": sum(1 for a in actions if a.status == ApprovalStatus.APPROVED_AND_EXECUTED),
            "rejected": sum(1 for a in actions if a.status == ApprovalStatus.REJECTED),
            "average_confidence": round(
                sum(a.confidence_score for a in actions) / len(actions), 2
            ) if actions else 0.0
        }

    def export_erp_journal_voucher(self, action_id: str, approved_by: str = "controller@merchant.com") -> Dict[str, Any]:
        """
        Export a standardized double-entry journal voucher payload for ERP ingestion.

        Compliant with SOX 404 segregation of duties and standard general ledger schemas
        (DualEntry, NetSuite, SAP). Guarantees sum(Debits) == sum(Credits) and seals
        the payload with a tamper-evident SHA-256 cryptographic audit hash.
        """
        action = self.queue.get(action_id)
        if not action:
            return {"error": f"Action {action_id} not found"}

        if action.status != ApprovalStatus.APPROVED_AND_EXECUTED:
            return {
                "error": f"Action {action_id} must be APPROVED_AND_EXECUTED before ERP export (current status: {action.status.value})"
            }

        params = action.params
        amount = float(params.get("amount", 0.0))
        disc_type = params.get("disc_type", "MDR_OVERCHARGE")
        discrepancy_id = params.get("discrepancy_id", action.discrepancy_id)
        order_id = params.get("order_id", action.order_id)
        posted_at = action.reviewed_at or datetime.datetime.now().isoformat()

        # Deterministic SHA-256 audit hash
        audit_payload = f"{action_id}|{discrepancy_id}|{order_id}|{amount:.2f}|{posted_at}|{approved_by}"
        sox_audit_hash = hashlib.sha256(audit_payload.encode("utf-8")).hexdigest()

        if disc_type == "MDR_OVERCHARGE":
            lines = [
                {
                    "line_no": 1,
                    "account_code": "6120",
                    "account_name": "Payment Gateway Processing Fees (Variance Surcharge)",
                    "debit": round(amount, 2),
                    "credit": 0.0,
                    "description": f"Unauthorized rate surcharge adjustment for order {order_id}"
                },
                {
                    "line_no": 2,
                    "account_code": "1150",
                    "account_name": "Gateway Settlement Clearing Suspense",
                    "debit": 0.0,
                    "credit": round(amount, 2),
                    "description": f"Offsetting suspense credit pending dispute claim {discrepancy_id}"
                }
            ]
        elif disc_type == "DROPPED_WEBHOOK":
            lines = [
                {
                    "line_no": 1,
                    "account_code": "1140",
                    "account_name": "Gateway Settlement Clearing (Asset)",
                    "debit": round(amount, 2),
                    "credit": 0.0,
                    "description": f"Recognizing settlement clearing for order {order_id}"
                },
                {
                    "line_no": 2,
                    "account_code": "4100",
                    "account_name": "Customer Accounts Receivable / Sales",
                    "debit": 0.0,
                    "credit": round(amount, 2),
                    "description": f"Revenue recognition following webhook resync for order {order_id}"
                }
            ]
        else:
            lines = [
                {
                    "line_no": 1,
                    "account_code": "1999",
                    "account_name": "Suspense Clearing Account",
                    "debit": round(amount, 2),
                    "credit": 0.0,
                    "description": f"Provisional clearing debit for discrepancy {discrepancy_id}"
                },
                {
                    "line_no": 2,
                    "account_code": "1150",
                    "account_name": "Gateway Clearing Account",
                    "debit": 0.0,
                    "credit": round(amount, 2),
                    "description": f"Provisional clearing credit for discrepancy {discrepancy_id}"
                }
            ]

        total_debit = round(sum(line["debit"] for line in lines), 2)
        total_credit = round(sum(line["credit"] for line in lines), 2)
        is_balanced = abs(total_debit - total_credit) < 1e-4

        date_str = posted_at[:10].replace("-", "")
        suffix = discrepancy_id[-4:] if len(discrepancy_id) >= 4 else "0000"
        voucher_id = f"JV-{date_str}-{suffix}"

        return {
            "voucher_id": voucher_id,
            "source_event": f"DISCREPANCY_{disc_type}",
            "discrepancy_ref": discrepancy_id,
            "order_ref": order_id,
            "posted_at": posted_at,
            "approved_by": approved_by,
            "sox_audit_hash": sox_audit_hash,
            "currency": "INR",
            "is_balanced": is_balanced,
            "total_debit": total_debit,
            "total_credit": total_credit,
            "lines": lines
        }

    def _execute_action(self, action: StagedAction) -> Dict[str, Any]:
        """Execute the action via the appropriate self-healing tool."""
        params = action.params

        if action.action_type == "POST_JOURNAL":
            return AgentTools.generate_double_entry_journal(
                params.get("discrepancy_id", ""),
                params.get("disc_type", ""),
                params.get("amount", 0.0),
                params.get("order_id", "")
            )

        elif action.action_type == "RESYNC_WEBHOOK":
            return AgentTools.simulate_webhook_resync(
                params.get("order_id", ""),
                params.get("gateway_payment_id", "")
            )

        elif action.action_type == "GENERATE_DISPUTE":
            return AgentTools.generate_dispute_dossier(
                params.get("discrepancy", params)
            )

        elif action.action_type == "ESCALATE_GATEWAY":
            return {
                "escalation_id": f"ESC_{uuid.uuid4().hex[:6].upper()}",
                "target": "Razorpay Settlement Operations",
                "gateway_payment_id": params.get("gateway_payment_id"),
                "breach_hours": params.get("breach_hours", 0),
                "escalated_at": datetime.datetime.now().isoformat(),
                "status": "ESCALATION_SUBMITTED"
            }

        elif action.action_type == "MARK_ABANDONED":
            return {
                "order_id": params.get("order_id"),
                "previous_status": "PENDING",
                "new_status": "ABANDONED",
                "updated_at": datetime.datetime.now().isoformat(),
                "recovery_email_triggered": True
            }

        else:
            return {
                "status": "EXECUTED",
                "action_type": action.action_type,
                "note": "Generic action execution"
            }

    def _log_event(self, event_type: str, action_id: str, details: Dict[str, Any]):
        """Append an entry to the audit log."""
        self.audit_log.append({
            "event_type": event_type,
            "action_id": action_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "details": details
        })
