
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Vehicle } from '../types';
import { createMosaic, processImageWithWatermark, compressImage, normalizeStr, normalizePlate } from '../utils';
import { X, Droplets, Camera, CheckCircle, Save, Plus, Trash2, Loader2, Sparkles, MapPin, Building2, Image as ImageIcon, Search, AlertCircle } from 'lucide-react';

interface WashFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const WashForm: React.FC<WashFormProps> = ({ vehicles, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);

  // Filtro interno por CD para agilizar la búsqueda de placa
  const [filterCd, setFilterCd] = useState<string>('all');

  const [capturedPhotos, setCapturedPhotos] = useState<{url: string, type: 'ANTES' | 'DESPUES'}[]>([]);
  const [formData, setFormData] = useState({
    plate: '',
    date: new Date().toISOString().split('T')[0],
    workshop: '',
    mapUrl: '',
  });

  // 1. Obtener lista única de Centros de Distribución de la flota maestra
  const availableCds = useMemo(() => {
    const unique = Array.from(new Set(vehicles.map(v => (v.cd || "GENERAL").toUpperCase().trim()).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  // 2. Filtrar vehículos del CD seleccionado para el menú desplegable de placas
  const filteredVehiclesList = useMemo(() => {
    return vehicles.filter(v => {
      const vCd = (v.cd || "GENERAL").toUpperCase().trim();
      const matchCd = filterCd === 'all' || normalizeStr(vCd) === normalizeStr(filterCd);
      return matchCd;
    }).sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, filterCd]);

  const handleCdChange = (val: string) => {
    setFilterCd(val);
    setFormData(prev => ({ ...prev, plate: '' })); // Limpiar placa seleccionada al cambiar CD para evitar errores
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
    const photoType: 'ANTES' | 'DESPUES' = capturedPhotos.length < 1 ? 'ANTES' : 'DESPUES';

    const reader = new FileReader();
    reader.onloadend = async () => {
      const watermarked = await processImageWithWatermark(reader.result as string, `${formData.plate} - ${photoType}`, coords);
      setCapturedPhotos(prev => [...prev, { url: watermarked, type: photoType }].slice(0, 4));
      setIsProcessingPhoto(false);
    };
    reader.readAsDataURL(file);
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
  };

  const handleMapCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 800);
        setFormData(prev => ({ ...prev, mapUrl: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || capturedPhotos.length < 1 || !formData.mapUrl || !formData.workshop) {
      alert("Por favor complete todos los campos: Placa, Taller, Mapa y al menos 1 Foto de evidencia.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const mosaicEvidence = await createMosaic(capturedPhotos.map(p => p.url));
      const payload = {
        ...formData,
        id: `WASH-${Date.now()}`,
        evidenceUrl: mosaicEvidence,
      };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al registrar el lavado. Intente de nuevo.");
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
              <Droplets size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">REGISTRO DE LAVADO</h2>
              <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">Control Operativo de Flota</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-rose-500 rounded-xl transition-all"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
          
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

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">UNIDAD VEHICULAR (PLACA)</label>
              <select 
                required 
                className={`w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none appearance-none shadow-inner transition-all ${filteredVehiclesList.length === 0 ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}
                value={formData.plate} 
                onChange={e => setFormData({ ...formData, plate: e.target.value })}
              >
                <option value="">{filteredVehiclesList.length === 0 ? '-- SIN VEHÍCULOS --' : '-- SELECCIONE PLACA --'}</option>
                {filteredVehiclesList.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
              </select>
              {filteredVehiclesList.length === 0 && (
                <p className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 mt-1 px-2">
                  <AlertCircle size={12} /> No hay vehículos registrados en este centro
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">TALLER / LUGAR DE LAVADO</label>
              <input 
                required 
                type="text" 
                placeholder="EJ: ESTACIÓN CENTRAL" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none uppercase shadow-inner" 
                value={formData.workshop} 
                onChange={e => setFormData({ ...formData, workshop: e.target.value.toUpperCase() })} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-2 flex items-center gap-2">
              <MapPin size={18} /> EVIDENCIA DE UBICACIÓN (MAPA)
            </label>
            <button 
              type="button" 
              onClick={() => mapInputRef.current?.click()} 
              className={`w-full py-6 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all shadow-inner ${formData.mapUrl ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-400'}`}
            >
              <ImageIcon size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">{formData.mapUrl ? 'MAPA CAPTURADO ✓' : 'CAPTURAR MAPA DE TALLER'}</span>
            </button>
            <input type="file" accept="image/*" capture="environment" ref={mapInputRef} className="hidden" onChange={handleMapCapture} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] font-black text-cyan-600 uppercase tracking-widest flex items-center gap-2">
                 <Camera size={18} /> EVIDENCIA ANTES/DESPUÉS
              </span>
              <div className="flex items-center gap-4">
                {isProcessingPhoto && <span className="text-amber-500 text-[9px] font-black animate-pulse flex items-center gap-1"><MapPin size={10}/> ESTAMPANDO GPS...</span>}
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{capturedPhotos.length} / 4</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {capturedPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-video rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-md">
                  <img src={photo.url} className="w-full h-full object-cover" />
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[7px] font-black text-white ${photo.type === 'ANTES' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    {photo.type}
                  </div>
                  <button type="button" onClick={() => removePhoto(index)} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-transform"><Trash2 size={12} /></button>
                </div>
              ))}
              {capturedPhotos.length < 4 && (
                <button 
                  type="button" 
                  disabled={!formData.plate || isProcessingPhoto} 
                  onClick={() => evidenceInputRef.current?.click()} 
                  className="aspect-video rounded-[2rem] border-4 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-600 transition-all disabled:opacity-40 shadow-inner"
                >
                  <Plus size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {capturedPhotos.length < 1 ? 'FOTO ANTES' : 'FOTO DESPUÉS'}
                  </span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*" capture="environment" ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhoto || capturedPhotos.length < 1 || !formData.mapUrl} className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl hover:bg-cyan-600 disabled:opacity-30 transition-all flex items-center justify-center gap-4 group">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
            {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR LAVADO'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WashForm;
