// 영업 실적 분석 페이지 — DB 등록 실적 기반 AI 리포트
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import {
  analyzePerformance,
  comparePerformance,
  downloadPerformanceExcel,
  getPerformanceTrend,
  getTeamMembers,
  listPerformancePeriods,
} from '../../../api/sales'

function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
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

const PERIOD_TYPE_OPTIONS = [
  { value: '',        label: '전체' },
  { value: 'month',   label: '월간' },
  { value: 'quarter', label: '분기' },
  { value: 'year',    label: '연간' },
]

// 커스텀 셀렉트 꺽쇠 — 네이티브 화살표 숨기고 오른쪽 14px 안쪽에 SVG 배치
const SELECT_CHEVRON_STYLE = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  backgroundSize: '14px 14px',
}

const ANOMALY_COLOR = {
  '급등':  'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
  '급락':  'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  '주의':  'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
}

function formatWon(amount) {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`
  if (amount >= 10_000)      return `${(amount / 10_000).toFixed(0)}만`
  return `${amount.toLocaleString()}`
}

// 전환율 병목 임계값 (백엔드 ANOMALY_RULES.conversion_bottleneck_pct 와 동일)
const CONVERSION_BOTTLENECK_PCT = 25

// 파이프라인 바 차트 + 인접 단계 전환율 라벨
function PipelineBar({ stages, conversionRates = [] }) {
  const maxAmount = Math.max(...stages.map(s => s.amount))
  return (
    <div className="flex flex-col">
      {stages.map((s, i) => {
        const cr = conversionRates[i] // stage[i] → stage[i+1] 전환율
        const isBottleneck = cr && cr.rate < CONVERSION_BOTTLENECK_PCT
        return (
          <div key={i}>
            <div className="flex items-center gap-3 py-1">
              <span className="w-20 shrink-0 text-xs text-gray-500 dark:text-gray-400 text-right">{s.stage}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-amber-400"
                  style={{ width: `${(s.amount / maxAmount) * 100}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-xs text-gray-600 dark:text-gray-400 text-right">{formatWon(s.amount)}</span>
              <span className="w-10 shrink-0 text-xs text-gray-400 text-right">{s.count}건</span>
            </div>
            {cr && (
              <div className="flex items-center gap-3 py-0.5">
                <span className="w-20 shrink-0" />
                <div className="flex-1 flex items-center gap-1.5 pl-1">
                  <svg className={`w-3 h-3 ${isBottleneck ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className={`text-[11px] font-medium ${
                    isBottleneck
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    전환율 {cr.rate}%
                    {isBottleneck && <span className="ml-1">· 병목</span>}
                  </span>
                </div>
                <span className="w-14 shrink-0" />
                <span className="w-10 shrink-0" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// 추세 라인 차트 — 달성률/성장률 2개 라인을 SVG로 렌더
function TrendChart({ trend, highlightKey }) {
  if (!trend || trend.length === 0) {
    return (
      <p className="text-xs text-gray-400 py-6 text-center">
        추세 데이터가 없습니다. 실적을 등록하면 자동으로 표시됩니다.
      </p>
    )
  }

  const width  = 640
  const height = 220
  const padL   = 44   // Y축 레이블 공간
  const padR   = 16
  const padT   = 20
  const padB   = 48   // X축 레이블 공간
  const plotW  = width  - padL - padR
  const plotH  = height - padT - padB

  // 두 라인 범위: 달성률은 0~max+20, 성장률은 min-10~max+10
  const achievements = trend.map(t => t.achievement_rate)
  const growths      = trend.map(t => t.growth_rate)
  const allValues = [...achievements, ...growths, 0, 100]
  const yMin = Math.floor(Math.min(...allValues) / 10) * 10
  const yMax = Math.ceil(Math.max(...allValues) / 10) * 10
  const yRange = yMax - yMin || 1

  const n = trend.length
  const stepX = n > 1 ? plotW / (n - 1) : 0

  function xAt(i) { return padL + stepX * i }
  function yAt(v) { return padT + plotH - ((v - yMin) / yRange) * plotH }

  const achPath = trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(t.achievement_rate)}`).join(' ')
  const grPath  = trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(t.growth_rate)}`).join(' ')

  // Y축 눈금 5칸
  const yTicks = []
  for (let i = 0; i <= 4; i++) {
    const v = yMin + (yRange * i) / 4
    yTicks.push(v)
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px] h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y축 눈금 + 가이드 라인 */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={padL} x2={padL + plotW}
              y1={yAt(v)} y2={yAt(v)}
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
              strokeWidth={1}
              strokeDasharray={v === 0 ? '0' : '3 3'}
            />
            <text
              x={padL - 6} y={yAt(v) + 4}
              textAnchor="end"
              className="fill-gray-400 text-[10px]"
            >
              {v}%
            </text>
          </g>
        ))}

        {/* 달성률 라인 (amber) */}
        <path d={achPath} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* 성장률 라인 (blue) */}
        <path d={grPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" />

        {/* 포인트 + X축 라벨 */}
        {trend.map((t, i) => {
          const isHighlight = t.period_key === highlightKey
          return (
            <g key={t.period_key}>
              {isHighlight && (
                <line
                  x1={xAt(i)} x2={xAt(i)}
                  y1={padT} y2={padT + plotH}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="2 3"
                  opacity={0.5}
                />
              )}
              <circle cx={xAt(i)} cy={yAt(t.achievement_rate)} r={isHighlight ? 5 : 3.5} fill="#f59e0b" />
              <circle cx={xAt(i)} cy={yAt(t.growth_rate)}      r={isHighlight ? 5 : 3.5} fill="#3b82f6" />
              <text
                x={xAt(i)} y={height - padB + 16}
                textAnchor="middle"
                className={`text-[10px] ${isHighlight ? 'fill-amber-600 font-bold' : 'fill-gray-500'}`}
              >
                {t.period_label}
              </text>
              <text
                x={xAt(i)} y={yAt(t.achievement_rate) - 8}
                textAnchor="middle"
                className="fill-amber-600 text-[9px] font-semibold"
              >
                {t.achievement_rate}%
              </text>
            </g>
          )
        })}

        {/* 범례 */}
        <g transform={`translate(${padL}, ${height - 14})`}>
          <rect width={10} height={2} y={4} fill="#f59e0b" />
          <text x={14} y={8} className="fill-gray-500 text-[10px]">목표 달성률</text>
          <rect x={90} width={10} height={2} y={4} fill="#3b82f6" />
          <text x={104} y={8} className="fill-gray-500 text-[10px]">전기 대비 성장률</text>
        </g>
      </svg>
    </div>
  )
}

