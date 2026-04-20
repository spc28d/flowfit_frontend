// 경리/회계 페이지 — 영수증 OCR · 전표 자동 분류 · Human-in-the-Loop 확정
import { useState, useRef, useEffect, useCallback } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import {
  analyzeReceipt, saveTransactions, getTransactions,
  updateTransaction, confirmTransaction, exportConfirmedExcel,
  getImageUrl, suggestAccountCode,
} from '../../../api/finance'
import { getAuthSession } from '../../../api/auth'

const ACCOUNT_CODES = [
  '접대비', '복리후생비', '소모품비', '여비교통비', '통신비',
  '도서인쇄비', '수수료비용', '광고선전비', '교육훈련비', '임차료', '기타비용',
]

// ── 공통 컴포넌트 ────────────────────────────────────────────

function ConfidenceBadge({ value }) {
  const v = Math.round(value ?? 0)
  const cls = v >= 95 ? 'bg-emerald-100 text-emerald-700'
    : v >= 85         ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{v}%</span>
}

function StatusBadge({ status }) {
  return status === 'confirmed'
    ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">확정</span>
    : <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">미확정</span>
}

function Spinner({ size = 4 }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 mb-5">
      <p className="text-sm text-red-700">{message}</p>
    </div>
  )
}

// 중복 경고 Toast
function DuplicateToast({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed top-5 right-5 z-50 flex items-start gap-3 bg-amber-50 border border-amber-300
      rounded-xl shadow-lg px-5 py-4 max-w-sm">
      <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800">중복 전표 의심</p>
        <p className="text-xs text-amber-700 mt-0.5">동일한 가맹점·날짜·금액이 DB에 이미 존재합니다. 내용을 확인해 주세요.</p>
      </div>
      <button onClick={onClose} className="text-amber-400 hover:text-amber-600 text-lg leading-none">×</button>
    </div>
  )
}

