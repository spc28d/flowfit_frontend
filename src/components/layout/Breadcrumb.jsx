// 브레드크럼 컴포넌트 — 현재 위치 표시
import { Link } from 'react-router-dom'

// crumbs: [{ label, to? }]  — to가 없으면 현재 위치(마지막)
function Breadcrumb({ crumbs }) {
  if (!crumbs || crumbs.length === 0) return null

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
      <Link
        to="/"
        className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0"
      >
        홈
      </Link>

      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          {/* 구분자 */}
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          {crumb.to ? (
            <Link
              to={crumb.to}
              className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors truncate"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-white font-medium truncate">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

export default Breadcrumb
