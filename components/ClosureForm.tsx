
import React, { useState, useRef, useEffect } from 'react';
import { Report } from '../types';
import { compressImage, createMosaic, processImageWithWatermark } from '../utils';
import { X, CheckCircle, Camera, MapPin, Wrench, Trash2, Plus, Loader2, ImageIcon, Image as ImageIconLucide } from 'lucide-react';

interface ClosureFormProps {
  report: Report;
  onClose: () => void;
  onSubmit: (reportId: string, closureData: Partial<Report>) => Promise<void>;
}

const ClosureForm: React.FC<ClosureFormProps> = ({ report, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  
  const workshopInputRef = useRef<HTMLInputElement>(null);
  const solutionInputRef = useRef<HTMLInputElement>(null);
  const mapExitInputRef = useRef<HTMLInputElement>(null);
  
  const [workshopPhotos, setWorkshopPhotos] = useState<string[]>([]);
  const [solutionPhotos, setSolutionPhotos] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    closureDate: new Date().toISOString().split('T')[0],
    exitMap: '',
    closureComments: '',
    daysInShop: 0
  });

  useEffect(() => {
    const start = new Date(report.date);
    const end = new Date(formData.closureDate);
    const diff = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    setFormData(prev => ({ ...prev, daysInShop: diff }));
  }, [formData.closureDate, report.date]);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>, target: 'workshop' | 'solution') => {
    const files = e.target.files;
    if (!files || !files.length) return;

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
    const label = target === 'workshop' ? 'TRABAJO TALLER' : 'SOLUCION FINAL';

    for (let i = 0; i < files.length; i++) {
      const currentPhotos = target === 'workshop' ? workshopPhotos : solutionPhotos;
      if (currentPhotos.length + i >= 4) break;
      const file = files[i];
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, `${report.plate} - ${label}`, coords, formData.closureDate);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });

      if (target === 'workshop') {
        setWorkshopPhotos(prev => [...prev, watermarked].slice(0, 4));
      } else {
        setSolutionPhotos(prev => [...prev, watermarked].slice(0, 4));
      }
    }
    
    setIsProcessingPhoto(false);
    if (e.target) e.target.value = "";
  };

  const handleMapCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1920);
        setFormData(prev => ({ ...prev, exitMap: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number, target: 'workshop' | 'solution') => {
    if (target === 'workshop') {
      setWorkshopPhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setSolutionPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (solutionPhotos.length === 0 || !formData.exitMap || !formData.closureComments) {
      alert("Por favor complete: Evidencia de Solución, Mapa de Salida y Comentarios.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Generar mosaicos solo antes de enviar
      const workshopMosaic = workshopPhotos.length > 0 ? await createMosaic(workshopPhotos, `TRABAJO TALLER: ${report.plate}`) : "";
      const solutionMosaic = await createMosaic(solutionPhotos, `SOLUCIÓN FINAL: ${report.plate}`);
      
      const closurePayload = {
        ...formData,
        workshopEvidence: workshopMosaic,
        solutionEvidence: solutionMosaic,
        status: 'CERRADO' as const
      };
      
      await onSubmit(report.id, closurePayload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al procesar el cierre. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[80] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={64} className="text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">¡TALLER CERRADO!</h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-4">Sincronizando salida de flota...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border-[6px] border-emerald-600 overflow-hidden animate-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="bg-emerald-600 p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Wrench size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">ORDEN DE SALIDA: {report.plate}</h2>
              <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest">Validación técnica y fotográfica</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-red-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white">
          
          {/* DATOS DE TIEMPO */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha de Salida</label>
              <input required type="date" className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-emerald-500" value={formData.closureDate} onChange={e => setFormData({ ...formData, closureDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Estancia en Taller</label>
              <div className="w-full bg-emerald-500 text-white border-2 border-emerald-400 rounded-xl px-4 py-3 text-sm font-black text-center shadow-lg">
                {formData.daysInShop} DÍAS TOTALES
              </div>
            </div>
          </div>

          {/* EVIDENCIA TALLER (HASTA 4 FOTOS) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Wrench size={16} className="text-amber-500" /> Evidencia en Taller (Proceso)
              </label>
              <span className="text-[10px] font-black text-slate-300">{workshopPhotos.length} / 4</span>
            </div>
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
              {workshopPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-md border-2 border-white group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx, 'workshop')} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                </div>
              ))}
              {workshopPhotos.length < 4 && (
                <button type="button" disabled={isProcessingPhoto} onClick={() => workshopInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-300 hover:border-amber-400 hover:text-amber-500 transition-all">
                  <Plus size={20} />
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={workshopInputRef} className="hidden" onChange={e => handleAddPhoto(e, 'workshop')} />
          </div>

          {/* EVIDENCIA SOLUCIÓN (HASTA 4 FOTOS) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                <Camera size={16} /> Evidencia Solución (Final) *
              </label>
              <span className="text-[10px] font-black text-slate-300">{solutionPhotos.length} / 4</span>
            </div>
            <div className="grid grid-cols-4 gap-3 bg-emerald-50/30 p-4 rounded-2xl border-2 border-dashed border-emerald-200">
              {solutionPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-md border-2 border-white group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx, 'solution')} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                </div>
              ))}
              {solutionPhotos.length < 4 && (
                <button type="button" disabled={isProcessingPhoto} onClick={() => solutionInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-emerald-300 bg-white flex items-center justify-center text-emerald-300 hover:border-emerald-500 hover:text-emerald-600 transition-all">
                  <Plus size={20} />
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={solutionInputRef} className="hidden" onChange={e => handleAddPhoto(e, 'solution')} />
          </div>

          {/* MAPA Y COMENTARIOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-2">
                <MapPin size={16} /> Mapa Salida *
              </label>
              <button type="button" onClick={() => mapExitInputRef.current?.click()} className={`w-full py-5 rounded-2xl border-4 border-dashed flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${formData.exitMap ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <ImageIconLucide size={24} /> 
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.exitMap ? 'MAPA CAPTURADO ✓' : 'FOTO MAPA GPS'}</span>
              </button>
              <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" ref={mapExitInputRef} className="hidden" onChange={handleMapCapture} />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">Comentarios Finales *</label>
              <textarea required rows={3} placeholder="Describa el trabajo realizado y estado final..." className="w-full border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-500 resize-none shadow-inner" value={formData.closureComments} onChange={e => setFormData({ ...formData, closureComments: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhoto || solutionPhotos.length === 0} className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-4 group">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} className="group-hover:scale-110 transition-transform" />}
            {isSubmitting ? 'PROCESANDO CIERRE...' : 'CONFIRMAR SALIDA DE TALLER'}
          </button>
          
          {isProcessingPhoto && (
            <div className="text-center animate-pulse">
               <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em]">Estampando Placa y GPS en evidencia...</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ClosureForm;
