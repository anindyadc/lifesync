import React, { useState } from 'react';
import { PlusCircle, PiggyBank, CalendarDays, Key } from 'lucide-react';
import InvestmentList from './components/InvestmentList';
import InvestmentForm from './components/InvestmentForm';
import MaturityCalendar from './components/MaturityCalendar';
import { useInvestments } from './hooks/useInvestments';

const InvestmentsApp = ({ user }) => {
  const [showForm, setShowForm] = useState(false);
  const [editInvestment, setEditInvestment] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'calendar'
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useInvestments(user.uid);

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
    </div>
  );
};

export default InvestmentsApp;
