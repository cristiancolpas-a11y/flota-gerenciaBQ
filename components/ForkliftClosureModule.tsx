import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  RefreshCw, 
  Camera, 
  Upload, 
  X, 
  Filter, 
  ExternalLink, 
  Layers, 
  Sliders, 
  Info,
  ShieldCheck,
  Check,
  Building2,
  Calendar,
  Truck
} from 'lucide-react';
import { ForkliftClosure } from '../types';
import { 
  fetchForkliftClosuresFromSheet, 
  submitForkliftClosure, 
  getMontacargasScriptUrl, 
  setMontacargasScriptUrl,
  getCierreMontacargasGid,
  setCierreMontacargasGid,
  MONTACARGAS_DOC_ID,
  uploadImageToDrive
} from '../services/sheetService';

interface ForkliftClosureModuleProps {
  onRefreshParent?: () => void;
}

// Función para comprimir una imagen a Data URL JPG optimizada vía HTML5 Canvas
const compressImageFile = (file: File, maxDim = 1280, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const ForkliftClosureModule: React.FC<ForkliftClosureModuleProps> = ({ onRefreshParent }) => {
  const [closures, setClosures] = useState<ForkliftClosure[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filtros
  const [selectedCd, setSelectedCd] = useState<string>('TODOS');
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [selectedPlaca, setSelectedPlaca] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal de Cierre / Evidencia
  const [activeClosure, setActiveClosure] = useState<ForkliftClosure | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal de configuración de fuente
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [inputScriptUrl, setInputScriptUrl] = useState<string>(getMontacargasScriptUrl());
  const [inputGid, setInputGid] = useState<string>(getCierreMontacargasGid());

  // Actualizaciones optimistas en memoria para persistir en la sesión actual
  const optimisticUpdatesRef = useRef<Record<string, { estado: string; evidencia: string }>>({});

  // Carga inicial
  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await fetchForkliftClosuresFromSheet();
      
      // Aplicar actualizaciones optimistas locales
      const merged = data.map(item => {
        const key = `${(item.placa || '').toUpperCase().trim()}___${(item.item || '').toLowerCase().trim()}`;
        const opt = optimisticUpdatesRef.current[key];
        if (opt) {
          return {
            ...item,
            estado: opt.estado,
            evidencia: opt.evidencia || item.evidencia
          };
        }
        return item;
      });

      setClosures(merged);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando cierre de montacargas:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listas para los dropdowns
  const availableCds = useMemo(() => {
    const set = new Set<string>();
    closures.forEach(c => {
      if (c.cd && c.cd.trim()) set.add(c.cd.trim());
    });
    return Array.from(set).sort();
  }, [closures]);

  const availablePlacas = useMemo(() => {
    const set = new Set<string>();
    closures.forEach(c => {
      if (c.placa && c.placa.trim()) set.add(c.placa.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [closures]);

  // Filtrado de datos
  const filteredClosures = useMemo(() => {
    return closures.filter(item => {
      // CD
      if (selectedCd !== 'TODOS' && item.cd.toUpperCase() !== selectedCd.toUpperCase()) {
        return false;
      }
      // Estado
      if (selectedEstado !== 'TODOS') {
        const itemEstado = (item.estado || 'PENDIENTE').toUpperCase();
        if (selectedEstado === 'PENDIENTE' && itemEstado !== 'PENDIENTE') return false;
        if (selectedEstado === 'REALIZADO' && itemEstado !== 'REALIZADO') return false;
      }
      // Placa
      if (selectedPlaca !== 'TODAS' && item.placa !== selectedPlaca) {
        return false;
      }
      // Búsqueda
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inPlaca = (item.placa || '').toLowerCase().includes(q);
        const inItem = (item.item || '').toLowerCase().includes(q);
        const inCd = (item.cd || '').toLowerCase().includes(q);
        const inFecha = (item.fecha || '').toLowerCase().includes(q);
        if (!inPlaca && !inItem && !inCd && !inFecha) return false;
      }
      return true;
    });
  }, [closures, selectedCd, selectedEstado, selectedPlaca, searchTerm]);

  // KPIs
  const metrics = useMemo(() => {
    const total = filteredClosures.length;
    let pendientes = 0;
    let realizados = 0;

    filteredClosures.forEach(c => {
      const st = (c.estado || 'PENDIENTE').toUpperCase();
      if (st === 'REALIZADO' || st === 'CERRADO') {
        realizados++;
      } else {
        pendientes++;
      }
    });

    const pctAvance = total > 0 ? Math.round((realizados / total) * 100) : 0;

    return { total, pendientes, realizados, pctAvance };
  }, [filteredClosures]);

  // Abrir modal para cerrar novedad
  const handleOpenClosureModal = (closure: ForkliftClosure) => {
    setActiveClosure(closure);
    setPreviewImage('');
    setUploadError('');
  };

  // Manejar selección de foto (cámara o archivo)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1280, 0.75);
      setPreviewImage(compressed);
      setUploadError('');
    } catch (err) {
      console.error('Error al procesar la imagen:', err);
      setUploadError('No se pudo procesar la imagen seleccionada.');
    }
  };

  // Confirmar cierre con actualización optimista
  const handleConfirmClosure = async () => {
    if (!activeClosure) return;

    if (!previewImage) {
      setUploadError('Debes tomar o seleccionar una fotografía de evidencia para cerrar la novedad.');
      return;
    }

    const { placa, item } = activeClosure;
    const updateKey = `${(placa || '').toUpperCase().trim()}___${(item || '').toLowerCase().trim()}`;
    const tempEvidencia = previewImage;

    // 1) ACTUALIZACIÓN OPTIMISTA INMEDIATA (no bloquear la UI)
    optimisticUpdatesRef.current[updateKey] = {
      estado: 'REALIZADO',
      evidencia: tempEvidencia
    };

    setClosures(prev => prev.map(c => {
      const match = (c.placa || '').toUpperCase().trim() === (placa || '').toUpperCase().trim() &&
                    (c.item || '').toLowerCase().trim() === (item || '').toLowerCase().trim();
      if (match) {
        return {
          ...c,
          estado: 'REALIZADO',
          evidencia: tempEvidencia
        };
      }
      return c;
    }));

    // Cerrar modal de inmediato
    setActiveClosure(null);

    // 2) EN SEGUNDO PLANO: subir foto a Drive si es posible y actualizar Google Sheets
    (async () => {
      try {
        let finalEvidence = tempEvidencia;
        // Intentar subir a Drive para obtener URL pública de imagen
        try {
          const driveUrl = await uploadImageToDrive(tempEvidencia, `CIERRE_FLT_${placa}_${Date.now()}.jpg`);
          if (driveUrl && driveUrl.startsWith('http')) {
            finalEvidence = driveUrl;
            optimisticUpdatesRef.current[updateKey].evidencia = finalEvidence;
            setClosures(prev => prev.map(c => {
              const match = (c.placa || '').toUpperCase().trim() === (placa || '').toUpperCase().trim() &&
                            (c.item || '').toLowerCase().trim() === (item || '').toLowerCase().trim();
              return match ? { ...c, evidencia: finalEvidence } : c;
            }));
          }
        } catch (e) {
          console.warn('Subida a Drive falló, enviando payload con base64:', e);
        }

        // Guardar en Google Sheets
        await submitForkliftClosure({
          placa,
          item,
          evidencia: finalEvidence
        });

        if (onRefreshParent) {
          onRefreshParent();
        }
      } catch (err) {
        console.error('Error sincronizando cierre de montacargas:', err);
      }
    })();
  };

  const handleSaveConfig = () => {
    setMontacargasScriptUrl(inputScriptUrl);
    setCierreMontacargasGid(inputGid);
    setShowConfigModal(false);
    loadData(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* HEADER DE MARCA */}
      <div 
        id="cierre-flt-header" 
        className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
        style={{ backgroundColor: '#0D2B4E' }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-emerald-300 backdrop-blur-md">
              <ShieldCheck size={14} className="text-emerald-400" />
              Módulo Montacargas • Hoja CIERRE
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Cierre de Novedades de Montacargas
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Gestión operativa de novedades pendientes por máquina auditada. Sube la evidencia fotográfica de corrección para pasar de <span className="text-rose-300 font-semibold">PENDIENTE</span> a <span className="text-emerald-300 font-semibold">REALIZADO</span> en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="cierre-flt-config-btn"
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 border border-white/10"
              title="Configurar fuente de datos o script"
            >
              <Sliders size={16} />
              Configurar Fuente
            </button>

            <button
              id="cierre-flt-refresh-btn"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Actualizando...' : 'Sincronizar'}
            </button>
          </div>
        </div>
      </div>

      {/* TARJETAS KPI DE RESUMEN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Novedades */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Novedades</span>
            <Layers size={20} className="text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics.total}</div>
          <div className="text-[11px] text-slate-600 mt-2 font-medium">Registradas en la hoja CIERRE</div>
        </div>

        {/* Pendientes (Rojo) */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Pendientes</span>
            <AlertCircle size={20} className="text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-600">{metrics.pendientes}</div>
          <div className="text-[11px] text-rose-700/80 mt-2 font-medium">Requieren fotografía de evidencia</div>
        </div>

        {/* Realizadas (Verde) */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Realizadas</span>
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{metrics.realizados}</div>
          <div className="text-[11px] text-emerald-700/80 mt-2 font-medium">Cerradas con evidencia adjunta</div>
        </div>

        {/* % Avance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">% Avance</span>
            <Clock size={20} style={{ color: '#F2B705' }} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.pctAvance}%</span>
            <span className="text-xs font-bold text-slate-600">cumplimiento</span>
          </div>
          {/* Barra de progreso */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500 bg-emerald-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics.pctAvance))}%` }}
            />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
            <Filter size={16} className="text-slate-500" />
            Filtros de Búsqueda
          </div>
          {(selectedCd !== 'TODOS' || selectedEstado !== 'TODOS' || selectedPlaca !== 'TODAS' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedCd('TODOS');
                setSelectedEstado('TODOS');
                setSelectedPlaca('TODAS');
                setSearchTerm('');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold underline"
            >
              Restablecer filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* CD */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Centro de Distribución (CD)
            </label>
            <select
              value={selectedCd}
              onChange={(e) => setSelectedCd(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="TODOS">Todos los Centros</option>
              {availableCds.map(cd => (
                <option key={cd} value={cd}>{cd}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Estado de la Novedad
            </label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PENDIENTE">🔴 Solo Pendientes</option>
              <option value="REALIZADO">🟢 Solo Realizados</option>
            </select>
          </div>

          {/* Máquina / Placa */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Máquina / Placa
            </label>
            <select
              value={selectedPlaca}
              onChange={(e) => setSelectedPlaca(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="TODAS">Todas las Máquinas</option>
              {availablePlacas.map(placa => (
                <option key={placa} value={placa}>Máquina {placa}</option>
              ))}
            </select>
          </div>

          {/* Buscador de texto */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Buscar por Ítem o Palabra
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ej: espejo, llantas, luz..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* LISTADO DE NOVEDADES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Listado de Novedades ({filteredClosures.length})
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Presiona "Cerrar / Subir evidencia" para tomar la foto con tu cámara o cargar un archivo.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-600">
            <RefreshCw size={28} className="animate-spin mx-auto text-emerald-600 mb-3" />
            <p className="text-sm font-bold">Cargando novedades desde la hoja CIERRE...</p>
          </div>
        ) : filteredClosures.length === 0 ? (
          <div className="p-12 text-center text-slate-600">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="text-base font-bold text-slate-800">No se encontraron novedades</p>
            <p className="text-xs mt-1 text-slate-600">
              No hay registros que coincidan con los filtros seleccionados o todas las novedades están al día.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClosures.map((closure, idx) => {
              const isDone = (closure.estado || '').toUpperCase() === 'REALIZADO' || (closure.estado || '').toUpperCase() === 'CERRADO';
              
              return (
                <div 
                  key={`${closure.placa}-${closure.item}-${idx}`}
                  className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Badge Máquina */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-black tracking-wider">
                        <Truck size={12} />
                        MÁQ {closure.placa}
                      </span>

                      {/* Badge CD */}
                      {closure.cd && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                          <Building2 size={12} className="text-slate-500" />
                          {closure.cd}
                        </span>
                      )}

                      {/* Badge Fecha */}
                      {closure.fecha && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium">
                          <Calendar size={12} className="text-slate-500" />
                          {closure.fecha}
                        </span>
                      )}

                      {/* Estado */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        isDone 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {isDone ? (
                          <>
                            <Check size={12} /> REALIZADO
                          </>
                        ) : (
                          <>
                            <Clock size={12} /> PENDIENTE
                          </>
                        )}
                      </span>
                    </div>

                    {/* Ítem / Descripción de la Novedad */}
                    <div className="text-sm font-bold text-slate-900 break-words pt-1">
                      {closure.item}
                    </div>

                    {/* Verificación si aplica */}
                    {closure.verificacion && (
                      <div className="text-xs text-slate-600">
                        Verificación auditoría: <span className="font-semibold text-rose-600">{closure.verificacion}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 sm:self-center shrink-0">
                    {closure.evidencia ? (
                      <a
                        href={closure.evidencia}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        title="Ver evidencia fotográfica"
                      >
                        <ExternalLink size={14} />
                        Ver Evidencia
                      </a>
                    ) : null}

                    {!isDone ? (
                      <button
                        onClick={() => handleOpenClosureModal(closure)}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
                      >
                        <Camera size={16} />
                        Cerrar / Evidencia
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenClosureModal(closure)}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-200"
                        title="Cambiar o actualizar la evidencia"
                      >
                        <Camera size={14} />
                        Actualizar Foto
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA SUBIR EVIDENCIA Y CERRAR */}
      {activeClosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            {/* Header del Modal */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Cierre de Novedad
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Máquina {activeClosure.placa}
                </h3>
                <p className="text-xs text-slate-500">{activeClosure.cd || 'Centro no especificado'}</p>
              </div>
              <button
                onClick={() => setActiveClosure(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Detalle del Ítem */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Ítem a subsanar:</span>
              <p className="font-bold text-slate-800 text-sm">{activeClosure.item}</p>
            </div>

            {/* Input para Captura de Foto o Archivo */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Fotografía de Evidencia (Obligatoria)
              </label>

              {previewImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                  <img 
                    src={previewImage} 
                    alt="Evidencia seleccionada" 
                    className="w-full h-56 object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-lg"
                    >
                      Cambiar Foto
                    </button>
                    <button
                      onClick={() => setPreviewImage('')}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/40 transition-all"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                    <Camera size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Toma una foto o selecciona una imagen
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Usa la cámara del teléfono o sube un archivo (JPG / PNG)
                  </p>
                </div>
              )}

              {/* Input nativo oculto con soporte para cámara */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {uploadError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                  {uploadError}
                </p>
              )}
            </div>

            {/* Acciones del Modal */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveClosure(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClosure}
                disabled={isUploading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Check size={16} />
                {isUploading ? 'Guardando...' : 'Marcar como REALIZADO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURACIÓN DE FUENTE Y SCRIPT */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  Parámetros Técnicos
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Configurar Hoja CIERRE Montacargas
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Document ID
                </label>
                <input
                  type="text"
                  value={MONTACARGAS_DOC_ID}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-3 py-2.5 font-mono cursor-not-allowed text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  GID de la Hoja CIERRE
                </label>
                <input
                  type="text"
                  value={inputGid}
                  onChange={(e) => setInputGid(e.target.value)}
                  placeholder="1238373688"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  URL del Script de Montacargas (Apps Script Web App /exec)
                </label>
                <input
                  type="text"
                  value={inputScriptUrl}
                  onChange={(e) => setInputScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2.5 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Asegúrate de que el script tenga implementado el método <code>POST_MONTACARGAS_CIERRE</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Guardar y Recargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
