// VOC 자동 분석 리포트 페이지
import { useState } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { analyzeVoc, exportInquiriesCsv, downloadInquiriesCsv } from '../../../api/cs'

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

function SentimentBar({ positive, neutral, negative }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex rounded-full overflow-hidden h-3">
        <div className="bg-emerald-500 transition-all" style={{ width: `${positive}%` }} />
        <div className="bg-gray-300 dark:bg-gray-600 transition-all" style={{ width: `${neutral}%` }} />
        <div className="bg-red-400 transition-all" style={{ width: `${negative}%` }} />
      </div>
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />긍정 {positive}%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />중립 {neutral}%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />부정 {negative}%</span>
      </div>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function VocReportPage() {
  const [file,        setFile]        = useState(null)
  const [prevFile,    setPrevFile]    = useState(null)
  const [threshold,   setThreshold]   = useState(30)
  const [importing,   setImporting]   = useState(false)
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [report,      setReport]      = useState(null)
  // report = {
  //   period, total_count, prev_count,
  //   sentiment: { positive, neutral, negative },
  //   top_issues: [{ type, count, change_pct, cause }],
  //   summary: string  ← 팀장 보고용 3줄 요약
  // }

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const data = await analyzeVoc(file, prevFile, threshold)
      setReport(data)
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
      await exportInquiriesCsv({ dateFrom, dateTo })
    } catch (e) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  function handleCopySummary() {
    if (report?.summary) navigator.clipboard.writeText(report.summary)
  }

  const changeColor = pct =>
    pct > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: 'CS/고객지원팀', to: '/frontoffice/cs' },
          { label: 'VOC 자동 분석 리포트' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office · CS/고객지원팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              VOC 자동 분석 리포트
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          주간 문의 로그를 분석하여 감성 분포, 급증 이슈, 팀장 보고 초안을 자동 생성합니다.
        </p>
      </div>

      {/* 입력 설정 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">분석 설정</h3>

        {/* DB에서 가져오기 */}
        <div className="flex flex-wrap gap-2 items-end mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
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
            {importing ? <><Spinner />가져오는 중...</> : 'DB에서 로그 가져오기'}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 이번 주 로그 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              이번 주 문의 로그 <span className="text-red-500">*</span>
            </label>
            <label className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-amber-400 transition-colors">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {file ? file.name : 'CSV 선택'}
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {/* 이전 주 리포트 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              이전 주 로그 (증감 비교용, 선택)
            </label>
            <label className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-amber-400 transition-colors">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {prevFile ? prevFile.name : 'CSV 선택'}
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={e => setPrevFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {/* 이상 감지 임계값 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              이상 감지 임계값 (전주 대비 %)
            </label>
            <div className="flex items-center gap-2 min-h-[44px]">
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                min={5} max={200} step={5}
                className="flex-1 text-sm rounded-xl border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-sm text-gray-400 shrink-0">% 이상</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!file || loading}
        className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
          disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-semibold transition-colors mb-6
          flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />분석 중...</> : 'VOC 분석 시작'}
      </button>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!report && !loading && !error && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-gray-400">문의 로그를 업로드하고 분석을 시작하면<br />VOC 리포트가 여기에 표시됩니다.</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-sm text-gray-400">문의 로그를 분석하는 중...</p>
        </div>
      )}

      {/* 리포트 결과 */}
      {report && (
        <div className="flex flex-col gap-5">
          {/* 요약 지표 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '총 문의 건수', value: `${report.total_count?.toLocaleString()}건` },
              { label: '전주 대비',    value: report.prev_count ? `${((report.total_count - report.prev_count) / report.prev_count * 100).toFixed(1)}%` : '—' },
              { label: '부정 감성',   value: `${report.sentiment?.negative}%` },
              { label: '분석 기간',   value: report.period },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* 감성 분포 */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">고객 감성 분포</h3>
            <SentimentBar
              positive={report.sentiment?.positive ?? 0}
              neutral={report.sentiment?.neutral ?? 0}
              negative={report.sentiment?.negative ?? 0}
            />
          </div>

          {/* 급증 이슈 Top 3 */}
          {report.top_issues?.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <span className="text-sm font-semibold text-gray-800 dark:text-white">급증 이슈 Top {report.top_issues.length}</span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {report.top_issues.map((issue, i) => (
                  <div key={i} className="px-5 py-4 flex items-start gap-4">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{issue.type}</span>
                        <span className="text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                          {issue.count?.toLocaleString()}건
                        </span>
                        {issue.change_pct != null && (
                          <span className={`text-xs font-semibold tabular-nums ${changeColor(issue.change_pct)}`}>
                            {issue.change_pct > 0 ? '+' : ''}{issue.change_pct}%
                          </span>
                        )}
                      </div>
                      {issue.cause && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">AI 분석: {issue.cause}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 팀장 보고 초안 */}
          {report.summary && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-amber-100 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">팀장 보고용 요약 초안</span>
                <button
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline min-h-[32px] px-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  복사
                </button>
              </div>
              <pre className="px-5 py-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-white dark:bg-gray-900">
                {report.summary}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
