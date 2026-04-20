// 내부감사 페이지 — 이상 지출 탐지(FDS) · 감사 로그 관리 · 월간 보고서 (재무팀 전용)
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { getAuthSession } from '../../../api/auth'
import {
  runAuditDetection, getAuditLogs,
  confirmAuditLog, generateAuditReport,
} from '../../../api/finance'

// ── 위험도 스타일 설정 ────────────────────────────────────────
const RISK = {
  danger: {
    label:      'Danger',
    badge:      'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    border:     'border-red-200 dark:border-red-800',
    dot:        'bg-red-500',
    reasonBg:   'bg-red-50 dark:bg-red-900/20',
    reasonText: 'text-red-700 dark:text-red-300',
    divider:    'border-red-100 dark:border-red-900/50',
    rank:       1,
  },
  warning: {
    label:      'Warning',
    badge:      'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    border:     'border-amber-200 dark:border-amber-800',
    dot:        'bg-amber-400',
    reasonBg:   'bg-amber-50 dark:bg-amber-900/20',
    reasonText: 'text-amber-700 dark:text-amber-300',
    divider:    'border-amber-100 dark:border-amber-900/50',
    rank:       2,
  },
  safe: {
    label:      'Safe',
    badge:      'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    border:     'border-gray-200 dark:border-gray-700',
    dot:        'bg-emerald-500',
    reasonBg:   'bg-emerald-50 dark:bg-emerald-900/20',
    reasonText: 'text-emerald-700 dark:text-emerald-300',
    divider:    'border-gray-100 dark:border-gray-700',
    rank:       3,
  },
}

// 금액 포맷
function formatWon(n) {
  if (n == null) return '-'
  return `${Number(n).toLocaleString()}원`
}

// 로딩 스피너
function Spinner({ size = 4 }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// 접근 거부 화면
function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-2xl">🔒</div>
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

// 위험도 배지
function RiskBadge({ level }) {
  const r = RISK[level] || RISK.safe
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${r.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
      {r.label}
    </span>
  )
}

// 확인 완료 배지
function ConfirmedBadge({ isConfirmed, confirmedBy }) {
  if (!isConfirmed) return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
      미확인
    </span>
  )
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
      확인완료 {confirmedBy ? `(${confirmedBy})` : ''}
    </span>
  )
}

