import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, Plus, Save, Trash2, X, Upload } from 'lucide-react';

const PrescriptionForm = ({ onSubmit, onCancel, initialData = null, prescriptions = [] }) => {
  const [patientName, setPatientName] = useState(initialData?.patientName || '');
  const [relation, setRelation] = useState(initialData?.relation || 'Self');
  const [doctorName, setDoctorName] = useState(initialData?.doctorName || '');
  const [disease, setDisease] = useState(initialData?.disease || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [medicines, setMedicines] = useState(initialData?.medicines || []);
  const [existingPhotos, setExistingPhotos] = useState(initialData?.photoUrls || (initialData?.photoUrl ? [initialData.photoUrl] : []));
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [archiveOld, setArchiveOld] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit

  // Extract unique values for autocomplete
  const uniquePatients = [...new Set(prescriptions.map(p => p.patientName).filter(Boolean))];
  const uniqueDoctors = [...new Set(prescriptions.map(p => p.doctorName).filter(Boolean))];
  const uniqueDiseases = [...new Set(prescriptions.map(p => p.disease).filter(Boolean))];

  // State for controlling custom dropdown visibility
  const [activeDropdown, setActiveDropdown] = useState(null);

  const AutocompleteDropdown = ({ options, value, onSelect, isOpen }) => {
    if (!isOpen || options.length === 0) return null;
    
    const filteredOptions = options.filter(opt => 
      opt.toLowerCase().includes(value.toLowerCase()) && opt !== value
    );

    if (filteredOptions.length === 0) return null;

    return (
      <ul className="absolute z-10 w-full bg-white border border-slate-200 shadow-lg rounded-xl mt-1 max-h-48 overflow-y-auto overflow-x-hidden">
        {filteredOptions.map((opt, idx) => (
          <li 
            key={idx}
            className="px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer border-b border-slate-50 last:border-0"
            onClick={() => onSelect(opt)}
          >
            {opt}
          </li>
        ))}
      </ul>
    );
  };

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    setFileError('');
    setSubmitError('');
    
    if (files.length > 0) {
      const compressionOptions = {
        maxSizeMB: 0.15,          // Target 150KB per page for Firestore document limit (safely fits 6 pages)
        maxWidthOrHeight: 1024, // Optimized dimensions for mobile viewing and storage
        useWebWorker: true,    
      };

      // We'll process compressions in parallel for speed
      const compressionPromises = files.map(async (file) => {
        console.log(`Starting compression for ${file.name}, original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        try {
          const compressedFile = await imageCompression(file, compressionOptions);
          console.log(`Finished compression for ${file.name}, new size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
          
          if (compressedFile.size > MAX_FILE_SIZE) {
            setFileError(`File "${file.name}" is still too large after compression.`);
            return null;
          }
          
          setPhotoFiles(prev => [...prev, compressedFile]);
          setPhotoPreviews(prev => [...prev, URL.createObjectURL(compressedFile)]);

        } catch (error) {
          console.error("Compression Error:", error);
          setFileError(`Could not process file: ${file.name}`);
        }
      });
      
      await Promise.all(compressionPromises);
    }
    e.target.value = ''; // Reset input
  };

  const removeExistingPhoto = (index) => {
    const updated = [...existingPhotos];
    updated.splice(index, 1);
    setExistingPhotos(updated);
  };

  const removeNewPhoto = (index) => {
    const newFiles = [...photoFiles];
    newFiles.splice(index, 1);
    setPhotoFiles(newFiles);

    const newPreviews = [...photoPreviews];
    newPreviews.splice(index, 1);
    setPhotoPreviews(newPreviews);
  };

  const addMedicine = () => {
    setMedicines([...medicines, { name: '', alternateName: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeMedicine = (index) => {
    const newMedicines = [...medicines];
    newMedicines.splice(index, 1);
    setMedicines(newMedicines);
  };

  const updateMedicine = (index, field, value) => {
    const newMedicines = [...medicines];
    newMedicines[index][field] = value;
    setMedicines(newMedicines);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName || !doctorName) return;
    
    setIsSubmitting(true);
    setSubmitError('');
    try {
      // Helper to convert File to Base64
      const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      // Convert all new photo files to Base64 strings
      const base64Photos = await Promise.all(photoFiles.map(file => fileToBase64(file)));

      // Add a timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out. Please check your internet connection or try again.')), 60000)
      );

      const submitPromise = onSubmit({
        patientName,
        relation,
        doctorName,
        disease,
        date,
        archiveOld,
        existingPhotos,
        newPhotos: base64Photos, // Pass the Base64 strings
        medicines: medicines.filter(m => m?.name?.trim() !== '') 
      });

      await Promise.race([submitPromise, timeoutPromise]);
      onCancel(); 
    } catch (error) {
      console.error("Failed to save prescription:", error);
      setSubmitError(error?.message || 'Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800">
          {initialData ? 'Edit Prescription' : 'Add New Prescription'}
        </h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name *</label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => {
                setPatientName(e.target.value);
                setActiveDropdown('patient');
              }}
              onFocus={() => setActiveDropdown('patient')}
              onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="E.g., John Doe"
              autoComplete="off"
            />
            <AutocompleteDropdown 
              options={uniquePatients} 
              value={patientName} 
              isOpen={activeDropdown === 'patient'} 
              onSelect={(val) => {
                setPatientName(val);
                setActiveDropdown(null);
              }} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Relation</label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="Self">Self</option>
              <option value="Spouse">Spouse</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Child">Child</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Doctor Name *</label>
            <input
              type="text"
              required
              value={doctorName}
              onChange={(e) => {
                setDoctorName(e.target.value);
                setActiveDropdown('doctor');
              }}
              onFocus={() => setActiveDropdown('doctor')}
              onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="Dr. Smith"
              autoComplete="off"
            />
            <AutocompleteDropdown 
              options={uniqueDoctors} 
              value={doctorName} 
              isOpen={activeDropdown === 'doctor'} 
              onSelect={(val) => {
                setDoctorName(val);
                setActiveDropdown(null);
              }} 
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Disease / Condition</label>
            <input
              type="text"
              value={disease}
              onChange={(e) => {
                setDisease(e.target.value);
                setActiveDropdown('disease');
              }}
              onFocus={() => setActiveDropdown('disease')}
              onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="E.g., Viral Fever"
              autoComplete="off"
            />
            <AutocompleteDropdown 
              options={uniqueDiseases} 
              value={disease} 
              isOpen={activeDropdown === 'disease'} 
              onSelect={(val) => {
                setDisease(val);
                setActiveDropdown(null);
              }} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">Prescription Photos</label>
          <div className="flex flex-col gap-4">
            {(existingPhotos.length > 0 || photoPreviews.length > 0) && (
              <div className="flex flex-wrap gap-4">
                {existingPhotos.map((url, index) => (
                  <div key={`existing-${index}`} className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50">
                    <img src={url} alt={`Existing prescription page ${index + 1}`} className="w-full h-full object-cover opacity-90" />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors"
                      title="Remove this saved photo"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">Saved</div>
                  </div>
                ))}
                
                {photoPreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-indigo-200 bg-slate-50">
                    <img src={preview} alt={`New prescription preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors"
                      title="Remove this new photo"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-indigo-600/80 text-white text-[10px] text-center py-0.5 font-medium">New</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-full sm:w-48 h-32 flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl overflow-hidden">
                <label className="w-full flex-1 flex flex-col items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer text-indigo-500 border-b border-indigo-100 group">
                  <Camera size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Take Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
                <label className="w-full flex-1 flex flex-col items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer text-indigo-500 group">
                  <Upload size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">From Gallery</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
              </div>
              <div className="text-sm text-slate-500 flex-1">
                Take photos of the physical prescription pages with your mobile camera or upload existing images.
                {fileError && <p className="text-red-500 mt-2 font-medium animate-pulse">{fileError}</p>}
                <p className="text-[10px] mt-1 text-slate-400 uppercase tracking-wider font-bold">Max size per file: 2MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Medicines Section */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-slate-700">Medicines (Optional)</label>
            <button
              type="button"
              onClick={addMedicine}
              className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Plus size={16} /> Add Medicine
            </button>
          </div>
          
          <div className="space-y-4">
            {medicines.map((med, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl relative group">
                <button
                  type="button"
                  onClick={() => removeMedicine(index)}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Remove medicine"
                >
                  <X size={14} />
                </button>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
                  <div className="col-span-2 md:col-span-1">
                    <input
                      type="text"
                      placeholder="Medicine Name"
                      value={med.name}
                      onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <input
                      type="text"
                      placeholder="Alternate Name (Optional)"
                      value={med.alternateName}
                      onChange={(e) => updateMedicine(index, 'alternateName', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Dosage (e.g., 500mg)"
                      value={med.dosage}
                      onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Frequency (e.g., 1-0-1)"
                      value={med.frequency}
                      onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Duration (e.g., 5 days)"
                      value={med.duration}
                      onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
            {medicines.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No medicines added. Click "Add Medicine" to list them.
              </div>
            )}
          </div>
        </div>

        {!initialData && (
          <div className="pt-4 flex items-center gap-2">
            <input 
              type="checkbox" 
              id="archiveOld" 
              checked={archiveOld} 
              onChange={(e) => setArchiveOld(e.target.checked)} 
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="archiveOld" className="text-sm text-slate-700 font-medium cursor-pointer hover:text-indigo-600 transition-colors">
              Archive older prescriptions for this Doctor & Disease
            </label>
          </div>
        )}

        {submitError && (
          <div className="pt-4 pb-2 animate-pulse">
            <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2">
              <span className="shrink-0">⚠️</span>
              {submitError}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {isSubmitting ? 'Saving...' : 'Save Prescription'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PrescriptionForm;
