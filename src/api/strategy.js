// 전략/기획팀 API — 모든 API 호출은 이 파일에서만 수행
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * 경쟁사 동향 리서치 SSE 스트리밍
 * @param {string[]} companies  - 경쟁사 이름 목록 (1~3개)
 * @param {string[]} categories - 조사 카테고리 목록
 * @param {{
 *   onStatus:        (event) => void,   // { company, index, total, phase }
 *   onCompanyResult: (event) => void,   // { company, index, articles, analysis }
 *   onToken:         (content) => void, // 종합 시사점 토큰
 *   onDone:          () => void,
 *   onError:         (msg) => void,
 * }} callbacks
 * @returns {AbortController}
 */
export function streamCompetitorResearch(companies, categories, callbacks) {
  const { onStatus, onCompanyResult, onToken, onDone, onError } = callbacks
  const controller = new AbortController()

  fetch(`${BASE_URL}/api/strategy/competitor/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companies, categories }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: '요청에 실패했습니다.' }))
        onError?.(err.detail || '요청에 실패했습니다.')
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const event = JSON.parse(part.slice(6))
            if      (event.type === 'status')         onStatus?.(event)
            else if (event.type === 'company_result') onCompanyResult?.(event)
            else if (event.type === 'token')          onToken?.(event.content)
            else if (event.type === 'done')           onDone?.()
          } catch {
            // JSON 파싱 오류 무시
          }
        }
      }
    })
    .catch((err) => {
      if (err.name === 'AbortError') return
      onError?.(err.message || '네트워크 오류가 발생했습니다.')
    })

  return controller
}

/**
 * 회사명으로 주식 종목 코드 자동 탐색
 * @param {string} companyName
 * @returns {Promise<{ found: boolean, ticker: string, exchange: string, company_name: string }>}
 */
export async function searchTicker(companyName) {
  const res = await fetch(`${BASE_URL}/api/strategy/ticker/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_name: companyName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '종목 탐색에 실패했습니다.' }))
    throw new Error(err.detail || '종목 탐색에 실패했습니다.')
  }
  return res.json()
}

/**
 * 종목 코드 목록으로 재무 지표 일괄 조회
 * @param {string[]} tickers
 * @returns {Promise<Record<string, object>>}  { ticker: { metric: value } }
 */
export async function getFinancialData(tickers) {
  const res = await fetch(`${BASE_URL}/api/strategy/financial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickers }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '재무 데이터 조회에 실패했습니다.' }))
    throw new Error(err.detail || '재무 데이터 조회에 실패했습니다.')
  }
  return res.json()
}

/**
 * 회사명 기반 경쟁사 AI 추천
 * @param {string} companyName
 * @returns {Promise<{ suggestions: string[] }>}
 */
export async function suggestCompetitors(companyName) {
  const res = await fetch(`${BASE_URL}/api/strategy/competitor/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_name: companyName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '추천에 실패했습니다.' }))
    throw new Error(err.detail || '추천에 실패했습니다.')
  }
  return res.json()
}

/**
 * 경쟁사 리서치 결과 PPTX 다운로드
 * @param {{ name, articles, analysis }[]} companies
 * @param {string} summary
 * @param {string[]} categories
 * @param {Record<string, object>} financialData  - { ticker: { metric: value } }
 * @param {Record<string, object>} tickerMap      - { companyName: { ticker, exchange, found } }
 */
export async function downloadResearchPptx(companies, summary, categories, financialData = {}, tickerMap = {}) {
  const res = await fetch(`${BASE_URL}/api/strategy/competitor/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companies,
      summary,
      categories,
      financial_data: financialData,
      ticker_map:     tickerMap,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'PPTX 다운로드에 실패했습니다.' }))
    throw new Error(err.detail || 'PPTX 다운로드에 실패했습니다.')
  }
  return res.blob()
}
