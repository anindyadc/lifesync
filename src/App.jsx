import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  Wallet,
  Loader2,
  Server,
  ShieldAlert,
  Shield,
  PiggyBank,
  Stethoscope,
  Menu,
  Lock
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from './lib/firebase';

import AuthScreen from './components/AuthScreen';
import ErrorBoundary from './components/ErrorBoundary';
import TaskFlowApp from './apps/taskflow';
import WalletWatchApp from './apps/walletwatch';
import ChangeManagerApp from './apps/changemanager';
import IncidentLoggerApp from './apps/incidentlogger';
import AdminPanelApp from './apps/admin';
import InvestmentsApp from './apps/investment';
import MediWatchApp from './apps/mediwatch';

import Sidebar from './components/Sidebar';

const AccessDenied = ({ appLabel }) => (
  <div className="flex flex-col items-center justify-center text-center bg-white p-12 rounded-2xl shadow-sm border border-slate-100 mt-6">
    <Lock size={32} className="text-slate-300 mb-4" />
    <h2 className="text-lg font-bold text-slate-800">Access removed</h2>
    <p className="text-sm text-slate-500 mt-1 max-w-sm">
      Your account no longer has access to {appLabel}. Ask an admin to re-grant it if this is unexpected.
    </p>
  </div>
);