// 이미지 원본 보기 모달
function ImageModal({ src, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
      onClick={onClose}
    >
      <div className="relative" onClick={e => e.stopPropagation()}>
        <img
          src={src}
          alt="영수증 원본"
          className="max-w-[88vw] max-h-[88vh] rounded-xl shadow-2xl object-contain"
        />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow flex items-center
            justify-center text-gray-600 hover:text-gray-900 font-bold text-lg"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── 수기 입력 모달 ───────────────────────────────────────────

function ManualEntryModal({ onClose, onSaved, session }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    receipt_date: today,
    vendor: '',
    item: '',
    amount: '',
    tax_amount: '',
    account_code: '기타비용',
    memo: '',
  })
  const [suggesting, setSuggesting] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSuggest() {
    if (!form.vendor && !form.memo) return
    setSuggesting(true)
    setError(null)
    try {
      const res = await suggestAccountCode(form.vendor, form.memo)
      setField('account_code', res.account_code)
    } catch (e) {
      setError(e.message)
    } finally {
      setSuggesting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const amount    = Number(form.amount)
    const taxAmount = Number(form.tax_amount) || 0
    if (!form.item || !amount) {
      setError('항목명과 공급가액은 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const data = await saveTransactions({
        receipt_date: form.receipt_date,
        vendor:       form.vendor,
        image_path:   null,
        department:   session?.employee?.department || null,
        emp_id:       session?.employee?.employee_id || null,
        items: [{
          item:         form.item,
          amount,
          tax_amount:   taxAmount,
          account_code: form.account_code,
          memo:         form.memo,
          confidence:   0,
        }],
      })
      onSaved(data.saved)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">수기 전표 등록</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
              hover:text-gray-600 hover:bg-gray-100 text-xl transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* 결제일자 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">결제일자 <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={form.receipt_date}
              onChange={e => setField('receipt_date', e.target.value)}
              required
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2
                min-h-[40px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* 가맹점명 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">가맹점명</label>
            <input
              type="text"
              value={form.vendor}
              onChange={e => setField('vendor', e.target.value)}
              placeholder="예: 스타벅스"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2
                min-h-[40px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* 항목명 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">항목명 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.item}
              onChange={e => setField('item', e.target.value)}
              placeholder="예: 커피 외 2건"
              required
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2
                min-h-[40px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* 금액 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">공급가액 <span className="text-red-400">*</span></label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setField('amount', e.target.value)}
                placeholder="0"
                required
                min={0}
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2
                  min-h-[40px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">부가세</label>
              <input
                type="number"
                value={form.tax_amount}
                onChange={e => setField('tax_amount', e.target.value)}
                placeholder="0"
                min={0}
                className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2
                  min-h-[40px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* 계정과목 + AI 추천 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">계정과목</label>
            <div className="flex gap-2">
              <select
                value={form.account_code}
                onChange={e => setField('account_code', e.target.value)}
                className="flex-1 text-sm rounded-lg border border-gray-200 px-3 py-2
                  min-h-[40px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {ACCOUNT_CODES.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggesting || (!form.vendor && !form.memo)}
                className="min-h-[40px] px-3 py-2 rounded-lg border border-blue-300 text-blue-600
                  text-xs font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors whitespace-nowrap flex items-center gap-1"
              >
                {suggesting ? <Spinner /> : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI 추천
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 지출내역/비고 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">지출내역/비고</label>
            <textarea
              value={form.memo}
              onChange={e => setField('memo', e.target.value)}
              placeholder="지출 목적 등 상세 내용"
              rows={2}
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2
                focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* 합계 미리보기 */}
          {form.amount && (
            <div className="rounded-lg bg-gray-50 px-4 py-2.5 flex justify-between items-center">
              <span className="text-xs text-gray-500">합계</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {(Number(form.amount) + Number(form.tax_amount || 0)).toLocaleString()}원
              </span>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-200 text-sm
                text-gray-500 hover:bg-gray-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700
                disabled:bg-blue-400 text-white text-sm font-semibold transition-colors
                flex items-center justify-center gap-2"
            >
              {saving ? <><Spinner />저장 중...</> : '전표 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 탭 1: OCR 분석 ───────────────────────────────────────────

function OcrTab({ session }) {
  const [isDragging, setIsDragging]       = useState(false)
  const [file, setFile]                   = useState(null)
  const [previewUrl, setPreviewUrl]       = useState(null)   // 로컬 미리보기 URL
  const [loading, setLoading]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [results, setResults]             = useState([])
  const [receiptMeta, setReceiptMeta]     = useState(null)   // { receipt_date, vendor, image_path }
  const [editMap, setEditMap]             = useState({})
  const [savedIds, setSavedIds]           = useState(null)
  const [showDupToast, setShowDupToast]   = useState(false)
  const [error, setError]                 = useState(null)
  const [modalImage, setModalImage]       = useState(null)
  const fileInputRef = useRef(null)

  function handleFile(f) {
    if (!f) return
    // 이전 미리보기 URL 해제
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setResults([])
    setReceiptMeta(null)
    setEditMap({})
    setSavedIds(null)
    setError(null)
    setShowDupToast(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  // AI 분석
  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setResults([])
    setReceiptMeta(null)
    setSavedIds(null)
    setError(null)
    setShowDupToast(false)
    try {
      const data = await analyzeReceipt(file)
      setReceiptMeta({ receipt_date: data.receipt_date, vendor: data.vendor, image_path: data.image_path })
      setResults(data.items)
      if (data.has_duplicates) setShowDupToast(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // DB 저장
  async function handleSave() {
    if (!results.length || !receiptMeta) return
    setSaving(true)
    setError(null)
    try {
      const items = results.map((r, i) => ({
        ...r,
        account_code: editMap[i] ?? r.account_code,
      }))
      const data = await saveTransactions({
        ...receiptMeta,
        department: session?.employee?.department || null,
        emp_id:     session?.employee?.employee_id || null,
        items,
      })
      setSavedIds(data.saved.map(s => s.id))
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const hasResults   = results.length > 0
  const totalAmount  = results.reduce((s, r) => s + (r.total_amount ?? r.amount), 0)
  const alreadySaved = savedIds !== null

  return (
    <div>
      {showDupToast && <DuplicateToast onClose={() => setShowDupToast(false)} />}
      {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}

      {/* 파일 업로드 영역 */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !previewUrl && fileInputRef.current?.click()}
        className={[
          'rounded-xl border-2 border-dashed transition-all duration-150 mb-4 overflow-hidden',
          isDragging
            ? 'border-blue-400 bg-blue-50 scale-[1.01]'
            : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50',
          previewUrl ? 'cursor-default' : 'cursor-pointer p-8 text-center',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          /* 이미지 미리보기 */
          <div className="relative group">
            <img
              src={previewUrl}
              alt="선택된 영수증"
              className="w-full max-h-56 object-contain bg-gray-50"
            />
            {/* 파일 교체 버튼 */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <button
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg
                  px-4 py-2 text-sm font-medium text-gray-700 shadow"
              >
                파일 교체
              </button>
            </div>
            {/* 원본 보기 버튼 */}
            <button
              onClick={e => { e.stopPropagation(); setModalImage(previewUrl) }}
              className="absolute bottom-2 right-2 bg-white/90 rounded-lg px-2 py-1 text-xs text-gray-600 shadow hover:bg-white"
            >
              원본 보기
            </button>
            <p className="text-xs text-center text-gray-500 py-2 bg-white border-t">{file?.name}</p>
          </div>
        ) : (
          <>
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">파일을 드래그하거나 클릭하여 업로드</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF 지원 · 최대 10MB</p>
          </>
        )}
      </div>

      {/* AI 분석 버튼 */}
      <button
        onClick={handleAnalyze}
        disabled={!file || loading}
        className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300
          text-white text-sm font-semibold transition-colors mb-6 flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />AI 분석 중...</> : 'AI 분석 시작'}
      </button>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!hasResults && !loading && !error && (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-400">영수증을 업로드하고 분석을 실행하면 결과가 표시됩니다.</p>
        </div>
      )}

      {/* 분석 결과 */}
      {hasResults && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {/* 결과 헤더 */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100
            bg-gray-50 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">분석 결과</span>
              {receiptMeta && (
                <span className="text-xs text-gray-400">
                  {receiptMeta.receipt_date}{receiptMeta.vendor && ` · ${receiptMeta.vendor}`}
                </span>
              )}
              <span className="text-xs text-gray-400">{results.length}건 · 합계 {totalAmount.toLocaleString()}원</span>
            </div>
            <div className="flex items-center gap-2">
              {alreadySaved ? (
                <span className="min-h-[36px] flex items-center gap-1.5 px-4 py-1.5 rounded-lg
                  bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  DB 저장 완료 ({savedIds.length}건)
                </span>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="min-h-[36px] flex items-center gap-1.5 px-4 py-1.5 rounded-lg
                    bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold"
                >
                  {saving ? <><Spinner />저장 중...</> : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      DB에 추가
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 결과 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100 bg-white">
                  <th className="text-left px-5 py-2.5 font-medium">항목</th>
                  <th className="text-right px-4 py-2.5 font-medium">공급가액</th>
                  <th className="text-right px-4 py-2.5 font-medium">부가세</th>
                  <th className="text-right px-4 py-2.5 font-medium">합계</th>
                  <th className="text-left px-4 py-2.5 font-medium">계정과목</th>
                  <th className="text-center px-4 py-2.5 font-medium">신뢰도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((row, i) => (
                  <tr key={i} className={[
                    'transition-colors',
                    row.is_duplicate ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50',
                  ].join(' ')}>
                    <td className="px-5 py-3 text-gray-900">
                      <div className="flex items-center gap-2">
                        {row.item}
                        {row.is_duplicate && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-amber-200 text-amber-800 whitespace-nowrap">
                            중복 의심
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {row.amount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                      {(row.tax_amount ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                      {(row.total_amount ?? row.amount).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editMap[i] ?? row.account_code}
                        onChange={e => setEditMap(prev => ({ ...prev, [i]: e.target.value }))}
                        disabled={alreadySaved}
                        className="text-xs rounded-lg border border-gray-200 bg-white text-gray-900
                          px-2 py-1.5 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-blue-400
                          disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {ACCOUNT_CODES.map(code => <option key={code} value={code}>{code}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ConfidenceBadge value={row.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 탭 2: 전표 내역 (DB 조회 + 수정 + 확정) ──────────────────

const ACCOUNT_FILTER_OPTIONS = ['전체', ...ACCOUNT_CODES]
const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'pending',   label: '미확정' },
  { value: 'confirmed', label: '확정' },
]

function LedgerTab({ session, onManualEntry }) {
  const [items, setItems]           = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [page, setPage]             = useState(0)
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter]   = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  // 수정 상태
  const [editingId, setEditingId]   = useState(null)
  const [editDraft, setEditDraft]   = useState({})    // { account_code, amount, tax_amount }
  const [saving, setSaving]         = useState(false)

  // 확정 처리 중인 ID Set
  const [confirmingIds, setConfirmingIds] = useState(new Set())

  // 이미지 모달
  const [modalImage, setModalImage] = useState(null)

  // 엑셀 다운로드
  const [exporting, setExporting]   = useState(false)

  const LIMIT = 20

  const fetchData = useCallback(async (pg = 0) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTransactions({
        limit:        LIMIT,
        offset:       pg * LIMIT,
        department:   session?.employee?.department || undefined,
        account_code: accountFilter || undefined,
        status:       statusFilter  || undefined,
        date_from:    dateFrom      || undefined,
        date_to:      dateTo        || undefined,
      })
      setItems(data.items)
      setTotal(data.total)
      setPage(pg)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [session, accountFilter, statusFilter, dateFrom, dateTo])

  useEffect(() => { fetchData(0) }, [fetchData])

  // 수정 시작
  function startEdit(row) {
    setEditingId(row.id)
    setEditDraft({ account_code: row.account_code, amount: row.amount, tax_amount: row.tax_amount })
  }

  // 수정 저장
  async function handleSaveEdit(id) {
    setSaving(true)
    try {
      const updated = await updateTransaction(id, editDraft)
      setItems(prev => prev.map(item =>
        item.id === id
          ? { ...item, ...updated, total_amount: updated.total_amount }
          : item
      ))
      setEditingId(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // 최종 확정
  async function handleConfirm(id) {
    setConfirmingIds(prev => new Set(prev).add(id))
    try {
      await confirmTransaction(id)
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, status: 'confirmed' } : item
      ))
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirmingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  // 엑셀 다운로드
  async function handleExcelDownload() {
    setExporting(true)
    try {
      await exportConfirmedExcel()
    } catch (e) {
      setError(e.message)
    } finally {
      setExporting(false)
    }
  }

  function resetFilters() {
    setAccountFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
  }

  const totalPages = Math.ceil(total / LIMIT)
  const sumAmount  = items.reduce((s, r) => s + (r.total_amount ?? 0), 0)

  return (
    <div>
      {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">계정과목</label>
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value === '전체' ? '' : e.target.value)}
            className="text-sm rounded-lg border border-gray-200 bg-white text-gray-900
              px-3 py-2 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {ACCOUNT_FILTER_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">상태</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 bg-white text-gray-900
              px-3 py-2 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">시작일</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 bg-white text-gray-900
              px-3 py-2 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">종료일</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 bg-white text-gray-900
              px-3 py-2 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
        <button
          onClick={resetFilters}
          className="min-h-[36px] px-4 py-2 rounded-lg border border-gray-200 text-sm
            text-gray-500 hover:bg-gray-100 transition-colors"
        >
          초기화
        </button>
      </div>

      <ErrorBanner message={error} />

      {loading && (
        <div className="flex justify-center py-16"><Spinner size={6} /></div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">저장된 전표 데이터가 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">OCR 분석 후 "DB에 추가" 버튼으로 저장할 수 있습니다.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {/* 테이블 요약 + 수기등록 + 엑셀 다운로드 */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold text-gray-900">
              전체 {total.toLocaleString()}건
              <span className="ml-2 text-xs font-normal text-gray-400">
                (현재 페이지 합계 {sumAmount.toLocaleString()}원)
              </span>
            </span>
            <div className="flex items-center gap-2">
              {/* 수기 등록 */}
              <button
                onClick={onManualEntry}
                className="min-h-[32px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                  border-gray-300 text-gray-600 bg-white hover:bg-gray-50
                  text-xs font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수기 등록
              </button>
              {/* 엑셀 다운로드 — 확정 건만 */}
              <button
                onClick={handleExcelDownload}
                disabled={exporting}
                className="min-h-[32px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                  border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100
                  text-xs font-medium transition-colors disabled:opacity-60"
              >
                {exporting ? <Spinner /> : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                엑셀 (확정만)
              </button>
              <button
                onClick={() => fetchData(page)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline min-h-[32px]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-center px-3 py-2.5 font-medium w-10">이미지</th>
                  <th className="text-left px-4 py-2.5 font-medium">날짜</th>
                  <th className="text-left px-4 py-2.5 font-medium">거래처</th>
                  <th className="text-left px-4 py-2.5 font-medium">항목</th>
                  <th className="text-right px-4 py-2.5 font-medium">공급가액</th>
                  <th className="text-right px-4 py-2.5 font-medium">부가세</th>
                  <th className="text-right px-4 py-2.5 font-medium">합계</th>
                  <th className="text-left px-4 py-2.5 font-medium">계정과목</th>
                  <th className="text-center px-4 py-2.5 font-medium">신뢰도</th>
                  <th className="text-center px-4 py-2.5 font-medium">상태</th>
                  <th className="text-center px-4 py-2.5 font-medium">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(row => {
                  const isEditing    = editingId === row.id
                  const isConfirming = confirmingIds.has(row.id)
                  const imgUrl       = getImageUrl(row.image_path)

                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {/* 이미지 썸네일 */}
                      <td className="px-3 py-2 text-center">
                        {imgUrl ? (
                          <button
                            onClick={() => setModalImage(imgUrl)}
                            className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200
                              hover:border-blue-400 transition-colors block mx-auto"
                          >
                            <img src={imgUrl} alt="영수증" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center mx-auto">
                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                            </svg>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-600 tabular-nums whitespace-nowrap">
                        {row.receipt_date}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-[90px] truncate">
                        {row.vendor || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{row.item}</td>

                      {/* 금액 — 수정 모드에서는 input */}
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editDraft.amount}
                            onChange={e => setEditDraft(d => ({ ...d, amount: Number(e.target.value) }))}
                            className="w-24 text-right text-xs rounded border border-blue-300 px-2 py-1
                              focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        ) : `${row.amount.toLocaleString()}원`}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editDraft.tax_amount}
                            onChange={e => setEditDraft(d => ({ ...d, tax_amount: Number(e.target.value) }))}
                            className="w-20 text-right text-xs rounded border border-blue-300 px-2 py-1
                              focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        ) : `${(row.tax_amount ?? 0).toLocaleString()}원`}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                        {isEditing
                          ? `${(editDraft.amount + editDraft.tax_amount).toLocaleString()}원`
                          : `${(row.total_amount ?? row.amount).toLocaleString()}원`}
                      </td>

                      {/* 계정과목 — 수정 모드에서는 select */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editDraft.account_code}
                            onChange={e => setEditDraft(d => ({ ...d, account_code: e.target.value }))}
                            className="text-xs rounded-lg border border-blue-300 bg-white text-gray-900
                              px-2 py-1.5 min-h-[32px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                          >
                            {ACCOUNT_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                            {row.account_code}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {row.confidence != null
                          ? <ConfidenceBadge value={row.confidence} />
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={row.status} />
                      </td>

                      {/* 작업 버튼 */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-center">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(row.id)}
                                disabled={saving}
                                className="min-h-[30px] px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700
                                  text-white text-xs font-medium disabled:opacity-60 transition-colors"
                              >
                                {saving ? <Spinner /> : '저장'}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="min-h-[30px] px-3 py-1 rounded-lg border border-gray-200
                                  text-gray-500 text-xs hover:bg-gray-100 transition-colors"
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <>
                              {/* 수정 버튼 — 확정 전에만 표시 */}
                              {row.status !== 'confirmed' && (
                                <button
                                  onClick={() => startEdit(row)}
                                  className="min-h-[30px] px-3 py-1 rounded-lg border border-gray-200
                                    text-gray-600 text-xs hover:bg-gray-100 transition-colors"
                                >
                                  수정
                                </button>
                              )}
                              {/* 최종 확정 버튼 */}
                              {row.status !== 'confirmed' && (
                                <button
                                  onClick={() => handleConfirm(row.id)}
                                  disabled={isConfirming}
                                  className="min-h-[30px] px-3 py-1 rounded-lg bg-emerald-600
                                    hover:bg-emerald-700 text-white text-xs font-medium
                                    disabled:opacity-60 transition-colors whitespace-nowrap"
                                >
                                  {isConfirming ? <Spinner /> : '최종 확정'}
                                </button>
                              )}
                              {row.status === 'confirmed' && (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">{page + 1} / {totalPages} 페이지</span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchData(page - 1)}
                  disabled={page === 0}
                  className="min-h-[32px] px-3 py-1 rounded-lg border border-gray-200 text-xs
                    text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  이전
                </button>
                <button
                  onClick={() => fetchData(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="min-h-[32px] px-3 py-1 rounded-lg border border-gray-200 text-xs
                    text-gray-600 disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────

const TABS = [
  { id: 'ocr',    label: 'OCR 분석' },
  { id: 'ledger', label: '전표 내역' },
]

export default function AccountantPage() {
  const [activeTab, setActiveTab]         = useState('ocr')
  const [showManualModal, setShowManualModal] = useState(false)
  const [session]                         = useState(() => getAuthSession())

  const dept     = session?.employee?.department || ''
  const empName  = session?.employee?.name       || ''

  function handleManualSaved() {
    // 수기 등록 후 전표 내역 탭으로 이동하고 목록 새로고침
    setActiveTab('ledger')
  }

  return (
    <div>
      {showManualModal && (
        <ManualEntryModal
          session={session}
          onClose={() => setShowManualModal(false)}
          onSaved={handleManualSaved}
        />
      )}

      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '재무/회계팀', to: '/backoffice/finance' },
          { label: '경리/회계' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600 text-white text-xs font-bold shrink-0">
              경리
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Back-Office · 재무/회계팀
              </span>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                영수증 OCR · 전표 자동 분류
              </h1>
            </div>
          </div>
          {/* 로그인 세션 정보 */}
          {(empName || dept) && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{empName && `${empName} · `}{dept}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          영수증을 업로드하면 AI가 계정과목을 분류합니다. 검토 후 최종 확정하세요.
          {dept && <span className="ml-1 text-blue-600 font-medium">({dept} 전표만 표시)</span>}
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
        {/* 수기 등록 — 탭 우측 */}
        <div className="ml-auto pb-px flex items-end">
          <button
            onClick={() => setShowManualModal(true)}
            className="min-h-[36px] flex items-center gap-1.5 px-4 py-1.5 rounded-lg
              bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            수기 등록
          </button>
        </div>
      </div>

      {activeTab === 'ocr'    && <OcrTab session={session} />}
      {activeTab === 'ledger' && (
        <LedgerTab
          session={session}
          onManualEntry={() => setShowManualModal(true)}
        />
      )}
    </div>
  )
}
