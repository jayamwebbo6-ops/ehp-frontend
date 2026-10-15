import api from './api';

export const getQuotations = async () => {
  const response = await api.get('/quotations');
  return response.data;
};

export const getQuotationById = async (id) => {
  const response = await api.get(`/quotations/${id}`);
  return response.data;
};

export const createQuotation = async (quotationData) => {
  const headers = quotationData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.post('/quotations', quotationData, { headers });
  return response.data;
};

export const updateQuotation = async (id, quotationData) => {
  const headers = quotationData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.put(`/quotations/${id}`, quotationData, { headers });
  return response.data;
};

export const deleteQuotation = async (id) => {
  const response = await api.delete(`/quotations/${id}`);
  return response.data;
};

export const bulkDeleteQuotations = async (ids) => {
  const response = await api.post('/quotations/bulk-delete', { ids });
  return response.data;
};

export const sendQuotationEmail = async (emailData) => {
  const response = await api.post('/quotations/send-email', emailData);
  return response.data;
};
