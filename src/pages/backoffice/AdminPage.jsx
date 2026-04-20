// 총무/구매팀 서브 대시보드 — 세부 직무 선택 허브
import { useNavigate } from 'react-router-dom'
import Breadcrumb from '../../components/layout/Breadcrumb'

const SUB_DEPTS = [
  {
    id: 'agent',
    label: '구매 AI 에이전트',
    description: '자연어로 구매 요청 → 예산 확인·공급업체 검색·주문서 생성을 AI가 자동으로 처리',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    ),
    badge: '에이전트 · Tool Use · 스트리밍',
  },
]

export default function AdminPage() {
  const navigate = useNavigate()

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '총무/구매팀' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-7 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-blue-600">
            총무
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Back-Office
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              총무/구매팀
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          세부 직무를 선택하여 해당 AI 도구 페이지로 이동합니다.
        </p>
        <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
          세부 직무 1개
        </span>
      </div>

      {/* 세부 직무 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SUB_DEPTS.map(sub => (
          <button
            key={sub.id}
            onClick={() => navigate(`/backoffice/admin/${sub.id}`)}
            className="group text-left w-full rounded-xl border bg-white dark:bg-gray-900 p-5
              transition-all duration-150 hover:shadow-md active:scale-[0.98] cursor-pointer
              border-blue-200 dark:border-blue-800
              hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-blue-100 dark:hover:shadow-blue-900/20"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-blue-100 dark:bg-blue-900/60">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sub.icon}
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
              {sub.label}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              {sub.description}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">
              {sub.badge}
            </span>
            <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 mt-3">
              바로가기
              <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
