import React, { useState, useMemo } from 'react';
import { FuelPerformance } from '../types';
import { Search, Filter, Calendar, Truck, User, Fuel, TrendingUp, Award, Building2, ChevronLeft, ChevronRight, Gauge, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { normalizePlate } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LabelList, LineChart, Line
} from 'recharts';

interface FuelPerformanceModuleProps {
  fuelData: FuelPerformance[];
}

const FuelPerformanceModule: React.FC<FuelPerformanceModuleProps> = ({ fuelData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedContractor, setSelectedContractor] = useState('');
  const [selectedCd, setSelectedCd] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const contractors = useMemo(() => {
    const unique = new Set(fuelData.map(c => c.contractor).filter(Boolean));
    return Array.from(unique).sort();
  }, [fuelData]);

  const cds = useMemo(() => {
    const unique = new Set(fuelData.map(c => c.cd).filter(Boolean));
    return Array.from(unique).sort();
  }, [fuelData]);

  const filteredData = useMemo(() => {
    return fuelData.filter(item => {
      const matchesSearch = normalizePlate(item.plate).includes(normalizePlate(searchTerm)) ||
        item.contractor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cd.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      if (selectedContractor && item.contractor !== selectedContractor) return false;
      if (selectedCd && item.cd !== selectedCd) return false;

      return true;
    });
  }, [fuelData, searchTerm, selectedContractor, selectedCd]);

  const stats = useMemo(() => {
    const totalMileage = filteredData.reduce((acc, curr) => acc + curr.mileage, 0);
    const totalGallons = filteredData.reduce((acc, curr) => acc + curr.gallons, 0);
    const totalSpeeding = filteredData.reduce((acc, curr) => acc + curr.speeding, 0);
    const totalIdling = filteredData.reduce((acc, curr) => acc + curr.idlingCount, 0);
    const avgKmpg = totalGallons > 0 ? totalMileage / totalGallons : 0;
    
    // Monthly KMPG
    const monthlyKmpg: Record<string, { mileage: number, gallons: number }> = {};
    filteredData.forEach(d => {
      const month = d.month || 'N/A';
      if (!monthlyKmpg[month]) monthlyKmpg[month] = { mileage: 0, gallons: 0 };
      monthlyKmpg[month].mileage += d.mileage;
      monthlyKmpg[month].gallons += d.gallons;
    });

    const monthlyChartData = Object.entries(monthlyKmpg).map(([month, vals]) => ({
      name: month,
      KMPG: vals.gallons > 0 ? parseFloat((vals.mileage / vals.gallons).toFixed(2)) : 0
    }));

    // Compliance stats
    const avgCompliance = filteredData.length > 0 
      ? filteredData.reduce((acc, curr) => acc + curr.compliance, 0) / filteredData.length 
      : 0;

    return { totalMileage, totalGallons, totalSpeeding, totalIdling, avgKmpg, monthlyChartData, avgCompliance };
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b p-6 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <Fuel className="text-orange-600" size={28} />
              Rendimiento de Combustible
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Seguimiento de consumo y eficiencia por unidad
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-grow lg:w-48">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  className="w-full pl-10 pr-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold uppercase tracking-tight transition-all outline-none shadow-inner appearance-none cursor-pointer"
                  value={selectedCd}
                  onChange={(e) => {
                    setSelectedCd(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">TODOS LOS CD</option>
                  {cds.map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="relative flex-grow lg:w-48">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  className="w-full pl-10 pr-3 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold uppercase tracking-tight transition-all outline-none shadow-inner appearance-none cursor-pointer"
                  value={selectedContractor}
                  onChange={(e) => {
                    setSelectedContractor(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">TODOS LOS CONTRATISTAS</option>
                  {contractors.map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por placa o contratista..."
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

      <div className="flex-grow overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">KM Totales</p>
              <p className="text-xl font-black text-slate-800">{stats.totalMileage.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
              <Fuel size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Galones Totales</p>
              <p className="text-xl font-black text-slate-800">{stats.totalGallons.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Gauge size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Promedio KM/GAL</p>
              <p className="text-xl font-black text-slate-800">{stats.avgKmpg.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Excesos Velocidad</p>
              <p className="text-xl font-black text-slate-800">{stats.totalSpeeding.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Ralentí {'>'} 5 min</p>
              <p className="text-xl font-black text-slate-800">{stats.totalIdling.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-indigo-600" />
              Rendimiento Mensual (KM/GAL)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="KMPG" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40}>
                    <LabelList dataKey="KMPG" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6366f1' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6 w-full">
              <Award size={18} className="text-emerald-600" />
              Cumplimiento de Meta General
            </h3>
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Cumplimiento', value: stats.avgCompliance },
                      { name: 'Restante', value: Math.max(0, 100 - stats.avgCompliance) }
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={80} startAngle={90} endAngle={450} dataKey="value" stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-emerald-600">{stats.avgCompliance.toFixed(1)}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meta</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-[#005f73] px-6 py-4">
            <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <Fuel size={20} />
              Registro de Rendimiento
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#005f73] border-t border-white/10">
                  <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">MES/SEM</th>
                  <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">CD</th>
                  <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest">PLACA</th>
                  <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest text-right">KM</th>
                  <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest text-right">GAL</th>
                  <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest text-right">KM/GAL</th>
                  <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest text-right">EXC. VEL</th>
                  <th className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest text-right">RALENTÍ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-600">
                      {item.month} / {item.week}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">{item.cd}</td>
                    <td className="px-6 py-4 text-xs font-black text-slate-800">{item.plate}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 text-right">{item.mileage.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 text-right">{item.gallons.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs font-black text-indigo-600 text-right">{item.kmpg.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs font-bold text-rose-600 text-right">{item.speeding}</td>
                    <td className="px-6 py-4 text-xs font-bold text-amber-600 text-right">
                      <div className="flex flex-col items-end">
                        <span>{item.idlingCount} veces</span>
                        <span className="text-[9px] opacity-60">{item.idlingTime}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:text-indigo-600 disabled:opacity-30"><ChevronLeft size={20}/></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 hover:text-indigo-600 disabled:opacity-30"><ChevronRight size={20}/></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FuelPerformanceModule;
