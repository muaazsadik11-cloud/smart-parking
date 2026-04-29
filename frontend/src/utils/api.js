import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE,
  timeout: 60000,
})

export const uploadImage = (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round(e.loaded * 100 / e.total)),
  })
}

export const getRecords  = (limit = 100) => api.get(`/api/records?limit=${limit}`)
export const getStats    = ()           => api.get('/api/stats')
export const getDataset  = ()           => api.get('/api/dataset')
export const processDatasetImage = (filename) => api.post(`/api/dataset/process/${filename}`)
export const healthCheck = ()           => api.get('/api/health')
