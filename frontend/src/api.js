import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export async function fetchYears() {
  const { data } = await api.get('/years')
  return data.data
}

export async function fetchEvents(params = {}) {
  const { data } = await api.get('/events', { params })
  return data.data
}

export async function fetchEventsByYear(year) {
  const { data } = await api.get(`/events/year/${year}`)
  return data.data
}

export async function fetchEvent(slug) {
  const { data } = await api.get(`/events/${slug}`)
  return data.data
}

export async function fetchAdminMe() {
  const { data } = await api.get('/admin/me')
  return data.data
}

export async function loginAdmin(payload) {
  const { data } = await api.post('/admin/login', payload)
  return data.data
}

export async function logoutAdmin() {
  await api.post('/admin/logout')
}

export async function fetchAdminEvents() {
  const { data } = await api.get('/admin/events')
  return data.data
}

export async function saveEvent(payload, id) {
  if (id) {
    await api.put(`/admin/events/${id}`, payload)
    return
  }
  const { data } = await api.post('/admin/events', payload)
  return data.data
}

export async function deleteEvent(id) {
  await api.delete(`/admin/events/${id}`)
}

export async function uploadPhotos(eventId, files) {
  const fileList = Array.from(files)
  const chunkSize = 8
  const created = []

  for (let index = 0; index < fileList.length; index += chunkSize) {
    const body = new FormData()
    body.append('event_id', eventId)
    fileList.slice(index, index + chunkSize).forEach((file) => body.append('photos[]', file))
    const { data } = await api.post('/admin/photos/upload', body)
    created.push(...(data.data || []))
  }

  return created
}

export async function deletePhoto(id) {
  await api.delete(`/admin/photos/${id}`)
}
