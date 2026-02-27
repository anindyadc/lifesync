import React, { useState } from 'react';
import { Pill, User, Calendar, Trash2, Edit2, Image as ImageIcon, ExternalLink, ChevronDown, ChevronUp, Archive, ArchiveRestore, Activity } from 'lucide-react';

const PrescriptionCard = ({ prescription, onDelete, onEdit, onArchive }) => {
  const [showMedicines, setShowMedicines] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5 flex flex-col md:flex-row gap-5">
        {/* Photo Section */}
        <div className="w-full md:w-32 h-32 flex-shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group flex items-center justify-center">
          {prescription.photoUrl ? (
            <>
              <img src={prescription.photoUrl} alt="Prescription" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a href={prescription.photoUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors">
                  <ExternalLink size={20} />
                </a>
              </div>
            </>
          ) : (
            <div className="text-slate-400 flex flex-col items-center">
              <ImageIcon size={32} className="mb-2 opacity-50" />
              <span className="text-[10px] uppercase font-bold tracking-wider">No Photo</span>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User size={18} className="text-indigo-500" /> 
                {prescription.patientName} 
                <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium border border-indigo-100 uppercase tracking-wider">
                  {prescription.relation}
                </span>
              </h3>
              <p className="text-sm text-slate-500 font-medium mt-1 mb-1">Dr. {prescription.doctorName}</p>
              {prescription.disease && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 w-fit">
                  <Activity size={12} />
                  {prescription.disease}
                </div>
              )}
            </div>
            <div className="flex gap-1 sm:gap-2">
              <button onClick={() => onArchive(prescription.id, !prescription.archived)} className={`p-2 rounded-lg transition-colors ${prescription.archived ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`} title={prescription.archived ? "Restore" : "Archive"}>
                {prescription.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              </button>
              <button onClick={() => onEdit(prescription)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDelete(prescription.id, prescription.photoUrl)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Prescription">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 mt-auto">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              {new Date(prescription.date).toLocaleDateString()}
            </div>
            {prescription.medicines?.length > 0 && (
              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-medium">
                <Pill size={12} />
                {prescription.medicines.length} Medicines
              </div>
            )}
          </div>
          
          {/* Medicine List Toggle */}
          {prescription.medicines?.length > 0 && (
            <div className="mt-2 border-t border-slate-100 pt-3">
              <button 
                onClick={() => setShowMedicines(!showMedicines)}
                className="flex items-center gap-2 text-sm text-slate-600 font-medium hover:text-indigo-600 transition-colors w-full"
              >
                {showMedicines ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showMedicines ? 'Hide Medicines' : 'View Medicines'}
              </button>
              
              {showMedicines && (
                <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  {prescription.medicines.map((med, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-slate-800">{med.name}</div>
                        {med.duration && <div className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">{med.duration}</div>}
                      </div>
                      {med.alternateName && (
                        <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Alt:</span> {med.alternateName}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {med.dosage && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium border border-indigo-100">{med.dosage}</span>}
                        {med.frequency && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium border border-amber-100">{med.frequency}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionCard;