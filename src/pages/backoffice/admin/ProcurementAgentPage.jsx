// 구매 AI 에이전트 — 자연어 구매 요청 → 상위 3개 상품 선별·링크 제공·예산 확인·주문서 생성
import { useEffect, useRef, useState } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { getAuthSession } from '../../../api/auth'
import { streamProcurementAgent, downloadEstimate } from '../../../api/procurement'

// ── 툴 한국어 레이블 ─────────────────────────────────────────
const TOOL_LABELS = {
  search_products:       { label: '상품 가격·판매처 검색', icon: '🔍' },
  check_budget:          { label: '예산 잔액 조회',        icon: '💰' },
  create_purchase_order: { label: '구매 주문서 생성',      icon: '📋' },
}

// ── 순위 배지 색상 ───────────────────────────────────────────
const RANK_STYLE = [
  'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
  'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
]

// ── 추천 요청 샘플 ───────────────────────────────────────────
const SUGGESTIONS = [
  '사무용 의자 10개 구매가 필요합니다.',
  'A4 용지 100박스를 구매하려 합니다.',
  '노트북 5대 구매 요청드립니다.',
  '프린터 카트리지 20개 주문해 주세요.',
]

// ── URL → '링크' 클릭 가능 텍스트 파서 ─────────────────────
const URL_REGEX = /https?:\/\/[^\s\)\]>,'"]+/g

function LinkifiedText({ text }) {
  if (!text) return null

  const parts = []
  let last = 0
  let match

  URL_REGEX.lastIndex = 0
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    const url = match[0]
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
      >
        링크
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    )
    last = match.index + url.length
  }

  if (last < text.length) {
    parts.push(text.slice(last))
  }

  return <>{parts}</>
}

// ── 로딩 점 애니메이션 ───────────────────────────────────────
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

