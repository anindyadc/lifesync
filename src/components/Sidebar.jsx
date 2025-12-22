import React from 'react';
import { 
  LayoutGrid, 
  User, 
  LogOut, 
  CheckCircle, 
  Wallet, 
  Server, 
  ShieldAlert, 
  Shield, 
  PiggyBank 
} from 'lucide-react';

const Sidebar = ({ activeApp, setActiveApp, user, userProfile, handleSignOut }) => {
  const isAllowed = (appKey) => userProfile?.allowedApps?.includes(appKey) || userProfile?.role === 'admin';
  const isAdmin = userProfile?.role === 'admin';
  const displayName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
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
        <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 py-2 rounded-lg transition-all font-bold">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
