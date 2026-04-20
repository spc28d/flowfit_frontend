// 재무/자금 대시보드 — 재무팀 전용 (부서별 지출 분석 · 월별 추이 · AI CFO 리포트)
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as AreaTooltip,
} from 'recharts'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { getAuthSession } from '../../../api/auth'
import { getFinanceStats, generateCfoReport, seedFinanceData } from '../../../api/finance'

// 부서별 색상 팔레트
const DEPT_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

// 금액 포맷 헬퍼
function formatWon(n) {
  if (!n && n !== 0) return '-'
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 1_000_000)   return `${(n / 1_000_000).toFixed(0)}백만`
  return `${n.toLocaleString()}원`
}

// 로딩 스피너
function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// 예산 소진 바
function BurnBar({ spent, budget }) {
  if (!budget) return <span className="text-xs text-gray-400">예산 미설정</span>
  const pct = Math.min(Math.round((spent / budget) * 100), 100)
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

// 접근 거부 화면
function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-2xl">
        🔒
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">접근 권한 없음</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        이 페이지는 <strong>재무/회계팀</strong> 소속 직원만 접근할 수 있습니다.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
      >
        이전 페이지로
      </button>
    </div>
  )
}

// Pie 차트 커스텀 라벨
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function TreasuryPage() {
  const navigate = useNavigate()
  const session  = getAuthSession()
  const employee = session?.employee

  // ── 권한 체크 (재무팀 or 대표이사) ───────────────────────
  const hasAccess = employee?.department === '재무팀' || employee?.department === '재무/회계팀' || employee?.position === '대표이사'

  const [year,       setYear]       = useState(2026)
  const [stats,      setStats]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [report,     setReport]     = useState('')
  const [rptLoading, setRptLoading] = useState(false)
  const [rptError,   setRptError]   = useState(null)
  const [seeding,    setSeeding]    = useState(false)
  const [seedMsg,    setSeedMsg]    = useState(null)

  // ── 통계 데이터 로드 ──────────────────────────────────────
  const loadStats = useCallback(async () => {
    if (!hasAccess) return
    setLoading(true)
    setError(null)
    try {
      const data = await getFinanceStats(year, employee?.employee_id)
      setStats(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [year, hasAccess, employee?.employee_id])

  useEffect(() => { loadStats() }, [loadStats])

  // ── CFO AI 리포트 생성 ────────────────────────────────────
  const handleReport = async () => {
    setRptLoading(true)
    setRptError(null)
    setReport('')
    try {
      const data = await generateCfoReport(year, employee.employee_id)
      setReport(data.report)
    } catch (e) {
      setRptError(e.message)
    } finally {
      setRptLoading(false)
    }
  }

  // ── 시드 데이터 삽입 ──────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true)
    setSeedMsg(null)
    try {
      const data = await seedFinanceData()
      setSeedMsg(`✅ 삽입 완료 — 전표 ${data.transactions}건 / 예산 ${data.budgets}건`)
      await loadStats()
    } catch (e) {
      setSeedMsg(`❌ ${e.message}`)
    } finally {
      setSeeding(false)
    }
  }

  // 권한 없으면 접근 거부 화면
  if (!hasAccess) return <AccessDenied />

  // Pie 차트용 데이터
  const pieData = (stats?.dept_stats || [])
    .filter(d => d.total_spent > 0)
    .map(d => ({ name: d.department, value: d.total_spent }))

  // 월별 추이 — 데이터 없는 월 제거
  const areaData = (stats?.monthly_stats || []).filter(d => d.spent > 0)

  // 전월 대비 증감
  const momChange  = stats?.mom_change
  const momColor   = momChange > 0 ? 'text-red-500' : momChange < 0 ? 'text-emerald-500' : 'text-gray-400'
  const momPrefix  = momChange > 0 ? '+' : ''

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '재무/회계팀', to: '/backoffice/finance' },
          { label: '재무/자금 대시보드' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 text-white text-xs font-bold shrink-0">
              자금
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Back-Office · 재무/회계팀 · 재무팀 전용
              </span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                자금 분석 대시보드
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 연도 선택 */}
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="text-xs rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900
                text-gray-700 dark:text-gray-300 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[44px]"
            >
              {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            {/* 새로고침 */}
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg border border-blue-200 bg-white
                dark:bg-gray-900 text-blue-600 hover:bg-blue-50 min-h-[44px] disabled:opacity-50"
            >
              {loading ? <Spinner /> : '↻'} 새로고침
            </button>
          </div>
        </div>
      </div>

      {/* 에러 배너 */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-5 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* 시드 데이터 버튼 (데이터가 없을 때 안내) */}
      {!loading && stats && stats.dept_stats.length === 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
            DB에 데이터가 없습니다. 테스트용 샘플 데이터를 삽입하시겠습니까?
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="shrink-0 flex items-center gap-1 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg
              hover:bg-amber-600 min-h-[44px] disabled:opacity-50"
          >
            {seeding ? <Spinner /> : '데이터 삽입'}
          </button>
        </div>
      )}
      {seedMsg && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs text-gray-600 dark:text-gray-300">
          {seedMsg}
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
          <Spinner /> <span className="text-sm">데이터 로딩 중...</span>
        </div>
      )}

      {!loading && stats && (
        <>
          {/* ── 요약 카드 4개 ───────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: '당월 총 지출',
                value: formatWon(stats.this_month),
                sub: momChange != null
                  ? <span className={momColor}>{momPrefix}{momChange}% 전월 대비</span>
                  : '전월 데이터 없음',
              },
              {
                label: '전월 지출',
                value: formatWon(stats.last_month),
                sub: `${year}년 전월 기준`,
              },
              {
                label: '연간 총 예산',
                value: formatWon(stats.total_budget),
                sub: `${year}년 전체`,
              },
              {
                label: '위험 감사 로그',
                value: stats.danger_count > 0
                  ? <span className="text-red-500">{stats.danger_count}건</span>
                  : <span className="text-emerald-500">이상 없음</span>,
                sub: 'risk_level = danger',
              },
            ].map(card => (
              <div key={card.label}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{card.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── 차트 2개 (Pie + Area) ──────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* 부서별 지출 비중 — Pie Chart */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                부서별 지출 비중
              </h2>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-sm text-gray-400">
                  데이터 없음
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <PieTooltip formatter={v => [formatWon(v), '지출액']} />
                    <Legend
                      formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 월별 지출 추이 — Area Chart */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                월별 지출 추이 <span className="text-xs font-normal text-gray-400">({year}년)</span>
              </h2>
              {areaData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-sm text-gray-400">
                  데이터 없음
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.monthly_stats} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={v => formatWon(v)} tick={{ fontSize: 9 }} width={58} />
                    <AreaTooltip formatter={v => [formatWon(v), '지출액']} />
                    <Area
                      type="monotone"
                      dataKey="spent"
                      stroke="#3b82f6"
                      fill="url(#colorSpent)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── 부서별 예산 소진율 테이블 ──────────────────── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">부서별 예산 집행 현황</h2>
            {stats.dept_stats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">데이터 없음</p>
            ) : (
              <div className="space-y-4">
                {stats.dept_stats.map((dept, idx) => (
                  <div key={dept.department}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: DEPT_COLORS[idx % DEPT_COLORS.length] }}
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{dept.department}</span>
                        {/* 집행률 90% 이상 위험 배지 */}
                        {dept.execution_rate >= 90 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">위험</span>
                        )}
                        {dept.execution_rate >= 70 && dept.execution_rate < 90 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">주의</span>
                        )}
                      </div>
                      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                        {formatWon(dept.total_spent)}
                        {dept.budget_amount > 0 && ` / ${formatWon(dept.budget_amount)}`}
                      </span>
                    </div>
                    <BurnBar spent={dept.total_spent} budget={dept.budget_amount} />
                  </div>
                ))}
              </div>
            )}
            {/* 범례 */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {[
                { color: 'bg-blue-500',  label: '정상 (70% 미만)' },
                { color: 'bg-amber-400', label: '주의 (70~89%)' },
                { color: 'bg-red-500',   label: '위험 (90% 이상)' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* ── AI CFO 리포트 ───────────────────────────────── */}
          <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  AI CFO 재무 분석 리포트
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">gpt-4o-mini — CFO 관점의 예산 분석 및 조언</p>
              </div>
              <button
                onClick={handleReport}
                disabled={rptLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg
                  hover:bg-purple-700 disabled:opacity-50 min-h-[44px]"
              >
                {rptLoading ? <><Spinner /> 분석 중...</> : '리포트 생성'}
              </button>
            </div>

            {rptError && (
              <p className="text-sm text-red-500 mb-3">{rptError}</p>
            )}

            {!report && !rptLoading && (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700
                flex items-center justify-center py-10 text-sm text-gray-400">
                리포트 생성 버튼을 눌러 CFO 관점 분석을 시작하세요
              </div>
            )}

            {report && (
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-4">
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {report}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
