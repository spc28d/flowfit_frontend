// 인사 평가 보고서 작성 페이지 — 부서별 실적 + 개인 성과 AI 리포트
import { useState, useEffect, useMemo } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import {
  getEvalDepartments,
  getEvalEmployees,
  listEvalPeriods,
  fetchAutoData,
  saveEvaluation,
  analyzeEvaluation,
  downloadEvalExcel,
  publishEvaluation,
} from '../../../api/hr'
import { getAuthSession } from '../../../api/auth'

function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className = {`${className} animate-spin`} fill = "none" viewBox = "0 0 24 24">
      <circle className = "opacity-25" cx = "12" cy = "12" r = "10" stroke = "currentColor" strokeWidth = "4" />
      <path className = "opacity-75" fill = "currentColor" d = "M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className = "rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-5 py-3 mb-5">
      <p className = "text-sm text-red-700 dark:text-red-300">{message}</p>
    </div>
  )
}

const EVAL_TYPE_OPTIONS = [
  { value: 'quarter', label: '분기' },
  { value: 'half',    label: '반기' },
  { value: 'year',    label: '연간' },
]

const VALUE_OPTIONS = {
  quarter: [
    { value: 1, label: '1분기' }, { value: 2, label: '2분기' },
    { value: 3, label: '3분기' }, { value: 4, label: '4분기' },
  ],
  half: [
    { value: 1, label: '상반기' }, { value: 2, label: '하반기' },
  ],
  year: [],
}

const ANOMALY_COLOR = {
  '급등':  'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
  '급락':  'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  '주의':  'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
}

const GRADE_COLOR = {
  A: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  B: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  C: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  D: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

// ─── 인사팀이 설정 가능한 평가 기준 (최대 8개 슬롯, evaluate_a1~a8) ───
const CRITERIA_STORAGE_KEY = 'hr-eval-criteria-v3'
const EVAL_SLOTS = ['evaluate_a1','evaluate_a2','evaluate_a3','evaluate_a4','evaluate_a5','evaluate_a6','evaluate_a7','evaluate_a8']
const DEFAULT_CRITERIA = {
  items: [
    { key: 'evaluate_a1', label: '업무 점수',  weight: 30, enabled: true,  max: 100, source: 'peer_work',          team_eval: true  },
    { key: 'evaluate_a2', label: 'KPI 달성률', weight: 30, enabled: true,  max: 200, source: 'sales_kpi',          team_eval: false },
    { key: 'evaluate_a3', label: '리더십',     weight: 13, enabled: true,  max: 100, source: 'peer_leadership',    team_eval: true  },
    { key: 'evaluate_a4', label: '전문성',     weight: 13, enabled: true,  max: 100, source: 'peer_expertise',     team_eval: true  },
    { key: 'evaluate_a5', label: '협업',       weight: 14, enabled: true,  max: 100, source: 'peer_collaboration', team_eval: true  },
    { key: 'evaluate_a6', label: '',           weight: 0,  enabled: false, max: 100, source: '',                    team_eval: false },
    { key: 'evaluate_a7', label: '',           weight: 0,  enabled: false, max: 100, source: '',                    team_eval: false },
    { key: 'evaluate_a8', label: '',           weight: 0,  enabled: false, max: 100, source: '',                    team_eval: false },
  ],
  thresholds: { A: 80, B: 65, C: 50 },
}

function loadCriteria() {
  try {
    const raw = localStorage.getItem(CRITERIA_STORAGE_KEY)
    if (!raw) return DEFAULT_CRITERIA
    const parsed = JSON.parse(raw)
    if (!parsed?.items || parsed.items.length !== EVAL_SLOTS.length) return DEFAULT_CRITERIA
    // 슬롯 키가 evaluate_a1~a8과 일치해야 함
    if (!parsed.items.every((it, i)  => it.key  ===  EVAL_SLOTS[i])) return DEFAULT_CRITERIA
    return parsed
  } catch {
    return DEFAULT_CRITERIA
  }
}

function saveCriteria(c) {
  try {
    localStorage.setItem(CRITERIA_STORAGE_KEY, JSON.stringify(c))
    // 같은 탭 내 다른 페이지(예: TeamEval)가 즉시 반영하도록 커스텀 이벤트 발행
    window.dispatchEvent(new CustomEvent('hr-eval-criteria-changed', { detail: c }))
  } catch { /* ignore */ }
}

function calcGrade(scores, criteria) {
  const enabled = criteria.items.filter(i  => i.enabled)
  const totalWeight = enabled.reduce((s, i)  => s + (Number(i.weight) || 0), 0) || 1
  let combined = 0
  enabled.forEach(i  => {
    const raw = Number(scores[i.key]) || 0
    const norm = Math.min(100, raw / (i.max || 100) * 100)
    combined += norm * ((Number(i.weight) || 0) / totalWeight)
  })
  const t = criteria.thresholds
  if (combined >=  (t.A ?? 80)) return 'A'
  if (combined >=  (t.B ?? 65)) return 'B'
  if (combined >=  (t.C ?? 50)) return 'C'
  return 'D'
}

function GradeBadge({ grade }) {
  return (
    <span className = {`px-2 py-0.5 rounded-full text-xs font-bold ${GRADE_COLOR[grade] || GRADE_COLOR.D}`}>
      {grade}
    </span>
  )
}

function formatWon(amount) {
  if (amount >=  100_000_000) return `${(amount/100_000_000).toFixed(1)}억`
  if (amount >=  10_000)      return `${(amount/10_000).toFixed(0)}만`
  return `${amount.toLocaleString()}`
}

const SELECT_CHEVRON_STYLE = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  backgroundSize: '14px 14px',
}

