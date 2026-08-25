import Papa from 'papaparse';
import { Vehicle, Driver, Report, MileageLog, Calibration, CalibrationSemaforo, TirePressures, WashReport, Fine, ForkliftFine, Preventive, AvailabilityRecord, AvailabilitySummary, FleetComposition, OperationalIndicator, WorkshopRecord, CheckList, FuelPerformance, PlateAdherence, Corrective, UnavailabilityRecord, OperatorRecord, ControlTowerRecord, AuditRecord, AuditMasterVehicle, FleetListRecord, FleetStandardAudit, WorkshopActivityRecord, FleetCierreRecord, FleetSeguimientoRecord, VaradaRecord, SparePartRecord } from '../types';
import { calculateStatus, normalizePlate, normalizeStr, getDaysDiff } from '../utils';

export const DEFAULT_WORKING_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybbhQJ2o9Xs1fHtqbfG_zopNhCF39tTwwJX6lYGRzTAKoaY4euN2aAjPk4LKObyb-3nw/exec';

// Script específico para Rutinas y Mantenimiento Preventivo
export const ROUTINES_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybbhQJ2o9Xs1fHtqbfG_zopNhCF39tTwwJX6lYGRzTAKoaY4euN2aAjPk4LKObyb-3nw/exec';
export const PREVENTIVES_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybbhQJ2o9Xs1fHtqbfG_zopNhCF39tTwwJX6lYGRzTAKoaY4euN2aAjPk4LKObyb-3nw/exec';

// Script específico para Módulos Operativos (Kilometraje, Calibraciones, Visitas a Taller, Cronograma 5S, Lavados, Varadas, Repuestos)
export const OPERATIONAL_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxztSeQFSRD3Ae794Aiqs-MvXsYB5Ylfcu4ny4EJtpZqV0rB7lJBrfjnL7gfD2uWGnW/exec';
export const VARADAS_SCRIPT_URL = OPERATIONAL_SCRIPT_URL;
export const SPARE_PARTS_SCRIPT_URL = OPERATIONAL_SCRIPT_URL;
export const MILEAGE_SCRIPT_URL = OPERATIONAL_SCRIPT_URL;
export const CALIBRATIONS_SCRIPT_URL = OPERATIONAL_SCRIPT_URL;
export const WORKSHOP_SCRIPT_URL = OPERATIONAL_SCRIPT_URL;
export const CLEANING_5S_SCRIPT_URL = OPERATIONAL_SCRIPT_URL;
export const WASH_SCRIPT_URL = OPERATIONAL_SCRIPT_URL;

export const sanitizeScriptUrl = (url: string): string => {
  if (!url) return '';
  let cleaned = url.trim();
  // Convierte URLs de dominio interno /a/macros/domain/s/ al formato estándar de acceso público /macros/s/
  cleaned = cleaned.replace(/\/a\/macros\/[^\/]+\//, '/macros/');
  if (cleaned.includes('script.google.com/s/')) {
    cleaned = cleaned.replace('script.google.com/s/', 'script.google.com/macros/s/');
  }
  return cleaned;
};

export const getGoogleScriptUrl = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('GOOGLE_SCRIPT_WEB_APP_URL');
    if (stored) {
      const sanitized = sanitizeScriptUrl(stored);
      if (sanitized && sanitized !== 'undefined' && sanitized !== 'null' && sanitized.startsWith('http')) {
        // Si la URL guardada es una anterior desactualizada o con error, migramos automáticamente
        if (!sanitized.includes('AKfycbybbhQJ2o9Xs1fHtqbfG_zopNhCF39tTwwJX6lYGRzTAKoaY4euN2aAjPk4LKObyb-3nw')) {
          localStorage.setItem('GOOGLE_SCRIPT_WEB_APP_URL', DEFAULT_WORKING_SCRIPT_URL);
          return DEFAULT_WORKING_SCRIPT_URL;
        }
        return sanitized;
      }
    }
  }
  return DEFAULT_WORKING_SCRIPT_URL;
};

export const setGoogleScriptUrl = (url: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const sanitized = sanitizeScriptUrl(url.trim());
    localStorage.setItem('GOOGLE_SCRIPT_WEB_APP_URL', sanitized || DEFAULT_WORKING_SCRIPT_URL);
  }
};

const getFinesScriptUrl = (): string => getGoogleScriptUrl();
const getDailyProgramScriptUrl = (): string => getGoogleScriptUrl();

export const getWorkshopScriptUrl = (): string => {
  return localStorage.getItem('GOOGLE_SCRIPT_WORKSHOP_URL') || WORKSHOP_SCRIPT_URL;
};

export const setWorkshopScriptUrl = (url: string): void => {
  localStorage.setItem('GOOGLE_SCRIPT_WORKSHOP_URL', url.trim());
};

export const cleanSpreadsheetId = (idOrUrl: string): string => {
  if (!idOrUrl) return '';
  let id = idOrUrl.trim();
  
  // 1. If it has /spreadsheets/d/ID
  const dMatch = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (dMatch && dMatch[1]) {
    id = dMatch[1];
  } else {
    // 2. If it is ID/edit...
    const editMatch = id.match(/^([a-zA-Z0-9-_]+)\/edit/);
    if (editMatch && editMatch[1]) {
      id = editMatch[1];
    } else {
      // 3. Just clean up any query params, hash fragments, or trailing slashes
      id = id.split('?')[0].split('#')[0];
      if (id.endsWith('/')) {
        id = id.slice(0, -1);
      }
      
      // 4. If it still contains a slash, try to get the longest alphanumeric part or the last part
      if (id.includes('/')) {
        const parts = id.split('/');
        const longPart = parts.find(p => p.length >= 25 && /^[a-zA-Z0-9-_]+$/.test(p));
        if (longPart) {
          id = longPart;
        } else {
          id = parts[parts.length - 1];
        }
      }
    }
  }
  
  const legacyIds = [
    '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U',
    '1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo',
    '1WnzEFfVMTHZVVKWGTMLU2WjY-GIzSRpWz52i_Es0E1M',
    '1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0'
  ];

  if (legacyIds.includes(id)) {
    const keys = [
      'GOOGLE_SPREADSHEET_WASH_ID',
      'GOOGLE_SPREADSHEET_CALIBRATIONS_ID',
      'GOOGLE_SPREADSHEET_CLEANING_ID',
      'GOOGLE_SPREADSHEET_MILEAGE_ID',
      'GOOGLE_SPREADSHEET_PREVENTIVES_ID',
      'GOOGLE_SPREADSHEET_MASTER_ID',
      'GOOGLE_SPREADSHEET_CORRECTIVES_ID',
      'GOOGLE_SPREADSHEET_FINES_ID',
      'GOOGLE_SPREADSHEET_CONTROL_TOWER_ID',
      'GOOGLE_SPREADSHEET_AUDIT_ID',
      'GOOGLE_SPREADSHEET_AUDIT_QS_ID'
    ];
    keys.forEach(k => {
      try {
        localStorage.setItem(k, '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU');
      } catch (e) {}
    });
    return '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
  }
  
  return id;
};

export const ROUTINES_DEFAULT_DOC_ID = '1IKgWuUo5r0ofd8T95bJbstDn7FXigWLJGbr_mWoaFzE';

export const getRoutinesDocId = (): string => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('GOOGLE_SPREADSHEET_ROUTINES_ID') : null;
  return cleanSpreadsheetId(stored || ROUTINES_DEFAULT_DOC_ID);
};

export const getMasterDocId = (): string => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('GOOGLE_SPREADSHEET_MASTER_ID') : null;
  return cleanSpreadsheetId(stored || getRoutinesDocId());
};

export const getCorrectivesDocId = (): string => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('GOOGLE_SPREADSHEET_CORRECTIVES_ID') : null;
  return cleanSpreadsheetId(stored || getRoutinesDocId());
};

export const getFinesSheetId = (): string => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('GOOGLE_SPREADSHEET_FINES_ID') : null;
  return cleanSpreadsheetId(stored || getRoutinesDocId());
};

export const getControlTowerDocId = (): string => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('GOOGLE_SPREADSHEET_CONTROL_TOWER_ID') : null;
  const clean = cleanSpreadsheetId(stored || '');
  if (!clean || clean === '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU') {
    return CONTROL_TOWER_DOC_ID;
  }
  return clean;
};

export const getAuditDocId = (): string => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('GOOGLE_SPREADSHEET_AUDIT_ID') : null;
  const clean = cleanSpreadsheetId(stored || '');
  if (!clean || clean === '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU') {
    return AUDIT_DOC_ID;
  }
  return clean;
};

export const getAuditQsDocId = (): string => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('GOOGLE_SPREADSHEET_AUDIT_QS_ID') : null;
  const clean = cleanSpreadsheetId(stored || '');
  if (!clean || clean === '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU' || clean === '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs') {
    return '1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM';
  }
  return clean;
};

export const getCampaignsDocId = (): string => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('GOOGLE_SPREADSHEET_CAMPAIGNS_ID') : null;
  return cleanSpreadsheetId(stored || getRoutinesDocId());
};

export const getVaradasDocId = (): string => {
  // VARADAS es independiente: apunta directo a su propio documento.
  // No depende de getRoutinesDocId ni de la configuración de RUTINAS.
  return '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
};

// HOJA MAESTRA (Donde se encuentran los Vehículos y Conductores)
const REAL_MASTER_ID = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
const BASE_URL_MASTER = `https://docs.google.com/spreadsheets/d/${REAL_MASTER_ID}/export?format=csv`;

// HOJA OPERATIVA / BACKEND
const BACKEND_DOC_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const BASE_URL_BACKEND = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/export?format=csv`;

const CORRECTIVES_DOC_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const BASE_URL_CORRECTIVES = `https://docs.google.com/spreadsheets/d/${CORRECTIVES_DOC_ID}/export?format=csv`;

// ID de la hoja de Comparendos
const FINES_SHEET_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const BASE_URL_FINES = `https://docs.google.com/spreadsheets/d/${FINES_SHEET_ID}/export?format=csv`;

const OPERATORS_DOC_ID = '1qLEXUCt1RAr28lwOX2sCJhjoEoG4vKVOrv2d45iZ6kU';

// GIDs for fallbacks
const VEHICLES_GID = '1506825194';
const DRIVERS_GID = '1834987510';
const NOVEDADES_GID = '1789987673';
const VISITAS_GID = '239875479';
const MILEAGE_GID = '1929496440';
const CALIBRATIONS_GID = '505557891';
const CLEANING_GID = '1853969081';
const DISPONIBILIDAD_GID = '1143899477'; // Aproximate, check later if needed

// ID de la hoja de Check List
const CHECKLIST_DOC_ID = '1i6qGjwhQW3AeR1ja5UxZkOXjJU3oh0f_8Grt131NQzk';
const CHECKLIST_GALAPA_DOC_ID = '14kak0CqSnX9oOXk0GKD0G_QIt5aJxuCu9-_Livst70Y';

// TORRE DE CONTROL
const CONTROL_TOWER_DOC_ID = '1LdneoDkFwIdYf-7Xii94an5hzwuL2BqQlKqK2DQ3G60';
const CONTROL_TOWER_GID = '1012312873';

const AUDIT_DOC_ID = '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs';
const FLEET_AVAILABILITY_DOC_ID = '1NTOAqE9fD5qepaAqQ1s_AbvilYHaQGl7f9fIPW_mq8E';
const AUDIT_QS_DOC_ID = '1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM';

const getCacheBuster = () => `&t=${new Date().getTime()}`;

