
import Papa from 'papaparse';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration, WashReport } from '../types';
import { calculateStatus, normalizePlate, normalizeStr, getDaysDiff } from '../utils';

const GOOGLE_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxDEZRLFkXpeOAm0AL-2UeAF6lBAsurMl9gB_6RHfgSTzILtA2SZ-hHQeuSLrWAZLft/exec'; 

// HOJA MAESTRA (Conductores)
const MASTER_DOC_ID = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
const BASE_URL_MASTER = `https://docs.google.com/spreadsheets/d/${MASTER_DOC_ID}/export?format=csv`;

// HOJA OPERATIVA (ID Público de Publicación)
const OPERATION_PUBLISHED_ID = '2PACX-1vRA_vhJ1dLPgrVgt5zVafplHFSVUNKhUN8StKQS3ATt3C_yhyqGq-w-WKdshVQD9ryx2Kl7fdiL0iMc';
const BASE_URL_OPERATION = `https://docs.google.com/spreadsheets/d/e/${OPERATION_PUBLISHED_ID}/pub?output=csv`;

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
    const parts = cleanStr.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return cleanStr; 
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d2 = new Date(year, month, day);
      if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
    }
    return '';
  } catch { return ''; }
};

/**
 * VEHÍCULOS (Hoja ALERTA_CAMIONES - GID 0)
 * CD=0, Cont=1, Placa=2, Modelo=3, SOAT_Exp=4, RTM_Exp=5, EXT_Exp=6, SOAT_URL=7, RTM_URL=8, PROP_URL=9
 */
export const fetchVehiclesFromSheet = async (): Promise<Vehicle[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=0${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          
          const vehicles = rows.slice(1).filter(row => row && row[2] && cleanSheetValue(row[2]).length >= 3).map((row): Vehicle => {
            const plate = normalizePlate(cleanSheetValue(row[2]));
            const soatDate = parseFlexibleDate(row[4]);
            const rtmDate = parseFlexibleDate(row[5]);
            const extDate = parseFlexibleDate(row[6]);
            
            return {
              id: `v-${plate}`,
              cd: cleanSheetValue(row[0]).toUpperCase(),
              contractor: cleanSheetValue(row[1]).toUpperCase(),
              brand: "Vehículo", 
              plate, 
              model: cleanSheetValue(row[3]) || 'Unidad',
              soat: { 
                expiryDate: soatDate, lastRenewalDate: '', status: calculateStatus(soatDate), 
                daysPending: getDaysDiff(soatDate), url: cleanSheetValue(row[7]) 
              },
              rtm: { 
                expiryDate: rtmDate, lastRenewalDate: '', status: calculateStatus(rtmDate), 
                daysPending: getDaysDiff(rtmDate), url: cleanSheetValue(row[8]) 
              },
              plc: { expiryDate: '', lastRenewalDate: '', status: 'active' },
              extinguisher: { 
                expiryDate: extDate, lastRenewalDate: '', status: calculateStatus(extDate),
                daysPending: getDaysDiff(extDate)
              },
              propertyCardUrl: cleanSheetValue(row[9]),
              lastUpdate: new Date().toISOString()
            };
          });
          resolve(vehicles);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

/**
 * KILOMETRAJES (GID actualizado a 1929496440 según enlace de usuario)
 * Estructura: A=CD, B=Contratista, C=Semana, D=Fecha, E=Placa, F=Kilometraje
 */
export const fetchMileageLogsFromSheet = async (): Promise<MileageLog[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=1929496440${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          
          const logs = rows.slice(1).filter(row => row && row[4]).map((row): MileageLog => ({
            cd: cleanSheetValue(row[0]),          // Col A
            contractor: cleanSheetValue(row[1]),  // Col B
            week: cleanSheetValue(row[2]),        // Col C
            date: parseFlexibleDate(row[3]),      // Col D
            plate: normalizePlate(cleanSheetValue(row[4])), // Col E
            mileage: parseInt(cleanSheetValue(row[5])) || 0 // Col F
          }));
          resolve(logs);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

/**
 * CALIBRACIONES (Hoja Operativa GID: 505557891)
 */
export const fetchCalibrationsFromSheet = async (): Promise<Calibration[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=505557891${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          const calibrations = rows.slice(1).filter(row => row && row[3]).map((row): Calibration => {
            const plate = normalizePlate(cleanSheetValue(row[3])); 
            const calDateStr = parseFlexibleDate(row[1]);          
            const expDate = calDateStr ? new Date(calDateStr) : null;
            if (expDate) expDate.setFullYear(expDate.getFullYear() + 1);
            const expDateStr = expDate ? expDate.toISOString().split('T')[0] : '';

            return {
              id: `cal-${plate}-${calDateStr}`,
              plate,
              equipment: cleanSheetValue(row[4]) || 'EQUIPO',
              calibrationDate: calDateStr,
              expiryDate: expDateStr,
              certificateUrl: cleanSheetValue(row[5]),
              status: calculateStatus(expDateStr),
              daysPending: getDaysDiff(expDateStr),
              cd: 'BQA'
            };
          });
          resolve(calibrations);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

/**
 * LAVADOS (Hoja Operativa GID: 1668814480)
 */
export const fetchWashReportsFromSheet = async (): Promise<WashReport[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=1668814480${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          const reports = rows.slice(1).filter(row => row && row[4]).map((row): WashReport => ({
            id: cleanSheetValue(row[0]), 
            month: normalizeStr(cleanSheetValue(row[1])), 
            week: cleanSheetValue(row[2]),
            date: parseFlexibleDate(row[3]), 
            plate: normalizePlate(cleanSheetValue(row[4])),
            evidenceUrl: cleanSheetValue(row[5]), 
            mapUrl: cleanSheetValue(row[6]), 
            workshop: cleanSheetValue(row[7])
          }));
          resolve(reports);
        }
      });
    });
  } catch (e) { return []; }
};

/**
 * 5S CAMIONES (Hoja Operativa GID: 393618683)
 */
export const fetchFiveSReportsFromSheet = async (): Promise<FiveSReport[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=393618683${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          const reports = rows.slice(1).filter(row => row && row[0]).map((row): FiveSReport => ({
            id: cleanSheetValue(row[0]), 
            date: parseFlexibleDate(row[1]), 
            month: cleanSheetValue(row[2]), 
            week: cleanSheetValue(row[3]), 
            plate: normalizePlate(cleanSheetValue(row[4])), 
            inspector: 'SISTEMA 5S', 
            totalScore: 0, 
            evidenceUrl: cleanSheetValue(row[5]), 
            status: cleanSheetValue(row[6]).toUpperCase().includes('CERRADO') ? 'CERRADO' : 'ABIERTO', 
            closureEvidenceUrl: cleanSheetValue(row[7]), 
            cd: cleanSheetValue(row[8])
          }));
          resolve(reports);
        }
      });
    });
  } catch (e) { return []; }
};

