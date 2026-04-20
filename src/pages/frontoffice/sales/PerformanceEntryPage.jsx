// 영업 실적 등록 페이지 — 기간 선택 + 요약/파이프라인 폼 + 팀원 CSV 업로드
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import {
  deletePerformanceEntry,
  getPerformanceEntry,
  listPerformancePeriods,
  savePerformanceEntry,
} from '../../../api/sales'
import { getAuthSession } from '../../../api/auth'

// ────────────────────────────────────────────────────────────
// 상수 / 헬퍼
// ────────────────────────────────────────────────────────────

const PERIOD_TYPES = [
  { value: 'month',   label: '월간'   },
  { value: 'quarter', label: '분기'   },
  { value: 'year',    label: '연간'   },
]

// 커스텀 셀렉트 꺽쇠 — 네이티브 화살표 숨기고 오른쪽 14px 안쪽에 SVG 배치
const SELECT_CHEVRON_STYLE = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  backgroundSize: '14px 14px',
}

const DEFAULT_PIPELINE = [
  { stage_order: 1, stage_name: '잠재 고객',   stage_count: 0, stage_amount: 0 },
  { stage_order: 2, stage_name: '니즈 분석',   stage_count: 0, stage_amount: 0 },
  { stage_order: 3, stage_name: '제안서 발송', stage_count: 0, stage_amount: 0 },
  { stage_order: 4, stage_name: '협상 중',     stage_count: 0, stage_amount: 0 },
  { stage_order: 5, stage_name: '계약 완료',   stage_count: 0, stage_amount: 0 },
]

// period_key 미리보기 (백엔드 로직과 동일 규칙)
function previewPeriodKey(periodType, year, value) {
  if (periodType === 'month')   return `${year}-${String(value).padStart(2, '0')}`
  if (periodType === 'quarter') return `${year}-Q${value}`
  return `${year}-FY`
}
function previewPeriodLabel(periodType, year, value) {
  if (periodType === 'month')   return `${year}년 ${value}월`
  if (periodType === 'quarter') return `${year}년 Q${value}`
  return `${year}년 연간`
}

