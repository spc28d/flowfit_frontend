import { useEffect, useMemo, useState } from 'react';
import Breadcrumb from '../../components/layout/Breadcrumb';
import {
  getAuthSession,
  getMyProfile,
  saveAuthSession,
  updateMyProfile,
} from '../../api/auth';

const INPUT_CLASSNAME =
  'w-full rounded-xl border border-fuchsia-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-fuchsia-900/60 dark:bg-gray-950 dark:text-white';

function formatBirthDateForApi(value) {
  if (!value) return null;
  if (value.length !== 8) return null;

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function toProfileForm(employee) {
  return {
    employee_id: employee?.employee_id || '',
    name: employee?.name || '',
    email: employee?.email || '',
    phone_number: String(employee?.phone_number || '').replace(/\D/g, ''),
    birth_date: (employee?.birth_date || '').replaceAll('-', ''),
    nickname: employee?.nickname || '',
    password: '',
  };
}

export default function Setting() {
  const [session, setSession] = useState(() => getAuthSession());
  const [profileForm, setProfileForm] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone_number: '',
    birth_date: '',
    nickname: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function hydrateProfile() {
      const currentSession = getAuthSession();
      setSession(currentSession);
      setError('');

      if (!currentSession?.employee?.employee_id) {
        setProfileForm(toProfileForm(null));
        return;
      }

      setProfileForm(toProfileForm(currentSession.employee));
      setLoading(true);
      try {
        const data = await getMyProfile(currentSession.employee.employee_id);
        const nextSession = {
          ...currentSession,
          employee: {
            ...currentSession.employee,
            ...data.employee,
          },
          approval_status: data.approval_status,
        };

        setSession(nextSession);
        setProfileForm(toProfileForm(data.employee));
      } catch (fetchError) {
        setError(fetchError.message || '내 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    }

    hydrateProfile();

    function syncSession() {
      hydrateProfile();
    }

    window.addEventListener('auth-session-changed', syncSession);
    return () =>
      window.removeEventListener('auth-session-changed', syncSession);
  }, []);

  const approvalLabel = useMemo(() => {
    if (!session) return '';
    return session.approval_status === 'approved' ? '승인 완료' : '승인 대기';
  }, [session]);

  function handleProfileChange(event) {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === 'birth_date') {
      nextValue = value.replace(/\D/g, '').slice(0, 8);
    } else if (name === 'phone_number') {
      nextValue = value.replace(/\D/g, '').slice(0, 15);
    }

    setProfileForm((prev) => ({ ...prev, [name]: nextValue }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    if (profileForm.birth_date && profileForm.birth_date.length !== 8) {
      setError('생년월일은 8자리 숫자로 입력해 주세요.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const data = await updateMyProfile({
        employee_id: profileForm.employee_id,
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone_number: profileForm.phone_number.replace(/\D/g, ''),
        birth_date: formatBirthDateForApi(profileForm.birth_date),
        nickname: profileForm.nickname.trim() || null,
        password: profileForm.password.trim() || null,
      });

      const nextSession = {
        ...session,
        employee: {
          ...session.employee,
          ...data.employee,
        },
        approval_status: data.approval_status,
      };

      saveAuthSession(nextSession);
      setSession(nextSession);
      setProfileForm((prev) => ({ ...prev, password: '' }));
      setSuccessMessage(data.message || '내 정보가 수정되었습니다.');
    } catch (submitError) {
      setError(submitError.message || '내 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Breadcrumb crumbs={[{ label: '설정' }]} />

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-6 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/20">
          <span className="text-xs font-semibold tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
            My Information
          </span>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            내 정보 설정
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            계정 정보와 연락처를 수정하고 비밀번호를 변경할 수 있습니다.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm dark:bg-gray-900">
              <span className="text-gray-500 dark:text-gray-400">사번</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {session?.employee?.employee_id || '-'}
              </span>
            </div>
            {/* <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm dark:bg-gray-900">
              <span className="text-gray-500 dark:text-gray-400">
                승인 상태
              </span>
              <span className="font-medium text-fuchsia-700 dark:text-fuchsia-300">
                {approvalLabel || '-'}
              </span>
            </div> */}
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm dark:bg-gray-900">
              <span className="text-gray-500 dark:text-gray-400">부서</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {session?.employee?.department || '인사팀 배정 대기'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm dark:bg-gray-900">
              <span className="text-gray-500 dark:text-gray-400">직급</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {session?.employee?.position || '인사팀 배정 대기'}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-fuchsia-200 bg-white p-6 dark:border-fuchsia-900/60 dark:bg-gray-900">
          <div className="mb-5">
            <p className="text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400">
              Profile Settings
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              내 정보 수정
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              이름, 이메일, 연락처, 생년월일, 닉네임과 비밀번호를 수정할 수
              있습니다.
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  이름
                </span>
                <input
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileChange}
                  className={INPUT_CLASSNAME}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  이메일
                </span>
                <input
                  name="email"
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  className={INPUT_CLASSNAME}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  전화번호
                </span>
                <input
                  name="phone_number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={profileForm.phone_number}
                  onChange={handleProfileChange}
                  placeholder="01012345678"
                  className={INPUT_CLASSNAME}
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  숫자만 입력 (하이픈 없음)
                </p>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  생년월일
                </span>
                <input
                  name="birth_date"
                  value={profileForm.birth_date}
                  onChange={handleProfileChange}
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="예: 19990101"
                  className={INPUT_CLASSNAME}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  닉네임
                </span>
                <input
                  name="nickname"
                  value={profileForm.nickname}
                  onChange={handleProfileChange}
                  className={INPUT_CLASSNAME}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  새 비밀번호
                </span>
                <input
                  name="password"
                  type="password"
                  value={profileForm.password}
                  onChange={handleProfileChange}
                  placeholder="변경 시에만 입력"
                  className={INPUT_CLASSNAME}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving || loading || !session?.employee?.employee_id}
              className="min-h-[44px] rounded-xl bg-fuchsia-600 px-5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? '저장 중 ...' : '내 정보 저장'}
            </button>
          </form>
        </section>
      </div>

      <div className="mt-6 space-y-3">
        {!session?.employee?.employee_id ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            로그인 후 본인 계정의 DB 정보를 불러와 수정할 수 있습니다.
          </div>
        ) : null}

        {loading && !successMessage ? (
          <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-700">
            DB에서 내 정보를 불러오는 중입니다
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
