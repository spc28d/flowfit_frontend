// 보도자료 작성 페이지 — 신제품 · 이벤트 · 실적
import { useState } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { generatePress } from '../../../api/marketing'

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

function CopyBtn({ text, label = '복사', className = '' }) {
  const [copied, setCopied] = useState(false)
  function handle() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handle} className={`text-xs min-h-[28px] px-2 rounded transition-colors ${className}`}>
      {copied ? '복사됨' : label}
    </button>
  )
}

const TYPE_OPTIONS = [
  {
    value: '신제품',
    desc: '헤드라인 → 리드 → 제품 상세 → 임원 인용 → 가용성·가격 → 회사 소개',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    ),
  },
  {
    value: '이벤트',
    desc: '헤드라인 → 리드 → 이벤트 개요 → 일정·장소 → 참여 방법 → 문의처',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
  },
  {
    value: '실적',
    desc: '헤드라인 → 핵심 수치 → 성장 배경 → 임원 코멘트 → 전망 → 투자자 주의문',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
]

const MEDIA_OPTIONS = ['IT', '경제', '생활']

const RESULT_TABS = [
  { id: 'press',    label: '보도자료 전문' },
  { id: 'email',    label: '배포 이메일' },
  { id: 'sns',      label: 'SNS 요약' },
]

// ── 메인 페이지 ──────────────────────────────────────────────

export default function PressPage() {
  const [pressType,    setPressType]    = useState('신제품')
  const [facts,        setFacts]        = useState('')
  const [quotePerson,  setQuotePerson]  = useState('')
  const [mediaType,    setMediaType]    = useState('IT')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [result,  setResult]  = useState(null)
  const [activeTab, setActiveTab] = useState('press')

  async function handleGenerate() {
    if (!facts.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await generatePress({
        press_type:   pressType,
        facts,
        quote_person: quotePerson,
        media_type:   mediaType,
      })
      setResult(data)
      setActiveTab('press')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedType = TYPE_OPTIONS.find(t => t.value === pressType)

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: '마케팅/PR팀', to: '/frontoffice/marketing' },
          { label: '보도자료 작성' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office · 마케팅/PR팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              보도자료 작성
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          유형을 선택하고 핵심 팩트를 입력하면 언론사 표준 포맷의 보도자료와 배포용 이메일·SNS 발표문을 자동 생성합니다.
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">보도자료 정보 입력</h3>

        {/* 유형 선택 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            보도자료 유형 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPressType(opt.value)}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  pressType === opt.value
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <svg className={`w-4 h-4 shrink-0 ${pressType === opt.value ? 'text-amber-500' : 'text-gray-400'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {opt.icon}
                  </svg>
                  <span className={`text-sm font-semibold ${pressType === opt.value ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {opt.value}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 인용구 주체 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              인용구 주체
            </label>
            <input
              type="text"
              value={quotePerson}
              onChange={e => setQuotePerson(e.target.value)}
              placeholder="예) 홍길동 테크원 대표이사"
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 배포 대상 매체 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              배포 대상 매체
            </label>
            <div className="flex gap-2">
              {MEDIA_OPTIONS.map(m => (
                <button
                  key={m}
                  onClick={() => setMediaType(m)}
                  className={`flex-1 min-h-[44px] text-sm font-medium rounded-xl border transition-colors ${
                    mediaType === m
                      ? 'border-amber-400 bg-amber-500 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 핵심 팩트 */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              핵심 팩트 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={facts}
              onChange={e => setFacts(e.target.value)}
              rows={4}
              placeholder={
                pressType === '신제품' ? '예) 제품명: X1 Pro, 출시일: 2026-04-20, 가격: 149만원, 주요 특징: 무게 280g·배터리 48시간' :
                pressType === '이벤트' ? '예) 이벤트명: 테크원 고객 감사제, 일시: 2026-05-10, 장소: 코엑스 B홀, 참가 혜택: 20% 할인 쿠폰' :
                '예) 2025년 연간 매출: 1,200억원(전년 대비 +32%), 영업이익: 180억원, 신규 고객사: 45개사'
              }
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={!facts.trim() || loading}
        className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
          disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-semibold transition-colors mb-6
          flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />보도자료 생성 중...</> : '보도자료 자동 생성'}
      </button>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!result && !loading && !error && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-400">유형을 선택하고 핵심 팩트를 입력하면<br />보도자료 초안이 여기에 표시됩니다.</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-sm text-gray-400">언론사 표준 포맷으로 보도자료를 작성하는 중...</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="flex flex-col gap-5">
          {/* 헤드라인 + 배포일 */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">헤드라인</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{result.headline}</p>
                {result.release_date && (
                  <p className="text-xs text-gray-400 mt-2">{result.release_date} | 즉시 배포 가능</p>
                )}
              </div>
              <CopyBtn
                text={result.headline}
                className="text-amber-600 dark:text-amber-400 hover:underline shrink-0"
              />
            </div>
          </div>

          {/* 탭 */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {RESULT_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-gray-900'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* 보도자료 전문 */}
              {activeTab === 'press' && (
                <div className="flex flex-col gap-4">
                  {result.quote && (
                    <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">임원 인용구 초안</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 italic leading-relaxed">{result.quote}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">본문</span>
                    <CopyBtn
                      text={`${result.headline}\n\n${result.body}`}
                      label="전체 복사"
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    />
                  </div>
                  <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    {result.body}
                  </pre>
                </div>
              )}

              {/* 배포 이메일 */}
              {activeTab === 'email' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">제목</span>
                      <CopyBtn text={result.email_subject} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{result.email_subject}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">본문</span>
                      <CopyBtn
                        text={`제목: ${result.email_subject}\n\n${result.email_body}`}
                        label="전체 복사"
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      />
                    </div>
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      {result.email_body}
                    </pre>
                  </div>
                </div>
              )}

              {/* SNS 요약 */}
              {activeTab === 'sns' && (
                <div className="flex flex-col gap-4">
                  {/* 링크드인 */}
                  <div className="rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-800">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">LinkedIn</span>
                      <CopyBtn text={result.sns_linkedin} className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300" />
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed p-4 whitespace-pre-wrap">
                      {result.sns_linkedin}
                    </p>
                  </div>

                  {/* X (트위터) */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">X (트위터)</span>
                        <span className={`text-xs tabular-nums ${(result.sns_x?.length ?? 0) > 140 ? 'text-red-500' : 'text-gray-400'}`}>
                          {result.sns_x?.length ?? 0}/140자
                        </span>
                      </div>
                      <CopyBtn text={result.sns_x} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed p-4">
                      {result.sns_x}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
