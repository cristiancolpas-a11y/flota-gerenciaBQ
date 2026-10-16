import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NovedadFlt } from '../types';
import { 
  fetchNovedadesFltFromSheet, 
  submitNovedadFltLink, 
  getNovedadesFltScriptUrl, 
  setNovedadesFltScriptUrl,
  NOVEDADES_FLT_DOC_ID 
} from '../services/sheetService';
import { 
  BarChart3, 
  ClipboardList, 
  ArrowLeft, 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  Link as LinkIcon, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Download, 
  Check, 
  X, 
  Copy, 
  Settings, 
  Wrench, 
  ChevronLeft, 
  ChevronRight, 
  Truck, 
  ShieldAlert, 
  AlertTriangle,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
  Clipboard
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell, 
  PieChart, 
  Pie, 
  Legend, 
  LabelList,
  LineChart,
  Line
} from 'recharts';

interface ForkliftChecklistNoveltiesModuleProps {
  data?: NovedadFlt[];
  onRefresh?: () => void;
}

// Colores de marca y estado (estilo claro y minimalista)
const BRAND_NAVY = '#0D2B4E';
const COLOR_VERDE = '#16A34A';
const COLOR_ROJO = '#DC2626';
const COLOR_DORADO = '#F2B705';
const COLOR_AZUL_SUAVE = '#2563EB';

