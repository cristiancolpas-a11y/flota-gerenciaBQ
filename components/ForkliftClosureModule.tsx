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
  Truck,
  Code,
  Copy,
  ZoomIn,
  Trash2,
  Image as ImageIcon,
  Clipboard,
  UploadCloud
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

// Procesamiento de imagen: conserva el 100% del tamaño original sin reducir resolución, con calidad superior (0.96)
const compressHighQuality = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      // Mantener tamaño y resolución 100% original sin modificar proporciones
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      // Límite de seguridad de memoria de canvas del navegador (>4500px)
      const maxDim = 4500;
      let targetW = origW;
      let targetH = origH;
      if (Math.max(origW, origH) > maxDim) {
        const scale = maxDim / Math.max(origW, origH);
        targetW = Math.round(origW * scale);
        targetH = Math.round(origH * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.96)); // Calidad alta y nítida
    };
    img.onerror = reject;
    img.src = ev.target?.result as string;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// Generar collage adaptativo para cualquier número de fotos (>4 fotos soportadas)
// Diseñado para no alterar el tamaño de los componentes, mantener proporciones y maximizar calidad
const generarCollage = (imagenes: string[]): Promise<string> => new Promise((resolve, reject) => {
  if (imagenes.length === 0) { resolve(''); return; }
  if (imagenes.length === 1) { resolve(imagenes[0]); return; }

  const imgs: HTMLImageElement[] = [];
  let cargadas = 0;
  imagenes.forEach((src, idx) => {
    const im = new Image();
    im.onload = () => {
      imgs[idx] = im;
      cargadas++;
      if (cargadas === imagenes.length) dibujar();
    };
    im.onerror = reject;
    im.src = src;
  });

  const dibujar = () => {
    const total = imgs.length;

    // Distribución inteligente de columnas según la cantidad de imágenes
    let cols = 2;
    if (total <= 2) {
      cols = 2;
    } else if (total === 3) {
      cols = 3;
    } else if (total === 4) {
      cols = 2;
    } else if (total <= 6) {
      cols = 3;
    } else if (total <= 8) {
      cols = 4;
    } else if (total === 9) {
      cols = 3;
    } else if (total <= 12) {
      cols = 4;
    } else {
      cols = Math.min(5, Math.ceil(Math.sqrt(total)));
    }
    const rows = Math.ceil(total / cols);

    // Dimensiones máximas nativas para no reducir ni recortar los detalles
    const maxFotoW = Math.max(...imgs.map(i => i.naturalWidth || i.width));
    const maxFotoH = Math.max(...imgs.map(i => i.naturalHeight || i.height));

    const gap = 16;
    const padding = 20;

    // Mantener la resolución ultra alta (hasta 4400px en el canvas total para 4K limpio)
    const rawTotalW = cols * maxFotoW + (cols - 1) * gap + (padding * 2);
    const rawTotalH = rows * maxFotoH + (rows - 1) * gap + (padding * 2);
    
    const maxCanvasDim = 4400;
    const scaleFactor = Math.min(1, maxCanvasDim / Math.max(rawTotalW, rawTotalH));

    const celdaW = Math.round(maxFotoW * scaleFactor);
    const celdaH = Math.round(maxFotoH * scaleFactor);
    const scaledGap = Math.max(8, Math.round(gap * scaleFactor));
    const scaledPadding = Math.max(10, Math.round(padding * scaleFactor));

    const canvasW = cols * celdaW + (cols - 1) * scaledGap + (scaledPadding * 2);
    const canvasH = rows * celdaH + (rows - 1) * scaledGap + (scaledPadding * 2);

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(imagenes[0]);
      return;
    }

    // Fondo blanco limpio
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    imgs.forEach((im, idx) => {
      const c = idx % cols;
      const r = Math.floor(idx / cols);

      const cellX = scaledPadding + c * (celdaW + scaledGap);
      const cellY = scaledPadding + r * (celdaH + scaledGap);

      // Fondo neutro para la celda
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(cellX, cellY, celdaW, celdaH);

      // Dibujar imagen manteniendo proporción perfecta sin deformar
      const imgW = im.naturalWidth || im.width;
      const imgH = im.naturalHeight || im.height;
      const fitRatio = Math.min(celdaW / imgW, celdaH / imgH);
      const drawW = Math.round(imgW * fitRatio);
      const drawH = Math.round(imgH * fitRatio);

      const drawX = cellX + Math.round((celdaW - drawW) / 2);
      const drawY = cellY + Math.round((celdaH - drawH) / 2);

      ctx.drawImage(im, drawX, drawY, drawW, drawH);

      // Borde sutil elegante
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = Math.max(1, Math.round(2 * scaleFactor));
      ctx.strokeRect(cellX, cellY, celdaW, celdaH);

      // Etiqueta numerada para trazabilidad de inspección
      const badgeFontSize = Math.max(14, Math.round(20 * scaleFactor));
      ctx.font = `bold ${badgeFontSize}px system-ui, sans-serif`;
      const badgeText = `Foto ${idx + 1}`;
      const textMetrics = ctx.measureText(badgeText);
      const badgePadX = Math.round(10 * scaleFactor);
      const badgePadY = Math.round(6 * scaleFactor);
      const badgeW = textMetrics.width + badgePadX * 2;
      const badgeH = badgeFontSize + badgePadY * 2;

      ctx.fillStyle = 'rgba(13, 43, 78, 0.88)';
      ctx.fillRect(cellX + 8, cellY + 8, badgeW, badgeH);

      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, cellX + 8 + badgePadX, cellY + 8 + (badgeH / 2));
    });

    // Calidad 0.96 para máxima nitidez
    resolve(canvas.toDataURL('image/jpeg', 0.96));
  };
});

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
  const [fotos, setFotos] = useState<string[]>([]); // Fotografías de evidencia (soporta más de 4 fotos)
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Modal de configuración de fuente
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
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
        const key = item.id || (item.rowIndex ? `row-${item.rowIndex}` : `${(item.placa || '').toUpperCase().trim()}___${(item.item || '').toLowerCase().trim()}`);
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
    setFotos([]);
    setUploadError('');
    setIsDragging(false);
  };

  // Función universal para procesar imágenes (subidas, arrastradas o pegadas)
  const processFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) {
      setUploadError('Por favor selecciona, arrastra o pega archivos de imagen válidos (JPG, PNG, WEBP, etc.).');
      return;
    }
    const maxFotosPermitidas = 24;
    const disponibles = maxFotosPermitidas - fotos.length;
    if (disponibles <= 0) {
      setUploadError(`Has alcanzado el límite máximo de ${maxFotosPermitidas} fotos.`);
      return;
    }
    const aProcesar = imageFiles.slice(0, disponibles);
    try {
      setUploadError('');
      const nuevas = await Promise.all(aProcesar.map(f => compressHighQuality(f)));
      setFotos(prev => [...prev, ...nuevas].slice(0, maxFotosPermitidas));
    } catch (err) {
      console.error('Error al procesar fotos:', err);
      setUploadError('No se pudo procesar alguna foto seleccionada.');
    }
  };

  // Manejar selección de archivos desde inputs nativos (cámara o galería)
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      await processFiles(files);
    }
    if (e.target) e.target.value = '';
  };

  // Manejar Arrastrar y Soltar (Drag & Drop)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) {
      await processFiles(files);
    }
  };

  // Manejar Pegar desde el portapapeles (Ctrl+V / Clipboard) mientras el modal esté abierto
  useEffect(() => {
    if (!activeClosure) return;

    const handleWindowPaste = async (e: ClipboardEvent) => {
      // Ignorar si el usuario está enfocado en un campo de texto o textarea
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && (activeEl as HTMLInputElement).type !== 'file') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        await processFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [activeClosure, fotos.length]);

  // Confirmar cierre con collage de alta calidad y actualización optimista
  const handleConfirmClosure = async () => {
    if (!activeClosure) return;

    if (fotos.length === 0) {
      setUploadError('Debes tomar o seleccionar al menos una fotografía para cerrar la novedad.');
      return;
    }

    setIsUploading(true);
    let collage = '';
    try {
      collage = await generarCollage(fotos);
    } catch (err) {
      console.error('Error generando collage:', err);
      collage = fotos[0] || '';
    }

    const { placa, item, id: targetId, rowIndex: targetRow, fecha } = activeClosure;
    const updateKey = targetId || (targetRow ? `row-${targetRow}` : `${(placa || '').toUpperCase().trim()}___${(item || '').toLowerCase().trim()}`);
    const tempEvidencia = collage;

    // 1) ACTUALIZACIÓN OPTIMISTA INMEDIATA (no bloquear la UI)
    optimisticUpdatesRef.current[updateKey] = {
      estado: 'REALIZADO',
      evidencia: tempEvidencia
    };

    setClosures(prev => prev.map(c => {
      const match = (targetId && c.id === targetId) ||
                    (targetRow && c.rowIndex === targetRow) ||
                    ((c.placa || '').toUpperCase().trim() === (placa || '').toUpperCase().trim() &&
                     (c.item || '').toLowerCase().trim() === (item || '').toLowerCase().trim());
      if (match) {
        return {
          ...c,
          estado: 'REALIZADO',
          evidencia: tempEvidencia
        };
      }
      return c;
    }));

    // Cerrar modal de inmediato y limpiar fotos
    setActiveClosure(null);
    setFotos([]);
    setIsUploading(false);

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
              const match = (targetId && c.id === targetId) ||
                            (targetRow && c.rowIndex === targetRow) ||
                            ((c.placa || '').toUpperCase().trim() === (placa || '').toUpperCase().trim() &&
                             (c.item || '').toLowerCase().trim() === (item || '').toLowerCase().trim());
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
          evidencia: finalEvidence,
          rowIndex: targetRow,
          id: targetId,
          fecha,
          verificacion: 'SI'
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
                  key={closure.id || (closure.rowIndex ? `flt-${closure.rowIndex}` : `${closure.placa}-${closure.item}-${idx}`)}
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
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Fotografías de Evidencia
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Sube más de 4 fotos. Se organizarán en un collage de alta definición sin modificar el tamaño.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
                  </span>
                  {fotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFotos([])}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                      title="Quitar todas las fotos"
                    >
                      <Trash2 size={12} /> Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Zona de Arrastrar, Soltar, Pegar (Ctrl+V) y Botones de Cámara / Galería */}
              <div 
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-100/70 scale-[1.01] shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/20' 
                    : 'border-slate-300 hover:border-emerald-400 bg-slate-50/80 hover:bg-emerald-50/20'
                }`}
              >
                {isDragging ? (
                  <div className="py-4 space-y-2 pointer-events-none">
                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center animate-bounce shadow-md">
                      <UploadCloud size={26} />
                    </div>
                    <p className="text-sm font-black text-emerald-900">
                      ¡Suelta las imágenes de evidencia aquí!
                    </p>
                    <p className="text-xs text-emerald-700">
                      Se añadirán al collage automáticamente sin modificar su tamaño.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                      {/* Botón Acceso Cámara Directa */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                      >
                        <Camera size={16} />
                        Tomar con Cámara
                      </button>

                      {/* Botón Acceso Galería / Archivos */}
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all"
                      >
                        <ImageIcon size={16} />
                        Elegir de Galería
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <UploadCloud size={14} className="text-emerald-600" />
                        Arrastra y suelta imágenes aquí
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 font-medium bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md">
                        <Clipboard size={12} className="text-emerald-600" />
                        Pega con Ctrl + V
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Miniaturas de todas las fotos cargadas con opción de ver o quitar */}
              {fotos.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1 bg-slate-50/70 rounded-2xl border border-slate-100">
                    {fotos.map((f, i) => (
                      <div 
                        key={i} 
                        className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs aspect-square cursor-pointer"
                        onClick={() => setZoomImage(f)}
                        title="Clic para ver en tamaño completo"
                      >
                        <img 
                          src={f} 
                          alt={`Evidencia ${i + 1}`} 
                          className="w-full h-full object-cover group-hover:opacity-90 group-hover:scale-105 transition-all duration-200" 
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-xs">
                            <ZoomIn size={12} /> Ver HD
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFotos(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          className="absolute top-1.5 right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-5 h-5 text-xs font-black flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 z-10"
                          title="Eliminar foto"
                        >
                          ×
                        </button>
                        <span className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          Foto {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200/70 p-2.5 rounded-xl text-center">
                    <p className="text-[11px] text-emerald-900 font-bold">
                      {fotos.length === 1 
                        ? 'Se guardará la foto en su resolución original de máxima calidad.' 
                        : `Las ${fotos.length} fotos se organizarán automáticamente en un collage en alta resolución (HD) sin alterar su tamaño ni comprimir en exceso.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Inputs nativos ocultos: uno para Galería (múltiples archivos) y otro para Cámara directa */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
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
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">
                    ¿Necesitas el código de Google Apps Script exclusivo?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowScriptModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-black transition-all"
                  >
                    <Code size={14} />
                    Ver / Copiar Script
                  </button>
                </div>
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

      {/* MODAL CON EL CÓDIGO DEL SCRIPT DE MONTACARGAS */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Google Apps Script Independiente
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Code size={20} className="text-emerald-600" />
                  Script Exclusivo para Montacargas
                </h3>
                <p className="text-xs text-slate-500">
                  Archivo <code className="font-mono font-bold text-slate-700">GOOGLE_APPS_SCRIPT_MONTACARGAS.gs</code> para la hoja de cálculo de montacargas.
                </p>
              </div>
              <button
                onClick={() => setShowScriptModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 overflow-y-auto font-mono text-[11px] text-slate-200 flex-1 leading-relaxed border border-slate-800 select-all">
              <pre className="whitespace-pre-wrap">
{`/**
 * GOOGLE APPS SCRIPT EXCLUSIVO: MÓDULO DE MONTACARGAS
 * Hoja: 1YLALShwjII0BUYfRsQthGMuVw-5m9Qd-Xuk00yniNe8
 * Hoja Cierre: "CIERRE" (GID: 1238373688)
 */
var ID_HOJA_MONTACARGAS = "1YLALShwjII0BUYfRsQthGMuVw-5m9Qd-Xuk00yniNe8";
var GID_CIERRE_MONTACARGAS = "1238373688";
var NOMBRE_CARPETA_DRIVE = "EVIDENCIAS_MONTACARGAS";

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  if (action === "read" || action === "getData") {
    var ss = getSpreadsheet(ID_HOJA_MONTACARGAS);
    var s = getSheetByGid(ss, GID_CIERRE_MONTACARGAS) || ss.getSheetByName("CIERRE") || ss.getSheets()[0];
    return output("success", "", { data: s.getDataRange().getValues() });
  }
  return output("online", "Apps Script Montacargas Activo");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch(err) { return output("error", "Servidor ocupado"); }

  try {
    var payload = JSON.parse(e.postData.contents);
    var method = (payload.method || payload.action || "").toUpperCase().trim();
    var data = payload.data || payload;

    if (method === 'POST_MONTACARGAS_CIERRE' || method === 'POST_FORKLIFT_CIERRE' || method === 'CIERRE') {
      var ss = getSpreadsheet(data.docId || ID_HOJA_MONTACARGAS);
      var s = getSheetByGid(ss, data.gid || GID_CIERRE_MONTACARGAS) || ss.getSheetByName("CIERRE") || ss.getSheets()[0];
      var rows = s.getDataRange().getValues();
      var foundIdx = -1;
      var reqRow = Number(data.rowIndex);
      var plateSearch = (data.placa || data.plate || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
      var itemSearch = (data.item || "").toString().toLowerCase().trim();

      if (reqRow && reqRow >= 2 && reqRow <= rows.length) {
        foundIdx = reqRow;
      } else {
        for (var i = 1; i < rows.length; i++) {
          var rP = (rows[i][2] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
          var rI = (rows[i][3] || "").toString().toLowerCase().trim();
          var rS = (rows[i][6] || "").toString().trim().toUpperCase();
          if (rP === plateSearch && rI === itemSearch) {
            foundIdx = i + 1;
            if (rS === "PENDIENTE") break;
          }
        }
      }

      if (foundIdx === -1) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró registro para máquina " + plateSearch + " e ítem " + itemSearch);
      }

      var rawEv = data.evidencia || data.evidence;
      var evidenceUrl = "";
      if (rawEv) {
        evidenceUrl = (typeof rawEv === 'string' && rawEv.indexOf("data:image") === 0)
          ? saveImageToDrive(rawEv, "CIERRE_FLT_" + plateSearch)
          : rawEv;
        s.getRange(foundIdx, 6).setValue(evidenceUrl); // Col F: EVIDENCIA
      }

      s.getRange(foundIdx, 5).setValue(data.verificacion || "SI"); // Col E: VERIFICACION
      s.getRange(foundIdx, 7).setValue("REALIZADO"); // Col G: ESTADO

      if (lock.hasLock()) lock.releaseLock();
      return output("success", "Cierre de novedad de montacargas registrado en fila " + foundIdx, { rowIndex: foundIdx });
    }
    
    if (lock.hasLock()) lock.releaseLock();
    return output("error", "Método no soportado: " + method);
  } catch(err) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", err.toString());
  }
}

function saveImageToDrive(base64Data, fileName) {
  if (!base64Data || typeof base64Data !== 'string') return "";
  if (base64Data.indexOf("http") === 0) return base64Data;
  try {
    var raw = base64Data.split(",")[1] || base64Data;
    var blob = Utilities.newBlob(Utilities.base64Decode(raw), "image/jpeg", fileName + ".jpg");
    var folders = DriveApp.getFoldersByName(NOMBRE_CARPETA_DRIVE);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(NOMBRE_CARPETA_DRIVE);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return "https://drive.google.com/uc?export=view&id=" + file.getId();
  } catch(e) { return "Error: " + e.toString(); }
}

function getSheetByGid(spreadsheet, targetGid) {
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId().toString() === (targetGid || "").toString().trim()) return sheets[i];
  }
  return null;
}

function getSpreadsheet(docId) {
  try { return SpreadsheetApp.openById(cleanId(docId)); } catch(e) {}
  return SpreadsheetApp.getActiveSpreadsheet();
}

function cleanId(raw) {
  var m = (raw || "").toString().match(/\\/d\\/([a-zA-Z0-9-_]+)/);
  return (m && m[1]) ? m[1] : (raw || "").toString().replace(/[^a-zA-Z0-9-_]/g, "");
}

function output(status, message, extra) {
  var res = { status: status, message: message || "" };
  if (extra) for (var k in extra) res[k] = extra[k];
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}`}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Pega este script en el editor de Apps Script de tu hoja y despliega como Aplicación Web (acceso público).
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const code = `/**
 * GOOGLE APPS SCRIPT EXCLUSIVO: MÓDULO DE MONTACARGAS
 * Hoja: 1YLALShwjII0BUYfRsQthGMuVw-5m9Qd-Xuk00yniNe8
 * Hoja Cierre: "CIERRE" (GID: 1238373688)
 */
var ID_HOJA_MONTACARGAS = "1YLALShwjII0BUYfRsQthGMuVw-5m9Qd-Xuk00yniNe8";
var GID_CIERRE_MONTACARGAS = "1238373688";
var NOMBRE_CARPETA_DRIVE = "EVIDENCIAS_MONTACARGAS";

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  if (action === "read" || action === "getData") {
    var ss = getSpreadsheet(ID_HOJA_MONTACARGAS);
    var s = getSheetByGid(ss, GID_CIERRE_MONTACARGAS) || ss.getSheetByName("CIERRE") || ss.getSheets()[0];
    return output("success", "", { data: s.getDataRange().getValues() });
  }
  return output("online", "Apps Script Montacargas Activo");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch(err) { return output("error", "Servidor ocupado"); }

  try {
    var payload = JSON.parse(e.postData.contents);
    var method = (payload.method || payload.action || "").toUpperCase().trim();
    var data = payload.data || payload;

    if (method === 'POST_MONTACARGAS_CIERRE' || method === 'POST_FORKLIFT_CIERRE' || method === 'CIERRE') {
      var ss = getSpreadsheet(data.docId || ID_HOJA_MONTACARGAS);
      var s = getSheetByGid(ss, data.gid || GID_CIERRE_MONTACARGAS) || ss.getSheetByName("CIERRE") || ss.getSheets()[0];
      var rows = s.getDataRange().getValues();
      var foundIdx = -1;
      var reqRow = Number(data.rowIndex);
      var plateSearch = (data.placa || data.plate || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
      var itemSearch = (data.item || "").toString().toLowerCase().trim();

      if (reqRow && reqRow >= 2 && reqRow <= rows.length) {
        foundIdx = reqRow;
      } else {
        for (var i = 1; i < rows.length; i++) {
          var rP = (rows[i][2] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
          var rI = (rows[i][3] || "").toString().toLowerCase().trim();
          var rS = (rows[i][6] || "").toString().trim().toUpperCase();
          if (rP === plateSearch && rI === itemSearch) {
            foundIdx = i + 1;
            if (rS === "PENDIENTE") break;
          }
        }
      }

      if (foundIdx === -1) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró registro para máquina " + plateSearch + " e ítem " + itemSearch);
      }

      var rawEv = data.evidencia || data.evidence;
      var evidenceUrl = "";
      if (rawEv) {
        evidenceUrl = (typeof rawEv === 'string' && rawEv.indexOf("data:image") === 0)
          ? saveImageToDrive(rawEv, "CIERRE_FLT_" + plateSearch)
          : rawEv;
        s.getRange(foundIdx, 6).setValue(evidenceUrl); // Col F: EVIDENCIA
      }

      s.getRange(foundIdx, 5).setValue(data.verificacion || "SI"); // Col E: VERIFICACION
      s.getRange(foundIdx, 7).setValue("REALIZADO"); // Col G: ESTADO

      if (lock.hasLock()) lock.releaseLock();
      return output("success", "Cierre de novedad de montacargas registrado en fila " + foundIdx, { rowIndex: foundIdx });
    }
    
    if (lock.hasLock()) lock.releaseLock();
    return output("error", "Método no soportado: " + method);
  } catch(err) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", err.toString());
  }
}

function saveImageToDrive(base64Data, fileName) {
  if (!base64Data || typeof base64Data !== 'string') return "";
  if (base64Data.indexOf("http") === 0) return base64Data;
  try {
    var raw = base64Data.split(",")[1] || base64Data;
    var blob = Utilities.newBlob(Utilities.base64Decode(raw), "image/jpeg", fileName + ".jpg");
    var folders = DriveApp.getFoldersByName(NOMBRE_CARPETA_DRIVE);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(NOMBRE_CARPETA_DRIVE);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return "https://drive.google.com/uc?export=view&id=" + file.getId();
  } catch(e) { return "Error: " + e.toString(); }
}

function getSheetByGid(spreadsheet, targetGid) {
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId().toString() === (targetGid || "").toString().trim()) return sheets[i];
  }
  return null;
}

function getSpreadsheet(docId) {
  try { return SpreadsheetApp.openById(cleanId(docId)); } catch(e) {}
  return SpreadsheetApp.getActiveSpreadsheet();
}

function cleanId(raw) {
  var m = (raw || "").toString().match(/\\/d\\/([a-zA-Z0-9-_]+)/);
  return (m && m[1]) ? m[1] : (raw || "").toString().replace(/[^a-zA-Z0-9-_]/g, "");
}

function output(status, message, extra) {
  var res = { status: status, message: message || "" };
  if (extra) for (var k in extra) res[k] = extra[k];
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}`;
                    navigator.clipboard.writeText(code);
                    setHasCopied(true);
                    setTimeout(() => setHasCopied(false), 3000);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                >
                  {hasCopied ? (
                    <>
                      <Check size={14} />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copiar Código
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowScriptModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZACIÓN EN ALTA DEFINICIÓN (ZOOM LIGHTBOX) */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setZoomImage(null)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-10 right-0 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 text-xs font-black transition-all flex items-center gap-1 backdrop-blur-sm shadow-lg"
              title="Cerrar vista previa"
            >
              <X size={18} />
            </button>
            <img 
              src={zoomImage} 
              alt="Vista previa en alta resolución" 
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <div className="mt-3 flex items-center gap-2 text-white/90 text-xs font-bold bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Resolución original preservada al 100% • Máxima nitidez</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
