// 카피라이팅 생성 페이지
import { useState } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { generateCopy, generateImage } from '../../../api/marketing'

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

function CopyButton({ text, children, className = '' }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 text-xs min-h-[28px] px-2 rounded transition-colors ${className}`}
    >
      {copied ? '복사됨' : children}
    </button>
  )
}

const IMAGE_STYLE_OPTIONS = [
  { value: '모던하고 세련된', label: '모던·세련' },
  { value: '따뜻하고 감성적인', label: '감성·따뜻' },
  { value: '강렬하고 역동적인', label: '강렬·역동' },
  { value: '미니멀하고 깔끔한', label: '미니멀' },
  { value: '럭셔리하고 고급스러운', label: '럭셔리' },
  { value: '자연친화적이고 친환경적인', label: '자연·친환경' },
]

const IMAGE_SIZE_OPTIONS = [
  { value: '1024x1024', label: '정사각형 (1:1)', desc: 'SNS 피드' },
  { value: '1792x1024', label: '가로형 (16:9)', desc: '배너·웹' },
  { value: '1024x1792', label: '세로형 (9:16)', desc: '스토리·릴스' },
]

const GOAL_OPTIONS  = ['인지', '전환', '리텐션']
const TONE_OPTIONS  = ['공식체', '친근체', 'MZ감성']
const CHANNEL_OPTIONS = ['온라인광고', '인스타그램', '유튜브', '옥외광고', '이메일']

const VERSION_COLORS = {
  A: 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20',
  B: 'border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/20',
  C: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/20',
}
const VERSION_BADGE = {
  A: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
  B: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  C: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function CopywritingPage() {
  // 입력
  const [productName, setProductName] = useState('')
  const [features,    setFeatures]    = useState('')
  const [goal,        setGoal]        = useState('인지')
  const [persona,     setPersona]     = useState('')
  const [channels,    setChannels]    = useState([])
  const [tone,        setTone]        = useState('공식체')

  // 상태
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [result,  setResult]  = useState(null)
  // result = { versions: [{label, style, headline, subcopy, cta}], slogans: [], banner: '' }

  // 선택된 버전 탭
  const [activeVersion, setActiveVersion] = useState('A')

  // 이미지 생성
  const [imgStyle, setImgStyle]     = useState('모던하고 세련된')
  const [imgSize, setImgSize]       = useState('1024x1024')
  const [imgLoading, setImgLoading] = useState(false)
  const [imgError, setImgError]     = useState(null)
  const [imgResult, setImgResult]   = useState(null)
  const [imgOpen, setImgOpen]       = useState(false) // 옵션 패널 열림 여부

  function toggleChannel(ch) {
    setChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    )
  }

  async function handleGenerate() {
    if (!productName.trim() || !features.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await generateCopy({
        product_name: productName,
        features,
        goal,
        persona,
        channel: channels.join(', ') || '미지정',
        tone,
      })
      setResult(data)
      setActiveVersion('A')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImageGenerate() {
    if (!productName.trim()) return
    const desc = `${productName} 광고 이미지. 핵심 특장점: ${features}. 캠페인 목표: ${goal}. 톤: ${tone}.`
    setImgLoading(true)
    setImgError(null)
    setImgResult(null)
    try {
      const data = await generateImage({
        product_name: productName,
        description: desc,
        style: imgStyle,
        size: imgSize,
      })
      setImgResult(data)
    } catch (e) {
      setImgError(e.message)
    } finally {
      setImgLoading(false)
    }
  }

  async function handleImageDownload() {
    if (!imgResult?.image_url) return
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const filename = `${productName.trim() || 'campaign'}_image.png`
    const proxyUrl = `${baseUrl}/api/marketing/image/download?url=${encodeURIComponent(imgResult.image_url)}&filename=${encodeURIComponent(filename)}`
    try {
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setImgError('이미지 저장에 실패했습니다. 이미지를 우클릭하여 직접 저장해 주세요.')
    }
  }

  const activeVer = result?.versions?.find(v => v.label === activeVersion)

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: '마케팅/PR팀', to: '/frontoffice/marketing' },
          { label: '카피라이팅 생성' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office · 마케팅/PR팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              카피라이팅 생성
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          제품 정보와 캠페인 목표를 입력하면 A/B/C 3가지 스타일의 광고 카피와 슬로건을 자동 생성합니다.
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">캠페인 정보 입력</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 제품명 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="예) 테크원 X1 Pro"
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 타겟 페르소나 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              타겟 페르소나
            </label>
            <input
              type="text"
              value={persona}
              onChange={e => setPersona(e.target.value)}
              placeholder="예) 이동이 잦은 30대 직장인"
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 핵심 특장점 */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              핵심 특장점 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={features}
              onChange={e => setFeatures(e.target.value)}
              rows={3}
              placeholder="예) 무게 280g, 배터리 48시간, 기존 대비 40% 경량화"
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {/* 캠페인 목표 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              캠페인 목표
            </label>
            <div className="flex gap-1.5">
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`flex-1 text-xs font-medium min-h-[36px] rounded-lg border transition-colors ${
                    goal === g
                      ? 'border-amber-400 bg-amber-500 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 톤앤매너 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              톤앤매너
            </label>
            <div className="flex gap-1.5">
              {TONE_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`flex-1 text-xs font-medium min-h-[36px] rounded-lg border transition-colors ${
                    tone === t
                      ? 'border-amber-400 bg-amber-500 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 채널 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              채널 (복수 선택)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CHANNEL_OPTIONS.map(ch => (
                <button
                  key={ch}
                  onClick={() => toggleChannel(ch)}
                  className={`text-xs font-medium min-h-[32px] px-2.5 rounded-lg border transition-colors ${
                    channels.includes(ch)
                      ? 'border-amber-400 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={!productName.trim() || !features.trim() || loading}
        className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
          disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-semibold transition-colors mb-6
          flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />카피 생성 중...</> : '카피 자동 생성'}
      </button>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!result && !loading && !error && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p className="text-sm text-gray-400">제품 정보를 입력하고 생성 버튼을 누르면<br />A/B/C 카피 초안이 여기에 표시됩니다.</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-sm text-gray-400">브랜드 톤에 맞는 카피를 생성하는 중...</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="flex flex-col gap-5">

          {/* A/B/C 버전 탭 */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* 탭 헤더 */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {result.versions.map(ver => (
                <button
                  key={ver.label}
                  onClick={() => setActiveVersion(ver.label)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                    activeVersion === ver.label
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-gray-900'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {ver.label}버전
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${VERSION_BADGE[ver.label]}`}>
                    {ver.style}
                  </span>
                </button>
              ))}
            </div>

            {/* 선택된 버전 카드 */}
            {activeVer && (
              <div className={`p-5 border-l-4 ${VERSION_COLORS[activeVer.label]}`}>
                {/* 헤드라인 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">헤드라인</span>
                    <CopyButton
                      text={activeVer.headline}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      복사
                    </CopyButton>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                    "{activeVer.headline}"
                  </p>
                </div>

                {/* 서브카피 */}
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">서브카피</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {activeVer.subcopy}
                  </p>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">CTA</span>
                    <span className="inline-block text-sm font-semibold px-4 py-1.5 rounded-full bg-amber-500 text-white">
                      {activeVer.cta}
                    </span>
                  </div>
                  <CopyButton
                    text={`[${activeVer.label}버전 · ${activeVer.style}]\n헤드라인: ${activeVer.headline}\n서브카피: ${activeVer.subcopy}\nCTA: ${activeVer.cta}`}
                    className="text-amber-600 dark:text-amber-400 hover:underline mt-4"
                  >
                    전체 복사
                  </CopyButton>
                </div>
              </div>
            )}
          </div>

          {/* 슬로건 후보 */}
          {result.slogans?.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <span className="text-sm font-semibold text-gray-800 dark:text-white">슬로건 후보 {result.slogans.length}개</span>
              </div>
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {result.slogans.map((slogan, i) => (
                  <li key={i} className="flex items-center justify-between px-5 py-3 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-800 dark:text-white font-medium">{slogan}</span>
                    </div>
                    <CopyButton
                      text={slogan}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                    >
                      복사
                    </CopyButton>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 배너·옥외광고 축약 */}
          {result.banner && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">배너·옥외광고 축약 문구</span>
                <CopyButton
                  text={result.banner}
                  className="text-amber-600 dark:text-amber-400 hover:underline"
                >
                  복사
                </CopyButton>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {result.banner}
              </p>
            </div>
          )}

          {/* ── 캠페인 이미지 생성 섹션 ── */}

          {/* 이미지 미생성 + 로딩 아닌 상태 → 생성 버튼 */}
          {!imgResult && !imgLoading && (
            <div className="flex flex-col gap-3">
              <button
                onClick={handleImageGenerate}
                disabled={imgLoading}
                className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700
                  hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20
                  text-amber-600 dark:text-amber-400 text-sm font-semibold transition-colors
                  flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                캠페인 이미지 생성
              </button>
              <ErrorBanner message={imgError} />
            </div>
          )}

          {/* 이미지 로딩 */}
          {imgLoading && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-10 flex flex-col items-center gap-3">
              <svg className="w-8 h-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI가 캠페인에 맞는 이미지를 생성하는 중...</p>
              <p className="text-xs text-gray-300 dark:text-gray-500">약 15~30초 소요됩니다</p>
            </div>
          )}

          {/* 이미지 결과 */}
          {imgResult && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-800 dark:text-white">캠페인 이미지</span>
              </div>

              {/* 이미지 프리뷰 */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/30 flex justify-center">
                <img
                  src={imgResult.image_url}
                  alt={`${productName} 캠페인 이미지`}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  style={{ maxHeight: '500px' }}
                />
              </div>

              <div className="p-4 flex flex-col gap-3">
                {/* 스타일·비율 옵션 (접이식) */}
                <button
                  onClick={() => setImgOpen(prev => !prev)}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors self-start"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${imgOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  스타일·비율 변경
                </button>

                {imgOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">스타일</label>
                      <div className="flex flex-wrap gap-1.5">
                        {IMAGE_STYLE_OPTIONS.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setImgStyle(s.value)}
                            className={`text-xs font-medium min-h-[32px] px-2.5 rounded-lg border transition-colors ${
                              imgStyle === s.value
                                ? 'border-amber-400 bg-amber-500 text-white'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">비율</label>
                      <div className="flex gap-1.5">
                        {IMAGE_SIZE_OPTIONS.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setImgSize(s.value)}
                            className={`flex-1 flex flex-col items-center py-2 rounded-lg border transition-colors ${
                              imgSize === s.value
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                                : 'border-gray-200 dark:border-gray-600 hover:border-amber-300'
                            }`}
                          >
                            <span className={`text-xs font-semibold ${
                              imgSize === s.value ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'
                            }`}>{s.label}</span>
                            <span className="text-[10px] text-gray-400">{s.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 저장 / 다시 생성 버튼 */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleImageDownload}
                    className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border-2 border-amber-400 text-amber-600 dark:text-amber-400 font-semibold text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    저장
                  </button>
                  <button
                    onClick={handleImageGenerate}
                    disabled={imgLoading}
                    className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    다시 생성
                  </button>
                </div>

                <ErrorBanner message={imgError} />

                {/* 광고 법률 준수 가이드라인 */}
                {imgResult.legal_guidelines && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                        광고 법률 준수 검토
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                      {imgResult.legal_guidelines.guidelines}
                    </p>
                    {imgResult.legal_guidelines.prohibited?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {imgResult.legal_guidelines.prohibited.map((item, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                    {imgResult.legal_guidelines.sources?.length > 0 && (
                      <p className="text-[11px] text-gray-400">
                        참조: {imgResult.legal_guidelines.sources.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
