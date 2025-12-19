import React, { useState } from 'react';
import { PlusCircle, PiggyBank, CalendarDays, Loader2, AlertCircle } from 'lucide-react';
import InvestmentList from './components/InvestmentList';
import InvestmentForm from './components/InvestmentForm';
import MaturityCalendar from './components/MaturityCalendar';
import { useInvestments } from './hooks/useInvestments';

const InvestmentsApp = ({ user }) => {
  const [showForm, setShowForm] = useState(false);
  const [editInvestment, setEditInvestment] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'calendar'
  const { investments, loading, error, addInvestment, updateInvestment, deleteInvestment } = useInvestments(user.uid);

  const handleSave = async (investmentData) => {
    if (editInvestment) {
      await updateInvestment(editInvestment.id, investmentData);
    } else {
      await addInvestment(investmentData);
    }
    setShowForm(false);
    setEditInvestment(null);
  };

  const handleEdit = (investment) => {
    setEditInvestment(investment);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-white rounded-2xl shadow-sm border border-slate-200">
        <Loader2 className="animate-spin text-indigo-500" size={24} />
        <p className="ml-3 text-slate-600">Loading investments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center shadow-sm">
        <AlertCircle className="mr-3" size={20} />
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">My Investments</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            <PiggyBank className="inline-block mr-2" size={18} /> List View
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            <CalendarDays className="inline-block mr-2" size={18} /> Calendar
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <InvestmentForm 
            initialData={editInvestment}
            onSubmit={handleSave}
            onCancel={() => { setShowForm(false); setEditInvestment(null); }}
          />
        </div>
      )}

      {investments.length === 0 && (activeTab === 'list' || activeTab === 'calendar') ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
          <PiggyBank size={40} className="mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-medium">No investments added yet.</p>
          <p className="text-sm mb-4">Add your first investment to start tracking maturities and amounts.</p>
          <button
            onClick={() => { setShowForm(true); setEditInvestment(null); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md mx-auto"
          >
            <PlusCircle size={20} />
            <span>Add Investment</span>
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'list' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => { setShowForm(true); setEditInvestment(null); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md"
                >
                  <PlusCircle size={20} />
                  <span>Add Investment</span>
                </button>
              </div>
              <InvestmentList 
                investments={investments}
                onEdit={handleEdit}
                onDelete={deleteInvestment}
              />
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <MaturityCalendar investments={investments} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InvestmentsApp;
