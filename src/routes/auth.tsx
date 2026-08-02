import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — CounterBook POS" },
      {
        name: "description",
        content:
          "Sign in to CounterBook POS with Google or email to sync your stores, items and bills across devices.",
      },
      { property: "og:title", content: "Sign in — CounterBook POS" },
      {
        property: "og:description",
        content: "Sign in to CounterBook POS to sync your stores, items and bills.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/app", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void navigate({ to: "/app", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setBusy(false);
      return toast.error(result.error.message || "Google sign-in failed.");
    }
    if (result.redirected) return;
    void navigate({ to: "/app", replace: true });
  }

  async function withEmail() {
    if (!email.trim() || password.length < 6)
      return toast.error("Enter an email and a password of at least 6 characters.");
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      toast.error((e as Error).message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <Toaster position="top-center" />
      <Card className="w-full max-w-sm gap-4 p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-primary-foreground shadow-lg shadow-primary/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">CounterBook POS</h1>
            <p className="text-xs text-muted-foreground">Sign in to sync your counters</p>
          </div>
        </div>

        <Button disabled={busy} onClick={() => void google()} className="w-full">
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              onKeyDown={(e) => e.key === "Enter" && void withEmail()}
            />
          </div>
          <Button variant="outline" className="w-full" disabled={busy} onClick={() => void withEmail()}>
            {mode === "up" ? "Create account" : "Sign in"}
          </Button>
          <button
            className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setMode(mode === "up" ? "in" : "up")}
          >
            {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </div>
      </Card>
    </div>
  );
}
