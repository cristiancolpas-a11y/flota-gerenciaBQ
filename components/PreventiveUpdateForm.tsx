
import React, { useState, useEffect } from 'react';
import { X, Camera, Save, Loader2, Calculator, Calendar, Truck, Gauge } from 'lucide-react';
import { Vehicle, Preventive } from '../types';
import { compressImage, createMosaic } from '../utils';

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
  const [evidence, setEvidence] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      if (evidence.length + files.length > 4) {
        alert('Máximo 4 fotos permitidas.');
        return;
      }
      
      const newEvidences: string[] = [];
      let processed = 0;

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const compressed = await compressImage(reader.result as string, 1200);
            newEvidences.push(compressed);
          } catch (e) {
            console.error("Error compressing image:", e);
            newEvidences.push(reader.result as string); // Fallback to uncompressed
          }
          
          processed++;
          if (processed === files.length) {
            setEvidence(prev => [...prev, ...newEvidences]);
          }
        };
        reader.readAsDataURL(file);
      });
      
      // Reset input value so the same file can be selected again if removed
      e.target.value = '';
    }
  };

  const removeEvidence = (index: number) => {
    setEvidence(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || evidence.length === 0) {
      alert('Por favor seleccione la placa y suba al menos una foto de evidencia.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create mosaic to ensure only ONE link is generated in the sheet
      const mosaic = await createMosaic(evidence, `PREVENTIVO - ${plate}`);
      
      await onSubmit({
        plate,
        evidence: mosaic // Send ONLY identification (Plate) and evidence
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
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600">
                <Truck size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehículo Seleccionado</p>
                {initialData ? (
                  <p className="text-xl font-black text-slate-900">{plate || 'Sin Placa'}</p>
                ) : (
                  <select 
                    value={plate} 
                    onChange={(e) => setPlate(e.target.value)}
                    className="bg-transparent border-b-2 border-indigo-200 font-black text-slate-900 outline-none focus:border-indigo-500 transition-all uppercase text-lg"
                    required
                  >
                    <option value="">Seleccione Placa</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plate}>{v.plate}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha de Registro</p>
              <p className="text-sm font-black text-slate-600">{new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Evidencia Fotográfica (Hasta 4 imágenes)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="preventive-evidence"
                  disabled={evidence.length >= 4}
                />
                
                {evidence.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {evidence.map((img, idx) => (
                      <div key={idx} className="relative w-full h-32 rounded-xl overflow-hidden shadow-lg group/img">
                        <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover bg-black" />
                        <button 
                          type="button"
                          onClick={() => removeEvidence(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-rose-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {evidence.length < 4 && (
                  <label 
                    htmlFor="preventive-evidence"
                    className="w-full flex flex-col items-center justify-center gap-3 p-12 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 group"
                  >
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all">
                      <Camera size={32} />
                    </div>
                    <div className="text-center">
                      <span className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        {evidence.length > 0 ? `Subir más fotos (${evidence.length}/4)` : 'Subir Soporte Fotográfico'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Máximo 4 imágenes permitidas</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3 shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" /> PROCESANDO...
              </>
            ) : (
              <>
                <Save size={20} /> GUARDAR EVIDENCIA
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PreventiveUpdateForm;
