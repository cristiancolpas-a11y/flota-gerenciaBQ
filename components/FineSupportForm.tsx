
import React, { useState, useRef } from 'react';
import { Fine } from '../types';
import { processImageWithWatermark, createMosaic } from '../utils';
import { X, Camera, Save, Loader2, CheckCircle, FileText, UploadCloud, AlertCircle, Trash2 } from 'lucide-react';

interface FineSupportFormProps {
  fine: Fine;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const FineSupportForm: React.FC<FineSupportFormProps> = ({ fine, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [fileData, setFileData] = useState({ url: '', name: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setIsProcessing(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFileData({ url: reader.result as string, name: file.name });
          setPhotos([]);
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
        return;
      } else if (file.type.startsWith('image/')) {
        if (photos.length + i >= 4) break;
        
        const watermarked = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const res = await processImageWithWatermark(reader.result as string, `SOPORTE MULTA: ${fine.plate}`, undefined, fine.date);
            resolve(res);
          };
          reader.readAsDataURL(file);
        });
        
        setPhotos(prev => [...prev, watermarked].slice(0, 4));
        setFileData({ url: '', name: 'FOTOS CAPTURADAS' });
      }
    }
    
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData.url && photos.length === 0) {
      alert("Por favor seleccione un archivo PDF o tome una foto.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let finalUrl = fileData.url;
      if (photos.length > 0) {
        finalUrl = await createMosaic(photos, `SOPORTE MULTA: ${fine.plate} - ${fine.infractionCode}`);
      }

      await onSubmit({ 
        ...fine,
        evidenceUrl: finalUrl,
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
              <span>EVIDENCIA (PDF O FOTOS MAX 4)</span>
              {isProcessing && <Loader2 size={14} className="animate-spin" />}
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100">
                  <img src={p} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg"><Trash2 size={12} /></button>
                </div>
              ))}
              {photos.length < 4 && !fileData.url.startsWith('data:application/pdf') && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full aspect-square border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all ${photos.length > 0 ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'}`}>
                  <UploadCloud size={32} />
                  <div className="text-center px-2">
                    <p className="text-[9px] font-black uppercase tracking-widest">
                      {photos.length > 0 ? 'Añadir Foto' : 'Subir PDF o Fotos'}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {fileData.url.startsWith('data:application/pdf') && (
              <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="text-emerald-600" />
                  <span className="text-[10px] font-black uppercase text-emerald-700 truncate max-w-[150px]">{fileData.name}</span>
                </div>
                <button type="button" onClick={() => setFileData({ url: '', name: '' })} className="p-1.5 bg-rose-500 text-white rounded-lg"><Trash2 size={12} /></button>
              </div>
            )}

            <input type="file" accept="application/pdf,image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isProcessing || (!fileData.url && photos.length === 0)} 
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
