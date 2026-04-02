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

export async function uploadPhotos(eventId, files, options = {}) {
  const fileList = Array.from(files)
  const created = []
  const errors = []
  let meta = null

  for (let index = 0; index < fileList.length; index += 1) {
    const file = fileList[index]
    const body = new FormData()
    body.append('event_id', eventId)
    body.append('photos[]', file)
    if (options.setAsCover) {
      body.append('set_as_cover', '1')
    }
    try {
      const { data } = await api.post('/admin/photos/upload', body, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          options.onFileProgress?.({
            index,
            file,
            percent,
          })
        },
      })

      created.push(...(data.data || []))
      meta = data.meta || meta
      options.onFileComplete?.({
        index,
        file,
        created: data.data || [],
        meta: data.meta || null,
      })
    } catch (error) {
      errors.push({ index, file, error })
      options.onFileError?.({
        index,
        file,
        error,
      })

      if (options.setAsCover || fileList.length === 1) {
        throw error
      }
    }
  }

  if (!created.length && errors.length) {
    throw errors[0].error
  }

  return { created, meta }
}

export async function deletePhoto(id) {
  await api.delete(`/admin/photos/${id}`)
}
