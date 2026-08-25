"""
Continuous Reconciliation Engine  -  LedgerTrace Continuous Real-Time Settlement Architecture.

Maintains a live reconciliation state that updates incrementally as new
records arrive from any of the 3 sources (Merchant, Gateway, Bank).
Emits real-time events for each match, anomaly, or settlement confirmation.

This transforms LedgerTrace from "click to reconcile" into "always reconciled,
always current"  -  the core innovation of LedgerTrace continuous zero-day reconciliation architecture.
"""

import uuid
import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum

from .calculators import verify_mdr_invariants
from .anomaly_detector import AnomalyDetector


class EventType(str, Enum):
    RECORD_INGESTED = "RECORD_INGESTED"
    MATCH_FOUND = "MATCH_FOUND"
    ANOMALY_DETECTED = "ANOMALY_DETECTED"
    SETTLEMENT_CONFIRMED = "SETTLEMENT_CONFIRMED"
    DISCREPANCY_FLAGGED = "DISCREPANCY_FLAGGED"
    CLOSE_PROGRESS_UPDATED = "CLOSE_PROGRESS_UPDATED"


@dataclass
class ReconEvent:
    """A real-time event emitted by the continuous reconciliation engine."""
    event_type: EventType
    data: Dict[str, Any]
    event_id: str = field(default_factory=lambda: f"EVT_{uuid.uuid4().hex[:8].upper()}")
    timestamp: str = field(default_factory=lambda: datetime.datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type.value,
            "data": self.data,
            "timestamp": self.timestamp
        }

    def to_sse(self) -> str:
        """Format as Server-Sent Event string."""
        import json
        return f"data: {json.dumps(self.to_dict())}\n\n"


