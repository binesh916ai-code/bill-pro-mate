import { useCallback, useEffect, useMemo, useState } from "react";
import { Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  disableLock,
  isBiometricAvailable,
  readLock,
  registerBiometric,
  removeBiometric,
  setPin,
  unlockWithBiometric,
  verifyPin,
  type LockConfig,
} from "@/lib/app-lock";

/** Full-screen unlock screen shown on every app open while a lock is set. */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<LockConfig | null>(null);
  const [locked, setLocked] = useState(false);
  const [pin, setPinValue] = useState("");
  const [bioReady, setBioReady] = useState(false);

  useEffect(() => {
    const c = readLock();
    setCfg(c);
    setLocked(c.enabled && (!!c.pinHash || !!c.credentialId));
    void isBiometricAvailable().then(setBioReady);
  }, []);

  const bio = useCallback(async () => {
    try {
      await unlockWithBiometric();
      setLocked(false);
    } catch (e) {
      toast.error((e as Error).message || "Fingerprint unlock failed.");
    }
  }, []);

  useEffect(() => {
    if (locked && cfg?.credentialId) void bio();
  }, [locked, cfg?.credentialId, bio]);

  if (cfg === null) return null;
  if (!locked) return <>{children}</>;

  async function submit() {
    if (await verifyPin(pin)) {
      setPinValue("");
      setLocked(false);
    } else {
      toast.error("Wrong passcode.");
      setPinValue("");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-xs space-y-5 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-primary-foreground shadow-lg shadow-primary/20">
          <Lock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">App locked</h1>
          <p className="text-sm text-muted-foreground">Enter your passcode to continue</p>
        </div>
        {cfg.pinHash && (
          <div className="space-y-2">
            <Input
              autoFocus
              inputMode="numeric"
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              className="h-12 text-center text-xl tracking-[0.5em]"
              placeholder="••••"
            />
            <Button className="w-full" onClick={() => void submit()}>
              Unlock
            </Button>
          </div>
        )}
        {cfg.credentialId && bioReady && (
          <Button variant="outline" className="w-full" onClick={() => void bio()}>
            <Fingerprint /> Use fingerprint
          </Button>
        )}
      </div>
    </div>
  );
}

/** Settings dialog for PIN + biometric enrolment. */
export function AppLockSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [cfg, setCfg] = useState<LockConfig>(() => readLock());
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [bioReady, setBioReady] = useState(false);

  useEffect(() => {
    if (open) setCfg(readLock());
    void isBiometricAvailable().then(setBioReady);
  }, [open]);

  const hasLock = useMemo(() => cfg.enabled && (!!cfg.pinHash || !!cfg.credentialId), [cfg]);

  async function savePin() {
    if (!/^\d{4,6}$/.test(newPin)) return toast.error("Use a 4-6 digit passcode.");
    if (newPin !== confirm) return toast.error("Passcodes do not match.");
    await setPin(newPin);
    setCfg(readLock());
    setNewPin("");
    setConfirm("");
    toast.success("Passcode saved");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> App lock
          </DialogTitle>
          <DialogDescription>
            Ask for a passcode or fingerprint every time the app is opened on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium">Lock is {hasLock ? "on" : "off"}</p>
            <p className="text-xs text-muted-foreground">
              {hasLock ? "Unlock required on every open" : "Set a passcode below to turn it on"}
            </p>
          </div>
          <Switch
            checked={hasLock}
            onCheckedChange={(v) => {
              if (!v) {
                disableLock();
                setCfg(readLock());
                toast.success("App lock turned off");
              } else if (!cfg.pinHash) {
                toast.error("Set a passcode first.");
              }
            }}
          />
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">{cfg.pinHash ? "Change passcode" : "Set passcode"}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">New PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Confirm</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <Button size="sm" onClick={() => void savePin()}>
            Save passcode
          </Button>
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Fingerprint className="h-4 w-4" /> Fingerprint / Face unlock
          </p>
          <p className="text-xs text-muted-foreground">
            {bioReady
              ? cfg.credentialId
                ? "Registered on this device."
                : "Use your device biometrics to unlock faster."
              : "This device or browser has no biometric authenticator."}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!bioReady}
              onClick={() =>
                void registerBiometric("CounterBook POS")
                  .then(() => {
                    setCfg(readLock());
                    toast.success("Fingerprint registered");
                  })
                  .catch((e: Error) => toast.error(e.message || "Could not register."))
              }
            >
              {cfg.credentialId ? "Re-register" : "Register"}
            </Button>
            {cfg.credentialId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  removeBiometric();
                  setCfg(readLock());
                  toast.success("Fingerprint removed");
                }}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
