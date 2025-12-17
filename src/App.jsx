import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  User, 
  LogOut, 
  CheckCircle, 
  Wallet, // Updated icon
  Server, // New icon for ServerLog
  Loader2 
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';

// Components
import AuthScreen from './components/AuthScreen';

// App Modules
import TaskFlowApp from './apps/taskflow'; 
import WalletWatchApp from './apps/walletwatch'; 
import ChangeManagerApp from './apps/changemanager'; // New App

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeApp, setActiveApp] = useState('dashboard');

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
    return <AuthScreen onLogin={setUser} />;
  }

  const renderContent = () => {
    switch (activeApp) {
      case 'taskflow':
        return <TaskFlowApp user={user} />;
      case 'walletwatch':
        return <WalletWatchApp user={user} />;
      case 'changemanager':
        return <ChangeManagerApp user={user} />;
      default:
        // Main Dashboard Launcher
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {/* TaskFlow Card */}
            <button 
              onClick={() => setActiveApp('taskflow')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-emerald-100 hover:border-emerald-200 transition-all text-left group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CheckCircle size={100} className="text-emerald-500" />
              </div>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1 relative z-10">TaskFlow</h3>
              <p className="text-slate-500 text-sm relative z-10">Manage projects and personal todos efficiently.</p>
            </button>

            {/* WalletWatch Card */}
            <button 
              onClick={() => setActiveApp('walletwatch')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-100 hover:border-indigo-200 transition-all text-left group relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet size={100} className="text-indigo-500" />
              </div>
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10">
                <Wallet size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1 relative z-10">WalletWatch</h3>
              <p className="text-slate-500 text-sm relative z-10">Track expenses and monitor your budget.</p>
            </button>

            {/* ServerLog Card */}
            <button 
              onClick={() => setActiveApp('changemanager')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-100 hover:border-blue-200 transition-all text-left group relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Server size={100} className="text-blue-500" />
              </div>
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10">
                <Server size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1 relative z-10">ServerLog</h3>
              <p className="text-slate-500 text-sm relative z-10">Track IT infrastructure changes and history.</p>
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-3 text-white mb-8">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-900/50">
              <LayoutGrid size={20} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">LifeSync</span>
          </div>
          
          <div className="space-y-1">
            <button 
              onClick={() => setActiveApp('dashboard')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeApp === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <LayoutGrid size={18} /> Dashboard
            </button>
            
            <div className="pt-6 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500 pl-4">Apps</div>
            
            <button 
              onClick={() => setActiveApp('taskflow')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeApp === 'taskflow' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <CheckCircle size={18} /> TaskFlow
            </button>
            
            <button 
              onClick={() => setActiveApp('walletwatch')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeApp === 'walletwatch' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Wallet size={18} /> WalletWatch
            </button>

            <button 
              onClick={() => setActiveApp('changemanager')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeApp === 'changemanager' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Server size={18} /> ServerLog
            </button>
          </div>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md">
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.displayName || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)} 
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 py-2 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen bg-slate-50">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 capitalize tracking-tight">
              {activeApp === 'dashboard' ? 'Workspace Overview' : activeApp === 'changemanager' ? 'ServerLog' : activeApp}
            </h1>
            <p className="text-slate-500 mt-1">
              {activeApp === 'dashboard' 
                ? 'Welcome back! Here is what is happening today.' 
                : `Manage your ${activeApp} activities.`}
            </p>
          </div>
          <div className="hidden md:block text-right bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-sm font-medium text-slate-600">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}
