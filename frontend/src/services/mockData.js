/**
 * Rich offline/fallback dataset for LedgerTrace.
 * Ensures the UI, Lineage DAG, Discrepancies, and Agent Drawer
 * work seamlessly in all situations.
 */

export const getEmptyInitialData = () => ({
  timestamp: null,
  reconciliation: {
    metrics: {
      total_merchant_orders: 0,
      total_merchant_amount: 0.0,
      total_gateway_captured_amount: 0.0,
      total_bank_settled_amount: 0.0,
      reconciled_count: 0,
      reconciled_amount: 0.0,
      reconciliation_rate: 0.0,
      discrepancy_count: 0,
      total_leakage_amount: 0.0,
      pending_settlement_amount: 0.0,
      anomaly_count: 0
    },
    discrepancies: [],
    reconciled_orders: [],
    anomaly_alerts: []
  },
  lineage: {
    nodes: [],
    edges: []
  }
});

export const getPresetFallbackData = (preset = 'default') => {
  if (preset === 'empty') {
    return getEmptyInitialData();
  }
  if (preset === 'flash_sale') {
    return {
      timestamp: new Date().toLocaleTimeString(),
      reconciliation: {
        metrics: {
          total_merchant_orders: 6,
          total_merchant_amount: 376500,
          total_gateway_captured_amount: 376500,
          total_bank_settled_amount: 273980.45,
          reconciled_count: 3,
          reconciled_amount: 198000,
          reconciliation_rate: 50.0,
          discrepancy_count: 3,
          total_leakage_amount: 1845.0,
          pending_settlement_amount: 92982.2,
          anomaly_count: 2
        },
        discrepancies: [
          {
            id: 'DISC_MDR_FS101',
            order_id: 'ORD_FS_101',
            gateway_payment_id: 'pay_fs_01',
            settlement_id: 'SETTL_FS_01',
            type: 'MDR_OVERCHARGE',
            severity: 'HIGH',
            impact_amount: 1190.0,
            gross_amount: 85000.0,
            actual_fee: 2720.0,
            payment_method: 'CREDIT_CARD',
            card_network: 'AMEX',
            description: 'MDR fee charged is INR 2,720.00 vs expected INR 1,530.00 (Effective Rate: 3.20% vs Contracted 1.80%).',
            root_cause: 'Payment aggregator applied un-negotiated surcharge rate (3.2%) on AMEX card network.',
            agent_confidence: 0.96,
            downstream_risk: 'MEDIUM - Revenue leakage requires month-end dispute and P&L adjustment',
            investigation_steps: [
              'Looked up contracted rate card: CREDIT_CARD = 1.80%',
              'Calculated mathematical baseline: Expected Fee = INR 1,530.00, Expected Tax = INR 275.40',
              'Detected delta: Fee difference = +INR 1,190.00, Rate deviation = +1.40pp',
              'Assessed downstream operational risk: Classified as Priority Dispute'
            ],
            proposed_action: 'Auto-generate fee dispute claim of INR 1,190.00 and post a Debit Adjustment to Gateway Clearing Account.',
            status: 'OPEN',
            created_at: '2026-08-21 11:00:10',
            investigation_report: {
              report_id: 'RPT_MDR_8C19',
              discrepancy_id: 'DISC_MDR_FS101',
              confidence_score: 0.96,
              audit_hash: '8C19-SHA256-VALID',
              steps: [
                {
                  step_id: 'STEP_01',
                  tool_name: 'lookup_rate_card',
                  duration_ms: 12,
                  reasoning: 'Retrieving contracted MDR rate card for CREDIT_CARD / AMEX to establish mathematical baseline.',
                  tool_output: { payment_method: 'CREDIT_CARD', card_network: 'AMEX', contracted_rate: 1.8, source: 'merchant_contract_v1' }
                },
                {
                  step_id: 'STEP_02',
                  tool_name: 'calculate_expected_settlement',
                  duration_ms: 8,
                  reasoning: 'Computing deterministic expected fee using contracted rate 1.8%. Any deviation constitutes unauthorized surcharge.',
                  tool_output: { gross_amount: 85000.0, expected_fee: 1530.0, expected_gst: 275.4, expected_net: 83194.6 }
                },
                {
                  step_id: 'STEP_03',
                  tool_name: 'compare_fee_variance',
                  duration_ms: 14,
                  reasoning: 'Variance analysis confirms an unauthorized fee delta of +INR 1,190.00 (rate applied: 3.20% vs 1.80%).',
                  tool_output: { actual_fee: 2720.0, expected_fee: 1530.0, fee_delta: 1190.0, rate_deviation_pp: 1.4 }
                },
                {
                  step_id: 'STEP_04',
                  tool_name: 'assess_downstream_impact',
                  duration_ms: 11,
                  reasoning: 'Evaluating risk: INR 1,190.00 leakage classified as MEDIUM operational risk.',
                  tool_output: { impact_amount: 1190.0, risk_level: 'MEDIUM', recommended_urgency: 'PRIORITY' }
                }
              ],
              hypotheses: [
                {
                  hypothesis: 'Non-standard surcharge rate (3.20%) applied by aggregator on AMEX Credit Card',
                  evidence_strength: 'STRONG',
                  probability: 0.85,
                  supporting_evidence: ['Fee delta: +INR 1,190.00', 'Rate deviation: +1.40pp above contract']
                },
                {
                  hypothesis: 'Premium card network surcharge not covered by current rate card agreement',
                  evidence_strength: 'MODERATE',
                  probability: 0.15,
                  supporting_evidence: ['Rate card may need renegotiation for premium networks']
                }
              ],
              selected_hypothesis: {
                hypothesis: 'Non-standard surcharge rate (3.20%) applied by aggregator on AMEX Credit Card',
                probability: 0.85
              },
              proposed_actions: [
                {
                  action_type: 'POST_JOURNAL',
                  description: 'Post balancing journal voucher for INR 1,190.00 fee overcharge on ORD_FS_101',
                  params: { discrepancy_id: 'DISC_MDR_FS101', disc_type: 'MDR_OVERCHARGE', amount: 1190.0, order_id: 'ORD_FS_101' }
                }
              ]
            }
          },
          {
            id: 'DISC_WH_FS103',
            order_id: 'ORD_FS_103',
            gateway_payment_id: 'pay_fs_03',
            settlement_id: 'SETTL_FS_02',
            type: 'DROPPED_WEBHOOK',
            severity: 'HIGH',
            impact_amount: 42000.0,
            description: 'Payment pay_fs_03 captured at gateway but merchant order ORD_FS_103 remained in PENDING state.',
            root_cause: 'HTTP 504 gateway timeout on merchant webhook endpoint during payment.captured event delivery.',
            agent_confidence: 0.99,
            downstream_risk: 'HIGH - Merchant order fulfillment stalled and customer account pending confirmation',
            investigation_steps: [
              'Fetched gateway payment status for pay_fs_03: CAPTURED',
              'Inspected webhook delivery logs: HTTP 504 Gateway Timeout on merchant endpoint /api/webhooks/razorpay',
              'Verified bank payout status: Included in settlement batch SETTL_FS_02',
              'Assessed downstream impact: Order fulfillment delayed'
            ],
            proposed_action: 'Trigger synthetic webhook replay to update merchant order status to SUCCESS.',
            status: 'OPEN',
            created_at: '2026-08-21 11:30:10',
            investigation_report: {
              report_id: 'RPT_WH_4200',
              discrepancy_id: 'DISC_WH_FS103',
              confidence_score: 0.99,
              audit_hash: '4200-SHA256-VALID',
              steps: [
                {
                  step_id: 'STEP_01',
                  tool_name: 'fetch_gateway_payment_status',
                  duration_ms: 9,
                  reasoning: 'Querying gateway API to confirm payment capture status for pay_fs_03.',
                  tool_output: { payment_id: 'pay_fs_03', status: 'CAPTURED' }
                },
                {
                  step_id: 'STEP_02',
                  tool_name: 'inspect_webhook_delivery_logs',
                  duration_ms: 15,
                  reasoning: 'Webhook delivery logs confirm 3 failed attempts with HTTP 504 Gateway Timeout.',
                  tool_output: { attempts: 3, last_status: 'HTTP 504 Gateway Timeout' }
                },
                {
                  step_id: 'STEP_03',
                  tool_name: 'verify_bank_settlement',
                  duration_ms: 12,
                  reasoning: 'Cross-referencing bank settlement records: Confirmed in settlement batch SETTL_FS_02.',
                  tool_output: { settled: true, settlement_id: 'SETTL_FS_02' }
                }
              ],
              hypotheses: [
                {
                  hypothesis: 'HTTP 504 gateway timeout on merchant webhook endpoint during payment.captured event delivery',
                  evidence_strength: 'STRONG',
                  probability: 0.92,
                  supporting_evidence: ['3 failed delivery attempts with 504 status', 'Payment confirmed captured at gateway']
                }
              ],
              proposed_actions: [
                {
                  action_type: 'RESYNC_WEBHOOK',
                  description: 'Execute synthetic webhook replay to update merchant order ORD_FS_103 to SUCCESS',
                  params: { order_id: 'ORD_FS_103', gateway_payment_id: 'pay_fs_03' }
                }
              ]
            }
          },
          {
            id: 'DISC_SLA_FS105',
            order_id: 'ORD_FS_105',
            gateway_payment_id: 'pay_fs_05',
            type: 'SETTLEMENT_DELAY',
            severity: 'HIGH',
            impact_amount: 92982.2,
            description: 'Transaction pay_fs_05 captured on 2026-08-18 has exceeded the 48-hour settlement SLA.',
            root_cause: 'Rolling risk reserve hold applied by clearing bank pending manual fraud review.',
            agent_confidence: 0.92,
            downstream_risk: 'HIGH - Merchant cashflow & scheduled vendor disbursements impacted',
            investigation_steps: [
              'Evaluated transaction age: Captured > 72 hours ago',
              'Cross-referenced bank settlement logs: No settlement batch ID generated by gateway',
              'Checked risk status: Flagged for manual review by clearing bank'
            ],
            proposed_action: 'Flag for payment aggregator escalation and post suspense hold journal voucher.',
            status: 'OPEN',
            created_at: '2026-08-18 09:00:00',
            investigation_report: {
              report_id: 'RPT_SLA_9298',
              discrepancy_id: 'DISC_SLA_FS105',
              confidence_score: 0.92,
              audit_hash: '9298-SHA256-VALID',
              steps: [
                {
                  step_id: 'STEP_01',
                  tool_name: 'check_settlement_sla',
                  duration_ms: 10,
                  reasoning: 'Transaction captured 72 hours ago. SLA threshold is 48 hours. Status: SLA_BREACHED.',
                  tool_output: { elapsed_hours: 72.0, sla_hours: 48, sla_status: 'SLA_BREACHED', breach_hours: 24.0 }
                },
                {
                  step_id: 'STEP_02',
                  tool_name: 'check_risk_reserve_status',
                  duration_ms: 12,
                  reasoning: 'Risk reserve check confirms transaction is flagged for manual review by clearing bank.',
                  tool_output: { risk_reserve_hold: true, hold_reason: 'Manual review flagged by clearing bank' }
                }
              ],
              hypotheses: [
                {
                  hypothesis: 'Rolling risk reserve hold applied by clearing bank pending manual review',
                  evidence_strength: 'STRONG',
                  probability: 0.70,
                  supporting_evidence: ['SLA breached by 24h', 'Risk reserve hold confirmed']
                }
              ],
              proposed_actions: [
                {
                  action_type: 'POST_JOURNAL',
                  description: 'Post suspense journal entry for INR 92,982.20 pending settlement confirmation',
                  params: { discrepancy_id: 'DISC_SLA_FS105', disc_type: 'SETTLEMENT_DELAY', amount: 92982.2, order_id: 'ORD_FS_105' }
                }
              ]
            }
          }
        ],
        reconciled_orders: [
          { order_id: 'ORD_FS_102', amount: 120000.0, gateway_payment_id: 'pay_fs_02', fee: 3360.0, tax: 604.8, net_amount: 116035.2, settlement_id: 'SETTL_FS_01', bank_ref_no: 'UTR_HDFC_FS_9901', status: 'RECONCILED' },
          { order_id: 'ORD_FS_104', amount: 19500.0, gateway_payment_id: 'pay_fs_04', fee: 292.5, tax: 52.65, net_amount: 19154.85, settlement_id: 'SETTL_FS_02', bank_ref_no: 'UTR_HDFC_FS_9902', status: 'RECONCILED' },
          { order_id: 'ORD_FS_106', amount: 15000.0, gateway_payment_id: 'pay_fs_06', fee: 0.0, tax: 0.0, net_amount: 15000.0, settlement_id: 'SETTL_FS_02', bank_ref_no: 'UTR_HDFC_FS_9902', status: 'RECONCILED' }
        ],
        anomaly_alerts: [
          {
            alert_id: 'ANOM_FEE_01',
            alert_type: 'FEE_RATE_DRIFT',
            severity: 'HIGH',
            metric_observed: 3.20,
            metric_expected: 1.80,
            deviation_score: 2.33,
            affected_transactions: ['ORD_FS_101'],
            description: 'Effective MDR rate 3.20% deviates from contracted 1.80% by +1.40pp on AMEX Credit Card.'
          },
          {
            alert_id: 'ANOM_SLA_01',
            alert_type: 'SETTLEMENT_VELOCITY_ANOMALY',
            severity: 'HIGH',
            metric_observed: 72.0,
            metric_expected: 18.0,
            deviation_score: 3.0,
            affected_transactions: ['ORD_FS_105'],
            description: 'Settlement elapsed time (72.0h) exceeded 48h SLA threshold by 24 hours.'
          }
        ]
      },
      lineage: {
        nodes: [
          { id: 'node_ord_FS101', stage: 'merchant', label: 'ORD_FS_101', amount: 85000, status: 'SUCCESS', details: { method: 'CREDIT_CARD', customer: 'CUST_FS1' } },
          { id: 'node_ord_FS102', stage: 'merchant', label: 'ORD_FS_102', amount: 120000, status: 'SUCCESS', details: { method: 'CREDIT_CARD', customer: 'CUST_FS2' } },
          { id: 'node_ord_FS103', stage: 'merchant', label: 'ORD_FS_103', amount: 42000, status: 'PENDING', details: { method: 'UPI', customer: 'CUST_FS3' } },
          { id: 'node_ord_FS104', stage: 'merchant', label: 'ORD_FS_104', amount: 19500, status: 'SUCCESS', details: { method: 'NET_BANKING', customer: 'CUST_FS4' } },
          { id: 'node_gw_FS01', stage: 'gateway', label: 'pay_fs_01', amount: 81790.4, status: 'captured', details: { fee: 2720, tax: 489.6 } },
          { id: 'node_gw_FS02', stage: 'gateway', label: 'pay_fs_02', amount: 116035.2, status: 'captured', details: { fee: 3360, tax: 604.8 } },
          { id: 'node_gw_FS03', stage: 'gateway', label: 'pay_fs_03', amount: 42000, status: 'captured', details: { fee: 0, tax: 0 } },
          { id: 'node_gw_FS04', stage: 'gateway', label: 'pay_fs_04', amount: 19154.85, status: 'captured', details: { fee: 292.5, tax: 52.65 } },
          { id: 'node_settl_FS01', stage: 'settlement', label: 'SETTL_FS_01', amount: 197825.6, status: 'settled', details: { count: 2 } },
          { id: 'node_settl_FS02', stage: 'settlement', label: 'SETTL_FS_02', amount: 76154.85, status: 'settled', details: { count: 3 } },
          { id: 'node_bank_FS01', stage: 'bank', label: 'UTR_HDFC_FS_9901', amount: 197825.6, status: 'credited', details: { bank: 'HDFC' } },
          { id: 'node_bank_FS02', stage: 'bank', label: 'UTR_HDFC_FS_9902', amount: 76154.85, status: 'credited', details: { bank: 'HDFC' } }
        ],
        edges: [
          { from: 'node_ord_FS101', to: 'node_gw_FS01' },
          { from: 'node_ord_FS102', to: 'node_gw_FS02' },
          { from: 'node_ord_FS103', to: 'node_gw_FS03' },
          { from: 'node_ord_FS104', to: 'node_gw_FS04' },
          { from: 'node_gw_FS01', to: 'node_settl_FS01' },
          { from: 'node_gw_FS02', to: 'node_settl_FS01' },
          { from: 'node_gw_FS03', to: 'node_settl_FS02' },
          { from: 'node_gw_FS04', to: 'node_settl_FS02' },
          { from: 'node_settl_FS01', to: 'node_bank_FS01' },
          { from: 'node_settl_FS02', to: 'node_bank_FS02' }
        ]
      }
    };
  }

  // Default Standard Batch
  return {
    timestamp: new Date().toLocaleTimeString(),
    reconciliation: {
      metrics: {
        total_merchant_orders: 11,
        total_merchant_amount: 376500.0,
        total_gateway_captured_amount: 376500.0,
        total_bank_settled_amount: 350000.0,
        reconciled_count: 7,
        reconciled_amount: 198000.0,
        reconciliation_rate: 63.6,
        discrepancy_count: 4,
        total_leakage_amount: 1250.0,
        pending_settlement_amount: 92000.0,
        anomaly_count: 2
      },
      discrepancies: [
        {
          id: 'DISC_MDR_1001',
          order_id: 'ORD_1001',
          gateway_payment_id: 'pay_1001',
          settlement_id: 'SETTL_01',
          type: 'MDR_OVERCHARGE',
          severity: 'HIGH',
          impact_amount: 595.0,
          gross_amount: 85000.0,
          actual_fee: 2125.0,
          payment_method: 'CREDIT_CARD',
          card_network: 'VISA',
          description: 'MDR fee charged is INR 2,125.00 vs expected INR 1,530.00 (Rate applied: 2.50% vs Contracted 1.80%).',
          root_cause: 'Payment aggregator applied non-standard surcharge rate on Visa credit card payment method.',
          agent_confidence: 0.96,
          downstream_risk: 'MEDIUM - Revenue leakage requires month-end dispute and P&L adjustment',
          investigation_steps: [
            'Looked up contracted rate card: CREDIT_CARD = 1.80%',
            'Calculated mathematical baseline: Expected Fee = INR 1,530.00, Expected Tax = INR 275.40',
            'Detected delta: Fee difference = +INR 595.00, Tax difference = +INR 107.10',
            'Assessed downstream operational risk: Priority month-end claim'
          ],
          proposed_action: 'Auto-generate fee dispute claim of INR 595.00 and post a Debit Adjustment to Gateway Clearing Account.',
          status: 'OPEN',
          created_at: '2026-08-21 11:00:00',
          investigation_report: {
            report_id: 'RPT_MDR_595',
            discrepancy_id: 'DISC_MDR_1001',
            confidence_score: 0.96,
            audit_hash: '595-SHA256-VALID',
            steps: [
              {
                step_id: 'STEP_01',
                tool_name: 'lookup_rate_card',
                duration_ms: 12,
                reasoning: 'Retrieving contracted MDR rate card for CREDIT_CARD / VISA to establish baseline.',
                tool_output: { payment_method: 'CREDIT_CARD', card_network: 'VISA', contracted_rate: 1.8 }
              },
              {
                step_id: 'STEP_02',
                tool_name: 'calculate_expected_settlement',
                duration_ms: 8,
                reasoning: 'Computing deterministic expected fee using contracted rate 1.8%.',
                tool_output: { gross_amount: 85000.0, expected_fee: 1530.0, expected_gst: 275.4 }
              },
              {
                step_id: 'STEP_03',
                tool_name: 'compare_fee_variance',
                duration_ms: 14,
                reasoning: 'Variance analysis confirms an unauthorized fee delta of +INR 595.00.',
                tool_output: { actual_fee: 2125.0, expected_fee: 1530.0, fee_delta: 595.0 }
              }
            ],
            hypotheses: [
              {
                hypothesis: 'Non-standard surcharge rate (2.50%) applied by aggregator on Visa Credit Card',
                evidence_strength: 'STRONG',
                probability: 0.85,
                supporting_evidence: ['Fee delta: +INR 595.00', 'Rate deviation: +0.70pp']
              }
            ],
            proposed_actions: [
              {
                action_type: 'POST_JOURNAL',
                description: 'Post balancing journal voucher for INR 595.00 fee overcharge on ORD_1001',
                params: { discrepancy_id: 'DISC_MDR_1001', disc_type: 'MDR_OVERCHARGE', amount: 595.0, order_id: 'ORD_1001' }
              }
            ]
          }
        },
        {
          id: 'DISC_WH_1003',
          order_id: 'ORD_1003',
          gateway_payment_id: 'pay_1003',
          settlement_id: 'SETTL_02',
          type: 'DROPPED_WEBHOOK',
          severity: 'HIGH',
          impact_amount: 42000.0,
          description: 'Payment pay_1003 captured at gateway but merchant order ORD_1003 remained PENDING.',
          root_cause: 'Network timeout on gateway payment.captured webhook or merchant server 504 gateway timeout.',
          agent_confidence: 0.99,
          downstream_risk: 'HIGH - Merchant order fulfillment stalled and customer account pending confirmation',
          investigation_steps: [
            'Fetched gateway payment status for pay_1003: CAPTURED',
            'Inspected webhook delivery logs: HTTP 504 Gateway Timeout on merchant endpoint /api/webhooks/razorpay',
            'Verified bank payout status: Included in settlement batch SETTL_02'
          ],
          proposed_action: 'Trigger synthetic webhook replay to update merchant order status to SUCCESS.',
          status: 'OPEN',
          created_at: '2026-08-21 11:30:00',
          investigation_report: {
            report_id: 'RPT_WH_4200',
            discrepancy_id: 'DISC_WH_1003',
            confidence_score: 0.99,
            audit_hash: '4200-SHA256-VALID',
            steps: [
              {
                step_id: 'STEP_01',
                tool_name: 'fetch_gateway_payment_status',
                duration_ms: 9,
                reasoning: 'Querying gateway API to confirm payment capture status for pay_1003.',
                tool_output: { payment_id: 'pay_1003', status: 'CAPTURED' }
              },
              {
                step_id: 'STEP_02',
                tool_name: 'inspect_webhook_delivery_logs',
                duration_ms: 15,
                reasoning: 'Webhook delivery logs confirm 3 failed attempts with HTTP 504 Gateway Timeout.',
                tool_output: { attempts: 3, last_status: 'HTTP 504 Gateway Timeout' }
              }
            ],
            hypotheses: [
              {
                hypothesis: 'HTTP 504 gateway timeout on merchant webhook endpoint during payment.captured delivery',
                evidence_strength: 'STRONG',
                probability: 0.92,
                supporting_evidence: ['3 failed delivery attempts with 504 status', 'Payment confirmed captured at gateway']
              }
            ],
            proposed_actions: [
              {
                action_type: 'RESYNC_WEBHOOK',
                description: 'Execute synthetic webhook replay to update merchant order ORD_1003 to SUCCESS',
                params: { order_id: 'ORD_1003', gateway_payment_id: 'pay_1003' }
              }
            ]
          }
        },
        {
          id: 'DISC_SLA_1005',
          order_id: 'ORD_1005',
          gateway_payment_id: 'pay_1005',
          type: 'SETTLEMENT_DELAY',
          severity: 'HIGH',
          impact_amount: 92000.0,
          description: 'Transaction pay_1005 captured on 2026-08-18 has exceeded the 48-hour settlement SLA.',
          root_cause: 'Rolling risk reserve hold or clearing bank batch processing bottleneck.',
          agent_confidence: 0.92,
          downstream_risk: 'HIGH - Merchant cashflow & scheduled vendor disbursements impacted',
          investigation_steps: [
            'Evaluated transaction age: Captured > 48 hours ago',
            'Cross-referenced bank settlement logs: No corresponding settlement ID generated by gateway',
            'Checked risk status: Transaction flagged for manual review by clearing bank'
          ],
          proposed_action: 'Flag for payment aggregator escalation and post suspense hold journal voucher.',
          status: 'OPEN',
          created_at: '2026-08-18 09:00:00',
          investigation_report: {
            report_id: 'RPT_SLA_9200',
            discrepancy_id: 'DISC_SLA_1005',
            confidence_score: 0.92,
            audit_hash: '9200-SHA256-VALID',
            steps: [
              {
                step_id: 'STEP_01',
                tool_name: 'check_settlement_sla',
                duration_ms: 10,
                reasoning: 'Transaction captured 54 hours ago. SLA threshold is 48 hours. Status: SLA_BREACHED.',
                tool_output: { elapsed_hours: 54.0, sla_hours: 48, sla_status: 'SLA_BREACHED', breach_hours: 6.0 }
              }
            ],
            hypotheses: [
              {
                hypothesis: 'Rolling risk reserve hold applied by clearing bank',
                evidence_strength: 'STRONG',
                probability: 0.70,
                supporting_evidence: ['SLA breached by 6h', 'Risk reserve hold confirmed']
              }
            ],
            proposed_actions: [
              {
                action_type: 'POST_JOURNAL',
                description: 'Post suspense journal entry for INR 92,000.00 pending settlement confirmation',
                params: { discrepancy_id: 'DISC_SLA_1005', disc_type: 'SETTLEMENT_DELAY', amount: 92000.0, order_id: 'ORD_1005' }
              }
            ]
          }
        },
        {
          id: 'DISC_MG_1007',
          order_id: 'ORD_1007',
          type: 'MISSING_GATEWAY_RECORD',
          severity: 'HIGH',
          impact_amount: 5000.0,
          description: 'Order ORD_1007 exists in merchant database but no gateway transaction was found.',
          root_cause: 'Abandoned checkout or gateway connection failure before payment attempt initialization.',
          agent_confidence: 0.98,
          downstream_risk: 'LOW - Customer abandoned checkout flow',
          investigation_steps: [
            'Queried gateway API for order ORD_1007: 404 Not Found',
            'Checked merchant checkout abandonment logs: Customer closed window'
          ],
          proposed_action: 'Mark order as ABANDONED in merchant database or send recovery checkout link.',
          status: 'OPEN',
          created_at: '2026-08-21 10:00:00',
          investigation_report: {
            report_id: 'RPT_MG_5000',
            discrepancy_id: 'DISC_MG_1007',
            confidence_score: 0.98,
            audit_hash: '5000-SHA256-VALID',
            steps: [
              {
                step_id: 'STEP_01',
                tool_name: 'fetch_gateway_payment_status',
                duration_ms: 8,
                reasoning: 'Gateway API query for order ORD_1007 returned 404 Not Found.',
                tool_output: { status_code: 404, message: 'No payment record found' }
              }
            ],
            hypotheses: [
              {
                hypothesis: 'Customer abandoned checkout before payment method selection',
                evidence_strength: 'STRONG',
                probability: 0.88,
                supporting_evidence: ['Gateway returns 404', 'Checkout logs show abandonment']
              }
            ],
            proposed_actions: [
              {
                action_type: 'MARK_ABANDONED',
                description: 'Mark order ORD_1007 as ABANDONED and trigger recovery email campaign',
                params: { order_id: 'ORD_1007' }
              }
            ]
          }
        }
      ],
      reconciled_orders: [
        { order_id: 'ORD_1002', amount: 50000.0, gateway_payment_id: 'pay_1002', fee: 900.0, tax: 162.0, net_amount: 48938.0, settlement_id: 'SETTL_01', bank_ref_no: 'UTR_HDFC_001', status: 'RECONCILED' },
        { order_id: 'ORD_1004', amount: 15000.0, gateway_payment_id: 'pay_1004', fee: 0.0, tax: 0.0, net_amount: 15000.0, settlement_id: 'SETTL_02', bank_ref_no: 'UTR_HDFC_002', status: 'RECONCILED' },
        { order_id: 'ORD_1006', amount: 30000.0, gateway_payment_id: 'pay_1006', fee: 450.0, tax: 81.0, net_amount: 29469.0, settlement_id: 'SETTL_02', bank_ref_no: 'UTR_HDFC_002', status: 'RECONCILED' }
      ],
      anomaly_alerts: [
        {
          alert_id: 'ANOM_FEE_101',
          alert_type: 'FEE_RATE_DRIFT',
          severity: 'HIGH',
          metric_observed: 2.50,
          metric_expected: 1.80,
          deviation_score: 1.85,
          affected_transactions: ['ORD_1001'],
          description: 'Effective MDR rate 2.50% on Visa Credit Card exceeds contracted baseline 1.80% by +0.70pp.'
        }
      ]
    },
    lineage: {
      nodes: [
        { id: 'node_ord_1001', stage: 'merchant', label: 'ORD_1001', amount: 85000, status: 'SUCCESS', details: { method: 'CREDIT_CARD', customer: 'CUST_01' } },
        { id: 'node_ord_1002', stage: 'merchant', label: 'ORD_1002', amount: 50000, status: 'SUCCESS', details: { method: 'CREDIT_CARD', customer: 'CUST_02' } },
        { id: 'node_ord_1003', stage: 'merchant', label: 'ORD_1003', amount: 42000, status: 'PENDING', details: { method: 'UPI', customer: 'CUST_03' } },
        { id: 'node_gw_1001', stage: 'gateway', label: 'pay_1001', amount: 82280, status: 'captured', details: { fee: 2125, tax: 382.5 } },
        { id: 'node_gw_1002', stage: 'gateway', label: 'pay_1002', amount: 48938, status: 'captured', details: { fee: 900, tax: 162 } },
        { id: 'node_gw_1003', stage: 'gateway', label: 'pay_1003', amount: 42000, status: 'captured', details: { fee: 0, tax: 0 } },
        { id: 'node_settl_01', stage: 'settlement', label: 'SETTL_01', amount: 131218, status: 'settled', details: { count: 2 } },
        { id: 'node_settl_02', stage: 'settlement', label: 'SETTL_02', amount: 42000, status: 'settled', details: { count: 1 } },
        { id: 'node_bank_01', stage: 'bank', label: 'UTR_HDFC_001', amount: 131218, status: 'credited', details: { bank: 'HDFC' } },
        { id: 'node_bank_02', stage: 'bank', label: 'UTR_HDFC_002', amount: 42000, status: 'credited', details: { bank: 'HDFC' } }
      ],
      edges: [
        { from: 'node_ord_1001', to: 'node_gw_1001' },
        { from: 'node_ord_1002', to: 'node_gw_1002' },
        { from: 'node_ord_1003', to: 'node_gw_1003' },
        { from: 'node_gw_1001', to: 'node_settl_01' },
        { from: 'node_gw_1002', to: 'node_settl_01' },
        { from: 'node_gw_1003', to: 'node_settl_02' },
        { from: 'node_settl_01', to: 'node_bank_01' },
        { from: 'node_settl_02', to: 'node_bank_02' }
      ]
    }
  };
};
