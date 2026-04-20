// 법무 챗봇 API — 문서 관리 및 RAG 질의응답
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '알 수 없는 에러' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

/** 활성 법무 문서 목록 조회 */
export async function getLegalDocuments() {
  const res = await fetch(`${BASE_URL}/api/legal/documents`)
  return handleResponse(res)
}

/** 법무 문서 업로드 (pdf, docx, hwp) */
export async function uploadLegalDocument(formData) {
  const res = await fetch(`${BASE_URL}/api/legal/documents/upload`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

/** 법무 문서 삭제 */
export async function deleteLegalDocument(documentId) {
  const res = await fetch(`${BASE_URL}/api/legal/documents/${documentId}`, {
    method: 'DELETE',
  })
  return handleResponse(res)
}

/** 법무 문서 기반 RAG 질의응답 */
export async function askLegalQuestion(question) {
  const res = await fetch(`${BASE_URL}/api/legal/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  return handleResponse(res)
}

/** 계약서 파일 업로드 → AI 리스크 검토 */
export async function reviewContract(formData) {
  const res = await fetch(`${BASE_URL}/api/legal/review`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

/** 계약 조건 입력 → 계약서 초안 생성 */
export async function generateContractDraft(payload) {
  const res = await fetch(`${BASE_URL}/api/legal/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(res)
}

/** 계약서 초안 텍스트 → DOCX 파일 다운로드 */
export async function downloadDraftDocx(draft, filename = '계약서') {
  const res = await fetch(`${BASE_URL}/api/legal/draft/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft, filename }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'DOCX 생성 실패' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  // Blob으로 받아서 브라우저 다운로드 트리거
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