// Compresión de imagen a JPEG de alta fidelidad manteniendo resolución nítida
const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const maxDim = 2200; // Resolución nítida y segura para Apps Script y Drive
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
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = reject;
    img.src = ev.target?.result as string;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const ForkliftChecklistNoveltiesModule: React.FC<ForkliftChecklistNoveltiesModuleProps> = ({ 
  data: initialData = [], 
  onRefresh 
}) => {
  // Navegación entre dos partes: 'inicio' (tarjetas grandes), 'dashboard' o 'novedades'
  const [subModulo, setSubModulo] = useState<'inicio' | 'dashboard' | 'novedades'>('inicio');

  // Estado local de datos
  const [items, setItems] = useState<NovedadFlt[]>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filtros compartidos (afectan tanto a Dashboard como a Novedades)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<'ALL' | 'Abierto' | 'Cerrado'>('ALL');
  const [filterEvidencia, setFilterEvidencia] = useState<'ALL' | 'CON_LINK' | 'SIN_LINK'>('ALL');
  const [filterCriticidad, setFilterCriticidad] = useState<string>('ALL');
  const [filterSistema, setFilterSistema] = useState<string>('ALL');
  const [filterCD, setFilterCD] = useState<string>('ALL');
  const [filterMes, setFilterMes] = useState<string>('ALL');

  // Paginación para lista de novedades
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Modal de Subir Evidencia (Foto / Galería / Pegar / Enlace Drive)
  const [selectedItem, setSelectedItem] = useState<NovedadFlt | null>(null);
  const [slotEvidencia, setSlotEvidencia] = useState<1 | 2 | 3>(1);
  const [modoEvidencia, setModoEvidencia] = useState<'foto' | 'link'>('foto');
  const [fotoBase64, setFotoBase64] = useState<string>('');
  const [fotoNombre, setFotoNombre] = useState<string>('');
  const [linkInput, setLinkInput] = useState<string>('');
  const [estadoInput, setEstadoInput] = useState<string>('Cerrado');
  const [obsInput, setObsInput] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittingStep, setSubmittingStep] = useState<string>('');
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string; driveUrl?: string } | null>(null);

  // Referencias a inputs ocultos de archivo y cámara
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Configuración Apps Script (sin localStorage)
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [scriptUrlInput, setScriptUrlInput] = useState<string>(getNovedadesFltScriptUrl());
  const [isTestingScript, setIsTestingScript] = useState<boolean>(false);
  const [scriptTestResult, setScriptTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sincronizar datos externos
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setItems(initialData);
    }
  }, [initialData]);

  // Carga inicial si no hay datos
  useEffect(() => {
    if (items.length === 0) {
      loadData();
    }
  }, []);

  // Escuchador global de pegar (Ctrl+V) cuando el modal está abierto
  useEffect(() => {
    if (!selectedItem) return;

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const clipItems = e.clipboardData?.items;
      if (!clipItems) return;

      for (let i = 0; i < clipItems.length; i++) {
        if (clipItems[i].type.indexOf('image') !== -1) {
          const file = clipItems[i].getAsFile();
          if (file) {
            e.preventDefault();
            try {
              const base64 = await compressImage(file);
              setFotoBase64(base64);
              setFotoNombre(file.name || 'Captura_Pegada.jpg');
              setModoEvidencia('foto');
            } catch (err) {
              console.error('Error al procesar imagen pegada:', err);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [selectedItem]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchNovedadesFltFromSheet();
      setItems(result);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Error al cargar novedades de montacargas:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Valores únicos para filtros
  const uniqueSistemas = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.sistema).filter(Boolean)));
    return list.sort();
  }, [items]);

  const uniqueCDs = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.cd).filter(Boolean)));
    return list.sort();
  }, [items]);

  const uniqueMeses = useMemo(() => {
    const list = Array.from(new Set(items.map(i => i.mes).filter(Boolean)));
    return list;
  }, [items]);

  // Novedades filtradas por los selectores
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPlate = (item.placa || '').toLowerCase().includes(q);
        const matchesReport = (item.reporte || '').toLowerCase().includes(q);
        const matchesTransp = (item.transportista || '').toLowerCase().includes(q);
        const matchesSist = (item.sistema || '').toLowerCase().includes(q);
        const matchesObs = (item.observaciones || '').toLowerCase().includes(q);
        if (!matchesPlate && !matchesReport && !matchesTransp && !matchesSist && !matchesObs) {
          return false;
        }
      }

      if (filterEstado !== 'ALL') {
        const itemEstado = (item.estado || '').toLowerCase();
        if (filterEstado === 'Abierto' && !itemEstado.includes('abiert')) return false;
        if (filterEstado === 'Cerrado' && !itemEstado.includes('cerrad')) return false;
      }

      const hasAnyLink = (item.links && item.links.trim().length > 0) || 
                         (item.links2 && item.links2.trim().length > 0) || 
                         (item.links3 && item.links3.trim().length > 0);
      if (filterEvidencia === 'CON_LINK' && !hasAnyLink) return false;
      if (filterEvidencia === 'SIN_LINK' && hasAnyLink) return false;
      if (filterCriticidad !== 'ALL' && String(item.criticidad) !== filterCriticidad) return false;
      if (filterSistema !== 'ALL' && item.sistema !== filterSistema) return false;
      if (filterCD !== 'ALL' && item.cd !== filterCD) return false;
      if (filterMes !== 'ALL' && item.mes !== filterMes) return false;

      return true;
    });
  }, [items, searchQuery, filterEstado, filterEvidencia, filterCriticidad, filterSistema, filterCD, filterMes]);

  // Paginación de la lista
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const hasActiveFilters = searchQuery !== '' || filterEstado !== 'ALL' || filterEvidencia !== 'ALL' || 
    filterCriticidad !== 'ALL' || filterSistema !== 'ALL' || filterCD !== 'ALL' || filterMes !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterEstado('ALL');
    setFilterEvidencia('ALL');
    setFilterCriticidad('ALL');
    setFilterSistema('ALL');
    setFilterCD('ALL');
    setFilterMes('ALL');
    setCurrentPage(1);
  };

  // KPIs sobre los datos filtrados
  const stats = useMemo(() => {
    const total = filteredItems.length;
    const abiertos = filteredItems.filter(i => (i.estado || '').toLowerCase().includes('abiert')).length;
    const cerrados = filteredItems.filter(i => (i.estado || '').toLowerCase().includes('cerrad')).length;
    const conEvidencia = filteredItems.filter(i => 
      (i.links && i.links.trim().length > 0) || 
      (i.links2 && i.links2.trim().length > 0) || 
      (i.links3 && i.links3.trim().length > 0)
    ).length;
    const sinEvidencia = total - conEvidencia;
    const criticos = filteredItems.filter(i => String(i.criticidad) === '1').length;
    const pctCerrados = total > 0 ? Math.round((cerrados / total) * 100) : 0;

    return { total, abiertos, cerrados, conEvidencia, sinEvidencia, criticos, pctCerrados };
  }, [filteredItems]);

  // KPIs globales (sobre todos los datos cargados)
  const globalStats = useMemo(() => {
    const total = items.length;
    const abiertos = items.filter(i => (i.estado || '').toLowerCase().includes('abiert')).length;
    const cerrados = items.filter(i => (i.estado || '').toLowerCase().includes('cerrad')).length;
    const pctCerrados = total > 0 ? Math.round((cerrados / total) * 100) : 0;
    return { total, abiertos, cerrados, pctCerrados };
  }, [items]);

  // -------------------------------------------------------------
  // DATOS PARA GRÁFICAS DEL DASHBOARD (recharts)
  // -------------------------------------------------------------
  const chartSistemasData = useMemo(() => {
    const counts: Record<string, { sistema: string; cantidad: number; abiertos: number; cerrados: number }> = {};
    filteredItems.forEach(i => {
      const sis = (i.sistema || 'Sin Clasificar').trim();
      if (!counts[sis]) {
        counts[sis] = { sistema: sis, cantidad: 0, abiertos: 0, cerrados: 0 };
      }
      counts[sis].cantidad += 1;
      if ((i.estado || '').toLowerCase().includes('abiert')) {
        counts[sis].abiertos += 1;
      } else {
        counts[sis].cerrados += 1;
      }
    });

    return Object.values(counts).sort((a, b) => b.cantidad - a.cantidad);
  }, [filteredItems]);

  const chartCriticidadData = useMemo(() => {
    const critCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0 };
    filteredItems.forEach(i => {
      const c = String(i.criticidad || '3').trim();
      if (critCounts[c] !== undefined) {
        critCounts[c] += 1;
      } else {
        critCounts['3'] += 1;
      }
    });

    return [
      { name: 'Crítica (1)', valor: critCounts['1'], color: COLOR_ROJO, nivel: '1' },
      { name: 'Media (2)', valor: critCounts['2'], color: COLOR_DORADO, nivel: '2' },
      { name: 'Baja (3)', valor: critCounts['3'], color: COLOR_VERDE, nivel: '3' },
    ];
  }, [filteredItems]);

  const chartEstadoData = useMemo(() => {
    return [
      { name: 'Cerradas', valor: stats.cerrados, color: COLOR_VERDE },
      { name: 'Abiertas', valor: stats.abiertos, color: COLOR_ROJO }
    ];
  }, [stats]);

  const chartMesData = useMemo(() => {
    const mesesOrder: Record<string, number> = {
      'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
      'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
    };

    const counts: Record<string, { mes: string; cantidad: number; abiertos: number; cerrados: number }> = {};
    filteredItems.forEach(i => {
      const m = (i.mes || 'Sin Mes').trim();
      if (!counts[m]) {
        counts[m] = { mes: m, cantidad: 0, abiertos: 0, cerrados: 0 };
      }
      counts[m].cantidad += 1;
      if ((i.estado || '').toLowerCase().includes('abiert')) {
        counts[m].abiertos += 1;
      } else {
        counts[m].cerrados += 1;
      }
    });

    return Object.values(counts).sort((a, b) => {
      const oA = mesesOrder[a.mes.toUpperCase()] || 99;
      const oB = mesesOrder[b.mes.toUpperCase()] || 99;
      return oA - oB;
    });
  }, [filteredItems]);

  const topSistemas = useMemo(() => {
    return chartSistemasData.slice(0, 5);
  }, [chartSistemasData]);

  // -------------------------------------------------------------
  // MANEJO DE FOTOS (Cámara, Galería, Pegar, Drag & Drop)
  // -------------------------------------------------------------
  const handleOpenUploadModal = (item: NovedadFlt, initialSlot: 1 | 2 | 3 = 1) => {
    setSelectedItem(item);
    setSlotEvidencia(initialSlot);
    setFotoBase64('');
    setFotoNombre('');
    const currentLink = initialSlot === 3 ? (item.links3 || '') : initialSlot === 2 ? (item.links2 || '') : (item.links || '');
    setLinkInput(currentLink);
    setModoEvidencia(currentLink ? 'link' : 'foto');
    setEstadoInput(item.estado || 'Cerrado');
    setObsInput('');
    setSubmitFeedback(null);
    setSubmittingStep('');
  };

  const handleSelectSlot = (slot: 1 | 2 | 3) => {
    setSlotEvidencia(slot);
    setFotoBase64('');
    setFotoNombre('');
    const existing = slot === 3 ? (selectedItem?.links3 || '') : slot === 2 ? (selectedItem?.links2 || '') : (selectedItem?.links || '');
    setLinkInput(existing);
    if (existing) {
      setModoEvidencia('link');
    }
  };

  const handleProcessImageFile = async (file: File) => {
    try {
      setIsSubmitting(true);
      setSubmittingStep('Procesando fotografía...');
      const base64 = await compressImage(file);
      setFotoBase64(base64);
      setFotoNombre(file.name || 'Foto_Evidencia.jpg');
      setModoEvidencia('foto');
    } catch (e) {
      console.error('Error al procesar archivo de imagen:', e);
      setSubmitFeedback({
        type: 'error',
        message: 'No se pudo leer la imagen seleccionada. Intenta con otra foto.'
      });
    } finally {
      setIsSubmitting(false);
      setSubmittingStep('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleProcessImageFile(file);
    }
  };

  const handlePasteClipboardBtn = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'captura_portapapeles.jpg', { type: imageType });
            await handleProcessImageFile(file);
            return;
          }
        }
      }
      // Intento leer texto si no hay imagen en memoria
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith('http')) {
        setLinkInput(text.trim());
        setModoEvidencia('link');
        return;
      }
      alert('Para pegar una captura de pantalla, puedes usar el atajo Ctrl + V en tu teclado.');
    } catch (e) {
      alert('Presiona las teclas Ctrl + V para pegar la imagen que tienes copiada.');
    }
  };

  // -------------------------------------------------------------
  // GUARDAR EVIDENCIA (Subir a Drive y Guardar Link en Hoja)
  // -------------------------------------------------------------
  const handleSaveEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (modoEvidencia === 'foto' && !fotoBase64) {
      setSubmitFeedback({
        type: 'error',
        message: 'Por favor selecciona una foto de la galería, tómala con la cámara o pégala con Ctrl + V.'
      });
      return;
    }

    if (modoEvidencia === 'link' && !linkInput.trim()) {
      setSubmitFeedback({
        type: 'error',
        message: 'Por favor ingresa un enlace web válido.'
      });
      return;
    }

    const scriptUrl = getNovedadesFltScriptUrl();
    if (!scriptUrl || scriptUrl.includes('PONER_URL_DEL_SCRIPT_NUEVO')) {
      setSubmitFeedback({
        type: 'error',
        message: 'Configura la URL del Apps Script antes de guardar.'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback(null);
    setSubmittingStep(modoEvidencia === 'foto' ? 'Subiendo fotografía a Google Drive...' : 'Guardando enlace...');

    try {
      if (modoEvidencia === 'foto') {
        setSubmittingStep('Creando archivo en Google Drive y registrando en la hoja...');
      }

      const res = await submitNovedadFltLink({
        rowIndex: selectedItem.rowIndex,
        link: modoEvidencia === 'link' ? linkInput.trim() : undefined,
        imageBase64: modoEvidencia === 'foto' ? fotoBase64 : undefined,
        placa: selectedItem.placa,
        reporte: selectedItem.reporte,
        estado: estadoInput,
        observaciones: obsInput.trim() ? obsInput.trim() : undefined,
        slot: slotEvidencia
      });

      const finalLink = res.link || (modoEvidencia === 'link' ? linkInput.trim() : '');

      // Actualización optimista inmediata en memoria según slot
      setItems(prev => prev.map(item => {
        if (item.rowIndex === selectedItem.rowIndex) {
          return {
            ...item,
            links:  slotEvidencia === 1 ? (finalLink || item.links)  : item.links,
            links2: slotEvidencia === 2 ? (finalLink || item.links2) : item.links2,
            links3: slotEvidencia === 3 ? (finalLink || item.links3) : item.links3,
            estado: estadoInput || item.estado,
            observaciones: obsInput.trim() 
              ? (item.observaciones ? `${item.observaciones} | ${obsInput.trim()}` : obsInput.trim())
              : item.observaciones
          };
        }
        return item;
      }));

      const colLetra = slotEvidencia === 3 ? 'V' : (slotEvidencia === 2 ? 'U' : 'T');
      setSubmitFeedback({
        type: 'success',
        message: modoEvidencia === 'foto'
          ? `¡Fotografía subida a Google Drive exitosamente y enlace registrado en Evidencia ${slotEvidencia} (columna ${colLetra})!`
          : `¡Enlace de evidencia guardado exitosamente en Evidencia ${slotEvidencia} (columna ${colLetra})!`,
        driveUrl: finalLink
      });

      setTimeout(() => {
        setSelectedItem(null);
        setFotoBase64('');
        setLinkInput('');
        setSubmitFeedback(null);
        setSubmittingStep('');
      }, 1800);

    } catch (err: any) {
      console.error('Error al guardar evidencia:', err);
      setSubmitFeedback({
        type: 'error',
        message: err?.message || 'Error al guardar la evidencia en Google Sheets. Revisa la conexión con Apps Script.'
      });
    } finally {
      setIsSubmitting(false);
      setSubmittingStep('');
    }
  };

  const handleTestScript = async () => {
    setIsTestingScript(true);
    setScriptTestResult(null);
    try {
      const cleanUrl = scriptUrlInput.trim();
      if (!cleanUrl.startsWith('http')) {
        throw new Error('La URL debe comenzar con https://script.google.com/macros/s/...');
      }
      setNovedadesFltScriptUrl(cleanUrl);
      setScriptTestResult({
        success: true,
        message: 'URL guardada. El Apps Script está listo para subir fotos a Drive y registrar enlaces.'
      });
    } catch (e: any) {
      setScriptTestResult({
        success: false,
        message: e?.message || 'Error al validar la URL.'
      });
    } finally {
      setIsTestingScript(false);
    }
  };

  const exportToCsv = () => {
    if (filteredItems.length === 0) return;
    const headers = [
      'Fila Hoja', 'Transportista', 'CD', 'Fecha Reporte', 'Semana', 'Mes', 
      'Placa', 'Fuente', 'Reporte', 'Sistema', 'Estado', 'Criticidad', 
      'Fecha Solución', 'Observaciones', 'Evidencia 1 (Col T)', 'Evidencia 2 (Col U)', 'Evidencia 3 (Col V)'
    ];

    const rows = filteredItems.map(i => [
      i.rowIndex,
      `"${(i.transportista || '').replace(/"/g, '""')}"`,
      `"${(i.cd || '').replace(/"/g, '""')}"`,
      `"${(i.fechaReporte || '').replace(/"/g, '""')}"`,
      `"${(i.semana || '').replace(/"/g, '""')}"`,
      `"${(i.mes || '').replace(/"/g, '""')}"`,
      `"${(i.placa || '').replace(/"/g, '""')}"`,
      `"${(i.fuente || '').replace(/"/g, '""')}"`,
      `"${(i.reporte || '').replace(/"/g, '""')}"`,
      `"${(i.sistema || '').replace(/"/g, '""')}"`,
      `"${(i.estado || '').replace(/"/g, '""')}"`,
      `"${(i.criticidad || '').replace(/"/g, '""')}"`,
      `"${(i.fechaSolucion || '').replace(/"/g, '""')}"`,
      `"${(i.observaciones || '').replace(/"/g, '""')}"`,
      `"${(i.links || '').replace(/"/g, '""')}"`,
      `"${(i.links2 || '').replace(/"/g, '""')}"`,
      `"${(i.links3 || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `novedades_checklist_montacargas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isScriptConfigured = () => {
    const url = getNovedadesFltScriptUrl();
    return url && !url.includes('PONER_URL_DEL_SCRIPT_NUEVO') && url.startsWith('http');
  };

  // -------------------------------------------------------------
  // BARRA DE FILTROS (Estilo Claro)
  // -------------------------------------------------------------
  const renderFilterBar = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Filter className="w-4 h-4 text-[#0D2B4E]" />
          <span>Filtros Operativos</span>
          <span className="text-xs text-slate-500 font-normal">
            ({filteredItems.length} de {items.length} novedades)
          </span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Buscador */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por placa, reporte, transportista..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0D2B4E] focus:bg-white transition-colors"
          />
        </div>

        {/* Estado */}
        <div>
          <select
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value as any); setCurrentPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0D2B4E] focus:bg-white"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="Abierto">Abierto</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </div>

        {/* Evidencia */}
        <div>
          <select
            value={filterEvidencia}
            onChange={(e) => { setFilterEvidencia(e.target.value as any); setCurrentPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0D2B4E] focus:bg-white"
          >
            <option value="ALL">Toda Evidencia</option>
            <option value="CON_LINK">Con Enlace</option>
            <option value="SIN_LINK">Sin Enlace</option>
          </select>
        </div>

        {/* Sistema */}
        <div>
          <select
            value={filterSistema}
            onChange={(e) => { setFilterSistema(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0D2B4E] focus:bg-white"
          >
            <option value="ALL">Todos los Sistemas</option>
            {uniqueSistemas.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Criticidad */}
        <div>
          <select
            value={filterCriticidad}
            onChange={(e) => { setFilterCriticidad(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0D2B4E] focus:bg-white"
          >
            <option value="ALL">Toda Criticidad</option>
            <option value="1">1 - Alta / Crítica</option>
            <option value="2">2 - Media</option>
            <option value="3">3 - Baja</option>
          </select>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // TARJETAS RESUMEN (Estilo Claro)
  // -------------------------------------------------------------
  const renderSummaryCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          Total Novedades
        </div>
        <div className="mt-3">
          <div className="text-3xl font-black text-[#0D2B4E] tabular-nums">{stats.total}</div>
          <p className="text-[11px] text-slate-500 mt-1">Registradas en hoja</p>
        </div>
      </div>

      <div className="bg-white border border-rose-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-rose-600 text-xs font-bold uppercase tracking-wider">
          <span>Abiertas</span>
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-black text-rose-600 tabular-nums">{stats.abiertos}</div>
          <p className="text-[11px] text-rose-600/80 mt-1 font-medium">Pendientes de cierre</p>
        </div>
      </div>

      <div className="bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-emerald-600 text-xs font-bold uppercase tracking-wider">
          <span>Cerradas</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="mt-3">
          <div className="text-3xl font-black text-emerald-600 tabular-nums">{stats.cerrados}</div>
          <p className="text-[11px] text-emerald-600/80 mt-1 font-medium">Solucionadas</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          % de Cierre
        </div>
        <div className="mt-3">
          <div className="text-3xl font-black text-[#0D2B4E] tabular-nums">{stats.pctCerrados}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${stats.pctCerrados}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 font-sans antialiased text-slate-800 animate-fadeIn">
      {/* Inputs ocultos para Cámara y Galería */}
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={handleFileChange}
      />
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. VISTA DE INICIO (DOS TARJETAS GRANDES EN ESTILO CLARO)     */}
      {/* ------------------------------------------------------------- */}
      {subModulo === 'inicio' && (
        <div className="space-y-8 max-w-4xl mx-auto py-6">
          <div className="text-center space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-slate-100 text-[#0D2B4E] border border-slate-200">
              Montacargas · Check List
            </span>
            <h1 className="text-2xl md:text-4xl font-black text-[#0D2B4E] tracking-tight">
              Novedades Check List Montacargas
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-xl mx-auto">
              Seleccione el área de trabajo para analizar las tendencias o revisar el detalle de novedades y adjuntar evidencias.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto pt-2">
            {/* Tarjeta DASHBOARD */}
            <button
              onClick={() => setSubModulo('dashboard')}
              className="group flex flex-col items-center justify-center text-center p-8 md:p-10 rounded-3xl bg-white border-2 border-slate-200 hover:border-[#0D2B4E] shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-[#0D2B4E] group-hover:bg-[#0D2B4E] group-hover:text-white transition-colors duration-300 shadow-inner mb-4">
                <BarChart3 size={44} />
              </div>
              <span className="text-xl font-black text-[#0D2B4E] uppercase tracking-wider">
                Dashboard
              </span>
              <span className="text-xs text-slate-500 mt-1 font-medium">
                Análisis de novedades y gráficas
              </span>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                <span>{globalStats.total} novedades registradas</span>
              </div>
            </button>

            {/* Tarjeta NOVEDADES */}
            <button
              onClick={() => setSubModulo('novedades')}
              className="group flex flex-col items-center justify-center text-center p-8 md:p-10 rounded-3xl bg-white border-2 border-slate-200 hover:border-emerald-600 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-inner mb-4">
                <ClipboardList size={44} />
              </div>
              <span className="text-xl font-black text-slate-900 group-hover:text-emerald-700 uppercase tracking-wider transition-colors">
                Novedades
              </span>
              <span className="text-xs text-slate-500 mt-1 font-medium">
                Ver listado y cerrar con evidencia
              </span>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>{globalStats.abiertos} abiertas · {globalStats.cerrados} cerradas</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SUBMÓDULO: DASHBOARD DE GRÁFICAS                           */}
      {/* ------------------------------------------------------------- */}
      {subModulo === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 md:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSubModulo('inicio')}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#0D2B4E] hover:text-[#0D2B4E]/80 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al menú</span>
              </button>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-[#0D2B4E]">
                  Dashboard de Novedades Montacargas
                </h2>
                <p className="text-xs text-slate-500">
                  Estadísticas consolidadas por sistema, criticidad y estado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
              <button
                onClick={() => setSubModulo('novedades')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Ver Lista de Novedades</span>
              </button>
            </div>
          </div>

          {renderFilterBar()}
          {renderSummaryCards()}

          {/* Gráfica 1: Novedades por SISTEMA */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#0D2B4E] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0D2B4E]" />
                  Novedades por Sistema Afectado
                </h3>
                <p className="text-xs text-slate-500">
                  Total de reportes por subsistema (ordenado de mayor a menor frecuencia)
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
                {chartSistemasData.length} sistemas con reportes
              </span>
            </div>

            {chartSistemasData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No hay datos para mostrar con los filtros seleccionados
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartSistemasData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                    <XAxis 
                      dataKey="sistema" 
                      tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis 
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderColor: '#E5E7EB', 
                        borderRadius: '0.75rem', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        color: '#111827',
                        fontSize: '12px'
                      }}
                      formatter={(value: any, name: any, item: any) => [
                        `${value} novedad(es) (${item.payload.abiertos} abiertas, ${item.payload.cerrados} cerradas)`,
                        'Total'
                      ]}
                    />
                    <Bar 
                      dataKey="cantidad" 
                      fill={BRAND_NAVY} 
                      radius={[6, 6, 0, 0]}
                    >
                      <LabelList 
                        dataKey="cantidad" 
                        position="top" 
                        fill="#111827" 
                        fontSize={11} 
                        fontWeight={700} 
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Gráficas 2 y 3: Criticidad y Estado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Criticidad */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-[#0D2B4E] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#0D2B4E]" />
                  Novedades por Nivel de Criticidad
                </h3>
                <p className="text-xs text-slate-500">
                  Criticidad 1 (Crítica/Rojo), 2 (Media/Dorado), 3 (Baja/Verde)
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartCriticidadData}
                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis 
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderColor: '#E5E7EB', 
                        borderRadius: '0.75rem', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        color: '#111827',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`${val} reportes`, 'Cantidad']}
                    />
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                      {chartCriticidadData.map((entry, index) => (
                        <Cell key={`cell-crit-${index}`} fill={entry.color} />
                      ))}
                      <LabelList 
                        dataKey="valor" 
                        position="top" 
                        fill="#111827" 
                        fontSize={11} 
                        fontWeight={700} 
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                  <div className="text-[10px] uppercase font-bold text-rose-700">Crítica (1)</div>
                  <div className="text-base font-black text-rose-700 tabular-nums">
                    {chartCriticidadData.find(c => c.nivel === '1')?.valor || 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-[10px] uppercase font-bold text-amber-800">Media (2)</div>
                  <div className="text-base font-black text-amber-800 tabular-nums">
                    {chartCriticidadData.find(c => c.nivel === '2')?.valor || 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Baja (3)</div>
                  <div className="text-base font-black text-emerald-700 tabular-nums">
                    {chartCriticidadData.find(c => c.nivel === '3')?.valor || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Abiertas vs Cerradas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-[#0D2B4E] flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-[#0D2B4E]" />
                  Estado de Resolución (Abiertas vs Cerradas)
                </h3>
                <p className="text-xs text-slate-500">
                  Distribución porcentual de cierre de novedades
                </p>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                {stats.total === 0 ? (
                  <div className="text-xs text-slate-400">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartEstadoData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="valor"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {chartEstadoData.map((entry, index) => (
                          <Cell key={`cell-estado-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#FFFFFF', 
                          borderColor: '#E5E7EB', 
                          borderRadius: '0.75rem', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          color: '#111827',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => [`${val} novedades`, 'Total']}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-700">Efectividad de cierre:</span>
                </div>
                <span className="font-black text-emerald-700 text-sm">{stats.pctCerrados}%</span>
              </div>
            </div>
          </div>

          {/* Gráfica 4: Novedades por MES y Top 5 Sistemas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolución Mensual */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-[#0D2B4E] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0D2B4E]" />
                  Evolución Mensual de Novedades
                </h3>
                <p className="text-xs text-slate-500">
                  Volumen de fallas reportadas por período
                </p>
              </div>

              {chartMesData.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No hay datos mensuales registrados
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartMesData}
                      margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                      <XAxis 
                        dataKey="mes" 
                        tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }}
                      />
                      <YAxis 
                        tick={{ fill: '#6B7280', fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#FFFFFF', 
                          borderColor: '#E5E7EB', 
                          borderRadius: '0.75rem', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          color: '#111827',
                          fontSize: '12px'
                        }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val} novedades (${item.payload.cerrados} cerradas, ${item.payload.abiertos} abiertas)`,
                          'Total'
                        ]}
                      />
                      <Bar 
                        dataKey="cantidad" 
                        fill={COLOR_AZUL_SUAVE} 
                        radius={[6, 6, 0, 0]}
                      >
                        <LabelList 
                          dataKey="cantidad" 
                          position="top" 
                          fill="#111827" 
                          fontSize={11} 
                          fontWeight={700} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Ranking Top 5 Sistemas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-[#0D2B4E] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0D2B4E]" />
                  Top 5 Sistemas que Más Fallan
                </h3>
                <p className="text-xs text-slate-500">
                  Ranking de componentes con mayor recurrencia de fallas
                </p>
              </div>

              {topSistemas.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No hay datos disponibles
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Sistema</th>
                        <th className="py-2.5 px-3 text-center">Fallas</th>
                        <th className="py-2.5 px-3 text-center">Abiertas</th>
                        <th className="py-2.5 px-3 text-right">% del Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topSistemas.map((item, idx) => {
                        const pct = stats.total > 0 ? ((item.cantidad / stats.total) * 100).toFixed(1) : '0';
                        return (
                          <tr key={`top-${item.sistema}`} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-black text-slate-400">
                              {idx + 1}º
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {item.sistema}
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-[#0D2B4E] tabular-nums">
                              {item.cantidad}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.abiertos > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  {item.abiertos}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-600 tabular-nums">
                              {pct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SUBMÓDULO: NOVEDADES (LISTA + SUBIR FOTO O LINK)            */}
      {/* ------------------------------------------------------------- */}
      {subModulo === 'novedades' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 md:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSubModulo('inicio')}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#0D2B4E] hover:text-[#0D2B4E]/80 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al menú</span>
              </button>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-[#0D2B4E]">
                  Listado de Novedades de Montacargas
                </h2>
                <p className="text-xs text-slate-500">
                  Visualización detallada y gestión de enlace de evidencia de cierre
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowConfigModal(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isScriptConfigured()
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{isScriptConfigured() ? 'Script Activo' : 'Configurar Script'}</span>
              </button>

              <button
                onClick={exportToCsv}
                disabled={filteredItems.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              <button
                onClick={loadData}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-[#0D2B4E] hover:bg-[#0D2B4E]/90 shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Cargando...' : 'Sincronizar'}</span>
              </button>
            </div>
          </div>

          {renderFilterBar()}

          {/* Tabla de Novedades */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No se encontraron novedades</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No hay registros que coincidan con los filtros seleccionados.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#0D2B4E] text-white hover:bg-[#0D2B4E]/90 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600">
                      <th className="py-3.5 px-4">Equipo / Placa</th>
                      <th className="py-3.5 px-4">CD / Transportista</th>
                      <th className="py-3.5 px-4">Fecha Reporte</th>
                      <th className="py-3.5 px-4">Sistema</th>
                      <th className="py-3.5 px-4 min-w-[260px]">Novedad Reportada</th>
                      <th className="py-3.5 px-4 text-center">Criticidad</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Solución / Observación</th>
                      <th className="py-3.5 px-4 text-right">Evidencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {paginatedItems.map((item) => {
                      const isAbierto = (item.estado || '').toLowerCase().includes('abiert');
                      const hasLink = item.links && item.links.trim().length > 0;

                      return (
                        <tr 
                          key={`novedad-${item.rowIndex}-${item.placa}`}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center font-black text-xs text-emerald-700">
                                {item.placa || '—'}
                              </span>
                              <div>
                                <span className="text-[10px] text-slate-400 font-mono block">Fila #{item.rowIndex}</span>
                                {item.fuente && (
                                  <span className="text-[10px] text-slate-500 truncate max-w-[120px] block" title={item.fuente}>
                                    {item.fuente}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{item.cd || '—'}</div>
                            <div className="text-[11px] text-slate-500">{item.transportista || '—'}</div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{item.fechaReporte || '—'}</div>
                            <div className="text-[10px] text-slate-500">
                              {item.mes || ''} {item.semana ? `· Sem ${item.semana}` : ''}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.sistema || 'General'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">
                              {item.reporte || '—'}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {String(item.criticidad) === '1' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                                Crítica (1)
                              </span>
                            )}
                            {String(item.criticidad) === '2' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Media (2)
                              </span>
                            )}
                            {String(item.criticidad) !== '1' && String(item.criticidad) !== '2' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                Baja ({item.criticidad || '3'})
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isAbierto 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isAbierto ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                  Abierto
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  Cerrado
                                </>
                              )}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-[11px] text-slate-700 line-clamp-2" title={item.observaciones || ''}>
                              {item.observaciones || <span className="text-slate-400 italic">Sin observaciones</span>}
                            </div>
                            {item.fechaSolucion && (
                              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>Solución: {item.fechaSolucion}</span>
                              </div>
                            )}
                          </td>

                          {/* Botón de Evidencia */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Evidencia 1 (Columna T) */}
                              {item.links && item.links.trim() ? (
                                <a
                                  href={item.links}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors"
                                  title={`Ver Evidencia 1 (Columna T): ${item.links}`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Ver Evidencia 1</span>
                                </a>
                              ) : null}

                              {/* Evidencia 2 (Columna U) */}
                              {item.links2 && item.links2.trim() ? (
                                <a
                                  href={item.links2}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                                  title={`Ver Evidencia 2 (Columna U): ${item.links2}`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Ver Evidencia 2</span>
                                </a>
                              ) : null}

                              {/* Evidencia 3 (Columna V) */}
                              {item.links3 && item.links3.trim() ? (
                                <a
                                  href={item.links3}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
                                  title={`Ver Evidencia 3 (Columna V): ${item.links3}`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Ver Evidencia 3</span>
                                </a>
                              ) : null}

                              {/* Botón de Cargar/Subir Foto */}
                              {(() => {
                                const nextSlot: 1 | 2 | 3 = !item.links ? 1 : !item.links2 ? 2 : 3;
                                const hasAllThree = Boolean(item.links && item.links2 && item.links3);
                                const hasAny = Boolean(item.links || item.links2 || item.links3);
                                const btnLabel = hasAllThree ? 'Gestionar' : !item.links ? 'Subir' : !item.links2 ? '+ Evidencia 2' : '+ Evidencia 3';

                                return (
                                  <button
                                    onClick={() => handleOpenUploadModal(item, nextSlot)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                      hasAny
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                    }`}
                                    title={hasAny ? 'Gestionar o subir más evidencias' : 'Subir evidencia'}
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>{btnLabel}</span>
                                  </button>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {filteredItems.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>
                    ({Math.min((currentPage - 1) * itemsPerPage + 1, filteredItems.length)} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} de {filteredItems.length})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-900">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SUBIR EVIDENCIA (Foto / Galería / Pegar / Enlace Web)  */}
      {/* ------------------------------------------------------------- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative text-slate-800 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Encabezado */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0D2B4E]">Subir Evidencia de Cierre</h3>
                <p className="text-xs text-slate-500">
                  Carga foto de la galería, tómala con la cámara o pega una captura para subirla a Drive
                </p>
              </div>
            </div>

            {/* Ficha Resumen de la Novedad */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Montacargas:</span>
                <span className="font-black text-[#0D2B4E] text-sm">Máquina {selectedItem.placa}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Fila en Hoja:</span>
                <span className="font-mono text-slate-700 font-bold">Fila #{selectedItem.rowIndex}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sistema:</span>
                <span className="font-semibold text-slate-800">{selectedItem.sistema || 'General'}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200">
                <span className="text-slate-500 block mb-0.5">Novedad Reportada:</span>
                <p className="text-slate-900 font-medium italic">"{selectedItem.reporte}"</p>
              </div>
            </div>

            {/* Selector de Evidencia 1 vs Evidencia 2 vs Evidencia 3 */}
            <div className="mb-4">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Destino de la Evidencia:
              </label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map(n => {
                  const yaTiene = n === 1 ? selectedItem?.links : n === 2 ? selectedItem?.links2 : selectedItem?.links3;
                  const colLetra = n === 3 ? 'V' : (n === 2 ? 'U' : 'T');
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleSelectSlot(n)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        slotEvidencia === n
                          ? 'bg-[#0D2B4E] text-white border-[#0D2B4E] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Evidencia {n} ({colLetra})</span>
                      {yaTiene && <span className="text-emerald-400 font-black">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Modo: Foto vs Enlace Directo */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setModoEvidencia('foto')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  modoEvidencia === 'foto'
                    ? 'bg-white text-[#0D2B4E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Foto (Cámara / Galería / Pegar)</span>
              </button>
              <button
                type="button"
                onClick={() => setModoEvidencia('link')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  modoEvidencia === 'link'
                    ? 'bg-white text-[#0D2B4E] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-4 h-4 text-[#0D2B4E]" />
                <span>Pegar Enlace Directo</span>
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveEvidence} className="space-y-4">
              
              {/* OPCIÓN 1: SUBIDA DE FOTO */}
              {modoEvidencia === 'foto' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Fotografía de Evidencia</span>
                    {fotoBase64 && (
                      <span className="text-[11px] text-emerald-700 font-normal">
                        ✓ 1 foto seleccionada
                      </span>
                    )}
                  </div>

                  {/* Zona de Selección / Drop / Paste */}
                  {!fotoBase64 ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                        isDragging
                          ? 'border-emerald-500 bg-emerald-50 scale-[1.01]'
                          : 'border-slate-300 hover:border-emerald-500 bg-slate-50/70'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 mb-1">
                        Cargar foto de la solución
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-4">
                        Toma una foto con tu cámara, elígela de la galería, arrástrala aquí o pégala con <strong>Ctrl + V</strong>.
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {/* Botón Cámara */}
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Tomar Foto</span>
                        </button>

                        {/* Botón Galería */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4 text-[#0D2B4E]" />
                          <span>De Galería / Archivo</span>
                        </button>

                        {/* Botón Pegar Portapapeles */}
                        <button
                          type="button"
                          onClick={handlePasteClipboardBtn}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                          title="Pegar imagen copiada"
                        >
                          <Clipboard className="w-4 h-4 text-emerald-600" />
                          <span>Pegar (Ctrl+V)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Vista Previa de la Foto */
                    <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-3">
                      <div className="relative rounded-xl overflow-hidden bg-slate-200 aspect-video flex items-center justify-center border border-slate-200">
                        <img 
                          src={fotoBase64} 
                          alt="Evidencia seleccionada" 
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate" title={fotoNombre}>
                            {fotoNombre || 'Foto seleccionada'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          >
                            Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => { setFotoBase64(''); setFotoNombre(''); }}
                            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Al presionar <strong>Guardar</strong>, esta foto se subirá automáticamente a tu <strong>Google Drive</strong> y el enlace generado se registrará en la columna <strong>{slotEvidencia === 3 ? 'LINKS 3 (Columna V / 22)' : slotEvidencia === 2 ? 'LINKS 2 (Columna U / 21)' : 'LINKS (Columna T / 20)'}</strong> de la hoja.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OPCIÓN 2: ENLACE WEB DIRECTO */}
              {modoEvidencia === 'link' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    URL / Enlace Web de la Evidencia (Drive, Web, etc.) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0D2B4E] focus:ring-1 focus:ring-[#0D2B4E] font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Se registrará en la columna <strong>{slotEvidencia === 3 ? 'LINKS 3 (Columna V / 22)' : slotEvidencia === 2 ? 'LINKS 2 (Columna U / 21)' : 'LINKS (Columna T / 20)'}</strong> de la fila #{selectedItem.rowIndex}.
                  </p>
                </div>
              )}

              {/* Estado y Observaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Estado de la Novedad
                  </label>
                  <select
                    value={estadoInput}
                    onChange={(e) => setEstadoInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0D2B4E]"
                  >
                    <option value="Cerrado">Cerrado (Recomendado)</option>
                    <option value="Abierto">Mantener Abierto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Observación de Cierre (Opcional)
                  </label>
                  <input
                    type="text"
                    value={obsInput}
                    onChange={(e) => setObsInput(e.target.value)}
                    placeholder="Ej. Evidencia cargada, reparado..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0D2B4E]"
                  />
                </div>
              </div>

              {/* Estado de Envío / Progreso */}
              {isSubmitting && submittingStep && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2.5 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="font-semibold">{submittingStep}</span>
                </div>
              )}

              {/* Feedback de Éxito / Error */}
              {submitFeedback && (
                <div className={`p-3 rounded-xl text-xs flex flex-col gap-1.5 ${
                  submitFeedback.type === 'success' 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {submitFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    )}
                    <span className="font-semibold">{submitFeedback.message}</span>
                  </div>
                  {submitFeedback.driveUrl && (
                    <div className="pl-6 text-[11px] font-mono break-all text-emerald-700">
                      Link: {submitFeedback.driveUrl}
                    </div>
                  )}
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (modoEvidencia === 'foto' ? !fotoBase64 : !linkInput.trim())}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>{modoEvidencia === 'foto' ? 'Subir a Drive y Guardar' : 'Guardar en Hoja'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CONFIGURACIÓN APPS SCRIPT (Estilo Claro y Limpio)      */}
      {/* ------------------------------------------------------------- */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-800">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#0D2B4E]">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0D2B4E]">Configurar Apps Script</h3>
                <p className="text-xs text-slate-500">Conexión con la hoja CIERRE DE NOVEDADES</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Documento ID:</span>
                  <span className="font-mono text-[#0D2B4E] font-bold">{NOVEDADES_FLT_DOC_ID}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Hoja Objetivo:</span>
                  <span className="font-bold text-slate-900">CIERRE DE NOVEDADES (GID 0)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Método de Cierre:</span>
                  <span className="font-mono text-emerald-700 font-bold">POST_NOVEDAD_FLT_LINK</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  URL del Script Desplegado (/exec):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={scriptUrlInput}
                    onChange={(e) => setScriptUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0D2B4E] font-mono"
                  />
                  <button
                    onClick={handleTestScript}
                    disabled={isTestingScript || !scriptUrlInput.trim()}
                    className="px-4 py-2.5 rounded-xl font-bold bg-[#0D2B4E] hover:bg-[#0D2B4E]/90 text-white transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {isTestingScript ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Guardar</span>
                  </button>
                </div>
                {scriptTestResult && (
                  <p className={`mt-2 font-medium ${scriptTestResult.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {scriptTestResult.message}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-[#0D2B4E] text-xs uppercase tracking-wider">
                    ¿Cómo desplegar el script?
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    GOOGLE_APPS_SCRIPT_NOVEDADES_FLT.gs
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                  <li>Abre la hoja <strong>1cdocNK5v-ENbTt7cDSPggErghESuWbL40IqF5X-xg4I</strong>.</li>
                  <li>Ve a <strong>Extensiones &gt; Apps Script</strong>.</li>
                  <li>Copia el código del archivo <strong>GOOGLE_APPS_SCRIPT_NOVEDADES_FLT.gs</strong>.</li>
                  <li>Haz clic en <strong>Implementar &gt; Nueva implementación</strong> (Tipo: Aplicación web, Acceso: Cualquier persona).</li>
                  <li>Pega la URL generada aquí y haz clic en Guardar.</li>
                </ol>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
