import api from './api';

export const getRequirements = async () => {
  const response = await api.get('/requirements');
  return response.data;
};

export const createRequirement = async (data) => {
  const response = await api.post('/requirements', data);
  return response.data;
};

export const updateRequirement = async (id, data) => {
  const response = await api.put(`/requirements/${id}`, data);
  return response.data;
};

export const deleteRequirement = async (id) => {
  const response = await api.delete(`/requirements/${id}`);
  return response.data;
};

export const bulkDeleteRequirements = async (ids) => {
  const response = await api.post('/requirements/bulk-delete', { ids });
  return response.data;
};
