// SNS 콘텐츠 자동화 페이지 — 인스타그램 · 블로그
import { useState } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { generateSns } from '../../../api/marketing'

// ── 공통 컴포넌트 ────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-5 py-3 mb-5">
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
    </div>
  )
}

function CopyBtn({ text, className = '' }) {
  const [copied, setCopied] = useState(false)
  function handle() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handle} className={`text-xs min-h-[28px] px-2 rounded transition-colors ${className}`}>
      {copied ? '복사됨' : '복사'}
    </button>
  )
}

const CHANNEL_OPTIONS = [
  { value: 'both',      label: '둘 다' },
  { value: 'instagram', label: '인스타그램만' },
  { value: 'blog',      label: '블로그만' },
]

// ── 인스타그램 결과 ──────────────────────────────────────────

function InstagramResult({ data }) {
  const allHashtags = [
    ...(data.hashtags?.popular ?? []),
    ...(data.hashtags?.niche   ?? []),
    ...(data.hashtags?.brand   ?? []),
  ]

  return (
    <div className="rounded-xl border border-pink-200 dark:border-pink-800 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-pink-100 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/20">
        <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm font-semibold text-pink-700 dark:text-pink-300">인스타그램</span>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* 캡션 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">캡션</span>
            <CopyBtn
              text={`${data.hook}\n\n${data.body}\n\n${data.cta}\n\n${allHashtags.join(' ')}`}
              className="text-pink-500 hover:text-pink-700 dark:hover:text-pink-300"
            />
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
            <p className="font-semibold mb-2">{data.hook}</p>
            <p className="mb-2">{data.body}</p>
            <p className="text-pink-600 dark:text-pink-400 font-medium">{data.cta}</p>
          </div>
        </div>

        {/* 해시태그 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              해시태그 ({allHashtags.length}개)
            </span>
            <CopyBtn
              text={allHashtags.join(' ')}
              className="text-pink-500 hover:text-pink-700 dark:hover:text-pink-300"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.hashtags?.popular?.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300">{tag}</span>
            ))}
            {data.hashtags?.niche?.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{tag}</span>
            ))}
            {data.hashtags?.brand?.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">{tag}</span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            <span className="inline-block w-2 h-2 rounded-full bg-pink-400 mr-1" />인기태그
            <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mx-1 ml-3" />틈새태그
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mx-1 ml-3" />브랜드태그
          </p>
        </div>
      </div>
    </div>
  )
}

// ── 블로그 결과 ──────────────────────────────────────────────

function BlogResult({ data }) {
  const fullContent = [
    `# ${data.seo_title}`,
    `\n메타 설명: ${data.meta_description}`,
    ...(data.sections ?? []).map(s => `\n## ${s.heading}\n${s.content}`),
  ].join('\n')

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">블로그</span>
        <div className="ml-auto">
          <CopyBtn text={fullContent} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300" />
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* SEO 제목 + 메타 설명 */}
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 p-4">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">SEO 제목</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">{data.seo_title}</p>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">메타 설명</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{data.meta_description}</p>
          <p className="text-xs text-gray-400 mt-1">{data.meta_description?.length ?? 0}자</p>
        </div>

        {/* 섹션 본문 */}
        <div className="flex flex-col gap-3">
          {(data.sections ?? []).map((section, i) => (
            <div key={i} className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">H2 소제목</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{section.heading}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>

        {/* 내부 링크 추천 */}
        {data.internal_link_suggestions?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">내부 링크 추천 주제</p>
            <div className="flex flex-wrap gap-1.5">
              {data.internal_link_suggestions.map((link, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
                  {link}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function SnsPage() {
  const [topic,    setTopic]    = useState('')
  const [message,  setMessage]  = useState('')
  const [channel,  setChannel]  = useState('both')
  const [keywords, setKeywords] = useState('')
  const [extra,    setExtra]    = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [result,  setResult]  = useState(null)

  async function handleGenerate() {
    if (!topic.trim() || !message.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await generateSns({ topic, message, channel, keywords, extra })
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: '마케팅/PR팀', to: '/frontoffice/marketing' },
          { label: 'SNS 콘텐츠 자동화' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office · 마케팅/PR팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              SNS 콘텐츠 자동화
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          콘텐츠 주제와 핵심 메시지를 입력하면 인스타그램 캡션·해시태그와 SEO 최적화 블로그 초안을 동시에 생성합니다.
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">콘텐츠 정보 입력</h3>

        <div className="flex flex-col gap-4">
          {/* 채널 선택 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">타겟 채널</label>
            <div className="flex gap-2">
              {CHANNEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setChannel(opt.value)}
                  className={`min-h-[36px] px-4 text-xs font-medium rounded-lg border transition-colors ${
                    channel === opt.value
                      ? 'border-amber-400 bg-amber-500 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 주제 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                콘텐츠 주제 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="예) 신제품 X1 Pro 출시 소식"
                className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* SEO 키워드 (블로그용) */}
            {channel !== 'instagram' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  SEO 타겟 키워드 <span className="text-gray-400">(블로그용, 선택)</span>
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="예) 초경량 노트북, 배터리 오래가는 노트북"
                  className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            )}
          </div>

          {/* 핵심 메시지 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              핵심 메시지 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="예) 무게 280g, 배터리 48시간으로 이동하는 전문가를 위한 최고의 선택"
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 추가 정보 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              추가 정보 <span className="text-gray-400">(제품 스펙, 이벤트 날짜 등, 선택)</span>
            </label>
            <textarea
              value={extra}
              onChange={e => setExtra(e.target.value)}
              rows={2}
              placeholder="예) 출시일 2026-04-20, 가격 149만원, 색상 스페이스 그레이·실버"
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={!topic.trim() || !message.trim() || loading}
        className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
          disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-semibold transition-colors mb-6
          flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />콘텐츠 생성 중...</> : 'SNS 콘텐츠 생성'}
      </button>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!result && !loading && !error && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm text-gray-400">주제와 핵심 메시지를 입력하고 생성 버튼을 누르면<br />SNS 콘텐츠 초안이 여기에 표시됩니다.</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-sm text-gray-400">채널별 콘텐츠를 생성하는 중...</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="flex flex-col gap-5">
          {result.instagram && <InstagramResult data={result.instagram} />}
          {result.blog      && <BlogResult      data={result.blog} />}
        </div>
      )}
    </div>
  )
}
