import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginAsAdmin, loginEmployee, saveAuthSession } from '../../api/auth';

const FIELD_CLASSNAME =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    employee_id: location.state?.registeredEmployeeId || '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || '',
  );
  
  // 발급되지 않은 사번으로 가입한 경우
  const [isUnissuedRegister, setIsUnissuedRegister] = useState(
    location.state?.wasIssued === false,
  );

  const isDisabled = useMemo(
    () => !form.employee_id.trim() || !form.password.trim() || loading,
    [form, loading],
  );

  function handleAdminLogin() {
    loginAsAdmin();
    navigate('/');
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setIsUnissuedRegister(false);

    try {
      const data = await loginEmployee({
        employee_id: form.employee_id.trim(),
        password: form.password,
      });
      saveAuthSession(data);

      const message =
        data.message ||
        `${form.employee_id.trim()} 계정으로 로그인 요청을 보냈습니다.`;

      setSuccessMessage(message);

      if (data.redirectTo) {
        navigate(data.redirectTo);
      }
    } catch (submitError) {
      setError(submitError.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-gray-900">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl bg-linear-to-br from-blue-700 via-blue-600 to-cyan-500 p-8 text-white shadow-xl lg:p-10">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
            EMPLOYEE ACCESS
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight lg:text-4xl">
            사번 기반 사내 로그인
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-blue-50">
            `info_employees` 테이블의 기본 로그인 키인 사번(`employee_id`)과
            비밀번호로 접근하는 화면입니다. 승인 대기 중인 계정도 페이지에
            들어갈 수 있고, 승인 완료 후 부서와 직급이 확정됩니다.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold tracking-[0.15em] text-blue-100">
                로그인 입력값
              </p>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li>사번 (`employee_id`)</li>
                <li>비밀번호 (`password`)</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold tracking-[0.15em] text-blue-100">
                참고 컬럼
              </p>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li>인증 여부 (`is_verified`)</li>
                <li>재직 여부 (`is_active`)</li>
                <li>부서/직급은 승인 후 확정</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-600">로그인</p>
              <h2 className="mt-1 text-2xl font-bold">사내 계정 접속</h2>
              <p className="mt-2 text-sm text-gray-500">
                승인 대기 상태에서도 페이지 접속이 가능합니다.
              </p>
            </div>
            <Link
              to="/register"
              className="min-w-[120px] rounded-full border border-blue-200 px-6 py-2 text-center text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              회원가입
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                사번
              </span>
              <input
                name="employee_id"
                type="text"
                value={form.employee_id}
                onChange={handleChange}
                placeholder="예: BHR26-12345"
                className={FIELD_CLASSNAME}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                비밀번호
              </span>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력하세요"
                className={FIELD_CLASSNAME}
              />
            </label>

            {successMessage ? (
              isUnissuedRegister ? (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  <div className="flex items-start gap-2">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                    <span>{successMessage}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isDisabled}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? '로그인 처리 중 ...' : '로그인'}
            </button>

            {/* 관리자 권한 즉시 접속 (모든 항목 접근 허용) */}
            <button
              type="button"
              onClick={handleAdminLogin}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              관리자 권한으로 접속
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
            아직 계정이 없다면{' '}
            <Link to="/register" className="font-semibold text-blue-600">
              회원가입 페이지
            </Link>
            에서 기본 정보를 등록하세요. 가입 후 인사팀이 승인하면서 부서와
            직급을 배정합니다.
          </div>
        </section>
      </div>
    </div>
  );
}
