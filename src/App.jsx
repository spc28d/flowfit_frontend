// 앱 루트 — React Router 라우팅 구조 정의
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { getAuthSession } from './api/auth';

// 재무팀 전용 라우터 가드 — department가 '재무/회계팀' 또는 '재무팀'이거나 position이 '대표이사'인 경우만 허용
function TreasuryGuard({ children }) {
  const session = getAuthSession();
  const employee = session?.employee;
  const hasAccess =
    employee?.department === '재무팀' ||
    employee?.department === '재무/회계팀' ||
    employee?.position === '대표이사';
  return hasAccess ? children : <Navigate to="/backoffice/finance" replace />;
}

// 인사팀 전용 라우터 가드 — 인사(HR)팀 또는 기타(관리자)만 허용. 거부 시 접근 거부 화면 표시
function HRAccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-2xl">
        🔒
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">접근 권한 없음</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        이 페이지는 <strong>인사팀</strong> 소속 직원만 접근할 수 있습니다.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
      >
        이전 페이지로
      </button>
    </div>
  );
}

function HRAdminGuard({ children }) {
  const session = getAuthSession();
  const dept = session?.employee?.department || '';
  const hasAccess = dept === '인사(HR)팀' || dept === '기타(관리자)';
  return hasAccess ? children : <HRAccessDenied />;
}
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CategoryPage from './pages/CategoryPage';
import Login from './pages/web_login/Login';
import Register from './pages/web_login/Register';
import Setting from './pages/setting/Setting';

// Back-Office
import HRPage from './pages/backoffice/HRPage';
import FinancePage from './pages/backoffice/FinancePage';
import LegalPage from './pages/backoffice/LegalPage';
import AdminPage from './pages/backoffice/AdminPage';
import HireCreate from './pages/backoffice/HR/HireCreate';
import HireRequest from './pages/backoffice/HR/HireRequest';
import RegulationChat from './pages/backoffice/HR/RegulationChat';
import UploadRegulation from './pages/backoffice/HR/UploadRegulation';
import HumanResources from './pages/backoffice/HR/HumanResources';
import AccountApproval from './pages/backoffice/HR/AccountApproval';
import EmployeeIdGenerator from './pages/backoffice/HR/EmployeeIdGenerator';
import Departments from './pages/backoffice/HR/Departments';
import Evaluate from './pages/backoffice/HR/Evaluate';
import TeamEval from './pages/backoffice/HR/TeamEval';
import MyEvaluation from './pages/backoffice/HR/MyEvaluation';
import RetireeManagement from './pages/backoffice/HR/RetireeManagement';

// 재무본부 세부 직무
import AccountantPage from './pages/backoffice/finance/AccountantPage';
import TreasuryPage from './pages/backoffice/finance/TreasuryPage';
import AuditPage from './pages/backoffice/finance/AuditPage';

// 법무/컴플라이언스팀 세부 직무
import ContractReviewPage from "./pages/backoffice/legal/ContractReviewPage";
import ContractDraftPage from "./pages/backoffice/legal/ContractDraftPage";
import LegalChatPage from "./pages/backoffice/legal/LegalChatPage";

// 총무/구매팀 세부 직무
import ProcurementAgentPage from './pages/backoffice/admin/ProcurementAgentPage';

