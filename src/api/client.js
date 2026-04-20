// API 클라이언트 기본 설정 - 모든 API 호출은 이 파일을 통해 관리
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * 기본 fetch 래퍼 - 공통 헤더 및 에러 처리 포함
 */
export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '알 수 없는 에러가 발생했습니다.' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response
}

/**
 * 스트리밍 응답 처리 - Claude API 스트리밍용
 */
export async function streamRequest(endpoint, body, onChunk) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '스트리밍 요청 실패' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    onChunk(chunk)
  }
}
