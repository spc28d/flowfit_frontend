// 계약 검토 페이지 — 계약서 업로드 → AI 리스크 조항 탐지 및 요약 (RAG 활용)
import { useState, useRef, useCallback } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { reviewContract } from '../../../api/legal'

// ── 위험도 설정 ───────────────────────────────────────────────
const RISK = {
  danger: {
    label:    'Danger',
    badge:    'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    border:   'border-red-200 dark:border-red-800',
    dot:      'bg-red-500',
    bg:       'bg-red-50 dark:bg-red-900/20',
    text:     'text-red-700 dark:text-red-300',
  },
  warning: {
    label:    'Warning',
    badge:    'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    border:   'border-amber-200 dark:border-amber-800',
    dot:      'bg-amber-400',
    bg:       'bg-amber-50 dark:bg-amber-900/20',
    text:     'text-amber-700 dark:text-amber-300',
  },
  safe: {
    label:    'Safe',
    badge:    'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    border:   'border-gray-200 dark:border-gray-700',
    dot:      'bg-emerald-500',
    bg:       'bg-emerald-50 dark:bg-emerald-900/20',
    text:     'text-emerald-700 dark:text-emerald-300',
  },
}

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]
const ALLOWED_EXT = ['.pdf', '.txt', '.docx', '.hwp', '.jpg', '.jpeg', '.png', '.webp', '.gif']

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

// 로딩 스피너
function Spinner({ size = 4 }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
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

// 조항 분석 카드
function ClauseCard({ clause, expanded, onToggle }) {
  const r = RISK[clause.risk_level] || RISK.safe
  return (
    <div className={`rounded-xl border transition-all ${r.border} bg-white dark:bg-gray-900 overflow-hidden`}>
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors min-h-[56px]"
        onClick={onToggle}
      >
        <RiskBadge level={clause.risk_level} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{clause.title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{clause.article || ''}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
          {/* 원문 */}
          <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">원문</p>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {clause.original_text}
            </p>
          </div>
          {/* AI 분석 */}
          <div className={`mt-3 rounded-lg p-4 ${r.bg}`}>
            <p className={`text-xs font-semibold mb-1.5 ${r.text}`}>AI 분석</p>
            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{clause.ai_comment}</p>
          </div>
          {/* 수정 제안 */}
          {clause.suggestion && (
            <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">수정 제안</p>
              <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{clause.suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ContractReviewPage() {
  const [file,       setFile]       = useState(null)
  const [preview,    setPreview]    = useState(null)   // 이미지 미리보기 URL
  const [dragging,   setDragging]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [result,     setResult]     = useState(null)   // { summary, overall_risk, clauses[] }
  const [expandedId, setExpandedId] = useState(null)
  const inputRef = useRef(null)

  const isImage = file && IMAGE_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))

  // ── 파일 선택/드롭 처리 ──────────────────────────────────────
  const handleFile = useCallback((f) => {
    if (!f) return
    if (!ALLOWED_TYPES.includes(f.type) && !ALLOWED_EXT.some(ext => f.name.toLowerCase().endsWith(ext))) {
      setError('PDF, TXT, DOCX, HWP 또는 이미지(JPG, PNG, WEBP) 파일만 업로드 가능합니다.')
      return
    }
    setFile(f)
    setError(null)
    setResult(null)

    // 이미지 미리보기 생성
    if (IMAGE_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  // ── AI 검토 실행 ──────────────────────────────────────────────
  const handleReview = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await reviewContract(formData)
      setResult(data)
    } catch (e) {
      setError(e.message || 'AI 검토 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const overallR = result ? (RISK[result.overall_risk] || RISK.safe) : null

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '법무/컴플라이언스팀', to: '/backoffice/legal' },
          { label: '계약 검토' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 text-white text-xs font-bold shrink-0">
            검토
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Back-Office · 법무/컴플라이언스팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              계약서 AI 검토
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              PDF 또는 텍스트 파일을 업로드하면 AI가 리스크 조항을 자동으로 탐지하고 수정안을 제안합니다.
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

      {/* 파일 업로드 영역 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={[
          'mb-5 rounded-xl border-2 border-dashed transition-colors cursor-pointer',
          'flex flex-col items-center justify-center gap-3 py-12 px-6 text-center',
          dragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-900',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.docx,.hwp,.jpg,.jpeg,.png,.webp,.gif"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        {file ? (
          <div className="flex flex-col items-center gap-2">
            {/* 이미지 미리보기 */}
            {isImage && preview && (
              <img
                src={preview}
                alt="계약서 미리보기"
                className="max-h-48 max-w-full rounded-lg border border-gray-200 dark:border-gray-700 object-contain"
              />
            )}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{file.name}</p>
              {isImage && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">
                  Vision AI
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · 클릭하여 파일 변경</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              계약서 파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF · TXT · DOCX · HWP · JPG · PNG · WEBP · 최대 10MB</p>
          </div>
        )}
      </div>

      {/* AI 검토 버튼 */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleReview}
          disabled={!file || loading}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-blue-600 text-white
            rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
        >
          {loading ? <><Spinner size={4} /> 분석 중...</> : '⚡ AI 검토 시작'}
        </button>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Spinner size={5} /> <span className="text-sm">계약서를 분석하는 중입니다...</span>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !result && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">계약서 파일을 업로드한 후 AI 검토 버튼을 눌러주세요.</p>
        </div>
      )}

      {/* 결과 영역 */}
      {!loading && result && (
        <div className="space-y-5">
          {/* 전체 리스크 요약 */}
          <div className={`rounded-xl border p-5 ${overallR.border}`}>
            <div className="flex items-center gap-3 mb-3">
              <RiskBadge level={result.overall_risk} />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">전체 리스크 요약</h2>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{result.summary}</p>

            {/* 조항 집계 배지 */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {['danger', 'warning', 'safe'].map(level => {
                const count = result.clauses.filter(c => c.risk_level === level).length
                if (count === 0) return null
                const r = RISK[level]
                return (
                  <span key={level} className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.badge}`}>
                    {r.label} {count}건
                  </span>
                )
              })}
              <span className="text-xs text-gray-400 ml-1">총 {result.clauses.length}개 조항 분석</span>
            </div>

            {/* RAG 참조 문서 */}
            {result.rag_sources?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-1.5">사내 법령·사규 참조</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.rag_sources.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 조항별 분석 테이블 */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">조항별 분석</h2>
            <div className="space-y-3">
              {result.clauses
                .sort((a, b) => {
                  const order = { danger: 1, warning: 2, safe: 3 }
                  return order[a.risk_level] - order[b.risk_level]
                })
                .map(clause => (
                  <ClauseCard
                    key={clause.id}
                    clause={clause}
                    expanded={expandedId === clause.id}
                    onToggle={() => setExpandedId(expandedId === clause.id ? null : clause.id)}
                  />
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
