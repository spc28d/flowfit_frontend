import { useCallback, useEffect, useMemo, useState } from 'react';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import {
  approveEmployee,
  DEFAULT_REJECT_REASON,
  getAccountDecisions,
  getPendingEmployees,
  rejectEmployee,
} from '../../../api/hr';
import { DEPT_LABEL_OPTIONS } from '../../../data/departments';
import { FaChevronDown } from 'react-icons/fa';
import { IoMdRefresh } from 'react-icons/io';

function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

function SuccessBanner({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
      {message}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  return String(value).slice(0, 19).replace('T', ' ');
}

/** 승인 내역 등: 초 없이 `YYYY-MM-DD HH:mm` */
function formatDateTimeMinute(value) {
  if (!value) return '-';
  const s = String(value).replace('T', ' ').split('.')[0];
  const head = s.slice(0, 19);
  return head.length >= 16 ? head.slice(0, 16) : head;
}

export default function AccountApproval() {
  const [items, setItems] = useState([]);
  const [decisionItems, setDecisionItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const departmentOptions = DEPT_LABEL_OPTIONS;

  const fetchPendingEmployees = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getPendingEmployees();
      setItems(data.items || []);
      setDrafts((prev) => {
        const defaults = {
          department: '',
          teamNumber: '',
          positionType: '사원',
          customPosition: '',
          rejectReasonType: '',
          rejectReasonOther: '',
        };
        const next = {};
        for (const item of data.items || []) {
          const old = prev[item.employee_id];
          next[item.employee_id] = {
            ...defaults,
            ...old,
            rejectReasonType: old?.rejectReasonType ?? '',
            rejectReasonOther: old?.rejectReasonOther ?? '',
          };
        }
        return next;
      });
    } catch (fetchError) {
      setError(fetchError.message || '승인 대기 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDecisionHistory = useCallback(async () => {
    setDecisionLoading(true);
    try {
      const data = await getAccountDecisions();
      setDecisionItems(data.items || []);
    } catch {
      setDecisionItems([]);
    } finally {
      setDecisionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingEmployees();
  }, [fetchPendingEmployees]);

  useEffect(() => {
    fetchDecisionHistory();
  }, [fetchDecisionHistory]);

  const pendingCount = useMemo(() => items.length, [items]);

  function handleDraftChange(employeeId, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value,
      },
    }));
  }

  async function handleApprove(employeeId) {
    const draft = drafts[employeeId] || {
      department: '',
      teamNumber: '',
      positionType: '사원',
      customPosition: '',
      rejectReasonType: '',
      rejectReasonOther: '',
    };

    const resolvedPosition =
      draft.positionType === '기타'
        ? draft.customPosition.trim()
        : draft.positionType.trim();
    const resolvedDepartment = draft.department.trim();

    if (!draft.department.trim() || !resolvedPosition) {
      setError('부서와 직급을 입력한 뒤 승인해 주세요.');
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        rejectReasonType: '',
        rejectReasonOther: '',
      },
    }));

    setSavingId(employeeId);
    setError('');
    setSuccessMessage('');

    try {
      const result = await approveEmployee({
        employee_id: employeeId,
        department: resolvedDepartment,
        position: resolvedPosition,
      });

      setItems((prev) =>
        prev.filter((item) => item.employee_id !== employeeId),
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[employeeId];
        return next;
      });
      setSuccessMessage(
        `${result.name || employeeId} 계정을 승인하고 ${result.department} | ${result.position}으로 배정했습니다.`,
      );
      fetchDecisionHistory();
    } catch (approveError) {
      setError(approveError.message || '계정 승인 중 오류가 발생했습니다.');
    } finally {
      setSavingId('');
    }
  }

  async function handleReject(employeeId) {
    const draft = drafts[employeeId] || {};
    const kind = draft.rejectReasonType ?? '';
    if (!kind) {
      setError('거절 사유를 선택해 주세요.');
      return;
    }
    let reason = DEFAULT_REJECT_REASON;
    if (kind === 'other') {
      const text = String(draft.rejectReasonOther ?? '').trim();
      if (!text) {
        setError('기타를 선택한 경우 거절 사유를 입력해 주세요.');
        return;
      }
      reason = text;
    }

    setDrafts((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        department: '',
        teamNumber: '',
        positionType: '사원',
        customPosition: '',
      },
    }));

    setRejectingId(employeeId);
    setError('');
    setSuccessMessage('');

    try {
      const result = await rejectEmployee(employeeId, { reason });
      setItems((prev) =>
        prev.filter((item) => item.employee_id !== employeeId),
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[employeeId];
        return next;
      });
      setSuccessMessage(
        `${result.name || employeeId} 계정의 가입 요청을 거절했습니다. (사유: ${reason})`,
      );
      fetchDecisionHistory();
    } catch (rejectError) {
      setError(rejectError.message || '가입 거절 처리 중 오류가 발생했습니다.');
    } finally {
      setRejectingId('');
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '계정 승인 관리' },
        ]}
      />

      <div className="mt-4 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Account Approval
          </span>
          <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            계정 승인 관리
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            회원가입한 사원의 승인 대기 계정을 검토하고 부서와 직급을
            배정합니다.
          </p>
          <div className="mt-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
            승인 대기 {pendingCount}명
          </div>
        </div>

        <ErrorBanner message={error} />
        <SuccessBanner message={successMessage} />

        <div className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                승인 대기 목록
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                부서와 직급을 입력한 뒤 승인하면 즉시 로그인 계정으로 활성화됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPendingEmployees}
              aria-label="새로고침"
              className="inline-flex items-center justify-center rounded-xl border border-blue-200 p-3 text-blue-700 transition hover:bg-blue-50"
            >
              <IoMdRefresh className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">
              승인 대기 목록을 불러오는 중입니다 ...
            </div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-400 dark:border-gray-700">
              현재 승인 대기 중인 계정이 없습니다.
            </div>
          ) : null}

          {!loading && items.length > 0 ? (
            <div className="mt-5 space-y-4">
              {items.map((item) => {
                const draft = drafts[item.employee_id] || {
                  department: '',
                  teamNumber: '',
                  positionType: '사원',
                  customPosition: '',
                  rejectReasonType: '',
                  rejectReasonOther: '',
                };
                const isRejectOther = draft.rejectReasonType === 'other';
                const rejectReasonChosen = Boolean(draft.rejectReasonType);
                const rejectBlocked =
                  !rejectReasonChosen ||
                  (draft.rejectReasonType === 'other' &&
                    !String(draft.rejectReasonOther ?? '').trim());
                const resolvedPosition =
                  draft.positionType === '기타'
                    ? draft.customPosition.trim()
                    : draft.positionType.trim();

                const disabled =
                  savingId === item.employee_id ||
                  rejectingId === item.employee_id ||
                  !draft.department.trim() ||
                  !resolvedPosition;

                const isEtcPosition = draft.positionType === '기타';
                const isUnissued = item.was_issued === false;

                return (
                  <div
                    key={item.employee_id}
                    className={
                      isUnissued
                        ? 'rounded-xl border border-rose-300 bg-rose-50 p-5 dark:border-rose-700 dark:bg-rose-900/30'
                        : 'rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/60'
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {item.name}
                          </h3>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                            {item.employee_id}
                          </span>
                        </div>
                        <p className="shrink-0 text-right text-xs text-gray-400 dark:text-gray-500">
                          가입일{' '}
                          {String(item.created_at)
                            .slice(0, 19)
                            .replace('T', ' ')}
                        </p>
                      </div>
                      <div className="w-full text-sm">
                        <div className="grid w-full grid-cols-3 divide-x-2 divide-gray-400 border-x-2 border-gray-400 dark:divide-gray-500 dark:border-gray-500">
                          <div className="flex min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
                            <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">
                              연락처
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate text-right text-gray-900 dark:text-white"
                              title={item.phone_number}
                            >
                              {item.phone_number}
                            </span>
                          </div>
                          <div className="flex min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
                            <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">
                              이메일
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate text-right text-gray-900 dark:text-white"
                              title={item.email}
                            >
                              {item.email}
                            </span>
                          </div>
                          <div className="flex min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
                            <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">
                              생년월일
                            </span>
                            <span className="min-w-0 flex-1 truncate text-right text-gray-900 dark:text-white">
                              {item.birth_date ? item.birth_date : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_2fr_2fr_1fr] lg:items-end">
                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            배정 부서
                          </span>
                          <div className="relative">
                            <select
                              value={draft.department}
                              onChange={(event) =>
                                handleDraftChange(
                                  item.employee_id,
                                  'department',
                                  event.target.value,
                                )
                              }
                              className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            >
                              <option value="">부서 선택</option>
                              {departmentOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <FaChevronDown
                              className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                              aria-hidden
                            />
                          </div>
                        </label>

                        <label className="block min-w-0">
                          <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            배정 직급
                          </span>
                          <div className="relative">
                            <select
                              value={draft.positionType}
                              onChange={(event) =>
                                handleDraftChange(
                                  item.employee_id,
                                  'positionType',
                                  event.target.value,
                                )
                              }
                              className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            >
                              <option value="팀장">팀장</option>
                              <option value="사원">사원</option>
                              <option value="기타">기타 (직접 입력)</option>
                            </select>
                            <FaChevronDown
                              className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                              aria-hidden
                            />
                          </div>
                        </label>

                        <div
                          className={`min-w-0 ${!isEtcPosition ? 'invisible pointer-events-none' : ''}`}
                          aria-hidden={!isEtcPosition}
                        >
                          <input
                            type="text"
                            value={draft.customPosition}
                            onChange={(event) =>
                              handleDraftChange(
                                item.employee_id,
                                'customPosition',
                                event.target.value,
                              )
                            }
                            placeholder="직접 입력 (예: 대리)"
                            readOnly={!isEtcPosition}
                            tabIndex={isEtcPosition ? 0 : -1}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          />
                        </div>

                        <div className="flex min-w-0 flex-col">
                          <button
                            type="button"
                            onClick={() => handleApprove(item.employee_id)}
                            disabled={disabled}
                            className="inline-flex h-11 w-full min-w-0 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            <span className="relative flex w-full items-center justify-center">
                              <span
                                className="invisible select-none"
                                aria-hidden
                              >
                                · · ·
                              </span>
                              <span className="absolute inset-0 flex items-center justify-center">
                                {savingId === item.employee_id
                                  ? '· · ·'
                                  : '승인'}
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_4fr_1fr] lg:items-end">
                        <div className="min-w-0">
                          <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            거절 사유
                          </span>
                          <div className="relative">
                            <select
                              value={draft.rejectReasonType ?? ''}
                              onChange={(event) =>
                                handleDraftChange(
                                  item.employee_id,
                                  'rejectReasonType',
                                  event.target.value,
                                )
                              }
                              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-900 outline-none transition focus:border-rose-400 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                            >
                              <option value="" disabled>
                                사유 선택
                              </option>
                              <option value="mismatch">정보 불일치</option>
                              <option value="other">기타 (직접 입력)</option>
                            </select>
                            <FaChevronDown
                              className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                              aria-hidden
                            />
                          </div>
                        </div>
                        <div
                          className={`min-w-0 ${!isRejectOther ? 'hidden lg:block invisible pointer-events-none' : ''}`}
                          aria-hidden={!isRejectOther}
                        >
                          <input
                            type="text"
                            value={draft.rejectReasonOther ?? ''}
                            onChange={(event) =>
                              handleDraftChange(
                                item.employee_id,
                                'rejectReasonOther',
                                event.target.value,
                              )
                            }
                            placeholder="직접 입력"
                            readOnly={!isRejectOther}
                            tabIndex={isRejectOther ? 0 : -1}
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-rose-400 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                          />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <button
                            type="button"
                            onClick={() => handleReject(item.employee_id)}
                            disabled={
                              savingId === item.employee_id ||
                              rejectingId === item.employee_id ||
                              rejectBlocked
                            }
                            className={
                              rejectBlocked
                                ? 'inline-flex h-11 w-full min-w-0 shrink-0 cursor-not-allowed items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm font-semibold text-gray-500 transition dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                : 'inline-flex h-11 w-full min-w-0 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950/70'
                            }
                          >
                            <span className="relative flex w-full items-center justify-center">
                              <span
                                className="invisible select-none"
                                aria-hidden
                              >
                                · · ·
                              </span>
                              <span className="absolute inset-0 flex items-center justify-center">
                                {rejectingId === item.employee_id
                                  ? '· · ·'
                                  : '거절'}
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                승인 내역
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                승인·거절 처리 이력 (최신순)
              </p>
            </div>
            <button
              type="button"
              onClick={fetchDecisionHistory}
              aria-label="승인 내역 새로고침"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white p-3 text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <IoMdRefresh className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          </div>

          {decisionLoading ? (
            <div className="py-16 text-center text-sm text-gray-500">
              처리 내역을 불러오는 중입니다 ...
            </div>
          ) : null}

          {!decisionLoading && decisionItems.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white/60 p-12 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-950/40 dark:text-gray-400">
              아직 기록된 내역이 없습니다.
            </div>
          ) : null}

          {!decisionLoading && decisionItems.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950/50">
              <table className="min-w-full border-collapse text-left align-middle text-gray-700 dark:text-gray-300">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100 text-[14px] font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    <th className="w-34 max-w-34 whitespace-nowrap px-2 py-2 text-left align-middle">
                      처리일시
                    </th>
                    <th className="w-34 max-w-34 whitespace-nowrap px-2 py-2 text-left align-middle">
                      가입일시
                    </th>
                    <th className="min-w-16 max-w-16 whitespace-nowrap px-2 py-2 text-left align-middle">
                      이름
                    </th>
                    <th className="w-27 max-w-27 whitespace-nowrap px-2 py-2 text-left align-middle">
                      사번
                    </th>
                    <th className="min-w-24 whitespace-nowrap px-2 py-2 text-left align-middle">
                      부서
                    </th>
                    <th className="whitespace-nowrap px-2 py-2 text-left align-middle">
                      직급
                    </th>
                    <th className="min-w-[100px] px-2 py-2 text-left align-middle">
                      사유
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-left text-[13px] dark:divide-gray-800">
                  {decisionItems.map((row) => {
                    const isApproved = row.action === 'approved';
                    return (
                      <tr
                        key={row.id}
                        aria-label={
                          isApproved
                            ? `승인: ${row.name} (${row.employee_id})`
                            : `거절: ${row.name} (${row.employee_id})`
                        }
                        className={
                          isApproved
                            ? 'bg-sky-50/90 dark:bg-sky-950/25'
                            : 'bg-rose-50/90 dark:bg-rose-950/25'
                        }
                      >
                        <td
                          className={`text-left align-middle w-34 max-w-34 whitespace-nowrap px-2 py-2 tabular-nums ${
                            isApproved
                              ? 'text-sky-800 dark:text-sky-200/90'
                              : 'text-rose-800 dark:text-rose-200/90'
                          }`}
                        >
                          {formatDateTimeMinute(row.decided_at)}
                        </td>
                        <td
                          className={`text-left align-middle w-34 max-w-34 whitespace-nowrap px-2 py-2 tabular-nums ${
                            isApproved
                              ? 'text-sky-700/90 dark:text-sky-400/90'
                              : 'text-rose-700/90 dark:text-rose-400/90'
                          }`}
                        >
                          {formatDateTimeMinute(row.registered_at)}
                        </td>
                        <td
                          className={`text-left align-middle min-w-16 max-w-16 truncate px-2 py-2 font-medium ${
                            isApproved
                              ? 'text-sky-950 dark:text-sky-100'
                              : 'text-rose-950 dark:text-rose-100'
                          }`}
                          title={row.name}
                        >
                          {row.name}
                        </td>
                        <td
                          className={`text-left align-middle w-27 max-w-27 truncate px-2 py-2 tabular-nums ${
                            isApproved
                              ? 'text-sky-800/90 dark:text-sky-300/90'
                              : 'text-rose-800/90 dark:text-rose-300/90'
                          }`}
                          title={row.employee_id}
                        >
                          {row.employee_id}
                        </td>
                        <td
                          className={`text-left align-middle min-w-24 whitespace-nowrap px-2 py-2 ${
                            isApproved
                              ? 'text-sky-900 dark:text-sky-200'
                              : 'text-rose-900 dark:text-rose-200'
                          }`}
                        >
                          {row.department || '-'}
                        </td>
                        <td
                          className={`text-left align-middle whitespace-nowrap px-2 py-2 ${
                            isApproved
                              ? 'text-sky-900 dark:text-sky-200'
                              : 'text-rose-900 dark:text-rose-200'
                          }`}
                        >
                          {row.position || '-'}
                        </td>
                        <td
                          className={`text-left align-middle max-w-[220px] px-2 py-2 ${
                            isApproved
                              ? 'text-sky-600/80 dark:text-sky-500/80'
                              : 'text-rose-800 dark:text-rose-200'
                          }`}
                        >
                          {isApproved ? '-' : row.reason || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
