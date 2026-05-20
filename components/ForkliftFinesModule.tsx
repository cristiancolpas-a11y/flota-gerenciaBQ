import React, { useState, useMemo } from 'react';
import { 
  X, Search, Shield, Clock, ChevronLeft, ChevronRight, FileText, 
  Loader2, Calendar, MapPin, DollarSign, User, HelpCircle, 
  Gavel, CheckCircle, AlertTriangle, ChevronDown, Award, Users,
  BarChart3, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ForkliftFine } from '../types';
import DocumentViewer from './DocumentViewer';

interface ForkliftFinesModuleProps {
  data: ForkliftFine[];
  onRefresh: () => Promise<void>;
}

export const ForkliftFinesModule: React.FC<ForkliftFinesModuleProps> = ({ data, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('MAYO'); // Default as Mayo in screenshot
  const [filterYear, setFilterYear] = useState('2026'); // Default as 2026 in screenshot
  const [isRefreshing, setIsRefreshing] = useState(false);

  // PDF Previewer State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 6 cards per page fits beautifully in the styled grid

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Extract unique filters from master data
  const uniqueCds = useMemo(() => {
    return Array.from(new Set(data.map(item => item.cd).filter(Boolean))).sort();
  }, [data]);

  const uniqueContractors = useMemo(() => {
    return Array.from(new Set(data.map(item => item.contractor).filter(Boolean))).sort();
  }, [data]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(data.map(item => item.hasFine).filter(Boolean))).sort();
  }, [data]);

  const uniqueMonths = useMemo(() => {
    const monthOrder = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const months = Array.from(new Set(data.map(item => item.month).filter(Boolean))) as string[];
    return months.sort((a, b) => {
      return monthOrder.indexOf(a.toUpperCase()) - monthOrder.indexOf(b.toUpperCase());
    });
  }, [data]);

  // Calculations for HISTORICAL SUMMARY OF RECORDS BY MONTH
  // Matches the scrollable/grid middle block exactly
  const monthlySummaries = useMemo(() => {
    const monthOrder = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    
    // Group all master records
    const grouped = data.reduce((acc, item) => {
      const m = (item.month || 'SIN MES/FECHA').toUpperCase();
      if (!acc[m]) {
        acc[m] = {
          name: m,
          totalCount: 0,
          uniqueDrivers: new Set<string>()
        };
      }
      acc[m].totalCount += 1;
      if (item.driverId) {
        acc[m].uniqueDrivers.add(item.driverId);
      } else if (item.driverName) {
        acc[m].uniqueDrivers.add(item.driverName);
      }
      return acc;
    }, {} as Record<string, { name: string; totalCount: number; uniqueDrivers: Set<string> }>);

    return (Object.values(grouped) as { name: string; totalCount: number; uniqueDrivers: Set<string> }[]).sort((a, b) => {
      const idxA = monthOrder.indexOf(a.name);
      const idxB = monthOrder.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    }).map(g => ({
      name: g.name,
      totalCount: g.totalCount,
      uniqueDrivers: g.uniqueDrivers.size
    }));
  }, [data]);

  // Apply filters on the list data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = 
        searchTerm === '' ||
        (item.driverName && item.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.driverId && item.driverId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.concept && item.concept.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.receiptNo && item.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCd = filterCd === 'all' || item.cd === filterCd;
      const matchContractor = filterContractor === 'all' || item.contractor === filterContractor;
      
      // Let's make "SI" or "NO" filter flexible
      let matchStatus = true;
      if (filterStatus !== 'all') {
        const itemHasFine = (item.hasFine || '').toUpperCase().includes('SI') || (item.hasFine || '').toUpperCase() === 'S';
        const filterHasFine = filterStatus.toUpperCase().includes('SI') || filterStatus.toUpperCase() === 'S';
        matchStatus = itemHasFine === filterHasFine;
      }

      const matchMonth = filterMonth === 'all' || (item.month || '').toUpperCase() === filterMonth.toUpperCase();

      return matchSearch && matchCd && matchContractor && matchStatus && matchMonth;
    });
  }, [data, searchTerm, filterCd, filterContractor, filterStatus, filterMonth]);

  // Reset page when filters change
  const [lastFilters, setLastFilters] = useState({ filterCd, filterContractor, filterStatus, filterMonth, searchTerm });
  if (
    lastFilters.filterCd !== filterCd || 
    lastFilters.filterContractor !== filterContractor || 
    lastFilters.filterStatus !== filterStatus || 
    lastFilters.filterMonth !== filterMonth || 
    lastFilters.searchTerm !== searchTerm
  ) {
    setCurrentPage(1);
    setLastFilters({ filterCd, filterContractor, filterStatus, filterMonth, searchTerm });
  }

  // Statistics calculation for KPI cards
  const stats = useMemo(() => {
    // Totals for selected month
    const monthFiltered = data.filter(item => filterMonth === 'all' || (item.month || '').toUpperCase() === filterMonth.toUpperCase());
    const totalSelectedMonth = monthFiltered.length;

    // Con comparendo (SI)
    const withFineAll = filteredData.filter(item => {
      const val = (item.hasFine || '').toUpperCase();
      return val.includes('SI') || val === 'S';
    }).length;

    // Sin comparendo (NO)
    const withoutFineAll = filteredData.length - withFineAll;

    // Con soporte (has either first checkup PDF, second checkup PDF or fine receipt PDF)
    const withSupportAll = filteredData.filter(item => {
      return !!(item.revision01To15Pdf || item.revision15To30Pdf || item.receiptPdf);
    }).length;

    // Sin soporte
    const withoutSupportAll = filteredData.length - withSupportAll;

    // Total master list size loaded
    const grandTotalLoaded = data.length;

    return {
      totalSelectedMonth,
      grandTotalLoaded,
      withFineAll,
      withoutFineAll,
      withSupportAll,
      withoutSupportAll
    };
  }, [data, filteredData, filterMonth]);

  // Paginated operators details
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const handlePreview = (url: string | undefined, title: string) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewTitle(title);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 text-slate-800 animate-in fade-in duration-500">
      
      {/* Upper header action area */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        
        {/* Title Block with the red Gavel Hammer */}
        <div className="flex items-start gap-4">
          <div className="p-4 bg-rose-50 rounded-2xl text-rose-500 border border-rose-100 shadow-sm shrink-0">
            <Gavel size={36} className="transform rotate-45" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-[#0f172a] uppercase tracking-tighter leading-none">
              GESTIÓN COMPARENDOS
            </h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] block">
              CONTROL Y SEGUIMIENTO DE INFRACCIONES DE MONTACARGAS
            </p>
          </div>
        </div>

        {/* Dynamic Interactive Filter Rails */}
        <div className="flex flex-wrap items-center gap-4 xl:justify-end">
          
          {/* CD */}
          <div className="relative bg-white border border-slate-200 shadow-sm rounded-full px-5 py-2.5 flex items-center gap-2 hover:border-slate-350 transition-colors">
            <select 
              value={filterCd} 
              onChange={(e) => setFilterCd(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-650 cursor-pointer outline-none appearance-none pr-5 min-w-[90px]"
            >
              <option value="all">TODOS LOS CD</option>
              {uniqueCds.map(cd => (
                <option key={cd} value={cd}>{cd.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Contractor */}
          <div className="relative bg-white border border-slate-200 shadow-sm rounded-full px-5 py-2.5 flex items-center gap-2 hover:border-slate-350 transition-colors">
            <select 
              value={filterContractor} 
              onChange={(e) => setFilterContractor(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-650 cursor-pointer outline-none appearance-none pr-5 min-w-[140px]"
            >
              <option value="all">TODOS LOS CONTRATISTAS</option>
              {uniqueContractors.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Status selector */}
          <div className="relative bg-white border border-slate-200 shadow-sm rounded-full px-5 py-2.5 flex items-center gap-2 hover:border-slate-350 transition-colors">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-650 cursor-pointer outline-none appearance-none pr-5 min-w-[90px]"
            >
              <option value="all">ESTADO TODOS</option>
              <option value="si">TIENE COMP (SI)</option>
              <option value="no">SIN COMP (NO)</option>
            </select>
            <ChevronDown size={12} className="absolute right-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Monthly Period Box - EXACT representation of the mock container layout */}
          <div className="bg-[#f8fafc] border border-slate-200 rounded-[1.5rem] p-2 flex items-center gap-3 shadow-md">
            
            {/* Embedded Calendar indicator */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm shrink-0">
              <Calendar size={14} className="text-indigo-500" />
              <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">MENSUAL</span>
            </div>

            {/* Embedded Month selector */}
            <select 
              value={filterMonth} 
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-white border border-slate-250 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase text-slate-700 cursor-pointer outline-none hover:border-slate-400"
            >
              <option value="all">TODOS</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Year selector placeholder to complete design */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="bg-white border border-slate-250 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase text-slate-700 cursor-pointer outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          {/* Refresh Action Trigger */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all disabled:opacity-50"
            title="Sincronizar Datos"
          >
            {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </div>

      {/* Styled 5 KPI Cards Row matching the mock screenshot exact layout and colorway */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* Card 1: TOTAL REGISTERS Month */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-indigo-100 shadow-lg shadow-indigo-100/30 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          {/* Avatar stack drawing decor in back */}
          <div className="absolute right-4 top-4 text-slate-100 group-hover:text-indigo-50/70 transition-colors">
            <Users size={64} strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">REGISTROS EN {filterMonth}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-tight">
                [CARGADOS: {stats.grandTotalLoaded}]
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-slate-800 leading-none">{stats.totalSelectedMonth}</span>
              <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
                TOTAL
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: CON COMPARENDO (SI) reddish badge and warning symbol */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-rose-100 shadow-lg shadow-rose-100/30 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          {/* Warning sign background decoration */}
          <div className="absolute right-4 top-4 text-rose-50/50 group-hover:text-rose-50 transition-colors">
            <AlertTriangle size={64} strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-3">
            <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">CON COMPARENDO (SI)</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-rose-600 leading-none">{stats.withFineAll}</span>
              <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                ROJO
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: SIN COMPARENDO (NO) check circle banner and green shade */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-emerald-100 shadow-lg shadow-emerald-100/25 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          {/* Check badge decor */}
          <div className="absolute right-4 top-4 text-emerald-50/50 group-hover:text-emerald-50 transition-colors">
            <CheckCircle size={64} strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-3">
            <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">SIN COMPARENDO (NO)</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-emerald-600 leading-none">{stats.withoutFineAll}</span>
              <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                VERDE
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: CON SOPORTE blue shade and documents check */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-indigo-100 shadow-lg shadow-indigo-50/30 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          {/* Documents decor */}
          <div className="absolute right-4 top-4 text-slate-100 group-hover:text-indigo-50 transition-colors">
            <FileText size={64} strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-3">
            <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">CON SOPORTE</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-indigo-650 leading-none">{stats.withSupportAll}</span>
              <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
                LISTO
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: SIN SOPORTE alerting yellow badge */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-amber-100 shadow-lg shadow-amber-50/30 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          {/* File warning decor */}
          <div className="absolute right-4 top-4 text-amber-55/40 group-hover:text-amber-50 transition-colors">
            <FileText size={64} strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-3">
            <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">SIN SOPORTE</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-amber-600 leading-none">{stats.withoutSupportAll}</span>
              <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
                FALTA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIC REGISTERS SUMMARY BY MONTH - Horizontal sleek bento selector */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <BarChart3 size={20} className="text-indigo-600" />
          <div>
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">RESUMEN DE REGISTROS POR MES</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">COMPARATIVA HISTÓRICA DE CONDUCTORES REGISTRADOS</p>
          </div>
        </div>

        {/* Responsive Month Summary Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {monthlySummaries.map((m) => {
            const isActive = m.name.toUpperCase() === filterMonth.toUpperCase();
            return (
              <button
                key={m.name}
                onClick={() => setFilterMonth(m.name)}
                className={`text-left p-5 rounded-2xl border transition-all relative ${isActive ? 'bg-white border-indigo-600 shadow-lg ring-1 ring-indigo-500/20' : 'bg-slate-50 border-slate-150 hover:bg-slate-100/50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-extrabold tracking-wider ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>{m.name}</span>
                  <Calendar size={12} className={isActive ? 'text-indigo-500' : 'text-slate-300'} />
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL REGISTROS</p>
                  <p className="text-2xl font-black text-slate-800 leading-snug">{m.totalCount}</p>
                </div>
                <div className="border-t border-slate-200/60 mt-3 pt-2 text-[9px] text-slate-450 font-bold flex items-center gap-1.5 uppercase leading-none">
                  <Users size={10} className="text-slate-400" />
                  <span>{m.uniqueDrivers} CONDUCTORES</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Elegant Real search indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/80 px-8 py-4 rounded-[1.5rem] border border-slate-200">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="BUSCAR OPERADOR, CEDULA, CONCEPTO O COMPROBANTE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-black focus:ring-2 focus:ring-indigo-500 outline-none uppercase tracking-widest text-slate-700 placeholder:text-slate-450 shadow-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="text-[10px] font-black uppercase text-slate-450 tracking-widest">
          Filtros activos: <span className="text-indigo-600">{filteredData.length}</span> en <span className="text-indigo-600">{filterMonth}</span>
        </div>
      </div>

      {/* OPERATORS HIGHLY POLISHED DETAILS CARDS GRID (Replacing default table) */}
      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {paginatedData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {paginatedData.map((item) => {
                const hasFine = (item.hasFine || '').toUpperCase().includes('SI') || (item.hasFine || '').toUpperCase() === 'S';
                // Emerald background if NO fine, subtle crimson/gradient if active fine
                const headerBg = hasFine 
                  ? 'bg-gradient-to-br from-rose-500 via-rose-600 to-red-650' 
                  : 'bg-emerald-600';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col hover:shadow-2xl hover:border-slate-200 transition-all group"
                  >
                    {/* Header rounded curved panel */}
                    <div className={`${headerBg} p-8 text-white relative flex flex-col items-center text-center space-y-4 shadow-inner`}>
                      
                      {/* Round user icon with circle mask decoration */}
                      <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-lg relative group-hover:scale-105 transition-transform duration-300">
                        <User size={28} className="text-white" strokeWidth={2.5} />
                      </div>

                      {/* Name of Operator */}
                      <div className="space-y-1 w-full px-2">
                        <h4 className="font-black tracking-tight text-base uppercase leading-snug truncate" title={item.driverName}>
                          {item.driverName || 'SIN NOMBRE'}
                        </h4>
                        <span className="text-[10px] font-mono font-bold opacity-80 block tracking-widest">
                          {item.driverId ? `C.C. ${item.driverId}` : 'CÉDULA NO INCLUIDA'}
                        </span>
                      </div>

                      {/* Status indicator Pill Badge over Header */}
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 select-none shadow-sm gap-1.5`}>
                        <Award size={12} className="text-white" />
                        {hasFine ? `CON DEUDA (SI)` : `SIN DEUDA (NO)`}
                      </span>
                    </div>

                    {/* Card Body information deck */}
                    <div className="p-8 space-y-6 flex-grow flex flex-col justify-between">
                      
                      <div className="space-y-5">
                        
                        {/* Box for Numero de Comparendo (Gray layout exactly like the mock bottom box) */}
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                          <div className="flex items-center gap-2">
                            <Gavel size={14} className={hasFine ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
                            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest">N° COMP_</span>
                          </div>
                          <span className={`text-[11px] font-extrabold uppercase ${hasFine ? 'text-rose-600' : 'text-slate-400'}`}>
                            {item.receiptNo ? `#${item.receiptNo}` : 'SIN REGISTRO'}
                          </span>
                        </div>

                        {/* CD & Contractor metadata details badges row */}
                        <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase">
                          <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                            CD {item.cd || 'GQA'}
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 truncate max-w-[150px]" title={item.contractor}>
                            {item.contractor || 'BQA GENERAL'}
                          </span>
                        </div>

                        {/* Mid-divider */}
                        <div className="h-px bg-slate-100" />

                        {/* Checkups and revision reports index */}
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">INFORMES QUINCENALES</h5>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {/* Revision 1 */}
                            {item.revision01To15Pdf ? (
                              <button
                                onClick={() => handlePreview(item.revision01To15Pdf, `Revision 01-15 - ${item.driverName}`)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all"
                              >
                                <FileText size={12} />
                                01-15 OCT
                              </button>
                            ) : (
                              <div className="flex items-center justify-center px-3 py-2.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl font-bold text-[9px] uppercase tracking-wider select-none">
                                PND 01-15
                              </div>
                            )}

                            {/* Revision 2 */}
                            {item.revision15To30Pdf ? (
                              <button
                                onClick={() => handlePreview(item.revision15To30Pdf, `Revision 15-30 - ${item.driverName}`)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all"
                              >
                                <FileText size={12} />
                                15-30 OCT
                              </button>
                            ) : (
                              <div className="flex items-center justify-center px-3 py-2.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl font-bold text-[9px] uppercase tracking-wider select-none">
                                PND 15-30
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fine receipts / Comprobantes download support links */}
                        {item.receiptPdf && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">COMPROBANTE PAGADO</span>
                            <button
                              onClick={() => handlePreview(item.receiptPdf, `Comprobante Pago - ${item.driverName}`)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                              <FileText size={14} />
                              VER RECIBO DE PAGO
                            </button>
                          </div>
                        )}
                        
                        {/* Concept and Observaciones Block */}
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">CONCEPTO</span>
                          <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-tight line-clamp-1">{item.concept || 'SERVICIO GENERAL'}</p>
                          <p className="text-[10px] text-slate-450 line-clamp-2 leading-relaxed italic">{item.observation || 'Ninguna novedad descriptiva reportada.'}</p>
                        </div>
                      </div>

                      {/* Footer valuation row inside the card */}
                      <div className="border-t border-slate-100 pt-5 mt-4 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">VALOR INFRACCIÓN</span>
                          <span className={`text-base font-extrabold tracking-tight ${item.amount > 0 ? 'text-rose-600' : 'text-slate-550'}`}>
                            {item.amount > 0 ? formatCurrency(item.amount) : 'SIN DEUDA'}
                          </span>
                        </div>

                        {item.paymentAgreement && (
                          <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-100 text-[8px] font-black text-amber-600 uppercase tracking-widest">
                            {item.paymentAgreement}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] p-24 border-2 border-dashed border-slate-150 text-center space-y-4">
              <div className="p-4 bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-slate-300">
                <HelpCircle size={48} className="animate-pulse" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
                Sin registros de comparendos bajo estos filtros
              </p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterCd('all');
                  setFilterContractor('all');
                  setFilterStatus('all');
                  setFilterMonth('all');
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-[#0f172a] text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
              >
                Limpiar Filtros
              </button>
            </div>
          )}
        </AnimatePresence>

        {/* Elegant Centered Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-[11px] font-black uppercase text-slate-450 tracking-[0.2em] text-center sm:text-left">
              Mostrando <span className="text-indigo-650 font-black">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-indigo-650 font-black">{Math.min(filteredData.length, currentPage * itemsPerPage)}</span> de <span className="text-indigo-650 font-black">{filteredData.length}</span> comparendos registrados
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {/* Prev Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`p-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center ${currentPage === 1 ? 'opacity-35 cursor-not-allowed text-slate-400 bg-transparent' : 'bg-white text-slate-650 hover:bg-slate-50 hover:text-slate-800 active:scale-95 shadow-sm'}`}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Numbers */}
              {pageNumbers.map((p, idx) => {
                if (typeof p === 'number') {
                  const isActive = p === currentPage;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(p)}
                      className={`min-w-[40px] h-[40px] rounded-xl text-[11px] font-black tracking-widest transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/35' : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-200 shadow-sm'}`}
                    >
                      {String(p).padStart(2, '0')}
                    </button>
                  );
                } else {
                  return (
                    <span key={idx} className="px-2 text-slate-400 text-xs font-black tracking-widest">
                      {p}
                    </span>
                  );
                }
              })}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`p-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center ${currentPage === totalPages ? 'opacity-35 cursor-not-allowed text-slate-400 bg-transparent' : 'bg-white text-slate-650 hover:bg-slate-50 hover:text-slate-800 active:scale-95 shadow-sm'}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shared DocumentViewer overlay backdrop modal popup */}
      {previewUrl && (
        <DocumentViewer 
          url={previewUrl}
          title={previewTitle}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
};