/**
 * CONDUCTORES (Hoja Maestra)
 */
export const fetchDriversFromSheet = async (): Promise<Driver[]> => {
  try {
    const url = `${BASE_URL_MASTER}&gid=1834987510${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          const drivers = rows.slice(1).filter(row => row && row[1]).map((row): Driver => {
            const licExp = parseFlexibleDate(row[16]);
            return {
              id: `d-${cleanSheetValue(row[2])}`,
              name: cleanSheetValue(row[1]),
              identification: cleanSheetValue(row[2]),
              hireDate: parseFlexibleDate(row[6]),
              position: cleanSheetValue(row[4]),
              photoUrl: cleanSheetValue(row[21]),
              cd: cleanSheetValue(row[0]),
              contractor: cleanSheetValue(row[3]),
              license: { expiryDate: licExp, lastRenewalDate: '', status: calculateStatus(licExp), url: cleanSheetValue(row[18]), daysPending: getDaysDiff(licExp) },
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

/**
 * NOVEDADES (Hoja Operativa GID: 1789987673)
 */
export const fetchReportsFromSheet = async (): Promise<Report[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=1789987673${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows) { resolve([]); return; }
          const reports = rows.slice(1).filter(row => row && row[0]).map((row): Report => ({
            id: cleanSheetValue(row[0]), 
            date: parseFlexibleDate(row[1]), 
            plate: normalizePlate(cleanSheetValue(row[2])), 
            source: cleanSheetValue(row[3]), 
            initialEvidence: cleanSheetValue(row[4]), 
            novelty: cleanSheetValue(row[5]), 
            entryMap: cleanSheetValue(row[6]), 
            status: cleanSheetValue(row[7]).toUpperCase().includes('CERRADO') ? 'CERRADO' : 'ABIERTO', 
            workshopEvidence: cleanSheetValue(row[8]), 
            closureDate: parseFlexibleDate(row[9]), 
            solutionEvidence: cleanSheetValue(row[10]), 
            exitMap: cleanSheetValue(row[11]), 
            daysInShop: parseInt(cleanSheetValue(row[12])) || 0, 
            closureComments: cleanSheetValue(row[13]), 
            workshop: cleanSheetValue(row[14]), 
            cd: cleanSheetValue(row[15])
          }));
          resolve(reports);
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
