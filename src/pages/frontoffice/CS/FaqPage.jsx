// FAQ 자동 생성·관리 페이지
import { useState, useEffect } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { generateFaqs, saveFaqs, getFaqs, updateFaq, exportInquiriesCsv, downloadInquiriesCsv, uploadPolicy } from '../../../api/cs'

const TABS = [
  { id: 'generate', label: 'FAQ 자동 생성' },
  { id: 'manage',   label: 'FAQ 관리' },
]

// ── 공통 컴포넌트 ────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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

// ── 탭 1: FAQ 자동 생성 ──────────────────────────────────────

function GenerateTab() {
  const [file,      setFile]      = useState(null)
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [importing, setImporting] = useState(false)
  const [topN,      setTopN]      = useState(10)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [faqs,    setFaqs]    = useState([])
  const [selected, setSelected] = useState(new Set()) // 선택된 FAQ 인덱스
  // faqs = [{ category, question, answer }]

  async function handleGenerate() {
    if (!file) return
    setLoading(true)
    setError(null)
    setFaqs([])
    try {
      const data = await generateFaqs(file, topN)
      setFaqs(data.faqs)
      setSelected(new Set(data.faqs.map((_, i) => i))) // 생성 시 전체 선택
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImportFromDb() {
    setImporting(true)
    setError(null)
    try {
      const csvFile = await exportInquiriesCsv({ dateFrom, dateTo })
      setFile(csvFile)
    } catch (e) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  async function handleSaveAll() {
    if (!faqs.length) return
    setSaving(true)
    setError(null)
    try {
      await saveFaqs(faqs)
      setFaqs([])
      setSelected(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSelected() {
    if (!selected.size) return
    setSaving(true)
    setError(null)
    try {
      const toSave = faqs.filter((_, i) => selected.has(i))
      await saveFaqs(toSave)
      const remaining = faqs.filter((_, i) => !selected.has(i))
      setFaqs(remaining)
      setSelected(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function toggleSelect(i) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(prev => prev.size === faqs.length ? new Set() : new Set(faqs.map((_, i) => i)))
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 파일 업로드 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">문의 로그 불러오기</h3>

        {/* DB에서 가져오기 */}
        <div className="flex flex-wrap gap-2 items-end mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">시작일</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">종료일</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
          <button
            onClick={handleImportFromDb}
            disabled={importing}
            className="min-h-[36px] px-4 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            {importing ? <><Spinner />가져오는 중...</> : 'DB에서 가져오기'}
          </button>
          <button
            onClick={() => downloadInquiriesCsv({ dateFrom, dateTo })}
            className="min-h-[36px] px-3 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV 저장
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <label className="flex-1">
            <div className="flex items-center gap-3 min-h-[44px] px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-amber-400 transition-colors">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {file ? file.name : 'CSV 직접 업로드'}
              </span>
            </div>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">상위</label>
            <input
              type="number"
              value={topN}
              onChange={e => setTopN(Number(e.target.value))}
              min={1} max={50}
              className="w-16 text-sm rounded-xl border border-gray-200 dark:border-gray-600
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                px-3 py-2 min-h-[44px] text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">개 생성</label>
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!file || loading}
        className="min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
          disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-semibold transition-colors
          flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />클러스터링 분석 중...</> : 'FAQ 자동 생성'}
      </button>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!loading && !error && faqs.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-sm text-gray-400">문의 로그 CSV를 업로드하고 생성 버튼을 누르면<br />FAQ 초안이 여기에 표시됩니다.</p>
        </div>
      )}

      {/* FAQ 결과 */}
      {faqs.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            {/* 왼쪽: 전체선택 + 카운트 */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.size === faqs.length && faqs.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-800 dark:text-white">
                생성된 FAQ ({faqs.length}개)
              </span>
              {selected.size > 0 && selected.size < faqs.length && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{selected.size}개 선택됨</span>
              )}
            </label>
            {/* 오른쪽: 버튼 그룹 */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleSaveSelected}
                disabled={saving || selected.size === 0}
                className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold rounded-lg min-h-[32px] px-3 transition-colors"
              >
                {saving ? <><Spinner />저장 중...</> : `선택 저장 (${selected.size})`}
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline min-h-[32px] px-2 disabled:opacity-50"
              >
                전체 저장
              </button>
            </div>
          </div>
          {faqs.map((faq, i) => (
            <div
              key={i}
              onClick={() => toggleSelect(i)}
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                selected.has(i)
                  ? 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3 mb-2">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleSelect(i)}
                  onClick={e => e.stopPropagation()}
                  className="mt-0.5 w-4 h-4 rounded accent-amber-500 cursor-pointer shrink-0"
                />
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium shrink-0 mt-0.5">
                  {faq.category}
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Q. {faq.question}</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-7">A. {faq.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 탭 2: FAQ 관리 ───────────────────────────────────────────

function ManageTab() {
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [faqs,           setFaqs]           = useState([])
  const [editingId,      setEditingId]      = useState(null)
  const [editForm,       setEditForm]       = useState({})
  // 정책 업로드
  const [policyFile,     setPolicyFile]     = useState(null)
  const [policyLoading,  setPolicyLoading]  = useState(false)
  const [policyResult,   setPolicyResult]   = useState(null)  // { updated_count, message? }
  const [policyError,    setPolicyError]    = useState(null)
  // 수정 초안 펼침
  const [expandedDraft,  setExpandedDraft]  = useState(null)
  const [applyingId,     setApplyingId]     = useState(null)

  async function loadFaqs() {
    setLoading(true)
    setError(null)
    try {
      const data = await getFaqs()
      setFaqs(data.items)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFaqs() }, [])

  function startEdit(faq) {
    setEditingId(faq.id)
    setEditForm({ category: faq.category, question: faq.question, answer: faq.answer })
  }

  async function handleUpdate(faqId) {
    try {
      const updated = await updateFaq(faqId, editForm)
      setFaqs(prev => prev.map(f => f.id === faqId ? { ...f, ...updated } : f))
      setEditingId(null)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handlePolicyUpload() {
    if (!policyFile) return
    setPolicyLoading(true)
    setPolicyError(null)
    setPolicyResult(null)
    try {
      const data = await uploadPolicy(policyFile)
      setPolicyResult(data)
      if (data.updated_count > 0) await loadFaqs()
    } catch (e) {
      setPolicyError(e.message)
    } finally {
      setPolicyLoading(false)
    }
  }

  async function handleApplyDraft(faq) {
    setApplyingId(faq.id)
    try {
      const updated = await updateFaq(faq.id, {
        answer:           faq.suggested_answer,
        flagged:          false,
        suggested_answer: '',
      })
      setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, ...updated } : f))
      setExpandedDraft(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setApplyingId(null)
    }
  }

  const flaggedCount = faqs.filter(f => f.flagged).length

  return (
    <div className="flex flex-col gap-5">

      {/* 정책 문서 업로드 */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">정책 변경 감지</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">— 정책 문서를 업로드하면 FAQ 자동 검토 후 수정 초안 생성</span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 cursor-pointer hover:border-blue-500 transition-colors">
              <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {policyFile ? policyFile.name : 'CS_Standard_Policy.docx'}
              </span>
            </div>
            <input
              type="file"
              accept=".docx"
              className="hidden"
              onChange={e => { setPolicyFile(e.target.files?.[0] ?? null); setPolicyResult(null) }}
            />
          </label>
          <button
            onClick={handlePolicyUpload}
            disabled={!policyFile || policyLoading}
            className="min-h-[40px] px-4 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
          >
            {policyLoading ? <><Spinner />분석 중...</> : '업데이트 확인'}
          </button>
        </div>

        {policyError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{policyError}</p>
        )}
        {policyResult && (
          <div className={`mt-2 text-xs font-medium px-3 py-1.5 rounded-lg ${
            policyResult.updated_count > 0
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }`}>
            {policyResult.updated_count > 0
              ? `${policyResult.updated_count}개 FAQ에 수정 초안이 생성되었습니다. 아래에서 확인하고 적용하세요.`
              : (policyResult.message || '정책과 불일치하는 FAQ가 없습니다.')}
          </div>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!loading && !error && faqs.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-sm text-gray-400">저장된 FAQ가 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">FAQ 자동 생성 탭에서 FAQ를 생성하고 저장하세요.</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {/* FAQ 목록 */}
      {!loading && faqs.length > 0 && (
        <div className="flex flex-col gap-3">
          {flaggedCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              ⚠ 업데이트 필요 {flaggedCount}건 — 수정 초안을 검토 후 적용하세요.
            </p>
          )}
          {faqs.map(faq => (
            <div
              key={faq.id}
              className={`rounded-xl border p-4 ${
                faq.flagged
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {editingId === faq.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={editForm.category}
                    onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                    className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 w-32"
                  />
                  <input
                    value={editForm.question}
                    onChange={e => setEditForm(p => ({ ...p, question: e.target.value }))}
                    className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <textarea
                    value={editForm.answer}
                    onChange={e => setEditForm(p => ({ ...p, answer: e.target.value }))}
                    rows={3}
                    className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(faq.id)} className="min-h-[32px] px-3 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium">저장</button>
                    <button onClick={() => setEditingId(null)} className="min-h-[32px] px-3 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">취소</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                          {faq.category}
                        </span>
                        {faq.flagged && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400 text-white dark:bg-amber-600 font-medium">
                            업데이트 필요
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Q. {faq.question}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{faq.answer}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(faq)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 min-h-[32px] px-2"
                      >
                        수정
                      </button>
                      {faq.flagged && faq.suggested_answer && (
                        <button
                          onClick={() => setExpandedDraft(expandedDraft === faq.id ? null : faq.id)}
                          className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 min-h-[32px] px-2 whitespace-nowrap"
                        >
                          {expandedDraft === faq.id ? '초안 닫기' : '수정 초안'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 수정 초안 패널 */}
                  {expandedDraft === faq.id && faq.suggested_answer && (
                    <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-3">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">AI 수정 초안</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                        {faq.suggested_answer}
                      </p>
                      <button
                        onClick={() => handleApplyDraft(faq)}
                        disabled={applyingId === faq.id}
                        className="min-h-[32px] px-4 text-xs rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium transition-colors flex items-center gap-1.5"
                      >
                        {applyingId === faq.id ? <><Spinner />적용 중...</> : '초안 적용'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function FaqPage() {
  const [activeTab, setActiveTab] = useState('generate')

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: 'CS/고객지원팀', to: '/frontoffice/cs' },
          { label: 'FAQ 자동 생성·관리' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office · CS/고객지원팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              FAQ 자동 생성·관리
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          문의 로그를 클러스터링하여 FAQ 초안을 생성하고, 정책 변경 시 자동으로 업데이트합니다.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'generate' && <GenerateTab />}
      {activeTab === 'manage'   && <ManageTab />}
    </div>
  )
}
