import React from 'react';
import { Edit, Trash2, PiggyBank, CalendarDays } from 'lucide-react';
import CustomAlertDialog from '../../../components/AlertDialog';

const InvestmentList = ({ investments, onEdit, onDelete }) => {
  if (investments.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        <PiggyBank size={40} className="mx-auto mb-4 text-slate-400" />
        <p className="text-lg font-medium">No investments added yet.</p>
        <p className="text-sm">Add your first investment to start tracking.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Holder</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name / Bank</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Maturity Date</th>
            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {investments.map((investment) => (
            <tr key={investment.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-slate-900">{investment.holder}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-500">{investment.type}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-slate-900">{investment.name}</div>
                {investment.details && <div className="text-xs text-slate-400 mt-1">{investment.details}</div>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm font-bold text-slate-900">₹{investment.amount?.toLocaleString('en-IN')}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div classNameName="text-sm text-slate-500 flex items-center gap-1">
                  <CalendarDays size={16} className="text-slate-400"/>
                  {investment.maturityDate}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onEdit(investment)} className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50">
                    <Edit size={18} />
                  </button>
                  <CustomAlertDialog
                    trigger={ <button className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"><Trash2 size={18} /></button>}
                    title="Delete Investment"
                    description="Are you sure you want to delete this investment? This action cannot be undone."
                    onContinue={() => onDelete(investment.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvestmentList;