// 숫자 입력 파싱 — 빈 값/NaN은 0
function toInt(v) {
  const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

// CSV 파싱 — "member_name,revenue,deals,wins" 헤더 포함
function parseMembersCsv(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  // 헤더 검증
  const header = lines[0].toLowerCase().replace(/\s/g, '')
  const hasHeader = /member_?name/.test(header)
  const rows = hasHeader ? lines.slice(1) : lines

  return rows.map(line => {
    const cols = line.split(',').map(c => c.trim())
    return {
      member_name: cols[0] || '',
      revenue:     toInt(cols[1]),
      deals:       toInt(cols[2]),
      wins:        toInt(cols[3]),
    }
  }).filter(r => r.member_name)
}

// ────────────────────────────────────────────────────────────
// 작은 UI 컴포넌트
// ────────────────────────────────────────────────────────────

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

function NumberField({ label, value, onChange, suffix, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value === 0 ? '' : value.toLocaleString()}
          onChange={e => onChange(toInt(e.target.value))}
          placeholder="0"
          className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400 pr-12"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// 메인 페이지
// ────────────────────────────────────────────────────────────

export default function PerformanceEntryPage() {
  // 기간 선택
  const now = new Date()
  const [periodType, setPeriodType] = useState('month')
  const [year,       setYear]       = useState(now.getFullYear())
  const [value,      setValue]      = useState(now.getMonth() + 1) // month: 1~12, quarter: 1~4

  // 요약
  const [targetRevenue, setTargetRevenue] = useState(0)
  const [actualRevenue, setActualRevenue] = useState(0)
  const [prevRevenue,   setPrevRevenue]   = useState(0)
  const [dealCount,     setDealCount]     = useState(0)
  const [winCount,      setWinCount]      = useState(0)
  const [note,          setNote]          = useState('')

  // 파이프라인
  const [pipeline, setPipeline] = useState(DEFAULT_PIPELINE)

  // 팀원
  const [members, setMembers] = useState([
    { member_name: '', revenue: 0, deals: 0, wins: 0 },
  ])

  // 저장 상태
  const [saving,    setSaving]    = useState(false)
  const [savedKey,  setSavedKey]  = useState(null)
  const [error,     setError]     = useState(null)

  // 기간 목록 (프리필용)
  const [existingPeriods, setExistingPeriods] = useState([])

  // 로그인 세션
  const session = getAuthSession()
  const currentEmpId   = session?.employee?.employee_id || ''
  const currentEmpName = session?.employee?.name || ''

  useEffect(() => {
    refreshPeriods()
  }, [])

  async function refreshPeriods() {
    try {
      const items = await listPerformancePeriods()
      setExistingPeriods(items)
    } catch {
      // 목록 조회 실패는 치명적이지 않음
    }
  }

  // 기간 타입 변경 시 value 범위 조정
  function handlePeriodType(t) {
    setPeriodType(t)
    if (t === 'month')   setValue(v => Math.max(1, Math.min(12, v || 1)))
    if (t === 'quarter') setValue(v => Math.max(1, Math.min(4,  v || 1)))
  }

  // 파이프라인 행 수정
  function updatePipelineRow(idx, patch) {
    setPipeline(prev => prev.map((row, i) => i === idx ? { ...row, ...patch } : row))
  }

  function addPipelineRow() {
    setPipeline(prev => [
      ...prev,
      { stage_order: prev.length + 1, stage_name: '', stage_count: 0, stage_amount: 0 },
    ])
  }

  function removePipelineRow(idx) {
    setPipeline(prev => prev
      .filter((_, i) => i !== idx)
      .map((row, i) => ({ ...row, stage_order: i + 1 }))
    )
  }

  // 팀원 행 수정
  function updateMemberRow(idx, patch) {
    setMembers(prev => prev.map((row, i) => i === idx ? { ...row, ...patch } : row))
  }

  function addMemberRow() {
    setMembers(prev => [...prev, { member_name: '', revenue: 0, deals: 0, wins: 0 }])
  }

  function removeMemberRow(idx) {
    setMembers(prev => prev.filter((_, i) => i !== idx))
  }

  // CSV 업로드
  async function handleCsvUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseMembersCsv(text)
      if (parsed.length === 0) {
        setError('CSV에서 유효한 팀원 행을 찾지 못했습니다. 헤더: member_name,revenue,deals,wins')
        return
      }
      // 기존에 빈 행 하나만 있으면 대체, 아니면 덮어쓰기
      setMembers(parsed)
      setError(null)
    } catch (err) {
      setError(`CSV 파싱 실패: ${err.message}`)
    }
  }

  // 기존 기간 선택 시 프리필
  async function handlePrefill(periodKey) {
    if (!periodKey) return
    try {
      const data = await getPerformanceEntry(periodKey)
      const s = data.summary
      // 기간 타입·연·값 역산
      let y = parseInt(s.period_key.slice(0, 4), 10)
      let t = s.period_type
      let v = 0
      if (t === 'month')   v = parseInt(s.period_key.slice(5), 10)
      if (t === 'quarter') v = parseInt(s.period_key.slice(6), 10)
      setPeriodType(t)
      setYear(y)
      setValue(v)

      setTargetRevenue(s.target_revenue)
      setActualRevenue(s.actual_revenue)
      setPrevRevenue(s.prev_revenue)
      setDealCount(s.deal_count)
      setWinCount(s.win_count)
      setNote(s.note || '')

      setPipeline(
        (data.pipeline || []).length > 0
          ? data.pipeline.map(p => ({
              stage_order: p.stage_order,
              stage_name:  p.stage_name,
              stage_count: p.stage_count,
              stage_amount: p.stage_amount,
            }))
          : DEFAULT_PIPELINE
      )
      setMembers(
        (data.members || []).length > 0
          ? data.members.map(m => ({
              member_name: m.member_name,
              revenue:     m.revenue,
              deals:       m.deals,
              wins:        m.wins,
            }))
          : [{ member_name: '', revenue: 0, deals: 0, wins: 0 }]
      )
      setError(null)
      setSavedKey(null)
    } catch (err) {
      setError(err.message)
    }
  }

  // 등록 제출
  const periodKeyPreview   = previewPeriodKey(periodType, year, value)
  const periodLabelPreview = previewPeriodLabel(periodType, year, value)
  const isOverwrite        = existingPeriods.some(p => p.period_key === periodKeyPreview)

  async function handleSubmit() {
    // 간단 검증
    if (periodType !== 'year' && !value) {
      setError('월/분기 값을 선택하세요.')
      return
    }
    if (targetRevenue <= 0) {
      setError('목표 매출은 1 이상이어야 합니다.')
      return
    }
    if (winCount > dealCount) {
      setError('수주 건수는 전체 딜 수를 초과할 수 없습니다.')
      return
    }
    if (isOverwrite) {
      const ok = window.confirm(`이미 등록된 기간입니다. "${periodLabelPreview}" 의 데이터를 덮어쓸까요?`)
      if (!ok) return
    }

    setSaving(true)
    setError(null)
    try {
      const validPipeline = pipeline.filter(p => p.stage_name.trim())
      const validMembers  = members.filter(m => m.member_name.trim())
      const saved = await savePerformanceEntry({
        period_type:     periodType,
        year,
        value,
        target_revenue:  targetRevenue,
        actual_revenue:  actualRevenue,
        prev_revenue:    prevRevenue,
        deal_count:      dealCount,
        win_count:       winCount,
        note,
        pipeline:        validPipeline,
        members:         validMembers,
        created_by:      currentEmpId,
        created_by_name: currentEmpName,
      })
      setSavedKey(saved.period_key)
      refreshPeriods()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // 기간 삭제
  async function handleDelete(periodKey) {
    const ok = window.confirm(`"${periodKey}" 기간을 삭제할까요? 관련 파이프라인·팀원 데이터도 함께 삭제됩니다.`)
    if (!ok) return
    try {
      await deletePerformanceEntry(periodKey)
      refreshPeriods()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: '영업/영업관리팀', to: '/frontoffice/sales' },
          { label: '영업 실적 등록' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Front-Office · 영업/영업관리팀
              </span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                영업 실적 등록
              </h1>
            </div>
          </div>
          <Link
            to="/frontoffice/sales/performance"
            className="text-xs min-h-[36px] px-3 inline-flex items-center rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            실적 분석 페이지로
          </Link>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          한 기간의 실적을 요약·파이프라인·팀원별로 등록합니다. 같은 기간을 다시 등록하면 기존 데이터는 덮어쓰기 됩니다.
        </p>
      </div>

      <ErrorBanner message={error} />

      {savedKey && !error && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-5 py-3 mb-5">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✓ 등록 완료 (period_key: <span className="font-semibold">{savedKey}</span>) · 실적 분석 페이지에서 바로 조회할 수 있습니다.
          </p>
        </div>
      )}

      {/* 1. 기간 선택 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">1. 기간 선택</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 기간 타입 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">기간 타입</label>
            <div className="flex gap-2">
              {PERIOD_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => handlePeriodType(t.value)}
                  className={`flex-1 min-h-[44px] text-sm font-medium rounded-xl border transition-colors ${
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

          {/* 연도 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">연도</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value, 10) || now.getFullYear())}
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 월/분기 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              {periodType === 'month' ? '월' : periodType === 'quarter' ? '분기' : '연간 — 선택 불필요'}
            </label>
            {periodType === 'year' ? (
              <div className="min-h-[44px] flex items-center text-sm text-gray-400 dark:text-gray-500 px-1">—</div>
            ) : (
              <select
                value={value}
                onChange={e => setValue(parseInt(e.target.value, 10))}
                style={SELECT_CHEVRON_STYLE}
                className="appearance-none w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-4 pr-10 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {(periodType === 'month' ? [1,2,3,4,5,6,7,8,9,10,11,12] : [1,2,3,4]).map(v => (
                  <option key={v} value={v}>
                    {periodType === 'month' ? `${v}월` : `Q${v}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          생성될 period_key:{' '}
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{periodKeyPreview}</span>
          {' · '}
          <span className="text-gray-500">{periodLabelPreview}</span>
          {isOverwrite && (
            <span className="ml-2 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
              ⚠ 기존 데이터 덮어쓰기
            </span>
          )}
        </p>
      </div>

      {/* 2. 요약 지표 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">2. 요약 지표</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField label="목표 매출"     value={targetRevenue} onChange={setTargetRevenue} suffix="원" />
          <NumberField label="실제 매출"     value={actualRevenue} onChange={setActualRevenue} suffix="원" />
          <NumberField label="전기 매출"     value={prevRevenue}   onChange={setPrevRevenue}   suffix="원" hint="전월/전분기/전년 — 증감률 계산용" />
          <NumberField label="전체 딜 수"    value={dealCount}     onChange={setDealCount}     suffix="건" />
          <NumberField label="수주 건수"     value={winCount}      onChange={setWinCount}      suffix="건" hint="전체 딜 수 이하" />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">비고 (선택)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="예) 주요 캠페인 종료, 신규 채널 오픈 등"
            className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* 3. 파이프라인 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">3. 파이프라인 단계</h3>
          <button
            onClick={addPipelineRow}
            className="text-xs min-h-[32px] px-3 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600"
          >
            + 단계 추가
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {pipeline.map((row, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <span className="sm:col-span-1 text-xs text-gray-400 text-center">{row.stage_order}</span>
              <input
                type="text"
                value={row.stage_name}
                onChange={e => updatePipelineRow(i, { stage_name: e.target.value })}
                placeholder="단계명"
                className="sm:col-span-4 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                inputMode="numeric"
                value={row.stage_count === 0 ? '' : row.stage_count.toLocaleString()}
                onChange={e => updatePipelineRow(i, { stage_count: toInt(e.target.value) })}
                placeholder="건수"
                className="sm:col-span-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                inputMode="numeric"
                value={row.stage_amount === 0 ? '' : row.stage_amount.toLocaleString()}
                onChange={e => updatePipelineRow(i, { stage_amount: toInt(e.target.value) })}
                placeholder="금액 (원)"
                className="sm:col-span-4 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={() => removePipelineRow(i)}
                className="sm:col-span-1 text-xs min-h-[40px] text-gray-400 hover:text-red-500"
                title="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 팀원별 실적 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">4. 팀원별 실적</h3>
          <div className="flex items-center gap-2">
            <label
              htmlFor="members-csv"
              className="text-xs min-h-[32px] px-3 inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600 cursor-pointer"
            >
              CSV 업로드
            </label>
            <input
              id="members-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <button
              onClick={addMemberRow}
              className="text-xs min-h-[32px] px-3 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600"
            >
              + 팀원 추가
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
          CSV 형식: <code className="font-mono">member_name,revenue,deals,wins</code> (헤더 포함, UTF-8) · 업로드 시 기존 행은 교체됩니다.
        </p>

        <div className="flex flex-col gap-2">
          {members.map((row, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <input
                type="text"
                value={row.member_name}
                onChange={e => updateMemberRow(i, { member_name: e.target.value })}
                placeholder="팀원 이름"
                className="sm:col-span-3 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                inputMode="numeric"
                value={row.revenue === 0 ? '' : row.revenue.toLocaleString()}
                onChange={e => updateMemberRow(i, { revenue: toInt(e.target.value) })}
                placeholder="매출 (원)"
                className="sm:col-span-4 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                inputMode="numeric"
                value={row.deals === 0 ? '' : row.deals}
                onChange={e => updateMemberRow(i, { deals: toInt(e.target.value) })}
                placeholder="진행 딜"
                className="sm:col-span-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                inputMode="numeric"
                value={row.wins === 0 ? '' : row.wins}
                onChange={e => updateMemberRow(i, { wins: toInt(e.target.value) })}
                placeholder="수주"
                className="sm:col-span-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={() => removeMemberRow(i)}
                className="sm:col-span-1 text-xs min-h-[40px] text-gray-400 hover:text-red-500"
                title="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
          disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-semibold transition-colors mb-8
          flex items-center justify-center gap-2"
      >
        {saving
          ? <><Spinner />저장 중...</>
          : (isOverwrite ? '실적 덮어쓰기 저장' : '실적 등록')}
      </button>

      {/* 등록된 기간 목록 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">등록된 기간</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">클릭하면 해당 기간의 데이터를 폼에 불러옵니다.</p>
          </div>
          <button
            onClick={refreshPeriods}
            className="text-xs min-h-[32px] px-3 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600"
          >
            새로고침
          </button>
        </div>
        <div className="p-5">
          {existingPeriods.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">아직 등록된 기간이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {existingPeriods.map(p => (
                <li key={p.period_key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handlePrefill(p.period_key)}
                    className="flex-1 text-left min-w-0"
                  >
                    <span className="text-sm font-semibold text-gray-800 dark:text-white font-mono">{p.period_key}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{p.period_label}</span>
                    <span className="text-[10px] text-gray-400 ml-2 uppercase">{p.period_type}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(p.period_key)}
                    className="text-xs min-h-[32px] px-3 text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
