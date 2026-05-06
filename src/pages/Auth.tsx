import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Brain, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthPage() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const dest = loc.state?.from || "/onboarding";

  useEffect(() => {
    if (user) nav(dest, { replace: true });
  }, [user, nav, dest]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { display_name: name || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
  };

  return (
    <div className="max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-card border border-border shadow-soft p-8"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-tight">Welcome to DyslexAI</h1>
            <p className="text-sm text-muted-foreground">Your adaptive study companion</p>
          </div>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 w-full mb-6 rounded-full p-1 h-11 bg-muted">
            <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4">
              <div>
                <Label htmlFor="e1">Email</Label>
                <Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="p1">Password</Label>
                <Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11 rounded-xl" />
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4">
              <div>
                <Label htmlFor="n2">Your name</Label>
                <Input id="n2" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="e2">Email</Label>
                <Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="p2">Password</Label>
                <Input id="p2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11 rounded-xl" />
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground text-center mt-6">
          <Link to="/" className="story-link">Back to home</Link>
        </p>
      </motion.div>
    </div>
  );
}
