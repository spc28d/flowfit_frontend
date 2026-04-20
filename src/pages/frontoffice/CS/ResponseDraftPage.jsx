// 응답 초안 자동 생성 페이지
import { useState } from 'react';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import {
  generateResponseDraft,
  saveInquiry,
  transcribeInquiryAudio,
} from '../../../api/cs';

const MAIN_TYPE_COLOR = {
  배송: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  '반품/교환':
    'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  환불: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  결제: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  상품: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  주문: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
  '회원/계정':
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  혜택: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  기타: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const TONE_OPTIONS = [
  { value: 'formal', label: '공식체' },
  { value: 'friendly', label: '친근체' },
];

// ── 공통 컴포넌트 ────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-5 py-3 mb-5">
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
    </div>
  );
}

function TypeBadge({ mainType, subType }) {
  const color = MAIN_TYPE_COLOR[mainType] ?? MAIN_TYPE_COLOR['기타'];
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${color}`}
      >
        {mainType}
      </span>
      {subType && (
        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {subType}
        </span>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function ResponseDraftPage() {
  const [inquiry, setInquiry] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [tone, setTone] = useState('formal');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  // result = { main_type, sub_type, draft, escalation: { needed, reason } }

  // 녹취 STT 상태
  const [transcribing, setTranscribing] = useState(false);
  const [transcribedFileName, setTranscribedFileName] = useState('');

  async function handleAudioUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setTranscribing(true);
    setError(null);
    try {
      const data = await transcribeInquiryAudio(file);
      // 기존 입력이 있으면 줄바꿈 두 개로 이어붙임, 없으면 교체
      setInquiry((prev) =>
        prev.trim() ? `${prev.trim()}\n\n${data.text}` : data.text,
      );
      setTranscribedFileName(file.name);
    } catch (err) {
      setError(`녹취 변환 실패: ${err.message}`);
    } finally {
      setTranscribing(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!inquiry.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await generateResponseDraft({
        inquiry,
        order_no: orderNo,
        tone,
      });
      setResult(data);
      setSaved(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(status) {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      await saveInquiry({
        inquiry_text: inquiry,
        order_no: orderNo,
        tone,
        main_type: result.main_type,
        sub_type: result.sub_type,
        draft: result.draft,
        final_response: result.draft,
        escalation_needed: result.escalation?.needed ?? false,
        escalation_reason: result.escalation?.reason ?? '',
        status,
      });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    if (result?.draft) navigator.clipboard.writeText(result.draft);
  }

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: '사업 및 영업', to: '/frontoffice' },
          { label: 'CS/고객지원팀', to: '/frontoffice/cs' },
          { label: '응답 초안 자동 생성' },
        ]}
      />

      {/* 헤더 */}
      <div className="mt-4 mb-6 rounded-xl border p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500 text-white shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Front-Office · CS/고객지원팀
            </span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              응답 초안 자동 생성
            </h1>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          고객 문의를 입력하면 유형을 자동 분류하고 정책 기반 응답 초안을
          생성합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 녹취 파일 업로드 → STT 자동 채움 */}
          <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2 min-w-0">
                <svg
                  className="w-4 h-4 text-amber-500 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11a7 7 0 01-14 0m7 7v3m0 0H8m4 0h4m-4-7a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    전화 응대 녹취 업로드
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Whisper STT로 변환 후 아래 문의 원문에 자동 채움 (mp3·m4a·wav·webm·ogg, 최대 25MB)
                  </p>
                  {transcribedFileName && !transcribing && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                      ✓ {transcribedFileName} 변환 완료
                    </p>
                  )}
                </div>
              </div>
              <label
                className={[
                  'inline-flex items-center gap-2 min-h-[40px] px-4 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer shrink-0',
                  transcribing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600',
                ].join(' ')}
              >
                {transcribing ? (
                  <>
                    <Spinner />
                    변환 중...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
                      />
                    </svg>
                    파일 선택
                  </>
                )}
                <input
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.mp4"
                  className="hidden"
                  onChange={handleAudioUpload}
                  disabled={transcribing}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              고객 문의 원문 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={inquiry}
              onChange={(e) => setInquiry(e.target.value)}
              rows={6}
              placeholder="고객 문의 내용을 붙여넣으세요. (이메일, 채팅, 전화 메모 등)"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400
                placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                주문번호 (선택)
              </label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="예: ORD-20260410-001"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                  px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400
                  placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                어조 설정
              </label>
              <div className="flex gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTone(opt.value)}
                    className={[
                      'flex-1 min-h-[44px] rounded-xl border text-sm font-medium transition-colors',
                      tone === opt.value
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!inquiry.trim() || loading}
            className="min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
              disabled:bg-gray-300 dark:disabled:bg-gray-700
              text-white text-sm font-semibold transition-colors
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner />
                초안 생성 중...
              </>
            ) : (
              '응답 초안 생성'
            )}
          </button>
        </form>

        {/* 결과 영역 */}
        <div className="flex flex-col gap-4">
          <ErrorBanner message={error} />

          {/* 빈 상태 */}
          {!result && !loading && !error && (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center h-full flex flex-col items-center justify-center gap-2">
              <svg
                className="w-10 h-10 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="text-sm text-gray-400">
                고객 문의를 입력하고 생성 버튼을 누르면
                <br />
                응답 초안이 여기에 표시됩니다.
              </p>
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-10 flex flex-col items-center justify-center gap-3 h-full">
              <Spinner />
              <p className="text-sm text-gray-400">
                문의를 분석하고 초안을 생성하는 중...
              </p>
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div className="flex flex-col gap-3">
              {/* 유형 태그 + 에스컬레이션 */}
              <div className="flex items-center gap-2 flex-wrap">
                <TypeBadge
                  mainType={result.main_type}
                  subType={result.sub_type}
                />
                {result.escalation?.needed && (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    에스컬레이션 필요
                  </span>
                )}
              </div>

              {/* 에스컬레이션 사유 */}
              {result.escalation?.needed && result.escalation?.reason && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    <span className="font-semibold">에스컬레이션 사유: </span>
                    {result.escalation.reason}
                  </p>
                </div>
              )}

              {/* 초안 */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    응답 초안
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline min-h-[32px] px-2"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    복사
                  </button>
                </div>
                <textarea
                  value={result.draft}
                  onChange={(e) =>
                    setResult((prev) => ({ ...prev, draft: e.target.value }))
                  }
                  rows={8}
                  className="w-full px-4 py-3 text-sm text-gray-900 dark:text-white
                    bg-white dark:bg-gray-900 resize-none focus:outline-none"
                />
              </div>

              {/* 발송 완료 버튼 */}
              {saved ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <svg
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    문의 로그가 저장되었습니다.
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('완료')}
                    disabled={saving}
                    className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600
                      disabled:bg-gray-300 dark:disabled:bg-gray-700
                      text-white text-sm font-semibold transition-colors
                      flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Spinner />
                        저장 중...
                      </>
                    ) : (
                      '발송 완료 · 로그 저장'
                    )}
                  </button>
                  {result.escalation?.needed && (
                    <button
                      onClick={() => handleSave('에스컬레이션')}
                      disabled={saving}
                      className="min-h-[44px] px-4 rounded-xl bg-red-500 hover:bg-red-600
                        disabled:bg-gray-300 dark:disabled:bg-gray-700
                        text-white text-sm font-semibold transition-colors
                        flex items-center justify-center gap-2"
                    >
                      에스컬레이션
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