const fetchDataFromGAS = async (docId: string, sheetName?: string, scriptUrl: string = getGoogleScriptUrl()): Promise<any[][] | null> => {
  const tryFetch = async (targetUrl: string) => {
    try {
      const sanitizedUrl = sanitizeScriptUrl(targetUrl);
      let url = `${sanitizedUrl}?method=GET_DATA&docId=${docId}`;
      if (sheetName) url += `&sheetName=${encodeURIComponent(sheetName)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); 

      const response = await fetch(url, { 
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (!response.ok) return null;

      const text = await response.text();
      if (text.includes("<!DOCTYPE html") || text.includes("Page Not Found") || text.includes("unable to open")) {
        return null;
      }

      const json = JSON.parse(text);
      if (json.status === 'success' && json.message) return json.message as any[][];
      return null;
    } catch {
      return null;
    }
  };

  let res = await tryFetch(scriptUrl);
  if (!res && sanitizeScriptUrl(scriptUrl) !== DEFAULT_WORKING_SCRIPT_URL) {
    console.warn(`GAS fetch falló con URL personalizada para ${sheetName}. Reintentando con URL principal activa...`);
    res = await tryFetch(DEFAULT_WORKING_SCRIPT_URL);
  }
  return res;
};

const cleanSheetValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  // Eliminar espacios en blanco y caracteres invisibles/especiales
  return String(val).trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
};

const parseFlexibleDate = (dateStr: any): string => {
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  const cleanStr = cleanSheetValue(dateStr);
  if (!cleanStr || cleanStr.toLowerCase().includes('fecha')) return '';

  if (/^\d+$/.test(cleanStr)) {
    const serial = parseInt(cleanStr);
    if (serial > 30000 && serial < 60000) {
      const dateObj = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(dateObj.getTime())) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }
  
  try {
    // Si ya viene en formato YYYY-MM-DD, lo devolvemos tal cual para evitar desfases de zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr;
    }

    const parts = cleanStr.split(/[\/\-]/);
    if (parts.length === 3) {
      let day, month, year;
      if (parts[0].length === 4) { 
        year = parseInt(parts[0]); month = parseInt(parts[1]) - 1; day = parseInt(parts[2]);
      } else { 
        day = parseInt(parts[0]); month = parseInt(parts[1]) - 1; year = parseInt(parts[2]);
      }
      const d2 = new Date(year, month, day);
      if (!isNaN(d2.getTime())) {
        const y = d2.getFullYear();
        const m = String(d2.getMonth() + 1).padStart(2, '0');
        const d = String(d2.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
      // Si el string no tiene hora, Date(string) asume UTC. 
      // Para evitar que d.getDate() devuelva el día anterior, usamos los métodos UTC si el string parece ISO
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return '';
  } catch { return ''; }
};

const getWeekNumber = (d: Date): number => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

/**
 * VEHÍCULOS (Hoja ALERTA_CAMIONES - GID 1506825194)
 */
export const fetchVehiclesFromSheet = async (): Promise<Vehicle[]> => {
  try {
    const docId = getMasterDocId();
    let rows = await fetchDataFromGAS(docId, 'ALERTA_CAMIONES');
    
    let isIncorrectSheet = false;
    if (rows && rows.length > 0) {
      const firstRowStr = rows[0].map((c: any) => String(c).toUpperCase()).join(',');
      if (firstRowStr.includes('KILOMETRAJE') || firstRowStr.includes('SEMANA')) {
        isIncorrectSheet = true;
      }
    }

    if (!rows || rows.length === 0 || isIncorrectSheet) {
      if (isIncorrectSheet && docId !== REAL_MASTER_ID) {
        console.warn("GAS fetch vehicles got incorrect sheet (kilometrajes) from configured doc, falling back to REAL_MASTER_ID");
        rows = await fetchDataFromGAS(REAL_MASTER_ID, 'ALERTA_CAMIONES');
      } else {
        console.warn("GAS fetch vehicles failed, attempting CSV fallback");
        const csvRes = await fetchVehiclesFromSheetCSV(docId);
        if ((csvRes.length === 0 || csvRes.length > 500) && docId !== REAL_MASTER_ID) {
          console.warn("CSV fetch vehicles failed or was incorrect, falling back to REAL_MASTER_ID CSV");
          return fetchVehiclesFromSheetCSV(REAL_MASTER_ID);
        }
        return csvRes;
      }
    }
    
    if (rows && rows.length > 0) {
      const firstRowStr = rows[0].map((c: any) => String(c).toUpperCase()).join(',');
      if (firstRowStr.includes('KILOMETRAJE') || firstRowStr.includes('SEMANA')) {
        console.warn("GAS fetch vehicles got incorrect sheet again. Trying REAL_MASTER_ID CSV fallback.");
        return fetchVehiclesFromSheetCSV(REAL_MASTER_ID);
      }
    }

    if (!rows || rows.length === 0) {
      return fetchVehiclesFromSheetCSV(REAL_MASTER_ID);
    }

    return processVehicleRows(rows);
  } catch (e) { 
    return fetchVehiclesFromSheetCSV(REAL_MASTER_ID); 
  }
};

const fetchVehiclesFromSheetCSV = async (docId: string = getMasterDocId()): Promise<Vehicle[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=${VEHICLES_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (rows && rows.length > 0) {
            const firstRowStr = rows[0].map((c: any) => String(c).toUpperCase()).join(',');
            if (firstRowStr.includes('KILOMETRAJE') || firstRowStr.includes('SEMANA')) {
              console.warn("fetchVehiclesFromSheetCSV: detected incorrect sheet. Rejecting.");
              resolve([]);
              return;
            }
          }
          resolve(processVehicleRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processVehicleRows = (rows: any[][]): Vehicle[] => {
  const vehicles: Vehicle[] = [];
  let lastCd = 'GENERAL';
  let lastCnt = 'GENERAL';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const currentCd = cleanSheetValue(row[0]).toUpperCase();
    const currentCnt = cleanSheetValue(row[1]).toUpperCase();
    if (currentCd && !currentCd.includes('CENTRO') && !currentCd.includes('CD')) lastCd = currentCd;
    if (currentCnt && !currentCnt.includes('CONTRATISTA') && !currentCnt.includes('OPERADOR')) lastCnt = currentCnt;

    const rawPlate = cleanSheetValue(row[2]);
    const plate = normalizePlate(rawPlate);

    if (plate && !plate.includes("PLACA") && plate.length >= 2) {
      const soatDate = parseFlexibleDate(row[3]);
      const rtmDate = parseFlexibleDate(row[5]);
      const plcDate = parseFlexibleDate(row[7]);
      const extDate = parseFlexibleDate(row[9]);
      
      vehicles.push({
        id: `v-${plate}-${i}`, 
        cd: lastCd,
        contractor: lastCnt,
        brand: "Vehículo", 
        plate, 
        model: "Unidad",
        soat: { 
          expiryDate: soatDate, 
          lastRenewalDate: '', 
          status: calculateStatus(soatDate), 
          daysPending: getDaysDiff(soatDate), 
          url: cleanSheetValue(row[20])
        },
        rtm: { 
          expiryDate: rtmDate, 
          lastRenewalDate: '', 
          status: calculateStatus(rtmDate),
          daysPending: getDaysDiff(rtmDate),
          url: cleanSheetValue(row[21])
        },
        plc: {
          expiryDate: plcDate,
          lastRenewalDate: '',
          status: calculateStatus(plcDate),
          daysPending: getDaysDiff(plcDate),
          url: cleanSheetValue(row[22])
        },
        extinguisher: {
          expiryDate: extDate,
          lastRenewalDate: '',
          status: calculateStatus(extDate),
          daysPending: getDaysDiff(extDate)
        },
        propertyCardUrl: cleanSheetValue(row[19]),
        lastUpdate: new Date().toISOString()
      });
    }
  }
  return vehicles;
};

/**
 * VISITAS A TALLER (GID 239875479 - Hoja Operativa)
 */
export const fetchWorkshopVisitsFromSheet = async (): Promise<Report[]> => {
  try {
    // Intentar primero con GAS
    const docId = getRoutinesDocId();
    const rows = await fetchDataFromGAS(docId, 'VISITAS A TALLER', WORKSHOP_SCRIPT_URL);
    if (rows && rows.length >= 2) {
      return processWorkshopVisitRows(rows);
    }
  } catch (e) { 
    // Fallback silencioso
  }
  return fetchWorkshopVisitsFromSheetCSV();
};

const fetchWorkshopVisitsFromSheetCSV = async (): Promise<Report[]> => {
  try {
    const docId = getRoutinesDocId();
    const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${VISITAS_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processWorkshopVisitRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processWorkshopVisitRows = (rows: any[][]): Report[] => {
  return rows.slice(1)
    .filter(row => row && row[2]) 
    .map((row, i): Report => {
      const week = cleanSheetValue(row[0]);
      const dateProg = parseFlexibleDate(row[1]);
      const identifier = cleanSheetValue(row[2]);
      const workshop = cleanSheetValue(row[3]);
      const dateVis = parseFlexibleDate(row[4]);
      const evidence = cleanSheetValue(row[5]);
      const statusRaw = cleanSheetValue(row[6]).toUpperCase();
      const hashId = cleanSheetValue(row[7]); 
      const driverName = cleanSheetValue(row[8]);
      
      // Solo es CERRADO si el estado es CERRADO o COMPLETADOS
      const isClosed = statusRaw.includes('CERRADO') || statusRaw.includes('COMPLETADOS');
      
      return {
        id: hashId || `vprog-${i}`,
        week: week,
        date: dateProg,
        plate: normalizePlate(identifier),
        workshop: workshop,
        closureDate: dateVis,
        status: isClosed ? 'COMPLETADOS' : 'PENDIENTES',
        novelty: 'VISITA TÉCNICA PROGRAMADA',
        source: 'CALENDARIO',
        initialEvidence: evidence,
        cd: 'GENERAL',
        driverName: driverName
      } as any;
    });
};

/**
 * KILOMETRAJE (GID 1929496440)
 */
export const fetchMileageLogsFromSheet = async (): Promise<MileageLog[]> => {
  try {
    const docId = getMileageDocId();
    let rows = await fetchDataFromGAS(docId, 'KILOMETRAJE', MILEAGE_SCRIPT_URL);
    if (!rows || rows.length < 2) {
      rows = await fetchDataFromGAS(docId, 'KILOMETRAJES', MILEAGE_SCRIPT_URL);
    }
    if (!rows || rows.length < 2) {
      return fetchMileageLogsFromSheetCSV();
    }
    return processMileageRows(rows);
  } catch (e) { 
    return fetchMileageLogsFromSheetCSV(); 
  }
};

const fetchMileageLogsFromSheetCSV = async (): Promise<MileageLog[]> => {
  try {
    const docId = getMileageDocId();
    let url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=KILOMETRAJE${getCacheBuster()}`;
    let response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    let csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html") || csvText.includes("RESOURCE_NOT_FOUND") || csvText.includes("#REF!") || csvText.includes("error")) {
      url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=KILOMETRAJES${getCacheBuster()}`;
      response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      csvText = await response.text();
    }
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processMileageRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processMileageRows = (rows: any[][]): MileageLog[] => {
  if (!rows || rows.length < 2) return [];
  const headers = (rows[0] || []).map(h => (h || '').toString().toUpperCase().trim());
  let cdIdx = headers.findIndex(h => h === 'CD' || h.includes('CENTRO'));
  let contractorIdx = headers.findIndex(h => h.includes('CONTRATISTA'));
  let weekIdx = headers.findIndex(h => h.includes('SEMANA'));
  let dateIdx = headers.findIndex(h => h.includes('FECHA'));
  let plateIdx = headers.findIndex(h => h.includes('PLACA') || h.includes('VEHICULO'));
  let mileageIdx = headers.findIndex(h => h.includes('KILOMETRAJE') || h === 'KM');

  if (cdIdx === -1) cdIdx = 0;
  if (contractorIdx === -1) contractorIdx = 1;
  if (weekIdx === -1) weekIdx = 2;
  if (dateIdx === -1) dateIdx = 3;
  if (plateIdx === -1) plateIdx = 4;
  if (mileageIdx === -1) mileageIdx = 5;

  return rows.slice(1).filter(row => row && row[plateIdx]).map((row): MileageLog => ({
    cd: cleanSheetValue(row[cdIdx]),          
    contractor: cleanSheetValue(row[contractorIdx]),  
    week: cleanSheetValue(row[weekIdx]),        
    date: parseFlexibleDate(row[dateIdx]),      
    plate: normalizePlate(cleanSheetValue(row[plateIdx])), 
    mileage: parseInt(cleanSheetValue(row[mileageIdx]).replace(/[^0-9]/g, '')) || 0 
  }));
};

/**
 * CALIBRACIONES (GID 505557891)
 */
export const fetchCalibrationsFromSheet = async (): Promise<Calibration[]> => {
  try {
    const vehicles = await fetchVehiclesFromSheet();
    const docId = getCalibrationsDocId();
    const rows = await fetchDataFromGAS(docId, 'CALIBRACIONES', CALIBRATIONS_SCRIPT_URL);
    if (!rows || rows.length < 2) {
      return fetchCalibrationsFromSheetCSV(vehicles);
    }
    return processCalibrationRows(rows, vehicles);
  } catch (e) { 
    return fetchCalibrationsFromSheetCSV(); 
  }
};

const fetchCalibrationsFromSheetCSV = async (vehicles: Vehicle[] = []): Promise<Calibration[]> => {
  try {
    const docId = getCalibrationsDocId();
    const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&sheet=CALIBRACIONES${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processCalibrationRows(rows, vehicles));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processCalibrationRows = (rows: any[][], vehicles: Vehicle[] = []): Calibration[] => {
  const fleetMap = new Map<string, { cd: string, contractor: string }>();
  vehicles.forEach(v => {
    if (v.plate) {
      fleetMap.set(normalizePlate(v.plate), { cd: v.cd, contractor: v.contractor });
    }
  });

  return rows.slice(1).filter(row => row && row[3]).map((row, index): Calibration => {
    const calDateStr = parseFlexibleDate(row[1]);
    const expDate = calDateStr ? new Date(calDateStr + 'T12:00:00') : null;
    const year = expDate ? expDate.getFullYear() : undefined;
    const monthVal = cleanSheetValue(row[0]) || (expDate ? expDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase() : 'GENERAL');
    const week = cleanSheetValue(row[2]);
    const plate = normalizePlate(cleanSheetValue(row[3])); 
    const workshop = cleanSheetValue(row[4]);             
    const evidenceUrl = cleanSheetValue(row[5]);
    const estado = cleanSheetValue(row[6]).toUpperCase().trim();
    
    const fleetInfo = fleetMap.get(plate);
    const rawCd = cleanSheetValue(row[7]).trim();
    const rawContractor = cleanSheetValue(row[8]).trim();

    const cd = (rawCd && rawCd !== "GENERAL" && rawCd !== "0" && rawCd !== "") ? rawCd : (fleetInfo?.cd || 'GENERAL');
    const contractor = (rawContractor && rawContractor !== "GENERAL" && rawContractor !== "0" && rawContractor !== "") ? rawContractor : (fleetInfo?.contractor || 'GENERAL');
    
    if (expDate) expDate.setFullYear(expDate.getFullYear() + 1);
    const expDateStr = expDate ? expDate.toISOString().split('T')[0] : '';
    return {
      id: `cal-${plate}-${calDateStr}-${index}`,
      plate,
      equipment: workshop || 'TALLER NO ESPECIFICADO',
      calibrationDate: calDateStr,
      expiryDate: expDateStr,
      certificateUrl: evidenceUrl,
      status: calculateStatus(expDateStr),
      daysPending: getDaysDiff(expDateStr),
      month: monthVal,
      week,
      estado,
      year,
      cd: cd,
      contractor: contractor
    };
  });
};

/**
 * LAVADOS (Hoja LAVADOS)
 */
export const fetchWashReportsFromSheet = async (): Promise<WashReport[]> => {
  try {
    const docId = getWashDocId();
    const rows = await fetchDataFromGAS(docId, 'LAVADOS', WASH_SCRIPT_URL);
    if (!rows || rows.length < 2) {
      return fetchWashReportsFromSheetCSV();
    }
    return processWashRows(rows);
  } catch (e) { 
    return fetchWashReportsFromSheetCSV(); 
  }
};

const fetchWashReportsFromSheetCSV = async (): Promise<WashReport[]> => {
  try {
    const docId = getWashDocId();
    const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&sheet=LAVADOS${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processWashRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processWashRows = (rows: any[][]): WashReport[] => {
  // Intentamos identificar las columnas si hay cabecera
  const header = rows[0].map(h => String(h).toUpperCase());
  let plateIdx = header.findIndex(h => h.includes('PLACA'));
  let dateIdx = header.findIndex(h => h.includes('FECHA'));
  let monthIdx = header.findIndex(h => h.includes('MES'));
  let weekIdx = header.findIndex(h => h.includes('SEMANA'));
  let evidenceIdx = header.findIndex(h => h.includes('EVIDENCIA') || h.includes('FOTO'));

  // Fallbacks si no hay cabecera clara
  if (plateIdx === -1) plateIdx = 4;
  if (dateIdx === -1) dateIdx = 3;
  if (monthIdx === -1) monthIdx = 1;
  if (weekIdx === -1) weekIdx = 2;
  if (evidenceIdx === -1) evidenceIdx = 5;

  return rows.slice(1)
    .filter(row => row && (row[plateIdx] || row[dateIdx]))
    .map((row, i): WashReport => {
      const plate = normalizePlate(cleanSheetValue(row[plateIdx]));
      const date = parseFlexibleDate(row[dateIdx]);
      let month = cleanSheetValue(row[monthIdx]);
      const evidence = cleanSheetValue(row[evidenceIdx]);
      
      if (!month && date) {
        const d = new Date(date + "T12:00:00");
        if (!isNaN(d.getTime())) {
          month = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        }
      }

      return {
        id: `wash-${i}-${plate}-${date}`,
        month: month || 'GENERAL',
        week: cleanSheetValue(row[weekIdx]),
        date: date,
        plate: plate,
        evidenceUrl: evidence,
        initialEvidenceUrl: evidence,
        finalEvidenceUrl: evidence,
        mapUrl: cleanSheetValue(row[6]),
        workshop: cleanSheetValue(row[7]),
        status: 'CERRADO'
      };
    });
};

/**
 * LIMPIEZA (GID 1853969081 - CRONOGRAMA 5S)
 */
export const fetchCleaningReportsFromSheet = async (): Promise<WashReport[]> => {
  try {
    const docId = getCleaningDocId();
    const rows = await fetchDataFromGAS(docId, 'CRONOGRAMA 5S', CLEANING_5S_SCRIPT_URL);
    if (!rows || rows.length < 2) {
      return fetchCleaningReportsFromSheetCSV();
    }
    return processCleaningRows(rows);
  } catch (e) { 
    return fetchCleaningReportsFromSheetCSV(); 
  }
};

const fetchCleaningReportsFromSheetCSV = async (): Promise<WashReport[]> => {
  try {
    const docId = getCleaningDocId();
    const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&sheet=CRONOGRAMA%205S${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processCleaningRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processCleaningRows = (rows: any[][]): WashReport[] => {
  return rows.slice(1)
    .filter(row => row && (row[3] || row[0]))
    .map((row, i): WashReport => {
      const dateProg = parseFlexibleDate(row[0]);
      let month = cleanSheetValue(row[1]);
      const week = cleanSheetValue(row[2]);
      const plate = normalizePlate(cleanSheetValue(row[3]));
      const statusRaw = cleanSheetValue(row[4]).toUpperCase();
      const initialEvidence = cleanSheetValue(row[5]);
      const finalEvidence = cleanSheetValue(row[6]);
      
      // Fallback: if month is empty, try to derive it from date
      if (!month && dateProg) {
        const d = new Date(dateProg + "T12:00:00");
        if (!isNaN(d.getTime())) {
          month = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        }
      }

      const isClosed = statusRaw.includes('COMPLETADO') || statusRaw.includes('CERRADO');

      return {
        id: `clean-${i}-${plate}-${dateProg}`, 
        month: month || 'GENERAL', 
        week: week,
        date: dateProg, 
        plate: plate,
        evidenceUrl: finalEvidence || initialEvidence, 
        initialEvidenceUrl: initialEvidence,
        finalEvidenceUrl: finalEvidence,
        mapUrl: '', 
        workshop: '', 
        status: isClosed ? 'CERRADO' : 'ABIERTO',
        closureDate: isClosed ? dateProg : undefined 
      };
    });
};

/**
 * CONDUCTORES (GID 1834987510)
 */
export const fetchDriversFromSheet = async (): Promise<Driver[]> => {
  try {
    const docId = getMasterDocId();
    let rows = await fetchDataFromGAS(docId, 'ALERTA_CONDUCTORES');
    
    let isIncorrectSheet = false;
    if (rows && rows.length > 0) {
      const firstRowStr = rows[0].map((c: any) => String(c).toUpperCase()).join(',');
      if (firstRowStr.includes('KILOMETRAJE') || firstRowStr.includes('SEMANA')) {
        isIncorrectSheet = true;
      }
    }

    if (!rows || rows.length < 2 || isIncorrectSheet) {
      if (isIncorrectSheet && docId !== REAL_MASTER_ID) {
        console.warn("GAS fetch drivers got incorrect sheet (kilometrajes) from configured doc, falling back to REAL_MASTER_ID");
        rows = await fetchDataFromGAS(REAL_MASTER_ID, 'ALERTA_CONDUCTORES');
      } else {
        console.warn("GAS fetch drivers failed, attempting CSV fallback");
        const csvRes = await fetchDriversFromSheetCSV(docId);
        if ((csvRes.length === 0 || csvRes.length > 500) && docId !== REAL_MASTER_ID) {
          console.warn("CSV fetch drivers failed or was incorrect, falling back to REAL_MASTER_ID CSV");
          return fetchDriversFromSheetCSV(REAL_MASTER_ID);
        }
        return csvRes;
      }
    }
    
    if (rows && rows.length > 0) {
      const firstRowStr = rows[0].map((c: any) => String(c).toUpperCase()).join(',');
      if (firstRowStr.includes('KILOMETRAJE') || firstRowStr.includes('SEMANA')) {
        return fetchDriversFromSheetCSV(REAL_MASTER_ID);
      }
    }

    if (!rows || rows.length < 2) {
      return fetchDriversFromSheetCSV(REAL_MASTER_ID);
    }

    return processDriverRows(rows);
  } catch (e) { 
    return fetchDriversFromSheetCSV(REAL_MASTER_ID);
  }
};

const fetchDriversFromSheetCSV = async (docId: string = getMasterDocId()): Promise<Driver[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${DRIVERS_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (rows && rows.length > 0) {
            const firstRowStr = rows[0].map((c: any) => String(c).toUpperCase()).join(',');
            if (firstRowStr.includes('KILOMETRAJE') || firstRowStr.includes('SEMANA')) {
              console.warn("fetchDriversFromSheetCSV: detected incorrect sheet. Rejecting.");
              resolve([]);
              return;
            }
          }
          resolve(processDriverRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processDriverRows = (rows: any[][]): Driver[] => {
  return rows.slice(1).filter(row => {
    if (!row || !row[2]) return false;
    const name = cleanSheetValue(row[2]).toLowerCase();
    const id = cleanSheetValue(row[3]).toLowerCase();
    return !name.includes('nombres y apellidos') && !name.includes('nombre') && id !== 'cc' && !id.includes('identific');
  }).map((row): Driver => {
    const licExp = parseFlexibleDate(row[9]);
    const courseExp = parseFlexibleDate(row[11]);
    const medicalExp = parseFlexibleDate(row[13]);
    
    const rawExp = cleanSheetValue(row[8]);
    const parsedExp = parseFloat(rawExp);
    const experienceTime = !isNaN(parsedExp) ? Math.round(parsedExp).toString() : rawExp;

    return {
      id: `d-${cleanSheetValue(row[3])}`,
      name: cleanSheetValue(row[2]),
      identification: cleanSheetValue(row[3]),
      hireDate: parseFlexibleDate(row[6]),
      position: cleanSheetValue(row[4]),
      status: cleanSheetValue(row[5]),
      experienceTime: experienceTime,
      licenseIssueDate: parseFlexibleDate(row[7]),
      photoUrl: cleanSheetValue(row[15]),
      cd: cleanSheetValue(row[0]),
      contractor: cleanSheetValue(row[1]),
      license: { 
        expiryDate: licExp, 
        lastRenewalDate: '', 
        status: calculateStatus(licExp), 
        url: cleanSheetValue(row[16]), 
        daysPending: getDaysDiff(licExp) 
      },
      defensiveDriving: { 
        expiryDate: courseExp, 
        lastRenewalDate: '', 
        status: calculateStatus(courseExp), 
        url: cleanSheetValue(row[17]),
        daysPending: getDaysDiff(courseExp)
      },
      medicalExam: { 
        expiryDate: medicalExp, 
        lastRenewalDate: '', 
        status: calculateStatus(medicalExp), 
        url: cleanSheetValue(row[18]),
        daysPending: getDaysDiff(medicalExp)
      }
    };
  });
};

/**
 * NOVEDADES (GID 1789987673)
 */
export const fetchReportsFromSheet = async (): Promise<Report[]> => {
  try {
    const docId = getRoutinesDocId();
    const rows = await fetchDataFromGAS(docId, 'NOVEDADES', WORKSHOP_SCRIPT_URL);
    if (!rows || rows.length === 0) {
      return fetchReportsFromSheetCSV();
    }
    return processReportRows(rows);
  } catch (e) { 
    return fetchReportsFromSheetCSV(); 
  }
};

const fetchReportsFromSheetCSV = async (): Promise<Report[]> => {
  try {
    const docId = getRoutinesDocId();
    const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${NOVEDADES_GID}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processReportRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processReportRows = (rows: any[][]): Report[] => {
  if (rows.length === 0) return [];
  const header = rows[0].map(h => String(h).toUpperCase());

  const getIdx = (name: string, fallback: number) => {
    const idx = header.findIndex(h => h.includes(name));
    return idx !== -1 ? idx : fallback;
  };

  const plateIdx = getIdx('PLACA', 4);
  const dateIdx = getIdx('FECHA', 1);
  const cdIdx = getIdx('CENTRO', 2);
  const contractorIdx = getIdx('CONTRATISTA', 3);
  const sourceIdx = getIdx('ORIGEN', 5);
  const workshopDateIdx = getIdx('FECHA TALLER', 6);
  const initEvidenceIdx = getIdx('EVIDENCIA INICIAL', 7);
  const noveltyIdx = getIdx('NOVEDAD', 8);
  const daysToAttendIdx = getIdx('DIAS PARA ATENDER', 9);
  const entryMapIdx = getIdx('MAPA ENTRADA', 10);
  const statusIdx = getIdx('ESTADO', 11);
  const workshopEvidenceIdx = getIdx('EVIDENCIA TALLER', 12);
  const closureDateIdx = getIdx('FECHA CIERRE', 13);
  
  // Si no encuentra 'EVIDENCIA SOLUCION', probamos con 'BW' o el fallback 14
  let solutionEvidenceIdx = header.findIndex(h => h.includes('EVIDENCIA SOLUCION') || h === 'BW');
  if (solutionEvidenceIdx === -1) solutionEvidenceIdx = 14; 
  // Especial handling for user's BW request if index 74 exists and is not found by name
  if (rows[0].length > 74 && solutionEvidenceIdx === 14) solutionEvidenceIdx = 74;

  const exitMapIdx = getIdx('MAPA SALIDA', 15);
  const daysInShopIdx = getIdx('DIAS EN TALLER', 16);
  const commentsIdx = getIdx('COMENTARIOS', 17);
  const workshopIdx = getIdx('TALLER', 18);

  return rows.slice(1).filter(row => row && row[0]).map((row): Report => {
    const statusRaw = cleanSheetValue(row[statusIdx]).toUpperCase();
    const isClosed = statusRaw.includes('CERRADO') || statusRaw.includes('COMPLETADOS');

    return {
      id: cleanSheetValue(row[0]), 
      date: parseFlexibleDate(row[dateIdx]), 
      cd: cleanSheetValue(row[cdIdx]),
      contractor: cleanSheetValue(row[contractorIdx]),
      plate: normalizePlate(cleanSheetValue(row[plateIdx])), 
      source: cleanSheetValue(row[sourceIdx]), 
      workshopDate: parseFlexibleDate(row[workshopDateIdx]),
      initialEvidence: cleanSheetValue(row[initEvidenceIdx]), 
      novelty: cleanSheetValue(row[noveltyIdx]), 
      daysToAttend: parseInt(cleanSheetValue(row[daysToAttendIdx])) || 0,
      entryMap: cleanSheetValue(row[entryMapIdx]), 
      status: isClosed ? 'COMPLETADOS' : 'PENDIENTES', 
      workshopEvidence: cleanSheetValue(row[workshopEvidenceIdx]), 
      closureDate: parseFlexibleDate(row[closureDateIdx]), 
      solutionEvidence: cleanSheetValue(row[solutionEvidenceIdx]), 
      exitMap: cleanSheetValue(row[exitMapIdx]), 
      daysInShop: parseInt(cleanSheetValue(row[daysInShopIdx])) || 0, 
      closureComments: cleanSheetValue(row[commentsIdx]), 
      workshop: cleanSheetValue(row[workshopIdx])
    };
  });
};

/**
 * COMPARENDOS
 */
export const fetchFinesFromSheet = async (): Promise<Fine[]> => {
  try {
    const rows = await fetchDataFromGAS(getFinesSheetId(), 'COMPARENDOS');
    if (!rows || rows.length === 0) {
      return fetchFinesFromSheetCSV();
    }
    return processFineRows(rows);
  } catch (e) { 
    return fetchFinesFromSheetCSV(); 
  }
};

const fetchFinesFromSheetCSV = async (): Promise<Fine[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${getFinesSheetId()}/gviz/tq?tqx=out:csv&gid=0${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processFineRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processFineRows = (rows: any[][]): Fine[] => {
  // Skip the first row if it's the header "MES"
  const startIdx = (rows[0] && cleanSheetValue(rows[0][0]).toUpperCase() === 'MES') ? 1 : 0;
  
  return rows.slice(startIdx)
    .filter(r => r && r.some(c => cleanSheetValue(c).length > 0))
    .map((row, i): Fine => {
      return {
        id: `row-${startIdx + i + 1}`,
        month: cleanSheetValue(row[0]),
        registrationDate: parseFlexibleDate(row[1]),
        cd: cleanSheetValue(row[2]),
        contractor: cleanSheetValue(row[3]),
        driverName: cleanSheetValue(row[4]),
        driverId: cleanSheetValue(row[5]),
        driverPosition: cleanSheetValue(row[6]),
        amount: parseFloat(cleanSheetValue(row[10])) || 0,
        status: cleanSheetValue(row[8]).toUpperCase().includes('SI') ? 'PENDIENTE' : 'PAGADO',
        paymentAgreement: cleanSheetValue(row[9]),
        evidenceUrl: cleanSheetValue(row[7]).startsWith('http') ? cleanSheetValue(row[7]) : '',
        infractionCode: cleanSheetValue(row[11]),
        date: parseFlexibleDate(row[12]),
        description: cleanSheetValue(row[13]),
        plate: normalizePlate(cleanSheetValue(row[17]))
      } as any;
    });
};

export const fetchForkliftFinesFromSheet = async (): Promise<ForkliftFine[]> => {
  const docId = '1Vz9b-jRZNFbq-0ex4uQcpX0KT9u6GIrAVrhSO9Xhh8g';
  try {
    const rows = await fetchDataFromGAS(docId, 'COMPARENDOS');
    if (!rows || rows.length === 0) {
      return fetchForkliftFinesFromSheetCSV(docId);
    }
    return processForkliftFineRows(rows);
  } catch (e) {
    return fetchForkliftFinesFromSheetCSV(docId);
  }
};

const fetchForkliftFinesFromSheetCSV = async (docId: string): Promise<ForkliftFine[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=0${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processForkliftFineRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processForkliftFineRows = (rows: any[][]): ForkliftFine[] => {
  const startIdx = (rows[0] && cleanSheetValue(rows[0][0]).toUpperCase() === 'MES') ? 1 : 0;
  
  return rows.slice(startIdx)
    .filter(r => r && r.some(c => cleanSheetValue(c).length > 0))
    .map((row, i): ForkliftFine => {
      return {
        id: `ff-${startIdx + i + 1}`,
        month: cleanSheetValue(row[0]),
        date: parseFlexibleDate(row[1]),
        cd: cleanSheetValue(row[2]),
        contractor: cleanSheetValue(row[3]),
        driverName: cleanSheetValue(row[4]),
        driverId: cleanSheetValue(row[5]),
        driverPosition: cleanSheetValue(row[6]),
        revision01To15Pdf: cleanSheetValue(row[7]).startsWith('http') ? cleanSheetValue(row[7]) : '',
        revisionDate: parseFlexibleDate(row[8]),
        revision15To30Pdf: cleanSheetValue(row[9]).startsWith('http') ? cleanSheetValue(row[9]) : '',
        hasFine: cleanSheetValue(row[10]),
        observation: cleanSheetValue(row[11]),
        paymentAgreement: cleanSheetValue(row[12]),
        receiptPdf: cleanSheetValue(row[13]).startsWith('http') ? cleanSheetValue(row[13]) : '',
        amount: parseFloat(cleanSheetValue(row[14]).replace(/[^0-9.-]+/g, '')) || 0,
        receiptNo: cleanSheetValue(row[15]),
        concept: cleanSheetValue(row[16])
      };
    });
};

export const fetchAvailabilityFromSheet = async (): Promise<AvailabilityRecord[]> => {
  try {
    const rows = await fetchDataFromGAS(FLEET_AVAILABILITY_DOC_ID, 'DISPONILIDAD');
    if (!rows || rows.length < 2) {
      return fetchAvailabilityFromSheetCSV();
    }
    return processAvailabilityRows(rows);
  } catch (e) { 
    return fetchAvailabilityFromSheetCSV(); 
  }
};

const fetchAvailabilityFromSheetCSV = async (): Promise<AvailabilityRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${FLEET_AVAILABILITY_DOC_ID}/export?format=csv&gid=1030492801${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processAvailabilityRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processAvailabilityRows = (rows: any[][]): AvailabilityRecord[] => {
  // Indices based on user mapping:
  // B: Fecha (1), C: CD (2), D: Sistema (3), E: Detalle (4), G: Taller (6), H: Ingreso (7), I: Salida (8), 
  // J: PLACAS (9), K: Contratista (10), L: Dias (11), M: Total (12), N: IndispCount (13), O: DispoCount (14),
  // P: IndispPrc (15), Q: DispoPrc (16), R: VHSCD (17), S: cd_registro (18), T: mes (19), U: sem (20)
  return rows.slice(1)
    .filter(row => row && row[9]) // Using PLACAS (index 9) as the primary identifier
    .map((row, i): AvailabilityRecord => {
      const parseNum = (val: any) => {
        if (!val) return 0;
        const clean = String(val).replace('%', '').replace(',', '.').trim();
        return parseFloat(clean) || 0;
      };
      
      const rawPlate = cleanSheetValue(row[9]);
      const normalizedPlate = normalizePlate(rawPlate);

      return {
        id: `avail-new-${i}`,
        fecha: parseFlexibleDate(row[1]), 
        cdOriginal: cleanSheetValue(row[2]).toUpperCase(),
        sistema: cleanSheetValue(row[3]).toUpperCase(),
        detalle: cleanSheetValue(row[4]),
        placa: normalizedPlate,
        taller: cleanSheetValue(row[6]).toUpperCase(),
        fechaIngreso: parseFlexibleDate(row[7]),
        fechaEstimadaSalida: parseFlexibleDate(row[8]),
        placasKey: normalizedPlate,
        contratista: cleanSheetValue(row[10]).toUpperCase(),
        diasIndisponible: parseNum(row[11]),
        totalVH: parseNum(row[12]),
        vehiculoIndisponible: parseNum(row[13]),
        vehiculosDisponibles: parseNum(row[14]),
        indisponibilidadPrc: parseNum(row[15]),
        disponibilidadPrc: parseNum(row[16]),
        vhsCd: parseNum(row[17]),
        cdRegistro: cleanSheetValue(row[18]).toUpperCase(),
        mes: cleanSheetValue(row[19]),
        semana: cleanSheetValue(row[20])
      };
    });
};

export interface AvailabilitySummaryRecord {
  fecha: string;
  cd: string;
  contratista: string;
  indisponibles: number;
  disponibles: number;
  total: number;
  promedio: number;
}

export const fetchAvailabilitySummaryFromSheet = async (): Promise<AvailabilitySummary[]> => {
  try {
    const rows = await fetchDataFromGAS(FLEET_AVAILABILITY_DOC_ID, '%DISPONIBILIDAD');
    if (!rows || rows.length < 2) {
      // Fallback CSV - we need a GID for %DISPONIBILIDAD, since I don't have it, GAS is the primary way
      // If GAS fails and I don't have GID, it will return empty, which is better than crashing
      return [];
    }
    return processAvailabilitySummaryRows(rows);
  } catch (e) {
    return [];
  }
};

const processAvailabilitySummaryRows = (rows: any[][]): AvailabilitySummary[] => {
  // B: FECHA (1), C: CD (2), D: CONTRATISTA (3), E: VH INDISPONIBLES (4), F: VHS DISPONIBLES (5), G: TOTAl VH (6), H: %PROMEDIO (7)
  return rows.slice(1)
    .filter(row => row && row[1]) // Fecha is B (index 1)
    .map((row): AvailabilitySummary => {
      const parseNum = (val: any) => {
        if (!val) return 0;
        const clean = String(val).replace('%', '').replace(',', '.').trim();
        return parseFloat(clean) || 0;
      };
      
      return {
        fecha: parseFlexibleDate(row[1]),
        cd: cleanSheetValue(row[2]).toUpperCase(),
        contratista: cleanSheetValue(row[3]).toUpperCase(),
        indisponibles: parseNum(row[4]),
        disponibles: parseNum(row[5]),
        total: parseNum(row[6]),
        promedio: parseNum(row[7]) >= 1 ? parseNum(row[7]) : parseNum(row[7]) * 100 // Handle both 0.95 and 95
      };
    });
};

export const fetchFleetBaseData = async (): Promise<FleetListRecord[]> => {
  try {
    const rows = await fetchDataFromGAS(FLEET_AVAILABILITY_DOC_ID, 'LISTA');
    if (!rows || rows.length < 2) {
      return fetchFleetBaseDataCSV();
    }
    return processFleetBaseRows(rows);
  } catch (e) {
    return fetchFleetBaseDataCSV();
  }
};

const fetchFleetBaseDataCSV = async (): Promise<FleetListRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${FLEET_AVAILABILITY_DOC_ID}/export?format=csv&gid=162607153${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processFleetBaseRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processFleetBaseRows = (rows: any[][]): FleetListRecord[] => {
  // Index 0: Placas CO (Indice 1)
  // Index 1: Centro Distribución (Indice 2 - Col B)
  return rows.slice(1)
    .filter(row => row && row[0]) 
    .map((row): FleetListRecord => {
      const cdValue = cleanSheetValue(row[1]);
      return {
        placa: normalizePlate(cleanSheetValue(row[0])),
        cd: cdValue.toUpperCase(),
        canal: cleanSheetValue(row[2]).toUpperCase(),
        distribuidor: cleanSheetValue(row[3]).toUpperCase(),
        contratista: cleanSheetValue(row[4]).toUpperCase()
      };
    });
};

export const fetchOperationalIndicatorsFromSheet = async (): Promise<OperationalIndicator[]> => {
  const docId = '1nKlDzFSZxh9NiWTJgkx2ASIJMbHMSribN3MZ-4mClVU';
  try {
    const rows = await fetchDataFromGAS(docId, 'TABLERO');
    if (!rows || rows.length < 2) {
      return fetchOperationalIndicatorsFromSheetCSV();
    }
    return processIndicatorRows(rows);
  } catch (e) { 
    return fetchOperationalIndicatorsFromSheetCSV(); 
  }
};

const fetchOperationalIndicatorsFromSheetCSV = async (): Promise<OperationalIndicator[]> => {
  try {
    const docId = '1nKlDzFSZxh9NiWTJgkx2ASIJMbHMSribN3MZ-4mClVU';
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=TABLERO${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processIndicatorRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processIndicatorRows = (rows: any[][]): OperationalIndicator[] => {
  const parseNumericValue = (val: string): number => {
    if (!val) return 0;
    const cleaned = val.replace('%', '').replace(',', '.').trim();
    return parseFloat(cleaned) || 0;
  };

  return rows.slice(1)
    .filter(row => row && (row[3] || row[2] || row[1]))
    .map((row, i): OperationalIndicator => {
      const colA = cleanSheetValue(row[0]);
      const colB = cleanSheetValue(row[1]);
      const colC = cleanSheetValue(row[2]);
      const colD = cleanSheetValue(row[3]);

      let cdVal = colC;
      let weekVal = colB;
      let indicatorVal = colD;

      const bUpper = colB.toUpperCase();
      const cUpper = colC.toUpperCase();

      // Smart detection for Column B / Column C
      if (bUpper.includes('GALAPA') || bUpper.includes('ARENOSA') || bUpper.includes('LA ARENOSA') || bUpper.includes('CD')) {
        cdVal = colB;
        weekVal = colC;
      } else if (cUpper.includes('GALAPA') || cUpper.includes('ARENOSA') || cUpper.includes('LA ARENOSA') || cUpper.includes('CD')) {
        cdVal = colC;
        weekVal = colB;
      }

      if (!indicatorVal && colC && !cUpper.includes('GALAPA') && !cUpper.includes('ARENOSA') && !cUpper.includes('SEMANA')) {
        indicatorVal = colC;
      }

      return {
        id: `op-${i}`,
        month: colA,
        week: weekVal,
        cd: cdVal || 'GALAPA',
        indicator: indicatorVal,
        actual: parseNumericValue(cleanSheetValue(row[4])),
        trigger: parseNumericValue(cleanSheetValue(row[5])),
        meta: parseNumericValue(cleanSheetValue(row[6])),
      };
    });
};

export const fetchWorkshopRecordsFromSheet = async (): Promise<WorkshopRecord[]> => {
  const docId = '1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo';
  try {
    const rows = await fetchDataFromGAS(docId, 'TALLERES', getWorkshopScriptUrl());
    if (!rows || rows.length < 2) {
      return fetchWorkshopRecordsFromSheetCSV();
    }
    return processWorkshopRecordRows(rows);
  } catch (e) { 
    return fetchWorkshopRecordsFromSheetCSV(); 
  }
};

const fetchWorkshopRecordsFromSheetCSV = async (): Promise<WorkshopRecord[]> => {
  try {
    const docId = '1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo';
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=TALLERES${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processWorkshopRecordRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processWorkshopRecordRows = (rows: any[][]): WorkshopRecord[] => {
  // 0:MES, 1:SEMANA, 2:FECHA, 3:PLACA, 4:ESTADO, 5:NOVEDAD, 6:EVIDENCIA_1, 7:EVIDENCIA_2, 8:MÁS ALTO
  return rows.slice(1)
    .filter(row => row && row[3]) // Placa en indice 3
    .map((row, i): WorkshopRecord => {
      return {
        id: `workshop-${i}`,
        month: cleanSheetValue(row[0]),
        week: cleanSheetValue(row[1]),
        date: parseFlexibleDate(row[2]),
        plate: normalizePlate(cleanSheetValue(row[3])),
        status: cleanSheetValue(row[4]),
        novelty: cleanSheetValue(row[5]),
        evidence1Url: cleanSheetValue(row[6]),
        evidence2Url: cleanSheetValue(row[7]),
        workshopName: cleanSheetValue(row[8]),
      };
    });
};

export const fetchCheckListFromSheet = async (): Promise<CheckList[]> => {
  const fetchFromSource = async (docId: string, sheetName: string, defaultCd: string): Promise<CheckList[]> => {
    try {
      const rows = await fetchDataFromGAS(docId, sheetName);
      if (!rows || rows.length < 2) {
        return fetchFromSourceCSV(docId, sheetName, defaultCd);
      }
      return processCheckListRows(rows, docId, defaultCd);
    } catch (e) { 
      return fetchFromSourceCSV(docId, sheetName, defaultCd); 
    }
  };

  const fetchFromSourceCSV = async (docId: string, sheetName: string, defaultCd: string): Promise<CheckList[]> => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}${getCacheBuster()}`;
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      const csvText = await response.text();
      if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
      
      return new Promise((resolve) => {
        Papa.parse(csvText, {
          header: false, skipEmptyLines: 'greedy',
          complete: (results) => {
            const rows = results.data as any[][];
            resolve(processCheckListRows(rows, docId, defaultCd));
          },
          error: () => resolve([])
        });
      });
    } catch (e) { return []; }
  };

  const processCheckListRows = (rows: any[][], docId: string, defaultCd: string): CheckList[] => {
    return rows.slice(1)
      .filter(row => {
        if (!row || !row[8]) return false;
        const empresa = cleanSheetValue(row[8]).toUpperCase();
        return empresa === 'BAVARIA';
      })
      .map((row, i): CheckList => {
        const fecha = parseFlexibleDate(row[1]);
        const rawConductor = cleanSheetValue(row[9]);
        const rawSalida = cleanSheetValue(row[3]);
        const rawRetorno = cleanSheetValue(row[4]);
        const rawSemana = cleanSheetValue(row[10]);

        let semanaStr = rawSemana;
        if (!semanaStr || semanaStr.trim() === '') {
          try {
            if (fecha) {
              const d = new Date(fecha + 'T12:00:00');
              if (!isNaN(d.getTime())) {
                semanaStr = String(getWeekNumber(d));
              }
            }
          } catch (e) {
            semanaStr = '';
          }
        }

        return {
          id: `check-${docId}-${i}`,
          fecha: fecha,
          vehiculo: normalizePlate(cleanSheetValue(row[2])),
          salida: rawSalida === '1' ? '100%' : '0%',
          retorno: rawRetorno === '1' ? '100%' : '0%',
          estado: cleanSheetValue(row[6]),
          contratista: cleanSheetValue(row[7]),
          empresa: cleanSheetValue(row[8]),
          conductor: rawConductor.trim() === '' ? '#N/A' : rawConductor,
          semana: semanaStr,
          novedades: cleanSheetValue(row[12]) || '',
          cd: defaultCd,
          source: defaultCd === 'LA ARENOSA' ? 'ARENOSA' : 'GALAPA'
        };
      });
  };

  const [arenosa, galapa] = await Promise.all([
    fetchFromSource(CHECKLIST_DOC_ID, 'DATA', 'LA ARENOSA'),
    fetchFromSource(CHECKLIST_GALAPA_DOC_ID, 'DATA', 'GALAPA')
  ]);

  return [...arenosa, ...galapa];
};

