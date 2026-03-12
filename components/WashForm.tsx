
import React, { useState, useRef, useMemo } from 'react';
import { Vehicle } from '../types';
import { processImageWithWatermark, compressImage, normalizeStr, normalizePlate, getWeekNumber, createMosaic } from '../utils';
import { X, Droplets, Camera, Save, Plus, Trash2, Loader2, Sparkles, MapPin, Building2, Image as ImageIcon, Calendar } from 'lucide-react';

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

  const [filterCd, setFilterCd] = useState<string>('all');
  const [plateSearch, setPlateSearch] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    plate: '',
    date: new Date().toISOString().split('T')[0],
    workshop: 'VEHIPESA',
    mapUrl: '',
  });

  const availableCds = useMemo(() => {
    const unique = Array.from(new Set(vehicles.map(v => (v.cd || "GENERAL").toUpperCase().trim()).filter(Boolean)));
    return (unique as string[]).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehiclesList = useMemo(() => {
    let list = vehicles.filter(v => {
      const vCd = (v.cd || "GENERAL").toUpperCase().trim();
      const matchCd = filterCd === 'all' || normalizeStr(vCd) === normalizeStr(filterCd);
      return matchCd;
    });

    if (plateSearch) {
      const search = plateSearch.toUpperCase().trim();
      list = list.filter(v => v.plate.includes(search));
    }

    const sorted = list.sort((a, b) => a.plate.localeCompare(b.plate));
    
    // Auto-select if only one result and not already selected
    if (sorted.length === 1 && formData.plate !== sorted[0].plate && plateSearch.length >= 3) {
      setFormData(prev => ({ ...prev, plate: sorted[0].plate }));
    }

    return sorted;
  }, [vehicles, filterCd, plateSearch, formData.plate]);

  const handleCdChange = (val: string) => {
    setFilterCd(val);
    setFormData(prev => ({ ...prev, plate: '' }));
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.plate) return;

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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhoto(true);
    
    for (let i = 0; i < files.length; i++) {
      if (photos.length + i >= 4) break;
      const file = files[i];
      
      const watermarked = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = await processImageWithWatermark(reader.result as string, `${formData.plate}`, coords, formData.date);
          resolve(res);
        };
        reader.readAsDataURL(file);
      });
      
      setPhotos(prev => [...prev, watermarked].slice(0, 4));
    }
    
    setIsProcessingPhoto(false);
    if (evidenceInputRef.current) evidenceInputRef.current.value = "";
  };

  const handleMapCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1920);
        setFormData(prev => ({ ...prev, mapUrl: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || photos.length === 0 || !formData.workshop) {
      alert("Por favor complete todos los campos: Placa, Taller y Evidencia.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const dateObj = new Date(formData.date + "T12:00:00");
      const month = dateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      const week = getWeekNumber(dateObj).toString();

      // Include map in the mosaic if it exists
      const mosaicPhotos = [...photos];
      // if (formData.mapUrl) {
      //   mosaicPhotos.push(formData.mapUrl);
      // }

      const mergedEvidence = await createMosaic(mosaicPhotos, `LAVADO: ${formData.plate} - ${formData.date}`);

      const payload = {
        ...formData,
        id: `LAV-${Date.now()}`,
        month,
        week,
        evidenceUrl: mergedEvidence,
      };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al registrar el lavado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[95] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-indigo-500 shadow-2xl animate-in zoom-in duration-300">
          <Sparkles size={64} className="text-indigo-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-tight">¡LAVADO REGISTRADO!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4 overflow-y-auto">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-[#0f172a] overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#0f172a] p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg">
              <Droplets size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">REGISTRO DE LAVADO</h2>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Control de Higiene</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-rose-500 rounded-xl transition-all"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
          <div className="bg-indigo-50/40 p-6 rounded-[2.5rem] border-2 border-indigo-100/50 shadow-inner">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5 mb-2">
              <Building2 size={12} className="text-indigo-600" /> FILTRAR POR CENTRO (C.D.)
            </label>
            <select 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 transition-all shadow-sm" 
              value={filterCd} 
              onChange={(e) => handleCdChange(e.target.value)}
            >
              <option value="all">-- TODOS LOS CENTROS --</option>
              {availableCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-end px-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">UNIDAD VEHICULAR (PLACA)</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="BUSCAR PLACA..." 
                    className="bg-slate-100 border-none rounded-lg px-3 py-1 text-[10px] font-black uppercase outline-none focus:ring-2 ring-indigo-500/30 w-32 transition-all"
                    value={plateSearch}
                    onChange={(e) => setPlateSearch(e.target.value)}
                  />
                </div>
              </div>
              <select 
                required 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none appearance-none shadow-inner transition-all"
                value={formData.plate} 
                onChange={e => setFormData({ ...formData, plate: e.target.value })}
              >
                <option value="">-- {filteredVehiclesList.length === 0 ? 'SIN RESULTADOS' : 'SELECCIONE PLACA'} --</option>
                {filteredVehiclesList.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">TALLER / LUGAR</label>
              <input 
                required 
                type="text" 
                placeholder="VEHIPESA" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-800 outline-none uppercase shadow-inner" 
                value={formData.workshop} 
                onChange={e => setFormData({ ...formData, workshop: e.target.value.toUpperCase() })} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <Calendar size={14} className="text-indigo-600" /> FECHA
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

          <div className="space-y-4">
            <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-2 flex items-center gap-2">
              <MapPin size={18} /> UBICACIÓN (MAPA)
            </label>
            <button 
              type="button" 
              onClick={() => mapInputRef.current?.click()} 
              className={`w-full py-6 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all shadow-inner ${formData.mapUrl ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-400'}`}
            >
              <ImageIcon size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">{formData.mapUrl ? 'MAPA CAPTURADO ✓' : 'CAPTURAR MAPA'}</span>
            </button>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" ref={mapInputRef} className="hidden" onChange={handleMapCapture} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                 <Camera size={18} /> EVIDENCIA (MAX 4 FOTOS)
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{photos.length} / 4</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, idx) => (
                <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                  <img src={p} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-transform"><Trash2 size={14} /></button>
                </div>
              ))}
              {photos.length < 4 && (
                <button 
                  type="button" 
                  disabled={!formData.plate || isProcessingPhoto} 
                  onClick={() => evidenceInputRef.current?.click()} 
                  className="w-full aspect-video rounded-2xl border-4 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all disabled:opacity-40 shadow-inner"
                >
                  <Plus size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest">AÑADIR FOTO</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhoto || photos.length === 0} className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl hover:bg-indigo-600 disabled:opacity-30 transition-all flex items-center justify-center gap-4 group">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
            {isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR LAVADO'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WashForm;
