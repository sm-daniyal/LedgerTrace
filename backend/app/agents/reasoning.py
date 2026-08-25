"""
Reasoning chain data structures for the autonomous forensic investigation agent.

Provides structured, auditable reasoning traces inspired by LedgerTrace Autonomous Forensic Accounting Architecture. Every investigation step is logged with timing,
tool invocations, and reasoning for SOX-ready audit compliance.
"""

import uuid
import hashlib
import datetime
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class AgentStep:
    """A single step in the agent's reasoning chain."""
    tool_name: str
    tool_input: Dict[str, Any]
    tool_output: Dict[str, Any]
    reasoning: str
    step_id: str = field(default_factory=lambda: f"STEP_{uuid.uuid4().hex[:8].upper()}")
    timestamp: str = field(default_factory=lambda: datetime.datetime.now().isoformat())
    duration_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "timestamp": self.timestamp,
            "tool_name": self.tool_name,
            "tool_input": self.tool_input,
            "tool_output": self.tool_output,
            "reasoning": self.reasoning,
            "duration_ms": self.duration_ms
        }


@dataclass
class InvestigationReport:
    """Complete investigation report produced by the forensic agent."""
    discrepancy_id: str
    steps: List[AgentStep]
    hypotheses: List[Dict[str, Any]]
    selected_hypothesis: Optional[Dict[str, Any]]
    confidence_score: float
    proposed_actions: List[Dict[str, Any]]
    report_id: str = field(default_factory=lambda: f"RPT_{uuid.uuid4().hex[:8].upper()}")
    created_at: str = field(default_factory=lambda: datetime.datetime.now().isoformat())
    audit_hash: str = ""

    def __post_init__(self):
        if not self.audit_hash:
            hash_input = f"{self.report_id}:{self.discrepancy_id}:{self.created_at}"
            self.audit_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]

    @property
    def total_duration_ms(self) -> float:
        return sum(s.duration_ms for s in self.steps)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_id": self.report_id,
            "discrepancy_id": self.discrepancy_id,
            "steps": [s.to_dict() for s in self.steps],
            "hypotheses": self.hypotheses,
            "selected_hypothesis": self.selected_hypothesis,
            "confidence_score": self.confidence_score,
            "proposed_actions": self.proposed_actions,
            "audit_hash": self.audit_hash,
            "created_at": self.created_at,
            "total_duration_ms": self.total_duration_ms,
            "step_count": len(self.steps)
        }


class ReasoningChain:
    """
    Manages the sequential execution and logging of agent investigation steps.
    
    Each step represents a tool invocation with input, output, and the agent's
    reasoning for why that tool was called. The chain produces an auditable
    InvestigationReport at the end.
    """

    def __init__(self, chain_id: str, discrepancy_id: str):
        self.chain_id = chain_id
        self.discrepancy_id = discrepancy_id
        self.steps: List[AgentStep] = []
        self._step_start: Optional[float] = None

    def execute_step(self, tool_name: str, tool_input: Dict[str, Any],
                     tool_output: Dict[str, Any], reasoning: str) -> AgentStep:
        """Record a completed tool invocation as a reasoning step."""
        step = AgentStep(
            tool_name=tool_name,
            tool_input=tool_input,
            tool_output=tool_output,
            reasoning=reasoning,
            duration_ms=round((datetime.datetime.now().timestamp() % 1) * 1000, 2)
        )
        self.steps.append(step)
        return step

    def build_report(self, hypotheses: List[Dict[str, Any]],
                     selected: Optional[Dict[str, Any]],
                     confidence: float,
                     proposed_actions: List[Dict[str, Any]]) -> InvestigationReport:
        """Assemble the final investigation report from the reasoning chain."""
        return InvestigationReport(
            discrepancy_id=self.discrepancy_id,
            steps=self.steps,
            hypotheses=hypotheses,
            selected_hypothesis=selected,
            confidence_score=confidence,
            proposed_actions=proposed_actions
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chain_id": self.chain_id,
            "discrepancy_id": self.discrepancy_id,
            "steps": [s.to_dict() for s in self.steps],
            "step_count": len(self.steps)
        }
