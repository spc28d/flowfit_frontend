// 사이드바 컴포넌트 — 카테고리 & 부서 네비게이션
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CATEGORIES, COLOR_THEMES } from '../../data/departments'
import { clearAuthSession, getAuthSession, loginAsAdmin } from '../../api/auth'

function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation()
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  const categoryId = segments[0] ?? ''
  const deptId = segments[1] ?? ''

  const [session, setSession] = useState(() => getAuthSession())
  useEffect(() => {
    function sync() { setSession(getAuthSession()) }
    window.addEventListener('auth-session-changed', sync)
    return () => window.removeEventListener('auth-session-changed', sync)
  }, [])
  const isAdmin = Boolean(session?.employee?.is_admin)
  function handleToggleAdmin() {
    if (isAdmin) clearAuthSession()
    else loginAsAdmin()
  }

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 사이드바 본체 */}
      <aside
        className={[
          'fixed top-14 left-0 bottom-0 z-30 w-64 bg-white dark:bg-gray-900',
          'border-r border-gray-200 dark:border-gray-800 overflow-y-auto',
          'transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <nav className="p-3 space-y-1">
          {/* 홈 링크 */}
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white',
              ].join(' ')
            }
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            대시보드
          </NavLink>

          {/* 관리자 권한 토글 — 대시보드와 백오피스 사이 */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              관리자 권한
            </span>
            <button
              type="button"
              role="switch"
              onClick={handleToggleAdmin}
              aria-checked={isAdmin}
              aria-label="관리자 권한 토글"
              className={[
                'relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2',
                isAdmin
                  ? 'border-amber-500 bg-amber-500 focus:ring-amber-300'
                  : 'border-gray-400 bg-gray-300 focus:ring-gray-300',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute left-1.5 text-[9px] font-bold tracking-tight transition-opacity',
                  isAdmin ? 'text-white opacity-100' : 'opacity-0',
                ].join(' ')}
              >
                ON
              </span>
              <span
                className={[
                  'absolute right-1.5 text-[9px] font-bold tracking-tight transition-opacity',
                  isAdmin ? 'opacity-0' : 'text-gray-900 opacity-100',
                ].join(' ')}
              >
                OFF
              </span>
              <span
                className={[
                  'inline-block h-5 w-5 transform rounded-full shadow-sm transition-transform duration-200',
                  isAdmin ? 'translate-x-7 bg-white' : 'translate-x-0.5 bg-gray-900',
                ].join(' ')}
              />
            </button>
          </div>

          <div className="pt-2">
            {CATEGORIES.map(cat => {
              const theme = COLOR_THEMES[cat.color]
              const isCatActive = categoryId === cat.id

              return (
                <div key={cat.id} className="mb-1">
                  {/* 카테고리 헤더 */}
                  <NavLink
                    to={`/${cat.id}`}
                    onClick={onClose}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors w-full',
                      isCatActive && !deptId
                        ? `${theme.badge} `
                        : `text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60`,
                    ].join(' ')}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
                    <span className="truncate">{cat.sublabel}</span>
                  </NavLink>

                  {/* 부서 목록 */}
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {cat.departments.map(dept => (
                      <NavLink
                        key={dept.id}
                        to={`/${cat.id}/${dept.id}`}
                        onClick={onClose}
                        className={({ isActive }) =>
                          [
                            'px-3 py-2 rounded-r-lg text-sm transition-colors truncate min-h-[44px] flex items-center',
                            isActive
                              ? theme.sidebarActive
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white',
                          ].join(' ')
                        }
                      >
                        {dept.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-800">
            <NavLink
              to="/setting"
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white',
                ].join(' ')
              }
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317a1 1 0 011.35-.936l.9.36a1 1 0 00.916-.064l.84-.525a1 1 0 011.33.21l.626.718a1 1 0 00.86.34l.95-.09a1 1 0 011.09.886l.092.95a1 1 0 00.34.86l.717.626a1 1 0 01.21 1.33l-.524.84a1 1 0 00-.064.916l.36.9a1 1 0 01-.936 1.35l-.95.092a1 1 0 00-.86.34l-.626.717a1 1 0 01-1.33.21l-.84-.524a1 1 0 00-.916-.064l-.9.36a1 1 0 01-1.35-.936l-.092-.95a1 1 0 00-.34-.86l-.718-.626a1 1 0 01-.21-1.33l.525-.84a1 1 0 00.064-.916l-.36-.9a1 1 0 01.936-1.35l.95-.092a1 1 0 00.86-.34l.626-.718z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              설정
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
