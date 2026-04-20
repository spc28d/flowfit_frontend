import { useCallback, useEffect, useMemo, useState } from 'react';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import {
  deleteIssuedEmployeeId,
  generateIssuedEmployeeIdsBatch,
  getIssueDepartmentCodes,
  getIssuedEmployeeIds,
  getUpcomingIssuedSerials,
} from '../../../api/hr';
import {
  IoMdAdd,
  IoMdArrowDropdown,
  IoMdClose,
  IoMdRefresh,
} from 'react-icons/io';
import { FaTrashCan } from 'react-icons/fa6';
import { DASHBOARD_ISSUE_CODE_ORDER } from '../../../data/departments';

function formatDt(value) {
  if (!value) return '-';
  return String(value).slice(0, 19).replace('T', ' ');
}

function toRowOrderBatches(rows) {
  const batches = [];
  for (const r of rows) {
    const department_code = String(r.departmentCode || '')
      .trim()
      .toUpperCase();
    let left = Math.min(50, Math.max(0, Number(r.count) || 0));
    if (!department_code || left < 1) continue;
    while (left > 0) {
      const count = Math.min(50, left);
      batches.push({ department_code, count });
      left -= count;
    }
  }
  return batches;
}

function newRowId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}-${Math.random()}`
  );
}

function totalBatchCount(rows) {
  let t = 0;
  for (const r of rows) {
    const code = String(r.departmentCode || '')
      .trim()
      .toUpperCase();
    const n = Math.min(50, Math.max(0, Number(r.count) || 0));
    if (!code || n < 1) continue;
    t += n;
  }
  return t;
}

function splitSerialPreviewByRows(rows, serialPreview) {
  const out = [];
  let offset = 0;
  const list = Array.isArray(serialPreview) ? serialPreview : [];
  for (const r of rows) {
    const code = String(r.departmentCode || '')
      .trim()
      .toUpperCase();
    const n = Math.min(50, Math.max(0, Number(r.count) || 0));
    if (!code || n < 1) {
      out.push([]);
      continue;
    }
    out.push(list.slice(offset, offset + n));
    offset += n;
  }
  return out;
}

/** 일련번호 3자리 목록을 '000 ~ 005' 또는 쉼표 구분으로 표시 */
function formatSerialRangeLabel(serials) {
  if (!serials?.length) return '···';
  if (serials.length === 1) return serials[0];
  let contiguous = true;
  for (let i = 1; i < serials.length; i += 1) {
    const prev = parseInt(serials[i - 1], 10);
    const cur = parseInt(serials[i], 10);
    if (cur !== (prev + 1) % 1000) {
      contiguous = false;
      break;
    }
  }
  if (contiguous) {
    return `${serials[0]} ~ ${serials[serials.length - 1]}`;
  }
  return serials.join(', ');
}

export default function EmployeeIdGenerator() {
  const [items, setItems] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [batchRows, setBatchRows] = useState([]);
  const [openPickerRowId, setOpenPickerRowId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [serialPreview, setSerialPreview] = useState([]);
  const [serialPreviewLoading, setSerialPreviewLoading] = useState(false);
  const [serialPreviewTick, setSerialPreviewTick] = useState(0);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!event.target.closest('[data-dept-picker-root]')) {
        setOpenPickerRowId(null);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getIssuedEmployeeIds();
      setItems(data.items || []);
    } catch (e) {
      setError(e.message || '목록을 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await getIssueDepartmentCodes();
      const raw = data.items || [];
      const rank = new Map(
        DASHBOARD_ISSUE_CODE_ORDER.map((code, i) => [code, i]),
      );
      const opts = [...raw].sort(
        (a, b) => (rank.get(a.code) ?? 999) - (rank.get(b.code) ?? 999),
      );
      setDeptOptions(opts);
    } catch {
      setDeptOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (deptOptions.length === 0) return;
    setBatchRows((rows) => {
      if (rows.length > 0) return rows;
      return [
        {
          id: newRowId(),
          departmentCode: deptOptions[0].code,
          count: 1,
        },
      ];
    });
  }, [deptOptions]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const total = totalBatchCount(batchRows);
      if (total < 1 || total > 200) {
        if (!cancelled) {
          setSerialPreview([]);
          setSerialPreviewLoading(false);
        }
        return;
      }
      if (!cancelled) setSerialPreviewLoading(true);
      const n = total;
      try {
        const data = await getUpcomingIssuedSerials(n);
        if (!cancelled) {
          setSerialPreview(Array.isArray(data.serials) ? data.serials : []);
        }
      } catch {
        if (!cancelled) setSerialPreview([]);
      } finally {
        if (!cancelled) setSerialPreviewLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [batchRows, serialPreviewTick]);

  function addBatchRow() {
    const first = deptOptions[0]?.code ?? '';
    setBatchRows((prev) => [
      ...prev,
      {
        id: newRowId(),
        departmentCode: first,
        count: 1,
      },
    ]);
  }

  function removeBatchRow(id) {
    setBatchRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }

  function updateBatchRow(id, patch) {
    setBatchRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  async function handleDeleteIssued(row) {
    if (row.status !== 'available') return;
    if (
      !window.confirm(`미사용 사번 ${row.employee_id}을(를) 삭제 처리할까요?`)
    ) {
      return;
    }
    setDeleteError('');
    setDeleteSuccess('');
    try {
      await deleteIssuedEmployeeId(row.employee_id);
      setDeleteSuccess(`사번 ${row.employee_id}이(가) 삭제되었습니다.`);
      await fetchList();
    } catch (e) {
      setDeleteError(e.message || '삭제에 실패했습니다.');
    }
  }

  async function handleGenerate() {
    const batches = toRowOrderBatches(batchRows);
    if (batches.length === 0) {
      setError('부서를 선택하고 개수(1~50)를 입력하세요.');
      return;
    }
    const totalPlanned = batches.reduce((acc, b) => acc + b.count, 0);
    if (totalPlanned > 200) {
      setError('한 번에 발급 가능한 총 개수는 200건 이하입니다.');
      return;
    }
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      const data = await generateIssuedEmployeeIdsBatch(batches);
      setSuccess(
        data.total
          ? `사번 ${data.total}개가 발급되었습니다.`
          : '발급된 사번이 없습니다.',
      );
      await fetchList();
      setSerialPreviewTick((t) => t + 1);
    } catch (e) {
      setError(e.message || '사번 발급에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  }

  const plannedTotal = totalBatchCount(batchRows);
  const rowSerialSlices = useMemo(
    () => splitSerialPreviewByRows(batchRows, serialPreview),
    [batchRows, serialPreview],
  );

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '사번 생성기' },
        ]}
      />

      <div className="mt-4 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Employee ID
          </span>
          <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            사번 생성기
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            규칙{' '}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs dark:bg-gray-900">
              BHR26-00047
            </code>{' '}
            (부서3자, 연도2자 - 일련3자, 랜덤2자)
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            {success}
          </div>
        ) : null}

        <div className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                사번 생성하기
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                부서 행을 추가해 팀별 발급 개수를 넣은 뒤 발급합니다. 일련번호
                3자리는 전역 순번입니다.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 pb-3 dark:border-gray-700 sm:gap-6 lg:gap-8">
              <div className="flex min-w-[min(100%,calc(22rem*2/3))] max-w-[calc(28rem*2/3)] flex-[1_1_100%] items-center sm:h-11 sm:flex-1 sm:basis-auto">
                <span className="block text-sm font-medium leading-none text-gray-700 dark:text-gray-300">
                  입사 부서
                </span>
              </div>
              <div className="flex min-w-0 flex-[1_1_100%] flex-wrap items-center gap-4 sm:flex-1 sm:flex-nowrap sm:gap-6 lg:gap-8">
                <div className="flex h-11 w-24 shrink-0 items-center justify-start">
                  <span className="block text-left text-sm font-medium leading-none text-gray-700 dark:text-gray-300">
                    개수
                  </span>
                </div>
                <div className="flex min-w-[min(100%,12rem)] flex-1 items-center sm:h-11">
                  <span className="block text-sm font-medium leading-none text-gray-700 dark:text-gray-300">
                    일련번호 (예상)
                  </span>
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={addBatchRow}
                  disabled={deptOptions.length === 0}
                  aria-label="부서 추가"
                  title="부서 추가"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <IoMdAdd className="h-5 w-5 shrink-0" aria-hidden />
                </button>
              </div>
            </div>

            {batchRows.map((row, index) => {
              const rowDept = deptOptions.find(
                (d) => d.code === row.departmentCode,
              );
              const pickerOpen = openPickerRowId === row.id;
              const isLastRow = index === batchRows.length - 1;
              const rowCode = String(row.departmentCode || '')
                .trim()
                .toUpperCase();
              const rowN = Math.min(50, Math.max(0, Number(row.count) || 0));
              const rowSerials = rowSerialSlices[index] ?? [];
              const rowSerialValid = Boolean(rowCode && rowN >= 1);
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8 mt-2"
                >
                  <div className="min-w-[min(100%,calc(22rem*2/3))] max-w-[calc(28rem*2/3)] flex-[1_1_100%] sm:flex-1 sm:basis-auto">
                    <div className="relative" data-dept-picker-root>
                      <button
                        type="button"
                        onClick={() =>
                          deptOptions.length > 0 &&
                          setOpenPickerRowId((cur) =>
                            cur === row.id ? null : row.id,
                          )
                        }
                        disabled={deptOptions.length === 0}
                        aria-label="입사 부서"
                        aria-expanded={pickerOpen}
                        aria-haspopup="listbox"
                        className="flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition hover:border-gray-400 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-950 dark:text-white dark:hover:border-gray-500"
                      >
                        <span className="shrink-0 font-mono text-sm font-semibold tracking-wide text-gray-900 dark:text-white">
                          {deptOptions.length === 0
                            ? '· · ·'
                            : (rowDept?.code ?? row.departmentCode)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-right text-sm text-gray-600 dark:text-gray-300">
                          {deptOptions.length === 0
                            ? '목록 로딩 중 …'
                            : (rowDept?.name ?? '선택하세요')}
                        </span>
                        <IoMdArrowDropdown
                          className={`h-5 w-5 shrink-0 text-gray-500 transition dark:text-gray-400 ${pickerOpen ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </button>
                      {pickerOpen && deptOptions.length > 0 ? (
                        <ul
                          role="listbox"
                          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-950"
                        >
                          {deptOptions.map((d) => (
                            <li
                              key={d.code}
                              role="option"
                              aria-selected={d.code === row.departmentCode}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  updateBatchRow(row.id, {
                                    departmentCode: d.code,
                                  });
                                  setOpenPickerRowId(null);
                                }}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
                              >
                                <span className="shrink-0 font-mono text-sm font-semibold tracking-wide text-gray-900 dark:text-white">
                                  {d.code}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-right text-gray-600 dark:text-gray-300">
                                  {d.name}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-[1_1_100%] flex-wrap items-center gap-4 sm:flex-1 sm:flex-nowrap sm:gap-6 lg:gap-8">
                    <div className="flex w-24 shrink-0 justify-start">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={row.count}
                        onChange={(e) =>
                          updateBatchRow(row.id, {
                            count: Math.min(
                              50,
                              Math.max(1, Number(e.target.value) || 1),
                            ),
                          })
                        }
                        aria-label="개수"
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-left text-sm tabular-nums text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                      />
                    </div>
                    <div className="flex min-w-[min(100%,12rem)] flex-1 items-center text-gray-700 dark:text-gray-300 sm:h-11">
                      {plannedTotal > 200 ? (
                        isLastRow ? (
                          <div className="flex h-11 w-full items-center text-sm leading-snug text-rose-800 dark:text-rose-200">
                            총 {plannedTotal}건입니다. 한 번에 발급 가능한
                            총합은 200건입니다.
                          </div>
                        ) : (
                          <div className="h-11 w-full" aria-hidden />
                        )
                      ) : !rowSerialValid ? (
                        <div className="flex h-11 w-full items-center text-sm text-gray-500 dark:text-gray-400">
                          ···
                        </div>
                      ) : serialPreviewLoading ? (
                        <div className="flex h-11 w-full items-center">
                          <p className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium leading-none">
                            <span className="font-mono font-semibold tracking-wide text-gray-900 dark:text-white">
                              {rowDept?.code ?? rowCode}
                            </span>
                            <span
                              className="select-none font-mono font-semibold tracking-[0.2em] text-sky-800 dark:text-sky-200"
                              aria-hidden
                            >
                              ···
                            </span>
                          </p>
                        </div>
                      ) : (
                        <div className="flex h-11 w-full items-center">
                          <p className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium leading-none">
                            <span className="font-mono font-semibold tracking-wide text-gray-900 dark:text-white">
                              {rowDept?.code ?? rowCode}
                            </span>
                            <span className="font-mono font-semibold text-sky-800 dark:text-sky-200">
                              {formatSerialRangeLabel(rowSerials)}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBatchRow(row.id)}
                    disabled={batchRows.length <= 1}
                    title={
                      batchRows.length <= 1 ? '최소 1행 필요' : '이 행 삭제'
                    }
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <IoMdClose className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={
                generating ||
                deptOptions.length === 0 ||
                plannedTotal < 1 ||
                plannedTotal > 200 ||
                toRowOrderBatches(batchRows).length === 0
              }
              className="inline-flex h-11 w-40 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-2 text-center text-sm font-semibold text-white outline-none transition hover:bg-blue-700 disabled:opacity-60"
            >
              {generating ? '발급 중 …' : '발급하기'}
            </button>
          </div>
        </div>

        {deleteError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {deleteError}
          </div>
        ) : null}
        {deleteSuccess ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            {deleteSuccess}
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                발급 내역
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                미사용 사번을 삭제할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchList}
              aria-label="발급 내역 새로고침"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white p-3 text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <IoMdRefresh className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">
              발급 내역을 불러오는 중입니다 …
            </div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white/60 p-12 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-950/40 dark:text-gray-400">
              발급된 사번이 없습니다. 위에서 사번을 발급하세요.
            </div>
          ) : null}

          {!loading && items.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950/50">
              <table className="min-w-full border-collapse text-left align-middle text-[13px] text-gray-700 dark:text-gray-300">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100 text-[14px] font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    <th className="whitespace-nowrap px-2 py-2 text-left align-middle">
                      상태
                    </th>
                    <th className="whitespace-nowrap px-2 py-2 text-left align-middle">
                      사번
                    </th>
                    <th className="whitespace-nowrap px-2 py-2 text-left align-middle">
                      발급일시
                    </th>
                    <th className="min-w-40 px-2 py-2 text-left align-middle">
                      사용일시
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((row) => (
                    <tr
                      key={row.employee_id}
                      className={
                        row.status === 'available'
                          ? 'bg-sky-50/90 dark:bg-sky-950/25'
                          : row.status === 'voided'
                            ? 'bg-rose-50/90 dark:bg-rose-950/25'
                            : 'bg-gray-50/90 dark:bg-gray-950/40'
                      }
                    >
                      <td className="px-2 py-2 align-middle">
                        {row.status === 'available' ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                              미사용
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteIssued(row)}
                              aria-label="미사용 사번 삭제"
                              className="inline-flex items-center justify-center rounded p-1 text-rose-500 transition hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                            >
                              <FaTrashCan className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : row.status === 'voided' ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900 dark:bg-rose-900/50 dark:text-rose-100">
                            삭제됨
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            사용됨
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 align-middle font-mono font-medium tabular-nums text-gray-900 dark:text-white">
                        {row.employee_id}
                      </td>
                      <td className="px-2 py-2 align-middle tabular-nums text-gray-700 dark:text-gray-300">
                        {formatDt(row.issued_at)}
                      </td>
                      <td className="px-2 py-2 align-middle text-gray-600 dark:text-gray-400">
                        {row.status === 'voided'
                          ? row.voided_at
                            ? `${formatDt(row.voided_at)} 삭제`
                            : '-'
                          : formatDt(row.used_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
