import api from './api';

export const getSpareParts = async () => {
  const response = await api.get('/spare-parts');
  return response.data;
};

export const getSparePartById = async (id) => {
  const response = await api.get(`/spare-parts/${id}`);
  return response.data;
};

export const createSparePart = async (sparePartData) => {
  const headers = sparePartData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.post('/spare-parts', sparePartData, { headers });
  return response.data;
};

export const updateSparePart = async (id, sparePartData) => {
  const headers = sparePartData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.put(`/spare-parts/${id}`, sparePartData, { headers });
  return response.data;
};

export const deleteSparePart = async (id) => {
  const response = await api.delete(`/spare-parts/${id}`);
  return response.data;
};

export const bulkDeleteSpareParts = async (ids) => {
  const response = await api.post('/spare-parts/bulk-delete', { ids });
  return response.data;
};
