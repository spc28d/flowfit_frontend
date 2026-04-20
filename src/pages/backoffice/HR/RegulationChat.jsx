import { useEffect, useMemo, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import { getAuthSession } from '../../../api/auth';
import { askRegulationQuestion, getRegulationDocuments } from '../../../api/hr';

export default function RegulationChat() {
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState('');
  const [documentSort, setDocumentSort] = useState('latest');
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [session, setSession] = useState(() => getAuthSession());
  const [documentsExpanded, setDocumentsExpanded] = useState(false);

  useEffect(() => {
    function syncSession() {
      setSession(getAuthSession());
    }

    window.addEventListener('auth-session-changed', syncSession);
    return () =>
      window.removeEventListener('auth-session-changed', syncSession);
  }, []);

  useEffect(() => {
    async function fetchDocuments() {
      setDocumentsLoading(true);
      setDocumentsError('');

      try {
        const data = await getRegulationDocuments();
        setDocuments(data.items || []);
      } catch (error) {
        setDocumentsError(error.message || '문서 목록을 불러오지 못했습니다.');
      } finally {
        setDocumentsLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  const isReady = documents.length > 0;
  const isLoggedIn = Boolean(session?.employee?.employee_id);

  const sortedDocuments = useMemo(() => {
    const nextDocuments = [...documents];

    if (documentSort === 'name') {
      nextDocuments.sort((a, b) =>
        String(a.file_name || '').localeCompare(
          String(b.file_name || ''),
          'ko',
        ),
      );
      return nextDocuments;
    }

    if (documentSort === 'name-desc') {
      nextDocuments.sort((a, b) =>
        String(b.file_name || '').localeCompare(
          String(a.file_name || ''),
          'ko',
        ),
      );
      return nextDocuments;
    }

    nextDocuments.sort((a, b) =>
      String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || '')),
    );
    return nextDocuments;
  }, [documentSort, documents]);

  const helperText = useMemo(() => {
    if (documentsLoading) return '문서 목록을 확인하는 중입니다.';
    if (!isLoggedIn) return '로그인한 사용자만 챗봇을 이용할 수 있습니다.';
    if (!isReady) return '인사 규정 문서(hwp, docx, pdf)를 업로드해 주세요.';
    return `${documents.length}개 문서를 기준으로 답변합니다.`;
  }, [documents.length, documentsLoading, isLoggedIn, isReady]);

  async function handleAsk(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || chatLoading || !isReady || !isLoggedIn) return;

    setChatLoading(true);
    setChatError('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setQuestion('');

    try {
      const response = await askRegulationQuestion(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          evidence: response.evidence || [],
        },
      ]);
    } catch (error) {
      setChatError(error.message || '답변 생성에 실패했습니다.');
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '인사 규정 챗봇' },
        ]}
      />

      <div className="mt-4 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            HR Regulation Chat
          </span>
          <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            인사 규정 챗봇
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            업로드한 문서(hwp, docx, pdf)를 바탕으로 제도, 절차, 기준을 빠르게
            질의응답합니다.
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setDocumentsExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              현재 적용 문서 목록
            </h2>
            <span className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {documentsLoading
                  ? '문서 목록 확인 중'
                  : `${documents.length}개 문서`}
              </span>
              {documentsExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </button>

          {documentsExpanded ? (
            <div className="mt-4">
              {!documentsLoading && documents.length > 0 ? (
                <div className="mb-3 flex items-center justify-end gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    정렬
                  </label>
                  <select
                    value={documentSort}
                    onChange={(event) => setDocumentSort(event.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                  >
                    <option value="latest">최신순</option>
                    <option value="name">ㄱ - ㅎ</option>
                    <option value="name-desc">ㅎ - ㄱ</option>
                  </select>
                </div>
              ) : null}

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
                  {sortedDocuments.map((document) => (
                    <div
                      key={document.document_id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {document.file_name}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                         {document.uploaded_at || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {documentsError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {documentsError}
          </div>
        ) : null}

        <div className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                규정 Q&A 챗봇
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {helperText}
              </p>
            </div>
          </div>

          <div className="mt-5 min-h-[280px] rounded-xl bg-gray-50 p-4 dark:bg-gray-800/70">
            {messages.length === 0 ? (
              <div className="flex min-h-[248px] items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                {!isLoggedIn
                  ? '로그인 후 챗봇을 사용할 수 있습니다.'
                  : isReady
                    ? '예: 연차휴가 발생 기준이 어떻게 되나요?'
                    : '업로드된 문서가 없습니다.'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`w-fit rounded-xl px-4 py-3 text-sm ${
                      message.role === 'user'
                        ? 'self-end max-w-[70%] bg-blue-600 text-white'
                        : 'max-w-[70%] bg-white text-gray-800 dark:bg-gray-950 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' &&
                    message.evidence?.length ? (
                      <div className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                        {message.evidence.map((item, evidenceIndex) => (
                          <p
                            key={`${index}-${evidenceIndex}`}
                            className="mt-1 first:mt-0"
                          >
                            세부사항: {item}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {chatError ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {chatError}
            </div>
          ) : null}

          <form
            onSubmit={handleAsk}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (
                    !isLoggedIn ||
                    !isReady ||
                    chatLoading ||
                    !question.trim()
                  )
                    return;
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="규정에 대해 궁금한 점을 입력하세요."
              disabled={!isLoggedIn || !isReady || chatLoading}
              className="h-[44px] flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-800"
            />
            <button
              type="submit"
              disabled={
                !isLoggedIn || !isReady || chatLoading || !question.trim()
              }
              className="min-h-[44px] rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              질문하기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
