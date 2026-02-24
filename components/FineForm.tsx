
import React, { useState, useRef, useMemo } from 'react';
import { Vehicle, Driver } from '../types';
import { processImageWithWatermark } from '../utils';
import { X, Gavel, Camera, Save, Loader2, CheckCircle, User, FileSignature, AlertCircle, FileText, UploadCloud } from 'lucide-react';

interface FineFormProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const FineForm: React.FC<FineFormProps> = ({ vehicles, drivers, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    plate: '',
    driverId: '',
    date: new Date().toISOString().split('T')[0],
    infractionCode: '',
    description: '',
    amount: '',
    status: 'PENDIENTE',
    paymentAgreement: 'NO',
    evidenceUrl: '',
    fileName: ''
  });

  const availableDrivers = useMemo(() => {
    return drivers.sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.plate) {
      if (!formData.plate) alert("Seleccione la placa primero.");
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      
      if (file.type === 'application/pdf') {
        // Si es PDF, lo guardamos tal cual (base64)
        setFormData(prev => ({ ...prev, evidenceUrl: base64, fileName: file.name }));
      } else if (file.type.startsWith('image/')) {
        // Si es imagen, aplicamos marca de agua
        const watermarked = await processImageWithWatermark(base64, `MULTA: ${formData.plate}`);
        setFormData(prev => ({ ...prev, evidenceUrl: watermarked, fileName: file.name }));
      }
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.driverId) {
      alert("Por favor complete Placa y Conductor responsable.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const selectedVehicle = vehicles.find(v => v.plate === formData.plate);
      const selectedDriver = drivers.find(d => d.identification === formData.driverId);
      
      const payload = { 
        ...formData, 
        id: `FINE-${Date.now()}`, 
        amount: parseFloat(formData.amount) || 0,
        cd: selectedVehicle?.cd || 'GENERAL',
        contractor: selectedVehicle?.contractor || 'GENERAL',
        driverName: selectedDriver?.name || 'DESCONOCIDO',
        driverId: selectedDriver?.identification || formData.driverId,
        driverPosition: selectedDriver?.position || 'CONDUCTOR'
      };

      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      alert("Error al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
        <div className="bg-white p-12 rounded-[3rem] text-center border-4 border-rose-500 shadow-2xl">
          <CheckCircle size={60} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase">¡MULTA REGISTRADA!</h2>
        </div>
      </div>
    );
  }

  const isPdf = formData.evidenceUrl.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border-[6px] border-[#0f172a] overflow-hidden">
        <div className="bg-[#0f172a] p-8 text-white flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-tighter">REGISTRO DE COMPARENDO</h2>
          <button onClick={onClose} className="p-2 hover:bg-rose-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Placa</label>
              <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm" 
                value={formData.plate} onChange={e => setFormData({ ...formData, plate: e.target.value })}>
                <option value="">-- PLACA --</option>
                {vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Fecha Infracción</label>
              <input required type="date" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2"><User size={12}/> Conductor Responsable</label>
             <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-xs uppercase" 
                value={formData.driverId} onChange={e => setFormData({ ...formData, driverId: e.target.value })}>
                <option value="">-- SELECCIONE CONDUCTOR --</option>
                {availableDrivers.map(d => <option key={d.id} value={d.identification}>{d.name}</option>)}
             </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Código</label>
              <input required type="text" placeholder="Ej: C02" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm" value={formData.infractionCode} onChange={e => setFormData({ ...formData, infractionCode: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Valor ($)</label>
              <input required type="number" className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
             <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1"><FileSignature size={12}/> Acuerdo de Pago</label>
               <select required className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-sm uppercase" 
                  value={formData.paymentAgreement} onChange={e => setFormData({ ...formData, paymentAgreement: e.target.value })}>
                  <option value="NO">NO</option>
                  <option value="SI">SI</option>
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Estado Multa</label>
               <div className="px-4 py-3 bg-rose-50 border-2 border-rose-100 text-rose-600 rounded-2xl text-xs font-black text-center uppercase">
                  {formData.status}
               </div>
             </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Concepto / Descripción</label>
            <textarea required rows={2} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value.toUpperCase() })} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1 flex justify-between">
              <span>Soporte (PDF o Foto)</span>
              {formData.evidenceUrl ? <span className="text-emerald-500">LISTO ✓</span> : <span className="text-slate-400 font-normal">Opcional</span>}
            </label>
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full py-5 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all ${formData.evidenceUrl ? 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-inner' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-400'}`}>
              {isPdf ? <FileText size={28} /> : <UploadCloud size={28} />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {formData.evidenceUrl ? (isPdf ? 'PDF ADJUNTO ✓' : 'FOTO CAPTURADA ✓') : 'SUBIR PDF O TOMAR FOTO'}
              </span>
            </button>
            <input type="file" accept="application/pdf,image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          </div>

          <button type="submit" disabled={isSubmitting || isProcessingFile} className="w-full py-5 bg-[#0f172a] text-white font-black rounded-[2rem] shadow-2xl hover:bg-rose-600 transition-all flex items-center justify-center gap-3 active:scale-95">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {isSubmitting ? 'REGISTRANDO...' : 'GUARDAR MULTA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FineForm;