// ── 상위 3개 후보 카드 (구매 링크 포함) ──────────────────────
function TopCandidatesCard({ candidates, selectedRank }) {
  if (!candidates || candidates.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        상위 {candidates.length}개 추천 상품
      </p>
      {candidates.map((c) => {
        const isSelected = c.rank === selectedRank
        const rankIdx = Math.min(c.rank - 1, 2)

        return (
          <div
            key={c.rank}
            className={`rounded-xl border px-4 py-3 transition-all
              ${isSelected
                ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40 shadow-sm'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
              }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                {/* 순위 배지 */}
                <span
                  className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border text-xs font-bold
                    flex items-center justify-center ${RANK_STYLE[rankIdx]}`}
                >
                  {c.rank}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {c.name}
                    </p>
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-medium shrink-0">
                        최종 선택
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {c.vendor}
                  </p>
                  {c.reason && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      {c.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* 가격 + 구매 링크 */}
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {c.price ? c.price.toLocaleString() + '원' : '가격 미확인'}
                </p>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium
                      text-blue-600 dark:text-blue-400 hover:underline min-h-[28px]"
                  >
                    구매하기
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 툴 실행 카드 ─────────────────────────────────────────────
function ToolStepCard({ step }) {
  const [expanded, setExpanded] = useState(false)
  const meta   = TOOL_LABELS[step.tool] ?? { label: step.tool, icon: '⚙️' }
  const isDone = step.status === 'done'
  const isError = step.result?.error

  // 주문서 카드는 기본 펼침 (상위 3개 바로 표시)
  const [orderExpanded, setOrderExpanded] = useState(true)

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm transition-all
        ${isDone
          ? isError
            ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
            : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
          : 'border-blue-200 bg-white dark:border-blue-800 dark:bg-gray-900'
        }`}
    >
      {/* 헤더 행 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base shrink-0">{meta.icon}</span>
          <span className="font-semibold text-gray-900 dark:text-white truncate">
            {meta.label}
          </span>
          {!isDone && <span className="ml-1"><TypingDots /></span>}
          {isDone && !isError && (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0">완료</span>
          )}
          {isDone && isError && (
            <span className="text-xs font-medium text-red-600 dark:text-red-400 shrink-0">오류</span>
          )}
        </div>
        {isDone && step.tool !== 'create_purchase_order' && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 min-h-[32px] px-2"
          >
            {expanded ? '접기 ▲' : '상세 ▼'}
          </button>
        )}
      </div>

      {/* 인자 요약 */}
      {step.args && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
          {Object.entries(step.args)
            .filter(([k]) => !['max_results', 'top_candidates', 'selected_candidate_rank'].includes(k))
            .map(([k, v]) => `${k}: ${v}`)
            .join(' · ')}
        </p>
      )}

      {/* 상세 결과 */}
      {isDone && !isError && (
        <>
          {/* search_products / check_budget — 토글 방식 */}
          {(step.tool === 'search_products' || step.tool === 'check_budget') && expanded && (
            <div className="mt-3 rounded-lg bg-white/70 dark:bg-gray-800/70 p-3 text-xs
              text-gray-700 dark:text-gray-300 space-y-1 max-h-52 overflow-y-auto">
              <ResultDetail tool={step.tool} result={step.result} />
            </div>
          )}

          {/* create_purchase_order — 상위 3개 카드 항상 표시 */}
          {step.tool === 'create_purchase_order' && step.result && (
            <div className="mt-3">
              {/* 주문서 요약 */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-700 dark:text-gray-300">
                <span>
                  주문번호{' '}
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    #{step.result.order_id}
                  </span>
                </span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span>{step.result.item_name} × {step.result.quantity}개</span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="font-semibold">
                  {(step.result.total_amount ?? 0).toLocaleString()}원
                </span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="inline-block px-2 py-0.5 rounded-full
                  bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                  {step.result.status}
                </span>
                <button
                  type="button"
                  onClick={() => setOrderExpanded(v => !v)}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 min-h-[28px]"
                >
                  {orderExpanded ? '접기 ▲' : '상위 3개 보기 ▼'}
                </button>
              </div>

              {/* 상위 3개 후보 카드 */}
              {orderExpanded && (
                <TopCandidatesCard
                  candidates={step.result.top_candidates}
                  selectedRank={step.result.selected_candidate_rank}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* 오류 */}
      {isDone && isError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{step.result.error}</p>
      )}
    </div>
  )
}

// ── 툴별 상세 내용 (search / budget) ─────────────────────────
function ResultDetail({ tool, result }) {
  if (tool === 'search_products') {
    return (
      <>
        <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">검색어: {result.query}</p>
        {(result.results || []).slice(0, 5).map((r, i) => (
          <div key={i} className="border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium truncate flex-1">{r.title}</p>
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  링크↗
                </a>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 line-clamp-2">{r.content}</p>
          </div>
        ))}
      </>
    )
  }

  if (tool === 'check_budget') {
    return (
      <>
        <p><span className="font-medium">부서:</span> {result.department}</p>
        <p><span className="font-medium">계정과목:</span> {result.account_code}</p>
        <p>
          <span className="font-medium">예산 잔액: </span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {(result.budget_amount ?? 0).toLocaleString()}원
          </span>
        </p>
        <p><span className="font-medium">총 예산:</span> {(result.total_budget ?? 0).toLocaleString()}원</p>
        {result.message && (
          <p className="text-amber-600 dark:text-amber-400 mt-1">{result.message}</p>
        )}
      </>
    )
  }

  return null
}

// ── 다운로드 아이콘 ───────────────────────────────────────────
function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

// ── AI 보고서 카드 (다운로드 버튼 포함) ─────────────────────
function ReportCard({ text, isStreaming, orderData }) {
  const [downloading, setDownloading] = useState(null) // 'docx' | 'pdf' | null
  const [dlError, setDlError]         = useState('')

  const canDownload = !isStreaming && text && orderData

  async function handleDownload(fmt) {
    if (!canDownload || downloading) return
    setDownloading(fmt)
    setDlError('')
    try {
      const blob = await downloadEstimate(fmt, {
        report_text:             text,
        order_id:                orderData.order_id,
        department:              orderData.department,
        item_name:               orderData.item_name,
        quantity:                orderData.quantity,
        unit_price:              orderData.unit_price,
        total_amount:            orderData.total_amount,
        vendor:                  orderData.vendor,
        account_code:            orderData.account_code,
        status:                  orderData.status,
        created_at:              orderData.created_at,
        top_candidates:          orderData.top_candidates || [],
        selected_candidate_rank: orderData.selected_candidate_rank || 1,
      })
      // 브라우저 다운로드 트리거
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `구매견적서_#${orderData.order_id || 'draft'}.${fmt}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setDlError(err.message || '다운로드에 실패했습니다.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-white dark:border-blue-800 dark:bg-gray-900 p-5">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">AI 구매 보고서</p>

        {/* 다운로드 버튼 */}
        {canDownload && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownload('docx')}
              disabled={!!downloading}
              className="inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1.5 rounded-lg
                border border-blue-200 dark:border-blue-800 text-xs font-medium
                text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <DownloadIcon />
              {downloading === 'docx' ? '생성 중…' : 'Word'}
            </button>
            <button
              type="button"
              onClick={() => handleDownload('pdf')}
              disabled={!!downloading}
              className="inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1.5 rounded-lg
                border border-gray-200 dark:border-gray-700 text-xs font-medium
                text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <DownloadIcon />
              {downloading === 'pdf' ? '생성 중…' : 'PDF'}
            </button>
          </div>
        )}
      </div>

      {/* 보고서 본문 */}
      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
        <LinkifiedText text={text} />
        {isStreaming && (
          <span className="ml-1 inline-block w-0.5 h-4 bg-blue-500 animate-pulse align-middle" />
        )}
      </p>

      {/* 다운로드 에러 */}
      {dlError && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{dlError}</p>
      )}
    </div>
  )
}

// ── 이전 대화 주문서 요약 (히스토리용) ──────────────────────
function HistoryOrderCard({ step }) {
  const res = step.result
  if (!res) return null

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span>📋</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">구매 주문서 #{res.order_id}</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40
          text-blue-700 dark:text-blue-300 font-medium">
          {res.status}
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {res.item_name} × {res.quantity}개 · {(res.total_amount ?? 0).toLocaleString()}원 · {res.vendor}
      </p>
      {res.top_candidates && res.top_candidates.length > 0 && (
        <TopCandidatesCard
          candidates={res.top_candidates}
          selectedRank={res.selected_candidate_rank}
        />
      )}
    </div>
  )
}


// ── 메인 페이지 ───────────────────────────────────────────────
export default function ProcurementAgentPage() {
  const [session, setSession]     = useState(() => getAuthSession())
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [steps, setSteps]         = useState([])
  const [finalText, setFinalText] = useState('')
  const [history, setHistory]     = useState([])

  const abortRef    = useRef(null)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    function sync() { setSession(getAuthSession()) }
    window.addEventListener('auth-session-changed', sync)
    return () => window.removeEventListener('auth-session-changed', sync)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps, finalText, history])

  const isLoggedIn = Boolean(session?.employee?.employee_id)
  const department = session?.employee?.department || '총무/구매팀'

  function handleAbort() {
    abortRef.current?.abort()
    setLoading(false)
  }

  async function handleSubmit() {
    const msg = input.trim()
    if (!msg || loading) return
    if (!isLoggedIn) { setError('로그인 후 이용할 수 있습니다.'); return }

    // 현재 결과를 히스토리로 이동
    if (steps.length > 0 || finalText) {
      setHistory(prev => [...prev, { request: '', steps, finalText }])
    }

    setInput('')
    setSteps([])
    setFinalText('')
    setError('')
    setLoading(true)

    // 사용자 메시지 히스토리 추가
    setHistory(prev => [...prev, { request: msg, steps: null, finalText: null }])

    const controller = streamProcurementAgent(msg, department, {
      onToolStart: (event) => {
        setSteps(prev => {
          const idx = prev.findIndex(s => s.tool === event.tool)
          if (idx !== -1) {
            // 같은 툴이 다시 호출되면 기존 카드를 running으로 덮어씀
            const next = [...prev]
            next[idx] = { ...next[idx], call_id: event.call_id, args: event.args, status: 'running', result: null }
            return next
          }
          return [...prev, { id: event.tool, call_id: event.call_id, tool: event.tool, args: event.args, status: 'running', result: null }]
        })
      },
      onToolDone: (event) => {
        setSteps(prev =>
          prev.map(s =>
            s.tool === event.tool
              ? { ...s, status: 'done', result: event.result }
              : s,
          ),
        )
      },
      onToken:  (content) => { setFinalText(prev => prev + content) },
      onDone:   ()        => { setLoading(false) },
      onError:  (message) => { setError(message); setLoading(false) },
    })

    abortRef.current = controller
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const hasResult = steps.length > 0 || finalText

  // 주문서 생성 결과 추출 (다운로드에 활용)
  const orderStep = steps.find(s => s.tool === 'create_purchase_order' && s.status === 'done')
  const orderData = orderStep?.result ?? null

  return (
    <div className="flex flex-col min-h-screen pb-44">
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '총무/구매팀', to: '/backoffice/admin' },
          { label: '구매 AI 에이전트' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Procurement AI Agent
        </span>
        <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
          구매 AI 에이전트
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          자연어로 구매 요청을 입력하면 AI가 상위 3개 상품을 선별하고 구매 링크와 함께 주문서를 생성합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['상위 3개 상품 선별', '구매 링크 제공', '예산 자동 확인', 'SSE 스트리밍'].map(tag => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium
              bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 대화 이력 */}
      {history.length > 0 && (
        <div className="space-y-5 mb-6">
          {history.map((item, idx) => (
            <div key={idx}>
              {item.request && (
                <div className="flex justify-end mb-3">
                  <div className="max-w-[75%] rounded-xl bg-blue-600 px-4 py-3 text-sm text-white whitespace-pre-wrap">
                    {item.request}
                  </div>
                </div>
              )}
              {item.steps && item.steps.length > 0 && (
                <div className="space-y-2 mb-3">
                  {item.steps.map(step =>
                    step.tool === 'create_purchase_order' && step.status === 'done'
                      ? <HistoryOrderCard key={step.id} step={step} />
                      : <ToolStepCard    key={step.id} step={step} />
                  )}
                </div>
              )}
              {item.finalText && (
                <ReportCard
                  text={item.finalText}
                  isStreaming={false}
                  orderData={
                    item.steps?.find(s => s.tool === 'create_purchase_order' && s.status === 'done')?.result ?? null
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 현재 실행 영역 */}
      {hasResult ? (
        <div className="space-y-2 mb-6">
          {steps.map(step => (
            <ToolStepCard key={step.id} step={step} />
          ))}

          {(finalText || (loading && steps.length > 0)) && (
            finalText ? (
              <ReportCard
                text={finalText}
                isStreaming={loading}
                orderData={orderData}
              />
            ) : (
              <div className="rounded-xl border border-blue-200 bg-white dark:border-blue-800 dark:bg-gray-900 p-5">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">AI 구매 보고서</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <TypingDots />
                  <span>최종 보고서를 작성 중입니다…</span>
                </div>
              </div>
            )
          )}
        </div>
      ) : !loading && history.length === 0 ? (
        /* 빈 상태 */
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">구매 요청을 입력해 주세요</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            {isLoggedIn
              ? `${department} · AI가 상위 3개 상품을 선별하고 구매 링크와 주문서를 자동 생성합니다.`
              : '로그인 후 이용할 수 있습니다.'}
          </p>
          {isLoggedIn && (
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setInput(s); textareaRef.current?.focus() }}
                  className="text-xs px-3 py-2 rounded-full border border-blue-200 dark:border-blue-800
                    text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30
                    transition-colors min-h-[36px]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* 에러 */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700
          dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div ref={bottomRef} />

      {/* 하단 sticky 입력창 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-blue-100 dark:border-blue-900/40
        bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                !isLoggedIn
                  ? '로그인 후 구매 요청을 입력하세요.'
                  : '구매 요청을 입력하세요. (Enter 전송 · Shift+Enter 줄바꿈)'
              }
              disabled={loading || !isLoggedIn}
              className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border border-blue-200
                bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition
                focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                disabled:cursor-not-allowed disabled:bg-gray-100
                dark:border-blue-800 dark:bg-gray-900 dark:text-white
                dark:focus:ring-blue-900/40 dark:disabled:bg-gray-800"
            />

            {loading ? (
              <button
                type="button"
                onClick={handleAbort}
                className="min-h-[44px] min-w-[80px] rounded-xl border border-blue-300 dark:border-blue-700
                  px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400
                  hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                중단
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isLoggedIn || !input.trim()}
                className="min-h-[44px] min-w-[80px] rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium
                  text-white transition hover:bg-blue-700
                  disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
              >
                요청
              </button>
            )}
          </div>

          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-600 text-center">
            {isLoggedIn
              ? `${department} · AI가 상위 3개 상품을 선별하고 구매 링크를 포함한 주문서를 생성합니다.`
              : '로그인이 필요합니다.'}
          </p>
        </div>
      </div>
    </div>
  )
}
