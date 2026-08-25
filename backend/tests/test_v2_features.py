"""
Comprehensive test suite for LedgerTrace v2 AI features.

Tests all 5 enterprise-grade features:
1. Continuous Reconciliation Engine
2. Autonomous Forensic Agent with Reasoning Chain
3. Human-in-the-Loop Approval Workflow
4. Statistical Anomaly Detection
5. Natural Language Query Engine
"""

import unittest
import json
from app.agents.reasoning import ReasoningChain, AgentStep, InvestigationReport
from app.agents.investigator import ForensicInvestigator
from app.agents.tools import AgentTools
from app.agents.approval import ApprovalQueue
from app.agents.query_engine import QueryEngine
from app.engine.anomaly_detector import AnomalyDetector, AnomalyAlert
from app.engine.continuous_engine import ContinuousReconEngine, EventType


SAMPLE_CONTRACTS = {
    "merchant_name": "TechStore",
    "rates": {"UPI": 0.0, "NET_BANKING": 1.5, "CREDIT_CARD": 1.8, "DEBIT_CARD": 0.9},
    "gst_rate": 0.18
}


class TestReasoningChain(unittest.TestCase):
    """Tests for Feature 2: Agent Reasoning Chain data structures."""

    def test_agent_step_creation(self):
        step = AgentStep(
            tool_name="lookup_rate_card",
            tool_input={"payment_method": "CREDIT_CARD"},
            tool_output={"contracted_rate": 1.8},
            reasoning="Looking up contracted rate"
        )
        self.assertEqual(step.tool_name, "lookup_rate_card")
        self.assertTrue(step.step_id.startswith("STEP_"))
        d = step.to_dict()
        self.assertIn("step_id", d)
        self.assertIn("timestamp", d)

    def test_reasoning_chain_build_report(self):
        chain = ReasoningChain("CHAIN_001", "DISC_001")
        chain.execute_step("tool1", {"a": 1}, {"b": 2}, "reason1")
        chain.execute_step("tool2", {"c": 3}, {"d": 4}, "reason2")

        report = chain.build_report(
            hypotheses=[{"hypothesis": "test", "probability": 0.9}],
            selected={"hypothesis": "test", "probability": 0.9},
            confidence=0.95,
            proposed_actions=[{"action_type": "POST_JOURNAL"}]
        )

        self.assertEqual(len(report.steps), 2)
        self.assertEqual(report.confidence_score, 0.95)
        self.assertTrue(report.report_id.startswith("RPT_"))
        self.assertTrue(len(report.audit_hash) > 0)

        d = report.to_dict()
        self.assertEqual(d["step_count"], 2)
        self.assertIn("audit_hash", d)

    def test_investigation_report_serialization(self):
        report = InvestigationReport(
            discrepancy_id="DISC_TEST",
            steps=[],
            hypotheses=[],
            selected_hypothesis=None,
            confidence_score=0.5,
            proposed_actions=[]
        )
        d = report.to_dict()
        self.assertEqual(d["discrepancy_id"], "DISC_TEST")
        self.assertEqual(d["total_duration_ms"], 0.0)


