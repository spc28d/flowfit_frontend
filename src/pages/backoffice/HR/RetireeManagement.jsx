import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { IoMdRefresh } from 'react-icons/io';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import {
  getEmployees,
  getRetirees,
  getRetirementLog,
  rehireEmployee,
  resignEmployee,
} from '../../../api/hr';
import { DEPT_LABEL_OPTIONS } from '../../../data/departments';

function formatDateTime(value) {
  if (!value) return '-';
  const s = String(value).replace('T', ' ').split('.')[0];
  return s.length >= 16 ? s.slice(0, 16) : s;
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
      {message}
    </div>
  );
}

function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
      {message}
    </div>
  );
}

export default function RetireeManagement() {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'retired'
  const [employees, setEmployees] = useState([]);
  const [retirees, setRetirees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState('');
  const [resignDrafts, setResignDrafts] = useState({});
  const [rehireDrafts, setRehireDrafts] = useState({});
  const [isLogExpanded, setIsLogExpanded] = useState(false);

  const loadActiveEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getEmployees();
      setEmployees((data.items || []).filter((e) => e.is_active));
    } catch (e) {
      setError(e.message || '재직자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRetirees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getRetirees();
      setRetirees(data.items || []);
    } catch (e) {
      setError(e.message || '퇴사자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const data = await getRetirementLog();
      setLogs(data.items || []);
    } catch {
      setLogs([]);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveEmployees();
    loadRetirees();
    loadLogs();
  }, [loadActiveEmployees, loadRetirees, loadLogs]);

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return employees;
    return employees.filter((item) =>
      [item.employee_id, item.name, item.department, item.position]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(keyword)),
    );
  }, [employees, search]);

  const filteredRetirees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return retirees;
    return retirees.filter((item) =>
      [item.employee_id, item.name, item.department, item.position]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(keyword)),
    );
  }, [retirees, search]);

  async function handleResign(employee) {
    const reason = (resignDrafts[employee.employee_id] || '').trim();
    if (!window.confirm(`[${employee.employee_id}] ${employee.name}님을 퇴사 처리하시겠습니까?\n사번은 보존되며 해당 계정은 로그인이 차단됩니다.`)) {
      return;
    }

    setProcessingId(employee.employee_id);
    setError('');
    setSuccessMessage('');
    try {
      const result = await resignEmployee(employee.employee_id, reason);
      setSuccessMessage(result.message || '퇴사 처리가 완료되었습니다.');
      setResignDrafts((prev) => {
        const next = { ...prev };
        delete next[employee.employee_id];
        return next;
      });
      await Promise.all([loadActiveEmployees(), loadRetirees(), loadLogs()]);
    } catch (e) {
      setError(e.message || '퇴사 처리에 실패했습니다.');
    } finally {
      setProcessingId('');
    }
  }

  async function handleRehire(retiree) {
    const draft = rehireDrafts[retiree.employee_id] || {};
    const payload = {
      reason: (draft.reason || '').trim(),
      department: (draft.department || retiree.department || '').trim() || null,
      position: (draft.position || retiree.position || '').trim() || null,
    };

    if (!window.confirm(`[${retiree.employee_id}] ${retiree.name}님을 재입사 처리하시겠습니까?`)) {
      return;
    }

    setProcessingId(retiree.employee_id);
    setError('');
    setSuccessMessage('');
    try {
      const result = await rehireEmployee(retiree.employee_id, payload);
      setSuccessMessage(result.message || '재입사 처리가 완료되었습니다.');
      setRehireDrafts((prev) => {
        const next = { ...prev };
        delete next[retiree.employee_id];
        return next;
      });
      await Promise.all([loadActiveEmployees(), loadRetirees(), loadLogs()]);
    } catch (e) {
      setError(e.message || '재입사 처리에 실패했습니다.');
    } finally {
      setProcessingId('');
    }
  }

  function updateResignDraft(id, value) {
    setResignDrafts((prev) => ({ ...prev, [id]: value }));
  }

  function updateRehireDraft(id, key, value) {
    setRehireDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value },
    }));
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '퇴사자 관리' },
        ]}
      />

      <div className="mt-4 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Retiree Management
          </span>
          <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">퇴사자 관리</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            퇴사 처리 시 사번은 보존되고 계정은 로그인이 차단됩니다.  퇴사자를 선택해 재입사 가능합니다.
          </p>
        </div>

        <ErrorBanner message={error} />
        <SuccessBanner message={successMessage} />

        <section className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-blue-200 p-1 dark:border-blue-800">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30'
                }`}
              >
                재직자 ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('retired')}
                className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'retired'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30'
                }`}
              >
                퇴사자 ({retirees.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="사번 · 이름 · 부서 · 직급 검색"
                className="w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  loadActiveEmployees();
                  loadRetirees();
                  loadLogs();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                aria-label="새로고침"
              >
                <IoMdRefresh className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
              불러오는 중 ...
            </div>
          ) : activeTab === 'active' ? (
            filteredEmployees.length === 0 ? (
              <div className="mt-6 rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
                표시할 재직자가 없습니다.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.employee_id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{emp.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {emp.employee_id} · {emp.department || '부서 미정'} · {emp.position || '직급 미정'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {emp.email || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={resignDrafts[emp.employee_id] || ''}
                        onChange={(e) => updateResignDraft(emp.employee_id, e.target.value)}
                        placeholder="퇴사 사유 (선택)"
                        className="min-w-[200px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleResign(emp)}
                        disabled={processingId === emp.employee_id}
                        className="min-h-[44px] min-w-[80px] rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {processingId === emp.employee_id ? '· · ·' : '퇴사'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : filteredRetirees.length === 0 ? (
            <div className="mt-6 rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
              표시할 퇴사자가 없습니다.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filteredRetirees.map((ret) => {
                const draft = rehireDrafts[ret.employee_id] || {};
                return (
                  <div
                    key={ret.employee_id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{ret.name}</span>
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                            퇴사
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {ret.employee_id} · {ret.department || '부서 미정'} · {ret.position || '직급 미정'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          퇴사일: {formatDateTime(ret.resigned_at)} · {ret.email || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <select
                        value={draft.department ?? (ret.department || '')}
                        onChange={(e) => updateRehireDraft(ret.employee_id, 'department', e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      >
                        <option value="">부서 선택</option>
                        {DEPT_LABEL_OPTIONS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={draft.position ?? (ret.position || '')}
                        onChange={(e) => updateRehireDraft(ret.employee_id, 'position', e.target.value)}
                        placeholder="직급"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      />
                      <input
                        type="text"
                        value={draft.reason || ''}
                        onChange={(e) => updateRehireDraft(ret.employee_id, 'reason', e.target.value)}
                        placeholder="재입사 사유 (선택)"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRehire(ret)}
                        disabled={processingId === ret.employee_id}
                        className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {processingId === ret.employee_id ? '처리 중 ...' : '재입사'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">퇴사 · 재입사 이력</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {logs.length}건
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsLogExpanded((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
              aria-label={isLogExpanded ? '이력 접기' : '이력 펼치기'}
            >
              {isLogExpanded ? <FaChevronUp className="h-3.5 w-3.5" /> : <FaChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {isLogExpanded ? (
            <div className="mt-4">
              {logLoading ? (
                <div className="rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
                  이력을 불러오는 중 ...
                </div>
              ) : logs.length === 0 ? (
                <div className="rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
                  이력이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              log.action === 'resigned'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                            }`}
                          >
                            {log.action === 'resigned' ? '퇴사' : '재입사'}
                          </span>
                          <span>{formatDateTime(log.decided_at)}</span>
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white">{log.name}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {log.employee_id} · {log.department || '-'} · {log.position || '-'}
                        </span>
                      </div>
                      {log.reason ? (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          사유: {log.reason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
