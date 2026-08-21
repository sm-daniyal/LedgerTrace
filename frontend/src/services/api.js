import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const runReconciliation = async (preset = 'default') => {
  const response = await apiClient.post(`/reconcile?preset=${preset}`);
  return response.data;
};

export const getLineageGraph = async () => {
  const response = await apiClient.get('/lineage');
  return response.data;
};

export const resolveWebhook = async (orderId, gatewayPaymentId) => {
  const response = await apiClient.post('/action/resolve-webhook', {
    order_id: orderId,
    gateway_payment_id: gatewayPaymentId
  });
  return response.data;
};

export const postJournalVoucher = async (discrepancyId, discType, amount, orderId) => {
  const response = await apiClient.post('/action/post-journal', {
    discrepancy_id: discrepancyId,
    disc_type: discType,
    amount: amount,
    order_id: orderId
  });
  return response.data;
};

export const generateDisputePacket = async (discrepancy) => {
  const response = await apiClient.post('/action/generate-dispute', {
    discrepancy: discrepancy
  });
  return response.data;
};

export const uploadCustomFeeds = async (ordersFile, gatewayFile, bankFile) => {
  const formData = new FormData();
  formData.append('orders_file', ordersFile);
  formData.append('gateway_file', gatewayFile);
  formData.append('bank_file', bankFile);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};
