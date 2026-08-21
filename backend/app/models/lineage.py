from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class LineageNode(BaseModel):
    id: str
    type: str  # order, gateway, payout_batch, bank_utr
    label: str
    amount: float
    status: str  # matched, discrepancy, pending
    metadata: Dict[str, Any] = {}

class LineageEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    style: Optional[str] = "solid"  # solid, dashed

class LineageGraph(BaseModel):
    nodes: List[LineageNode]
    edges: List[LineageEdge]
