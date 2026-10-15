import api from './api';

export const getProducts = async () => {
  const response = await api.get('/products');
  return response.data;
};

export const createProduct = async (productData) => {
  const headers = productData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.post('/products', productData, { headers });
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const headers = productData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.put(`/products/${id}`, productData, { headers });
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};

export const bulkDeleteProducts = async (ids) => {
  const response = await api.post('/products/bulk-delete', { ids });
  return response.data;
};

export const importProducts = async (products) => {
  const response = await api.post('/products/import', { products });
  return response.data;
};
