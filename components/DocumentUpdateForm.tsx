
import React, { useState, useRef } from 'react';
import { Vehicle } from '../types';
import { compressImage, processImageWithWatermark } from '../utils';
import { X, ShieldCheck, Camera, CheckCircle, Save, Loader2, Calendar, FileText, Flame } from 'lucide-react';

interface DocumentUpdateFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const DocumentUpdateForm: React.FC<DocumentUpdateFormProps> = ({ vehicles, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    plate: '',
    type: 'SOAT',
    expiryDate: '',
    url: '',
    cd: ''
  });

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.plate) {
      if (!formData.plate) alert("Seleccione la placa primero.");
      return;
    }
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const watermarked = await processImageWithWatermark(reader.result as string, formData.plate);
      setFormData(prev => ({ ...prev, url: watermarked }));
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.expiryDate || !formData.url) {
      alert("Complete todos los campos y tome la foto del soporte.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      alert("Error al enviar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
        <div className="bg-white p-12 rounded-[3rem] text-center border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={60} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase">¡DOCUMENTO REGISTRADO!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border-[6px] border-[#0f172a] overflow-hidden">
        <div className="bg-[#0f172a] p-8 text-white flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-tighter">REGISTRO DE VENCIMIENTO</h2>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-rose-500"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Placa</label>
            <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 font-black" 
              value={formData.plate} 
              onChange={e => {
                const v = vehicles.find(v => v.plate === e.target.value);
                setFormData({ ...formData, plate: e.target.value, cd: v?.cd || '' });
              }}>
              <option value="">-- SELECCIONE --</option>
              {vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Documento</label>
              <select className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 font-black" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                <option value="SOAT">SOAT</option>
                <option value="RTM">RTM (TECNOMECÁNICA)</option>
                <option value="EXTINTOR">EXTINTOR</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Vencimiento</label>
              <input required type="date" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 font-black" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-between">
              Soporte Fotográfico
              {isProcessing && <Loader2 size={16} className="animate-spin" />}
            </label>
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full py-8 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all ${formData.url ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <Camera size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">{formData.url ? 'FOTO CAPTURADA ✓' : 'TOMAR FOTO SOPORTE'}</span>
            </button>
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleCapture} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessing} className="w-full py-6 bg-[#0f172a] text-white font-black rounded-[2rem] shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {isSubmitting ? 'REGISTRANDO...' : 'GUARDAR SEGUIMIENTO'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DocumentUpdateForm;