// 평가 기준 설정 모달 — 인사팀이 항목·가중치·등급 임계값을 변경
function CriteriaSettingsModal({ open, onClose, criteria, onSave }) {
  const [draft, setDraft] = useState(criteria)
  const [triedSave, setTriedSave] = useState(false)
  useEffect(()  => { if (open) { setDraft(criteria); setTriedSave(false) } }, [open, criteria])

  if (!open) return null

  const enabledItems = draft.items.filter(i  => i.enabled)
  const totalWeightRaw = enabledItems.reduce((s, i)  => s + (Number(i.weight) || 0), 0)
  const totalWeight = Math.round(totalWeightRaw * 10) / 10
  const enabledCount = enabledItems.length
  const teamEvalCount = draft.items.filter(i  => i.enabled && i.team_eval).length
  const weightOk = Math.abs(totalWeight - 100) < 0.05
  const countOk = enabledCount >= 1 && enabledCount <= 8
  const thresholdsOk = draft.thresholds.A > draft.thresholds.B && draft.thresholds.B > draft.thresholds.C
  const labelsOk = draft.items.every(i  => !i.enabled || (i.label || '').trim().length > 0)

  function updateItem(idx, field, val) {
    setDraft(d  => ({ ...d, items: d.items.map((it, i)  => {
      if (i !== idx) return it
      const next = { ...it, [field]: val }
      // 사용 해제 시 팀원평가도 자동 해제
      if (field  ===  'enabled' && val  ===  false) next.team_eval = false
      return next
    }) }))
  }
  function updateThreshold(g, val) {
    const clamped = Math.min(100, Math.max(0, Number(val) || 0))
    setDraft(d  => ({ ...d, thresholds: { ...d.thresholds, [g]: clamped } }))
  }

  return (
    <div className = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className = "w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
        <div className = "px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className = "text-base font-bold text-gray-900 dark:text-white">평가 기준 및 항목 설정</h3>
            <p className = "text-[11px] text-gray-400 mt-0.5">개인 평가 항목(최대 5개), 가중치, 등급 임계값을 변경합니다.</p>
          </div>
          <button onClick = {onClose} className = "text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none">×</button>
        </div>

        <div className = "p-5">
          {/* 항목 */}
          <div className = "mb-5">
            <div className = "flex items-center justify-between mb-2">
              <label className = "text-xs font-semibold text-gray-700 dark:text-gray-200">개인 평가 항목 ({enabledCount}/8)</label>
              <div className = "flex items-center gap-3">
                <span className = "text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  팀원평가 {teamEvalCount}개
                </span>
                <span className = {`text-[11px] font-medium ${weightOk ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  가중치 합계 {totalWeight}%{!weightOk && ' (저장 시 100% 자동 변환)'}
                </span>
              </div>
            </div>
            {/* 컬럼 헤더 */}
            <div className = "flex items-center gap-2 px-3 py-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <span className = "w-10 shrink-0 text-center">사용</span>
              <span className = "w-14 shrink-0 text-center">팀원평가</span>
              <span className = "flex-1 px-1">이름</span>
              <span className = "w-[76px] shrink-0 text-right pr-3">비중</span>
            </div>
            <div className = "flex flex-col gap-2">
              {draft.items.map((it, idx)  => {
                const labelMissing = triedSave && it.enabled && !(it.label || '').trim()
                return (
                  <div key = {it.key}>
                    <div className = "flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <div className = "w-10 shrink-0 flex justify-center">
                        <input
                          type = "checkbox"
                          checked = {it.enabled}
                          onChange = {e  => updateItem(idx, 'enabled', e.target.checked)}
                          className = "w-4 h-4 accent-blue-500"
                        />
                      </div>
                      <div className = "w-14 shrink-0 flex justify-center">
                        <input
                          type = "checkbox"
                          checked = {!!it.team_eval}
                          disabled = {!it.enabled}
                          onChange = {e  => updateItem(idx, 'team_eval', e.target.checked)}
                          className = "w-4 h-4 accent-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                      <input
                        type = "text"
                        value = {it.label}
                        onChange = {e  => updateItem(idx, 'label', e.target.value)}
                        placeholder = "이름을 입력해주세요"
                        className = {`flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 border-b focus:outline-none focus:border-blue-400 px-1 py-1 ${
                          labelMissing
                            ? 'border-red-300 dark:border-red-600 placeholder-red-400'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      />
                      <div className = "w-[76px] shrink-0 flex items-center justify-end gap-1">
                        <input
                          type = "number" min = "0" max = "100" step = "0.1"
                          value = {it.weight}
                          onChange = {e  => {
                            const v = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                            updateItem(idx, 'weight', Math.round(v * 10) / 10)
                          }}
                          disabled = {!it.enabled}
                          className = "w-16 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-right px-2 py-1 disabled:opacity-50"
                        />
                        <span className = "text-xs text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 등급 임계값 */}
          <div>
            <label className = "block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">등급 기준 (종합 점수)</label>
            <div className = "grid grid-cols-3 gap-2">
              {['A', 'B', 'C'].map(g  => (
                <div key = {g}>
                  <label className = "text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{g} 이상</label>
                  <input
                    type = "number" min = "0" max = "100" step = "1"
                    value = {draft.thresholds[g]}
                    onChange = {e  => updateThreshold(g, e.target.value)}
                    className = "w-full text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-right px-2 py-1.5"
                  />
                </div>
              ))}
            </div>
            {!thresholdsOk && (
              <p className = "text-[10px] text-amber-500 mt-1">A {'>'} B {'>'} C 순서로 설정해 주세요.</p>
            )}
            <p className = "text-[10px] text-gray-400 mt-1">D 등급은 C 미만 자동 적용</p>
          </div>
        </div>

        <div className = "px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between sticky bottom-0 bg-white dark:bg-gray-900">
          <button
            onClick = {()  => setDraft(DEFAULT_CRITERIA)}
            className = "text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            기본값 복원
          </button>
          <div className = "flex items-center gap-2">
            <button
              onClick = {onClose}
              className = "min-h-[36px] px-4 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              취소
            </button>
            <button
              onClick = {()  => {
                if (!labelsOk) {
                  setTriedSave(true)
                  return
                }
                // 가중치 합이 100%가 아니면 활성 항목 가중치를 100% 기준으로 정규화 (소수점 1자리)
                let normalized = draft
                if (!weightOk && totalWeightRaw > 0) {
                  const factor = 100 / totalWeightRaw
                  const rounded = []
                  let sumRounded = 0
                  draft.items.forEach(it  => {
                    if (it.enabled) {
                      const w = Math.round((Number(it.weight) || 0) * factor * 10) / 10
                      rounded.push(w)
                      sumRounded += w
                    } else {
                      rounded.push(0)
                    }
                  })
                  // 반올림 오차 보정 — 마지막 활성 항목에 차이를 더함 (소수점 1자리 유지)
                  const diff = Math.round((100 - sumRounded) * 10) / 10
                  if (diff !== 0) {
                    for (let i = rounded.length - 1; i >= 0; i--) {
                      if (draft.items[i].enabled) {
                        rounded[i] = Math.round((rounded[i] + diff) * 10) / 10
                        break
                      }
                    }
                  }
                  normalized = {
                    ...draft,
                    items: draft.items.map((it, i)  => ({ ...it, weight: it.enabled ? rounded[i] : 0 })),
                  }
                }
                onSave(normalized)
                onClose()
              }}
              disabled = {!countOk}
              className = "min-h-[36px] px-4 text-xs font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 부서 KPI 바 차트
function DeptKPIBar({ departments }) {
  if (!departments || departments.length  ===  0) return null
  const maxAch = Math.max(...departments.map(d  => d.target_achievement || 0), 100)
  return (
    <div className = "flex flex-col gap-1">
      {departments.map((d, i)  => (
        <div key = {i} className = "flex items-center gap-3 py-1">
          <span className = "w-28 shrink-0 text-xs text-gray-500 dark:text-gray-400 text-right truncate">{d.department}</span>
          <div className = "flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className = "h-2.5 rounded-full bg-blue-400"
              style = {{ width: `${Math.min((d.target_achievement || 0) / maxAch * 100, 100)}%` }}
            />
          </div>
          <span className = "w-14 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-400 text-right">{d.target_achievement?.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

export default function Evaluate() {
  const session = getAuthSession()
  const employee = session?.employee || {}

  // 평가 설정
  const [evalType, setEvalType] = useState('quarter')
  const [year, setYear] = useState(new Date().getFullYear())
  const [value, setValue] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [selectedDept, setSelectedDept] = useState('')

  // 데이터 목록
  const [departments, setDepartments] = useState([])
  const [periods, setPeriods] = useState([])

  // 입력 데이터
  const [deptKPIs, setDeptKPIs] = useState([])
  const [individuals, setIndividuals] = useState([])

  // 상태
  const [autoLoading, setAutoLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [savedEvalKey, setSavedEvalKey] = useState('')

  // 평가 기준 (인사팀 설정)
  const [criteria, setCriteria] = useState(loadCriteria)
  const [showCriteriaModal, setShowCriteriaModal] = useState(false)
  const enabledCriteria = useMemo(()  => criteria.items.filter(i  => i.enabled), [criteria])

  // 부서 목록 로드
  useEffect(()  => {
    getEvalDepartments()
      .then(setDepartments)
      .catch(()  => setDepartments([]))
  }, [])

  // 기간 목록 로드
  useEffect(()  => {
    listEvalPeriods(evalType)
      .then(setPeriods)
      .catch(()  => setPeriods([]))
  }, [evalType])

  // value 범위 리셋
  useEffect(()  => {
    if (evalType  ===  'quarter') setValue(v  => (v >= 1 && v <= 4 ? v : 1))
    else if (evalType  ===  'half') setValue(v  => (v >= 1 && v <= 2 ? v : 1))
    else setValue(0)
  }, [evalType])

  // 기간 계산
  const dateRange = useMemo(()  => {
    let sm, em
    if (evalType  ===  'quarter') {
      sm = (value-1)*3+1
      em = sm+2
    } else if (evalType  ===  'half') {
      sm = value  ===  1 ? 1 : 7
      em = value  ===  1 ? 6 : 12
    } else {
      sm = 1
      em = 12
    }
    const lastDay = new Date(year, em, 0).getDate()
    return {
      start: `${year}-${String(sm).padStart(2, '0')}-01`,
      end: `${year}-${String(em).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }, [evalType, year, value])

  // 자동 데이터 불러오기
  async function handleFetchAutoData() {
    setAutoLoading(true)
    setError(null)
    try {
      const isAllDepts = !selectedDept
      const targetDepts = selectedDept ? [selectedDept] : departments
      const newDeptKPIs = []
      const newIndividuals = []

      for (const dept of targetDepts) {
        const deptName = typeof dept  ===  'string' ? dept : dept
        const data = await fetchAutoData(deptName, dateRange.start, dateRange.end)

        const autoProjectCompletion = data.project_completion || 0

        newDeptKPIs.push({
          department: deptName,
          budget_total: data.finance?.budget_total || 0,
          budget_spent: data.finance?.budget_spent || 0,
          budget_execution_rate: data.finance?.budget_execution_rate || 0,
          sales_revenue: data.sales?.total_revenue || 0,
          sales_deals: data.sales?.total_deals || 0,
          sales_wins: data.sales?.total_wins || 0,
          target_achievement: 0,
          project_completion: autoProjectCompletion,
          project_completion_auto: autoProjectCompletion > 0,
          collaboration_score: 0,
          headcount: data.employees?.length || 0,
        })

        // 전체 부서 평가 시 부서 단위로만 진행
        if (isAllDepts) continue

        // 부서 평균 매출 산출 (KPI 자동 계산용)
        const deptTotalRevenue = data.sales?.total_revenue || 0
        const salesEmployeeCount = Object.keys(data.individual_sales || {}).length

        for (const emp of (data.employees || [])) {
          const salesData = data.individual_sales?.[emp.name] || {}
          const peerData = data.peer_evaluations?.[emp.name] || null
          // 상호평가 점수(0~5)를 100점 만점으로 환산
          const autoWorkScore = peerData ? Math.round(peerData.avg_work * 20) : 0
          const autoLeadership = peerData ? Math.round(peerData.avg_leadership * 20) : 0
          const autoExpertise = peerData ? Math.round(peerData.avg_expertise * 20) : 0
          const autoCollaboration = peerData ? Math.round(peerData.avg_collaboration * 20) : 0
          // KPI 달성률: 개인 매출 / 부서 1인 평균 매출 × 100
          const avgRevenue = salesEmployeeCount > 0 ? deptTotalRevenue / salesEmployeeCount : 0
          const autoKpi = avgRevenue > 0 && salesData.revenue
            ? Math.round((salesData.revenue / avgRevenue) * 100)
            : 0

          newIndividuals.push({
            employee_id: emp.employee_id,
            employee_name: emp.name,
            department: emp.department,
            position: emp.position || '',
            sales_revenue: salesData.revenue || 0,
            sales_wins: salesData.wins || 0,
            evaluate_a1: autoWorkScore,
            evaluate_a2: autoKpi,
            evaluate_a3: autoLeadership,
            evaluate_a4: autoExpertise,
            evaluate_a5: autoCollaboration,
            evaluate_a6: 0,
            evaluate_a7: 0,
            evaluate_a8: 0,
            // 자동 산출 표시용 플래그 (a1=업무, a2=KPI, a3~a5=동료평가)
            auto_a1: autoWorkScore > 0,
            auto_a2: autoKpi > 0,
            auto_a3: autoLeadership > 0,
            auto_a4: autoExpertise > 0,
            auto_a5: autoCollaboration > 0,
            peer_eval: peerData,
          })
        }
      }

      setDeptKPIs(newDeptKPIs)
      setIndividuals(newIndividuals)
    } catch (e) {
      setError(`데이터 조회 실패: ${e.message}`)
    } finally {
      setAutoLoading(false)
    }
  }

  // 부서 KPI 값 변경
  function updateDeptKPI(idx, field, val) {
    setDeptKPIs(prev  => prev.map((d, i)  => i  ===  idx ? { ...d, [field]: Number(val) || 0 } : d))
  }

  // 개인 평가 값 변경
  function updateIndividual(idx, field, val) {
    setIndividuals(prev  => prev.map((ind, i)  => i  ===  idx ? { ...ind, [field]: Number(val) || 0 } : ind))
  }

  // 저장 + 분석
  async function handleSaveAndAnalyze() {
    if (deptKPIs.length  ===  0 && individuals.length  ===  0) {
      setError('먼저 "데이터 불러오기"를 눌러 평가 대상을 불러와 주세요.')
      return
    }

    setAnalyzing(true)
    setError(null)
    setResult(null)
    setPublished(false)

    try {
      // 1. 저장
      // 백엔드로 보낼 때 자동 산출 플래그(auto_*, peer_eval)는 제거하고 평가 슬롯만 전송
      const cleanIndividuals = individuals.map(ind  => ({
        employee_id: ind.employee_id || '',
        employee_name: ind.employee_name,
        department: ind.department,
        position: ind.position || '',
        sales_revenue: ind.sales_revenue || 0,
        sales_wins: ind.sales_wins || 0,
        evaluate_a1: Number(ind.evaluate_a1) || 0,
        evaluate_a2: Number(ind.evaluate_a2) || 0,
        evaluate_a3: Number(ind.evaluate_a3) || 0,
        evaluate_a4: Number(ind.evaluate_a4) || 0,
        evaluate_a5: Number(ind.evaluate_a5) || 0,
        evaluate_a6: Number(ind.evaluate_a6) || 0,
        evaluate_a7: Number(ind.evaluate_a7) || 0,
        evaluate_a8: Number(ind.evaluate_a8) || 0,
      }))
      const saveResult = await saveEvaluation({
        eval_type: evalType,
        year,
        value,
        department: selectedDept,
        departments: deptKPIs,
        individuals: cleanIndividuals,
        criteria_config: criteria,
        created_by: employee.employee_id || '',
        created_by_name: employee.name || '',
      })
      setSavedEvalKey(saveResult.eval_key)

      // 2. 분석
      const report = await analyzeEvaluation({
        eval_key: saveResult.eval_key,
        department: selectedDept,
      })
      setResult(report)
    } catch (e) {
      setError(e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // 등록 — 등록 후에야 개인이 본인 평가 결과 페이지에서 조회 가능
  async function handlePublish() {
    if (!savedEvalKey) return
    if (published) return
    if (!window.confirm('이 평가 보고서를 등록하시겠습니까?\n등록 후 평가 대상자가 본인 평가 결과 페이지에서 확인할 수 있습니다.')) return
    setPublishing(true)
    setError(null)
    try {
      await publishEvaluation(savedEvalKey)
      setPublished(true)
    } catch (e) {
      setError(`등록 실패: ${e.message}`)
    } finally {
      setPublishing(false)
    }
  }

  // Excel 다운로드
  async function handleExcelDownload() {
    if (!savedEvalKey) return
    setExporting(true)
    setError(null)
    try {
      await downloadEvalExcel(savedEvalKey, selectedDept)
    } catch (e) {
      setError(`Excel 다운로드 실패: ${e.message}`)
    } finally {
      setExporting(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i)  => currentYear - 2 + i)

  return (
    <div>
      <Breadcrumb
        crumbs = {[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '인사 평가 보고서 작성' },
        ]}
      />

      {/* 헤더 */}
      <div className = "mt-4 mb-6 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className = "flex items-center gap-3">
          <div className = "w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 text-white shrink-0">
            <svg className = "w-5 h-5" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24">
              <path strokeLinecap = "round" strokeLinejoin = "round" strokeWidth = {1.5}
                d = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <span className = "text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Back-Office · 인사(HR)팀
            </span>
            <h1 className = "text-xl font-bold text-gray-900 dark:text-white leading-tight">
              인사 평가 보고서 작성
            </h1>
          </div>
        </div>
        <p className = "text-sm text-gray-500 dark:text-gray-400 mt-2">
          부서별 실적과 개인 성과를 입력하면 AI가 종합 평가 보고서를 자동 생성합니다.
          재무·영업 데이터가 자동으로 반영됩니다.
        </p>
      </div>

      {/* 평가 조건 설정 */}
      <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <div className = "flex items-center justify-between mb-4">
          <h3 className = "text-sm font-semibold text-gray-800 dark:text-white">평가 조건 설정</h3>
          <button
            onClick = {()  => setShowCriteriaModal(true)}
            className = "min-h-[32px] px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5"
          >
            <svg className = "w-3.5 h-3.5" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24">
              <path strokeLinecap = "round" strokeLinejoin = "round" strokeWidth = {2}
                d = "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap = "round" strokeLinejoin = "round" strokeWidth = {2} d = "M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            평가 기준 설정
          </button>
        </div>

        {/* 평가 유형 */}
        <div className = "mb-4">
          <label className = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">평가 유형</label>
          <div className = "flex gap-2 flex-wrap">
            {EVAL_TYPE_OPTIONS.map(t  => (
              <button
                key = {t.value}
                onClick = {()  => setEvalType(t.value)}
                className = {`min-h-[36px] px-4 text-sm font-medium rounded-xl border transition-colors ${
                  evalType  ===  t.value
                    ? 'border-blue-400 bg-blue-500 text-white'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className = "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {/* 연도 */}
          <div>
            <label className = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">연도</label>
            <select
              value = {year}
              onChange = {e  => setYear(Number(e.target.value))}
              style = {SELECT_CHEVRON_STYLE}
              className = "appearance-none w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-4 pr-10 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {yearOptions.map(y  => <option key = {y} value = {y}>{y}년</option>)}
            </select>
          </div>

          {/* 분기/반기 */}
          {VALUE_OPTIONS[evalType]?.length > 0 && (
            <div>
              <label className = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                {evalType  ===  'quarter' ? '분기' : '반기'}
              </label>
              <select
                value = {value}
                onChange = {e  => setValue(Number(e.target.value))}
                style = {SELECT_CHEVRON_STYLE}
                className = "appearance-none w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-4 pr-10 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {VALUE_OPTIONS[evalType].map(v  => <option key = {v.value} value = {v.value}>{v.label}</option>)}
              </select>
            </div>
          )}

          {/* 부서 선택 */}
          <div>
            <label className = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">평가 대상 부서</label>
            <select
              value = {selectedDept}
              onChange = {e  => setSelectedDept(e.target.value)}
              style = {SELECT_CHEVRON_STYLE}
              className = "appearance-none w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-4 pr-10 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value = "">전체 부서</option>
              {departments.map(d  => <option key = {d} value = {d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className = "flex items-center gap-3 justify-between">
          <span className = "text-sm text-gray-400">
            기간: {dateRange.start} ~ {dateRange.end} 
          </span>
          <button
            onClick = {handleFetchAutoData}
            disabled = {autoLoading}
            className = "min-h-[40px] px-5 text-sm font-semibold rounded-xl border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {autoLoading ? <Spinner /> : (
              <svg className = "w-4 h-4" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24">
                <path strokeLinecap = "round" strokeLinejoin = "round" strokeWidth = {2} d = "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            데이터 불러오기
          </button>
        </div>
      </div>

      <ErrorBanner message = {error} />

      {/* 부서별 KPI 입력 */}
      {deptKPIs.length > 0 && (
        <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
          <h3 className = "text-sm font-semibold text-gray-800 dark:text-white mb-4">부서별 KPI 입력</h3>
          <div className = "flex flex-col gap-4">
            {deptKPIs.map((d, idx)  => (
              <div key = {idx} className = "rounded-lg border border-gray-100 dark:border-gray-700 p-4">
                <div className = "flex items-center justify-between mb-3">
                  <h4 className = "text-sm font-bold text-gray-800 dark:text-white">{d.department}</h4>
                  <span className = "text-xs text-gray-400">{d.headcount}명</span>
                </div>

                {/* 자동 데이터 표시 */}
                <div className = "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {d.budget_total > 0 && (
                    <div className = "rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                      <p className = "text-[11px] text-gray-400">예산 집행률</p>
                      <p className = "text-sm font-bold text-gray-800 dark:text-white">{d.budget_execution_rate?.toFixed(1)}%</p>
                      <p className = "text-[10px] text-gray-400">{formatWon(d.budget_spent)} / {formatWon(d.budget_total)}</p>
                    </div>
                  )}
                  {d.sales_revenue > 0 && (
                    <div className = "rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                      <p className = "text-[11px] text-gray-400">영업 매출</p>
                      <p className = "text-sm font-bold text-gray-800 dark:text-white">{formatWon(d.sales_revenue)}</p>
                      <p className = "text-[10px] text-gray-400">수주 {d.sales_wins}건 / 진행 {d.sales_deals}건</p>
                    </div>
                  )}
                </div>

                {/* HR 입력 필드 */}
                <div className = "grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className = "block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">목표 달성률 (%)</label>
                    <input
                      type = "number" min = "0" max = "200" step = "0.1"
                      value = {d.target_achievement || ''}
                      onChange = {e  => updateDeptKPI(idx, 'target_achievement', e.target.value)}
                      placeholder = "0"
                      className = "w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className = "block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">프로젝트 완수율 (%)</label>
                    {d.project_completion_auto ? (
                      <div className = "w-full text-sm rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20 px-3 py-2">
                        <p className = "font-bold text-gray-900 dark:text-white">{d.project_completion}%</p>
                      </div>
                    ) : (
                      <input
                        type = "number" min = "0" max = "100" step = "0.1"
                        value = {d.project_completion || ''}
                        onChange = {e  => updateDeptKPI(idx, 'project_completion', e.target.value)}
                        placeholder = "0"
                        className = "w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    )}
                  </div>
                  <div>
                    <label className = "block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">부서 협업 점수 (0~100)</label>
                    <input
                      type = "number" min = "0" max = "100" step = "0.1"
                      value = {d.collaboration_score || ''}
                      onChange = {e  => updateDeptKPI(idx, 'collaboration_score', e.target.value)}
                      placeholder = "0"
                      className = "w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 개인 평가 입력 */}
      {individuals.length > 0 && (
        <div className = "rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-5">
          <div className = "px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
            <div className = "flex items-center justify-between">
              <h3 className = "text-sm font-semibold text-gray-800 dark:text-white">개인 평가 입력</h3>
              <span className = "text-xs text-gray-400">{individuals.length}명</span>
            </div>
            <p className = "text-[11px] text-gray-400 mt-1">
              {enabledCriteria.map(i  => `${i.label}(${i.weight}%)`).join(' + ')} = 종합 등급 (A {'≥'} {criteria.thresholds.A}, B {'≥'} {criteria.thresholds.B}, C {'≥'} {criteria.thresholds.C})
            </p>
          </div>

          <div className = "overflow-x-auto">
            <table className = "w-full text-sm">
              <thead>
                <tr className = "bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700">
                  <th className = "text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-28">이름</th>
                  <th className = "text-left px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-16">직급</th>
                  {enabledCriteria.map(item  => (
                    <th key = {item.key} className = "text-center px-2 py-2 text-xs font-medium text-blue-500 dark:text-blue-400 w-20">
                      <div>{item.label}{item.key  ===  'kpi_achievement' && '(%)'}</div>
                      <div className = "text-[9px] font-normal text-gray-400 mt-0.5">{item.weight}%</div>
                    </th>
                  ))}
                  <th className = "text-center px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-16">등급</th>
                </tr>
              </thead>
              <tbody className = "divide-y divide-gray-100 dark:divide-gray-700">
                {individuals.map((ind, idx)  => {
                  const grade = calcGrade(ind, criteria)
                  return (
                    <tr key = {idx} className = "hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className = "px-4 py-2">
                        <div>
                          <p className = "font-medium text-gray-800 dark:text-white text-sm">{ind.employee_name}</p>
                          {ind.sales_revenue > 0 && (
                            <p className = "text-[10px] text-amber-500 mt-0.5">매출 {formatWon(ind.sales_revenue)}</p>
                          )}
                        </div>
                      </td>
                      <td className = "px-2 py-2 text-xs text-gray-500 dark:text-gray-400">{ind.position}</td>
                      {enabledCriteria.map(item  => {
                        const value = ind[item.key]
                        const autoKey = `auto_${item.key.replace('evaluate_', '')}`   // auto_a1..a8
                        const isAuto = !!ind[autoKey]
                        const isKpiSlot = item.source  ===  'sales_kpi'
                        const suffix = isKpiSlot ? '%' : ''
                        return (
                          <td key = {item.key} className = "px-2 py-2">
                            {isAuto ? (
                              <div className = "text-center">
                                <p className = "text-sm font-bold text-gray-900 dark:text-white">{value}{suffix}</p>
                                {isKpiSlot && (
                                  <p className = "text-[9px] text-amber-500">매출 기준 산출</p>
                                )}
                              </div>
                            ) : (
                              <input
                                type = "number" min = "0" max = "100" step = "0.1"
                                value = {value || ''}
                                onChange = {e  => updateIndividual(idx, item.key, e.target.value)}
                                placeholder = "0"
                                className = "w-full text-sm text-center rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            )}
                          </td>
                        )
                      })}
                      <td className = "px-2 py-2 text-center">
                        <GradeBadge grade = {grade} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 분석 버튼 */}
      {(deptKPIs.length > 0 || individuals.length > 0) && (
        <button
          onClick = {handleSaveAndAnalyze}
          disabled = {analyzing}
          className = "w-full min-h-[44px] rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-semibold transition-colors mb-6 flex items-center justify-center gap-2"
        >
          {analyzing ? '평가 보고서 생성 중 ...' : '평가 보고서 생성'}
        </button>
      )}

      {/* 빈 상태 */}
      {!result && !analyzing && deptKPIs.length  ===  0 && (
        <div className = "rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className = "w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24">
            <path strokeLinecap = "round" strokeLinejoin = "round" strokeWidth = {1.5}
              d = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className = "text-sm text-gray-400">평가 조건을 설정하고 '데이터 불러오기'를 누르면<br />평가 입력 폼이 표시됩니다.</p>
        </div>
      )}

      {/* 로딩 */}
      {analyzing && (
        <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center gap-3">
          <Spinner className = "w-6 h-6 text-blue-500" />
          <p className = "text-sm text-gray-400">평가 데이터를 분석하여 보고서 작성 중 ...</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className = "flex flex-col gap-5">
          {/* 결과 헤더 + Excel 다운로드 */}
          <div className = "flex items-center justify-between">
            <p className = "text-sm font-semibold text-gray-700 dark:text-gray-200">
              {result.period?.eval_label}
              <span className = "ml-2">결과</span>
              <span className = "ml-2 text-s font-medium text-gray-500 dark:text-gray-400">
                · {result.period?.department || selectedDept || '전체 부서'}
              </span>
            </p>
            <div className = "flex items-center gap-2">
              <button
                onClick = {handlePublish}
                disabled = {publishing || published || !savedEvalKey}
                className = {`min-h-[36px] px-4 text-xs font-semibold rounded-lg border inline-flex items-center gap-1.5 disabled:opacity-60 ${
                  published
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 cursor-default'
                    : 'border-blue-400 bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {publishing ? <Spinner /> : (
                  <svg className = "w-3.5 h-3.5" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24">
                    <path strokeLinecap = "round" strokeLinejoin = "round" strokeWidth = {2}
                      d = {published ? 'M5 13l4 4L19 7' : 'M12 4v16m8-8H4'} />
                  </svg>
                )}
                {published ? '등록 완료' : '등록'}
              </button>
              <button
                onClick = {handleExcelDownload}
                disabled = {exporting}
                className = "min-h-[36px] px-4 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {exporting ? <Spinner /> : (
                  <svg className = "w-3.5 h-3.5" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24">
                    <path strokeLinecap = "round" strokeLinejoin = "round" strokeWidth = {2}
                      d = "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                )}
                Excel 다운로드
              </button>
            </div>
          </div>

          {/* 핵심 지표 카드 */}
          <div className = "grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className = "text-xs text-gray-400 mb-1">평가 대상</p>
              <p className = "text-xl font-bold text-gray-900 dark:text-white">{result.metrics?.total_employees}명</p>
              <p className = "text-xs text-gray-400 mt-0.5">{result.departments?.length || 0}개 부서</p>
            </div>
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className = "text-xs text-gray-400 mb-1">평균 종합 점수</p>
              <p className = "text-xl font-bold text-gray-900 dark:text-white">{result.metrics?.avg_combined_score}</p>
              <p className = "text-xs text-gray-400 mt-0.5">100점 만점</p>
            </div>
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className = "text-xs text-gray-400 mb-1">항목별 평균</p>
              <div className = "flex flex-col gap-0.5 mt-1">
                {(result.metrics?.item_averages || []).map(ia  => (
                  <div key = {ia.key} className = "flex items-center justify-between text-[11px]">
                    <span className = "text-gray-500 dark:text-gray-400 truncate">{ia.label}</span>
                    <span className = "font-semibold text-gray-700 dark:text-gray-200">{ia.average}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className = "text-xs text-gray-400 mb-1">등급 분포</p>
              <div className = "grid grid-cols-4 gap-1.5 mt-1">
                {['A', 'B', 'C', 'D'].map(g  => {
                  const c = result.metrics?.grade_distribution?.[g] || 0
                  const active = c > 0
                  return (
                    <div
                      key = {g}
                      className = {`flex flex-col items-center justify-center rounded-md py-1 ${
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

          {/* 종합 요약 */}
          <div className = "rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-5">
            <p className = "text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">종합 평가 요약</p>
            <pre className = "text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{result.summary}</pre>
          </div>

          {/* 이상 감지 */}
          {result.anomalies?.length > 0 && (
            <div className = "flex flex-col gap-2">
              <div className = "flex items-center justify-between">
                <p className = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">이상 감지</p>
              </div>
              {result.anomalies.map((a, i)  => (
                <div key = {i} className = {`rounded-xl border px-4 py-3 ${ANOMALY_COLOR[a.type] ?? ANOMALY_COLOR['주의']}`}>
                  <div className = "flex items-start gap-3">
                    <span className = "text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/30 shrink-0">{a.type}</span>
                    <div className = "flex-1 min-w-0">
                      <div className = "flex items-center gap-2 flex-wrap">
                        <p className = "text-sm font-semibold">{a.item}</p>
                        {a.severity && (
                          <span className = {`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            a.severity  ===  '높음' ? 'bg-red-600 text-white' : 'bg-gray-500/70 text-white'
                          }`}>
                            {a.severity}
                          </span>
                        )}
                      </div>
                      <p className = "text-xs mt-0.5 opacity-80">{a.detail}</p>
                      {a.cause && (
                        <p className = "text-xs mt-2 pt-2 border-t border-current/20 opacity-90">
                          <span className = "font-semibold">원인 추정: </span>{a.cause}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 부서 비교 차트 */}
          {result.departments?.length > 0 && (
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">부서별 목표 달성률</p>
              <DeptKPIBar departments = {result.departments} />
            </div>
          )}

          {/* 개인 순위 테이블 */}
          {result.individuals?.length > 0 && (
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className = "px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                <p className = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">개인 평가</p>
              </div>
              <div className = "divide-y divide-gray-100 dark:divide-gray-700">
                {result.individuals.map((ind, i)  => (
                  <div key = {i} className = "flex items-center justify-between px-5 py-3">
                    <div className = "flex items-center gap-3 min-w-0">
                      <span className = "w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span>
                      <div className = "min-w-0">
                        <p className = "text-sm font-medium text-gray-800 dark:text-white truncate">{ind.employee_name}</p>
                        <p className = "text-[11px] text-gray-400">{ind.position}</p>
                      </div>
                    </div>
                    <div className = "flex items-center gap-4 flex-wrap justify-end">
                      {(result.criteria?.items || []).filter(it  => it.enabled).map(it  => (
                        <div key = {it.key} className = "text-right">
                          <p className = "text-[10px] text-gray-400">{it.label}</p>
                          <p className = "text-sm font-semibold text-gray-800 dark:text-white">{ind[it.key]}</p>
                        </div>
                      ))}
                      <div className = "text-right">
                        <p className = "text-[10px] text-gray-400">종합</p>
                        <p className = "text-sm font-semibold text-blue-600 dark:text-blue-400">{ind.combined_score}</p>
                      </div>
                      <GradeBadge grade = {ind.overall_grade} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 인사이트 */}
          <div className = "grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">우수 성과자</p>
              <p className = "text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.top_performers}</p>
            </div>
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">개선 필요 영역</p>
              <p className = "text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.improvement_areas}</p>
            </div>
          </div>

          {/* 부서별 인사이트 */}
          {result.department_insights?.length > 0 && (
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">부서별 인사이트</p>
              <div className = "flex flex-col gap-3">
                {result.department_insights.map((di, i)  => (
                  <div key = {i} className = "flex gap-3">
                    <span className = "text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0 w-28 pt-0.5">{di.department}</span>
                    <p className = "text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{di.insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 추천 */}
          {result.recommendations?.length > 0 && (
            <div className = "rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <p className = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">AI 액션 추천</p>
              <ul className = "flex flex-col gap-2">
                {result.recommendations.map((r, i)  => (
                  <li key = {i} className = "flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <span className = "w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <CriteriaSettingsModal
        open = {showCriteriaModal}
        onClose = {()  => setShowCriteriaModal(false)}
        criteria = {criteria}
        onSave = {c  => { setCriteria(c); saveCriteria(c) }}
      />
    </div>
  )
}
