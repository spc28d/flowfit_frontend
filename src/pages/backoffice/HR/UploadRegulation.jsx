import { useEffect, useMemo, useRef, useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import { getAuthSession } from '../../../api/auth';
import {
  deleteRegulationDocument,
  getRegulationDocuments,
  uploadRegulationFiles,
} from '../../../api/hr';

export default function UploadRegulation() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [documentSort, setDocumentSort] = useState('latest');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [session, setSession] = useState(() => getAuthSession());
  const fileInputRef = useRef(null);

  useEffect(() => {
    function syncSession() {
      setSession(getAuthSession());
    }

    window.addEventListener('auth-session-changed', syncSession);
    return () =>
      window.removeEventListener('auth-session-changed', syncSession);
  }, []);

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

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      setError('');

      try {
        const data = await getRegulationDocuments();
        setDocuments(data.items || []);
      } catch (fetchError) {
        setError(fetchError.message || '문서 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  async function handleUpload(files) {
    if (!isLoggedIn) {
      setError('문서를 업로드하려면 먼저 로그인해 주세요.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      const uploaded = await uploadRegulationFiles(files, {
        employee_id: session?.employee?.employee_id || '',
        name: session?.employee?.name || '',
        department: session?.employee?.department || '',
      });
      const refreshed = await getRegulationDocuments();
      setDocuments(refreshed.items || []);
      const uploadedItems = uploaded.items || [];
      const firstName = uploadedItems[0]?.file_name || '';
      const extraCount = uploadedItems.length - 1;
      const uploadMsg =
        extraCount > 0
          ? `문서 '${firstName}' 외 ${extraCount}건을 업로드했습니다.`
          : `문서 '${firstName}'을 업로드했습니다.`;
      setSuccessMessage(uploadMsg);
    } catch (uploadError) {
      setError(uploadError.message || '문서 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId) {
    if (!documentId || deletingId) return;

    const confirmed = window.confirm('선택한 문서를 삭제하시겠습니까?');
    if (!confirmed) return;

    setDeletingId(documentId);
    setError('');
    setSuccessMessage('');

    try {
      const result = await deleteRegulationDocument(documentId);
      setDocuments(result.items || []);
      setSuccessMessage(result.message || '문서를 삭제했습니다.');
    } catch (deleteError) {
      setError(deleteError.message || '문서 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '규정 문서 업로드' },
        ]}
      />

      <div className="mt-4 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            HR Regulation Upload
          </span>
          <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            규정 문서 업로드
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            인사 규정 문서를 업로드하면 챗봇이 업로드된 전체 문서를 기준으로 답변합니다.
          </p>
        </div>

        {!isLoggedIn ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            로그인된 사용자만 문서를 업로드할 수 있습니다.
          </div>
        ) : null}

        <div className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                업로드할 문서 선택
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                여러 문서를 한 번에 선택하여 업로드할 수 있습니다.
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              HWP · DOCX · PDF
            </span>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-4 text-sm dark:border-blue-700 dark:bg-blue-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="block font-medium text-gray-800 dark:text-gray-100">
                  파일 선택
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  .hwp, .docx, .pdf 문서 업로드 가능
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !isLoggedIn}
                className="min-h-11 w-24 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-100 bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? '업로드 중' : '파일 선택'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".hwp,.docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={uploading || !isLoggedIn}
              onChange={async (event) => {
                const selectedFiles = Array.from(event.target.files || []);
                if (!selectedFiles.length) return;
                await handleUpload(selectedFiles);
                event.target.value = '';
              }}
              className="hidden"
            />
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                현재 적용 문서
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {loading
                  ? '문서 목록을 확인하는 중입니다.'
                  : documents.length > 0
                    ? `문서 ${documents.length}개`
                    : '업로드된 문서가 없습니다.'}
              </span>
              {documents.length > 0 ? (
                <>
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
                </>
              ) : null}
            </div>
          </div>

          {successMessage ? (
            <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {documents.length === 0 && !loading ? (
              <div className="rounded-xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
                업로드된 문서가 없습니다.
              </div>
            ) : null}

            {sortedDocuments.map((document) => (
              <div
                key={document.document_id}
                className="rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {document.file_name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {document.uploaded_at || '-'}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      업로드 사용자: {document.uploaded_by_name || '-'}
                      {document.uploaded_by_department
                        ? ` (${document.uploaded_by_department})`
                        : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      추출 텍스트 길이:{' '}
                      {document.text_length?.toLocaleString?.() || 0}자
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(document.document_id)}
                    disabled={deletingId === document.document_id}
                    aria-label="문서 삭제"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                  >
                    {deletingId === document.document_id ? (
                      '· · ·'
                    ) : (
                      <FaTrashAlt />
                    )}
                  </button>
                </div>
                {document.preview ? (
                  <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                    {document.preview}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
