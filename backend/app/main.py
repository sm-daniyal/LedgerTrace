from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from .agents.controller import ReconController
from .agents.healing import SelfHealingEngine
from .engine.ingester import DataIngester

app = FastAPI(
    title="LedgerTrace API",
    description="Autonomous 3-Way Financial Reconciliation and Lineage Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

controller = ReconController()

class WebhookResyncRequest(BaseModel):
    order_id: str
    gateway_payment_id: str

class PostJournalRequest(BaseModel):
    discrepancy_id: str
    disc_type: str
    amount: float
    order_id: str

class DisputeRequest(BaseModel):
    discrepancy: Dict[str, Any]

@app.get("/")
def read_root():
    return {"status": "online", "service": "LedgerTrace Core Engine"}

@app.post("/api/reconcile")
def run_reconciliation(preset: str = Query("default")):
    result = controller.generate_preset_data(preset)
    return result

@app.get("/api/lineage")
def get_lineage():
    if not controller.last_lineage:
        controller.run_default_reconciliation()
    return controller.last_lineage

@app.post("/api/action/resolve-webhook")
def resolve_webhook(req: WebhookResyncRequest):
    res = SelfHealingEngine.resync_webhook(req.order_id, req.gateway_payment_id)
    return res

@app.post("/api/action/post-journal")
def post_journal(req: PostJournalRequest):
    res = SelfHealingEngine.post_journal(req.discrepancy_id, req.disc_type, req.amount, req.order_id)
    return res

@app.post("/api/action/generate-dispute")
def generate_dispute(req: DisputeRequest):
    res = SelfHealingEngine.export_dispute(req.discrepancy)
    return res

@app.post("/api/upload")
async def upload_custom_data(
    orders_file: UploadFile = File(...),
    gateway_file: UploadFile = File(...),
    bank_file: UploadFile = File(...)
):
    try:
        orders_content = await orders_file.read()
        gateway_content = await gateway_file.read()
        bank_content = await bank_file.read()

        orders = DataIngester.ingest_merchant_orders(orders_content)
        gateway_txns = DataIngester.ingest_gateway_settlements(gateway_content)
        bank_records = DataIngester.ingest_bank_feed(bank_content)

        res = controller.process_feeds(orders, gateway_txns, bank_records)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
