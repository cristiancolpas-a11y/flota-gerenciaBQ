import React, { useMemo, useState } from 'react';
import { Preventive } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Line, ComposedChart, Legend, Cell, LabelList
} from 'recharts';
import { 
  CheckCircle2, XCircle, Search, Filter, RotateCcw, 
  Truck, Calendar, Hash, Wrench, ShieldCheck, 
  Building2, Layers, ChevronLeft, ChevronRight,
  TrendingUp, ArrowUpDown, FileSpreadsheet, ExternalLink,
  SlidersHorizontal, Check, X, Info
} from 'lucide-react';
import { getPreventivesDocId, setPreventivesDocId } from '../services/sheetService';

interface Props {
  data: Preventive[];
  onUpdate?: (plate: string, date: string, evidence: string) => void;
}

const MONTH_NAMES_ORDER = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ORDEN_MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const normalizaMes = (s: string) => (s || '').toString().trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Formato corto latino dd/mm/yyyy para evitar desfase de zona horaria o valores erróneos */
const formatFechaCorta = (fechaVal?: string, isoVal?: string): string => {
  const val = isoVal || fechaVal;
  if (!val || val === '—' || val === 'No disponible' || val === 'Invalid Date') return '—';
  // Si ya es formato dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
  // Si es ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const parts = val.slice(0, 10).split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(val + 'T12:00:00'); // mediodía evita desfase de zona horaria
  if (isNaN(d.getTime())) return val || '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

export const PreventiveMaintenanceModule: React.FC<Props> = ({ data, onUpdate }) => {
  // ---------------------------------------------------------------------------
  // ESTADOS DE FILTRO (Multifiltro)
  // ---------------------------------------------------------------------------
  const [filterCd, setFilterCd] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterSemana, setFilterSemana] = useState<string>('TODOS');
  const [filterRutina, setFilterRutina] = useState<string>('TODOS');
  const [filterMarca, setFilterMarca] = useState<string>('TODOS');
  const [filterContratista, setFilterContratista] = useState<string>('TODOS');
  const [filterCumplimiento, setFilterCumplimiento] = useState<string>('TODOS');
  const [searchPlaca, setSearchPlaca] = useState<string>('');

  // Vista de top placas
  const [topPlacasLimit, setTopPlacasLimit] = useState<number>(15);

  // Paginación de la tabla de detalle
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;


  // ---------------------------------------------------------------------------
  // EXTRACCIÓN DE VALORES REALES ÚNICOS PARA SELECTORES
  // ---------------------------------------------------------------------------
  const availableOptions = useMemo(() => {
    const cds = new Set<string>();
    const meses = new Set<string>();
    const semanasMap = new Map<string, number>(); // semana string -> orden numérico
    const rutinas = new Set<string>();
    const marcas = new Set<string>();
    const contratistas = new Set<string>();

    data.forEach(item => {
      if (item.cd && item.cd !== '—') cds.add(item.cd);
      if (item.mes && item.mes !== 'Sin Mes' && item.mes !== '—') meses.add(item.mes);
      if (item.semanaEjecucion && item.semanaEjecucion !== '—') {
        semanasMap.set(item.semanaEjecucion, item.semanaEjecucionNumero || 0);
      }
      if (item.rutina && item.rutina !== '—') rutinas.add(item.rutina);
      if (item.linea && item.linea !== '—') {
        const cleanMarca = item.linea.replace(/\s+/g, ' ').trim().toUpperCase();
        if (cleanMarca) marcas.add(cleanMarca);
      }
      if (item.contratista && item.contratista !== '—') contratistas.add(item.contratista);
    });

    // Orden cronológico de meses (enero a diciembre)
    const sortedMeses = Array.from(meses).sort((a, b) => {
      const idxA = ORDEN_MESES.indexOf(normalizaMes(a));
      const idxB = ORDEN_MESES.indexOf(normalizaMes(b));
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    // Orden numérico de semanas
    const sortedSemanas = Array.from(semanasMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(entry => entry[0]);

    // Orden alfabético
    const sortedRutinas = Array.from(rutinas).sort();
    const sortedMarcas = Array.from(marcas).sort();
    const sortedContratistas = Array.from(contratistas).sort();
    const sortedCds = Array.from(cds).sort();

    return {
      cds: sortedCds,
      meses: sortedMeses,
      semanas: sortedSemanas,
      rutinas: sortedRutinas,
      marcas: sortedMarcas,
      contratistas: sortedContratistas
    };
  }, [data]);

  // Indicador de filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCd !== 'TODOS') count++;
    if (filterMes !== 'TODOS') count++;
    if (filterSemana !== 'TODOS') count++;
    if (filterRutina !== 'TODOS') count++;
    if (filterMarca !== 'TODOS') count++;
    if (filterContratista !== 'TODOS') count++;
    if (filterCumplimiento !== 'TODOS') count++;
    if (searchPlaca.trim() !== '') count++;
    return count;
  }, [filterCd, filterMes, filterSemana, filterRutina, filterMarca, filterContratista, filterCumplimiento, searchPlaca]);

  const handleResetFilters = () => {
    setFilterCd('TODOS');
    setFilterMes('TODOS');
    setFilterSemana('TODOS');
    setFilterRutina('TODOS');
    setFilterMarca('TODOS');
    setFilterContratista('TODOS');
    setFilterCumplimiento('TODOS');
    setSearchPlaca('');
    setCurrentPage(1);
  };

  // Helper para filtros interactivos cruzados al hacer clic en gráficas
  const handleToggleFilter = (type: 'cd' | 'mes' | 'semana' | 'rutina' | 'marca' | 'placa', value: string) => {
    setCurrentPage(1);
    switch (type) {
      case 'cd':
        setFilterCd(prev => prev === value ? 'TODOS' : value);
        break;
      case 'mes':
        setFilterMes(prev => prev === value ? 'TODOS' : value);
        break;
      case 'semana':
        setFilterSemana(prev => prev === value ? 'TODOS' : value);
        break;
      case 'rutina':
        setFilterRutina(prev => prev === value ? 'TODOS' : value);
        break;
      case 'marca':
        setFilterMarca(prev => prev === value ? 'TODOS' : value);
        break;
      case 'placa':
        setSearchPlaca(prev => prev.toUpperCase() === value.toUpperCase() ? '' : value);
        break;
    }
  };

  // ---------------------------------------------------------------------------
  // APLICACIÓN DEL MULTIFILTRO
  // ---------------------------------------------------------------------------
  const filteredData = useMemo(() => {
    const cleanSearch = searchPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    return data.filter(item => {
      // Búsqueda por placa
      if (cleanSearch && !item.placa.toUpperCase().includes(cleanSearch)) {
        return false;
      }
      // Filtro CD
      if (filterCd !== 'TODOS' && item.cd !== filterCd) {
        return false;
      }
      // Filtro Mes
      if (filterMes !== 'TODOS' && item.mes !== filterMes) {
        return false;
      }
      // Filtro Semana de ejecución
      if (filterSemana !== 'TODOS' && item.semanaEjecucion !== filterSemana) {
        return false;
      }
      // Filtro Rutina
      if (filterRutina !== 'TODOS' && item.rutina !== filterRutina) {
        return false;
      }
      // Filtro Marca / Línea (normalizada)
      if (filterMarca !== 'TODOS') {
        const itemMarca = (item.linea || '').replace(/\s+/g, ' ').trim().toUpperCase();
        if (itemMarca !== filterMarca) {
          return false;
        }
      }
      // Filtro Contratista
      if (filterContratista !== 'TODOS' && item.contratista !== filterContratista) {
        return false;
      }
      // Filtro Cumplimiento
      if (filterCumplimiento !== 'TODOS' && item.cumplimiento !== filterCumplimiento) {
        return false;
      }
      return true;
    });
  }, [data, filterCd, filterMes, filterSemana, filterRutina, filterMarca, filterContratista, filterCumplimiento, searchPlaca]);

  // ---------------------------------------------------------------------------
  // CÁLCULOS KPI (SOLO COLUMNA CUMPLIMIENTO CUMPLE vs NO CUMPLE)
  // ---------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const total = filteredData.length;
    let cumple = 0;
    let noCumple = 0;

    filteredData.forEach(item => {
      if (item.cumplimiento === 'CUMPLE') cumple++;
      else if (item.cumplimiento === 'NO CUMPLE') noCumple++;
    });

    const totalClasificado = cumple + noCumple;
    const porcentaje = totalClasificado > 0 ? (cumple / totalClasificado) * 100 : 0;

    return {
      total,
      cumple,
      noCumple,
      porcentaje,
      sinClasificar: total - totalClasificado
    };
  }, [filteredData]);

  // ---------------------------------------------------------------------------
  // 3.2 GRÁFICA MENSUAL (Agrupación por columna MES Col V en orden cronológico)
  // ---------------------------------------------------------------------------
  const monthlyData = useMemo(() => {
    const map = new Map<string, { clave: string; mes: string; mesNumero: number; cumple: number; noCumple: number; total: number }>();

    filteredData.forEach(item => {
      const rawMes = item.mes || '';
      const norm = normalizaMes(rawMes);
      const idxMes = ORDEN_MESES.indexOf(norm);
      const mesNum = idxMes !== -1 ? idxMes + 1 : (item.mesNumero || 99);
      const clave = String(mesNum).padStart(2, '0');
      // Nombre legible con mayúscula inicial
      const mesLabel = idxMes !== -1 
        ? (norm.charAt(0).toUpperCase() + norm.slice(1)) 
        : (item.mes && item.mes !== 'Sin Mes' && item.mes !== '—' ? item.mes : '—');

      if (!map.has(clave)) {
        map.set(clave, { clave, mes: mesLabel, mesNumero: mesNum, cumple: 0, noCumple: 0, total: 0 });
      }
      const entry = map.get(clave)!;
      entry.total++;
      if (item.cumplimiento === 'CUMPLE') entry.cumple++;
      else if (item.cumplimiento === 'NO CUMPLE') entry.noCumple++;
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
  // 3.3 GRÁFICA SEMANAL (Por Semana de Ejecución, orden numérico)
  // ---------------------------------------------------------------------------
  const weeklyData = useMemo(() => {
    const map = new Map<string, { semana: string; num: number; cumple: number; noCumple: number; total: number }>();

    filteredData.forEach(item => {
      const semLabel = item.semanaEjecucion && item.semanaEjecucion !== '—' ? item.semanaEjecucion : '—';
      const semNum = item.semanaEjecucionNumero || parseInt(semLabel.replace(/\D/g, ''), 10) || 0;

      if (!map.has(semLabel)) {
        map.set(semLabel, { semana: semLabel, num: semNum, cumple: 0, noCumple: 0, total: 0 });
      }
      const entry = map.get(semLabel)!;
      entry.total++;
      if (item.cumplimiento === 'CUMPLE') entry.cumple++;
      else if (item.cumplimiento === 'NO CUMPLE') entry.noCumple++;
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
  // 3.4 REFERENCIA POR CD (Galapa vs La Arenosa)
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
      if (item.cumplimiento === 'CUMPLE') entry.cumple++;
      else if (item.cumplimiento === 'NO CUMPLE') entry.noCumple++;
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
  // 3.5 GRÁFICA POR RUTINAS (Rutina 1, 2, 3, 4, Sin Dato)
  // ---------------------------------------------------------------------------
  const routineData = useMemo(() => {
    const map = new Map<string, { rutina: string; cumple: number; noCumple: number; total: number }>();

    filteredData.forEach(item => {
      const rutName = item.rutina || 'Sin Dato';
      if (!map.has(rutName)) {
        map.set(rutName, { rutina: rutName, cumple: 0, noCumple: 0, total: 0 });
      }
      const entry = map.get(rutName)!;
      entry.total++;
      if (item.cumplimiento === 'CUMPLE') entry.cumple++;
      else if (item.cumplimiento === 'NO CUMPLE') entry.noCumple++;
    });

    return Array.from(map.values())
      .sort((a, b) => a.rutina.localeCompare(b.rutina))
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
  // 3.6 GRÁFICA POR MARCA / LÍNEA (Normalizada, ordenada de mayor a menor)
  // ---------------------------------------------------------------------------
  const brandData = useMemo(() => {
    const map = new Map<string, { marca: string; cumple: number; noCumple: number; total: number }>();

    filteredData.forEach(item => {
      const raw = (item.linea || '').replace(/\s+/g, ' ').trim();
      const normMarca = raw && raw !== '—' ? raw.toUpperCase() : 'Sin Marca / Línea';

      if (!map.has(normMarca)) {
        map.set(normMarca, { marca: normMarca, cumple: 0, noCumple: 0, total: 0 });
      }
      const entry = map.get(normMarca)!;
      entry.total++;
      if (item.cumplimiento === 'CUMPLE') entry.cumple++;
      else if (item.cumplimiento === 'NO CUMPLE') entry.noCumple++;
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
  // 3.7 FRECUENCIA DE INGRESO POR PLACA (Columnas VERTICALES ordenadas)
  // ---------------------------------------------------------------------------
  const platesData = useMemo(() => {
    const map = new Map<string, { placa: string; count: number; cd: string; cumple: number; noCumple: number }>();

    filteredData.forEach(item => {
      const p = item.placa;
      if (!p) return;
      if (!map.has(p)) {
        map.set(p, { placa: p, count: 0, cd: item.cd || '—', cumple: 0, noCumple: 0 });
      }
      const entry = map.get(p)!;
      entry.count++;
      if (item.cumplimiento === 'CUMPLE') entry.cumple++;
      else if (item.cumplimiento === 'NO CUMPLE') entry.noCumple++;
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return sorted;
  }, [filteredData]);

  const displayedPlatesData = useMemo(() => {
    if (topPlacasLimit === 0) return platesData;
    return platesData.slice(0, topPlacasLimit);
  }, [platesData, topPlacasLimit]);

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


  // Descarga CSV de los datos filtrados actuales
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = [
      'PLACA', 'CD', 'CONTRATISTA', 'MARCA_LINEA', 'RUTINA', 
      'FECHA_EJECUCION', 'SEMANA_EJECUCION', 'MES', 
      'KM_EJECUCION', 'DIFERENCIA', 'CUMPLIMIENTO'
    ];
    const rows = filteredData.map(p => [
      p.placa, p.cd, p.contratista, p.linea, p.rutina,
      formatFechaCorta(p.fechaEjecucion, p.fechaEjecucionIso), p.semanaEjecucion, p.mes,
      p.kmEjecucion, p.diferencia, p.cumplimiento
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mantenimientos_Preventivos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] p-4 md:p-8 space-y-6">

      {/* --------------------------------------------------------------------- */}
      {/* HEADER PRINCIPAL                                                      */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1E293B] tracking-tight">
            Mantenimientos Preventivos
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          <button
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E2E8F0] text-[#1E293B] hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title="Exportar registros filtrados a CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 4. BARRA DE MULTIFILTRO                                              */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-bold text-[#1E293B]">
              Filtros de Análisis
            </h2>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-[#2563EB]">
                {activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B]">
              Mostrando <strong className="text-[#1E293B]">{filteredData.length}</strong> de <strong className="text-[#1E293B]">{data.length}</strong> preventivos ejecutados
            </span>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#DC2626] bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Rejilla de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">

          {/* Búsqueda por placa */}
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Placa
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPlaca}
                onChange={(e) => {
                  setSearchPlaca(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar placa..."
                className="w-full pl-8 pr-2.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors uppercase"
              />
            </div>
          </div>

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
              Mes Ejecución
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
              Semana Ejec.
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

          {/* Filtro Rutina */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Rutina
            </label>
            <select
              value={filterRutina}
              onChange={(e) => {
                setFilterRutina(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
            >
              <option value="TODOS">Todas las Rutinas</option>
              {availableOptions.rutinas.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Filtro Marca / Línea */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Marca / Línea
            </label>
            <select
              value={filterMarca}
              onChange={(e) => {
                setFilterMarca(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors truncate"
            >
              <option value="TODOS">Todas las Marcas</option>
              {availableOptions.marcas.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Filtro Contratista */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              Contratista
            </label>
            <select
              value={filterContratista}
              onChange={(e) => {
                setFilterContratista(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors truncate"
            >
              <option value="TODOS">Todos los Contratistas</option>
              {availableOptions.contratistas.map(c => (
                <option key={c} value={c}>{c}</option>
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
              <option value="TODOS">Todos</option>
              <option value="CUMPLE">CUMPLE</option>
              <option value="NO CUMPLE">NO CUMPLE</option>
            </select>
          </div>

        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3.1 TARJETAS KPI (ARRIBA)                                             */}
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
              ejecuciones
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
              desviaciones
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            {kpis.total > 0 ? Math.round((kpis.noCumple / kpis.total) * 100) : 0}% con desvío en rango/criterio
          </p>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#DC2626] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${kpis.total > 0 ? (kpis.noCumple / kpis.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* 3. % DE CUMPLIMIENTO */}
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

        {/* 4. TOTAL EJECUTADOS */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
              Total Preventivos Ejecutados
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#1E293B]">
              {kpis.total}
            </span>
            <span className="text-xs text-[#64748B]">
              registros
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            Con fecha de ejecución registrada en la hoja
          </p>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#2563EB] h-1.5 rounded-full"
              style={{ width: '100%' }}
            />
          </div>
        </div>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ESTADO VACÍO (Si tras filtros no hay registros)                       */}
      {/* --------------------------------------------------------------------- */}
      {filteredData.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-sm max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-[#64748B] flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#1E293B] mb-1">
            No hay mantenimientos preventivos para los filtros seleccionados
          </h3>
          <p className="text-xs text-[#64748B] mb-6">
            Intenta seleccionar otro centro de distribución, mes, rutina o limpiar la búsqueda por placa.
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#1E293B]">
                      Cumplimiento Mensual
                    </h3>
                    {filterMes !== 'TODOS' && (
                      <button
                        onClick={() => handleToggleFilter('mes', filterMes)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                        title="Clic para remover filtro"
                      >
                        <span>Mes: {filterMes}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B]">
                    % de cumplimiento mes a mes (orden cronológico por fecha de ejecución)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-sm bg-[#16A34A]" /> Cumple
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-sm bg-[#DC2626]" /> No Cumple
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-1 bg-[#2563EB]" /> %
                  </span>
                </div>
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
                              <p className="text-[#16A34A] font-semibold">Cumple: {item.cumple}</p>
                              <p className="text-[#DC2626] font-semibold">No Cumple: {item.noCumple}</p>
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
                          opacity={filterMes !== 'TODOS' && filterMes !== entry.mes ? 0.35 : 1}
                          stroke={filterMes === entry.mes ? '#14532D' : undefined}
                          strokeWidth={filterMes === entry.mes ? 2 : 0}
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
                          opacity={filterMes !== 'TODOS' && filterMes !== entry.mes ? 0.35 : 1}
                          stroke={filterMes === entry.mes ? '#7F1D1D' : undefined}
                          strokeWidth={filterMes === entry.mes ? 2 : 0}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#1E293B]">
                      Cumplimiento por Semana de Ejecución
                    </h3>
                    {filterSemana !== 'TODOS' && (
                      <button
                        onClick={() => handleToggleFilter('semana', filterSemana)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                        title="Clic para remover filtro"
                      >
                        <span>{filterSemana}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Distribución de ejecuciones y efectividad por semana
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-sm bg-[#16A34A]" /> Cumple
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-sm bg-[#DC2626]" /> No Cumple
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-1 bg-[#2563EB]" /> %
                  </span>
                </div>
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
                      height={45}
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
                              <p className="text-[#16A34A] font-semibold">Cumple: {item.cumple}</p>
                              <p className="text-[#DC2626] font-semibold">No Cumple: {item.noCumple}</p>
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
          {/* 3.4 & 3.5 REFERENCIA POR CD Y RUTINAS                             */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* REFERENCIA POR CD (Galapa vs La Arenosa) */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    Comparativa por Centro (CD)
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Galapa vs La Arenosa — volumen y tasa de cumplimiento
                  </p>
                </div>
                <Building2 className="w-5 h-5 text-[#2563EB]" />
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

            {/* GRÁFICA POR RUTINAS */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    Distribución por Rutinas
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Rutina 1, 2, 3, 4 y Sin Dato con desglose de cumplimiento
                  </p>
                </div>
                <Layers className="w-5 h-5 text-[#2563EB]" />
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={routineData} 
                    margin={{ top: 15, right: 10, left: -20, bottom: 20 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        const payload = e.activePayload[0].payload;
                        if (payload?.rutina) handleToggleFilter('rutina', payload.rutina);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="rutina" 
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
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
                      <LabelList dataKey="cumple" position="top" fill="#15803D" fontSize={10} fontWeight={600} formatter={(v: number) => v > 0 ? v : ''} />
                      {routineData.map((entry, index) => (
                        <Cell
                          key={`rut-cumple-${index}`}
                          cursor="pointer"
                          fill="#16A34A"
                          opacity={filterRutina !== 'TODOS' && filterRutina !== entry.rutina ? 0.35 : 1}
                          stroke={filterRutina === entry.rutina ? '#14532D' : undefined}
                          strokeWidth={filterRutina === entry.rutina ? 2 : 0}
                          onClick={() => handleToggleFilter('rutina', entry.rutina)}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="noCumple" name="No Cumple" fill="#DC2626" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="noCumple" position="top" fill="#B91C1C" fontSize={10} fontWeight={600} formatter={(v: number) => v > 0 ? v : ''} />
                      {routineData.map((entry, index) => (
                        <Cell
                          key={`rut-nocumple-${index}`}
                          cursor="pointer"
                          fill="#DC2626"
                          opacity={filterRutina !== 'TODOS' && filterRutina !== entry.rutina ? 0.35 : 1}
                          stroke={filterRutina === entry.rutina ? '#7F1D1D' : undefined}
                          strokeWidth={filterRutina === entry.rutina ? 2 : 0}
                          onClick={() => handleToggleFilter('rutina', entry.rutina)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 3.6 GRÁFICA POR MARCA / LÍNEA (NUEVA)                             */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">
                  Cumplimiento por Marca / Línea
                </h3>
                <p className="text-xs text-[#64748B]">
                  Cantidad de preventivos ejecutados y porcentaje de cumplimiento por línea vehicular (ordenado de mayor a menor volumen)
                </p>
              </div>
              <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={brandData} 
                  margin={{ top: 20, right: 25, left: -15, bottom: 50 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      const payload = e.activePayload[0].payload;
                      if (payload?.marca) handleToggleFilter('marca', payload.marca);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="marca" 
                    tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
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
                    <LabelList dataKey="cumple" position="top" fill="#15803D" fontSize={10} fontWeight={700} formatter={(v: number) => v > 0 ? v : ''} />
                    {brandData.map((entry, index) => (
                      <Cell
                        key={`b-cumple-${index}`}
                        cursor="pointer"
                        fill="#16A34A"
                        opacity={filterMarca !== 'TODOS' && filterMarca !== entry.marca ? 0.35 : 1}
                        stroke={filterMarca === entry.marca ? '#14532D' : undefined}
                        strokeWidth={filterMarca === entry.marca ? 2 : 0}
                        onClick={() => handleToggleFilter('marca', entry.marca)}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="noCumple" name="No Cumple" fill="#DC2626" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="noCumple" position="top" fill="#B91C1C" fontSize={10} fontWeight={700} formatter={(v: number) => v > 0 ? v : ''} />
                    {brandData.map((entry, index) => (
                      <Cell
                        key={`b-nocumple-${index}`}
                        cursor="pointer"
                        fill="#DC2626"
                        opacity={filterMarca !== 'TODOS' && filterMarca !== entry.marca ? 0.35 : 1}
                        stroke={filterMarca === entry.marca ? '#7F1D1D' : undefined}
                        strokeWidth={filterMarca === entry.marca ? 2 : 0}
                        onClick={() => handleToggleFilter('marca', entry.marca)}
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

          {/* ----------------------------------------------------------------- */}
          {/* 3.7 FRECUENCIA DE INGRESO POR PLACA (Columnas VERTICALES)         */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">
                  Frecuencia de Ingresos por Placa
                </h3>
                <p className="text-xs text-[#64748B]">
                  Cantidad de preventivos ejecutados / veces que ingresó cada vehículo (barras verticales ordenadas de mayor a menor)
                </p>
              </div>

              {/* Botones de selección de Top */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                <span className="text-[11px] font-semibold text-slate-500 px-2">Ver:</span>
                {[10, 15, 20, 0].map(lim => (
                  <button
                    key={lim}
                    onClick={() => setTopPlacasLimit(lim)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      topPlacasLimit === lim 
                        ? 'bg-white text-[#2563EB] shadow-xs' 
                        : 'text-[#64748B] hover:text-[#1E293B]'
                    }`}
                  >
                    {lim === 0 ? 'Todas' : `Top ${lim}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={displayedPlatesData}
                  margin={{ top: 20, right: 15, left: -15, bottom: 45 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      const payload = e.activePayload[0].payload;
                      if (payload?.placa) handleToggleFilter('placa', payload.placa);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="placa" 
                    tick={{ fill: '#1E293B', fontSize: 10, fontWeight: 700 }}
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
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1">
                            <p className="font-extrabold text-[#1E293B] border-b border-slate-100 pb-1">
                              Placa: {item.placa}
                            </p>
                            <p className="text-slate-600">CD: <strong className="text-slate-800">{item.cd}</strong></p>
                            <p className="text-[#2563EB] font-bold">Total Ingresos: {item.count}</p>
                            <p className="text-[#16A34A] font-semibold">Cumplen: {item.cumple}</p>
                            <p className="text-[#DC2626] font-semibold">No Cumplen: {item.noCumple}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" name="Ingresos" fill="#2563EB" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="count" position="top" fill="#1E293B" fontSize={11} fontWeight={700} offset={6} />
                    {displayedPlatesData.map((entry, index) => {
                      const isActive = searchPlaca.trim() && searchPlaca.toUpperCase() === entry.placa.toUpperCase();
                      const hasSearch = !!searchPlaca.trim();
                      return (
                        <Cell 
                          key={`plate-cell-${index}`} 
                          cursor="pointer"
                          fill={isActive ? '#1D4ED8' : (entry.count >= 4 ? '#2563EB' : (entry.count >= 3 ? '#3B82F6' : '#60A5FA'))}
                          opacity={hasSearch && !isActive ? 0.35 : 1}
                          stroke={isActive ? '#1E293B' : undefined}
                          strokeWidth={isActive ? 2 : 0}
                          onClick={() => handleToggleFilter('placa', entry.placa)}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* TABLA DE DETALLE DE PREVENTIVOS EJECUTADOS (REGISTROS REALES)     */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">
                  Registro Detallado de Preventivos Ejecutados
                </h3>
                <p className="text-xs text-[#64748B]">
                  Mostrando {paginatedData.length} de {filteredData.length} registros según filtros aplicados
                </p>
              </div>

              {/* Controles de paginación resumidos */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-2">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors cursor-pointer"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[#64748B] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Placa</th>
                    <th className="py-3 px-4">CD</th>
                    <th className="py-3 px-4">Contratista</th>
                    <th className="py-3 px-4">Marca / Línea</th>
                    <th className="py-3 px-4">Rutina</th>
                    <th className="py-3 px-4">Fecha Ejecución</th>
                    <th className="py-3 px-4">Semana</th>
                    <th className="py-3 px-4">Km Ejecución</th>
                    <th className="py-3 px-4">Diferencia</th>
                    <th className="py-3 px-4 text-center">Cumplimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1E293B]">
                        {row.placa || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          row.cd === 'Galapa' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : (row.cd === 'La Arenosa' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-700')
                        }`}>
                          {row.cd || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#1E293B] font-medium max-w-[180px] truncate" title={String(row.contratista)}>
                        {row.contratista || '—'}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] max-w-[160px] truncate" title={String(row.linea)}>
                        {row.linea || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">
                          {row.rutina || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#1E293B]">
                        {formatFechaCorta(row.fechaEjecucion, row.fechaEjecucionIso)}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {row.semanaEjecucion || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#1E293B]">
                        {row.kmEjecucion ? Number(row.kmEjecucion).toLocaleString('es-CO') : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.diferencia !== undefined && row.diferencia !== '' ? row.diferencia : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.cumplimiento === 'CUMPLE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-[#16A34A] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            CUMPLE
                          </span>
                        ) : row.cumplimiento === 'NO CUMPLE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-[#DC2626] border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            NO CUMPLE
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginador completo al pie */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
              <span>
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} preventivos
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 font-semibold cursor-pointer"
                >
                  Primero
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Botones de páginas numéricas (máx 5) */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && <span className="px-1 text-slate-400">...</span>}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`w-7 h-7 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            currentPage === p 
                              ? 'bg-[#2563EB] text-white shadow-xs' 
                              : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 font-semibold cursor-pointer"
                >
                  Último
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default PreventiveMaintenanceModule;
