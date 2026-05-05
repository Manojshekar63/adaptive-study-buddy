import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import Landing from "./pages/Landing";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/assess/reading" element={<ReadingAssessment />} />
            <Route path="/assess/decoding" element={<DecodingAssessment />} />
            <Route path="/study/new" element={<StudyInput />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/study/session" element={<StudySession />} />
            <Route path="/study/feedback" element={<Feedback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
