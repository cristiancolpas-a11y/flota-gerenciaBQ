
import Papa from 'papaparse';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration, WashReport } from '../types';
import { calculateStatus, normalizePlate, normalizeStr } from '../utils';

// Nueva URL proporcionada por el usuario
const GOOGLE_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxDEZRLFkXpeOAm0AL-2UeAF6lBAsurMl9gB_6RHfgSTzILtA2SZ-hHQeuSLrWAZLft/exec'; 

// ID del documento Maestro (Vehículos/Conductores)
const MASTER_DOC_ID = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
const BASE_URL_MASTER = `https://docs.google.com/spreadsheets/d/${MASTER_DOC_ID}/export?format=csv`;

// ID y URL del documento de Operación (LAVADOS, KILOMETRAJE, ETC) proporcionado por el usuario
const OPERATION_PUBLISHED_ID = '2PACX-1vRA_vhJ1dLPgrVgt5zVafplHFSVUNKhUN8StKQS3ATt3C_yhyqGq-w-WKdshVQD9ryx2Kl7fdiL0iMc';
const BASE_URL_OPERATION = `https://docs.google.com/spreadsheets/d/e/${OPERATION_PUBLISHED_ID}/pub?output=csv`;

const WASH_TAB_GID = '1668814480'; 

const getCacheBuster = () => `&t=${new Date().getTime()}`;

const cleanSheetValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

const parseFlexibleDate = (dateStr: any): string => {
  const cleanStr = cleanSheetValue(dateStr);
  if (!cleanStr || cleanStr.toLowerCase().includes('fecha')) return '';
  try {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
      return d.toISOString().split('T')[0];
    }
    return cleanStr;
  } catch { return cleanStr; }
};

/**
 * Sistema de mapeo inteligente de columnas
 */
const getColumnMapping = (rows: any[][], mapping: Record<string, string[]>) => {
  const result: Record<string, number> = {};
  let headerRowIdx = -1;
  
  // Obtenemos todos los términos de búsqueda posibles para esta hoja
  const allSearchTerms = Object.values(mapping).flat().map(t => normalizeStr(t));

  // Buscamos la fila que contenga al menos 2 de los términos buscados
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const rowNormalized = rows[i].map(cell => normalizeStr(String(cell)));
    const matchCount = rowNormalized.filter(cell => 
      allSearchTerms.some(term => cell.includes(term))
    ).length;

    if (matchCount >= 2) {
      headerRowIdx = i;
      break;
    }
  }

  // Si no se encuentra fila de encabezado, usamos la fila 0 por defecto
  const finalHeaderIdx = headerRowIdx === -1 ? 0 : headerRowIdx;
  const headerRow = rows[finalHeaderIdx].map(cell => normalizeStr(String(cell)));
  
  Object.keys(mapping).forEach(key => {
    const terms = mapping[key].map(t => normalizeStr(t));
    let idx = headerRow.findIndex(cell => terms.includes(cell));
    
    if (idx === -1) {
      idx = headerRow.findIndex(cell => terms.some(term => cell.includes(term)));
    }
    result[key] = idx; 
  });

  return { startRow: finalHeaderIdx + 1, map: result };
};

