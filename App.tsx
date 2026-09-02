
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle, Driver, Report, MileageLog, Calibration, WashReport, Fine, ForkliftFine, Preventive, AvailabilityRecord, FleetComposition, OperationalIndicator, CheckList, FuelPerformance, PlateAdherence, Corrective, UnavailabilityRecord, OperatorRecord, ControlTowerRecord, AuditRecord, AuditMasterVehicle, FleetListRecord, AvailabilitySummary, FleetStandardAudit, FleetCierreRecord, VaradaRecord, SparePartRecord } from './types';
import { VaradasModule } from './components/VaradasModule';
import { SparePartsModule } from './components/SparePartsModule';
import DocumentCard from './components/DocumentCard';
import DocumentViewer from './components/DocumentViewer';
import DriverStats from './components/DriverStats';
import DriverCard from './components/DriverCard';
import FineStats from './components/FineStats';
import MonthlyReport from './components/MonthlyReport';
import FineCard from './components/FineCard';
import FineForm from './components/FineForm';
import FineSupportForm from './components/FineSupportForm';
import ReportCard from './components/ReportCard';
import ReportForm from './components/ReportForm';
import NoveltyReportForm from './components/NoveltyReportForm';
import ReportStats from './components/ReportStats';
import VehicleStats from './components/VehicleStats';
import ClosureForm from './components/ClosureForm';
import WorkshopEntryForm from './components/WorkshopEntryForm';
import WashCard from './components/WashCard';
import WashStats from './components/WashStats';
import WashForm from './components/WashForm';
import WashMonthlyStatus from './components/WashMonthlyStatus';
import CleaningForm from './components/CleaningForm';
import CleaningCalendar from './components/CleaningCalendar';
import CalibrationCard from './components/CalibrationCard';
import CalibrationForm from './components/CalibrationForm';
import CalibrationStats from './components/CalibrationStats';
import CalibrationCalendar from './components/CalibrationCalendar';
import MileageEntryForm from './components/MileageEntryForm';
import WorkshopVisitItem from './components/WorkshopVisitItem';
import WorkshopStats from './components/WorkshopStats';
import WorkshopVisitClosureForm from './components/WorkshopVisitClosureForm';
import WorkshopModule from './components/WorkshopModule';
import DocumentUpdateForm from './components/DocumentUpdateForm';
import WorkshopCalendar from './components/WorkshopCalendar';
import WashCalendar from './components/WashCalendar';
import Dashboard from './components/Dashboard';
import PreventiveMaintenanceModule from './components/PreventiveMaintenanceModule';
import AvailabilityModule from './components/AvailabilityModule';
import AvailabilityIndicators from './components/AvailabilityIndicators';
import OperationalDashboard from './components/OperationalDashboard';
import CheckListModule from './components/CheckListModule';
import FuelPerformanceModule from './components/FuelPerformanceModule';
import PlateAdherenceModule from './components/PlateAdherenceModule';
import CorrectivesModule from './components/CorrectivesModule';
import UnavailabilityModule from './components/UnavailabilityModule';
import OperatorsModule from './components/OperatorsModule';
import { ForkliftFinesModule } from './components/ForkliftFinesModule';
import ControlTowerModule from './components/ControlTowerModule';
import FleetStandardModule from './components/FleetStandardModule';
import ExecutiveAuditDashboard from './components/ExecutiveAuditDashboard';
import { MttrModule } from './components/MttrModule';
import CalibrationVisuals from './components/CalibrationVisuals';
import CalibrationFleetTracking from './components/CalibrationFleetTracking';
import { VclModule } from './components/VclModule';
import SustainabilityModule from './components/SustainabilityModule';
import RutinasModule from './components/RutinasModule';
import { CampaignsModule } from './components/CampaignsModule';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, ReferenceLine, LabelList
} from 'recharts';

import { 
  fetchVehiclesFromSheet, 
  fetchDriversFromSheet, 
  fetchFinesFromSheet,
  fetchReportsFromSheet,
  fetchWashReportsFromSheet,
  fetchCleaningReportsFromSheet,
  fetchCalibrationsFromSheet,
  fetchMileageLogsFromSheet,
  fetchWorkshopVisitsFromSheet,
  submitReportToSheet,
  submitMileageToSheet,
  submitWashToSheet,
  submitCleaningToSheet,
  submitFineToSheet,
  submitCalibrationToSheet,
  submitCalibrationUpdateToSheet,
  submitDocumentUpdateToSheet,
  submitWorkshopVisitUpdateToSheet,
  fetchPreventivesFromSheet,
  fetchAvailabilityFromSheet,
  fetchAvailabilityPctFromSheet,
  fetchOperationalIndicatorsFromSheet,
  fetchCheckListFromSheet,
  fetchFuelPerformanceFromSheet,
  fetchPlateAdherenceFromSheet,
  fetchCorrectivesFromSheet,
  fetchUnavailabilityFromSheet,
  fetchOperatorsFromSheet,
  fetchControlTowerFromSheet,
  fetchAuditRecordsFromSheet,
  fetchAvailabilitySummaryFromSheet,
  fetchFleetStandardAuditFromSheet,
  fetchFleetCierreFromSheet,
  fetchVaradasFromSheet,
  fetchSparePartsFromSheet,
  submitSparePartToSheet,
  submitSparePartInspection,
  fetchAuditMasterListFromSheet,
  fetchFleetBaseData,
  fetchForkliftFinesFromSheet,
  submitVaradaToSheet,
  getWashDocId,
  setWashDocId,
  getCleaningDocId,
  setCleaningDocId,
  getCalibrationsDocId,
  setCalibrationsDocId,
  getGoogleScriptUrl,
  setGoogleScriptUrl
} from './services/sheetService';

import Papa from 'papaparse';
import { normalizePlate, normalizeStr, getWeekNumber, isCalibrationCompleted } from './utils';
import { 
  RefreshCw, Users, Truck, Search, Shield, ShieldCheck, Gavel, Menu, LogOut, Loader2, 
  Building2, ListFilter, CalendarDays, ClipboardList, Sparkles, Droplets, 
  Disc, Store, Gauge, Plus, History, Filter, Hash, Calendar, Clock, MapPin,
  UserCircle, LayoutGrid, Settings, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Wrench, Lock, X, Check, TrendingUp, Activity, Fuel, ClipboardCheck, Link as LinkIcon, AlertTriangle, Zap, Flame, FileSpreadsheet, Download, Boxes, Package
} from 'lucide-react';

type AppMode = 'root_menu' | 'flota_menu' | 'camiones' | 'montacargas' | 'talleres' | 'rutinas' | 'campanas';
type ActiveView = 'categories_dashboard' | 'vehiculos' | 'conductores' | 'comparendos' | 'comparendos_montacargas' | 'kilometrajes' | 'novedades' | 'cierre_novedades' | 'fives' | 'lavados' | 'limpieza' | 'calibraciones' | 'visitas' | 'disponibilidad' | 'indicadoresDisponibilidad' | 'indicadoresOperativos' | 'checklist' | 'rendimiento' | 'adherencia' | 'correctivos' | 'indisponibilidad' | 'operadores' | 'torre_preventivos' | 'estandar_flota' | 'auditoria_calidad_seguridad' | 'mttr' | 'vcl' | 'sostenibilidad' | 'rutinas' | 'varadas' | 'repuestos';

