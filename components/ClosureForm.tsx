
import React, { useState, useRef } from 'react';
import { Report } from '../types';
import { compressImage, createMosaic } from '../utils';
import { X, CheckCircle2, Camera, Trash2, Loader2, Plus, Eye, Layers, Upload } from 'lucide-react';

interface ClosureFormProps {
  report: Report;
  onClose: () => void;
  onSubmit: (reportId: string, closureData: Partial<Report> & { evidenceClose1?: string; evidenceClose2?: string }) => Promise<void>;
}

const ClosureForm: React.FC<ClosureFormProps> = ({ report, onClose, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos1, setPhotos1] = useState<string[]>([]);
  const [photos2, setPhotos2] = useState<string[]>([]);
  const [isProcessing1, setIsProcessing1] = useState(false);
  const [isProcessing2, setIsProcessing2] = useState(false);
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ title: string; image: string } | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);

  const processFiles = async (slot: 1 | 2, fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const currentPhotos = slot === 1 ? photos1 : photos2;
    const setPhotos = slot === 1 ? setPhotos1 : setPhotos2;
    const setProcessing = slot === 1 ? setIsProcessing1 : setIsProcessing2;

    const availableSlots = 4 - currentPhotos.length;
    if (availableSlots <= 0) {
      alert("Ya has alcanzado el límite máximo de 4 fotos para esta evidencia.");
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    setProcessing(true);

    try {
      const compressedImages: string[] = [];
      for (const file of filesToProcess) {
        const rawBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        try {
          const compressed = await compressImage(rawBase64, 1200);
          compressedImages.push(compressed);
        } catch (e) {
          console.warn("Fallo compresión, usando imagen original:", e);
          compressedImages.push(rawBase64);
        }
      }

      setPhotos(prev => [...prev, ...compressedImages].slice(0, 4));
    } catch (err) {
      console.error("Error al procesar imágenes:", err);
      alert("Hubo un problema al procesar las imágenes seleccionadas.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePreviewCollage = async (slot: 1 | 2) => {
    const targetPhotos = slot === 1 ? photos1 : photos2;
    if (targetPhotos.length === 0) return;

    setIsGeneratingPreview(true);
    try {
      const title = `EVIDENCIA ${slot}: ${report.plate} - ${report.id || 'OT'}`;
      const collage = await createMosaic(targetPhotos, title);
      setPreviewModal({ title: `Vista Previa Collage - Evidencia ${slot}`, image: collage });
    } catch (err) {
      console.error("Error creando vista previa de collage:", err);
      alert("No se pudo generar la vista previa del collage.");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos1.length === 0 && photos2.length === 0) {
      alert("Por favor adjunta al menos una foto en Evidencia 1 o Evidencia 2.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generar collage automático para Evidencia 1
      let collage1 = '';
      if (photos1.length > 0) {
        collage1 = await createMosaic(photos1, `EVIDENCIA 1: ${report.plate} - ${report.id || 'CIERRE'}`);
      }

      // Generar collage automático para Evidencia 2
      let collage2 = '';
      if (photos2.length > 0) {
        collage2 = await createMosaic(photos2, `EVIDENCIA 2: ${report.plate} - ${report.id || 'CIERRE'}`);
      }

      const today = new Date().toISOString().split('T')[0];
      await onSubmit(report.id, {
        closureDate: today,
        solutionEvidence: collage1 || collage2,
        evidenceClose1: collage1,
        evidenceClose2: collage2,
        status: 'CERRADO' as any
      });
      onClose();
    } catch (err) {
      console.error("Error cerrando novedad:", err);
      alert("Error al confirmar el cierre de la novedad. Intenta nuevamente.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[70] p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl p-5 sm:p-7 relative border border-slate-100 my-auto animate-in zoom-in-95 duration-200">
          
          {/* HEADER */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block bg-[#eef2ff] text-[#4f46e5] font-black text-[11px] px-2.5 py-1 rounded-md tracking-wider uppercase">
                {report.id || 'OT-0001'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#0f172a] uppercase tracking-tight mt-1.5">
                CIERRE DE NOVEDAD - {report.plate}
              </h2>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="w-9 h-9 shrink-0 rounded-full bg-[#f1f5f9] hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="border-b border-slate-100 my-4" />

          {/* INFO FALLA Y TALLER */}
          <div className="bg-[#f8fafc] rounded-2xl p-3.5 sm:p-4 border border-sky-100/80 space-y-1 mb-5">
            <p className="text-xs sm:text-sm text-slate-700 leading-snug">
              <strong className="font-black text-slate-900">Falla Reportada:</strong>{' '}
              {report.novelty || (report as any).falla || 'Sin falla reportada'}
            </p>
            <p className="text-xs sm:text-sm text-slate-700 leading-snug">
              <strong className="font-black text-slate-900">Taller:</strong>{' '}
              {report.workshop || (report as any).taller || 'ELECTRONIC'}
            </p>
          </div>

          {/* SECCIÓN EVIDENCIAS (HASTA 4 FOTOS CADA UNA CON COLLAGE) */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-600" />
                ADJUNTAR EVIDENCIAS DE SOLUCIÓN / CIERRE
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                Hasta 4 fotos por evidencia • Collage automático
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* EVIDENCIA 1 */}
              <div className="bg-slate-50/60 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Evidencia Cierre 1 <span className="text-rose-500">*</span>
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${photos1.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                      {photos1.length}/4 fotos
                    </span>
                  </div>

                  {photos1.length === 0 ? (
                    <div
                      onClick={() => !isProcessing1 && inputRef1.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging1(true); }}
                      onDragLeave={() => setIsDragging1(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging1(false);
                        if (e.dataTransfer.files) processFiles(1, e.dataTransfer.files);
                      }}
                      className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all aspect-[4/3] text-center ${
                        isDragging1 
                          ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                          : 'border-sky-200 hover:border-sky-300 bg-sky-50/25 hover:bg-sky-50/50'
                      } ${isProcessing1 ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      {isProcessing1 ? (
                        <Loader2 size={26} className="text-indigo-600 animate-spin" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-sky-100 flex items-center justify-center text-slate-500">
                          <Camera size={20} strokeWidth={1.8} />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          {isProcessing1 ? 'Procesando fotos...' : 'Subir hasta 4 fotos'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Haz clic o arrastra aquí
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 aspect-[4/3] w-full">
                        {photos1.map((p, i) => (
                          <div key={i} className="relative rounded-lg overflow-hidden border border-indigo-200 bg-slate-900 group">
                            <img src={p} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.2 rounded">
                              #{i + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPhotos1(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors cursor-pointer shadow-sm"
                              title="Eliminar esta foto"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}

                        {photos1.length < 4 && (
                          <button
                            type="button"
                            onClick={() => inputRef1.current?.click()}
                            disabled={isProcessing1}
                            className="rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white/80 hover:bg-indigo-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                          >
                            {isProcessing1 ? (
                              <Loader2 size={16} className="animate-spin text-indigo-600" />
                            ) : (
                              <>
                                <Plus size={18} strokeWidth={2.5} />
                                <span className="text-[9px] font-black uppercase mt-0.5">+ Foto</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <input
                    ref={inputRef1}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) processFiles(1, e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>

                {photos1.length > 0 && (
                  <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Collage listo
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreviewCollage(1)}
                        disabled={isGeneratingPreview}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Eye size={11} /> Ver collage
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotos1([])}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* EVIDENCIA 2 */}
              <div className="bg-slate-50/60 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Evidencia Cierre 2 <span className="text-slate-400 text-[10px] font-medium">(Opcional)</span>
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${photos2.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                      {photos2.length}/4 fotos
                    </span>
                  </div>

                  {photos2.length === 0 ? (
                    <div
                      onClick={() => !isProcessing2 && inputRef2.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging2(true); }}
                      onDragLeave={() => setIsDragging2(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging2(false);
                        if (e.dataTransfer.files) processFiles(2, e.dataTransfer.files);
                      }}
                      className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all aspect-[4/3] text-center ${
                        isDragging2 
                          ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                          : 'border-sky-200 hover:border-sky-300 bg-sky-50/25 hover:bg-sky-50/50'
                      } ${isProcessing2 ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      {isProcessing2 ? (
                        <Loader2 size={26} className="text-indigo-600 animate-spin" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-sky-100 flex items-center justify-center text-slate-500">
                          <Camera size={20} strokeWidth={1.8} />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          {isProcessing2 ? 'Procesando fotos...' : 'Subir hasta 4 fotos'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Haz clic o arrastra aquí
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 aspect-[4/3] w-full">
                        {photos2.map((p, i) => (
                          <div key={i} className="relative rounded-lg overflow-hidden border border-indigo-200 bg-slate-900 group">
                            <img src={p} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.2 rounded">
                              #{i + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPhotos2(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors cursor-pointer shadow-sm"
                              title="Eliminar esta foto"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}

                        {photos2.length < 4 && (
                          <button
                            type="button"
                            onClick={() => inputRef2.current?.click()}
                            disabled={isProcessing2}
                            className="rounded-lg border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white/80 hover:bg-indigo-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                          >
                            {isProcessing2 ? (
                              <Loader2 size={16} className="animate-spin text-indigo-600" />
                            ) : (
                              <>
                                <Plus size={18} strokeWidth={2.5} />
                                <span className="text-[9px] font-black uppercase mt-0.5">+ Foto</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <input
                    ref={inputRef2}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) processFiles(2, e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>

                {photos2.length > 0 && (
                  <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Collage listo
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreviewCollage(2)}
                        disabled={isGeneratingPreview}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Eye size={11} /> Ver collage
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotos2([])}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#f1f5f9] hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || (photos1.length === 0 && photos2.length === 0)}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#00965e] hover:bg-[#008352] disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>CREANDO COLLAGE Y GUARDANDO...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                  <span>CONFIRMAR CIERRE</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* MODAL DE VISTA PREVIA DEL COLLAGE */}
      {previewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 relative shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900 uppercase">
                {previewModal.title}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="py-3 overflow-auto flex items-center justify-center">
              <img
                src={previewModal.image}
                alt="Vista previa collage"
                className="rounded-xl max-h-[70vh] object-contain shadow-md border border-slate-200"
              />
            </div>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-black uppercase rounded-xl hover:bg-slate-900 cursor-pointer"
              >
                Cerrar vista previa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClosureForm;