export const fetchVehiclesFromSheet = async (): Promise<Vehicle[]> => {
  try {
    const url = `${BASE_URL_MASTER}&gid=1506825194${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (rows.length < 1) { resolve([]); return; }
          
          const { startRow, map } = getColumnMapping(rows, {
            plate: ["PLACA"], soat: ["SOAT"], rtm: ["RTM", "TECNOMECANICA"],
            plc: ["PLC", "TARJETA CONTROL"], ext: ["EXTINTOR"], cd: ["CD"],
            contractor: ["CONTRATISTA"], urlSoat: ["URL SOAT"], urlRtm: ["URL RTM"]
          });

          const pIdx = map.plate !== -1 ? map.plate : 4;
          const vehicles = rows.slice(startRow).filter(row => cleanSheetValue(row[pIdx]).length >= 4).map((row): Vehicle => {
            const plate = normalizePlate(cleanSheetValue(row[pIdx]));
            const soatDate = parseFlexibleDate(row[map.soat]);
            const rtmDate = parseFlexibleDate(row[map.rtm]);
            return {
              id: `v-${plate}`,
              cd: cleanSheetValue(row[map.cd]),
              contractor: cleanSheetValue(row[map.contractor]),
              brand: "Vehículo", plate: plate, model: 'Unidad',
              soat: { expiryDate: soatDate, lastRenewalDate: '', status: calculateStatus(soatDate), url: cleanSheetValue(row[map.urlSoat]) },
              rtm: { expiryDate: rtmDate, lastRenewalDate: '', status: calculateStatus(rtmDate), url: cleanSheetValue(row[map.urlRtm]) },
              plc: { expiryDate: parseFlexibleDate(row[map.plc]), lastRenewalDate: '', status: 'active', url: cleanSheetValue(row[22]) },
              extinguisher: { expiryDate: parseFlexibleDate(row[map.ext]), lastRenewalDate: '', status: 'active' },
              lastUpdate: new Date().toISOString()
            };
          });
          resolve(vehicles);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchDriversFromSheet = async (): Promise<Driver[]> => {
  try {
    const url = `${BASE_URL_MASTER}&gid=1834987510${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (rows.length < 1) { resolve([]); return; }

          const { startRow, map } = getColumnMapping(rows, {
            name: ["NOMBRE"], id: ["CEDULA", "IDENTIFICACION"], license: ["LICENCIA"], photo: ["FOTO"], cd: ["CD"], contractor: ["CONTRATISTA"]
          });

          const nIdx = map.name !== -1 ? map.name : 1;
          const idIdx = map.id !== -1 ? map.id : 2;

          const drivers = rows.slice(startRow).filter(row => cleanSheetValue(row[nIdx]).length > 2).map((row): Driver => {
            const licExp = parseFlexibleDate(row[map.license]);
            return {
              id: `d-${cleanSheetValue(row[idIdx])}`,
              name: cleanSheetValue(row[nIdx]),
              identification: cleanSheetValue(row[idIdx]),
              hireDate: parseFlexibleDate(row[6]),
              position: cleanSheetValue(row[4]),
              photoUrl: cleanSheetValue(row[map.photo]),
              cd: cleanSheetValue(row[map.cd]),
              contractor: cleanSheetValue(row[map.contractor]),
              license: { expiryDate: licExp, lastRenewalDate: '', status: calculateStatus(licExp), url: cleanSheetValue(row[18]) },
              defensiveDriving: { expiryDate: parseFlexibleDate(row[11]), lastRenewalDate: '', status: 'active', url: cleanSheetValue(row[19]) },
              medicalExam: { expiryDate: parseFlexibleDate(row[13]), lastRenewalDate: '', status: 'active', url: cleanSheetValue(row[20]) }
            };
          });
          resolve(drivers);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchWashReportsFromSheet = async (): Promise<WashReport[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=${WASH_TAB_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (rows.length < 2) { resolve([]); return; }

          const { startRow, map } = getColumnMapping(rows, {
            id: ["ID REPORTE", "ID_REPORTE", "ID"],
            month: ["MES"],
            week: ["SEMANA"],
            date: ["FECHA"],
            plate: ["PLACA"],
            evidence: ["EVIDENCIA INICIAL", "EVIDENCIA", "EVIDENCIA IN"],
            map: ["MAPA DE TALLER", "MAPA", "MAPA DE TALLI"],
            workshop: ["TALLER"]
          });

          const idIdx = map.id !== -1 ? map.id : 0;
          const monthIdx = map.month !== -1 ? map.month : 1;
          const plateIdx = map.plate !== -1 ? map.plate : 4;
          const dateIdx = map.date !== -1 ? map.date : 3;

          const reports = rows.slice(startRow).map((row): WashReport => {
            return {
              id: cleanSheetValue(row[idIdx]),
              month: normalizeStr(cleanSheetValue(row[monthIdx])),
              week: cleanSheetValue(row[2]),
              date: parseFlexibleDate(row[dateIdx]),
              plate: normalizePlate(cleanSheetValue(row[plateIdx])),
              evidenceUrl: cleanSheetValue(row[5]),
              mapUrl: cleanSheetValue(row[6]),
              workshop: cleanSheetValue(row[7])
            };
          }).filter(r => r.plate.length >= 3 && r.month.length > 0);
          
          resolve(reports);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchReportsFromSheet = async (): Promise<Report[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=1789987673${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (rows.length < 2) { resolve([]); return; }
          const reports = rows.slice(1).map((row): Report => ({
            id: cleanSheetValue(row[0]), date: parseFlexibleDate(row[1]), plate: normalizePlate(cleanSheetValue(row[2])), source: cleanSheetValue(row[3]), initialEvidence: cleanSheetValue(row[4]), novelty: cleanSheetValue(row[5]), entryMap: cleanSheetValue(row[6]), status: cleanSheetValue(row[7]).toUpperCase().includes('CERRADO') ? 'CERRADO' : 'ABIERTO', workshopEvidence: cleanSheetValue(row[8]), closureDate: parseFlexibleDate(row[9]), solutionEvidence: cleanSheetValue(row[10]), exitMap: cleanSheetValue(row[11]), daysInShop: parseInt(cleanSheetValue(row[12])) || 0, closureComments: cleanSheetValue(row[13]), workshop: cleanSheetValue(row[14]), cd: cleanSheetValue(row[15])
          }));
          resolve(reports);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchFiveSReportsFromSheet = async (): Promise<FiveSReport[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=393618683${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          const reports = rows.slice(1).map((row): FiveSReport => ({
            id: cleanSheetValue(row[0]), date: parseFlexibleDate(row[1]), plate: normalizePlate(cleanSheetValue(row[4])), inspector: 'AUDITORÍA 5S', totalScore: parseInt(cleanSheetValue(row[6])) || 0, evidenceUrl: cleanSheetValue(row[5]), status: cleanSheetValue(row[6]).toUpperCase().includes('CERRADO') ? 'CERRADO' : 'ABIERTO', closureEvidenceUrl: cleanSheetValue(row[7]), cd: cleanSheetValue(row[8]), week: cleanSheetValue(row[3]), month: cleanSheetValue(row[2])
          }));
          resolve(reports);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchMileageLogsFromSheet = async (): Promise<MileageLog[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=1309852084${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          const logs = rows.slice(1).map((row): MileageLog => ({
            date: parseFlexibleDate(row[3]), plate: normalizePlate(cleanSheetValue(row[4])), mileage: parseInt(cleanSheetValue(row[5])) || 0, cd: cleanSheetValue(row[0]), contractor: cleanSheetValue(row[1]), week: cleanSheetValue(row[2])
          }));
          resolve(logs);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchCalibrationsFromSheet = async (): Promise<Calibration[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=50555789${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          const cals = rows.slice(1).map((row): Calibration => ({
            id: `cal-${row[3]}-${row[1]}`, plate: normalizePlate(cleanSheetValue(row[3])), equipment: cleanSheetValue(row[4]), calibrationDate: parseFlexibleDate(row[1]), expiryDate: '', certificateUrl: cleanSheetValue(row[5]), status: 'active', cd: 'GENERAL' 
          }));
          resolve(cals);
        }
      });
    });
  } catch (e) { return []; }
};

const sendToGAS = async (payload: any) => {
  try {
    await fetch(GOOGLE_SCRIPT_WEB_APP_URL, { 
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) 
    });
  } catch (err) { console.error(err); }
};

export const submitDocumentUpdateToSheet = async (data: any): Promise<void> => { await sendToGAS({ method: 'POST_DOC_UPDATE', data }); };
export const submitReportToSheet = async (report: Report): Promise<void> => { await sendToGAS({ method: 'POST_REPORT', data: report }); };
export const submitMileageToSheet = async (mileageData: any): Promise<void> => { await sendToGAS({ method: 'POST_MILEAGE', data: mileageData }); };
export const submitFiveSToSheet = async (fiveSData: any): Promise<void> => { await sendToGAS({ method: 'POST_FIVES', data: fiveSData }); };
export const submitCalibrationToSheet = async (calibrationDate: any): Promise<void> => { await sendToGAS({ method: 'POST_CALIBRATION', data: calibrationDate }); };
export const submitWashToSheet = async (washData: any): Promise<void> => { await sendToGAS({ method: 'POST_WASH', data: washData }); };
