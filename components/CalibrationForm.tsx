
import React, { useState, useRef } from 'react';
import { Vehicle } from '../types';
import { compressImage, createMosaic, processImageWithWatermark } from '../utils';
import { X, Scale, Camera, CheckCircle, MapPin, Plus, Trash2, Loader2, Calendar, Settings2, Clock, Wrench, ImageIcon } from 'lucide-react';

interface CalibrationFormProps {
  onClose: () => void;
  onSubmit: (calibration: any) => Promise<void>;
  vehicles: Vehicle[];
}

const CalibrationForm: React.FC<CalibrationFormProps> = ({ onClose, onSubmit, vehicles }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhotoLocal, setIsProcessingPhotoLocal] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    plate: '',
    taller: '',
    calibrationDate: new Date().toISOString().split('T')[0],
    certificateUrl: '',
  });

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !formData.plate) {
      if (!formData.plate) alert("Seleccione la placa antes de capturar la evidencia.");
      return;
    }

    setIsProcessingPhotoLocal(true);
    
    const getCoords = (): Promise<{lat: number, lng: number} | undefined> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(undefined),
          { timeout: 5000 }
        );
      });
    };

    const coords = await getCoords();

    // Procesar cada archivo seleccionado (soporta múltiple selección si el navegador lo permite)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const processFile = () => new Promise<void>((resolve) => {
        reader.onloadend = async () => {
          const watermarked = await processImageWithWatermark(reader.result as string, formData.plate, coords);
          setCapturedPhotos(prev => [...prev, watermarked].slice(0, 6)); // Límite de 6 fotos
          resolve();
        };
        reader.readAsDataURL(file);
      });

      await processFile();
    }
    
    setIsProcessingPhotoLocal(false);
    if (evidenceInputRef.current) evidenceInputRef.current.value = ""; // Reset input
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.taller || capturedPhotos.length === 0) {
      alert("Por favor complete todos los campos y capture al menos una foto de evidencia.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Convierte todas las fotos capturadas en un único mosaico
      const mergedEvidence = await createMosaic(capturedPhotos);
      const payload = { ...formData, certificateUrl: mergedEvidence };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al enviar. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-indigo-50 shadow-2xl">
          <CheckCircle size={64} className="text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">¡REGISTRADA!</h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-4">Calibración enviada a la base de datos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl border-[6px] border-[#0f172a] overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#0f172a] p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <Scale size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">REGISTRO CALIBRACIÓN</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Mosaico Fotográfico con GPS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-red-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon size={14} /> Placa Vehicular
            </label>
            <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-400" value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value })}>
              <option value="">-- SELECCIONE PLACA --</option>
              {vehicles.sort((a, b) => a.plate.localeCompare(b.plate)).map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Wrench size={14} /> Taller / Empresa
              </label>
              <input 
                required 
                type="text"
                placeholder="Nombre del taller..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-400 uppercase" 
                value={formData.taller} 
                onChange={e => setFormData({ ...formData, taller: e.target.value.toUpperCase() })} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Fecha Calibración
              </label>
              <input 
                required
                type="date" 
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-400" 
                value={formData.calibrationDate} 
                onChange={e => setFormData({ ...formData, calibrationDate: e.target.value })} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                Evidencias Múltiples (Mosaico)
              </label>
              <div className="flex items-center gap-3">
                 {isProcessingPhotoLocal && <span className="text-amber-500 text-[9px] font-black animate-pulse">PROCESANDO...</span>}
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{capturedPhotos.length} / 6 FOTOS</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {capturedPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-sm group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                </div>
              ))}
              {capturedPhotos.length < 6 && (
                <button type="button" disabled={!formData.plate || isProcessingPhotoLocal} onClick={() => evidenceInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-40">
                  <Camera size={24} />
                  <span className="text-[8px] font-black uppercase tracking-tight">Agregar</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*" multiple capture="environment" ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhotoLocal || capturedPhotos.length === 0} className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2rem] text-sm uppercase shadow-2xl hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center justify-center gap-4 group">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} />}
            {isSubmitting ? 'CONVIRTIENDO A MOSAICO...' : 'GUARDAR CALIBRACIÓN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CalibrationForm;
