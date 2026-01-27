
import React, { useState, useRef } from 'react';
import { FiveSReport } from '../types';
import { compressImage, createMosaic } from '../utils';
import { X, CheckCircle, Camera, Plus, Trash2, Loader2, Save } from 'lucide-react';

interface FiveSClosureFormProps {
  report: FiveSReport;
  onClose: () => void;
  onSubmit: (reportId: string, closureData: any) => Promise<void>;
}

const FiveSClosureForm: React.FC<FiveSClosureFormProps> = ({ report, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

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
    if (capturedPhotos.length === 0) {
      alert("Capture al menos una foto de la solución.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const mosaicEvidence = await createMosaic(capturedPhotos);
      
      const closureData = {
        status: 'CERRADO',
        totalScore: 100,
        closureDate: new Date().toISOString().split('T')[0],
        closureEvidenceUrl: mosaicEvidence,
        closureObservations: 'HALLAZGO SUBSANADO'
      };
      
      await onSubmit(report.id, closureData);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al cerrar el hallazgo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[80] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={64} className="text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">¡CIERRE EXITOSO!</h2>
          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-4">Hallazgo marcado como Resuelto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4 overflow-y-auto">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-emerald-600 overflow-hidden animate-in zoom-in duration-300">
        
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <CheckCircle size={24} />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">CIERRE 5S: {report.plate}</h2>
              <p className="text-[9px] text-emerald-100 font-bold uppercase tracking-widest">Capture evidencia de la solución</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                 <Camera size={18} /> EVIDENCIA DE SOLUCIÓN
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
                  className="aspect-square rounded-[2rem] border-4 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 shadow-inner"
                >
                  <Plus size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Añadir</span>
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
                CERRANDO...
              </>
            ) : (
              <>
                <Save size={24} className="group-hover:scale-110 transition-transform"/> 
                FINALIZAR CIERRE 5S
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FiveSClosureForm;
