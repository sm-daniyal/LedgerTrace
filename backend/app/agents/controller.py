import os
import random
import datetime
from typing import Dict, Any, List
from ..engine.ingester import DataIngester
from ..engine.matcher import ReconciliationMatcher
from ..engine.lineage_builder import LineageBuilder
from .investigator import ForensicInvestigator
from ..config import config

class ReconController:
    def __init__(self):
        self.contracts = DataIngester.load_contracts(config.CONTRACTS_FILE)
        self.matcher = ReconciliationMatcher(self.contracts)
        self.investigator = ForensicInvestigator(self.contracts)
        self.last_results = None
        self.last_lineage = None

    def generate_preset_data(self, preset: str = "default") -> Dict[str, Any]:
        if preset == "clean":
            # 100% matched, 0 discrepancies
            orders = [
                {"order_id": f"ORD_200{i}", "customer_id": f"CUST_{100+i}", "amount": float(3000 * i), "currency": "INR", "status": "SUCCESS", "payment_method": "UPI" if i % 2 == 0 else "CREDIT_CARD", "card_network": "VISA", "created_at": f"2026-08-21 10:{10*i}:00"}
                for i in range(1, 6)
            ]
            gateway_txns = []
            for o in orders:
                method = o["payment_method"]
                rate = 0.0 if method == "UPI" else 1.8
                fee = round((o["amount"] * rate) / 100.0, 2)
                tax = round(fee * 0.18, 2)
                net = round(o["amount"] - (fee + tax), 2)
                gateway_txns.append({
                    "gateway_payment_id": f"pay_clean_{o['order_id'][-3:]}",
                    "order_id": o["order_id"],
                    "gross_amount": o["amount"],
                    "fee": fee,
                    "tax": tax,
                    "net_amount": net,
                    "status": "captured",
                    "settlement_id": "SETTL_CLEAN_01",
                    "created_at": o["created_at"],
                    "settled_at": "2026-08-21 18:00:00"
                })
            total_net = sum(g["net_amount"] for g in gateway_txns)
            bank_records = [
                {"bank_ref_no": "UTR_HDFC_CLEAN_881", "settlement_id": "SETTL_CLEAN_01", "credit_amount": total_net, "transaction_date": "2026-08-21", "narration": "NEFT-RAZORPAY-SETTL_CLEAN_01-TECHSTORE"}
            ]
            return self.process_feeds(orders, gateway_txns, bank_records)

        elif preset == "flash_sale":
            # High volume with multiple overcharges and dropped webhooks
            orders = [
                {"order_id": "ORD_FS_101", "customer_id": "CUST_FS1", "amount": 85000.0, "currency": "INR", "status": "SUCCESS", "payment_method": "CREDIT_CARD", "card_network": "AMEX", "created_at": "2026-08-21 11:00:00"},
                {"order_id": "ORD_FS_102", "customer_id": "CUST_FS2", "amount": 120000.0, "currency": "INR", "status": "SUCCESS", "payment_method": "CREDIT_CARD", "card_network": "VISA", "created_at": "2026-08-21 11:15:00"},
                {"order_id": "ORD_FS_103", "customer_id": "CUST_FS3", "amount": 42000.0, "currency": "INR", "status": "PENDING", "payment_method": "UPI", "card_network": "", "created_at": "2026-08-21 11:30:00"},
                {"order_id": "ORD_FS_104", "customer_id": "CUST_FS4", "amount": 19500.0, "currency": "INR", "status": "SUCCESS", "payment_method": "NET_BANKING", "card_network": "", "created_at": "2026-08-21 11:45:00"},
                {"order_id": "ORD_FS_105", "customer_id": "CUST_FS5", "amount": 95000.0, "currency": "INR", "status": "SUCCESS", "payment_method": "CREDIT_CARD", "card_network": "MASTERCARD", "created_at": "2026-08-18 09:00:00"},
                {"order_id": "ORD_FS_106", "customer_id": "CUST_FS6", "amount": 15000.0, "currency": "INR", "status": "SUCCESS", "payment_method": "UPI", "card_network": "", "created_at": "2026-08-21 12:00:00"}
            ]
            gateway_txns = [
                # ORD_FS_101: Overcharged at 3.2% vs 1.8%
                {"gateway_payment_id": "pay_fs_01", "order_id": "ORD_FS_101", "gross_amount": 85000.0, "fee": 2720.0, "tax": 489.6, "net_amount": 81790.4, "status": "captured", "settlement_id": "SETTL_FS_01", "created_at": "2026-08-21 11:00:10", "settled_at": "2026-08-21 18:00:00"},
                # ORD_FS_102: Overcharged at 2.8% vs 1.8%
                {"gateway_payment_id": "pay_fs_02", "order_id": "ORD_FS_102", "gross_amount": 120000.0, "fee": 3360.0, "tax": 604.8, "net_amount": 116035.2, "status": "captured", "settlement_id": "SETTL_FS_01", "created_at": "2026-08-21 11:15:10", "settled_at": "2026-08-21 18:00:00"},
                # ORD_FS_103: Dropped webhook
                {"gateway_payment_id": "pay_fs_03", "order_id": "ORD_FS_103", "gross_amount": 42000.0, "fee": 0.0, "tax": 0.0, "net_amount": 42000.0, "status": "captured", "settlement_id": "SETTL_FS_02", "created_at": "2026-08-21 11:30:10", "settled_at": "2026-08-21 18:00:00"},
                # ORD_FS_104: Clean net banking
                {"gateway_payment_id": "pay_fs_04", "order_id": "ORD_FS_104", "gross_amount": 19500.0, "fee": 292.5, "tax": 52.65, "net_amount": 19154.85, "status": "captured", "settlement_id": "SETTL_FS_02", "created_at": "2026-08-21 11:45:10", "settled_at": "2026-08-21 18:00:00"},
                # ORD_FS_105: Settlement SLA breached (>48h)
                {"gateway_payment_id": "pay_fs_05", "order_id": "ORD_FS_105", "gross_amount": 95000.0, "fee": 1710.0, "tax": 307.8, "net_amount": 92982.2, "status": "captured", "settlement_id": "", "created_at": "2026-08-18 09:00:00", "settled_at": ""},
                # ORD_FS_106: Clean UPI
                {"gateway_payment_id": "pay_fs_06", "order_id": "ORD_FS_106", "gross_amount": 15000.0, "fee": 0.0, "tax": 0.0, "net_amount": 15000.0, "status": "captured", "settlement_id": "SETTL_FS_02", "created_at": "2026-08-21 12:00:10", "settled_at": "2026-08-21 18:00:00"}
            ]
            bank_records = [
                {"bank_ref_no": "UTR_HDFC_FS_9901", "settlement_id": "SETTL_FS_01", "credit_amount": 197825.6, "transaction_date": "2026-08-21", "narration": "NEFT-RAZORPAY-SETTL_FS_01-TECHSTORE"},
                {"bank_ref_no": "UTR_HDFC_FS_9902", "settlement_id": "SETTL_FS_02", "credit_amount": 76154.85, "transaction_date": "2026-08-21", "narration": "NEFT-RAZORPAY-SETTL_FS_02-TECHSTORE"}
            ]
            return self.process_feeds(orders, gateway_txns, bank_records)

        else:
            return self.run_default_reconciliation()

    def run_default_reconciliation(self) -> Dict[str, Any]:
        orders_file = os.path.join(config.DATA_DIR, "sample_merchant_orders.csv")
        gateway_file = os.path.join(config.DATA_DIR, "sample_gateway_settlement.csv")
        bank_file = os.path.join(config.DATA_DIR, "sample_bank_feed.csv")

        orders = DataIngester.ingest_merchant_orders(orders_file)
        gateway_txns = DataIngester.ingest_gateway_settlements(gateway_file)
        bank_records = DataIngester.ingest_bank_feed(bank_file)

        return self.process_feeds(orders, gateway_txns, bank_records)

    def process_feeds(self, orders: List[Dict[str, Any]], gateway_txns: List[Dict[str, Any]], bank_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        raw_result = self.matcher.reconcile(orders, gateway_txns, bank_records)
        
        enriched_discrepancies = [
            self.investigator.enrich_discrepancy(d) for d in raw_result["discrepancies"]
        ]
        raw_result["discrepancies"] = enriched_discrepancies
        lineage_graph = LineageBuilder.build_graph(orders, gateway_txns, bank_records, enriched_discrepancies)

        self.last_results = raw_result
        self.last_lineage = lineage_graph

        return {
            "reconciliation": raw_result,
            "lineage": lineage_graph,
            "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
        }
