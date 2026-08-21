from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class PaymentMethod(str, Enum):
    UPI = "UPI"
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    NET_BANKING = "NET_BANKING"
    INTERNATIONAL_CARD = "INTERNATIONAL_CARD"

class OrderStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PENDING = "PENDING"
    FAILED = "FAILED"

class ReconciliationStatus(str, Enum):
    MATCHED = "MATCHED"
    DISCREPANCY = "DISCREPANCY"
    UNMATCHED = "UNMATCHED"

class DiscrepancyType(str, Enum):
    MDR_OVERCHARGE = "MDR_OVERCHARGE"
    DROPPED_WEBHOOK = "DROPPED_WEBHOOK"
    SETTLEMENT_DELAY = "SETTLEMENT_DELAY"
    AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
    MISSING_BANK_CREDIT = "MISSING_BANK_CREDIT"
    MISSING_GATEWAY_RECORD = "MISSING_GATEWAY_RECORD"

class MerchantOrder(BaseModel):
    order_id: str
    customer_id: str
    amount: float
    currency: str = "INR"
    status: OrderStatus
    payment_method: PaymentMethod
    card_network: Optional[str] = None
    created_at: str

class GatewayTransaction(BaseModel):
    gateway_payment_id: str
    order_id: str
    gross_amount: float
    fee: float
    tax: float
    net_amount: float
    status: str
    settlement_id: Optional[str] = None
    created_at: str
    settled_at: Optional[str] = None

class BankRecord(BaseModel):
    bank_ref_no: str  # UTR or reference number
    settlement_id: Optional[str] = None
    credit_amount: float
    transaction_date: str
    narration: str

class Discrepancy(BaseModel):
    id: str
    order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    settlement_id: Optional[str] = None
    bank_ref_no: Optional[str] = None
    type: DiscrepancyType
    severity: str  # HIGH, MEDIUM, LOW
    impact_amount: float
    description: str
    root_cause: str
    agent_confidence: float
    investigation_steps: List[str] = []
    proposed_action: str
    status: str = "OPEN"  # OPEN, RESOLVED, DISPUTED
    created_at: str

class ReconciliationMetrics(BaseModel):
    total_merchant_orders: int
    total_merchant_amount: float
    total_gateway_captured_amount: float
    total_bank_settled_amount: float
    reconciled_count: int
    reconciled_amount: float
    reconciliation_rate: float
    discrepancy_count: int
    total_leakage_amount: float
    pending_settlement_amount: float

class ReconciliationResult(BaseModel):
    metrics: ReconciliationMetrics
    discrepancies: List[Discrepancy]
    reconciled_orders: List[Dict[str, Any]]
