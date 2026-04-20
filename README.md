# FlowFit — Frontend

대기업 사내 AI 업무 자동화 포털의 프론트엔드입니다.  
재무·HR·CS·법무·영업·구매·전략·R&D 각 부서의 AI 기능을 제공합니다.

> 백엔드 레포: [enterprise-ai-hub-backend](https://github.com/asd2599/enterprise-ai-hub-backend)

---

## Tech Stack

- **Vite** + **React 19** (Functional Components)
- **TailwindCSS v4**
- **React Router v7**
- **Recharts** (차트)
- **React Icons**

---

## 주요 화면

| 부서      | 기능                                               |
| --------- | -------------------------------------------------- |
| 재무/회계 | 영수증 OCR 전표 처리 · CFO 재무 대시보드           |
| HR        | 채용 공고 생성 · 규정 챗봇 · 성과 평가 · 계정 승인 |
| 법무      | 법무 챗봇 · 계약서 검토 · 계약서 초안 생성         |
| 총무/구매 | AI 구매 에이전트 (SSE 스트리밍)                    |
| 영업      | 제안서 생성 · 미팅 요약 · 실적 대시보드            |
| 마케팅    | 카피라이팅 · SNS 콘텐츠 · 보도자료                 |
| CS        | 응대 초안 · FAQ 생성 · VOC 분석                    |
| 전략      | 경쟁사 리서치 · PPTX 자동 생성                     |
| R&D       | 개발 문서 챗봇 · 로그 분석 · 릴리즈 노트           |

---

## 시작하기

```bash
npm install
npm run dev
```

### 환경 변수

`.env` 파일을 루트에 생성합니다.

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 빌드

```bash
npm run build
```

---

## 프로젝트 구조

```
src/
├── api/          # 모든 API 호출 중앙화
├── components/   # 공통 레이아웃 (AppLayout, Breadcrumb)
├── data/         # 부서 코드 등 정적 데이터
└── pages/
    ├── backoffice/   # 재무 · HR · 법무 · 총무
    ├── frontoffice/  # 영업 · 마케팅 · CS · 전략
    ├── rnd/          # R&D
    ├── setting/
    └── web_login/
```
