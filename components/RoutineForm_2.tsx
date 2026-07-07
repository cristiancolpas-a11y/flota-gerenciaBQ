import React, { useState, useRef, useEffect } from 'react';
import { Vehicle, Driver } from '../types';
import { RoutineExecution, RoutineResponse } from './RutinasModule';
import { submitRoutineToSheet } from '../services/sheetService';
import { createMosaic } from '../utils';

const TALLERES_LIST = [
  "AUTECO",
  "AUTOMUNDIAL",
  "CAMION COLOMBIA",
  "COUNTRY MOTORS",
  "DIVERMOTORS",
  "GARCILLANTAS",
  "ROINCOR",
  "TECNIBENZ",
  "TODOFIBRAS",
  "TRAMICON",
  "VEHIPESA",
  "COEXITO",
  "ETM",
  "NAVISAFT",
  "NAVITRANS",
  "OTROS",
  "GLASS LAMINADO",
  "COUNTRY TRUCK"
];
import { 
  CheckCircle2, XCircle, AlertTriangle, Truck, User, Gauge, 
  ChevronLeft, Sparkles, Check, AlertCircle, MapPin, Clipboard,
  Layers, Hammer, Droplets, ShieldCheck, ClipboardCheck,
  Camera, X
} from 'lucide-react';

interface RoutineForm2Props {
  vehicles: Vehicle[];
  drivers: Driver[];
  onSuccess: (execution: RoutineExecution) => void;
  onBack: () => void;
}

// 26 Specific checklist items for Routine 2
const CHECKLIST_ITEMS = [
  // 5. CAMBIO
  { id: 'r2_c_aceite_motor', name: 'Aceite Motor', category: 'CAMBIO', sectionNum: 5, sectionTitle: '5. ¿A los siguientes componentes se les realizó CAMBIO?' },
  { id: 'r2_c_filtro_aceite', name: 'Filtro de aceite', category: 'CAMBIO', sectionNum: 5, sectionTitle: '5. ¿A los siguientes componentes se les realizó CAMBIO?' },
  { id: 'r2_c_filtro_primario', name: 'Filtro combustible primario', category: 'CAMBIO', sectionNum: 5, sectionTitle: '5. ¿A los siguientes componentes se les realizó CAMBIO?' },
  { id: 'r2_c_filtro_secundario', name: 'Filtro combustible secundario o trampa de agua', category: 'CAMBIO', sectionNum: 5, sectionTitle: '5. ¿A los siguientes componentes se les realizó CAMBIO?' },
  { id: 'r2_c_filtro_aire_primario', name: 'Filtro de aire primario', category: 'CAMBIO', sectionNum: 5, sectionTitle: '5. ¿A los siguientes componentes se les realizó CAMBIO?' },

  // 6. ENGRASE
  { id: 'r2_e_suspension_rodamientos', name: 'General Suspensión y rodamientos ruedas delanteras', category: 'ENGRASE', sectionNum: 6, sectionTitle: '6. ¿A los siguientes componentes se les realizó ENGRASE?' },
  { id: 'r2_e_articulaciones', name: 'Articulaciones, Crucetas, Cardanes, Bujes y Pasadores', category: 'ENGRASE', sectionNum: 6, sectionTitle: '6. ¿A los siguientes componentes se les realizó ENGRASE?' },

  // 7. LIQUIDOS
  { id: 'r2_l_agua_bateria', name: 'Agua Batería', category: 'LIQUIDOS', sectionNum: 7, sectionTitle: '7. ¿A los siguientes componentes se les completó LIQUIDOS?' },
  { id: 'r2_l_refrigerante', name: 'Liquido Refrigerante y LimpiaParabrisas', category: 'LIQUIDOS', sectionNum: 7, sectionTitle: '7. ¿A los siguientes componentes se les completó LIQUIDOS?' },
  { id: 'r2_l_aceites_direccion', name: 'Aceites de dirección, Caja y Diferencial', category: 'LIQUIDOS', sectionNum: 7, sectionTitle: '7. ¿A los siguientes componentes se les completó LIQUIDOS?' },

  // 8. TENSION
  { id: 'r2_t_frenos', name: 'Frenos', category: 'TENSION', sectionNum: 8, sectionTitle: '8. ¿A los siguientes componentes se les realizó TENSIÓN?' },
  { id: 'r2_t_correas', name: 'Correas Motor', category: 'TENSION', sectionNum: 8, sectionTitle: '8. ¿A los siguientes componentes se les realizó TENSIÓN?' },
  { id: 'r2_t_embrague', name: 'Embrague y/o calibrar varillaje (según parámetros)', category: 'TENSION', sectionNum: 8, sectionTitle: '8. ¿A los siguientes componentes se les realizó TENSIÓN?' },

  // 9. INSPECCION
  { id: 'r2_i_luces', name: 'Luces Delanteras, Traseras y furgon', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_luces_tablero', name: 'Luces e Indicadores de Tablero', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_mangueras_ref', name: 'Tuberías y Mangueras Refrigeración y la Concentración de refrigerante', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_mangueras_aceite', name: 'Tuberías y Mangueras Aceite', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_terminales_rotulas', name: 'Terminales y Rotulas', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_suspension', name: 'Suspensión en General', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_admision_escape', name: 'Sistema Admisión y Escape (Conductos y Turbo)', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_fugas', name: 'Fugas de aire y aceites', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_marcha_minima', name: 'Marcha Mínima motor', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_direccion', name: 'Dirección', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_freno_motor', name: 'Funcionamiento Freno de Motor', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_varillaje_direccion', name: 'Varillaje Dirección', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' },
  { id: 'r2_i_sistema_combustible', name: 'Sistema Combustible (Abrazaderas y Mangueras)', category: 'INSPECCION', sectionNum: 9, sectionTitle: '9. ¿A los siguientes componentes se les INSPECCIONÓ?' }
];

