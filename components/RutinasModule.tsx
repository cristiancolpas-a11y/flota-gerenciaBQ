import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle, Driver } from '../types';
import { RoutineForm_1 } from './RoutineForm_1';
import { RoutineForm_2 } from './RoutineForm_2';
import { RoutineForm_3 } from './RoutineForm_3';
import { RoutineForm_4 } from './RoutineForm_4';
import { getRoutinesDocId, setRoutinesDocId } from '../services/sheetService';
import { 
  CheckCircle2, XCircle, AlertTriangle, Calendar, Clock, Truck, User, Plus, Search, 
  FileText, Sparkles, ShieldAlert, Gauge, TrendingUp, ClipboardCheck, Activity, 
  ChevronRight, Trash2, Download, Check, RefreshCw, Layers, ClipboardList, Info, Trash
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

// --- TYPES FOR ROUTINES ---
export interface RoutineChecklistItem {
  id: string;
  name: string;
  category: string;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // 'sparkles' | 'shield' | 'gauge' | 'wrench'
  items: RoutineChecklistItem[];
}

export interface RoutineResponse {
  itemId: string;
  status: 'OK' | 'FAIL' | 'NA';
  noveltyDescription?: string;
}

export interface RoutineExecution {
  id: string;
  date: string;
  plate: string;
  driverId: string;
  driverName: string;
  templateId: string;
  templateName: string;
  responses: RoutineResponse[];
  mileage: number;
  score: number; // percentage of OK items (excluding NA)
  hasFailures: boolean;
  notes?: string;
  signatureUrl?: string; // Base64 signature
  evidenceUrl?: string;  // Base64 evidence photo
  cd?: string;
  contractor?: string;
}

export interface ScheduledRoutine {
  id: string;
  plate: string;
  templateId: string;
  templateName: string;
  frequency: 'Diario' | 'Semanal' | 'Mensual' | 'Quincenal';
  nextDueDate: string;
  status: 'Vigente' | 'Próximo' | 'Vencido';
  assignedDriverId?: string;
  assignedDriverName?: string;
}

interface RutinasModuleProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  onReportNovelty?: (noveltyData: {
    plate: string;
    date: string;
    novelty: string;
    source: string;
    cd?: string;
    contractor?: string;
  }) => void;
  onBack?: () => void;
  defaultTemplateId?: string;
}

