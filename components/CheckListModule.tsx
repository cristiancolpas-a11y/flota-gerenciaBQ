import React, { useState, useMemo } from 'react';
import { CheckList } from '../types';
import { Search, Filter, Calendar, Truck, User, ClipboardList, Clock, Building2, Hash, ChevronLeft, ChevronRight, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { normalizePlate } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LabelList, LineChart, Line
} from 'recharts';

interface CheckListModuleProps {
  checkLists: CheckList[];
}

const CheckListModule: React.FC<CheckListModuleProps> = ({ checkLists }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'dashboard' | 'table'>('dashboard');
  const itemsPerPage = 15;

  const filteredData = useMemo(() => {
    return checkLists.filter(item => 
      normalizePlate(item.vehiculo).includes(normalizePlate(searchTerm)) ||
      item.conductor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.empresa.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      const dateA = a.fecha ? new Date(a.fecha).getTime() : 0;
      const dateB = b.fecha ? new Date(b.fecha).getTime() : 0;
      return dateB - dateA;
    });
  }, [checkLists, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const salidas100 = filteredData.filter(d => d.salida === '100%').length;
    const retornos100 = filteredData.filter(d => d.retorno === '100%').length;
    
    // Top Offender (Most active drivers)
    const driverCounts: Record<string, number> = {};
    filteredData.forEach(d => {
      if (d.conductor && d.conductor !== 'sin datos') {
        driverCounts[d.conductor] = (driverCounts[d.conductor] || 0) + 1;
      }
    });
    const topDrivers = Object.entries(driverCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Weekly General Compliance (Salida vs Retorno)
    const weeklyGeneral: Record<string, { total: number, salida100: number, retorno100: number }> = {};
    filteredData.forEach(d => {
      const week = `S${d.semana}`;
      if (!weeklyGeneral[week]) weeklyGeneral[week] = { total: 0, salida100: 0, retorno100: 0 };
      weeklyGeneral[week].total++;
      if (d.salida === '100%') weeklyGeneral[week].salida100++;
      if (d.retorno === '100%') weeklyGeneral[week].retorno100++;
    });

    const weeklyGeneralChartData = Object.entries(weeklyGeneral).map(([week, vals]) => ({
      name: week,
      Salida: Math.round((vals.salida100 / vals.total) * 100),
      Retorno: Math.round((vals.retorno100 / vals.total) * 100)
    })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // Monthly General Compliance (Salida vs Retorno)
    const monthlyGeneral: Record<string, { total: number, salida100: number, retorno100: number }> = {};
    filteredData.forEach(d => {
      let month = 'N/A';
      if (d.fecha) {
        const date = new Date(d.fecha);
        if (!isNaN(date.getTime())) {
          month = date.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
        }
      }
      if (!monthlyGeneral[month]) monthlyGeneral[month] = { total: 0, salida100: 0, retorno100: 0 };
      monthlyGeneral[month].total++;
      if (d.salida === '100%') monthlyGeneral[month].salida100++;
      if (d.retorno === '100%') monthlyGeneral[month].retorno100++;
    });

    const monthlyGeneralChartData = Object.entries(monthlyGeneral).map(([month, vals]) => ({
      name: month,
      Salida: Math.round((vals.salida100 / vals.total) * 100),
      Retorno: Math.round((vals.retorno100 / vals.total) * 100)
    }));

    // ARO Data (Salida vs Retorno)
    const aroData = {
      salida: total > 0 ? Math.round((salidas100 / total) * 100) : 0,
      retorno: total > 0 ? Math.round((retornos100 / total) * 100) : 0
    };

    return { total, salidas100, retornos100, topDrivers, weeklyGeneralChartData, monthlyGeneralChartData, aroData };
  }, [filteredData]);

  const DonutChart = ({ value, label }: { value: number, label: string }) => {
    const data = [
      { name: 'Cumplió', value: value },
      { name: 'Le faltó', value: 100 - value }
    ];
    return (
      <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-2xl border border-slate-200 w-full shadow-inner">
        <p className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">{label}</p>
        <div className="relative w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                startAngle={90}
                endAngle={450}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-black text-slate-900">{value}%</span>
          </div>
        </div>
      </div>
    );
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header & Search */}
      <div className="bg-white border-b p-6 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <ClipboardList className="text-indigo-600" size={28} />
              Check List de Vehículos
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Registro histórico de inspecciones y novedades
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  viewMode === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <TrendingUp size={16} />
                Dashboard
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ClipboardList size={16} />
                Tabla
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-12 pr-4 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-2xl text-sm font-medium transition-all outline-none shadow-inner"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 shrink-0">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <ClipboardList size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Viajes</p>
                <p className="text-2xl font-black text-slate-800">{stats.total}</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <Truck size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Salidas 100%</p>
                <p className="text-2xl font-black text-slate-800">{stats.salidas100}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <User size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Retornos 100%</p>
                <p className="text-2xl font-black text-slate-800">{stats.retornos100}</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 mb-6 overflow-auto pb-6">
            {/* Weekly General Compliance */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={18} className="text-indigo-600" />
                  Cumplimiento Semanal General
                </h3>
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salida vs Retorno</span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.weeklyGeneralChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                      unit="%"
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      cursor={{fill: '#f8fafc'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '20px'}} />
                    <Bar dataKey="Salida" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="Retorno" fill="#059669" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ARO Charts */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                <Award size={18} className="text-indigo-600" />
                ADH - Cumplimiento General (ARO)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <DonutChart value={stats.aroData.salida} label="ADH SALIDA %" />
                <DonutChart value={stats.aroData.retorno} label="ADH RETORNO %" />
              </div>
            </div>

            {/* Top Performer (Most Active) */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                <Award size={18} className="text-emerald-600" />
                Top Conductores (Más Activos)
              </h3>
              <div className="space-y-4">
                {stats.topDrivers.map((driver, idx) => (
                  <div key={driver.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                        idx === 0 ? 'bg-amber-100 text-amber-600' : 
                        idx === 1 ? 'bg-slate-200 text-slate-600' : 
                        idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{driver.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checklists realizados</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-indigo-600">{driver.count}</span>
                    </div>
                  </div>
                ))}
                {stats.topDrivers.length === 0 && (
                  <div className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    No hay datos de conductores
                  </div>
                )}
              </div>
            </div>

            {/* Monthly General Compliance */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                <Calendar size={18} className="text-indigo-600" />
                Cumplimiento Mensual General (Salida vs Retorno)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyGeneralChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                      unit="%"
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      cursor={{fill: '#f8fafc'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '20px'}} />
                    <Bar dataKey="Salida" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="Retorno" fill="#059669" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Table Content */
        <div className="flex-grow overflow-auto px-6 pb-6 mt-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha / Semana</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehículo</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Conductor / Empresa</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salida / Retorno</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Novedades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <Calendar size={14} className="text-indigo-500" />
                              {item.fecha || 'N/A'}
                            </span>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                              Semana {item.semana}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                            <Truck size={16} className="text-slate-500 group-hover:text-indigo-500" />
                            <span className="text-sm font-black text-slate-800 tracking-tighter">{item.vehiculo}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <User size={14} className="text-slate-400" />
                              {item.conductor}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                              <Building2 size={10} />
                              {item.empresa}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              <span className="text-xs font-bold text-slate-600">S: {item.salida}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                              <span className="text-xs font-bold text-slate-600">R: {item.retorno}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            item.estado.toUpperCase() === 'OPERATIVO' || item.estado.toUpperCase() === 'CUMPLIÓ'
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                              item.estado.toUpperCase() === 'OPERATIVO' || item.estado.toUpperCase() === 'CUMPLIÓ' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}></div>
                            {item.estado.toUpperCase() === 'LE FALTÓ' || item.estado.toUpperCase() === 'LE FALTO' ? 'LE FALTÓ' : item.estado}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs text-slate-500 font-medium max-w-xs line-clamp-2 italic">
                            {item.novedades || 'Sin novedades registradas'}
                          </p>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                            <Search size={40} />
                          </div>
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No se encontraron registros</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      // Only show current, first, last, and neighbors
                      if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                              currentPage === page 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="text-slate-300">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckListModule;
