const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function handleResponse(res) {
  if (!res.ok) {
    let message = `오류 ${res.status}`
    try {
      const data = await res.json()
      message = data.detail || data.message || message
    } catch {}
    throw new Error(message)
  }
  return res.json()
}

// ── 장애 로그 분석 ─────────────────────────────────────────────────────────

export async function analyzeLog({ logText, context = '' }) {
  const res = await fetch(`${BASE_URL}/api/dev/log/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ log_text: logText, context }),
  })
  return handleResponse(res)
}

// ── 인프라 문서 챗봇 ───────────────────────────────────────────────────────

export async function getDevDocuments() {
  const res = await fetch(`${BASE_URL}/api/dev/docs`)
  return handleResponse(res)
}

export async function uploadDevDocuments(files, uploader = {}) {
  const formData = new FormData()
  for (const file of files) formData.append('files', file)
  if (uploader.employee_id) formData.append('employee_id', uploader.employee_id)
  if (uploader.name) formData.append('uploader_name', uploader.name)
  if (uploader.department) formData.append('uploader_department', uploader.department)

  const res = await fetch(`${BASE_URL}/api/dev/docs/upload`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

export async function deleteDevDocument(documentId) {
  const res = await fetch(`${BASE_URL}/api/dev/docs/${documentId}`, {
    method: 'DELETE',
  })
  return handleResponse(res)
}

export async function askDevQuestion(question) {
  const res = await fetch(`${BASE_URL}/api/dev/docs/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  return handleResponse(res)
}

// ── 기술 용어 번역기 ───────────────────────────────────────────────────────

export async function translateTechText({ text, audience = 'general' }) {
  const res = await fetch(`${BASE_URL}/api/dev/translate/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, audience }),
  })
  return handleResponse(res)
}

export async function getGlossaryTerms(pinnedOnly = false) {
  const res = await fetch(
    `${BASE_URL}/api/dev/translate/glossary?pinned_only=${pinnedOnly}`,
  )
  return handleResponse(res)
}

export async function getGlossaryStats() {
  const res = await fetch(`${BASE_URL}/api/dev/translate/glossary/stats`)
  return handleResponse(res)
}

export async function patchTermPin(termId, isPinned) {
  const res = await fetch(`${BASE_URL}/api/dev/translate/glossary/${termId}/pin`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_pinned: isPinned }),
  })
  return handleResponse(res)
}

export async function deleteTerm(termId) {
  const res = await fetch(`${BASE_URL}/api/dev/translate/glossary/${termId}`, {
    method: 'DELETE',
  })
  return handleResponse(res)
}

export async function getUsageStats() {
  const res = await fetch(`${BASE_URL}/api/dev/translate/usage-stats`)
  return handleResponse(res)
}

// ── 릴리즈 노트 생성 ───────────────────────────────────────────────────────

export async function generateReleaseNote({ commits, version = '', productName = '', audience = 'general' }) {
  const res = await fetch(`${BASE_URL}/api/dev/release/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commits,
      version,
      product_name: productName,
      audience,
    }),
  })
  return handleResponse(res)
}