export const getChecklistItemsByFrequency = (freq: string) => {
  if (!freq) return [];
  if (freq === '5.000 km') {
    return CHECKLIST_ITEMS.filter(item => 
      item.id === 'r2_c_aceite_motor' ||
      item.id === 'r2_c_filtro_aceite' ||
      item.id === 'r2_c_filtro_primario' ||
      item.id === 'r2_c_filtro_secundario' ||
      item.id === 'r2_c_filtro_aire_primario' ||
      item.id === 'r2_e_suspension_rodamientos' ||
      item.id === 'r2_e_articulaciones' ||
      item.id === 'r2_l_agua_bateria' ||
      item.id === 'r2_l_refrigerante'
    );
  }
  if (freq === '8.000 km') {
    return CHECKLIST_ITEMS.filter(item => 
      item.id === 'r2_c_aceite_motor' ||
      item.id === 'r2_c_filtro_aceite' ||
      item.id === 'r2_c_filtro_primario' ||
      item.id === 'r2_c_filtro_secundario' ||
      item.id === 'r2_c_filtro_aire_primario' ||
      item.id === 'r2_e_suspension_rodamientos' ||
      item.id === 'r2_e_articulaciones' ||
      item.id === 'r2_l_agua_bateria' ||
      item.id === 'r2_l_refrigerante' ||
      item.id === 'r2_l_aceites_direccion' ||
      item.id === 'r2_t_frenos' ||
      item.id === 'r2_t_correas'
    );
  }
  if (freq === '10.000 km') {
    return CHECKLIST_ITEMS.filter(item => 
      item.id === 'r2_c_aceite_motor' ||
      item.id === 'r2_c_filtro_aceite' ||
      item.id === 'r2_c_filtro_primario' ||
      item.id === 'r2_c_filtro_secundario' ||
      item.id === 'r2_c_filtro_aire_primario' ||
      item.id === 'r2_e_suspension_rodamientos' ||
      item.id === 'r2_e_articulaciones' ||
      item.id === 'r2_l_agua_bateria' ||
      item.id === 'r2_l_refrigerante' ||
      item.id === 'r2_l_aceites_direccion' ||
      item.id === 'r2_t_frenos' ||
      item.id === 'r2_t_correas' ||
      item.id === 'r2_t_embrague' ||
      item.id === 'r2_i_luces' ||
      item.id === 'r2_i_luces_tablero' ||
      item.id === 'r2_i_fugas' ||
      item.id === 'r2_i_direccion' ||
      item.id === 'r2_i_freno_motor'
    );
  }
  // '20.000 km'
  return CHECKLIST_ITEMS;
};

