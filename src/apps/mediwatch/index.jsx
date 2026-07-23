import React, { useState, useMemo } from 'react';
import { Plus, Stethoscope, Loader2, Search, XCircle, FileText, Download } from 'lucide-react';
import { useMedical } from './hooks/useMedical';
import { useMedicalExport } from './hooks/useMedicalExport';
import PrescriptionForm from './components/PrescriptionForm';
import PrescriptionCard from './components/PrescriptionCard';

export default function MediWatchApp({ user }) {
  const { prescriptions, loading, error, addPrescription, updatePrescription, deletePrescription, archivePrescription } = useMedical(user);
  const [showForm, setShowForm] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [filter, setFilter] = useState('active'); // 'active' or 'archived'
  const [search, setSearch] = useState('');

  const filteredPrescriptions = useMemo(() => {
    const byStatus = prescriptions.filter(p => filter === 'active' ? !p.archived : p.archived);
    const term = search.trim().toLowerCase();
    if (!term) return byStatus;
    return byStatus.filter(p =>
      p.patientName?.toLowerCase().includes(term) ||
      p.doctorName?.toLowerCase().includes(term) ||
      p.disease?.toLowerCase().includes(term)
    );
  }, [prescriptions, filter, search]);

  const { exportCSV, exportPDF } = useMedicalExport(filteredPrescriptions);

  const handleAddSubmit = async (data, photoFile) => {
    await addPrescription(data, photoFile);
  };

  const handleEditSubmit = async (data, photoFiles) => {
    // We now properly support photo updates: we will upload the new ones 
    // and the useMedical hook will update the photoUrls list.
    await updatePrescription(editingPrescription.id, data, photoFiles);
    setEditingPrescription(null);
  };

  const handleDelete = async (id, photoUrl, photoUrls) => {
    if (window.confirm('Are you sure you want to delete this prescription? This action cannot be undone.')) {
      await deletePrescription(id, photoUrl, photoUrls);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header section with Stats or Filters could go here */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope size={24} className="text-indigo-500" />
            Medical Records
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage prescriptions and medicines for you and your family.</p>
        </div>
        {!showForm && !editingPrescription && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search patient, doctor, disease..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <XCircle size={14} />
                </button>
              )}
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilter('active')}
                className={`flex-1 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${filter === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('archived')}
                className={`flex-1 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${filter === 'archived' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Archived
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 shadow-sm" title="Export CSV"><FileText size={18} /></button>
              <button onClick={exportPDF} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 shadow-sm" title="Export PDF"><Download size={18} /></button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
              >
                <Plus size={18} /> Add Prescription
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Forms Area */}
      {showForm && (
        <PrescriptionForm
          onSubmit={handleAddSubmit}
          onCancel={() => setShowForm(false)}
          prescriptions={prescriptions}
        />
      )}

      {editingPrescription && (
        <PrescriptionForm
          initialData={editingPrescription}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditingPrescription(null)}
          prescriptions={prescriptions}
        />
      )}

      {/* List Area */}
      {!showForm && !editingPrescription && (
        <div className="flex flex-col gap-6">
          {filteredPrescriptions.length > 0 ? (
            filteredPrescriptions.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                prescription={prescription}
                onDelete={handleDelete}
                onEdit={setEditingPrescription}
                onArchive={archivePrescription}
              />
            ))
          ) : (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Stethoscope size={28} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">
                {filter === 'active' ? 'No Active Prescriptions' : 'No Archived Prescriptions'}
              </h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                {filter === 'active' 
                  ? "Keep track of your family's health. Add a prescription to log medicines, doctor details, and photos."
                  : "Prescriptions you archive will appear here."}
              </p>
              {filter === 'active' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 px-6 py-2 rounded-xl font-bold transition-all"
                >
                  Add Your First Prescription
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
