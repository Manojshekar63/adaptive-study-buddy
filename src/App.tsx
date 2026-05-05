import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import ReadingAssessment from "./pages/ReadingAssessment";
import DecodingAssessment from "./pages/DecodingAssessment";
import StudyInput from "./pages/StudyInput";
import Schedule from "./pages/Schedule";
import StudySession from "./pages/StudySession";
import Feedback from "./pages/Feedback";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const protect = (el: JSX.Element) => <ProtectedRoute>{el}</ProtectedRoute>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/onboarding" element={protect(<Onboarding />)} />
              <Route path="/assess/reading" element={protect(<ReadingAssessment />)} />
              <Route path="/assess/decoding" element={protect(<DecodingAssessment />)} />
              <Route path="/study/new" element={protect(<StudyInput />)} />
              <Route path="/schedule" element={protect(<Schedule />)} />
              <Route path="/study/session" element={protect(<StudySession />)} />
              <Route path="/study/feedback" element={protect(<Feedback />)} />
              <Route path="/dashboard" element={protect(<Dashboard />)} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
