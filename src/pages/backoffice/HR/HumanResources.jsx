import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { IoEyeOffSharp } from 'react-icons/io5';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import {
  getHrNotifications,
  markAllHrNotificationsRead,
  markHrNotificationRead,
} from '../../../api/hr';

const MAX_VISIBLE_NOTICES = 7;

function formatNotificationTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getNotificationSource(item) {
  return item?.source || '기타';
}

export default function HumanResources() {
  const [alertLoading, setAlertLoading] = useState(true);
  const [alertError, setAlertError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [readingId, setReadingId] = useState(null);
  const [readingAll, setReadingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setAlertLoading(true);
    setAlertError('');

    try {
      const data = await getHrNotifications();
      setNotifications(data.items || []);
    } catch (error) {
      setAlertError(
        error.message || '인사팀 알림 데이터를 불러오지 못했습니다.',
      );
    } finally {
      setAlertLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const noticeItems = useMemo(
    () =>
      notifications.filter((item) => item.is_active && !item.read_at),
    [notifications],
  );

  const visibleNoticeItems = useMemo(
    () =>
      isExpanded ? noticeItems : noticeItems.slice(0, MAX_VISIBLE_NOTICES),
    [isExpanded, noticeItems],
  );

  const filteredHistoryItems = useMemo(() => {
    const keyword = historySearch.trim().toLowerCase();
    if (!keyword) return notifications;

    return notifications.filter((item) =>
      String(item.message || '')
        .toLowerCase()
        .includes(keyword),
    );
  }, [notifications, historySearch]);

  async function handleDeleteNotification(item) {
    setReadingId(item.id);
    setAlertError('');

    try {
      await markHrNotificationRead(item.id);
      await loadNotifications();
    } catch (error) {
      setAlertError(error.message || '알림 읽음 처리에 실패했습니다.');
    } finally {
      setReadingId(null);
    }
  }

  async function handleMarkAllAsRead() {
    const ids = noticeItems.map((item) => item.id);
    if (ids.length === 0) return;

    setReadingAll(true);
    setAlertError('');

    try {
      await markAllHrNotificationsRead(ids);
      await loadNotifications();
    } catch (error) {
      setAlertError(error.message || '전체 읽음 처리에 실패했습니다.');
    } finally {
      setReadingAll(false);
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '인사팀 알림사항' },
        ]}
      />

      <div className="mt-4 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Human Resources
          </span>
          <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            인사팀 알림사항
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            인사팀 관련 알림을 확인합니다.
          </p>
        </div>

        <section className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                읽지 않은 알림
              </h2>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                {noticeItems.length}건
              </span>
            </div>
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={noticeItems.length === 0 || readingAll}
              className="w-24 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
            >
              {readingAll ? '처리 중 ...' : '전부 읽음'}
            </button>
          </div>

          {alertError ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {alertError}
            </div>
          ) : null}

          {alertLoading ? (
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
              인사팀 알림을 불러오는 중입니다 ...
            </div>
          ) : noticeItems.length === 0 ? (
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
              표시할 알림이 없습니다.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {visibleNoticeItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {getNotificationSource(item)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {formatNotificationTime(item.created_at)}
                    </div>
                  </div>
                  <div className="my-3 border-t border-gray-200 dark:border-gray-700" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 truncate">{item.message}</div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotification(item)}
                      disabled={readingId === item.id}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-gray-100"
                      aria-label="알림 삭제"
                    >
                      <IoEyeOffSharp className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {noticeItems.length > MAX_VISIBLE_NOTICES ? (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 text-blue-700 transition hover:bg-blue-50"
                    aria-label={isExpanded ? '알림 접기' : '알림 펼치기'}
                  >
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
        <section className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  전체 알림 기록
                </h2>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {filteredHistoryItems.length}건
              </span>
            </div>
            <div className="flex w-full max-w-sm items-center justify-end gap-2">
              {!isHistoryExpanded ? (
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  최근 50일 기준, 최대 200건까지 표시됩니다.
                </p>
              ) : null}
              {isHistoryExpanded ? (
                <input
                  type="text"
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder="알림 검색"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              ) : null}
              <button
                type="button"
                onClick={() => setIsHistoryExpanded((prev) => !prev)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200 text-blue-700 transition hover:bg-blue-50"
                aria-label={
                  isHistoryExpanded
                    ? '전체 알림 기록 접기'
                    : '전체 알림 기록 펼치기'
                }
              >
                {isHistoryExpanded ? (
                  <FaChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <FaChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {isHistoryExpanded ? (
            <div className="mt-4">
              {filteredHistoryItems.length === 0 ? (
                <div className="rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-400 dark:text-gray-500">
                        <span className="font-medium text-gray-500 dark:text-gray-400">
                          {getNotificationSource(item)}
                        </span>
                        <span>{formatNotificationTime(item.created_at)}</span>
                      </div>
                      <div>{item.message}</div>
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
