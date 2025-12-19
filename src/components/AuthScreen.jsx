import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Layers, CheckCircle } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Form, FormGroup, Label, Input, Button } from './Form';

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const APP_ID = 'default-app-id';

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans text-foreground">
      <div className="bg-card max-w-md w-full rounded-2xl shadow-lg border border-border overflow-hidden">
        <div className="bg-primary/90 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-primary opacity-20 transform -skew-y-6 origin-top-left"></div>
          <div className="relative z-10 text-primary-foreground">
            <div className="bg-primary-foreground/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-lg">
              <Layers size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">LifeSync</h1>
            <p className="text-primary-foreground/80 mt-2 font-medium">Your All-in-One Hub</p>
          </div>
        </div>
        
        <div className="p-8">
          <Form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {!isLogin && (
              <FormGroup>
                <Label htmlFor="name">Full Name</Label>
                <div className="flex items-center w-full px-3 py-2 border border-input rounded-xl bg-card focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
                  <User className="text-muted-foreground mr-3 shrink-0" size={20} />
                  <Input 
                    required 
                    type="text"
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Full Name" 
                    className="flex-1 border-none focus:ring-0 px-0 py-0 text-foreground"
                  />
                </div>
              </FormGroup>
            )}
            
            <FormGroup>
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center w-full px-3 py-2 border border-input rounded-xl bg-card focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
                <Mail className="text-muted-foreground mr-3 shrink-0" size={20} />
                <Input 
                  required 
                  type="email"
                  id="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Email Address" 
                  className="flex-1 border-none focus:ring-0 px-0 py-0 text-foreground"
                />
              </div>
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="password">Password</Label>
              <div className="flex items-center w-full px-3 py-2 border border-input rounded-xl bg-card focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
                <Lock className="text-muted-foreground mr-3 shrink-0" size={20} />
                <Input 
                  required 
                  type="password"
                  id="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Password" 
                  className="flex-1 border-none focus:ring-0 px-0 py-0 text-foreground"
                />
              </div>
            </FormGroup>

            {isLogin && (
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                    {rememberMe && <CheckCircle size={14} className="text-primary-foreground" />}
                  </div>
                  <input type="checkbox" className="sr-only" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span className="text-sm text-muted-foreground font-medium">Remember me</span>
                </Label>
                <button type="button" className="text-sm text-primary font-bold hover:underline">
                  Forgot Password?
                </button>
              </div>
            )}

            <Button
              disabled={loading} 
              className="w-full py-3.5 font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'} 
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </Form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }} 
                className="text-primary font-bold hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
