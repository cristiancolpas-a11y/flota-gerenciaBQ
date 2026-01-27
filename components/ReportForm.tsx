
import React, { useState, useRef } from 'react';
import { Report, Vehicle } from '../types';
// Fixed: Changed mergeImagesVertical to createMosaic as it is the correct utility available in utils.ts
import { compressImage, createMosaic } from '../utils';
import { X, ClipboardList, Camera, CheckCircle, MapPin, Plus, Trash2, Image as ImageIcon, Loader2, Calendar } from 'lucide-react';

interface ReportFormProps {
  onClose: () => void;
  onSubmit: (report: any) => Promise<void>;
  vehicles: Vehicle[];
}

const ReportForm: React.FC<ReportFormProps> = ({ onClose, onSubmit, vehicles }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);
  
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    id: `OT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
    plate: '',
    source: 'REPORTE OPERATIVO',
    novelty: '',
    initialEvidence: '',
    entryMap: '',
    workshop: '',
    date: new Date().toISOString().split('T')[0]
  });

  const sources = ["CHECK LIST", "REPORTE OPERATIVO", "REPORTE ADMINISTRATIVO", "ESTANDAR DE FLOTA"];
  
  const workshops = [
    "AUTECO", "AUTOMUNDIAL", "CAMION COLOMBIA", "MOTORES DE CAMPO", "DIVERMOTORS", 
    "GARCILLANTAS", "ROINCOR", "TECNIBENZ", "TODOFIBRAS", "TRAMICÓN", 
    "VEHÍCULOS", "COÉXITO", "ETM", "AUTOCARIBE", "NAVITRANS", "OTROS"
  ];

  const sortedVehicles = [...vehicles].sort((a, b) => a.plate.localeCompare(b.plate));

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 800);
        setCapturedPhotos(prev => [...prev, compressed]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleMapChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 800);
        setFormData(prev => ({ ...prev, entryMap: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.novelty || !formData.workshop || capturedPhotos.length === 0 || !formData.entryMap) {
      alert("Por favor complete todos los campos y capture al menos una foto de evidencia.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Fixed: Using createMosaic instead of mergeImagesVertical to combine captured photos as requested in the novelty report
      const mergedInitialEvidence = await createMosaic(capturedPhotos);
      
      const payload = { 
        ...formData, 
        initialEvidence: mergedInitialEvidence,
        status: 'ABIERTO' // Forzamos estado ABIERTO como se solicitó
      };
      
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
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={64} className="text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-tight">¡REPORTE ABIERTO!</h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-4">Novedad vinculada correctamente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border-[6px] border-[#0f172a] overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-[#0f172a] p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">NUEVO REPORTE</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Estado automático: ABIERTO</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-red-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Fecha del Reporte
              </label>
              <input type="date" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:border-indigo-500 outline-none transition-all" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={14} /> Placa Vehicular
              </label>
              <select 
                required 
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all appearance-none" 
                value={formData.plate} 
                onChange={e => setFormData({ ...formData, plate: e.target.value })}
              >
                <option value="">-- SELECCIONE PLACA --</option>
                {sortedVehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Taller Asignado</label>
              <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800" value={formData.workshop} onChange={e => setFormData({ ...formData, workshop: e.target.value })}>
                <option value="">SELECCIONE TALLER</option>
                {workshops.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Fuente del Reporte</label>
              <select className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Descripción de la Novedad</label>
            <textarea required rows={3} placeholder="Describa el hallazgo detalladamente..." className="w-full border-2 border-slate-200 rounded-3xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 resize-none shadow-inner" value={formData.novelty} onChange={e => setFormData({ ...formData, novelty: e.target.value })} />
          </div>

          {/* SECCIÓN MULTI-FOTO */}
          <div className="space-y-4">
            <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-between">
              Evidencia Fotográfica (1 o más)
              <span className="text-slate-400 font-bold">{capturedPhotos.length} fotos tomadas</span>
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {capturedPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-indigo-100 group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-lg hover:scale-110 transition-transform"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button 
                type="button" 
                onClick={() => evidenceInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"
              >
                <Plus size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest">Añadir Foto</span>
              </button>
            </div>
            <input type="file" accept="image/*" capture="environment" ref={evidenceInputRef} className="hidden" onChange={handleAddPhoto} />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Mapa de Ingreso (Obligatorio)</label>
            <button 
              type="button" 
              onClick={() => mapInputRef.current?.click()} 
              className={`w-full py-5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${formData.entryMap ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-300 text-slate-500 hover:border-indigo-400'}`}
            >
              <MapPin size={24} /> 
              <span className="text-[10px] font-black uppercase tracking-widest">{formData.entryMap ? 'MAPA CAPTURADO' : 'CAPTURAR MAPA DE INGRESO'}</span>
            </button>
            <input type="file" accept="image/*" capture="environment" ref={mapInputRef} className="hidden" onChange={handleMapChange} />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2rem] text-sm uppercase shadow-2xl hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center justify-center gap-4 group"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                VINCULANDO Y ENVIANDO...
              </>
            ) : (
              <>
                <CheckCircle size={24} className="group-hover:scale-110 transition-transform" />
                GUARDAR Y ABRIR NOVEDAD
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportForm;
