
import React, { useState } from 'react';
import { X, Camera, Save, Loader2, AlertCircle } from 'lucide-react';
import { Vehicle, Preventive } from '../types';

interface PreventiveUpdateFormProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  vehicles: Vehicle[];
  initialData?: Preventive | null;
}

const PreventiveUpdateForm: React.FC<PreventiveUpdateFormProps> = ({ onClose, onSubmit, vehicles, initialData }) => {
  const [plate, setPlate] = useState(initialData?.plate || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [compliance, setCompliance] = useState<'Cumplió' | 'No cumplió'>('Cumplió');
  const [evidence, setEvidence] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidence(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !date || !evidence) {
      alert('Por favor complete todos los campos y suba una evidencia.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        plate,
        date,
        compliance,
        evidence
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al guardar los datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-indigo-600 p-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
              <Camera size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Registro Preventivo</h2>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Actualizar ejecución y soporte</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehículo (Placa)</label>
              <select 
                value={plate} 
                onChange={(e) => setPlate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all uppercase"
                required
              >
                <option value="">Seleccione Vehículo</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.plate}>{v.plate}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Ejecución</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cumplimiento en Rangos</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCompliance('Cumplió')}
                  className={`py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border-2 ${
                    compliance === 'Cumplió' 
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200'
                  }`}
                >
                  Cumplió
                </button>
                <button
                  type="button"
                  onClick={() => setCompliance('No cumplió')}
                  className={`py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border-2 ${
                    compliance === 'No cumplió' 
                    ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20' 
                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-rose-200'
                  }`}
                >
                  No cumplió
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Evidencia (Imagen)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="preventive-evidence"
                  required={!evidence}
                />
                <label 
                  htmlFor="preventive-evidence"
                  className={`w-full flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                    evidence ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {evidence ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg">
                      <img src={evidence} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-black text-[10px] uppercase tracking-widest">Cambiar Imagen</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                        <Camera size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir Soporte Fotográfico</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" /> PROCESANDO...
              </>
            ) : (
              <>
                <Save size={20} /> GUARDAR REGISTRO
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PreventiveUpdateForm;
