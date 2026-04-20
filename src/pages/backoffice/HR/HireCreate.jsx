import { useCallback, useEffect, useMemo, useState } from 'react';
import { HiPencilSquare } from 'react-icons/hi2';
import { IoMdRefresh } from 'react-icons/io';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import { generateJobPost, getHireRequests } from '../../../api/hr';

const INPUT_CLASSNAME =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white';

const HIRE_SELECT_CHEVRON_DATA = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
)}`;

const hireSelectChevronStyle = {
  backgroundImage: `url("${HIRE_SELECT_CHEVRON_DATA}")`,
  backgroundSize: '1rem 1rem',
  backgroundPosition: 'right 1rem center',
  backgroundRepeat: 'no-repeat',
};

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatHireRequestStatus(status) {
  const map = {
    requested: '요청됨',
    posting_generated: '공고 생성됨',
  };
  if (!status) return '-';
  return map[status] ?? String(status);
}

function clonePosting(posting) {
  if (!posting) return null;
  return {
    ...posting,
    responsibilities: [...(posting.responsibilities || [])],
    qualifications: [...(posting.qualifications || [])],
    preferred_qualifications: [...(posting.preferred_qualifications || [])],
    hiring_process: [...(posting.hiring_process || [])],
    benefits: [...(posting.benefits || [])],
  };
}

function listToLines(arr) {
  return (arr || []).join('\n');
}

function linesToList(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
}

function buildPostingExportText(p) {
  const lines = [];
  lines.push(p.job_post_title || '');
  lines.push('');
  lines.push('【채용 개요】');
  lines.push(p.hiring_summary || '');
  lines.push('');
  lines.push('【팀 소개】');
  lines.push(p.team_intro || '');
  lines.push('');
  lines.push('【지원 마감】');
  lines.push(p.application_deadline || '');
  lines.push('');
  const bullets = (title, items) => {
    lines.push(`【${title}】`);
    (items || []).forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  };
  bullets('주요 업무', p.responsibilities);
  bullets('필수 요건', p.qualifications);
  bullets('우대 사항', p.preferred_qualifications);
  bullets('전형 절차', p.hiring_process);
  bullets('복리후생', p.benefits);
  lines.push('【마무리】');
  lines.push(p.closing_message || '');
  return lines.join('\n').trimEnd();
}

function sanitizeFilenamePart(name) {
  return String(name || '채용공고')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const EDIT_TEXTAREA_CLASSNAME = `${INPUT_CLASSNAME} min-h-[100px] resize-y`;
const EDIT_INPUT_TITLE_CLASSNAME = `${INPUT_CLASSNAME} font-semibold`;

function RequestDetail({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/70">
      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
        {value || '-'}
      </div>
    </div>
  );
}

export default function HireCreate() {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [postingEdit, setPostingEdit] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getHireRequests();
      const items = data.items || [];
      setRequests(items);
      setSelectedRequestId((prev) =>
        prev && items.some((item) => String(item.id) === String(prev))
          ? prev
          : items[0]
            ? String(items[0].id)
            : '',
      );
    } catch (fetchError) {
      setError(fetchError.message || '채용 요청서 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const selectedRequest = useMemo(
    () =>
      requests.find((item) => String(item.id) === String(selectedRequestId)),
    [requests, selectedRequestId],
  );

  async function handleGenerate() {
    if (!selectedRequestId) return;

    setGenerating(true);
    setError('');

    try {
      const result = await generateJobPost(Number(selectedRequestId));
      setPostingEdit(result?.posting ? clonePosting(result.posting) : null);
      if (result?.request) {
        setRequests((prev) =>
          prev.map((item) =>
            item.id === result.request.id ? result.request : item,
          ),
        );
      }
    } catch (generateError) {
      setError(generateError.message || '채용 공고 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  }

  function handleExportPosting() {
    if (!postingEdit) return;
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const base = sanitizeFilenamePart(
      postingEdit.job_post_title || selectedRequest?.job_title || '채용공고',
    );
    downloadTextFile(
      `${base}_${stamp}.txt`,
      buildPostingExportText(postingEdit),
    );
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '채용 공고 생성기' },
        ]}
      />

      <div className="mt-4 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Hire Create
          </span>
          <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            채용 공고 생성기
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            등록된 채용 요청서를 선택하면 해당 내용에 맞는 공고 초안을 AI로
            생성합니다.
          </p>
        </div>

        <section className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  채용 요청서 선택
                </span>
                <select
                  value={selectedRequestId}
                  onChange={(event) => {
                    setSelectedRequestId(event.target.value);
                    setPostingEdit(null);
                  }}
                  disabled={loading || requests.length === 0}
                  style={hireSelectChevronStyle}
                  className={`${INPUT_CLASSNAME} cursor-pointer appearance-none pr-10`}
                >
                  {requests.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.request_department}] {item.job_title} /{' '}
                      {item.headcount}명 / {formatDateTime(item.created_at)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={loadRequests}
              aria-label="새로고침"
              className="inline-flex items-center justify-center rounded-xl border border-blue-200 p-3 text-blue-700 transition hover:bg-blue-50"
            >
              <IoMdRefresh className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
              채용 요청서를 불러오는 중입니다 ...
            </div>
          ) : requests.length === 0 ? (
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
              아직 등록된 채용 요청서가 없습니다.
            </div>
          ) : null}
        </section>

        {selectedRequest ? (
          <>
            <section className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
              <div className="border-b border-gray-200 pb-3 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  요청서 요약
                </h2>
                <div className="mt-3 min-w-0 max-w-full overflow-x-auto">
                  <div className="flex flex-wrap items-baseline justify-start gap-x-[20px] gap-y-2">
                    <div className="flex min-w-0 items-baseline gap-[7px]">
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-blue-600 dark:text-blue-400">
                        요청 부서
                      </span>
                      <span className="text-left text-sm font-medium wrap-break-word text-gray-900 dark:text-white">
                        {selectedRequest.request_department}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-baseline gap-[7px]">
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-blue-600 dark:text-blue-400">
                        요청자
                      </span>
                      <span className="text-left text-sm font-medium wrap-break-word text-gray-900 dark:text-white">
                        {`${selectedRequest.requester_name} (${selectedRequest.requester_employee_id})`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                긴급도: {selectedRequest.urgency || '-'} · 상태:{' '}
                {formatHireRequestStatus(selectedRequest.status)} · 생성 시각:{' '}
                {formatDateTime(selectedRequest.generated_posting_at)}
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <RequestDetail
                  label="직무명"
                  value={selectedRequest.job_title}
                />
                <RequestDetail
                  label="고용 형태"
                  value={selectedRequest.employment_type}
                />
                <RequestDetail
                  label="경력 수준"
                  value={selectedRequest.experience_level}
                />
                <RequestDetail
                  label="채용 인원"
                  value={`${selectedRequest.headcount}명`}
                />
                <div className="col-span-full">
                  <RequestDetail
                    label="채용 목적"
                    value={selectedRequest.hiring_goal}
                  />
                </div>
                <div className="col-span-full">
                  <RequestDetail
                    label="요청 사유"
                    value={selectedRequest.reason}
                  />
                </div>
                <div className="col-span-full">
                  <RequestDetail
                    label="주요 업무"
                    value={selectedRequest.responsibilities}
                  />
                </div>
                <div className="col-span-full">
                  <RequestDetail
                    label="필수 요건"
                    value={selectedRequest.qualifications}
                  />
                </div>
                <div className="col-span-full">
                  <RequestDetail
                    label="우대 사항"
                    value={selectedRequest.preferred_qualifications || '없음'}
                  />
                </div>
              </div>
            </section>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedRequestId || generating || loading}
                aria-label={generating ? '공고 생성 중' : '공고 생성'}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 p-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <HiPencilSquare className="h-5 w-5 shrink-0 mr-2" aria-hidden />
                공고 작성하기
              </button>
            </div>
          </>
        ) : null}

        {postingEdit ? (
          <section className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  생성된 채용 공고 초안
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  아래에서 직접 수정한 뒤 텍스트 파일로 저장할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPosting}
                className="shrink-0 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                텍스트 파일로 내보내기
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
              <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300">
                공고 제목
              </label>
              <input
                type="text"
                value={postingEdit.job_post_title || ''}
                onChange={(event) =>
                  setPostingEdit((prev) => ({
                    ...prev,
                    job_post_title: event.target.value,
                  }))
                }
                className={`${EDIT_INPUT_TITLE_CLASSNAME} mt-2 text-lg`}
              />
              <label className="mt-4 block text-xs font-semibold text-blue-700 dark:text-blue-300">
                채용 개요
              </label>
              <textarea
                value={postingEdit.hiring_summary || ''}
                onChange={(event) =>
                  setPostingEdit((prev) => ({
                    ...prev,
                    hiring_summary: event.target.value,
                  }))
                }
                rows={4}
                className={`${EDIT_TEXTAREA_CLASSNAME} mt-2`}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/70">
                <label className="text-sm font-semibold text-gray-900 dark:text-white">
                  부서 소개
                </label>
                <textarea
                  value={postingEdit.team_intro || ''}
                  onChange={(event) =>
                    setPostingEdit((prev) => ({
                      ...prev,
                      team_intro: event.target.value,
                    }))
                  }
                  rows={5}
                  className={`${EDIT_TEXTAREA_CLASSNAME} mt-2`}
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/70">
                <label className="text-sm font-semibold text-gray-900 dark:text-white">
                  지원 마감 안내
                </label>
                <textarea
                  value={postingEdit.application_deadline || ''}
                  onChange={(event) =>
                    setPostingEdit((prev) => ({
                      ...prev,
                      application_deadline: event.target.value,
                    }))
                  }
                  rows={5}
                  className={`${EDIT_TEXTAREA_CLASSNAME} mt-2`}
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 md:col-span-2 dark:border-gray-700 dark:bg-gray-800/70">
                <label className="text-sm font-semibold text-gray-900 dark:text-white">
                  주요 업무 (한 줄에 한 항목)
                </label>
                <textarea
                  value={listToLines(postingEdit.responsibilities)}
                  onChange={(event) =>
                    setPostingEdit((prev) => ({
                      ...prev,
                      responsibilities: linesToList(event.target.value),
                    }))
                  }
                  rows={6}
                  className={`${EDIT_TEXTAREA_CLASSNAME} mt-2 font-mono text-sm`}
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 md:col-span-2 dark:border-gray-700 dark:bg-gray-800/70">
                <label className="text-sm font-semibold text-gray-900 dark:text-white">
                  필수 요건 (한 줄에 한 항목)
                </label>
                <textarea
                  value={listToLines(postingEdit.qualifications)}
                  onChange={(event) =>
                    setPostingEdit((prev) => ({
                      ...prev,
                      qualifications: linesToList(event.target.value),
                    }))
                  }
                  rows={6}
                  className={`${EDIT_TEXTAREA_CLASSNAME} mt-2 font-mono text-sm`}
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 md:col-span-2 dark:border-gray-700 dark:bg-gray-800/70">
                <label className="text-sm font-semibold text-gray-900 dark:text-white">
                  우대 사항 (한 줄에 한 항목)
                </label>
                <textarea
                  value={listToLines(postingEdit.preferred_qualifications)}
                  onChange={(event) =>
                    setPostingEdit((prev) => ({
                      ...prev,
                      preferred_qualifications: linesToList(event.target.value),
                    }))
                  }
                  rows={5}
                  className={`${EDIT_TEXTAREA_CLASSNAME} mt-2 font-mono text-sm`}
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 md:col-span-2 dark:border-gray-700 dark:bg-gray-800/70">
                <label className="text-sm font-semibold text-gray-900 dark:text-white">
                  전형 절차 (한 줄에 한 단계)
                </label>
                <textarea
                  value={listToLines(postingEdit.hiring_process)}
                  onChange={(event) =>
                    setPostingEdit((prev) => ({
                      ...prev,
                      hiring_process: linesToList(event.target.value),
                    }))
                  }
                  rows={4}
                  className={`${EDIT_TEXTAREA_CLASSNAME} mt-2 font-mono text-sm`}
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 md:col-span-2 dark:border-gray-700 dark:bg-gray-800/70">
                <label className="text-sm font-semibold text-gray-900 dark:text-white">
                  복리후생/근무 메리트 (한 줄에 한 항목)
                </label>
                <textarea
                  value={listToLines(postingEdit.benefits)}
                  onChange={(event) =>
                    setPostingEdit((prev) => ({
                      ...prev,
                      benefits: linesToList(event.target.value),
                    }))
                  }
                  rows={4}
                  className={`${EDIT_TEXTAREA_CLASSNAME} mt-2 font-mono text-sm`}
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 md:col-span-2 dark:border-gray-700 dark:bg-gray-800/70">
                <label className="text-sm font-semibold text-gray-900 dark:text-white">
                  마무리 문구
                </label>
                <textarea
                  value={postingEdit.closing_message || ''}
                  onChange={(event) =>
                    setPostingEdit((prev) => ({
                      ...prev,
                      closing_message: event.target.value,
                    }))
                  }
                  rows={4}
                  className={`${EDIT_TEXTAREA_CLASSNAME} mt-2`}
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