// --- CONSTANT ROUTINE TEMPLATES ---
const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'rutina_1',
    name: 'RUTINA 1: Lubricación, Filtros y Refrigeración',
    description: 'Control preventivo de niveles de aceite de motor, filtros de aire y combustible, líquido de refrigerante y estado de mangueras.',
    icon: 'wrench',
    items: [
      { id: 'r1_c_aceite_motor', name: 'Aceite Motor ( Para los Inter MV607 se realiza cada 16 mil KM)', category: 'CAMBIO' },
      { id: 'r1_c_filtro_aceite', name: 'Filtro de aceite ( Para los Inter MV607 se realiza cada 16 mil KM)', category: 'CAMBIO' },
      { id: 'r1_c_filtro_primario', name: 'Filtro combustible primario ( Para los Inter MV607 se realiza cada 16 mil KM)', category: 'CAMBIO' },
      { id: 'r1_c_filtro_secundario', name: 'Filtro combustible secundario o trampa de agua', category: 'CAMBIO' },
      { id: 'r1_e_suspension', name: 'General Suspensión', category: 'ENGRASE' },
      { id: 'r1_e_articulaciones', name: 'Articulaciones, Crucetas, Cardanes, Bujes y Pasadores', category: 'ENGRASE' },
      { id: 'r1_l_agua_bateria', name: 'Agua Batería', category: 'LIQUIDOS' },
      { id: 'r1_l_refrigerante', name: 'Liquido Refrigerante y LimpiaParabrisas', category: 'LIQUIDOS' },
      { id: 'r1_l_aceites_direccion', name: 'Aceites de dirección, Caja y Diferencial', category: 'LIQUIDOS' },
      { id: 'r1_t_frenos', name: 'Frenos', category: 'TENSION' },
      { id: 'r1_t_correas', name: 'Correas Motor', category: 'TENSION' },
      { id: 'r1_t_embrague', name: 'Embrague y/o calibrar varillaje (según parámetros)', category: 'TENSION' },
      { id: 'r1_i_filtro_aire', name: 'Filtro de aire primario y secundario', category: 'INSPECCION' },
      { id: 'r1_i_luces', name: 'Luces Delanteras, Traseras', category: 'INSPECCION' },
      { id: 'r1_i_luces_tablero', name: 'Luces e Indicadores de Tablero', category: 'INSPECCION' },
      { id: 'r1_i_mangueras_ref', name: 'Tuberías y Mangueras Refrigeración y la Concentración de refrigerante', category: 'INSPECCION' },
      { id: 'r1_i_mangueras_aceite', name: 'Tuberías y Mangueras Aceite', category: 'INSPECCION' },
      { id: 'r1_i_admision_escape', name: 'Sistema Admisión and Escape (Conductos y Turbo)', category: 'INSPECCION' },
      { id: 'r1_i_terminales_rotulas', name: 'Terminales y Rotulas', category: 'INSPECCION' },
      { id: 'r1_i_fugas', name: 'Fugas de aire y aceites', category: 'INSPECCION' },
      { id: 'r1_i_suspension', name: 'Suspensión en General', category: 'INSPECCION' },
      { id: 'r1_i_marcha_minima', name: 'Marcha Mínima motor', category: 'INSPECCION' },
      { id: 'r1_i_presion_llantas', name: 'Presión y labrado llantas', category: 'INSPECCION' }
    ]
  },
  {
    id: 'rutina_2',
    name: 'RUTINA 2: Filtros, Rodamientos, Chasis y Dirección',
    description: 'Cambios de aceite y filtros, engrase de rodamientos y suspensión, control de líquidos, tensión de correas e inspección de dirección y mangueras.',
    icon: 'wrench',
    items: [
      { id: 'r2_c_aceite_motor', name: 'Aceite Motor', category: 'CAMBIO' },
      { id: 'r2_c_filtro_aceite', name: 'Filtro de aceite', category: 'CAMBIO' },
      { id: 'r2_c_filtro_primario', name: 'Filtro combustible primario', category: 'CAMBIO' },
      { id: 'r2_c_filtro_secundario', name: 'Filtro combustible secundario o trampa de agua', category: 'CAMBIO' },
      { id: 'r2_c_filtro_aire_primario', name: 'Filtro de aire primario', category: 'CAMBIO' },
      { id: 'r2_e_suspension_rodamientos', name: 'General Suspensión y rodamientos ruedas delanteras', category: 'ENGRASE' },
      { id: 'r2_e_articulaciones', name: 'Articulaciones, Crucetas, Cardanes, Bujes y Pasadores', category: 'ENGRASE' },
      { id: 'r2_l_agua_bateria', name: 'Agua Batería', category: 'LIQUIDOS' },
      { id: 'r2_l_refrigerante', name: 'Liquido Refrigerante y LimpiaParabrisas', category: 'LIQUIDOS' },
      { id: 'r2_l_aceites_direccion', name: 'Aceites de dirección, Caja y Diferencial', category: 'LIQUIDOS' },
      { id: 'r2_t_frenos', name: 'Frenos', category: 'TENSION' },
      { id: 'r2_t_correas', name: 'Correas Motor', category: 'TENSION' },
      { id: 'r2_t_embrague', name: 'Embrague y/o calibrar varillaje (según parámetros)', category: 'TENSION' },
      { id: 'r2_i_luces', name: 'Luces Delanteras, Traseras y furgon', category: 'INSPECCION' },
      { id: 'r2_i_luces_tablero', name: 'Luces e Indicadores de Tablero', category: 'INSPECCION' },
      { id: 'r2_i_mangueras_ref', name: 'Tuberías y Mangueras Refrigeración y la Concentración de refrigerante', category: 'INSPECCION' },
      { id: 'r2_i_mangueras_aceite', name: 'Tuberías y Mangueras Aceite', category: 'INSPECCION' },
      { id: 'r2_i_terminales_rotulas', name: 'Terminales y Rotulas', category: 'INSPECCION' },
      { id: 'r2_i_suspension', name: 'Suspensión en General', category: 'INSPECCION' },
      { id: 'r2_i_admision_escape', name: 'Sistema Admisión y Escape (Conductos y Turbo)', category: 'INSPECCION' },
      { id: 'r2_i_fugas', name: 'Fugas de aire y aceites', category: 'INSPECCION' },
      { id: 'r2_i_marcha_minima', name: 'Marcha Mínima motor', category: 'INSPECCION' },
      { id: 'r2_i_direccion', name: 'Dirección', category: 'INSPECCION' },
      { id: 'r2_i_freno_motor', name: 'Funcionamiento Freno de Motor', category: 'INSPECCION' },
      { id: 'r2_i_varillaje_direccion', name: 'Varillaje Dirección', category: 'INSPECCION' },
      { id: 'r2_i_sistema_combustible', name: 'Sistema Combustible (Abrazaderas y Mangueras)', category: 'INSPECCION' }
    ]
  },
  {
    id: 'rutina_3',
    name: 'RUTINA 3: Cambio de Filtros, Engrase, Líquidos y Suspensión',
    description: 'Cambios de aceite y filtros, engrase general, control de líquidos, tensión y revisión detallada de suspensión, luces y llantas.',
    icon: 'wrench',
    items: [
      { id: 'r3_c_aceite_motor', name: 'Aceite Motor', category: 'CAMBIO' },
      { id: 'r3_c_filtro_aceite', name: 'Filtro de aceite', category: 'CAMBIO' },
      { id: 'r3_c_filtro_primario', name: 'Filtro combustible primario', category: 'CAMBIO' },
      { id: 'r3_c_filtro_secundario', name: 'Filtro combustible secundario o trampa de agua', category: 'CAMBIO' },
      { id: 'r3_c_filtro_aire_secundario', name: 'Filtro de aire secundario', category: 'CAMBIO' },
      { id: 'r3_e_suspension', name: 'General Suspensión', category: 'ENGRASE' },
      { id: 'r3_e_articulaciones', name: 'Articulaciones, Crucetas, Cardanes, Bujes y Pasadores', category: 'ENGRASE' },
      { id: 'r3_l_agua_bateria', name: 'Agua Batería', category: 'LIQUIDOS' },
      { id: 'r3_l_refrigerante', name: 'Liquido Refrigerante y LimpiaParabrisas', category: 'LIQUIDOS' },
      { id: 'r3_l_aceites_direccion', name: 'Aceites de dirección, Caja y Diferencial', category: 'LIQUIDOS' },
      { id: 'r3_t_frenos', name: 'Frenos', category: 'TENSION' },
      { id: 'r3_t_correas', name: 'Correas Motor', category: 'TENSION' },
      { id: 'r3_t_embrague', name: 'Embrague y/o calibrar varillaje (según parámetros)', category: 'TENSION' },
      { id: 'r3_i_filtro_aire', name: 'Filtro de aire primario y secundario', category: 'INSPECCION' },
      { id: 'r3_i_luces', name: 'Luces Delanteras, Traseras', category: 'INSPECCION' },
      { id: 'r3_i_luces_tablero', name: 'Luces e Indicadores de Tablero', category: 'INSPECCION' },
      { id: 'r3_i_mangueras_ref', name: 'Tuberías y Mangueras Refrigeración y la Concentración de refrigerante', category: 'INSPECCION' },
      { id: 'r3_i_mangueras_aceite', name: 'Tuberías y Mangueras Aceite', category: 'INSPECCION' },
      { id: 'r3_i_admision_escape', name: 'Sistema Admisión y Escape (Conductos y Turbo)', category: 'INSPECCION' },
      { id: 'r3_i_terminales_rotulas', name: 'Terminales y Rótulas', category: 'INSPECCION' },
      { id: 'r3_i_fugas', name: 'Fugas de aire y aceites', category: 'INSPECCION' },
      { id: 'r3_i_suspension', name: 'Suspensión en General', category: 'INSPECCION' },
      { id: 'r3_i_marcha_minima', name: 'Marcha Mínima motor', category: 'INSPECCION' },
      { id: 'r3_i_presion_llantas', name: 'Presión y labrado llantas', category: 'INSPECCION' },
      { id: 'r3_i_rotar_llantas', name: 'Rotar llantas (Si es necesario)', category: 'INSPECCION' }
    ]
  },
  {
    id: 'rutina_4',
    name: 'RUTINA 4: Sistema Eléctrico y Diagnóstico',
    description: 'Mantenimiento preventivo completo incluyendo cambio, engrase, líquidos, tensión y revisión detallada de dirección, suspensión y luces.',
    icon: 'wrench',
    items: [
      { id: 'r4_c_aceite_motor', name: 'Aceite Motor', category: 'CAMBIO' },
      { id: 'r4_c_filtro_aceite', name: 'Filtro de aceite', category: 'CAMBIO' },
      { id: 'r4_c_filtro_aire_secundario', name: 'Filtro Aire Secundario', category: 'CAMBIO' },
      { id: 'r4_c_filtro_aceite_hidraulico', name: 'Filtro aceite hidráulico', category: 'CAMBIO' },
      { id: 'r4_c_filtro_transmision', name: 'Filtro de transmisión', category: 'CAMBIO' },
      { id: 'r4_c_aceite_direccion', name: 'Aceite dirección', category: 'CAMBIO' },
      { id: 'r4_c_correas_motor', name: 'Correas Motor', category: 'CAMBIO' },
      { id: 'r4_c_liquido_refrigerante', name: 'Líquido Refrigerante', category: 'CAMBIO' },
      { id: 'r4_c_filtro_aire_primario', name: 'Filtro de aire primario', category: 'CAMBIO' },
      { id: 'r4_c_filtro_combustible_primario', name: 'Filtro combustible primario', category: 'CAMBIO' },
      { id: 'r4_c_filtro_combustible_secundario', name: 'Filtro de combustible secundario o trampa de agua', category: 'CAMBIO' },
      { id: 'r4_c_aceite_diferencial', name: 'Aceite diferencial', category: 'CAMBIO' },
      { id: 'r4_c_aceite_caja_velocidades', name: 'Aceite caja de velocidades', category: 'CAMBIO' },
      { id: 'r4_c_filtro_aire_compresor', name: 'Filtro aire compresor (Si aplica)', category: 'CAMBIO' },
      { id: 'r4_e_general_suspension', name: 'General Suspensión', category: 'ENGRASE' },
      { id: 'r4_e_articulaciones', name: 'Articulaciones, Crucetas, Cardanes, Bujes y Pasadores', category: 'ENGRASE' },
      { id: 'r4_e_rodamientos_delanteros', name: 'Rodamientos ruedas delanteras', category: 'ENGRASE' },
      { id: 'r4_a_direccion', name: 'Dirección', category: 'ALINEACIÓN' },
      { id: 'r4_l_agua_bateria', name: 'Agua Batería', category: 'LÍQUIDOS' },
      { id: 'r4_l_refrigerante_limpiaparabrisas', name: 'Liquido Refrigerante y LimpiaParabrisas', category: 'LÍQUIDOS' },
      { id: 'r4_l_aceites', name: 'Aceites de dirección, Caja y Diferencial', category: 'LÍQUIDOS' },
      { id: 'r4_t_frenos', name: 'Frenos', category: 'TENSIÓN' },
      { id: 'r4_t_correas_motor', name: 'Correas Motor', category: 'TENSIÓN' },
      { id: 'r4_t_embrague', name: 'Embrague y/o calibrar varillaje (según parámetros)', category: 'TENSIÓN' },
      { id: 'r4_i_luces', name: 'Luces Delanteras, Traseras', category: 'INSPECCION' },
      { id: 'r4_i_luces_tablero', name: 'Luces e Indicadores de Tablero', category: 'INSPECCION' },
      { id: 'r4_i_tuberias_mangueras_refrigeracion', name: 'Tuberías y Mangueras Refrigeración y la concentración del refrigerante', category: 'INSPECCION' },
      { id: 'r4_i_tuberias_mangueras_aceite', name: 'Tuberías y Mangueras Aceite', category: 'INSPECCION' },
      { id: 'r4_i_sistema_admision_escape', name: 'Sistema Admisión y Escape (Conductos y Turbo)', category: 'INSPECCION' },
      { id: 'r4_i_terminales_rotulas', name: 'Terminales y Rótulas', category: 'INSPECCION' },
      { id: 'r4_i_fugas', name: 'Fugas de aire y aceites', category: 'INSPECCION' },
      { id: 'r4_i_suspension', name: 'Suspensión en General', category: 'INSPECCION' },
      { id: 'r4_i_marcha_minima', name: 'Marcha Mínima motor', category: 'INSPECCION' },
      { id: 'r4_i_presion_llantas', name: 'Presión y labrado llantas', category: 'INSPECCION' },
      { id: 'r4_i_rotar_llantas', name: 'Rotar llantas (Si es necesario)', category: 'INSPECCION' },
      { id: 'r4_i_freno_motor', name: 'Freno de motor', category: 'INSPECCION' },
      { id: 'r4_i_varillaje_direccion', name: 'Varillaje dirección', category: 'INSPECCION' }
    ]
  }
];