// ── 감사 로그 카드 ───────────────────────────────────────────
function AuditCard({ log, expanded, onToggle, onConfirm, confirming }) {
  const r           = RISK[log.risk_level] || RISK.safe
  const [name, setName] = useState('')

  return (
    <div className={`rounded-xl border transition-all ${r.border} bg-white dark:bg-gray-900 overflow-hidden`}>
      {/* 카드 헤더 — 클릭 시 펼치기 */}
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors min-h-[56px]"
        onClick={onToggle}
      >
        <RiskBadge level={log.risk_level} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {log.item || '(전표 없음)'}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                {formatWon(log.total_amount)}
              </span>
              <ConfirmedBadge isConfirmed={log.is_confirmed} confirmedBy={log.confirmed_by} />
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {log.department} · {log.account_code} · {log.receipt_date}
          </p>
        </div>
        {/* 펼치기 화살표 */}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 카드 본문 — 펼쳐진 상태 */}
      {expanded && (
        <div className={`px-5 pb-5 border-t ${r.divider}`}>
          {/* AI 판단 사유 */}
          <div className={`mt-4 rounded-lg p-4 ${r.reasonBg}`}>
            <p className={`text-xs font-semibold mb-1.5 ${r.reasonText}`}>AI 판단 사유</p>
            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{log.ai_reason}</p>
          </div>

          {/* 위반 규정 */}
          {log.violated_rule && (
            <div className="flex items-start gap-2 mt-3">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                위반 규정: <span className="font-medium text-gray-700 dark:text-gray-300">{log.violated_rule}</span>
              </span>
            </div>
          )}

          {/* 전표 상세 정보 */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { label: '거래처', value: log.vendor || '-' },
              { label: '금액',   value: formatWon(log.amount) },
              { label: '부가세', value: formatWon(log.tax_amount) },
              { label: '탐지일', value: log.created_at?.slice(0, 10) || '-' },
              { label: '전표 ID', value: `#${log.transaction_id}` },
              { label: '메모',   value: log.memo || '-' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                <p className="text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
                <p className="text-gray-700 dark:text-gray-200 font-medium truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* 확인 처리 영역 */}
          {!log.is_confirmed && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="확인자 이름 입력"
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 min-w-[140px] text-sm rounded-lg border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
                  px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[44px]"
              />
              <button
                onClick={() => onConfirm(log.id, name)}
                disabled={confirming || !name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg
                  hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
              >
                {confirming ? <><Spinner size={3} /> 처리 중</> : '✓ 확인 완료'}
              </button>
            </div>
          )}

          {/* 이미 확인된 경우 */}
          {log.is_confirmed && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <span>✓</span>
              <span>{log.confirmed_by}님이 {log.confirmed_at?.slice(0, 10)}에 확인 완료</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 월간 감사 보고서 패널 ─────────────────────────────────────
function ReportPanel({ employeeId }) {
  const [report,   setReport]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [meta,     setMeta]     = useState(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setReport('')
    try {
      const data = await generateAuditReport(employeeId)
      setReport(data.report)
      setMeta({ danger: data.danger_count, warning: data.warning_count, total: data.total_items })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">월간 감사 보고서</h2>
          <p className="text-xs text-gray-400 mt-0.5">이번 달 Danger/Warning 항목을 집계하여 경영진 보고용 요약 생성</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg
            hover:bg-purple-700 disabled:opacity-50 min-h-[44px]"
        >
          {loading ? <><Spinner size={3} /> 생성 중...</> : '보고서 생성'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-3">{error}</p>
      )}

      {meta && (
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-medium">
            Danger {meta.danger}건
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-medium">
            Warning {meta.warning}건
          </span>
          <span className="text-xs text-gray-400">총 {meta.total}건 분석</span>
        </div>
      )}

      {!report && !loading && (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700
          flex items-center justify-center py-10 text-sm text-gray-400">
          보고서 생성 버튼을 눌러 이번 달 감사 요약을 작성하세요
        </div>
      )}

      {report && (
        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-4">
          <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
            {report}
          </p>
        </div>
      )}
    </div>
  )
}


// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function AuditPage() {
  const session  = getAuthSession()
  const employee = session?.employee

  // 권한 체크 — 재무팀 or 대표이사
  const hasAccess = employee?.department === '재무팀' || employee?.department === '재무/회계팀' || employee?.position === '대표이사'

  const [logs,         setLogs]         = useState([])
  const [tabCounts,    setTabCounts]    = useState({ total: 0, danger: 0, warning: 0, safe: 0, unconfirmed: 0 })
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [expandedId,   setExpandedId]   = useState(null)
  const [running,      setRunning]      = useState(false)
  const [runMsg,       setRunMsg]       = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)

  // ── 감사 로그 조회 ─────────────────────────────────────────
  const loadLogs = useCallback(async (filter = activeFilter) => {
    if (!hasAccess) return
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filter === 'unconfirmed') {
        params.is_confirmed = false
      } else if (filter !== 'all') {
        params.risk_level = filter
      }
      const data = await getAuditLogs(params, employee.employee_id)
      setLogs(data.items)

      // 전체 필터일 때만 탭 카운트 업데이트 (다른 필터 전환 시 카운트 유지)
      if (filter === 'all') {
        setTabCounts({
          total:       data.total,
          danger:      data.items.filter(l => l.risk_level === 'danger').length,
          warning:     data.items.filter(l => l.risk_level === 'warning').length,
          safe:        data.items.filter(l => l.risk_level === 'safe').length,
          unconfirmed: data.items.filter(l => !l.is_confirmed && l.risk_level !== 'safe').length,
        })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [hasAccess, employee, activeFilter])

  useEffect(() => { loadLogs() }, [])  // 최초 1회 로드

  // ── 탐지 엔진 실행 ─────────────────────────────────────────
  const handleRunDetection = async () => {
    setRunning(true)
    setRunMsg(null)
    try {
      const data = await runAuditDetection(employee.employee_id)
      if (data.saved === 0) {
        setRunMsg({ type: 'info', text: data.message || '탐지된 이상 지출이 없습니다.' })
      } else {
        setRunMsg({ type: 'success', text: `탐지 완료 — ${data.analyzed}건 분석 / ${data.saved}건 저장` })
      }
      // 탐지 후 전체 필터로 재로드 → 탭 카운트 정확하게 갱신
      setActiveFilter('all')
      setExpandedId(null)
      await loadLogs('all')
    } catch (e) {
      setRunMsg({ type: 'error', text: e.message })
    } finally {
      setRunning(false)
    }
  }

  // ── 확인 처리 ──────────────────────────────────────────────
  const handleConfirm = async (logId, confirmedBy) => {
    if (!confirmedBy.trim()) return
    setConfirmingId(logId)
    try {
      await confirmAuditLog(logId, confirmedBy, employee.employee_id)
      // 해당 로그만 로컬 업데이트 (재조회 없이)
      setLogs(prev => prev.map(l =>
        l.id === logId
          ? { ...l, is_confirmed: true, confirmed_by: confirmedBy, confirmed_at: new Date().toISOString() }
          : l
      ))
      // 미확인 카운트 1 감소
      setTabCounts(prev => ({ ...prev, unconfirmed: Math.max(0, prev.unconfirmed - 1) }))
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirmingId(null)
    }
  }

  // ── 필터 변경 ──────────────────────────────────────────────
  const handleFilterChange = (key) => {
    setActiveFilter(key)
    setExpandedId(null)
    loadLogs(key)
  }

  if (!hasAccess) return <AccessDenied />

  const FILTERS = [
    { key: 'all',         label: '전체',   count: tabCounts.total },
    { key: 'danger',      label: 'Danger', count: tabCounts.danger },
    { key: 'warning',     label: 'Warning', count: tabCounts.warning },
    { key: 'safe',        label: 'Safe',   count: tabCounts.safe },
    { key: 'unconfirmed', label: '미확인', count: tabCounts.unconfirmed },
  ]

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '재무/회계팀', to: '/backoffice/finance' },
          { label: '내부감사 (FDS)' },
        ]}
      />

      {/* ── 헤더 ────────────────────────────────────────────── */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 text-white text-xs font-bold shrink-0">
              감사
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Back-Office · 재무/회계팀 · 재무팀 전용
              </span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                이상 지출 탐지 (FDS)
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Rule-based 필터링 + AI가 규정 위반 및 이상 지출 패턴을 자동 탐지합니다.
              </p>
            </div>
          </div>

          {/* 탐지 실행 버튼 */}
          <button
            onClick={handleRunDetection}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-red-600 text-white
              rounded-lg hover:bg-red-700 disabled:opacity-50 min-h-[44px] shrink-0"
          >
            {running
              ? <><Spinner size={4} /> 탐지 중...</>
              : <>⚡ AI 탐지 실행</>
            }
          </button>
        </div>

        {/* 요약 배지 */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {tabCounts.danger > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300">
              Danger {tabCounts.danger}건
            </span>
          )}
          {tabCounts.warning > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              Warning {tabCounts.warning}건
            </span>
          )}
          {tabCounts.unconfirmed > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              미확인 {tabCounts.unconfirmed}건
            </span>
          )}
          {tabCounts.total === 0 && !loading && (
            <span className="text-xs text-gray-400">탐지 결과 없음 — AI 탐지를 실행하세요</span>
          )}
        </div>

        {/* 탐지 실행 결과 메시지 */}
        {runMsg && (
          <div className={`mt-3 text-sm px-4 py-2 rounded-lg flex items-center justify-between gap-2 ${
            runMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
            runMsg.type === 'error'   ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                        'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}>
            <span>{runMsg.text}</span>
            <button onClick={() => setRunMsg(null)} className="shrink-0 opacity-60 hover:opacity-100 text-base leading-none">×</button>
          </div>
        )}
      </div>

      {/* 에러 배너 */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-5 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ── 탐지 규칙 안내 ──────────────────────────────────── */}
      <div className="mb-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">탐지 규칙</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-bold shrink-0">①</span>
            <span>동일 부서·계정과목의 이전 누적 평균 대비 <strong>150% 초과</strong> 지출</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-bold shrink-0">②</span>
            <span>주말(토·일) 발생 고액 지출 (<strong>50만원 이상</strong>)</span>
          </div>
        </div>
      </div>

      {/* ── 필터 탭 ─────────────────────────────────────────── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={[
              'min-h-[44px] px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeFilter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300',
            ].join(' ')}
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${activeFilter === f.key ? 'opacity-75' : 'text-gray-400'}`}>
              {f.count}
            </span>
          </button>
        ))}

        {/* 새로고침 */}
        <button
          onClick={() => loadLogs(activeFilter)}
          disabled={loading}
          className="ml-auto flex items-center gap-1 text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 min-h-[44px] disabled:opacity-50"
        >
          {loading ? <Spinner size={3} /> : '↻'} 새로고침
        </button>
      </div>

      {/* ── 탐지 결과 목록 ──────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Spinner size={5} /> <span className="text-sm">로딩 중...</span>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-sm text-gray-400 mb-2">
            {activeFilter === 'unconfirmed' ? '미확인 항목이 없습니다.' : '탐지 결과가 없습니다.'}
          </p>
          {activeFilter === 'all' && (
            <p className="text-xs text-gray-300 dark:text-gray-600">상단의 <strong>AI 탐지 실행</strong> 버튼을 눌러 분석을 시작하세요.</p>
          )}
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-3 mb-8">
          {logs.map(log => (
            <AuditCard
              key={log.id}
              log={log}
              expanded={expandedId === log.id}
              onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              onConfirm={handleConfirm}
              confirming={confirmingId === log.id}
            />
          ))}
        </div>
      )}

      {/* ── 월간 감사 보고서 ─────────────────────────────────── */}
      <ReportPanel employeeId={employee?.employee_id} />
    </div>
  )
}