class ContinuousReconEngine:
    """
    Streaming incremental reconciliation engine with live state.
    
    Maintains in-memory state of all ingested records across the 3 sources
    and performs incremental matching as new records arrive. Emits real-time
    events that can be streamed to the frontend via SSE.
    """

    def __init__(self, contracts: Dict[str, Any]):
        self.contracts = contracts
        self.rates = contracts.get("rates", {})
        self.gst_rate = contracts.get("gst_rate", 0.18)
        self.anomaly_detector = AnomalyDetector(contracts)

        # Live state stores
        self.orders: Dict[str, Dict[str, Any]] = {}
        self.gateway_txns: Dict[str, Dict[str, Any]] = {}
        self.bank_records: Dict[str, Dict[str, Any]] = {}

        # Matching state
        self.matched: Dict[str, Dict[str, Any]] = {}       # order_id -> match result
        self.discrepancies: Dict[str, Dict[str, Any]] = {}  # disc_id -> discrepancy
        self.anomaly_alerts: List[Dict[str, Any]] = []

        # Event log
        self.events: List[ReconEvent] = []
        self._event_cursor = 0  # For SSE streaming

    def ingest_incremental(self, source: str, records: List[Dict[str, Any]]) -> List[ReconEvent]:
        """
        Ingest new records from a single source and run incremental matching.
        
        Args:
            source: One of 'merchant', 'gateway', 'bank'
            records: List of records from that source
            
        Returns:
            List of events generated during this ingestion
        """
        new_events = []

        if source == "merchant":
            for record in records:
                order_id = record.get("order_id")
                if order_id:
                    self.orders[order_id] = record
                    evt = ReconEvent(EventType.RECORD_INGESTED, {
                        "source": "merchant", "order_id": order_id,
                        "amount": record.get("amount", 0)
                    })
                    new_events.append(evt)

        elif source == "gateway":
            for record in records:
                order_id = record.get("order_id")
                if order_id:
                    self.gateway_txns[order_id] = record
                    evt = ReconEvent(EventType.RECORD_INGESTED, {
                        "source": "gateway", "order_id": order_id,
                        "gateway_payment_id": record.get("gateway_payment_id"),
                        "gross_amount": record.get("gross_amount", 0)
                    })
                    new_events.append(evt)

        elif source == "bank":
            for record in records:
                settl_id = record.get("settlement_id")
                if settl_id:
                    self.bank_records[settl_id] = record
                    evt = ReconEvent(EventType.RECORD_INGESTED, {
                        "source": "bank", "settlement_id": settl_id,
                        "credit_amount": record.get("credit_amount", 0),
                        "bank_ref_no": record.get("bank_ref_no")
                    })
                    new_events.append(evt)

        # Run incremental matching on affected records
        match_events = self._run_incremental_match(source, records)
        new_events.extend(match_events)

        # Update close progress
        progress_evt = self._emit_close_progress()
        new_events.append(progress_evt)

        # Store all events
        self.events.extend(new_events)
        return new_events

    def _run_incremental_match(self, source: str, records: List[Dict[str, Any]]) -> List[ReconEvent]:
        """Run matching only on records affected by the new ingestion."""
        events = []

        # Determine which order_ids need re-evaluation
        affected_order_ids = set()
        if source == "merchant":
            affected_order_ids = {r.get("order_id") for r in records if r.get("order_id")}
        elif source == "gateway":
            affected_order_ids = {r.get("order_id") for r in records if r.get("order_id")}
        elif source == "bank":
            # Bank records match via settlement_id, need to find affected orders
            new_settl_ids = {r.get("settlement_id") for r in records if r.get("settlement_id")}
            for oid, gw in self.gateway_txns.items():
                if gw.get("settlement_id") in new_settl_ids:
                    affected_order_ids.add(oid)

        for order_id in affected_order_ids:
            order = self.orders.get(order_id)
            gw_txn = self.gateway_txns.get(order_id)

            if not order:
                continue

            if not gw_txn:
                continue  # Can't match without gateway record

            # Check for dropped webhook
            if order.get("status") == "PENDING" and gw_txn.get("status") == "captured":
                disc_id = f"DISC_{uuid.uuid4().hex[:8].upper()}"
                disc = {
                    "id": disc_id, "order_id": order_id,
                    "type": "DROPPED_WEBHOOK", "severity": "HIGH",
                    "impact_amount": order.get("amount", 0),
                    "description": f"Webhook drop detected during incremental ingestion for {order_id}",
                    "status": "OPEN"
                }
                self.discrepancies[disc_id] = disc
                events.append(ReconEvent(EventType.DISCREPANCY_FLAGGED, disc))
                continue

            # Check MDR fee
            method = order.get("payment_method", "UPI")
            contract_rate = self.rates.get(method, 1.8)
            fee_check = verify_mdr_invariants(gw_txn["gross_amount"], gw_txn["fee"], gw_txn["tax"], contract_rate)

            if not fee_check["is_valid"]:
                leakage = round(abs(fee_check["fee_diff"]) + abs(fee_check["tax_diff"]), 2)
                disc_id = f"DISC_{uuid.uuid4().hex[:8].upper()}"
                disc = {
                    "id": disc_id, "order_id": order_id,
                    "type": "MDR_OVERCHARGE", "severity": "MEDIUM",
                    "impact_amount": leakage,
                    "description": f"Fee overcharge detected: INR {gw_txn['fee']} vs expected INR {fee_check['expected_fee']}",
                    "status": "OPEN"
                }
                self.discrepancies[disc_id] = disc
                events.append(ReconEvent(EventType.ANOMALY_DETECTED, disc))

            # Check settlement
            settl_id = gw_txn.get("settlement_id")
            if settl_id and settl_id in self.bank_records:
                bank_rec = self.bank_records[settl_id]
                match_result = {
                    "order_id": order_id,
                    "gateway_payment_id": gw_txn.get("gateway_payment_id"),
                    "settlement_id": settl_id,
                    "bank_ref_no": bank_rec.get("bank_ref_no"),
                    "amount": order.get("amount"),
                    "net_amount": gw_txn.get("net_amount"),
                    "status": "FULLY_RECONCILED"
                }
                self.matched[order_id] = match_result
                events.append(ReconEvent(EventType.MATCH_FOUND, {
                    "order_id": order_id, "status": "FULLY_RECONCILED",
                    "settlement_id": settl_id, "bank_ref_no": bank_rec.get("bank_ref_no")
                }))

                # Settlement confirmation event
                events.append(ReconEvent(EventType.SETTLEMENT_CONFIRMED, {
                    "order_id": order_id,
                    "settlement_id": settl_id,
                    "bank_ref_no": bank_rec.get("bank_ref_no"),
                    "credit_amount": bank_rec.get("credit_amount")
                }))
            elif settl_id:
                # Gateway settled but bank record not yet received
                self.matched[order_id] = {
                    "order_id": order_id,
                    "gateway_payment_id": gw_txn.get("gateway_payment_id"),
                    "settlement_id": settl_id,
                    "status": "PENDING_BANK_CONFIRMATION"
                }
                events.append(ReconEvent(EventType.MATCH_FOUND, {
                    "order_id": order_id, "status": "PENDING_BANK_CONFIRMATION",
                    "settlement_id": settl_id
                }))

        return events

    def _emit_close_progress(self) -> ReconEvent:
        """Calculate and emit the current close progress metrics."""
        total_orders = len(self.orders)
        fully_matched = sum(1 for m in self.matched.values() if m.get("status") == "FULLY_RECONCILED")
        partially_matched = sum(1 for m in self.matched.values() if m.get("status") == "PENDING_BANK_CONFIRMATION")
        open_discrepancies = sum(1 for d in self.discrepancies.values() if d.get("status") == "OPEN")

        close_pct = round((fully_matched / total_orders * 100) if total_orders > 0 else 0.0, 1)

        return ReconEvent(EventType.CLOSE_PROGRESS_UPDATED, {
            "total_orders": total_orders,
            "total_gateway_records": len(self.gateway_txns),
            "total_bank_records": len(self.bank_records),
            "fully_reconciled": fully_matched,
            "pending_bank": partially_matched,
            "open_discrepancies": open_discrepancies,
            "close_percentage": close_pct,
            "status": "CLOSED" if close_pct == 100.0 else "IN_PROGRESS" if close_pct > 0 else "NOT_STARTED"
        })

    def get_live_state(self) -> Dict[str, Any]:
        """Return the current reconciliation health snapshot."""
        total_orders = len(self.orders)
        fully_matched = sum(1 for m in self.matched.values() if m.get("status") == "FULLY_RECONCILED")
        partially_matched = sum(1 for m in self.matched.values() if m.get("status") == "PENDING_BANK_CONFIRMATION")
        open_discs = sum(1 for d in self.discrepancies.values() if d.get("status") == "OPEN")
        total_merchant_amount = sum(o.get("amount", 0) for o in self.orders.values())
        reconciled_amount = sum(
            self.orders[m["order_id"]].get("amount", 0)
            for m in self.matched.values()
            if m.get("status") == "FULLY_RECONCILED" and m["order_id"] in self.orders
        )
        close_pct = round((fully_matched / total_orders * 100) if total_orders > 0 else 0.0, 1)

        return {
            "close_progress": {
                "percentage": close_pct,
                "status": "CLOSED" if close_pct == 100.0 else "IN_PROGRESS" if close_pct > 0 else "NOT_STARTED",
                "total_orders": total_orders,
                "fully_reconciled": fully_matched,
                "pending_bank_confirmation": partially_matched,
                "open_discrepancies": open_discs
            },
            "financial_summary": {
                "total_merchant_volume": total_merchant_amount,
                "reconciled_volume": reconciled_amount,
                "unreconciled_volume": round(total_merchant_amount - reconciled_amount, 2)
            },
            "source_counts": {
                "merchant_orders": total_orders,
                "gateway_transactions": len(self.gateway_txns),
                "bank_records": len(self.bank_records)
            },
            "event_count": len(self.events),
            "last_updated": datetime.datetime.now().isoformat()
        }

    def get_events_since(self, cursor: int = 0) -> List[ReconEvent]:
        """Return events since a given cursor position for SSE streaming."""
        return self.events[cursor:]

    def reset(self):
        """Reset all state for a new reconciliation period."""
        self.orders.clear()
        self.gateway_txns.clear()
        self.bank_records.clear()
        self.matched.clear()
        self.discrepancies.clear()
        self.anomaly_alerts.clear()
        self.events.clear()
        self._event_cursor = 0