export const fetchUnavailabilityFromSheet = async (): Promise<UnavailabilityRecord[]> => {
  try {
    const docId = getCorrectivesDocId();
    const rows = await fetchDataFromGAS(docId, 'INDISPONIBILIDAD');
    
    if (!rows || rows.length < 2) {
      console.warn("GAS fetch unavail failed, attempting CSV fallback");
      return fetchUnavailabilityFromSheetCSV();
    }

    return rows.slice(1)
      .filter(row => row && row[2]) // Placa en indice 2
      .map((row, i): UnavailabilityRecord => {
        const plate = normalizePlate(cleanSheetValue(row[2]));
        const entryDate = parseFlexibleDate(row[10]);
        const exitDate = parseFlexibleDate(row[11]);
        let days = parseInt(cleanSheetValue(row[12]));

        if (isNaN(days) || cleanSheetValue(row[12]) === '') {
          if (entryDate) {
            const start = new Date(entryDate + 'T00:00:00');
            const end = exitDate ? new Date(exitDate + 'T00:00:00') : new Date();
            const diffTime = end.getTime() - start.getTime();
            days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          } else {
            days = 0;
          }
        }

        return {
          id: `unavail-${i}-${plate}`,
          fecha: parseFlexibleDate(row[0]),
          semana: cleanSheetValue(row[1]),
          placa: plate,
          contratista: cleanSheetValue(row[3]),
          cd: cleanSheetValue(row[4]),
          estado: cleanSheetValue(row[5]),
          sistema: cleanSheetValue(row[6]),
          novedad: cleanSheetValue(row[7]),
          criticidad: cleanSheetValue(row[8]),
          taller: cleanSheetValue(row[9]),
          fechaIngreso: entryDate,
          fechaSalida: exitDate,
          diasTaller: days
        };
      });
  } catch (e) {
    console.error("Error fetching unavail from GAS:", e);
    return fetchUnavailabilityFromSheetCSV();
  }
};

