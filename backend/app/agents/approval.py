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
