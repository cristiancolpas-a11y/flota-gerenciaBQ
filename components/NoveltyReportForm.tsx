import React, { useState, useRef } from 'react';
import { Vehicle } from '../types';
import { compressImage, normalizePlate, processImageWithWatermark } from '../utils';
import { submitNoveltyReport } from '../services/sheetService';
import { 
  X, ClipboardList, Camera, CheckCircle2, AlertTriangle, 
  Trash2, Image as ImageIcon, Loader2, Calendar, Wrench, 
  Truck, User, Building2, FileText, Send, Check
} from 'lucide-react';

interface NoveltyReportFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onSuccess?: () => void;
}

const TALLERES = [
  "ELECTRONIC",
  "VEHIPESA",
  "TODOFIBRA",
  "ETM",
  "COUNTRY MOTORS",
  "TECNIBENZ"
];

export const CORREO_TALLER: Record<string, string> = {
  "ELECTRONIC": "cristian.colpas2018@gmail.com",
  "VEHIPESA":   "cristian.colpas2018@gmail.com",
  "TODOFIBRA":  "cristian.colpas2018@gmail.com",
  "ETM":        "cristian.colpas2018@gmail.com",
  "COUNTRY MOTORS": "cristian.colpas2018@gmail.com",
  "TECNIBENZ":  "cristian.colpas2018@gmail.com"
};
export const CC_NOVEDADES = "cristian.colpas2018@gmail.com";

