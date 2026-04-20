// 카테고리 페이지 — 해당 카테고리의 부서 목록 표시
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { CATEGORY_MAP, COLOR_THEMES } from '../data/departments'
import Breadcrumb from '../components/layout/Breadcrumb'

function CategoryPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const cat = CATEGORY_MAP[categoryId]

  // 잘못된 categoryId 접근 시 대시보드로 리다이렉트
  if (!cat) return <Navigate to="/" replace />

  const theme = COLOR_THEMES[cat.color]

  return (
    <div>
      <Breadcrumb crumbs={[{ label: cat.label }]} />

      {/* 카테고리 헤더 */}
      <div className={`mt-4 mb-7 rounded-xl border p-5 ${theme.cardBg} ${theme.cardBorder}`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>
          {cat.sublabel}
        </span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1 mb-1">
          {cat.label}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{cat.description}</p>
      </div>

      {/* 부서 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cat.departments.map(dept => (
          <button
            key={dept.id}
            onClick={() => navigate(`/${cat.id}/${dept.id}`)}
            className={[
              'text-left w-full rounded-xl border p-5 bg-white dark:bg-gray-900 transition-all duration-150',
              'hover:shadow-md active:scale-[0.98] cursor-pointer',
              theme.cardBorder,
              theme.cardHover,
            ].join(' ')}
          >
            {/* 부서 아이콘 이니셜 */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-white text-xs font-bold ${theme.iconBg}`}>
              {dept.label.slice(0, 2)}
            </div>

            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
              {dept.label}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              {dept.description}
            </p>

            <div className={`flex items-center gap-1 text-xs font-medium ${theme.text}`}>
              도구 열기
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default CategoryPage
