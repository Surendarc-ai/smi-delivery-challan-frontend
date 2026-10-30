const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'dc_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function request(path, options = {}) {
  const token = getToken()
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

export async function uploadRequest(path, formData, method = 'PUT') {
  const token = getToken()
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const res = await fetch(url, {
    method,
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

export function assetUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${BASE}${path}`
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Fetch PDF and open for viewing (native system viewer / browser tab). */
export async function downloadPdf(path, filename = 'delivery-challan.pdf') {
  const token = getToken()
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to open PDF')
  }
  const blob = await res.blob()
  const safeName = String(filename || 'delivery-challan.pdf').replace(/[^\w.\-]+/g, '_')

  const { Capacitor } = await import('@capacitor/core')
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { FileOpener } = await import('@capacitor-community/file-opener')
    const base64 = await blobToBase64(blob)
    const written = await Filesystem.writeFile({
      path: `pdfs/${safeName}`,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    })
    await FileOpener.open({
      filePath: written.uri,
      contentType: 'application/pdf',
      openWithDefault: true,
    })
    return
  }

  const objectUrl = URL.createObjectURL(blob)
  const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer')
  if (!opened) {
    const a = document.createElement('a')
    a.href = objectUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}
