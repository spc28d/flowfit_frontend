// 고객 미팅 요약 페이지 — 메모/녹취 텍스트 → 구조화 요약 + CRM 초안
import { useEffect, useState } from 'react'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import {
  listCrmOpportunities,
  saveCrmOpportunity,
  summarizeMeeting,
  transcribeMeetingAudio,
} from '../../../api/sales'
import { getAuthSession } from '../../../api/auth'

// Whisper API 제한 기준
const AUDIO_MAX_MB = 25
const AUDIO_EXTS = ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'mpeg', 'mpga']

const STAGE_OPTIONS = ['리드 발굴', '니즈 분석', '제안서 발송', '협상 중', '계약 완료']

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

const STAGE_COLOR = {
  '리드 발굴':   'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  '니즈 분석':   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  '제안서 발송': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  '협상 중':     'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  '계약 완료':   'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
}

const RESULT_TABS = [
  { id: 'summary', label: '미팅 요약' },
  { id: 'actions', label: '액션아이템' },
  { id: 'crm',     label: 'CRM 초안' },
]

export default function MeetingPage() {
  const [companyName,   setCompanyName]   = useState('')
  const [meetingDate,   setMeetingDate]   = useState('')
  const [meetingNotes,  setMeetingNotes]  = useState('')

  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [result,    setResult]    = useState(null)
  const [activeTab, setActiveTab] = useState('summary')

  // STT 상태
  const [sttLoading, setSttLoading] = useState(false)
  const [sttError,   setSttError]   = useState(null)
  const [audioName,  setAudioName]  = useState('')

  // CRM 편집/저장 상태
  const [crmForm,        setCrmForm]        = useState(null)
  const [crmSaving,      setCrmSaving]      = useState(false)
  const [crmError,       setCrmError]       = useState(null)
  const [crmSavedId,     setCrmSavedId]     = useState(null)

  // CRM 목록 상태 (A+B안: 스코프 토글 + 검색 + 페이지네이션)
  const [crmRecentItems, setCrmRecentItems] = useState([])
  const [crmTotal,       setCrmTotal]       = useState(0)
  const [crmListError,   setCrmListError]   = useState(null)
  const [crmListLoading, setCrmListLoading] = useState(false)
  // 로그인 상태면 '내 저장'이 기본, 비로그인 시엔 '팀 전체'로 자동 전환
  const [crmScope,       setCrmScope]       = useState(
    () => (getAuthSession()?.employee?.employee_id ? 'mine' : 'team')
  ) // 'mine' | 'team'
  const [crmSearchInput, setCrmSearchInput] = useState('')     // 입력 중 값
  const [crmSearch,      setCrmSearch]      = useState('')     // 확정된 검색어
  const [crmLimit,       setCrmLimit]       = useState(10)

  // 현재 로그인한 사원 정보 (세션 기반)
  const authSession = getAuthSession()
  const currentEmployeeId   = authSession?.employee?.employee_id || ''
  const currentEmployeeName = authSession?.employee?.name || ''

  // 미팅 요약 결과가 바뀌면 CRM 폼을 초안으로 초기화
  useEffect(() => {
    if (result?.crm_draft) {
      setCrmForm({
        opportunity_name: result.crm_draft.opportunity_name || '',
        stage:            STAGE_OPTIONS.includes(result.crm_draft.stage)
          ? result.crm_draft.stage
          : '니즈 분석',
        next_step:        result.crm_draft.next_step || '',
        contact_role:     result.crm_draft.contact_role || '',
        description:      result.crm_draft.description || '',
      })
      setCrmSavedId(null)
      setCrmError(null)
    } else {
      setCrmForm(null)
    }
  }, [result])

  // 스코프/검색어/limit 변경 시 자동 재조회
  useEffect(() => {
    refreshCrmList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmScope, crmSearch, crmLimit])

  async function refreshCrmList() {
    setCrmListLoading(true)
    try {
      const data = await listCrmOpportunities({
        ownerId: crmScope === 'mine' ? currentEmployeeId : '',
        search:  crmSearch,
        offset:  0,
        limit:   crmLimit,
      })
      setCrmRecentItems(data.items || [])
      setCrmTotal(data.total || 0)
      setCrmListError(null)
    } catch (e) {
      setCrmListError(e.message)
    } finally {
      setCrmListLoading(false)
    }
  }

  async function handleCrmSave() {
    if (!crmForm) return
    if (!crmForm.opportunity_name.trim()) {
      setCrmError('영업 기회명을 입력해 주세요.')
      return
    }
    setCrmSaving(true)
    setCrmError(null)
    try {
      const saved = await saveCrmOpportunity({
        company_name:     companyName,
        meeting_date:     meetingDate,
        opportunity_name: crmForm.opportunity_name,
        stage:            crmForm.stage,
        next_step:        crmForm.next_step,
        contact_role:     crmForm.contact_role,
        description:      crmForm.description,
        owner_id:         currentEmployeeId,
        owner_name:       currentEmployeeName,
      })
      setCrmSavedId(saved.id)
      refreshCrmList()
    } catch (e) {
      setCrmError(e.message)
    } finally {
      setCrmSaving(false)
    }
  }

  async function handleAudioUpload(e) {
    const file = e.target.files?.[0]
    // 같은 파일을 다시 선택할 수 있도록 input 초기화
    e.target.value = ''
    if (!file) return

    // 확장자 검증
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !AUDIO_EXTS.includes(ext)) {
      setSttError(`지원하지 않는 파일 형식입니다. (${AUDIO_EXTS.join(', ')})`)
      return
    }
    // 크기 검증
    if (file.size > AUDIO_MAX_MB * 1024 * 1024) {
      setSttError(`파일 크기는 최대 ${AUDIO_MAX_MB}MB까지 가능합니다.`)
      return
    }

    setSttLoading(true)
    setSttError(null)
    setAudioName(file.name)
    try {
      const data = await transcribeMeetingAudio(file)
      // 기존 메모에 이어붙이기 (빈 경우 바로 채움)
      setMeetingNotes(prev => (prev.trim() ? `${prev}\n\n${data.text}` : data.text))
    } catch (err) {
      setSttError(err.message)
      setAudioName('')
    } finally {
      setSttLoading(false)
    }
  }

  async function handleSummarize() {
    if (!companyName.trim() || !meetingNotes.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await summarizeMeeting({
        company_name:  companyName,
        meeting_date:  meetingDate,
        meeting_notes: meetingNotes,
      })
      setResult(data)
      setActiveTab('summary')
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
          { label: '고객 미팅 요약' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office · 영업/영업관리팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              고객 미팅 요약
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          미팅 내용이나 메모를 붙여 넣으면 핵심 논의·액션아이템·CRM 입력 초안을 자동 생성합니다. 정리 시간을 1시간에서 5분으로 단축합니다.
        </p>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">미팅 정보 입력</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

          {/* 미팅 날짜 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              미팅 날짜
            </label>
            <input
              type="date"
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* 녹취 파일 업로드 (선택) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            녹취 파일 업로드 <span className="text-gray-400">(선택 · Whisper 자동 변환)</span>
          </label>
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label
                htmlFor="meeting-audio-upload"
                className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  sttLoading
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                {sttLoading ? (
                  <><Spinner />변환 중...</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V6a3 3 0 016 0v5a3 3 0 01-3 3z" />
                    </svg>
                    파일 선택
                  </>
                )}
              </label>
              <input
                id="meeting-audio-upload"
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.mp4"
                onChange={handleAudioUpload}
                disabled={sttLoading}
                className="hidden"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 flex-1 min-w-0">
                {audioName ? (
                  <span className="truncate block" title={audioName}>
                    {sttLoading ? '변환 중: ' : '변환 완료: '}<span className="font-medium text-gray-700 dark:text-gray-200">{audioName}</span>
                  </span>
                ) : (
                  <>mp3 · m4a · wav · webm · ogg · mp4 지원 · 최대 {AUDIO_MAX_MB}MB</>
                )}
              </p>
            </div>
            {sttError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">{sttError}</p>
            )}
          </div>
        </div>

        {/* 미팅 내용 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            미팅 내용 / 메모 <span className="text-red-500">*</span>
            <span className="text-gray-400 ml-1">(녹취 변환 결과 자동 채움)</span>
          </label>
          <textarea
            value={meetingNotes}
            onChange={e => setMeetingNotes(e.target.value)}
            rows={8}
            placeholder={`예) 오늘 한국전자 구매팀장 박부장과 미팅을 진행했습니다.

주요 내용:
- 현재 생산라인 QC 검사 인력 20명 운영 중, 비용 부담 큼
- 불량률 2.8%로 업계 평균 1.5% 대비 높은 수준
- AI 비전 검사 도입에 관심 있으나 ROI 검증 필요
- 6월 이사회에서 IT 투자 예산 심의 예정, 5월까지 제안서 필요

고객 우려사항:
- 기존 설비와의 호환성 문제
- 도입 기간 중 생산 라인 중단 최소화 요청

다음 스텝:
- 당사: 유사 제조사 레퍼런스 자료 1주일 내 발송
- 박부장: 공장 방문 일정 조율 (4/21 예정)`}
            className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={handleSummarize}
        disabled={!companyName.trim() || !meetingNotes.trim() || loading}
        className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
          disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-semibold transition-colors mb-6
          flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner />요약 생성 중...</> : '미팅 요약 자동 생성'}
      </button>

      <ErrorBanner message={error} />

      {/* 빈 상태 */}
      {!result && !loading && !error && (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm text-gray-400">미팅 내용을 입력하면<br />구조화된 요약본이 여기에 표시됩니다.</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-sm text-gray-400">미팅 내용을 분석하여 구조화하는 중...</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="flex flex-col gap-5">
          {/* 미팅 제목 + 단계 */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">미팅 제목</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.meeting_title}</p>
              </div>
              {result.crm_draft?.stage && (
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STAGE_COLOR[result.crm_draft.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                  {result.crm_draft.stage}
                </span>
              )}
            </div>
          </div>

          {/* 탭 */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {RESULT_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
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
              {/* 미팅 요약 */}
              {activeTab === 'summary' && (
                <div className="flex flex-col gap-5">
                  {/* 핵심 논의 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">핵심 논의사항</p>
                    <ul className="flex flex-col gap-2">
                      {result.key_discussions?.map((d, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 고객 니즈 */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">고객 니즈</p>
                    <ul className="flex flex-col gap-2">
                      {result.customer_needs?.map((n, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 우려사항 */}
                  {result.concerns?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">우려사항</p>
                      <ul className="flex flex-col gap-2">
                        {result.concerns.map((c, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300 bg-orange-50 dark:bg-orange-950/20 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 다음 의제 */}
                  {result.next_agenda?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">다음 미팅 의제</p>
                      <ul className="flex flex-col gap-2">
                        {result.next_agenda.map((a, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded shrink-0">{i + 1}</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 액션아이템 */}
              {activeTab === 'actions' && (
                <div className="flex flex-col gap-3">
                  {result.action_items?.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">추출된 액션아이템이 없습니다.</p>
                  ) : (
                    result.action_items?.map((item, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800 dark:text-white">{item.action}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400">담당: <span className="font-medium text-gray-700 dark:text-gray-300">{item.owner}</span></span>
                            {item.due && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">기한: <span className="font-medium text-amber-600 dark:text-amber-400">{item.due}</span></span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* CRM 초안 — 편집 가능 + 원클릭 반영 */}
              {activeTab === 'crm' && crmForm && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      CRM 입력 초안 <span className="text-gray-400 normal-case">· 검토 후 원클릭 반영</span>
                    </span>
                    <CopyBtn
                      text={`영업 기회명: ${crmForm.opportunity_name}\n단계: ${crmForm.stage}\n다음 단계: ${crmForm.next_step}\n담당자 역할: ${crmForm.contact_role}\n\n${crmForm.description}`}
                      label="전체 복사"
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    />
                  </div>

                  {/* 영업 기회명 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">영업 기회명</label>
                    <input
                      type="text"
                      value={crmForm.opportunity_name}
                      onChange={e => setCrmForm({ ...crmForm, opportunity_name: e.target.value })}
                      className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* 단계 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">현재 단계</label>
                    <div className="flex flex-wrap gap-2">
                      {STAGE_OPTIONS.map(stage => (
                        <button
                          key={stage}
                          onClick={() => setCrmForm({ ...crmForm, stage })}
                          className={`min-h-[36px] px-3 rounded-full text-xs font-medium border transition-colors ${
                            crmForm.stage === stage
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400'
                          }`}
                        >
                          {stage}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 다음 단계 / 담당자 역할 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">다음 단계</label>
                      <input
                        type="text"
                        value={crmForm.next_step}
                        onChange={e => setCrmForm({ ...crmForm, next_step: e.target.value })}
                        className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">담당자 역할</label>
                      <input
                        type="text"
                        value={crmForm.contact_role}
                        onChange={e => setCrmForm({ ...crmForm, contact_role: e.target.value })}
                        placeholder="예) 구매팀장"
                        className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">미팅 요약 (설명란)</label>
                    <textarea
                      value={crmForm.description}
                      onChange={e => setCrmForm({ ...crmForm, description: e.target.value })}
                      rows={4}
                      className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* 저장 버튼 / 결과 피드백 */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleCrmSave}
                      disabled={crmSaving || !crmForm.opportunity_name.trim()}
                      className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
                        disabled:bg-gray-300 dark:disabled:bg-gray-700
                        text-white text-sm font-semibold transition-colors
                        flex items-center justify-center gap-2"
                    >
                      {crmSaving ? (
                        <><Spinner />CRM 반영 중...</>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          CRM에 원클릭 반영
                        </>
                      )}
                    </button>
                    {crmError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{crmError}</p>
                    )}
                    {crmSavedId && !crmError && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        ✓ CRM에 반영되었습니다 (ID: {crmSavedId})
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRM 반영 내역 (mock) — 내 저장 / 팀 전체 · 검색 · 더 보기 */}
      <div className="mt-8 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">CRM 반영 내역</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">mock CRM 저장소에 원클릭 반영된 영업 기회</p>
            </div>
            <button
              onClick={refreshCrmList}
              disabled={crmListLoading}
              className="text-xs min-h-[32px] px-3 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
            >
              {crmListLoading ? '불러오는 중…' : '새로고침'}
            </button>
          </div>

          {/* 스코프 토글 + 검색 */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {/* 스코프 세그먼트 */}
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
              <button
                onClick={() => setCrmScope('mine')}
                disabled={!currentEmployeeId}
                title={!currentEmployeeId ? '로그인 후 사용할 수 있습니다.' : ''}
                className={`text-xs min-h-[32px] px-3 font-medium transition-colors ${
                  crmScope === 'mine'
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                내 저장
              </button>
              <button
                onClick={() => setCrmScope('team')}
                className={`text-xs min-h-[32px] px-3 font-medium transition-colors border-l border-gray-200 dark:border-gray-600 ${
                  crmScope === 'team'
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                팀 전체
              </button>
            </div>

            {/* 검색창 */}
            <form
              onSubmit={e => { e.preventDefault(); setCrmSearch(crmSearchInput.trim()) }}
              className="flex items-center gap-2 flex-1 min-w-[180px]"
            >
              <input
                type="text"
                value={crmSearchInput}
                onChange={e => setCrmSearchInput(e.target.value)}
                placeholder="고객사·영업 기회명·설명 검색"
                className="flex-1 min-w-0 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 min-h-[32px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="text-xs min-h-[32px] px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold"
              >
                검색
              </button>
              {crmSearch && (
                <button
                  type="button"
                  onClick={() => { setCrmSearchInput(''); setCrmSearch('') }}
                  className="text-xs min-h-[32px] px-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              )}
            </form>
          </div>

          {/* 요약 라인 */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {crmScope === 'mine'
              ? (currentEmployeeId
                  ? <>내 저장 · 총 <span className="font-semibold text-gray-700 dark:text-gray-200">{crmTotal}건</span></>
                  : '로그인 후 내 저장 내역을 확인할 수 있습니다.')
              : <>팀 전체 · 총 <span className="font-semibold text-gray-700 dark:text-gray-200">{crmTotal}건</span></>
            }
            {crmSearch && <> · 검색 "{crmSearch}"</>}
          </p>
        </div>

        <div className="p-5">
          {crmListError && (
            <p className="text-sm text-red-600 dark:text-red-400">{crmListError}</p>
          )}
          {!crmListError && !crmListLoading && crmRecentItems.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              {crmSearch ? '검색 조건에 해당하는 항목이 없습니다.' : '아직 저장된 영업 기회가 없습니다.'}
            </p>
          )}
          {crmRecentItems.length > 0 && (
            <ul className="flex flex-col gap-2">
              {crmRecentItems.map(item => {
                const isMine = item.owner_id && item.owner_id === currentEmployeeId
                return (
                  <li key={item.id} className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${
                    isMine
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10'
                      : 'border-gray-100 dark:border-gray-700'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">{item.opportunity_name}</span>
                        {item.stage && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLOR[item.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                            {item.stage}
                          </span>
                        )}
                        {isMine && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500 text-white">내 저장</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.company_name}
                        {item.meeting_date && <> · 미팅 {item.meeting_date}</>}
                        {item.owner_name && <> · 담당 {item.owner_name}</>}
                        {item.next_step && <> · 다음: {item.next_step}</>}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{item.created_at?.replace('T', ' ').slice(0, 16)}</span>
                  </li>
                )
              })}
            </ul>
          )}

          {/* 더 보기 */}
          {crmRecentItems.length > 0 && crmRecentItems.length < crmTotal && (
            <button
              onClick={() => setCrmLimit(l => l + 10)}
              className="mt-4 w-full min-h-[36px] text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              더 보기 ({crmRecentItems.length} / {crmTotal})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
