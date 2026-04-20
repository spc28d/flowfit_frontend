// 팀원 평가하기 페이지 - 같은 부서 팀원에게 점수를 부여
import { useState, useEffect, useSyncExternalStore } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import {
  getTeamMembers,
  submitTeamEval,
  getMyTeamEvaluations,
  getMyReceivedEvaluations,
} from '../../../api/hr'
import { getAuthSession } from '../../../api/auth'

// 평가 기준 (Evaluate 페이지 모달에서 저장된 설정) — 팀원평가 항목 정의
const CRITERIA_STORAGE_KEY = 'hr-eval-criteria-v3'

// 팀원평가 DB 슬롯 — criteria 항목을 순서대로 매핑
const TEAM_EVAL_DB_SLOTS = ['work_score', 'leadership_score', 'expertise_score', 'collaboration_score']

const DEFAULT_TEAM_ITEMS = [
  { dbField: 'work_score',          label: '업무 성과' },
  { dbField: 'leadership_score',    label: '리더십' },
  { dbField: 'expertise_score',     label: '전문성' },
  { dbField: 'collaboration_score', label: '협업' },
]

function buildTeamItemsFromRaw(raw) {
  if (!raw) return DEFAULT_TEAM_ITEMS
  try {
    const parsed = JSON.parse(raw)
    const enabled = (parsed?.items || []).filter(i => i.enabled && i.team_eval && (i.label || '').trim())
    return enabled.slice(0, TEAM_EVAL_DB_SLOTS.length).map((it, idx) => ({
      dbField: TEAM_EVAL_DB_SLOTS[idx],
      label: it.label,
    }))
  } catch {
    return DEFAULT_TEAM_ITEMS
  }
}

// localStorage를 React 외부 스토어로 구독 — 저장 즉시 자동 반영
function subscribeCriteria(callback) {
  window.addEventListener('storage', callback)
  window.addEventListener('hr-eval-criteria-changed', callback)
  window.addEventListener('focus', callback)
  document.addEventListener('visibilitychange', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('hr-eval-criteria-changed', callback)
    window.removeEventListener('focus', callback)
    document.removeEventListener('visibilitychange', callback)
  }
}

function getCriteriaSnapshot() {
  return localStorage.getItem(CRITERIA_STORAGE_KEY) || ''
}

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

function SuccessBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-5 py-3 mb-5">
      <p className="text-sm text-green-700 dark:text-green-300">{message}</p>
    </div>
  )
}

const SELECT_CHEVRON_STYLE = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  backgroundSize: '14px 14px',
}

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

let _starUid = 0

