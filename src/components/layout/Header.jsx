// 공통 헤더 컴포넌트 
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  clearAuthSession,
  getAuthSession,
  refreshAuthSession,
} from '../../api/auth';

function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getAuthSession());

  useEffect(() => {
    function syncSession() {
      setSession(getAuthSession());
    }

    window.addEventListener('auth-session-changed', syncSession);
    return () =>
      window.removeEventListener('auth-session-changed', syncSession);
  }, []);

  useEffect(() => {
    async function syncProfile() {
      try {
        await refreshAuthSession();
      } catch {
        // 승인 상태 자동 동기화는 보조 동작이므로 실패 시 화면을 막지 않습니다.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        syncProfile();
      }
    }

    syncProfile();

    const intervalId = window.setInterval(syncProfile, 5000);
    window.addEventListener('focus', syncProfile);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncProfile);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  function handleLogout() {
    clearAuthSession();
    navigate('/login');
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center h-full px-4">
        {/* 모바일 햄버거 */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden mr-3 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="메뉴 열기"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* 로고 */}
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold tracking-tight">
              FF
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white hidden sm:block">
            Flowfit
          </span>
        </a>

        {/* 우측 여백 확보용 */}
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-gray-600 dark:text-gray-300 sm:inline">
            {session?.employee
              ? session.employee.is_admin
                ? '관리자 권한 접속중'
                : `${session.employee.name}${
                    session.employee.department
                      ? ` · ${session.employee.department}`
                      : ' · 승인 대기'
                  }`
              : '로그인하지 않음'}
          </span>
          {session?.employee ? (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[36px] min-w-[88px] items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
            >
              로그아웃
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex min-h-[36px] min-w-[88px] items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
