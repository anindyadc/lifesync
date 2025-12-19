import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  User, 
  LogOut, 
  CheckCircle, 
  Wallet, 
  Loader2, 
  Server, 
  ShieldAlert, 
  Shield, 
  PiggyBank // New icon for Investments
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from './lib/firebase';

import Layout from './components/Layout';
import AuthScreen from './components/AuthScreen';
import TaskFlowApp from './apps/taskflow';
import WalletWatchApp from './apps/walletwatch';
import ChangeManagerApp from './apps/changemanager';
import IncidentLoggerApp from './apps/incidentlogger';
import AdminPanelApp from './apps/admin';
import InvestmentsApp from './apps/investments'; // New app import

/**
 * Main Application Shell
 * Integrated with the User-Based Access Control system.
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeApp, setActiveApp] = useState('dashboard');

  const appId = 'default-app-id';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'userProfiles', currentUser.uid);
          const snap = await getDoc(profileRef);
          
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
          console.error("Error fetching user profile:", error);
          setUserProfile({ role: 'user', allowedApps: [] });
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-indigo-600">
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const displayName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const isAllowed = (appKey) => userProfile?.allowedApps?.includes(appKey) || userProfile?.role === 'admin';
  const isAdmin = userProfile?.role === 'admin';

  const renderContent = () => {
    switch (activeApp) {
      case 'taskflow': return isAllowed('taskflow') ? <TaskFlowApp user={user} /> : null;
      case 'walletwatch': return isAllowed('walletwatch') ? <WalletWatchApp user={user} /> : null;
      case 'changemanager': return isAllowed('changemanager') ? <ChangeManagerApp user={user} /> : null;
      case 'incidentlogger': return isAllowed('incidentlogger') ? <IncidentLoggerApp user={user} /> : null;
      case 'investments': return isAllowed('investments') ? <InvestmentsApp user={user} /> : null; // New app case
      case 'admin': return isAdmin ? <AdminPanelApp /> : null;
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
                <h3 className="text-xl font-bold text-slate-800">ServerLog</h3>
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

            {isAllowed('investments') && (
              <button onClick={() => setActiveApp('investments')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all text-left group relative overflow-hidden">
                <PiggyBank size={100} className="absolute -right-4 -bottom-4 opacity-5 text-amber-500"/>
                <PiggyBank size={24} className="text-amber-500 mb-4"/>
                <h3 className="text-xl font-bold text-slate-800">Investments</h3>
                <p className="text-xs text-slate-400">Track savings & maturities</p>
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
    <Layout>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
        <nav className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 overflow-y-auto no-scrollbar">
          <div className="p-6">
            <div className="flex items-center gap-3 text-white mb-8">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg"><LayoutGrid size={20} /></div>
              <span className="font-bold text-lg tracking-tight">LifeSync</span>
            </div>
            
            <div className="space-y-1">
              <button onClick={() => setActiveApp('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${activeApp === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white transition-colors'}`}>
                <LayoutGrid size={18} /> Dashboard
              </button>
              
              <div className="pt-6 pb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-4">Workspace</div>
              
              {isAllowed('taskflow') && <button onClick={() => setActiveApp('taskflow')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors ${activeApp === 'taskflow' ? 'text-indigo-400 bg-slate-800 font-bold border border-indigo-500/20' : ''}`}><CheckCircle size={18} /> TaskFlow</button>}
              {isAllowed('walletwatch') && <button onClick={() => setActiveApp('walletwatch')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors ${activeApp === 'walletwatch' ? 'text-indigo-400 bg-slate-800 font-bold border border-indigo-500/20' : ''}`}><Wallet size={18} /> WalletWatch</button>}
              {isAllowed('changemanager') && <button onClick={() => setActiveApp('changemanager')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors ${activeApp === 'changemanager' ? 'text-indigo-400 bg-slate-800 font-bold border border-indigo-500/20' : ''}`}><Server size={18} /> ServerLog</button>}
              {isAllowed('incidentlogger') && <button onClick={() => setActiveApp('incidentlogger')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors ${activeApp === 'incidentlogger' ? 'text-indigo-400 bg-slate-800 font-bold border border-indigo-500/20' : ''}`}><ShieldAlert size={18} /> Incidents</button>}
              {isAllowed('investments') && <button onClick={() => setActiveApp('investments')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors ${activeApp === 'investments' ? 'text-amber-400 bg-slate-800 font-bold border border-amber-500/20' : ''}`}><PiggyBank size={18} /> Investments</button>}
              {isAdmin && <button onClick={() => setActiveApp('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 border border-indigo-500/20 mt-4 text-indigo-400 transition-all ${activeApp === 'admin' ? 'bg-indigo-600 text-white border-transparent' : ''}`}><Shield size={18} /> Admin Hub</button>}
            </div>
          </div>
          
          <div className="mt-auto p-6 border-t border-slate-800 flex flex-col gap-4 bg-slate-900/50">
            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/30">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md">
                <User size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 py-2 rounded-lg transition-all font-bold">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </nav>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen bg-slate-50">
          <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4 font-sans">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 capitalize tracking-tight">
                {activeApp === 'dashboard' ? 'Workspace Overview' : (activeApp === 'admin' ? 'Admin Hub' : activeApp)}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeApp === 'dashboard' ? `Welcome back, ${displayName}!` : `Manage your ${activeApp === 'admin' ? 'team and app' : activeApp} activities.`}
              </p>
            </div>
            <div className="hidden md:block text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-xl shadow-sm border">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </header>
          {renderContent()}
        </main>
      </div>
    </Layout>
  );
}
