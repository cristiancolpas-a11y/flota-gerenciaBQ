import React, { useMemo, useState } from 'react';
import { ForkliftPreventive } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Line, ComposedChart, Legend, Cell, LabelList
} from 'recharts';
import { 
  CheckCircle2, XCircle, Search, Filter, RotateCcw, 
  Truck, Calendar, Layers, ChevronLeft, ChevronRight,
  TrendingUp, FileSpreadsheet, ExternalLink, Clock, Gauge
} from 'lucide-react';

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

  // Vista de top máquinas
  const [topMaquinasLimit, setTopMaquinasLimit] = useState<number>(15);

  // Paginación de la tabla
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // ---------------------------------------------------------------------------
  // OPCIONES ÚNICAS PARA LOS SELECTORES (Datos reales de la hoja)
  // ---------------------------------------------------------------------------
  const availableOptions = useMemo(() => {
    const cds = new Set<string>();
    const meses = new Set<string>();
    const semanasMap = new Map<string, number>();
    const tipos = new Set<string>();
    const maquinas = new Set<string>();

    data.forEach(item => {
      if (item.cd && item.cd !== '—') cds.add(item.cd);
      if (item.mes && item.mes !== 'Sin Mes' && item.mes !== '—') meses.add(item.mes);
      if (item.semana && item.semana !== '—') {
        semanasMap.set(item.semana, item.semanaNumero || 0);
      }
      if (item.tipo && item.tipo !== '—') tipos.add(item.tipo);
      if (item.maquina && item.maquina !== '—') maquinas.add(item.maquina);
    });

    // Orden cronológico de meses (enero a diciembre)
    const sortedMeses = Array.from(meses).sort((a, b) => {
      const idxA = ORDEN_MESES.indexOf(normalizaMes(a));
      const idxB = ORDEN_MESES.indexOf(normalizaMes(b));
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    const sortedSemanas = Array.from(semanasMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(entry => entry[0]);

    // Orden tipos por horas ascendente
    const sortedTipos = Array.from(tipos).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const sortedMaquinas = Array.from(maquinas).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    const sortedCds = Array.from(cds).sort();

    return {
      cds: sortedCds,
      meses: sortedMeses,
      semanas: sortedSemanas,
      tipos: sortedTipos,
      maquinas: sortedMaquinas
    };
  }, [data]);

  // Contador de filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCd !== 'TODOS') count++;
    if (filterMes !== 'TODOS') count++;
    if (filterSemana !== 'TODOS') count++;
    if (filterTipo !== 'TODOS') count++;
    if (filterMaquina !== 'TODOS') count++;
    if (filterCumplimiento !== 'TODOS') count++;
    if (searchMaquina.trim() !== '') count++;
    return count;
  }, [filterCd, filterMes, filterSemana, filterTipo, filterMaquina, filterCumplimiento, searchMaquina]);

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

  // Helper para filtros cruzados al interactuar con las gráficas
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

    return data.filter(item => {
      // Búsqueda por máquina
      if (cleanSearch && !item.maquina.toUpperCase().includes(cleanSearch)) {
        return false;
      }
      // Filtro CD
      if (filterCd !== 'TODOS' && item.cd !== filterCd) {
        return false;
      }
      // Filtro Mes (normalizado)
      if (filterMes !== 'TODOS' && normalizaMes(item.mes) !== normalizaMes(filterMes)) {
        return false;
      }
      // Filtro Semana
      if (filterSemana !== 'TODOS' && item.semana !== filterSemana) {
        return false;
      }
      // Filtro Tipo
      if (filterTipo !== 'TODOS' && item.tipo !== filterTipo) {
        return false;
      }
      // Filtro Máquina
      if (filterMaquina !== 'TODOS' && item.maquina !== filterMaquina) {
        return false;
      }
      // Filtro Cumplimiento
      if (filterCumplimiento !== 'TODOS') {
        if (filterCumplimiento === '100%' && !item.esCumple) return false;
        if (filterCumplimiento === '0%' && item.esCumple) return false;
      }
      return true;
    });
  }, [data, filterCd, filterMes, filterSemana, filterTipo, filterMaquina, filterCumplimiento, searchMaquina]);

  // ---------------------------------------------------------------------------
  // 3.1 CÁLCULO DE KPIS (VALIDACIÓN CUMPLIMIENTO: 100% CUMPLE vs 0% NO CUMPLE)
  // ---------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const total = filteredData.length;
    let cumple = 0;
    let noCumple = 0;

    filteredData.forEach(item => {
      if (item.cumplimiento === '100%') cumple++;
      else if (item.cumplimiento === '0%') noCumple++;
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
  // 3.2 GRÁFICA MENSUAL (Agrupada por MES idx 3 en orden cronológico)
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
  // 3.3 GRÁFICA SEMANAL (Por Semana, orden numérico)
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
  // 3.4 REFERENCIA POR CD (Centro Logístico)
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
        const pct = totalCumpl > 0 ? Number(((entry.cumple / totalCumpl) * 100).toFixed(1)) : 0;
        return {
          ...entry,
          porcentaje: pct
        };
      });
  }, [filteredData]);

  // ---------------------------------------------------------------------------
  // 3.5 GRÁFICA POR TIPO DE MANTENIMIENTO (250, 500, 750, 1000, 2000 hr)
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
  // 3.6 FRECUENCIA DE INGRESO POR MÁQUINA (Barras VERTICALES)
  // ---------------------------------------------------------------------------
  const machinesData = useMemo(() => {
    const map = new Map<string, { maquina: string; count: number; cd: string; cumple: number; noCumple: number }>();

    filteredData.forEach(item => {
      const m = item.maquina;
      if (!m) return;
      if (!map.has(m)) {
        map.set(m, { maquina: m, count: 0, cd: item.cd || '—', cumple: 0, noCumple: 0 });
      }
      const entry = map.get(m)!;
      entry.count++;
      if (item.esCumple) entry.cumple++;
      else entry.noCumple++;
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const displayedMachinesData = useMemo(() => {
    if (topMaquinasLimit === 0) return machinesData;
    return machinesData.slice(0, topMaquinasLimit);
  }, [machinesData, topMaquinasLimit]);

  // ---------------------------------------------------------------------------
  // 3.7 RESUMEN DE DESVIACIÓN Y CONFIABILIDAD
  // ---------------------------------------------------------------------------
  const metricsSummary = useMemo(() => {
    let sumDesviacion = 0;
    let countDesviacion = 0;
    let sumConfiabilidad = 0;
    let countConfiabilidad = 0;

    filteredData.forEach(item => {
      if (item.desviacion && item.desviacion !== '—') {
        const num = parseFloat(String(item.desviacion).replace(/[^\d.-]/g, ''));
        if (!isNaN(num)) {
          sumDesviacion += num;
          countDesviacion++;
        }
      }
      if (item.confiabilidad && item.confiabilidad !== '—') {
        const num = parseFloat(String(item.confiabilidad).replace(/[^\d.-]/g, ''));
        if (!isNaN(num)) {
          sumConfiabilidad += num;
          countConfiabilidad++;
        }
      }
    });

    return {
      avgDesviacion: countDesviacion > 0 ? (sumDesviacion / countDesviacion).toFixed(1) : '—',
      avgConfiabilidad: countConfiabilidad > 0 ? Math.round(sumConfiabilidad / countConfiabilidad) : '—'
    };
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
      'OBSERVACION', 'EVIDENCIA'
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
    link.setAttribute('download', `Preventivos_Montacargas_${new Date().toISOString().slice(0, 10)}.csv`);
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
            Mantenimientos Preventivos — Montacargas
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">

          {/* Búsqueda por máquina */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1 uppercase tracking-wider">
              No Máquina
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchMaquina}
                onChange={(e) => {
                  setSearchMaquina(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar máquina..."
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
              <option value="TODOS">Todos</option>
              <option value="100%">100% CUMPLE</option>
              <option value="0%">0% NO CUMPLE</option>
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
              ejecuciones (100%)
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-2">
            {kpis.total > 0 ? ((kpis.cumple / kpis.total) * 100).toFixed(1) : 0}% de los preventivos filtrados
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
            {kpis.total > 0 ? ((kpis.noCumple / kpis.total) * 100).toFixed(1) : 0}% con desvío en criterio
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
              {kpis.porcentaje.toFixed(1)}%
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

        {/* 4. TOTAL PREVENTIVOS */}
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
          <div className="flex items-center justify-between text-xs text-[#64748B] mt-2">
            <span>Desviación media: <strong>{metricsSummary.avgDesviacion} hr</strong></span>
            <span>Confiabilidad: <strong>{metricsSummary.avgConfiabilidad}%</strong></span>
          </div>
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
                    Evolución mes a mes del porcentaje y cantidad de preventivos (enero a diciembre)
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
                    Evolución por semana de ejecución en orden cronológico
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
                      <LabelList dataKey="cumple" position="top" fill="#15803D" fontSize={10} fontWeight={600} formatter={(v: number) => v > 0 ? v : ''} />
                      {typeData.map((entry, index) => (
                        <Cell
                          key={`type-cumple-${index}`}
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
                      <LabelList dataKey="noCumple" position="top" fill="#B91C1C" fontSize={10} fontWeight={600} formatter={(v: number) => v > 0 ? v : ''} />
                      {typeData.map((entry, index) => (
                        <Cell
                          key={`type-nocumple-${index}`}
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
          {/* 3.6 FRECUENCIA DE INGRESO POR MÁQUINA (Columnas VERTICALES)      */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">
                  Frecuencia de Ingresos por Máquina
                </h3>
                <p className="text-xs text-[#64748B]">
                  Cantidad de preventivos ejecutados por cada máquina (columnas verticales ordenadas de mayor a menor)
                </p>
              </div>

              {/* Botones de selección de Top */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                <span className="text-[11px] font-semibold text-slate-500 px-2">Ver:</span>
                {[10, 15, 20, 0].map(lim => (
                  <button
                    key={lim}
                    onClick={() => setTopMaquinasLimit(lim)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      topMaquinasLimit === lim 
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
                  data={displayedMachinesData}
                  margin={{ top: 20, right: 15, left: -15, bottom: 45 }}
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
                              Máquina: {item.maquina}
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
                    {displayedMachinesData.map((entry, index) => {
                      const isActive = (filterMaquina !== 'TODOS' && filterMaquina === entry.maquina) || 
                        (searchMaquina.trim() && searchMaquina.toUpperCase() === entry.maquina.toUpperCase());
                      const hasActiveSelection = filterMaquina !== 'TODOS' || !!searchMaquina.trim();
                      return (
                        <Cell 
                          key={`mach-cell-${index}`} 
                          cursor="pointer"
                          fill={isActive ? '#1D4ED8' : (entry.count >= 4 ? '#2563EB' : (entry.count >= 3 ? '#3B82F6' : '#60A5FA'))}
                          opacity={hasActiveSelection && !isActive ? 0.35 : 1}
                          stroke={isActive ? '#1E293B' : undefined}
                          strokeWidth={isActive ? 2 : 0}
                          onClick={() => handleToggleFilter('maquina', entry.maquina)}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* TABLA DE DETALLE DE PREVENTIVOS DE MONTACARGAS                     */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">
                  Registro Detallado de Preventivos
                </h3>
                <p className="text-xs text-[#64748B]">
                  Historial individual con horómetros, validación de cumplimiento y enlace a evidencias
                </p>
              </div>

              <div className="text-xs text-[#64748B]">
                Página <strong className="text-[#1E293B]">{currentPage}</strong> de <strong className="text-[#1E293B]">{totalPages}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">No Máquina</th>
                    <th className="py-3 px-4">CD</th>
                    <th className="py-3 px-4">Tipo Mtto</th>
                    <th className="py-3 px-4">Mes</th>
                    <th className="py-3 px-4">Semana</th>
                    <th className="py-3 px-4">Fecha Ejecución</th>
                    <th className="py-3 px-4">Horóm. Prog.</th>
                    <th className="py-3 px-4">Horóm. Reg.</th>
                    <th className="py-3 px-4">Desviación</th>
                    <th className="py-3 px-4 text-center">Cumplimiento</th>
                    <th className="py-3 px-4">Confiabilidad</th>
                    <th className="py-3 px-4">Observación</th>
                    <th className="py-3 px-4 text-center">Evidencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1E293B]">
                        {row.maquina || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                          {row.cd || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {row.tipo || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 capitalize">
                        {row.mes || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.semana || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#1E293B]">
                        {formatFechaCorta(row.fecha, row.fechaIso)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.proxHr || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#1E293B]">
                        {row.horometro || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.desviacion !== undefined && row.desviacion !== '' ? row.desviacion : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.cumplimiento === '100%' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-[#16A34A] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            100% CUMPLE
                          </span>
                        ) : row.cumplimiento === '0%' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-[#DC2626] border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            0% NO CUMPLE
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.confiabilidad || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={String(row.observacion || '')}>
                        {row.observacion && row.observacion !== '—' ? row.observacion : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.evidencia ? (
                          <a
                            href={row.evidencia}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Ver</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginador completo */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
              <span>
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} registros
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

export default ForkliftPreventiveDashboard;
