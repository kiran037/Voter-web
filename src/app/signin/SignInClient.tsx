// src/app/signin/SignInClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Phone, Lock, Check, ArrowRight } from "lucide-react";

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
    return () => { cancelled = true; };
  }, [router, next]);

  async function sendOtp() {
    const p = "+91" + phone.trim();
    if (!phone.trim()) { setMsg("Please enter phone number"); return; }

    setMsg(""); setLoading(true);
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
      setMsg(`✓ OTP sent successfully${process.env.NODE_ENV !== "production" ? " (Dev: 000000)" : ""}`);
      setTimeout(() => otpInputRef.current?.focus(), 0);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    const p = "+91" + phone.trim();
    const c = code.trim();
    if (!c) { setMsg("Enter the OTP"); return; }

    setMsg(""); setLoading(true);
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

  function handleOtpKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); verify(); }
  }

  return (
    <>
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .slide-up { animation: slideUp 0.4s ease-out; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
      `}</style>

      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8 slide-up">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <Image
                src="/logo.png"
                alt="Udaipur Voters"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
            <p className="text-gray-600">Login with your phone number to continue</p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 slide-up">
            <div className="space-y-4">
              {/* Phone Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-500 border-r pr-3">
                    <Phone size={18} /><span className="text-sm font-medium">+91</span>
                  </div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full pl-24 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none transition-colors"
                    placeholder="9999999999"
                    type="tel"
                    inputMode="numeric"
                    disabled={loading || step === "done"}
                    maxLength={10}
                  />
                </div>
              </div>

              {/* OTP Input */}
              {step === "sent" && (
                <div className="space-y-2 fade-in">
                  <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      ref={otpInputRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={handleOtpKey}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none tracking-widest text-center text-lg font-semibold transition-colors"
                      placeholder="• • • • • •"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {step !== "done" && (
                <button
                  onClick={step === "sent" ? verify : sendOtp}
                  disabled={loading || !phone.trim() || phone.length !== 10 || (step === "sent" && code.length < 4)}
                  className="w-full bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <span>Processing...</span>
                  ) : step === "sent" ? (
                    <>
                      <Check size={20} />
                      <span>Verify & Continue</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              )}

              {/* Message */}
              {msg && (
                <div
                  className={`p-3 rounded-xl text-sm fade-in ${
                    msg.includes("✓")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : msg.toLowerCase().includes("not found")
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {msg}
                </div>
              )}

              {/* Resend OTP */}
              {step === "sent" && (
                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full text-sm text-gray-600 hover:text-[#EF3340] transition-colors underline"
                >
                  Didn&apos;t receive? Resend OTP
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            If you don’t have an account, please contact your administrator.
          </p>
        </div>
      </main>
    </>
  );
}