class TestForensicInvestigator(unittest.TestCase):
    """Tests for Feature 2: Multi-step Forensic Investigation."""

    def setUp(self):
        self.investigator = ForensicInvestigator(SAMPLE_CONTRACTS)

    def test_mdr_overcharge_investigation(self):
        disc = {
            "id": "DISC_MDR_001", "order_id": "ORD_001",
            "type": "MDR_OVERCHARGE", "impact_amount": 595.0,
            "gateway_payment_id": "pay_001", "payment_method": "CREDIT_CARD",
            "card_network": "VISA", "gross_amount": 85000.0, "actual_fee": 2125.0,
            "created_at": "2026-08-21 11:00:00"
        }
        result = self.investigator.enrich_discrepancy(disc)

        self.assertIn("investigation_report", result)
        report = result["investigation_report"]
        self.assertGreater(len(report["steps"]), 0)
        self.assertEqual(len(report["hypotheses"]), 2)
        self.assertGreater(report["confidence_score"], 0.9)
        self.assertIn("downstream_risk", result)

    def test_dropped_webhook_investigation(self):
        disc = {
            "id": "DISC_WH_001", "order_id": "ORD_002",
            "type": "DROPPED_WEBHOOK", "impact_amount": 42000.0,
            "gateway_payment_id": "pay_002", "settlement_id": "SETTL_01",
            "created_at": "2026-08-21 11:30:00"
        }
        result = self.investigator.enrich_discrepancy(disc)

        report = result["investigation_report"]
        self.assertEqual(report["confidence_score"], 0.99)
        self.assertEqual(len(report["proposed_actions"]), 1)
        self.assertEqual(report["proposed_actions"][0]["action_type"], "RESYNC_WEBHOOK")

    def test_settlement_delay_investigation(self):
        disc = {
            "id": "DISC_SD_001", "order_id": "ORD_003",
            "type": "SETTLEMENT_DELAY", "impact_amount": 92000.0,
            "gateway_payment_id": "pay_003",
            "created_at": "2026-08-18 09:00:00"
        }
        result = self.investigator.enrich_discrepancy(disc)

        report = result["investigation_report"]
        self.assertEqual(len(report["proposed_actions"]), 2)
        action_types = [a["action_type"] for a in report["proposed_actions"]]
        self.assertIn("ESCALATE_GATEWAY", action_types)
        self.assertIn("POST_JOURNAL", action_types)

    def test_missing_gateway_investigation(self):
        disc = {
            "id": "DISC_MG_001", "order_id": "ORD_004",
            "type": "MISSING_GATEWAY_RECORD", "impact_amount": 5000.0,
            "created_at": "2026-08-21 10:00:00"
        }
        result = self.investigator.enrich_discrepancy(disc)

        report = result["investigation_report"]
        self.assertEqual(report["proposed_actions"][0]["action_type"], "MARK_ABANDONED")


class TestAgentTools(unittest.TestCase):
    """Tests for Feature 2: New deterministic agent tools."""

    def test_lookup_rate_card(self):
        result = AgentTools.lookup_rate_card(SAMPLE_CONTRACTS, "CREDIT_CARD", "VISA")
        self.assertEqual(result["contracted_rate"], 1.8)
        self.assertEqual(result["source"], "merchant_contract_v1")

    def test_lookup_rate_card_amex(self):
        result = AgentTools.lookup_rate_card(SAMPLE_CONTRACTS, "CREDIT_CARD", "AMEX")
        self.assertEqual(result["contracted_rate"], 2.0)

    def test_calculate_expected_settlement(self):
        result = AgentTools.calculate_expected_settlement(85000.0, 1.8)
        self.assertEqual(result["expected_fee"], 1530.0)
        self.assertEqual(result["expected_gst"], 275.4)
        self.assertEqual(result["expected_net"], 83194.6)

    def test_check_settlement_sla_within(self):
        result = AgentTools.check_settlement_sla("2026-08-21 10:00:00", "2026-08-21 18:00:00")
        self.assertEqual(result["sla_status"], "WITHIN_SLA")

    def test_assess_downstream_impact_high(self):
        result = AgentTools.assess_downstream_impact(50000.0, "SETTLEMENT_DELAY")
        self.assertEqual(result["risk_level"], "HIGH")
        self.assertEqual(result["recommended_urgency"], "PRIORITY")

    def test_assess_downstream_impact_critical(self):
        result = AgentTools.assess_downstream_impact(150000.0, "MDR_OVERCHARGE")
        self.assertEqual(result["risk_level"], "CRITICAL")