const NoveltyReportForm: React.FC<NoveltyReportFormProps> = ({ vehicles, onClose, onSuccess }) => {
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPlate, setSelectedPlate] = useState('');
  const [plateSearch, setPlateSearch] = useState('');
  const [cd, setCd] = useState('');
  const [contratista, setContratista] = useState('');
  const [conductor, setConductor] = useState('');
  const [novedad, setNovedad] = useState('');
  const [taller, setTaller] = useState('');
  
  const [evidencia1, setEvidencia1] = useState<string>('');
  const [evidencia2, setEvidencia2] = useState<string>('');
  
  const [isProcessing1, setIsProcessing1] = useState(false);
  const [isProcessing2, setIsProcessing2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Filtrado de vehículos para selector
  const filteredVehicles = React.useMemo(() => {
    let list = [...vehicles];
    if (plateSearch) {
      const q = plateSearch.toUpperCase().trim();
      list = list.filter(v => v.plate.includes(q) || (v.cd && v.cd.toUpperCase().includes(q)) || (v.contractor && v.contractor.toUpperCase().includes(q)));
    }
    return list.sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, plateSearch]);

  // Al seleccionar placa, autocompletar CD y Contratista
  const handleSelectPlate = (plateVal: string) => {
    const norm = normalizePlate(plateVal);
    setSelectedPlate(norm);
    const found = vehicles.find(v => normalizePlate(v.plate) === norm);
    if (found) {
      if (found.cd) setCd(found.cd);
      if (found.contractor) setContratista(found.contractor);
    }
  };

  // Helper para geolocalización
  const getCoords = (): Promise<{lat: number, lng: number} | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(undefined),
        { timeout: 4000 }
      );
    });
  };

  // Procesador de imagen con canvas y marca de agua
  const handleProcessFile = async (file: File, target: 1 | 2) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    if (target === 1) setIsProcessing1(true);
    else setIsProcessing2(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const rawBase64 = reader.result as string;
          const coords = await getCoords();
          const watermarked = await processImageWithWatermark(
            rawBase64,
            `NOVEDAD: ${selectedPlate || 'FLOTA'}`,
            coords,
            fecha
          );
          const finalCompressed = await compressImage(watermarked, 1200);

          if (target === 1) setEvidencia1(finalCompressed);
          else setEvidencia2(finalCompressed);
        } catch (err) {
          console.error('Error procesando imagen:', err);
          // Fallback a compresión simple
          const fallback = await compressImage(reader.result as string, 1000);
          if (target === 1) setEvidencia1(fallback);
          else setEvidencia2(fallback);
        } finally {
          if (target === 1) setIsProcessing1(false);
          else setIsProcessing2(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      if (target === 1) setIsProcessing1(false);
      else setIsProcessing2(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedPlate) {
      setErrorMessage('Por favor seleccione una placa de la flota.');
      return;
    }
    if (!novedad.trim()) {
      setErrorMessage('Por favor describa la novedad o falla del vehículo.');
      return;
    }
    if (!taller) {
      setErrorMessage('Por favor seleccione el taller encargado.');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await submitNoveltyReport({
        fecha,
        cd: cd.trim(),
        contratista: contratista.trim(),
        plate: normalizePlate(selectedPlate),
        conductor: conductor.trim(),
        novedad: novedad.trim(),
        taller,
        evidencia1,
        evidencia2
      });

      if (success) {
        setIsSuccess(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setErrorMessage('No se pudo guardar la novedad en Google Sheets. Por favor intente nuevamente.');
      }
    } catch (err: any) {
      console.error('Error al enviar reporte de novedad:', err);
      setErrorMessage(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-[#0D2B4E] text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
              <ClipboardList size={26} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-300">Registro Operativo</span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">Reporte de Novedades</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {isSuccess ? (
            <div className="py-12 px-4 text-center space-y-4 animate-in zoom-in duration-300">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg border-2 border-emerald-200">
                <CheckCircle2 size={44} />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 uppercase">¡Novedad Reportada con Éxito!</h3>
                <p className="text-slate-500 text-sm font-medium">
                  Se ha registrado en la hoja <b>NOVEDADES</b> y se notificó por correo al taller <b>{taller}</b>.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl border border-emerald-200">
                  <Check size={16} /> Correo de notificación enviado
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs font-bold animate-in fade-in">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. ORDEN DE TRABAJO (AUTOMÁTICA) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Orden de Trabajo (OT)</span>
                  <p className="text-sm font-black text-slate-800 tracking-tight">Se generará automáticamente</p>
                </div>
                <span className="px-3 py-1 bg-[#0D2B4E] text-cyan-300 text-[10px] font-black uppercase tracking-widest rounded-lg">
                  Automático
                </span>
              </div>

              {/* 2. FECHA */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Calendar size={14} className="text-[#0D2B4E]" /> Fecha del Reporte *
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2B4E] transition-all"
                />
              </div>

              {/* 3. PLACA */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Truck size={14} className="text-[#0D2B4E]" /> Placa del Vehículo *
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar placa..."
                      value={plateSearch}
                      onChange={(e) => setPlateSearch(e.target.value.toUpperCase())}
                      className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-bold uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0D2B4E]"
                    />
                  </div>
                  <select
                    value={selectedPlate}
                    onChange={(e) => handleSelectPlate(e.target.value)}
                    required
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0D2B4E] transition-all cursor-pointer uppercase"
                  >
                    <option value="">-- SELECCIONE UNA PLACA --</option>
                    {filteredVehicles.map(v => (
                      <option key={v.id || v.plate} value={v.plate}>
                        {v.plate} {v.cd ? `(${v.cd})` : ''} {v.model ? `- ${v.model}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4 & 5. CD Y CONTRATISTA (AUTOCOMPLETADOS Y EDITABLES) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Building2 size={14} className="text-[#0D2B4E]" /> Centro de Distribución (CD)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. BARRANQUILLA, GALAPA..."
                    value={cd}
                    onChange={(e) => setCd(e.target.value.toUpperCase())}
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Building2 size={14} className="text-[#0D2B4E]" /> Contratista / Proveedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. RENTING, LOGIS..."
                    value={contratista}
                    onChange={(e) => setContratista(e.target.value.toUpperCase())}
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]"
                  />
                </div>
              </div>

              {/* 6. CONDUCTOR */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <User size={14} className="text-[#0D2B4E]" /> Conductor / Operador Responsable
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo del conductor..."
                  value={conductor}
                  onChange={(e) => setConductor(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2B4E]"
                />
              </div>

              {/* 7. NOVEDAD (TEXTAREA) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FileText size={14} className="text-[#0D2B4E]" /> Descripción de la Novedad *
                </label>
                <textarea
                  rows={4}
                  placeholder="Describa en detalle la falla mecánica, eléctrica o novedad que presenta el vehículo..."
                  value={novedad}
                  onChange={(e) => setNovedad(e.target.value)}
                  required
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2B4E] transition-all resize-none"
                />
              </div>

              {/* 8. TALLER (DESPLEGABLE) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Wrench size={14} className="text-[#0D2B4E]" /> Taller Asignado *
                </label>
                <select
                  value={taller}
                  onChange={(e) => setTaller(e.target.value)}
                  required
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-black text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2B4E] cursor-pointer"
                >
                  <option value="">-- SELECCIONE EL TALLER --</option>
                  {TALLERES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {taller && (
                  <p className="text-[10px] text-slate-500 font-bold ml-1">
                    ✉️ Se enviará notificación automática a: <span className="text-indigo-600">{CORREO_TALLER[taller] || CC_NOVEDADES}</span>
                  </p>
                )}
              </div>

              {/* 9. EVIDENCIAS FOTOGRÁFICAS (2 FOTOS) */}
              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Camera size={14} className="text-[#0D2B4E]" /> Evidencias de Reporte (Fotos)
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Máx. 2 fotos</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* FOTO 1 */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                      Evidencia de Reporte 1
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef1}
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFile(file, 1);
                      }}
                      className="hidden"
                    />

                    {evidencia1 ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 group aspect-[4/3]">
                        <img src={evidencia1} alt="Evidencia 1" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef1.current?.click()}
                            className="p-2.5 rounded-xl bg-white/90 text-slate-800 hover:bg-white text-xs font-bold"
                          >
                            Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEvidencia1('')}
                            className="p-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[9px] font-black text-white uppercase">
                          Foto 1 Lista
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef1.current?.click()}
                        disabled={isProcessing1}
                        className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0D2B4E] bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-2 p-4 text-slate-500 transition-all cursor-pointer"
                      >
                        {isProcessing1 ? (
                          <>
                            <Loader2 size={24} className="animate-spin text-[#0D2B4E]" />
                            <span className="text-[11px] font-bold">Procesando foto...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#0D2B4E]">
                              <Camera size={20} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Tomar / Subir Foto 1</span>
                            <span className="text-[10px] text-slate-400">Tocar para capturar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* FOTO 2 */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                      Evidencia de Reporte 2
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef2}
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFile(file, 2);
                      }}
                      className="hidden"
                    />

                    {evidencia2 ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 group aspect-[4/3]">
                        <img src={evidencia2} alt="Evidencia 2" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef2.current?.click()}
                            className="p-2.5 rounded-xl bg-white/90 text-slate-800 hover:bg-white text-xs font-bold"
                          >
                            Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEvidencia2('')}
                            className="p-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[9px] font-black text-white uppercase">
                          Foto 2 Lista
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef2.current?.click()}
                        disabled={isProcessing2}
                        className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0D2B4E] bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-2 p-4 text-slate-500 transition-all cursor-pointer"
                      >
                        {isProcessing2 ? (
                          <>
                            <Loader2 size={24} className="animate-spin text-[#0D2B4E]" />
                            <span className="text-[11px] font-bold">Procesando foto...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#0D2B4E]">
                              <Camera size={20} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">Tomar / Subir Foto 2</span>
                            <span className="text-[10px] text-slate-400">Tocar para capturar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-1/3 h-14 rounded-2xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isProcessing1 || isProcessing2}
                  className="w-full sm:w-2/3 h-14 rounded-2xl bg-[#0D2B4E] hover:bg-[#071d36] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Guardando y Enviando Correo...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Enviar Reporte de Novedad
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};

export default NoveltyReportForm;
