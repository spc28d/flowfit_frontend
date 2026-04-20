// 경쟁사 동향 리서치 페이지
import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import {
  streamCompetitorResearch,
  downloadResearchPptx,
  searchTicker,
  getFinancialData,
  suggestCompetitors,
} from '../../../api/strategy'

const ALL_CATEGORIES = ['신제품/서비스', '가격·프로모션', '인사·조직', '전략·투자']
const CHART_COLORS   = ['#D97706', '#F59E0B', '#92400E'] // amber-600 · amber-400 · amber-800

// ── 숫자 포매터 ─────────────────────────────────────────────────
function fmtLarge(val, currency) {
  if (val == null) return '-'
  const isKRW = currency === 'KRW'
  if (isKRW) {
    if (Math.abs(val) >= 1e12) return `${(val / 1e12).toFixed(1)}조`
    if (Math.abs(val) >= 1e8)  return `${(val / 1e8).toFixed(0)}억`
    return `₩${val.toLocaleString()}`
  }
  if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`
  if (Math.abs(val) >= 1e9)  return `$${(val / 1e9).toFixed(1)}B`
  if (Math.abs(val) >= 1e6)  return `$${(val / 1e6).toFixed(0)}M`
  return `$${val.toLocaleString()}`
}
function fmtPrice(val, currency) {
  if (val == null) return '-'
  if (currency === 'KRW') return `₩${Math.round(val).toLocaleString()}`
  return `$${Number(val).toFixed(2)}`
}
function fmtRatio(val) {
  if (val == null) return '-'
  return `${Number(val).toFixed(1)}x`
}
// 차트 Y축 축약
function fmtAxis(val) {
  if (val >= 1e12) return `${(val / 1e12).toFixed(0)}T`
  if (val >= 1e9)  return `${(val / 1e9).toFixed(0)}B`
  if (val >= 1e6)  return `${(val / 1e6).toFixed(0)}M`
  if (val >= 1e4)  return `${(val / 1e3).toFixed(0)}K`
  return String(val)
}

// 지표 정의
const METRICS = [
  { key: 'currentPrice',      label: '현재 주가',   fmt: (v, c) => fmtPrice(v, c) },
  { key: 'fiftyTwoWeekHigh',  label: '52주 최고가', fmt: (v, c) => fmtPrice(v, c) },
  { key: 'fiftyTwoWeekLow',   label: '52주 최저가', fmt: (v, c) => fmtPrice(v, c) },
  { key: 'marketCap',         label: '시가총액',    fmt: (v, c) => fmtLarge(v, c) },
  { key: 'totalRevenue',      label: '매출액',      fmt: (v, c) => fmtLarge(v, c) },
  { key: 'operatingIncome',   label: '영업이익',    fmt: (v, c) => fmtLarge(v, c) },
  { key: 'netIncomeToCommon', label: '순이익',      fmt: (v, c) => fmtLarge(v, c) },
  { key: 'trailingPE',        label: 'PER',         fmt: (v) => fmtRatio(v) },
  { key: 'priceToBook',       label: 'PBR',         fmt: (v) => fmtRatio(v) },
]

// ── 스피너 ─────────────────────────────────────────────────────
function Spinner({ className = 'w-4 h-4 text-amber-500' }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// ── 상태별 아이콘 ───────────────────────────────────────────────
function PhaseIcon({ phase }) {
  if (phase === 'searching' || phase === 'analyzing') return <Spinner />
  if (phase === 'done') {
    return (
      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (phase === 'search_error' || phase === 'analysis_error') {
    return (
      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  return null
}

const PHASE_LABEL = {
  searching:      '뉴스 검색 중...',
  analyzing:      '카테고리별 분석 중...',
  done:           '분석 완료',
  search_error:   '검색 오류',
  analysis_error: '분석 오류',
}

// ── 진행 상황 카드 ─────────────────────────────────────────────
function ProgressCard({ companyStatuses }) {
  if (!companyStatuses.length) return null
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 mb-4">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-3 uppercase tracking-wider">분석 진행 상황</p>
      <div className="space-y-2">
        {companyStatuses.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <PhaseIcon phase={s.phase} />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.company}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{PHASE_LABEL[s.phase] ?? s.phase}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 회사별 결과 카드 ───────────────────────────────────────────
function CompanyResultCard({ result, categories }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-amber-500 hover:bg-amber-600 transition-colors"
      >
        <span className="text-sm font-bold text-white">{result.company}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-100">{result.articles?.length ?? 0}개 기사 수집</span>
          <svg className={`w-4 h-4 text-white transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {categories.map(cat => (
              <div key={cat} className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden">
                <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/40 border-b border-amber-100 dark:border-amber-800">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{cat}</span>
                </div>
                <p className="px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {result.analysis?.[cat] ?? '해당 없음'}
                </p>
              </div>
            ))}
          </div>
          {result.articles?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">참고 기사</p>
              <ul className="space-y-1">
                {result.articles.slice(0, 5).map((a, i) => (
                  <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                    <span className="shrink-0 mt-0.5 text-amber-400">·</span>
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noopener noreferrer"
                        className="hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-2 line-clamp-1">
                        {a.title || a.url}
                      </a>
                    ) : (
                      <span className="line-clamp-1">{a.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 종합 시사점 카드 ───────────────────────────────────────────
function SummaryCard({ text, isStreaming }) {
  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm font-bold text-amber-800 dark:text-amber-200">종합 시사점 및 전략적 액션 아이템</span>
        {isStreaming && <Spinner className="w-3.5 h-3.5 text-amber-500 ml-1" />}
      </div>
      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
        {text}
        {isStreaming && <span className="inline-block w-0.5 h-4 bg-amber-500 animate-pulse ml-0.5 align-text-bottom" />}
      </p>
    </div>
  )
}

// ── 재무 비교 탭 ───────────────────────────────────────────────
function FinancialComparisonTab({ companies, tickerMap, financialData, finDataLoading }) {
  // 회사별 ticker/data 준비
  const rows = companies.map((name, ci) => {
    const ti  = tickerMap[name]
    const ticker  = ti?.found ? ti.ticker  : null
    const fd  = ticker ? (financialData[ticker] ?? {}) : null
    return { name, ticker, ti, fd, color: CHART_COLORS[ci] ?? CHART_COLORS[0] }
  })

  const hasSomeData = rows.some(r => r.fd && Object.keys(r.fd).length > 0)

  if (finDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
        <Spinner className="w-8 h-8 text-amber-500" />
        <p className="text-sm">재무 데이터 수집 중...</p>
        <p className="text-xs text-gray-400">yfinance로 실시간 조회 중입니다</p>
      </div>
    )
  }

  if (!hasSomeData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
        <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">재무 데이터가 없습니다.</p>
        <p className="text-xs">종목 탐색 후 리서치를 시작하면 재무 지표를 수집합니다.</p>
      </div>
    )
  }

  // 통화 감지 (첫 번째 데이터 기준)
  const firstCurrency = rows.find(r => r.fd?.currency)?.fd?.currency ?? ''

  // ── 지표 비교 테이블 ──
  const TableSection = () => (
    <div className="mb-6 overflow-x-auto">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">지표 비교</p>
      <table className="w-full text-xs border-collapse min-w-[400px]">
        <thead>
          <tr className="bg-amber-50 dark:bg-amber-900/40">
            <th className="text-left px-3 py-2 font-semibold text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 w-28">
              항목
            </th>
            {rows.map(r => (
              <th key={r.name} className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-200 border-b border-amber-200 dark:border-amber-800">
                <div>{r.name}</div>
                {r.ticker && (
                  <div className="text-[10px] font-normal text-amber-600 dark:text-amber-400 mt-0.5">{r.ticker}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map((m, mi) => (
            <tr key={m.key} className={mi % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
              <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-medium">{m.label}</td>
              {rows.map(r => {
                const val = r.fd?.[m.key]
                const cur = r.fd?.currency ?? ''
                const display = !r.ti ? '미탐색' : !r.ti.found ? '비상장' : m.fmt(val, cur)
                return (
                  <td key={r.name} className={`px-3 py-2 text-right tabular-nums ${
                    val != null ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {display}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.some(r => r.fd?.currency && r.fd.currency !== firstCurrency) && (
        <p className="text-[10px] text-gray-400 mt-1.5">※ 통화 단위가 상이한 항목이 포함되어 있습니다.</p>
      )}
    </div>
  )

  // ── 차트 데이터 준비 ──
  const marketCapData = rows.map(r => ({
    name:  r.name,
    value: r.fd?.marketCap ?? 0,
    color: r.color,
  })).filter(d => d.value > 0)

  const revenueData = rows
    .filter(r => (r.fd?.totalRevenue ?? 0) > 0 || (r.fd?.operatingIncome ?? 0) !== 0)
    .map(r => ({
      name:   r.name,
      매출액:   r.fd?.totalRevenue     ?? 0,
      영업이익: r.fd?.operatingIncome   ?? 0,
    }))

  const priceData = rows
    .filter(r => r.fd?.currentPrice != null)
    .map(r => ({
      name:      r.name,
      '52주 최저': r.fd?.fiftyTwoWeekLow  ?? 0,
      '현재 주가':  r.fd?.currentPrice     ?? 0,
      '52주 최고': r.fd?.fiftyTwoWeekHigh ?? 0,
    }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-900 shadow-lg px-3 py-2 text-xs">
        <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color ?? p.fill }} />
            <span className="text-gray-600 dark:text-gray-400">{p.name}:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {fmtAxis(p.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <TableSection />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* 시가총액 BarChart */}
        {marketCapData.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-4">시가총액 비교</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={marketCapData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="시가총액" radius={[4, 4, 0, 0]}>
                  {marketCapData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 매출·영업이익 GroupedBarChart */}
        {revenueData.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-4">매출·영업이익 비교</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="매출액"   fill="#D97706" radius={[3, 3, 0, 0]} />
                <Bar dataKey="영업이익" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 52주 주가 범위 GroupedBarChart */}
      {priceData.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 mb-5">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">52주 주가 범위</p>
          <p className="text-[10px] text-gray-400 mb-4">최저가 · 현재 주가 · 최고가 비교</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priceData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="52주 최저" fill="#92400E" radius={[3, 3, 0, 0]} />
              <Bar dataKey="현재 주가"  fill="#D97706" radius={[3, 3, 0, 0]} />
              <Bar dataKey="52주 최고" fill="#F59E0B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function CompetitorResearchPage() {
  const navigate = useNavigate()

  // ── 입력 상태 ──
  const [companyInput, setCompanyInput]     = useState('')
  const [companies, setCompanies]           = useState([])
  const [categories, setCategories]         = useState([...ALL_CATEGORIES])

  // ── 종목 탐색 상태 ──
  const [tickerMap, setTickerMap] = useState({})   // { companyName: { ticker, exchange, company_name, found } }

  // ── 경쟁사 추천 상태 ──
  const [suggestions, setSuggestions]         = useState([])   // AI 추천 경쟁사 목록
  const [suggestLoading, setSuggestLoading]   = useState(false)
  const [suggestBase, setSuggestBase]         = useState('')   // 추천 기준 회사명

  // ── 동향 리서치 상태 ──
  const [companyStatuses, setCompanyStatuses] = useState([])
  const [companyResults, setCompanyResults]   = useState([])
  const [summaryText, setSummaryText]         = useState('')
  const [isStreaming, setIsStreaming]         = useState(false)
  const [isDone, setIsDone]                   = useState(false)
  const [error, setError]                     = useState('')

  // ── 재무 데이터 상태 ──
  const [financialData, setFinancialData]   = useState({})
  const [finDataLoading, setFinDataLoading] = useState(false)
  const [finDataDone, setFinDataDone]       = useState(true)

  // ── UI 상태 ──
  const [activeTab, setActiveTab]           = useState('trend')
  const [downloading, setDownloading]       = useState(false)

  const abortRef = useRef(null)

  // ── 회사 추가 (티커 자동 탐색 + 첫 회사 시 경쟁사 추천) ──
  const addCompany = useCallback(async () => {
    const name = companyInput.trim()
    if (!name || isStreaming) return
    if (companies.includes(name)) { setCompanyInput(''); return }
    if (companies.length >= 3) return

    const isFirst = companies.length === 0
    setCompanyInput('')
    setCompanies(prev => [...prev, name])

    // 티커 자동 탐색
    setTickerMap(prev => ({ ...prev, [name]: { _searching: true } }))
    searchTicker(name)
      .then(result => setTickerMap(prev => ({ ...prev, [name]: result })))
      .catch(() => setTickerMap(prev => ({ ...prev, [name]: { found: false, company_name: name, ticker: '', exchange: '' } })))

    // 첫 회사 추가 시 경쟁사 AI 추천 호출
    if (isFirst) {
      setSuggestions([])
      setSuggestBase(name)
      setSuggestLoading(true)
      suggestCompetitors(name)
        .then(data => setSuggestions(data.suggestions ?? []))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestLoading(false))
    }
  }, [companyInput, companies, isStreaming])

  const removeCompany = (name) => {
    setCompanies(prev => {
      const next = prev.filter(c => c !== name)
      if (next.length === 0) {
        setSuggestions([])
        setSuggestBase('')
      }
      return next
    })
    setTickerMap(prev => { const next = { ...prev }; delete next[name]; return next })
  }

  const toggleCategory = (cat) => {
    setCategories(prev =>
      prev.includes(cat)
        ? prev.length > 1 ? prev.filter(c => c !== cat) : prev
        : [...prev, cat]
    )
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCompany() }
  }

  // ── 리서치 시작 ──
  const handleStart = () => {
    if (!companies.length || isStreaming) return
    setCompanyStatuses([])
    setCompanyResults([])
    setSummaryText('')
    setError('')
    setIsDone(false)
    setIsStreaming(true)
    setActiveTab('trend')

    // SSE 동향 리서치
    abortRef.current = streamCompetitorResearch(companies, categories, {
      onStatus: (ev) => {
        setCompanyStatuses(prev => {
          const idx = prev.findIndex(s => s.company === ev.company)
          if (idx >= 0) {
            const next = [...prev]; next[idx] = { company: ev.company, phase: ev.phase }; return next
          }
          return [...prev, { company: ev.company, phase: ev.phase }]
        })
      },
      onCompanyResult: (ev) => {
        setCompanyResults(prev => {
          const idx = prev.findIndex(r => r.company === ev.company)
          if (idx >= 0) { const next = [...prev]; next[idx] = ev; return next }
          return [...prev, ev]
        })
        setCompanyStatuses(prev => prev.map(s => s.company === ev.company ? { ...s, phase: 'done' } : s))
      },
      onToken:  (content) => setSummaryText(prev => prev + content),
      onDone:   () => { setIsStreaming(false); setIsDone(true) },
      onError:  (msg) => { setError(msg); setIsStreaming(false) },
    })

    // 재무 데이터 병렬 수집 (탐색된 종목만)
    const foundTickers = companies
      .map(c => tickerMap[c])
      .filter(t => t?.found)
      .map(t => t.ticker)

    if (foundTickers.length > 0) {
      setFinancialData({})
      setFinDataLoading(true)
      setFinDataDone(false)
      getFinancialData(foundTickers)
        .then(data => { setFinancialData(data); setFinDataDone(true) })
        .catch(() => setFinDataDone(true))
        .finally(() => setFinDataLoading(false))
    } else {
      setFinancialData({})
      setFinDataDone(true)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  // ── PPTX 다운로드 ──
  const handleDownload = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const companiesPayload = companyResults.map(r => ({
        name:     r.company,
        articles: r.articles ?? [],
        analysis: r.analysis ?? {},
      }))
      const blob = await downloadResearchPptx(companiesPayload, summaryText, categories, financialData, tickerMap)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `경쟁사_동향_리서치_${companies.join('_')}.pptx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message || 'PPTX 다운로드에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  const hasResults   = companyResults.length > 0
  const pptxReady    = isDone && finDataDone  // 재무 데이터까지 완료 후 활성화

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: '전략/기획팀', to: '/frontoffice/strategy' },
          { label: '경쟁사 동향 리서치' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">경쟁사 동향 리서치</h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          경쟁사 최신 뉴스를 실시간으로 수집하고 카테고리별로 분석합니다. 종합 시사점과 재무 지표 비교를 PPTX로 다운로드하세요.
        </p>
      </div>

      {/* 입력 패널 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 mb-5">
        {/* 경쟁사 입력 */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            경쟁사 이름 <span className="text-gray-400 font-normal">(최대 3개)</span>
          </label>

          {/* 입력창 + 추가 버튼 */}
          {companies.length < 3 && (
            <div className="flex gap-2 mb-3">
              <input
                value={companyInput}
                onChange={e => setCompanyInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder="회사명 입력 (예: 삼성전자, Apple)"
                className="flex-1 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-800 px-4 text-sm text-gray-900 dark:text-white
                  placeholder-gray-400 outline-none transition
                  focus:border-amber-400 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/30
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={addCompany}
                disabled={!companyInput.trim() || isStreaming}
                className="min-h-[44px] px-5 rounded-lg text-sm font-semibold
                  bg-amber-500 hover:bg-amber-600 text-white transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                추가
              </button>
            </div>
          )}

          {/* 추가된 경쟁사 목록 */}
          {companies.length > 0 && (
            <div className="space-y-2">
              {companies.map((c, idx) => {
                const ti = tickerMap[c]
                const isSearching = ti?._searching
                return (
                  <div
                    key={c}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg
                      border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{c}</span>
                      {/* 티커 상태 */}
                      {isSearching ? (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Spinner className="w-3 h-3 text-amber-400" />
                          종목 탐색 중...
                        </span>
                      ) : ti ? (
                        ti.found ? (
                          <span className="flex items-center gap-1">
                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded
                              bg-amber-200 dark:bg-amber-800/60 text-amber-700 dark:text-amber-300">
                              {ti.ticker}
                            </span>
                            {ti.exchange && (
                              <span className="text-[10px] text-gray-400">{ti.exchange}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">비상장</span>
                        )
                      ) : null}
                    </div>
                    <button
                      onClick={() => removeCompany(c)}
                      disabled={isStreaming}
                      className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50
                        dark:hover:bg-red-950/30 transition-colors disabled:opacity-40 min-h-[32px] min-w-[32px]
                        flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 빈 상태 안내 */}
          {companies.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              첫 번째 회사를 추가하면 AI가 경쟁사를 자동으로 추천합니다.
            </p>
          )}

          {/* AI 경쟁사 추천 */}
          {(suggestLoading || suggestions.length > 0) && companies.length < 3 && (
            <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {suggestLoading ? `${suggestBase} 경쟁사 분석 중...` : `AI 추천 경쟁사 (${suggestBase} 기준)`}
                </span>
                {suggestLoading && <Spinner className="w-3 h-3 text-amber-500" />}
              </div>

              {suggestLoading ? (
                <div className="flex gap-2 flex-wrap">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-8 w-20 rounded-full bg-amber-200/60 dark:bg-amber-800/40 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {suggestions
                    .filter(s => !companies.includes(s))
                    .map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          if (companies.length >= 3 || isStreaming) return
                          setCompanyInput(s)
                          // 바로 addCompany 로직 실행 (input 상태 거치지 않고 직접 추가)
                          const name = s
                          setCompanies(prev => {
                            if (prev.includes(name) || prev.length >= 3) return prev
                            return [...prev, name]
                          })
                          setCompanyInput('')
                          setSuggestions(prev => prev.filter(x => x !== name))
                          setTickerMap(prev => ({ ...prev, [name]: { _searching: true } }))
                          searchTicker(name)
                            .then(result => setTickerMap(prev => ({ ...prev, [name]: result })))
                            .catch(() => setTickerMap(prev => ({ ...prev, [name]: { found: false, company_name: name, ticker: '', exchange: '' } })))
                        }}
                        disabled={isStreaming || companies.length >= 3}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                          border border-amber-300 dark:border-amber-700
                          bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-300
                          hover:bg-amber-500 hover:text-white hover:border-amber-500
                          dark:hover:bg-amber-600 dark:hover:text-white dark:hover:border-amber-600
                          transition-colors min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        {s}
                      </button>
                    ))
                  }
                  {suggestions.filter(s => !companies.includes(s)).length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">추천 가능한 경쟁사를 모두 추가했습니다.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 카테고리 선택 */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            조사 카테고리 <span className="text-gray-400 font-normal">(최소 1개)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => {
              const selected = categories.includes(cat)
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  disabled={isStreaming}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] disabled:opacity-50
                    ${selected
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                    }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* 실행 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={isStreaming ? handleStop : handleStart}
            disabled={!isStreaming && !companies.length}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed
              ${isStreaming
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
          >
            {isStreaming ? '중단' : '리서치 시작'}
          </button>

          {pptxReady && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
                bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700
                text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30
                transition-colors min-h-[44px] disabled:opacity-50"
            >
              {downloading ? <Spinner className="w-4 h-4 text-amber-500" /> : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              PPTX 다운로드
            </button>
          )}

          {/* 재무 데이터 로딩 중 안내 */}
          {isDone && !finDataDone && (
            <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-400">
              <Spinner className="w-3.5 h-3.5 text-amber-500" />
              재무 데이터 수집 중...
            </div>
          )}
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 진행 상황 */}
      <ProgressCard companyStatuses={companyStatuses} />

      {/* 결과 탭 */}
      {hasResults && (
        <div>
          {/* 탭 헤더 */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            {[
              { id: 'trend',     label: '회사별 동향' },
              { id: 'financial', label: '재무 비교' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
                  ${activeTab === tab.id
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                {tab.label}
                {tab.id === 'financial' && finDataLoading && (
                  <span className="ml-1.5 inline-flex"><Spinner className="w-3 h-3 text-amber-400" /></span>
                )}
              </button>
            ))}
          </div>

          {/* 동향 탭 */}
          {activeTab === 'trend' && (
            <div>
              <div className="mb-4">
                {companyResults.map(r => (
                  <CompanyResultCard key={r.company} result={r} categories={categories} />
                ))}
              </div>
              {summaryText && (
                <SummaryCard text={summaryText} isStreaming={isStreaming} />
              )}
            </div>
          )}

          {/* 재무 비교 탭 */}
          {activeTab === 'financial' && (
            <FinancialComparisonTab
              companies={companies}
              tickerMap={tickerMap}
              financialData={financialData}
              finDataLoading={finDataLoading}
            />
          )}
        </div>
      )}
    </div>
  )
}
