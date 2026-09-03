import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Vehicle, NoveltyReport } from '../types';
import { compressImage, normalizePlate, processImageWithWatermark } from '../utils';
import { submitNoveltyReport } from '../services/sheetService';
import { 
  X, ClipboardList, Camera, CheckCircle2, AlertTriangle, 
  Trash2, Image as ImageIcon, Loader2, Calendar, Wrench, 
  Truck, User, Building2, FileText, Send, Check, Search,
  RefreshCw, ExternalLink, Filter, ChevronDown, ChevronUp,
  Clock, ShieldCheck, Upload, Clipboard
} from 'lucide-react';

interface NoveltyReportFormProps {
  vehicles: Vehicle[];
  reports?: NoveltyReport[];
  onClose?: () => void;
  onRefresh?: () => void | Promise<any>;
  onSuccess?: () => void;
  isModal?: boolean;
}

const TALLERES = [
  "ELECTRONIC",
  "VEHIPESA",
  "TODOFIBRA",
  "TECNIBENZ",
  "NAVITRANS"
];

export const CORREO_TALLER: Record<string, string> = {
  "TECNIBENZ": "Gerente@mtecnibenz.com,Contabilidad@mtecnibenz.com",
  "TODOFIBRA": "administracion@carroceriastodofibra.com.co",
  "ELECTRONIC": "zonanorte@elec-s.com,comercial5@elec-s.com",
  "NAVITRANS": "jfrancot@navitrans.com.co",
  "VEHIPESA": "auxi.adm.vehipesa@gmail.com,aux.operativo.vehipesa@gmail.com"
};
export const CC_NOVEDADES = "aperez@rentingcolombia.com,edgar.arrieta@ab-inbev.com";

