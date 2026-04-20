// 법무 챗봇 페이지 — 법률 문서 기반 RAG Q&A
import { useEffect, useMemo, useRef, useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import Breadcrumb from '../../../components/layout/Breadcrumb'
import { getAuthSession } from '../../../api/auth'
import {
  askLegalQuestion,
  deleteLegalDocument,
  getLegalDocuments,
  uploadLegalDocument,
} from '../../../api/legal'

// 법무 전용 추천 질문
const SUGGESTIONS = [
  '이 계약서에 자동 연장 조항이 있나요?',
  '손해배상 한도는 어떻게 설정되어 있나요?',
  '계약 해지 조건이 무엇인가요?',
]

// 타이핑 인디케이터 (점 3개)
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

export default function LegalChatPage() {
  // ── 문서 상태 ──────────────────────────────────────────────
  const [documents, setDocuments] = useState([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [documentsError, setDocumentsError] = useState('')
  const [documentsExpanded, setDocumentsExpanded] = useState(false)
  const [documentSort, setDocumentSort] = useState('latest')

  // ── 업로드 상태 ────────────────────────────────────────────
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  // ── 채팅 상태 ──────────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const bottomRef = useRef(null)

  // ── 세션 ───────────────────────────────────────────────────
  const [session, setSession] = useState(() => getAuthSession())

  useEffect(() => {
    function syncSession() { setSession(getAuthSession()) }
    window.addEventListener('auth-session-changed', syncSession)
    return () => window.removeEventListener('auth-session-changed', syncSession)
  }, [])

  // ── 문서 목록 로드 ─────────────────────────────────────────
  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    setDocumentsLoading(true)
    setDocumentsError('')
    try {
      const data = await getLegalDocuments()
      setDocuments(data.items || [])
    } catch (err) {
      setDocumentsError(err.message || '문서 목록을 불러오지 못했습니다.')
    } finally {
      setDocumentsLoading(false)
    }
  }

  // ── 스크롤 하단 고정 ────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isReady = documents.length > 0
  const isLoggedIn = Boolean(session?.employee?.employee_id)

  // ── 문서 정렬 ──────────────────────────────────────────────
  const sortedDocuments = useMemo(() => {
    const next = [...documents]
    if (documentSort === 'name') {
      return next.sort((a, b) =>
        String(a.file_name || '').localeCompare(String(b.file_name || ''), 'ko'),
      )
    }
    if (documentSort === 'name-desc') {
      return next.sort((a, b) =>
        String(b.file_name || '').localeCompare(String(a.file_name || ''), 'ko'),
      )
    }
    return next.sort((a, b) =>
      String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || '')),
    )
  }, [documentSort, documents])

  const helperText = useMemo(() => {
    if (documentsLoading) return '문서 목록을 확인하는 중입니다.'
    if (!isLoggedIn) return '로그인한 사용자만 챗봇을 이용할 수 있습니다.'
    if (!isReady) return '법률 문서(hwp, docx, pdf)를 업로드해 주세요.'
    return `${documents.length}개 문서를 기준으로 답변합니다.`
  }, [documents.length, documentsLoading, isLoggedIn, isReady])

  // ── 파일 업로드 ────────────────────────────────────────────
  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    setUploadError('')

    const formData = new FormData()
    formData.append('file', file)
    if (session?.employee?.employee_id) {
      formData.append('employee_id', session.employee.employee_id)
    }
    if (session?.employee?.name) {
      formData.append('uploader_name', session.employee.name)
    }
    if (session?.employee?.department) {
      formData.append('uploader_department', session.employee.department)
    }

    try {
      await uploadLegalDocument(formData)
      await fetchDocuments()
    } catch (err) {
      setUploadError(err.message || '문서 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  // ── 문서 삭제 ──────────────────────────────────────────────
  async function handleDelete(documentId) {
    try {
      await deleteLegalDocument(documentId)
      await fetchDocuments()
    } catch (err) {
      setDocumentsError(err.message || '문서 삭제에 실패했습니다.')
    }
  }

  // ── 채팅 전송 ──────────────────────────────────────────────
  async function handleAsk(text = question.trim()) {
    if (!text || chatLoading || !isReady || !isLoggedIn) return

    setChatLoading(true)
    setChatError('')
    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', typing: true }])
    setQuestion('')

    try {
      const res = await askLegalQuestion(text)
      setMessages(prev => [
        ...prev.filter(m => !m.typing),
        {
          role: 'assistant',
          content: res.answer,
          evidence: res.evidence || [],
          sources: res.sources || [],
        },
      ])
    } catch (err) {
      setChatError(err.message || '답변 생성에 실패했습니다.')
      setMessages(prev => prev.filter(m => !m.typing))
    } finally {
      setChatLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '법무/컴플라이언스팀', to: '/backoffice/legal' },
          { label: '법무 챗봇' },
        ]}
      />

      <div className="mt-4 space-y-6">
        {/* 헤더 */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Legal RAG Chat
          </span>
          <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            법무 챗봇
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            계약서, 사규, 법률 문서(pdf, docx, hwp)를 업로드하면 AI가 문서 내용을 기반으로 법률 질문에 답변합니다.
          </p>
        </div>

        {/* 문서 목록 카드 */}
        <div className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setDocumentsExpanded(prev => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              현재 적용 문서 목록
            </h2>
            <span className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {documentsLoading ? '문서 목록 확인 중' : `${documents.length}개 문서`}
              </span>
              {documentsExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </button>

          {documentsExpanded && (
            <div className="mt-4">
              {/* 업로드 버튼 */}
              <div className="mb-4 flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.hwp"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !isLoggedIn}
                  className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white
                    hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"
                >
                  {uploading ? '업로드 중…' : '문서 업로드'}
                </button>
                <span className="text-xs text-gray-400">pdf, docx, hwp 지원</span>
              </div>

              {/* 업로드 에러 */}
              {uploadError && (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                  {uploadError}
                </div>
              )}

              {/* 정렬 */}
              {!documentsLoading && documents.length > 0 && (
                <div className="mb-3 flex items-center justify-end gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">정렬</label>
                  <select
                    value={documentSort}
                    onChange={e => setDocumentSort(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 outline-none
                      focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                  >
                    <option value="latest">최신순</option>
                    <option value="name">ㄱ - ㅎ</option>
                    <option value="name-desc">ㅎ - ㄱ</option>
                  </select>
                </div>
              )}

              {/* 로딩 / 빈 상태 / 목록 */}
              {documentsLoading ? (
                <div className="rounded-xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
                  문서 목록을 불러오는 중입니다.
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
                  현재 적용 중인 문서가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDocuments.map(doc => (
                    <div
                      key={doc.document_id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          추가 날짜: {doc.uploaded_at || '-'}
                          {doc.chunk_count > 0 && ` · ${doc.chunk_count}개 청크 인덱싱됨`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.document_id)}
                        className="min-h-[36px] rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-600
                          hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 문서 에러 */}
        {documentsError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {documentsError}
          </div>
        )}

        {/* 채팅 카드 */}
        <div className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                법무 Q&A 챗봇
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {helperText}
              </p>
            </div>
          </div>

          {/* 추천 질문 (메시지 없을 때) */}
          {messages.length === 0 && isReady && isLoggedIn && (
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAsk(s)}
                  disabled={chatLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800
                    text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30
                    transition-colors min-h-[36px] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* 메시지 영역 */}
          <div className="mt-5 min-h-[280px] rounded-xl bg-gray-50 p-4 dark:bg-gray-800/70 overflow-y-auto max-h-[420px]">
            {messages.length === 0 ? (
              <div className="flex min-h-[248px] items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                {!isLoggedIn
                  ? '로그인 후 챗봇을 사용할 수 있습니다.'
                  : isReady
                    ? '법률·계약 관련 질문을 입력해 주세요.'
                    : '업로드된 문서가 없습니다.'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`w-fit rounded-xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'self-end max-w-[70%] bg-blue-600 text-white'
                        : 'max-w-[70%] bg-white text-gray-800 dark:bg-gray-950 dark:text-gray-100'
                    }`}
                  >
                    {msg.typing ? (
                      <TypingDots />
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === 'assistant' && (msg.evidence?.length > 0 || msg.sources?.length > 0) && (
                          <div className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 space-y-1">
                            {msg.sources?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {msg.sources.map((s, si) => (
                                  <span key={si} className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            {msg.evidence?.map((item, evIdx) => (
                              <p key={`${index}-${evIdx}`} className="mt-1 first:mt-0">
                                근거: {item}
                              </p>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* 채팅 에러 */}
          {chatError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {chatError}
            </div>
          )}

          {/* 입력창 */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="법률·계약 관련 궁금한 점을 입력하세요."
              disabled={!isLoggedIn || !isReady || chatLoading}
              className="h-[44px] flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none
                transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100
                dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
            />
            <button
              type="button"
              onClick={() => handleAsk()}
              disabled={!isLoggedIn || !isReady || chatLoading || !question.trim()}
              className="min-h-[44px] rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white
                transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              질문하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