class TestAnomalyDetector(unittest.TestCase):
    """Tests for Feature 4: Statistical Anomaly Detection."""

    def setUp(self):
        self.detector = AnomalyDetector(SAMPLE_CONTRACTS)

    def test_fee_rate_drift_detection(self):
        txns = [
            {"order_id": "O1", "gross_amount": 10000, "fee": 180, "tax": 32.4, "status": "captured"},
            {"order_id": "O2", "gross_amount": 10000, "fee": 180, "tax": 32.4, "status": "captured"},
            {"order_id": "O3", "gross_amount": 10000, "fee": 320, "tax": 57.6, "status": "captured"},  # Overcharged
        ]
        alerts = self.detector.detect_fee_rate_drift(txns)
        self.assertGreater(len(alerts), 0)
        self.assertEqual(alerts[0].alert_type, "FEE_RATE_DRIFT")

    def test_amount_outlier_detection(self):
        orders = [
            {"order_id": f"O{i}", "amount": 5000.0 + i * 50, "created_at": "2026-08-21 10:00:00"} for i in range(10)
        ]
        orders.append({"order_id": "O_BIG", "amount": 500000.0, "created_at": "2026-08-21 10:00:00"})
        alerts = self.detector.detect_amount_outliers(orders)
        self.assertGreater(len(alerts), 0)
        self.assertEqual(alerts[0].alert_type, "AMOUNT_OUTLIER")

    def test_duplicate_transaction_detection(self):
        orders = [
            {"order_id": "O1", "customer_id": "C1", "amount": 5000.0, "created_at": "2026-08-21 10:00:00"},
            {"order_id": "O2", "customer_id": "C1", "amount": 5000.0, "created_at": "2026-08-21 10:02:00"},
        ]
        alerts = self.detector.detect_duplicate_transactions(orders)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].alert_type, "POTENTIAL_DUPLICATE")

    def test_no_false_positives_on_clean_data(self):
        orders = [
            {"order_id": f"O{i}", "amount": 5000.0 + i * 100, "customer_id": f"C{i}", "created_at": f"2026-08-21 1{i}:00:00"}
            for i in range(5)
        ]
        txns = [
            {"order_id": f"O{i}", "gross_amount": 5000.0 + i * 100, "fee": round((5000 + i * 100) * 0.018, 2), "tax": round(round((5000 + i * 100) * 0.018, 2) * 0.18, 2), "status": "captured", "created_at": f"2026-08-21 1{i}:00:00", "settled_at": f"2026-08-21 18:00:00"}
            for i in range(5)
        ]
        alerts = self.detector.detect_all(orders, txns, [])
        # Should have minimal or zero alerts on clean data
        duplicate_alerts = [a for a in alerts if a.alert_type == "POTENTIAL_DUPLICATE"]
        self.assertEqual(len(duplicate_alerts), 0)

    def test_anomaly_alert_serialization(self):
        alert = AnomalyAlert(
            alert_type="FEE_RATE_DRIFT", severity="HIGH",
            metric_observed=3.2, metric_expected=1.8,
            deviation_score=2.5, affected_transactions=["O1"],
            description="Test alert"
        )
        d = alert.to_dict()
        self.assertEqual(d["alert_type"], "FEE_RATE_DRIFT")
        self.assertIn("alert_id", d)


class TestApprovalQueue(unittest.TestCase):
    """Tests for Feature 3: Human-in-the-Loop Approval Workflow."""

    def setUp(self):
        self.queue = ApprovalQueue()

    def test_propose_action(self):
        action = self.queue.propose_action(
            action_type="POST_JOURNAL", params={"amount": 595.0, "order_id": "ORD_001"},
            investigation_summary="RPT_001", confidence_score=0.96,
            discrepancy_id="DISC_001", order_id="ORD_001"
        )
        self.assertEqual(action.status.value, "PENDING_APPROVAL")
        self.assertTrue(action.action_id.startswith("ACT_"))

    def test_approve_action(self):
        action = self.queue.propose_action(
            "POST_JOURNAL", {"discrepancy_id": "D1", "disc_type": "MDR_OVERCHARGE", "amount": 100, "order_id": "O1"},
            "RPT_1", 0.96, "D1", "O1"
        )
        result = self.queue.approve(action.action_id)
        self.assertEqual(result["status"], "APPROVED_AND_EXECUTED")
        self.assertIn("execution_result", result)
        self.assertIn("voucher_no", result["execution_result"])

    def test_reject_action(self):
        action = self.queue.propose_action(
            "POST_JOURNAL", {}, "RPT_1", 0.5, "D1", "O1"
        )
        result = self.queue.reject(action.action_id, "Confidence too low")
        self.assertEqual(result["status"], "REJECTED")
        self.assertEqual(result["reason"], "Confidence too low")

    def test_cannot_approve_twice(self):
        action = self.queue.propose_action(
            "POST_JOURNAL", {"discrepancy_id": "D1", "disc_type": "MDR_OVERCHARGE", "amount": 100, "order_id": "O1"},
            "RPT_1", 0.96, "D1", "O1"
        )
        self.queue.approve(action.action_id)
        result = self.queue.approve(action.action_id)
        self.assertIn("error", result)

    def test_queue_stats(self):
        self.queue.propose_action("POST_JOURNAL", {}, "R1", 0.9, "D1", "O1")
        self.queue.propose_action("RESYNC_WEBHOOK", {}, "R2", 0.99, "D2", "O2")
        stats = self.queue.get_stats()
        self.assertEqual(stats["total_proposed"], 2)
        self.assertEqual(stats["pending_approval"], 2)

    def test_audit_log(self):
        action = self.queue.propose_action("POST_JOURNAL", {}, "R1", 0.9, "D1", "O1")
        self.queue.approve(action.action_id)
        log = self.queue.get_audit_log()
        self.assertEqual(len(log), 2)  # PROPOSED + APPROVED
        self.assertEqual(log[0]["event_type"], "ACTION_PROPOSED")
        self.assertEqual(log[1]["event_type"], "ACTION_APPROVED_AND_EXECUTED")


