// 계약 생성 페이지 — 조건 입력 → 표준 계약서 초안 자동 작성 (RAG 활용)
import { useState } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { generateContractDraft, downloadDraftDocx } from '../../../api/legal'

// 계약 유형 목록
const CONTRACT_TYPES = [
  { value: 'nda',         label: 'NDA (비밀유지계약)' },
  { value: 'service',     label: '용역계약서' },
  { value: 'employment',  label: '근로계약서' },
  { value: 'partnership', label: '업무협약서 (MOU)' },
  { value: 'purchase',    label: '물품 구매계약서' },
]

// 로딩 스피너
function Spinner({ size = 4 }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

// 입력 필드 레이블
function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

// 공통 인풋 스타일
const inputCls = `w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600
  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
  px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[44px]`

export default function ContractDraftPage() {
  const [form, setForm] = useState({
    contract_type: '',
    party_a:       '',   // 갑 (발주자/위탁자)
    party_b:       '',   // 을 (수주자/수탁자)
    purpose:       '',   // 계약 목적 / 업무 범위
    amount:        '',   // 계약 금액
    start_date:    '',
    end_date:      '',
    extra:         '',   // 특이 사항
  })
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [draft,        setDraft]        = useState('')
  const [note,         setNote]         = useState('')
  const [ragSources,   setRagSources]   = useState([])
  const [copied,       setCopied]       = useState(false)
  const [downloading,  setDownloading]  = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const isValid = form.contract_type && form.party_a && form.party_b && form.purpose

  // ── 계약서 생성 ───────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!isValid) return
    setLoading(true)
    setError(null)
    setDraft('')
    setNote('')
    setRagSources([])
    try {
      const data = await generateContractDraft(form)
      setDraft(data.draft || '')
      setNote(data.note || '')
      setRagSources(data.rag_sources || [])
    } catch (e) {
      setError(e.message || '계약서 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 클립보드 복사
  const handleCopy = () => {
    navigator.clipboard.writeText(draft).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // 워드 파일 다운로드
  const handleDownloadDocx = async () => {
    if (!draft || downloading) return
    setDownloading(true)
    setDownloadError('')
    const typeName = CONTRACT_TYPES.find(t => t.value === form.contract_type)?.label || '계약서'
    try {
      await downloadDraftDocx(draft, typeName)
    } catch (e) {
      setDownloadError(e.message || 'DOCX 다운로드에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '법무/컴플라이언스팀', to: '/backoffice/legal' },
          { label: '계약 생성' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 text-white text-xs font-bold shrink-0">
            생성
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Back-Office · 법무/컴플라이언스팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              계약서 초안 생성
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              계약 조건을 입력하면 AI가 표준 계약서 초안을 자동으로 작성합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 에러 배너 */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-5 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 입력 폼 ────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">계약 조건 입력</h2>

          {/* 계약 유형 */}
          <div>
            <FieldLabel required>계약 유형</FieldLabel>
            <select
              value={form.contract_type}
              onChange={e => update('contract_type', e.target.value)}
              className={inputCls}
            >
              <option value="">유형 선택</option>
              {CONTRACT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* 갑 / 을 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>갑 (발주/위탁사)</FieldLabel>
              <input
                type="text"
                placeholder="회사명 또는 성명"
                value={form.party_a}
                onChange={e => update('party_a', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel required>을 (수주/수탁사)</FieldLabel>
              <input
                type="text"
                placeholder="회사명 또는 성명"
                value={form.party_b}
                onChange={e => update('party_b', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* 계약 목적 */}
          <div>
            <FieldLabel required>계약 목적 / 업무 범위</FieldLabel>
            <textarea
              rows={3}
              placeholder="예: 모바일 앱 UI/UX 디자인 및 퍼블리싱 용역"
              value={form.purpose}
              onChange={e => update('purpose', e.target.value)}
              className={`${inputCls} resize-none min-h-[80px]`}
            />
          </div>

          {/* 계약 금액 */}
          <div>
            <FieldLabel>계약 금액 (원)</FieldLabel>
            <input
              type="text"
              placeholder="예: 5,000,000"
              value={form.amount}
              onChange={e => update('amount', e.target.value)}
              className={inputCls}
            />
          </div>

          {/* 계약 기간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>시작일</FieldLabel>
              <input
                type="date"
                value={form.start_date}
                onChange={e => update('start_date', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel>종료일</FieldLabel>
              <input
                type="date"
                value={form.end_date}
                onChange={e => update('end_date', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* 특이 사항 */}
          <div>
            <FieldLabel>특이 사항 (선택)</FieldLabel>
            <textarea
              rows={2}
              placeholder="추가 조건, 특약 사항 등 자유롭게 입력"
              value={form.extra}
              onChange={e => update('extra', e.target.value)}
              className={`${inputCls} resize-none min-h-[64px]`}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!isValid || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium
              bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
          >
            {loading ? <><Spinner size={4} /> 생성 중...</> : '📄 계약서 초안 생성'}
          </button>
        </div>

        {/* ── 결과 영역 ──────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">생성된 계약서 초안</h2>
            {draft && (
              <div className="flex items-center gap-2">
                {/* 워드 다운로드 */}
                <button
                  onClick={handleDownloadDocx}
                  disabled={downloading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                    bg-blue-600 text-white hover:bg-blue-700
                    disabled:opacity-50 min-h-[32px] transition-colors"
                >
                  {downloading ? (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                  )}
                  {downloading ? '생성 중…' : '워드 다운로드'}
                </button>
                {/* 클립보드 복사 */}
                <button
                  onClick={handleCopy}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600
                    text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[32px]"
                >
                  {copied ? '✓ 복사됨' : '복사'}
                </button>
              </div>
            )}
          </div>
          {downloadError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-xs text-red-700 dark:text-red-400">
              {downloadError}
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div className="flex-1 flex items-center justify-center gap-2 text-gray-400 py-16">
              <Spinner size={5} /> <span className="text-sm">계약서를 작성하는 중...</span>
            </div>
          )}

          {/* 빈 상태 */}
          {!loading && !draft && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">좌측 조건을 입력하고 생성 버튼을 누르면<br />계약서 초안이 여기에 표시됩니다.</p>
            </div>
          )}

          {/* 결과 */}
          {!loading && draft && (
            <>
              <div className="flex-1 rounded-lg bg-gray-50 dark:bg-gray-800 p-4 overflow-auto max-h-[600px]">
                <pre className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {draft}
                </pre>
              </div>

              {/* RAG 참조 문서 */}
              {ragSources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-1.5">사내 법령·사규 참조</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ragSources.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                {note ? `※ ${note}` : '※ AI가 생성한 초안입니다. 반드시 법무 담당자의 최종 검토를 거친 후 사용하세요.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
