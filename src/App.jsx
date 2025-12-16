import React, { useState, useEffect, useMemo } from 'react';
import { 
  // Shared & Nav Icons
  LayoutDashboard, 
  LogOut, 
  Plus, 
  Search, 
  Calendar, 
  Tag, 
  AlertCircle,
  TrendingUp,
  Trash2,
  Edit2,
  X,
  Menu,
  ChevronRight,
  User,
  Lock,
  Mail,
  Loader2,
  Grid,
  ArrowLeft,
  // Task Icons
  CheckSquare, 
  CheckCircle2,
  Clock,
  ListTodo,
  Timer,
  // Expense Icons (Extended)
  Wallet,
  DollarSign,
  PieChart,
  ArrowUpCircle, 
  ArrowDownCircle,
  CreditCard,
  Receipt,
  Smartphone,
  Banknote,
  Pencil,
  LayoutList,
  ArrowRight,
  BarChart3,
  Square,
  AlertTriangle,
  Check,
  Layers // Icon for LifeSync
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithCustomToken,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';

// --- Configuration & Initialization ---
const getFirebaseConfig = () => {
  // 1. Try Environment Variables (For GitHub Actions/Vite Build)
  // Check if import.meta.env exists to prevent errors in non-Vite environments
  try {
    if (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
      return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };
    }
  } catch (e) {
    // Ignore errors if import.meta is not available
  }

  // 2. Fallback to Preview Environment Global (For this chat interface)
  if (typeof __firebase_config !== 'undefined') {
    return JSON.parse(__firebase_config);
  }

  console.error("Firebase config not found. Please check your environment variables.");
  return {};
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Shared Helper Functions ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', 
  }).format(amount);
};

const formatDuration = (minutes) => {
  if (!minutes) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
};

// --- EXPENSE APP CONSTANTS & HELPERS ---
const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', color: '#f97316', bg: 'bg-orange-100 text-orange-600' },
  { id: 'travel', label: 'Travel', color: '#3b82f6', bg: 'bg-blue-100 text-blue-600' },
  { id: 'shopping', label: 'Shopping', color: '#a855f7', bg: 'bg-purple-100 text-purple-600' },
  { id: 'utilities', label: 'Bills', color: '#eab308', bg: 'bg-yellow-100 text-yellow-600' },
  { id: 'health', label: 'Health', color: '#22c55e', bg: 'bg-green-100 text-green-600' },
  { id: 'entertainment', label: 'Fun', color: '#ec4899', bg: 'bg-pink-100 text-pink-600' },
  { id: 'other', label: 'Other', color: '#6b7280', bg: 'bg-gray-100 text-gray-600' },
];

const PAYMENT_MODES = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
];

// --- Expense Charts & Modals ---
const DonutChart = ({ data, total }) => {
  if (total === 0) {
    return (
      <div className="relative w-48 h-48 mx-auto flex items-center justify-center bg-gray-50 rounded-full border-2 border-dashed border-gray-200">
        <span className="text-gray-400 text-xs">No Data</span>
      </div>
    );
  }

  let currentDeg = 0;
  const gradients = data.map(item => {
    const deg = (item.total / total) * 360;
    const str = `${item.color} ${currentDeg}deg ${currentDeg + deg}deg`;
    currentDeg += deg;
    return str;
  }).join(', ');

  return (
    <div className="relative w-48 h-48 mx-auto">
      <div 
        className="w-full h-full rounded-full shadow-inner"
        style={{ background: `conic-gradient(${gradients})` }}
      ></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Total</span>
        <span className="text-xl font-bold text-gray-900">₹{total.toLocaleString()}</span>
      </div>
    </div>
  );
};

