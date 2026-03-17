
import React, { useState, useEffect } from 'react';
import { X, Camera, Save, Loader2, Calculator, Calendar, Truck, Gauge } from 'lucide-react';
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
  const [week, setWeek] = useState('');
  const [month, setMonth] = useState('');
  const [frequency, setFrequency] = useState(5000);
  const [lastKm, setLastKm] = useState(0);
  const [nextKm, setNextKm] = useState(0);
  const [currentKm, setCurrentKm] = useState(0);
  const [difference, setDifference] = useState(0);
  const [compliance, setCompliance] = useState<'Cumplió' | 'No cumplió'>('Cumplió');
  const [validation, setValidation] = useState('');
  const [evidence, setEvidence] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate difference and compliance
  useEffect(() => {
    const diff = currentKm - nextKm;
    setDifference(diff);
    // Rule: If difference is <= 0 (or within a small margin, let's say 0 for now) -> Cumplió
    if (diff <= 0) {
      setCompliance('Cumplió');
    } else {
      setCompliance('No cumplió');
    }
  }, [currentKm, nextKm]);

  // Auto-calculate next maintenance
  useEffect(() => {
    if (lastKm > 0 && frequency > 0) {
      setNextKm(lastKm + frequency);
    }
  }, [lastKm, frequency]);

  // Auto-set week and month based on date
  useEffect(() => {
    if (date) {
      const d = new Date(date + "T12:00:00");
      const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      setMonth(months[d.getMonth()]);
      
      // Calculate week number
      const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
      const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
      setWeek(Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7).toString());
    }
  }, [date]);

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
        week,
        month,
        date,
        plate,
        frequency,
        lastKm,
        nextKm,
        currentKm,
        difference,
        compliance,
        validation,
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
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <div className="bg-indigo-600 p-8 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Registrar Preventivo</h2>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Nuevo mantenimiento de flota</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehículo (Placa)</label>
                <div className="relative">
                  <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    value={plate} 
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all uppercase"
                    required
                  >
                    <option value="">Seleccione Vehículo</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plate}>{v.plate}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Ejecución</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Semana</label>
                  <input 
                    type="text" 
                    value={week}
                    readOnly
                    className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mes</label>
                  <input 
                    type="text" 
                    value={month}
                    readOnly
                    className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Kilometraje Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frecuencia (KM)</label>
                  <input 
                    type="number" 
                    value={frequency}
                    onChange={(e) => setFrequency(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Último MTTO (KM)</label>
                  <input 
                    type="number" 
                    value={lastKm}
                    onChange={(e) => setLastKm(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Próximo MTTO (KM)</label>
                  <input 
                    type="number" 
                    value={nextKm}
                    readOnly
                    className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">KM Actual (Registro)</label>
                  <input 
                    type="number" 
                    value={currentKm}
                    onChange={(e) => setCurrentKm(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diferencia (KM)</label>
                  <input 
                    type="number" 
                    value={difference}
                    readOnly
                    className={`w-full border-2 rounded-2xl px-6 py-4 font-black outline-none ${
                      difference > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cumplimiento</label>
                  <div className={`w-full border-2 rounded-2xl px-6 py-4 font-black text-center text-[10px] uppercase tracking-widest ${
                    compliance === 'Cumplió' ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-rose-500 border-rose-600 text-white'
                  }`}>
                    {compliance}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validación Cumplimiento</label>
              <textarea 
                value={validation}
                onChange={(e) => setValidation(e.target.value)}
                placeholder="Notas de validación..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all min-h-[100px]"
              />
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
                    <div className="relative w-full max-h-[200px] rounded-xl overflow-hidden shadow-lg">
                      <img src={evidence} alt="Preview" className="w-full h-full object-contain bg-black" />
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
            className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3 shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" /> PROCESANDO...
              </>
            ) : (
              <>
                <Save size={20} /> GUARDAR REGISTRO PREVENTIVO
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PreventiveUpdateForm;
