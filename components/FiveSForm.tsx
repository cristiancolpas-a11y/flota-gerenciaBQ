
import React, { useState, useRef, useEffect } from 'react';
import { Vehicle } from '../types';
import { compressImage, createMosaic } from '../utils';
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
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    plate: preSelectedPlate || '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (preSelectedPlate) {
      setFormData(prev => ({ ...prev, plate: preSelectedPlate }));
    }
  }, [preSelectedPlate]);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1024);
        setCapturedPhotos(prev => [...prev, compressed]);
      };
      reader.readAsDataURL(file);
    }
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
      // Crear mosaico de las fotos capturadas
      const mosaicEvidence = await createMosaic(capturedPhotos);
      
      const payload = {
        ...formData,
        id: `5S-${Date.now()}`,
        inspector: 'AUDITORÍA 5S', // Valor automático
        observations: 'REPORTE RÁPIDO DE CAMIÓN', // Valor automático
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
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-4">Evidencia guardada con éxito</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-white overflow-hidden animate-in zoom-in duration-300">
        
        {/* HEADER LIMPIO CON PLACA */}
        <div className="bg-[#0f172a] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {preSelectedPlate ? `CAMIÓN: ${preSelectedPlate}` : 'AUDITORÍA 5S'}
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Capture su evidencia visual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white">
          
          {/* Solo mostramos selector si no hay placa previa */}
          {!preSelectedPlate && (
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                 Seleccionar Camión
              </label>
              <select 
                required 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none focus:border-emerald-500 transition-all appearance-none" 
                value={formData.plate} 
                onChange={e => setFormData({ ...formData, plate: e.target.value })}
              >
                <option value="">PLACA...</option>
                {vehicles.sort((a,b) => a.plate.localeCompare(b.plate)).map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-between items-center px-2">
             <div className="flex items-center gap-2 text-slate-300">
                <Calendar size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Fecha:</span>
             </div>
             <input type="date" className="bg-transparent border-none text-right text-xs font-black text-slate-800 outline-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
          </div>

          {/* SECCIÓN FOTOGRÁFICA MOSAICO PRIORIZADA */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                 <Camera size={18} /> EVIDENCIA FOTOGRÁFICA
              </span>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                {capturedPhotos.length} / 4 FOTOS
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {capturedPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-md group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(index)} className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                </div>
              ))}
              
              {capturedPhotos.length < 4 && (
                <button 
                  type="button" 
                  onClick={() => evidenceInputRef.current?.click()}
                  className="aspect-square rounded-[2rem] border-4 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 shadow-inner group"
                >
                  <div className="p-4 bg-white rounded-full shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <Plus size={32} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Añadir Foto</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*" capture="environment" ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || capturedPhotos.length === 0} 
            className="w-full py-6 bg-emerald-600 text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl hover:bg-emerald-700 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-4 group"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                SUBIENDO...
              </>
            ) : (
              <>
                <Save size={24} className="group-hover:scale-110 transition-transform"/> 
                FINALIZAR REPORTE 5S
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FiveSForm;
