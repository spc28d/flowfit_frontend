// 메인 대시보드 — 2개 카테고리 카드 표시
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, COLOR_THEMES } from '../data/departments'

// 카테고리별 아이콘 SVG
const ICONS = {
  blue: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  amber: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  emerald: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
}

function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div>
      {/* 페이지 타이틀 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          업무 자동화 AI 포털
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          부서별 AI 도구를 통해 업무 효율을 높이세요
        </p>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: '카테고리', value: '2' },
          { label: '지원 부서', value: '8' },
          { label: 'AI 도구', value: '준비 중' },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center"
          >
            <div className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 카테고리 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {CATEGORIES.map(cat => {
          const theme = COLOR_THEMES[cat.color]
          return (
            <button
              key={cat.id}
              onClick={() => navigate(`/${cat.id}`)}
              className={[
                'text-left w-full rounded-xl border p-5 transition-all duration-150 cursor-pointer',
                'hover:shadow-lg active:scale-[0.98]',
                theme.cardBg,
                theme.cardBorder,
                theme.cardHover,
              ].join(' ')}
            >
              {/* 아이콘 */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-white ${theme.iconBg}`}>
                {ICONS[cat.color]}
              </div>

              {/* 레이블 */}
              <div className="mb-1">
                <span className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>
                  {cat.sublabel}
                </span>
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                {cat.label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                {cat.description}
              </p>

              {/* 부서 뱃지 목록 */}
              <div className="flex flex-wrap gap-1.5">
                {cat.departments.map(dept => (
                  <span
                    key={dept.id}
                    className={`text-xs px-2 py-0.5 rounded-full ${theme.badge}`}
                  >
                    {dept.label}
                  </span>
                ))}
              </div>

              {/* 이동 화살표 */}
              <div className={`flex items-center gap-1 mt-4 text-xs font-medium ${theme.text}`}>
                부서 목록 보기
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardPage
