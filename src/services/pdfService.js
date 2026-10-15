import api from './api';

/**
 * Sends HTML content to the backend PDF generation service and triggers a browser download.
 * @param {string} html - The HTML string of the template.
 * @param {string} filename - The output PDF filename.
 */
export const downloadPDF = async (html, filename, attachments = null) => {
  const payload = { html };
  if (attachments) payload.attachments = attachments;
  const response = await api.post('/pdf/generate', payload, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

/**
 * Sends HTML content to the backend PDF generation service and returns a base64 encoded string.
 * @param {string} html - The HTML string of the template.
 * @param {Array} attachments - Optional list of attachments to merge into subsequent pages.
 * @returns {Promise<string>} The base64 encoded PDF.
 */
export const generatePDFBase64 = async (html, attachments = null) => {
  const payload = { html };
  if (attachments) payload.attachments = attachments;
  const response = await api.post('/pdf/generate', payload, { responseType: 'blob' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(response.data);
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1];
      resolve(base64data);
    };
    reader.onerror = (error) => reject(error);
  });
};
