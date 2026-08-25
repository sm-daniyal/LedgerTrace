import csv
import json
import io
from typing import List, Dict, Any

class DataIngester:
    """
    Parses and standardizes real-world multi-source financial records.
    Features robust column aliasing to seamlessly ingest CSVs from
    Razorpay MIS, Stripe, PayU, Cashfree, Pine Labs, HDFC, ICICI, SBI, and custom ERPs.
    """

    @staticmethod
    def load_contracts(filepath: str) -> Dict[str, Any]:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def _read_rows(file_or_content):
        if isinstance(file_or_content, str):
            if "\n" in file_or_content:
                return list(csv.DictReader(io.StringIO(file_or_content)))
            with open(file_or_content, mode="r", encoding="utf-8") as f:
                return list(csv.DictReader(f))
        elif isinstance(file_or_content, bytes):
            return list(csv.DictReader(io.StringIO(file_or_content.decode("utf-8"))))
        else:
            return list(csv.DictReader(file_or_content))

    @staticmethod
    def _get_field(row: Dict[str, Any], aliases: List[str], default: Any = "") -> Any:
        """Helper to match field across common industry column aliases."""
        for alias in aliases:
            if alias in row and row[alias] != "":
                return row[alias]
        return default

    @staticmethod
    def _parse_float(val: Any) -> float:
        """Safely parse currency/number strings with commas or symbols."""
        if isinstance(val, (int, float)):
            return float(val)
        if not val:
            return 0.0
        cleaned = str(val).replace(",", "").replace("INR", "").replace("₹", "").replace("$", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    @staticmethod
    def ingest_merchant_orders(file_or_content) -> List[Dict[str, Any]]:
        raw_rows = DataIngester._read_rows(file_or_content)
        orders = []
        for raw_row in raw_rows:
            row = {k.strip().lower().replace(" ", "_").replace("-", "_"): v.strip() for k, v in raw_row.items() if k}
            
            order_id = DataIngester._get_field(row, ["order_id", "order_number", "order_no", "orderid", "invoice_id", "invoice_no", "order_ref", "merchant_order_id"])
            customer_id = DataIngester._get_field(row, ["customer_id", "cust_id", "customer_email", "user_id", "buyer_id", "customer"], "CUST_UNKNOWN")
            amount = DataIngester._parse_float(DataIngester._get_field(row, ["amount", "gross_amount", "order_amount", "txn_amount", "total_amount", "gross"], 0.0))
            currency = DataIngester._get_field(row, ["currency", "curr"], "INR").upper()
            status = DataIngester._get_field(row, ["status", "order_status", "state"], "SUCCESS").upper()
            payment_method = DataIngester._get_field(row, ["payment_method", "method", "mode", "payment_mode", "pay_type"], "UPI").upper()
            card_network = DataIngester._get_field(row, ["card_network", "network", "card_brand", "card_type"], "").upper()
            created_at = DataIngester._get_field(row, ["created_at", "date", "order_date", "timestamp", "created_date"], "")

            orders.append({
                "order_id": order_id,
                "customer_id": customer_id,
                "amount": amount,
                "currency": currency,
                "status": status,
                "payment_method": payment_method,
                "card_network": card_network,
                "created_at": created_at
            })
        return orders

    @staticmethod
    def ingest_gateway_settlements(file_or_content) -> List[Dict[str, Any]]:
        raw_rows = DataIngester._read_rows(file_or_content)
        settlements = []
        for raw_row in raw_rows:
            row = {k.strip().lower().replace(" ", "_").replace("-", "_"): v.strip() for k, v in raw_row.items() if k}
            
            gateway_id = DataIngester._get_field(row, ["gateway_payment_id", "payment_id", "pay_id", "razorpay_payment_id", "transaction_id", "txn_id", "pg_txn_id"])
            order_id = DataIngester._get_field(row, ["order_id", "order_number", "order_no", "orderid", "merchant_order_id", "invoice_id"])
            gross = DataIngester._parse_float(DataIngester._get_field(row, ["gross_amount", "amount", "order_amount", "captured_amount", "txn_amount"], 0.0))
            fee = DataIngester._parse_float(DataIngester._get_field(row, ["fee", "fees", "mdr", "mdr_fee", "commission", "charge"], 0.0))
            tax = DataIngester._parse_float(DataIngester._get_field(row, ["tax", "gst", "tax_amount", "service_tax", "cgst_sgst"], 0.0))
            net = DataIngester._parse_float(DataIngester._get_field(row, ["net_amount", "net", "payout_amount", "settled_amount", "net_credit"], 0.0))
            status = DataIngester._get_field(row, ["status", "payment_status", "state"], "captured").lower()
            settlement_id = DataIngester._get_field(row, ["settlement_id", "settl_id", "batch_id", "payout_id", "settlement_batch_id"])
            created_at = DataIngester._get_field(row, ["created_at", "date", "payment_date", "captured_at", "timestamp"], "")
            settled_at = DataIngester._get_field(row, ["settled_at", "settlement_date", "payout_date"], "")

            settlements.append({
                "gateway_payment_id": gateway_id,
                "order_id": order_id,
                "gross_amount": gross,
                "fee": fee,
                "tax": tax,
                "net_amount": net if net > 0 else round(gross - (fee + tax), 2),
                "status": status,
                "settlement_id": settlement_id if settlement_id else None,
                "created_at": created_at,
                "settled_at": settled_at if settled_at else None
            })
        return settlements

    @staticmethod
    def ingest_bank_feed(file_or_content) -> List[Dict[str, Any]]:
        raw_rows = DataIngester._read_rows(file_or_content)
        records = []
        for raw_row in raw_rows:
            row = {k.strip().lower().replace(" ", "_").replace("-", "_"): v.strip() for k, v in raw_row.items() if k}
            
            bank_ref_no = DataIngester._get_field(row, ["bank_ref_no", "utr", "utr_no", "reference_no", "rrn", "bank_reference", "ref_no", "txn_ref", "cheque_no"])
            settlement_id = DataIngester._get_field(row, ["settlement_id", "settl_id", "batch_id", "payout_id", "settlement_batch_id"])
            credit = DataIngester._parse_float(DataIngester._get_field(row, ["credit_amount", "credit", "amount", "deposit", "amount_credited", "net_credit"], 0.0))
            tx_date = DataIngester._get_field(row, ["transaction_date", "date", "value_date", "posting_date", "txn_date"], "")
            narration = DataIngester._get_field(row, ["narration", "description", "remarks", "particulars", "details"], "")

            records.append({
                "bank_ref_no": bank_ref_no,
                "settlement_id": settlement_id if settlement_id else None,
                "credit_amount": credit,
                "transaction_date": tx_date,
                "narration": narration
            })
        return records
