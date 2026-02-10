
import Papa from 'papaparse';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration, WashReport } from '../types';
import { calculateStatus, normalizePlate, normalizeStr, getDaysDiff } from '../utils';

const GOOGLE_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxDEZRLFkXpeOAm0AL-2UeAF6lBAsurMl9gB_6RHfgSTzILtA2SZ-hHQeuSLrWAZLft/exec'; 

// HOJA MAESTRA (Donde se encuentran los Vehículos y Conductores)
const REAL_MASTER_ID = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
const BASE_URL_MASTER = `https://docs.google.com/spreadsheets/d/${REAL_MASTER_ID}/export?format=csv`;

// HOJA OPERATIVA / BACKEND (Para registros de novedades, lavados, calibraciones, etc.)
const BACKEND_DOC_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const BASE_URL_BACKEND = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/export?format=csv`;

const getCacheBuster = () => `&t=${new Date().getTime()}`;

const cleanSheetValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

const parseFlexibleDate = (dateStr: any): string => {
  const cleanStr = cleanSheetValue(dateStr);
  if (!cleanStr || cleanStr.toLowerCase().includes('fecha')) return '';
  try {
    const parts = cleanStr.split(/[\/\-]/);
    if (parts.length === 3) {
      let day, month, year;
      if (parts[0].length === 4) { 
        year = parseInt(parts[0]); month = parseInt(parts[1]) - 1; day = parseInt(parts[2]);
      } else { 
        day = parseInt(parts[0]); month = parseInt(parts[1]) - 1; year = parseInt(parts[2]);
      }
      const d2 = new Date(year, month, day);
      if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
    }
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
      return d.toISOString().split('T')[0];
    }
    return '';
  } catch { return ''; }
};

export const fetchVehiclesFromSheet = async (): Promise<Vehicle[]> => {
  try {
    const url = `${BASE_URL_MASTER}&gid=1506825194${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, 
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length === 0) { resolve([]); return; }
          
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
          resolve(vehicles);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { 
    return []; 
  }
};

export const fetchMileageLogsFromSheet = async (): Promise<MileageLog[]> => {
  try {
    const url = `${BASE_URL_BACKEND}&gid=1929496440${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          
          const logs = rows.slice(1).filter(row => row && row[4]).map((row): MileageLog => ({
            cd: cleanSheetValue(row[0]),          
            contractor: cleanSheetValue(row[1]),  
            week: cleanSheetValue(row[2]),        
            date: parseFlexibleDate(row[3]),      
            plate: normalizePlate(cleanSheetValue(row[4])), 
            mileage: parseInt(cleanSheetValue(row[5])) || 0 
          }));
          resolve(logs);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const fetchCalibrationsFromSheet = async (): Promise<Calibration[]> => {
  try {
    const url = `${BASE_URL_BACKEND}&gid=505557891${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, 
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          
          const calibrations = rows.slice(1)
            .filter(row => row && row[3]) 
            .map((row, index): Calibration => {
              const plate = normalizePlate(cleanSheetValue(row[3])); 
              const calDateStr = parseFlexibleDate(row[1]);         
              const workshop = cleanSheetValue(row[4]);             
              const evidenceUrl = cleanSheetValue(row[5]);          
              
              const expDate = calDateStr ? new Date(calDateStr) : null;
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
                cd: 'GENERAL'
              };
            });
          resolve(calibrations);
        },
        error: () => resolve([])
      });
    });
  } catch (e) { return []; }
};

export const fetchWorkshopVisitsFromSheet = async (): Promise<Report[]> => {
  try {
    // Usamos el GID 505557891 según instrucción, asumiendo una hoja con estructura similar a Reporte
    const url = `${BASE_URL_BACKEND}&gid=505557891${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!csvText || csvText.includes("<!DOCTYPE html")) return [];
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (!rows || rows.length < 2) { resolve([]); return; }
          // Mapeamos los datos asumiendo la estructura de la hoja VISITAS A TALLER
          const visits = rows.slice(1).filter(row => row && row[3]).map((row, i): Report => ({
            id: `visit-${i}`,
            date: parseFlexibleDate(row[1]),
            plate: normalizePlate(cleanSheetValue(row[3])),
            workshop: cleanSheetValue(row[4]),
            status: 'CERRADO',
            novelty: 'VISITA REGISTRADA',
            source: 'TALLER',
            initialEvidence: cleanSheetValue(row[5]),
            daysInShop: 1, // Por defecto si no hay fecha de salida
            cd: 'GENERAL'
          }));
          resolve(visits);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchWashReportsFromSheet = async (): Promise<WashReport[]> => {
  try {
    const url = `${BASE_URL_BACKEND}&gid=1668814480${getCacheBuster()}`;
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

export const fetchFiveSReportsFromSheet = async (): Promise<FiveSReport[]> => {
  try {
    const url = `${BASE_URL_BACKEND}&gid=393618683${getCacheBuster()}`;
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

export const fetchReportsFromSheet = async (): Promise<Report[]> => {
  try {
    const url = `${BASE_URL_BACKEND}&gid=1789987673${getCacheBuster()}`;
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