const fetchUnavailabilityFromSheetCSV = async (): Promise<UnavailabilityRecord[]> => {
  try {
    const docId = getCorrectivesDocId();
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=INDISPONIBILIDAD${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          const records = rows.slice(1)
            .filter(row => row && row[2]) 
            .map((row, i): UnavailabilityRecord => {
              const plate = normalizePlate(cleanSheetValue(row[2]));
              const entryDate = parseFlexibleDate(row[10]);
              const exitDate = parseFlexibleDate(row[11]);
              let days = parseInt(cleanSheetValue(row[12]));
              if (isNaN(days) || cleanSheetValue(row[12]) === '') {
                if (entryDate) {
                  const start = new Date(entryDate + 'T00:00:00');
                  const end = exitDate ? new Date(exitDate + 'T00:00:00') : new Date();
                  const diffTime = end.getTime() - start.getTime();
                  days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                } else { days = 0; }
              }
              return {
                id: `unavail-${i}-${plate}`,
                fecha: parseFlexibleDate(row[0]),
                semana: cleanSheetValue(row[1]),
                placa: plate,
                contratista: cleanSheetValue(row[3]),
                cd: cleanSheetValue(row[4]),
                estado: cleanSheetValue(row[5]),
                sistema: cleanSheetValue(row[6]),
                novedad: cleanSheetValue(row[7]),
                criticidad: cleanSheetValue(row[8]),
                taller: cleanSheetValue(row[9]),
                fechaIngreso: entryDate,
                fechaSalida: exitDate,
                diasTaller: days
              };
            });
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const saveUnavailabilityRecords = async (records: Partial<UnavailabilityRecord>[]): Promise<boolean> => {
  const UNAVAILABILITY_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwYjuq6x1ZAlLi9ctIDl_d66J4RrE3Y0qmiUGeRAcxuHUbbi5oTtOxyv6E-7FNu1Oc/exec';
  
  // Función para formatear YYYY-MM-DD a DD/MM/YYYY
  const formatSheetDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const payload = {
    method: 'POST_UNAVAILABILITY_BATCH',
    data: records.map(r => [
      formatSheetDate(r.fecha),      // Index 0: Fecha
      r.semana || '',                // Index 1: Semana
      r.placa || '',                 // Index 2: Placa
      r.contratista || '',           // Index 3: Contratista
      r.cd || '',                    // Index 4: CD
      r.estado || '',                // Index 5: Estado
      r.sistema || '',               // Index 6: Sistema
      r.novedad || '',               // Index 7: Novedad
      r.criticidad || '',            // Index 8: Criticidad (Enviamos solo el número)
      r.taller || '',                // Index 9: Taller
      formatSheetDate(r.fechaIngreso), // Index 10: Fecha de ingreso
      formatSheetDate(r.fechaSalida),  // Index 11: Fecha salida de taller
      r.diasTaller || ''             // Index 12: Días en taller
    ])
  };

  return sendToGAS(payload, UNAVAILABILITY_SCRIPT_URL);
};

export const fetchFuelPerformanceFromSheet = async (): Promise<FuelPerformance[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTaur0xTXFcug2tg_CW5gBBHnh9QtH8psRy0nLHcYSPqoPfs3Tt2d-X3nNWuvUnxRKjxvmJIFryPnTK/pub?gid=1098828384&single=true&output=csv${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          
          // Indices provided by user:
          // 0: Mes1, 1: Semana, 2: CD, 3: ID CD, 4: PLACA, 5: Distancia (Km), 6: Exceso de Velocidad, 
          // 7: En ralentí > 5 min., 8: Tiempo en ralentí, 9: Viajes, 10: Cantidad (Gal), 
          // 11: CD1, 12: Gerencia, 13: CANTIDAD GALONES, 14: KM RECORRIDOS, 15: CONTRATISTA
          const records = rows.slice(1)
            .filter(row => row && row[4]) // Placa en indice 4
            .map((row, i): FuelPerformance => {
              const parseNum = (val: any) => {
                const clean = cleanSheetValue(val).replace('%', '').replace(',', '.').trim();
                return parseFloat(clean) || 0;
              };
              
              const mileage = parseNum(row[5]);
              const gallons = parseNum(row[13]);
              const kmpg = gallons > 0 ? mileage / gallons : 0;
              const targetKmpg = 10; // Default target
              
              return {
                id: `fuel-${i}`,
                month: cleanSheetValue(row[0]),
                week: cleanSheetValue(row[1]),
                date: '', // Not explicitly in the new indices
                plate: normalizePlate(cleanSheetValue(row[4])),
                driver: '#N/A', // Not explicitly in the new indices
                contractor: cleanSheetValue(row[15]),
                cd: cleanSheetValue(row[2]),
                mileage: mileage,
                gallons: gallons,
                kmpg: kmpg,
                speeding: parseNum(row[6]),
                idlingCount: parseNum(row[7]),
                idlingTime: cleanSheetValue(row[8]),
                trips: parseNum(row[9]),
                targetKmpg: targetKmpg,
                compliance: targetKmpg > 0 ? (kmpg / targetKmpg) * 100 : 0
              };
            });
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const fetchPlateAdherenceFromSheet = async (): Promise<PlateAdherence[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vQZ7_kRXNquJ468yEWrpOxrytSu6BEeXN5K838BPD4seHFrHBfnFYGFWf1z6dh7-tubjf0nAF3kV0gd/pub?gid=2011902930&single=true&output=csv${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          
          // B: FECHA (1), C: PLACA (2), H: NOMBRE DEL CONDUCTOR (7), J: VALIDADOR (9)
          const records = rows.slice(1)
            .filter(row => row && row[2]) // Placa en indice 2
            .map((row, i): PlateAdherence => {
              const validador = cleanSheetValue(row[9]);
              return {
                id: `adh-${i}`,
                date: parseFlexibleDate(row[1]),
                plate: normalizePlate(cleanSheetValue(row[2])),
                driverName: cleanSheetValue(row[7]),
                isValid: validador === '1'
              };
            });
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const fetchCorrectivesFromSheet = async (): Promise<Corrective[]> => {
  try {
    const rows = await fetchDataFromGAS(getCorrectivesDocId(), 'PROGRAMACION');
    
    if (!rows || rows.length < 1) {
      console.warn("GAS fetch correctives failed, attempting CSV fallback");
      return fetchCorrectivesFromSheetCSV();
    }

    const headers = rows[0].map((h: any) => cleanSheetValue(h).toUpperCase());
    return processCorrectiveRows(rows, headers);
  } catch (e) {
    console.error("Error fetching correctives from GAS:", e);
    return fetchCorrectivesFromSheetCSV();
  }
};

const fetchCorrectivesFromSheetCSV = async (): Promise<Corrective[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${getCorrectivesDocId()}/gviz/tq?tqx=out:csv&sheet=PROGRAMACION${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[];
          if (!rows || rows.length === 0) { resolve([]); return; }
          const records = rows
            .filter(row => row && (row['PLACA'] || row[3])) 
            .map((row, i): Corrective => {
              const getValue = (key: string, index: number) => row[key] || row[index] || '';
              return {
                id: `corr-${i}`,
                date: parseFlexibleDate(getValue('FECHA DE PROGRAMACION', 0)),
                contractor: cleanSheetValue(getValue('CONTRATISTA', 1)),
                cd: cleanSheetValue(getValue('CENTRO DE DISTRIBUCION', 2)),
                plate: normalizePlate(cleanSheetValue(getValue('PLACA', 3))),
                system: cleanSheetValue(getValue('SISTEMA', 4)),
                novelty: cleanSheetValue(getValue('NOVEDADES CORRECTIVAS', 5)),
                workshop: cleanSheetValue(getValue('TALLER PROPUESTO', 6)),
                status: cleanSheetValue(getValue('ESTADO', 7)),
                exitDate: parseFlexibleDate(getValue('FECHA DE SALIDA', 8)),
                evidence1: cleanSheetValue(getValue('EVIDDENCIA 1', 9)),
                evidence2: cleanSheetValue(getValue('EVIDENCIA 2', 10)),
                evidence3: cleanSheetValue(getValue('ENVIDENCIA', 11)),
                evidence4: cleanSheetValue(getValue('EVIDENCIA 4', 12))
              };
            });
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processCorrectiveRows = (rows: any[][], headers: string[]): Corrective[] => {
  return rows.slice(1)
    .filter(row => row && (cleanSheetValue(row[3]) || cleanSheetValue(row[headers.indexOf('PLACA')])))
    .map((row, i): Corrective => {
      const getV = (key: string, idx: number) => {
        const hIdx = headers.indexOf(key.toUpperCase());
        return cleanSheetValue(row[hIdx !== -1 ? hIdx : idx]);
      };
      
      return {
        id: `corr-${i}`,
        date: parseFlexibleDate(getV('FECHA DE PROGRAMACION', 0)),
        contractor: getV('CONTRATISTA', 1),
        cd: getV('CENTRO DE DISTRIBUCION', 2),
        plate: normalizePlate(getV('PLACA', 3)),
        system: getV('SISTEMA', 4),
        novelty: getV('NOVEDADES CORRECTIVAS', 5),
        workshop: getV('TALLER PROPUESTO', 6),
        status: getV('ESTADO', 7),
        exitDate: parseFlexibleDate(getV('FECHA DE SALIDA', 8)),
        evidence1: getV('EVIDDENCIA 1', 9),
        evidence2: getV('EVIDENCIA 2', 10),
        evidence3: getV('ENVIDENCIA', 11),
        evidence4: getV('EVIDENCIA 4', 12)
      };
    });
};

const sendToGAS = async (payload: any, url: string = getGoogleScriptUrl(), useCors: boolean = true) => {
  console.log(`🚀 Enviando a GAS (${payload.method}) [useCors=${useCors}]:`, payload);
  const targetUrl = sanitizeScriptUrl(url) || DEFAULT_WORKING_SCRIPT_URL;

  if (useCors) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      if (!text || text.includes("<!DOCTYPE html") || text.includes("Page Not Found")) {
        throw new Error("Respuesta no válida de Apps Script");
      }
      try {
        const result = JSON.parse(text);
        console.log(`✅ Respuesta GAS (${payload.method}):`, result);
        return result;
      } catch {
        return text || true;
      }
    } catch (err) {
      console.warn(`GAS - Intento CORS superó límite o falló (${payload.method}), ejecutando envío no-cors:`, err);
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log(`✅ Envío no-cors exitoso para ${payload.method}`);
    return true;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`GAS - Envío en segundo plano (${payload.method}) continuará en Apps Script.`);
    } else {
      console.error(`GAS - Error en envío no-cors (${payload.method}):`, err);
    }
    return false;
  }
};

export const submitDocumentUpdateToSheet = async (data: any): Promise<void> => { 
  const rawDocId = getRoutinesDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  try {
    const result = await sendToGAS({ method: 'POST_DOC_UPDATE', data: { ...data, docId } }, getGoogleScriptUrl(), true); 
    if (result && typeof result === 'object') {
      if ((result as any).status === 'success') {
        return;
      } else {
        console.error("GAS error:", (result as any).message);
        throw new Error((result as any).message || "Error al actualizar documento en el servidor");
      }
    }
    if (result === true) {
      return;
    }
  } catch (err) {
    console.warn("GAS - Envío de actualización de documento con CORS falló, intentando fallback no-cors:", err);
  }

  // Fallback seguro usando modo no-cors (fire-and-forget)
  const success = await sendToGAS({ method: 'POST_DOC_UPDATE', data: { ...data, docId } }, getGoogleScriptUrl(), false);
  if (!success) {
    throw new Error("Error al actualizar documento en el servidor");
  }
};

export const submitReportToSheet = async (report: Report): Promise<void> => { 
  const rawDocId = getRoutinesDocId();
  const docId = cleanSpreadsheetId(rawDocId);

  const sanitizedReport = {
    ...report,
    id: report.id || `OT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    plate: normalizePlate(report.plate || ''),
    date: report.date || new Date().toISOString().split('T')[0],
    source: report.source || 'CONDUCTOR',
    novelty: report.novelty || '',
    status: report.status || 'PENDIENTES',
    docId
  };

  try {
    const result = await sendToGAS({ method: 'POST_REPORT', data: sanitizedReport }, WORKSHOP_SCRIPT_URL, true); 
    if (result && typeof result === 'object') {
      if ((result as any).status === 'success') {
        return;
      } else {
        console.error("GAS error:", (result as any).message);
        throw new Error((result as any).message || "Error al registrar novedad en el servidor");
      }
    }
    if (result === true) {
      return;
    }
  } catch (err) {
    console.warn("GAS - Envío de novedad con CORS falló, intentando fallback no-cors:", err);
  }

  // Fallback seguro usando modo no-cors (fire-and-forget)
  const success = await sendToGAS({ method: 'POST_REPORT', data: sanitizedReport }, WORKSHOP_SCRIPT_URL, false);
  if (!success) {
    throw new Error("Error al registrar novedad en el servidor");
  }
};
export const submitMileageToSheet = async (mileageData: any): Promise<void> => { 
  const rawDocId = getMileageDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  const normalizedPlate = normalizePlate(mileageData.plate || mileageData.PLACA || mileageData.placa || '');
  const weekVal = mileageData.week !== undefined && mileageData.week !== null && mileageData.week !== ''
    ? mileageData.week.toString()
    : `SEMANA ${getWeekNumber(new Date(mileageData.date || Date.now()))}`;

  const payloadData = { 
    ...mileageData, 
    plate: normalizedPlate,
    mileage: Number(mileageData.mileage || mileageData.KILOMETRAJE || mileageData.kilometraje || 0),
    cd: mileageData.cd || 'GENERAL',
    contractor: mileageData.contractor || 'GENERAL',
    date: mileageData.date || new Date().toISOString().split('T')[0],
    week: weekVal,
    sheetName: 'KILOMETRAJE', 
    docId 
  };

  try {
    // Intentar primero con CORS activado para poder validar la respuesta
    const result = await sendToGAS({ method: 'POST_MILEAGE', data: payloadData }, MILEAGE_SCRIPT_URL, true); 
    if (result && typeof result === 'object') {
      if ((result as any).status === 'success') {
        return;
      } else {
        console.error("GAS error:", (result as any).message);
        throw new Error((result as any).message || "Error al guardar en el servidor");
      }
    }
    if (result === true) {
      return;
    }
  } catch (err) {
    console.warn("GAS - Envío con CORS falló, intentando fallback no-cors:", err);
  }

  // Fallback seguro usando modo no-cors (fire-and-forget)
  const success = await sendToGAS({ method: 'POST_MILEAGE', data: payloadData }, MILEAGE_SCRIPT_URL, false);
  if (!success) {
    throw new Error("Error al guardar en el servidor");
  }
};
export const submitCalibrationToSheet = async (calibrationDate: any): Promise<void> => { 
  const rawDocId = getCalibrationsDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  try {
    const result = await sendToGAS({ method: 'POST_CALIBRATION', data: { ...calibrationDate, docId } }, CALIBRATIONS_SCRIPT_URL, true); 
    if (result && typeof result === 'object') {
      if ((result as any).status === 'success') {
        return;
      } else {
        console.error("GAS error:", (result as any).message);
        throw new Error((result as any).message || "Error al guardar en el servidor");
      }
    }
    if (result === true) {
      return;
    }
  } catch (err) {
    console.warn("GAS - Envío de calibración con CORS falló, intentando fallback no-cors:", err);
  }

  const success = await sendToGAS({ method: 'POST_CALIBRATION', data: { ...calibrationDate, docId } }, CALIBRATIONS_SCRIPT_URL, false);
  if (!success) {
    throw new Error("Error al guardar la calibración en el servidor");
  }
};

export const submitCalibrationUpdateToSheet = async (data: any): Promise<void> => { 
  const rawDocId = getCalibrationsDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  try {
    const result = await sendToGAS({ method: 'POST_CALIBRATION_UPDATE', data: { ...data, docId } }, CALIBRATIONS_SCRIPT_URL, true); 
    if (result && typeof result === 'object') {
      if ((result as any).status === 'success') {
        return;
      } else {
        console.error("GAS error:", (result as any).message);
        throw new Error((result as any).message || "Error al guardar en el servidor");
      }
    }
    if (result === true) {
      return;
    }
  } catch (err) {
    console.warn("GAS - Envío de actualización de calibración con CORS falló, intentando fallback no-cors:", err);
  }

  const success = await sendToGAS({ method: 'POST_CALIBRATION_UPDATE', data: { ...data, docId } }, CALIBRATIONS_SCRIPT_URL, false);
  if (!success) {
    throw new Error("Error al actualizar la calibración en el servidor");
  }
};

export const submitWashToSheet = async (washData: any): Promise<void> => { 
  const rawDocId = getWashDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  const normalizedPlate = normalizePlate(washData.plate || washData.PLACA || washData.placa || '');
  const dateVal = washData.date || new Date().toISOString().split('T')[0];
  const weekVal = washData.week !== undefined && washData.week !== null && washData.week !== ''
    ? washData.week.toString()
    : `SEMANA ${getWeekNumber(new Date(dateVal))}`;
  const monthVal = washData.month || new Date(dateVal + 'T12:00:00').toLocaleString('es-ES', { month: 'long' }).toUpperCase();

  const payloadData = { 
    ...washData, 
    plate: normalizedPlate,
    date: dateVal,
    week: weekVal,
    month: monthVal,
    sheetName: 'LAVADOS', 
    docId 
  };

  try {
    const result = await sendToGAS({ method: 'POST_WASH', data: payloadData }, WASH_SCRIPT_URL, true); 
    if (result && typeof result === 'object') {
      if ((result as any).status === 'success') {
        return;
      } else {
        console.error("GAS error:", (result as any).message);
        throw new Error((result as any).message || "Error al guardar el lavado en el servidor");
      }
    }
    if (result === true) {
      return;
    }
  } catch (err) {
    console.warn("GAS - Envío de lavado con CORS falló, intentando fallback no-cors:", err);
  }

  const success = await sendToGAS({ method: 'POST_WASH', data: payloadData }, WASH_SCRIPT_URL, false);
  if (!success) {
    throw new Error("Error al guardar el lavado en el servidor");
  }
};

export const submitCleaningToSheet = async (cleaningData: any): Promise<void> => { 
  const rawDocId = getCleaningDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  try {
    const result = await sendToGAS({ method: 'POST_CLEANING', data: { ...cleaningData, docId } }, CLEANING_5S_SCRIPT_URL, true); 
    if (result && typeof result === 'object') {
      if ((result as any).status === 'success') {
        return;
      } else {
        console.error("GAS error:", (result as any).message);
        throw new Error((result as any).message || "Error al guardar en el servidor");
      }
    }
    if (result === true) {
      return;
    }
  } catch (err) {
    console.warn("GAS - Envío de limpieza con CORS falló, intentando fallback no-cors:", err);
  }

  const success = await sendToGAS({ method: 'POST_CLEANING', data: { ...cleaningData, docId } }, CLEANING_5S_SCRIPT_URL, false);
  if (!success) {
    throw new Error("Error al guardar la limpieza en el servidor");
  }
};
export const submitWorkshopVisitUpdateToSheet = async (visitData: any): Promise<{success: boolean, message?: string}> => { 
  try {
    const rawDocId = getRoutinesDocId();
    const docId = cleanSpreadsheetId(rawDocId);
    const result = await sendToGAS({ method: 'POST_WORKSHOP_VISIT_UPDATE', data: { ...visitData, docId } }, WORKSHOP_SCRIPT_URL); 
    return {
      success: !!result,
      message: typeof result === 'string' ? result : undefined
    };
  } catch (error) {
    console.error("Error al actualizar visita:", error);
    return { success: false, message: "Error de conexión" };
  }
};
export const submitWorkshopRecordToSheet = async (data: any): Promise<void> => { 
  await sendToGAS({ 
    method: 'POST_WORKSHOP_RECORD', 
    data: {
      ...data,
      docId: '1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo'
    } 
  }, getWorkshopScriptUrl()); 
};

/**
 * DRIVE UPLOAD
 */
export const uploadImageToDrive = async (base64Data: string, fileName: string): Promise<string> => {
  try {
    const payload = {
      method: 'UPLOAD_IMAGE',
      data: {
        base64: base64Data,
        name: fileName
      }
    };
    
    const response = await fetch(getGoogleScriptUrl(), {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.status === 'success') {
      return result.message; // El URL viene en el campo message según el formato estándar de GAS
    }
    throw new Error(result.message || 'Error al subir a Drive');
  } catch (error) {
    console.error("Error uploadImageToDrive:", error);
    throw error;
  }
};

/**
 * PREVENTIVOS (GID 2086109634)
 */
export const fetchPreventivesFromSheet = async (): Promise<Preventive[]> => {
  try {
    const docId = getPreventivesDocId();
    const rows = await fetchDataFromGAS(docId, 'PREVENTIVO', PREVENTIVES_SCRIPT_URL);
    if (!rows || rows.length < 2) {
      return fetchPreventivesFromSheetCSV();
    }
    return processPreventiveRows(rows);
  } catch (e) { 
    return fetchPreventivesFromSheetCSV(); 
  }
};

const fetchPreventivesFromSheetCSV = async (): Promise<Preventive[]> => {
  try {
    const docId = getPreventivesDocId();
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=PREVENTIVO${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processPreventiveRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const processPreventiveRows = (rows: any[][]): Preventive[] => {
  return rows.slice(1)
    .filter(row => row && row[5]) // Placa en indice 5
    .map((row, i): Preventive => {
      const placa = normalizePlate(cleanSheetValue(row[5]));
      const valCumplimiento = parseInt(cleanSheetValue(row[13])) || 0;
      
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (valCumplimiento === 0) status = 'critical';
      else {
        const diff = parseInt(cleanSheetValue(row[11])) || 0;
        if (diff > 200) status = 'warning'; // Pequeña tolerancia de advertencia
      }

      return {
        id: `prev-${placa}-${i}`,
        semProgramado: cleanSheetValue(row[0]),
        fechaProgramada: parseFlexibleDate(row[1]),
        semEjecucion: cleanSheetValue(row[2]),
        mes: cleanSheetValue(row[3]),
        fechaEjecucion: parseFlexibleDate(row[4]),
        placa: placa,
        frecuencia: parseInt(cleanSheetValue(row[6])) || 0,
        ultimoKm: parseInt(cleanSheetValue(row[7])) || 0,
        proximoKm: parseInt(cleanSheetValue(row[8])) || 0,
        kmRegistrado: parseInt(cleanSheetValue(row[9])) || 0,
        tipo: cleanSheetValue(row[10]),
        diferencia: parseInt(cleanSheetValue(row[11])) || 0,
        cumplimientoRango: cleanSheetValue(row[12]),
        validaccionCumplimiento: valCumplimiento,
        cumplimientoProgramacion: parseInt(cleanSheetValue(row[14])) || 0,
        evidenceUrl: cleanSheetValue(row[18]),
        cd: cleanSheetValue(row[16]) || 'GENERAL',
        linea: cleanSheetValue(row[17]),
        status
      };
    });
};

export const submitCorrectiveUpdateToSheet = async (data: any): Promise<{success: boolean, message?: string}> => { 
  try {
    const result = await sendToGAS({ method: 'POST_CORRECTIVE_UPDATE', data }, getDailyProgramScriptUrl()); 
    // sendToGAS actualmente devuelve boolean, vamos a ajustarlo
    return {
      success: !!result,
      message: typeof result === 'string' ? result : undefined
    };
  } catch (error) {
    console.error("Error al enviar a GAS:", error);
    return { success: false, message: "Error de conexión" };
  }
};
export const submitFineToSheet = async (data: any): Promise<boolean> => {
  const method = data.updateMode ? 'POST_FINE_UPDATE' : 'POST_FINE';
  return await sendToGAS({ method, data }, getFinesScriptUrl());
};

export const getMockOperators = (): OperatorRecord[] => {
  const providers = ["OPERADOR LOGÍSTICO SAS", "LOGISFLOTA S.A.", "SOLUCIONES LOGISTICAS ABC"];
  const names = [
    "Juan Carlos Pérez Maldonado",
    "Andrés Felipe Mendoza Cantillo",
    "Carlos Julio Rodríguez Suárez",
    "Luis Eduardo Gómez Silva",
    "Jorge Mario Restrepo Díaz",
    "José Antonio Beltrán Vargas",
    "Mauricio Alejandro Soto Rojas",
    "Cristian Camilo Torres Hoyos",
    "Franklin Javier Ortega Solís",
    "Orlando de Jesús Castillo Cantillo"
  ];
  const positions = ["Operador de Montacargas", "Técnico de Patio", "Supervisor de Operaciones", "Operador de Planta"];
  const categories = ["C1", "C2", "C3", "B1"];
  
  return names.map((name, i) => {
    const identification = `${80123450 + i}`;
    const cd = i % 2 === 0 ? "GALAPA" : "LA ARENOSA";
    const provider = providers[i % providers.length];
    const category = categories[i % categories.length];
    const position = positions[i % positions.length];
    
    // We want some expiring and some valid items:
    const daysOffsetLicense = [83, -15, 200, 310, 5, -2, 120, 15, 3, -1][i % 10];
    const daysOffsetCourse = [120, 45, -5, 180, 220, 30, -10, 90, 4, -8][i % 10];
    const daysOffsetExam = [250, 150, 10, -12, 180, 50, -4, 300, 2, -2][i % 10];
    const daysOffsetOpm = [-13, 100, 80, 15, -2, 210, 340, 60, -1, 5][i % 10];

    const makeDateAndDays = (daysOffset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      const dateStr = d.toISOString().split('T')[0];
      return { dateStr, daysPending: daysOffset };
    };

    const lic = makeDateAndDays(daysOffsetLicense);
    const crs = makeDateAndDays(daysOffsetCourse);
    const exm = makeDateAndDays(daysOffsetExam);
    const opm = makeDateAndDays(daysOffsetOpm);

    return {
      id: `fallback-op-${i}-${identification}`,
      cd,
      provider,
      name,
      identification,
      position,
      hireDate: "2023-04-12",
      licenseExpiry: lic.dateStr,
      licenseDaysPending: lic.daysPending,
      category,
      restrictions: "Ninguna",
      fines: i % 4 === 0 ? "1 Multa Pendiente" : "Ninguna",
      courseExpiry: crs.dateStr,
      courseDaysPending: crs.daysPending,
      entity: "Sena / Colfecar",
      examStatus: i % 5 === 0 ? "APTO CON RECOMENDACIONES" : "APTO",
      examExpiry: exm.dateStr,
      examDaysPending: exm.daysPending,
      opmCourseDate: "2025-05-10",
      opmExpiry: opm.dateStr,
      opmDaysPending: opm.daysPending,
      opmEntity: "Centro de Capacitación Vial",
      licenseUrl: "https://example.com/mock-doc.pdf",
      courseUrl: "https://example.com/mock-doc.pdf",
      examUrl: "https://example.com/mock-doc.pdf",
      opmUrl: "https://example.com/mock-doc.pdf",
      photoUrl: ""
    };
  });
};

export const fetchOperatorsFromSheet = async (): Promise<OperatorRecord[]> => {
  try {
    const rows = await fetchDataFromGAS(OPERATORS_DOC_ID); // Get first sheet by default if MAESTRO name is wrong
    
    if (!rows || rows.length < 2) {
      console.warn("GAS fetch operators failed, attempting CSV fallback");
      return fetchOperatorsFromSheetCSV();
    }

    const parseDays = (val: any): number => {
      const cleaned = cleanSheetValue(val).replace(/[,.]/g, '');
      return parseInt(cleaned) || 0;
    };

    const HEADER_IDENTIFIER = "NOMBRES Y APELLIDOS";
    return rows.slice(1)
      .filter(row => row && row[3] && cleanSheetValue(row[3]) !== "" && cleanSheetValue(row[3]).toUpperCase() !== HEADER_IDENTIFIER)
      .map((row, i): OperatorRecord => {
      return {
        id: `op-${i}-${cleanSheetValue(row[3])}-${cleanSheetValue(row[4])}`,
        cd: cleanSheetValue(row[12]),
        provider: cleanSheetValue(row[2]),
        name: cleanSheetValue(row[3]),
        identification: cleanSheetValue(row[4]),
        position: cleanSheetValue(row[5]),
        hireDate: parseFlexibleDate(row[7]),
        licenseExpiry: parseFlexibleDate(row[14]),
        licenseDaysPending: parseDays(row[15]),
        category: cleanSheetValue(row[16]),
        restrictions: cleanSheetValue(row[17]),
        fines: cleanSheetValue(row[18]),
        courseExpiry: parseFlexibleDate(row[22]),
        courseDaysPending: parseDays(row[23]),
        entity: cleanSheetValue(row[24]),
        examStatus: cleanSheetValue(row[25]),
        examExpiry: parseFlexibleDate(row[26]),
        examDaysPending: parseDays(row[27]),
        opmCourseDate: parseFlexibleDate(row[28]),
        opmExpiry: parseFlexibleDate(row[29]),
        opmDaysPending: parseDays(row[30]),
        opmEntity: cleanSheetValue(row[31]),
        licenseUrl: cleanSheetValue(row[32]),
        courseUrl: cleanSheetValue(row[33]),
        examUrl: cleanSheetValue(row[34]),
        opmUrl: cleanSheetValue(row[35]),
        photoUrl: cleanSheetValue(row[36])
      };
    });
  } catch (e) {
    console.warn("Error fetching operators from GAS, using CSV fallback:", e);
    return fetchOperatorsFromSheetCSV();
  }
};

export const fetchAuditMasterListFromSheet = async (): Promise<AuditMasterVehicle[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${getAuditDocId()}/export?format=csv&gid=244265623${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length === 0) { resolve([]); return; }
          
          // Column B (1): Placa, C (2): Contratista, E (4): CD
          const records = rows.slice(1)
            .filter(r => r && r[1])
            .map(row => ({
              plate: normalizePlate(cleanSheetValue(row[1])),
              contractor: cleanSheetValue(row[2]),
              cd: cleanSheetValue(row[4])
            }));
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

const fetchOperatorsFromSheetCSV = async (): Promise<OperatorRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${OPERATORS_DOC_ID}/gviz/tq?tqx=out:csv&gid=2049753520${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) {
      console.warn("CSV fetch operators returned HTML or empty - using offline demo operator data");
      return getMockOperators();
    }

    const parseDays = (val: any): number => {
      const cleaned = cleanSheetValue(val).replace(/[,.]/g, '');
      return parseInt(cleaned) || 0;
    };

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve(getMockOperators()); return; }

          const HEADER_IDENTIFIER = "NOMBRES Y APELLIDOS";
          const operators = rows.slice(1)
            .filter(row => row && row[3] && cleanSheetValue(row[3]) !== "" && cleanSheetValue(row[3]).toUpperCase() !== HEADER_IDENTIFIER)
            .map((row, i): OperatorRecord => {
            return {
              id: `op-${i}-${cleanSheetValue(row[3])}-${cleanSheetValue(row[4])}`,
              cd: cleanSheetValue(row[12]),
              provider: cleanSheetValue(row[2]),
              name: cleanSheetValue(row[3]),
              identification: cleanSheetValue(row[4]),
              position: cleanSheetValue(row[5]),
              hireDate: parseFlexibleDate(row[7]),
              licenseExpiry: parseFlexibleDate(row[14]),
              licenseDaysPending: parseDays(row[15]),
              category: cleanSheetValue(row[16]),
              restrictions: cleanSheetValue(row[17]),
              fines: cleanSheetValue(row[18]),
              courseExpiry: parseFlexibleDate(row[22]),
              courseDaysPending: parseDays(row[23]),
              entity: cleanSheetValue(row[24]),
              examStatus: cleanSheetValue(row[25]),
              examExpiry: parseFlexibleDate(row[26]),
              examDaysPending: parseDays(row[27]),
              opmCourseDate: parseFlexibleDate(row[28]),
              opmExpiry: parseFlexibleDate(row[29]),
              opmDaysPending: parseDays(row[30]),
              opmEntity: cleanSheetValue(row[31]),
              licenseUrl: cleanSheetValue(row[32]),
              courseUrl: cleanSheetValue(row[33]),
              examUrl: cleanSheetValue(row[34]),
              opmUrl: cleanSheetValue(row[35]),
              photoUrl: cleanSheetValue(row[36])
            };
          });
          resolve(operators);
        },
        error: (err) => {
          console.warn("PapaParse error (operators), falling back to mock data:", err);
          resolve(getMockOperators());
        }
      });
    });
  } catch (e) {
    console.warn("Could not fetch operators online. Serving simulated/demo operators: ", e);
    return getMockOperators();
  }
};

export const submitControlTowerUpdateToSheet = async (data: any): Promise<boolean> => {
  return await sendToGAS({ method: 'POST_CONTROL_TOWER_UPDATE', data: { ...data, docId: getControlTowerDocId() } }, getGoogleScriptUrl(), true);
};

export const getMockControlTowerRecords = (): ControlTowerRecord[] => {
  const contractors = ["OPERADOR LOGÍSTICO SAS", "LOGISFLOTA S.A.", "COPETRAN"];
  const novelties = [
    "Fuga de aceite hidráulico en cilindro central",
    "Batería descargada - requiere cambio por vida útil",
    "Falla en sistema de frenos - pedal largo",
    "Luz direccional trasera izquierda inoperativa",
    "Alarma de reversa no suena",
    "Manguera del radiador agrietada",
    "Llantas lisas eje delantero",
    "Ruido extraño en mástil de elevación"
  ];
  const systems = ["Hidráulico", "Mecánico", "Eléctrico", "Luminarias/Espejos", "Sistema de Seguridad", "Mecánico", "Llantas", "Sistema de Elevación"];
  const plates = ["EST123", "TTT456", "XYZ789", "WQR321", "ABC789", "KJH123", "POB987", "MNH567"];
  const sources = ["Pre-operacional", "Torre de Control", "Inspección de Ruta", "Reporte Operador"];
  const statusList = ["Pendiente", "Cerrado", "En Proceso", "Cerrado"];
  const criticalities = ["Alta", "Media", "Baja", "Media"];

  return Array.from({ length: 12 }).map((_, i) => {
    const contractor = contractors[i % contractors.length];
    const cd = i % 2 === 0 ? "GALAPA" : "LA ARENOSA";
    const plate = plates[i % plates.length];
    const source = sources[i % sources.length];
    const novelty = novelties[i % novelties.length];
    const system = systems[i % systems.length];
    const status = statusList[i % statusList.length];
    const criticality = criticalities[i % criticalities.length];
    
    // We want realistic date string
    const d = new Date();
    d.setDate(d.getDate() - (i + 1));
    const reportDate = d.toISOString().split('T')[0];
    
    const solDate = status === "Cerrado" ? new Date(d.getTime() + 86400000).toISOString().split('T')[0] : "";
    const closureDays = status === "Cerrado" ? 1 : 0;
    const daysToClose = status === "Cerrado" ? 0 : i + 1;

    return {
      id: `fallback-ct-${i}-${plate}`,
      contractor,
      cd,
      reportDate,
      week: `W${Math.ceil((d.getDate() + 1) / 7)}`,
      month: d.toLocaleString('es-ES', { month: 'long' }).toUpperCase(),
      plate,
      source,
      novelty,
      system,
      status,
      criticality,
      solutionDate: solDate,
      closureDays,
      daysToClose,
      maintenanceCompliance: i % 3 === 0 ? "No Cumple" : "Cumple",
      maintenanceGoal: 95,
      workshopGoal: 90,
      workshopResponsePercentage: i % 4 === 0 ? 75 : 92,
      observations: status === "Cerrado" ? "Mantenimiento correctivo finalizado y aprobado por el supervisor." : "En espera de repuestos de almacén.",
      evidenceBefore: "",
      evidenceAfter: ""
    };
  });
};

export const fetchControlTowerFromSheet = async (): Promise<ControlTowerRecord[]> => {
  try {
    const docId = getControlTowerDocId();
    const scriptUrl = getGoogleScriptUrl();
    console.log("[fetchControlTowerFromSheet] Iniciando lectura. DocID:", docId, "| ScriptUrl:", scriptUrl);

    const rows = await fetchDataFromGAS(docId, 'CIERRE DE NOVEDADES', scriptUrl);
    console.log("[fetchControlTowerFromSheet] Filas recibidas de fetchDataFromGAS:", rows ? rows.length : 0);
    
    if (!rows || rows.length < 2) {
      console.warn("GAS fetch control tower failed, attempting CSV fallback");
      return fetchControlTowerFromSheetCSV();
    }

    const rowsWithoutHeader = rows.slice(1);
    const filteredRows = rowsWithoutHeader.filter(row => row && row[5]);
    console.log("[fetchControlTowerFromSheet] Filas sin encabezado:", rowsWithoutHeader.length, "| Filas después del filtro (.filter(row => row && row[5])):", filteredRows.length);

    if (rowsWithoutHeader.length > 0 && filteredRows.length === 0) {
      console.warn("[fetchControlTowerFromSheet] Ejemplo de primera fila recibida:", rowsWithoutHeader[0]);
    }

    return filteredRows.map((row, i): ControlTowerRecord => {
        const parseNum = (val: any) => {
          const clean = cleanSheetValue(val).replace('%', '').replace(',', '.').trim();
          return parseFloat(clean) || 0;
        };

        return {
          id: `ct-${i}-${cleanSheetValue(row[5])}`,
          contractor: cleanSheetValue(row[0]),
          cd: cleanSheetValue(row[1]),
          reportDate: parseFlexibleDate(row[2]),
          week: cleanSheetValue(row[3]),
          month: cleanSheetValue(row[4]),
          plate: normalizePlate(cleanSheetValue(row[5])),
          source: cleanSheetValue(row[6]),
          novelty: cleanSheetValue(row[7]),
          system: cleanSheetValue(row[8]),
          status: cleanSheetValue(row[9]),
          criticality: cleanSheetValue(row[10]),
          solutionDate: parseFlexibleDate(row[11]),
          closureDays: parseNum(row[12]),
          daysToClose: parseNum(row[13]),
          maintenanceCompliance: cleanSheetValue(row[14]),
          maintenanceGoal: parseNum(row[15]),
          workshopGoal: parseNum(row[16]),
          workshopResponsePercentage: parseNum(row[17]),
          observations: cleanSheetValue(row[18]),
          evidenceBefore: cleanSheetValue(row[19]),
          evidenceAfter: cleanSheetValue(row[20]),
        };
      });
  } catch (e) {
    console.warn("Error fetching control tower from GAS, using CSV fallback:", e);
    return fetchControlTowerFromSheetCSV();
  }
};

const fetchControlTowerFromSheetCSV = async (): Promise<ControlTowerRecord[]> => {
  try {
    const docId = getControlTowerDocId();
    const urls = [
      `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&sheet=CIERRE%20DE%20NOVEDADES${getCacheBuster()}`,
      `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=CIERRE%20DE%20NOVEDADES${getCacheBuster()}`,
      `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=${CONTROL_TOWER_GID}${getCacheBuster()}`
    ];

    for (const url of urls) {
      try {
        console.log("[fetchControlTowerFromSheetCSV] Intentando CSV fallback con URL:", url);
        const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
        const csvText = await response.text();
        if (csvText && !csvText.includes("<!DOCTYPE html") && csvText.length > 30) {
          const records = await new Promise<ControlTowerRecord[]>((resolve) => {
            Papa.parse(csvText, {
              header: false,
              skipEmptyLines: 'greedy',
              complete: (results) => {
                const rows = results.data as any[][];
                if (!rows || rows.length < 2) { resolve([]); return; }

                const rowsWithoutHeader = rows.slice(1);
                const filteredRows = rowsWithoutHeader.filter(row => row && row[5]);

                const parsed = filteredRows.map((row, i): ControlTowerRecord => {
                  const parseNum = (val: any) => {
                    const clean = cleanSheetValue(val).replace('%', '').replace(',', '.').trim();
                    return parseFloat(clean) || 0;
                  };

                  return {
                    id: `ct-${i}-${cleanSheetValue(row[5])}`,
                    contractor: cleanSheetValue(row[0]),
                    cd: cleanSheetValue(row[1]),
                    reportDate: parseFlexibleDate(row[2]),
                    week: cleanSheetValue(row[3]),
                    month: cleanSheetValue(row[4]),
                    plate: normalizePlate(cleanSheetValue(row[5])),
                    source: cleanSheetValue(row[6]),
                    novelty: cleanSheetValue(row[7]),
                    system: cleanSheetValue(row[8]),
                    status: cleanSheetValue(row[9]),
                    criticality: cleanSheetValue(row[10]),
                    solutionDate: parseFlexibleDate(row[11]),
                    closureDays: parseNum(row[12]),
                    daysToClose: parseNum(row[13]),
                    maintenanceCompliance: cleanSheetValue(row[14]),
                    maintenanceGoal: parseNum(row[15]),
                    workshopGoal: parseNum(row[16]),
                    workshopResponsePercentage: parseNum(row[17]),
                    observations: cleanSheetValue(row[18]),
                    evidenceBefore: cleanSheetValue(row[19]),
                    evidenceAfter: cleanSheetValue(row[20]),
                  };
                });
                resolve(parsed);
              },
              error: (err) => {
                console.warn("[fetchControlTowerFromSheetCSV] Error al parsear CSV:", err);
                resolve([]);
              }
            });
          });

          if (records.length > 0) {
            return records;
          }
        }
      } catch (err) {
        console.warn("[fetchControlTowerFromSheetCSV] Advertencia al intentar URL:", url, err);
      }
    }
  } catch (e) {
    console.warn("[fetchControlTowerFromSheetCSV] Error inesperado en fallback:", e);
  }

  console.warn("[fetchControlTowerFromSheetCSV] No se pudo obtener CSV válido, usando datos de demostración");
  return getMockControlTowerRecords();
};

export const submitAuditUpdateToSheet = async (data: any): Promise<boolean> => {
  return await sendToGAS({ method: 'POST_AUDIT_UPDATE', data }, getGoogleScriptUrl());
};

export const submitPreventiveUpdateToSheet = async (data: {
  plate: string;
  date: string;
  currentKm?: number;
  evidence: string | string[];
}): Promise<boolean> => {
  const rawDocId = getPreventivesDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  const result = await sendToGAS({ 
    method: 'POST_PREVENTIVE_UPDATE', 
    data: { ...data, docId } 
  }, PREVENTIVES_SCRIPT_URL, true);
  return result === true;
};

// Inicialización segura de valores por defecto únicamente si están vacíos
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const defaultId = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
    const defaultUrl = DEFAULT_WORKING_SCRIPT_URL;
    
    const currentUrl = localStorage.getItem('GOOGLE_SCRIPT_WEB_APP_URL');
    if (!currentUrl || !currentUrl.includes('AKfycbybbhQJ2o9Xs1fHtqbfG_zopNhCF39tTwwJX6lYGRzTAKoaY4euN2aAjPk4LKObyb-3nw')) {
      localStorage.setItem('GOOGLE_SCRIPT_WEB_APP_URL', defaultUrl);
    }
    
    const keys = [
      'GOOGLE_SPREADSHEET_WASH_ID',
      'GOOGLE_SPREADSHEET_CALIBRATIONS_ID',
      'GOOGLE_SPREADSHEET_CLEANING_ID',
      'GOOGLE_SPREADSHEET_MILEAGE_ID',
      'GOOGLE_SPREADSHEET_PREVENTIVES_ID',
      'GOOGLE_SPREADSHEET_CORRECTIVES_ID',
      'GOOGLE_SPREADSHEET_FINES_ID',
      'GOOGLE_SPREADSHEET_CONTROL_TOWER_ID',
      'GOOGLE_SPREADSHEET_AUDIT_ID',
      'GOOGLE_SPREADSHEET_AUDIT_QS_ID'
    ];
    const legacyList = [
      '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U',
      '1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo',
      '1WnzEFfVMTHZVVKWGTMLU2WjY-GIzSRpWz52i_Es0E1M',
      '1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0'
    ];
    keys.forEach(k => {
      const val = localStorage.getItem(k);
      if (!val || legacyList.includes(val.trim())) {
        localStorage.setItem(k, defaultId);
      }
    });

    const routinesStored = localStorage.getItem('GOOGLE_SPREADSHEET_ROUTINES_ID');
    if (!routinesStored || legacyList.includes(routinesStored.trim()) || routinesStored === '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU') {
      localStorage.setItem('GOOGLE_SPREADSHEET_ROUTINES_ID', ROUTINES_DEFAULT_DOC_ID);
    }
  } catch (e) {
    console.warn('Error running spreadsheet default initialization:', e);
  }
}

export const setRoutinesDocId = (docId: string): void => {
  localStorage.setItem('GOOGLE_SPREADSHEET_ROUTINES_ID', cleanSpreadsheetId(docId));
};

export const getWashDocId = (): string => {
  const stored = localStorage.getItem('GOOGLE_SPREADSHEET_WASH_ID');
  return cleanSpreadsheetId(stored || '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU');
};

export const setWashDocId = (docId: string): void => {
  localStorage.setItem('GOOGLE_SPREADSHEET_WASH_ID', cleanSpreadsheetId(docId));
};

export const getCalibrationsDocId = (): string => {
  const stored = localStorage.getItem('GOOGLE_SPREADSHEET_CALIBRATIONS_ID');
  return cleanSpreadsheetId(stored || '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU');
};

export const setCalibrationsDocId = (docId: string): void => {
  localStorage.setItem('GOOGLE_SPREADSHEET_CALIBRATIONS_ID', cleanSpreadsheetId(docId));
};

export const getCleaningDocId = (): string => {
  const stored = localStorage.getItem('GOOGLE_SPREADSHEET_CLEANING_ID');
  return cleanSpreadsheetId(stored || '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU');
};

export const setCleaningDocId = (docId: string): void => {
  localStorage.setItem('GOOGLE_SPREADSHEET_CLEANING_ID', cleanSpreadsheetId(docId));
};

export const getMileageDocId = (): string => {
  const stored = localStorage.getItem('GOOGLE_SPREADSHEET_MILEAGE_ID');
  return cleanSpreadsheetId(stored || '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU');
};

export const setMileageDocId = (docId: string): void => {
  localStorage.setItem('GOOGLE_SPREADSHEET_MILEAGE_ID', cleanSpreadsheetId(docId));
};

export const getPreventivesDocId = (): string => {
  const stored = localStorage.getItem('GOOGLE_SPREADSHEET_PREVENTIVES_ID');
  return cleanSpreadsheetId(stored || '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU');
};

export const setPreventivesDocId = (docId: string): void => {
  localStorage.setItem('GOOGLE_SPREADSHEET_PREVENTIVES_ID', cleanSpreadsheetId(docId));
};

export const setCampaignsDocId = (docId: string): void => {
  localStorage.setItem('GOOGLE_SPREADSHEET_CAMPAIGNS_ID', cleanSpreadsheetId(docId));
};

export const getCampaignsScriptUrl = (): string => {
  return localStorage.getItem('GOOGLE_SCRIPT_CAMPAIGNS_URL') || 'https://script.google.com/macros/s/AKfycbwTew4EWzQXWQ2PRkk20-sRkDQBKnrDf-KEHbto7nj5cUHAppvP8k14dx7C9fM_6Sz-/exec';
};

export const setCampaignsScriptUrl = (url: string): void => {
  localStorage.setItem('GOOGLE_SCRIPT_CAMPAIGNS_URL', url.trim());
};

export const getCampaignSheetRows = async (sheetName: string): Promise<any[][] | null> => {
  const rawDocId = getCampaignsDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  if (!docId) {
    console.warn("No Google Spreadsheet ID configured for Campaigns.");
    return null;
  }
  // Intenta primero con el script unificado de la app
  let rows = await fetchDataFromGAS(docId, sheetName, getGoogleScriptUrl());
  if (!rows) {
    // Si falla, intenta con el script de campañas específico
    rows = await fetchDataFromGAS(docId, sheetName, getCampaignsScriptUrl());
  }
  if (!rows) {
    // Si ambos fallan, intenta con el fallback CSV directo
    console.warn(`GAS fetch campaigns failed for ${sheetName}, trying CSV fallback...`);
    rows = await fetchCampaignSheetRowsCSV(docId, sheetName);
  }
  return rows;
};

const fetchCampaignSheetRowsCSV = async (docId: string, sheetName: string): Promise<any[][] | null> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) {
      console.warn(`CSV Fallback for campaign ${sheetName} returned HTML/empty content. Check spreadsheet permissions.`);
      return null;
    }
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          resolve(results.data as any[][]);
        },
        error: () => resolve(null)
      });
    });
  } catch (e) {
    console.error(`Error fetching campaigns via CSV fallback for ${sheetName}:`, e);
    return null;
  }
};

export const submitCampaignToSheet = async (campaignData: {
  sheetName: string;
  semana: string;
  mes: string;
  fecha: string;
  plate: string;
  taller: string;
  observacion: string;
  evidence1?: string;
  evidence2?: string;
  evidence3?: string;
}): Promise<boolean> => {
  const rawDocId = getCampaignsDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  if (!docId) {
    console.warn("No Google Spreadsheet ID configured for Campaigns.");
    return false;
  }
  try {
    const result = await sendToGAS({
      method: 'POST_CAMPAIGN',
      data: {
        ...campaignData,
        docId
      }
    }, getCampaignsScriptUrl(), true);

    if (result && typeof result === 'object') {
      if ((result as any).status === 'success') {
        return true;
      } else {
        console.error("GAS error:", (result as any).message);
        throw new Error((result as any).message || "Error al guardar en Google Sheets.");
      }
    }
    if (result === true) return true;
  } catch (err) {
    console.warn("GAS - Envío de campaña con CORS falló, intentando fallback no-cors:", err);
  }

  // Fallback seguro no-cors
  const success = await sendToGAS({
    method: 'POST_CAMPAIGN',
    data: {
      ...campaignData,
      docId
    }
  }, getCampaignsScriptUrl(), false);

  return success;
};

export const submitRoutineToSheet = async (execution: any): Promise<boolean> => {
  const rawDocId = getRoutinesDocId();
  const docId = cleanSpreadsheetId(rawDocId);
  if (!docId) {
    console.warn("No Google Spreadsheet ID configured for Routines. Storing only locally.");
    return false;
  }
  const scriptUrl = ROUTINES_SCRIPT_URL;
  try {
    const result = await sendToGAS({
      method: 'POST_ROUTINE',
      data: {
        ...execution,
        docId
      }
    }, scriptUrl, true);

    if (result && typeof result === 'object') {
      if ((result as any).status === 'success') {
        return true;
      } else {
        console.error("GAS error:", (result as any).message);
        throw new Error((result as any).message || "Error desconocido en Google Apps Script.");
      }
    }
    if (result === true) return true;
  } catch (err) {
    console.warn("GAS - Envío de rutina con CORS falló, intentando fallback no-cors:", err);
  }

  // Fallback seguro no-cors
  const success = await sendToGAS({
    method: 'POST_ROUTINE',
    data: {
      ...execution,
      docId
    }
  }, scriptUrl, false);

  return success;
};

export const fetchAuditRecordsFromSheet = async (): Promise<AuditRecord[]> => {
  try {
    const rows = await fetchDataFromGAS(getAuditDocId(), 'ESTANDAR', getGoogleScriptUrl());
    
    if (!rows || rows.length < 2) {
      return fetchAuditRecordsFromSheetCSV();
    }

    return processAuditRows(rows);
  } catch (e) {
    console.error("Error fetching audits from GAS:", e);
    return fetchAuditRecordsFromSheetCSV();
  }
};

const fetchAuditRecordsFromSheetCSV = async (): Promise<AuditRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${getAuditDocId()}/gviz/tq?tqx=out:csv&sheet=ESTANDAR${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          resolve(processAuditRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const FLEET_STANDARD_SECURITY_ITEMS = [
  'Cinturones de seguridad', 'Cinturones de seguridad 3 puntos', 'Sillas', 'Telemetría', 'Caja fuerte',
  'Botiquín', 'Extintor', 'Dashcam', 'Cámaras auxiliares laterales', 'Vidrios y espejos',
  '3 Puntos de apoyo', 'Accesos a cabina', 'Calapies', 'Seguros de puerta', 'Claxón / Bocina',
  'Sistema de iluminación', 'Sistema de frenos', 'Cámara reversa', 'Sensor proximidad punto ciego',
  'Sensor proximidad marcha atrás', 'Seguros de cortinas', 'Manijas de acceso', 'Peldaños o estribos',
  'Neumáticos', 'Parales', 'Kit de carretera (Conos/Paleta/Tacos)', 'Kit de carretera (Herramientas)'
];

export const FLEET_STANDARD_QUALITY_ITEMS = [
  'Carpas y/o Cortinas', 'Soportes para PFN', 'Techo carrocería', 'Cumplimiento 5S', 
  'Correas de amarre y malacates', 'Carretillas'
];

export const fetchFleetStandardAuditFromSheet = async (): Promise<FleetStandardAudit[]> => {
  try {
    const csvRes = await fetchFleetStandardAuditFromSheetCSV();
    if (csvRes && csvRes.length > 0) {
      return csvRes;
    }
    const docIds = [
      getAuditQsDocId(),
      '1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM',
      '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs',
      getAuditDocId(),
      getControlTowerDocId()
    ];
    const uniqueDocIds = Array.from(new Set(docIds.filter(Boolean)));
    const sheets = ['ESTANDAR', 'ESTÁNDAR', 'DASHBOARD-ESTANDAR', 'ESTRANDAR', 'ESTANDAR FLOTA'];
    let rows: any[][] | null = null;

    for (const docId of uniqueDocIds) {
      for (const sheetName of sheets) {
        try {
          const fetched = await fetchDataFromGAS(docId, sheetName, getGoogleScriptUrl());
          if (fetched && fetched.length >= 2) {
            rows = fetched;
            break;
          }
        } catch (e) {
          // try next
        }
      }
      if (rows && rows.length >= 2) break;
    }

    if (rows && rows.length >= 2) {
      return processFleetStandardAuditRows(rows);
    }
    return [];
  } catch (e) {
    console.error("Error fetching Fleet Standard audits:", e);
    return fetchFleetStandardAuditFromSheetCSV();
  }
};

const fetchFleetStandardAuditFromSheetCSV = async (): Promise<FleetStandardAudit[]> => {
  const docIds = [
    getAuditQsDocId(),
    '1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM',
    '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs',
    getAuditDocId(),
    getControlTowerDocId()
  ];
  const uniqueDocIds = Array.from(new Set(docIds.filter(Boolean)));
  const sheets = ['ESTANDAR', 'ESTÁNDAR', 'DASHBOARD-ESTANDAR', 'ESTRANDAR', 'ESTANDAR FLOTA'];

  // Direct CSV export URLs for 1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM
  const directUrls = [
    `https://docs.google.com/spreadsheets/d/1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM/gviz/tq?tqx=out:csv&sheet=ESTANDAR${getCacheBuster()}`,
    `https://docs.google.com/spreadsheets/d/1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM/export?format=csv&sheet=ESTANDAR${getCacheBuster()}`
  ];

  for (const url of directUrls) {
    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
      const csvText = await response.text();
      if (csvText && !csvText.includes("<!DOCTYPE html") && csvText.length > 50) {
        const parsed = await new Promise<FleetStandardAudit[]>((resolve) => {
          Papa.parse(csvText, {
            header: false,
            skipEmptyLines: 'greedy',
            complete: (results) => {
              const rows = results.data as any[][];
              if (!rows || rows.length < 2) { resolve([]); return; }
              resolve(processFleetStandardAuditRows(rows));
            },
            error: () => resolve([])
          });
        });
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {
      // try next
    }
  }

  for (const docId of uniqueDocIds) {
    for (const sheetName of sheets) {
      const urls = [
        `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}${getCacheBuster()}`,
        `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}${getCacheBuster()}`
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
          const csvText = await response.text();
          
          if (csvText && !csvText.includes("<!DOCTYPE html") && csvText.length > 50) {
            const parsed = await new Promise<FleetStandardAudit[]>((resolve) => {
              Papa.parse(csvText, {
                header: false,
                skipEmptyLines: 'greedy',
                complete: (results) => {
                  const rows = results.data as any[][];
                  if (!rows || rows.length < 2) { resolve([]); return; }
                  resolve(processFleetStandardAuditRows(rows));
                },
                error: () => resolve([])
              });
            });
            if (parsed.length > 0) return parsed;
          }
        } catch (e) {
          // try next
        }
      }
    }
  }
  return [];
};

const processFleetStandardAuditRows = (rows: any[][]): FleetStandardAudit[] => {
  if (!rows || rows.length < 2) return [];

  const parseScore = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const clean = String(val).replace('%', '').replace(',', '.').trim();
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    return num <= 1 ? num * 100 : num;
  };

  const parseBinaryVal = (v: any): number => {
    const s = cleanSheetValue(v).toUpperCase();
    if (s === '1' || s === 'SI') return 1;
    if (s === '0' || s === 'NO') return 0;
    return parseInt(s) || 0;
  };

  // Auto-detect header indices if present
  const header = rows[0].map(c => String(c || '').toLowerCase().trim());
  let idxPlaca = header.findIndex(h => h.includes('placa'));
  let idxRegional = header.findIndex(h => h.includes('regional'));
  let idxCentro = header.findIndex(h => h.includes('centro') || h.includes('cd'));
  let idxTipo = header.findIndex(h => h.includes('tipo'));
  let idxAuditor = header.findIndex(h => (h === 'nombre' || h.includes('auditor')) && !h.includes('tipo'));
  let idxMes = header.findIndex(h => h.includes('mes'));
  let idxAño = header.findIndex(h => h.includes('año') || h.includes('year') || h.includes('ano'));

  if (idxPlaca === -1) idxPlaca = 8;
  if (idxRegional === -1) idxRegional = 4;
  if (idxCentro === -1) idxCentro = 5;
  if (idxTipo === -1) idxTipo = 6;
  if (idxAuditor === -1) idxAuditor = 7;
  if (idxMes === -1) idxMes = 43;
  if (idxAño === -1) idxAño = 44;

  return rows.slice(1)
    .filter(row => {
      if (!row || !Array.isArray(row)) return false;
      const p = cleanSheetValue(row[idxPlaca]) || cleanSheetValue(row[8]) || cleanSheetValue(row[10]) || cleanSheetValue(row[6]);
      return p.length >= 3;
    })
    .map((row, i): FleetStandardAudit => {
      let placaVal = cleanSheetValue(row[idxPlaca]);
      let regVal = cleanSheetValue(row[idxRegional]);
      let cdVal = cleanSheetValue(row[idxCentro]);
      let tipoVal = cleanSheetValue(row[idxTipo]);
      let auditorVal = cleanSheetValue(row[idxAuditor]);

      if (!placaVal || placaVal.length < 3) {
        if (cleanSheetValue(row[8]) && cleanSheetValue(row[8]).length >= 5) {
          placaVal = cleanSheetValue(row[8]);
        } else if (cleanSheetValue(row[10]) && cleanSheetValue(row[10]).length >= 5) {
          placaVal = cleanSheetValue(row[10]);
        }
      }

      // Binary Security Scores: Index 46 to 72 (27 items)
      const securityScores: number[] = [];
      for (let j = 0; j < 27; j++) {
        securityScores.push(parseBinaryVal(row[46 + j]));
      }

      // Binary Quality Scores: Index 73 to 78 (6 items)
      const qualityScores: number[] = [];
      for (let j = 0; j < 6; j++) {
        qualityScores.push(parseBinaryVal(row[73 + j]));
      }

      const mesVal = cleanSheetValue(row[idxMes]) || cleanSheetValue(row[43]) || 'ENERO';
      const anoVal = parseInt(cleanSheetValue(row[idxAño])) || parseInt(cleanSheetValue(row[44])) || 2026;

      return {
        id: cleanSheetValue(row[0]) || `std-audit-${i}`,
        startTime: cleanSheetValue(row[1]),
        endTime: cleanSheetValue(row[2]),
        email: cleanSheetValue(row[3]),
        regional: regVal || 'REGIONAL BARRANQUILLA',
        centro: cdVal || 'GENERAL',
        tipoAuditoria: tipoVal || 'Mensual del estándar',
        auditor: auditorVal || 'SISTEMA',
        placa: normalizePlate(placaVal),
        securityScores,
        qualityScores,
        scoreSegNoMand: parseScore(row[79]), // CB
        scoreCalNoMand: parseScore(row[80]), // CC
        scoreTotalNoMand: parseScore(row[81]), // CD
        scoreSegMand: parseScore(row[82]), // CE
        scoreCalMand: parseScore(row[83]), // CF
        scoreTotalMand: parseScore(row[84]), // CG
        observations: cleanSheetValue(row[42]), // AQ
        mes: mesVal,
        año: anoVal,
        tiempoMin: parseFloat(cleanSheetValue(row[45])) || 0, // AT
        evidenciaAntes: cleanSheetValue(row[85]), // CH
        fechaCierre: parseFlexibleDate(row[86]), // CI
        diasCierre: parseInt(cleanSheetValue(row[87])) || 0, // CJ
        estado: cleanSheetValue(row[88]), // CK
        evidenciaDespues: cleanSheetValue(row[89]) // CL
      };
    });
};

export const submitFleetStandardAuditUpdateToSheet = async (data: any): Promise<boolean> => {
  const result = await sendToGAS({ method: 'POST_FLEET_STANDARD_AUDIT_UPDATE', data: { ...data, docId: getAuditQsDocId() } }, getGoogleScriptUrl(), true);
  return !!result;
};

export const submitFleetCierreUpdateToSheet = async (data: any): Promise<boolean> => {
  const docIds = ['1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs', '1LdneoDkFwIdYf-7Xii94an5hzwuL2BqQlKqK2DQ3G60'];
  const uniqueDocIds = Array.from(new Set(docIds.filter(Boolean)));
  const payloadData = {
    ...data,
    placa: data.placa || data.plate || '',
    plate: data.plate || data.placa || '',
    estado: data.estado || data.status || '',
    status: data.status || data.estado || '',
    evidencia: data.evidencia || data.evidence || '',
    evidence: data.evidence || data.evidencia || '',
    verificacion: data.verificacion || data.verification || '',
    verification: data.verification || data.verificacion || ''
  };
  const results = await Promise.all(
    uniqueDocIds.map(docId =>
      sendToGAS({
        method: 'POST_FLEET_CIERRE_UPDATE',
        data: { ...payloadData, docId }
      }, getGoogleScriptUrl(), true)
    )
  );
  return results.some(r => !!r);
};

export const fetchFleetCierreFromSheet = async (): Promise<FleetCierreRecord[]> => {
  try {
    const csvRes = await fetchFleetCierreFromSheetCSV();
    if (csvRes && csvRes.length > 0) {
      return csvRes;
    }
    const docIds = [
      '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs',
      getAuditDocId(),
      '1LdneoDkFwIdYf-7Xii94an5hzwuL2BqQlKqK2DQ3G60',
      getControlTowerDocId()
    ];
    const uniqueDocIds = Array.from(new Set(docIds.filter(Boolean)));
    const sheets = ['CIERRE', 'CIERRE DE NOVEDADES', 'Cierre de Novedades', 'CIERRE1', 'CIERRE DE NOVEDAD'];
    let rows: any[][] | null = null;

    for (const docId of uniqueDocIds) {
      for (const sheetName of sheets) {
        try {
          const fetched = await fetchDataFromGAS(docId, sheetName, getGoogleScriptUrl());
          if (fetched && fetched.length >= 2) {
            rows = fetched;
            break;
          }
        } catch (e) {
          // try next
        }
      }
      if (rows && rows.length >= 2) break;
    }

    if (rows && rows.length >= 2) {
      return processFleetCierreRows(rows);
    }
    return [];
  } catch (e) {
    console.error("Error fetching fleet standard closure:", e);
    return fetchFleetCierreFromSheetCSV();
  }
};

const fetchFleetCierreFromSheetCSV = async (): Promise<FleetCierreRecord[]> => {
  const docIds = [
    '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs',
    getAuditDocId(),
    '1LdneoDkFwIdYf-7Xii94an5hzwuL2BqQlKqK2DQ3G60',
    getControlTowerDocId()
  ];
  const uniqueDocIds = Array.from(new Set(docIds.filter(Boolean)));
  const sheets = ['CIERRE', 'CIERRE DE NOVEDADES', 'Cierre de Novedades', 'CIERRE1', 'CIERRE DE NOVEDAD'];

  // Direct GID fallback for ESTÁNDAR FLOTA sheet 1993951123
  const directGidUrls = [
    `https://docs.google.com/spreadsheets/d/1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs/gviz/tq?tqx=out:csv&gid=1993951123${getCacheBuster()}`,
    `https://docs.google.com/spreadsheets/d/1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs/export?format=csv&gid=1993951123${getCacheBuster()}`,
    `https://docs.google.com/spreadsheets/d/1LdneoDkFwIdYf-7Xii94an5hzwuL2BqQlKqK2DQ3G60/export?format=csv&gid=1012312873${getCacheBuster()}`,
    `https://docs.google.com/spreadsheets/d/1LdneoDkFwIdYf-7Xii94an5hzwuL2BqQlKqK2DQ3G60/gviz/tq?tqx=out:csv&gid=1012312873${getCacheBuster()}`
  ];

  for (const url of directGidUrls) {
    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
      const csvText = await response.text();
      if (csvText && !csvText.includes("<!DOCTYPE html") && csvText.length > 50) {
        const parsed = await new Promise<FleetCierreRecord[]>((resolve) => {
          Papa.parse(csvText, {
            header: false,
            skipEmptyLines: 'greedy',
            complete: (results) => {
              const rows = results.data as any[][];
              if (!rows || rows.length < 2) { resolve([]); return; }
              resolve(processFleetCierreRows(rows));
            },
            error: () => resolve([])
          });
        });
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {
      // try next
    }
  }

  for (const docId of uniqueDocIds) {
    for (const sheetName of sheets) {
      const urls = [
        `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}${getCacheBuster()}`,
        `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}${getCacheBuster()}`
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
          const csvText = await response.text();
          
          if (csvText && !csvText.includes("<!DOCTYPE html") && csvText.length > 50) {
            const parsed = await new Promise<FleetCierreRecord[]>((resolve) => {
              Papa.parse(csvText, {
                header: false,
                skipEmptyLines: 'greedy',
                complete: (results) => {
                  const rows = results.data as any[][];
                  if (!rows || rows.length < 2) { resolve([]); return; }
                  resolve(processFleetCierreRows(rows));
                },
                error: () => resolve([])
              });
            });
            if (parsed.length > 0) return parsed;
          }
        } catch (e) {
          // try next
        }
      }
    }
  }
  return [];
};

const processFleetCierreRows = (rows: any[][]): FleetCierreRecord[] => {
  if (!rows || rows.length < 2) return [];

  const header = rows[0].map(c => String(c || '').toLowerCase().trim());
  let idxFecha = header.findIndex(h => h.includes('fecha'));
  let idxPlaca = header.findIndex(h => h.includes('placa'));
  let idxCD = header.findIndex(h => h.includes('cd') || h.includes('centro'));
  let idxContratista = header.findIndex(h => h.includes('contratista') || h.includes('empresa'));
  let idxItem = header.findIndex(h => h.includes('item') || h.includes('novedad') || h.includes('hallazgo'));
  let idxVerif = header.findIndex(h => h.includes('verificaci') || h.includes('observaci') || h.includes('accion') || h.includes('acción'));
  let idxEvid = header.findIndex(h => h.includes('evidenci') || h.includes('foto'));
  let idxEstado = header.findIndex(h => h.includes('estado') || h.includes('cierre') || h.includes('status'));

  if (idxFecha === -1) idxFecha = 0;
  if (idxCD === -1) idxCD = 1;
  if (idxPlaca === -1) idxPlaca = 2;
  if (idxItem === -1) idxItem = 3;
  if (idxVerif === -1) idxVerif = 4;
  if (idxEvid === -1) idxEvid = 5;
  if (idxEstado === -1) idxEstado = 6;

  if (idxContratista === idxItem || idxContratista === idxCD || idxContratista === idxPlaca) {
    idxContratista = -1;
  }

  return rows.slice(1)
    .filter(row => row && (cleanSheetValue(row[idxPlaca]) || cleanSheetValue(row[1]) || cleanSheetValue(row[2])))
    .map((row, i): FleetCierreRecord => {
      let pVal = cleanSheetValue(row[idxPlaca]);
      let cdVal = cleanSheetValue(row[idxCD]);

      if (!pVal || pVal.length < 3) {
        if (cleanSheetValue(row[2]) && cleanSheetValue(row[2]).length >= 5) {
          pVal = cleanSheetValue(row[2]);
          cdVal = cleanSheetValue(row[1]);
        } else if (cleanSheetValue(row[1]) && cleanSheetValue(row[1]).length >= 5) {
          pVal = cleanSheetValue(row[1]);
        }
      }

      const contratistaVal = idxContratista !== -1 ? cleanSheetValue(row[idxContratista]) : 'Otros';

      return {
        id: `cierre-${i}-${pVal}`,
        fecha: parseFlexibleDate(row[idxFecha]),
        placa: normalizePlate(pVal),
        cd: cdVal || 'GENERAL',
        contratista: contratistaVal || 'Otros',
        item: cleanSheetValue(row[idxItem]),
        verificacion: cleanSheetValue(row[idxVerif]),
        evidencia: cleanSheetValue(row[idxEvid]),
        estado: cleanSheetValue(row[idxEstado]) || 'PENDIENTE'
      };
    });
};

/* --- NUEVAS FUNCIONES PARA EL ESTANDAR DE CALIDAD Y SEGURIDAD (HOJA CIERRE1) --- */

export const submitCalidadCierreUpdateToSheet = async (data: {
  plate: string;
  item: string;
  status: string;
  evidence: string | string[];
  verification?: string;
}): Promise<boolean> => {
  const result = await sendToGAS({
    method: 'POST_CALIDAD_CIERRE_UPDATE',
    data: { ...data, docId: getAuditQsDocId() }
  }, getGoogleScriptUrl(), true);
  return !!result;
};

export const fetchCalidadCierreFromSheet = async (): Promise<FleetCierreRecord[]> => {
  try {
    const csvRes = await fetchCalidadCierreFromSheetCSV();
    if (csvRes && csvRes.length > 0) {
      return csvRes;
    }
    const docIds = [
      getAuditQsDocId(),
      '1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM',
      '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs'
    ];
    const uniqueDocIds = Array.from(new Set(docIds.filter(Boolean)));
    const sheets = ['CIERRE1', 'CIERRE DE NOVEDADES', 'Cierre de Novedades', 'CIERRE'];
    let rows: any[][] | null = null;

    for (const docId of uniqueDocIds) {
      for (const sheetName of sheets) {
        try {
          const fetched = await fetchDataFromGAS(docId, sheetName, getGoogleScriptUrl());
          if (fetched && fetched.length >= 2) {
            rows = fetched;
            break;
          }
        } catch (e) {
          // try next
        }
      }
      if (rows && rows.length >= 2) break;
    }

    if (rows && rows.length >= 2) {
      return processFleetCierreRows(rows);
    }
    return [];
  } catch (e) {
    console.error("Error fetching Calidad closure:", e);
    return fetchCalidadCierreFromSheetCSV();
  }
};

const fetchCalidadCierreFromSheetCSV = async (): Promise<FleetCierreRecord[]> => {
  const docIds = [
    getAuditQsDocId(),
    '1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM',
    '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs'
  ];
  const uniqueDocIds = Array.from(new Set(docIds.filter(Boolean)));
  const sheets = ['CIERRE1', 'CIERRE DE NOVEDADES', 'Cierre de Novedades', 'CIERRE'];

  const directUrls = [
    `https://docs.google.com/spreadsheets/d/1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM/gviz/tq?tqx=out:csv&sheet=CIERRE1${getCacheBuster()}`,
    `https://docs.google.com/spreadsheets/d/1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM/export?format=csv&sheet=CIERRE1${getCacheBuster()}`
  ];

  for (const url of directUrls) {
    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
      const csvText = await response.text();
      if (csvText && !csvText.includes("<!DOCTYPE html") && csvText.length > 50) {
        const parsed = await new Promise<FleetCierreRecord[]>((resolve) => {
          Papa.parse(csvText, {
            header: false,
            skipEmptyLines: 'greedy',
            complete: (results) => {
              const rows = results.data as any[][];
              if (!rows || rows.length < 2) { resolve([]); return; }
              resolve(processFleetCierreRows(rows));
            },
            error: () => resolve([])
          });
        });
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {
      // try next
    }
  }

  for (const docId of uniqueDocIds) {
    for (const sheetName of sheets) {
      const urls = [
        `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}${getCacheBuster()}`,
        `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}${getCacheBuster()}`
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
          const csvText = await response.text();
          
          if (csvText && !csvText.includes("<!DOCTYPE html") && csvText.length > 50) {
            const parsed = await new Promise<FleetCierreRecord[]>((resolve) => {
              Papa.parse(csvText, {
                header: false,
                skipEmptyLines: 'greedy',
                complete: (results) => {
                  const rows = results.data as any[][];
                  if (!rows || rows.length < 2) { resolve([]); return; }
                  resolve(processFleetCierreRows(rows));
                },
                error: () => resolve([])
              });
            });
            if (parsed.length > 0) return parsed;
          }
        } catch (e) {
          // try next
        }
      }
    }
  }
  return [];
};

const processCalidadCierreRows = (rows: any[][]): FleetCierreRecord[] => {
  return processFleetCierreRows(rows);
};

export const fetchSeguimientoFromSheet = async (): Promise<FleetSeguimientoRecord[]> => {
  try {
    const csvRes = await fetchSeguimientoFromSheetCSV();
    if (csvRes && csvRes.length > 0) {
      return csvRes;
    }
    const docId = AUDIT_DOC_ID;
    const rows = await fetchDataFromGAS(docId, 'SEGUIMIENTO', getGoogleScriptUrl());
    if (!rows || rows.length < 2) {
      return [];
    }
    return processSeguimientoRows(rows);
  } catch (e) {
    console.error("Error fetching seguimiento:", e);
    return fetchSeguimientoFromSheetCSV();
  }
};

const fetchSeguimientoFromSheetCSV = async (): Promise<FleetSeguimientoRecord[]> => {
  try {
    const docId = AUDIT_DOC_ID;
    const url = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&sheet=SEGUIMIENTO${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          resolve(processSeguimientoRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const formatMonthName = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim().toUpperCase();
  if (!str) return '';

  const MONTH_NAMES = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];

  // If numeric (e.g. 1..12, "1", "06", "6.0", etc.)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12 && (String(num) === str || str.startsWith(String(num)) || str.length <= 2 || str.endsWith('.0'))) {
    return MONTH_NAMES[num - 1];
  }

  // Exact match with month names
  const matchIdx = MONTH_NAMES.findIndex(m => m === str);
  if (matchIdx !== -1) return MONTH_NAMES[matchIdx];

  // Prefix match (e.g., JUN, JUL, SEP, etc.)
  const prefixIdx = MONTH_NAMES.findIndex(m => m.startsWith(str) && str.length >= 3);
  if (prefixIdx !== -1) return MONTH_NAMES[prefixIdx];

  return str;
};

const processSeguimientoRows = (rows: any[][]): FleetSeguimientoRecord[] => {
  if (!rows || rows.length < 2) return [];

  const headers = (rows[0] || []).map(h => String(h || '').trim().toUpperCase());
  
  // Reject form responses sheets (e.g. Tabla_1) if returned by mistake
  const isFormResponseHeader = headers.some(h => h.includes("HORA DE INICIO") || h.includes("CORREO ELECTRÓNICO") || h.includes("REGISTRE LA PLACA"));
  if (isFormResponseHeader) {
    console.warn("processSeguimientoRows received generic form response header instead of SEGUIMIENTO");
    return [];
  }

  let idxLlave = headers.findIndex(h => h.includes("LLAVE"));
  let idxFecha = headers.findIndex(h => h.includes("FECHA"));
  let idxMes = headers.findIndex(h => h === "MES" || h.includes("MES"));
  let idxCd = headers.findIndex(h => h === "CD" || h.includes("CENTRO") || h.includes("CD"));
  let idxContratista = headers.findIndex(h => h.includes("CONTRATISTA"));
  let idxPlaca = headers.findIndex(h => h.includes("PLACA") || h.includes("MATRICULA") || h.includes("MATRÍCULA"));
  let idxValidador = headers.findIndex(h => h.includes("VALIDADOR"));
  let idxEncargado = headers.findIndex(h => h.includes("ENCARCADO") || h.includes("ENCARGADO"));

  // Strict column fallbacks specified for SEGUIMIENTO sheet:
  // Col A (0): LLAVE
  // Col B (1): FECHA
  // Col C (2): MES
  // Col D (3): CD
  // Col E (4): contratista
  // Col F (5): PLACA / MATRÍCULA
  // Col G (6): VALIDADOR
  // Col H (7): ENCARCADO / ENCARGADO
  if (idxLlave === -1) idxLlave = 0;
  if (idxFecha === -1) idxFecha = 1;
  if (idxMes === -1) idxMes = 2;
  if (idxCd === -1) idxCd = 3;
  if (idxContratista === -1) idxContratista = 4;
  if (idxPlaca === -1) idxPlaca = 5;
  if (idxValidador === -1) idxValidador = 6;
  if (idxEncargado === -1) idxEncargado = 7;

  return rows.slice(1)
    .filter(row => row && (row[idxMes] || row[idxCd] || row[idxPlaca]))
    .map((row, i): FleetSeguimientoRecord => {
      const placaRaw = cleanSheetValue(row[idxPlaca]);
      return {
        id: `seg-${i}-${placaRaw || i}`,
        llave: cleanSheetValue(row[idxLlave]),
        fecha: cleanSheetValue(row[idxFecha]),
        mes: formatMonthName(cleanSheetValue(row[idxMes])),
        cd: cleanSheetValue(row[idxCd]) || 'GENERAL',
        contratista: cleanSheetValue(row[idxContratista]),
        placa: normalizePlate(placaRaw),
        validador: cleanSheetValue(row[idxValidador]),
        encargado: cleanSheetValue(row[idxEncargado]),
      };
    });
};

const processAuditRows = (rows: any[][]): AuditRecord[] => {
  const parseScore = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const clean = String(val).replace('%', '').replace(',', '.').trim();
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    return num <= 1 ? num * 100 : num;
  };

  const parseBin = (val: any): number => {
    const n = parseInt(String(val));
    return isNaN(n) ? 0 : n;
  };

  return rows.slice(1)
    .filter(row => row && row[10]) 
    .map((row, i): AuditRecord => {
      return {
        id: cleanSheetValue(row[0]) || `audit-${i}`,
        regional: cleanSheetValue(row[6]),
        cd: cleanSheetValue(row[7]),
        auditType: cleanSheetValue(row[8]),
        auditor: cleanSheetValue(row[9]),
        plate: normalizePlate(cleanSheetValue(row[10])),
        observations: cleanSheetValue(row[35]),
        month: cleanSheetValue(row[36]),
        year: parseInt(cleanSheetValue(row[37])) || 0,
        executionTime: parseFloat(cleanSheetValue(row[38])) || 0,
        docBin: row.slice(39, 49).map(parseBin),
        signBin: row.slice(49, 60).map(parseBin),
        imgBin: row.slice(60, 63).map(parseBin),
        docNoMand: parseScore(row[63]),
        signNoMand: parseScore(row[64]),
        imgNoMand: parseScore(row[65]),
        totalNoMand: parseScore(row[66]),
        docMand: parseScore(row[67]),
        signMand: parseScore(row[68]),
        imgMand: parseScore(row[69]),
        totalMand: parseScore(row[70]),
        date: parseFlexibleDate(row[1]) || parseFlexibleDate(row[2]) || '',
        noveltyDate: parseFlexibleDate(row[72]) || '',
        status: cleanSheetValue(row[73]) || 'PENDIENTE',
        evidence: cleanSheetValue(row[74]) || '',
        noveltyObservation: cleanSheetValue(row[75]) || '',
      };
    });
};

export const fetchMttrRecordsFromSheet = async (): Promise<WorkshopActivityRecord[]> => {
  try {
    const rows = await fetchDataFromGAS('17--v5BB9lXCljZUAFYhUuFHp8wFoT4cqky2wk5E-2xQ', 'DATA');
    if (!rows || rows.length === 0) {
      console.warn("GAS fetch MTTR records failed, attempting CSV fallback");
      return fetchMttrRecordsFromSheetCSV();
    }
    return processMttrRows(rows);
  } catch (e) {
    return fetchMttrRecordsFromSheetCSV();
  }
};

export const fetchMttrRecordsFromSheetCSV = async (): Promise<WorkshopActivityRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/17--v5BB9lXCljZUAFYhUuFHp8wFoT4cqky2wk5E-2xQ/export?format=csv&sheet=DATA${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processMttrRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) {
    console.error("Error fetching MTTR from CSV:", e);
    return [];
  }
};

export const fetchReingresosRecordsFromSheet = async (): Promise<WorkshopActivityRecord[]> => {
  try {
    const rows = await fetchDataFromGAS('17--v5BB9lXCljZUAFYhUuFHp8wFoT4cqky2wk5E-2xQ', 'BETA');
    if (!rows || rows.length === 0) {
      console.warn("GAS fetch Reingresos records failed, attempting CSV fallback for BETA");
      return fetchReingresosRecordsFromSheetCSV();
    }
    return processReingresosRows(rows);
  } catch (e) {
    return fetchReingresosRecordsFromSheetCSV();
  }
};

export const fetchReingresosRecordsFromSheetCSV = async (): Promise<WorkshopActivityRecord[]> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/17--v5BB9lXCljZUAFYhUuFHp8wFoT4cqky2wk5E-2xQ/export?format=csv&sheet=BETA${getCacheBuster()}`;
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          resolve(processReingresosRows(rows));
        },
        error: () => resolve([])
      });
    });
  } catch (e) {
    console.error("Error fetching Reingresos from CSV:", e);
    return [];
  }
};

// Parser specifically configured for DATA sheet (Time monitoring)
const processMttrRows = (rows: any[][]): WorkshopActivityRecord[] => {
  if (!rows || rows.length === 0) return [];

  // Default indices if no headers match:
  let placaIdx = 13;
  let mttrIdx = 5;
  let fechaIdx = 12;

  let contratistaIdx = 0; // Col A
  let sucursalIdx = 2; // Col C
  let vehiculoIdx = 3; // Col D
  let proveedorIdx = 4; // Col E
  let revisionIdx = 5; // Col F
  let cdIdx = 14; // Col O
  let componentesIdx = 15; // Col P
  let sistemaIdx = 16; // Col Q
  let insumosIdx = 17; // Col R
  let actividadIdx = 18; // Col S
  let tipoIngresoIdx = 21; // Col V

  // Dynamic header check
  const headers = rows[0].map(h => cleanSheetValue(h).toUpperCase());
  if (headers.length > 0) {
    const findIndex = (searchTerms: string[], defaultVal: number): number => {
      const idx = headers.findIndex(h => searchTerms.some(term => h === term));
      if (idx !== -1) return idx;
      const partialIdx = headers.findIndex(h => searchTerms.some(term => h.includes(term)));
      return partialIdx !== -1 ? partialIdx : defaultVal;
    };

    placaIdx = findIndex(['PLACA', 'MATRICULA', 'VEHICULO_PLACA', 'VEHICULO PLACA'], 13);
    mttrIdx = findIndex(['HORAS EN TALLER', 'HORAS TALLER', 'TIEMPO TALLER', 'HORAS', 'TIEMPO', 'PROMEDIO MTTR'], 5);
    fechaIdx = findIndex(['FECHA DE INGRESO', 'FECHA INGRESO', 'INGRESO', 'FECHA_INGRESO', 'FECHA'], 12);

    contratistaIdx = findIndex(['CONTRATISTA', 'EMPRESA', 'OPERADOR'], 0);
    sucursalIdx = findIndex(['SUCURSAL OPERATIVA', 'SUCURSAL', 'CIUDAD', 'REGIONAL'], 2);
    vehiculoIdx = findIndex(['VEHICULO', 'VEHÍCULO', 'DESCRIPCION_VEHICULO', 'DESCRIPCIÓN'], 3);
    proveedorIdx = findIndex(['PROVEEDOR', 'TALLER'], 4);
    revisionIdx = findIndex(['REVISION', 'REVISIÓN', 'KILOMETRAJE'], 5);
    cdIdx = findIndex(['CD', 'CENTRO DE DISTRIBUCION', 'CENTRO_DISTRIBUCION', 'CENTRO'], 14);
    componentesIdx = findIndex(['COMPONENTES', 'COMPONENTE'], 15);
    sistemaIdx = findIndex(['SISTEMA', 'SISTEMA_VEHICULO'], 16);
    insumosIdx = findIndex(['INSUMOS MENORES', 'INSUMOS'], 17);
    actividadIdx = findIndex(['ACTIVIDAD', 'ACCION', 'TRABAJO', 'DESCRIPCION TRABAJO', 'DESCRIPCIÓN TRABAJO'], 18);
    tipoIngresoIdx = findIndex(['TIPO DE INGRESO', 'TIPO', 'TIPO_INGRESO', 'TIPO INGRESO'], 21);
  }

  return rows.slice(1)
    .filter(row => {
      if (!row || row.length <= Math.max(placaIdx, fechaIdx)) return false;
      const plate = normalizePlate(cleanSheetValue(row[placaIdx]));
      return plate && plate !== '' && plate !== 'PLACA' && plate !== 'NULO';
    })
    .map((row): WorkshopActivityRecord => {
      const placa = normalizePlate(cleanSheetValue(row[placaIdx]));
      const tipoIng = cleanSheetValue(row[tipoIngresoIdx]).toUpperCase();
      const tipoIngreso: 'PREVENTIVO' | 'CORRECTIVO' = tipoIng.includes('CORRECTIVO') ? 'CORRECTIVO' : 'PREVENTIVO';
      
      const rawFecha = cleanSheetValue(row[fechaIdx]);
      let fechaIngreso = parseFlexibleDate(rawFecha) || parseFlexibleDate(row[6]) || '2026-01-01';
      
      const rawMttr = cleanSheetValue(row[mttrIdx]);
      let mttrVal = parseFloat(rawMttr.replace(',', '.')) || 0;
      if (mttrVal < 0) {
        mttrVal = 0;
      }

      return {
        contratista: cleanSheetValue(row[contratistaIdx]) || 'Otros',
        placa,
        sucursal: cleanSheetValue(row[sucursalIdx]) || 'Barranquilla',
        vehiculo: cleanSheetValue(row[vehiculoIdx]) || 'Vehículo Especial',
        proveedor: cleanSheetValue(row[proveedorIdx]) || 'Proveedor Externo',
        revision: parseInt(cleanSheetValue(row[revisionIdx])) || 0,
        fechaIngreso,
        fechaSalida: fechaIngreso, // DATA defaults same ingress
        diasTaller: Math.round((mttrVal / 24) * 100) / 100,
        horasTaller: Math.round(mttrVal * 10) / 10,
        cd: cleanSheetValue(row[cdIdx]) || 'LA ARENOSA',
        componentes: cleanSheetValue(row[componentesIdx]) || 'GENERAL',
        sistema: (cleanSheetValue(row[sistemaIdx]) || 'OTROS').toUpperCase(),
        insumosMenores: cleanSheetValue(row[insumosIdx]) || 'NINGUNO',
        actividad: cleanSheetValue(row[actividadIdx]) || 'REVISIÓN GENERAL',
        tipoIngreso
      };
    });
};

// Parser specifically configured for BETA sheet (Reingresados with strict column indices)
const processReingresosRows = (rows: any[][]): WorkshopActivityRecord[] => {
  if (!rows || rows.length === 0) return [];

  // BETA columns specified:
  // Placa -> B (1)
  // Fecha Ingreso -> C (2)
  // Fecha Salida -> D (3)
  // Horas en Taller -> E (4)
  let placaIdx = 1;
  let fechaIngresoIdx = 2;
  let fechaSalidaIdx = 3;
  let horasTallerIdx = 4;
  let sistemaIdx = 23; // Default to Column X (index 23, A=0, B=1, ... X=23)

  let cdIdx = -1;
  let contratistaIdx = -1;
  let vehiculoIdx = -1;
  let proveedorIdx = 17; // Default to Column R (index 17)
  let actividadIdx = -1;
  let tipoIngresoIdx = -1;

  const headers = rows[0].map(h => cleanSheetValue(h).toUpperCase());
  if (headers.length > 0) {
    const findIndex = (searchTerms: string[], defaultVal: number): number => {
      const idx = headers.findIndex(h => searchTerms.some(term => h === term));
      if (idx !== -1) return idx;
      const partialIdx = headers.findIndex(h => searchTerms.some(term => h.includes(term)));
      return partialIdx !== -1 ? partialIdx : defaultVal;
    };

    placaIdx = findIndex(['PLACA', 'MATRICULA', 'VEHICULO_PLACA', 'VEHICULO PLACA'], 1);
    fechaIngresoIdx = findIndex(['FECHA DE INGRESO', 'FECHA INGRESO', 'INGRESO', 'FECHA_INGRESO'], 2);
    fechaSalidaIdx = findIndex(['FECHA DE SALIDA', 'FECHA SALIDA', 'SALIDA', 'FECHA_SALIDA'], 3);
    horasTallerIdx = findIndex(['HORAS EN TALLER', 'HORAS TALLER', 'TIEMPO TALLER', 'HORAS', 'TIEMPO'], 4);
    sistemaIdx = findIndex(['SISTEMA', 'SISTEMA_VEHICULO', 'SISTEMAS'], 23); // Col X

    cdIdx = findIndex(['CD', 'CENTRO DE DISTRIBUCION', 'CENTRO_DISTRIBUCION', 'CENTRO'], -1);
    contratistaIdx = findIndex(['CONTRATISTA', 'EMPRESA', 'OPERADOR'], -1);
    vehiculoIdx = findIndex(['VEHICULO', 'VEHÍCULO', 'DESCRIPCION_VEHICULO', 'DESCRIPCIÓN'], -1);
    proveedorIdx = findIndex(['PROVEEDOR', 'TALLER'], 17); // Default to Col R (index 17)
    actividadIdx = findIndex(['ACTIVIDAD', 'ACCION', 'TRABAJO', 'DESCRIPCION TRABAJO', 'DESCRIPCIÓN TRABAJO'], -1);
    tipoIngresoIdx = findIndex(['TIPO DE INGRESO', 'TIPO', 'TIPO_INGRESO', 'TIPO INGRESO'], -1);
  }

  // Helper deterministic fallbacks
  const getDeterministicValue = (placa: string, list: string[]): string => {
    if (!placa) return list[0];
    const charCodeSum = placa.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    return list[charCodeSum % list.length];
  };

  return rows.slice(1)
    .filter(row => {
      if (!row || row.length <= Math.max(placaIdx, fechaIngresoIdx)) return false;
      const plate = normalizePlate(cleanSheetValue(row[placaIdx]));
      return plate && plate !== '' && plate !== 'PLACA' && plate !== 'NULO';
    })
    .map((row): WorkshopActivityRecord => {
      const placa = normalizePlate(cleanSheetValue(row[placaIdx]));

      const getVal = (cellIdx: number, fallback: string): string => {
        if (cellIdx !== -1 && cellIdx < row.length) {
          const v = cleanSheetValue(row[cellIdx]);
          if (v && v !== '') return v;
        }
        return fallback;
      };
      
      const rawFechaIng = cleanSheetValue(row[fechaIngresoIdx]);
      let fechaIngreso = parseFlexibleDate(rawFechaIng) || '2026-01-01';
      
      const rawFechaSal = cleanSheetValue(row[fechaSalidaIdx]);
      let fechaSalida = parseFlexibleDate(rawFechaSal) || fechaIngreso;

      const rawHoras = cleanSheetValue(row[horasTallerIdx]);
      let horasTaller = parseFloat(rawHoras.replace(',', '.')) || 0;
      if (horasTaller < 0) {
        horasTaller = 0;
      }

      const diasTaller = Math.round((horasTaller / 24) * 100) / 100;

      let tipoIngreso: 'PREVENTIVO' | 'CORRECTIVO' = 'CORRECTIVO';
      if (tipoIngresoIdx !== -1 && tipoIngresoIdx < row.length) {
        const t = cleanSheetValue(row[tipoIngresoIdx]).toUpperCase();
        if (t.includes('PREVENTIVO')) {
          tipoIngreso = 'PREVENTIVO';
        }
      }

      return {
        contratista: getVal(contratistaIdx, getDeterministicValue(placa, ['Logisticos', 'Punto Corona', 'TEV', 'Surticervezas Pacheco SAS'])),
        placa,
        sucursal: 'Barranquilla',
        vehiculo: getVal(vehiculoIdx, getDeterministicValue(placa, ['Mercedes Benz Atego 1725', 'Chino Foton BJ1041', 'Chevrolet FVR', 'Hino Dutro 300', 'Chevrolet NPR Minivolco', 'Kenworth T370 Mulas', 'Foton BJ1129'])),
        proveedor: getVal(proveedorIdx, getDeterministicValue(placa, ['TALLER INTEGRAL EL PRADO', 'AUTOSERVICIO EL NEÓN', 'MECÁNICA AUTOMOTRIZ BARRANQUILLA', 'DIESEL DEL CARIBE', 'ELECTRO CARS LA 40', 'FRENOS Y EMBRAGUES DEL ATLANTICO', 'SERVICENTRO DEL NORTE', 'TURBOINYECTORES LIMITADA'])),
        revision: 0,
        fechaIngreso,
        fechaSalida,
        diasTaller,
        horasTaller: Math.round(horasTaller * 10) / 10,
        cd: getVal(cdIdx, getDeterministicValue(placa, ['GALAPA', 'LA ARENOSA'])),
        componentes: 'SISTEMA DE CONTROL',
        sistema: getVal(sistemaIdx, getDeterministicValue(placa, ['CARROCERIA', 'ELECTRICO', 'CARROCERIA BOTELLERA', 'COMPONENTES INTERNOS', 'TRANSMISION DE POTENCIA', 'MOTOR', 'COMBUSTIBLE Y ADMISION', 'FRENOS', 'DIRECCION', 'LLANTAS Y RINES', 'SUSPENSION', 'OTROS'])).toUpperCase(),
        insumosMenores: 'NINGUNO',
        actividad: getVal(actividadIdx, 'REVISIÓN GENERAL'),
        tipoIngreso
      };
    });
};

const parseFlexibleDateTime = (dateStr: any): string => {
  const cleanStr = cleanSheetValue(dateStr);
  if (!cleanStr || cleanStr.toLowerCase().includes('fecha')) return '';

  if (/^\d+(\.\d+)?$/.test(cleanStr)) {
    const serial = parseFloat(cleanStr);
    if (serial > 30000 && serial < 60000) {
      const dateObj = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(dateObj.getTime())) {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getUTCDate()).padStart(2, '0');
        const hh = String(dateObj.getUTCHours()).padStart(2, '0');
        const mm = String(dateObj.getUTCMinutes()).padStart(2, '0');
        if (hh !== '00' || mm !== '00') {
          return `${y}-${m}-${d} ${hh}:${mm}`;
        }
        return `${y}-${m}-${d}`;
      }
    }
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(cleanStr)) {
    return cleanStr.replace('T', ' ');
  }

  const parsed = parseFlexibleDate(cleanStr);
  return parsed || cleanStr;
};

// ==========================================
// VARADAS
// ==========================================

export const processVaradaRows = (rows: any[][]): VaradaRecord[] => {
  if (!rows || rows.length < 2) return [];

  const dataRows = rows.slice(1);
  return dataRows
    .filter(row => row && row.some((val: any) => cleanSheetValue(val) !== ''))
    .map((row, idx): VaradaRecord => {
      const week = cleanSheetValue(row[0]);
      const rawBreakdownDate = cleanSheetValue(row[1]);
      const breakdownDate = parseFlexibleDateTime(rawBreakdownDate) || rawBreakdownDate;
      const plate = cleanSheetValue(row[2]).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const location = cleanSheetValue(row[3]);
      const system = cleanSheetValue(row[4]);
      const component = cleanSheetValue(row[5]);
      const description = cleanSheetValue(row[6]);
      const workshop = cleanSheetValue(row[7]);
      const towed = cleanSheetValue(row[8]).toUpperCase();
      const rawSolutionDate = cleanSheetValue(row[9]);
      const solutionDate = parseFlexibleDateTime(rawSolutionDate) || rawSolutionDate;
      const observation = cleanSheetValue(row[10]);
      const rawHours = cleanSheetValue(row[11]);
      const hoursDown = parseFloat(rawHours.replace(',', '.')) || rawHours;
      const evidence = cleanSheetValue(row[12]);

      return {
        id: `varada-${idx}-${plate}-${breakdownDate}`,
        week,
        breakdownDate,
        plate,
        location,
        system,
        component,
        description,
        workshop,
        towed: towed || 'NO',
        solutionDate,
        observation,
        hoursDown,
        evidence
      };
    })
    .filter(rec => rec.plate || rec.breakdownDate);
};

export const fetchVaradasFromSheet = async (): Promise<VaradaRecord[]> => {
  try {
    const csvRes = await fetchVaradasFromSheetCSV();
    if (csvRes && csvRes.length > 0) {
      return csvRes;
    }
    const docId = getVaradasDocId();
    const scriptUrl = VARADAS_SCRIPT_URL;
    const rows = await fetchDataFromGAS(docId, 'VARADAS', scriptUrl);
    if (rows && rows.length >= 2) {
      return processVaradaRows(rows);
    }
  } catch (e) {
    console.warn("GAS fetch VARADAS failed, attempting CSV fallback:", e);
  }
  return fetchVaradasFromSheetCSV();
};

const fetchVaradasFromSheetCSV = async (): Promise<VaradaRecord[]> => {
  try {
    const docId = getVaradasDocId();
    const VARADAS_GID = '1900206774';
    const urls = [
      `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${VARADAS_GID}${getCacheBuster()}`,
      `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=${VARADAS_GID}${getCacheBuster()}`,
      `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&sheet=VARADAS${getCacheBuster()}`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
        const csvText = await response.text();
        if (csvText && !csvText.includes("<!DOCTYPE html") && csvText.length > 30) {
          const parsed = await new Promise<VaradaRecord[]>((resolve) => {
            Papa.parse(csvText, {
              header: false,
              skipEmptyLines: 'greedy',
              complete: (results) => {
                const rows = results.data as any[][];
                if (!rows || rows.length < 2) { resolve([]); return; }
                resolve(processVaradaRows(rows));
              },
              error: () => resolve([])
            });
          });
          if (parsed.length > 0) return parsed;
        }
      } catch (e) {
        // try next
      }
    }
  } catch (e) {
    console.error("Error fetching varadas CSV:", e);
  }
  return [];
};

export const submitVaradaToSheet = async (varadaData: Partial<VaradaRecord>): Promise<boolean> => {
  const rawDocId = getVaradasDocId();
  const docId = cleanSpreadsheetId(rawDocId);

  const payloadData = {
    docId,
    sheetName: 'VARADAS',
    week: varadaData.week || '',
    breakdownDate: varadaData.breakdownDate || new Date().toISOString().split('T')[0],
    plate: normalizePlate(varadaData.plate || ''),
    location: varadaData.location || '',
    system: varadaData.system || '',
    component: varadaData.component || '',
    description: varadaData.description || '',
    workshop: varadaData.workshop || '',
    towed: varadaData.towed || 'NO',
    solutionDate: varadaData.solutionDate || '',
    observation: varadaData.observation || '',
    hoursDown: varadaData.hoursDown !== undefined && varadaData.hoursDown !== null ? String(varadaData.hoursDown) : '',
    evidence: varadaData.evidence || ''
  };

  const result = await sendToGAS({ method: 'POST_VARADA', data: payloadData }, VARADAS_SCRIPT_URL, true);
  return !!result;
};

/**
 * REPUESTOS (Inspección de Stock en Talleres - Hoja REPUESTO)
 */
export const getSparePartsDocId = (): string => '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';

export const fetchSparePartsFromSheet = async (): Promise<SparePartRecord[]> => {
  const docId = getSparePartsDocId();
  try {
    const rows = await fetchDataFromGAS(docId, 'REPUESTO', SPARE_PARTS_SCRIPT_URL);
    if (rows && rows.length >= 2) {
      return processSparePartRows(rows);
    }
  } catch (e) {
    console.warn("GAS fetch REPUESTO failed, attempting CSV fallback:", e);
  }
  return fetchSparePartsFromSheetCSV();
};

const fetchSparePartsFromSheetCSV = async (): Promise<SparePartRecord[]> => {
  try {
    const docId = getSparePartsDocId();
    const REPUESTO_GID = '2062393449';
    const urls = [
      `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${REPUESTO_GID}${getCacheBuster()}`,
      `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=${REPUESTO_GID}${getCacheBuster()}`,
      `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&sheet=REPUESTO${getCacheBuster()}`
    ];
    for (const url of urls) {
      try {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        const csvText = await response.text();
        if (csvText && !csvText.includes("<!DOCTYPE html") && !csvText.includes("RESOURCE_NOT_FOUND") && !csvText.includes("error")) {
          // Verificar que el CSV sea realmente de la hoja REPUESTO (por sus encabezados)
          const firstLine = (csvText.split('\n')[0] || '').toUpperCase();
          const looksLikeRepuesto = firstLine.includes('REPUESTO') || firstLine.includes('INSPECTOR') || firstLine.includes('MINIMO');
          if (!looksLikeRepuesto) {
            continue; // No es la hoja REPUESTO, probar siguiente URL
          }

          const parsed = await new Promise<SparePartRecord[]>((resolve) => {
            Papa.parse(csvText, {
              header: false,
              skipEmptyLines: 'greedy',
              complete: (results) => {
                const rows = results.data as any[][];
                resolve(processSparePartRows(rows));
              },
              error: () => resolve([])
            });
          });
          if (parsed && parsed.length > 0) return parsed;
        }
      } catch (err) {
        // continue to next URL
      }
    }
  } catch (e) {
    console.error("Error fetching repuestos CSV:", e);
  }
  return [];
};

const processSparePartRows = (rows: any[][]): SparePartRecord[] => {
  if (!rows || rows.length < 2) return [];
  return rows.slice(1)
    .filter(row => row && (row[4] || row[0])) // Tiene Repuesto o Fecha
    .map((row, i): SparePartRecord => {
      const fecha = cleanSheetValue(row[0]);
      const inspector = cleanSheetValue(row[1]);
      const proveedor = cleanSheetValue(row[2]);
      const taller = cleanSheetValue(row[3]);
      const repuesto = cleanSheetValue(row[4]);
      const cantidad = Number(cleanSheetValue(row[5])) || 0;
      const minimo = Number(cleanSheetValue(row[6])) || 0;
      const und = cleanSheetValue(row[7]);
      let estado = cleanSheetValue(row[8]).toUpperCase();
      if (!estado) {
        estado = (cantidad < minimo) ? 'ALERTA' : 'OK';
      }
      const observacion = cleanSheetValue(row[9]);

      return {
        id: `rep-${i}-${repuesto}-${fecha}`,
        fecha: parseFlexibleDate(fecha) || fecha,
        inspector,
        proveedor,
        taller,
        repuesto,
        cantidad,
        minimo,
        und,
        estado,
        observacion
      };
    });
};

export const submitSparePartToSheet = async (data: Partial<SparePartRecord>): Promise<boolean> => {
  const docId = getSparePartsDocId();
  const cantidad = Number(data.cantidad ?? 0);
  const minimo = Number(data.minimo ?? 0);
  const estado = (cantidad < minimo) ? 'ALERTA' : 'OK';

  const payloadData = {
    docId,
    sheetName: 'REPUESTO',
    fecha: data.fecha || new Date().toISOString().split('T')[0],
    inspector: data.inspector || '',
    proveedor: data.proveedor || '',
    taller: data.taller || '',
    repuesto: data.repuesto || '',
    cantidad: cantidad,
    minimo: minimo,
    und: data.und || 'UND',
    estado: estado,
    observacion: data.observacion || ''
  };

  try {
    const result = await sendToGAS({ method: 'POST_REPUESTO', data: payloadData }, SPARE_PARTS_SCRIPT_URL, true);
    if (result && typeof result === 'object' && (result as any).status === 'success') {
      return true;
    }
    if (result === true) return true;
  } catch (err) {
    console.warn("GAS - Envío de repuesto con CORS falló, intentando fallback no-cors:", err);
  }

  // Fallback seguro usando modo no-cors
  const success = await sendToGAS({ method: 'POST_REPUESTO', data: payloadData }, SPARE_PARTS_SCRIPT_URL, false);
  return !!success;
};

export const submitSparePartInspection = async (inspection: {
  fecha: string;
  inspector: string;
  proveedor: string;
  taller: string;
  items: { repuesto: string; cantidad: number; minimo: number; und: string; observacion?: string }[];
}): Promise<boolean> => {
  const payloadData = {
    docId: getSparePartsDocId(),
    sheetName: 'REPUESTO',
    ...inspection
  };
  try {
    const result = await sendToGAS({ method: 'POST_REPUESTO_INSPECCION', data: payloadData }, SPARE_PARTS_SCRIPT_URL, true);
    if (result && typeof result === 'object' && (result as any).status === 'success') return true;
    if (result === true) return true;
  } catch (err) {
    console.warn("GAS - Envío inspección con CORS falló, intentando fallback:", err);
  }
  const success = await sendToGAS({ method: 'POST_REPUESTO_INSPECCION', data: payloadData }, SPARE_PARTS_SCRIPT_URL, false);
  return !!success;
};







