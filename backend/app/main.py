import json
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from .agents.controller import ReconController
from .agents.healing import SelfHealingEngine
from .agents.approval import ApprovalQueue
from .agents.query_engine import QueryEngine
from .engine.ingester import DataIngester
from .engine.continuous_engine import ContinuousReconEngine

app = FastAPI(
    title="LedgerTrace API",
    description="Autonomous 3-Way Financial Reconciliation and Lineage Engine — AI-Native Continuous Close Platform",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

controller = ReconController()
approval_queue = ApprovalQueue()
query_engine = QueryEngine()
continuous_engine = ContinuousReconEngine(controller.contracts)

# Pre-populate approval queue on startup so it is immediately populated
try:
    init_res = controller.generate_preset_data("default")
    for disc in init_res.get("reconciliation", {}).get("discrepancies", []):
        report = disc.get("investigation_report", {})
        for action in report.get("proposed_actions", []):
            approval_queue.propose_action(
                action_type=action.get("action_type", "UNKNOWN"),
                params=action.get("params", {}),
                investigation_summary=report.get("report_id", ""),
                confidence_score=report.get("confidence_score", 0.0),
                discrepancy_id=disc.get("id", ""),
                order_id=disc.get("order_id", "")
            )
except Exception:
    pass

# ─── Request Models ──────────────────────────────────────────────────

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

class IngestRequest(BaseModel):
    source: str  # 'merchant', 'gateway', 'bank'
    records: List[Dict[str, Any]]

class QueryRequest(BaseModel):
    question: str

class RejectRequest(BaseModel):
    reason: str

# ─── Core Endpoints ──────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "online", "service": "LedgerTrace Core Engine", "version": "2.0.0"}

@app.post("/api/reconcile")
def run_reconciliation(preset: str = Query("default")):
    result = controller.generate_preset_data(preset)

    # Clear previous queue so each batch starts with only its active proposals
    approval_queue.queue.clear()
    approval_queue.audit_log.clear()

    # Auto-stage proposed actions from investigation reports
    recon = result.get("reconciliation", result)
    for disc in recon.get("discrepancies", []):
        report = disc.get("investigation_report", {})
        for action in report.get("proposed_actions", []):
            approval_queue.propose_action(
                action_type=action.get("action_type", "UNKNOWN"),
                params=action.get("params", {}),
                investigation_summary=report.get("report_id", ""),
                confidence_score=report.get("confidence_score", 0.0),
                discrepancy_id=disc.get("id", ""),
                order_id=disc.get("order_id", "")
            )

    return result

@app.get("/api/lineage")
def get_lineage():
    if not controller.last_lineage:
        controller.run_default_reconciliation()
    return controller.last_lineage

# ─── Self-Healing Action Endpoints ───────────────────────────────────

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

# ─── CSV Upload Endpoint ─────────────────────────────────────────────

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

# ─── Feature 1: Continuous Reconciliation Endpoints ──────────────────

@app.post("/api/ingest")
def ingest_incremental(req: IngestRequest):
    """Ingest records from a single source for continuous reconciliation."""
    if req.source not in ("merchant", "gateway", "bank"):
        raise HTTPException(status_code=400, detail="Source must be 'merchant', 'gateway', or 'bank'")
    events = continuous_engine.ingest_incremental(req.source, req.records)
    return {
        "source": req.source,
        "records_ingested": len(req.records),
        "events_generated": len(events),
        "events": [e.to_dict() for e in events]
    }

@app.get("/api/close-status")
def get_close_status():
    """Return the current continuous close progress and live state."""
    return continuous_engine.get_live_state()

@app.get("/api/stream")
async def sse_stream():
    """Server-Sent Events stream for real-time reconciliation updates."""
    async def event_generator():
        cursor = 0
        yield "data: {\"event_type\": \"STREAM_CONNECTED\", \"message\": \"Connected to LedgerTrace live stream\"}\n\n"
        while True:
            events = continuous_engine.get_events_since(cursor)
            for event in events:
                yield event.to_sse()
                cursor += 1
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# ─── Feature 3: Human-in-the-Loop Approval Endpoints ────────────────

@app.get("/api/approval-queue")
def get_approval_queue(status: Optional[str] = None):
    """Return the current approval queue, optionally filtered by status."""
    return {
        "queue": approval_queue.get_queue(status),
        "stats": approval_queue.get_stats()
    }

@app.post("/api/approval/{action_id}/approve")
def approve_action(action_id: str):
    """Approve and execute a staged action."""
    result = approval_queue.approve(action_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/api/approval/{action_id}/reject")
def reject_action(action_id: str, req: RejectRequest):
    """Reject a staged action with a reason."""
    result = approval_queue.reject(action_id, req.reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/api/audit-log")
def get_audit_log():
    """Return the full audit trail of all approval workflow events."""
    return {"audit_log": approval_queue.get_audit_log()}

# ─── Feature 5: Natural Language Query Endpoint ──────────────────────

@app.post("/api/query")
def natural_language_query(req: QueryRequest):
    """Query reconciliation data using natural language."""
    if not controller.last_results:
        controller.run_default_reconciliation()

    data = {
        "reconciliation": controller.last_results,
        "lineage": controller.last_lineage
    }
    result = query_engine.query(req.question, data)
    return result
