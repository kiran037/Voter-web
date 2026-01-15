// src/app/signin/SignInClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Phone, Lock, Check, ArrowRight, RefreshCcw, Loader2 } from "lucide-react";

type Step = "idle" | "sent" | "done";

function sanitizeNext(nextParam: string | null) {
  if (!nextParam) return "/";
  try {
    if (nextParam.startsWith("http://") || nextParam.startsWith("https://")) return "/";
    if (!nextParam.startsWith("/")) return "/";
    return nextParam;
  } catch {
    return "/";
  }
}

export default function SignInClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sanitizeNext(sp.get("next"));

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [resendIn, setResendIn] = useState<number>(0); // seconds
  const [justSent, setJustSent] = useState<boolean>(false); // tiny UX touch for feedback state

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Already authed? redirect
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!cancelled && r.ok) router.replace(next);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  // Resend cooldown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Autofocus phone initially
  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  async function sendOtp() {
    const p = "+91" + phone.trim();
    if (!/^\d{10}$/.test(phone)) {
      setMsg("Please enter a valid 10-digit phone number");
      phoneInputRef.current?.focus();
      return;
    }

    setMsg("");
    setLoading(true);
    setJustSent(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error || "Failed to send OTP");
        return;
      }
      setStep("sent");
      setCode("");
      setMsg(
        `✓ OTP sent successfully${
          process.env.NODE_ENV !== "production" ? " (Dev: 000000)" : ""
        }`
      );
      setResendIn(30);
      setJustSent(true);
      setTimeout(() => {
        otpInputRef.current?.focus();
        setJustSent(false);
      }, 250);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    const p = "+91" + phone.trim();
    const c = code.trim();
    if (!/^\d{6}$/.test(c)) {
      setMsg("Enter the 6-digit OTP");
      otpInputRef.current?.focus();
      return;
    }

    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, code: c }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error || "Invalid or expired code");
        return;
      }
      setStep("done");
      setMsg("✓ Signed in successfully. Redirecting…");
      router.replace(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // Enter key handling for both inputs (and auto-verify on 6 digits)
  function handlePhoneKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === "idle") sendOtp();
      else if (step === "sent") verify();
    }
  }
  function handleOtpKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      verify();
    }
  }

  // Auto-verify when user hits 6 digits
  useEffect(() => {
    if (step === "sent" && code.length === 6 && !loading) {
      verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Paste handling (OTP)
  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text) {
      e.preventDefault();
      setCode(text);
    }
  }

  const phoneValid = /^\d{10}$/.test(phone);
  const canVerify = !loading && code.length >= 4; // allow enter earlier; full check in verify()

  return (
    <>
      <style jsx>{`
        @keyframes elevate {
          from { transform: translateY(6px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .elevate { animation: elevate .35s ease-out both; }
        .card-glass {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
        }
        .accent-ring:focus {
          box-shadow: 0 0 0 4px rgba(239, 51, 64, 0.15);
          outline: none;
        }
      `}</style>

      <main className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo & Title */}
          <div className="text-center elevate" style={{ animationDelay: "40ms" }}>
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/90 shadow-sm">
              <Image
                src="/logo.png"
                alt="Apna Ward"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Sign In</h1>
            <p className="text-slate-600">Use your mobile number to continue</p>
          </div>

          {/* Main Card */}
          <div className="card-glass rounded-3xl shadow-2xl border border-slate-200/60 p-6 sm:p-8 elevate" style={{ animationDelay: "80ms" }}>
            <div className="space-y-5">
              {/* PHONE */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-500 border-r pr-3">
                    <Phone size={18} />
                    <span className="text-sm font-semibold">+91</span>
                  </div>
                  <input
                    ref={phoneInputRef}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={handlePhoneKey}
                    className={`w-full pl-24 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#EF3340] accent-ring transition-all text-base ${step === "done" ? "bg-slate-50 text-slate-500" : "bg-white"}`}
                    placeholder="9999999999"
                    type="tel"
                    inputMode="numeric"
                    disabled={loading || step === "done"}
                    maxLength={10}
                    aria-label="Phone number"
                  />
                </div>
              </div>

              {/* OTP */}
              {step === "sent" && (
                <div className="space-y-2 elevate" style={{ animationDelay: "120ms" }}>
                  <label className="block text-sm font-semibold text-slate-700">Enter OTP</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      ref={otpInputRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={handleOtpKey}
                      onPaste={handleOtpPaste}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#EF3340] accent-ring transition-all text-lg tracking-widest text-center font-semibold bg-white"
                      placeholder="• • • • • •"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      aria-label="One-time password"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <button
                      type="button"
                      className="text-slate-600 hover:text-[#EF3340] underline underline-offset-2"
                      onClick={() => {
                        setStep("idle");
                        setCode("");
                        setMsg("");
                        phoneInputRef.current?.focus();
                      }}
                      disabled={loading}
                    >
                      Change number
                    </button>

                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={loading || resendIn > 0}
                      className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-[#EF3340] disabled:text-slate-400"
                      aria-disabled={loading || resendIn > 0}
                      title={resendIn > 0 ? `Resend available in ${resendIn}s` : "Resend OTP"}
                    >
                      <RefreshCcw size={16} className={justSent ? "animate-spin-slow" : ""} />
                      {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Button */}
              {step !== "done" && (
                <button
                  onClick={step === "sent" ? verify : sendOtp}
                  disabled={
                    loading ||
                    !phoneValid ||
                    (step === "sent" && !canVerify)
                  }
                  className="w-full bg-linear-to-r from-[#EF3340] to-[#C82333] text-white py-3.5 rounded-xl font-semibold hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : step === "sent" ? (
                    <>
                      <Check size={20} />
                      <span>Verify & Continue</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              )}

              {/* Messages */}
              {msg && (
                <div
                  className={`p-3 rounded-xl text-sm ${
                    msg.includes("✓")
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                      : msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")
                      ? "bg-rose-50 text-rose-700 border border-rose-200/70"
                      : "bg-blue-50 text-blue-700 border border-blue-200/70"
                  }`}
                  role="status"
                >
                  {msg}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-500">
            If you don’t have an account, please contact your administrator.
          </p>
        </div>
      </main>

      <style jsx global>{`
        .animate-spin-slow { animation: spin 1.4s linear infinite; }
      `}</style>
    </>
  );
}