const CATEGORY_CHUNKS = {
  doc: {
    label: 'DOCUMENTACIÓN',
    colorTheme: 'indigo',
    icon: Shield,
    items: [
      { id: 'indicadoresOperativos', label: 'Tablero de Indicadores', icon: Activity },
      { id: 'novedades', label: 'Reporte de Novedades', icon: ClipboardList },
      { id: 'conductores', label: 'Conductores', icon: Users },
      { id: 'vehiculos', label: 'Vehículos', icon: Truck },
      { id: 'comparendos', label: 'Comparendos', icon: Gavel },
      { id: 'checklist', label: 'Check List', icon: ClipboardList },
      { id: 'cierre_novedades', label: 'Cierre de Novedades', icon: Lock },
      { id: 'estandar_flota', label: 'ESTÁNDAR DOC-IMG', icon: ShieldCheck },
    ]
  },
  gestion: {
    label: 'GESTIÓN',
    colorTheme: 'emerald',
    icon: Settings,
    items: [
      { id: 'novedades', label: 'Reporte de Novedades', icon: ClipboardList },
      { id: 'kilometrajes', label: 'Kilometrajes', icon: Gauge },
      { id: 'varadas', label: 'VARADAS', icon: AlertTriangle },
      { id: 'repuestos', label: 'REPUESTOS', icon: Boxes },
      { id: 'cierre_novedades', label: 'Cierre de Novedades', icon: Lock },
      { id: 'limpieza', label: 'Limpieza 5S', icon: Sparkles },
      { id: 'visitas', label: 'Visitas a Taller', icon: Store },
      { id: 'calibraciones', label: 'Calibración', icon: Disc },
      { id: 'lavados', label: 'Lavados', icon: Droplets },
      { id: 'torre_preventivos', label: 'Mtto Preventivo', icon: Zap },
      { id: 'correctivos', label: 'Programación Diaria', icon: Wrench },
      { id: 'estandar_flota', label: 'ESTÁNDAR DOC-IMG', icon: ShieldCheck },
      { id: 'auditoria_calidad_seguridad', label: 'Estándar Calidad y Seg.', icon: Shield },
      { id: 'disponibilidad', label: 'Disponibilidad de Flota', icon: Activity },
      { id: 'rendimiento', label: 'Rendimiento de Combustible', icon: Fuel },
      { id: 'adherencia', label: 'ADH DE PLACAS', icon: ClipboardCheck },
      { id: 'mttr', label: 'MTTR', icon: Wrench },
    ]
  },
  otros: {
    label: 'OTROS',
    colorTheme: 'purple',
    icon: LayoutGrid,
    items: [
      { id: 'vcl', label: 'Seguimiento VLC vs Budget', icon: Truck },
      { id: 'sostenibilidad', label: 'Sostenibilidad KM/HL', icon: Flame },
    ]
  }
} as const;

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('root_menu');
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [globalScriptUrl, setGlobalScriptUrlState] = useState(() => getGoogleScriptUrl());
  const [globalSpreadsheetId, setGlobalSpreadsheetId] = useState(() => {
    return localStorage.getItem('GOOGLE_SPREADSHEET_ROUTINES_ID') || '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
  });
  const [globalSaveFeedback, setGlobalSaveFeedback] = useState('');
  
  const [activeView, setActiveView] = useState<ActiveView>('vehiculos');
  const [activeCategory, setActiveCategory] = useState<'root' | 'doc' | 'gestion' | 'otros'>('root');
  const [expandedSection, setExpandedSection] = useState<'doc' | 'gestion' | 'otros' | null>('doc');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterWorkshop, setFilterWorkshop] = useState('all');
  
  const [reportViewMode, setReportViewMode] = useState<'grid' | 'table'>('grid');
  const [vehicleViewMode, setVehicleViewMode] = useState<'grid' | 'table'>('grid');
  const [driverViewMode, setDriverViewMode] = useState<'grid' | 'table'>('grid');
  
  // Data States
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [washReports, setWashReports] = useState<WashReport[]>([]);
  const [cleaningReports, setCleaningReports] = useState<WashReport[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [workshopVisits, setWorkshopVisits] = useState<Report[]>([]);
  const [preventives, setPreventives] = useState<Preventive[]>([]);
  const [availabilityRecords, setAvailabilityRecords] = useState<AvailabilityRecord[]>([]);
  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary[]>([]);
  const [fleetBase, setFleetBase] = useState<FleetListRecord[]>([]);
  const [operationalIndicators, setOperationalIndicators] = useState<OperationalIndicator[]>([]);
  const [checkLists, setCheckLists] = useState<CheckList[]>([]);
  const [fuelPerformanceData, setFuelPerformanceData] = useState<FuelPerformance[]>([]);
  const [plateAdherenceData, setPlateAdherenceData] = useState<PlateAdherence[]>([]);
  const [correctives, setCorrectives] = useState<Corrective[]>([]);
  const [unavailabilityRecords, setUnavailabilityRecords] = useState<UnavailabilityRecord[]>([]);
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [forkliftFines, setForkliftFines] = useState<ForkliftFine[]>([]);
  const [controlTowerRecords, setControlTowerRecords] = useState<ControlTowerRecord[]>([]);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [fleetStandardAuditRecords, setFleetStandardAuditRecords] = useState<FleetStandardAudit[]>([]);
  const [fleetCierreRecords, setFleetCierreRecords] = useState<FleetCierreRecord[]>([]);
  const [auditMasterVehicles, setAuditMasterVehicles] = useState<AuditMasterVehicle[]>([]);
  const [varadas, setVaradas] = useState<VaradaRecord[]>([]);
  const [spareParts, setSpareParts] = useState<SparePartRecord[]>([]);

  // Session tracking of local updates to prevent stale Google Sheets cache from reverting changes
  const localCierreUpdatesRef = useRef<Record<string, { estado: string; evidencia: string; verificacion: string }>>({});
  const localAuditUpdatesRef = useRef<Record<string, { status: string; noveltyDate: string; evidence: string; observations: string }>>({});
  const localWashSubmissionsRef = useRef<WashReport[]>([]);
  const localCalibrationSubmissionsRef = useRef<Calibration[]>([]);
  const localCalibrationUpdatesRef = useRef<Record<string, Partial<Calibration>>>({});

  // UI States
  const [viewDoc, setViewDoc] = useState<{ url: string | string[] | {url: string, label?: string}[], title: string } | null>(null);
  const [fineStatusFilter, setFineStatusFilter] = useState<'all' | 'PENDIENTE' | 'PAGADO'>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'PENDIENTES' | 'COMPLETADOS'>('all');
  const [showFineForm, setShowFineForm] = useState(false);
  const [managingFineSupport, setManagingFineSupport] = useState<Fine | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showWashForm, setShowWashForm] = useState(false);
  const [showWashSettings, setShowWashSettings] = useState(false);
  const [washSheetIdInput, setWashSheetIdInput] = useState(() => getWashDocId());
  const [washSaveFeedback, setWashSaveFeedback] = useState('');
  const [showCleaningSettings, setShowCleaningSettings] = useState(false);
  const [cleaningSheetIdInput, setCleaningSheetIdInput] = useState(() => getCleaningDocId());
  const [cleaningSaveFeedback, setCleaningSaveFeedback] = useState('');
  const [showCalibrationsSettings, setShowCalibrationsSettings] = useState(false);
  const [calibrationsSheetIdInput, setCalibrationsSheetIdInput] = useState(() => getCalibrationsDocId());
  const [calibrationsSaveFeedback, setCalibrationsSaveFeedback] = useState('');
  const [showCleaningForm, setShowCleaningForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [updatingCalibration, setUpdatingCalibration] = useState<Calibration | null>(null);
  const [calibrationPreselectedPlate, setCalibrationPreselectedPlate] = useState<string>('');
  const [showDocUpdateForm, setShowDocUpdateForm] = useState(false);
  const [closingReport, setClosingReport] = useState<Report | null>(null);
  const [registeringEntry, setRegisteringEntry] = useState<Report | null>(null);
  const [closingWorkshopVisit, setClosingWorkshopVisit] = useState<Report | null>(null);
  const [closingCleaning, setClosingCleaning] = useState<WashReport | null>(null);
  const [workshopViewMode, setWorkshopViewMode] = useState<'list' | 'calendar'>('calendar');
  const [calibrationViewMode, setCalibrationViewMode] = useState<'seguimiento' | 'calendar' | 'list' | 'visual'>('seguimiento');
  const [washViewMode, setWashViewMode] = useState<'seguimiento' | 'list' | 'calendar'>('seguimiento');
  const [washPreselectedPlate, setWashPreselectedPlate] = useState<string | null>(null);
  const [cleaningViewMode, setCleaningViewMode] = useState<'list' | 'calendar'>('calendar');

  // Routine Sub Mode
  const [routineSubMode, setRoutineSubMode] = useState<'menu' | 'select_rutina' | 'dashboard'>('menu');
  const [selectedRoutineTemplate, setSelectedRoutineTemplate] = useState<string>('rutina_1');

  // Mileage Filters
  const [mileageStatusFilter, setMileageStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Vehicle Filters
  const [vehicleDocFilter, setVehicleDocFilter] = useState<'all' | 'soat' | 'rtm' | 'plc' | 'ext'>('all');

  // Driver Filters
  const [driverDocFilter, setDriverDocFilter] = useState<'all' | 'license' | 'defensive' | 'medical'>('all');

  // Auth State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{status: 'success' | 'error', message: string} | null>(null);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const docId = globalSpreadsheetId.trim();
      if (!docId) {
        setConnectionResult({ status: 'error', message: 'Por favor, introduce un ID de Spreadsheet válido.' });
        setTestingConnection(false);
        return;
      }
      if (!globalScriptUrl.trim()) {
        setConnectionResult({ status: 'error', message: 'Por favor, introduce una URL de Apps Script válida.' });
        setTestingConnection(false);
        return;
      }
      
      let url = `${globalScriptUrl.trim()}?method=GET_DATA&docId=${docId}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); 

      const response = await fetch(url, { 
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error de red: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error("El Apps Script no devolvió una respuesta JSON válida. Verifica la URL.");
      }
      
      if (json.status === 'success') {
        setConnectionResult({ 
          status: 'success', 
          message: '¡Conexión Exitosa! El Apps Script respondió correctamente y tiene acceso en la Hoja de Cálculo.' 
        });
      } else {
        let friendlyMessage = json.message || 'Error desconocido';
        if (friendlyMessage.includes('Exception') || friendlyMessage.includes('permisos') || friendlyMessage.includes('permission') || friendlyMessage.includes('not found') || friendlyMessage.includes('SpreadsheetApp.openById')) {
          friendlyMessage = `Error de Permisos de Google: Tu Apps Script Web App no tiene permisos para abrir este ID de Hoja de Cálculo. Asegúrate de que la cuenta de Google con la que desplegaste el Apps Script es propietaria o tiene acceso para editar este Spreadsheet.`;
        } else if (friendlyMessage.includes('no encontrada') || friendlyMessage.includes('Sheet not found')) {
          friendlyMessage = `Hoja no encontrada: El Spreadsheet se abrió correctamente, pero no se encontró la pestaña por defecto. Esto confirma que tienes conexión, pero verifica los nombres de las pestañas en tu hoja de cálculo.`;
        }
        setConnectionResult({ 
          status: 'error', 
          message: `Error del Apps Script: ${friendlyMessage}` 
        });
      }
    } catch (e: any) {
      console.error(e);
      let errorMsg = e.message || 'Error desconocido de red';
      if (e.name === 'AbortError') {
        errorMsg = 'Tiempo de espera agotado (15s). El Apps Script tardó demasiado en responder o la URL no es válida.';
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('Failed to execute')) {
        errorMsg = 'No se pudo conectar al Apps Script. Esto suele ocurrir por un error de CORS o porque la URL es incorrecta. Por favor, verifica que la URL empiece con https://script.google.com/ y esté desplegada correctamente como "Cualquiera" (Anyone).';
      }
      setConnectionResult({ 
        status: 'error', 
        message: errorMsg
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveGlobalSettings = () => {
    setGoogleScriptUrl(globalScriptUrl);
    const cleanId = globalSpreadsheetId.trim();
    const keys = [
      'GOOGLE_SPREADSHEET_ROUTINES_ID',
      'GOOGLE_SPREADSHEET_MILEAGE_ID',
      'GOOGLE_SPREADSHEET_PREVENTIVES_ID',
      'GOOGLE_SPREADSHEET_CAMPAIGNS_ID',
      'GOOGLE_SPREADSHEET_MASTER_ID',
      'GOOGLE_SPREADSHEET_CORRECTIVES_ID',
      'GOOGLE_SPREADSHEET_FINES_ID',
      'GOOGLE_SPREADSHEET_CONTROL_TOWER_ID',
      'GOOGLE_SPREADSHEET_AUDIT_ID',
      'GOOGLE_SPREADSHEET_AUDIT_QS_ID'
    ];
    keys.forEach(k => {
      localStorage.setItem(k, cleanId);
    });

    // Guardar IDs individuales específicos por módulo
    const wId = washSheetIdInput.trim();
    setWashDocId(wId || cleanId);

    const cId = calibrationsSheetIdInput.trim();
    setCalibrationsDocId(cId || cleanId);

    const clId = cleaningSheetIdInput.trim();
    setCleaningDocId(clId || cleanId);

    setGlobalSaveFeedback('¡Configuración guardada correctamente en todos los módulos!');
    setTimeout(() => {
      setGlobalSaveFeedback('');
      setShowGlobalSettings(false);
    }, 3000);
  };

  const handleFlotaAccess = () => {
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError(false);
  };

  const verifyPassword = () => {
    if (passwordInput === '1506') {
      setAppMode('flota_menu');
      setShowPasswordModal(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  const [loadedSections, setLoadedSections] = useState<Record<string, boolean>>({});

  const fetchSectionData = async (view: ActiveView) => {
    switch (view) {
      case 'kilometrajes':
        setMileageLogs(await fetchMileageLogsFromSheet());
        break;
      case 'visitas':
        setWorkshopVisits(await fetchWorkshopVisitsFromSheet());
        break;
      case 'comparendos':
        setFines(await fetchFinesFromSheet());
        break;
      case 'novedades':
        setReports(await fetchReportsFromSheet());
        break;
      case 'lavados': {
        const w = await fetchWashReportsFromSheet();
        const mergedWash = [...w];
        localWashSubmissionsRef.current.forEach(localWash => {
          const exists = mergedWash.some(item => 
            item.id === localWash.id || 
            (normalizePlate(item.plate) === normalizePlate(localWash.plate) && item.date === localWash.date)
          );
          if (!exists) {
            mergedWash.unshift(localWash);
          }
        });
        setWashReports(mergedWash);
        break;
      }
      case 'limpieza':
        setCleaningReports(await fetchCleaningReportsFromSheet());
        break;
      case 'calibraciones': {
        const c = await fetchCalibrationsFromSheet();
        let mergedCal = c.map(item => {
          if (localCalibrationUpdatesRef.current[item.id]) {
            return { ...item, ...localCalibrationUpdatesRef.current[item.id] };
          }
          return item;
        });
        localCalibrationSubmissionsRef.current.forEach(localCal => {
          const exists = mergedCal.some(item => 
            item.id === localCal.id || 
            (normalizePlate(item.plate) === normalizePlate(localCal.plate) && item.calibrationDate === localCal.calibrationDate)
          );
          if (!exists) {
            mergedCal.unshift(localCal);
          }
        });
        setCalibrations(mergedCal);
        break;
      }
      case 'torre_preventivos':
        setPreventives(await fetchPreventivesFromSheet());
        break;
      case 'disponibilidad': {
        const [a, as, fb] = await Promise.all([
          fetchAvailabilityFromSheet(),
          fetchAvailabilityPctFromSheet(),
          fetchFleetBaseData()
        ]);
        setAvailabilityRecords(a);
        setAvailabilitySummary(as);
        setFleetBase(fb);
        break;
      }
      case 'indicadoresOperativos':
        setOperationalIndicators(await fetchOperationalIndicatorsFromSheet());
        break;
      case 'indicadoresDisponibilidad': {
        const [a, as] = await Promise.all([
          fetchAvailabilityFromSheet(),
          fetchAvailabilitySummaryFromSheet()
        ]);
        setAvailabilityRecords(a);
        setAvailabilitySummary(as);
        break;
      }
      case 'checklist':
        setCheckLists(await fetchCheckListFromSheet());
        break;
      case 'rendimiento':
        setFuelPerformanceData(await fetchFuelPerformanceFromSheet());
        break;
      case 'adherencia':
        setPlateAdherenceData(await fetchPlateAdherenceFromSheet());
        break;
      case 'correctivos':
        setCorrectives(await fetchCorrectivesFromSheet());
        break;
      case 'indisponibilidad':
        setUnavailabilityRecords(await fetchUnavailabilityFromSheet());
        break;
      case 'operadores':
        setOperators(await fetchOperatorsFromSheet());
        break;
      case 'cierre_novedades':
        setControlTowerRecords(await fetchControlTowerFromSheet());
        break;
      case 'auditoria_calidad_seguridad':
        setAuditRecords(await fetchAuditRecordsFromSheet());
        break;
      case 'estandar_flota': {
        const [aud, fsa, fcr, amv, fb] = await Promise.all([
          fetchAuditRecordsFromSheet(),
          fetchFleetStandardAuditFromSheet(),
          fetchFleetCierreFromSheet(),
          fetchAuditMasterListFromSheet(),
          fetchFleetBaseData()
        ]);

        const mergedAud = aud.map(r => {
          if (localAuditUpdatesRef.current[r.id]) {
            const sheetEv = r.evidence || '';
            const localEv = localAuditUpdatesRef.current[r.id].evidence || '';
            const effectiveEv = sheetEv.trim().startsWith('http') ? sheetEv : (localEv || sheetEv);
            if (sheetEv.trim().startsWith('http')) {
              localAuditUpdatesRef.current[r.id].evidence = sheetEv;
            }
            return {
              ...r,
              status: localAuditUpdatesRef.current[r.id].status || r.status,
              noveltyDate: localAuditUpdatesRef.current[r.id].noveltyDate || r.noveltyDate,
              evidence: effectiveEv,
              observations: localAuditUpdatesRef.current[r.id].observations || r.observations
            };
          }
          return r;
        });

        const mergedFcr = fcr.map(r => {
          const key = `${r.placa.toUpperCase().trim()}_${r.item.toUpperCase().trim()}`;
          if (localCierreUpdatesRef.current[key]) {
            const sheetEv = r.evidencia || '';
            const localEv = localCierreUpdatesRef.current[key].evidencia || '';
            const effectiveEv = sheetEv.trim().startsWith('http') ? sheetEv : (localEv || sheetEv);
            if (sheetEv.trim().startsWith('http')) {
              localCierreUpdatesRef.current[key].evidencia = sheetEv;
            }
            return {
              ...r,
              estado: localCierreUpdatesRef.current[key].estado || r.estado,
              evidencia: effectiveEv,
              verificacion: localCierreUpdatesRef.current[key].verificacion || r.verificacion
            };
          }
          return r;
        });

        setAuditRecords(mergedAud);
        setFleetStandardAuditRecords(fsa);
        setFleetCierreRecords(mergedFcr);
        setAuditMasterVehicles(amv);
        setFleetBase(fb);
        break;
      }
      case 'comparendos_montacargas':
        setForkliftFines(await fetchForkliftFinesFromSheet());
        break;
      case 'varadas':
        setVaradas(await fetchVaradasFromSheet());
        break;
      case 'repuestos':
        setSpareParts(await fetchSparePartsFromSheet());
        break;
      default:
        break;
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const [v, d] = await Promise.all([
        fetchVehiclesFromSheet(),
        fetchDriversFromSheet()
      ]);
      setVehicles(v);
      setDrivers(d);

      await fetchSectionData(activeView);
      setLoadedSections(prev => ({ ...prev, [activeView]: true }));
    } catch (err) {
      console.error("Error al sincronizar:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Efecto A — carga base (solo una vez)
  useEffect(() => {
    const loadBase = async () => {
      setIsSyncing(true);
      try {
        const [v, d] = await Promise.all([
          fetchVehiclesFromSheet(),
          fetchDriversFromSheet()
        ]);
        setVehicles(v);
        setDrivers(d);
      } catch (e) {
        console.warn("Error cargando datos base:", e);
      } finally {
        setIsSyncing(false);
      }
    };
    loadBase();
  }, []);

  // Efecto B — carga por sección (cada vez que cambia activeView, si no está cargada)
  useEffect(() => {
    if (loadedSections[activeView]) return;

    const loadSection = async () => {
      setIsSyncing(true);
      try {
        await fetchSectionData(activeView);
        setLoadedSections(prev => ({ ...prev, [activeView]: true }));
      } catch (e) {
        console.warn("Error cargando la sección " + activeView + ":", e);
      } finally {
        setIsSyncing(false);
      }
    };

    loadSection();
  }, [activeView, loadedSections]);

  const handleReportRoutineNovelty = async (noveltyData: {
    plate: string;
    date: string;
    novelty: string;
    source: string;
    cd?: string;
    contractor?: string;
  }) => {
    const payload = {
      id: 'NOV-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      date: noveltyData.date,
      plate: noveltyData.plate,
      source: noveltyData.source,
      novelty: noveltyData.novelty,
      status: 'PENDIENTES',
      cd: noveltyData.cd || 'GENERAL',
      contractor: noveltyData.contractor || 'GENERAL'
    } as any;

    const newReport: Report = {
      id: payload.id,
      date: payload.date,
      plate: payload.plate,
      source: payload.source,
      novelty: payload.novelty,
      status: 'PENDIENTES',
      cd: payload.cd,
      contractor: payload.contractor
    };

    // Optimistic update: show immediately
    setReports(prev => [newReport, ...prev]);

    try {
      await submitReportToSheet(payload);
      handleSyncData().catch(e => console.error("Sync error after novelty submit:", e));
    } catch (error) {
      // Revert if error
      setReports(prev => prev.filter(r => r.id !== newReport.id));
      console.error("Error submitting routine novelty: ", error);
      alert("No se pudo guardar la novedad. Intenta nuevamente.");
    }
  };

  const handleUpdateFleetStandardRecord = (updated: any, isCierre: boolean) => {
    if (isCierre) {
      const key = `${updated.plate.toUpperCase().trim()}_${updated.item.toUpperCase().trim()}`;
      localCierreUpdatesRef.current[key] = {
        estado: updated.status,
        evidencia: updated.evidence,
        verificacion: updated.verification || 'SI'
      };

      setFleetCierreRecords(prev => prev.map(r => {
        if (
          (updated.id && r.id === updated.id) ||
          (r.placa.toUpperCase().trim() === updated.plate.toUpperCase().trim() && 
           r.item.toUpperCase().trim() === updated.item.toUpperCase().trim())
        ) {
          return {
            ...r,
            estado: updated.status,
            evidencia: updated.evidence,
            verificacion: updated.verification
          };
        }
        return r;
      }));
    } else {
      localAuditUpdatesRef.current[updated.id] = {
        status: updated.status,
        noveltyDate: updated.noveltyDate,
        evidence: updated.evidence,
        observations: updated.noveltyObservation
      };

      setAuditRecords(prev => prev.map(r => {
        if (r.id === updated.id) {
          return {
            ...r,
            status: updated.status,
            noveltyDate: updated.noveltyDate,
            evidence: updated.evidence,
            observations: updated.noveltyObservation
          };
        }
        return r;
      }));
    }
  };

  const handleUpdatePreventive = (plate: string, date: string, evidence: string) => {
    setPreventives(prev => prev.map(p => {
      if (p.placa.toUpperCase().trim() === plate.toUpperCase().trim()) {
        return {
          ...p,
          fechaEjecucion: date,
          evidenceUrl: evidence,
          validaccionCumplimiento: 1,
          status: 'ok' as const
        };
      }
      return p;
    }));
  };

  const uniqueCds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const uniqueContractors = useMemo(() => Array.from(new Set(vehicles.map(v => v.contractor || 'GENERAL'))).sort(), [vehicles]);
  const uniqueSources = useMemo(() => Array.from(new Set(reports.map(r => r.source).filter(Boolean))).sort(), [reports]);
  const uniqueWorkshops = useMemo(() => Array.from(new Set(workshopVisits.map(v => v.workshop).filter(Boolean))).sort(), [workshopVisits]);
  
  const derivedFleetComposition = useMemo((): FleetComposition[] => {
    const compositionMap: Record<string, number> = {};
    // Use fleetBase for availability-related components as it's the official denominator defined by the user
    fleetBase.forEach(v => {
      const key = `${v.cd || 'GENERAL'}|${v.contratista || 'GENERAL'}`;
      compositionMap[key] = (compositionMap[key] || 0) + 1;
    });
    
    if (Object.keys(compositionMap).length === 0) {
      // Fallback to vehicles if fleetBase is not yet loaded or empty
      vehicles.forEach(v => {
        const key = `${v.cd || 'GENERAL'}|${v.contractor || 'GENERAL'}`;
        compositionMap[key] = (compositionMap[key] || 0) + 1;
      });
    }

    return Object.entries(compositionMap).map(([key, count]) => {
      const [cd, contractor] = key.split('|');
      return { cd, contractor, count };
    });
  }, [fleetBase, vehicles]);

  const filteredWashReports = useMemo(() => {
    return washReports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      const rMonth = normalizeStr(r.month);
      const sMonth = normalizeStr(selectedMonth);
      const matchMonth = selectedMonth === 'TODOS' || (rMonth !== "" && (rMonth === sMonth || rMonth.includes(sMonth) || sMonth.includes(rMonth)));
      
      // Year check
      let matchYear = true;
      if (r.date) {
        const d = new Date(r.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          matchYear = d.getFullYear() === selectedYear;
        }
      }

      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd);
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor);
      
      return matchMonth && matchYear && matchSearch && matchCd && matchContractor;
    });
  }, [washReports, vehicles, selectedMonth, searchTerm, filterCd, filterContractor, selectedYear]);

  const washStats = useMemo(() => {
    const total = filteredWashReports.length;
    const completed = filteredWashReports.filter(r => r.status === 'CERRADO').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [filteredWashReports]);

  const filteredCleaningReports = useMemo(() => {
    return cleaningReports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      const rMonth = normalizeStr(r.month);
      const sMonth = normalizeStr(selectedMonth);
      const matchMonth = selectedMonth === 'TODOS' || (rMonth !== "" && (rMonth === sMonth || rMonth.includes(sMonth) || sMonth.includes(rMonth)));
      
      // Year check
      let matchYear = true;
      if (r.date) {
        const d = new Date(r.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          matchYear = d.getFullYear() === selectedYear;
        }
      }

      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd);
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor);
      
      return matchMonth && matchYear && matchSearch && matchCd && matchContractor;
    });
  }, [cleaningReports, vehicles, selectedMonth, searchTerm, filterCd, filterContractor, selectedYear]);

  const cleaningStats = useMemo(() => {
    const total = filteredCleaningReports.length;
    const completed = filteredCleaningReports.filter(r => r.status === 'CERRADO').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [filteredCleaningReports]);

  const filteredVehiclesForWash = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || v.cd === filterCd;
      const matchContractor = filterContractor === 'all' || v.contractor === filterContractor;
      const matchSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      return matchCd && matchContractor && matchSearch;
    });
  }, [vehicles, filterCd, filterContractor, searchTerm]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      
      let matchMonth = false;
      let matchYear = true;
      
      if (r.date) {
        const d = new Date(r.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          const rMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
          const sMonth = selectedMonth;
          matchMonth = selectedMonth === 'TODOS' || (rMonth !== "" && (rMonth === sMonth || rMonth.includes(sMonth) || sMonth.includes(rMonth)));
          matchYear = d.getFullYear() === selectedYear;
        }
      }

      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || r.cd === filterCd;
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || r.contractor === filterContractor;
      const matchSource = filterSource === 'all' || r.source === filterSource;
      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm)) || 
                          (r.source && r.source.toUpperCase().includes(searchTerm.toUpperCase()));
      const matchStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter;
      
      return matchMonth && matchYear && matchCd && matchContractor && matchSearch && matchSource && matchStatus;
    });
  }, [reports, vehicles, selectedMonth, filterCd, filterContractor, filterSource, searchTerm, selectedYear, reportStatusFilter]);

  const statsReports = useMemo(() => {
    const baseFiltered = reports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      
      let matchMonth = false;
      let matchYear = true;
      
      if (r.date) {
        const d = new Date(r.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          const rMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
          const sMonth = selectedMonth;
          matchMonth = selectedMonth === 'TODOS' || (rMonth !== "" && (rMonth === sMonth || rMonth.includes(sMonth) || sMonth.includes(rMonth)));
          matchYear = d.getFullYear() === selectedYear;
        }
      }

      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || r.cd === filterCd;
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || r.contractor === filterContractor;
      const matchSource = filterSource === 'all' || r.source === filterSource;
      return matchMonth && matchYear && matchCd && matchContractor && matchSource;
    });
    
    return {
      total: baseFiltered.length,
      completed: baseFiltered.filter(r => r.status === 'COMPLETADOS').length,
      pending: baseFiltered.filter(r => r.status === 'PENDIENTES').length,
      searchCount: filteredReports.length
    };
  }, [reports, vehicles, selectedMonth, filterCd, filterContractor, filterSource, filteredReports, selectedYear]);

  const reportComplianceData = useMemo(() => {
    const yearReports = reports.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date + "T12:00:00");
      return !isNaN(d.getTime()) && d.getFullYear() === selectedYear;
    });

    const weeks: { [key: string]: { total: number, completed: number } } = {};
    
    yearReports.forEach(r => {
      const d = new Date(r.date + "T12:00:00");
      const week = getWeekNumber(d);
      const weekKey = `S${week}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { total: 0, completed: 0 };
      }
      
      weeks[weekKey].total += 1;
      if (r.status === 'COMPLETADOS') {
        weeks[weekKey].completed += 1;
      }
    });

    return Object.keys(weeks)
      .sort((a, b) => parseInt(a.substring(1)) - parseInt(b.substring(1)))
      .map(key => ({
        name: key,
        percentage: weeks[key].total > 0 ? Math.round((weeks[key].completed / weeks[key].total) * 100) : 0,
        total: weeks[key].total,
        completed: weeks[key].completed
      }))
      .slice(-12);
  }, [reports, selectedYear]);

  const filteredCalibrations = useMemo(() => {
    return calibrations.filter(c => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(c.plate));
      const cMonth = (c.month || "").trim().toUpperCase();
      const sMonth = selectedMonth.trim().toUpperCase();
      const matchMonth = selectedMonth === 'TODOS' || cMonth === sMonth || cMonth.includes(sMonth) || sMonth.includes(cMonth);
      const matchYear = c.year === selectedYear;
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || (c.cd && c.cd.toUpperCase().trim() === filterCd.toUpperCase().trim());
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || (c.contractor && c.contractor.toUpperCase().trim() === filterContractor.toUpperCase().trim());
      const matchSearch = normalizePlate(c.plate).includes(normalizePlate(searchTerm));
      return matchMonth && matchYear && matchCd && matchContractor && matchSearch;
    });
  }, [calibrations, vehicles, filterCd, filterContractor, searchTerm, selectedMonth, selectedYear]);

  const statsCalibrations = useMemo(() => {
    return {
      total: filteredCalibrations.length,
      completed: filteredCalibrations.filter(c => isCalibrationCompleted(c)).length,
      pending: filteredCalibrations.filter(c => !isCalibrationCompleted(c)).length,
      searchCount: filteredCalibrations.length
    };
  }, [filteredCalibrations]);

  const handleExportCalibrationsExcel = () => {
    if (!filteredCalibrations || filteredCalibrations.length === 0) {
      alert("No hay registros de calibración para exportar con los filtros seleccionados.");
      return;
    }

    const exportData = filteredCalibrations.map((item) => {
      const veh = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(item.plate));
      const cd = item.cd || veh?.cd || 'GENERAL';
      const contractor = item.contractor || veh?.contractor || 'GENERAL';
      const estadoEjecucion = item.estado || (item.status === 'active' ? 'VIGENTE' : item.status === 'warning' ? 'POR VENCER' : item.status === 'expired' ? 'VENCIDO' : 'PENDIENTE');

      return {
        "MES": item.month || selectedMonth,
        "SEMANA": item.week || '',
        "PLACA": item.plate || '',
        "TALLER / EQUIPO": item.equipment || '',
        "CENTRO DE DISTRIBUCIÓN (CD)": cd,
        "CONTRATISTA / OPERACIÓN": contractor,
        "FECHA DE CALIBRACIÓN": item.calibrationDate || '',
        "FECHA DE VENCIMIENTO": item.expiryDate || '',
        "ESTADO": estadoEjecucion,
        "DÍAS VENCIMIENTO": item.daysPending !== undefined ? item.daysPending : '',
        "AÑO": item.year || selectedYear,
        "CERTIFICADO / EVIDENCIA": item.certificateUrl || ''
      };
    });

    const csv = Papa.unparse(exportData, {
      delimiter: ";", // Delimitador punto y coma para Excel en español
    });

    const csvWithBom = "\uFEFF" + csv;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const monthLabel = selectedMonth !== 'TODOS' ? selectedMonth : 'TODOS_LOS_MESES';
    link.setAttribute("download", `Reporte_Calibraciones_${monthLabel}_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredFines = useMemo(() => {
    return fines.filter(f => {
      const fMonth = normalizeStr(f.month || '');
      const sMonth = normalizeStr(selectedMonth);
      
      // Doble validación: por texto en columna MES o por la FECHA del registro
      let matchMonthByDate = false;
      if (f.date) {
        const d = new Date(f.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          const dMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
          matchMonthByDate = dMonth === sMonth;
        }
      }

      const matchMonth = selectedMonth === 'TODOS' || (fMonth !== "" && (fMonth === sMonth || fMonth.includes(sMonth) || sMonth.includes(fMonth))) || 
                         (fMonth === "" && matchMonthByDate);
      
      let matchYear = true;
      if (f.date) {
        const d = new Date(f.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          // Si el mes coincide plenamente, permitimos el registro aunque el año varíe ligeramente (evita discrepancias por typos)
          matchYear = selectedMonth === 'TODOS' || d.getFullYear() === selectedYear || matchMonth;
        }
      }

      const matchCd = filterCd === 'all' || f.cd === filterCd;
      const matchContractor = filterContractor === 'all' || f.contractor === filterContractor;
      let matchStatus = fineStatusFilter === 'all' || f.status === fineStatusFilter;
      
      if ((fineStatusFilter as string) === 'WITH_EVIDENCE') {
        matchStatus = !!(f.evidenceUrl && f.evidenceUrl.startsWith('http'));
      } else if ((fineStatusFilter as string) === 'WITHOUT_EVIDENCE') {
        matchStatus = !(f.evidenceUrl && f.evidenceUrl.startsWith('http'));
      }

      const matchSearch = normalizePlate(f.plate).includes(normalizePlate(searchTerm));
      
      return matchMonth && matchYear && matchCd && matchContractor && matchStatus && matchSearch;
    });
  }, [fines, selectedMonth, selectedYear, filterCd, filterContractor, fineStatusFilter, searchTerm]);

  const statsFines = useMemo(() => {
    // Para las estadísticas, contamos todos los registros que coinciden con el mes/año, 
    // ignorando el término de búsqueda para que el total coincida con el Excel
    const baseFiltered = fines.filter(f => {
      const fMonth = normalizeStr(f.month || '');
      const sMonth = normalizeStr(selectedMonth);
      
      let matchMonthByDate = false;
      if (f.date) {
        const d = new Date(f.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          const dMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
          matchMonthByDate = dMonth === sMonth;
        }
      }

      // If the record has a month, it must match. 
      // If it doesn't have a month, we try to match by date.
      // If it has neither, it's only shown if we are in a special "SIN MES" view (not implemented yet, so we'll skip for now to avoid duplicates)
      const matchMonth = selectedMonth === 'TODOS' || (fMonth !== "" && (fMonth === sMonth || fMonth.includes(sMonth) || sMonth.includes(fMonth))) || 
                         (fMonth === "" && matchMonthByDate);
      
      // Para el conteo total, priorizamos el mes para que coincida con el Excel
      const matchCd = filterCd === 'all' || f.cd === filterCd;
      const matchContractor = filterContractor === 'all' || f.contractor === filterContractor;
      return matchMonth && matchCd && matchContractor;
    });

    const totalRecords = baseFiltered.length;
    const withFines = baseFiltered.filter(f => f.status === 'PENDIENTE').length;
    const withoutFines = baseFiltered.filter(f => f.status === 'PAGADO').length;
    const withEvidence = baseFiltered.filter(f => f.evidenceUrl && f.evidenceUrl.startsWith('http')).length;
    const withoutEvidence = baseFiltered.filter(f => !(f.evidenceUrl && f.evidenceUrl.startsWith('http'))).length;
    const rawTotal = filterCd === 'all' && filterContractor === 'all' ? fines.length : fines.filter(f => (filterCd === 'all' || f.cd === filterCd) && (filterContractor === 'all' || f.contractor === filterContractor)).length;
    return { totalDrivers: totalRecords, withFines, withoutFines, withEvidence, withoutEvidence, rawTotal };
  }, [fines, selectedMonth, filterCd, filterContractor]);

  const monthlySummary = useMemo(() => {
    const summary: Record<string, { total: number, uniqueDrivers: Set<string> }> = {};
    fines.filter(f => filterCd === 'all' || f.cd === filterCd).forEach(f => {
      let m = (f.month || '').toUpperCase();
      if (!m && f.date) {
        const d = new Date(f.date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          m = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        }
      }
      if (!m) m = 'SIN MES/FECHA';

      if (!summary[m]) summary[m] = { total: 0, uniqueDrivers: new Set() };
      summary[m].total++;
      if (f.driverName) summary[m].uniqueDrivers.add(f.driverName.toUpperCase());
    });
    return Object.entries(summary).map(([month, data]) => ({
      month,
      total: data.total,
      uniqueDrivers: data.uniqueDrivers.size
    })).sort((a, b) => {
      const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const idxA = months.indexOf(a.month);
      const idxB = months.indexOf(b.month);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [fines, filterCd]);

  const statsVehicles = useMemo(() => {
    const filtered = vehicles.filter(v => 
      (filterCd === 'all' || v.cd === filterCd) && 
      (filterContractor === 'all' || v.contractor === filterContractor) &&
      normalizePlate(v.plate).includes(normalizePlate(searchTerm))
    );
    return {
      total: filtered.length,
      soatWarning: filtered.filter(v => v.soat.status !== 'active').length,
      rtmWarning: filtered.filter(v => v.rtm.status !== 'active').length,
      plcWarning: filtered.filter(v => v.plc.status !== 'active').length,
      extWarning: filtered.filter(v => v.extinguisher.status !== 'active').length
    };
  }, [vehicles, filterCd, filterContractor, searchTerm]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || v.cd === filterCd;
      const matchContractor = filterContractor === 'all' || v.contractor === filterContractor;
      const matchSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      const matchDoc = vehicleDocFilter === 'all' || 
        (vehicleDocFilter === 'soat' && v.soat.status !== 'active') ||
        (vehicleDocFilter === 'rtm' && v.rtm.status !== 'active') ||
        (vehicleDocFilter === 'plc' && v.plc.status !== 'active') ||
        (vehicleDocFilter === 'ext' && v.extinguisher.status !== 'active');
      
      return matchCd && matchContractor && matchSearch && matchDoc;
    });
  }, [vehicles, filterCd, filterContractor, searchTerm, vehicleDocFilter]);

  const statsDrivers = useMemo(() => {
    const filtered = drivers.filter(d => 
      (filterCd === 'all' || d.cd === filterCd) && 
      (filterContractor === 'all' || d.contractor === filterContractor) &&
      d.name.toUpperCase().includes(searchTerm.toUpperCase())
    );
    return {
      total: filtered.length,
      licenseWarning: filtered.filter(d => d.license.status !== 'active').length,
      defensiveWarning: filtered.filter(d => d.defensiveDriving.status !== 'active').length,
      medicalWarning: filtered.filter(d => d.medicalExam.status !== 'active').length
    };
  }, [drivers, filterCd, filterContractor, searchTerm]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchCd = filterCd === 'all' || d.cd === filterCd;
      const matchContractor = filterContractor === 'all' || d.contractor === filterContractor;
      const matchSearch = d.name.toUpperCase().includes(searchTerm.toUpperCase());
      const matchDoc = driverDocFilter === 'all' || 
        (driverDocFilter === 'license' && d.license.status !== 'active') ||
        (driverDocFilter === 'defensive' && d.defensiveDriving.status !== 'active') ||
        (driverDocFilter === 'medical' && d.medicalExam.status !== 'active');
      
      return matchCd && matchContractor && matchSearch && matchDoc;
    });
  }, [drivers, filterCd, filterContractor, searchTerm, driverDocFilter]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {isSyncing && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-700 text-slate-300 px-4 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-bounce">
          <Loader2 size={16} className="text-indigo-400 animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
        </div>
      )}
      
      {appMode === 'root_menu' ? (
        <div className="flex-grow bg-[#0f172a] flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px]"></div>
          </div>

          {/* Floating Settings Button */}
          <div className="absolute top-8 right-8 z-50">
            <button 
              onClick={() => setShowGlobalSettings(true)}
              className="p-4 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-2xl flex items-center gap-2 hover:bg-white/10 hover:border-indigo-500/50 transition-all font-black uppercase tracking-wider text-[10px]"
              title="Ajustes de Integración con Google Sheets"
            >
              <Settings size={16} className="animate-spin-slow text-indigo-400" />
              <span>Configuración Google</span>
            </button>
          </div>

          {/* Central Logo Area */}
          <div className="relative z-10 flex flex-col items-center text-center mb-16">
            <div className="w-48 h-48 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center mb-10 relative group">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-[3rem] scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <LayoutGrid size={80} className="text-slate-800" />
                <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-3 rounded-2xl shadow-lg border-4 border-white">
                  <Settings size={28} className="text-white animate-spin-slow" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-[0.2em] mb-4">SISTEMA DE GESTIÓN</h1>
            <p className="text-indigo-400 font-black text-sm uppercase tracking-[0.5em] opacity-80">CONTROL CENTRALIZADO DE ACTIVOS</p>
          </div>

          {/* Root Menu Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl relative z-10">
            <button 
              onClick={handleFlotaAccess}
              className="group bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-indigo-600/20 rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10 group-hover:scale-110 transition-transform border border-indigo-500/30">
                <Truck size={36} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">FLOTA BARRANQUILLA</h3>
                <p className="text-indigo-400/60 text-[10px] font-bold uppercase tracking-widest">Gestión de vehículos y equipos</p>
              </div>
            </button>

            <button 
              onClick={() => setAppMode('talleres')}
              className="group bg-white/5 hover:bg-amber-600/20 border border-white/10 hover:border-amber-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-amber-600/20 rounded-[1.5rem] flex items-center justify-center text-amber-400 shadow-xl shadow-amber-600/10 group-hover:scale-110 transition-transform border border-amber-500/30">
                <Wrench size={36} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">TALLERES</h3>
                <p className="text-amber-400/60 text-[10px] font-bold uppercase tracking-widest">Control de mantenimiento y servicios</p>
              </div>
            </button>

            <button 
              onClick={() => { setAppMode('rutinas'); setRoutineSubMode('menu'); }}
              className="group bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-emerald-600/20 rounded-[1.5rem] flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-600/10 group-hover:scale-110 transition-transform border border-emerald-500/30">
                <ClipboardCheck size={36} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">RUTINAS</h3>
                <p className="text-emerald-400/60 text-[10px] font-bold uppercase tracking-widest">Ejecución y control de inspecciones</p>
              </div>
            </button>

            <button 
              onClick={() => setAppMode('campanas')}
              className="group bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-violet-600/20 rounded-[1.5rem] flex items-center justify-center text-violet-400 shadow-xl shadow-violet-600/10 group-hover:scale-110 transition-transform border border-violet-500/30">
                <Sparkles size={36} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">CAMPAÑAS</h3>
                <p className="text-violet-400/60 text-[10px] font-bold uppercase tracking-widest">Auditoría de activos críticos</p>
              </div>
            </button>
          </div>
        </div>
      ) : appMode === 'flota_menu' ? (
        <div className="flex-grow bg-[#0f172a] flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]"></div>
          </div>

          {/* Top Left Icon */}
          <div className="absolute top-8 left-8">
            <button onClick={() => setAppMode('root_menu')} className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
              <ChevronLeft size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Menú Principal</span>
            </button>
          </div>

          {/* Central Logo Area */}
          <div className="relative z-10 flex flex-col items-center text-center mb-8 md:mb-16">
            <div className="w-32 h-32 md:w-48 md:h-48 bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl flex items-center justify-center mb-6 md:mb-10 relative group">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-[2rem] md:rounded-[3rem] scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <ClipboardList size={48} className="md:size-20 text-slate-800" />
                <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-amber-400 p-2 md:p-3 rounded-xl md:rounded-2xl shadow-lg border-2 md:border-4 border-white">
                  <Settings size={18} className="md:size-7 text-slate-900 animate-spin-slow" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-[0.2em] mb-2 md:mb-4">FLOTA BARRANQUILLA</h1>
            <p className="text-indigo-400 font-black text-[10px] md:text-sm uppercase tracking-[0.3em] md:tracking-[0.5em] opacity-80">GESTIÓN Y CONTROL DE ACTIVOS</p>
          </div>

          {/* Menu Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto w-full relative z-10 px-4 md:px-0">
            <button 
              onClick={() => { setAppMode('camiones'); setActiveCategory('root'); setActiveView('categories_dashboard'); }}
              className="group bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 p-4 md:p-10 rounded-2xl md:rounded-[3rem] transition-all duration-500 flex flex-row md:flex-col items-center text-left md:text-center gap-3 md:gap-6 shadow-2xl hover:-translate-y-1 md:hover:-translate-y-2"
            >
              <div className="w-12 h-12 md:w-20 md:h-20 bg-indigo-600/20 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10 group-hover:scale-110 transition-transform border border-indigo-500/30 shrink-0">
                <Truck size={20} className="md:size-9" />
              </div>
              <div>
                <h3 className="text-base md:text-2xl font-black text-white uppercase tracking-widest mb-0.5 md:mb-1">CAMIONES</h3>
                <p className="text-indigo-400/60 text-[7px] md:text-[10px] font-bold uppercase tracking-widest">Control de flota pesada</p>
              </div>
            </button>

            <button 
              onClick={() => { setAppMode('montacargas'); setActiveView('operadores'); handleSyncData(); }}
              className="group bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/50 p-4 md:p-10 rounded-2xl md:rounded-[3rem] transition-all duration-500 flex flex-row md:flex-col items-center text-left md:text-center gap-3 md:gap-6 shadow-2xl hover:-translate-y-1 md:hover:-translate-y-2"
            >
              <div className="w-12 h-12 md:w-20 md:h-20 bg-emerald-600/20 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-600/10 group-hover:scale-110 transition-transform border border-emerald-500/30 shrink-0">
                <Truck size={20} className="md:size-9 rotate-12" />
              </div>
              <div>
                <h3 className="text-base md:text-2xl font-black text-white uppercase tracking-widest mb-0.5 md:mb-1">MONTACARGAS</h3>
                <p className="text-emerald-400/60 text-[7px] md:text-[10px] font-bold uppercase tracking-widest">Gestión de equipos logísticos</p>
              </div>
            </button>
          </div>
        </div>
      ) : appMode === 'talleres' ? (
        <WorkshopModule onBack={() => setAppMode('root_menu')} vehicles={vehicles} />
      ) : appMode === 'rutinas' ? (
        <div className="flex-grow bg-[#f8fafc] p-8 overflow-y-auto h-screen">
          {routineSubMode === 'menu' ? (
            <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
              {/* Back button */}
              <button
                type="button"
                onClick={() => setAppMode('root_menu')}
                className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <ChevronLeft size={14} /> Menú Principal
              </button>

              {/* Title Header */}
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                  <ClipboardCheck size={40} className="text-emerald-600" /> Control de Rutinas
                </h2>
                <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">
                  Seleccione el tipo de control o módulo que desea inspeccionar
                </p>
              </div>

              {/* Grid of Routine Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
                <button
                  onClick={() => setRoutineSubMode('select_rutina')}
                  className="group bg-white hover:bg-emerald-50/20 border border-slate-200/80 hover:border-emerald-500/50 p-8 rounded-[2rem] transition-all duration-300 flex flex-col items-start text-left shadow-lg hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
                >
                  {/* Decorative big background icon */}
                  <div className="absolute -right-6 -bottom-6 text-slate-100 group-hover:text-emerald-100/40 transition-colors pointer-events-none">
                    <Wrench size={140} />
                  </div>

                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform mb-6 border border-emerald-200">
                    <Wrench size={30} />
                  </div>

                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-emerald-700 transition-colors">
                    Mtto Preventivo
                  </h3>

                  <p className="text-slate-500 text-xs leading-relaxed mb-6 relative z-10">
                    Inspecciones de niveles de fluidos, lubricación, frenos, dirección, suspensión, llantas y diagnóstico electrónico OBD-II divididos en 4 rutinas.
                  </p>

                  <div className="mt-auto flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-wider relative z-10">
                    Ver rutinas disponibles <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          ) : routineSubMode === 'select_rutina' ? (
            <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
              {/* Back button */}
              <button
                type="button"
                onClick={() => setRoutineSubMode('menu')}
                className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <ChevronLeft size={14} /> Regresar a Módulos
              </button>

              {/* Title Header */}
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                  <Wrench size={40} className="text-emerald-600" /> Mantenimiento Preventivo
                </h2>
                <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">
                  Seleccione una de las 4 rutinas preventivas para iniciar el control
                </p>
              </div>

              {/* Grid of the 4 Routines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {/* RUTINA 1 */}
                <button
                  onClick={() => { setSelectedRoutineTemplate('rutina_1'); setRoutineSubMode('dashboard'); }}
                  className="group bg-white hover:bg-emerald-50/10 border border-slate-200/80 hover:border-emerald-500/50 p-8 rounded-[2rem] transition-all duration-300 flex items-start gap-6 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border border-emerald-100 shrink-0">
                    <Droplets size={28} />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <span className="inline-block px-3 py-1 bg-emerald-100/50 text-emerald-800 text-[9px] font-black uppercase tracking-widest rounded-full">
                      Fase 1
                    </span>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                      RUTINA 1: Lubricación, Filtros y Refrigeración
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Nivel y estado del aceite de motor, filtros de aire y combustible, líquido refrigerante, correas y fajas de accesorios.
                    </p>
                    <div className="pt-2 flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      Iniciar Inspección <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* RUTINA 2 */}
                <button
                  onClick={() => { setSelectedRoutineTemplate('rutina_2'); setRoutineSubMode('dashboard'); }}
                  className="group bg-white hover:bg-emerald-50/10 border border-slate-200/80 hover:border-emerald-500/50 p-8 rounded-[2rem] transition-all duration-300 flex items-start gap-6 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border border-emerald-100 shrink-0">
                    <Disc size={28} />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <span className="inline-block px-3 py-1 bg-emerald-100/50 text-emerald-800 text-[9px] font-black uppercase tracking-widest rounded-full">
                      Fase 2
                    </span>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                      RUTINA 2: Frenos, Dirección y Chasis
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Pastillas y bandas de frenos, líquido de frenos, holgura de pedal, juego libre del volante de dirección y engrase de chasis.
                    </p>
                    <div className="pt-2 flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      Iniciar Inspección <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* RUTINA 3 */}
                <button
                  onClick={() => { setSelectedRoutineTemplate('rutina_3'); setRoutineSubMode('dashboard'); }}
                  className="group bg-white hover:bg-emerald-50/10 border border-slate-200/80 hover:border-emerald-500/50 p-8 rounded-[2rem] transition-all duration-300 flex items-start gap-6 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border border-emerald-100 shrink-0">
                    <Truck size={28} />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <span className="inline-block px-3 py-1 bg-emerald-100/50 text-emerald-800 text-[9px] font-black uppercase tracking-widest rounded-full">
                      Fase 3
                    </span>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                      RUTINA 3: Suspensión, Llantas y Rines
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Amortiguadores, espirales, bujes, alineación, rotación, presión y estado de las llantas, rines y ballestas traseras.
                    </p>
                    <div className="pt-2 flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      Iniciar Inspección <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* RUTINA 4 */}
                <button
                  onClick={() => { setSelectedRoutineTemplate('rutina_4'); setRoutineSubMode('dashboard'); }}
                  className="group bg-white hover:bg-emerald-50/10 border border-slate-200/80 hover:border-emerald-500/50 p-8 rounded-[2rem] transition-all duration-300 flex items-start gap-6 text-left shadow-lg hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border border-emerald-100 shrink-0">
                    <Activity size={28} />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <span className="inline-block px-3 py-1 bg-emerald-100/50 text-emerald-800 text-[9px] font-black uppercase tracking-widest rounded-full">
                      Fase 4
                    </span>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-700 transition-colors">
                      RUTINA 4: Sistema Eléctrico y Diagnóstico
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Inspección de batería, bornes, alternador, motor de arranque, luces principales/direccionales y escaneo electrónico OBD-II.
                    </p>
                    <div className="pt-2 flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      Iniciar Inspección <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <RutinasModule 
              vehicles={vehicles} 
              drivers={drivers} 
              onReportNovelty={handleReportRoutineNovelty} 
              defaultTemplateId={selectedRoutineTemplate}
              onBack={() => setRoutineSubMode('select_rutina')}
            />
          )}
        </div>
      ) : appMode === 'campanas' ? (
        <CampaignsModule 
          onBack={() => setAppMode('root_menu')} 
          vehicles={vehicles} 
          drivers={drivers} 
        />
      ) : (
        <>
          {/* SIDEBAR PREMIUM */}
          {(activeView as string) !== 'enlaces' && (
            <>
              {isSidebarOpen && (
                <div 
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 xl:hidden animate-in fade-in duration-300" 
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}
              <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform xl:relative xl:translate-x-0`}>
            <div className="p-8 flex flex-col h-full space-y-2">
              <div className="mb-10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">BQA</div>
                    <span className="text-white font-black text-xs tracking-widest uppercase">Gestión Flota</span>
                 </div>
                 <button onClick={() => setAppMode('flota_menu')} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <LayoutGrid size={20} />
                 </button>
              </div>
              
              <nav className="flex-grow space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {appMode === 'montacargas' ? (
                  <div className="space-y-1">
                    <button 
                      onClick={() => { 
                        setActiveView('operadores'); 
                        setIsSidebarOpen(false); 
                      }} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'operadores' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <Users size={18}/> OPERADORES
                    </button>
                    <button 
                      onClick={() => { 
                        setActiveView('comparendos_montacargas'); 
                        setIsSidebarOpen(false); 
                      }} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'comparendos_montacargas' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <Gavel size={18}/> COMPARENDOS
                    </button>
                  </div>
                ) : (
                  <>
                    {activeCategory === 'root' ? (
                      <div className="space-y-4 py-2 px-1 text-center">
                        <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest leading-relaxed">
                          Seleccione una categoría para comenzar:
                        </p>
                        <div className="space-y-2 pt-2">
                          <button
                            onClick={() => { setActiveCategory('doc'); setActiveView('categories_dashboard'); }}
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-white/5 hover:bg-indigo-600/25 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl text-[10px] font-black text-indigo-300 uppercase tracking-widest transition-all text-left"
                          >
                            <span>📘 DOCUMENTACIÓN</span>
                            <ChevronDown size={12} />
                          </button>
                          <button
                            onClick={() => { setActiveCategory('gestion'); setActiveView('categories_dashboard'); }}
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-white/5 hover:bg-emerald-600/25 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-[10px] font-black text-emerald-300 uppercase tracking-widest transition-all text-left"
                          >
                            <span>⚙️ GESTIÓN</span>
                            <ChevronDown size={12} />
                          </button>
                          <button
                            onClick={() => { setActiveCategory('otros'); setActiveView('categories_dashboard'); }}
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-white/5 hover:bg-purple-600/25 border border-purple-500/20 hover:border-purple-500/40 rounded-xl text-[10px] font-black text-purple-300 uppercase tracking-widest transition-all text-left"
                          >
                            <span>🔍 OTROS</span>
                            <ChevronDown size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button
                          onClick={() => {
                            setActiveCategory('root');
                            setActiveView('categories_dashboard');
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 text-[10px] font-black uppercase tracking-widest transition-all mb-4"
                        >
                          <ChevronLeft size={14} /> VOLVER A CATEGORÍAS
                        </button>

                        <div className="space-y-1">
                          <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-md ${
                            activeCategory === 'doc' ? 'text-indigo-400 bg-indigo-500/5' :
                            activeCategory === 'gestion' ? 'text-emerald-400 bg-emerald-500/5' :
                            'text-purple-400 bg-purple-500/5'
                          }`}>
                            {activeCategory === 'doc' ? '📘 DOCUMENTACIÓN' :
                             activeCategory === 'gestion' ? '⚙️ GESTIÓN' :
                             '🔍 OTROS'}
                          </p>

                          <div className="space-y-1 pt-2 animate-in fade-in duration-300">
                            {CATEGORY_CHUNKS[activeCategory].items.map(item => {
                              const Icon = item.icon;
                              const isCurrent = activeView === item.id;
                              const activeColorClass = 
                                activeCategory === 'doc' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' :
                                activeCategory === 'gestion' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' :
                                'bg-purple-600 text-white shadow-xl shadow-purple-600/20';

                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setActiveView(item.id as ActiveView);
                                    setIsSidebarOpen(false);
                                    if (item.id === 'rendimiento' || item.id === 'adherencia' || item.id === 'correctivos' || item.id === 'indisponibilidad' || item.id === 'torre_preventivos') {
                                      handleSyncData();
                                    }
                                  }}
                                  className={`w-full flex items-center gap-4 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isCurrent ? activeColorClass : 'text-slate-400 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  <Icon size={18} /> {item.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </nav>

          <button onClick={handleSyncData} className="mt-auto w-full flex items-center justify-center gap-3 py-4 bg-white/5 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> Sincronizar
          </button>
        </div>
      </aside>
            </>
          )}

      <main className="flex-grow flex flex-col h-screen overflow-hidden pb-16 xl:pb-0">
        {/* HEADER */}
        <header className="bg-white border-b p-3 md:p-4 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 md:gap-4 flex-grow">
            <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2 text-slate-600"><Menu/></button>
            <button 
              onClick={() => setAppMode('flota_menu')}
              className="hidden xl:flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">
                Menú Flota
              </span>
            </button>

            {appMode === 'camiones' && activeCategory !== 'root' && (
              <button 
                onClick={() => {
                  setActiveCategory('root');
                  setActiveView('categories_dashboard');
                }}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all font-black text-[9px] uppercase tracking-wider border border-indigo-100/50"
              >
                <span>Categorías</span>
              </button>
            )}
            <div className="bg-slate-50 border rounded-xl px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2 md:gap-3 w-full max-w-md shadow-inner">
              <Search size={14} className="text-slate-400 md:size-4" />
              <input 
                type="text" 
                placeholder="BUSCAR..." 
                className="bg-transparent font-black uppercase text-[9px] md:text-[10px] outline-none flex-grow" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value.toUpperCase())} 
              />
            </div>
          </div>
          <div className="ml-2 md:ml-4 flex items-center gap-2 md:gap-3">
             {activeView !== 'operadores' && (
               <>
                 <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
                   <Building2 size={12} className="text-slate-400" />
                   <select className="bg-transparent font-black text-[9px] uppercase outline-none" value={filterCd} onChange={e => setFilterCd(e.target.value)}>
                      <option value="all">TODOS LOS CD</option>
                      {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                   </select>
                 </div>
                 <button onClick={() => {
                    if(activeView === 'comparendos') setShowFineForm(true);
                    else if(activeView === 'vehiculos') setShowDocUpdateForm(true);
                    else if(activeView === 'novedades') setShowReportForm(true);
                    else if(activeView === 'lavados') setShowWashForm(true);
                    else if(activeView === 'limpieza') setShowCleaningForm(true);
                    else if(activeView === 'calibraciones') setShowCalibrationForm(true);
                 }} className="p-2 md:p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                    <Plus size={18} className="md:size-5" />
                 </button>
               </>
             )}
          </div>
        </header>

        {/* BOTTOM NAV MOBILE */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center p-2 z-40 xl:hidden">
          {[
            { id: 'vehiculos', icon: <Truck size={20}/>, label: 'Flota' },
            { id: 'kilometrajes', icon: <Gauge size={20}/>, label: 'KM' },
            { id: 'novedades', icon: <ClipboardList size={20}/>, label: 'Nov' },
            { id: 'indicadoresOperativos', icon: <Activity size={20}/>, label: 'Ind' },
            { id: 'enlaces', icon: <LinkIcon size={20}/>, label: 'Links' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveView(item.id as ActiveView)}
              className={`flex flex-col items-center gap-1 p-2 transition-all ${activeView === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              {item.icon}
              <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* CONTENT AREA */}
        <div className="flex-grow p-3 md:p-8 overflow-y-auto bg-[#F0F4FF] custom-scrollbar">
          
          {activeView === 'categories_dashboard' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeCategory === 'root' ? (
                <>
                  <div className="flex flex-col gap-2 mb-6 text-left">
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                      <LayoutGrid className="text-indigo-600" size={32} /> Categorías de Control
                    </h2>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">
                      Seleccione una de las siguientes áreas para gestionar los módulos de la flota
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* DOCUMENTACION */}
                    <button 
                      onClick={() => {
                        setActiveCategory('doc');
                      }}
                      className="group text-left bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 hover:from-indigo-600 hover:to-indigo-700 border border-indigo-200/50 hover:border-indigo-600 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-2 flex flex-col justify-between h-72 relative overflow-hidden"
                    >
                      <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 text-indigo-500/5 group-hover:text-white/5 transition-colors duration-300">
                        <Shield size={220} />
                      </div>
                      <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                        <Shield size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 group-hover:text-indigo-200 transition-colors">
                          MÓDULO DE INFORMACIÓN
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-white uppercase tracking-tight mt-1 mb-2">
                          DOCUMENTACIÓN
                        </h3>
                        <p className="text-slate-500 group-hover:text-white/80 text-xs font-medium leading-relaxed max-w-sm">
                          Gestione tableros operativos, disponibilidad general, conductores, vehículos, comparendos y check lists de control.
                        </p>
                      </div>
                    </button>

                    {/* GESTION */}
                    <button 
                      onClick={() => {
                        setActiveCategory('gestion');
                      }}
                      className="group text-left bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-200/50 hover:border-emerald-600 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-2 flex flex-col justify-between h-72 relative overflow-hidden"
                    >
                      <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 text-emerald-500/5 group-hover:text-white/5 transition-colors duration-300">
                        <Settings size={220} />
                      </div>
                      <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                        <Settings size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 group-hover:text-emerald-200 transition-colors">
                          MÓDULO OPERACIONES
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-white uppercase tracking-tight mt-1 mb-2">
                          GESTIÓN
                        </h3>
                        <p className="text-slate-500 group-hover:text-white/80 text-xs font-medium leading-relaxed max-w-sm">
                          Haga seguimiento a kilometraje, visitas a talleres, lavados, mantenimiento preventivo y correctivo, combustible y rendimiento.
                        </p>
                      </div>
                    </button>

                    {/* OTROS */}
                    <button 
                      onClick={() => {
                        setActiveCategory('otros');
                      }}
                      className="group text-left bg-gradient-to-br from-purple-50/50 to-purple-100/30 hover:from-purple-600 hover:to-purple-700 border border-purple-200/50 hover:border-purple-600 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-purple-500/20 hover:-translate-y-2 flex flex-col justify-between h-72 relative overflow-hidden"
                    >
                      <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 text-purple-500/5 group-hover:text-white/5 transition-colors duration-300">
                        <LayoutGrid size={220} />
                      </div>
                      <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                        <LayoutGrid size={32} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 group-hover:text-indigo-200 transition-colors">
                          MÓDULO AUXILIAR
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-white uppercase tracking-tight mt-1 mb-2">
                          OTROS
                        </h3>
                        <p className="text-slate-500 group-hover:text-white/80 text-xs font-medium leading-relaxed max-w-sm">
                          Módulos complementarios de seguimiento general, proyecciones VLC vs Budget, y demás utilitarios de valor.
                        </p>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <button 
                        onClick={() => setActiveCategory('root')} 
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase tracking-widest mb-2"
                      >
                        <ChevronLeft size={16} /> Volver a Categorías
                      </button>
                      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                        Módulos de {CATEGORY_CHUNKS[activeCategory].label}
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {CATEGORY_CHUNKS[activeCategory].items.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveView(item.id as ActiveView);
                            if (item.id === 'rendimiento' || item.id === 'adherencia' || item.id === 'correctivos' || item.id === 'indisponibilidad' || item.id === 'torre_preventivos') {
                              handleSyncData();
                            }
                          }}
                          className="group bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 p-6 rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 flex items-center gap-4 text-left"
                        >
                          <div className={`p-4 rounded-xl ${
                            activeCategory === 'doc' ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' :
                            activeCategory === 'gestion' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' :
                            'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                          } transition-colors shadow-sm`}>
                            <Icon size={24} />
                          </div>
                          <div>
                            <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight group-hover:text-slate-900 transition-colors">
                              {item.label}
                            </h3>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                              Abrir Módulo →
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeView === 'vcl' && (
            <VclModule vehicles={vehicles} />
          )}

          {activeView === 'sostenibilidad' && (
            <SustainabilityModule />
          )}

          {activeView === 'mttr' && (
            <MttrModule />
          )}

          {activeView === 'indicadoresOperativos' && (
            <OperationalDashboard 
              indicators={operationalIndicators}
            />
          )}

          {activeView === 'checklist' && (
            <CheckListModule checkLists={checkLists} />
          )}

          {activeView === 'rendimiento' && (
            <FuelPerformanceModule fuelData={fuelPerformanceData} />
          )}

          {activeView === 'adherencia' && (
            <PlateAdherenceModule data={plateAdherenceData} />
          )}

          {activeView === 'indicadoresDisponibilidad' && (
            <AvailabilityIndicators 
              vehicles={vehicles}
              availabilityRecords={availabilityRecords}
              availabilitySummary={availabilitySummary}
              fleetComposition={derivedFleetComposition}
            />
          )}

          {activeView === 'estandar_flota' && (
            <FleetStandardModule 
              data={auditRecords} 
              masterList={auditMasterVehicles}
              cierreRecords={fleetCierreRecords}
              fleetBase={fleetBase}
              onUpdateRecord={handleUpdateFleetStandardRecord}
            />
          )}

          {activeView === 'torre_preventivos' && (
            <PreventiveMaintenanceModule data={preventives} onUpdate={handleUpdatePreventive} />
          )}

          {activeView === 'auditoria_calidad_seguridad' && (
            <ExecutiveAuditDashboard />
          )}

          {activeView === 'disponibilidad' && (
            <AvailabilityModule 
              availability={availabilityRecords}
              availabilityPct={availabilitySummary}
              fleetBase={fleetBase}
              onRefresh={handleSyncData}
              loading={isSyncing}
            />
          )}

          {activeView === 'vehiculos' && (
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20 px-1 md:px-0">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <Shield size={24} className="text-indigo-600" /> Seguimiento Documental
                </h2>
                <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm w-full md:w-auto">
                  <button 
                    onClick={() => setVehicleViewMode('grid')}
                    className={`flex-grow md:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${vehicleViewMode === 'grid' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <LayoutGrid size={12} /> Cuadrícula
                    </div>
                  </button>
                  <button 
                    onClick={() => setVehicleViewMode('table')}
                    className={`flex-grow md:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${vehicleViewMode === 'table' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ListFilter size={12} /> Tabla
                    </div>
                  </button>
                </div>
              </div>

              <VehicleStats 
                total={statsVehicles.total}
                soatWarning={statsVehicles.soatWarning}
                rtmWarning={statsVehicles.rtmWarning}
                plcWarning={statsVehicles.plcWarning}
                extWarning={statsVehicles.extWarning}
                onFilter={setVehicleDocFilter}
                activeFilter={vehicleDocFilter}
              />

              {vehicleViewMode === 'table' ? (
                <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[8px] uppercase tracking-widest text-slate-500 font-black">
                          <th className="p-3 md:p-4">Placa</th>
                          <th className="p-3 md:p-4">CD</th>
                          <th className="p-3 md:p-4">Contratista</th>
                          <th className="p-3 md:p-4">SOAT</th>
                          <th className="p-3 md:p-4">RTM</th>
                          <th className="p-3 md:p-4">EXT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10px] font-medium text-slate-700">
                        {filteredVehicles.map(v => (
                          <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 md:p-4">
                              <span className="bg-slate-900 px-2 py-1 rounded text-white font-mono font-black tracking-tighter">
                                {v.plate}
                              </span>
                            </td>
                            <td className="p-3 md:p-4 font-black uppercase text-slate-400 text-[9px]">{v.cd}</td>
                            <td className="p-3 md:p-4 font-black uppercase text-slate-600 text-[9px] truncate max-w-[80px] md:max-w-none">{v.contractor}</td>
                            <td className="p-3 md:p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                v.soat.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {v.soat.expiryDate}
                              </span>
                            </td>
                            <td className="p-3 md:p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                v.rtm.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {v.rtm.expiryDate}
                              </span>
                            </td>
                            <td className="p-3 md:p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                v.extinguisher.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {v.extinguisher.expiryDate}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  {filteredVehicles.map(v => (
                    <div key={v.id} className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-500">
                      <div className="flex flex-col lg:flex-row">
                        <div className="lg:w-[280px] bg-[#0f172a] p-5 md:p-8 flex flex-row lg:flex-col items-center justify-between lg:justify-center shrink-0 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                          <div className="bg-white/5 px-4 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl border border-white/10 text-center mb-0 lg:mb-6 shadow-2xl relative z-10">
                              <h2 className="text-xl md:text-3xl font-mono font-black text-white tracking-tighter">{v.plate}</h2>
                          </div>
                          <div className="space-y-1 md:space-y-2 w-auto lg:w-full relative z-10 text-right lg:text-left">
                             <div className="flex items-center justify-end lg:justify-start gap-2 text-indigo-400">
                               <Building2 size={12} className="md:size-14"/>
                               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{v.cd}</span>
                             </div>
                             <div className="flex items-center justify-end lg:justify-start gap-2 text-slate-400">
                               <Users size={12} className="md:size-14"/>
                               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest truncate max-w-[120px] md:max-w-none">{v.contractor}</span>
                             </div>
                          </div>
                        </div>
                        <div className="flex-grow p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                           <DocumentCard title="SOAT" doc={v.soat} icon={<Shield/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} onAddSupport={() => setShowDocUpdateForm(true)} />
                           <DocumentCard title="RTM" doc={v.rtm} icon={<RefreshCw/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} onAddSupport={() => setShowDocUpdateForm(true)} />
                           <DocumentCard title="EXTINTOR" doc={v.extinguisher} icon={<Shield/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} onAddSupport={() => setShowDocUpdateForm(true)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'conductores' && (
            <div className="max-w-7xl mx-auto space-y-6">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <Users size={24} className="text-indigo-600" /> Directorio de Conductores
                 </h2>
                 <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                   <button 
                     onClick={() => setDriverViewMode('grid')}
                     className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${driverViewMode === 'grid' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                   >
                     <div className="flex items-center gap-2">
                       <LayoutGrid size={12} /> Cuadrícula
                     </div>
                   </button>
                   <button 
                     onClick={() => setDriverViewMode('table')}
                     className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${driverViewMode === 'table' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                   >
                     <div className="flex items-center gap-2">
                       <ListFilter size={12} /> Tabla
                     </div>
                   </button>
                 </div>
               </div>
               
               <DriverStats 
                 total={statsDrivers.total}
                 licenseWarning={statsDrivers.licenseWarning}
                 defensiveWarning={statsDrivers.defensiveWarning}
                 medicalWarning={statsDrivers.medicalWarning}
                 onFilter={setDriverDocFilter}
                 activeFilter={driverDocFilter}
               />

               {driverViewMode === 'table' ? (
                 <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-50 border-b border-slate-200 text-[8px] uppercase tracking-widest text-slate-500 font-black">
                           <th className="p-4">Nombre</th>
                           <th className="p-4">CD</th>
                           <th className="p-4">Contratista</th>
                           <th className="p-4">Licencia</th>
                           <th className="p-4">Manejo Def.</th>
                           <th className="p-4">Ex. Médico</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-[10px] font-medium text-slate-700">
                         {filteredDrivers.map(d => (
                           <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                             <td className="p-4 font-black uppercase">{d.name}</td>
                             <td className="p-4 font-black uppercase text-slate-400">{d.cd}</td>
                             <td className="p-4 font-black uppercase text-slate-600">{d.contractor}</td>
                             <td className="p-4">
                               <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                 d.license.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                               }`}>
                                 {d.license.expiryDate}
                               </span>
                             </td>
                             <td className="p-4">
                               <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                 d.defensiveDriving.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                               }`}>
                                 {d.defensiveDriving.expiryDate}
                               </span>
                             </td>
                             <td className="p-4">
                               <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                 d.medicalExam.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                               }`}>
                                 {d.medicalExam.expiryDate}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-6">
                  {filteredDrivers.map(d => (
                    <DriverCard key={d.id} driver={d} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                  ))}
                 </div>
               )}
            </div>
          )}

          {activeView === 'comparendos' && (
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <Gavel size={40} className="text-rose-600" /> Gestión Comparendos
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Control y seguimiento de infracciones</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterCd}
                        onChange={e => setFilterCd(e.target.value)}
                      >
                        <option value="all">TODOS LOS CD</option>
                        {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                      </select>
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterContractor}
                        onChange={e => setFilterContractor(e.target.value)}
                      >
                        <option value="all">TODOS LOS CONTRATISTAS</option>
                        {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO MENSUAL</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MENSUAL"
                              disabled
                            >
                              <option value="MENSUAL">MENSUAL</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              <option value="TODOS">TODOS</option>
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedYear}
                              onChange={e => setSelectedYear(parseInt(e.target.value))}
                            >
                              {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">ESTADO</span>
                        <div className="flex items-center gap-2">
                          <select className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer" value={fineStatusFilter} onChange={e => setFineStatusFilter(e.target.value as any)}>
                            <option value="all">TODOS</option>
                            <option value="PENDIENTE">PENDIENTES</option>
                            <option value="PAGADO">PAGADOS</option>
                            <option value="WITH_EVIDENCE">CON SOPORTE</option>
                            <option value="WITHOUT_EVIDENCE">SIN SOPORTE</option>
                          </select>
                          {fineStatusFilter !== 'all' && (
                            <button 
                              onClick={() => setFineStatusFilter('all')}
                              className="text-[8px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-tighter"
                            >
                              [Limpiar]
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
               </div>

               <FineStats 
                 totalDrivers={statsFines.totalDrivers}
                 withFines={statsFines.withFines}
                 withoutFines={statsFines.withoutFines}
                 withEvidence={statsFines.withEvidence}
                 withoutEvidence={statsFines.withoutEvidence}
                 rawTotal={statsFines.rawTotal}
                 month={selectedMonth}
                 activeFilter={fineStatusFilter}
                 onFilterChange={(f) => setFineStatusFilter(f as any)}
               />

               <MonthlyReport 
                 summary={monthlySummary}
                 selectedMonth={selectedMonth}
                 onSelectMonth={setSelectedMonth}
               />

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFines.map(f => (
                    <FineCard key={f.id} fine={f} onViewDoc={(url, t) => setViewDoc({url, title: t})} onAddSupport={setManagingFineSupport} />
                  ))}
               </div>
               {filteredFines.length === 0 && (
                 <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-200 text-center">
                    <Gavel size={64} className="text-slate-200 mx-auto mb-6" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado comparendos con los filtros aplicados para {selectedMonth} {selectedYear}</p>
                 </div>
               )}
            </div>
          )}

          {activeView === 'kilometrajes' && (
            <MileageEntryForm 
              vehicles={vehicles} 
              mileageLogs={mileageLogs} 
              onSubmit={async (data) => {
                const tempLog: MileageLog = {
                  id: `temp-${Date.now()}`,
                  plate: data.plate,
                  mileage: data.mileage,
                  date: data.date,
                  cd: data.cd,
                  contractor: data.contractor,
                  week: data.week
                };

                // Optimistic update
                setMileageLogs(prev => [tempLog, ...prev]);

                try {
                  await submitMileageToSheet(data);
                  console.log("✅ Kilometraje guardado con éxito.");
                  handleSyncData().catch(e => console.error("Error syncing after save:", e));
                } catch (err) {
                  // Revert if error
                  setMileageLogs(prev => prev.filter(m => m.id !== tempLog.id));
                  console.error("Error submitting mileage:", err);
                  throw err;
                }
              }} 
              externalCd={filterCd} 
              setExternalCd={setFilterCd} 
              externalContractor={filterContractor} 
              setExternalContractor={setFilterContractor} 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
              statusFilter={mileageStatusFilter} 
              setStatusFilter={setMileageStatusFilter} 
              selectedWeek={selectedWeek} 
              onWeekChange={setSelectedWeek} 
            />
          )}

          {activeView === 'novedades' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <ClipboardList size={40} className="text-indigo-600" /> Gestión de Novedades
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Control mensual de operaciones de taller</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                      <button 
                        onClick={() => setReportViewMode('grid')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${reportViewMode === 'grid' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={12} /> Cuadrícula
                        </div>
                      </button>
                      <button 
                        onClick={() => setReportViewMode('table')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${reportViewMode === 'table' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <ListFilter size={12} /> Tabla
                        </div>
                      </button>
                    </div>

                    {/* Filtros CD, Contratista y Origen */}
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterCd}
                        onChange={e => setFilterCd(e.target.value)}
                      >
                        <option value="all">TODOS LOS CD</option>
                        {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                      </select>
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterContractor}
                        onChange={e => setFilterContractor(e.target.value)}
                      >
                        <option value="all">TODOS LOS CONTRATISTAS</option>
                        {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterSource}
                        onChange={e => setFilterSource(e.target.value)}
                      >
                        <option value="all">TODOS LOS ORIGENES</option>
                        {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO MENSUAL</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MENSUAL"
                              disabled
                            >
                              <option value="MENSUAL">MENSUAL</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              <option value="TODOS">TODOS</option>
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedYear}
                              onChange={e => setSelectedYear(parseInt(e.target.value))}
                            >
                              {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowReportForm(true)}
                      className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    >
                      <Plus size={20}/> Crear Novedad
                    </button>
                  </div>
               </div>

               {/* Chart Section */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-600" /> Cumplimiento Semanal (%)
                      </h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cierre de novedades por semana</p>
                    </div>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportComplianceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }}
                          unit="%"
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '10px',
                            fontWeight: '800',
                            textTransform: 'uppercase'
                          }}
                        />
                        <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" />
                        <Bar dataKey="percentage" radius={[6, 6, 6, 6]} barSize={30}>
                          {reportComplianceData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.percentage >= 90 ? '#10b981' : entry.percentage >= 70 ? '#f59e0b' : '#ef4444'} 
                            />
                          ))}
                          <LabelList dataKey="percentage" position="top" style={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} formatter={(v: any) => `${v}%`} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <ReportStats 
                 total={statsReports.total}
                 completed={statsReports.completed}
                 pending={statsReports.pending}
                 searchCount={statsReports.searchCount}
                 month={selectedMonth}
                 activeFilter={reportStatusFilter}
                 onFilterChange={setReportStatusFilter}
               />

               {reportViewMode === 'table' ? (
                  <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[8px] uppercase tracking-widest text-slate-500 font-black">
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Placa</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Taller</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Días</th>
                            <th className="p-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[10px] font-medium text-slate-700">
                          {filteredReports.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-black">{r.date}</td>
                              <td className="p-4">
                                <span className="bg-slate-900 px-2 py-1 rounded text-white font-mono font-black tracking-tighter">
                                  {r.plate}
                                </span>
                              </td>
                              <td className="p-4 uppercase font-black text-slate-400 truncate max-w-[200px]">{r.novelty}</td>
                              <td className="p-4 uppercase font-black text-slate-600">{r.workshop}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                  r.status === 'COMPLETADOS' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="p-4 font-black">{r.daysInShop || '0'}d</td>
                              <td className="p-4 text-right">
                                <button 
                                  onClick={() => setClosingReport(r)}
                                  className="text-indigo-600 font-black uppercase tracking-widest text-[8px] hover:underline"
                                >
                                  Gestionar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredReports.map(r => (
                      <ReportCard 
                        key={r.id} 
                        report={r} 
                        onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                        onManageClosure={setClosingReport} 
                        onManageEntry={setRegisteringEntry}
                      />
                    ))}
                    {filteredReports.length === 0 && (
                      <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                        <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado novedades con los filtros seleccionados</p>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}

          {activeView === 'cierre_novedades' && (
            <ControlTowerModule data={controlTowerRecords} vehicles={vehicles} />
          )}

          {activeView === 'lavados' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <Droplets size={40} className="text-cyan-500" /> Historial de Lavados
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Cumplimiento de higiene y limpieza mensual</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Filtros de CD y Contratista */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-4 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex flex-col border-r border-slate-200 pr-4">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CENTRO (C.D.)</span>
                          <select 
                            className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                            value={filterCd}
                            onChange={e => setFilterCd(e.target.value)}
                          >
                            <option value="all">TODOS LOS CD</option>
                            {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CONTRATISTA</span>
                          <select 
                            className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer max-w-[120px]"
                            value={filterContractor}
                            onChange={e => setFilterContractor(e.target.value)}
                          >
                            <option value="all">TODOS</option>
                            {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-1">
                      <button 
                        onClick={() => setWashViewMode('seguimiento')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${washViewMode === 'seguimiento' ? 'bg-[#0D2B4E] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Estatus Flota
                      </button>
                      <button 
                        onClick={() => setWashViewMode('calendar')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${washViewMode === 'calendar' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Cronograma
                      </button>
                      <button 
                        onClick={() => setWashViewMode('list')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${washViewMode === 'list' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Lista
                      </button>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-cyan-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO SELECCIONADO</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MENSUAL"
                              disabled
                            >
                              <option value="MENSUAL">MENSUAL</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              <option value="TODOS">TODOS</option>
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedYear}
                              onChange={e => setSelectedYear(parseInt(e.target.value))}
                            >
                              {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setWashPreselectedPlate(null);
                        setShowWashForm(true);
                      }}
                      className="flex items-center gap-3 px-8 py-4 bg-cyan-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-cyan-600/20 hover:bg-cyan-700 transition-all"
                    >
                      <Plus size={20}/> Registrar Lavado
                    </button>
                  </div>
               </div>

               {washViewMode === 'seguimiento' ? (
                 <WashMonthlyStatus 
                   vehicles={vehicles}
                   washReports={washReports}
                   selectedMonth={selectedMonth === 'TODOS' ? ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'][new Date().getMonth()] : selectedMonth}
                   selectedYear={selectedYear}
                   onMonthChange={setSelectedMonth}
                   onYearChange={setSelectedYear}
                   onRegisterWashForPlate={(plate) => {
                     setWashPreselectedPlate(plate);
                     setShowWashForm(true);
                   }}
                   onViewDoc={(url, t) => setViewDoc({url, title: t})}
                   filterCd={filterCd}
                   filterContractor={filterContractor}
                   onFilterCdChange={setFilterCd}
                   onFilterContractorChange={setFilterContractor}
                   uniqueCds={uniqueCds}
                   uniqueContractors={uniqueContractors}
                   onOpenWashForm={() => {
                     setWashPreselectedPlate(null);
                     setShowWashForm(true);
                   }}
                 />
               ) : washViewMode === 'calendar' ? (
                 <>
                   <WashStats 
                     totalFlota={filteredVehiclesForWash.length}
                     lavados={filteredWashReports.length}
                     pendientes={filteredVehiclesForWash.length - filteredWashReports.length}
                     busqueda={filteredWashReports.length}
                     month={selectedMonth}
                   />
                   <WashCalendar 
                     reports={filteredWashReports}
                     selectedMonth={selectedMonth}
                     selectedYear={selectedYear}
                     onMonthChange={setSelectedMonth}
                     onYearChange={setSelectedYear}
                     onViewDoc={(url, t) => setViewDoc({url, title: t})}
                     onManageClosure={() => {}}
                     searchTerm={searchTerm}
                   />
                 </>
               ) : (
                 <>
                   <WashStats 
                     totalFlota={filteredVehiclesForWash.length}
                     lavados={filteredWashReports.length}
                     pendientes={filteredVehiclesForWash.length - filteredWashReports.length}
                     busqueda={filteredWashReports.length}
                     month={selectedMonth}
                   />
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredWashReports.map(r => (
                          <WashCard 
                            key={r.id} 
                            report={r} 
                            onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                          />
                        ))
                      }
                      {filteredWashReports.length === 0 && (
                        <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                          <Droplets size={48} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado lavados con los filtros aplicados para {selectedMonth}</p>
                        </div>
                      )}
                   </div>
                 </>
               )}
            </div>
          )}

          {activeView === 'limpieza' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <Sparkles size={40} className="text-cyan-600" /> Limpieza 5S
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Cronograma de limpieza profunda y 5S</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                      <button 
                        onClick={() => setCleaningViewMode('list')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${cleaningViewMode === 'list' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={12} /> Lista
                        </div>
                      </button>
                      <button 
                        onClick={() => setCleaningViewMode('calendar')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${cleaningViewMode === 'calendar' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <CalendarDays size={12} /> Calendario
                        </div>
                      </button>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-4 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex flex-col border-r border-slate-200 pr-4">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CENTRO (C.D.)</span>
                          <select 
                            className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                            value={filterCd}
                            onChange={e => setFilterCd(e.target.value)}
                          >
                            <option value="all">TODOS LOS CD</option>
                            {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CONTRATISTA</span>
                          <select 
                            className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer max-w-[120px]"
                            value={filterContractor}
                            onChange={e => setFilterContractor(e.target.value)}
                          >
                            <option value="all">TODOS</option>
                            {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-cyan-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO SELECCIONADO</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MENSUAL"
                              disabled
                            >
                              <option value="MENSUAL">MENSUAL</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              <option value="TODOS">TODOS</option>
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedYear}
                              onChange={e => setSelectedYear(parseInt(e.target.value))}
                            >
                              {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowCleaningForm(true)}
                      className="flex items-center gap-3 px-8 py-4 bg-cyan-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-cyan-600/20 hover:bg-cyan-700 transition-all"
                    >
                      <Plus size={20}/> Registrar Limpieza
                    </button>
                  </div>
               </div>

               <WashStats 
                 totalFlota={cleaningStats.total}
                 lavados={cleaningStats.completed}
                 pendientes={cleaningStats.pending}
                 busqueda={filteredCleaningReports.length}
                 month={selectedMonth}
               />

               {cleaningViewMode === 'list' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCleaningReports.map(r => (
                        <WashCard 
                          key={r.id} 
                          report={r} 
                          onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                        />
                      ))
                    }
                    {filteredCleaningReports.length === 0 && (
                      <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                        <Droplets size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado limpiezas con los filtros aplicados para {selectedMonth}</p>
                      </div>
                    )}
                 </div>
               ) : (
                 <CleaningCalendar 
                   reports={cleaningReports.filter(r => filterCd === 'all' || (vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate))?.cd === filterCd))}
                   selectedMonth={selectedMonth}
                   selectedYear={selectedYear}
                   onMonthChange={setSelectedMonth}
                   onYearChange={setSelectedYear}
                   onViewDoc={(url, t) => setViewDoc({url, title: t})}
                   onManageClosure={setClosingCleaning}
                   searchTerm={searchTerm}
                 />
               )}
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <Disc size={40} className="text-indigo-600" /> Cumplimiento Calibración
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Monitoreo de presión y desgaste</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                      <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-1">
                        <button 
                          onClick={() => setCalibrationViewMode('seguimiento')}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calibrationViewMode === 'seguimiento' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                          Estatus Flota
                        </button>
                        <button 
                          onClick={() => setCalibrationViewMode('calendar')}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calibrationViewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                          Cronograma
                        </button>
                        <button 
                          onClick={() => setCalibrationViewMode('list')}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calibrationViewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                          Lista
                        </button>
                        <button 
                          onClick={() => setCalibrationViewMode('visual')}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calibrationViewMode === 'visual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                          Visual
                        </button>
                      </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MES"
                              disabled
                            >
                              <option value="MES">MES</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              <option value="TODOS">TODOS</option>
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleExportCalibrationsExcel}
                      className="flex items-center gap-2 px-5 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer group"
                      title="Exportar calibraciones del mes a Excel/CSV"
                    >
                      <FileSpreadsheet size={18} className="group-hover:rotate-12 transition-transform text-emerald-200" />
                      <span>Exportar Excel</span>
                      <Download size={14} className="opacity-70 ml-0.5" />
                    </button>

                  </div>
               </div>

               {calibrationViewMode === 'seguimiento' ? (
                 <CalibrationFleetTracking 
                   vehicles={vehicles}
                   calibrations={calibrations}
                   selectedMonth={selectedMonth === 'TODOS' ? ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'][new Date().getMonth()] : selectedMonth}
                   selectedYear={selectedYear}
                   onMonthChange={setSelectedMonth}
                   onYearChange={setSelectedYear}
                   onRegisterCalibrationForPlate={(plate) => {
                     setCalibrationPreselectedPlate(plate);
                     setUpdatingCalibration(null);
                     setShowCalibrationForm(true);
                   }}
                   onViewDoc={(url, t) => setViewDoc({url, title: t})}
                   filterCd={filterCd}
                   filterContractor={filterContractor}
                   onFilterCdChange={setFilterCd}
                   onFilterContractorChange={setFilterContractor}
                   uniqueCds={uniqueCds}
                   uniqueContractors={uniqueContractors}
                 />
               ) : (
                 <>
                   {/* Filtros CD y Contratista */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Building2 size={14} className="text-indigo-400" /> Filtrar por CD
                        </p>
                        <select 
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                          value={filterCd}
                          onChange={e => setFilterCd(e.target.value)}
                        >
                          <option value="all">TODOS LOS CENTROS</option>
                          {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                        </select>
                      </div>
                      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <UserCircle size={14} className="text-indigo-400" /> Filtrar por Contratista
                        </p>
                        <select 
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                          value={filterContractor}
                          onChange={e => setFilterContractor(e.target.value)}
                        >
                          <option value="all">TODOS LOS OPERADORES</option>
                          {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                   </div>

                   <CalibrationStats 
                     total={statsCalibrations.total}
                     completed={statsCalibrations.completed}
                     pending={statsCalibrations.pending}
                     searchCount={statsCalibrations.searchCount}
                     month={selectedMonth}
                     onExport={handleExportCalibrationsExcel}
                   />

                   {calibrationViewMode === 'visual' ? (
                     <CalibrationVisuals 
                       calibrations={calibrations}
                       selectedYear={selectedYear}
                       selectedMonth={selectedMonth}
                       selectedCd={filterCd}
                       selectedContractor={filterContractor}
                     />
                   ) : calibrationViewMode === 'list' ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredCalibrations.map(c => (
                          <CalibrationCard 
                            key={c.id} 
                            calibration={c} 
                            onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                            onUpdateEvidence={(cal) => {
                              setUpdatingCalibration(cal);
                              setShowCalibrationForm(true);
                            }}
                          />
                        ))}
                        {filteredCalibrations.length === 0 && (
                          <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                            <Disc size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado calibraciones con los filtros seleccionados</p>
                          </div>
                        )}
                     </div>
                   ) : (
                     <CalibrationCalendar 
                       calibrations={filteredCalibrations}
                       selectedMonth={selectedMonth}
                       selectedYear={selectedYear}
                       onMonthChange={setSelectedMonth}
                       onYearChange={setSelectedYear}
                       onViewDoc={(url, t) => setViewDoc({url, title: t})}
                       onUpdateEvidence={(cal) => {
                         setUpdatingCalibration(cal);
                         setShowCalibrationForm(true);
                       }}
                       searchTerm={searchTerm}
                     />
                   )}
                 </>
               )}
            </div>
          )}

          {activeView === 'visitas' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                      <Store size={32} className="text-indigo-600" /> Visitas a Taller
                    </h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Gestión de trámites semanales (SOAT/RTM/EXT)</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterWorkshop}
                        onChange={e => setFilterWorkshop(e.target.value)}
                      >
                        <option value="all">TODOS LOS TALLERES</option>
                        {uniqueWorkshops.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>

                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                      <button 
                        onClick={() => setWorkshopViewMode('list')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${workshopViewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Lista
                      </button>
                      <button 
                        onClick={() => setWorkshopViewMode('calendar')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${workshopViewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Calendario
                      </button>
                    </div>

                    {workshopViewMode === 'list' && (
                      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                          <CalendarDays size={16} className="text-indigo-600" />
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO DE REVISIÓN</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedWeek}
                              onChange={e => setSelectedWeek(parseInt(e.target.value))}
                            >
                              {Array.from({length: 52}, (_, i) => i + 1).map(w => (
                                <option key={w} value={w}>SEMANA {w}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
               </div>

               {workshopViewMode === 'list' ? (
                 <>
                   <WorkshopStats 
                     total={workshopVisits.filter(v => v.week === String(selectedWeek) && (filterWorkshop === 'all' || v.workshop === filterWorkshop)).length}
                     completed={workshopVisits.filter(v => v.week === String(selectedWeek) && v.status === 'COMPLETADOS' && (filterWorkshop === 'all' || v.workshop === filterWorkshop)).length}
                     pending={workshopVisits.filter(v => v.week === String(selectedWeek) && v.status === 'PENDIENTES' && (filterWorkshop === 'all' || v.workshop === filterWorkshop)).length}
                     label={`SEMANA ${selectedWeek}`}
                   />

                   <div className="space-y-4">
                      {workshopVisits
                        .filter(v => v.week === String(selectedWeek) && (normalizePlate(v.plate).includes(normalizePlate(searchTerm)) || (v.workshop && v.workshop.toUpperCase().includes(searchTerm.toUpperCase()))) && (filterWorkshop === 'all' || v.workshop === filterWorkshop))
                        .map(v => (
                          <WorkshopVisitItem 
                            key={v.id} 
                            visit={v} 
                            onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                            onManageClosure={setClosingWorkshopVisit} 
                          />
                        ))
                      }
                      {workshopVisits.filter(v => v.week === String(selectedWeek)).length === 0 && (
                        <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
                          <Store size={48} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No hay visitas programadas para esta semana</p>
                        </div>
                      )}
                   </div>
                 </>
               ) : (
                 <>
                   <WorkshopStats 
                     total={workshopVisits.filter(v => {
                       const d = new Date(v.date + "T12:00:00");
                       const matchPeriod = d.getFullYear() === selectedYear && d.toLocaleString('es-ES', { month: 'long' }).toUpperCase() === selectedMonth;
                       const matchWorkshop = filterWorkshop === 'all' || v.workshop === filterWorkshop;
                       return matchPeriod && matchWorkshop;
                     }).length}
                     completed={workshopVisits.filter(v => {
                       const d = new Date(v.date + "T12:00:00");
                       const matchPeriod = d.getFullYear() === selectedYear && d.toLocaleString('es-ES', { month: 'long' }).toUpperCase() === selectedMonth;
                       const matchWorkshop = filterWorkshop === 'all' || v.workshop === filterWorkshop;
                       return matchPeriod && matchWorkshop && v.status === 'COMPLETADOS';
                     }).length}
                     pending={workshopVisits.filter(v => {
                       const d = new Date(v.date + "T12:00:00");
                       const matchPeriod = d.getFullYear() === selectedYear && d.toLocaleString('es-ES', { month: 'long' }).toUpperCase() === selectedMonth;
                       const matchWorkshop = filterWorkshop === 'all' || v.workshop === filterWorkshop;
                       return matchPeriod && matchWorkshop && v.status === 'PENDIENTES';
                     }).length}
                     label={`${selectedMonth} ${selectedYear}`}
                   />

                   <WorkshopCalendar 
                     visits={workshopVisits}
                     selectedMonth={selectedMonth}
                     selectedYear={selectedYear}
                     onMonthChange={setSelectedMonth}
                     onYearChange={setSelectedYear}
                     onViewDoc={(url, t) => setViewDoc({url, title: t})}
                     onManageClosure={setClosingWorkshopVisit}
                     searchTerm={searchTerm}
                     filterWorkshop={filterWorkshop}
                   />
                 </>
               )}
            </div>
          )}

          {activeView === 'correctivos' && (
            <div className="max-w-7xl mx-auto pb-20">
              <CorrectivesModule data={correctives} onRefresh={handleSyncData} />
            </div>
          )}

          {activeView === 'indisponibilidad' && (
            <div className="max-w-7xl mx-auto pb-20">
              <UnavailabilityModule data={unavailabilityRecords} onRefresh={handleSyncData} />
            </div>
          )}

          {activeView === 'operadores' && (
            <div className="max-w-7xl mx-auto pb-20">
              <OperatorsModule data={operators} onRefresh={handleSyncData} />
            </div>
          )}

          {activeView === 'comparendos_montacargas' && (
            <div className="max-w-7xl mx-auto pb-20">
              <ForkliftFinesModule data={forkliftFines} onRefresh={handleSyncData} />
            </div>
          )}

          {activeView === 'varadas' && (
            <div className="max-w-7xl mx-auto pb-20">
              <VaradasModule
                vehicles={vehicles}
                varadas={varadas}
                onRefresh={handleSyncData}
                onSubmitVarada={async (data) => {
                  const tempVarada: VaradaRecord = {
                    id: `temp-${Date.now()}`,
                    week: data.week || `S${getWeekNumber(new Date())}`,
                    breakdownDate: data.breakdownDate || new Date().toISOString().replace('T', ' ').substring(0, 16),
                    plate: data.plate || '',
                    location: data.location || '',
                    system: data.system || 'MOTOR',
                    component: data.component || '',
                    description: data.description || '',
                    workshop: data.workshop || '',
                    towed: data.towed || 'NO',
                    solutionDate: data.solutionDate || '',
                    observation: data.observation || '',
                    hoursDown: data.hoursDown || '',
                    evidence: data.evidence || '',
                    status: data.solutionDate ? 'CERRADO' : 'ABIERTO'
                  };

                  // Optimistic update
                  setVaradas(prev => [tempVarada, ...prev]);

                  try {
                    const ok = await submitVaradaToSheet(data);
                    if (ok) {
                      handleSyncData().catch(e => console.error("Sync error after varada:", e));
                      return true;
                    } else {
                      setVaradas(prev => prev.filter(v => v.id !== tempVarada.id));
                      return false;
                    }
                  } catch (err) {
                    setVaradas(prev => prev.filter(v => v.id !== tempVarada.id));
                    throw err;
                  }
                }}
                loading={isSyncing}
              />
            </div>
          )}

          {activeView === 'repuestos' && (
            <div className="max-w-7xl mx-auto pb-20">
              <SparePartsModule
                records={spareParts}
                onRefresh={handleSyncData}
                onSubmitInspection={async (inspection) => {
                  const tempRecords: SparePartRecord[] = inspection.items.map((it, idx) => ({
                    id: `temp-${Date.now()}-${idx}`,
                    fecha: inspection.fecha || new Date().toISOString().split('T')[0],
                    inspector: inspection.inspector || '',
                    proveedor: inspection.proveedor || '',
                    taller: inspection.taller || '',
                    repuesto: it.repuesto || '',
                    cantidad: Number(it.cantidad) || 0,
                    minimo: Number(it.minimo) || 0,
                    und: it.und || 'UND',
                    estado: (Number(it.cantidad) < Number(it.minimo)) ? 'ALERTA' : 'OK',
                    observacion: it.observacion || '',
                    evidencia: inspection.evidencia || ''
                  }));

                  // Optimistic update
                  setSpareParts(prev => [...tempRecords, ...prev]);

                  try {
                    const ok = await submitSparePartInspection(inspection);
                    if (ok) {
                      handleSyncData().catch(e => console.error("Sync error after spare parts inspection:", e));
                      return true;
                    } else {
                      const tempIds = new Set(tempRecords.map(r => r.id));
                      setSpareParts(prev => prev.filter(r => !tempIds.has(r.id)));
                      return false;
                    }
                  } catch (err) {
                    const tempIds = new Set(tempRecords.map(r => r.id));
                    setSpareParts(prev => prev.filter(r => !tempIds.has(r.id)));
                    throw err;
                  }
                }}
                onSubmitRecord={async (data) => {
                  const tempRecord: SparePartRecord = {
                    id: `temp-${Date.now()}`,
                    fecha: data.fecha || new Date().toISOString().split('T')[0],
                    inspector: data.inspector || '',
                    proveedor: data.proveedor || '',
                    taller: data.taller || '',
                    repuesto: data.repuesto || '',
                    cantidad: Number(data.cantidad) || 0,
                    minimo: Number(data.minimo) || 0,
                    und: data.und || 'UND',
                    estado: data.estado || ((Number(data.cantidad) < Number(data.minimo)) ? 'ALERTA' : 'OK'),
                    observacion: data.observacion || ''
                  };

                  // Optimistic update
                  setSpareParts(prev => [tempRecord, ...prev]);

                  try {
                    const ok = await submitSparePartToSheet(data);
                    if (ok) {
                      handleSyncData().catch(e => console.error("Sync error after spare part:", e));
                      return true;
                    } else {
                      setSpareParts(prev => prev.filter(r => r.id !== tempRecord.id));
                      return false;
                    }
                  } catch (err) {
                    setSpareParts(prev => prev.filter(r => r.id !== tempRecord.id));
                    throw err;
                  }
                }}
                loading={isSyncing}
              />
            </div>
          )}
        </div>
          </main>
        </>
      )}

      {/* MODALS & FORMS */}
      {showGlobalSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl relative my-8">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
            <button 
              onClick={() => setShowGlobalSettings(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-6">
              <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                <Settings size={28} className="animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-wider">Ajustes de Google Sheets</h3>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Configuración global del origen de datos</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">URL del Google Apps Script Web App:</label>
                <input
                  type="text"
                  value={globalScriptUrl}
                  onChange={(e) => setGlobalScriptUrlState(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white font-mono outline-none focus:border-indigo-500/50 transition-all"
                />
                <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                  * La URL de tu nueva implementación de Apps Script. Es la dirección donde el frontend enviará las peticiones POST.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">ID de Google Spreadsheet Principal:</label>
                <input
                  type="text"
                  value={globalSpreadsheetId}
                  onChange={(e) => setGlobalSpreadsheetId(e.target.value)}
                  placeholder="ID de la hoja de cálculo de Google..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white font-mono outline-none focus:border-indigo-500/50 transition-all"
                />
                <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                  * Este ID se aplicará automáticamente a todos los módulos (Rutinas, Kilómetros, Lavados, Calibraciones, etc.) para que se guarden en tu propio clon de la hoja de cálculo.
                </p>
              </div>

              {/* Diagnóstico de Conexión */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Diagnóstico de Origen de Datos</h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Prueba si tu Apps Script y tu Spreadsheet están vinculados correctamente</p>
                  </div>
                  <button
                    type="button"
                    disabled={testingConnection}
                    onClick={handleTestConnection}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white rounded-xl font-bold uppercase tracking-wider text-[9px] transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-600/15"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Zap size={12} />
                        Probar Conexión
                      </>
                    )}
                  </button>
                </div>

                {connectionResult && (
                  <div className={`p-4 rounded-xl border text-[11px] font-semibold leading-relaxed ${
                    connectionResult.status === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}>
                    {connectionResult.message}
                  </div>
                )}
              </div>

              {/* Configuración específica por módulo */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuración Específica por Módulo (Opcional):</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">ID para Lavados:</label>
                    <input
                      type="text"
                      value={washSheetIdInput}
                      onChange={(e) => setWashSheetIdInput(e.target.value)}
                      placeholder="Dejar vacío para usar principal..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white font-mono outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">ID para Calibraciones:</label>
                    <input
                      type="text"
                      value={calibrationsSheetIdInput}
                      onChange={(e) => setCalibrationsSheetIdInput(e.target.value)}
                      placeholder="Dejar vacío para usar principal..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white font-mono outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">ID para Limpieza 5S:</label>
                    <input
                      type="text"
                      value={cleaningSheetIdInput}
                      onChange={(e) => setCleaningSheetIdInput(e.target.value)}
                      placeholder="Dejar vacío para usar principal..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white font-mono outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                </div>
                <p className="text-[8px] text-slate-500 font-semibold leading-relaxed">
                  * Si dejas un campo vacío, ese módulo usará el ID de Google Spreadsheet Principal configurado arriba.
                </p>
              </div>

              {/* Instructions checklist */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-3">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={14} /> Instrucciones de Despliegue en Apps Script
                </h4>
                <ul className="text-[11px] text-slate-300 font-semibold space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Crea una copia de la hoja de cálculo de Google y copia su ID de la barra de direcciones.</li>
                  <li>Ve a <strong className="text-white">Extensiones &gt; Apps Script</strong> en la hoja de cálculo.</li>
                  <li>Pega el código unificado de <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">GOOGLE_APPS_SCRIPT.gs</code>.</li>
                  <li>En el script, edita la variable <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">ID_HOJA</code> con tu propio ID.</li>
                  <li>Haz clic en <strong className="text-white">Implementar &gt; Nueva implementación</strong>.</li>
                  <li>Elige tipo <strong className="text-indigo-400">Aplicación web</strong>.</li>
                  <li>Configura Ejecutar como: <strong className="text-white">"Yo" (Tu correo)</strong>.</li>
                  <li>Configura Quién tiene acceso: <strong className="text-emerald-400">"Cualquiera" (Anyone)</strong>.</li>
                  <li>Haz clic en Implementar, concede los permisos correspondientes y copia la URL generada.</li>
                </ul>
              </div>

              {globalSaveFeedback && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <Check size={16} /> {globalSaveFeedback}
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGlobalSettings(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 hover:border-slate-500/50 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveGlobalSettings}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-indigo-600/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                <Lock size={36} className="text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">ACCESO RESTRINGIDO</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Ingrese la clave para continuar</p>

              <div className="w-full space-y-4">
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                  placeholder="••••"
                  autoFocus
                  className={`w-full bg-white/5 border ${passwordError ? 'border-rose-500 animate-shake' : 'border-white/10'} rounded-2xl px-6 py-4 text-center text-3xl font-black tracking-[0.5em] text-white outline-none focus:border-indigo-500/50 transition-all`}
                />
                {passwordError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">Clave incorrecta</p>}
                
                <button 
                  onClick={verifyPassword}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                >
                  VERIFICAR ACCESO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewDoc && <DocumentViewer url={viewDoc.url} title={viewDoc.title} onClose={() => setViewDoc(null)} />}
      {showFineForm && (
        <FineForm 
          vehicles={vehicles} 
          drivers={drivers} 
          onClose={() => setShowFineForm(false)} 
          onSubmit={async (d) => { 
            const formattedFine: Fine = {
              id: d.id || `temp-${Date.now()}`,
              date: d.date || new Date().toISOString().split('T')[0],
              plate: d.plate,
              infractionCode: d.infractionCode || '',
              description: d.description || '',
              amount: Number(d.amount) || 0,
              status: 'PENDIENTE',
              evidenceUrl: d.evidenceUrl || ''
            };
            setShowFineForm(false);
            setFines(prev => [formattedFine, ...prev]);

            try {
              await submitFineToSheet(d); 
              handleSyncData().catch(e => console.error(e));
            } catch (err) {
              setFines(prev => prev.filter(f => f.id !== formattedFine.id));
              alert("No se pudo guardar el comparendo. Intenta de nuevo.");
            }
          }} 
        />
      )}
      {managingFineSupport && (
        <FineSupportForm 
          fine={managingFineSupport} 
          onClose={() => setManagingFineSupport(null)} 
          onSubmit={async (d) => { 
            const previousFines = [...fines];
            setManagingFineSupport(null);
            setFines(prev => prev.map(f => f.id === d.id ? { ...f, ...d, status: d.status || f.status, evidenceUrl: d.evidenceUrl || f.evidenceUrl } : f));

            try {
              await submitFineToSheet(d); 
              handleSyncData().catch(e => console.error(e));
            } catch (err) {
              setFines(previousFines);
              alert("No se pudo actualizar el soporte del comparendo.");
            }
          }} 
        />
      )}
      {showDocUpdateForm && (
        <DocumentUpdateForm 
          vehicles={vehicles} 
          onClose={() => setShowDocUpdateForm(false)} 
          onSubmit={async (d) => { 
            const previousVehicles = [...vehicles];
            setShowDocUpdateForm(false);
            setVehicles(prevVehicles => prevVehicles.map(v => {
              if (v.plate.toUpperCase().trim() === d.plate.toUpperCase().trim()) {
                const updatedDoc = {
                  expiryDate: d.expiryDate,
                  status: 'active' as const,
                  url: d.url,
                  lastRenewalDate: d.expiryDate
                };
                if (d.docType.toLowerCase().includes('soat')) {
                  return { ...v, soat: updatedDoc };
                } else if (d.docType.toLowerCase().includes('rtm')) {
                  return { ...v, rtm: updatedDoc };
                } else if (d.docType.toLowerCase().includes('extintor')) {
                  return { ...v, extinguisher: updatedDoc };
                }
              }
              return v;
            }));

            try {
              await submitDocumentUpdateToSheet(d); 
              handleSyncData().catch(e => console.error(e));
            } catch (err) {
              setVehicles(previousVehicles);
              alert("No se pudo actualizar el documento. Intenta de nuevo.");
            }
          }} 
        />
      )}
      {showReportForm && (
        <NoveltyReportForm 
          vehicles={vehicles} 
          onClose={() => setShowReportForm(false)} 
          onSuccess={() => {
            handleSyncData().catch(e => console.error(e));
          }} 
        />
      )}
      {showWashForm && (
        <WashForm 
          vehicles={vehicles} 
          initialPlate={washPreselectedPlate || undefined}
          onClose={() => {
            setShowWashForm(false);
            setWashPreselectedPlate(null);
          }} 
          onSubmit={async (d) => { 
            const newWash: WashReport = {
              id: d.id || `temp-${Date.now()}`,
              month: d.month || new Date().toLocaleString('es-CO', { month: 'long' }).toUpperCase(),
              week: d.week || '1',
              date: d.date || new Date().toISOString().split('T')[0],
              plate: d.plate,
              evidenceUrl: d.evidenceUrl || '',
              workshop: d.workshop || '',
              mapUrl: d.mapUrl || ''
            };
            setShowWashForm(false);
            setWashPreselectedPlate(null);
            localWashSubmissionsRef.current = [newWash, ...localWashSubmissionsRef.current];
            setWashReports(prev => [newWash, ...prev]);

            try {
              await submitWashToSheet(d); 
              handleSyncData().catch(e => console.error(e));
            } catch (err) {
              setWashReports(prev => prev.filter(w => w.id !== newWash.id));
              localWashSubmissionsRef.current = localWashSubmissionsRef.current.filter(w => w.id !== newWash.id);
              alert("No se pudo guardar el lavado. Intenta de nuevo.");
            }
          }} 
        />
      )}
      {showCleaningForm && (
        <CleaningForm 
          vehicles={vehicles} 
          onClose={() => setShowCleaningForm(false)} 
          onSubmit={async (d) => { 
            const newCleaning: WashReport = {
              id: d.id || `temp-${Date.now()}`,
              month: d.month || new Date().toLocaleString('es-CO', { month: 'long' }).toUpperCase(),
              week: d.week || '1',
              date: d.date || new Date().toISOString().split('T')[0],
              plate: d.plate,
              evidenceUrl: d.evidenceUrl || '',
              workshop: d.workshop || '',
              mapUrl: d.mapUrl || '',
              status: 'ABIERTO'
            };
            setShowCleaningForm(false);
            setCleaningReports(prev => [newCleaning, ...prev]);

            try {
              await submitCleaningToSheet(d); 
              handleSyncData().catch(e => console.error(e));
            } catch (err) {
              setCleaningReports(prev => prev.filter(c => c.id !== newCleaning.id));
              alert("No se pudo guardar la limpieza. Intenta de nuevo.");
            }
          }} 
        />
      )}
      {closingCleaning && (
        <CleaningForm 
          vehicles={vehicles} 
          preSelectedPlate={closingCleaning.plate} 
          initialDate={closingCleaning.date} 
          onClose={() => setClosingCleaning(null)} 
          onSubmit={async (d) => { 
            const previousCleanings = [...cleaningReports];
            setClosingCleaning(null);
            setCleaningReports(prev => prev.map(c => c.id === d.id ? { ...c, ...d, status: 'CERRADO' } : c));

            try {
              await submitCleaningToSheet(d); 
              handleSyncData().catch(e => console.error(e));
            } catch (err) {
              setCleaningReports(previousCleanings);
              alert("No se pudo cerrar la limpieza.");
            }
          }} 
        />
      )}
      {showCalibrationForm && (
        <CalibrationForm 
          vehicles={vehicles} 
          calibrationToUpdate={updatingCalibration || undefined}
          preSelectedPlate={calibrationPreselectedPlate}
          onClose={() => {
            setShowCalibrationForm(false);
            setUpdatingCalibration(null);
            setCalibrationPreselectedPlate('');
          }} 
          onSubmit={async (d: any) => { 
            setShowCalibrationForm(false);
            setUpdatingCalibration(null);
            setCalibrationPreselectedPlate('');

            if (d.isUpdate) {
              const previousCalibrations = [...calibrations];
              const updatedItem = {
                ...d,
                pressures: {
                  p1i: d.p1i, p1f: d.p1f,
                  p2i: d.p2i, p2f: d.p2f,
                  p3i: d.p3i, p3f: d.p3f,
                  p4i: d.p4i, p4f: d.p4f,
                  p5i: d.p5i, p5f: d.p5f,
                  p6i: d.p6i, p6f: d.p6f,
                  p1_inicial: d.p1i, p1_final: d.p1f,
                  p2_inicial: d.p2i, p2_final: d.p2f,
                  p3_inicial: d.p3i, p3_final: d.p3f,
                  p4_inicial: d.p4i, p4_final: d.p4f,
                  p5_inicial: d.p5i, p5_final: d.p5f,
                  p6_inicial: d.p6i, p6_final: d.p6f
                }
              };
              localCalibrationUpdatesRef.current[d.id] = updatedItem;
              setCalibrations(prev => prev.map(c => c.id === d.id ? { ...c, ...updatedItem } : c));

              try {
                await submitCalibrationUpdateToSheet(d);
                handleSyncData().catch(e => console.error(e));
              } catch (err) {
                setCalibrations(previousCalibrations);
                alert("No se pudo actualizar la calibración.");
              }
            } else {
              const calDate = d.calibrationDate || d.date || new Date().toISOString().split('T')[0];
              const expDateObj = new Date(calDate + 'T12:00:00');
              expDateObj.setFullYear(expDateObj.getFullYear() + 1);
              const expDateStr = expDateObj.toISOString().split('T')[0];

              const newCal: Calibration = {
                id: d.id || `temp-${Date.now()}`,
                calibrationDate: calDate,
                plate: d.plate,
                equipment: d.taller || d.equipment || d.type || 'AUTOMUNDIAL',
                status: 'active',
                expiryDate: d.expiryDate || expDateStr,
                certificateUrl: d.certificateUrl || '',
                cd: d.cd || 'GENERAL',
                contractor: d.contractor || 'GENERAL',
                month: d.month || expDateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase(),
                week: d.week || '',
                estado: d.estado || 'COMPLETADO',
                pressures: {
                  p1i: d.p1i, p1f: d.p1f,
                  p2i: d.p2i, p2f: d.p2f,
                  p3i: d.p3i, p3f: d.p3f,
                  p4i: d.p4i, p4f: d.p4f,
                  p5i: d.p5i, p5f: d.p5f,
                  p6i: d.p6i, p6f: d.p6f,
                  p1_inicial: d.p1i, p1_final: d.p1f,
                  p2_inicial: d.p2i, p2_final: d.p2f,
                  p3_inicial: d.p3i, p3_final: d.p3f,
                  p4_inicial: d.p4i, p4_final: d.p4f,
                  p5_inicial: d.p5i, p5_final: d.p5f,
                  p6_inicial: d.p6i, p6_final: d.p6f
                }
              };
              localCalibrationSubmissionsRef.current = [newCal, ...localCalibrationSubmissionsRef.current];
              setCalibrations(prev => [newCal, ...prev]);

              try {
                await submitCalibrationToSheet(d);
                handleSyncData().catch(e => console.error(e));
              } catch (err) {
                setCalibrations(prev => prev.filter(c => c.id !== newCal.id));
                localCalibrationSubmissionsRef.current = localCalibrationSubmissionsRef.current.filter(c => c.id !== newCal.id);
                alert("No se pudo guardar la calibración.");
              }
            }
          }} 
        />
      )}
      {closingReport && (
        <ClosureForm 
          report={closingReport} 
          onClose={() => setClosingReport(null)} 
          onSubmit={async (id, d) => { 
            const previousReports = [...reports];
            const selectedVehicle = vehicles.find(v => v.plate === closingReport.plate);
            const finalReport = {
              ...closingReport, 
              ...d,
              cd: selectedVehicle?.cd || closingReport.cd || 'GENERAL',
              contractor: selectedVehicle?.contractor || closingReport.contractor || 'GENERAL'
            } as any;

            setClosingReport(null);
            setReports(prev => prev.map(r => r.id === closingReport.id ? { ...r, ...finalReport, status: 'COMPLETADOS' } : r));

            try {
              await submitReportToSheet(finalReport); 
              handleSyncData().catch(e => console.error(e));
            } catch (err) {
              setReports(previousReports);
              alert("No se pudo cerrar el reporte.");
            }
          }} 
        />
      )}
      {registeringEntry && (
        <WorkshopEntryForm 
          report={registeringEntry} 
          onClose={() => setRegisteringEntry(null)} 
          onSubmit={async (d) => { 
            const previousReports = [...reports];
            const selectedVehicle = vehicles.find(v => v.plate === registeringEntry.plate);
            const finalReport = {
              ...registeringEntry, 
              ...d,
              cd: selectedVehicle?.cd || registeringEntry.cd || 'GENERAL',
              contractor: selectedVehicle?.contractor || registeringEntry.contractor || 'GENERAL'
            } as any;

            setRegisteringEntry(null);
            setReports(prev => prev.map(r => r.id === registeringEntry.id ? { ...r, ...finalReport } : r));

            try {
              await submitReportToSheet(finalReport); 
              handleSyncData().catch(e => console.error(e));
            } catch (err) {
              setReports(previousReports);
              alert("No se pudo registrar el ingreso a taller.");
            }
          }} 
        />
      )}
      {closingWorkshopVisit && (
        <WorkshopVisitClosureForm 
          visit={closingWorkshopVisit} 
          onClose={() => setClosingWorkshopVisit(null)} 
          onSubmit={async (d) => { 
            const previousVisits = [...workshopVisits];
            setClosingWorkshopVisit(null);
            setWorkshopVisits(prev => prev.map(v => v.id === closingWorkshopVisit.id ? { ...v, status: 'COMPLETADOS', closureDate: d.closureDate, solutionEvidence: d.solutionEvidence } : v));

            try {
              const res = await submitWorkshopVisitUpdateToSheet(d); 
              if (res.success) {
                handleSyncData().catch(e => console.error(e));
              } else {
                setWorkshopVisits(previousVisits);
                alert("Error al guardar evidencias: " + (res.message || "No se encontró el registro en la hoja"));
              }
            } catch (err) {
              setWorkshopVisits(previousVisits);
              alert("Error al guardar evidencias en Google Sheets.");
            }
          }} 
        />
      )}
    </div>
  );
};

export default App;
