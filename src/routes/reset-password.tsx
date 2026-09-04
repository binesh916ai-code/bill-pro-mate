import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set password — CounterBook POS" },
      {
        name: "description",
        content: "Set or reset your CounterBook POS password to sign in with email on any device.",
      },
      { property: "og:title", content: "Set password — CounterBook POS" },
      { property: "og:description", content: "Set or reset your CounterBook POS password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && isRecovery)) setReady(true);
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save() {
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password saved. You can now sign in with email + password.");
    } catch (e) {
      toast.error((e as Error).message || "Could not save password.");
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
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">Set your password</h1>
            <p className="text-xs text-muted-foreground">Use it to sign in inside the app</p>
          </div>
        </div>

        {done ? (
          <>
            <p className="text-sm text-muted-foreground">
              All set. Open the CounterBook app and sign in with your email and new password.
            </p>
            <Button className="w-full" onClick={() => void navigate({ to: "/auth", replace: true })}>
              Go to sign in
            </Button>
          </>
        ) : !ready ? (
          <p className="text-sm text-muted-foreground">
            Verifying your link… If this takes long, request a new link from the sign-in page.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">New password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Confirm password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && void save()}
              />
            </div>
            <Button className="w-full" disabled={busy} onClick={() => void save()}>
              Save password
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