class TestQueryEngine(unittest.TestCase):
    """Tests for Feature 5: Natural Language Query Engine."""

    def setUp(self):
        self.engine = QueryEngine()
        self.sample_data = {
            "reconciliation": {
                "metrics": {
                    "total_merchant_orders": 6,
                    "total_merchant_amount": 376500.0,
                    "total_gateway_captured_amount": 376500.0,
                    "total_bank_settled_amount": 350000.0,
                    "reconciled_count": 3,
                    "reconciled_amount": 100000.0,
                    "reconciliation_rate": 50.0,
                    "discrepancy_count": 3,
                    "total_leakage_amount": 1200.0,
                    "pending_settlement_amount": 92000.0,
                    "anomaly_count": 1
                },
                "discrepancies": [
                    {"id": "D1", "order_id": "ORD_FS_101", "type": "MDR_OVERCHARGE", "impact_amount": 700, "gateway_payment_id": "pay_fs_01"},
                    {"id": "D2", "order_id": "ORD_FS_102", "type": "MDR_OVERCHARGE", "impact_amount": 500, "gateway_payment_id": "pay_fs_02"},
                    {"id": "D3", "order_id": "ORD_FS_103", "type": "DROPPED_WEBHOOK", "impact_amount": 42000, "gateway_payment_id": "pay_fs_03"},
                ],
                "reconciled_orders": [
                    {"order_id": "ORD_FS_104", "amount": 19500, "gateway_payment_id": "pay_fs_04", "settlement_id": "SETTL_01", "bank_ref_no": "UTR_HDFC_001"},
                ],
                "anomaly_alerts": []
            }
        }

    def test_search_by_order_id(self):
        result = self.engine.query("Find order ORD_FS_101", self.sample_data)
        items = result["results"].get("items", [])
        found = any(item.get("order_id") == "ORD_FS_101" for item in items)
        self.assertTrue(found)

    def test_aggregate_leakage(self):
        result = self.engine.query("Total fee leakage", self.sample_data)
        self.assertEqual(result["interpreted_as"]["intent"], "aggregate")
        self.assertIn("aggregate", result["results"])

    def test_filter_overcharges_above_threshold(self):
        result = self.engine.query("Show all overcharges above 600", self.sample_data)
        items = result["results"]["items"]
        for item in items:
            self.assertGreater(item.get("impact_amount", 0), 600)

    def test_summarize_query(self):
        result = self.engine.query("Give me a summary report", self.sample_data)
        self.assertIn("summary_metrics", result["results"])

    def test_compare_query(self):
        result = self.engine.query("Compare gateway fees vs contracted rates", self.sample_data)
        self.assertIn("comparison", result["results"])

    def test_search_by_utr(self):
        result = self.engine.query("Find UTR_HDFC_001", self.sample_data)
        self.assertGreater(result["result_count"], 0)


