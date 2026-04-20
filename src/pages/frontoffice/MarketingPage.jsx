// 마케팅/PR팀 서브 대시보드
import { useNavigate } from 'react-router-dom'
import Breadcrumb from '../../components/layout/Breadcrumb'

const AGENTS = [
  {
    id: 'copywriting',
    label: '카피라이팅 생성',
    description: '제품 정보와 캠페인 목표를 입력하면 브랜드 톤에 맞는 광고 카피와 슬로건을 A/B/C 3종으로 자동 생성합니다.',
    badge: 'A/B/C 멀티버전 · 슬로건 · CTA',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    ),
  },
  {
    id: 'sns',
    label: 'SNS 콘텐츠 자동화',
    description: '콘텐츠 주제와 핵심 메시지를 입력하면 인스타그램 캡션·해시태그와 SEO 최적화 블로그 초안을 동시에 생성합니다.',
    badge: '인스타그램 · 블로그 · SEO 해시태그',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    ),
  },
  {
    id: 'press',
    label: '보도자료 작성',
    description: '유형을 선택하고 핵심 팩트를 입력하면 언론사 표준 포맷의 보도자료와 SNS 요약 발표문을 자동 생성합니다.',
    badge: '신제품 · 이벤트 · 실적',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
]

export default function MarketingPage() {
  const navigate = useNavigate()

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: '마케팅/PR팀' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-7 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-amber-500">
            MK
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              마케팅/PR팀
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
            onClick={() => navigate(`/frontoffice/marketing/${agent.id}`)}
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