export const RutinasModule: React.FC<RutinasModuleProps> = ({ 
  vehicles = [], 
  drivers = [],
  onReportNovelty,
  onBack,
  defaultTemplateId = 'rutina_1'
}) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'exec' | 'history'>('exec');
  const [executions, setExecutions] = useState<RoutineExecution[]>([]);
  const [schedules, setSchedules] = useState<ScheduledRoutine[]>([]);
  
  // Execution Form State
  const [selectedPlate, setSelectedPlate] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [responses, setResponses] = useState<Record<string, { status: 'OK' | 'FAIL' | 'NA', note?: string }>>({});
  const [currentMileage, setCurrentMileage] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [autoReportNovelties, setAutoReportNovelties] = useState(true);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Scheduler Form State
  const [schedPlate, setSchedPlate] = useState('');
  const [schedTemplateId, setSchedTemplateId] = useState(defaultTemplateId);

  // Sync state when defaultTemplateId prop changes
  useEffect(() => {
    setSelectedTemplateId(defaultTemplateId);
    setSchedTemplateId(defaultTemplateId);
  }, [defaultTemplateId]);
  const [schedFreq, setSchedFreq] = useState<'Diario' | 'Semanal' | 'Mensual' | 'Quincenal'>('Semanal');
  const [schedDriverId, setSchedDriverId] = useState('');
  const [schedDueDate, setSchedDueDate] = useState('');

  // Filter & Search States
  const [historySearch, setHistorySearch] = useState('');
  const [historyTemplateFilter, setHistoryTemplateFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'perfect' | 'with_fails'>('all');
  const [selectedDetailExecution, setSelectedDetailExecution] = useState<RoutineExecution | null>(null);

  // Signature canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Routines spreadsheet ID states
  const [showSettings, setShowSettings] = useState(false);
  const [sheetIdInput, setSheetIdInput] = useState(() => getRoutinesDocId());
  const [saveFeedback, setSaveFeedback] = useState('');

  const handleSaveSheetId = () => {
    setRoutinesDocId(sheetIdInput);
    setSaveFeedback('¡ID de hoja guardado correctamente en almacenamiento local!');
    setTimeout(() => setSaveFeedback(''), 4000);
  };

  // --- INITIAL SEED DATA AND LOAD ---
  useEffect(() => {
    // Load executions
    const storedExecs = localStorage.getItem('routine_executions');
    if (storedExecs) {
      try {
        setExecutions(JSON.parse(storedExecs));
      } catch (e) {
        console.error("Error parsing routine executions", e);
      }
    } else {
      // Seed initial executions for rich dashboard view
      const mockExecs: RoutineExecution[] = [
        {
          id: 'mock-1',
          date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString().split('T')[0], // Today
          plate: vehicles[0]?.plate || 'COLGU476',
          driverId: drivers[0]?.id || 'D-01',
          driverName: drivers[0]?.name || 'Juan Carlos Pérez',
          templateId: ROUTINE_TEMPLATES[0].id,
          templateName: ROUTINE_TEMPLATES[0].name,
          mileage: (vehicles[0]?.currentMileage || 12000) - 15,
          score: 100,
          hasFailures: false,
          notes: 'Inspección sin novedades. Todo al día.',
          cd: vehicles[0]?.cd || 'LA ARENOSA',
          contractor: vehicles[0]?.contractor || 'LOGISTICOS.CO',
          responses: ROUTINE_TEMPLATES[0].items.map(item => ({ itemId: item.id, status: 'OK' }))
        },
        {
          id: 'mock-2',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().split('T')[0], // Yesterday
          plate: vehicles[1]?.plate || 'COLGU444',
          driverId: drivers[1]?.id || 'D-02',
          driverName: drivers[1]?.name || 'Andres Martinez',
          templateId: ROUTINE_TEMPLATES[0].id,
          templateName: ROUTINE_TEMPLATES[0].name,
          mileage: (vehicles[1]?.currentMileage || 33900) - 25,
          score: 80,
          hasFailures: true,
          notes: 'Nivel del refrigerante cerca del límite inferior, se requiere rellenar líquido.',
          cd: vehicles[1]?.cd || 'LA ARENOSA',
          contractor: vehicles[1]?.contractor || 'TEV',
          responses: ROUTINE_TEMPLATES[0].items.map((item, idx) => {
            if (idx === 2) {
              return { itemId: item.id, status: 'FAIL', noveltyDescription: 'Líquido de refrigerante en nivel mínimo.' };
            }
            return { itemId: item.id, status: 'OK' };
          })
        },
        {
          id: 'mock-3',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0], // 3 days ago
          plate: vehicles[2]?.plate || 'COLGU383',
          driverId: drivers[2]?.id || 'D-03',
          driverName: drivers[2]?.name || 'Carlos Gomez',
          templateId: ROUTINE_TEMPLATES[0].id,
          templateName: ROUTINE_TEMPLATES[0].name,
          mileage: (vehicles[2]?.currentMileage || 9500) - 100,
          score: 100,
          hasFailures: false,
          notes: 'Filtros y mangueras óptimas, sin ruidos anormales.',
          cd: vehicles[2]?.cd || 'LA ARENOSA',
          contractor: vehicles[2]?.contractor || 'LOGISTICOS.CO',
          responses: ROUTINE_TEMPLATES[0].items.map(item => ({ itemId: item.id, status: 'OK' }))
        },
        {
          id: 'mock-4',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString().split('T')[0], // 4 days ago
          plate: vehicles[3]?.plate || 'COLGU448',
          driverId: drivers[3]?.id || 'D-04',
          driverName: drivers[3]?.name || 'José Rodriguez',
          templateId: ROUTINE_TEMPLATES[0].id,
          templateName: ROUTINE_TEMPLATES[0].name,
          mileage: (vehicles[3]?.currentMileage || 21500) - 80,
          score: 90,
          hasFailures: true,
          notes: 'Falta ajustar la tensión de las fajas y correas de accesorios.',
          cd: vehicles[3]?.cd || 'LA ARENOSA',
          contractor: vehicles[3]?.contractor || 'LOGISTICOS.CO',
          responses: ROUTINE_TEMPLATES[0].items.map((item, idx) => {
            if (idx === 3) {
              return { itemId: item.id, status: 'FAIL', noveltyDescription: 'Correa de accesorios ligeramente floja.' };
            }
            return { itemId: item.id, status: 'OK' };
          })
        }
      ];
      setExecutions(mockExecs);
      localStorage.setItem('routine_executions', JSON.stringify(mockExecs));
    }

    // Load schedules
    const storedScheds = localStorage.getItem('routine_schedules');
    if (storedScheds) {
      try {
        setSchedules(JSON.parse(storedScheds));
      } catch (e) {
        console.error("Error parsing routine schedules", e);
      }
    } else {
      // Seed initial schedules
      const mockScheds: ScheduledRoutine[] = vehicles.slice(0, 5).map((v, idx) => {
        const currentTemplate = ROUTINE_TEMPLATES[0];
        const freqs: Array<ScheduledRoutine['frequency']> = ['Diario', 'Semanal', 'Semanal', 'Mensual', 'Quincenal'];
        const daysAhead = idx === 0 ? -1 : idx === 1 ? 0 : idx * 2; // Create some vencido / próximo
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysAhead);
        
        let status: ScheduledRoutine['status'] = 'Vigente';
        if (daysAhead < 0) status = 'Vencido';
        else if (daysAhead === 0) status = 'Próximo';

        return {
          id: `sched-${idx}`,
          plate: v.plate,
          templateId: currentTemplate.id,
          templateName: currentTemplate.name,
          frequency: freqs[idx % freqs.length],
          nextDueDate: dueDate.toISOString().split('T')[0],
          status,
          assignedDriverId: drivers[idx % drivers.length]?.id,
          assignedDriverName: drivers[idx % drivers.length]?.name
        };
      });
      setSchedules(mockScheds);
      localStorage.setItem('routine_schedules', JSON.stringify(mockScheds));
    }
  }, [vehicles, drivers]);

  // Set default form values once vehicles/drivers are loaded
  useEffect(() => {
    if (vehicles.length > 0 && !selectedPlate) {
      setSelectedPlate(vehicles[0].plate);
    }
    if (drivers.length > 0 && !selectedDriverId) {
      setSelectedDriverId(drivers[0].id);
    }
    // Scheduler defaults
    if (vehicles.length > 0 && !schedPlate) {
      setSchedPlate(vehicles[0].plate);
    }
    if (drivers.length > 0 && !schedDriverId) {
      setSchedDriverId(drivers[0].id);
    }
  }, [vehicles, drivers, selectedPlate, selectedDriverId, schedPlate, schedDriverId]);

  // Set default checklist responses when template changes
  useEffect(() => {
    const template = ROUTINE_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (template) {
      const initial: Record<string, { status: 'OK' | 'FAIL' | 'NA', note?: string }> = {};
      template.items.forEach(item => {
        initial[item.id] = { status: 'OK' };
      });
      setResponses(initial);
    }
  }, [selectedTemplateId]);

  // Draw on Canvas setup
  useEffect(() => {
    if (activeTab === 'exec' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeTab]);

  // --- STATS COMPUTATION ---
  const stats = useMemo(() => {
    const totalExecs = executions.length;
    const withFails = executions.filter(e => e.hasFailures).length;
    const cleanExecs = totalExecs - withFails;
    
    // Average compliance score
    const avgScore = totalExecs > 0 
      ? Math.round(executions.reduce((acc, curr) => acc + curr.score, 0) / totalExecs) 
      : 0;

    // Overdue schedules
    const overdueCount = schedules.filter(s => {
      const today = new Date().toISOString().split('T')[0];
      return s.nextDueDate < today;
    }).length;

    // Compliance by category
    const categoryStats: Record<string, { total: number, ok: number }> = {};
    executions.forEach(exec => {
      exec.responses.forEach(resp => {
        const template = ROUTINE_TEMPLATES.find(t => t.id === exec.templateId);
        const item = template?.items.find(i => i.id === resp.itemId);
        if (item) {
          if (!categoryStats[item.category]) {
            categoryStats[item.category] = { total: 0, ok: 0 };
          }
          if (resp.status !== 'NA') {
            categoryStats[item.category].total += 1;
            if (resp.status === 'OK') {
              categoryStats[item.category].ok += 1;
            }
          }
        }
      });
    });

    const categoryData = Object.keys(categoryStats).map(cat => ({
      name: cat,
      score: Math.round((categoryStats[cat].ok / categoryStats[cat].total) * 100) || 0
    })).sort((a, b) => b.score - a.score);

    // Routines by Plate (for leaderboard)
    const plateCounts: Record<string, number> = {};
    executions.forEach(e => {
      plateCounts[e.plate] = (plateCounts[e.plate] || 0) + 1;
    });
    const leaderboard = Object.keys(plateCounts).map(plate => ({
      plate,
      count: plateCounts[plate]
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      totalExecs,
      cleanExecs,
      withFails,
      avgScore,
      overdueCount,
      categoryData,
      leaderboard
    };
  }, [executions, schedules]);

  // --- HANDLERS FOR EXECUTION SIGNATURE AND DRAWING ---
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
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      // Auto-save to signatureState
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

  // --- MOCK IMAGE UPLOAD (evidence generator) ---
  const triggerMockEvidence = () => {
    // Generate a beautiful svg-based mock evidence of a vehicle inspect tool
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 300);
      
      // Draw simulated camera viewfinder grid
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 30, 320, 240);
      ctx.beginPath();
      ctx.moveTo(200, 30); ctx.lineTo(200, 270);
      ctx.moveTo(40, 150); ctx.lineTo(360, 150);
      ctx.stroke();

      // Draw truck outline
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(100, 100, 140, 70); // Cabine/carrocería
      ctx.fillRect(240, 120, 60, 50);  // Trompa
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(140, 180, 20, 0, Math.PI * 2);
      ctx.arc(260, 180, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(250, 125, 40, 20); // Ventana

      // Draw check text
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('INS_EVIDENCIA_' + selectedPlate + '_OK', 50, 50);
      ctx.fillText(new Date().toLocaleDateString(), 50, 70);

      setEvidencePhoto(canvas.toDataURL());
    }
  };

  // --- SUCCESS CALLBACK FOR INDEPENDENT FORMS ---
  const handleRoutineFormSuccess = (newExecution: RoutineExecution) => {
    const updatedExecs = [newExecution, ...executions];
    setExecutions(updatedExecs);
    localStorage.setItem('routine_executions', JSON.stringify(updatedExecs));

    // Report failures to "Novedades"
    if (newExecution.hasFailures && onReportNovelty) {
      const failures = newExecution.responses.filter(r => r.status === 'FAIL');
      failures.forEach(fail => {
        let itemName = 'Falla registrada';
        const template = ROUTINE_TEMPLATES.find(t => t.id === newExecution.templateId);
        if (template) {
          const itemObj = template.items.find(i => i.id === fail.itemId);
          if (itemObj) itemName = itemObj.name;
        }
        
        onReportNovelty({
          plate: newExecution.plate,
          date: newExecution.date,
          novelty: `[Mantenimiento Preventivo - ${newExecution.templateName}] FALLA EN: ${itemName}. Detalle: ${fail.noveltyDescription || 'Reportado en rutina'}`,
          source: 'RUTINAS',
          cd: newExecution.cd,
          contractor: newExecution.contractor
        });
      });
    }

    // Auto-advance schedule
    setSchedules(prev => {
      const copy = [...prev];
      const schedIdx = copy.findIndex(s => s.plate === newExecution.plate && s.templateId === newExecution.templateId);
      if (schedIdx !== -1) {
        const sched = copy[schedIdx];
        const nextDueDate = new Date();
        if (sched.frequency === 'Diario') nextDueDate.setDate(nextDueDate.getDate() + 1);
        else if (sched.frequency === 'Quincenal') nextDueDate.setDate(nextDueDate.getDate() + 15);
        else if (sched.frequency === 'Mensual') nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        else nextDueDate.setDate(nextDueDate.getDate() + 7);

        copy[schedIdx] = {
          ...sched,
          nextDueDate: nextDueDate.toISOString().split('T')[0],
          status: 'Vigente'
        };
      }
      localStorage.setItem('routine_schedules', JSON.stringify(copy));
      return copy;
    });

    // Go to history tab
    setActiveTab('history');
  };

  // --- SUBMIT ROUTINE EXECUTION ---
  const handleSubmitRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!selectedPlate) {
      setFormError('Por favor seleccione una placa de vehículo.');
      return;
    }
    if (!selectedDriverId) {
      setFormError('Por favor seleccione el conductor responsable.');
      return;
    }
    if (!currentMileage || isNaN(parseInt(currentMileage))) {
      setFormError('Por favor ingrese un kilometraje válido.');
      return;
    }

    const template = ROUTINE_TEMPLATES.find(t => t.id === selectedTemplateId)!;
    const driverObj = drivers.find(d => d.id === selectedDriverId)!;
    const vehicleObj = vehicles.find(v => v.plate === selectedPlate)!;

    // Compile responses
    const compiledResponses: RoutineResponse[] = template.items.map(item => {
      const resp = responses[item.id] || { status: 'OK' };
      return {
        itemId: item.id,
        status: resp.status,
        noveltyDescription: resp.note
      };
    });

    const totalRated = compiledResponses.filter(r => r.status !== 'NA').length;
    const totalOk = compiledResponses.filter(r => r.status === 'OK').length;
    const finalScore = totalRated > 0 ? Math.round((totalOk / totalRated) * 100) : 100;
    const failures = compiledResponses.filter(r => r.status === 'FAIL');
    const hasFailures = failures.length > 0;

    const newExecution: RoutineExecution = {
      id: 'exec-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      plate: selectedPlate,
      driverId: selectedDriverId,
      driverName: driverObj.name,
      templateId: selectedTemplateId,
      templateName: template.name,
      responses: compiledResponses,
      mileage: parseInt(currentMileage),
      score: finalScore,
      hasFailures,
      notes: generalNotes,
      signatureUrl: signatureData || undefined,
      evidenceUrl: evidencePhoto || undefined,
      cd: vehicleObj?.cd || 'BARRANQUILLA',
      contractor: vehicleObj?.contractor || 'LOGISTICOS.CO'
    };

    // Update state
    const updatedExecs = [newExecution, ...executions];
    setExecutions(updatedExecs);
    localStorage.setItem('routine_executions', JSON.stringify(updatedExecs));

    // Handle reporting failures to the core "Novedades" module
    if (hasFailures && autoReportNovelties && onReportNovelty) {
      failures.forEach(fail => {
        const itemObj = template.items.find(i => i.id === fail.itemId);
        onReportNovelty({
          plate: selectedPlate,
          date: new Date().toISOString().split('T')[0],
          novelty: `[RUTINA - ${template.name}] FALLA EN: ${itemObj?.name}. Detalle: ${fail.noveltyDescription || 'Reportado en rutina'}`,
          source: 'RUTINAS',
          cd: vehicleObj?.cd,
          contractor: vehicleObj?.contractor
        });
      });
    }

    // Adjust schedule
    setSchedules(prev => {
      const copy = [...prev];
      const schedIdx = copy.findIndex(s => s.plate === selectedPlate && s.templateId === selectedTemplateId);
      if (schedIdx !== -1) {
        const sched = copy[schedIdx];
        const nextDueDate = new Date();
        if (sched.frequency === 'Diario') nextDueDate.setDate(nextDueDate.getDate() + 1);
        else if (sched.frequency === 'Quincenal') nextDueDate.setDate(nextDueDate.getDate() + 15);
        else if (sched.frequency === 'Mensual') nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        else nextDueDate.setDate(nextDueDate.getDate() + 7); // Semanal default

        copy[schedIdx] = {
          ...sched,
          nextDueDate: nextDueDate.toISOString().split('T')[0],
          status: 'Vigente'
        };
      }
      localStorage.setItem('routine_schedules', JSON.stringify(copy));
      return copy;
    });

    // Reset Form
    setGeneralNotes('');
    setSignatureData(null);
    setEvidencePhoto(null);
    setCurrentMileage('');
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 4000);
  };

  // --- SUBMIT SCHEDULER ROUTINE ---
  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedPlate) return;

    const template = ROUTINE_TEMPLATES.find(t => t.id === schedTemplateId)!;
    const driverObj = drivers.find(d => d.id === schedDriverId);

    const newSched: ScheduledRoutine = {
      id: 'sched-' + Date.now(),
      plate: schedPlate,
      templateId: schedTemplateId,
      templateName: template.name,
      frequency: schedFreq,
      nextDueDate: schedDueDate || new Date().toISOString().split('T')[0],
      status: 'Vigente',
      assignedDriverId: schedDriverId,
      assignedDriverName: driverObj?.name
    };

    const updated = [newSched, ...schedules];
    setSchedules(updated);
    localStorage.setItem('routine_schedules', JSON.stringify(updated));

    // Reset Scheduler Form
    setSchedDueDate('');
  };

  const handleDeleteSchedule = (id: string) => {
    const filtered = schedules.filter(s => s.id !== id);
    setSchedules(filtered);
    localStorage.setItem('routine_schedules', JSON.stringify(filtered));
  };

  const handleClearHistory = () => {
    if (window.confirm('¿Está seguro de que desea vaciar todo el historial de ejecuciones de rutinas?')) {
      setExecutions([]);
      localStorage.removeItem('routine_executions');
    }
  };

  // --- FILTERS FOR HISTORY ---
  const filteredHistory = useMemo(() => {
    return executions.filter(e => {
      const matchSearch = historySearch === '' || 
        e.plate.toLowerCase().includes(historySearch.toLowerCase()) || 
        e.driverName.toLowerCase().includes(historySearch.toLowerCase()) ||
        e.templateName.toLowerCase().includes(historySearch.toLowerCase());
      
      const matchTemplate = historyTemplateFilter === 'all' || e.templateId === historyTemplateFilter;
      
      const matchStatus = historyStatusFilter === 'all' || 
        (historyStatusFilter === 'perfect' && !e.hasFailures) ||
        (historyStatusFilter === 'with_fails' && e.hasFailures);

      return matchSearch && matchTemplate && matchStatus;
    });
  }, [executions, historySearch, historyTemplateFilter, historyStatusFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-2 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
            >
              <ChevronRight size={14} className="rotate-180" /> Regresar
            </button>
          )}
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <ClipboardCheck size={40} className="text-emerald-600" /> Mantenimiento Preventivo
          </h2>
          <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">
            Ejecución, control e inspecciones de mantenimiento preventivo de flota
          </p>
        </div>

        {/* Category Tab Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('exec')}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'exec' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <Plus size={14} /> Nuevo Control
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'history' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <ClipboardList size={14} /> Historial
              </div>
            </button>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-4 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              showSettings 
                ? 'bg-amber-100 border-amber-300 text-amber-900' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <RefreshCw size={14} className={showSettings ? 'animate-spin' : ''} />
            Configurar Hoja de Cálculo
          </button>
        </div>
      </div>

      {/* --- CONFIGURATION PANEL --- */}
      {showSettings && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <Info className="text-amber-600" size={24} />
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-amber-950">ID de Google Spreadsheet de Rutinas</h3>
              <p className="text-[11px] text-amber-800">
                Configure la hoja donde se guardarán las ejecuciones de las Rutinas 1, 2, 3 y 4.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={sheetIdInput}
              onChange={(e) => setSheetIdInput(e.target.value)}
              placeholder="Ej: 1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU"
              className="flex-1 p-3 border border-amber-200 bg-white rounded-xl text-xs font-bold outline-none text-slate-800"
            />
            <button
              onClick={handleSaveSheetId}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Guardar Configuración
            </button>
          </div>
          {saveFeedback && (
            <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <Check size={12} /> {saveFeedback}
            </p>
          )}
        </div>
      )}

      {/* --- EXECUTE ROUTINE VIEW --- */}
      {activeTab === 'exec' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {selectedTemplateId === 'rutina_1' && (
            <RoutineForm_1
              vehicles={vehicles}
              drivers={drivers}
              onSuccess={handleRoutineFormSuccess}
              onBack={onBack || (() => {})}
            />
          )}
          {selectedTemplateId === 'rutina_2' && (
            <RoutineForm_2
              vehicles={vehicles}
              drivers={drivers}
              onSuccess={handleRoutineFormSuccess}
              onBack={onBack || (() => {})}
            />
          )}
          {selectedTemplateId === 'rutina_3' && (
            <RoutineForm_3
              vehicles={vehicles}
              drivers={drivers}
              onSuccess={handleRoutineFormSuccess}
              onBack={onBack || (() => {})}
            />
          )}
          {selectedTemplateId === 'rutina_4' && (
            <RoutineForm_4
              vehicles={vehicles}
              drivers={drivers}
              onSuccess={handleRoutineFormSuccess}
              onBack={onBack || (() => {})}
            />
          )}
        </div>
      )}

      {/* --- HISTORY VIEW --- */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
          
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Historial de Controles</h3>
              <p className="text-slate-400 text-xs font-medium">Búsqueda y visualización de rutinas cargadas en esta sesión local.</p>
            </div>

            {/* Clear history option */}
            {executions.length > 0 && (
              <button 
                onClick={handleClearHistory}
                className="px-3 py-1.5 text-[9px] bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg font-black uppercase tracking-widest transition-all flex items-center gap-1"
              >
                <Trash2 size={12} /> Vaciar Historial
              </button>
            )}
          </div>

          {/* History Filters Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Search */}
            <div className="relative">
              <input 
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por placa, conductor..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none pl-10 focus:ring-2 focus:ring-indigo-500/20"
              />
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            </div>

            {/* Filter Template */}
            <select
              value={historyTemplateFilter}
              onChange={(e) => setHistoryTemplateFilter(e.target.value)}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="all">Todas las rutinas</option>
              {ROUTINE_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="all">Cualquier estado</option>
              <option value="perfect">Sin fallas (100% OK)</option>
              <option value="with_fails">Con fallas reportadas</option>
            </select>

            <div className="flex items-center justify-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Mostrando {filteredHistory.length} de {executions.length} registros
              </span>
            </div>
          </div>

          {/* History List or Table */}
          {filteredHistory.length > 0 ? (
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Vehículo</th>
                      <th className="p-4">Conductor</th>
                      <th className="p-4">Rutina</th>
                      <th className="p-4">Kilometraje</th>
                      <th className="p-4 text-center">Cumplimiento</th>
                      <th className="p-4 text-center">Estado</th>
                      <th className="p-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {filteredHistory.map(exec => (
                      <tr key={exec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-slate-500">{exec.date}</td>
                        <td className="p-4">
                          <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-black text-[11px] tracking-tight">
                            {exec.plate}
                          </span>
                        </td>
                        <td className="p-4 text-slate-900">{exec.driverName}</td>
                        <td className="p-4 text-slate-500 font-medium">{exec.templateName}</td>
                        <td className="p-4 text-slate-800 font-mono">{exec.mileage?.toLocaleString()} KM</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            exec.score === 100 ? 'bg-emerald-50 text-emerald-700' :
                            exec.score > 75 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {exec.score}%
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {exec.hasFailures ? (
                            <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <AlertTriangle size={10} /> Con Falla
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <CheckCircle2 size={10} /> Perfecto
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedDetailExecution(exec)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-all"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center p-20 border border-dashed border-slate-200 rounded-3xl">
              <ClipboardCheck size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No se encontraron rutinas registradas</p>
              <p className="text-xs text-slate-400/80 mt-1 font-medium">Pruebe registrando una nueva rutina o verifique sus filtros.</p>
            </div>
          )}

        </div>
      )}

      {/* --- DRILLDOWN DETAIL MODAL --- */}
      {selectedDetailExecution && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col p-6 space-y-6 border border-slate-100 animate-in zoom-in duration-300">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[9px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                  Detalle de Inspección
                </span>
                <h4 className="text-lg font-black text-slate-900 uppercase mt-1.5">{selectedDetailExecution.templateName}</h4>
                <p className="text-xs text-slate-400 font-medium">{selectedDetailExecution.date} • Resp: {selectedDetailExecution.driverName}</p>
              </div>
              <button 
                onClick={() => setSelectedDetailExecution(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* General Score Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Cumplimiento</p>
                <p className={`text-2xl font-black mt-0.5 ${
                  selectedDetailExecution.score === 100 ? 'text-emerald-600' :
                  selectedDetailExecution.score > 75 ? 'text-amber-600' : 'text-rose-600'
                }`}>{selectedDetailExecution.score}%</p>
              </div>
              <div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Vehículo (Placa)</p>
                <p className="text-sm font-mono font-black text-slate-800 mt-1.5">{selectedDetailExecution.plate}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Kilometraje</p>
                <p className="text-sm font-black text-slate-800 mt-1.5">{selectedDetailExecution.mileage?.toLocaleString()} KM</p>
              </div>
              <div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Condición</p>
                <p className="text-sm font-black mt-1.5">
                  {selectedDetailExecution.hasFailures ? (
                    <span className="text-rose-600">Revisión Falla</span>
                  ) : (
                    <span className="text-emerald-600">Aprobado</span>
                  )}
                </p>
              </div>
            </div>

            {/* Checklist Results List */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resultado por puntos de control:</h5>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl bg-white max-h-56 overflow-y-auto custom-scrollbar">
                {selectedDetailExecution.responses.map((resp, idx) => {
                  const templateObj = ROUTINE_TEMPLATES.find(t => t.id === selectedDetailExecution.templateId);
                  const itemObj = templateObj?.items.find(i => i.id === resp.itemId);
                  
                  return (
                    <div key={resp.itemId} className="p-3 flex items-center justify-between text-xs font-bold gap-3 hover:bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-slate-400">{idx + 1}.</span>
                        <div className="space-y-0.5">
                          <p className="text-slate-800">{itemObj?.name || 'Punto de control'}</p>
                          {resp.noveltyDescription && (
                            <p className="text-[10px] text-rose-500 italic font-medium">Anomalía: {resp.noveltyDescription}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        {resp.status === 'OK' && (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">CUMPLE</span>
                        )}
                        {resp.status === 'FAIL' && (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold">FALLA</span>
                        )}
                        {resp.status === 'NA' && (
                          <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-bold">N/A</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes if present */}
            {selectedDetailExecution.notes && (
              <div className="space-y-1 bg-amber-50/30 border border-amber-100 rounded-2xl p-4">
                <span className="text-amber-700 font-black text-[9px] uppercase tracking-wider block">Observaciones</span>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">{selectedDetailExecution.notes}</p>
              </div>
            )}

            {/* Proofs visual: Evidence and signature */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              
              {/* Evidence */}
              <div>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Foto Evidencia</span>
                {selectedDetailExecution.evidenceUrl ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 h-24 flex items-center justify-center">
                    <img src={selectedDetailExecution.evidenceUrl} alt="Evidencia" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 h-24 flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                    Sin foto
                  </div>
                )}
              </div>

              {/* Signature */}
              <div>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Firma Chofer</span>
                {selectedDetailExecution.signatureUrl ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 h-24 flex items-center justify-center p-2">
                    <img src={selectedDetailExecution.signatureUrl} alt="Firma" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 h-24 flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                    Sin firma
                  </div>
                )}
              </div>

            </div>

            {/* Modal actions */}
            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                onClick={() => setSelectedDetailExecution(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-slate-800 transition-all"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default RutinasModule;