class TestContinuousEngine(unittest.TestCase):
    """Tests for Feature 1: Continuous Reconciliation Engine."""

    def setUp(self):
        self.engine = ContinuousReconEngine(SAMPLE_CONTRACTS)

    def test_ingest_merchant_orders(self):
        orders = [{"order_id": "ORD_001", "amount": 10000, "status": "SUCCESS", "payment_method": "UPI", "created_at": "2026-08-21 10:00:00"}]
        events = self.engine.ingest_incremental("merchant", orders)
        self.assertGreater(len(events), 0)
        self.assertEqual(events[0].event_type, EventType.RECORD_INGESTED)

    def test_incremental_match(self):
        # Ingest merchant order
        self.engine.ingest_incremental("merchant", [
            {"order_id": "ORD_001", "amount": 10000, "status": "SUCCESS", "payment_method": "UPI", "created_at": "2026-08-21 10:00:00"}
        ])
        # Ingest gateway record
        self.engine.ingest_incremental("gateway", [
            {"order_id": "ORD_001", "gateway_payment_id": "pay_001", "gross_amount": 10000, "fee": 0, "tax": 0, "net_amount": 10000, "status": "captured", "settlement_id": "SETTL_01", "created_at": "2026-08-21 10:00:10", "settled_at": "2026-08-21 18:00:00"}
        ])
        # Ingest bank record
        events = self.engine.ingest_incremental("bank", [
            {"settlement_id": "SETTL_01", "bank_ref_no": "UTR_001", "credit_amount": 10000, "transaction_date": "2026-08-21"}
        ])

        # Should have match events
        match_events = [e for e in events if e.event_type == EventType.MATCH_FOUND]
        self.assertGreater(len(match_events), 0)

    def test_live_state(self):
        self.engine.ingest_incremental("merchant", [
            {"order_id": "ORD_001", "amount": 5000, "status": "SUCCESS", "payment_method": "UPI", "created_at": "2026-08-21 10:00:00"}
        ])
        state = self.engine.get_live_state()
        self.assertEqual(state["source_counts"]["merchant_orders"], 1)
        self.assertIn("close_progress", state)

    def test_close_progress_calculation(self):
        # Ingest and fully match one order
        self.engine.ingest_incremental("merchant", [
            {"order_id": "O1", "amount": 5000, "status": "SUCCESS", "payment_method": "UPI", "created_at": "2026-08-21 10:00:00"}
        ])
        self.engine.ingest_incremental("gateway", [
            {"order_id": "O1", "gateway_payment_id": "p1", "gross_amount": 5000, "fee": 0, "tax": 0, "net_amount": 5000, "status": "captured", "settlement_id": "S1", "created_at": "2026-08-21 10:00:00", "settled_at": "2026-08-21 18:00:00"}
        ])
        self.engine.ingest_incremental("bank", [
            {"settlement_id": "S1", "bank_ref_no": "U1", "credit_amount": 5000, "transaction_date": "2026-08-21"}
        ])

        state = self.engine.get_live_state()
        self.assertEqual(state["close_progress"]["percentage"], 100.0)
        self.assertEqual(state["close_progress"]["status"], "CLOSED")

    def test_dropped_webhook_detection(self):
        self.engine.ingest_incremental("merchant", [
            {"order_id": "O1", "amount": 5000, "status": "PENDING", "payment_method": "UPI", "created_at": "2026-08-21 10:00:00"}
        ])
        events = self.engine.ingest_incremental("gateway", [
            {"order_id": "O1", "gateway_payment_id": "p1", "gross_amount": 5000, "fee": 0, "tax": 0, "net_amount": 5000, "status": "captured", "settlement_id": "S1", "created_at": "2026-08-21 10:00:00", "settled_at": "2026-08-21 18:00:00"}
        ])
        disc_events = [e for e in events if e.event_type == EventType.DISCREPANCY_FLAGGED]
        self.assertEqual(len(disc_events), 1)

    def test_reset(self):
        self.engine.ingest_incremental("merchant", [
            {"order_id": "O1", "amount": 5000, "status": "SUCCESS", "payment_method": "UPI", "created_at": "2026-08-21 10:00:00"}
        ])
        self.engine.reset()
        state = self.engine.get_live_state()
        self.assertEqual(state["source_counts"]["merchant_orders"], 0)


if __name__ == "__main__":
    unittest.main()
