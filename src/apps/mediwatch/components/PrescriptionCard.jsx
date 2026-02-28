import React, { useState } from 'react';
import { Pill, User, Calendar, Trash2, Edit2, Image as ImageIcon, ExternalLink, ChevronDown, ChevronUp, Archive, ArchiveRestore, Activity, X, Share2 } from 'lucide-react';

const PrescriptionCard = ({ prescription, onDelete, onEdit, onArchive }) => {
  const [showMedicines, setShowMedicines] = useState(false);
  const urls = prescription.photoUrls || (prescription.photoUrl ? [prescription.photoUrl] : []);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const openModal = () => {
    if (urls.length > 0) {
      setCurrentPhotoIndex(0);
      setIsImageModalOpen(true);
    }
  };

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Minimum swipe distance in pixels
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPhotoIndex < urls.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    } else if (isRightSwipe && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const handleShare = async () => {
    try {
      if (urls.length === 0) return;
      const currentUrl = urls[currentPhotoIndex];
      
      if (currentUrl.startsWith('data:')) {
        // Convert Base64 data URL to a File object for sharing
        const response = await fetch(currentUrl);
        const blob = await response.blob();
        
        // Extract a mime type, defaulting to jpeg
        const mimeType = currentUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
        const extension = mimeType.split('/')[1] || 'jpg';
        
        const file = new File([blob], `prescription-${prescription.patientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${currentPhotoIndex + 1}.${extension}`, { type: mimeType });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Prescription - ${prescription.patientName}`,
            text: `Prescription for ${prescription.patientName} (Dr. ${prescription.doctorName})`,
            files: [file],
          });
        } else {
          // Fallback if file sharing is not supported by the browser/OS
          alert('Your device or browser does not support sharing this image directly. You can try saving the image first.');
        }
      } else {
        // Fallback for regular URLs (if any exist from older data)
        if (navigator.share) {
          await navigator.share({
            title: `Prescription - ${prescription.patientName}`,
            text: `Prescription for ${prescription.patientName} (Dr. ${prescription.doctorName})`,
            url: currentUrl
          });
        } else {
          alert('Sharing is not supported on this device or browser.');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // AbortError is common if the user cancels the share dialog, so we can ignore it
      if (error.name !== 'AbortError') {
        alert('An error occurred while trying to share the prescription.');
      }
    }
  };

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5 flex flex-col md:flex-row gap-5">
        {/* Photo Section */}
        <div className="w-full md:w-32 h-32 flex-shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group flex items-center justify-center cursor-pointer" onClick={openModal}>
          {urls.length > 0 ? (
            <>
              <img src={urls[currentPhotoIndex]} alt={`Prescription page ${currentPhotoIndex + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button type="button" className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors">
                  <ExternalLink size={20} />
                </button>
              </div>
              {urls.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {urls.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`w-2 h-2 rounded-full ${idx === currentPhotoIndex ? 'bg-indigo-500' : 'bg-white/60 hover:bg-white'}`}
                    />
                  ))}
                </div>
              )}
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
              <button onClick={() => onDelete(prescription.id, prescription.photoUrl, prescription.photoUrls)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Prescription">
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

      {/* Image Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsImageModalOpen(false)}>
          
          {/* Fixed Action Buttons at Top Right */}
          <div className="absolute top-4 right-4 flex gap-3 z-50 pt-safe-top pr-safe-right">
            {/* Share Button */}
            {(navigator.share || navigator.canShare) && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleShare(); }} 
                className="p-2.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-md shadow-lg"
                title="Share"
              >
                <Share2 size={22} />
              </button>
            )}
            
            {/* Close Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsImageModalOpen(false); }} 
              className="p-2.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors backdrop-blur-md shadow-lg"
              title="Close"
            >
              <X size={22} />
            </button>
          </div>

          <div 
            className="relative max-w-4xl w-full h-[80vh] flex items-center justify-center touch-none mt-12" 
            onClick={e => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-full h-full flex items-center justify-center p-2 relative">
              {urls.length > 1 && (
                <div className="absolute top-0 left-0 right-0 text-center z-10">
                  <span className="bg-black/40 text-white/90 text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-md uppercase tracking-widest">
                    Swipe left/right to change pages
                  </span>
                </div>
              )}
              <img 
                src={urls[currentPhotoIndex]} 
                alt="Prescription full view" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl bg-white transition-all duration-300" 
                draggable="false"
              />
            </div>

            {urls.length > 1 && (
              <div className="absolute -bottom-12 left-0 right-0 flex justify-center gap-3">
                {urls.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className={`w-3 h-3 rounded-full shadow-md transition-all ${idx === currentPhotoIndex ? 'bg-indigo-400 scale-125' : 'bg-white/40 hover:bg-white/80'}`}
                    title={`Page ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PrescriptionCard;