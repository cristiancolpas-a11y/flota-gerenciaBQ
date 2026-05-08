import React, { useState, useMemo } from 'react';
import { OperatorRecord } from '../types';
import { 
  Users, Calendar, Filter, Search, Shield, AlertCircle, 
  MapPin, Building2, UserCircle, CreditCard, Award, 
  Stethoscope, Clock, ShieldCheck, ChevronDown, ChevronUp,
  BarChart3, LayoutGrid, Info, Gavel
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Cell, ScatterChart, Scatter, ZAxis, Label
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface OperatorsModuleProps {
  data: OperatorRecord[];
  onRefresh?: () => void;
}

const OperatorsModule: React.FC<OperatorsModuleProps> = ({ data, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCD, setFilterCD] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterEntity, setFilterEntity] = useState('ALL');
  const [filterExamStatus, setFilterExamStatus] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof OperatorRecord; direction: 'asc' | 'desc' } | null>(null);

  // Constants for color coding
  const COLORS = {
    VIGENTE: '#27AE60',   // Green
    PROXIMO: '#E67E22',   // Orange/Yellow
    CRITICO: '#E74C3C',   // Red
    BG: '#F8FAFC'
  };

  const getStatusColor = (days: number) => {
    if (days >= 30) return COLORS.VIGENTE;
    return COLORS.CRITICO;
  };

  const getAlertColor = (op: OperatorRecord) => {
    const minDays = Math.min(
      op.licenseDaysPending, 
      op.courseDaysPending, 
      op.examDaysPending, 
      op.opmDaysPending
    );
    if (minDays >= 30) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  const getAlertIcon = (op: OperatorRecord) => {
    const minDays = Math.min(
      op.licenseDaysPending, 
      op.courseDaysPending, 
      op.examDaysPending, 
      op.opmDaysPending
    );
    if (minDays >= 30) return <ShieldCheck size={16} />;
    return <AlertCircle size={16} />;
  };

  // Filter lists
  const cds = useMemo(() => ['ALL', ...Array.from(new Set(data.map(o => o.cd))).filter(Boolean).sort()], [data]);
  const categories = useMemo(() => ['ALL', ...Array.from(new Set(data.map(o => o.category))).filter(Boolean).sort()], [data]);
  const entities = useMemo(() => ['ALL', ...Array.from(new Set(data.map(o => o.entity))).filter(Boolean).sort()], [data]);
  const examStatuses = useMemo(() => ['ALL', ...Array.from(new Set(data.map(o => o.examStatus))).filter(Boolean).sort()], [data]);

  const calculateExperience = (hireDate: string) => {
    if (!hireDate || hireDate === 'N/A') return '0';
    try {
      const start = new Date(hireDate);
      const now = new Date();
      if (isNaN(start.getTime())) return '0';
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / 30).toString(); // Months
    } catch {
      return '0';
    }
  };

  // Filtered Data
  const [activeAlertFilter, setActiveAlertFilter] = useState<'NONE' | 'LICENSE' | 'COURSE' | 'EXAM' | 'ALL_VALID'>('NONE');

  const filteredData = useMemo(() => {
    return data.filter(op => {
      const matchesSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           op.identification.includes(searchTerm);
      const matchesCD = filterCD === 'ALL' || op.cd === filterCD;
      const matchesCategory = filterCategory === 'ALL' || op.category === filterCategory;
      const matchesEntity = filterEntity === 'ALL' || op.entity === filterEntity;
      const matchesExam = filterExamStatus === 'ALL' || op.examStatus === filterExamStatus;
      
      let matchesAlert = true;
      if (activeAlertFilter === 'LICENSE') matchesAlert = op.licenseDaysPending < 30;
      else if (activeAlertFilter === 'COURSE') matchesAlert = op.courseDaysPending < 30;
      else if (activeAlertFilter === 'EXAM') matchesAlert = op.examDaysPending < 30 || op.examStatus !== 'VIGENTE';
      else if (activeAlertFilter === 'ALL_VALID') {
        matchesAlert = op.licenseDaysPending >= 30 && op.courseDaysPending >= 30 && op.examDaysPending >= 30 && op.opmDaysPending >= 30;
      }

      return matchesSearch && matchesCD && matchesCategory && matchesEntity && matchesExam && matchesAlert;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, searchTerm, filterCD, filterCategory, filterEntity, filterExamStatus, sortConfig, activeAlertFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = filteredData.length;
    const licenseWarning = filteredData.filter(o => o.licenseDaysPending < 30).length;
    const courseWarning = filteredData.filter(o => o.courseDaysPending < 30).length;
    const examWarning = filteredData.filter(o => o.examDaysPending < 30).length;
    const allValid = filteredData.filter(o => 
      o.licenseDaysPending >= 30 && 
      o.courseDaysPending >= 30 && 
      o.examDaysPending >= 30 && 
      o.opmDaysPending >= 30
    ).length;

    return { total, licenseWarning, courseWarning, examWarning, allValid };
  }, [filteredData]);

  const toggleAlertFilter = (type: typeof activeAlertFilter) => {
    setActiveAlertFilter(prev => prev === type ? 'NONE' : type);
  };

  const handleSort = (key: keyof OperatorRecord) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setActiveAlertFilter('NONE')}
          className={`p-6 rounded-[2rem] border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all ${activeAlertFilter === 'NONE' ? 'bg-indigo-100 border-indigo-200' : 'bg-blue-50 border-white'}`}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-blue-600 bg-white shadow-sm">
            <Users size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Activos</span>
          <span className="text-3xl font-black tracking-tighter text-blue-600">{stats.total}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => toggleAlertFilter('LICENSE')}
          className={`p-6 rounded-[2rem] border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all ${activeAlertFilter === 'LICENSE' ? 'bg-amber-100 border-amber-200 ring-2 ring-amber-500/10' : 'bg-amber-50 border-white'}`}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-amber-600 bg-white shadow-sm">
            <CreditCard size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Licencia {'< 30d'}</span>
          <span className="text-3xl font-black tracking-tighter text-amber-600">{stats.licenseWarning}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => toggleAlertFilter('COURSE')}
          className={`p-6 rounded-[2rem] border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all ${activeAlertFilter === 'COURSE' ? 'bg-orange-100 border-orange-200 ring-2 ring-orange-500/10' : 'bg-orange-50 border-white'}`}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-orange-600 bg-white shadow-sm">
            <Award size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Curso Def. {'< 30d'}</span>
          <span className="text-3xl font-black tracking-tighter text-orange-600">{stats.courseWarning}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => toggleAlertFilter('EXAM')}
          className={`p-6 rounded-[2rem] border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all ${activeAlertFilter === 'EXAM' ? 'bg-rose-100 border-rose-200 ring-2 ring-rose-500/10' : 'bg-rose-50 border-white'}`}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-rose-600 bg-white shadow-sm">
            <Stethoscope size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Exámenes {'< 30d'}</span>
          <span className="text-3xl font-black tracking-tighter text-rose-600">{stats.examWarning}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => toggleAlertFilter('ALL_VALID')}
          className={`p-6 rounded-[2rem] border shadow-sm flex flex-col items-center text-center cursor-pointer transition-all ${activeAlertFilter === 'ALL_VALID' ? 'bg-emerald-100 border-emerald-200 ring-2 ring-emerald-500/10' : 'bg-emerald-50 border-white'}`}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-emerald-600 bg-white shadow-sm">
            <ShieldCheck size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Todo Vigente</span>
          <span className="text-3xl font-black tracking-tighter text-emerald-600">{stats.allValid}</span>
        </motion.div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-grow min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o identificación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <select 
            value={filterCD} 
            onChange={(e) => setFilterCD(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {cds.map(cd => <option key={cd} value={cd}>{cd === 'ALL' ? 'CD: TODOS' : cd}</option>)}
          </select>

          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'CATEGORÍA: TODAS' : c}</option>)}
          </select>

          <select 
            value={filterExamStatus} 
            onChange={(e) => setFilterExamStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {examStatuses.map(s => <option key={s} value={s}>{s === 'ALL' ? 'EXAMEN: TODOS' : s}</option>)}
          </select>
        </div>
      </div>

      {/* Main List of Resumes */}
      <div className="space-y-12">
        {filteredData.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
             <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Users size={40} className="text-slate-200" />
             </div>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-2">No se encontraron operadores</h3>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-md mx-auto">
               Verifique los filtros seleccionados o asegúrese de que la base de datos contenga registros válidos.
             </p>
             {onRefresh && (
               <button 
                 onClick={onRefresh}
                 className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
               >
                 Actualizar Datos
               </button>
             )}
          </div>
        ) : (
          filteredData.map((op) => (
            <motion.div 
              key={op.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col lg:flex-row bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 min-h-[400px]"
            >
            {/* Left Column: Personal Info (Dark Sidebar) */}
            <div className="lg:w-1/4 bg-[#0F172A] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
               {/* Background Glow */}
               <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/5 pointer-events-none"></div>
               
               <div className="relative mb-8 group">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-slate-800 border-4 border-slate-700 flex items-center justify-center text-slate-500 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {op.photoUrl ? (
                      <img 
                        src={op.photoUrl} 
                        alt={op.name} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.classList.add('flex');
                        }}
                      />
                    ) : (
                      <UserCircle size={80} strokeWidth={1} />
                    )}
                  </div>
                  <div className="absolute bottom-2 right-2 w-8 h-8 bg-emerald-500 rounded-xl border-4 border-[#0F172A] flex items-center justify-center">
                    <ShieldCheck size={14} className="text-white" />
                  </div>
               </div>

               <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-4 leading-tight">
                 {op.name}
               </h4>
               <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Operador de Montacargas</p>

               <div className="flex flex-col gap-3 w-full">
                 <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/10 transition-colors hover:bg-white/10">
                   <CreditCard size={14} className="text-indigo-400" />
                   <div className="text-left">
                     <span className="block text-[7px] font-black text-indigo-300/50 uppercase tracking-widest">Identificación</span>
                     <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">
                       {op.identification}
                     </span>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/10 transition-colors hover:bg-white/10">
                   <MapPin size={14} className="text-indigo-400" />
                   <div className="text-left">
                     <span className="block text-[7px] font-black text-indigo-300/50 uppercase tracking-widest">Ubicación</span>
                     <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">
                       {op.cd}
                     </span>
                   </div>
                 </div>
               </div>
            </div>

            {/* Right Column: Professional Content */}
            <div className="flex-grow p-8 lg:p-12">
               {/* Header Section */}
               <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                      <Clock size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Expediente Laboral</span>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">Estado: <span className="text-emerald-600 font-black">Activo</span></p>
                    </div>
                  </div>
                  <div className="px-5 py-2 bg-emerald-50 border border-emerald-100 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Activo</span>
                  </div>
               </div>

               {/* Info Grid */}
               <div className="grid grid-cols-2 lg:grid-cols-5 gap-y-8 gap-x-12 mb-12">
                  <div className="space-y-1 group/cd cursor-pointer" onClick={() => setFilterCD(op.cd)}>
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2 group-hover/cd:text-indigo-500 transition-colors">
                      <MapPin size={10} /> Centro Dist.
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover/cd:text-indigo-600 transition-colors">{op.cd}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                      <Building2 size={10} /> Cargo
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{op.position}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                      <Calendar size={10} /> Fecha Ingreso
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{op.hireDate}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                      <CreditCard size={10} /> Identificación
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{op.identification}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                      <Clock size={10} /> Experiencia
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{calculateExperience(op.hireDate)} <span className="text-[10px] opacity-40">Meses</span></p>
                  </div>

                  {/* Second Info row */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                      <Shield size={10} /> Categoría
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{op.category}</p>
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                      <AlertCircle size={10} /> Restricciones
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate" title={op.restrictions}>{op.restrictions || 'Ninguna'}</p>
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                      <Gavel size={10} /> Comparendos
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate" title={op.fines}>{op.fines || 'Sin deudas'}</p>
                  </div>
               </div>

               {/* Document Cards Row */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card: Licencia */}
                  <div className="p-6 rounded-3xl border border-emerald-100 bg-emerald-50/30 flex flex-col gap-6 relative group hover:border-emerald-200 transition-colors">
                     <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600">
                          <CreditCard size={20} />
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-widest ${op.licenseDaysPending < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                          {op.licenseDaysPending >= 30 ? 'Vigente' : 'Crítico'}
                        </div>
                     </div>
                     <div>
                        <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Licencia Conducción</h5>
                        <p className="text-xs font-bold text-slate-500">{op.licenseExpiry}</p>
                     </div>
                     {op.licenseUrl ? (
                        <a 
                          href={op.licenseUrl} 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="w-full py-3 bg-indigo-600 rounded-2xl text-[9px] font-black text-white uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all text-center"
                        >
                           VER DOCUMENTO
                        </a>
                     ) : (
                        <button disabled className="w-full py-3 bg-slate-100 rounded-2xl text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-not-allowed">
                           PENDIENTE
                        </button>
                     )}
                  </div>

                  {/* Card: Manejo Defensivo */}
                  <div className="p-6 rounded-3xl border border-emerald-100 bg-emerald-50/30 flex flex-col gap-6 relative group hover:border-emerald-200 transition-colors">
                     <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600">
                          <Shield size={20} />
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-widest ${op.courseDaysPending < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                           {op.courseDaysPending >= 30 ? 'Vigente' : 'Crítico'}
                        </div>
                     </div>
                     <div>
                        <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Manejo Defensivo</h5>
                        <p className="text-xs font-bold text-slate-500">{op.courseExpiry}</p>
                     </div>
                     {op.courseUrl ? (
                        <a 
                          href={op.courseUrl} 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="w-full py-3 bg-indigo-600 rounded-2xl text-[9px] font-black text-white uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all text-center"
                        >
                           VER DOCUMENTO
                        </a>
                     ) : (
                        <button disabled className="w-full py-3 bg-slate-100 rounded-2xl text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-not-allowed">
                           PENDIENTE
                        </button>
                     )}
                  </div>

                  {/* Card: Exámenes Médicos */}
                  <div className="p-6 rounded-3xl border border-emerald-100 bg-emerald-50/30 flex flex-col gap-6 relative group hover:border-emerald-200 transition-colors">
                     <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600">
                          <Stethoscope size={20} />
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-widest ${op.examDaysPending < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                           {op.examDaysPending >= 30 ? 'Vigente' : 'Crítico'}
                        </div>
                     </div>
                     <div>
                        <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Exámenes Médicos</h5>
                        <p className="text-xs font-bold text-slate-500">{op.examExpiry}</p>
                     </div>
                     {op.examUrl ? (
                        <a 
                          href={op.examUrl} 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="w-full py-3 bg-indigo-600 rounded-2xl text-[9px] font-black text-white uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all text-center"
                        >
                           VER DOCUMENTO
                        </a>
                     ) : (
                        <button disabled className="w-full py-3 bg-slate-100 rounded-2xl text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-not-allowed">
                           PENDIENTE
                        </button>
                     )}
                  </div>

                  {/* Card: Certificado OPM */}
                  <div className="p-6 rounded-3xl border border-emerald-100 bg-emerald-50/30 flex flex-col gap-6 relative group hover:border-emerald-200 transition-colors">
                     <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600">
                          <ShieldCheck size={20} />
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-widest ${op.opmDaysPending < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                           {op.opmDaysPending >= 30 ? 'Vigente' : 'Crítico'}
                        </div>
                     </div>
                     <div>
                        <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Certificado OPM</h5>
                        <p className="text-xs font-bold text-slate-500">{op.opmExpiry}</p>
                     </div>
                     {op.opmUrl ? (
                        <a 
                          href={op.opmUrl} 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="w-full py-3 bg-indigo-600 rounded-2xl text-[9px] font-black text-white uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all text-center"
                        >
                           VER DOCUMENTO
                        </a>
                     ) : (
                        <button disabled className="w-full py-3 bg-slate-100 rounded-2xl text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-not-allowed">
                           PENDIENTE
                        </button>
                     )}
                  </div>
               </div>
            </div>
          </motion.div>
        ))
       )}
      </div>


      {/* Expiry Calendar / Upcoming list */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
         
         <div className="relative z-10">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Cronograma de Vencimientos</h3>
                  <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Próximos 6 meses</p>
               </div>
               <div className="flex gap-4">
                  <div className="text-center px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                     <span className="block text-[8px] font-black opacity-40 uppercase tracking-widest">Próxima Semana</span>
                     <span className="text-xl font-black text-amber-500">
                       {data.filter(op => {
                         const min = Math.min(op.licenseDaysPending, op.courseDaysPending, op.examDaysPending, op.opmDaysPending);
                         return min >= 0 && min <= 7;
                       }).length}
                     </span>
                  </div>
                  <div className="text-center px-4 py-2 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                     <span className="block text-[8px] font-black text-rose-400 uppercase tracking-widest">Vence Hoy</span>
                     <span className="text-xl font-black text-rose-500">
                        {data.filter(op => {
                         const min = Math.min(op.licenseDaysPending, op.courseDaysPending, op.examDaysPending, op.opmDaysPending);
                         return min === 0;
                       }).length}
                     </span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* Just showing top 6 soon to expire */}
               {data
                 .map(op => ({ ...op, minDays: Math.min(op.licenseDaysPending, op.courseDaysPending, op.examDaysPending, op.opmDaysPending) }))
                 .filter(op => op.minDays >= 0)
                 .sort((a, b) => a.minDays - b.minDays)
                 .slice(0, 6)
                 .map((op, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all group">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                              <UserCircle size={20} />
                           </div>
                           <div>
                              <p className="text-xs font-black uppercase tracking-tight">{op.name}</p>
                              <p className="text-[10px] font-bold text-slate-500">{op.cd}</p>
                           </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black ${op.minDays < 15 ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                           {op.minDays} Días
                        </div>
                     </div>
                     
                     <div className="space-y-2">
                        {[
                          { label: 'Licencia', days: op.licenseDaysPending, date: op.licenseExpiry, icon: CreditCard },
                          { label: 'Curso', days: op.courseDaysPending, date: op.courseExpiry, icon: Award },
                          { label: 'Examen', days: op.examDaysPending, date: op.examExpiry, icon: Stethoscope },
                        ].map((d, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px]">
                             <div className="flex items-center gap-2 opacity-60">
                                <d.icon size={12} />
                                <span className="font-bold">{d.label}</span>
                             </div>
                             <span className={`font-black ${d.days < 30 ? 'text-rose-400' : 'text-slate-300'}`}>{d.date}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                 ))}
            </div>
            
            {data.filter(op => Math.min(op.licenseDaysPending, op.courseDaysPending, op.examDaysPending, op.opmDaysPending) < 0).length > 0 && (
              <div className="mt-12 bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl">
                 <h4 className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertCircle size={14} /> Conductores con Documentos Vencidos
                 </h4>
                 <div className="flex flex-wrap gap-3">
                    {data
                      .filter(op => Math.min(op.licenseDaysPending, op.courseDaysPending, op.examDaysPending, op.opmDaysPending) < 0)
                      .map((op, i) => (
                        <div key={i} className="bg-rose-900/40 border border-rose-500/30 px-4 py-2 rounded-2xl flex items-center gap-3">
                           <span className="text-[10px] font-black uppercase tracking-tight">{op.name}</span>
                           <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-lg whitespace-nowrap">
                             {Math.min(op.licenseDaysPending, op.courseDaysPending, op.examDaysPending, op.opmDaysPending)} d
                           </span>
                        </div>
                      ))
                    }
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default OperatorsModule;
