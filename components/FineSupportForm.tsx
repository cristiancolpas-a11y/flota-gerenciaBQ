
import React, { useState, useRef } from 'react';
import { Fine } from '../types';
import { processImageWithWatermark } from '../utils';
import { X, Camera, Save, Loader2, CheckCircle, FileText, UploadCloud, AlertCircle } from 'lucide-react';

interface FineSupportFormProps {
  fine: Fine;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const FineSupportForm: React.FC<FineSupportFormProps> = ({ fine, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState({ url: '', name: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      if (file.type === 'application/pdf') {
        setFileData({ url: base64, name: file.name });
      } else if (file.type.startsWith('image/')) {
        const watermarked = await processImageWithWatermark(base64, `SOPORTE MULTA: ${fine.plate}`);
        setFileData({ url: watermarked, name: file.name });
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData.url) {
      alert("Por favor seleccione un archivo PDF o tome una foto.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({ 
        ...fine,
        evidenceUrl: fileData.url,
        updateMode: true
      });
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      alert("Error al actualizar el soporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100]">
        <div className="bg-white p-12 rounded-[3rem] text-center border-4 border-emerald-500 shadow-2xl">
          <CheckCircle size={60} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase">¡SOPORTE GUARDADO!</h2>
        </div>
      </div>
    );
  }

  const isPdf = fileData.url.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[95] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border-[6px] border-[#0f172a] overflow-hidden">
        <div className="bg-[#0f172a] p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter leading-none">REGISTRAR SOPORTE</h2>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Multa: {fine.infractionCode}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-[#0f172a] text-white rounded-xl font-mono font-black text-xl">
              {fine.plate}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</p>
              <p className="text-sm font-black text-slate-800 uppercase leading-none">{fine.driverName}</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1 flex justify-between items-center">
              <span>EVIDENCIA (PDF O IMAGEN)</span>
              {isProcessing && <Loader2 size={14} className="animate-spin" />}
            </label>
            
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className={`w-full py-12 rounded-[2rem] border-4 border-dashed flex flex-col items-center justify-center gap-4 transition-all ${fileData.url ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'}`}
            >
              {isPdf ? <FileText size={48} /> : (fileData.url ? <CheckCircle size={48} /> : <UploadCloud size={48} />)}
              <div className="text-center px-4">
                <p className="text-[10px] font-black uppercase tracking-widest">
                  {fileData.url ? (isPdf ? 'PDF SELECCIONADO ✓' : 'FOTO CAPTURADA ✓') : 'SUBIR PDF O TOMAR FOTO'}
                </p>
                {fileData.name && <p className="text-[8px] font-bold text-slate-400 mt-1 truncate max-w-[200px]">{fileData.name}</p>}
              </div>
            </button>
            <input type="file" accept="application/pdf,image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isProcessing || !fileData.url} 
            className="w-full py-5 bg-[#0f172a] text-white font-black rounded-[2rem] shadow-2xl hover:bg-emerald-600 disabled:opacity-40 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {isSubmitting ? 'GUARDANDO...' : 'VINCULAR SOPORTE'}
          </button>
          
          <div className="flex items-center gap-2 justify-center text-slate-400 bg-slate-50 py-3 rounded-xl border border-slate-100">
             <AlertCircle size={14} />
             <p className="text-[9px] font-black uppercase">Se permite archivo PDF o captura directa</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FineSupportForm;
