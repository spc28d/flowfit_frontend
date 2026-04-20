// 내 평가 결과 보고서 — 본인이 받은 인사 평가 내역을 기간별로 확인
import { useEffect, useMemo, useState } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { getMyEvaluations } from '../../../api/hr'
import { getAuthSession } from '../../../api/auth'

const GRADE_COLOR = {
  A: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  B: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  C: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  D: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

const GRADE_RING = {
  A: 'border-blue-300 dark:border-blue-700',
  B: 'border-green-300 dark:border-green-700',
  C: 'border-amber-300 dark:border-amber-700',
  D: 'border-red-300 dark:border-red-700',
}

function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function GradeBadge({ grade, large = false }) {
  const cls = GRADE_COLOR[grade] || GRADE_COLOR.D
  return (
    <span className={`${large ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs'} rounded-full font-bold ${cls}`}>
      {grade || '-'}
    </span>
  )
}

function ScoreBar({ label, value, max = 100, accent = 'bg-blue-500' }) {
  const pct = Math.min(100, Math.max(0, (Number(value) || 0) / max * 100))
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{Number(value || 0).toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full ${accent}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatWon(amount) {
  if (!amount) return '-'
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(0)}만`
  return amount.toLocaleString()
}

export default function MyEvaluation() {
  const session = getAuthSession()
  const employee = session?.employee || {}
  const employeeId = employee.employee_id || ''
  const employeeName = employee.name || ''

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeKey, setActiveKey] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    if (!employeeId && !employeeName) {
      setError('로그인 정보가 없어 본인 평가 결과를 조회할 수 없습니다.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getMyEvaluations(employeeId, employeeName)
      .then(res => {
        if (cancelled) return
        const arr = res?.items || []
        setItems(arr)
      })
      .catch(e => {
        if (!cancelled) setError(e.message || '평가 결과를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [employeeId, employeeName])

  const filteredItems = useMemo(
    () => typeFilter === 'all' ? items : items.filter(it => it.eval_type === typeFilter),
    [items, typeFilter],
  )

  const typeCounts = useMemo(() => {
    const c = { all: items.length, quarter: 0, half: 0, year: 0 }
    items.forEach(it => {
      if (it.eval_type in c) c[it.eval_type] += 1
    })
    return c
  }, [items])

  // 필터 변경 또는 데이터 재조회 시 활성 항목 보정
  useEffect(() => {
    if (filteredItems.length === 0) {
      setActiveKey('')
      return
    }
    if (!filteredItems.some(it => it.eval_key === activeKey)) {
      setActiveKey(filteredItems[0].eval_key)
    }
  }, [filteredItems, activeKey])

  const active = useMemo(
    () => filteredItems.find(it => it.eval_key === activeKey) || filteredItems[0] || null,
    [filteredItems, activeKey],
  )

  const summary = useMemo(() => {
    if (filteredItems.length === 0) return null
    const grades = filteredItems.reduce((acc, it) => {
      const g = it.overall_grade || 'D'
      acc[g] = (acc[g] || 0) + 1
      return acc
    }, {})
    const avgCombined = filteredItems.reduce((s, it) => s + (it.combined_score || 0), 0) / filteredItems.length
    const latest = filteredItems[0]
    const latestEnabled = (latest?.criteria_config?.items || []).filter(i => i.enabled)
    return {
      total: filteredItems.length,
      grades,
      avgCombined: avgCombined.toFixed(1),
      latest,
      latestEnabled,
    }
  }, [filteredItems])

  const TYPE_OPTIONS = [
    { value: 'all', label: '전체' },
    { value: 'quarter', label: '분기' },
    { value: 'half', label: '반기' },
    { value: 'year', label: '연간' },
  ]

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '내 평가 결과 보고서' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Back-Office · 인사(HR)팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              내 평가 결과 보고서
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          본인이 받은 인사 평가 내역을 기간별로 확인하고 업무·역량 점수와 종합 등급을 분석합니다.
        </p>
        {(employeeName || employeeId) && (
          <div className="mt-3 inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            <span>{employeeName || '이름 미상'}</span>
            {employee.department && <span className="opacity-60">· {employee.department}</span>}
            {employee.position && <span className="opacity-60">· {employee.position}</span>}
            {employeeId && <span className="opacity-60">({employeeId})</span>}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-5 py-3 mb-5">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center gap-3">
          <Spinner className="w-6 h-6 text-blue-500" />
          <p className="text-sm text-gray-400">평가 결과를 불러오는 중 ...</p>
        </div>
      )}

      {/* 평가 유형 필터 */}
      {!loading && !error && items.length > 0 && (
        <div className="mb-5 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">평가 유형</span>
          {TYPE_OPTIONS.map(opt => {
            const count = typeCounts[opt.value] || 0
            const isActive = typeFilter === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`min-h-[36px] px-4 text-sm font-medium rounded-xl border transition-colors inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'border-blue-400 bg-blue-500 text-white'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                }`}
              >
                {opt.label}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm text-gray-400">아직 등록된 인사 평가 결과가 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">평가가 완료되면 여기에서 확인할 수 있습니다.</p>
        </div>
      )}

      {!loading && items.length > 0 && filteredItems.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-sm text-gray-400">
            선택한 평가 유형에 해당하는 결과가 없습니다.
          </p>
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <>
          {/* 요약 카드 */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-1">평가 횟수</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.total}회</p>
                <p className="text-[11px] text-gray-400 mt-0.5">최근: {summary.latest?.eval_label}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-1">평균 종합 점수</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.avgCombined}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">100점 만점</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-1">최근 평가 항목</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-tight">
                  {summary.latestEnabled.length > 0 ? `${summary.latestEnabled.length}개 항목` : '-'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1 truncate">
                  {summary.latestEnabled.map(i => i.label).join(', ') || '항목 없음'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-400 mb-1">받은 등급</p>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {['A', 'B', 'C', 'D'].map(g => {
                    const c = summary.grades[g] || 0
                    const active = c > 0
                    return (
                      <div
                        key={g}
                        className={`flex flex-col items-center justify-center rounded-md py-1 ${
                          active ? GRADE_COLOR[g] : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        <span className="text-[15px] font-bold leading-tight">{g}</span>
                        <span className="text-[12px] font-semibold leading-tight">{c}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
            {/* 평가 기간 목록 */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden h-fit">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  평가 기간
                </p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredItems.map(it => {
                  const isActive = it.eval_key === active?.eval_key
                  return (
                    <li key={it.eval_key}>
                      <button
                        onClick={() => setActiveKey(it.eval_key)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2 transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-white'
                          }`}>
                            {it.eval_label}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {it.start_date} ~ {it.end_date}
                          </p>
                        </div>
                        <GradeBadge grade={it.overall_grade} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* 상세 결과 */}
            {active && (
              <div className="flex flex-col gap-5">
                {/* 종합 등급 */}
                <div className={`rounded-xl border-2 ${GRADE_RING[active.overall_grade] || GRADE_RING.D} p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {active.eval_label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {active.start_date} ~ {active.end_date}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {active.department}{active.position ? ` · ${active.position}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-gray-400 mb-1">종합 등급</p>
                      <GradeBadge grade={active.overall_grade} large />
                      <p className="text-[11px] text-gray-400 mt-2">
                        종합 점수 <span className="font-semibold text-gray-700 dark:text-gray-200">{active.combined_score}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 점수 상세 — 평가 항목별 (criteria 기반) */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    평가 항목별 점수
                  </p>
                  {(() => {
                    const enabled = (active.criteria_config?.items || []).filter(i => i.enabled)
                    if (enabled.length === 0) {
                      return <p className="text-sm text-gray-400">표시할 항목이 없습니다.</p>
                    }
                    const accents = ['bg-blue-500', 'bg-blue-400', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500', 'bg-amber-500']
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {enabled.map((item, i) => (
                          <ScoreBar
                            key={item.key}
                            label={`${item.label} (${item.weight}%)`}
                            value={active[item.key]}
                            max={item.max || 100}
                            accent={accents[i % accents.length]}
                          />
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* 영업 실적 */}
                {(active.sales_revenue > 0 || active.sales_wins > 0) && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      영업 실적 참고
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                        <p className="text-[11px] text-gray-400">매출</p>
                        <p className="text-base font-bold text-gray-900 dark:text-white">{formatWon(active.sales_revenue)}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                        <p className="text-[11px] text-gray-400">수주 건수</p>
                        <p className="text-base font-bold text-gray-900 dark:text-white">{active.sales_wins}건</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