function StarRating({ value = 0, onChange, readOnly = false, size = 'md' }) {
  const [hover, setHover] = useState(0)
  const [uid] = useState(() => ++_starUid)
  const pxSize = size === 'lg' ? 36 : size === 'sm' ? 16 : 32
  const active = hover || value

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const halfVal = star - 0.5
        const fullVal = star

        let fill = 'empty'
        if (active >= fullVal) fill = 'full'
        else if (active >= halfVal) fill = 'half'

        const isHovering = hover > 0
        const filledColor = isHovering ? '#9ca3af' : '#fbbf24'
        const halfId = `sh-${uid}-${star}`

        return (
          <div key={star} className="relative" style={{ width: pxSize, height: pxSize }}>
            {/* 빈 별 배경 */}
            <svg width={pxSize} height={pxSize} viewBox="0 0 24 24" className="text-gray-200 dark:text-gray-600">
              <path d={STAR_PATH} fill="currentColor" />
            </svg>

            {/* 채워진 별 (half 일 때 clipPath로 왼쪽 반만) */}
            {fill !== 'empty' && (
              <svg width={pxSize} height={pxSize} viewBox="0 0 24 24" className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                {fill === 'half' && (
                  <defs>
                    <clipPath id={halfId}>
                      <rect x="0" y="0" width="12" height="24" />
                    </clipPath>
                  </defs>
                )}
                <path
                  d={STAR_PATH}
                  fill={filledColor}
                  clipPath={fill === 'half' ? `url(#${halfId})` : undefined}
                />
              </svg>
            )}

            {/* 클릭/hover 영역: 왼쪽 반 = 0.5점, 오른쪽 반 = 1점 */}
            {!readOnly && (
              <>
                <div
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer z-10"
                  onClick={() => onChange?.(value === halfVal ? 0 : halfVal)}
                  onMouseEnter={() => setHover(halfVal)}
                  onMouseLeave={() => setHover(0)}
                />
                <div
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer z-10"
                  onClick={() => onChange?.(value === fullVal ? 0 : fullVal)}
                  onMouseEnter={() => setHover(fullVal)}
                  onMouseLeave={() => setHover(0)}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StarsDisplay({ value, size = 'sm' }) {
  const rounded = Math.round(value * 10) / 10
  const pxSize = size === 'lg' ? 20 : 14
  const [uid] = useState(() => ++_starUid)

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0">
        {[1, 2, 3, 4, 5].map(star => {
          let fill = 'empty'
          if (value >= star) fill = 'full'
          else if (value >= star - 0.5) fill = 'half'
          const halfId = `sd-${uid}-${star}`
          return (
            <div key={star} className="relative" style={{ width: pxSize, height: pxSize }}>
              <svg width={pxSize} height={pxSize} viewBox="0 0 24 24" className="text-gray-200 dark:text-gray-600">
                <path d={STAR_PATH} fill="currentColor" />
              </svg>
              {fill !== 'empty' && (
                <svg width={pxSize} height={pxSize} viewBox="0 0 24 24" className="absolute inset-0">
                  {fill === 'half' && (
                    <defs>
                      <clipPath id={halfId}>
                        <rect x="0" y="0" width="12" height="24" />
                      </clipPath>
                    </defs>
                  )}
                  <path
                    d={STAR_PATH}
                    fill="#fbbf24"
                    clipPath={fill === 'half' ? `url(#${halfId})` : undefined}
                  />
                </svg>
              )}
            </div>
          )
        })}
      </div>
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{rounded}</span>
    </div>
  )
}

export default function TeamEval() {
  const session = getAuthSession()
  const employee = session?.employee || {}

  const currentYear = new Date().getFullYear()
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)

  const [year, setYear] = useState(currentYear)
  const [quarter, setQuarter] = useState(currentQuarter)

  const [members, setMembers] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [submitted, setSubmitted] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(null)
  // 인사팀이 설정한 팀원평가 항목 — localStorage를 외부 스토어로 구독하여 항상 최신 값 사용
  const criteriaRaw = useSyncExternalStore(subscribeCriteria, getCriteriaSnapshot)
  const teamItems = buildTeamItemsFromRaw(criteriaRaw)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // 나의 평가 결과
  const [received, setReceived] = useState(null)
  const [receivedLoading, setReceivedLoading] = useState(false)

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  // 팀원 목록 + 기존 제출 이력 로드
  useEffect(() => {
    if (!employee.employee_id || !employee.department) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    Promise.all([
      getTeamMembers(employee.employee_id, employee.department),
      getMyTeamEvaluations(employee.employee_id, year, quarter),
    ])
      .then(([memberList, myEvals]) => {
        setMembers(memberList)
        setSubmitted(myEvals)

        // 기존 평가가 있으면 해당 점수로 프리필, 없으면 초기값
        const existingMap = {}
        for (const ev of myEvals) {
          existingMap[ev.target_name] = ev
        }

        const initEvals = memberList.map(m => {
          const existing = existingMap[m.name]
          return {
            target_id: m.employee_id,
            target_name: m.name,
            target_department: m.department,
            target_position: m.position,
            work_score: existing?.work_score || 0,
            leadership_score: existing?.leadership_score || 0,
            expertise_score: existing?.expertise_score || 0,
            collaboration_score: existing?.collaboration_score || 0,
            comment: existing?.comment || '',
          }
        })
        setEvaluations(initEvals)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [employee.employee_id, employee.department, year, quarter])

  // 나의 평가 결과 로드
  useEffect(() => {
    if (!employee.name) return

    setReceivedLoading(true)
    getMyReceivedEvaluations(employee.name, year, quarter)
      .then(setReceived)
      .catch(() => setReceived(null))
      .finally(() => setReceivedLoading(false))
  }, [employee.name, year, quarter])

  function updateEval(idx, field, val) {
    setEvaluations(prev =>
      prev.map((ev, i) =>
        i === idx
          ? { ...ev, [field]: field === 'comment' ? val : (Number(val) || 0) }
          : ev
      )
    )
  }

  async function handleSubmitOne(idx) {
    const ev = evaluations[idx]
    if (!ev) return
    const hasScore = teamItems.some(it  => (ev[it.dbField] || 0) > 0)
    if (!hasScore) {
      setError('별점을 1개 이상 입력해 주세요.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await submitTeamEval({
        evaluator_id: employee.employee_id,
        evaluator_name: employee.name,
        evaluator_department: employee.department,
        eval_year: year,
        eval_quarter: quarter,
        evaluations: [ev],
      })
      setSuccess(`${ev.target_name}님 평가가 저장되었습니다.`)

      // 제출 이력 새로고침
      const myEvals = await getMyTeamEvaluations(employee.employee_id, year, quarter)
      setSubmitted(myEvals)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedEval = selectedIdx !== null ? evaluations[selectedIdx] : null

  const noAccess = !employee.employee_id || !employee.department

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '팀원 평가하기' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Back-Office · 인사(HR)팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              팀원 평가하기
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          같은 부서 팀원의 업무 성과와 역량을 평가합니다.
        </p>
      </div>

      {noAccess ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-sm text-gray-400">로그인 후 이용할 수 있습니다.</p>
        </div>
      ) : (
        <>
          {/* 평가 기간 설정 */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">평가 기간</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">연도</label>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  style={SELECT_CHEVRON_STYLE}
                  className="appearance-none w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-4 pr-10 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {yearOptions.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">분기</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(q => (
                    <button
                      key={q}
                      onClick={() => setQuarter(q)}
                      className={`flex-1 min-h-[44px] text-sm font-medium rounded-xl border transition-colors ${
                        quarter === q
                          ? 'border-blue-400 bg-blue-500 text-white'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                      }`}
                    >
                      Q{q}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">평가자</label>
                <div className="w-full text-sm rounded-xl border border-blue-200 dark:border-blue-600 bg-blue-50 dark:bg-blue-800 text-blue-900 dark:text-white px-4 py-2.5 min-h-[44px] flex items-center justify-between">
                  <span className="font-medium ">{employee.name}</span>
                  <span className="text-[11px] text-gray-500 ml-2">{employee.department} · {employee.position || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <ErrorBanner message={error} />
          <SuccessBanner message={success} />

          {/* 로딩 */}
          {loading && (
            <div className="rounded-xl mb-7 border border-gray-200 dark:border-gray-700 p-17 flex flex-col items-center gap-3">
              <p className="text-sm text-gray-400">팀원 정보 로딩 중 ...</p>
            </div>
          )}

          {/* 팀원 없음 */}
          {!loading && members.length === 0 && (
            <div className="rounded-xl mb-7 border border-dashed border-gray-200 dark:border-gray-700 p-17 text-center">

              <p className="text-sm text-gray-400">같은 부서에 평가 가능한 팀원이 없습니다.</p>
            </div>
          )}

          {/* 팀원 목록, 개별 평가 */}
          {!loading && evaluations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
              {/* 왼쪽: 팀원 목록 - 오른쪽 패널 높이에 맞춤 */}
              <div className="sm:col-span-1 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col sm:max-h-[480px]">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 shrink-0">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {employee.department} 팀원 목록 ({evaluations.length}명)
                  </p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 overflow-y-auto flex-1">
                  {evaluations.map((ev, idx) => {
                    const isSubmitted = submitted.some(s => s.target_name === ev.target_name)
                    const isSelected = selectedIdx === idx
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedIdx(idx)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-white'}`}>
                              {ev.target_name}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {ev.target_department} · {ev.target_position || '직급 미지정'}
                            </p>
                          </div>
                          {isSubmitted && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
                              완료
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 오른쪽: 선택된 팀원 평가 */}
              <div className="sm:col-span-2">
                {selectedEval ? (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    {/* 대상자 정보 */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">{selectedEval.target_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {selectedEval.target_department} · {selectedEval.target_position || '직급 미지정'}
                        </p>
                      </div>
                      {submitted.some(s => s.target_name === selectedEval.target_name) && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                          제출 완료
                        </span>
                      )}
                    </div>

                    {/* 별점 입력 — 인사팀이 설정한 팀원평가 항목 */}
                    <div className="flex flex-col gap-4 mb-5">
                      {teamItems.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">
                          인사팀에서 팀원평가 항목이 설정되지 않았습니다.
                        </p>
                      ) : teamItems.map((it, i) => (
                        <div key={it.dbField} className="flex items-center justify-between">
                          <label className={`text-xs font-medium w-24 shrink-0 ${
                            i === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-blue-500 dark:text-blue-400'
                          }`}>
                            {it.label}
                          </label>
                          <StarRating
                            value={selectedEval[it.dbField]}
                            onChange={v => updateEval(selectedIdx, it.dbField, v)}
                            size="lg"
                          />
                        </div>
                      ))}
                    </div>

                    {/* 코멘트 */}
                    <div className="mb-5">
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                        코멘트 (선택)
                      </label>
                      <textarea
                        value={selectedEval.comment}
                        onChange={e => updateEval(selectedIdx, 'comment', e.target.value)}
                        placeholder="해당 팀원에 대한 의견을 자유롭게 작성하세요 ..."
                        rows={3}
                        className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      />
                    </div>

                    {/* 개별 제출 버튼 */}
                    <button
                      onClick={() => handleSubmitOne(selectedIdx)}
                      disabled={saving}
                      className="w-full min-h-[44px] rounded-xl bg-blue-500 hover:bg-blue-600
                        disabled:bg-gray-300 dark:disabled:bg-gray-700
                        text-white text-sm font-semibold transition-colors
                        flex items-center justify-center gap-2"
                    >
                      {saving ? <><Spinner />저장 중 ...</> : `평가 제출하기`}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center justify-center sm:min-h-[480px]">
                    <svg className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    <p className="text-sm text-gray-400">왼쪽 목록에서 평가할 팀원을 선택하세요.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 나의 평가 결과 */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
            <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  {year}년 Q{quarter} 나의 평가 결과
                </p>
              </div>
            </div>

            {receivedLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Spinner className="w-5 h-5 text-blue-500" />
              </div>
            ) : !received || received.eval_count === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400">아직 받은 평가가 없습니다.</p>
              </div>
            ) : (
              <div className="p-5">
                {/* 평균 별점 카드 — 동적 항목 */}
                {(() => {
                  const SCORE_KEY_MAP = {
                    work_score: 'avg_work',
                    leadership_score: 'avg_leadership',
                    expertise_score: 'avg_expertise',
                    collaboration_score: 'avg_collaboration',
                  }
                  const cards = teamItems.map(it => ({
                    label: it.label,
                    value: received.scores[SCORE_KEY_MAP[it.dbField]] || 0,
                  }))
                  const colCount = Math.min(5, cards.length + 1)
                  return (
                    <div className={`grid grid-cols-2 sm:grid-cols-${colCount} gap-3 mb-5`}>
                      <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/50 px-3 py-3 text-center">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mb-1">평가자 수</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {received.scores.eval_count}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">명</span>
                        </p>
                      </div>
                      {cards.map((item, i) => (
                        <div key={i} className="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 px-3 py-3">
                          <p className="text-[10px] text-gray-400 font-medium mb-2 text-center">{item.label}</p>
                          <div className="flex justify-center">
                            <StarsDisplay value={item.value} size="lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* 종합 평균 — 활성 팀원평가 항목 평균 */}
                {received.scores && (() => {
                  const SCORE_KEY_MAP = {
                    work_score: 'avg_work',
                    leadership_score: 'avg_leadership',
                    expertise_score: 'avg_expertise',
                    collaboration_score: 'avg_collaboration',
                  }
                  const values = teamItems.map(it => received.scores[SCORE_KEY_MAP[it.dbField]] || 0)
                  const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0
                  return (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 mb-5 flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">종합 평균</p>
                      <div className="flex items-center gap-3">
                        <StarsDisplay value={avg} size="lg" />
                        <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{avg.toFixed(2)}
                          <span className="text-xs font-normal text-blue-500 ml-0.5">/ 5</span>
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {/* 코멘트(익명) */}
                {received.comments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      코멘트 {received.comments.length}건
                    </p>
                    <div className="flex flex-col gap-2">
                      {received.comments.map((c, i) => (
                        <div key={i} className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{c.comment}</p>
                          
                        </div>
                      ))}
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
