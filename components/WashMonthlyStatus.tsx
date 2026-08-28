import React, { useState, useMemo } from 'react';
import { WashReport, Vehicle } from '../types';
import { normalizePlate, normalizeStr, formatDate } from '../utils';
import Papa from 'papaparse';
import { 
  Droplets, 
  CheckCircle2, 
  Clock, 
  Search, 
  Truck, 
  Building2, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  Plus, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Layers,
  ArrowUpDown,
  Sparkles,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface WashMonthlyStatusProps {
  vehicles: Vehicle[];
  washReports: WashReport[];
  selectedMonth: string;
  selectedYear: number;
  onMonthChange: (month: string) => void;
  onYearChange: (year: number) => void;
  onRegisterWashForPlate?: (plate: string) => void;
  onViewDoc: (url: string | string[] | { url: string; label?: string }[], title: string) => void;
  filterCd: string;
  filterContractor: string;
  onFilterCdChange: (cd: string) => void;
  onFilterContractorChange: (contractor: string) => void;
  uniqueCds: string[];
  uniqueContractors: string[];
  onOpenWashForm?: () => void;
}

export interface VehicleWashStatusItem {
  vehicle: Vehicle;
  plate: string;
  cd: string;
  contractor: string;
  typeModel: string;
  isWashed: boolean;
  status: 'LAVADO' | 'PENDIENTE';
  washCount: number;
  lastWashDate: string | null;
  lastWashWorkshop: string | null;
  latestReport: WashReport | null;
  allMonthReports: WashReport[];
}

const MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const WashMonthlyStatus: React.FC<WashMonthlyStatusProps> = ({
  vehicles,
  washReports,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onRegisterWashForPlate,
  onViewDoc,
  filterCd,
  filterContractor,
  onFilterCdChange,
  onFilterContractorChange,
  uniqueCds,
  uniqueContractors,
  onOpenWashForm
}) => {
  // Filtros internos
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'LAVADO' | 'PENDIENTE'>('all');
  const [sortField, setSortField] = useState<'status' | 'plate' | 'cd' | 'date'>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const currentMonthIdx = useMemo(() => {
    const idx = MONTHS.indexOf(selectedMonth.toUpperCase());
    return idx >= 0 ? idx : new Date().getMonth();
  }, [selectedMonth]);

  // Manejadores de navegación de mes
  const handlePrevMonth = () => {
    if (currentMonthIdx === 0) {
      onMonthChange(MONTHS[11]);
      onYearChange(selectedYear - 1);
    } else {
      onMonthChange(MONTHS[currentMonthIdx - 1]);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIdx === 11) {
      onMonthChange(MONTHS[0]);
      onYearChange(selectedYear + 1);
    } else {
      onMonthChange(MONTHS[currentMonthIdx + 1]);
    }
  };

  // 1. Filtrado de la flota base por CD y Contratista
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || (v.cd || '').trim().toUpperCase() === filterCd.trim().toUpperCase();
      const matchContractor = filterContractor === 'all' || (v.contractor || '').trim().toUpperCase() === filterContractor.trim().toUpperCase();
      return matchCd && matchContractor;
    });
  }, [vehicles, filterCd, filterContractor]);

  // 2. Cruce de TODAS las placas vs reportes de lavados en el mes y año seleccionado
  const fleetWashStatusList = useMemo(() => {
    const targetMonthName = MONTHS[currentMonthIdx];

    // Reportes válidos para el mes/año
    const monthWashes = washReports.filter(w => {
      if (w.date) {
        const d = new Date(w.date + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          return d.getFullYear() === selectedYear && d.getMonth() === currentMonthIdx;
        }
      }
      // Fallback por nombre de mes
      if (w.month) {
        return normalizeStr(w.month) === normalizeStr(targetMonthName);
      }
      return false;
    });

    // Mapear cada vehículo de la flota completa (filtrada por CD/Contratista)
    const items: VehicleWashStatusItem[] = filteredVehicles.map(vehicle => {
      const p = normalizePlate(vehicle.plate);

      // Buscar todos los lavados de este vehículo en el mes
      const vehicleReports = monthWashes
        .filter(w => normalizePlate(w.plate) === p)
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date + 'T12:00:00').getTime() : 0;
          const dateB = b.date ? new Date(b.date + 'T12:00:00').getTime() : 0;
          return dateB - dateA;
        });

      const isWashed = vehicleReports.length > 0;
      const latestReport = vehicleReports[0] || null;
      const typeModel = vehicle.brand 
        ? `${vehicle.brand} ${vehicle.model || ''}`.trim() 
        : (vehicle.model || 'VEHÍCULO');

      return {
        vehicle,
        plate: vehicle.plate,
        cd: vehicle.cd || 'GENERAL',
        contractor: vehicle.contractor || 'GENERAL',
        typeModel,
        isWashed,
        status: isWashed ? 'LAVADO' : 'PENDIENTE',
        washCount: vehicleReports.length,
        lastWashDate: latestReport?.date || null,
        lastWashWorkshop: latestReport?.workshop || null,
        latestReport,
        allMonthReports: vehicleReports
      };
    });

    return items;
  }, [filteredVehicles, washReports, currentMonthIdx, selectedYear]);

  // 3. Tarjetas Resumen
  const summaryStats = useMemo(() => {
    const totalFlota = fleetWashStatusList.length;
    const lavados = fleetWashStatusList.filter(item => item.isWashed).length;
    const pendientes = totalFlota - lavados;
    const porcentaje = totalFlota > 0 ? Math.round((lavados / totalFlota) * 100) : 0;

    return {
      totalFlota,
      lavados,
      pendientes,
      porcentaje
    };
  }, [fleetWashStatusList]);

  // 4. Filtrado para la tabla (búsqueda y estado)
  const displayItems = useMemo(() => {
    let list = [...fleetWashStatusList];

    // Filtro por estado
    if (statusFilter !== 'all') {
      list = list.filter(item => item.status === statusFilter);
    }

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const q = normalizeStr(searchTerm);
      list = list.filter(item => 
        normalizeStr(item.plate).includes(q) ||
        normalizeStr(item.cd).includes(q) ||
        normalizeStr(item.contractor).includes(q) ||
        normalizeStr(item.typeModel).includes(q) ||
        (item.lastWashWorkshop && normalizeStr(item.lastWashWorkshop).includes(q))
      );
    }

    // Ordenamiento
    list.sort((a, b) => {
      if (sortField === 'status') {
        // Por defecto: PENDIENTES (rojo) arriba, luego LAVADOS (verde)
        if (a.status === b.status) {
          return a.plate.localeCompare(b.plate);
        }
        if (sortDirection === 'asc') {
          return a.status === 'PENDIENTE' ? -1 : 1;
        } else {
          return a.status === 'LAVADO' ? -1 : 1;
        }
      }

      if (sortField === 'plate') {
        return sortDirection === 'asc' 
          ? a.plate.localeCompare(b.plate)
          : b.plate.localeCompare(a.plate);
      }

      if (sortField === 'cd') {
        return sortDirection === 'asc' 
          ? a.cd.localeCompare(b.cd)
          : b.cd.localeCompare(a.cd);
      }

      if (sortField === 'date') {
        const timeA = a.lastWashDate ? new Date(a.lastWashDate + 'T12:00:00').getTime() : 0;
        const timeB = b.lastWashDate ? new Date(b.lastWashDate + 'T12:00:00').getTime() : 0;
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }

      return 0;
    });

    return list;
  }, [fleetWashStatusList, statusFilter, searchTerm, sortField, sortDirection]);

  // Manejar apertura de evidencias fotográficas
  const handleOpenEvidence = (item: VehicleWashStatusItem) => {
    if (!item.latestReport) return;
    
    const photos: { url: string; label?: string }[] = [];
    if (item.latestReport.initialEvidenceUrl) {
      photos.push({ url: item.latestReport.initialEvidenceUrl, label: 'Evidencia Inicial / Entrada' });
    }
    if (item.latestReport.finalEvidenceUrl) {
      photos.push({ url: item.latestReport.finalEvidenceUrl, label: 'Evidencia Final / Salida' });
    }
    if (item.latestReport.evidenceUrl && !photos.some(p => p.url === item.latestReport?.evidenceUrl)) {
      photos.push({ url: item.latestReport.evidenceUrl, label: 'Foto del Lavado' });
    }
    if (item.latestReport.mapUrl) {
      photos.push({ url: item.latestReport.mapUrl, label: 'Mapa / Ubicación GPS' });
    }

    if (photos.length > 0) {
      onViewDoc(photos, `Evidencia de Lavado - Placa ${item.plate} (${item.lastWashDate || ''})`);
    } else {
      alert(`El registro de lavado para ${item.plate} no contiene enlaces de fotos directas.`);
    }
  };

  // Exportar a Excel (CSV con formato en español)
  const handleExportExcel = () => {
    if (fleetWashStatusList.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }

    const dataToExport = fleetWashStatusList.map((item, index) => ({
      "N°": index + 1,
      "MES": MONTHS[currentMonthIdx],
      "AÑO": selectedYear,
      "PLACA": item.plate,
      "ESTADO DE LAVADO": item.status,
      "CUMPLE REGLA": item.isWashed ? "SÍ (LAVADO)" : "NO (PENDIENTE)",
      "TOTAL LAVADOS EN EL MES": item.washCount,
      "FECHA ÚLTIMO LAVADO": item.lastWashDate || "—",
      "TALLER / LUGAR": item.lastWashWorkshop || "—",
      "CENTRO DE DISTRIBUCIÓN (CD)": item.cd,
      "CONTRATISTA": item.contractor,
      "TIPO / MODELO": item.typeModel,
      "EVIDENCIA INICIAL": item.latestReport?.initialEvidenceUrl || item.latestReport?.evidenceUrl || "—",
      "EVIDENCIA FINAL": item.latestReport?.finalEvidenceUrl || "—",
      "MAPA GPS": item.latestReport?.mapUrl || "—"
    }));

    const csv = Papa.unparse(dataToExport, { delimiter: ";" });
    const csvWithBom = "\uFEFF" + csv;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Estatus_Lavados_Flota_${MONTHS[currentMonthIdx]}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (field: 'status' | 'plate' | 'cd' | 'date') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Selector de Mes / Año & Acciones Rápidas */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Controles de Periodo */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0D2B4E] text-white px-4 py-2.5 rounded-2xl shadow-sm">
            <Calendar size={18} className="text-[#F2B705]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">PERIODO EVALUADO:</span>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-inner">
            <button 
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white rounded-xl text-slate-600 hover:text-[#0D2B4E] transition-all"
              title="Mes Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <select 
              className="bg-transparent font-black text-xs text-[#0D2B4E] uppercase px-3 py-1.5 outline-none cursor-pointer"
              value={MONTHS[currentMonthIdx]}
              onChange={e => onMonthChange(e.target.value)}
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="text-slate-300 font-bold">|</span>
            <select 
              className="bg-transparent font-black text-xs text-[#0D2B4E] uppercase px-3 py-1.5 outline-none cursor-pointer"
              value={selectedYear}
              onChange={e => onYearChange(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button 
              onClick={handleNextMonth}
              className="p-2 hover:bg-white rounded-xl text-slate-600 hover:text-[#0D2B4E] transition-all"
              title="Mes Siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 border border-cyan-100 rounded-xl text-[10px] font-bold text-cyan-800">
            <Sparkles size={13} className="text-cyan-600" />
            <span>Regla: 1 lavado / mes por vehículo</span>
          </div>
        </div>

        {/* Botones de Exportar y Registro */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            title="Exportar estatus completo a Excel (CSV)"
          >
            <FileSpreadsheet size={16} className="text-emerald-100" />
            <span>Exportar Excel</span>
            <Download size={13} className="opacity-80 ml-0.5" />
          </button>

          {onOpenWashForm && (
            <button 
              onClick={onOpenWashForm}
              className="flex items-center gap-2 px-6 py-3 bg-[#0D2B4E] hover:bg-[#153e6c] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-[#0D2B4E]/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Plus size={16} className="text-[#F2B705]" />
              <span>Registrar Lavado</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Tarjetas Resumen (Semáforo & Métricas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* TOTAL FLOTA */}
        <div className="bg-[#0D2B4E] rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">TOTAL FLOTA</span>
            <div className="p-3 bg-white/10 rounded-2xl text-[#F2B705]">
              <Truck size={22} />
            </div>
          </div>
          <div>
            <div className="text-4xl font-black tracking-tight">{summaryStats.totalFlota}</div>
            <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Vehículos monitoreados</p>
          </div>
        </div>

        {/* LAVADOS (VERDE) */}
        <div className="bg-white rounded-[2rem] p-6 border-2 border-emerald-500/20 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">LAVADOS (ESTE MES)</span>
            </div>
            <div className="p-3 bg-emerald-100 rounded-2xl text-[#16A34A]">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div>
            <div className="text-4xl font-black text-emerald-700 tracking-tight">{summaryStats.lavados}</div>
            <p className="text-[10px] text-emerald-600/80 font-bold uppercase mt-1">Con al menos 1 lavado</p>
          </div>
        </div>

        {/* PENDIENTES (ROJO) */}
        <div className="bg-white rounded-[2rem] p-6 border-2 border-rose-500/20 shadow-xl relative overflow-hidden flex flex-col justify-between hover:border-rose-500/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse"></span>
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest">PENDIENTES (ESTE MES)</span>
            </div>
            <div className="p-3 bg-rose-100 rounded-2xl text-[#DC2626]">
              <Clock size={22} />
            </div>
          </div>
          <div>
            <div className="text-4xl font-black text-rose-700 tracking-tight">{summaryStats.pendientes}</div>
            <p className="text-[10px] text-rose-600/80 font-bold uppercase mt-1">Sin lavado registrado</p>
          </div>
        </div>

        {/* % DE AVANCE / CUMPLIMIENTO */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl flex items-center gap-5 justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">% CUMPLIMIENTO</span>
            <div className="text-3xl font-black text-[#0D2B4E]">
              {summaryStats.porcentaje}%
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase">
              {summaryStats.lavados} de {summaryStats.totalFlota} al día
            </p>
          </div>
          
          {/* Círculo de Progreso */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="40" 
                cy="40" 
                r="32" 
                stroke="#e2e8f0" 
                strokeWidth="7" 
                fill="transparent" 
              />
              <circle 
                cx="40" 
                cy="40" 
                r="32" 
                stroke={summaryStats.porcentaje >= 80 ? "#16A34A" : summaryStats.porcentaje >= 50 ? "#F2B705" : "#DC2626"} 
                strokeWidth="7" 
                fill="transparent" 
                strokeDasharray={201} 
                strokeDashoffset={201 - (201 * summaryStats.porcentaje) / 100} 
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out" 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-slate-700">{summaryStats.porcentaje}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        {/* Pestañas de Estado (Semáforo) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === 'all' ? 'bg-[#0D2B4E] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            TODAS ({fleetWashStatusList.length})
          </button>
          <button 
            onClick={() => setStatusFilter('PENDIENTE')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${statusFilter === 'PENDIENTE' ? 'bg-[#DC2626] text-white shadow-sm' : 'text-rose-700 hover:bg-rose-50'}`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            PENDIENTES ({summaryStats.pendientes})
          </button>
          <button 
            onClick={() => setStatusFilter('LAVADO')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${statusFilter === 'LAVADO' ? 'bg-[#16A34A] text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            LAVADOS ({summaryStats.lavados})
          </button>
        </div>

        {/* Filtros de CD, Contratista y Búsqueda */}
        <div className="flex flex-wrap items-center gap-3">
          {/* CD */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <Building2 size={14} className="text-slate-400" />
            <select 
              className="bg-transparent font-black text-[10px] uppercase text-slate-700 outline-none cursor-pointer"
              value={filterCd}
              onChange={e => onFilterCdChange(e.target.value)}
            >
              <option value="all">TODOS LOS CD</option>
              {uniqueCds.map(cd => (
                <option key={cd} value={cd}>{cd}</option>
              ))}
            </select>
          </div>

          {/* Contratista */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <Filter size={14} className="text-slate-400" />
            <select 
              className="bg-transparent font-black text-[10px] uppercase text-slate-700 outline-none cursor-pointer max-w-[140px]"
              value={filterContractor}
              onChange={e => onFilterContractorChange(e.target.value)}
            >
              <option value="all">TODOS CONTRATISTAS</option>
              {uniqueContractors.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar placa, CD, modelo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 outline-none focus:border-[#0D2B4E] w-52 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Tabla de TODAS las placas */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 bg-[#0D2B4E] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Droplets size={22} className="text-[#F2B705]" />
              Estatus Mensual de Lavados vs Flota Completa
            </h3>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-0.5">
              Mes: {MONTHS[currentMonthIdx]} {selectedYear} • Mostrando {displayItems.length} de {fleetWashStatusList.length} vehículos
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-white/10 px-4 py-2 rounded-2xl">
            <span>Orden:</span>
            <span className="text-[#F2B705]">
              {sortField === 'status' ? 'Pendientes Primero' : sortField === 'plate' ? 'Placa' : sortField === 'cd' ? 'CD' : 'Fecha'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6 text-center w-12">#</th>
                <th className="py-4 px-6 cursor-pointer hover:text-[#0D2B4E]" onClick={() => toggleSort('plate')}>
                  <div className="flex items-center gap-1.5">
                    <span>Placa</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-4 px-6 cursor-pointer hover:text-[#0D2B4E]" onClick={() => toggleSort('cd')}>
                  <div className="flex items-center gap-1.5">
                    <span>CD / Operación</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-4 px-6">Contratista / Modelo</th>
                <th className="py-4 px-6 cursor-pointer hover:text-[#0D2B4E]" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1.5">
                    <span>Último Lavado del Mes</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-4 px-6 cursor-pointer hover:text-[#0D2B4E]" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1.5">
                    <span>Estado</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {displayItems.map((item, index) => {
                const isWashed = item.isWashed;

                return (
                  <tr 
                    key={item.plate}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !isWashed ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-4 px-6 text-center text-[11px] text-slate-400 font-medium">
                      {index + 1}
                    </td>

                    {/* Placa */}
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-2 bg-slate-900 text-white font-mono font-black text-xs px-3 py-1.5 rounded-xl tracking-wider shadow-sm">
                        <Truck size={13} className="text-[#F2B705]" />
                        <span>{item.plate}</span>
                      </div>
                    </td>

                    {/* CD */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-black text-[#0D2B4E] uppercase">{item.cd}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{item.contractor}</span>
                      </div>
                    </td>

                    {/* Modelo / Tipo */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{item.typeModel}</span>
                        {item.vehicle.brand && (
                          <span className="text-[9px] text-slate-400 font-medium uppercase">{item.vehicle.brand}</span>
                        )}
                      </div>
                    </td>

                    {/* Fecha de Lavado */}
                    <td className="py-4 px-6">
                      {isWashed ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                            <Calendar size={13} className="text-[#16A34A]" />
                            <span>{formatDate(item.lastWashDate || '')}</span>
                          </div>
                          {item.lastWashWorkshop && (
                            <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                              Taller: {item.lastWashWorkshop} {item.washCount > 1 ? `(${item.washCount} lavados)` : ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-bold tracking-widest">—</span>
                      )}
                    </td>

                    {/* Semáforo Badge */}
                    <td className="py-4 px-6">
                      {isWashed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-[#16A34A] border border-emerald-300/40 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                          🟢 LAVADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-[#DC2626] border border-rose-300/40 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse"></span>
                          🔴 PENDIENTE
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isWashed ? (
                          <button 
                            onClick={() => handleOpenEvidence(item)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-[#0D2B4E] text-slate-700 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                            title="Ver evidencia fotográfica"
                          >
                            <Eye size={13} />
                            <span>Ver Fotos</span>
                          </button>
                        ) : (
                          onRegisterWashForPlate && (
                            <button 
                              onClick={() => onRegisterWashForPlate(item.plate)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#DC2626] hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-rose-600/20 active:scale-95"
                              title="Registrar lavado para esta placa"
                            >
                              <Plus size={13} />
                              <span>Registrar</span>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {displayItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Droplets size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-black uppercase tracking-widest text-sm text-slate-500">
                      No se encontraron vehículos con los filtros seleccionados
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      Intenta limpiar el buscador o seleccionar otros criterios de CD o Contratista.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de la tabla */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 gap-2">
          <div>
            Total en vista: <span className="text-slate-800">{displayItems.length}</span> de <span className="text-slate-800">{fleetWashStatusList.length}</span> vehículos de la flota
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {summaryStats.lavados} Lavados
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> {summaryStats.pendientes} Pendientes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WashMonthlyStatus;
