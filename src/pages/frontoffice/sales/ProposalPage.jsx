// 영업 제안서 자동 생성 페이지 — 업종별 구조 프리셋 + 성공 사례 벡터 RAG
import { useEffect, useState } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import {
  deleteProposalDocument,
  generateProposal,
  listProposalDocuments,
  uploadProposalDocument,
} from '../../../api/sales'
import { getAuthSession } from '../../../api/auth'

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

function CopyBtn({ text, label = '복사', className = '' }) {
  const [copied, setCopied] = useState(false)
  function handle() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handle} className={`text-xs min-h-[28px] px-2 rounded transition-colors ${className}`}>
      {copied ? '복사됨' : label}
    </button>
  )
}

const INDUSTRY_OPTIONS = [
  {
    value: '제조업',
    desc: '생산 효율화 · 불량률 감소 · 예지 정비 · SCM 최적화',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
  },
  {
    value: '유통·서비스',
    desc: '고객 이탈 방지 · 재구매율 향상 · 수요 예측 · 개인화 추천',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />,
  },
  {
    value: 'IT',
    desc: '코드 품질 자동화 · 장애 예측 · 고객 지원 자동화 · 데이터 파이프라인',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  },
]

const RESULT_TABS = [
  { id: 'proposal', label: '제안서 전문' },
  { id: 'benefits', label: '기대 효과' },
  { id: 'schedule', label: '구축 일정' },
  { id: 'email',    label: '이메일 초안' },
]

