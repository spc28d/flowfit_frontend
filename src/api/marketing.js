// 마케팅 관련 API 호출 — 모든 marketing 요청은 이 파일에서 관리
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '알 수 없는 에러' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * 광고 카피 A/B/C 3종 + 슬로건 + 배너 문구 생성
 * @param {{
 *   product_name: string,
 *   features: string,
 *   goal: '인지'|'전환'|'리텐션',
 *   persona?: string,
 *   channel?: string,
 *   tone?: '공식체'|'친근체'|'MZ감성'
 * }} params
 * @returns {{
 *   versions: Array<{ label: string, style: string, headline: string, subcopy: string, cta: string }>,
 *   slogans: string[],
 *   banner: string
 * }}
 */
/**
 * SNS 콘텐츠 자동화 — 인스타그램·블로그 동시 생성
 * @param {{
 *   topic: string,
 *   message: string,
 *   channel?: 'instagram'|'blog'|'both',
 *   keywords?: string,
 *   extra?: string
 * }} params
 * @returns {{
 *   instagram?: { hook, body, cta, hashtags: { popular, niche, brand } },
 *   blog?: { seo_title, meta_description, sections, internal_link_suggestions }
 * }}
 */
export async function generateSns(params) {
  const res = await fetch(`${BASE_URL}/api/marketing/sns/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleResponse(res)
}

/**
 * 보도자료 전문 + 이메일 초안 + SNS 요약문 생성
 * @param {{
 *   press_type: '신제품'|'이벤트'|'실적',
 *   facts: string,
 *   quote_person?: string,
 *   media_type?: 'IT'|'경제'|'생활'
 * }} params
 * @returns {{
 *   headline, release_date, body, quote,
 *   email_subject, email_body, sns_linkedin, sns_x
 * }}
 */
export async function generatePress(params) {
  const res = await fetch(`${BASE_URL}/api/marketing/press/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleResponse(res)
}

/**
 * 캠페인 이미지 생성 — DALL-E 3
 * @param {{
 *   product_name: string,
 *   description: string,
 *   style?: string,
 *   size?: '1024x1024'|'1024x1792'|'1792x1024'
 * }} params
 * @returns {{ image_url: string, revised_prompt: string }}
 */
export async function generateImage(params) {
  const res = await fetch(`${BASE_URL}/api/marketing/image/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleResponse(res)
}

export async function generateCopy(params) {
  const res = await fetch(`${BASE_URL}/api/marketing/copy/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return handleResponse(res)
}
