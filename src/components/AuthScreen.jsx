import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Layers, CheckCircle, Eye, EyeOff, Wallet, ListChecks, ShieldCheck, Pill } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const APP_ID = 'default-app-id';

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (name) {
          await updateProfile(user, { displayName: name });
        }

        const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'userProfiles', user.uid);
        await setDoc(profileRef, {
          uid: user.uid,
          email: user.email,
          displayName: name || 'New User',
          role: 'user', 
          allowedApps: [], 
          joinedAt: serverTimestamp()
        });
      }
    } catch (err) {
      let msg = "Authentication failed. Please try again.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') msg = "Invalid email or password.";
      if (err.code === 'auth/email-already-in-use') msg = "An account with this email already exists.";
      if (err.code === 'auth/weak-password') msg = "Password must be at least 6 characters long.";
      if (err.code === 'auth/too-many-requests') msg = "Too many attempts. Please wait a moment and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    if (!email) {
      setError('Enter your email address above, then click "Forgot Password?" again.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo('Password reset email sent — check your inbox.');
    } catch (err) {
      console.error('Failed to send password reset email:', err);
      setError('Could not send reset email. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fieldWrap = 'group flex items-center w-full px-4 h-12 rounded-xl border border-input bg-background/60 transition-all focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 hover:border-primary/40';
  const inputCls = 'flex-1 min-w-0 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/60';
  const iconCls = 'text-muted-foreground group-focus-within:text-primary transition-colors mr-3 shrink-0';
  const labelCls = 'block text-sm font-semibold text-foreground mb-1.5';

  const getStrength = (pw) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
      { label: 'Too short', bar: 'bg-red-500' },
      { label: 'Weak', bar: 'bg-red-500' },
      { label: 'Fair', bar: 'bg-amber-500' },
      { label: 'Good', bar: 'bg-emerald-500' },
      { label: 'Strong', bar: 'bg-emerald-600' },
    ];
    return { score, ...levels[score] };
  };
  const strength = getStrength(password);

  const features = [
    { icon: ListChecks, text: 'Plan tasks and track your time' },
    { icon: Wallet, text: 'Understand where your money goes' },
    { icon: Pill, text: 'Keep health records in one place' },
    { icon: ShieldCheck, text: 'Private, secure and synced everywhere' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white px-6 py-10 lg:p-14 flex flex-col justify-between">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg ring-1 ring-white/30">
            <Layers size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight">LifeSync</span>
        </div>
        <div className="relative z-10 mt-8 lg:mt-0">
          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Your whole life,<br className="hidden lg:block" /> in sync.
          </h1>
          <p className="mt-3 text-white/80 text-base lg:text-lg max-w-md">
            Tasks, money, health and more, together in one simple hub.
          </p>
          <ul className="hidden lg:block mt-10 space-y-4">
            {features.map((f) => { const FeatureIcon = f.icon; const text = f.text; return (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="w-9 h-9 rounded-lg bg-white/15 ring-1 ring-white/20 flex items-center justify-center shrink-0"><FeatureIcon size={18} /></span>
                {text}
              </li>
            ); })}
          </ul>
        </div>
        <p className="relative z-10 hidden lg:block text-sm text-white/60">© {new Date().getFullYear()} LifeSync</p>
      </div>

      {/* Form panel */}
      <div className="relative overflow-hidden flex flex-col items-center justify-center px-4 pb-8 pt-0 sm:p-10 -mt-6 lg:mt-0 bg-muted/40 min-h-[calc(100dvh-14rem)] lg:min-h-screen">
        {/* Decorative backdrop: dot grid + soft colour glows */}
        <div aria-hidden="true" className="absolute inset-0 opacity-60 [background-image:radial-gradient(hsl(var(--muted-foreground)/0.25)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div aria-hidden="true" className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl shadow-indigo-500/10 border border-border overflow-hidden">
          <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
          <div className="p-6 sm:p-9">
          {/* Sign in / Sign up switch */}
          <div role="tablist" aria-label="Authentication mode" className="grid grid-cols-2 p-1 mb-7 rounded-xl bg-muted">
            {[{ label: 'Sign In', value: true }, { label: 'Sign Up', value: false }].map((tab) => (
              <button key={tab.label} type="button" role="tab" aria-selected={isLogin === tab.value}
                onClick={() => { setIsLogin(tab.value); setError(''); setInfo(''); }}
                className={`h-10 rounded-lg text-sm font-semibold transition-all ${isLogin === tab.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-7">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              {isLogin ? <Lock size={22} /> : <User size={22} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                {isLogin ? 'Sign in to continue to your dashboard.' : 'It only takes a minute to get started.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div role="alert" className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" /> {error}
              </div>
            )}
            {info && (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 text-sm rounded-xl flex items-center gap-2">
                <CheckCircle size={16} className="shrink-0" /> {info}
              </div>
            )}

            {!isLogin && (
              <div>
                <label htmlFor="name" className={labelCls}>Full Name</label>
                <div className={fieldWrap}>
                  <User className={iconCls} size={18} />
                  <input required type="text" id="name" autoComplete="name" value={name}
                    onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className={labelCls}>Email</label>
              <div className={fieldWrap}>
                <Mail className={iconCls} size={18} />
                <input required type="email" id="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={labelCls}>Password</label>
              <div className={fieldWrap}>
                <Lock className={iconCls} size={18} />
                <input required type={showPassword ? 'text' : 'password'} id="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="ml-2 p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isLogin && password && (
                <div className="mt-2" aria-live="polite">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.bar : 'bg-muted'}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Password strength: <span className="font-semibold text-foreground">{strength.label}</span></p>
                </div>
              )}
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                    {rememberMe && <CheckCircle size={14} className="text-primary-foreground" />}
                  </span>
                  <input type="checkbox" className="sr-only" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span className="text-sm text-muted-foreground font-medium">Remember me</span>
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-sm text-primary font-semibold hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : (<>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>)}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            Secured with encrypted authentication
          </div>
          </div>
        </div>
        <p className="relative mt-6 text-xs text-muted-foreground lg:hidden">© {new Date().getFullYear()} LifeSync</p>
      </div>
    </div>
  );
};

export default AuthScreen;
