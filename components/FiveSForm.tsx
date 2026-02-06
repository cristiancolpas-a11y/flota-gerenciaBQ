
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Vehicle } from '../types';
import { compressImage, createMosaic, processImageWithWatermark, normalizeStr } from '../utils';
import { X, ShieldCheck, Camera, CheckCircle, Save, Plus, Trash2, Loader2, Calendar, Building2, UserCircle, AlertCircle } from 'lucide-react';

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

  // Filtros internos para búsqueda de placa
  const [filterCd, setFilterCd] = useState<string>('all');
  const [filterContractor, setFilterContractor] = useState<string>('all');

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    plate: preSelectedPlate || '',
    date: new Date().toISOString().split('T')[0],
  });

  // 1. Obtener CDs únicos de la base maestra
  const availableCds = useMemo(() => {
    const unique = Array.from(new Set(vehicles.map(v => (v.cd || "GENERAL").toUpperCase().trim()).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  // 2. Obtener Contratistas únicos según el CD seleccionado
  const availableContractors = useMemo(() => {
    const filteredByCd = filterCd === 'all' 
      ? vehicles 
      : vehicles.filter(v => normalizeStr(v.cd || "") === normalizeStr(filterCd));
    
    const unique = Array.from(new Set(filteredByCd.map(v => (v.contractor || "GENERAL").toUpperCase().trim()).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [vehicles, filterCd]);

  // 3. Filtrar vehículos según CD y Contratista
  const filteredVehiclesList = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const matchContractor = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      return matchCd && matchContractor;
    }).sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, filterCd, filterContractor]);

  const handleCdChange = (val: string) => {
    setFilterCd(val);
    setFilterContractor('all');
    setFormData(prev => ({ ...prev, plate: '' }));
  };

  const handleContractorChange = (val: string) => {
    setFilterContractor(val);
    setFormData(prev => ({ ...prev, plate: '' }));
  };

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
      
      const vehicle = vehicles.find(v => v.plate === formData.plate);
      
      const payload = {
        ...formData,
        id: `5S-${Date.now()}`,
        inspector: 'SISTEMA 5S',
        observations: 'REPORTE RÁPIDO DE CAMIÓN',
        evidenceUrl: mosaicEvidence,
        totalScore: 0,
        cd: vehicle?.cd || 'GENERAL',
        contractor: vehicle?.contractor || 'GENERAL'
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
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-[#0f172a] overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#0f172a] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">5S CAMIONES</h2>
              <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Auditoría Visual con GPS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
          
          {/* SECCIÓN DE FILTROS (Solo si no hay pre-selección) */}
          {!preSelectedPlate && (
            <div className="bg-emerald-50/50 p-6 rounded-[2.5rem] border-2 border-emerald-100/50 shadow-inner space-y-4">
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <Building2 size={12} className="text-emerald-600" /> CENTRO DE DISTRIBUCIÓN
                  </label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-[11px] font-black uppercase outline-none focus:border-emerald-500 transition-all shadow-sm" 
                    value={filterCd} 
                    onChange={(e) => handleCdChange(e.target.value)}
                  >
                    <option value="all">-- TODOS LOS CENTROS --</option>
                    {availableCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                  </select>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <UserCircle size={12} className="text-emerald-600" /> CONTRATISTA / OPERADOR
                  </label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-[11px] font-black uppercase outline-none focus:border-emerald-500 transition-all shadow-sm disabled:opacity-50" 
                    value={filterContractor} 
                    onChange={(e) => handleContractorChange(e.target.value)}
                  >
                    <option value="all">-- TODOS LOS CONTRATISTAS --</option>
                    {availableContractors.map(c => <option key={c} value={c}>{c}</option>)}
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
                {filteredVehiclesList.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
              </select>
              {filteredVehiclesList.length === 0 && !preSelectedPlate && (
                <p className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 mt-1 px-2">
                  <AlertCircle size={12} /> No hay vehículos en estos filtros
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">FECHA DE INSPECCIÓN</label>
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
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                 <Camera size={18} /> REGISTRO DE HALLAZGO
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
                  <button type="button" onClick={() => removePhoto(index)} className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                </div>
              ))}
              {capturedPhotos.length < 6 && (
                <button 
                  type="button" 
                  disabled={!formData.plate || isProcessingPhoto} 
                  onClick={() => evidenceInputRef.current?.click()} 
                  className="aspect-square rounded-[2rem] border-4 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-all disabled:opacity-40 shadow-inner"
                >
                  <Plus size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center px-1">Tomar Foto</span>
                </button>
              )}
            </div>
            <input type="file" accept="image/*" capture="environment" ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingPhoto || capturedPhotos.length === 0} className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2.5rem] text-sm uppercase shadow-2xl hover:bg-emerald-600 disabled:opacity-30 transition-all flex items-center justify-center gap-4 group">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
            {isSubmitting ? 'SUBIENDO...' : 'FINALIZAR REPORTE 5S'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FiveSForm;