const NoveltyReportForm: React.FC<NoveltyReportFormProps> = ({ 
  vehicles, 
  reports = [], 
  onClose, 
  onRefresh, 
  onSuccess,
  isModal = false 
}) => {
  // Estado del formulario
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
  
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  
  const [isProcessing1, setIsProcessing1] = useState(false);
  const [isProcessing2, setIsProcessing2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showFormCard, setShowFormCard] = useState(true);

  // Estado de la tabla de reportes
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ABIERTO' | 'CERRADO'>('ALL');
  const [filterTaller, setFilterTaller] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Estimación del siguiente consecutivo de OT
  const nextOtSuggestion = useMemo(() => {
    if (!reports || reports.length === 0) return 'OT-0001';
    const nums = reports
      .map(r => {
        const match = r.ot && r.ot.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    const next = maxNum + 1;
    return `OT-${String(next).padStart(4, '0')}`;
  }, [reports]);

  // Filtrado de vehículos para selector
  const filteredVehicles = useMemo(() => {
    let list = [...vehicles];
    if (plateSearch) {
      const q = plateSearch.toUpperCase().trim();
      list = list.filter(v => 
        v.plate.includes(q) || 
        (v.cd && v.cd.toUpperCase().includes(q)) || 
        (v.contractor && v.contractor.toUpperCase().includes(q))
      );
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

  // Manejador de soltar archivos (Drag & Drop)
  const handleDropSlot = (e: React.DragEvent, target: 1 | 2) => {
    e.preventDefault();
    e.stopPropagation();
    if (target === 1) setIsDragging1(false);
    else setIsDragging2(false);

    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    handleProcessFile(files[0], target);
    // Si arrastra más de un archivo sobre la evidencia 1, pasar el segundo a la evidencia 2
    if (target === 1 && files.length > 1 && !evidencia2) {
      handleProcessFile(files[1], 2);
    }
  };

  // Pegar desde el portapapeles con clic de botón
  const handlePasteClipboard = async (target: 1 | 2) => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find(t => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const file = new File(
              [blob], 
              `captura_novedad_${Date.now()}.${imgType.split('/')[1] || 'png'}`, 
              { type: imgType }
            );
            await handleProcessFile(file, target);
            return;
          }
        }
      }
      alert('No se detectó imagen en el portapapeles. Copia una imagen o captura de pantalla (Ctrl+C o Impr Pant) e intenta de nuevo, o usa Ctrl+V.');
    } catch (err: any) {
      console.warn('Error accediendo al portapapeles:', err);
      alert('Para pegar capturas o fotos, también puedes presionar directamente Ctrl+V en tu teclado.');
    }
  };

  // Escucha global de pegado (Ctrl+V) mientras el formulario está activo
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (!showFormCard || isSubmitting) return;

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const imageItems = Array.from(items).filter(it => it.type.startsWith('image/'));
      if (imageItems.length === 0) return; // Permite que el texto normal se pegue en inputs/textarea sin interferir

      e.preventDefault();

      const files: File[] = [];
      for (const it of imageItems) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
      if (files.length === 0) return;

      if (!evidencia1) {
        await handleProcessFile(files[0], 1);
        if (files.length > 1 && !evidencia2) {
          await handleProcessFile(files[1], 2);
        }
      } else if (!evidencia2) {
        await handleProcessFile(files[0], 2);
      } else {
        // Ambas llenas: reemplazar la 2da
        await handleProcessFile(files[0], 2);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [showFormCard, isSubmitting, evidencia1, evidencia2, selectedPlate, fecha]);

  const resetForm = () => {
    setSelectedPlate('');
    setPlateSearch('');
    setCd('');
    setContratista('');
    setConductor('');
    setNovedad('');
    setTaller('');
    setEvidencia1('');
    setEvidencia2('');
    setErrorMessage('');
    setIsSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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
        taller: taller.trim().toUpperCase(),
        evidencia1,
        evidencia2
      });

      if (success) {
        setIsSuccess(true);
        if (onSuccess) onSuccess();
        if (onRefresh) {
          try {
            await onRefresh();
          } catch (e) {
            console.error('Error refrescando lista tras submit:', e);
          }
        }
        setTimeout(() => {
          resetForm();
        }, 2500);
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

  const handleManualRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error('Error manual refresh:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtrado y ordenación de reportes guardados
  const filteredReports = useMemo(() => {
    let list = [...reports];

    // Búsqueda por texto (placa, OT, conductor, novedad, taller, cd)
    if (searchTerm.trim()) {
      const q = searchTerm.toUpperCase().trim();
      list = list.filter(r => 
        (r.plate && r.plate.toUpperCase().includes(q)) ||
        (r.ot && r.ot.toUpperCase().includes(q)) ||
        (r.conductor && r.conductor.toUpperCase().includes(q)) ||
        (r.novedad && r.novedad.toUpperCase().includes(q)) ||
        (r.taller && r.taller.toUpperCase().includes(q)) ||
        (r.cd && r.cd.toUpperCase().includes(q)) ||
        (r.contratista && r.contratista.toUpperCase().includes(q))
      );
    }

    // Filtro por estado
    if (filterStatus === 'ABIERTO') {
      list = list.filter(r => (r.estado || '').toUpperCase().includes('ABIERTO'));
    } else if (filterStatus === 'CERRADO') {
      list = list.filter(r => (r.estado || '').toUpperCase().includes('CERRADO'));
    }

    // Filtro por taller
    if (filterTaller !== 'ALL') {
      list = list.filter(r => (r.taller || '').toUpperCase() === filterTaller.toUpperCase());
    }

    // Ordenar descendente: más reciente arriba (por número de OT o por fecha)
    return list.sort((a, b) => {
      const matchA = a.ot && a.ot.match(/\d+/);
      const matchB = b.ot && b.ot.match(/\d+/);
      const numA = matchA ? parseInt(matchA[0], 10) : 0;
      const numB = matchB ? parseInt(matchB[0], 10) : 0;
      if (numA && numB && numA !== numB) return numB - numA;
      return (b.fecha || '').localeCompare(a.fecha || '');
    });
  }, [reports, searchTerm, filterStatus, filterTaller]);

  // Conteo de estados
  const stats = useMemo(() => {
    const total = reports.length;
    const abiertos = reports.filter(r => (r.estado || '').toUpperCase().includes('ABIERTO')).length;
    const cerrados = reports.filter(r => (r.estado || '').toUpperCase().includes('CERRADO')).length;
    return { total, abiertos, cerrados };
  }, [reports]);

  const mainContent = (
    <div className="space-y-8">
      
      {/* FORMULARIO DE REPORTE */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Cabecera del formulario con toggle */}
        <div 
          onClick={() => setShowFormCard(prev => !prev)}
          className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D2B4E] text-white flex items-center justify-center shadow-sm">
              <ClipboardList size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                Registrar Nuevo Reporte de Novedad
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Genera OT correlativa y notifica al taller seleccionado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
              Próxima OT: <span className="font-mono">{nextOtSuggestion}</span>
            </span>
            <button 
              type="button" 
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50"
            >
              {showFormCard ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {showFormCard && (
          <div className="p-5 sm:p-8">
            {isSuccess ? (
              <div className="py-10 px-4 text-center space-y-4 animate-in zoom-in duration-300">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg border-2 border-emerald-200">
                  <CheckCircle2 size={44} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 uppercase">¡Novedad Reportada con Éxito!</h3>
                  <p className="text-slate-600 text-sm font-medium">
                    Se asignó la OT en la hoja <span className="font-bold">NOVEDADES</span> y se envió el correo de notificación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 rounded-2xl bg-[#0D2B4E] text-white font-black text-xs uppercase tracking-wider hover:bg-[#071d36] transition-all"
                >
                  Registrar otra novedad
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-3 animate-in shake">
                    <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* GRID DE CAMPOS PRINCIPALES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  
                  {/* ORDEN DE TRABAJO (INDICADOR) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <FileText size={13} className="text-[#0D2B4E]" /> Orden de Trabajo
                    </label>
                    <div className="h-12 px-3.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-slate-700 font-mono font-black text-xs">
                      <span>{nextOtSuggestion}</span>
                      <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-sans font-bold uppercase">Auto</span>
                    </div>
                  </div>

                  {/* FECHA */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <Calendar size={13} className="text-[#0D2B4E]" /> Fecha
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      required
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-200 focus:border-[#0D2B4E] focus:ring-2 focus:ring-[#0D2B4E]/10 outline-none text-xs font-bold text-slate-800 transition-all bg-white"
                    />
                  </div>

                  {/* PLACA CON SELECTOR Y BUSCADOR */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Truck size={13} className="text-[#0D2B4E]" /> Placa del Vehículo *
                      </span>
                      {selectedPlate && (
                        <span className="text-[9px] font-bold text-emerald-600">Seleccionado</span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Buscar placa..."
                          value={plateSearch}
                          onChange={(e) => setPlateSearch(e.target.value)}
                          className="w-full h-12 pl-9 pr-3 rounded-xl border border-slate-200 focus:border-[#0D2B4E] outline-none text-xs font-black uppercase text-slate-800 placeholder:text-slate-400"
                        />
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                      <select
                        value={selectedPlate}
                        onChange={(e) => handleSelectPlate(e.target.value)}
                        required
                        className="w-40 sm:w-48 h-12 px-3 rounded-xl border border-slate-200 focus:border-[#0D2B4E] outline-none text-xs font-black bg-white uppercase text-slate-800"
                      >
                        <option value="">Seleccione...</option>
                        {filteredVehicles.map(v => (
                          <option key={v.plate} value={v.plate}>
                            {v.plate} {v.cd ? `(${v.cd})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* CD (AUTOCOMPLETADO / EDITABLE) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <Building2 size={13} className="text-[#0D2B4E]" /> Centro de Distribución (CD)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. BARRANQUILLA"
                      value={cd}
                      onChange={(e) => setCd(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-200 focus:border-[#0D2B4E] outline-none text-xs font-bold uppercase text-slate-800 bg-white"
                    />
                  </div>

                  {/* CONTRATISTA (AUTOCOMPLETADO / EDITABLE) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <Building2 size={13} className="text-[#0D2B4E]" /> Contratista
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. LOGISTICA DEL CARIBE"
                      value={contratista}
                      onChange={(e) => setContratista(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-200 focus:border-[#0D2B4E] outline-none text-xs font-bold uppercase text-slate-800 bg-white"
                    />
                  </div>

                  {/* CONDUCTOR */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <User size={13} className="text-[#0D2B4E]" /> Conductor Asignado
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre completo del conductor..."
                      value={conductor}
                      onChange={(e) => setConductor(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-200 focus:border-[#0D2B4E] outline-none text-xs font-bold uppercase text-slate-800 bg-white"
                    />
                  </div>

                  {/* TALLER */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Wrench size={13} className="text-[#0D2B4E]" /> Taller Asignado *
                      </span>
                    </label>
                    <select
                      value={taller}
                      onChange={(e) => setTaller(e.target.value)}
                      required
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-200 focus:border-[#0D2B4E] outline-none text-xs font-black bg-white uppercase text-slate-800"
                    >
                      <option value="">Seleccione el taller...</option>
                      {TALLERES.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    {taller && (
                      <div className="text-[10px] bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="font-black text-[#0D2B4E] uppercase text-[9px] min-w-[34px] shrink-0">Para:</span>
                          <span className="font-bold text-slate-800 break-all">{CORREO_TALLER[taller] || 'Sin correo asignado'}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="font-black text-slate-400 uppercase text-[9px] min-w-[34px] shrink-0">CC:</span>
                          <span className="text-slate-600 break-all">{CC_NOVEDADES}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ESTADO INICIAL */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-[#0D2B4E]" /> Estado de Apertura
                    </label>
                    <div className="h-12 px-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs font-black uppercase">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F2B705] animate-pulse"></span>
                        ABIERTO (Por defecto)
                      </span>
                      <span className="text-[9px] bg-amber-200/80 px-2 py-0.5 rounded font-bold">Inicial</span>
                    </div>
                  </div>

                </div>

                {/* NOVEDAD / FALLA */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <FileText size={13} className="text-[#0D2B4E]" /> Descripción Detallada de la Novedad *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describa claramente la falla mecánica, eléctrica o novedad que presenta el vehículo..."
                    value={novedad}
                    onChange={(e) => setNovedad(e.target.value)}
                    required
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-[#0D2B4E] focus:ring-2 focus:ring-[#0D2B4E]/10 outline-none text-xs font-medium text-slate-800 transition-all resize-none bg-white"
                  />
                </div>

                {/* EVIDENCIAS FOTOGRÁFICAS (OPCIONALES - DRAG & DROP / PEGAR CTRL+V) */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <Camera size={13} className="text-[#0D2B4E]" /> Evidencias de Reporte (Máx. 2 Fotos)
                    </label>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Opcional • No obligatorio
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                    Puedes enviar la novedad sin evidencias fotográficas. Si dispones de fotos o capturas, puedes tomarlas con la cámara, seleccionarlas, arrastrarlas o <b>pegarlas con Ctrl+V</b>.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    
                    {/* FOTO 1 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Evidencia 1 (Opcional)
                        </span>
                        {!evidencia1 && (
                          <button
                            type="button"
                            onClick={() => handlePasteClipboard(1)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                            title="Pegar imagen desde el portapapeles"
                          >
                            <Clipboard size={11} /> Pegar portapapeles
                          </button>
                        )}
                      </div>

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
                        <div 
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging1(true); }}
                          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging1(true); }}
                          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging1(false); }}
                          onDrop={(e) => handleDropSlot(e, 1)}
                          className={`relative rounded-2xl overflow-hidden border-2 transition-all bg-slate-900 group aspect-[16/9] ${
                            isDragging1 ? 'border-amber-400 ring-4 ring-amber-400/30' : 'border-emerald-500'
                          }`}
                        >
                          <img src={evidencia1} alt="Evidencia 1" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef1.current?.click()}
                              className="px-3 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-md cursor-pointer"
                            >
                              Cambiar
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePasteClipboard(1)}
                              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-1 cursor-pointer"
                            >
                              <Clipboard size={12} /> Pegar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEvidencia1('')}
                              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
                              title="Eliminar foto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[9px] font-black text-white uppercase">
                            Foto 1 Lista
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging1(true); }}
                          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging1(true); }}
                          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging1(false); }}
                          onDrop={(e) => handleDropSlot(e, 1)}
                          className={`w-full aspect-[16/9] rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-2 text-center transition-all ${
                            isDragging1 
                              ? 'border-[#0D2B4E] bg-blue-100/70 ring-4 ring-[#0D2B4E]/20 scale-[1.01]' 
                              : 'border-slate-300 hover:border-[#0D2B4E] bg-slate-50 hover:bg-slate-100/80'
                          }`}
                        >
                          {isProcessing1 ? (
                            <>
                              <Loader2 size={26} className="animate-spin text-[#0D2B4E]" />
                              <span className="text-[11px] font-bold text-slate-700">Procesando y comprimiendo foto...</span>
                            </>
                          ) : isDragging1 ? (
                            <div className="flex flex-col items-center gap-1.5 text-[#0D2B4E]">
                              <Upload size={28} className="animate-bounce" />
                              <span className="text-xs font-black uppercase tracking-wider">¡Suelta la Evidencia 1 aquí!</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef1.current?.click()}
                                  className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[#0D2B4E] hover:bg-slate-50 cursor-pointer"
                                  title="Subir archivo o tomar foto con cámara"
                                >
                                  <Camera size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePasteClipboard(1)}
                                  className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                  title="Pegar imagen del portapapeles"
                                >
                                  <Clipboard size={18} />
                                </button>
                              </div>
                              <div className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef1.current?.click()}
                                  className="text-xs font-black uppercase tracking-wider text-slate-700 hover:text-[#0D2B4E] block cursor-pointer"
                                >
                                  Tomar / Subir Foto 1
                                </button>
                                <span className="text-[10px] text-slate-400 block">
                                  Arrastra aquí o presiona <b>Ctrl+V</b> para pegar
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* FOTO 2 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Evidencia 2 (Opcional)
                        </span>
                        {!evidencia2 && (
                          <button
                            type="button"
                            onClick={() => handlePasteClipboard(2)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                            title="Pegar imagen desde el portapapeles"
                          >
                            <Clipboard size={11} /> Pegar portapapeles
                          </button>
                        )}
                      </div>

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
                        <div 
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging2(true); }}
                          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging2(true); }}
                          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging2(false); }}
                          onDrop={(e) => handleDropSlot(e, 2)}
                          className={`relative rounded-2xl overflow-hidden border-2 transition-all bg-slate-900 group aspect-[16/9] ${
                            isDragging2 ? 'border-amber-400 ring-4 ring-amber-400/30' : 'border-emerald-500'
                          }`}
                        >
                          <img src={evidencia2} alt="Evidencia 2" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef2.current?.click()}
                              className="px-3 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-md cursor-pointer"
                            >
                              Cambiar
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePasteClipboard(2)}
                              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-1 cursor-pointer"
                            >
                              <Clipboard size={12} /> Pegar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEvidencia2('')}
                              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
                              title="Eliminar foto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[9px] font-black text-white uppercase">
                            Foto 2 Lista
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging2(true); }}
                          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging2(true); }}
                          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging2(false); }}
                          onDrop={(e) => handleDropSlot(e, 2)}
                          className={`w-full aspect-[16/9] rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-2 text-center transition-all ${
                            isDragging2 
                              ? 'border-[#0D2B4E] bg-blue-100/70 ring-4 ring-[#0D2B4E]/20 scale-[1.01]' 
                              : 'border-slate-300 hover:border-[#0D2B4E] bg-slate-50 hover:bg-slate-100/80'
                          }`}
                        >
                          {isProcessing2 ? (
                            <>
                              <Loader2 size={26} className="animate-spin text-[#0D2B4E]" />
                              <span className="text-[11px] font-bold text-slate-700">Procesando y comprimiendo foto...</span>
                            </>
                          ) : isDragging2 ? (
                            <div className="flex flex-col items-center gap-1.5 text-[#0D2B4E]">
                              <Upload size={28} className="animate-bounce" />
                              <span className="text-xs font-black uppercase tracking-wider">¡Suelta la Evidencia 2 aquí!</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef2.current?.click()}
                                  className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[#0D2B4E] hover:bg-slate-50 cursor-pointer"
                                  title="Subir archivo o tomar foto con cámara"
                                >
                                  <Camera size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePasteClipboard(2)}
                                  className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                  title="Pegar imagen del portapapeles"
                                >
                                  <Clipboard size={18} />
                                </button>
                              </div>
                              <div className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef2.current?.click()}
                                  className="text-xs font-black uppercase tracking-wider text-slate-700 hover:text-[#0D2B4E] block cursor-pointer"
                                >
                                  Tomar / Subir Foto 2
                                </button>
                                <span className="text-[10px] text-slate-400 block">
                                  Arrastra aquí o presiona <b>Ctrl+V</b> para pegar
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* BOTÓN DE GUARDADO */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || isProcessing1 || isProcessing2}
                    className="w-full sm:w-auto px-8 h-14 rounded-2xl bg-[#0D2B4E] hover:bg-[#071d36] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Guardando y Enviando Notificación...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Guardar Reporte de Novedad
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}
          </div>
        )}
      </div>

      {/* SECCIÓN DE HISTORIAL Y TABLA DE REPORTES */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-5 sm:p-8">
        
        {/* HEADER DE LA TABLA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                Reportes Registrados
              </h3>
              <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-xs font-black">
                {reports.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
              Hoja NOVEDADES (GID 1190843304) — Reportes operativos de taller
            </p>
          </div>

          {/* BADGES DE RESUMEN Y RECARGA */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-[#F2B705]">
              <span className="w-2 h-2 rounded-full bg-[#F2B705]"></span>
              {stats.abiertos} Abiertos
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-[#16A34A]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
              {stats.cerrados} Cerrados
            </span>

            {onRefresh && (
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                title="Sincronizar con Google Sheets"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por placa, OT, conductor, falla, taller o CD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 focus:border-[#0D2B4E] outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-slate-50/50"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* FILTRO ESTADO */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-700 bg-white outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ABIERTO">Solo Abiertos</option>
              <option value="CERRADO">Solo Cerrados</option>
            </select>

            {/* FILTRO TALLER */}
            <select
              value={filterTaller}
              onChange={(e) => setFilterTaller(e.target.value)}
              className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-700 bg-white outline-none"
            >
              <option value="ALL">Todos los Talleres</option>
              {TALLERES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLA EN DESKTOP */}
        <div className="hidden md:block rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-600 font-black">
                  <th className="py-3.5 px-4">OT</th>
                  <th className="py-3.5 px-3">Fecha</th>
                  <th className="py-3.5 px-3">Placa</th>
                  <th className="py-3.5 px-3">CD</th>
                  <th className="py-3.5 px-3">Contratista</th>
                  <th className="py-3.5 px-3">Conductor</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Novedad</th>
                  <th className="py-3.5 px-3">Taller</th>
                  <th className="py-3.5 px-3 text-center">Estado</th>
                  <th className="py-3.5 px-3 text-center">Evidencias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {filteredReports.map((r, idx) => {
                  const isAbierto = (r.estado || '').toUpperCase().includes('ABIERTO');
                  const isCerrado = (r.estado || '').toUpperCase().includes('CERRADO');

                  return (
                    <tr key={r.ot || `${r.plate}-${r.fecha}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* OT */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                          {r.ot || 'S/N'}
                        </span>
                      </td>

                      {/* FECHA */}
                      <td className="py-3.5 px-3 font-semibold text-slate-600 whitespace-nowrap text-[11px]">
                        {r.fecha || '-'}
                      </td>

                      {/* PLACA */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-black bg-slate-900 text-yellow-400 px-2.5 py-1 rounded-lg shadow-sm text-xs">
                          {r.plate || '-'}
                        </span>
                      </td>

                      {/* CD */}
                      <td className="py-3.5 px-3 uppercase text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        {r.cd || '-'}
                      </td>

                      {/* CONTRATISTA */}
                      <td className="py-3.5 px-3 uppercase text-[11px] font-medium text-slate-600 max-w-[140px] truncate" title={r.contratista}>
                        {r.contratista || '-'}
                      </td>

                      {/* CONDUCTOR */}
                      <td className="py-3.5 px-3 uppercase text-[11px] font-medium text-slate-700 max-w-[150px] truncate" title={r.conductor}>
                        {r.conductor || '-'}
                      </td>

                      {/* NOVEDADES */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-700 max-w-[260px]">
                        <p className="line-clamp-2" title={r.novedad}>{r.novedad || '-'}</p>
                      </td>

                      {/* TALLER */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-black uppercase border border-slate-200">
                          {r.taller || '-'}
                        </span>
                      </td>

                      {/* ESTADO */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isAbierto ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-[#F2B705]">
                            <span className="w-2 h-2 rounded-full bg-[#F2B705] animate-pulse"></span>
                            ABIERTO
                          </span>
                        ) : isCerrado ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-[#16A34A]">
                            <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                            CERRADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                            {r.estado || 'ABIERTO'}
                          </span>
                        )}
                      </td>

                      {/* EVIDENCIAS DE REPORTE Y CIERRE */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {r.evidenciaReporte1 && (
                            <a
                              href={r.evidenciaReporte1}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase transition-colors"
                              title="Ver Evidencia 1"
                            >
                              Ver 1 <ExternalLink size={10} />
                            </a>
                          )}
                          {r.evidenciaReporte2 && (
                            <a
                              href={r.evidenciaReporte2}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase transition-colors"
                              title="Ver Evidencia 2"
                            >
                              Ver 2 <ExternalLink size={10} />
                            </a>
                          )}
                          {r.evidenciaCierre1 && (
                            <a
                              href={r.evidenciaCierre1}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase transition-colors"
                              title="Ver Evidencia Cierre 1"
                            >
                              Cierre 1 <ExternalLink size={10} />
                            </a>
                          )}
                          {r.evidenciaCierre2 && (
                            <a
                              href={r.evidenciaCierre2}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase transition-colors"
                              title="Ver Evidencia Cierre 2"
                            >
                              Cierre 2 <ExternalLink size={10} />
                            </a>
                          )}
                          {!r.evidenciaReporte1 && !r.evidenciaReporte2 && !r.evidenciaCierre1 && !r.evidenciaCierre2 && (
                            <span className="text-slate-300 text-xs font-mono">-</span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                      No se encontraron reportes con los criterios seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TARJETAS EN MÓVIL */}
        <div className="md:hidden space-y-3">
          {filteredReports.map((r, idx) => {
            const isAbierto = (r.estado || '').toUpperCase().includes('ABIERTO');
            const isCerrado = (r.estado || '').toUpperCase().includes('CERRADO');

            return (
              <div 
                key={r.ot || `${r.plate}-${r.fecha}-${idx}`} 
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                {/* Cabecera Móvil: OT, Placa, Estado */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs border border-indigo-200">
                      {r.ot || 'S/N'}
                    </span>
                    <span className="font-mono font-black bg-slate-900 text-yellow-400 px-2 py-0.5 rounded text-xs">
                      {r.plate || '-'}
                    </span>
                  </div>

                  {isAbierto ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-900 border border-[#F2B705]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F2B705]"></span>
                      ABIERTO
                    </span>
                  ) : isCerrado ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 border border-[#16A34A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                      CERRADO
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-700 uppercase">
                      {r.estado}
                    </span>
                  )}
                </div>

                {/* Datos adicionales */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-medium">
                  <div>
                    <span className="text-slate-400 uppercase block font-black text-[8px]">Fecha:</span>
                    <span className="font-bold text-slate-800">{r.fecha || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase block font-black text-[8px]">Taller:</span>
                    <span className="font-bold text-slate-800">{r.taller || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase block font-black text-[8px]">CD:</span>
                    <span>{r.cd || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase block font-black text-[8px]">Contratista:</span>
                    <span className="truncate block">{r.contratista || '-'}</span>
                  </div>
                </div>

                {r.conductor && (
                  <div className="text-[10px]">
                    <span className="text-slate-400 uppercase font-black text-[8px] block">Conductor:</span>
                    <span className="font-semibold text-slate-700">{r.conductor}</span>
                  </div>
                )}

                {/* Novedad */}
                <div className="text-xs bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700">
                  <span className="text-[8px] uppercase tracking-widest text-slate-400 font-black block mb-0.5">Novedad:</span>
                  <p>{r.novedad || '-'}</p>
                </div>

                {/* Evidencias */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[8px] uppercase tracking-widest text-slate-400 font-black">Fotos:</span>
                  {r.evidenciaReporte1 && (
                    <a
                      href={r.evidenciaReporte1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase"
                    >
                      Ver 1 <ExternalLink size={10} />
                    </a>
                  )}
                  {r.evidenciaReporte2 && (
                    <a
                      href={r.evidenciaReporte2}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase"
                    >
                      Ver 2 <ExternalLink size={10} />
                    </a>
                  )}
                  {r.evidenciaCierre1 && (
                    <a
                      href={r.evidenciaCierre1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase"
                    >
                      Cierre 1 <ExternalLink size={10} />
                    </a>
                  )}
                  {r.evidenciaCierre2 && (
                    <a
                      href={r.evidenciaCierre2}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase"
                    >
                      Cierre 2 <ExternalLink size={10} />
                    </a>
                  )}
                  {!r.evidenciaReporte1 && !r.evidenciaReporte2 && !r.evidenciaCierre1 && !r.evidenciaCierre2 && (
                    <span className="text-slate-400 text-[10px]">Sin fotos adjuntas</span>
                  )}
                </div>

              </div>
            );
          })}

          {filteredReports.length === 0 && (
            <div className="py-8 text-center text-slate-400 font-bold uppercase text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No se encontraron reportes
            </div>
          )}
        </div>

      </div>

    </div>
  );

  // Si se usa como modal
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
        <div className="bg-slate-100 w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
          
          {/* HEADER MODAL */}
          <div className="bg-[#0D2B4E] text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden shrink-0">
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                <ClipboardList size={26} />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-300">Gestión Operativa de Taller</span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">Reporte de Novedades</h2>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                type="button"
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors relative z-10 cursor-pointer"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* CUERPO SCROLLABLE DEL MODAL */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {mainContent}
          </div>

        </div>
      </div>
    );
  }

  // Si se usa como página completa en App.tsx
  return mainContent;
};

export default NoveltyReportForm;