// Front-Office
import StrategyPage from "./pages/frontoffice/StrategyPage";
import CompetitorResearchPage from "./pages/frontoffice/strategy/CompetitorResearchPage";
import SalesPage from "./pages/frontoffice/SalesPage";
import MarketingPage from "./pages/frontoffice/MarketingPage";
import CopywritingPage from "./pages/frontoffice/marketing/CopywritingPage";
import SnsPage from "./pages/frontoffice/marketing/SnsPage";
import PressPage from "./pages/frontoffice/marketing/PressPage";
import ProposalPage from "./pages/frontoffice/sales/ProposalPage";
import PerformancePage from "./pages/frontoffice/sales/PerformancePage";
import PerformanceEntryPage from "./pages/frontoffice/sales/PerformanceEntryPage";
import MeetingPage from "./pages/frontoffice/sales/MeetingPage";
import CSPage from "./pages/frontoffice/CSPage";
import ResponseDraftPage from "./pages/frontoffice/CS/ResponseDraftPage";
import FaqPage from "./pages/frontoffice/CS/FaqPage";
import VocReportPage from "./pages/frontoffice/CS/VocReportPage";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="setting" element={<Setting />} />

          {/* Back-Office 부서 */}
          <Route path="backoffice/hr" element={<HRPage />} />
          <Route path="backoffice/hr/hire-request" element={<HireRequest />} />
          <Route path="backoffice/hr/regulation-chat" element={<RegulationChat />} />
          <Route path="backoffice/hr/hire-create" element={<HRAdminGuard><HireCreate /></HRAdminGuard>} />
          <Route path="backoffice/hr/upload-regulation" element={<HRAdminGuard><UploadRegulation /></HRAdminGuard>} />
          <Route path="backoffice/hr/humanresources" element={<HRAdminGuard><HumanResources /></HRAdminGuard>} />
          <Route path="backoffice/hr/account-approval" element={<HRAdminGuard><AccountApproval /></HRAdminGuard>} />
          <Route path="backoffice/hr/employee-id-generator" element={<HRAdminGuard><EmployeeIdGenerator /></HRAdminGuard>} />
          <Route path="backoffice/hr/departments" element={<HRAdminGuard><Departments /></HRAdminGuard>} />
          <Route path="backoffice/hr/evaluate" element={<HRAdminGuard><Evaluate /></HRAdminGuard>} />
          <Route path="backoffice/hr/retiree-management" element={<HRAdminGuard><RetireeManagement /></HRAdminGuard>} />
          <Route path="backoffice/hr/team-eval" element={<TeamEval />} />
          <Route path="backoffice/hr/my-evaluation" element={<MyEvaluation />} />
          {/* 법무/컴플라이언스팀 — 서브 대시보드 + 세부 직무 */}
          <Route path="backoffice/legal" element={<LegalPage />} />
          <Route path="backoffice/legal/review" element={<ContractReviewPage />} />
          <Route path="backoffice/legal/draft" element={<ContractDraftPage />} />
          <Route path="backoffice/legal/chat" element={<LegalChatPage />} />
          <Route path="backoffice/admin" element={<AdminPage />} />
          <Route path="backoffice/admin/agent" element={<ProcurementAgentPage />} />

          {/* 재무본부 — 서브 대시보드 + 세부 직무 */}
          <Route path="backoffice/finance" element={<FinancePage />} />
          <Route
            path="backoffice/finance/accounting"
            element={<AccountantPage />}
          />
          <Route
            path="backoffice/finance/treasury"
            element={
              <TreasuryGuard>
                <TreasuryPage />
              </TreasuryGuard>
            }
          />
          <Route path="backoffice/finance/audit" element={<AuditPage />} />

          {/* Front-Office 부서 */}
          <Route path="frontoffice/strategy" element={<StrategyPage />} />
          <Route path="frontoffice/strategy/competitor" element={<CompetitorResearchPage />} />
          <Route path="frontoffice/sales" element={<SalesPage />} />
          <Route path="frontoffice/sales/proposal"    element={<ProposalPage />} />
          <Route path="frontoffice/sales/performance"       element={<PerformancePage />} />
          <Route path="frontoffice/sales/performance-entry" element={<PerformanceEntryPage />} />
          <Route path="frontoffice/sales/meeting"            element={<MeetingPage />} />
          <Route path="frontoffice/marketing" element={<MarketingPage />} />
          <Route
            path="frontoffice/marketing/copywriting"
            element={<CopywritingPage />}
          />
          <Route path="frontoffice/marketing/sns" element={<SnsPage />} />
          <Route path="frontoffice/marketing/press" element={<PressPage />} />
          <Route path="frontoffice/cs" element={<CSPage />} />
          <Route
            path="frontoffice/cs/response"
            element={<ResponseDraftPage />}
          />
          <Route path="frontoffice/cs/faq" element={<FaqPage />} />
          <Route path="frontoffice/cs/voc" element={<VocReportPage />} />
{/* 동적 카테고리 — 위의 고정 경로보다 뒤에 두어 /backoffice/hr 등과 충돌하지 않게 함 */}
          <Route path=":categoryId" element={<CategoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