/**
 * Main Application Shell
 * Integrated with the User-Based Access Control system.
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeApp, setActiveApp] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const appId = 'default-app-id';

  useEffect(() => {
    // `latestUid` guards against a slower earlier callback resolving after a
    // faster later one (e.g. rapid sign-out/sign-in of a different user) and
    // overwriting fresh state with stale profile data.
    let cancelled = false;
    let latestUid = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const callUid = currentUser?.uid ?? null;
      latestUid = callUid;
      setLoadingProfile(true);

      if (currentUser) {
        setUser(currentUser);
        try {
          const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'userProfiles', currentUser.uid);
          const snap = await getDoc(profileRef);
          if (cancelled || latestUid !== callUid) return;

          if (snap.exists()) {
            setUserProfile(snap.data());
          } else {
            setUserProfile({
              role: 'user',
              allowedApps: [],
              displayName: currentUser.displayName
            });
          }
        } catch (error) {
          if (cancelled || latestUid !== callUid) return;
          console.error("App.jsx: Critical error fetching user profile:", error);
          setUserProfile({ role: 'user', allowedApps: [] });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }

      if (cancelled || latestUid !== callUid) return;
      setLoadingAuth(false);
      setLoadingProfile(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleSignOut = () => {
    signOut(auth);
  };

  const displayName = useMemo(
    () => userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User',
    [userProfile?.displayName, user?.displayName, user?.email]
  );
  const isAdmin = userProfile?.role === 'admin';
  const isAllowed = useMemo(() => {
    const allowedApps = userProfile?.allowedApps;
    return (appKey) => isAdmin || (allowedApps?.includes(appKey) ?? false);
  }, [userProfile?.allowedApps, isAdmin]);

  const isLoading = loadingAuth || loadingProfile;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-indigo-600">
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const handleAppSwitch = (app) => {
    setActiveApp(app);
    setSidebarOpen(false); // Close sidebar on app selection
  };

  const renderContent = () => {
    switch (activeApp) {
      case 'taskflow': return isAllowed('taskflow') ? <TaskFlowApp user={user} /> : <AccessDenied appLabel="TaskFlow" />;
      case 'walletwatch': return isAllowed('walletwatch') ? <WalletWatchApp user={user} /> : <AccessDenied appLabel="WalletWatch" />;
      case 'changemanager': return isAllowed('changemanager') ? <ChangeManagerApp user={user} /> : <AccessDenied appLabel="ChangeLog" />;
      case 'incidentlogger': return isAllowed('incidentlogger') ? <IncidentLoggerApp user={user} /> : <AccessDenied appLabel="Incidents" />;
      case 'investment': return isAllowed('investment') ? <InvestmentsApp user={user} /> : <AccessDenied appLabel="Investments" />;
      case 'mediwatch': return isAllowed('mediwatch') ? <MediWatchApp user={user} /> : <AccessDenied appLabel="MediWatch" />;
      case 'admin': return isAdmin ? <AdminPanelApp /> : <AccessDenied appLabel="the Admin Hub" />;
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {isAllowed('taskflow') && (
              <button onClick={() => setActiveApp('taskflow')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                <CheckCircle size={100} className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500"/>
                <CheckCircle size={24} className="text-emerald-500 mb-4"/>
                <h3 className="text-xl font-bold text-slate-800">TaskFlow</h3>
                <p className="text-xs text-slate-400">Team tasks & productivity</p>
              </button>
            )}

            {isAllowed('walletwatch') && (
              <button onClick={() => setActiveApp('walletwatch')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                <Wallet size={100} className="absolute -right-4 -bottom-4 opacity-5 text-indigo-500"/>
                <Wallet size={24} className="text-indigo-500 mb-4"/>
                <h3 className="text-xl font-bold text-slate-800">WalletWatch</h3>
                <p className="text-xs text-slate-400">Expense & budget tracking</p>
              </button>
            )}

            {isAllowed('changemanager') && (
              <button onClick={() => setActiveApp('changemanager')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                <Server size={100} className="absolute -right-4 -bottom-4 opacity-5 text-blue-500"/>
                <Server size={24} className="text-blue-500 mb-4"/>
                <h3 className="text-xl font-bold text-slate-800">ChangeLog</h3>
                <p className="text-xs text-slate-400">Infrastructure changes</p>
              </button>
            )}

            {isAllowed('incidentlogger') && (
              <button onClick={() => setActiveApp('incidentlogger')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                <ShieldAlert size={100} className="absolute -right-4 -bottom-4 opacity-5 text-red-500"/>
                <ShieldAlert size={24} className="text-red-500 mb-4"/>
                <h3 className="text-xl font-bold text-slate-800">Incidents</h3>
                <p className="text-xs text-slate-400">Fault reports & resolutions</p>
              </button>
            )}

            {isAllowed('investment') && (
              <button onClick={() => setActiveApp('investment')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                <PiggyBank size={100} className="absolute -right-4 -bottom-4 opacity-5 text-amber-500"/>
                <PiggyBank size={24} className="text-amber-500 mb-4"/>
                <h3 className="text-xl font-bold text-slate-800">Investments</h3>
                <p className="text-xs text-slate-400">Track savings & maturities</p>
              </button>
            )}

            {isAllowed('mediwatch') && (
              <button onClick={() => setActiveApp('mediwatch')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                <Stethoscope size={100} className="absolute -right-4 -bottom-4 opacity-5 text-teal-500"/>
                <Stethoscope size={24} className="text-teal-500 mb-4"/>
                <h3 className="text-xl font-bold text-slate-800">MediWatch</h3>
                <p className="text-xs text-slate-400">Prescriptions & medicines</p>
              </button>
            )}

            {isAdmin && (
              <button onClick={() => setActiveApp('admin')} className="bg-slate-800 p-6 rounded-2xl shadow-xl transition-all text-left group relative overflow-hidden text-white hover:bg-slate-900">
                <Shield size={100} className="absolute -right-4 -bottom-4 opacity-10"/>
                <Shield size={24} className="text-indigo-400 mb-4"/>
                <h3 className="text-xl font-bold">Admin Hub</h3>
                <p className="text-xs text-slate-400">Manage permissions</p>
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      <div className={`fixed inset-0 z-20 md:relative md:flex flex-col md:w-64 ${isSidebarOpen ? 'flex' : 'hidden'}`}>
        <Sidebar
          activeApp={activeApp}
          setActiveApp={handleAppSwitch}
          user={user}
          userProfile={userProfile}
          handleSignOut={handleSignOut}
        />
      </div>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen bg-slate-50">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4 font-sans">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 rounded-md bg-slate-200"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 capitalize tracking-tight">
                {activeApp === 'dashboard' ? 'Workspace Overview' : (activeApp === 'admin' ? 'Admin Hub' : activeApp === 'investment' ? 'Investments' : activeApp === 'mediwatch' ? 'MediWatch' : activeApp)}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeApp === 'dashboard' ? `Welcome back, ${displayName}!` : `Manage your ${activeApp === 'admin' ? 'team and app' : activeApp === 'investment' ? 'Investments' : activeApp === 'mediwatch' ? 'MediWatch' : activeApp} activities.`}
              </p>
            </div>
          </div>
          <div className="hidden md:block text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-xl shadow-sm border">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>
        <ErrorBoundary key={activeApp}>
          {renderContent()}
        </ErrorBoundary>
      </main>
    </div>
  );
}
