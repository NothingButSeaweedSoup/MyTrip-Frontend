export const BASE_URL = ''
const API_PREFIX = '/api/v1'

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = { method, headers }
  if (body) {
    config.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_PREFIX}${path}`, config)
  const json = await res.json()

  if (json.code !== 0) {
    throw new Error(json.message || '请求失败')
  }
  return json.data
}

export const api = {
  get(path) {
    return request('GET', path)
  },
  post(path, body) {
    return request('POST', path, body)
  },
  put(path, body) {
    return request('PUT', path, body)
  },
  delete(path) {
    return request('DELETE', path)
  },
  async upload(file) {
    const formData = new FormData()
    formData.append('file', file)
    const headers = {}
    const token = localStorage.getItem('token')
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_PREFIX}/file/upload`, { method: 'POST', headers, body: formData })
    const json = await res.json()
    if (json.code !== 0) throw new Error(json.message || '上传失败')
    return json.data
  }
}

export default api
