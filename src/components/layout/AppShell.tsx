import { Link, useLocation } from "react-router-dom";
import { Brain, Sparkles, PlayCircle, LogIn, LogOut } from "lucide-react";
import { useLearner } from "@/store/learner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ReasoningPanel } from "./ReasoningPanel";
import { DemoTour } from "./DemoTour";
import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { reasoningOpen, toggleReasoning, setTour, tourActive } = useLearner();
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const onLanding = loc.pathname === "/";

  return (
    <div className="min-h-screen bg-hero">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-card">
              <Brain className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">ReadRight</span>
          </Link>
          <nav className="flex items-center gap-2">
            {!onLanding && (
              <Link to="/dashboard" className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground story-link mr-2">
                Dashboard
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTour(true)}
              disabled={tourActive}
              className="gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Demo tour</span>
            </Button>
            <Button
              variant={reasoningOpen ? "default" : "outline"}
              size="sm"
              onClick={() => toggleReasoning()}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI reasoning</span>
            </Button>
            {user ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link to="/auth">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign in</span>
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="container py-8 sm:py-12">{children}</main>

      <ReasoningPanel />
      <DemoTour />
    </div>
  );
}
