import unittest
from app.engine.calculators import calculate_expected_fee, calculate_expected_gst, verify_mdr_invariants
from app.agents.controller import ReconController

class TestLedgerTraceEngine(unittest.TestCase):
    def test_fee_calculator(self):
        # Gross: 10,000 INR, Rate: 1.8% -> Fee: 180.0 INR, GST 18%: 32.40 INR
        fee = calculate_expected_fee(10000.0, 1.8)
        gst = calculate_expected_gst(fee, 0.18)
        self.assertEqual(fee, 180.0)
        self.assertEqual(gst, 32.40)

    def test_mdr_invariant_detector(self):
        # Test valid fee
        valid = verify_mdr_invariants(gross_amount=10000.0, charged_fee=180.0, charged_tax=32.40, contracted_rate=1.8)
        self.assertTrue(valid["is_valid"])

        # Test overcharge
        overcharge = verify_mdr_invariants(gross_amount=10000.0, charged_fee=250.0, charged_tax=45.0, contracted_rate=1.8)
        self.assertFalse(overcharge["is_valid"])
        self.assertEqual(overcharge["fee_diff"], 70.0)

    def test_full_reconciliation_pipeline(self):
        controller = ReconController()
        result = controller.run_default_reconciliation()
        
        recon = result["reconciliation"]
        metrics = recon["metrics"]
        discrepancies = recon["discrepancies"]
        
        self.assertGreater(metrics["total_merchant_orders"], 0)
        self.assertGreater(len(discrepancies), 0)
        
        # Verify specific discrepancy types are detected
        types = [d["type"] for d in discrepancies]
        self.assertIn("MDR_OVERCHARGE", types)
        self.assertIn("DROPPED_WEBHOOK", types)
        self.assertIn("SETTLEMENT_DELAY", types)

if __name__ == "__main__":
    unittest.main()