const WeeklyBarChart = ({ expenses }) => {
  const days = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const total = expenses
        .filter(e => {
          const eDate = e.date && typeof e.date.toDate === 'function' ? e.date.toDate() : new Date(e.date);
          return eDate.getDate() === d.getDate() && 
                 eDate.getMonth() === d.getMonth() && 
                 eDate.getFullYear() === d.getFullYear();
        })
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
      result.push({ day: dayName, total });
    }
    return result;
  }, [expenses]);

  const maxVal = Math.max(...days.map(d => d.total), 1);

  return (
    <div className="flex items-end justify-between h-32 pt-4 pb-2 px-2 gap-2">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
          <div className="relative w-full flex items-end justify-center h-full">
             {d.total > 0 && (
               <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded transition-opacity whitespace-nowrap z-10">
                  ₹{d.total}
               </div>
             )}
             <div 
              className={`w-full max-w-[12px] rounded-t-sm transition-all duration-500 ease-out ${d.total > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-100'}`}
              style={{ height: `${(d.total / maxVal) * 100}%`, minHeight: '4px' }}
             ></div>
          </div>
          <span className={`text-[10px] mt-2 font-medium ${d.day === new Date().toLocaleDateString('en-US', { weekday: 'short' }) ? 'text-blue-600' : 'text-gray-400'}`}>
            {d.day.charAt(0)}
          </span>
        </div>
      ))}
    </div>
  );
};

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel}></div>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative z-10 transform transition-all scale-100">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-full ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 py-3 px-4 font-semibold rounded-xl text-white shadow-lg transition-all active:scale-95 ${type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>Confirm</button>
        </div>
      </div>
    </div>
  );
};


// --- AUTH COMPONENT (Shared) ---
const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (err) {
      console.error("Auth error:", err);
      let msg = "An error occurred.";
      if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full p-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-4 shadow-lg shadow-indigo-200">
              <Layers size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">LifeSync</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your time and money in one place.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-4 h-4"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }} 
              className="text-indigo-600 font-medium hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- APP 1: TaskFlow (Existing) ---
const StatCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      <span className="text-slate-400">{subtext}</span>
    </div>
  </div>
);

const SimpleDonutChart = ({ data }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativePercent = 0;
  if (total === 0) return <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data available</div>;
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };
  const slices = data.map((slice) => {
    const startPercent = cumulativePercent;
    const slicePercent = slice.value / total;
    cumulativePercent += slicePercent;
    const endPercent = cumulativePercent;
    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
    const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
    return { path: pathData, color: slice.color };
  });
  return (
    <div className="h-40 relative flex items-center justify-center">
       <svg viewBox="-1 -1 2 2" className="w-32 h-32 -rotate-90 transform">
        {slices.map((slice, i) => <path d={slice.path} fill={slice.color} key={i} />)}
        <circle cx="0" cy="0" r="0.6" fill="white" />
      </svg>
    </div>
  );
};

