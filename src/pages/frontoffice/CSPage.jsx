// CS/고객지원팀 서브 대시보드 — 3개 에이전트 선택 허브
import { useNavigate } from 'react-router-dom'
import Breadcrumb from '../../components/layout/Breadcrumb'

const AGENTS = [
  {
    id: 'response',
    label: '응답 초안 자동 생성',
    description: '고객 문의를 입력하면 유형을 분류하고 정책 기반 응답 초안을 즉시 생성합니다.',
    badge: '문의 분류 · 초안 생성 · 에스컬레이션',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    ),
  },
  {
    id: 'faq',
    label: 'FAQ 자동 생성·관리',
    description: '누적 문의 로그를 클러스터링하여 FAQ 초안을 생성하고 정책 변경을 자동 반영합니다.',
    badge: '클러스터링 · FAQ · 온보딩 가이드',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    ),
  },
  {
    id: 'voc',
    label: 'VOC 자동 분석 리포트',
    description: '주간 문의 로그를 분석하여 감성 분포, 급증 이슈, 팀장 보고 초안을 자동 생성합니다.',
    badge: '감성 분석 · 이상 감지 · 주간 리포트',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
]

export default function CSPage() {
  const navigate = useNavigate()

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: 'CS/고객지원팀' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-7 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-amber-500">
            CS
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              CS / 고객지원팀
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          에이전트를 선택하여 해당 AI 도구 페이지로 이동합니다.
        </p>
        <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
          에이전트 3개
        </span>
      </div>

      {/* 에이전트 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {AGENTS.map(agent => (
          <button
            key={agent.id}
            onClick={() => navigate(`/frontoffice/cs/${agent.id}`)}
            className="group text-left w-full rounded-xl border bg-white dark:bg-gray-900 p-5
              transition-all duration-150 hover:shadow-md active:scale-[0.98] cursor-pointer
              border-amber-200 dark:border-amber-800
              hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-amber-100 dark:hover:shadow-amber-900/20"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-amber-100 dark:bg-amber-900/60">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {agent.icon}
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
              {agent.label}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              {agent.description}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-medium">
              {agent.badge}
            </span>
            <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 mt-3">
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
