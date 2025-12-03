import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for embedding generation
})

export async function searchJewelry({
  queryText,
  image,
  dataset = 'cartier',
  topK = 10,
  ...filters
}) {
  const formData = new FormData()
  
  if (queryText) {
    formData.append('query_text', queryText)
  }
  
  if (image) {
    formData.append('image', image)
  }
  
  formData.append('dataset', dataset)
  formData.append('top_k', topK.toString())
  
  // Add filters
  if (filters.price_min !== undefined && filters.price_min !== null) {
    formData.append('price_min', filters.price_min.toString())
  }
  if (filters.price_max !== undefined && filters.price_max !== null) {
    formData.append('price_max', filters.price_max.toString())
  }
  if (filters.metal) {
    formData.append('metal', filters.metal)
  }
  if (filters.shape) {
    formData.append('shape', filters.shape)
  }
  if (filters.color) {
    formData.append('color', filters.color)
  }
  if (filters.clarity) {
    formData.append('clarity', filters.clarity)
  }
  if (filters.carat_min !== undefined && filters.carat_min !== null) {
    formData.append('carat_min', filters.carat_min.toString())
  }
  if (filters.carat_max !== undefined && filters.carat_max !== null) {
    formData.append('carat_max', filters.carat_max.toString())
  }
  
  try {
    const response = await apiClient.post('/api/recommend', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Search failed')
    } else if (error.request) {
      throw new Error('No response from server. Is the API running?')
    } else {
      throw new Error(error.message || 'Search failed')
    }
  }
}

export async function getStats() {
  try {
    const response = await apiClient.get('/api/stats')
    return response.data
  } catch (error) {
    console.error('Error fetching stats:', error)
    return null
  }
}

export async function healthCheck() {
  try {
    const response = await apiClient.get('/api/health')
    return response.data
  } catch (error) {
    console.error('Health check failed:', error)
    return { status: 'unhealthy' }
  }
}




