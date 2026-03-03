
import React, { useState, useRef, useMemo } from 'react';
import { Vehicle } from '../types';
import { createMosaic, processImageWithWatermark, normalizeStr, getWeekNumber } from '../utils';
import { X, Camera, Save, Plus, Trash2, Loader2, Sparkles, Building2, AlertCircle, Calendar, Image as ImageIcon } from 'lucide-react';

interface CleaningFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  preSelectedPlate?: string;
  initialDate?: string;
}

const CleaningForm: React.FC<CleaningFormProps> = ({ vehicles, onClose, onSubmit, preSelectedPlate, initialDate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const [filterCd, setFilterCd] = useState<string>('all');
  const [initialPhotos, setInitialPhotos] = useState<string[]>([]);
  const [finalPhotos, setFinalPhotos] = useState<string[]>([]);
  const [activeCaptureType, setActiveCaptureType] = useState<'ANTES' | 'DESPUES' | null>(null);
  
  const [formData, setFormData] = useState({
    plate: preSelectedPlate || '',
    date: initialDate || new Date().toISOString().split('T')[0],
  });

  const availableCds = useMemo(() => {
    const unique = Array.from(new Set(vehicles.map(v => (v.cd || "GENERAL").toUpperCase().trim()).filter(Boolean)));
    return (unique as string[]).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehiclesList = useMemo(() => {
    return vehicles.filter(v => {
      const vCd = (v.cd || "GENERAL").toUpperCase().trim();
      const matchCd = filterCd === 'all' || normalizeStr(vCd) === normalizeStr(filterCd);
      return matchCd;
    }).sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, filterCd]);

  const handleCdChange = (val: string) => {
    setFilterCd(val);
    setFormData(prev => ({ ...prev, plate: '' }));
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.plate) {
      if (!formData.plate) alert("Seleccione la placa antes de capturar la evidencia.");
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
      const watermarked = await processImageWithWatermark(reader.result as string, `${formData.plate}`, coords);
      if (activeCaptureType === 'ANTES') {
        setInitialPhotos(prev => [...prev, watermarked].slice(0, 4));
      } else {
        setFinalPhotos(prev => [...prev, watermarked].slice(0, 4));
      }
      setIsProcessingPhoto(false);
      setActiveCaptureType(null);
    };
    reader.readAsDataURL(file);
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
  };

  const startCapture = (type: 'ANTES' | 'DESPUES') => {
    setActiveCaptureType(type);
    evidenceInputRef.current?.click();
  };

  const removePhoto = (type: 'ANTES' | 'DESPUES', index: number) => {
    if (type === 'ANTES') {
      setInitialPhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setFinalPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || initialPhotos.length === 0 || finalPhotos.length === 0) {
      alert("Por favor complete todos los campos: Placa, al menos una foto ANTES y al menos una foto DESPUÉS.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const dateObj = new Date(formData.date + "T12:00:00");
      const month = dateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      const week = getWeekNumber(dateObj).toString();

      // Create collages
      const initialCollage = await createMosaic(initialPhotos);
      const finalCollage = await createMosaic(finalPhotos);

      const payload = {
        ...formData,
        id: `CLEAN-${Date.now()}`,
        month,
        week,
        initialEvidence: initialCollage,
        finalEvidence: finalCollage,
        status: 'COMPLETADO'
      };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al registrar la limpieza. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[95] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-cyan-500 shadow-2xl animate-in zoom-in duration-300">
          <Sparkles size={64} className="text-cyan-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-tight">¡REGISTRO EXITOSO!</h2>
          <p className="text-cyan-600 font-bold text-[10px] uppercase tracking-widest mt-4">Evidencia enviada correctamente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4 overflow-y-auto">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-[#0f172a] overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#0f172a] p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500 rounded-2xl shadow-lg">
              <ImageIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">REGISTRO DE LIMPIEZA</h2>
              <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">Control Operativo de Flota</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-rose-500 rounded-xl transition-all"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
          
          {!preSelectedPlate && (
            <div className="bg-cyan-50/40 p-6 rounded-[2.5rem] border-2 border-cyan-100/50 shadow-inner">
                <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <Building2 size={12} className="text-cyan-600" /> FILTRAR POR CENTRO (C.D.)
                </label>
                <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-[11px] font-black uppercase outline-none focus:border-cyan-500 transition-all shadow-sm" 
                    value={filterCd} 
                    onChange={(e) => handleCdChange(e.target.value)}
                >
                    <option value="all">-- TODOS LOS CENTROS --</option>
                    {availableCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                </select>
                </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">UNIDAD VEHICULAR (PLACA)</label>
              <select 
                required 
                className={`w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none appearance-none shadow-inner transition-all ${filteredVehiclesList.length === 0 ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}
                value={formData.plate} 
                onChange={e => setFormData({ ...formData, plate: e.target.value })}
                disabled={!!preSelectedPlate}
              >
                <option value="">{filteredVehiclesList.length === 0 ? '-- SIN VEHÍCULOS --' : '-- SELECCIONE PLACA --'}</option>
                {preSelectedPlate ? (
                    <option value={preSelectedPlate}>{preSelectedPlate}</option>
                ) : (
                    filteredVehiclesList.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <Calendar size={14} className="text-cyan-600" /> FECHA DE LIMPIEZA
              </label>
              <input 
                required 
                type="date" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none shadow-inner" 
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] font-black text-cyan-600 uppercase tracking-widest flex items-center gap-2">
                 <Camera size={18} /> EVIDENCIA (ANTES / DESPUÉS)
              </span>
              {isProcessingPhoto && <span className="text-amber-500 text-[9px] font-black animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> PROCESANDO...</span>}
            </div>
            
            <div className="space-y-6">
              {/* Sección ANTES */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">EVIDENCIA ANTES ({initialPhotos.length}/4)</p>
                  {initialPhotos.length < 4 && (
                    <button 
                      type="button" 
                      onClick={() => startCapture('ANTES')}
                      className="text-cyan-600 hover:text-cyan-700 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {initialPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
                      <img src={photo} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto('ANTES', idx)} 
                        className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-md shadow-lg"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {initialPhotos.length < 4 && (
                    <button 
                      type="button" 
                      disabled={!formData.plate || isProcessingPhoto} 
                      onClick={() => startCapture('ANTES')} 
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300 hover:border-cyan-400 hover:text-cyan-600 transition-all disabled:opacity-40"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sección DESPUÉS */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">EVIDENCIA DESPUÉS ({finalPhotos.length}/4)</p>
                  {finalPhotos.length < 4 && (
                    <button 
                      type="button" 
                      onClick={() => startCapture('DESPUES')}
                      className="text-cyan-600 hover:text-cyan-700 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {finalPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
                      <img src={photo} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto('DESPUES', idx)} 
                        className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-md shadow-lg"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {finalPhotos.length < 4 && (
                    <button 
                      type="button" 
                      disabled={!formData.plate || isProcessingPhoto} 
                      onClick={() => startCapture('DESPUES')} 
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300 hover:border-cyan-400 hover:text-cyan-600 transition-all disabled:opacity-40"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input type="file" accept="image/*" capture="environment" ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || isProcessingPhoto || initialPhotos.length === 0 || finalPhotos.length === 0} 
            className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl hover:bg-cyan-600 disabled:opacity-30 transition-all flex items-center justify-center gap-4 group"
          >
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
            {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR LIMPIEZA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CleaningForm;
