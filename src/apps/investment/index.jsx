import React, { useState } from 'react';
import { PlusCircle, PiggyBank, CalendarDays, Loader2, AlertCircle, FileText, Download, Receipt } from 'lucide-react';
import InvestmentList from './components/InvestmentList';
import InvestmentForm from './components/InvestmentForm';
import MaturityCalendar from './components/MaturityCalendar';
import InvestmentStats from './components/InvestmentStats';
import TaxSummary from './components/TaxSummary';
import { useInvestments } from './hooks/useInvestments';
import { useInvestmentExport } from './hooks/useInvestmentExport';

const InvestmentsApp = ({ user }) => {
  const [showForm, setShowForm] = useState(false);
  const [editInvestment, setEditInvestment] = useState(null);
  const [activeTab, setActiveTab] = useState('investment'); // 'investment', 'calendar', 'tax'
  const { investments, loading, error, addInvestment, updateInvestment, deleteInvestment, sellInvestment, closeInvestment, reopenInvestment } = useInvestments(user.uid);
  const { exportPDF, exportCSV, exportTaxCSV } = useInvestmentExport(investments);

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
        <p className="ml-3 text-slate-600">Loading investment...</p>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Investments</h2>
          <p className="text-sm text-slate-500 mt-0.5">Deposits, funds and holdings — maturities, lock-ins and tax at a glance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl" role="tablist" aria-label="Investment views">
            {[['investment', <PiggyBank size={16} />, 'Holdings'], ['calendar', <CalendarDays size={16} />, 'Calendar'], ['tax', <Receipt size={16} />, 'Tax Summary']].map(([key, icon, label]) => (
              <button
                key={key} role="tab" aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-300 rounded-xl shadow-sm hover:border-slate-400" title="Export CSV" aria-label="Export CSV"><FileText size={18}/></button>
          <button onClick={exportPDF} className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-300 rounded-xl shadow-sm hover:border-slate-400" title="Export PDF" aria-label="Export PDF"><Download size={18}/></button>
          <button
            onClick={() => { setShowForm(true); setEditInvestment(null); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white pl-3 pr-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-200"
          >
            <PlusCircle size={18} /> Add Investment
          </button>
        </div>
      </div>

      {investments.length > 0 && <InvestmentStats investments={investments} />}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <InvestmentForm 
            initialData={editInvestment}
            onSubmit={handleSave}
            onCancel={() => { setShowForm(false); setEditInvestment(null); }}
          />
        </div>
      )}

      {investments.length === 0 && (activeTab === 'investment' || activeTab === 'calendar') ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
          <PiggyBank size={40} className="mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-medium">No investment added yet.</p>
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
          {activeTab === 'investment' && (
            <InvestmentList
              investments={investments}
              onEdit={handleEdit}
              onDelete={deleteInvestment}
              onSell={sellInvestment}
              onClose={closeInvestment}
              onReopen={reopenInvestment}
            />
          )}

          {activeTab === 'calendar' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
              <MaturityCalendar investments={investments} onEdit={handleEdit} />
            </div>
          )}

          {activeTab === 'tax' && (
            <TaxSummary investments={investments} exportTaxCSV={exportTaxCSV} />
          )}
        </>
      )}
    </div>
  );
};

export default InvestmentsApp;