const TaskApp = ({ user, goHome }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', category: 'General', subtasks: [], timeSpent: 0 });
  const [editingId, setEditingId] = useState(null);
  const [modalTab, setModalTab] = useState('details');
  const [newSubtask, setNewSubtask] = useState('');
  const [logTimeAmount, setLogTimeAmount] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => { const data = doc.data(); return { id: doc.id, ...data, subtasks: data.subtasks || [], timeSpent: data.timeSpent || 0 }; });
      tasksData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(tasksData);
      setLoadingTasks(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, updatedAt: serverTimestamp() };
    if (editingId) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', editingId), payload);
    else { payload.createdAt = serverTimestamp(); await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), payload); }
    closeModal();
  };
  const handleDelete = async (id) => { if (window.confirm("Delete task?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id)); };
  const addSubtask = () => { if(newSubtask.trim()){ setFormData({...formData, subtasks: [...formData.subtasks, {id: crypto.randomUUID(), title: newSubtask, completed: false}]}); setNewSubtask(''); }};
  const toggleSubtask = (id) => setFormData({...formData, subtasks: formData.subtasks.map(s => s.id === id ? {...s, completed: !s.completed} : s)});
  const removeSubtask = (id) => setFormData({...formData, subtasks: formData.subtasks.filter(s => s.id !== id)});
  const openEditModal = (task) => { setFormData({...task, subtasks: task.subtasks || [], timeSpent: task.timeSpent || 0}); setEditingId(task.id); setModalTab('details'); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setFormData({title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', category: 'General', subtasks: [], timeSpent: 0}); setModalTab('details'); };

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalTimeSpent = tasks.reduce((acc, t) => acc + (t.timeSpent || 0), 0);
    const totalSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
    const completedSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.filter(s => s.completed).length || 0), 0);
    return { total, completed, pending, completionRate, totalTimeSpent, totalSubtasks, completedSubtasks };
  }, [tasks]);

  const priorityData = useMemo(() => {
    const high = tasks.filter(t => t.priority === 'high').length;
    const medium = tasks.filter(t => t.priority === 'medium').length;
    const low = tasks.filter(t => t.priority === 'low').length;
    return [{ name: 'High', value: high, color: '#ef4444' }, { name: 'Medium', value: medium, color: '#f59e0b' }, { name: 'Low', value: low, color: '#10b981' }];
  }, [tasks]);

  const displayedTasks = tasks.filter(t => filterStatus === 'all' || t.status === filterStatus);
  const getPriorityColor = (p) => { switch(p) { case 'high': return 'text-red-600 bg-red-50 border-red-200'; case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200'; case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200'; default: return 'text-slate-600 bg-slate-50'; } };
  const getStatusColor = (s) => { switch(s) { case 'done': return 'bg-indigo-100 text-indigo-700'; case 'in-progress': return 'bg-blue-100 text-blue-700'; default: return 'bg-slate-100 text-slate-700'; } };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-indigo-600 font-bold text-xl cursor-pointer" onClick={goHome}>
          <ArrowLeft size={20} /> <span>TaskFlow</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={18}/> Dashboard</button>
          <button onClick={() => setActiveTab('tasks')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'tasks' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><CheckSquare size={18}/> My Tasks</button>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={goHome} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"><Grid size={18}/> Switch App</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-indigo-600" onClick={goHome}><ArrowLeft size={18} /> TaskFlow</div>
            <button onClick={goHome}><Grid size={20} className="text-slate-600" /></button>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
               <div className="flex justify-between items-end">
                  <div><h2 className="text-2xl font-bold text-slate-800">Dashboard</h2><p className="text-slate-500">Productivity overview & Reports</p></div>
                  <button onClick={() => { setActiveTab('tasks'); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex gap-2"><Plus size={16}/> New Task</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title="Total Tasks" value={stats.total} subtext={`${stats.completed} Completed`} icon={CheckSquare} colorClass="bg-blue-100 text-blue-600" />
                 <StatCard title="Total Time" value={formatDuration(stats.totalTimeSpent)} subtext="Logged across all tasks" icon={Timer} colorClass="bg-emerald-100 text-emerald-600" />
                 <StatCard title="Subtask Progress" value={`${stats.completedSubtasks}/${stats.totalSubtasks}`} subtext="Subtasks completed" icon={ListTodo} colorClass="bg-amber-100 text-amber-600" />
                 <StatCard title="Completion Rate" value={`${stats.completionRate}%`} subtext="Overall efficiency" icon={TrendingUp} colorClass="bg-indigo-100 text-indigo-600" />
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-1">
                    <h3 className="font-bold text-slate-800 mb-6">Task Priority</h3>
                    <div className="flex flex-col items-center">
                      <SimpleDonutChart data={priorityData} />
                      <div className="flex gap-4 mt-6">{priorityData.map((d) => (<div key={d.name} className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>{d.name}</div>))}</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800">Detailed Report</h3><span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">Taskwise Breakdown</span></div>
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100"><tr><th className="px-6 py-3">Task Name</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Subtasks</th><th className="px-6 py-3">Time Spent</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {tasks.slice(0, 8).map(task => {
                            const subDone = task.subtasks?.filter(s => s.completed).length || 0; const subTotal = task.subtasks?.length || 0;
                            return (<tr key={task.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-3 font-medium text-slate-800">{task.title}</td><td className="px-6 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs capitalize ${getStatusColor(task.status)}`}>{task.status.replace('-', ' ')}</span></td><td className="px-6 py-3"><div className="flex items-center gap-2"><div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-500 h-full rounded-full" style={{ width: `${subTotal ? (subDone/subTotal)*100 : 0}%` }}/></div><span className="text-xs">{subDone}/{subTotal}</span></div></td><td className="px-6 py-3 font-mono text-slate-600">{formatDuration(task.timeSpent || 0)}</td></tr>);
                          })}
                          {tasks.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400">No data available</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
               </div>
            </div>
          )}
          {activeTab === 'tasks' && (
             <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                   <div><h2 className="text-2xl font-bold text-slate-800">My Tasks</h2><p className="text-slate-500">Manage your daily activities</p></div>
                   <button onClick={() => { closeModal(); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex gap-2"><Plus size={16}/> Add Task</button>
                </div>
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">{['all', 'todo', 'in-progress', 'done'].map(status => (<button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-colors ${filterStatus === status ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{status.replace('-', ' ')}</button>))}</div>
                {loadingTasks ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600"/></div> : (
                  <div className="space-y-3">
                    {displayedTasks.map(task => {
                      const subCompleted = task.subtasks?.filter(s => s.completed).length || 0; const subTotal = task.subtasks?.length || 0; const progress = subTotal > 0 ? (subCompleted / subTotal) * 100 : 0;
                      return (
                        <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start group hover:shadow-md transition-all">
                           <div className="flex gap-3 w-full">
                              <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), { status: task.status === 'done' ? 'todo' : 'done' })} className={`mt-1 w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center ${task.status === 'done' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}><CheckSquare size={14} /></button>
                              <div className="flex-1">
                                 <h4 className={`font-semibold text-slate-800 ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                                 {task.description && <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>}
                                 {subTotal > 0 && (<div className="mt-3 w-full max-w-xs"><div className="flex justify-between text-xs text-slate-500 mb-1"><span>Subtasks</span><span>{subCompleted}/{subTotal}</span></div><div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}/></div></div>)}
                                 <div className="flex flex-wrap gap-2 mt-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize border ${getPriorityColor(task.priority)}`}>{task.priority}</span><span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded"><Tag size={12}/> {task.category}</span>{task.dueDate && <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded"><Calendar size={12}/> {task.dueDate}</span>}{task.timeSpent > 0 && <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded flex items-center gap-1 font-medium"><Timer size={10}/> {formatDuration(task.timeSpent)}</span>}</div>
                              </div>
                           </div>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4"><button onClick={() => openEditModal(task)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button><button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 size={16}/></button></div>
                        </div>
                      );
                    })}
                    {displayedTasks.length === 0 && <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">No tasks found.</div>}
                  </div>
                )}
             </div>
          )}
        </div>
      </main>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"><h3 className="text-lg font-bold">{editingId ? 'Edit Task' : 'New Task'}</h3><button onClick={closeModal}><X size={20} className="text-slate-400"/></button></div>
              <div className="flex border-b border-slate-100 bg-white shrink-0">{['details', 'subtasks', 'time'].map(tab => (<button key={tab} onClick={() => setModalTab(tab)} className={`flex-1 py-3 text-sm font-medium border-b-2 capitalize ${modalTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab === 'time' ? `Time (${formatDuration(formData.timeSpent)})` : tab === 'subtasks' ? `Subtasks (${formData.subtasks.length})` : tab}</button>))}</div>
              <div className="p-6 overflow-y-auto flex-1">
                 {modalTab === 'details' && (<div className="space-y-4"><input type="text" placeholder="Task Title" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /><textarea rows="3" placeholder="Description" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /><div className="grid grid-cols-2 gap-4"><input type="date" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} /><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option>General</option><option>Work</option><option>Personal</option><option>Shopping</option><option>Health</option></select></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Priority</label><div className="flex gap-2">{['low', 'medium', 'high'].map(p => (<button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${formData.priority === p ? (p === 'high' ? 'bg-red-50 border-red-500 text-red-600' : p === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-emerald-50 border-emerald-500 text-emerald-600') : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{p}</button>))}</div></div><div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Status</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></div></div></div>)}
                 {modalTab === 'subtasks' && (<div className="space-y-4"><div className="flex gap-2"><input type="text" placeholder="Add subtask..." className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())} /><button type="button" onClick={addSubtask} className="px-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg">Add</button></div><div className="space-y-2">{formData.subtasks.map(s => (<div key={s.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded group"><button type="button" onClick={() => toggleSubtask(s.id)}><CheckSquare size={16} className={s.completed ? 'text-indigo-600' : 'text-slate-300'}/></button><span className={`flex-1 text-sm ${s.completed && 'line-through text-slate-400'}`}>{s.title}</span><button type="button" onClick={() => removeSubtask(s.id)}><X size={14} className="text-slate-400 opacity-0 group-hover:opacity-100"/></button></div>))}</div>{formData.subtasks.length === 0 && <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">No subtasks yet</div>}</div>)}
                 {modalTab === 'time' && (<div className="space-y-6"><div className="bg-emerald-50 p-6 rounded-xl text-center"><div className="text-sm text-emerald-600 font-medium mb-1">Total Time Logged</div><div className="text-3xl font-bold text-emerald-700">{formatDuration(formData.timeSpent)}</div></div><div><label className="block text-sm font-medium text-slate-700 mb-2">Log Additional Time (Minutes)</label><div className="flex gap-2"><input type="number" min="1" placeholder="e.g. 30" className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={logTimeAmount} onChange={e => setLogTimeAmount(e.target.value)} /><button type="button" onClick={() => { if(logTimeAmount) { setFormData({...formData, timeSpent: (formData.timeSpent||0) + parseInt(logTimeAmount)}); setLogTimeAmount(''); }}} className="px-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium flex items-center gap-2"><Plus size={16}/> Add Log</button></div></div></div>)}
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0"><button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button><button type="button" onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-200">Save</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- APP 2: WalletWatch (UPDATED) ---
const ExpenseApp = ({ user, goHome }) => {
  const [view, setView] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Modal State
  const [deleteId, setDeleteId] = useState(null);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES[0].id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Data Fetching
  useEffect(() => {
    setDataLoading(true);
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'expenses');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by date (handles both Timestamp and legacy strings if needed)
      loadedExpenses.sort((a, b) => {
        const dateA = a.date && typeof a.date.toDate === 'function' ? a.date.toDate() : new Date(a.date);
        const dateB = b.date && typeof b.date.toDate === 'function' ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      setExpenses(loadedExpenses);
      setDataLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Actions
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!amount) return;

    try {
      const expenseDate = new Date(date);
      const now = new Date();
      expenseDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const expenseData = {
        amount: parseFloat(amount),
        description: description || 'No description',
        category,
        paymentMode,
        date: Timestamp.fromDate(expenseDate),
        updatedAt: serverTimestamp(),
      };

      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'expenses');

      if (editingId) {
        await updateDoc(doc(colRef, editingId), expenseData);
        showNotification('Expense updated!');
      } else {
        await addDoc(colRef, { ...expenseData, createdAt: serverTimestamp() });
        showNotification('Expense added!');
      }
      resetForm();
      setView('dashboard');
    } catch (error) {
      console.error("Save error:", error);
      showNotification('Failed to save.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'expenses', deleteId));
      showNotification('Expense deleted.');
      if (editingId === deleteId) { resetForm(); setView('dashboard'); }
    } catch (error) {
      console.error("Delete error:", error);
      showNotification('Delete failed.', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setAmount(expense.amount);
    setDescription(expense.description);
    setCategory(expense.category);
    setPaymentMode(expense.paymentMode);
    // Handle Date (Timestamp or String)
    const d = expense.date && typeof expense.date.toDate === 'function' ? expense.date.toDate() : new Date(expense.date);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset*60*1000));
    setDate(localDate.toISOString().split('T')[0]);
    setView('add');
  };

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setDescription('');
    setCategory(CATEGORIES[0].id);
    setPaymentMode(PAYMENT_MODES[0].id);
    setDate(new Date().toISOString().split('T')[0]);
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Calculations
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(exp => {
      const d = exp.date && typeof exp.date.toDate === 'function' ? exp.date.toDate() : new Date(exp.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [expenses]);

  const totalMonthly = useMemo(() => {
    return currentMonthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [currentMonthExpenses]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    currentMonthExpenses.forEach(exp => {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + Number(exp.amount);
    });
    return Object.entries(breakdown)
      .map(([catId, total]) => ({
        id: catId,
        total,
        ...CATEGORIES.find(c => c.id === catId) || { label: 'Unknown', color: '#ccc', bg: 'bg-gray-100' }
      }))
      .sort((a, b) => b.total - a.total);
  }, [currentMonthExpenses]);


  return (
    <div className="flex h-screen bg-slate-50">
      <ConfirmationModal 
        isOpen={!!deleteId}
        title="Delete Expense"
        message="Are you sure you want to remove this transaction?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        type="danger"
      />

       <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-blue-600 font-bold text-xl cursor-pointer" onClick={goHome}>
          <ArrowLeft size={20} /> <span>WalletWatch</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><PieChart size={18}/> Dashboard</button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${view === 'history' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutList size={18}/> History</button>
          <button onClick={() => { resetForm(); setView('add'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${view === 'add' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Plus size={18}/> Add New</button>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={goHome} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"><Grid size={18}/> Switch App</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-blue-600" onClick={goHome}><ArrowLeft size={18} /> WalletWatch</div>
            <button onClick={goHome}><Grid size={20} className="text-slate-600" /></button>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
           {notification && (
             <div className={`mb-4 p-3 rounded-lg text-sm text-center animate-in fade-in slide-in-from-top-2 flex items-center justify-center gap-2 max-w-lg mx-auto ${notification.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
               {notification.type === 'success' ? <Check size={16}/> : <AlertCircle size={16}/>} {notification.msg}
             </div>
           )}

           {view === 'dashboard' && (
             <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
               <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                  <button onClick={() => { resetForm(); setView('add'); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex gap-2"><Plus size={16}/> Add Expense</button>
               </div>
               
               <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6 text-center">Monthly Breakdown</h3>
                  <DonutChart data={categoryBreakdown} total={totalMonthly} />
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {categoryBreakdown.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-slate-600">{item.label}</span>
                        </div>
                        <span className="font-semibold">₹{item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                     <div className="flex items-center gap-2 mb-4 font-semibold text-slate-800"><BarChart3 size={18} className="text-blue-500" /> Weekly Activity</div>
                     <WeeklyBarChart expenses={expenses} />
                  </div>
                  <div className="space-y-4">
                      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex flex-col justify-center">
                        <p className="text-xs text-blue-600 font-medium mb-1 uppercase tracking-wide">Daily Average</p>
                        <p className="text-2xl font-bold text-blue-900">₹{expenses.length > 0 ? (totalMonthly / new Date().getDate()).toFixed(0) : '0'}</p>
                      </div>
                      <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 flex flex-col justify-center">
                        <p className="text-xs text-purple-600 font-medium mb-1 uppercase tracking-wide">Transactions (Month)</p>
                        <p className="text-2xl font-bold text-purple-900">{currentMonthExpenses.length}</p>
                      </div>
                  </div>
               </div>

               <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">Recent Transactions</h3>
                    <button onClick={() => setView('history')} className="text-blue-600 text-sm font-medium flex items-center hover:underline">View All <ArrowRight size={14} className="ml-1"/></button>
                  </div>
                  <div className="space-y-2">
                    {expenses.slice(0, 3).map(exp => (
                      <div key={exp.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                         <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${CATEGORIES.find(c => c.id === exp.category)?.bg || 'bg-gray-100'}`}>
                               <Banknote size={18} className="opacity-75" />
                            </div>
                            <div>
                               <p className="font-semibold text-slate-800">{CATEGORIES.find(c => c.id === exp.category)?.label || 'Other'}</p>
                               <p className="text-xs text-slate-500">{exp.description}</p>
                            </div>
                         </div>
                         <span className="font-bold text-slate-900">₹{Number(exp.amount).toFixed(2)}</span>
                      </div>
                    ))}
                    {expenses.length === 0 && <div className="text-center py-4 text-slate-400 text-sm">No recent transactions</div>}
                  </div>
               </div>
             </div>
           )}

           {view === 'history' && (
             <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-slate-800">Transaction History</h2>
                   <button onClick={() => { resetForm(); setView('add'); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex gap-2"><Plus size={16}/> Add New</button>
                </div>
                <div className="space-y-3">
                  {expenses.map(exp => (
                    <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${CATEGORIES.find(c => c.id === exp.category)?.bg || 'bg-gray-100'}`}>
                           <CreditCard size={20} className="opacity-75" />
                        </div>
                        <div>
                           <h3 className="font-semibold text-slate-800">{CATEGORIES.find(c => c.id === exp.category)?.label}</h3>
                           <p className="text-xs text-slate-500 flex items-center gap-1">
                              {exp.description} • {exp.date && typeof exp.date.toDate === 'function' ? exp.date.toDate().toLocaleDateString(undefined, {month:'short', day:'numeric'}) : new Date(exp.date).toLocaleDateString()}
                           </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="block font-bold text-slate-900 mb-1">₹{Number(exp.amount).toFixed(2)}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-medium mr-1">{PAYMENT_MODES.find(p => p.id === exp.paymentMode)?.label}</span>
                           <button onClick={() => handleEdit(exp)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"><Pencil size={14} /></button>
                           <button onClick={() => setDeleteId(exp.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && <div className="text-center py-12 text-slate-400"><LayoutList size={48} className="mx-auto mb-3 opacity-20" /><p>No transaction history yet.</p></div>}
                </div>
             </div>
           )}

           {view === 'add' && (
             <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Expense' : 'Add New Expense'}</h2>
                    {editingId && <button onClick={resetForm} className="text-sm text-red-500 font-medium flex items-center bg-red-50 px-3 py-1.5 rounded-full"><X size={14} className="mr-1" /> Cancel</button>}
                 </div>
                 
                 <form onSubmit={handleSaveExpense} className="space-y-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-8 pr-4 py-3 text-2xl font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required autoFocus={!editingId} />
                      </div>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map(cat => (
                          <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={`p-3 rounded-lg border text-left text-sm font-medium transition-all ${category === cat.id ? `border-blue-500 ring-1 ring-blue-500 ${cat.bg}` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{cat.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-slate-700 mb-2">Payment</label><select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">{PAYMENT_MODES.map(mode => (<option key={mode.id} value={mode.id}>{mode.label}</option>))}</select></div>
                      <div><label className="block text-sm font-medium text-slate-700 mb-2">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    </div>
                    <div className="pt-4"><button type="submit" className={`w-full py-4 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>{editingId ? 'Update Expense' : 'Save Expense'}</button></div>
                 </form>
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

// --- Launchpad Component ---
const Launchpad = ({ user, onSelectApp, logout }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
       <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-10">
             <div>
                <h1 className="text-3xl font-bold text-slate-800">Welcome back!</h1>
                <p className="text-slate-500 mt-1">{user.displayName || user.email}</p>
             </div>
             <button onClick={logout} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                <LogOut size={18}/> Sign Out
             </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <button onClick={() => onSelectApp('tasks')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all group text-left">
                <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <CheckSquare size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">TaskFlow</h2>
                <p className="text-slate-500">Manage projects, subtasks, track time, and view detailed productivity reports.</p>
                <div className="mt-6 flex items-center text-indigo-600 font-medium">Launch App <ChevronRight size={18} className="ml-1"/></div>
             </button>

             <button onClick={() => onSelectApp('expenses')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all group text-left">
                <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <Wallet size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">WalletWatch</h2>
                <p className="text-slate-500">Track spending with charts, categorize expenses, and monitor monthly budgets.</p>
                <div className="mt-6 flex items-center text-blue-600 font-medium">Launch App <ChevronRight size={18} className="ml-1"/></div>
             </button>
          </div>
       </div>
    </div>
  );
};

// --- Root App Shell ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentApp, setCurrentApp] = useState(null); // null (launchpad) | 'tasks' | 'expenses'

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } 
        catch (e) { console.error("Custom token auth failed", e); }
      }
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
    };
    initAuth();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-indigo-600"><Loader2 size={48} className="animate-spin" /></div>;

  if (!user) return <AuthScreen />;

  if (currentApp === 'tasks') return <TaskApp user={user} goHome={() => setCurrentApp(null)} />;
  if (currentApp === 'expenses') return <ExpenseApp user={user} goHome={() => setCurrentApp(null)} />;

  return <Launchpad user={user} onSelectApp={setCurrentApp} logout={() => signOut(auth)} />;
}
