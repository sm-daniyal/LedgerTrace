from typing import List, Dict, Any

class LineageBuilder:
    # Builds interactive financial provenance graph nodes and edges.
    
    @staticmethod
    def build_graph(orders: List[Dict[str, Any]], gateway_txns: List[Dict[str, Any]], bank_records: List[Dict[str, Any]], discrepancies: List[Dict[str, Any]]) -> Dict[str, Any]:
        disc_order_ids = {d["order_id"]: d for d in discrepancies if d.get("order_id")}
        
        nodes = []
        edges = []
        
        gw_map = {g["order_id"]: g for g in gateway_txns if g.get("order_id")}
        bank_map = {b["settlement_id"]: b for b in bank_records if b.get("settlement_id")}
        
        settlement_batches_added = set()
        bank_utrs_added = set()

        for order in orders:
            order_id = order["order_id"]
            has_disc = order_id in disc_order_ids
            disc_info = disc_order_ids.get(order_id)
            
            # 1. Order Node
            node_status = "discrepancy" if has_disc else "matched"
            nodes.append({
                "id": f"node_ord_{order_id}",
                "type": "order",
                "label": f"Order {order_id}",
                "amount": order["amount"],
                "status": node_status,
                "metadata": {
                    "customer_id": order.get("customer_id"),
                    "payment_method": order.get("payment_method"),
                    "created_at": order.get("created_at"),
                    "discrepancy": disc_info.get("type") if disc_info else None
                }
            })

            # 2. Gateway Node
            gw = gw_map.get(order_id)
            if gw:
                gw_node_id = f"node_gw_{gw['gateway_payment_id']}"
                nodes.append({
                    "id": gw_node_id,
                    "type": "gateway",
                    "label": f"Gateway {gw['gateway_payment_id']}",
                    "amount": gw["gross_amount"],
                    "status": "discrepancy" if (has_disc and disc_info["type"] in ["MDR_OVERCHARGE", "DROPPED_WEBHOOK"]) else "matched",
                    "metadata": {
                        "fee": gw.get("fee"),
                        "tax": gw.get("tax"),
                        "net_amount": gw.get("net_amount"),
                        "status": gw.get("status")
                    }
                })
                
                # Edge: Order -> Gateway
                edges.append({
                    "id": f"edge_{order_id}_{gw['gateway_payment_id']}",
                    "source": f"node_ord_{order_id}",
                    "target": gw_node_id,
                    "label": f"INR {order['amount']}",
                    "style": "dashed" if has_disc else "solid"
                })

                # 3. Payout Batch Node
                settl_id = gw.get("settlement_id")
                if settl_id:
                    settl_node_id = f"node_batch_{settl_id}"
                    if settl_id not in settlement_batches_added:
                        settlement_batches_added.add(settl_id)
                        nodes.append({
                            "id": settl_node_id,
                            "type": "payout_batch",
                            "label": f"Batch {settl_id}",
                            "amount": 0.0, # aggregate
                            "status": "matched",
                            "metadata": {
                                "settlement_id": settl_id
                            }
                        })
                    
                    # Edge: Gateway -> Batch
                    edges.append({
                        "id": f"edge_{gw['gateway_payment_id']}_{settl_id}",
                        "source": gw_node_id,
                        "target": settl_node_id,
                        "label": f"Net INR {gw['net_amount']}",
                        "style": "solid"
                    })

                    # 4. Bank UTR Node
                    bank = bank_map.get(settl_id)
                    if bank:
                        utr_node_id = f"node_utr_{bank['bank_ref_no']}"
                        if bank["bank_ref_no"] not in bank_utrs_added:
                            bank_utrs_added.add(bank["bank_ref_no"])
                            nodes.append({
                                "id": utr_node_id,
                                "type": "bank_utr",
                                "label": f"UTR {bank['bank_ref_no']}",
                                "amount": bank["credit_amount"],
                                "status": "matched",
                                "metadata": {
                                    "bank_ref_no": bank["bank_ref_no"],
                                    "transaction_date": bank["transaction_date"],
                                    "narration": bank["narration"]
                                }
                            })
                            
                            # Edge: Batch -> Bank UTR
                            edges.append({
                                "id": f"edge_{settl_id}_{bank['bank_ref_no']}",
                                "source": settl_node_id,
                                "target": utr_node_id,
                                "label": f"Settled INR {bank['credit_amount']}",
                                "style": "solid"
                            })

        return {
            "nodes": nodes,
            "edges": edges
        }
