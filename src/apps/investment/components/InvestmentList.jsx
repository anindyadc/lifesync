import React, { useMemo, useState } from 'react';
import { Edit, Trash2, PiggyBank, CalendarDays, AlertTriangle, Search } from 'lucide-react';
import CustomAlertDialog from '../../../components/AlertDialog';

const InvestmentList = ({ investments, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');
  const [holderFilter, setHolderFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const uniqueHolders = useMemo(() => [...new Set(investments.map(inv => inv.holder).filter(Boolean))], [investments]);
  const uniqueTypes = useMemo(() => [...new Set(investments.map(inv => inv.type).filter(Boolean))], [investments]);

  const filteredInvestments = useMemo(() => {
    return investments.filter(inv => {
      const matchesSearch = !search ||
        inv.name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.details?.toLowerCase().includes(search.toLowerCase()) ||
        inv.holder?.toLowerCase().includes(search.toLowerCase()) ||
        inv.type?.toLowerCase().includes(search.toLowerCase());
      const matchesHolder = holderFilter === 'all' || inv.holder === holderFilter;
      const matchesType = typeFilter === 'all' || inv.type === typeFilter;
      return matchesSearch && matchesHolder && matchesType;
    });
  }, [investments, search, holderFilter, typeFilter]);

  if (investments.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        <PiggyBank size={40} className="mx-auto mb-4 text-slate-400" />
        <p className="text-lg font-medium">No investment added yet.</p>
        <p className="text-sm">Add your first investment to start tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, holder, type, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={holderFilter}
          onChange={(e) => setHolderFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="all">All Holders</option>
          {uniqueHolders.map(holder => <option key={holder} value={holder}>{holder}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="all">All Types</option>
          {uniqueTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

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
            {filteredInvestments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">No investments match your search/filter.</td>
              </tr>
            ) : filteredInvestments.map((investment) => (
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
                  {investment.amount === null ? (
                    <div className="text-xs font-bold text-amber-600 flex items-center justify-end gap-1" title="This amount could not be decrypted — the encryption key may have changed or the data is corrupted.">
                      <AlertTriangle size={14} /> Unable to decrypt
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-slate-900">₹{investment.amount?.toLocaleString('en-IN')}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-500 flex items-center gap-1">
                    <CalendarDays size={16} className="text-slate-400"/>
                    {investment.maturityDate}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(investment)} aria-label="Edit investment" className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50">
                      <Edit size={18} />
                    </button>
                    <CustomAlertDialog
                      trigger={ <button aria-label="Delete investment" className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"><Trash2 size={18} /></button>}
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
    </div>
  );
};

export default InvestmentList;
