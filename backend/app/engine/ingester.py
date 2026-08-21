import csv
import json
import io
from typing import List, Dict, Any

class DataIngester:
    # Parses and standardizes financial records from CSV streams or files.

    @staticmethod
    def load_contracts(filepath: str) -> Dict[str, Any]:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def _read_rows(file_or_content):
        if isinstance(file_or_content, str):
            if chr(10) in file_or_content:
                return list(csv.DictReader(io.StringIO(file_or_content)))
            with open(file_or_content, mode="r", encoding="utf-8") as f:
                return list(csv.DictReader(f))
        elif isinstance(file_or_content, bytes):
            return list(csv.DictReader(io.StringIO(file_or_content.decode("utf-8"))))
        else:
            return list(csv.DictReader(file_or_content))

    @staticmethod
    def ingest_merchant_orders(file_or_content) -> List[Dict[str, Any]]:
        raw_rows = DataIngester._read_rows(file_or_content)
        orders = []
        for raw_row in raw_rows:
            row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}
            orders.append({
                "order_id": row.get("order_id", ""),
                "customer_id": row.get("customer_id", "CUST_UNKNOWN"),
                "amount": float(row.get("amount", 0.0)),
                "currency": row.get("currency", "INR"),
                "status": row.get("status", "SUCCESS").upper(),
                "payment_method": row.get("payment_method", "UPI").upper(),
                "card_network": row.get("card_network", "").upper(),
                "created_at": row.get("created_at", "")
            })
        return orders

    @staticmethod
    def ingest_gateway_settlements(file_or_content) -> List[Dict[str, Any]]:
        raw_rows = DataIngester._read_rows(file_or_content)
        settlements = []
        for raw_row in raw_rows:
            row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}
            settlements.append({
                "gateway_payment_id": row.get("gateway_payment_id", row.get("payment_id", "")),
                "order_id": row.get("order_id", ""),
                "gross_amount": float(row.get("gross_amount", row.get("amount", 0.0))),
                "fee": float(row.get("fee", 0.0)),
                "tax": float(row.get("tax", 0.0)),
                "net_amount": float(row.get("net_amount", 0.0)),
                "status": row.get("status", "captured").lower(),
                "settlement_id": row.get("settlement_id", "") if row.get("settlement_id") else None,
                "created_at": row.get("created_at", ""),
                "settled_at": row.get("settled_at", "") if row.get("settled_at") else None
            })
        return settlements

    @staticmethod
    def ingest_bank_feed(file_or_content) -> List[Dict[str, Any]]:
        raw_rows = DataIngester._read_rows(file_or_content)
        records = []
        for raw_row in raw_rows:
            row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}
            records.append({
                "bank_ref_no": row.get("bank_ref_no", row.get("utr", "")),
                "settlement_id": row.get("settlement_id", "") if row.get("settlement_id") else None,
                "credit_amount": float(row.get("credit_amount", row.get("amount", 0.0))),
                "transaction_date": row.get("transaction_date", row.get("date", "")),
                "narration": row.get("narration", "")
            })
        return records
