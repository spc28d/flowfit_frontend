// CS 관련 API 호출 — 모든 cs 요청은 이 파일에서 관리
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '알 수 없는 에러' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── 응답 초안 ────────────────────────────────────────────────

/**
 * 고객 문의 분류 + 응답 초안 생성
 * @param {{ inquiry: string, order_no?: string, tone?: 'formal'|'friendly' }} params
 * @returns {{ type: string, draft: string, escalation: { needed: boolean, reason: string } }}
 */
export async function generateResponseDraft({ inquiry, order_no = '', tone = 'formal' }) {
  const res = await fetch(`${BASE_URL}/api/cs/response/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inquiry, order_no, tone }),
  })
  return handleResponse(res)
}

/**
 * 고객 문의 녹취 파일을 텍스트로 변환 (Whisper STT)
 * @param {File} file - 오디오 파일 (mp3, m4a, wav, webm, ogg, mp4 등)
 * @returns {{ text: string }}
 */
export async function transcribeInquiryAudio(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/api/cs/response/transcribe`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

/**
 * 처리 완료 문의 DB 저장
 * @param {{ inquiry_text, order_no?, tone?, main_type, sub_type,
 *            draft, final_response, escalation_needed, escalation_reason, status }} data
 * @returns {{ id: number, created_at: string }}
 */
export async function saveInquiry(data) {
  const res = await fetch(`${BASE_URL}/api/cs/response/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

/**
 * 기간별 문의 로그 CSV 내보내기 → File 객체 반환 (FAQ/VOC 분석용)
 * @param {{ dateFrom?: string, dateTo?: string }} params  YYYY-MM-DD
 * @returns {File}
 */
export async function exportInquiriesCsv({ dateFrom, dateTo } = {}) {
  const blob = await _fetchCsvBlob({ dateFrom, dateTo })
  return new File([blob], 'cs_inquiries.csv', { type: 'text/csv' })
}

/**
 * 기간별 문의 로그 CSV 파일로 저장 (브라우저 다운로드)
 * @param {{ dateFrom?: string, dateTo?: string }} params  YYYY-MM-DD
 */
export async function downloadInquiriesCsv({ dateFrom, dateTo } = {}) {
  const blob     = await _fetchCsvBlob({ dateFrom, dateTo })
  const url      = URL.createObjectURL(blob)
  const filename = _csvFilename(dateFrom, dateTo)
  const a        = document.createElement('a')
  a.href         = url
  a.download     = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function _fetchCsvBlob({ dateFrom, dateTo } = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries({ date_from: dateFrom, date_to: dateTo })
        .filter(([, v]) => v)
    )
  ).toString()
  const res = await fetch(`${BASE_URL}/api/cs/response/export${qs ? '?' + qs : ''}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '내보내기 실패' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.blob()
}

function _csvFilename(dateFrom, dateTo) {
  const from = dateFrom || 'all'
  const to   = dateTo   || 'all'
  return `cs_inquiries_${from}_${to}.csv`
}

// ── FAQ ──────────────────────────────────────────────────────

/**
 * 문의 로그 CSV → FAQ 자동 생성
 * @param {File} file    CSV 파일
 * @param {number} topN  생성할 FAQ 수 (기본 10)
 * @returns {{ faqs: Array<{ category: string, question: string, answer: string }> }}
 */
export async function generateFaqs(file, topN = 10) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/api/cs/faq/generate?top_n=${topN}`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

/**
 * 생성된 FAQ 목록 DB 저장
 * @param {Array<{ category: string, question: string, answer: string }>} faqs
 * @returns {{ saved_count: number }}
 */
export async function saveFaqs(faqs) {
  const res = await fetch(`${BASE_URL}/api/cs/faq/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ faqs }),
  })
  return handleResponse(res)
}

/**
 * DB FAQ 목록 조회
 * @param {{ category?: string, flagged?: boolean, limit?: number, offset?: number }} params
 * @returns {{ total: number, items: Array }}
 */
export async function getFaqs(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString()
  const res = await fetch(`${BASE_URL}/api/cs/faq/${qs ? '?' + qs : ''}`)
  return handleResponse(res)
}

/**
 * FAQ 수정
 * @param {number} faqId
 * @param {{ category?: string, question?: string, answer?: string, flagged?: boolean }} data
 * @returns {{ id, category, question, answer, flagged, updated_at }}
 */
export async function updateFaq(faqId, data) {
  const res = await fetch(`${BASE_URL}/api/cs/faq/${faqId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

// ── 정책 업로드 ──────────────────────────────────────────────

/**
 * 정책 문서(docx) 업로드 → FAQ 영향 분석 → flagged 처리
 * @param {File} file  .docx 파일
 * @returns {{
 *   updated_count: number,
 *   flagged_faqs: Array<{ id: number, question: string, suggested_answer: string, reason: string }>,
 *   message?: string
 * }}
 */
export async function uploadPolicy(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/api/cs/policy/upload`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}

// ── VOC 분석 ─────────────────────────────────────────────────

/**
 * 주간 VOC 분석 리포트 생성
 * @param {File}   file       이번 주 문의 로그 CSV
 * @param {File|null} prevFile 이전 주 문의 로그 CSV (없으면 null)
 * @param {number} threshold  이상 감지 임계값 % (기본 30)
 * @returns {{
 *   period: string,
 *   total_count: number,
 *   prev_count: number|null,
 *   sentiment: { positive: number, neutral: number, negative: number },
 *   top_issues: Array<{ type: string, count: number, change_pct: number|null, cause: string }>,
 *   summary: string
 * }}
 */
export async function analyzeVoc(file, prevFile = null, threshold = 30) {
  const formData = new FormData()
  formData.append('file', file)
  if (prevFile) formData.append('prev_file', prevFile)
  formData.append('threshold', threshold)
  const res = await fetch(`${BASE_URL}/api/cs/voc/analyze`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(res)
}
