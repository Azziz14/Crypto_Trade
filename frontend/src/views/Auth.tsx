import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import type { OtpChannel } from '../context/AuthContext';
import { Eye, EyeOff, Shield, ArrowLeft, Mail, Lock, Phone } from "lucide-react";
import { Typewriter } from '../components/ui/typewriter-text';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firebaseAuth, firebaseIsConfigured } from '../firebaseConfig';

// Exact quote and cover contents from EaseMize UI
const loginCover = {
  image: "https://i.ibb.co/XrkdGrrv/original-ccdd6d6195fff2386a31b684b7abdd2e-removebg-preview.png",
  quote: {
    text: "Welcome Back! The journey continues.",
    author: "EaseMize UI"
  }
};

const registerCover = {
  image: "https://i.ibb.co/HTZ6DPsS/original-33b8479c324a5448d6145b3cad7c51e7-removebg-preview.png",
  quote: {
    text: "Create an account. A new chapter awaits.",
    author: "EaseMize UI"
  }
};

const otpCover = {
  image: "https://i.ibb.co/XrkdGrrv/original-ccdd6d6195fff2386a31b684b7abdd2e-removebg-preview.png",
  quote: {
    text: "Verification is underway. Pro-grade security shielding your transaction keys.",
    author: "Identity Safeguard"
  }
};

