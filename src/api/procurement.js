// 총무/구매팀 API — 모든 API 호출은 이 파일에서만 수행
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * 구매 AI 에이전트 SSE 스트리밍
 * @param {string} message - 구매 요청 자연어
 * @param {string} department - 요청 부서명
 * @param {{
 *   onToolStart: (event: {tool: string, args: object}) => void,
 *   onToolDone:  (event: {tool: string, result: object}) => void,
 *   onToken:     (content: string) => void,
 *   onDone:      () => void,
 *   onError:     (message: string) => void,
 * }} callbacks
 * @returns {AbortController} — abort()로 스트림 취소 가능
 */
export function streamProcurementAgent(message, department, callbacks) {
  const { onToolStart, onToolDone, onToken, onDone, onError } = callbacks
  const controller = new AbortController()

  fetch(`${BASE_URL}/api/procurement/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, department }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: '요청에 실패했습니다.' }))
        onError?.(err.detail || '요청에 실패했습니다.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        // SSE는 \n\n으로 이벤트 경계 구분
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const event = JSON.parse(part.slice(6))
            if (event.type === 'tool_start') onToolStart?.(event)
            else if (event.type === 'tool_done') onToolDone?.(event)
            else if (event.type === 'token') onToken?.(event.content)
            else if (event.type === 'done') onDone?.()
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
 * 구매견적서 DOCX / PDF 다운로드
 * @param {"docx"|"pdf"} format
 * @param {object} reportData - report_text, order_id, department, item_name, ... 포함
 */
export async function downloadEstimate(format, reportData) {
  const res = await fetch(`${BASE_URL}/api/procurement/agent/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, ...reportData }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '다운로드에 실패했습니다.' }))
    throw new Error(err.detail || '다운로드에 실패했습니다.')
  }
  return res.blob()
}

// 견적서 OCR 분석 — 추후 구현
export async function analyzeQuotes(formData) {
  const res = await fetch(`${BASE_URL}/api/procurement/quote`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '분석에 실패했습니다.' }))
    throw new Error(err.detail || '분석에 실패했습니다.')
  }
  return res.json()
}

// 구매 정책 챗봇 — 추후 구현
export async function chatProcurementPolicy(messages) {
  const res = await fetch(`${BASE_URL}/api/procurement/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '응답 생성에 실패했습니다.' }))
    throw new Error(err.detail || '응답 생성에 실패했습니다.')
  }
  return res.json()
}

// 자산 실사 보고서 생성 — 추후 구현
export async function generateAssetReport(assetData) {
  const res = await fetch(`${BASE_URL}/api/procurement/asset/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assetData),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '보고서 생성에 실패했습니다.' }))
    throw new Error(err.detail || '보고서 생성에 실패했습니다.')
  }
  return res.json()
}

// 자산 실사 보고서 DOCX 다운로드 — 추후 구현
export async function downloadAssetReportDocx(reportId) {
  const res = await fetch(`${BASE_URL}/api/procurement/asset/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report_id: reportId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '다운로드에 실패했습니다.' }))
    throw new Error(err.detail || '다운로드에 실패했습니다.')
  }
  return res.blob()
}
