import React, { useState, useMemo } from 'react';
import { VaradaRecord, Vehicle } from '../types';
import { getWeekNumber, normalizePlate } from '../utils';
import { 
  AlertTriangle, Plus, Search, RefreshCw, Filter, Truck, Calendar, 
  MapPin, Wrench, ShieldAlert, Clock, CheckCircle2, FileText, X, Loader2, ExternalLink, Download
} from 'lucide-react';
import Papa from 'papaparse';

interface VaradasModuleProps {
  vehicles: Vehicle[];
  varadas: VaradaRecord[];
  onRefresh: () => void;
  onSubmitVarada: (data: Partial<VaradaRecord>) => Promise<boolean>;
  loading?: boolean;
}

const SYSTEMS_LIST = [
  'MOTOR',
  'FRENOS',
  'TRANSMISIÓN',
  'SISTEMA ELÉCTRICO',
  'SUSPENSIÓN / DIRECCIÓN',
  'NEUMÁTICOS',
  'REFRIGERACIÓN',
  'CABINA / CHASIS',
  'ESTRUCTURA',
  'OTROS'
];

export const VaradasModule: React.FC<VaradasModuleProps> = ({
  vehicles,
  varadas,
  onRefresh,
  onSubmitVarada,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [systemFilter, setSystemFilter] = useState('ALL');
  const [towedFilter, setTowedFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [weekFilter, setWeekFilter] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State
  const initialDate = new Date().toISOString().split('T')[0];
  const defaultWeek = `S${getWeekNumber(new Date())}`;

  const [formData, setFormData] = useState({
    week: defaultWeek,
    breakdownDate: initialDate,
    plate: '',
    location: '',
    system: 'MOTOR',
    component: '',
    description: '',
    workshop: '',
    towed: 'NO',
    solutionDate: '',
    observation: '',
    hoursDown: '',
    evidence: ''
  });

  const uniqueWeeks = useMemo(() => {
    const weeks = Array.from(new Set(varadas.map(v => v.week).filter(Boolean)));
    return weeks.sort();
  }, [varadas]);

  const filteredVaradas = useMemo(() => {
    return varadas.filter(item => {
      const matchesSearch = 
        !searchTerm ||
        item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.workshop.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.component.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSystem = systemFilter === 'ALL' || item.system.toUpperCase().includes(systemFilter.toUpperCase());
      const matchesTowed = towedFilter === 'ALL' || item.towed.toUpperCase() === towedFilter.toUpperCase();
      
      const isSolved = Boolean(item.solutionDate && item.solutionDate.trim() !== '');
      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'SOLVED' && isSolved) || 
        (statusFilter === 'PENDING' && !isSolved);

      const matchesWeek = weekFilter === 'ALL' || item.week === weekFilter;

      return matchesSearch && matchesSystem && matchesTowed && matchesStatus && matchesWeek;
    });
  }, [varadas, searchTerm, systemFilter, towedFilter, statusFilter, weekFilter]);

  // KPI Calculations
  const totalVaradas = filteredVaradas.length;
  
  const totalHours = useMemo(() => {
    return filteredVaradas.reduce((acc, curr) => {
      const h = typeof curr.hoursDown === 'number' ? curr.hoursDown : parseFloat(String(curr.hoursDown || 0).replace(',', '.'));
      return acc + (isNaN(h) ? 0 : h);
    }, 0);
  }, [filteredVaradas]);

  const towedCount = useMemo(() => {
    return filteredVaradas.filter(v => v.towed.toUpperCase() === 'SI').length;
  }, [filteredVaradas]);

  const pendingCount = useMemo(() => {
    return filteredVaradas.filter(v => !v.solutionDate || v.solutionDate.trim() === '').length;
  }, [filteredVaradas]);

  const handleDateChange = (dateVal: string) => {
    let weekVal = defaultWeek;
    if (dateVal) {
      const d = new Date(dateVal + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        weekVal = `S${getWeekNumber(d)}`;
      }
    }
    setFormData(prev => ({
      ...prev,
      breakdownDate: dateVal,
      week: weekVal
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.breakdownDate || !formData.location || !formData.description) {
      setSubmitError('Por favor completa los campos obligatorios: Placa, Fecha, Lugar y Descripción.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const success = await onSubmitVarada(formData);
      if (success) {
        setSubmitSuccess('¡Varada registrada exitosamente en Google Sheets!');
        setFormData({
          week: defaultWeek,
          breakdownDate: initialDate,
          plate: '',
          location: '',
          system: 'MOTOR',
          component: '',
          description: '',
          workshop: '',
          towed: 'NO',
          solutionDate: '',
          observation: '',
          hoursDown: '',
          evidence: ''
        });
        setTimeout(() => {
          setShowModal(false);
          setSubmitSuccess(null);
        }, 1500);
      } else {
        setSubmitError('Hubo un inconveniente al enviar la varada. Revisa la conexión o intenta de nuevo.');
      }
    } catch (err: any) {
      setSubmitError('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredVaradas.length === 0) {
      alert("No hay varadas para exportar");
      return;
    }

    const exportData = filteredVaradas.map(v => ({
      'SEMANA': v.week,
      'FECHA DE VARADA': v.breakdownDate,
      'PLACA': v.plate,
      'LUGAR DE VARADA': v.location,
      'SISTEMA': v.system,
      'COMPONENTE': v.component,
      'DESCRIPCION': v.description,
      'TALLER QUE PRESTA EL SERVICIO': v.workshop,
      'TRANSPORTADO EN GRUA': v.towed,
      'FECHA DE SOLUCION': v.solutionDate || '',
      'OBSERVACION': v.observation || '',
      'HORAS VARADOS': v.hoursDown || '',
      'EVIDENCIA': v.evidence || ''
    }));

    const csv = Papa.unparse(exportData, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Varadas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide uppercase">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              Módulo de Gestión
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              REGISTRO Y SEGUIMIENTO DE VARADAS
            </h1>
            <p className="text-slate-400 text-xs md:text-sm max-w-2xl">
              Registro oportuno de vehículos varados, diagnóstico de sistemas, servicio de grúa y tiempos de paralización con sincronización directa en Google Sheets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 disabled:opacity-50"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Registrar Varada
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total Varadas</p>
              <h3 className="text-2xl md:text-3xl font-black text-white mt-1">{totalVaradas}</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">Varadas registradas en el periodo</div>
        </div>

        <div className="bg-[#1E293B] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Horas Varados</p>
              <h3 className="text-2xl md:text-3xl font-black text-amber-400 mt-1">{totalHours.toFixed(1)} h</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">Acumulado de horas de inoperatividad</div>
        </div>

        <div className="bg-[#1E293B] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Transportado en Grúa</p>
              <h3 className="text-2xl md:text-3xl font-black text-rose-400 mt-1">{towedCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
              <Truck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">Vehículos movilizados con remolque</div>
        </div>

        <div className="bg-[#1E293B] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Pendientes Solución</p>
              <h3 className="text-2xl md:text-3xl font-black text-amber-400 mt-1">{pendingCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">Novedades aún sin fecha de cierre</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#1E293B] p-4 rounded-2xl border border-slate-800 shadow-lg space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por placa, lugar, taller, descripción..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {/* System Filter */}
          <div>
            <select
              value={systemFilter}
              onChange={e => setSystemFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 transition-all"
            >
              <option value="ALL">Todos los Sistemas</option>
              {SYSTEMS_LIST.map(sys => (
                <option key={sys} value={sys}>{sys}</option>
              ))}
            </select>
          </div>

          {/* Towed Filter */}
          <div>
            <select
              value={towedFilter}
              onChange={e => setTowedFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 transition-all"
            >
              <option value="ALL">Grúa: Todos</option>
              <option value="SI">Con Grúa (SI)</option>
              <option value="NO">Sin Grúa (NO)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 transition-all"
            >
              <option value="ALL">Estado: Todos</option>
              <option value="SOLVED">Solucionados</option>
              <option value="PENDING">Pendientes</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>Semana:</span>
            <select
              value={weekFilter}
              onChange={e => setWeekFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
            >
              <option value="ALL">Todas las semanas</option>
              {uniqueWeeks.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <span className="text-slate-500">
              Mostrando {filteredVaradas.length} de {varadas.length} varadas
            </span>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3.5 px-4">Semana</th>
                <th className="py-3.5 px-4">Fecha Varada</th>
                <th className="py-3.5 px-4">Placa</th>
                <th className="py-3.5 px-4">Lugar</th>
                <th className="py-3.5 px-4">Sistema / Componente</th>
                <th className="py-3.5 px-4 max-w-[200px]">Descripción</th>
                <th className="py-3.5 px-4">Taller</th>
                <th className="py-3.5 px-4 text-center">Grúa</th>
                <th className="py-3.5 px-4">Solución</th>
                <th className="py-3.5 px-4 text-right">Horas</th>
                <th className="py-3.5 px-4 text-center">Evidencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {filteredVaradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
                    <p className="font-medium text-slate-400">No se encontraron registros de varadas</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {varadas.length === 0 ? 'Haz clic en "Registrar Varada" para agregar la primera.' : 'Prueba cambiando los filtros de búsqueda.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVaradas.map((item, index) => {
                  const isTowed = item.towed.toUpperCase() === 'SI';
                  const isSolved = Boolean(item.solutionDate && item.solutionDate.trim() !== '');

                  return (
                    <tr key={item.id || index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-amber-400">{item.week || '-'}</td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap">{item.breakdownDate || '-'}</td>
                      <td className="py-3 px-4 font-black text-white whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-amber-300">
                          {item.plate}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{item.location || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-200">{item.system}</span>
                        {item.component && (
                          <div className="text-[11px] text-slate-400">{item.component}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-[220px] text-slate-300 truncate" title={item.description}>
                        {item.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{item.workshop || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {isTowed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <Truck className="w-3 h-3" /> SI
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                            NO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSolved ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {item.solutionDate}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-medium bg-amber-500/10 px-2 py-0.5 rounded-full">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                        {item.hoursDown !== undefined && item.hoursDown !== '' ? `${item.hoursDown} h` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.evidence && item.evidence.startsWith('http') ? (
                          <a
                            href={item.evidence}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline text-[11px]"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Ver
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Registrar Varada */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1E293B] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">REGISTRAR NUEVA VARADA</h2>
                  <p className="text-xs text-slate-400">Guarda directo en la hoja "VARADAS" de Google Sheets</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {submitSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  {submitSuccess}
                </div>
              )}

              {submitError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Semana */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Semana
                  </label>
                  <input
                    type="text"
                    value={formData.week}
                    onChange={e => setFormData({ ...formData, week: e.target.value })}
                    placeholder="Ej: S31"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Fecha Varada */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Fecha Varada *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.breakdownDate}
                    onChange={e => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Placa */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Placa *
                  </label>
                  <input
                    type="text"
                    required
                    list="vehicles-list"
                    placeholder="Ej: STT123"
                    value={formData.plate}
                    onChange={e => setFormData({ ...formData, plate: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500 uppercase"
                  />
                  <datalist id="vehicles-list">
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plate} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lugar */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Lugar de Varada *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Vía 40 con Calle 85 / CD Galapa"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Sistema */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Sistema *
                  </label>
                  <select
                    value={formData.system}
                    onChange={e => setFormData({ ...formData, system: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    {SYSTEMS_LIST.map(sys => (
                      <option key={sys} value={sys}>{sys}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Componente */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Componente
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Alternador, Bomba de agua"
                    value={formData.component}
                    onChange={e => setFormData({ ...formData, component: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Taller que presta el servicio */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Taller que presta el servicio
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Taller Móvil / Taller Integral"
                    value={formData.workshop}
                    onChange={e => setFormData({ ...formData, workshop: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Descripción de la Varada *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detalle de la falla o motivo de inoperatividad..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Transportado en Grúa */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Transportado en Grúa
                  </label>
                  <select
                    value={formData.towed}
                    onChange={e => setFormData({ ...formData, towed: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>

                {/* Fecha Solución */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Fecha de Solución
                  </label>
                  <input
                    type="date"
                    value={formData.solutionDate}
                    onChange={e => setFormData({ ...formData, solutionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Horas Varados */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Horas Varados
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Ej: 4.5"
                    value={formData.hoursDown}
                    onChange={e => setFormData({ ...formData, hoursDown: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Comentarios adicionales o repuestos requeridos..."
                  value={formData.observation}
                  onChange={e => setFormData({ ...formData, observation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Evidencia */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Evidencia / Enlace de Fotografía
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.evidence}
                  onChange={e => setFormData({ ...formData, evidence: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      Guardar Varada
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