// 전·당기 비교 델타 아이콘
function DeltaBadge({ value, suffix = '%', bigger = 'up' }) {
  if (value == null) return null
  const isUp = value > 0
  const isDown = value < 0
  const color = (() => {
    if (value === 0) return 'text-gray-400'
    const positive = bigger === 'up' ? isUp : isDown
    return positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  })()
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {isUp && '▲'}
      {isDown && '▼'}
      {sign}{value}{suffix}
    </span>
  )
}

export default function PerformancePage() {
  // DB 기반 기간 선택
  const [periodType, setPeriodType] = useState('')
  const [periods,    setPeriods]    = useState([])
  const [periodKey,  setPeriodKey]  = useState('')

  const [memberId, setMemberId] = useState('all')
  const [members,  setMembers]  = useState([{ id: 'all', name: '팀 전체' }])

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [result,  setResult]  = useState(null)

  // 추세 차트 / 기간 비교 / Excel 다운로드 상태
  const [trend,          setTrend]          = useState([])
  const [trendLoading,   setTrendLoading]   = useState(false)
  const [compare,        setCompare]        = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [exporting,      setExporting]      = useState(false)

  // 추세 차트는 선택된 period_type 기준 (전체일 땐 month)
  const trendType = periodType || 'month'

  // 기간 목록 로드
  useEffect(() => {
    listPerformancePeriods(periodType)
      .then(items => {
        setPeriods(items)
        // 선택된 period_key가 새 목록에 없으면 가장 최신으로 교체
        if (items.length > 0 && !items.some(p => p.period_key === periodKey)) {
          setPeriodKey(items[0].period_key)
        }
        if (items.length === 0) setPeriodKey('')
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType])

  // 선택된 기간이 바뀌면 해당 기간 팀원 목록 재조회
  useEffect(() => {
    if (!periodKey) {
      setMembers([{ id: 'all', name: '팀 전체' }])
      return
    }
    getTeamMembers(periodKey)
      .then(items => {
        setMembers(items)
        // 선택된 memberId가 더 이상 없으면 'all'로
        if (!items.some(m => m.id === memberId)) setMemberId('all')
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey])

  // 추세 차트 데이터 로드 (period_type 변경 시)
  useEffect(() => {
    setTrendLoading(true)
    getPerformanceTrend(trendType, 6)
      .then(items => setTrend(items || []))
      .catch(() => setTrend([]))
      .finally(() => setTrendLoading(false))
  }, [trendType])

  async function handleAnalyze() {
    if (!periodKey) {
      setError('먼저 실적을 등록하고 기간을 선택해 주세요.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setCompare(null)
    try {
      // 분석 + 전기 비교를 병렬 호출
      const [data, comp] = await Promise.all([
        analyzePerformance({ period_key: periodKey, member_id: memberId }),
        comparePerformance(periodKey).catch(() => null),
      ])
      setResult(data)
      setCompare(comp)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // 기간 재비교 (member_id 변경 등으로 다시 필요할 때)
  useEffect(() => {
    if (!result || !periodKey) return
    setCompareLoading(true)
    comparePerformance(periodKey)
      .then(setCompare)
      .catch(() => setCompare(null))
      .finally(() => setCompareLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  async function handleExcelDownload() {
    if (!periodKey) return
    setExporting(true)
    setError(null)
    try {
      await downloadPerformanceExcel(periodKey, memberId)
    } catch (e) {
      setError(`Excel 다운로드 실패: ${e.message}`)
    } finally {
      setExporting(false)
    }
  }

  const achievementColor = result
    ? result.metrics.achievement_rate >= 100
      ? 'text-green-600 dark:text-green-400'
      : result.metrics.achievement_rate >= 70
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'
    : ''

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: '영업/영업관리팀', to: '/frontoffice/sales' },
          { label: '영업 실적 분석' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Front-Office · 영업/영업관리팀
              </span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                영업 실적 분석
              </h1>
            </div>
          </div>
          <Link
            to="/frontoffice/sales/performance-entry"
            className="text-xs min-h-[36px] px-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            실적 등록
          </Link>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          등록된 실적 데이터를 분석하여 파이프라인 인사이트·이상 감지·팀장 보고 요약을 생성합니다.
        </p>
      </div>

      {/* 분석 옵션 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">분석 조건 설정</h3>

        {/* 기간 타입 필터 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">기간 타입</label>
          <div className="flex gap-2 flex-wrap">
            {PERIOD_TYPE_OPTIONS.map(t => (
              <button
                key={t.value}
                onClick={() => setPeriodType(t.value)}
                className={`min-h-[36px] px-4 text-sm font-medium rounded-xl border transition-colors ${
                  periodType === t.value
                    ? 'border-amber-400 bg-amber-500 text-white'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 기간 드롭다운 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">분석 기간</label>
            <select
              value={periodKey}
              onChange={e => setPeriodKey(e.target.value)}
              disabled={periods.length === 0}
              style={SELECT_CHEVRON_STYLE}
              className="appearance-none w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-4 pr-10 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
            >
              {periods.length === 0 ? (
                <option value="">— 등록된 실적 없음 —</option>
              ) : (
                periods.map(p => (
                  <option key={p.period_key} value={p.period_key}>
                    {p.period_label} ({p.period_key})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 팀원 선택 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">팀원</label>
            <select
              value={memberId}
              onChange={e => setMemberId(e.target.value)}
              disabled={!periodKey}
              style={SELECT_CHEVRON_STYLE}
              className="appearance-none w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-4 pr-10 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {periods.length === 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              아직 등록된 실적이 없습니다.{' '}
              <Link to="/frontoffice/sales/performance-entry" className="font-semibold underline">
                실적 등록 페이지
              </Link>
              에서 먼저 데이터를 등록해 주세요.
            </p>
          </div>
        )}
      </div>

      {/* 목표/성장률 추세 차트 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {trendType === 'month' ? '월간' : trendType === 'quarter' ? '분기' : '연간'} 추세 (최근 6개)
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">목표 달성률 · 전기 대비 성장률 · 현재 선택 기간 강조</p>
          </div>
          {trendLoading && <Spinner />}
        </div>
        <TrendChart trend={trend} highlightKey={periodKey} />
      </div>

      {/* 분석 버튼 */}
      <button
        onClick={handleAnalyze}
        disabled={loading || !periodKey}
        className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
          disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-semibold transition-colors mb-6
          flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />분석 중...</> : '실적 분석 리포트 생성'}
      </button>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!result && !loading && !error && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-gray-400">분석 조건을 설정하고 버튼을 누르면<br />실적 리포트가 여기에 표시됩니다.</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center gap-3">
          <Spinner className="w-6 h-6 text-amber-500" />
          <p className="text-sm text-gray-400">CRM 데이터를 분석하여 리포트를 작성하는 중...</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="flex flex-col gap-5">
          {/* 결과 헤더 — Excel 다운로드 버튼 */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {result.metrics.period} 분석 결과
            </p>
            <button
              onClick={handleExcelDownload}
              disabled={exporting}
              className="min-h-[36px] px-4 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {exporting ? <Spinner /> : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
              )}
              Excel 다운로드
            </button>
          </div>

          {/* 핵심 지표 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '실제 매출',     value: formatWon(result.metrics.actual_revenue),  sub: `목표 ${formatWon(result.metrics.target_revenue)}` },
              { label: '목표 달성률',   value: `${result.metrics.achievement_rate}%`,      sub: result.metrics.growth_rate >= 0 ? `전기 대비 +${result.metrics.growth_rate}%` : `전기 대비 ${result.metrics.growth_rate}%` },
              { label: '수주 건수',     value: `${result.metrics.win_count}건`,            sub: `진행 중 ${result.metrics.deal_count}건` },
              { label: '수주율',        value: `${result.metrics.win_rate}%`,              sub: '수주/전체 딜' },
            ].map((card, i) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{card.label}</p>
                <p className={`text-xl font-bold ${i === 1 ? achievementColor : 'text-gray-900 dark:text-white'}`}>{card.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* 전기 비교 뷰 */}
          {(compare?.current && compare?.previous) ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  전기 비교 · {compare.previous.period_label} → {compare.current.period_label}
                </p>
                {compareLoading && <Spinner />}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
                {[
                  {
                    label: '실제 매출',
                    prev: formatWon(compare.previous.actual_revenue),
                    curr: formatWon(compare.current.actual_revenue),
                    delta: compare.delta?.actual_pct,
                    suffix: '%',
                  },
                  {
                    label: '목표 달성률',
                    prev: `${compare.previous.achievement_rate}%`,
                    curr: `${compare.current.achievement_rate}%`,
                    delta: compare.delta?.achievement_pct_point,
                    suffix: 'p',
                  },
                  {
                    label: '수주율',
                    prev: `${compare.previous.win_rate}%`,
                    curr: `${compare.current.win_rate}%`,
                    delta: compare.delta?.win_rate_pct_point,
                    suffix: 'p',
                  },
                ].map((c, i) => (
                  <div key={i} className="px-4 py-3">
                    <p className="text-[11px] text-gray-400 mb-1.5">{c.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-400 line-through">{c.prev}</span>
                      <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{c.curr}</span>
                    </div>
                    <div className="mt-1">
                      <DeltaBadge value={c.delta} suffix={c.suffix} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : compare?.current && !compare?.previous && (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-3">
              <p className="text-xs text-gray-400">
                직전 기간({compare.previous_key || '—'}) 실적이 등록되지 않아 비교할 수 없습니다.
              </p>
            </div>
          )}

          {/* 팀장 보고 3줄 요약 */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">팀장 보고 요약</p>
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{result.summary}</pre>
          </div>

          {/* 이상 감지 (규칙 기반 선감지 + LLM 원인 추정) */}
          {result.anomalies?.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">이상 감지</p>
                <span className="text-[10px] text-gray-400">규칙 기반 감지 · AI 원인 추정</span>
              </div>
              {result.anomalies.map((a, i) => (
                <div key={i} className={`rounded-xl border px-4 py-3 ${ANOMALY_COLOR[a.type] ?? ANOMALY_COLOR['주의']}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/30 shrink-0">{a.type}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{a.item}</p>
                        {a.severity && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            a.severity === '높음'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-500/70 text-white'
                          }`}>
                            {a.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 opacity-80">{a.detail}</p>
                      {a.cause && (
                        <p className="text-xs mt-2 pt-2 border-t border-current/20 opacity-90">
                          <span className="font-semibold">원인 추정 · </span>{a.cause}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 파이프라인 */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">파이프라인 현황</p>
            <PipelineBar stages={result.pipeline} conversionRates={result.conversion_rates} />
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {result.pipeline_insight}
            </p>
          </div>

          {/* 팀원별 실적 */}
          {result.members?.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">팀원별 실적</p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {result.members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-medium text-gray-800 dark:text-white w-32">{m.name}</span>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">매출</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{formatWon(m.revenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">수주</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{m.wins}건</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">진행</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{m.deals}건</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 인사이트 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 최고 실적 */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">최고 실적</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.top_performer}</p>
            </div>

            {/* 리스크 딜 */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">리스크 딜 분석</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.risk_deals}</p>
            </div>
          </div>

          {/* 액션 추천 */}
          {result.recommendations?.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">AI 액션 추천</p>
              <ul className="flex flex-col gap-2">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {r}
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
