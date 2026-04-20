// 부서 페이지 공통 레이아웃 — 각 부서 페이지에서 import하여 사용
import { Navigate, useNavigate } from 'react-router-dom'
import { CATEGORY_MAP, DEPT_MAP, COLOR_THEMES } from '../../data/departments'
import Breadcrumb from './Breadcrumb'

const TOOL_ICONS = {
  document: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  ),
  edit: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  ),
  chart: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  ),
  chat: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  ),
  users: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  ),
  list: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  ),
  check: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  ),
  compare: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  ),
}

function ToolCard({ tool, theme, onClick, availabilityBadge }) {
  const available = !tool.disabled && (!availabilityBadge || Boolean(tool.path))

  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={[
        'group text-left w-full rounded-xl border p-5 transition-all duration-150',
        available
          ? `bg-white dark:bg-gray-900 hover:shadow-md active:scale-[0.98] cursor-pointer ${theme.cardBorder} ${theme.cardHover}`
          : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 cursor-default opacity-60',
      ].join(' ')}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${available ? theme.badge : 'bg-gray-100 dark:bg-gray-800'}`}>
        <svg className={`w-5 h-5 ${available ? theme.text : 'text-gray-400 dark:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {TOOL_ICONS[tool.icon] ?? TOOL_ICONS.document}
        </svg>
      </div>
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
        {tool.label}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
        {tool.description}
      </p>
      {available ? (
        <div className={`flex items-center gap-1 text-xs font-medium ${theme.text}`}>
          도구 사용하기
          <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      ) : (
        <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-500">
          준비 중
        </span>
      )}
    </button>
  )
}

// categoryId, deptId를 props로 받아 렌더링
function DeptPageLayout({
  categoryId,
  deptId,
  toolGridClassName = 'grid-cols-1 sm:grid-cols-2',
  availabilityBadge = false,
}) {
  const navigate = useNavigate()
  const cat = CATEGORY_MAP[categoryId]
  const dept = DEPT_MAP[deptId]

  if (!cat || !dept || dept.categoryId !== categoryId) {
    return <Navigate to="/" replace />
  }

  const theme = COLOR_THEMES[cat.color]
  const tools = dept.tools ?? []

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: cat.label, to: `/${cat.id}` },
          { label: dept.label },
        ]}
      />

      {/* 부서 헤더 */}
      <div className={`mt-4 mb-7 rounded-xl border p-5 ${theme.cardBg} ${theme.cardBorder}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${theme.iconBg}`}>
            {dept.label.slice(0, 2)}
          </div>
          <div>
            <span className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>
              {cat.sublabel}
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {dept.label}
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {dept.description}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${theme.badge}`}>
            AI 도구 {tools.length}개
          </span>
        </div>
      </div>

      {/* 도구 카드 그리드 */}
      {tools.length > 0 ? (
        <div className={`grid gap-4 ${toolGridClassName}`}>
          {tools.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              theme={theme}
              availabilityBadge={availabilityBadge}
              onClick={!tool.disabled && tool.path ? () => navigate(tool.path) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className={`rounded-xl border-2 border-dashed p-10 text-center ${theme.cardBorder}`}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
            AI 도구 준비 중
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            {dept.label}을 위한 AI 자동화 도구가 곧 추가될 예정입니다.
          </p>
          <span className={`inline-block mt-4 text-xs px-3 py-1.5 rounded-full font-medium ${theme.badge}`}>
            Coming Soon
          </span>
        </div>
      )}
    </div>
  )
}

export default DeptPageLayout
