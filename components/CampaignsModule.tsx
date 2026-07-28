import React, { useState, useEffect } from 'react';
import { Vehicle, Driver } from '../types';
import { 
  ChevronLeft, Sparkles, ExternalLink, Settings, Check, X,
  Layers, Disc, Shield, Activity, Zap, AlertTriangle,
  Search, RefreshCw, Eye, Calendar, MapPin, ClipboardList, Info, Image as ImageIcon,
  CheckCircle2, AlertCircle, FileText, Clock, Trash2, Plus, Upload
} from 'lucide-react';
import { cn } from '../utils';
import { 
  getCampaignSheetRows, 
  getCampaignsDocId, 
  setCampaignsDocId, 
  getGoogleScriptUrl, 
  setGoogleScriptUrl,
  getCampaignsScriptUrl,
  setCampaignsScriptUrl,
  submitCampaignToSheet
} from '../services/sheetService';

interface CampaignsModuleProps {
  onBack: () => void;
  vehicles: Vehicle[];
  drivers: Driver[];
}

interface CampaignCardInfo {
  id: string;
  name: string;
  sheetName: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  badgeBg: string;
  hoverBg: string;
  borderColor: string;
  glowColor: string;
}

interface CampaignRecord {
  semana: string;
  mes: string;
  fecha: string;
  plate: string;
  taller: string;
  observacion: string;
  evidences: string[];
}

const CAMPAIGNS_LIST: CampaignCardInfo[] = [
  {
    id: 'esteras',
    name: 'ESTERAS Y CARPAS',
    sheetName: 'ESTERAS/CARPAS',
    subtitle: 'CAMPAÑA DE AJUSTE',
    description: 'Control de protección superior, lonas, carpas protectoras y sistemas de tensión de correas.',
    icon: Layers,
    color: 'from-blue-600/20 to-blue-500/5 text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60',
    hoverBg: 'hover:bg-blue-950/10',
    glowColor: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]'
  },
  {
    id: 'llantas',
    name: 'RECAMBIO DE LLANTAS',
    sheetName: 'RECAMBIO DE LLANTAS',
    subtitle: 'CAMPAÑA DE NEUMÁTICOS',
    description: 'Seguimiento de profundidad de labrado, presiones y control de vida útil de llantas.',
    icon: Disc,
    color: 'from-violet-600/20 to-violet-500/5 text-violet-400',
    badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    borderColor: 'border-violet-500/30 hover:border-violet-500/60',
    hoverBg: 'hover:bg-violet-950/10',
    glowColor: 'group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]'
  },
  {
    id: 'estructuras',
    name: 'ESTRUCTURAS INTERNAS',
    sheetName: 'ESTRUCTURA',
    subtitle: 'CAMPAÑA DE SOLDADURAS',
    description: 'Inspección de soldaduras de vigas, seguros, cierres traseros y estado general de pisos de carga.',
    icon: Shield,
    color: 'from-indigo-600/20 to-indigo-500/5 text-indigo-400',
    badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    borderColor: 'border-indigo-500/30 hover:border-indigo-500/60',
    hoverBg: 'hover:bg-indigo-950/10',
    glowColor: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
  },
  {
    id: 'frenos',
    name: 'SISTEMA DE FRENOS',
    sheetName: 'FRENOS',
    subtitle: 'CAMPAÑA DE SEGURIDAD',
    description: 'Monitoreo de niveles de líquido de frenos, respuesta de pedal y desgaste de pastillas/zapatas.',
    icon: Activity,
    color: 'from-rose-600/20 to-rose-500/5 text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    borderColor: 'border-rose-500/30 hover:border-rose-500/60',
    hoverBg: 'hover:bg-rose-950/10',
    glowColor: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]'
  },
  {
    id: 'luces',
    name: 'SISTEMA DE LUCES',
    sheetName: 'LUCES',
    subtitle: 'CAMPAÑA DE ELECTRICIDAD',
    description: 'Auditoría de farolas delanteras, traseras, direccionales, luces estroboscópicas y alarmas.',
    icon: Zap,
    color: 'from-amber-600/20 to-amber-500/5 text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderColor: 'border-amber-500/30 hover:border-amber-500/60',
    hoverBg: 'hover:bg-amber-950/10',
    glowColor: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
  },
  {
    id: 'portaconos',
    name: 'SOPORTES PORTACONOS',
    sheetName: 'PORTACONOS',
    subtitle: 'CAMPAÑA DE SEÑALIZACIÓN',
    description: 'Verificación de soportes portaconos, pines de seguridad y dotación de cono vial.',
    icon: AlertTriangle,
    color: 'from-emerald-600/20 to-emerald-500/5 text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
    hoverBg: 'hover:bg-[#064e3b]/10',
    glowColor: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
  }
];

