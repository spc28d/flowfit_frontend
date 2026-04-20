import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerEmployee } from '../../api/auth';

const FIELD_CLASSNAME =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 placeholder:text-gray-400';

function formatBirthDateForApi(value) {
  if (!value) return null;
  if (value.length !== 8) return null;

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

const INITIAL_FORM = {
  employee_id: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone_number: '',
  birth_date: '',
  nickname: '',
};

const REQUIRED_FIELDS = [
  'employee_id',
  'name',
  'email',
  'password',
  'confirmPassword',
  'phone_number',
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;
  const birthDateInvalid =
    form.birth_date.length > 0 && form.birth_date.length !== 8;

  const isDisabled = useMemo(() => {
    const hasEmptyRequiredField = REQUIRED_FIELDS.some(
      (field) => !form[field].trim(),
    );

    return (
      hasEmptyRequiredField || passwordMismatch || birthDateInvalid || loading
    );
  }, [birthDateInvalid, form, loading, passwordMismatch]);

  function handleChange(event) {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === 'birth_date') {
      nextValue = value.replace(/\D/g, '').slice(0, 8);
    } else if (name === 'phone_number') {
      nextValue = value.replace(/\D/g, '').slice(0, 15);
    }

    setForm((prev) => ({ ...prev, [name]: nextValue }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (passwordMismatch) {
      setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        employee_id: form.employee_id.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone_number: form.phone_number.replace(/\D/g, ''),
        birth_date: formatBirthDateForApi(form.birth_date),
        nickname: form.nickname.trim() || null,
      };

      const result = await registerEmployee(payload);
      const wasIssued = result?.was_issued !== false;

      navigate('/login', {
        state: {
          registeredEmployeeId: form.employee_id.trim(),
          wasIssued,
          message:
            result?.message ||
            (wasIssued
              ? '회원가입 요청이 완료되었습니다. 인사팀 승인 후 부서와 직급이 배정됩니다.'
              : '미발급 사번으로 회원가입이 요청되었습니다. 인사팀 승인 시 별도 확인이 필요합니다.'),
        },
      });
    } catch (submitError) {
      setError(submitError.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-gray-900">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl bg-linear-to-br from-indigo-700 via-violet-600 to-fuchsia-500 p-8 text-white shadow-xl lg:p-10">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.2em]">
            EMPLOYEE REGISTER
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight lg:text-4xl">
            사원 계정 회원가입
          </h1>
          <p className="mt-4 text-sm leading-6 text-indigo-50">
            기본 인적 정보만 입력하면 가입할 수 있습니다. 인사팀이 승인한 뒤
            부서와 직급을 배정합니다.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold tracking-[0.15em] text-indigo-100">
                필수 입력
              </p>
              <p className="mt-2 text-sm text-white/90">
                사번, 이름, 이메일, 전화번호, 비밀번호, 비밀번호 확인
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold tracking-[0.15em] text-indigo-100">
                선택 입력
              </p>
              <p className="mt-2 text-sm text-white/90">
                생년월일 8자리, 닉네임
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold tracking-[0.15em] text-indigo-100">
                승인 후 처리
              </p>
              <p className="mt-2 text-sm text-white/90">
                인사팀이 가입 승인 후 부서와 직급을 지정합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-indigo-600">회원가입</p>
              <h2 className="mt-1 text-2xl font-bold">사원 정보 등록</h2>
              <p className="mt-2 text-sm text-gray-500">
                기본 정보만 입력하면 인사팀 승인 후 계정 사용이 가능합니다.
              </p>
            </div>
            <Link
              to="/login"
              className="rounded-full border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              로그인
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  사번 *
                </span>
                <input
                  name="employee_id"
                  type="text"
                  value={form.employee_id}
                  onChange={handleChange}
                  placeholder="예: BHR26-00047"
                  className={FIELD_CLASSNAME}
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  사번을 입력하세요.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  이름 *
                </span>
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="홍길동"
                  className={FIELD_CLASSNAME}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  이메일 *
                </span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  className={FIELD_CLASSNAME}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  전화번호 *
                </span>
                <input
                  name="phone_number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={form.phone_number}
                  onChange={handleChange}
                  placeholder="01012345678"
                  className={FIELD_CLASSNAME}
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  하이픈(-) 없이 숫자만 입력하세요.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  비밀번호 *
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

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  비밀번호 확인 *
                </span>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="비밀번호를 다시 입력하세요"
                  className={FIELD_CLASSNAME}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  생년월일
                </span>
                <input
                  name="birth_date"
                  type="text"
                  value={form.birth_date}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="예: 19990101"
                  className={FIELD_CLASSNAME}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  닉네임
                </span>
                <input
                  name="nickname"
                  type="text"
                  value={form.nickname}
                  onChange={handleChange}
                  placeholder="선택 입력"
                  className={FIELD_CLASSNAME}
                />
              </label>
            </div>

            {passwordMismatch ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                비밀번호가 일치하지 않습니다.
              </div>
            ) : null}

            {birthDateInvalid ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                생년월일은 'YYYYMMDD' 형식의 8자리 숫자로 입력해 주세요.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              인사팀 승인 후 로그인 가능합니다.
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? '회원가입 중 ...' : '회원가입'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