export const RoutineForm_2: React.FC<RoutineForm2Props> = ({
  vehicles,
  drivers,
  onSuccess,
  onBack
}) => {
  // Main Questionnaire Fields
  const [selectedCd, setSelectedCd] = useState<'DC La Arenosa' | 'DC Galapa' | ''>('');
  const [plate, setPlate] = useState('');
  const [frequency, setFrequency] = useState<'5.000 km' | '8.000 km' | '10.000 km' | '20.000 km' | ''>('');
  
  // App-required tracking fields
  const [selectedTaller, setSelectedTaller] = useState('AUTECO');
  const [otherTaller, setOtherTaller] = useState('');
  const [currentMileage, setCurrentMileage] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  
  // Interactive / State Fields
  const [showPlateSuggestions, setShowPlateSuggestions] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Checklist responses state initialized to OK ('SI')
  const [responses, setResponses] = useState<Record<string, { status: 'OK' | 'FAIL' | 'NA', note?: string }>>(() => {
    const initial: Record<string, { status: 'OK' | 'FAIL' | 'NA', note?: string }> = {};
    CHECKLIST_ITEMS.forEach(item => {
      initial[item.id] = { status: 'OK' }; // Default is CUMPLE (SI)
    });
    return initial;
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle signature drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  // Real gallery and camera photo handlers with collage creation
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    const newBase64s = await Promise.all(
      files.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );

    const updatedPhotos = [...selectedPhotos, ...newBase64s].slice(0, 4);
    setSelectedPhotos(updatedPhotos);

    if (updatedPhotos.length > 0) {
      const collage = await createMosaic(updatedPhotos, `EVIDENCIA RUTINA 2 - ${plate || 'N/A'}`);
      setEvidencePhoto(collage);
    } else {
      setEvidencePhoto(null);
    }
  };

  const removePhoto = async (idx: number) => {
    const updatedPhotos = selectedPhotos.filter((_, i) => i !== idx);
    setSelectedPhotos(updatedPhotos);
    
    if (updatedPhotos.length > 0) {
      const collage = await createMosaic(updatedPhotos, `EVIDENCIA RUTINA 2 - ${plate || 'N/A'}`);
      setEvidencePhoto(collage);
    } else {
      setEvidencePhoto(null);
    }
  };

  const clearAllPhotos = () => {
    setSelectedPhotos([]);
    setEvidencePhoto(null);
  };

  // Filter vehicles suggestions matching typed plate
  const suggestedVehicles = plate 
    ? vehicles.filter(v => v.plate.toLowerCase().includes(plate.toLowerCase())) 
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!selectedCd) {
      setFormError('Debe seleccionar a qué centro de distribución pertenece.');
      return;
    }
    if (!plate || plate.trim().length < 5) {
      setFormError('Debe registrar una placa válida (ej: ABC123).');
      return;
    }
    if (!frequency) {
      setFormError('Debe elegir la frecuencia de mantenimiento preventivo.');
      return;
    }
    const finalTaller = selectedTaller === 'OTROS' ? otherTaller.trim() : selectedTaller;
    if (!finalTaller) {
      setFormError('Debe especificar el taller responsable de la revisión.');
      return;
    }
    if (!currentMileage || isNaN(parseInt(currentMileage))) {
      setFormError('Debe registrar el kilometraje actual del vehículo.');
      return;
    }

    const vehicleObj = vehicles.find(v => v.plate === plate);

    // Build standard responses list based on selected frequency (others are marked 'NA')
    const activeItems = getChecklistItemsByFrequency(frequency);
    const compiledResponses: RoutineResponse[] = CHECKLIST_ITEMS.map(item => {
      const isActive = activeItems.some(active => active.id === item.id);
      const resp = responses[item.id] || { status: 'OK' };
      return {
        itemId: item.id,
        status: isActive ? resp.status : 'NA',
        noveltyDescription: isActive ? resp.note : undefined
      };
    });

    const totalRated = compiledResponses.filter(r => r.status !== 'NA').length;
    const totalOk = compiledResponses.filter(r => r.status === 'OK').length;
    const finalScore = totalRated > 0 ? Math.round((totalOk / totalRated) * 100) : 100;
    const failures = compiledResponses.filter(r => r.status === 'FAIL');
    const hasFailures = failures.length > 0;

    const notesSummary = `[CD: ${selectedCd}] [Freq: ${frequency}] ${generalNotes}`;

    const newExecution: RoutineExecution = {
      id: 'exec-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      plate: plate.toUpperCase(),
      driverId: finalTaller,
      driverName: finalTaller,
      templateId: 'rutina_2',
      templateName: 'RUTINA 2: Filtros, Rodamientos, Chasis y Dirección',
      responses: compiledResponses,
      mileage: parseInt(currentMileage),
      score: finalScore,
      hasFailures,
      notes: notesSummary,
      signatureUrl: signatureData || undefined,
      evidenceUrl: evidencePhoto || undefined,
      cd: selectedCd,
      contractor: vehicleObj?.contractor || 'LOGISTICOS.CO'
    };

    const runSave = async () => {
      try {
        setIsSaving(true);
        setFormError('');
        const success = await submitRoutineToSheet(newExecution);
        if (!success) {
          throw new Error('No se pudo guardar el registro en Google Sheets. Por favor, verifica el ID de la hoja de cálculo en la configuración o la implementación de tu Google Apps Script.');
        }
        setIsSaving(false);
        setFormSuccess(true);
        onSuccess(newExecution);
        setTimeout(() => {
          setFormSuccess(false);
          onBack();
        }, 1500);
      } catch (err: any) {
        console.error("Error saving routine to sheet:", err);
        setIsSaving(false);
        setFormError(err?.message || "Error al enviar los datos de la rutina a Google Sheets.");
      }
    };
    runSave();
  };

  const activeItems = getChecklistItemsByFrequency(frequency);

  // Group items by category / section
  const sectionGroups = activeItems.reduce((acc, item) => {
    if (!acc[item.sectionNum]) {
      acc[item.sectionNum] = {
        title: item.sectionTitle,
        items: []
      };
    }
    acc[item.sectionNum].items.push(item);
    return acc;
  }, {} as Record<number, { title: string, items: typeof CHECKLIST_ITEMS }>);

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 space-y-8 rounded-[2.5rem] border border-slate-200/60 shadow-inner">
      
      {/* Header Panel */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-200">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
          >
            <ChevronLeft size={14} /> Regresar a Rutinas
          </button>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <ClipboardCheck className="text-indigo-600" size={28} /> Llenado de Rutina 2
          </h3>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Filtros, Engrase Especializado, Dirección, Líquidos y Diagnóstico Freno de Motor
          </p>
        </div>
        <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm animate-pulse">
          Formulario Oficial
        </div>
      </div>

      {/* Success / Error Banners */}
      {formSuccess && (
        <div className="p-4 bg-emerald-500 border border-emerald-600 text-white rounded-2xl flex items-center gap-3 text-sm font-bold animate-bounce shadow-md">
          <CheckCircle2 size={22} className="text-white" /> ¡Rutina 2 registrada exitosamente!
        </div>
      )}
      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm">
          <AlertCircle size={22} className="text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* METADATA GRID */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
          
          {/* Question 1: Centro de Distribución */}
          <div className="space-y-3">
            <label className="text-slate-900 font-black text-xs uppercase tracking-wider block">
              1. ¿A qué centro de distribución pertenece? <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: 'DC La Arenosa', label: 'DC La Arenosa', desc: 'Sede Barranquilla' },
                { id: 'DC Galapa', label: 'DC Galapa', desc: 'Zona Metropolitana' }
              ].map((cdOpt) => (
                <button
                  key={cdOpt.id}
                  type="button"
                  onClick={() => setSelectedCd(cdOpt.id as any)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                    selectedCd === cdOpt.id
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm ring-2 ring-indigo-500/10'
                      : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-tight">{cdOpt.label}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">{cdOpt.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedCd === cdOpt.id ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'
                  }`}>
                    {selectedCd === cdOpt.id && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Placa del Vehículo */}
          <div className="space-y-3 relative">
            <label className="text-slate-900 font-black text-xs uppercase tracking-wider block">
              2. Registre la placa <span className="text-rose-500">*</span>
            </label>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
              En mayúscula y sin espacios ni caracteres. Ejemplo: ABC123
            </p>
            <div className="relative max-w-md">
              <input
                type="text"
                value={plate}
                onFocus={() => setShowPlateSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPlateSuggestions(false), 250)}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setPlate(val);
                }}
                placeholder="ABC123"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-black placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all"
              />
              <div className="absolute right-4 top-4 text-slate-400">
                <Truck size={18} />
              </div>

              {/* Suggestions dropdown */}
              {showPlateSuggestions && suggestedVehicles.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-150 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50">
                  {suggestedVehicles.map(v => (
                    <button
                      key={v.plate}
                      type="button"
                      onClick={() => {
                        setPlate(v.plate);
                        setShowPlateSuggestions(false);
                      }}
                      className="w-full px-4 py-3 text-left text-xs font-mono font-bold hover:bg-slate-50 text-slate-800 flex justify-between items-center"
                    >
                      <span>{v.plate}</span>
                      <span className="text-[9px] font-sans font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                        {v.cd || 'No CD'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Question 3: Tipo de Rutina (Prefilled) */}
          <div className="space-y-3">
            <label className="text-slate-900 font-black text-xs uppercase tracking-wider block">
              3. Tipo de Rutina
            </label>
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl max-w-md flex items-center justify-between">
              <span className="text-xs font-black text-indigo-950 uppercase tracking-tight">Rutina 2</span>
              <span className="px-3 py-1 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                Pre-Seleccionado
              </span>
            </div>
          </div>

          {/* Question 4: Frecuencia de Mantenimiento Preventivo */}
          <div className="space-y-3">
            <label className="text-slate-900 font-black text-xs uppercase tracking-wider block">
              4. ¿Cuál es la frecuencia de mantenimiento preventivo? <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['5.000 km', '8.000 km', '10.000 km', '20.000 km'].map((freqOpt) => (
                <button
                  key={freqOpt}
                  type="button"
                  onClick={() => setFrequency(freqOpt as any)}
                  className={`p-4 rounded-2xl border text-center font-black text-xs transition-all ${
                    frequency === freqOpt
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-500'
                  }`}
                >
                  {freqOpt}
                </button>
              ))}
            </div>
          </div>

          {/* System Tracking fields within the visual layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-slate-900 font-black text-xs uppercase tracking-wider block">Taller Responsable</label>
                <select
                  value={selectedTaller}
                  onChange={(e) => setSelectedTaller(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none"
                >
                  {TALLERES_LIST.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {selectedTaller === 'OTROS' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-slate-900 font-black text-xs uppercase tracking-wider block text-amber-600">Especifique Taller *</label>
                  <input
                    required
                    type="text"
                    placeholder="NOMBRE DEL TALLER..."
                    className="w-full p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold outline-none uppercase"
                    value={otherTaller}
                    onChange={(e) => setOtherTaller(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-slate-900 font-black text-xs uppercase tracking-wider block">Kilometraje Actual</label>
              <input
                type="number"
                value={currentMileage}
                onChange={(e) => setCurrentMileage(e.target.value)}
                placeholder="Ej: 45000"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none"
              />
            </div>
          </div>

        </div>

        {/* QUESTIONS 5 TO 9: CHECKLIST SECTIONS */}
        <div className="space-y-8">
          {!frequency && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-[2rem] p-8 text-center animate-pulse">
              <AlertCircle className="mx-auto text-amber-500 mb-3 animate-bounce" size={32} />
              <p className="text-xs font-black uppercase tracking-wider">Por favor, seleccione la frecuencia de mantenimiento preventivo para visualizar los componentes a evaluar.</p>
            </div>
          )}
          {Object.entries(sectionGroups).map(([secNum, group]) => (
            <div key={secNum} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">{secNum}</span>
                  {group.title}
                </h4>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/20">
                {group.items.map((item, idx) => {
                  const currentResp = responses[item.id] || { status: 'OK' };
                  return (
                    <div key={item.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:bg-slate-50/40 transition-colors">
                      
                      {/* Left: Component Label */}
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-black px-2 py-0.5 rounded">
                            {idx + 1}
                          </span>
                          <span className="text-[8px] bg-indigo-50 text-indigo-700 font-black uppercase tracking-wider px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-800 leading-snug">{item.name}</p>
                      </div>

                      {/* Right: Choice buttons & input if "NO" */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                          
                          {/* SI (Maps to OK) */}
                          <button
                            type="button"
                            onClick={() => setResponses(prev => ({
                              ...prev,
                              [item.id]: { status: 'OK', note: '' }
                            }))}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                              currentResp.status === 'OK'
                                ? 'bg-[#0f172a] text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                            }`}
                          >
                            SI
                          </button>

                          {/* NO (Maps to FAIL) */}
                          <button
                            type="button"
                            onClick={() => setResponses(prev => ({
                              ...prev,
                              [item.id]: { status: 'FAIL', note: prev[item.id]?.note || '' }
                            }))}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                              currentResp.status === 'FAIL'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                            }`}
                          >
                            NO
                          </button>

                          {/* NA (Maps to NA) */}
                          <button
                            type="button"
                            onClick={() => setResponses(prev => ({
                              ...prev,
                              [item.id]: { status: 'NA', note: '' }
                            }))}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                              currentResp.status === 'NA'
                                ? 'bg-slate-400 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                            }`}
                          >
                            NA
                          </button>

                        </div>

                        {/* Force Detail if NO (FAIL) */}
                        {currentResp.status === 'FAIL' && (
                          <div className="w-full sm:w-60 animate-in slide-in-from-top-1 duration-250">
                            <input
                              type="text"
                              value={currentResp.note || ''}
                              onChange={(e) => setResponses(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], note: e.target.value }
                              }))}
                              placeholder="Describa el hallazgo..."
                              className="w-full p-2 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold outline-none placeholder:text-rose-300 focus:ring-1 focus:ring-rose-400"
                              required
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>

        {/* BOTTOM SECTION: PHOTOS & SIGNATURES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Photos */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <h5 className="text-slate-900 font-black text-xs uppercase tracking-wider">Evidencias de la Inspección (Máx 4)</h5>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
              Tome fotos con su cámara o cárguelas de su galería para armar un collage en alta calidad.
            </p>

            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
                id="routine-2-photo-input"
              />
              
              {selectedPhotos.length > 0 ? (
                <div className="space-y-3">
                  {/* Collage Preview */}
                  {evidencePhoto && (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <img src={evidencePhoto} alt="Collage de Evidencias" className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest text-white">
                        Vista Previa Collage
                      </div>
                    </div>
                  )}

                  {/* Individual Photos Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {selectedPhotos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {selectedPhotos.length < 4 && (
                      <label
                        htmlFor="routine-2-photo-input"
                        className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/5 transition-all text-slate-400 hover:text-emerald-600"
                      >
                        <Camera size={16} />
                        <span className="text-[8px] font-black uppercase">Añadir</span>
                      </label>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={clearAllPhotos}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Eliminar Todas ({selectedPhotos.length})
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="routine-2-photo-input"
                  className="w-full h-48 bg-slate-50 hover:bg-indigo-50/5 border-2 border-dashed border-slate-200 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-700 cursor-pointer transition-all group"
                >
                  <Camera size={24} className="text-slate-300 group-hover:text-indigo-500 transition-all" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">
                    Tomar Fotos o Galería (Hasta 4)
                  </span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                    CÁMARA / GALERÍA
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h5 className="text-slate-900 font-black text-xs uppercase tracking-wider">Firma Digital</h5>
              <button
                type="button"
                onClick={clearSignature}
                className="text-[9px] font-black text-rose-600 hover:text-rose-800 uppercase tracking-widest"
              >
                Limpiar
              </button>
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
              Firme con el mouse o dedo en el espacio gris.
            </p>

            <div className="relative border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden h-48">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full cursor-crosshair bg-slate-50/80"
                width={360}
                height={190}
                id="sig-canvas-r2"
              />
              {!signatureData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-[9px] font-black uppercase tracking-wider opacity-60">
                  Firme aquí
                </div>
              )}
            </div>
          </div>

        </div>

        {/* General Notes */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-2">
          <label className="text-slate-900 font-black text-xs uppercase tracking-wider block">Observaciones Adicionales</label>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            rows={3}
            placeholder="Registre comentarios generales si los hay..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>

        {/* Action Bar */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
          >
            Regresar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={`px-8 py-3 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 ${
              isSaving 
                ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/25'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando en nube...
              </>
            ) : (
              'Guardar Rutina 2'
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
