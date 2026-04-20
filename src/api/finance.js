// 재무 관련 API 호출 — 모든 finance 요청은 이 파일에서 관리
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '알 수 없는 에러' }))
    throw new Error(err.detail || err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * 영수증 OCR 분석 — 이미지 저장 + 분석 + 중복 탐지
 * @param {File} file
 * @returns {{ receipt_date, vendor, image_path, items, has_duplicates }}
 */
export async function analyzeReceipt(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/api/finance/ocr`, { method: 'POST', body: formData })
  return handleResponse(res)
}

/**
 * 분석 결과를 DB에 저장
 * @param {{ receipt_date, vendor, image_path, items }} data
 * @returns {{ saved: Array }}
 */
export async function saveTransactions(data) {
  const res = await fetch(`${BASE_URL}/api/finance/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

/**
 * DB 전표 내역 조회
 * @param {{ limit?, offset?, account_code?, status?, date_from?, date_to? }} params
 * @returns {{ total: number, items: Array }}
 */
export async function getTransactions(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString()
  const res = await fetch(`${BASE_URL}/api/finance/transactions${qs ? '?' + qs : ''}`)
  return handleResponse(res)
}

/**
 * 전표 수정 (계정과목, 금액, 부가세, 적요)
 * @param {number} id
 * @param {{ account_code?, amount?, tax_amount?, memo? }} data
 */
export async function updateTransaction(id, data) {
  const res = await fetch(`${BASE_URL}/api/finance/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

/**
 * 전표 최종 확정 (status → confirmed)
 * @param {number} id
 */
export async function confirmTransaction(id) {
  const res = await fetch(`${BASE_URL}/api/finance/transactions/${id}/confirm`, {
    method: 'POST',
  })
  return handleResponse(res)
}

/**
 * 확정 전표 엑셀 다운로드
 */
export async function exportConfirmedExcel() {
  const res = await fetch(`${BASE_URL}/api/finance/transactions/export`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '다운로드 실패' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = '확정전표.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * AI 계정과목 추천
 * @param {string} vendor  가맹점명
 * @param {string} notes   지출내역/비고
 * @returns {{ account_code: string }}
 */
export async function suggestAccountCode(vendor, notes) {
  const res = await fetch(`${BASE_URL}/api/finance/suggest-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor, notes }),
  })
  return handleResponse(res)
}

/**
 * 업로드 이미지 URL 반환
 * @param {string|null} imagePath  — DB에 저장된 경로 (예: "uploads/2024-01-01_abc12345.jpg")
 */
export function getImageUrl(imagePath) {
  if (!imagePath) return null
  return `${BASE_URL}/${imagePath}`
}

/**
 * 재무 대시보드 통계 조회 (재무팀 전용)
 * @param {number} year         - 조회 연도
 * @param {string} employeeId   - 로그인 사원번호 (권한 검증용)
 * @returns {{ year, total_budget, this_month, last_month, mom_change, danger_count, dept_stats, monthly_stats }}
 */
export async function getFinanceStats(year, employeeId) {
  const res = await fetch(`${BASE_URL}/api/finance/stats?year=${year}`, {
    headers: { 'x-employee-id': employeeId },
  })
  return handleResponse(res)
}

/**
 * CFO AI 리포트 생성 (gpt-4o-mini)
 * @param {number} year         - 분석 연도
 * @param {string} employeeId   - 로그인 사원번호 (권한 검증용)
 * @returns {{ report: string, year: number }}
 */
export async function generateCfoReport(year, employeeId) {
  const res = await fetch(`${BASE_URL}/api/finance/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-employee-id': employeeId,
    },
    body: JSON.stringify({ year }),
  })
  return handleResponse(res)
}

/**
 * 테스트용 시드 데이터 삽입
 * @returns {{ message, transactions, budgets }}
 */
export async function seedFinanceData() {
  const res = await fetch(`${BASE_URL}/api/finance/seed`, { method: 'POST' })
  return handleResponse(res)
}

// ── 내부감사 (FDS) ────────────────────────────────────────────

/**
 * 이상 지출 탐지 엔진 실행 (Rule-based + AI 분석)
 * @param {string} employeeId
 * @returns {{ message, analyzed, saved, logs }}
 */
export async function runAuditDetection(employeeId) {
  const res = await fetch(`${BASE_URL}/api/finance/audit/run`, {
    method: 'POST',
    headers: { 'x-employee-id': employeeId },
  })
  return handleResponse(res)
}

/**
 * 감사 로그 조회 (전표 정보 포함)
 * @param {{ risk_level?, is_confirmed?, limit?, offset? }} params
 * @param {string} employeeId
 * @returns {{ total, items }}
 */
export async function getAuditLogs(params = {}, employeeId) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString()
  const res = await fetch(`${BASE_URL}/api/finance/audit/logs${qs ? '?' + qs : ''}`, {
    headers: { 'x-employee-id': employeeId },
  })
  return handleResponse(res)
}

/**
 * 감사 로그 확인 처리 (is_confirmed → true)
 * @param {number} logId
 * @param {string} confirmedBy  확인자 이름/사번
 * @param {string} employeeId
 */
export async function confirmAuditLog(logId, confirmedBy, employeeId) {
  const res = await fetch(`${BASE_URL}/api/finance/audit/logs/${logId}/confirm`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-employee-id': employeeId,
    },
    body: JSON.stringify({ confirmed_by: confirmedBy }),
  })
  return handleResponse(res)
}

/**
 * 월간 감사 보고서 생성 (gpt-4o-mini)
 * @param {string} employeeId
 * @returns {{ report, danger_count, warning_count, total_items }}
 */
export async function generateAuditReport(employeeId) {
  const res = await fetch(`${BASE_URL}/api/finance/audit/report`, {
    method: 'POST',
    headers: { 'x-employee-id': employeeId },
  })
  return handleResponse(res)
}
