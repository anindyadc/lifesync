import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Users, Shield, ShieldCheck, ShieldAlert, Check, Save, Loader2, Search } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const APPS_LIST = [
  { id: 'taskflow', label: 'TaskFlow', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'walletwatch', label: 'WalletWatch', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'investment', label: 'Investment', color: 'bg-rose-100 text-rose-700' },
  { id: 'changemanager', label: 'ChangeLog', color: 'bg-blue-100 text-blue-700' },
  { id: 'incidentlogger', label: 'Incidents', color: 'bg-red-100 text-red-700' },
  { id: 'mediwatch', label: 'MediWatch', color: 'bg-teal-100 text-teal-700' },
];

const UserRow = memo(({ user, isSaving, onToggleRole, onToggleApp, onSave }) => (
  <tr className="hover:bg-slate-50 transition-colors">
    <td className="px-6 py-4">
      <div className="font-bold text-slate-800">{user.displayName}</div>
      <div className="text-xs text-slate-400">{user.email}</div>
    </td>
    <td className="px-6 py-4">
      <button
        onClick={() => onToggleRole(user.id)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
          user.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {user.role === 'admin' ? <ShieldCheck size={12}/> : <ShieldAlert size={12}/>}
        {user.role}
      </button>
    </td>
    <td className="px-6 py-4">
      <div className="flex flex-wrap justify-center gap-2">
        {APPS_LIST.map(app => (
          <button
            key={app.id}
            onClick={() => onToggleApp(user.id, app.id)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
              user.allowedApps?.includes(app.id)
                ? `${app.color} border-transparent`
                : 'bg-white border-slate-200 text-slate-300'
            }`}
          >
            {app.label}
          </button>
        ))}
      </div>
    </td>
    <td className="px-6 py-4 text-right">
      <button
        disabled={isSaving}
        onClick={() => onSave(user)}
        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
        title="Save Changes"
      >
        {isSaving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20} />}
      </button>
    </td>
  </tr>
));

/**
 * AdminPanelApp
 * Manages user roles and grants access to specific applications.
 */
const AdminPanelApp = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);

  const APP_ID = 'default-app-id';

  useEffect(() => {
    // Listen to the public user profiles directory
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', 'userProfiles');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleAppAccess = useCallback((userId, appId) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const currentApps = u.allowedApps || [];
      const newApps = currentApps.includes(appId)
        ? currentApps.filter(id => id !== appId)
        : [...currentApps, appId];
      return { ...u, allowedApps: newApps };
    }));
  }, []);

  const toggleRole = useCallback((userId) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      return { ...u, role: u.role === 'admin' ? 'user' : 'admin' };
    }));
  }, []);

  const saveUserChanges = useCallback(async (user) => {
    setSavingId(user.id);
    try {
      const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'userProfiles', user.id);
      await updateDoc(userRef, {
        allowedApps: user.allowedApps,
        role: user.role
      });
    } catch (err) {
      console.error("Failed to save permissions:", err);
    } finally {
      setSavingId(null);
    }
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase();
    return users.filter(u =>
      u.email?.toLowerCase().includes(term) ||
      u.displayName?.toLowerCase().includes(term)
    );
  }, [users, search]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Admin Control Center</h2>
            <p className="text-sm text-slate-500">Assign permissions for the new Investment app and more</p>
          </div>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">System Role</th>
                  <th className="px-6 py-4 text-center">App Permissions</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSaving={savingId === user.id}
                    onToggleRole={toggleRole}
                    onToggleApp={toggleAppAccess}
                    onSave={saveUserChanges}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanelApp;
