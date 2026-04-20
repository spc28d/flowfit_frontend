// 인사(HR)팀 서브 대시보드 - 인사 업무 도구 선택 허브
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/layout/Breadcrumb';

const HR_TOOLS = [
  {
    id: 'regulation-chat',
    label: '인사 규정 챗봇',
    description:
      '사내 규정과 제도 관련 질문에 빠르게 답변하고 참고 규정을 안내합니다.',
    path: '/backoffice/hr/regulation-chat',
    badge: '규정 · 제도 · Q&A',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    ),
  },
  {
    id: 'hire-request',
    label: '채용 요청서 작성',
    description: '채용 필요 인원과 요청 사유를 표준 양식에 맞춰 정리합니다.',
    path: '/backoffice/hr/hire-request',
    badge: '요청서 · 승인 · 채용 계획',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    ),
  },
  {
    id: 'humanresources',
    label: '인사팀 알림사항',
    description: '인사팀 공지, 마감 일정, 운영 메모를 한 화면에서 확인합니다.',
    path: '/backoffice/hr/humanresources',
    badge: '공지 · 일정 · 운영 메모',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    ),
  },
  {
    id: 'employee-id-generator',
    label: '사번 생성기',
    description:
      '사번을 생성하고 관리합니다.',
    path: '/backoffice/hr/employee-id-generator',
    badge: '사번 발급',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    ),
  },
  {
    id: 'account-approval',
    label: '계정 승인 관리',
    description:
      '회원가입한 사원의 승인 대기 계정을 확인하고 부서와 직급을 배정합니다.',
    path: '/backoffice/hr/account-approval',
    badge: '계정 승인 · 권한 활성화 · 인사 배정',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    id: 'upload-regulation',
    label: '규정 문서 업로드',
    description:
      '인사 규정 문서를 업로드하여 챗봇이 최신 규정을 기준으로 답변하도록 설정합니다.',
    path: '/backoffice/hr/upload-regulation',
    badge: '문서 업로드 · 규정 반영',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
      />
    ),
  },
  {
    id: 'hire-create',
    label: '채용 공고 생성기',
    description:
      '직무 요건과 채용 목적을 기반으로 공고 초안을 빠르게 작성합니다.',
    path: '/backoffice/hr/hire-create',
    badge: '채용 · 공고 · JD',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  {
    id: 'departments',
    label: '부서',
    description:
      '조직 개편이나 인력 재배치에 맞춰 전체 인원의 부서를 일괄 변경합니다.',
    path: '/backoffice/hr/departments',
    badge: '조직 변경 · 부서 이동 · 인원 관리',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    id: 'team-eval',
    label: '팀원 평가하기',
    description:
      '같은 부서 팀원의 업무 성과와 역량을 평가하고 점수를 부여합니다.',
    path: '/backoffice/hr/team-eval',
    badge: '팀원 · 동료 평가 · 점수',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
  },
  {
    id: 'my-evaluation',
    label: '내 평가 결과 보고서',
    description:
      '본인이 받은 인사 평가 결과를 기간별로 확인하고 점수와 등급을 분석합니다.',
    path: '/backoffice/hr/my-evaluation',
    badge: '나의 평가 · 등급 · 점수',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
  },
  {
    id: 'evaluate',
    label: '인사 평가 보고서 작성',
    description:
      '평가 결과와 근거를 바탕으로 객관적인 인사 평가 보고서를 작성합니다.',
    path: '/backoffice/hr/evaluate',
    badge: '평가 · 리포트 · 성과',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
  },
  {
    id: 'retiree-management',
    label: '퇴사자 관리',
    description:
      '퇴사 및 재입사자를 관리합니다. 재입사 시 기존 사번을 그대로 재활성화합니다.',
    path: '/backoffice/hr/retiree-management',
    badge: '퇴사 · 재입사 · 계정 블락',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    ),
  },
];

export default function HRPage() {
  const navigate = useNavigate();
  // 전체 도구를 항상 노출 — 권한이 없는 항목은 라우터 가드(HRAdminGuard)가 접근 거부 화면을 표시합니다
  const visibleTools = HR_TOOLS

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀' },
        ]}
      />

      <div className="mt-4 mb-7 rounded-xl border p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-blue-600">
            인사
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Back-Office
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              인사(HR)팀
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          인사 운영, 채용, 평가, 조직 관리에 필요한 AI 도구를 빠르게 선택할 수
          있습니다.
        </p>
        <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
          AI 도구 {visibleTools.length}개
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {visibleTools.map((tool) => (
          <Fragment key={tool.id}>
          <button
            onClick={() => navigate(tool.path)}
            className="group text-left w-full rounded-xl border bg-white dark:bg-gray-900 p-5
              transition-all duration-150 hover:shadow-md active:scale-[0.98] cursor-pointer
              border-blue-200 dark:border-blue-800
              hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-blue-100 dark:hover:shadow-blue-900/20"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-blue-100 dark:bg-blue-900/60">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {tool.icon}
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
              {tool.label}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              {tool.description}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">
              {tool.badge}
            </span>
            <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 mt-3">
              바로가기
              <svg
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