export const Auth: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { initiateLogin, register, verifyOtp, forgotPassword, resetPassword, firebaseLogin } = useAuth();

  // ── Form Mode ────────────────────────────────────────────────────────────────
  const [isLogin, setIsLogin] = useState(true);

  // ── Standard form fields ─────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── OTP Verification screen ──────────────────────────────────────────────────
  const [otpStep, setOtpStep] = useState<{
    email: string;
    channel: OtpChannel;
  } | null>(null);
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [timer, setTimer] = useState(300); // 5 minutes
  const otpInputsRef = useRef<HTMLInputElement[]>([]);

  // ── Forgot-password wizard ───────────────────────────────────────────────────
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'EMAIL' | 'CHANNEL' | 'OTP' | 'RESET' | 'SUCCESS'>('EMAIL');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotChannel, setForgotChannel] = useState<OtpChannel>('EMAIL');
  const [forgotOtp, setForgotOtp] = useState<string[]>(new Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotTimer, setForgotTimer] = useState(300);
  const forgotOtpInputsRef = useRef<HTMLInputElement[]>([]);

  // ── Timers ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!otpStep || timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpStep, timer]);

  useEffect(() => {
    if (!forgotMode || forgotStep !== 'OTP' || forgotTimer <= 0) return;
    const id = setInterval(() => setForgotTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [forgotMode, forgotStep, forgotTimer]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const focusFirst = (refs: React.MutableRefObject<HTMLInputElement[]>) =>
    setTimeout(() => refs.current[0]?.focus(), 100);

  // ── OTP input helpers ─────────────────────────────────────────────────────────
  const makeOtpChange =
    (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, refs: React.MutableRefObject<HTMLInputElement[]>) =>
    (el: HTMLInputElement, idx: number) => {
      const v = el.value;
      if (isNaN(Number(v))) return;
      const next = [...arr];
      next[idx] = v.substring(v.length - 1);
      setArr(next);
      if (v !== '' && idx < 5) refs.current[idx + 1]?.focus();
    };

  const makeOtpKeyDown =
    (arr: string[], refs: React.MutableRefObject<HTMLInputElement[]>) =>
    (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
      if (e.key === 'Backspace' && arr[idx] === '' && idx > 0)
        refs.current[idx - 1]?.focus();
    };

  const makePaste =
    (setArr: React.Dispatch<React.SetStateAction<string[]>>, refs: React.MutableRefObject<HTMLInputElement[]>) =>
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const p = e.clipboardData.getData('text');
      if (p.length === 6 && !isNaN(Number(p))) {
        const digits = p.split('');
        setArr(digits);
        digits.forEach((d, i) => { if (refs.current[i]) refs.current[i].value = d; });
        refs.current[5]?.focus();
      }
    };

  // ── Google Sign-in Handler ────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (!firebaseIsConfigured || !firebaseAuth) {
      setError("Google Sign-In is not configured yet. Please configure your apiKey in src/firebaseConfig.ts");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      await firebaseLogin(idToken);
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Standard form submit (Login or Register) ─────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        // Step 1: Initiate login with Email channel
        const result = await initiateLogin(email, password, 'EMAIL');
        setOtpStep(result);
        setTimer(300);
        setOtp(new Array(6).fill(''));
        focusFirst(otpInputsRef);
      } else {
        // Registration: generate a random phone number behind the scenes so registration succeeds
        const randomPhone = `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`;
        const startBal = 10000000; // default 1 Crore
        await register(email, password, randomPhone, startBal);
        setIsLogin(true);
        setError(null);
        setTimeout(() => {
          setError('✅ Account created! Sign in with your credentials.');
        }, 50);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP submit ────────────────────────────────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code!');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(otpStep!.email, code);
    } catch (err: any) {
      setError(err.message || 'Verification failed!');
    } finally {
      setLoading(false);
    }
  };

  // Determine active visual cover metadata
  let currentCover = loginCover;
  if (otpStep || (forgotMode && forgotStep === 'OTP')) {
    currentCover = otpCover;
  } else if (!isLogin && !forgotMode) {
    currentCover = registerCover;
  }

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2 bg-[#06030a] text-white">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>

      {/* LEFT COLUMN: FORMS */}
      <div className="flex h-screen items-center justify-center p-6 md:h-auto md:p-0 md:py-12 relative overflow-y-auto">
        {/* Glow accents */}
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,176,255,0.05) 0%, transparent 70%)', top: '15%', left: '15%', zIndex: 0, pointerEvents: 'none' }} />

        <div className="w-full max-w-[350px] relative z-10 py-6">

          {/* ── BACK BUTTON ── */}
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '980px',
                padding: '5px 12px 5px 9px',
                fontSize: '13px', fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', marginBottom: '28px',
                transition: 'all 0.15s ease',
                fontFamily: '-apple-system, Inter, sans-serif',
                letterSpacing: '-0.1px',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
            >
              <ArrowLeft size={13} />
              Back
            </button>
          )}

          {error && (
            <div className={`mb-6 p-4 rounded-lg text-xs border text-center ${error.startsWith('✅') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {error}
            </div>
          )}

          {/* OTP STEP */}
          {otpStep ? (
            <div className="flex flex-col gap-6">
              <div className="text-center flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                  <Shield size={28} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Verify Identity</h2>
                <p className="text-sm text-gray-450 leading-relaxed">
                  A 6-digit verification code has been dispatched to your inbox: <strong>{otpStep.email}</strong>. Check your email console log.
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
                <div className="flex justify-between gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { if (el) otpInputsRef.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onPaste={idx === 0 ? makePaste(setOtp, otpInputsRef) : undefined}
                      onChange={e => makeOtpChange(otp, setOtp, otpInputsRef)(e.target, idx)}
                      onKeyDown={e => makeOtpKeyDown(otp, otpInputsRef)(e, idx)}
                      className="w-11 h-12 rounded-lg border border-white/10 bg-black/40 text-center text-lg font-bold focus:border-green-500/60 outline-none transition-all"
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">OTP Session</span>
                  <span className={`font-semibold ${timer <= 60 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                    Expires in {fmt(timer)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading || timer <= 0}
                  style={{
                    width: '100%', height: '40px',
                    background: loading || timer <= 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)',
                    color: loading || timer <= 0 ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '980px', fontSize: '14px', fontWeight: 590,
                    cursor: loading || timer <= 0 ? 'not-allowed' : 'pointer',
                    letterSpacing: '-0.1px', transition: 'all 0.15s ease',
                    fontFamily: '-apple-system, Inter, sans-serif',
                    boxShadow: loading || timer <= 0 ? 'none' : '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                  onMouseEnter={e => { if (!loading && timer > 0) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.35)'; }}}
                  onMouseLeave={e => { if (!loading && timer > 0) { e.currentTarget.style.background = 'rgba(255,255,255,0.92)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)'; }}}
                >
                  {loading ? 'Verifying…' : 'Confirm Security Code'}
                </button>

                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      setError(null);
                      setLoading(true);
                      try {
                        const result = await initiateLogin(email, password, otpStep.channel);
                        setOtpStep(result);
                        setTimer(300);
                        setOtp(new Array(6).fill(''));
                        focusFirst(otpInputsRef);
                      } catch (err: any) { setError(err.message || 'Resend failed!'); }
                      finally { setLoading(false); }
                    }}
                    className="text-blue-400 hover:underline"
                  >
                    Resend OTP Code
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpStep(null); setError(null); }}
                    className="text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Cancel
                  </button>
                </div>
              </form>
            </div>

          /* FORGOT PASSWORD SCREEN */
          ) : forgotMode ? (
            <div className="flex flex-col gap-6">
              {forgotStep === 'EMAIL' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Mail size={28} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Password Recovery</h2>
                    <p className="text-sm text-gray-400">Enter your registered email to continue</p>
                  </div>

                  <form onSubmit={e => { e.preventDefault(); if (!forgotEmail.trim()) { setError('Enter a valid email!'); return; } setError(null); setForgotStep('CHANNEL'); }} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 text-left">
                      <label className="text-sm font-semibold">Email</label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-white/10 bg-[#0c090e] placeholder:text-gray-600 focus-visible:outline-none focus-visible:bg-neutral-900/60 focus:border-white/20 text-sm transition-all"
                      />
                    </div>

                    <button type="submit" style={{
                      width: '100%', height: '40px',
                      background: 'rgba(255,255,255,0.92)', color: '#0a0a0a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '980px', fontSize: '14px', fontWeight: 590,
                      cursor: 'pointer', letterSpacing: '-0.1px',
                      transition: 'all 0.15s ease', fontFamily: '-apple-system, Inter, sans-serif',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.35)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.92)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.3)'; }}
                    >
                      Continue Recovery
                    </button>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(false); setForgotStep('EMAIL'); setForgotEmail(''); setError(null); setIsLogin(true); }}
                      className="text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 mt-2"
                    >
                      <ArrowLeft size={13} /> Back to Login
                    </button>
                  </form>
                </div>
              )}

              {forgotStep === 'CHANNEL' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Shield size={28} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Recovery Method</h2>
                    <p className="text-sm text-gray-400">Select where to receive your OTP code</p>
                  </div>

                  <form onSubmit={async e => {
                    e.preventDefault(); setError(null); setLoading(true);
                    try {
                      await forgotPassword(forgotEmail.trim(), forgotChannel);
                      setForgotStep('OTP'); setForgotTimer(300); setForgotOtp(new Array(6).fill(''));
                      focusFirst(forgotOtpInputsRef);
                    } catch (err: any) { setError(err.message || 'Failed to send code.'); }
                    finally { setLoading(false); }
                  }} className="flex flex-col gap-4">

                    {[{ ch: 'EMAIL' as OtpChannel, label: 'Email Address Inbox', sub: 'OTP will be sent to your email', Icon: Mail, active: forgotChannel === 'EMAIL', accent: 'border-white/25 bg-white/5' },
                      { ch: 'SMS' as OtpChannel, label: 'SMS Mobile Number', sub: 'OTP will be sent to your registered phone number', Icon: Phone, active: forgotChannel === 'SMS', accent: 'border-white/25 bg-white/5' }].map(({ ch, label, sub, Icon, active, accent }) => (
                      <div
                        key={ch}
                        onClick={() => setForgotChannel(ch)}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${active ? accent : 'border-white/10 bg-black/20 hover:border-white/20'}`}
                      >
                        <Icon size={20} className={active ? 'text-blue-400' : 'text-gray-450'} />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold">{label}</div>
                          <div className="text-xs text-gray-500">{sub}</div>
                        </div>
                      </div>
                    ))}

                    <button type="submit" disabled={loading} style={{
                      width: '100%', height: '40px',
                      background: loading ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)',
                      color: loading ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '980px', fontSize: '14px', fontWeight: 590,
                      cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.1px',
                      transition: 'all 0.15s ease', fontFamily: '-apple-system, Inter, sans-serif',
                      boxShadow: loading ? 'none' : '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.35)'; }}}
                      onMouseLeave={e => { if (!loading) { e.currentTarget.style.background='rgba(255,255,255,0.92)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.3)'; }}}
                    >
                      {loading ? 'Sending OTP…' : 'Send Verification OTP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotStep('EMAIL')}
                      className="text-xs text-gray-450 hover:text-white flex items-center justify-center gap-1.5 mt-2"
                    >
                      <ArrowLeft size={13} /> Back
                    </button>
                  </form>
                </div>
              )}

              {forgotStep === 'OTP' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                      <Shield size={28} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Enter OTP Code</h2>
                    <p className="text-sm text-gray-450">Check your messages for recovery code</p>
                  </div>

                  <form onSubmit={e => {
                    e.preventDefault();
                    const code = forgotOtp.join('');
                    if (code.length !== 6) { setError('Please enter the complete 6-digit code!'); return; }
                    setError(null); setForgotStep('RESET');
                  }} className="flex flex-col gap-6">
                    <div className="flex justify-between gap-2">
                      {forgotOtp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => { if (el) forgotOtpInputsRef.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onPaste={idx === 0 ? makePaste(setForgotOtp, forgotOtpInputsRef) : undefined}
                          onChange={e => makeOtpChange(forgotOtp, setForgotOtp, forgotOtpInputsRef)(e.target, idx)}
                          onKeyDown={e => makeOtpKeyDown(forgotOtp, forgotOtpInputsRef)(e, idx)}
                          className="w-12 h-14 rounded-xl border border-white/10 bg-black/40 text-center text-xl font-bold focus:border-blue-500/60 outline-none transition-all"
                        />
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-450">OTP Validity</span>
                      <span className={`font-semibold ${forgotTimer <= 60 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                        Expires in {fmt(forgotTimer)}
                      </span>
                    </div>

                    <button type="submit" style={{
                      width: '100%', height: '40px',
                      background: 'rgba(255,255,255,0.92)', color: '#0a0a0a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '980px', fontSize: '14px', fontWeight: 590,
                      cursor: 'pointer', letterSpacing: '-0.1px',
                      transition: 'all 0.15s ease', fontFamily: '-apple-system, Inter, sans-serif',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.35)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.92)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.3)'; }}
                    >
                      Verify OTP Code
                    </button>

                    <div className="flex justify-between items-center text-xs">
                      <button type="button" disabled={loading} onClick={async () => {
                        setError(null); setLoading(true);
                        try { await forgotPassword(forgotEmail.trim(), forgotChannel); setForgotTimer(300); setForgotOtp(new Array(6).fill('')); focusFirst(forgotOtpInputsRef); }
                        catch (err: any) { setError(err.message || 'Resend failed!'); }
                        finally { setLoading(false); }
                      }} className="text-blue-400 hover:underline">
                        Resend OTP
                      </button>
                      <button type="button" onClick={() => setForgotStep('CHANNEL')} className="text-gray-450 hover:text-white flex items-center gap-1">
                        <ArrowLeft size={12} /> Change Method
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {forgotStep === 'RESET' && (
                <div className="flex flex-col gap-6">
                  <div className="text-center flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Lock size={28} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Create New Password</h2>
                    <p className="text-sm text-gray-450">Enter a new secure password of at least 6 characters</p>
                  </div>

                  <form onSubmit={async e => {
                    e.preventDefault(); setError(null);
                    if (newPassword.length < 6) { setError('Password must be at least 6 characters!'); return; }
                    if (newPassword !== confirmNewPassword) { setError('Passwords do not match!'); return; }
                    setLoading(true);
                    try { await resetPassword(forgotEmail.trim(), forgotOtp.join(''), newPassword); setForgotStep('SUCCESS'); }
                    catch (err: any) { setError(err.message || 'Reset failed. Please check your OTP and try again.'); }
                    finally { setLoading(false); }
                  }} className="flex flex-col gap-4 text-left">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold">New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-white/10 bg-[#0c090e] focus-visible:outline-none focus-visible:bg-neutral-900/60 text-sm transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold">Confirm Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-white/10 bg-[#0c090e] focus-visible:outline-none focus-visible:bg-neutral-900/60 text-sm transition-all"
                      />
                    </div>

                    <button type="submit" disabled={loading} style={{
                      width: '100%', height: '40px',
                      background: loading ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)',
                      color: loading ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '980px', fontSize: '14px', fontWeight: 590,
                      cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.1px',
                      transition: 'all 0.15s ease', fontFamily: '-apple-system, Inter, sans-serif',
                      boxShadow: loading ? 'none' : '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.35)'; }}}
                      onMouseLeave={e => { if (!loading) { e.currentTarget.style.background='rgba(255,255,255,0.92)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.3)'; }}}
                    >
                      {loading ? 'Updating…' : 'Update Password'}
                    </button>
                  </form>
                </div>
              )}

              {forgotStep === 'SUCCESS' && (
                <div className="text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
                    <Shield size={32} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Password Reset Complete!</h2>
                  <p className="text-sm text-gray-450 leading-relaxed max-w-[280px]">
                    Your login security key has been successfully updated.
                  </p>
                  <button
                    onClick={() => { setForgotMode(false); setForgotStep('EMAIL'); setForgotEmail(''); setNewPassword(''); setConfirmNewPassword(''); setIsLogin(true); setError(null); }}
                    style={{
                      width: '100%', height: '40px',
                      background: 'rgba(255,255,255,0.92)', color: '#0a0a0a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '980px', fontSize: '14px', fontWeight: 590,
                      cursor: 'pointer', letterSpacing: '-0.1px',
                      transition: 'all 0.15s ease', fontFamily: '-apple-system, Inter, sans-serif',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.35)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.92)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.3)'; }}
                  >
                    Go back to Sign In
                  </button>
                </div>
              )}
            </div>

          /* MAIN SIGN IN / SIGN UP FORMS */
          ) : (
            <div className="mx-auto grid w-[350px] gap-8">
              
              {/* Toggle-based forms matching EaseMize UI layout */}
              {isLogin ? (
                <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-6 text-left">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Sign in to your account</h1>
                    <p className="text-sm text-[#94a3b8]/70">Enter your email below to sign in</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="email" className="text-sm font-medium">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-white/10 bg-[#0c090e] px-3 py-3 text-sm text-foreground shadow-sm placeholder:text-gray-650 focus-visible:bg-neutral-900/60 focus-visible:outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center">
                        <label htmlFor="password" className="text-sm font-medium">Password</label>
                        <button
                          type="button"
                          onClick={() => { setForgotMode(true); setForgotStep('EMAIL'); setError(null); }}
                          className="text-xs text-gray-450 hover:text-white"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="flex h-10 w-full rounded-lg border border-white/10 bg-[#0c090e] px-3 py-3 pr-10 text-sm text-foreground shadow-sm placeholder:text-gray-650 focus-visible:bg-neutral-900/60 focus-visible:outline-none focus:border-white/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-muted-foreground/80 hover:text-foreground transition-all outline-none"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%', height: '40px',
                        background: loading ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)',
                        color: loading ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '980px', fontSize: '14px', fontWeight: 590,
                        marginTop: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.1px',
                        transition: 'all 0.15s ease', fontFamily: '-apple-system, Inter, sans-serif',
                        boxShadow: loading ? 'none' : '0 1px 4px rgba(0,0,0,0.3)',
                      }}
                      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.35)'; }}}
                      onMouseLeave={e => { if (!loading) { e.currentTarget.style.background='rgba(255,255,255,0.92)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.3)'; }}}
                    >
                      {loading ? 'Processing…' : 'Sign In'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-6 text-left">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Create an account</h1>
                    <p className="text-sm text-[#94a3b8]/70">Enter your details below to sign up</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-white/10 bg-[#0c090e] px-3 py-3 text-sm text-foreground shadow-sm placeholder:text-gray-650 focus-visible:bg-neutral-900/60 focus-visible:outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="email" className="text-sm font-medium">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-white/10 bg-[#0c090e] px-3 py-3 text-sm text-foreground shadow-sm placeholder:text-gray-650 focus-visible:bg-neutral-900/60 focus-visible:outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <label htmlFor="password" className="text-sm font-medium">Password</label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          required
                          autoComplete="new-password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="flex h-10 w-full rounded-lg border border-white/10 bg-[#0c090e] px-3 py-3 pr-10 text-sm text-foreground shadow-sm placeholder:text-gray-650 focus-visible:bg-neutral-900/60 focus-visible:outline-none focus:border-white/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-muted-foreground/80 hover:text-foreground transition-all outline-none"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%', height: '40px',
                        background: loading ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)',
                        color: loading ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '980px', fontSize: '14px', fontWeight: 590,
                        marginTop: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.1px',
                        transition: 'all 0.15s ease', fontFamily: '-apple-system, Inter, sans-serif',
                        boxShadow: loading ? 'none' : '0 1px 4px rgba(0,0,0,0.3)',
                      }}
                      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.35)'; }}}
                      onMouseLeave={e => { if (!loading) { e.currentTarget.style.background='rgba(255,255,255,0.92)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.3)'; }}}
                    >
                      {loading ? 'Processing…' : 'Sign Up'}
                    </button>
                  </div>
                </form>
              )}

              {/* Toggling link and OAuth continues */}
              <div className="flex flex-col gap-4">
                <div className="text-center text-sm text-gray-400">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    onClick={() => { setIsLogin(prev => !prev); setError(null); }}
                    className="pl-1 text-white font-bold hover:underline"
                  >
                    {isLogin ? "Sign up" : "Sign in"}
                  </button>
                </div>
                
                <div className="relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-white/5">
                  <span className="relative z-10 bg-[#06030a] px-2 text-[#94a3b8]/50">Or continue with</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  style={{
                    width: '100%', height: '40px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '980px', fontSize: '14px', fontWeight: 500,
                    color: 'rgba(255,255,255,0.85)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.15s ease', fontFamily: '-apple-system, Inter, sans-serif',
                    letterSpacing: '-0.1px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.18)'; e.currentTarget.style.color='#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.10)'; e.currentTarget.style.color='rgba(255,255,255,0.85)'; }}
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google icon" style={{ width: '16px', height: '16px' }} />
                  Continue with Google
                </button>
              </div>

              {/* Admin Banner details */}
              <div className="p-3 rounded-lg border border-dashed border-blue-500/20 bg-blue-500/5 text-[11px] text-gray-500 text-left leading-relaxed">
                <strong className="text-blue-400">Dev tip:</strong> Log in with <span className="text-blue-400 font-semibold">admin@crypto.com</span> to automatically access administrative simulation tools.
              </div>

            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: BEAUTIFUL ASTRO COVER */}
      <div
        className="hidden md:block relative bg-cover bg-center transition-all duration-500 ease-in-out"
        style={{ backgroundImage: `url(${currentCover.image})` }}
        key={currentCover.image}
      >
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-black/15" />

        {/* Shadow Vignette bottom transition */}
        <div className="absolute inset-x-0 bottom-0 h-[220px] bg-gradient-to-t from-[#06030a] via-[#06030a]/80 to-transparent" />

        {/* Quote Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-end p-8 pb-12">
          <blockquote className="space-y-2 text-center max-w-[420px]">
            <p className="text-lg font-medium text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] leading-relaxed italic">
              "<Typewriter
                key={currentCover.quote.text}
                text={currentCover.quote.text}
                speed={50}
              />"
            </p>
            <cite className="block text-sm font-light text-gray-450 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] not-italic">
              — {currentCover.quote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
};
