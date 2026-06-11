import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "hc-cookie-consent-v1";

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: number;
};

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const save = (c: Omit<Consent, "ts" | "necessary">) => {
    const payload: Consent = { necessary: true, ...c, ts: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="mx-auto max-w-3xl rounded-xl border border-white/15 bg-black/80 p-4 text-white shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="text-sm leading-relaxed text-white/85">
            We use strictly necessary cookies to run this site. With your
            consent, we may also use analytics and marketing cookies. You can
            opt out at any time. We do not knowingly collect data from anyone
            under 13. Read our{" "}
            <Link to="/privacy" className="underline hover:text-white">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/tos" className="underline hover:text-white">
              Terms of Service
            </Link>
            .
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => setShowPrefs((s) => !s)}
            >
              Preferences
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => save({ analytics: false, marketing: false })}
            >
              Reject all
            </Button>
            <Button
              size="sm"
              className="bg-white text-black hover:bg-white/90"
              onClick={() => save({ analytics: true, marketing: true })}
            >
              Accept all
            </Button>
          </div>
        </div>
        {showPrefs && (
          <div className="mt-4 space-y-3 border-t border-white/15 pt-3 text-sm">
            <label className="flex items-start gap-3 opacity-70">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <strong>Strictly necessary</strong> — required for the site to
                work. Always on.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong>Analytics</strong> — help us understand how the site is
                used.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1"
              />
              <span>
                <strong>Marketing</strong> — used to personalize content and
                outreach.
              </span>
            </label>
            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-white text-black hover:bg-white/90"
                onClick={() => save({ analytics, marketing })}
              >
                Save preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
