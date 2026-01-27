
import React, { useState, useRef, useEffect } from 'react';
import { Report } from '../types';
import { compressImage } from '../utils';
import { X, CheckCircle, Camera, MapPin, Wrench } from 'lucide-react';

interface ClosureFormProps {
  report: Report;
  onClose: () => void;
  onSubmit: (reportId: string, closureData: Partial<Report>) => Promise<void>;
}

const ClosureForm: React.FC<ClosureFormProps> = ({ report, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const solInputRef = useRef<HTMLInputElement>(null);
  const mapExitInputRef = useRef<HTMLInputElement>(null);
  const shopInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    closureDate: new Date().toISOString().split('T')[0],
    workshopEvidence: '',
    solutionEvidence: '',
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'solutionEvidence' | 'exitMap' | 'workshopEvidence') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 600);
        setFormData(prev => ({ ...prev, [field]: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.solutionEvidence || !formData.exitMap) {
      alert("Debe cargar la foto de la solución y el mapa de salida.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(report.id, { ...formData, status: 'CERRADO' });
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al cerrar el reporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm">
          <CheckCircle size={56} className="text-emerald-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">¡TALLER FINALIZADO!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl border-[4px] border-emerald-600 overflow-hidden">
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-tighter">SALIDA DE TALLER</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fecha Salida (Col J)</label>
              <input required type="date" className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={formData.closureDate} onChange={e => setFormData({ ...formData, closureDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Días en Taller (Col M)</label>
              <div className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-3 text-sm font-black text-emerald-700">{formData.daysInShop} DÍAS</div>
            </div>
          </div>

          {/* Campo Nuevo: Evidencia en taller (Col I) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Evidencia en taller (Col I - Opcional)</label>
            <button type="button" onClick={() => shopInputRef.current?.click()} className={`w-full py-3 rounded-xl border-2 border-dashed flex flex-col items-center gap-1 text-[10px] font-black ${formData.workshopEvidence ? 'bg-amber-50 border-amber-500' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
              <Wrench size={18} /> {formData.workshopEvidence ? 'FOTO CARGADA' : 'TOMAR FOTO EN TALLER'}
            </button>
            <input type="file" accept="image/*" capture="environment" ref={shopInputRef} className="hidden" onChange={e => handleFileChange(e, 'workshopEvidence')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Evidencia Solución (Col K)</label>
              <button type="button" onClick={() => solInputRef.current?.click()} className={`w-full py-4 rounded-xl border-2 border-dashed flex flex-col items-center gap-1 text-[10px] font-black ${formData.solutionEvidence ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                <Camera size={20} /> {formData.solutionEvidence ? 'CARGADA' : 'TOMAR FOTO'}
              </button>
              <input type="file" accept="image/*" capture="environment" ref={solInputRef} className="hidden" onChange={e => handleFileChange(e, 'solutionEvidence')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Mapa Salida (Col L)</label>
              <button type="button" onClick={() => mapExitInputRef.current?.click()} className={`w-full py-4 rounded-xl border-2 border-dashed flex flex-col items-center gap-1 text-[10px] font-black ${formData.exitMap ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                <MapPin size={20} /> {formData.exitMap ? 'MAPA CARGADO' : 'TOMAR MAPA'}
              </button>
              <input type="file" accept="image/*" capture="environment" ref={mapExitInputRef} className="hidden" onChange={e => handleFileChange(e, 'exitMap')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Comentarios de Cierre (Col N)</label>
            <textarea required rows={2} placeholder="Describa el trabajo realizado..." className="w-full border-2 border-gray-400 rounded-xl px-4 py-3 text-sm font-bold outline-none resize-none shadow-sm" value={formData.closureComments} onChange={e => setFormData({ ...formData, closureComments: e.target.value })} />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase shadow-xl hover:bg-emerald-700 disabled:opacity-50">
            {isSubmitting ? 'CERRANDO...' : 'REGISTRAR SALIDA DE TALLER'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClosureForm;
