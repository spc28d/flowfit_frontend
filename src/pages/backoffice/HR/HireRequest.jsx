import { useEffect, useMemo, useState } from 'react';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import { getAuthSession } from '../../../api/auth';
import { createHireRequest } from '../../../api/hr';

const INPUT_CLASSNAME =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white';

const SELECT_CHEVRON_DATA = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
)}`;

const selectChevronStyle = {
  backgroundImage: `url("${SELECT_CHEVRON_DATA}")`,
  backgroundSize: '1rem 1rem',
  backgroundPosition: 'right 1rem center',
  backgroundRepeat: 'no-repeat',
};

const SELECT_CLASSNAME = `${INPUT_CLASSNAME} cursor-pointer appearance-none pr-10`;

const TEXTAREA_CLASSNAME = `${INPUT_CLASSNAME} min-h-[120px] resize-y`;

const INITIAL_FORM = {
  job_title: '',
  employment_type: '정규직',
  experience_level: '무관',
  headcount: '1',
  urgency: '보통',
  hiring_goal: '',
  reason: '',
  responsibilities: '',
  qualifications: '',
  preferred_qualifications: '',
};

export default function HireRequest() {
  const [session, setSession] = useState(() => getAuthSession());
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    function syncSession() {
      setSession(getAuthSession());
    }

    window.addEventListener('auth-session-changed', syncSession);
    return () =>
      window.removeEventListener('auth-session-changed', syncSession);
  }, []);

  const employee = session?.employee || null;
  const isLoggedIn = Boolean(employee?.employee_id);
  const requestDepartment = employee?.department || '';
  const requesterName = employee?.name || '';
  const requesterId = employee?.employee_id || '';

  const isDisabled = useMemo(
    () =>
      !isLoggedIn ||
      !requestDepartment ||
      !form.job_title.trim() ||
      !form.hiring_goal.trim() ||
      !form.reason.trim() ||
      !form.responsibilities.trim() ||
      !form.qualifications.trim() ||
      submitting,
    [form, isLoggedIn, requestDepartment, submitting],
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'headcount' ? value.replace(/\D/g, '').slice(0, 2) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isLoggedIn) {
      setError('채용 요청서를 작성하려면 먼저 로그인해 주세요.');
      return;
    }

    if (!requestDepartment) {
      setError('부서가 배정된 계정만 요청서를 작성할 수 있습니다.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await createHireRequest({
        requester_employee_id: requesterId,
        requester_name: requesterName,
        request_department: requestDepartment,
        job_title: form.job_title.trim(),
        employment_type: form.employment_type,
        experience_level: form.experience_level,
        headcount: Number(form.headcount || 1),
        urgency: form.urgency,
        hiring_goal: form.hiring_goal.trim(),
        reason: form.reason.trim(),
        responsibilities: form.responsibilities.trim(),
        qualifications: form.qualifications.trim(),
        preferred_qualifications: form.preferred_qualifications.trim(),
      });

      setSuccessMessage(
        result.message ||
          '채용 요청서가 등록되었습니다. 인사팀 알림에서 바로 확인할 수 있습니다.',
      );
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setError(submitError.message || '채용 요청서 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '경영지원 및 관리', to: '/backoffice' },
          { label: '인사(HR)팀', to: '/backoffice/hr' },
          { label: '채용 요청서 작성' },
        ]}
      />

      <div className="mt-4 space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Hire Request
          </span>
          <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            채용 요청서 작성
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            각 부서에서 필요한 인력 정보를 등록하면 인사팀이 채용 공고 생성기에서 해당 요청서의 공고 초안을 만들 수 있습니다.
          </p>
        </div>

        <section className="grid grid-cols-3 gap-4">
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-white p-5 dark:border-blue-800 dark:bg-gray-900">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              요청 부서
            </p>
            <p className="text-right text-sm font-medium text-gray-900 dark:text-white">
              {requestDepartment || '-'}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-white p-5 dark:border-blue-800 dark:bg-gray-900">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              요청자
            </p>
            <p className="text-right text-sm font-medium text-gray-900 dark:text-white">
              {requesterName || '-'}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-white p-5 dark:border-blue-800 dark:bg-gray-900">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              사번
            </p>
            <p className="text-right text-sm font-medium text-gray-900 dark:text-white">
              {requesterId || '-'}
            </p>
          </div>
        </section>

        <form
          id="hire-request-form"
          onSubmit={handleSubmit}
          className="rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-800 dark:bg-gray-900"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                직무명 *
              </span>
              <input
                name="job_title"
                value={form.job_title}
                onChange={handleChange}
                placeholder="예: 백엔드 개발자, HR 매니저"
                className={INPUT_CLASSNAME}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                채용 인원 *
              </span>
              <input
                name="headcount"
                value={form.headcount}
                onChange={handleChange}
                inputMode="numeric"
                className={INPUT_CLASSNAME}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                고용 형태
              </span>
              <select
                name="employment_type"
                value={form.employment_type}
                onChange={handleChange}
                style={selectChevronStyle}
                className={SELECT_CLASSNAME}
              >
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
                <option value="파견/외주">파견/외주</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                경력 수준
              </span>
              <select
                name="experience_level"
                value={form.experience_level}
                onChange={handleChange}
                style={selectChevronStyle}
                className={SELECT_CLASSNAME}
              >
                <option value="무관">무관</option>
                <option value="신입">신입</option>
                <option value="경력">경력</option>
                <option value="신입/경력">신입/경력</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                긴급도
              </span>
              <select
                name="urgency"
                value={form.urgency}
                onChange={handleChange}
                style={selectChevronStyle}
                className={SELECT_CLASSNAME}
              >
                <option value="낮음">낮음</option>
                <option value="보통">보통</option>
                <option value="높음">높음</option>
                <option value="매우 높음">매우 높음</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                채용 목적 *
              </span>
              <textarea
                name="hiring_goal"
                value={form.hiring_goal}
                onChange={handleChange}
                placeholder="이번 채용으로 어떤 공백을 메우거나 어떤 목표를 달성하려는지 작성해 주세요."
                className={TEXTAREA_CLASSNAME}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                요청 사유 *
              </span>
              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="채용이 필요한 배경, 현재 인력 상황, 프로젝트 일정 등을 작성해 주세요."
                className={TEXTAREA_CLASSNAME}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                주요 업무 *
              </span>
              <textarea
                name="responsibilities"
                value={form.responsibilities}
                onChange={handleChange}
                placeholder="입사 후 맡게 될 핵심 업무를 항목형 또는 문장형으로 작성해 주세요."
                className={TEXTAREA_CLASSNAME}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                필수 요건 *
              </span>
              <textarea
                name="qualifications"
                value={form.qualifications}
                onChange={handleChange}
                placeholder="필수 기술, 자격, 경력 조건 등을 작성해 주세요."
                className={TEXTAREA_CLASSNAME}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                우대 사항
              </span>
              <textarea
                name="preferred_qualifications"
                value={form.preferred_qualifications}
                onChange={handleChange}
                placeholder="있다면 우대 경험, 툴 사용 경험, 자격증 등을 작성해 주세요."
                className={TEXTAREA_CLASSNAME}
              />
            </label>
          </div>

          {!isLoggedIn ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              로그인 후 요청자 정보가 자동 입력됩니다.
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </form>

        <div className="mt-6 flex justify-center">
          <button
            type="submit"
            form="hire-request-form"
            disabled={isDisabled}
            className="inline-flex min-w-50 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? '등록 중 ...' : '채용 요청서 등록'}
          </button>
        </div>

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
            {successMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