const normalizePlate = (plate: string): string => {
  if (!plate) return '';
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const parseCampaignRows = (rows: any[][]): CampaignRecord[] => {
  if (!rows || rows.length <= 1) return [];
  
  const records: CampaignRecord[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // Placa está en el Indice 3 (Columna D)
    const plateRaw = (row[3] || '').toString();
    if (!plateRaw.trim()) continue;
    
    // Evidencias están en los índices 6, 7 y 8 (Columnas G, H, I)
    const evidences: string[] = [];
    [6, 7, 8].forEach(idx => {
      const val = (row[idx] || '').toString().trim();
      if (val && (val.startsWith('http') || val.length > 20)) {
        evidences.push(val);
      }
    });

    records.push({
      semana: (row[0] || '').toString().trim(),
      mes: (row[1] || '').toString().trim(),
      fecha: (row[2] || '').toString().trim(),
      plate: normalizePlate(plateRaw),
      taller: (row[4] || '').toString().trim(),
      observacion: (row[5] || '').toString().trim(),
      evidences
    });
  }
  
  return records;
};

export const CampaignsModule: React.FC<CampaignsModuleProps> = ({ onBack, vehicles }) => {
  const [campaignData, setCampaignData] = useState<Record<string, CampaignRecord[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<string>('Iniciando carga de datos...');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Settings state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [campaignDocId, setCampaignDocIdState] = useState<string>('');
  const [scriptUrl, setScriptUrlState] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Selected Campaign ID (null means overview dashboard)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  
  // Detailed Row Modal state
  const [selectedRecord, setSelectedRecord] = useState<{
    vehicle: Vehicle;
    campaignName: string;
    record: CampaignRecord;
  } | null>(null);
  
  // Filter & Search states
  const [searchPlate, setSearchPlate] = useState<string>('');
  const [filterCd, setFilterCd] = useState<string>('');
  const [filterContractor, setFilterContractor] = useState<string>('');
  const [filterCompliance, setFilterCompliance] = useState<string>('');

  // Form states for Campaign Registration
  const [showRegisterForm, setShowRegisterForm] = useState<boolean>(false);
  const [registering, setRegistering] = useState<boolean>(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  
  const [formCampaignId, setFormCampaignId] = useState<string>('');
  const [formPlate, setFormPlate] = useState<string>('');
  const [formSemana, setFormSemana] = useState<string>('');
  const [formMes, setFormMes] = useState<string>('');
  const [formFecha, setFormFecha] = useState<string>('');
  const [formTaller, setFormTaller] = useState<string>('TALLER CENTRAL');
  const [formObservacion, setFormObservacion] = useState<string>('');
  const [formEvidence1, setFormEvidence1] = useState<string>('');
  const [formEvidence2, setFormEvidence2] = useState<string>('');
  const [formEvidence3, setFormEvidence3] = useState<string>('');

  // Drag and Drop visual feedback states
  const [masterDragActive, setMasterDragActive] = useState<boolean>(false);
  const [dragOver1, setDragOver1] = useState<boolean>(false);
  const [dragOver2, setDragOver2] = useState<boolean>(false);
  const [dragOver3, setDragOver3] = useState<boolean>(false);

  // Detailed sheet view states
  const [subViewTab, setSubViewTab] = useState<'realizados' | 'pendientes'>('realizados');
  const [detailSearch, setDetailSearch] = useState<string>('');
  const [detailFilterMonth, setDetailFilterMonth] = useState<string>('');
  const [detailFilterWeek, setDetailFilterWeek] = useState<string>('');

  const fetchAllCampaignData = async () => {
    setLoading(true);
    const loadedData: Record<string, CampaignRecord[]> = {};
    const loadedErrors: Record<string, string> = {};
    
    for (const camp of CAMPAIGNS_LIST) {
      try {
        setLoadingStatus(`Cargando campaña: ${camp.name}...`);
        const rows = await getCampaignSheetRows(camp.sheetName);
        if (rows) {
          const parsed = parseCampaignRows(rows);
          loadedData[camp.id] = parsed;
        } else {
          loadedData[camp.id] = [];
          loadedErrors[camp.id] = `No se encontraron filas válidas o la hoja está vacía.`;
        }
      } catch (err: any) {
        console.error(`Error loading campaign ${camp.id}:`, err);
        loadedData[camp.id] = [];
        loadedErrors[camp.id] = err.message || 'Error de conexión';
      }
    }
    
    setCampaignData(loadedData);
    setErrors(loadedErrors);
    setLoading(false);
  };

  useEffect(() => {
    setCampaignDocIdState(getCampaignsDocId());
    setScriptUrlState(getCampaignsScriptUrl());
    fetchAllCampaignData();
  }, []);

  const handleSaveSettings = () => {
    setCampaignsDocId(campaignDocId);
    setCampaignsScriptUrl(scriptUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    fetchAllCampaignData();
  };

  const getCampaignStats = (campaignId: string) => {
    const records = campaignData[campaignId] || [];
    const activePlatesInSheet = new Set(records.map(r => r.plate));
    const completedCount = vehicles.filter(v => activePlatesInSheet.has(normalizePlate(v.plate))).length;
    const percentage = vehicles.length > 0 ? Math.round((completedCount / vehicles.length) * 100) : 0;
    
    let latestDate = '';
    if (records.length > 0) {
      const dates = records.map(r => r.fecha).filter(Boolean);
      if (dates.length > 0) {
        try {
          latestDate = dates.reduce((latest, current) => {
            return new Date(current) > new Date(latest) ? current : latest;
          }, dates[0]);
        } catch (e) {
          latestDate = dates[0];
        }
      }
    }
    
    return {
      completedCount,
      percentage,
      latestDate
    };
  };

  // Process files sequentially into empty or next slots
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      alert("Por favor selecciona archivos de imagen válidos (PNG, JPG, JPEG, etc).");
      return;
    }

    // Determine currently empty slots
    const emptySlots: number[] = [];
    if (!formEvidence1) emptySlots.push(1);
    if (!formEvidence2) emptySlots.push(2);
    if (!formEvidence3) emptySlots.push(3);

    // Limit to maximum 3 images from this action
    const filesToProcess = fileArray.slice(0, 3);

    filesToProcess.forEach((file, index) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`La imagen "${file.name}" supera el límite de 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        // If we have an empty slot, fill it. Else, fill sequentially based on the order
        let targetSlot = 0;
        if (index < emptySlots.length) {
          targetSlot = emptySlots[index];
        } else {
          targetSlot = index + 1;
        }

        if (targetSlot === 1) {
          setFormEvidence1(base64);
        } else if (targetSlot === 2) {
          setFormEvidence2(base64);
        } else if (targetSlot === 3) {
          setFormEvidence3(base64);
        }
      };
      reader.onerror = () => {
        alert(`Error al cargar la imagen "${file.name}"`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setEvidence: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Limitar tamaño de archivo (máximo 10MB por ejemplo)
    if (file.size > 10 * 1024 * 1024) {
      alert("La imagen es demasiado grande. El límite es de 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEvidence(reader.result as string);
    };
    reader.onerror = () => {
      console.error("Error al leer el archivo");
      alert("Hubo un error al cargar la imagen.");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCampaignId) {
      setRegisterError('Por favor selecciona una campaña.');
      return;
    }
    if (!formPlate) {
      setRegisterError('Por favor selecciona una placa.');
      return;
    }
    if (!formSemana) {
      setRegisterError('Por favor especifica la semana.');
      return;
    }
    if (!formMes) {
      setRegisterError('Por favor especifica el mes.');
      return;
    }
    if (!formFecha) {
      setRegisterError('Por favor especifica la fecha.');
      return;
    }

    const selectedCamp = CAMPAIGNS_LIST.find(c => c.id === formCampaignId);
    if (!selectedCamp) {
      setRegisterError('Campaña no válida.');
      return;
    }

    setRegistering(true);
    setRegisterError(null);

    try {
      const success = await submitCampaignToSheet({
        sheetName: selectedCamp.sheetName,
        semana: formSemana,
        mes: formMes,
        fecha: formFecha,
        plate: formPlate.toUpperCase().trim(),
        taller: formTaller || 'TALLER CENTRAL',
        observacion: formObservacion || 'Inspección rutinaria sin observaciones específicas.',
        evidence1: formEvidence1 || '',
        evidence2: formEvidence2 || '',
        evidence3: formEvidence3 || ''
      });

      if (success) {
        setShowRegisterForm(false);
        // Limpiar el formulario
        setFormPlate('');
        setFormObservacion('');
        setFormEvidence1('');
        setFormEvidence2('');
        setFormEvidence3('');
        // Recargar los datos de las hojas para mostrar el nuevo registro de inmediato
        await fetchAllCampaignData();
        alert(`¡Inspección registrada con éxito en la pestaña "${selectedCamp.sheetName}"!`);
      } else {
        setRegisterError('No se pudo guardar la información en Google Sheets. Por favor, verifica los permisos y la configuración.');
      }
    } catch (err: any) {
      console.error('Error al registrar campaña:', err);
      setRegisterError(err.message || 'Error de conexión con el servidor de Google Sheets.');
    } finally {
      setRegistering(false);
    }
  };

  const uniqueCds = Array.from(new Set(vehicles.map(v => v.cd).filter(Boolean))) as string[];
  const uniqueContractors = Array.from(new Set(vehicles.map(v => v.contractor).filter(Boolean))) as string[];

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchPlate = normalizePlate(vehicle.plate).includes(normalizePlate(searchPlate));
    const matchCd = filterCd === '' || vehicle.cd === filterCd;
    const matchContractor = filterContractor === '' || vehicle.contractor === filterContractor;
    
    let completedCount = 0;
    CAMPAIGNS_LIST.forEach(camp => {
      const records = campaignData[camp.id] || [];
      const hasRecord = records.some(r => r.plate === normalizePlate(vehicle.plate));
      if (hasRecord) completedCount++;
    });

    let matchCompliance = true;
    if (filterCompliance === 'complete') {
      matchCompliance = completedCount === 6;
    } else if (filterCompliance === 'pending') {
      matchCompliance = completedCount > 0 && completedCount < 6;
    } else if (filterCompliance === 'critical') {
      matchCompliance = completedCount === 0;
    }

    return matchPlate && matchCd && matchContractor && matchCompliance;
  });

  // Render Campaign Detailed view
  const renderDetailedCampaignView = (campaignId: string) => {
    const camp = CAMPAIGNS_LIST.find(c => c.id === campaignId);
    if (!camp) return null;

    const records = campaignData[campaignId] || [];
    const stats = getCampaignStats(campaignId);
    const IconComp = camp.icon;

    // Filter unique months and weeks in this sheet
    const uniqueMonths = Array.from(new Set(records.map(r => r.mes).filter(Boolean))) as string[];
    const uniqueWeeks = Array.from(new Set(records.map(r => r.semana).filter(Boolean))) as string[];

    // Completed rows filtered
    const filteredRecords = records.filter(rec => {
      const matchSearch = rec.plate.includes(normalizePlate(detailSearch)) || 
                          rec.taller.toUpperCase().includes(detailSearch.toUpperCase()) ||
                          rec.observacion.toUpperCase().includes(detailSearch.toUpperCase());
      const matchMonth = detailFilterMonth === '' || rec.mes === detailFilterMonth;
      const matchWeek = detailFilterWeek === '' || rec.semana === detailFilterWeek;
      return matchSearch && matchMonth && matchWeek;
    });

    // Pending vehicles in this specific campaign
    const completedPlatesSet = new Set(records.map(r => r.plate));
    const pendingVehiclesList = vehicles.filter(v => {
      const isPending = !completedPlatesSet.has(normalizePlate(v.plate));
      const matchSearch = normalizePlate(v.plate).includes(normalizePlate(detailSearch)) ||
                          (v.contractor || '').toUpperCase().includes(detailSearch.toUpperCase());
      return isPending && matchSearch;
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Back and Action Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <button
            onClick={() => setSelectedCampaignId(null)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            <ChevronLeft size={12} /> Volver a Campañas
          </button>
          
          <div className="flex gap-2">
            <a
              href={`https://docs.google.com/spreadsheets/d/${getCampaignsDocId()}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              Abrir Hoja <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Campaign Hero Banner Card */}
        <div className="bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/10 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/5 rounded-full filter blur-[100px] pointer-events-none"></div>
          
          <div className="flex items-center gap-5">
            <div className={cn(
              "w-16 h-16 bg-gradient-to-br rounded-2xl flex items-center justify-center border shadow-xl",
              camp.color
            )}>
              <IconComp size={30} />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-violet-400 tracking-widest uppercase block">
                {camp.subtitle}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                {camp.name}
              </h2>
              <p className="text-slate-400 text-xs font-semibold max-w-xl uppercase tracking-wide">
                {camp.description}
              </p>
            </div>
          </div>

          {/* Core Stats widget */}
          <div className="flex items-center gap-6 bg-white/[0.02] border border-white/5 p-4 md:p-5 rounded-2xl min-w-[240px]">
            <div className="space-y-1 flex-1">
              <div className="flex justify-between items-end text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <span>CUMPLIMIENTO</span>
                <span className="text-white text-xs">{stats.completedCount} / {vehicles.length}</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-1000"
                  style={{ width: `${stats.percentage}%` }}
                ></div>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase text-right tracking-wider">
                EFICACIA: {stats.percentage}%
              </p>
            </div>
            
            <div className="border-l border-white/5 pl-4 flex flex-col justify-center text-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ESTADO</span>
              <span className={cn(
                "text-xs font-black uppercase mt-1 px-2 py-0.5 rounded-md",
                stats.percentage >= 90 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                stats.percentage >= 60 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              )}>
                {stats.percentage >= 90 ? 'EXCELENTE' : stats.percentage >= 60 ? 'MEDIO' : 'CRÍTICO'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs and Inner Navigation */}
        <div className="bg-white/[0.01] border border-white/5 rounded-[2rem] overflow-hidden shadow-xl">
          
          {/* Sub Tab headers & Filters bar */}
          <div className="p-6 border-b border-white/5 bg-white/[0.01] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => { setSubViewTab('realizados'); setDetailSearch(''); }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
                    subViewTab === 'realizados'
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <CheckCircle2 size={13} /> Realizados ({records.length})
                </button>
                <button
                  onClick={() => { setSubViewTab('pendientes'); setDetailSearch(''); }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
                    subViewTab === 'pendientes'
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Clock size={13} /> Pendientes ({vehicles.length - records.length})
                </button>
              </div>

              {/* Sub-Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Plate/Info Search */}
                <div className="relative flex-grow sm:flex-grow-0 sm:min-w-[200px]">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                    <Search size={13} />
                  </span>
                  <input
                    type="text"
                    placeholder={subViewTab === 'realizados' ? "BUSCAR PLACA, TALLER..." : "BUSCAR PLACA..."}
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-2 pl-8 pr-4 text-xs font-bold uppercase tracking-wider text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>

                {/* Date Filters ONLY for Realizados tab */}
                {subViewTab === 'realizados' && (
                  <>
                    <select
                      value={detailFilterMonth}
                      onChange={(e) => setDetailFilterMonth(e.target.value)}
                      className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wider text-white focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0c1122] text-slate-400">TODOS LOS MESES</option>
                      {uniqueMonths.map(m => (
                        <option key={m} value={m} className="bg-[#0c1122] text-white">{m}</option>
                      ))}
                    </select>

                    <select
                      value={detailFilterWeek}
                      onChange={(e) => setDetailFilterWeek(e.target.value)}
                      className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wider text-white focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0c1122] text-slate-400">TODAS LAS SEMANAS</option>
                      {uniqueWeeks.map(w => (
                        <option key={w} value={w} className="bg-[#0c1122] text-white">SEMANA {w}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sub Tab content display */}
          <div className="overflow-x-auto custom-scrollbar">
            {subViewTab === 'realizados' ? (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-6">SEMANA / MES</th>
                    <th className="py-3.5 px-4">FECHA</th>
                    <th className="py-3.5 px-4">VEHÍCULO (PLACA)</th>
                    <th className="py-3.5 px-4">TALLER</th>
                    <th className="py-3.5 px-4">OBSERVACIÓN</th>
                    <th className="py-3.5 px-4 text-center">EVIDENCIAS</th>
                    <th className="py-3.5 px-6 text-center">DETALLES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 text-xs uppercase font-bold tracking-widest">
                        Ningún registro coincide con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec, idx) => {
                      const veh = vehicles.find(v => normalizePlate(v.plate) === rec.plate) || {
                        id: 'unknown',
                        plate: rec.plate,
                        brand: 'NO REGISTRADO',
                        model: '',
                        cd: 'GENERAL',
                        contractor: 'DESCONOCIDO'
                      } as Vehicle;

                      return (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                          {/* Week / Month */}
                          <td className="py-4 px-6 text-xs text-slate-300">
                            <span className="font-bold">W-{rec.semana || '0'}</span>
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">{rec.mes || 'N/A'}</span>
                          </td>
                          
                          {/* Date */}
                          <td className="py-4 px-4 text-xs font-mono text-slate-400">
                            {rec.fecha || 'N/A'}
                          </td>

                          {/* Plate */}
                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <span className="font-mono text-xs font-black text-white tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/10 group-hover:border-violet-500/30 transition-all">
                                {rec.plate}
                              </span>
                              <span className="text-[9px] text-slate-500 font-bold block uppercase truncate max-w-[150px]">
                                {veh.brand} {veh.model}
                              </span>
                            </div>
                          </td>

                          {/* Taller */}
                          <td className="py-4 px-4 text-xs font-bold text-slate-300 uppercase max-w-[180px] truncate" title={rec.taller}>
                            {rec.taller || 'Taller General'}
                          </td>

                          {/* Observacion */}
                          <td className="py-4 px-4 text-xs text-slate-400 max-w-[250px] truncate italic" title={rec.observacion}>
                            "{rec.observacion || 'Sin comentarios.'}"
                          </td>

                          {/* Evidences indicator */}
                          <td className="py-4 px-4 text-center">
                            {rec.evidences.length > 0 ? (
                              <div className="flex justify-center -space-x-2 overflow-hidden">
                                {rec.evidences.map((url, imgIdx) => (
                                  <div 
                                    key={imgIdx} 
                                    className="w-7 h-7 rounded-full border border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-md cursor-pointer"
                                    onClick={() => setSelectedRecord({
                                      vehicle: veh,
                                      campaignName: camp.name,
                                      record: rec
                                    })}
                                  >
                                    <img src={url} alt="Evidencia" referrerPolicy="no-referrer" className="object-cover w-full h-full" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs font-bold">-</span>
                            )}
                          </td>

                          {/* Detail button */}
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => setSelectedRecord({
                                vehicle: veh,
                                campaignName: camp.name,
                                record: rec
                              })}
                              className="px-2.5 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                              Ver Inspección
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              // Tab Pendientes list
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-6">PLACA / VEHÍCULO</th>
                    <th className="py-3.5 px-4">CD DISTRIBUCIÓN</th>
                    <th className="py-3.5 px-4">CONTRATISTA / EMPRESA</th>
                    <th className="py-3.5 px-4">ESTADO</th>
                    <th className="py-3.5 px-6 text-center">GESTIÓN RECOMENDADA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pendingVehiclesList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-xs uppercase font-bold tracking-widest">
                        ¡Felicidades! Todos los camiones han completado esta campaña.
                      </td>
                    </tr>
                  ) : (
                    pendingVehiclesList.map((veh, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-black text-white tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              {veh.plate}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase mt-1">
                              {veh.brand} {veh.model}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs font-bold text-slate-300 uppercase">
                          {veh.cd || 'GALAPA'}
                        </td>

                        <td className="py-4 px-4 text-xs font-semibold text-slate-400 uppercase">
                          {veh.contractor || 'CONTRATISTA BQA'}
                        </td>

                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-rose-500/20">
                            <AlertCircle size={10} /> Pendiente
                          </span>
                        </td>

                        <td className="py-4 px-6 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setFormCampaignId(campaignId);
                              setFormPlate(veh.plate);
                              const currentDate = new Date().toISOString().split('T')[0];
                              setFormFecha(currentDate);
                              const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                              setFormMes(meses[new Date().getMonth()]);
                              
                              // Calcular semana
                              const dateNow = new Date();
                              const oneJan = new Date(dateNow.getFullYear(), 0, 1);
                              const numberOfDays = Math.floor((dateNow.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
                              const weekNum = Math.ceil(( dateNow.getDay() + 1 + numberOfDays) / 7);
                              setFormSemana(weekNum.toString());

                              setFormTaller('TALLER CENTRAL');
                              setFormObservacion('');
                              setFormEvidence1('');
                              setFormEvidence2('');
                              setFormEvidence3('');
                              setRegisterError(null);
                              setShowRegisterForm(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/40 text-violet-300 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                          >
                            <ImageIcon size={10} /> Registrar Aquí
                          </button>
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${getCampaignsDocId()}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 rounded-lg text-[9px] transition-all"
                            title="Abrir hoja directamente"
                          >
                            <ExternalLink size={10} />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="flex-grow bg-[#050811] min-h-screen p-4 md:p-8 overflow-y-auto custom-scrollbar relative">
      {/* Background decoration blur */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full filter blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10 pb-32">
        
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="space-y-2">
            <button
              onClick={selectedCampaignId ? () => setSelectedCampaignId(null) : onBack}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              <ChevronLeft size={12} /> {selectedCampaignId ? 'Ver Todas las Campañas' : 'Volver al Menú'}
            </button>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Sparkles className="text-violet-400" size={32} /> CAMPAÑAS ESPECIALES
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">
              Sistema de Auditoría de Recambios, Ajustes Estructurales y Cumplimiento
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFormCampaignId(selectedCampaignId || CAMPAIGNS_LIST[0].id);
                const currentDate = new Date().toISOString().split('T')[0];
                setFormFecha(currentDate);
                const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                setFormMes(meses[new Date().getMonth()]);
                
                // Calcular semana del año
                const dateNow = new Date();
                const oneJan = new Date(dateNow.getFullYear(), 0, 1);
                const numberOfDays = Math.floor((dateNow.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
                const weekNum = Math.ceil(( dateNow.getDay() + 1 + numberOfDays) / 7);
                setFormSemana(weekNum.toString());

                setFormPlate('');
                setFormTaller('TALLER CENTRAL');
                setFormObservacion('');
                setFormEvidence1('');
                setFormEvidence2('');
                setFormEvidence3('');
                setRegisterError(null);
                setShowRegisterForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-violet-600/20 transition-all"
            >
              <Plus size={14} />
              Registrar Inspección
            </button>
            <button
              onClick={fetchAllCampaignData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              <RefreshCw size={14} className={cn(loading && "animate-spin")} />
              Actualizar Hojas
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-xl transition-all"
              title="Configurar Origen de Datos"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Settings Panel (Collapsible) */}
        {showSettings && (
          <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl space-y-4 animate-in fade-in duration-300">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Settings size={14} /> Configuración de Integración con Google Sheets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">ID de Google Spreadsheet de Campañas:</label>
                <input
                  type="text"
                  value={campaignDocId}
                  onChange={(e) => setCampaignDocIdState(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-mono"
                  placeholder="ID de la hoja de cálculo de campañas..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">URL del Apps Script unificado:</label>
                <input
                  type="text"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrlState(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-mono"
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">
                * Configuración local de acceso y carga para la lectura en tiempo real de cada pestaña.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Guardar y Sincronizar
                </button>
                {saveSuccess && (
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                    <Check size={14} /> Sincronizado
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content routing based on selection state */}
        {loading ? (
          <div className="bg-white/[0.01] border border-white/5 p-16 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="text-violet-400 animate-spin" size={48} />
            <div className="space-y-1 text-center">
              <p className="text-white font-black text-sm uppercase tracking-widest">Sincronizando Google Sheets...</p>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">{loadingStatus}</p>
            </div>
          </div>
        ) : selectedCampaignId ? (
          renderDetailedCampaignView(selectedCampaignId)
        ) : (
          <>
            {/* Overview Grid - Cards with detailed on-click entrance */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CAMPAIGNS_LIST.map((camp) => {
                const stats = getCampaignStats(camp.id);
                const IconComp = camp.icon;
                const error = errors[camp.id];

                return (
                  <div
                    key={camp.id}
                    onClick={() => setSelectedCampaignId(camp.id)}
                    className={cn(
                      "group bg-white/[0.02] border p-6 rounded-[2rem] transition-all duration-300 flex flex-col justify-between shadow-xl relative overflow-hidden cursor-pointer",
                      camp.borderColor,
                      camp.hoverBg,
                      camp.glowColor
                    )}
                  >
                    <div className="space-y-4">
                      {/* Card Header */}
                      <div className="flex justify-between items-start">
                        <div className={cn(
                          "w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center border shadow-md",
                          camp.color
                        )}>
                          <IconComp size={22} />
                        </div>
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-full border", camp.badgeBg)}>
                            HOJA: {camp.sheetName}
                          </span>
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${getCampaignsDocId()}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg transition-all"
                            title="Abrir hoja individual"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>

                      {/* Campaign Titles */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-violet-400 tracking-widest uppercase block">
                          {camp.subtitle}
                        </span>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-1.5 group-hover:text-violet-300 transition-colors">
                          {camp.name} <Eye size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
                        </h3>
                      </div>

                      {/* Description */}
                      <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wide leading-snug">
                        {camp.description}
                      </p>

                      {/* Error State */}
                      {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-[10px] text-rose-400 font-bold uppercase tracking-wide">
                          ⚠️ {error}
                        </div>
                      )}
                    </div>

                    {/* Progress & Stats Summary */}
                    <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CUMPLIMIENTO</span>
                        <div className="text-right">
                          <span className="text-base font-black text-white">{stats.completedCount}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase"> / {vehicles.length} camiones</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-1000"
                          style={{ width: `${stats.percentage}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>Porcentaje: {stats.percentage}%</span>
                        {stats.latestDate && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar size={10} /> ÚLTIMO: {stats.latestDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* General Compliance Dashboard Section */}
            <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
              
              {/* Dashboard Table Header / Controls */}
              <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.01] space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <ClipboardList className="text-violet-400" size={20} /> Matriz de Cumplimiento por Vehículo
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Mostrando {filteredVehicles.length} de {vehicles.length} camiones activos de la flota
                    </p>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search Plate */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="BUSCAR PLACA..."
                      value={searchPlate}
                      onChange={(e) => setSearchPlate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold uppercase tracking-wider text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>

                  {/* CD Select */}
                  <div className="relative">
                    <select
                      value={filterCd}
                      onChange={(e) => setFilterCd(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3 text-xs font-bold uppercase tracking-wider text-white focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0c1122] text-slate-400">TODOS LOS CD</option>
                      {uniqueCds.map(cd => (
                        <option key={cd} value={cd} className="bg-[#0c1122] text-white">{cd}</option>
                      ))}
                    </select>
                  </div>

                  {/* Contractor Select */}
                  <div className="relative">
                    <select
                      value={filterContractor}
                      onChange={(e) => setFilterContractor(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3 text-xs font-bold uppercase tracking-wider text-white focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0c1122] text-slate-400">TODOS LOS CONTRATISTAS</option>
                      {uniqueContractors.map(c => (
                        <option key={c} value={c} className="bg-[#0c1122] text-white">{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Compliance Select */}
                  <div className="relative">
                    <select
                      value={filterCompliance}
                      onChange={(e) => setFilterCompliance(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3 text-xs font-bold uppercase tracking-wider text-white focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0c1122] text-slate-400">TODOS LOS ESTADOS</option>
                      <option value="complete" className="bg-[#0c1122] text-emerald-400">✅ COMPLETO (6/6)</option>
                      <option value="pending" className="bg-[#0c1122] text-amber-400">⚠️ PENDIENTES (1-5/6)</option>
                      <option value="critical" className="bg-[#0c1122] text-rose-400">❌ CRÍTICO (0/6)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Master Compliance Table */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">VEHÍCULO</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">CENTRO</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">CONTRATISTA</th>
                      {CAMPAIGNS_LIST.map(camp => (
                        <th key={camp.id} className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          {camp.name.replace("SISTEMA DE ", "").replace("RECAMBIO DE ", "").split(" ")[0]}
                        </th>
                      ))}
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">AVANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500 text-xs uppercase font-bold tracking-widest">
                          No se encontraron vehículos con los filtros activos.
                        </td>
                      </tr>
                    ) : (
                      filteredVehicles.map(vehicle => {
                        let completedCampaignsCount = 0;
                        const cellStatuses = CAMPAIGNS_LIST.map(camp => {
                          const records = campaignData[camp.id] || [];
                          const vehicleRecord = records.find(r => r.plate === normalizePlate(vehicle.plate));
                          if (vehicleRecord) completedCampaignsCount++;
                          return {
                            campaignId: camp.id,
                            campaignName: camp.name,
                            record: vehicleRecord
                          };
                        });
                        const progressPercent = Math.round((completedCampaignsCount / 6) * 100);

                        return (
                          <tr key={vehicle.id} className="hover:bg-white/[0.01] transition-colors group">
                            {/* Vehicle Details */}
                            <td className="py-4 px-6">
                              <div className="space-y-0.5">
                                <span className="font-mono text-sm font-black text-white tracking-wider bg-white/5 px-2.5 py-1 rounded-md border border-white/10 group-hover:border-violet-500/30 transition-all">
                                  {vehicle.plate}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold block uppercase mt-1">
                                  {vehicle.brand || 'GENERAL'} {vehicle.model || ''}
                                </span>
                              </div>
                            </td>

                            {/* CD */}
                            <td className="py-4 px-6">
                              <span className="text-xs font-bold text-slate-300 uppercase">{vehicle.cd || 'GALAPA'}</span>
                            </td>

                            {/* Contractor */}
                            <td className="py-4 px-6">
                              <span className="text-xs font-bold text-slate-400 uppercase truncate max-w-[150px] block" title={vehicle.contractor}>
                                {vehicle.contractor || 'CONTRATISTA'}
                              </span>
                            </td>

                            {/* Campaign Cells */}
                            {cellStatuses.map(status => {
                              const isCompleted = !!status.record;
                              return (
                                <td key={status.campaignId} className="py-4 px-4 text-center">
                                  {isCompleted ? (
                                    <button
                                      onClick={() => setSelectedRecord({
                                        vehicle,
                                        campaignName: status.campaignName,
                                        record: status.record!
                                      })}
                                      className="mx-auto flex flex-col items-center justify-center p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 cursor-pointer min-w-[90px]"
                                      title="Clic para ver detalles de inspección"
                                    >
                                      <span className="text-[9px] font-black tracking-widest uppercase">AL DÍA</span>
                                      <span className="text-[8px] opacity-75 font-bold font-mono">{status.record!.fecha}</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setSelectedCampaignId(status.campaignId)}
                                      className="mx-auto flex items-center justify-center p-1.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/5 text-slate-500 hover:text-rose-400 transition-all min-w-[90px] text-center"
                                      title="Ir a campaña para ver pendientes"
                                    >
                                      <span className="text-[9px] font-black tracking-widest uppercase">PENDIENTE</span>
                                    </button>
                                  )}
                                </td>
                              );
                            })}

                            {/* Progress bar / compliance score */}
                            <td className="py-4 px-6">
                              <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                                <span className={cn(
                                  "text-xs font-black",
                                  progressPercent === 100 ? "text-emerald-400" :
                                  progressPercent > 0 ? "text-amber-400" : "text-rose-500"
                                )}>
                                  {completedCampaignsCount}/6 ({progressPercent}%)
                                </span>
                                <div className="w-16 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      progressPercent === 100 ? "bg-emerald-500" :
                                      progressPercent > 0 ? "bg-amber-500" : "bg-rose-500"
                                    )}
                                    style={{ width: `${progressPercent}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Modal: Register New Inspection Report */}
        {showRegisterForm && (
          <div className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-300">
            <div className="bg-[#0c1122] border border-white/10 max-w-2xl w-full rounded-[2.5rem] shadow-2xl p-6 md:p-8 space-y-6 relative my-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full filter blur-[100px] pointer-events-none"></div>
              
              {/* Close button */}
              <button
                type="button"
                onClick={() => setShowRegisterForm(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all"
              >
                <X size={16} />
              </button>

              {/* Modal Title */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest block">FORMULARIO DE CONTROL</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Sparkles size={22} className="text-violet-400" /> REGISTRAR INSPECCIÓN
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">
                  Ingresa las evidencias físicas y datos de auditoría de la campaña seleccionada.
                </p>
              </div>

              {registerError && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-xs text-rose-400 font-bold uppercase tracking-wider">
                  ⚠️ {registerError}
                </div>
              )}

              <form onSubmit={handleSubmitCampaign} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campaña Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seleccionar Campaña:</label>
                    <select
                      value={formCampaignId}
                      onChange={(e) => setFormCampaignId(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-bold uppercase tracking-wider focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0c1122] text-slate-500">-- SELECCIONE CAMPAÑA --</option>
                      {CAMPAIGNS_LIST.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#0c1122] text-white">
                          {c.name} ({c.sheetName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vehículo Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Placa del Vehículo (Flota):</label>
                    <select
                      value={formPlate}
                      onChange={(e) => setFormPlate(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-mono font-bold tracking-wider focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0c1122] text-slate-500">-- SELECCIONE VEHÍCULO --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.plate} className="bg-[#0c1122] text-white font-mono">
                          {v.plate} - {v.brand} {v.model} ({v.cd})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Semana */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Número de Semana:</label>
                    <input
                      type="text"
                      placeholder="Ej: 28"
                      value={formSemana}
                      onChange={(e) => setFormSemana(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>

                  {/* Mes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mes:</label>
                    <select
                      value={formMes}
                      onChange={(e) => setFormMes(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-bold uppercase tracking-wider focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    >
                      {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                        <option key={m} value={m} className="bg-[#0c1122] text-white">{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fecha de Inspección:</label>
                    <input
                      type="date"
                      value={formFecha}
                      onChange={(e) => setFormFecha(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  {/* Taller Responsable */}
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Taller Responsable / Ubicación:</label>
                  <select
                    value={formTaller}
                    onChange={(e) => setFormTaller(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-bold uppercase tracking-wider focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                  >
                    <option value="TALLER CENTRAL" className="bg-[#0c1122] text-white">TALLER CENTRAL</option>
                    <option value="PLANTA BQA" className="bg-[#0c1122] text-white">PLANTA BQA</option>
                    <option value="TALLER DE CARPAS" className="bg-[#0c1122] text-white">TALLER DE CARPAS</option>
                    <option value="TALLER EXTERNO" className="bg-[#0c1122] text-white">TALLER EXTERNO</option>
                  </select>
                </div>

                {/* Observaciones */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Observaciones y Hallazgos:</label>
                  <textarea
                    rows={3}
                    placeholder="Escribe aquí los detalles del estado físico del camión..."
                    value={formObservacion}
                    onChange={(e) => setFormObservacion(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-all uppercase"
                  />
                </div>

                {/* Evidencia Fotográfica */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Evidencia Fotográfica:</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Sube hasta 3 fotos. Soporta selección múltiple y arrastrar/soltar.</span>
                  </div>

                  {/* Master Dropzone */}
                  <div
                    onDragEnter={(e) => { e.preventDefault(); setMasterDragActive(true); }}
                    onDragOver={(e) => { e.preventDefault(); setMasterDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setMasterDragActive(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setMasterDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        processFiles(e.dataTransfer.files);
                      }
                    }}
                    className={cn(
                      "border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group relative overflow-hidden",
                      masterDragActive 
                        ? "border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/10" 
                        : "border-white/10 bg-white/[0.01] hover:border-violet-500/30 hover:bg-white/[0.02]"
                    )}
                    onClick={() => {
                      const fileInput = document.getElementById('master-file-input');
                      if (fileInput) fileInput.click();
                    }}
                  >
                    <input
                      id="master-file-input"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processFiles(e.target.files);
                        }
                      }}
                    />
                    <div className="p-3 bg-violet-600/10 text-violet-400 rounded-2xl group-hover:scale-110 transition-all">
                      <Upload size={24} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-white uppercase tracking-wider block">
                        Carga rápida de evidencias
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Selecciona o arrastra hasta 3 fotos a la vez
                      </span>
                    </div>
                    {/* Status counts */}
                    <div className="flex flex-wrap gap-2 justify-center mt-1">
                      <span className={cn(
                        "text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-wider border transition-all",
                        formEvidence1 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-500 border-transparent"
                      )}>
                        Foto 1: {formEvidence1 ? "✅ Cargada" : "VACÍA"}
                      </span>
                      <span className={cn(
                        "text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-wider border transition-all",
                        formEvidence2 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-500 border-transparent"
                      )}>
                        Foto 2: {formEvidence2 ? "✅ Cargada" : "VACÍA"}
                      </span>
                      <span className={cn(
                        "text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-wider border transition-all",
                        formEvidence3 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-500 border-transparent"
                      )}>
                        Foto 3: {formEvidence3 ? "✅ Cargada" : "VACÍA"}
                      </span>
                    </div>
                  </div>

                  {/* Individual Slots Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Evidencia 1 */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Foto 1 (Collage / General)</span>
                      {formEvidence1 ? (
                        <div className="relative group/thumb border border-violet-500/30 rounded-xl aspect-video overflow-hidden shadow-lg">
                          <img src={formEvidence1} alt="Evidencia 1" className="object-cover w-full h-full animate-in fade-in duration-300" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setFormEvidence1('')}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all shadow-md"
                            title="Quitar imagen"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver1(true); }}
                          onDragLeave={() => setDragOver1(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOver1(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              processFiles(e.dataTransfer.files);
                            }
                          }}
                          className={cn(
                            "border border-dashed rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden bg-white/[0.01]",
                            dragOver1
                              ? "border-violet-500 bg-violet-600/10"
                              : "border-white/10 hover:border-violet-500/50 hover:bg-white/[0.02]"
                          )}
                          onClick={() => {
                            const input = document.getElementById('file-input-1');
                            if (input) input.click();
                          }}
                        >
                          <Upload size={18} className={dragOver1 ? "text-violet-400 animate-bounce" : "text-slate-500"} />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Subir Foto 1</span>
                          <input
                            id="file-input-1"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, setFormEvidence1)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Evidencia 2 */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Foto 2 (Individual 1)</span>
                      {formEvidence2 ? (
                        <div className="relative group/thumb border border-violet-500/30 rounded-xl aspect-video overflow-hidden shadow-lg">
                          <img src={formEvidence2} alt="Evidencia 2" className="object-cover w-full h-full animate-in fade-in duration-300" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setFormEvidence2('')}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all shadow-md"
                            title="Quitar imagen"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver2(true); }}
                          onDragLeave={() => setDragOver2(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOver2(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              processFiles(e.dataTransfer.files);
                            }
                          }}
                          className={cn(
                            "border border-dashed rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden bg-white/[0.01]",
                            dragOver2
                              ? "border-violet-500 bg-violet-600/10"
                              : "border-white/10 hover:border-violet-500/50 hover:bg-white/[0.02]"
                          )}
                          onClick={() => {
                            const input = document.getElementById('file-input-2');
                            if (input) input.click();
                          }}
                        >
                          <Upload size={18} className={dragOver2 ? "text-violet-400 animate-bounce" : "text-slate-500"} />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Subir Foto 2</span>
                          <input
                            id="file-input-2"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, setFormEvidence2)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Evidencia 3 */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Foto 3 (Individual 2)</span>
                      {formEvidence3 ? (
                        <div className="relative group/thumb border border-violet-500/30 rounded-xl aspect-video overflow-hidden shadow-lg">
                          <img src={formEvidence3} alt="Evidencia 3" className="object-cover w-full h-full animate-in fade-in duration-300" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setFormEvidence3('')}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all shadow-md"
                            title="Quitar imagen"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver3(true); }}
                          onDragLeave={() => setDragOver3(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOver3(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              processFiles(e.dataTransfer.files);
                            }
                          }}
                          className={cn(
                            "border border-dashed rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden bg-white/[0.01]",
                            dragOver3
                              ? "border-violet-500 bg-violet-600/10"
                              : "border-white/10 hover:border-violet-500/50 hover:bg-white/[0.02]"
                          )}
                          onClick={() => {
                            const input = document.getElementById('file-input-3');
                            if (input) input.click();
                          }}
                        >
                          <Upload size={18} className={dragOver3 ? "text-violet-400 animate-bounce" : "text-slate-500"} />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Subir Foto 3</span>
                          <input
                            id="file-input-3"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, setFormEvidence3)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    disabled={registering}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-600/20 transition-all disabled:opacity-50"
                  >
                    {registering ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Check size={14} /> Guardar Inspección
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Modal: View Single Inspection Record Details */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-[#0c1122] border border-white/10 max-w-lg w-full rounded-[2.5rem] shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/5 rounded-full filter blur-3xl pointer-events-none"></div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedRecord(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all"
              >
                <X size={16} />
              </button>

              {/* Modal Header */}
              <div className="space-y-1">
                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest block">Detalles del Registro</span>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedRecord.campaignName}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-mono text-xs font-black text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                    {selectedRecord.vehicle.plate}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {selectedRecord.vehicle.brand} {selectedRecord.vehicle.model}
                  </span>
                </div>
              </div>

              {/* Inspection Details Metadata */}
              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-bold">Fecha de Registro</span>
                    <span className="text-white font-bold flex items-center gap-1.5 font-mono text-xs">
                      <Calendar size={13} className="text-violet-400" /> {selectedRecord.record.fecha || 'N/A'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-bold">Semana / Mes</span>
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <ClipboardList size={13} className="text-violet-400" /> W-{selectedRecord.record.semana || '0'} ({selectedRecord.record.mes || 'N/A'})
                    </span>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-bold">Taller Responsable</span>
                    <span className="text-white font-bold flex items-center gap-1.5 uppercase">
                      <MapPin size={13} className="text-violet-400" /> {selectedRecord.record.taller || 'Taller General / Planta BQA'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 space-y-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-bold">Observación de la Inspección</span>
                  <p className="text-slate-300 font-bold bg-white/[0.01] border border-white/5 p-3 rounded-xl italic leading-relaxed">
                    "{selectedRecord.record.observacion || 'Sin observaciones registradas.'}"
                  </p>
                </div>
              </div>

              {/* Evidence Images */}
              {selectedRecord.record.evidences.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-bold">Evidencia Fotográfica</span>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedRecord.record.evidences.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/img relative bg-white/5 border border-white/10 rounded-xl overflow-hidden aspect-square flex items-center justify-center hover:border-violet-500 transition-all cursor-pointer"
                      >
                        <img
                          src={url}
                          alt={`Evidencia ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="object-cover w-full h-full transition-transform duration-500 group-hover/img:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextSibling as HTMLDivElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="hidden absolute inset-0 flex-col items-center justify-center text-slate-400 space-y-1 bg-white/[0.02]"
                        >
                          <ImageIcon size={20} />
                          <span className="text-[8px] uppercase tracking-widest font-black">Ver Foto</span>
                        </div>
                        <div className="absolute inset-0 bg-violet-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye size={16} className="text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Close Action */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
