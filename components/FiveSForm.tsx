
import React, { useState, useRef, useEffect } from 'react';
import { Vehicle } from '../types';
import { compressImage, createMosaic, processImageWithWatermark } from '../utils';
import { X, ShieldCheck, Camera, CheckCircle, Save, Plus, Trash2, Loader2, Calendar } from 'lucide-react';

interface FiveSFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  preSelectedPlate?: string;
}

const FiveSForm: React.FC<FiveSFormProps> = ({ vehicles, onClose, onSubmit, preSelectedPlate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    plate: preSelectedPlate || '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.plate) {
      if (!formData.plate) alert("Seleccione la placa antes de tomar la foto.");
      return;
    }

    setIsProcessingPhoto(true);

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

    const reader = new FileReader();
    reader.onloadend = async () => {
      // Estampar marca de agua profesional 5S
      const watermarked = await processImageWithWatermark(reader.result as string, formData.plate, coords);
      setCapturedPhotos(prev => [...prev, watermarked].slice(0, 6));
      setIsProcessingPhoto(false);
    };
    reader.readAsDataURL(file);
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || capturedPhotos.length === 0) {
      alert("Por favor seleccione una placa y capture al menos una foto.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const mosaicEvidence = await createMosaic(capturedPhotos);
      const payload = {
        ...formData,
        id: `5S-${Date.now()}`,
        inspector: 'AUDITORÍA 5S',
        observations: 'REPORTE RÁPIDO DE CAMIÓN',
        evidenceUrl: mosaicEvidence,
        totalScore: 0
      };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al guardar el reporte 5S.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={64} className="text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">¡REPORTADO!</h2>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-4">Evidencia GPS guardada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-white overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#0f172a] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">AUDITORÍA 5S</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Registro visual con GPS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white">
          {!preSelectedPlate && (
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Seleccionar Camión</label>
              <select required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none appearance-none" value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value })}>
                <option value="">PLACA...</option>
                {vehicles.sort((a,b) => a.plate.localeCompare(b.plate)).map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                 <Camera size={18} /> EVIDENCIA FOTOGRÁFICA
              </span>
              <div className="flex items-center gap-4">
                {isProcessingPhoto && <span className="text-amber-500 text-[9px] font-black animate-pulse">ESTAMPANDO GPS...</span>}
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{capturedPhotos.length} / 6</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {capturedPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-md">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(index)} className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-xl shadow-lg"><Trash2 size={16} /></button>
                </div>
              ))}
              {capturedPhotos.length < 6 && (
                <button type="button" disabled={!formData.plate || isProcessingPhoto} onClick={() => evidenceInputRef.current?.click()} className="aspect-square rounded-[2rem] border-4 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-all disabled:opacity-40">
                  <Plus size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center px-1">Tomar Foto</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*" capture="environment" ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhoto || capturedPhotos.length === 0} className="w-full py-6 bg-emerald-600 text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl hover:bg-emerald-700 disabled:opacity-30 transition-all flex items-center justify-center gap-4 group">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
            {isSubmitting ? 'SUBIENDO...' : 'FINALIZAR REPORTE 5S'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FiveSForm;
