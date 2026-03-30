import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TasksPage from "./pages/TasksPage";
import SalesPage from "./pages/SalesPage";
import VisionPage from "./pages/VisionPage";
import AdminPage from "./pages/AdminPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import DashboardPage from "./pages/DashboardPage";
import MeetingMinutesPage from "./pages/MeetingMinutesPage";
import MeetingMinuteDetailPage from "./pages/MeetingMinuteDetailPage";
import MemberPage from "./pages/MemberPage";
import ArchivedTasksPage from "./pages/ArchivedTasksPage";
import BusinessPlanPage from "./pages/BusinessPlanPage";
import FinancialPage from './pages/FinancialPage';
import KpiPage from './pages/KpiPage';
import ReportPage from './pages/ReportPage';


function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        <Redirect to="/dashboard" />
      </Route>
      <Route path={"/dashboard"} component={DashboardPage} />
      <Route path={"/tasks"} component={TasksPage} />
      <Route path={"/sales"} component={SalesPage} />
      <Route path={"/vision"} component={VisionPage} />
      <Route path={"/admin"} component={AdminPage} />
      <Route path={"/meetings"} component={MeetingMinutesPage} />
      <Route path={"/meetings/:id"} component={MeetingMinuteDetailPage} />
      <Route path={"/profile-setup"} component={ProfileSetupPage} />
      <Route path={"/members"} component={MemberPage} />
      <Route path={"/tasks/archive"} component={ArchivedTasksPage} />
      <Route path={"/business-plan"} component={BusinessPlanPage} />
      <Route path={"/financial"} component={FinancialPage} />
      <Route path={"/kpi"} component={KpiPage} />
      <Route path={"/reports"} component={ReportPage} />

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