export default function ProposalPage() {
  const [companyName, setCompanyName] = useState('')
  const [industry,    setIndustry]    = useState('IT')
  const [companySize, setCompanySize] = useState('')
  const [keyNeeds,    setKeyNeeds]    = useState('')

  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [result,    setResult]    = useState(null)
  const [activeTab, setActiveTab] = useState('proposal')

  // 성공 사례 문서 RAG 관리 상태
  const [docs,         setDocs]         = useState([])
  const [docsLoading,  setDocsLoading]  = useState(false)
  const [docError,     setDocError]     = useState(null)
  const [uploading,    setUploading]    = useState(false)
  const [showDocPanel, setShowDocPanel] = useState(false)

  // 현재 선택된 업종의 문서만 불러오기
  async function refreshDocs(targetIndustry = industry) {
    setDocsLoading(true)
    setDocError(null)
    try {
      const data = await listProposalDocuments(targetIndustry)
      setDocs(data.items || [])
    } catch (e) {
      setDocError(e.message)
    } finally {
      setDocsLoading(false)
    }
  }

  useEffect(() => {
    refreshDocs(industry)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setDocError(null)
    try {
      const session = getAuthSession()
      await uploadProposalDocument({
        file,
        industry,
        uploader: {
          employee_id: session?.employee_id,
          name:        session?.name,
          department:  session?.department,
        },
      })
      await refreshDocs(industry)
    } catch (err) {
      setDocError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteDoc(documentId, fileName) {
    if (!window.confirm(`"${fileName}" 문서를 삭제할까요?`)) return
    setDocError(null)
    try {
      await deleteProposalDocument(documentId)
      await refreshDocs(industry)
    } catch (err) {
      setDocError(err.message)
    }
  }

  async function handleGenerate() {
    if (!companyName.trim() || !keyNeeds.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await generateProposal({
        company_name: companyName,
        industry,
        company_size: companySize,
        key_needs:    keyNeeds,
      })
      setResult(data)
      setActiveTab('proposal')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: '영업/영업관리팀', to: '/frontoffice/sales' },
          { label: '영업 제안서 생성' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office · 영업/영업관리팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              영업 제안서 생성
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          고객사 정보와 핵심 니즈를 입력하면 업로드된 성공 사례 문서를 벡터 검색하여 맞춤형 제안서 초안을 자동 생성합니다.
        </p>
      </div>

      {/* 성공 사례 문서 RAG 관리 패널 */}
      <div className="mb-5 rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowDocPanel(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 min-h-[44px] text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
            </svg>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              성공 사례 문서 관리
            </span>
            <span className="text-xs text-gray-400">
              ({industry} · {docs.length}건)
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showDocPanel ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDocPanel && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              현재 선택된 업종({industry})의 성공 사례를 업로드하세요. 업로드된 문서는 청크 단위로 임베딩되어
              제안서 생성 시 벡터 유사도 기반으로 참조됩니다. (pdf, docx, hwp, txt)
            </p>

            <label className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-semibold cursor-pointer transition-colors">
              {uploading ? <><Spinner />업로드 중...</> : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  성공 사례 업로드
                </>
              )}
              <input
                type="file"
                accept=".pdf,.docx,.hwp,.txt"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>

            {docError && (
              <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-2">
                <p className="text-xs text-red-700 dark:text-red-300">{docError}</p>
              </div>
            )}

            {/* 문서 목록 */}
            <div className="mt-4">
              {docsLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
                  <Spinner />목록 불러오는 중...
                </div>
              ) : docs.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">
                  업로드된 {industry} 성공 사례가 없습니다.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {docs.map(doc => (
                    <li
                      key={doc.document_id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          청크 {doc.chunk_count}개 · {doc.text_length.toLocaleString()}자
                          {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ''}
                          {doc.uploaded_at ? ` · ${doc.uploaded_at}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.document_id, doc.file_name)}
                        className="min-h-[44px] px-3 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">고객사 정보 입력</h3>

        {/* 업종 선택 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            업종 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {INDUSTRY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setIndustry(opt.value)}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  industry === opt.value
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <svg className={`w-4 h-4 shrink-0 ${industry === opt.value ? 'text-amber-500' : 'text-gray-400'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {opt.icon}
                  </svg>
                  <span className={`text-sm font-semibold ${industry === opt.value ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {opt.value}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 고객사명 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              고객사명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="예) (주)한국전자"
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 규모 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              규모
            </label>
            <input
              type="text"
              value={companySize}
              onChange={e => setCompanySize(e.target.value)}
              placeholder="예) 중소기업, 임직원 350명, 연매출 500억"
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 핵심 니즈 */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              핵심 니즈 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={keyNeeds}
              onChange={e => setKeyNeeds(e.target.value)}
              rows={4}
              placeholder="예) 생산라인 품질 검사 자동화, 설비 예지 정비 시스템 구축, 불량률 2% 이하 달성 목표. 현재 수작업 검사로 인한 인력 비용과 납기 지연이 주요 문제."
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={!companyName.trim() || !keyNeeds.trim() || loading}
        className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
          disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-semibold transition-colors mb-6
          flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />제안서 생성 중...</> : '제안서 자동 생성'}
      </button>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!result && !loading && !error && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-400">고객사 정보를 입력하면<br />맞춤형 제안서 초안이 여기에 표시됩니다.</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-sm text-gray-400">성공 사례를 참고하여 맞춤형 제안서를 작성하는 중...</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="flex flex-col gap-5">
          {/* 참조 문서 (RAG sources) */}
          {result.sources?.length > 0 && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">참조 성공 사례 문서</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {result.sources.join(' · ')}
              </p>
            </div>
          )}

          {/* 경영진 요약 */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">경영진 요약 (Executive Summary)</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{result.executive_summary}</p>
              </div>
              <CopyBtn
                text={result.executive_summary}
                className="text-amber-600 dark:text-amber-400 hover:underline shrink-0"
              />
            </div>
          </div>

          {/* 탭 */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto">
              {RESULT_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-gray-900'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* 제안서 전문 */}
              {activeTab === 'proposal' && (
                <div className="flex flex-col gap-5">
                  {/* 현황 분석 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">현황 분석</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-4">{result.situation_analysis}</p>
                  </div>

                  {/* Pain Points */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">주요 Pain Points</p>
                    <ul className="flex flex-col gap-2">
                      {result.pain_points?.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                          <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 솔루션 제안 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">AI Hub 솔루션 제안</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-4">{result.solution}</p>
                  </div>

                  {/* 성공 사례 */}
                  {result.success_case && (
                    <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">유사 고객사 성공 사례</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{result.success_case.company}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        <span className="font-medium">문제: </span>{result.success_case.issue}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        <span className="font-medium">솔루션: </span>{result.success_case.solution}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                        성과: {result.success_case.result}
                      </p>
                    </div>
                  )}

                  {/* 투자 비용 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">투자 비용</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-4">{result.investment}</p>
                  </div>
                </div>
              )}

              {/* 기대 효과 */}
              {activeTab === 'benefits' && (
                <div className="flex flex-col gap-3">
                  {result.expected_benefits?.map((b, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{b.metric}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 text-center bg-red-50 dark:bg-red-950/20 rounded-lg py-3">
                          <p className="text-xs text-gray-400 mb-1">도입 전</p>
                          <p className="text-sm font-bold text-red-600 dark:text-red-400 leading-snug">{b.before}</p>
                        </div>
                        <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <div className="flex-1 text-center bg-green-50 dark:bg-green-950/20 rounded-lg py-3">
                          <p className="text-xs text-gray-400 mb-1">도입 후</p>
                          <p className="text-sm font-bold text-green-600 dark:text-green-400 leading-snug">{b.after}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 구축 일정 */}
              {activeTab === 'schedule' && (
                <div className="flex flex-col gap-3">
                  {result.implementation_schedule?.map((s, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800 dark:text-white">{s.phase}</span>
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{s.duration}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{s.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 이메일 초안 */}
              {activeTab === 'email' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">영업 담당자 발송용 이메일</span>
                    <CopyBtn
                      text={result.email_draft}
                      label="전체 복사"
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    />
                  </div>
                  <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    {result.email_draft}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
