import React, { useState, useMemo } from 'react';
import { VaradaRecord, Vehicle } from '../types';
import { getWeekNumber } from '../utils';
import { 
  AlertTriangle, Plus, Search, RefreshCw, Truck, Clock, 
  CheckCircle2, X, Loader2, ExternalLink, Download, Upload, 
  Image as ImageIcon, Trash2, Camera, Link, Maximize2
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

const WORKSHOPS_LIST = [
  'AUTECO',
  'AUTOMUNDIAL',
  'CAMION COLOMBIA',
  'COUNTRY MOTORS',
  'COUNTRY TRUCK',
  'COEXITO',
  'DIVERMOTORS',
  'ELECTRONIC',
  'ETM',
  'GARCILLANTAS',
  'GLASS LAMINADO',
  'IVESUR',
  'NAVISAFT',
  'NAVITRANS',
  'ROINCOR',
  'TECNIBENZ',
  'TODOFIBRAS',
  'TRAMICON',
  'VEHIPESA',
  'TALLER MÓVIL',
  'TALLER PROPIO',
  'OTROS'
];

// Helper to get local date and time formatted for <input type="datetime-local">
const getNowLocalDateTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper to calculate hours between two date-time strings
const calculateHoursDown = (startStr: string, endStr: string): string => {
  if (!startStr || !endStr) return '';
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '';
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return '0';
  const hours = diffMs / (1000 * 60 * 60);
  return (Math.round(hours * 10) / 10).toString();
};

// Helper to compress image before storing as data URL
const compressImage = (dataUrl: string, maxDim = 1000, quality = 0.8, callback: (res: string) => void) => {
  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', quality));
    } else {
      callback(dataUrl);
    }
  };
  img.onerror = () => callback(dataUrl);
};

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

  // Drag and drop & paste state
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form State
  const initialDateTime = getNowLocalDateTime();
  const defaultWeek = `S${getWeekNumber(new Date())}`;

  const [formData, setFormData] = useState({
    week: defaultWeek,
    breakdownDate: initialDateTime,
    plate: '',
    location: '',
    system: 'MOTOR',
    component: '',
    description: '',
    workshop: '',
    otherWorkshop: '',
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

  // Handlers for dates and automatic hours calculation
  const handleBreakdownDateChange = (val: string) => {
    let weekVal = formData.week;
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        weekVal = `S${getWeekNumber(d)}`;
      }
    }
    const autoHours = calculateHoursDown(val, formData.solutionDate);
    setFormData(prev => ({
      ...prev,
      breakdownDate: val,
      week: weekVal,
      hoursDown: autoHours !== '' ? autoHours : prev.hoursDown
    }));
  };

  const handleSolutionDateChange = (val: string) => {
    const autoHours = calculateHoursDown(formData.breakdownDate, val);
    setFormData(prev => ({
      ...prev,
      solutionDate: val,
      hoursDown: autoHours !== '' ? autoHours : prev.hoursDown
    }));
  };

  // Image File Handling
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSubmitError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        compressImage(dataUrl, 1000, 0.8, (compressed) => {
          setFormData(prev => ({ ...prev, evidence: compressed }));
          setSubmitError(null);
        });
      }
    };
    reader.readAsDataURL(file);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || !formData.breakdownDate || !formData.location || !formData.description) {
      setSubmitError('Por favor completa los campos obligatorios: Placa, Fecha y Hora de Varada, Lugar y Descripción.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    // Format breakdownDate and solutionDate for sheet submission (e.g., YYYY-MM-DD HH:mm)
    const formattedBreakdown = formData.breakdownDate.replace('T', ' ');
    const formattedSolution = formData.solutionDate ? formData.solutionDate.replace('T', ' ') : '';
    const finalWorkshop = formData.workshop === 'OTROS' ? formData.otherWorkshop : formData.workshop;

    try {
      const success = await onSubmitVarada({
        ...formData,
        workshop: finalWorkshop,
        breakdownDate: formattedBreakdown,
        solutionDate: formattedSolution
      });

      if (success) {
        setSubmitSuccess('¡Varada registrada exitosamente en Google Sheets!');
        setFormData({
          week: defaultWeek,
          breakdownDate: getNowLocalDateTime(),
          plate: '',
          location: '',
          system: 'MOTOR',
          component: '',
          description: '',
          workshop: '',
          otherWorkshop: '',
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
              Registro oportuno de vehículos varados con fecha y hora, cálculo automático de horas de inoperatividad, carga de evidencias fotográficas y sincronización con Google Sheets.
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
              onClick={() => {
                setFormData({
                  week: `S${getWeekNumber(new Date())}`,
                  breakdownDate: getNowLocalDateTime(),
                  plate: '',
                  location: '',
                  system: 'MOTOR',
                  component: '',
                  description: '',
                  workshop: '',
                  otherWorkshop: '',
                  towed: 'NO',
                  solutionDate: '',
                  observation: '',
                  hoursDown: '',
                  evidence: ''
                });
                setShowModal(true);
              }}
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
              <Clock className="w-6 h-6 animate-spin" />
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
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3.5 px-4">Semana</th>
                <th className="py-3.5 px-4">Fecha / Hora Varada</th>
                <th className="py-3.5 px-4">Placa</th>
                <th className="py-3.5 px-4">Lugar</th>
                <th className="py-3.5 px-4">Sistema / Componente</th>
                <th className="py-3.5 px-4 max-w-[200px]">Descripción</th>
                <th className="py-3.5 px-4">Taller</th>
                <th className="py-3.5 px-4 text-center">Transportado en Grúa (Col. I)</th>
                <th className="py-3.5 px-4">Fecha / Hora Solución</th>
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
                  const formattedBreakdown = (item.breakdownDate || '-').replace('T', ' ');
                  const formattedSolution = (item.solutionDate || '-').replace('T', ' ');

                  const hasEvidence = Boolean(item.evidence && item.evidence.trim() !== '');

                  return (
                    <tr key={item.id || index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-amber-400">{item.week || '-'}</td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap text-slate-200">
                        {formattedBreakdown}
                      </td>
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
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            {formattedSolution}
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
                        {hasEvidence ? (
                          item.evidence!.startsWith('data:image/') || item.evidence!.startsWith('http') ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(item.evidence!)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-all"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> Ver Foto
                            </button>
                          ) : (
                            <a
                              href={item.evidence}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline text-[11px]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Enlace
                            </a>
                          )
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
          onPaste={handlePaste}
        >
          <div className="bg-[#1E293B] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">REGISTRAR NUEVA VARADA</h2>
                  <p className="text-xs text-slate-400">Calculo automático de horas e inclusión de evidencias fotográficas</p>
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

                {/* Fecha y Hora Varada */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Fecha y Hora de Varada *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.breakdownDate}
                    onChange={e => handleBreakdownDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Taller que presta el servicio */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Taller que presta el servicio *
                  </label>
                  <select
                    required
                    value={formData.workshop}
                    onChange={e => setFormData({ ...formData, workshop: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="">-- Seleccionar Taller --</option>
                    {WORKSHOPS_LIST.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>

                  {formData.workshop === 'OTROS' && (
                    <input
                      type="text"
                      required
                      placeholder="Especificar nombre del taller..."
                      value={formData.otherWorkshop}
                      onChange={e => setFormData({ ...formData, otherWorkshop: e.target.value })}
                      className="w-full mt-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  )}
                </div>

                {/* Transportado en Grúa (Columna I) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Transportado en Grúa (Col. I) *</span>
                    <span className="text-[9px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Columna I</span>
                  </label>
                  <select
                    value={formData.towed}
                    onChange={e => setFormData({ ...formData, towed: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
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

              {/* Solución y Horas (Cálculo Automático) */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Cierre de Novedad y Tiempos
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Cálculo de horas en tiempo real
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fecha de Solución (Fecha y Hora) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Fecha y Hora de Solución
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.solutionDate}
                      onChange={e => handleSolutionDateChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  {/* Horas Varados (Calculadas automáticamente) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Horas Varados</span>
                      {formData.breakdownDate && formData.solutionDate && (
                        <span className="text-[9px] text-emerald-400 font-normal">Calculado automáticamente</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Ej: 4.5"
                      value={formData.hoursDown}
                      onChange={e => setFormData({ ...formData, hoursDown: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
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

              {/* Evidencia Fotográfica (Drag & Drop, Paste, Camera/Gallery, URL) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    Evidencia Fotográfica
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1 underline"
                  >
                    <Link className="w-3 h-3" />
                    {showUrlInput ? 'Ocultar enlace URL' : 'O ingresar enlace URL'}
                  </button>
                </div>

                {formData.evidence ? (
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {formData.evidence.startsWith('data:image/') || formData.evidence.startsWith('http') ? (
                        <img 
                          src={formData.evidence} 
                          alt="Evidencia" 
                          className="w-14 h-14 object-cover rounded-xl border border-slate-700 shrink-0 cursor-pointer hover:opacity-90"
                          onClick={() => setPreviewImage(formData.evidence)}
                        />
                      ) : (
                        <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          Evidencia cargada
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[280px]">
                          {formData.evidence.startsWith('data:image/') ? 'Fotografía adjunta (Base64)' : formData.evidence}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, evidence: '' })}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all shrink-0"
                      title="Eliminar evidencia"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                      isDragging 
                        ? 'border-amber-400 bg-amber-500/10 scale-[1.01]' 
                        : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      id="evidence-file-input"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processImageFile(e.target.files[0]);
                        }
                      }}
                    />

                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          Arrastra una foto aquí, o bien <span className="text-amber-400 underline cursor-pointer" onClick={() => document.getElementById('evidence-file-input')?.click()}>pégala con Ctrl+V</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Sombra o suelta archivos, o presiona el botón para tomar/seleccionar foto
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <label
                          htmlFor="evidence-file-input"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-all"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          Galería / Cámara
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {showUrlInput && !formData.evidence && (
                  <div className="mt-2">
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/foto.jpg"
                      value={formData.evidence}
                      onChange={e => setFormData({ ...formData, evidence: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
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

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-slate-800/80 rounded-full hover:bg-slate-700 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Evidencia Varada"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
            {previewImage.startsWith('http') && (
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir en nueva pestaña
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
