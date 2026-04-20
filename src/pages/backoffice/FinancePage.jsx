// 재무본부 서브 대시보드 — 세부 직무 선택 허브
import { useNavigate } from 'react-router-dom'
import Breadcrumb from '../../components/layout/Breadcrumb'

const SUB_DEPTS = [
  {
    id: 'accounting',
    label: '경리/회계',
    description: '영수증 OCR 및 전표 자동 분류, 엑셀 내역 생성',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7h6m-3 4v4m-2-2h4" />
    ),
    badge: '영수증 · 전표 · 엑셀',
  },
  {
    id: 'treasury',
    label: '재무/자금',
    description: '결산 데이터 기반 자금 분석 및 통계 대시보드',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
    badge: '예산 · 자금 · 통계',
  },
  {
    id: 'audit',
    label: '내부감사',
    description: '규정 위반 및 이상 지출 탐지(FDS) 자동화',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
    badge: 'FDS · 리스크 · 감사',
  },
]

export default function FinancePage() {
  const navigate = useNavigate()

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '재무/회계팀' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-7 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-blue-600">
            재무
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Back-Office
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              재무/회계팀
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          세부 직무를 선택하여 해당 AI 도구 페이지로 이동합니다.
        </p>
        <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
          세부 직무 3개
        </span>
      </div>

      {/* 세부 직무 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SUB_DEPTS.map(sub => (
          <button
            key={sub.id}
            onClick={() => navigate(`/backoffice/finance/${sub.id}`)}
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
