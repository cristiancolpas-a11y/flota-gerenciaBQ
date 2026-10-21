import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ForkliftPreventive } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Line, ComposedChart, Legend, Cell, LabelList
} from 'recharts';
import { 
  CheckCircle2, XCircle, Search, RotateCcw, 
  Truck, Calendar, Layers, ChevronLeft, ChevronRight,
  TrendingUp, Download, Clock, Gauge, Camera, Upload, 
  Image as ImageIcon, X, Loader2, Sparkles, AlertCircle, ExternalLink
} from 'lucide-react';
import { submitForkliftPreventiveEvidence } from '../services/sheetService';
import { compressImageToBase64 } from '../utils';

interface Props {
  data: ForkliftPreventive[];
  onRefresh?: () => void;
}

const ORDEN_MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const normalizaMes = (s: string) => (s || '').toString().trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const formatFechaCorta = (fechaVal?: string, isoVal?: string): string => {
  const val = isoVal || fechaVal;
  if (!val || val === '—' || val === 'No disponible' || val === 'Invalid Date') return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const parts = val.slice(0, 10).split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(val + 'T12:00:00');
  if (isNaN(d.getTime())) return val || '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

export const ForkliftPreventiveDashboard: React.FC<Props> = ({ data, onRefresh }) => {
  // Estado local para permitir actualización optimista al subir evidencias
  const [localData, setLocalData] = useState<ForkliftPreventive[]>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // ---------------------------------------------------------------------------
  // ESTADOS DE FILTRO (Multifiltro)
  // ---------------------------------------------------------------------------
  const [filterCd, setFilterCd] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterSemana, setFilterSemana] = useState<string>('TODOS');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');
  const [filterMaquina, setFilterMaquina] = useState<string>('TODOS');
  const [filterCumplimiento, setFilterCumplimiento] = useState<string>('TODOS');
  const [searchMaquina, setSearchMaquina] = useState<string>('');

  // Límite para la gráfica de frecuencia por máquina (columnas verticales)
  const [topMaquinasLimit, setTopMaquinasLimit] = useState<number | 'todas'>(15);

  // Paginación de la tabla
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Estados de Evidencias (Modales)
  const [uploadRecord, setUploadRecord] = useState<ForkliftPreventive | null>(null);
  const [previewRecord, setPreviewRecord] = useState<ForkliftPreventive | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Escucha de pegado (Ctrl+V) en ventana cuando el modal de subida esté abierto
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!uploadRecord) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            try {
              const compressed = await compressImageToBase64(file, 1600);
              setSelectedImageBase64(compressed);
              setUploadError(null);
            } catch (err) {
              setUploadError('Error al procesar la imagen pegada.');
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [uploadRecord]);

  // Manejo de drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await compressImageToBase64(file, 1600);
          setSelectedImageBase64(compressed);
          setUploadError(null);
        } catch (err) {
          setUploadError('Error al procesar el archivo arrastrado.');
        }
      } else {
        setUploadError('Por favor arrastra únicamente un archivo de imagen.');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageToBase64(file, 1600);
        setSelectedImageBase64(compressed);
        setUploadError(null);
      } catch (err) {
        setUploadError('Error al procesar la imagen seleccionada.');
      }
    }
  };

  const handleSaveEvidence = async () => {
    if (!uploadRecord || !selectedImageBase64) return;

    setIsUploading(true);
    setUploadError(null);

    const targetId = uploadRecord.id;
    const oldEvidencia = uploadRecord.evidencia;

    // Actualización optimista inmediata
    setLocalData(prev => prev.map(item => {
      if (item.id === targetId) {
        return { ...item, evidencia: selectedImageBase64 };
      }
      return item;
    }));

    try {
      const res = await submitForkliftPreventiveEvidence({
        rowIndex: uploadRecord.rowIndex,
        maquina: uploadRecord.maquina,
        fecha: uploadRecord.fecha,
        imageBase64: selectedImageBase64
      });

      if (res && res.link) {
        setLocalData(prev => prev.map(item => {
          if (item.id === targetId) {
            return { ...item, evidencia: res.link };
          }
          return item;
        }));
      }

      setUploadRecord(null);
      setSelectedImageBase64('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      // Revertir optimismo en caso de error
      setLocalData(prev => prev.map(item => {
        if (item.id === targetId) {
          return { ...item, evidencia: oldEvidencia };
        }
        return item;
      }));
      setUploadError(err?.message || 'Error al guardar la evidencia. Inténtalo nuevamente.');
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // OPCIONES DISPONIBLES EN FILTROS
  // ---------------------------------------------------------------------------
  const availableOptions = useMemo(() => {
    const cds = new Set<string>();
    const mesesMap = new Map<string, string>();
    const semanas = new Set<string>();
    const tipos = new Set<string>();
    const maquinas = new Set<string>();

    localData.forEach(item => {
      if (item.cd && item.cd !== '—') cds.add(item.cd);
      if (item.mes && item.mes !== '—' && item.mes !== 'Sin Mes') {
        const norm = normalizaMes(item.mes);
        if (!mesesMap.has(norm)) {
          mesesMap.set(norm, item.mes);
        }
      }
      if (item.semana && item.semana !== '—') semanas.add(item.semana);
      if (item.tipo && item.tipo !== '—') tipos.add(item.tipo);
      if (item.maquina && item.maquina !== '—') maquinas.add(item.maquina);
    });

    const mesesOrdenados = Array.from(mesesMap.entries())
      .sort((a, b) => {
        const idxA = ORDEN_MESES.indexOf(a[0]);
        const idxB = ORDEN_MESES.indexOf(b[0]);
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
      })
      .map(entry => entry[1]);

    const semanasOrdenadas = Array.from(semanas).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const tiposOrdenados = Array.from(tipos).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const maquinasOrdenadas = Array.from(maquinas).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return {
      cds: Array.from(cds).sort(),
      meses: mesesOrdenados,
      semanas: semanasOrdenadas,
      tipos: tiposOrdenados,
      maquinas: maquinasOrdenadas
    };
  }, [localData]);

  // Limpieza general de filtros
  const handleResetFilters = () => {
    setFilterCd('TODOS');
    setFilterMes('TODOS');
    setFilterSemana('TODOS');
    setFilterTipo('TODOS');
    setFilterMaquina('TODOS');
    setFilterCumplimiento('TODOS');
    setSearchMaquina('');
    setCurrentPage(1);
  };

  const hasActiveFilters = 
    filterCd !== 'TODOS' || 
    filterMes !== 'TODOS' || 
    filterSemana !== 'TODOS' || 
    filterTipo !== 'TODOS' || 
    filterMaquina !== 'TODOS' || 
    filterCumplimiento !== 'TODOS' || 
    searchMaquina.trim() !== '';

  // Filtros cruzados interactivos desde gráficos
  const handleToggleFilter = (type: 'cd' | 'mes' | 'semana' | 'tipo' | 'maquina', value: string) => {
    setCurrentPage(1);
    switch (type) {
      case 'cd':
        setFilterCd(prev => prev === value ? 'TODOS' : value);
        break;
      case 'mes':
        setFilterMes(prev => normalizaMes(prev) === normalizaMes(value) ? 'TODOS' : value);
        break;
      case 'semana':
        setFilterSemana(prev => prev === value ? 'TODOS' : value);
        break;
      case 'tipo':
        setFilterTipo(prev => prev === value ? 'TODOS' : value);
        break;
      case 'maquina':
        setFilterMaquina(prev => prev === value ? 'TODOS' : value);
        break;
    }
  };

  // ---------------------------------------------------------------------------
  // APLICACIÓN DEL MULTIFILTRO
  // ---------------------------------------------------------------------------
  const filteredData = useMemo(() => {
    const cleanSearch = searchMaquina.trim().toUpperCase();

    return localData.filter(item => {
      if (cleanSearch && !item.maquina.toUpperCase().includes(cleanSearch)) {
        return false;
      }
      if (filterCd !== 'TODOS' && item.cd !== filterCd) {
        return false;
      }
      if (filterMes !== 'TODOS' && normalizaMes(item.mes) !== normalizaMes(filterMes)) {
        return false;
      }
      if (filterSemana !== 'TODOS' && item.semana !== filterSemana) {
        return false;
      }
      if (filterTipo !== 'TODOS' && item.tipo !== filterTipo) {
        return false;
      }
      if (filterMaquina !== 'TODOS' && item.maquina !== filterMaquina) {
        return false;
      }
      if (filterCumplimiento !== 'TODOS') {
        if (filterCumplimiento === '100%' && !item.esCumple) return false;
        if (filterCumplimiento === '0%' && item.esCumple) return false;
      }
      return true;
    });
  }, [localData, filterCd, filterMes, filterSemana, filterTipo, filterMaquina, filterCumplimiento, searchMaquina]);

  // ---------------------------------------------------------------------------
  // 3.1 CÁLCULO DE KPIS
  // ---------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const total = filteredData.length;
    let cumple = 0;
    let noCumple = 0;
    let sumConfiabilidad = 0;
    let countConfiabilidad = 0;
    let sumDesviacion = 0;
    let countDesviacion = 0;
    let conEvidencia = 0;

    filteredData.forEach(item => {
      if (item.cumplimiento === '100%') cumple++;
      else if (item.cumplimiento === '0%') noCumple++;

      if (item.confiabilidad && item.confiabilidad !== '—') {
        const num = parseFloat(String(item.confiabilidad).replace('%', '').trim());
        if (!isNaN(num)) {
          sumConfiabilidad += num;
          countConfiabilidad++;
        }
      }

      if (item.desviacion && item.desviacion !== '—') {
        const num = parseFloat(String(item.desviacion).replace(/[^\d.-]/g, ''));
        if (!isNaN(num)) {
          sumDesviacion += num;
          countDesviacion++;
        }
      }

      if (item.evidencia && item.evidencia.trim()) {
        conEvidencia++;
      }
    });

    const totalClasificado = cumple + noCumple;
    const porcentaje = totalClasificado > 0 ? Math.round((cumple / totalClasificado) * 100) : 0;
    const avgConfiabilidad = countConfiabilidad > 0 ? Math.round(sumConfiabilidad / countConfiabilidad) : 0;
    const avgDesviacion = countDesviacion > 0 ? Math.round(sumDesviacion / countDesviacion) : 0;

    return {
      total,
      cumple,
      noCumple,
      porcentaje,
      avgConfiabilidad,
      avgDesviacion,
      conEvidencia,
      sinClasificar: total - totalClasificado
    };
  }, [filteredData]);

  // ---------------------------------------------------------------------------
  // 3.2 GRÁFICA MENSUAL (Enero a Diciembre cronológico)
  // ---------------------------------------------------------------------------
  const monthlyData = useMemo(() => {
    const map = new Map<string, { clave: string; mes: string; mesNumero: number; cumple: number; noCumple: number; total: number }>();

    filteredData.forEach(item => {
      const raw = item.mes || '';
      const norm = normalizaMes(raw);
      const idxMes = ORDEN_MESES.indexOf(norm);
      const mesNum = idxMes !== -1 ? idxMes + 1 : (item.mesNumero || 99);
      const clave = String(mesNum).padStart(2, '0');
      const mesLabel = idxMes !== -1 
        ? (norm.charAt(0).toUpperCase() + norm.slice(1)) 
        : (item.mes && item.mes !== 'Sin Mes' && item.mes !== '—' ? item.mes : '—');

      if (!map.has(clave)) {
        map.set(clave, { clave, mes: mesLabel, mesNumero: mesNum, cumple: 0, noCumple: 0, total: 0 });
      }
      const entry = map.get(clave)!;
      entry.total++;
      if (item.esCumple) entry.cumple++;
      else entry.noCumple++;
    });

    return Array.from(map.values())
      .sort((a, b) => a.mesNumero - b.mesNumero)
      .map(entry => {
        const totalCumpl = entry.cumple + entry.noCumple;
        const pct = totalCumpl > 0 ? Math.round((entry.cumple / totalCumpl) * 100) : 0;
        return {
          ...entry,
          porcentaje: pct
        };
      });
  }, [filteredData]);

  // ---------------------------------------------------------------------------
  // 3.3 GRÁFICA SEMANAL
  // ---------------------------------------------------------------------------
  const weeklyData = useMemo(() => {
    const map = new Map<string, { semana: string; num: number; cumple: number; noCumple: number; total: number }>();

    filteredData.forEach(item => {
      const semLabel = item.semana && item.semana !== '—' ? item.semana : '—';
      const semNum = item.semanaNumero || parseInt(semLabel.replace(/\D/g, ''), 10) || 0;

      if (!map.has(semLabel)) {
        map.set(semLabel, { semana: semLabel, num: semNum, cumple: 0, noCumple: 0, total: 0 });
      }
      const entry = map.get(semLabel)!;
      entry.total++;
      if (item.esCumple) entry.cumple++;
      else entry.noCumple++;
    });

    return Array.from(map.values())
      .sort((a, b) => a.num - b.num)
      .map(entry => {
        const totalCumpl = entry.cumple + entry.noCumple;
        const pct = totalCumpl > 0 ? Math.round((entry.cumple / totalCumpl) * 100) : 0;
        return {
          ...entry,
          porcentaje: pct
        };
      });
  }, [filteredData]);

  // ---------------------------------------------------------------------------
  // 3.4 REFERENCIA POR CD
  // ---------------------------------------------------------------------------
  const cdData = useMemo(() => {
    const map = new Map<string, { cd: string; cumple: number; noCumple: number; total: number }>();

    filteredData.forEach(item => {
      const cdName = item.cd || '—';
      if (!map.has(cdName)) {
        map.set(cdName, { cd: cdName, cumple: 0, noCumple: 0, total: 0 });
      }
      const entry = map.get(cdName)!;
      entry.total++;
      if (item.esCumple) entry.cumple++;
      else entry.noCumple++;
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map(entry => {
        const totalCumpl = entry.cumple + entry.noCumple;
        const pct = totalCumpl > 0 ? Math.round((entry.cumple / totalCumpl) * 100) : 0;
        return {
          ...entry,
          porcentaje: pct
        };
      });
  }, [filteredData]);

  // ---------------------------------------------------------------------------
  // 3.5 POR TIPO DE MANTENIMIENTO (250, 500, 750, 1000, 2000 hr)
  // ---------------------------------------------------------------------------
  const typeData = useMemo(() => {
    const map = new Map<string, { tipo: string; numHours: number; cumple: number; noCumple: number; total: number }>();

    filteredData.forEach(item => {
      const tName = item.tipo || 'Sin Tipo';
      const numHours = parseInt(tName.replace(/\D/g, ''), 10) || 0;

      if (!map.has(tName)) {
        map.set(tName, { tipo: tName, numHours, cumple: 0, noCumple: 0, total: 0 });
      }
      const entry = map.get(tName)!;
      entry.total++;
      if (item.esCumple) entry.cumple++;
      else entry.noCumple++;
    });

    return Array.from(map.values())
      .sort((a, b) => a.numHours - b.numHours)
      .map(entry => {
        const totalCumpl = entry.cumple + entry.noCumple;
        const pct = totalCumpl > 0 ? Math.round((entry.cumple / totalCumpl) * 100) : 0;
        return {
          ...entry,
          porcentaje: pct
        };
      });
  }, [filteredData]);

  // ---------------------------------------------------------------------------
  // 3.6 FRECUENCIA POR MÁQUINA (Barras VERTICALES)
  // ---------------------------------------------------------------------------
  const machinesData = useMemo(() => {
    const map = new Map<string, { maquina: string; count: number; cd: string; cumple: number; noCumple: number }>();

    filteredData.forEach(item => {
      const maq = item.maquina || 'Sin Máquina';
      if (!map.has(maq)) {
        map.set(maq, { maquina: maq, count: 0, cd: item.cd || '—', cumple: 0, noCumple: 0 });
      }
      const entry = map.get(maq)!;
      entry.count++;
      if (item.esCumple) entry.cumple++;
      else entry.noCumple++;
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const displayedMachines = useMemo(() => {
    if (topMaquinasLimit === 'todas') return machinesData;
    return machinesData.slice(0, topMaquinasLimit);
  }, [machinesData, topMaquinasLimit]);

  // ---------------------------------------------------------------------------
  // 3.7 GRÁFICA DE CONFIABILIDAD DEL PREVENTIVO (Columna O = idx 14)
  // Promedio mensual en orden cronológico enero → diciembre
  // ---------------------------------------------------------------------------
  const reliabilityMonthlyData = useMemo(() => {
    const map = new Map<string, { clave: string; mes: string; mesNumero: number; sumConf: number; countConf: number; total: number }>();

    filteredData.forEach(item => {
      const raw = item.mes || '';
      const norm = normalizaMes(raw);
      const idxMes = ORDEN_MESES.indexOf(norm);
      const mesNum = idxMes !== -1 ? idxMes + 1 : (item.mesNumero || 99);
      const clave = String(mesNum).padStart(2, '0');
      const mesLabel = idxMes !== -1 
        ? (norm.charAt(0).toUpperCase() + norm.slice(1)) 
        : (item.mes && item.mes !== 'Sin Mes' && item.mes !== '—' ? item.mes : '—');

      if (!map.has(clave)) {
        map.set(clave, { clave, mes: mesLabel, mesNumero: mesNum, sumConf: 0, countConf: 0, total: 0 });
      }
      const entry = map.get(clave)!;
      entry.total++;

      if (item.confiabilidad && item.confiabilidad !== '—') {
        const num = parseFloat(String(item.confiabilidad).replace('%', '').trim());
        if (!isNaN(num)) {
          entry.sumConf += num;
          entry.countConf++;
        }
      }
    });

    return Array.from(map.values())
      .sort((a, b) => a.mesNumero - b.mesNumero)
      .map(entry => {
        const confPromedio = entry.countConf > 0 ? Math.round(entry.sumConf / entry.countConf) : 0;
        return {
          ...entry,
          confiabilidad: confPromedio
        };
      });
  }, [filteredData]);

  // ---------------------------------------------------------------------------
  // TABLA DE DETALLE CON PAGINACIÓN
  // ---------------------------------------------------------------------------
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Descarga CSV de los datos filtrados
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = [
      'MAQUINA', 'CD', 'TIPO_MTTO', 'MES', 'ANIO', 'SEMANA', 
      'FECHA', 'PROX_MTTO_HR', 'HOROMETRO_REGISTRADO', 
      'VALIDACION_CUMPLIMIENTO', 'META', 'DESVIACION', 
      'RUTINAS_PLANEADAS', 'RUTINAS_EJECUTADAS', 'CONFIABILIDAD', 
      'OBSERVACION', 'EVIDENCIAS'
    ];
    const rows = filteredData.map(p => [
      p.maquina, p.cd, p.tipo, p.mes, p.anio, p.semana,
      formatFechaCorta(p.fecha, p.fechaIso), p.proxHr, p.horometro,
      p.cumplimiento, p.meta, p.desviacion,
      p.planeadas, p.ejecutadas, p.confiabilidad,
      p.observacion, p.evidencia || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `preventivos_montacargas_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* --------------------------------------------------------------------- */}
      {/* CABECERA PRINCIPAL                                                    */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <h1 className="text-xl font-bold text-[#1E293B] tracking-tight">
              Preventivos Montacargas
            </h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Análisis de cumplimiento y confiabilidad de mantenimientos ejecutados
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 text-[#1E293B] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Sincronizar</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 4. BARRA DE MULTIFILTRO (SIEMPRE VISIBLE)                              */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
              Filtros de Análisis
            </span>
            <span className="text-xs font-medium text-[#64748B]">
              (Mostrando {filteredData.length} de {localData.length} registros)
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] hover:text-blue-800 font-semibold cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Filtro CD */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Centro (CD)
            </label>
            <select
              value={filterCd}
              onChange={(e) => {
                setFilterCd(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
            >
              <option value="TODOS">Todos los CD</option>
              {availableOptions.cds.map(cd => (
                <option key={cd} value={cd}>{cd}</option>
              ))}
            </select>
          </div>

          {/* Filtro Mes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Mes
            </label>
            <select
              value={filterMes}
              onChange={(e) => {
                setFilterMes(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
            >
              <option value="TODOS">Todos los Meses</option>
              {availableOptions.meses.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Filtro Semana */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Semana
            </label>
            <select
              value={filterSemana}
              onChange={(e) => {
                setFilterSemana(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
            >
              <option value="TODOS">Todas las Semanas</option>
              {availableOptions.semanas.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo de Mantenimiento */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Tipo (Horas)
            </label>
            <select
              value={filterTipo}
              onChange={(e) => {
                setFilterTipo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
            >
              <option value="TODOS">Todos los Tipos</option>
              {availableOptions.tipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Selector Máquina */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Máquina Específica
            </label>
            <select
              value={filterMaquina}
              onChange={(e) => {
                setFilterMaquina(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
            >
              <option value="TODOS">Todas las Máquinas</option>
              {availableOptions.maquinas.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Filtro Cumplimiento */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Cumplimiento
            </label>
            <select
              value={filterCumplimiento}
              onChange={(e) => {
                setFilterCumplimiento(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="100%">100% (Cumple)</option>
              <option value="0%">0% (No Cumple)</option>
            </select>
          </div>

        </div>

        {/* Búsqueda rápida por texto de máquina */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Buscar por identificador de máquina (ej. 861, 865, CP3)..."
            value={searchMaquina}
            onChange={(e) => {
              setSearchMaquina(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
          />
          {searchMaquina && (
            <button
              onClick={() => setSearchMaquina('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3.1 TARJETAS KPI (4 TARJETAS)                                         */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Preventivos CUMPLIDOS */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Preventivos Cumplidos
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#16A34A]">
              {kpis.cumple}
            </span>
            <span className="text-xs text-[#64748B]">
              ejecuciones (100%)
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            {kpis.total > 0 ? Math.round((kpis.cumple / kpis.total) * 100) : 0}% de los preventivos filtrados
          </p>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#16A34A] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${kpis.total > 0 ? (kpis.cumple / kpis.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* 2. Preventivos NO CUMPLIDOS */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Preventivos No Cumplidos
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#DC2626] flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#DC2626]">
              {kpis.noCumple}
            </span>
            <span className="text-xs text-[#64748B]">
              desviaciones (0%)
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            {kpis.total > 0 ? Math.round((kpis.noCumple / kpis.total) * 100) : 0}% con desvío en criterio
          </p>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#DC2626] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${kpis.total > 0 ? (kpis.noCumple / kpis.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* 3. % DE CUMPLIMIENTO GLOBAL */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              % Cumplimiento Global
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              kpis.porcentaje >= 80 ? 'bg-emerald-50 text-[#16A34A]' : 'bg-amber-50 text-[#F59E0B]'
            }`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${
              kpis.porcentaje >= 80 ? 'text-[#16A34A]' : (kpis.porcentaje >= 60 ? 'text-[#F59E0B]' : 'text-[#DC2626]')
            }`}>
              {Math.round(kpis.porcentaje)}%
            </span>
            <span className="text-xs text-[#64748B]">
              efectividad
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2">
            <span>{kpis.cumple} de {kpis.cumple + kpis.noCumple} válidos</span>
            <span className="font-semibold text-slate-500">Meta: ≥ 85%</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                kpis.porcentaje >= 80 ? 'bg-[#16A34A]' : (kpis.porcentaje >= 60 ? 'bg-[#F59E0B]' : 'bg-[#DC2626]')
              }`}
              style={{ width: `${Math.min(100, kpis.porcentaje)}%` }}
            />
          </div>
        </div>

        {/* 4. CONFIABILIDAD PROMEDIO (COLUMNA O) */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Confiabilidad Promedio
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#1E293B]">
              {kpis.avgConfiabilidad}%
            </span>
            <span className="text-xs text-[#64748B]">
              del preventivo
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2">
            <span>Total: <strong>{kpis.total} ejecuciones</strong></span>
            <span>Fotos: <strong>{kpis.conEvidencia} cargadas</strong></span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#2563EB] h-1.5 rounded-full"
              style={{ width: `${Math.min(100, kpis.avgConfiabilidad)}%` }}
            />
          </div>
        </div>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ESTADO VACÍO                                                          */}
      {/* --------------------------------------------------------------------- */}
      {filteredData.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-sm max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-[#64748B] flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B] mb-1">
            No hay preventivos de montacargas para los filtros seleccionados
          </h3>
          <p className="text-xs text-[#64748B] mb-6">
            Intenta seleccionar otro mes, semana, tipo de mantenimiento o limpiar la búsqueda por máquina.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restablecer todos los filtros</span>
          </button>
        </div>
      ) : (
        <>
          {/* ----------------------------------------------------------------- */}
          {/* 3.2 & 3.3 GRÁFICA MENSUAL Y SEMANAL                               */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* GRÁFICA MENSUAL */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    Cumplimiento Mensual
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Evolución mes a mes (enero a diciembre) — clic en barra para filtrar
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-[#2563EB]" />
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyData}
                    margin={{ top: 20, right: 25, left: -15, bottom: 20 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        const payload = e.activePayload[0].payload;
                        if (payload?.mes) handleToggleFilter('mes', payload.mes);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="mes" 
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis 
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1">
                              <p className="font-bold text-[#1E293B] border-b border-slate-100 pb-1">{label}</p>
                              <p className="text-[#16A34A] font-semibold">Cumplen (100%): {item.cumple}</p>
                              <p className="text-[#DC2626] font-semibold">No Cumplen (0%): {item.noCumple}</p>
                              <p className="text-slate-500 font-medium">Total: {item.total}</p>
                              <p className="text-[#2563EB] font-bold pt-1 border-t border-slate-100">
                                Cumplimiento: {item.porcentaje}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8, fontSize: '11px' }} />
                    <Bar dataKey="cumple" name="Cumple" fill="#16A34A" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="cumple" position="top" fill="#15803D" fontSize={10} fontWeight={700} formatter={(v: number) => v > 0 ? v : ''} />
                      {monthlyData.map((entry, index) => (
                        <Cell
                          key={`m-cumple-${index}`}
                          cursor="pointer"
                          fill="#16A34A"
                          opacity={filterMes !== 'TODOS' && normalizaMes(filterMes) !== normalizaMes(entry.mes) ? 0.35 : 1}
                          stroke={normalizaMes(filterMes) === normalizaMes(entry.mes) ? '#14532D' : undefined}
                          strokeWidth={normalizaMes(filterMes) === normalizaMes(entry.mes) ? 2 : 0}
                          onClick={() => handleToggleFilter('mes', entry.mes)}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="noCumple" name="No Cumple" fill="#DC2626" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="noCumple" position="top" fill="#B91C1C" fontSize={10} fontWeight={700} formatter={(v: number) => v > 0 ? v : ''} />
                      {monthlyData.map((entry, index) => (
                        <Cell
                          key={`m-nocumple-${index}`}
                          cursor="pointer"
                          fill="#DC2626"
                          opacity={filterMes !== 'TODOS' && normalizaMes(filterMes) !== normalizaMes(entry.mes) ? 0.35 : 1}
                          stroke={normalizaMes(filterMes) === normalizaMes(entry.mes) ? '#7F1D1D' : undefined}
                          strokeWidth={normalizaMes(filterMes) === normalizaMes(entry.mes) ? 2 : 0}
                          onClick={() => handleToggleFilter('mes', entry.mes)}
                        />
                      ))}
                    </Bar>
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="porcentaje" 
                      name="% Cumplimiento" 
                      stroke="#2563EB" 
                      strokeWidth={2.5} 
                      dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                      activeDot={{ r: 6 }}
                    >
                      <LabelList dataKey="porcentaje" position="top" offset={10} fill="#1D4ED8" fontSize={10} fontWeight={800} formatter={(v: number) => `${v}%`} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICA SEMANAL */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    Cumplimiento Semanal
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Evolución por semana de ejecución — clic en barra para filtrar
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-[#2563EB]" />
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={weeklyData}
                    margin={{ top: 20, right: 25, left: -15, bottom: 20 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        const payload = e.activePayload[0].payload;
                        if (payload?.semana) handleToggleFilter('semana', payload.semana);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="semana" 
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      angle={-35}
                      textAnchor="end"
                    />
                    <YAxis 
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1">
                              <p className="font-bold text-[#1E293B] border-b border-slate-100 pb-1">{label}</p>
                              <p className="text-[#16A34A] font-semibold">Cumplen: {item.cumple}</p>
                              <p className="text-[#DC2626] font-semibold">No Cumplen: {item.noCumple}</p>
                              <p className="text-slate-500 font-medium">Total: {item.total}</p>
                              <p className="text-[#2563EB] font-bold pt-1 border-t border-slate-100">
                                Cumplimiento: {item.porcentaje}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8, fontSize: '11px' }} />
                    <Bar dataKey="cumple" name="Cumple" fill="#16A34A" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="cumple" position="top" fill="#15803D" fontSize={9} fontWeight={600} formatter={(v: number) => v > 0 ? v : ''} />
                      {weeklyData.map((entry, index) => (
                        <Cell
                          key={`w-cumple-${index}`}
                          cursor="pointer"
                          fill="#16A34A"
                          opacity={filterSemana !== 'TODOS' && filterSemana !== entry.semana ? 0.35 : 1}
                          stroke={filterSemana === entry.semana ? '#14532D' : undefined}
                          strokeWidth={filterSemana === entry.semana ? 2 : 0}
                          onClick={() => handleToggleFilter('semana', entry.semana)}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="noCumple" name="No Cumple" fill="#DC2626" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="noCumple" position="top" fill="#B91C1C" fontSize={9} fontWeight={600} formatter={(v: number) => v > 0 ? v : ''} />
                      {weeklyData.map((entry, index) => (
                        <Cell
                          key={`w-nocumple-${index}`}
                          cursor="pointer"
                          fill="#DC2626"
                          opacity={filterSemana !== 'TODOS' && filterSemana !== entry.semana ? 0.35 : 1}
                          stroke={filterSemana === entry.semana ? '#7F1D1D' : undefined}
                          strokeWidth={filterSemana === entry.semana ? 2 : 0}
                          onClick={() => handleToggleFilter('semana', entry.semana)}
                        />
                      ))}
                    </Bar>
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="porcentaje" 
                      name="% Cumplimiento" 
                      stroke="#2563EB" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: '#2563EB' }}
                    >
                      <LabelList dataKey="porcentaje" position="top" offset={8} fill="#1D4ED8" fontSize={9} fontWeight={700} formatter={(v: number) => `${v}%`} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 3.4 & 3.5 REFERENCIA POR CD Y TIPO DE MANTENIMIENTO               */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* REFERENCIA POR CD */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    Comparativa por Centro (CD)
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Volumen y tasa de cumplimiento por centro operativo
                  </p>
                </div>
                <Truck className="w-5 h-5 text-[#2563EB]" />
              </div>

              {/* Tarjetas resumen por CD */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {cdData.map(c => {
                  const isActive = filterCd === c.cd;
                  return (
                    <div 
                      key={c.cd} 
                      onClick={() => handleToggleFilter('cd', c.cd)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-50/80 border-[#2563EB] shadow-xs ring-2 ring-[#2563EB]/30' 
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5">
                          {c.cd}
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-[#2563EB] text-white">Activo</span>
                          )}
                        </span>
                        <span className={`text-xs font-black ${
                          c.porcentaje >= 80 ? 'text-[#16A34A]' : 'text-[#F59E0B]'
                        }`}>
                          {c.porcentaje}%
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-extrabold text-[#1E293B]">{c.total}</span>
                        <span className="text-[11px] text-[#64748B]">
                          ({c.cumple} cumplen / {c.noCumple} no)
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${c.porcentaje >= 80 ? 'bg-[#16A34A]' : 'bg-[#F59E0B]'}`}
                          style={{ width: `${c.porcentaje}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={cdData} 
                    margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        const payload = e.activePayload[0].payload;
                        if (payload?.cd) handleToggleFilter('cd', payload.cd);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="cd" 
                      tick={{ fill: '#1E293B', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1">
                              <p className="font-bold text-[#1E293B] border-b border-slate-100 pb-1">{label}</p>
                              <p className="text-[#16A34A] font-semibold">Cumplen: {item.cumple}</p>
                              <p className="text-[#DC2626] font-semibold">No Cumplen: {item.noCumple}</p>
                              <p className="text-slate-500 font-medium">Total: {item.total}</p>
                              <p className="text-[#2563EB] font-bold pt-1 border-t border-slate-100">
                                Cumplimiento: {item.porcentaje}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8, fontSize: '11px' }} />
                    <Bar dataKey="cumple" name="Cumple" fill="#16A34A" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="cumple" position="top" fill="#15803D" fontSize={11} fontWeight={700} formatter={(v: number) => v > 0 ? v : ''} />
                      {cdData.map((entry, index) => (
                        <Cell
                          key={`cd-cumple-${index}`}
                          cursor="pointer"
                          fill="#16A34A"
                          opacity={filterCd !== 'TODOS' && filterCd !== entry.cd ? 0.35 : 1}
                          stroke={filterCd === entry.cd ? '#14532D' : undefined}
                          strokeWidth={filterCd === entry.cd ? 2 : 0}
                          onClick={() => handleToggleFilter('cd', entry.cd)}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="noCumple" name="No Cumple" fill="#DC2626" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="noCumple" position="top" fill="#B91C1C" fontSize={11} fontWeight={700} formatter={(v: number) => v > 0 ? v : ''} />
                      {cdData.map((entry, index) => (
                        <Cell
                          key={`cd-nocumple-${index}`}
                          cursor="pointer"
                          fill="#DC2626"
                          opacity={filterCd !== 'TODOS' && filterCd !== entry.cd ? 0.35 : 1}
                          stroke={filterCd === entry.cd ? '#7F1D1D' : undefined}
                          strokeWidth={filterCd === entry.cd ? 2 : 0}
                          onClick={() => handleToggleFilter('cd', entry.cd)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICA POR TIPO DE MANTENIMIENTO (HORAS) */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    Por Tipo de Mantenimiento
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Distribución por horómetros programados (250, 500, 750, 1000, 2000 hr)
                  </p>
                </div>
                <Layers className="w-5 h-5 text-[#2563EB]" />
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={typeData} 
                    margin={{ top: 15, right: 10, left: -20, bottom: 20 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        const payload = e.activePayload[0].payload;
                        if (payload?.tipo) handleToggleFilter('tipo', payload.tipo);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="tipo" 
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1">
                              <p className="font-bold text-[#1E293B] border-b border-slate-100 pb-1">Tipo: {label}</p>
                              <p className="text-[#16A34A] font-semibold">Cumplen: {item.cumple}</p>
                              <p className="text-[#DC2626] font-semibold">No Cumplen: {item.noCumple}</p>
                              <p className="text-slate-500 font-medium">Total: {item.total}</p>
                              <p className="text-[#2563EB] font-bold pt-1 border-t border-slate-100">
                                Cumplimiento: {item.porcentaje}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8, fontSize: '11px' }} />
                    <Bar dataKey="cumple" name="Cumple" fill="#16A34A" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="cumple" position="top" fill="#15803D" fontSize={11} fontWeight={700} formatter={(v: number) => v > 0 ? v : ''} />
                      {typeData.map((entry, index) => (
                        <Cell
                          key={`t-cumple-${index}`}
                          cursor="pointer"
                          fill="#16A34A"
                          opacity={filterTipo !== 'TODOS' && filterTipo !== entry.tipo ? 0.35 : 1}
                          stroke={filterTipo === entry.tipo ? '#14532D' : undefined}
                          strokeWidth={filterTipo === entry.tipo ? 2 : 0}
                          onClick={() => handleToggleFilter('tipo', entry.tipo)}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="noCumple" name="No Cumple" fill="#DC2626" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="noCumple" position="top" fill="#B91C1C" fontSize={11} fontWeight={700} formatter={(v: number) => v > 0 ? v : ''} />
                      {typeData.map((entry, index) => (
                        <Cell
                          key={`t-nocumple-${index}`}
                          cursor="pointer"
                          fill="#DC2626"
                          opacity={filterTipo !== 'TODOS' && filterTipo !== entry.tipo ? 0.35 : 1}
                          stroke={filterTipo === entry.tipo ? '#7F1D1D' : undefined}
                          strokeWidth={filterTipo === entry.tipo ? 2 : 0}
                          onClick={() => handleToggleFilter('tipo', entry.tipo)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 3.6 & 3.7 FRECUENCIA POR MÁQUINA Y CONFIABILIDAD MENSUAL          */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* FRECUENCIA DE INGRESO POR MÁQUINA (BARRAS VERTICALES) */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    Frecuencia por Máquina
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Cantidad de preventivos ejecutados por equipo (columnas verticales)
                  </p>
                </div>

                {/* Selector de límite de máquinas */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs">
                  {[10, 15, 20].map(lim => (
                    <button
                      key={lim}
                      onClick={() => setTopMaquinasLimit(lim)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        topMaquinasLimit === lim 
                          ? 'bg-white text-[#2563EB] shadow-xs' 
                          : 'text-[#64748B] hover:text-[#1E293B]'
                      }`}
                    >
                      Top {lim}
                    </button>
                  ))}
                  <button
                    onClick={() => setTopMaquinasLimit('todas')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      topMaquinasLimit === 'todas' 
                        ? 'bg-white text-[#2563EB] shadow-xs' 
                        : 'text-[#64748B] hover:text-[#1E293B]'
                    }`}
                  >
                    Todas ({machinesData.length})
                  </button>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={displayedMachines} 
                    margin={{ top: 20, right: 10, left: -20, bottom: 40 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        const payload = e.activePayload[0].payload;
                        if (payload?.maquina) handleToggleFilter('maquina', payload.maquina);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="maquina" 
                      tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          const pct = item.count > 0 ? Math.round((item.cumple / item.count) * 100) : 0;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1">
                              <p className="font-bold text-[#1E293B] border-b border-slate-100 pb-1">Máquina: {label}</p>
                              <p className="text-slate-600">Centro: {item.cd}</p>
                              <p className="text-slate-800 font-bold">Preventivos totales: {item.count}</p>
                              <p className="text-[#16A34A] font-semibold">Cumplidos (100%): {item.cumple}</p>
                              <p className="text-[#DC2626] font-semibold">No Cumplidos (0%): {item.noCumple}</p>
                              <p className="text-[#2563EB] font-bold pt-1 border-t border-slate-100">
                                Efectividad: {pct}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" name="Preventivos" fill="#2563EB" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="count" position="top" fill="#1D4ED8" fontSize={10} fontWeight={700} />
                      {displayedMachines.map((entry, index) => (
                        <Cell
                          key={`maq-col-${index}`}
                          cursor="pointer"
                          fill={filterMaquina === entry.maquina ? '#1D4ED8' : '#3B82F6'}
                          opacity={filterMaquina !== 'TODOS' && filterMaquina !== entry.maquina ? 0.35 : 1}
                          stroke={filterMaquina === entry.maquina ? '#1E3A8A' : undefined}
                          strokeWidth={filterMaquina === entry.maquina ? 2 : 0}
                          onClick={() => handleToggleFilter('maquina', entry.maquina)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3.7 GRÁFICA DE CONFIABILIDAD DEL PREVENTIVO (COLUMNA O) */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    Confiabilidad del Preventivo (Col. O)
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Porcentaje de confiabilidad promedio mes a mes (enero a diciembre)
                  </p>
                </div>
                <Gauge className="w-5 h-5 text-[#2563EB]" />
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reliabilityMonthlyData}
                    margin={{ top: 20, right: 20, left: -15, bottom: 40 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        const payload = e.activePayload[0].payload;
                        if (payload?.mes) handleToggleFilter('mes', payload.mes);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="mes" 
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis 
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1">
                              <p className="font-bold text-[#1E293B] border-b border-slate-100 pb-1">{label}</p>
                              <p className="text-slate-600">Total registros: {item.total}</p>
                              <p className="text-[#2563EB] font-bold pt-1">
                                Confiabilidad Promedio: {item.confiabilidad}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="confiabilidad" name="Confiabilidad Promedio" fill="#0284C7" radius={[4, 4, 0, 0]}>
                      <LabelList 
                        dataKey="confiabilidad" 
                        position="top" 
                        fill="#0369A1" 
                        fontSize={10} 
                        fontWeight={700} 
                        formatter={(v: number) => v > 0 ? `${v}%` : ''} 
                      />
                      {reliabilityMonthlyData.map((entry, index) => (
                        <Cell
                          key={`rel-m-${index}`}
                          cursor="pointer"
                          fill={entry.confiabilidad >= 90 ? '#0284C7' : (entry.confiabilidad >= 75 ? '#0EA5E9' : '#38BDF8')}
                          opacity={filterMes !== 'TODOS' && normalizaMes(filterMes) !== normalizaMes(entry.mes) ? 0.35 : 1}
                          stroke={normalizaMes(filterMes) === normalizaMes(entry.mes) ? '#0C4A6E' : undefined}
                          strokeWidth={normalizaMes(filterMes) === normalizaMes(entry.mes) ? 2 : 0}
                          onClick={() => handleToggleFilter('mes', entry.mes)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 5. TABLA DE DETALLE CON EVIDENCIAS                                */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">
                  Registro Detallado de Preventivos
                </h3>
                <p className="text-xs text-[#64748B]">
                  Registros ejecutados de la hoja PREVENTIVOS (página {currentPage} de {totalPages})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#64748B]">
                  Mostrando {paginatedData.length} de {filteredData.length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Máquina</th>
                    <th className="py-3.5 px-3">Centro</th>
                    <th className="py-3.5 px-3">Tipo MTTO</th>
                    <th className="py-3.5 px-3">Mes / Sem</th>
                    <th className="py-3.5 px-3">Fecha</th>
                    <th className="py-3.5 px-3 text-right">Horómetro Prog.</th>
                    <th className="py-3.5 px-3 text-right">Horómetro Reg.</th>
                    <th className="py-3.5 px-3 text-center">Cumplimiento (Col. J)</th>
                    <th className="py-3.5 px-3 text-right">Desviación</th>
                    <th className="py-3.5 px-3 text-center">Confiabilidad (Col. O)</th>
                    <th className="py-3.5 px-4">Observación</th>
                    <th className="py-3.5 px-4 text-center">Evidencia (Col. Q)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#1E293B]">
                  {paginatedData.map((item) => {
                    const hasEvidencia = item.evidencia && item.evidencia.trim() !== '' && item.evidencia !== '—';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* No MÁQUINA */}
                        <td className="py-3 px-4 font-bold text-[#1E293B]">
                          <span 
                            onClick={() => handleToggleFilter('maquina', item.maquina)}
                            className="cursor-pointer hover:text-[#2563EB] hover:underline"
                            title="Filtrar por esta máquina"
                          >
                            {item.maquina || '—'}
                          </span>
                        </td>

                        {/* CD */}
                        <td className="py-3 px-3 text-[#64748B]">
                          {item.cd || '—'}
                        </td>

                        {/* Tipo de Mantenimiento */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {item.tipo || '—'}
                          </span>
                        </td>

                        {/* Mes / Semana */}
                        <td className="py-3 px-3 text-[#64748B]">
                          <div className="font-medium text-[#1E293B]">{item.mes || '—'}</div>
                          <div className="text-[10px] text-slate-400">{item.semana || '—'}</div>
                        </td>

                        {/* Fecha */}
                        <td className="py-3 px-3 font-medium whitespace-nowrap text-[#64748B]">
                          {formatFechaCorta(item.fecha, item.fechaIso)}
                        </td>

                        {/* Próximo Horómetro */}
                        <td className="py-3 px-3 text-right text-[#64748B] font-mono text-[11px]">
                          {item.proxHr || '—'}
                        </td>

                        {/* Horómetro Registrado */}
                        <td className="py-3 px-3 text-right font-bold text-[#1E293B] font-mono text-[11px]">
                          {item.horometro || '—'}
                        </td>

                        {/* Validación Cumplimiento */}
                        <td className="py-3 px-3 text-center">
                          {item.cumplimiento === '100%' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              100% CUMPLE
                            </span>
                          ) : item.cumplimiento === '0%' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-[#DC2626] border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              0% NO CUMPLE
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">—</span>
                          )}
                        </td>

                        {/* Desviación */}
                        <td className="py-3 px-3 text-right text-[#64748B] font-mono text-[11px]">
                          {item.desviacion !== '—' && item.desviacion ? `${item.desviacion} hr` : '—'}
                        </td>

                        {/* Confiabilidad (Columna O) */}
                        <td className="py-3 px-3 text-center font-bold text-[#0284C7] font-mono text-[11px]">
                          {item.confiabilidad ? (
                            String(item.confiabilidad).includes('%') ? item.confiabilidad : `${item.confiabilidad}%`
                          ) : '—'}
                        </td>

                        {/* Observación */}
                        <td className="py-3 px-4 text-[#64748B] max-w-xs truncate" title={item.observacion}>
                          {item.observacion || '—'}
                        </td>

                        {/* Evidencia (Columna Q) */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {hasEvidencia ? (
                            <button
                              onClick={() => setPreviewRecord(item)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-[#15803D] hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                              title="Ver evidencia fotográfica"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Ver foto</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setUploadRecord(item);
                                setSelectedImageBase64('');
                                setUploadError(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-[#2563EB] hover:text-white border border-slate-200 transition-colors cursor-pointer"
                              title="Registrar evidencia fotográfica"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Registrar</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
                <span>
                  Página {currentPage} de {totalPages}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = currentPage;
                    if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;

                    if (pageNum < 1 || pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          currentPage === pageNum 
                            ? 'bg-[#2563EB] text-white' 
                            : 'border border-slate-200 hover:bg-slate-50 text-[#1E293B]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL PARA CARGAR EVIDENCIA (3.b.1)                                   */}
      {/* --------------------------------------------------------------------- */}
      {uploadRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              onClick={() => {
                if (!isUploading) {
                  setUploadRecord(null);
                  setSelectedImageBase64('');
                  setUploadError(null);
                }
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2563EB] uppercase tracking-wider">
                Columna EVIDENCIAS (Q)
              </span>
              <h3 className="text-base font-bold text-[#1E293B] mt-1">
                Registrar Evidencia de Preventivo
              </h3>
              <p className="text-xs text-[#64748B]">
                Máquina: <strong>{uploadRecord.maquina}</strong> — Fecha: <strong>{formatFechaCorta(uploadRecord.fecha, uploadRecord.fechaIso)}</strong> — Tipo: <strong>{uploadRecord.tipo}</strong>
              </p>
            </div>

            {/* Zona de Drop & Carga */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
                isDragging 
                  ? 'border-[#2563EB] bg-blue-50/50' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              {selectedImageBase64 ? (
                <div className="space-y-3">
                  <div className="max-h-56 overflow-hidden rounded-xl border border-slate-200 mx-auto inline-block shadow-xs">
                    <img 
                      src={selectedImageBase64} 
                      alt="Vista previa" 
                      className="max-h-56 w-auto object-contain mx-auto"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedImageBase64('')}
                      disabled={isUploading}
                      className="px-3 py-1 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Cambiar foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1E293B]">
                      Arrastra y suelta aquí tu foto, o pégala con Ctrl+V
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      JPG, PNG, WebP (se optimizará automáticamente a ~1600px)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {/* Botón Galería */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-[#1E293B] shadow-xs cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Elegir archivo</span>
                    </button>

                    {/* Botón Cámara */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-[#1E293B] shadow-xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Tomar con cámara</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Inputs ocultos */}
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <input 
                ref={cameraInputRef} 
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </div>

            {uploadError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setUploadRecord(null);
                  setSelectedImageBase64('');
                  setUploadError(null);
                }}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveEvidence}
                disabled={!selectedImageBase64 || isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando en Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Guardar Evidencia</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL VISTA PREVIA DE EVIDENCIA                                       */}
      {/* --------------------------------------------------------------------- */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 relative">
            <button
              onClick={() => setPreviewRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#16A34A] uppercase tracking-wider">
                Evidencia Fotográfica
              </span>
              <h3 className="text-base font-bold text-[#1E293B] mt-1">
                Máquina {previewRecord.maquina}
              </h3>
              <p className="text-xs text-[#64748B]">
                Fecha: {formatFechaCorta(previewRecord.fecha, previewRecord.fechaIso)} • Tipo: {previewRecord.tipo} • CD: {previewRecord.cd}
              </p>
            </div>

            <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950/5 flex items-center justify-center p-2">
              <img 
                src={previewRecord.evidencia} 
                alt={`Evidencia ${previewRecord.maquina}`} 
                className="max-h-[60vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between mt-4 text-xs text-[#64748B]">
              <span>Horómetro registrado: <strong>{previewRecord.horometro}</strong></span>

              {previewRecord.evidencia?.startsWith('http') && (
                <a
                  href={previewRecord.evidencia}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#2563EB] hover:text-blue-800 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir enlace original</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
