
import Papa from 'papaparse';
import { Vehicle, Driver, Report, MileageLog, FiveSReport } from '../types';
import { calculateStatus, normalizePlate, getWeekNumber, normalizeStr } from '../utils';

// URL del Web App de Google Apps Script para recibir POSTs
const GOOGLE_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwaGa_f0iifWYPaxCBNgohqASD7lowTFEuFjzYCSXpam3QQoLerVudzdmm4c10g5qGV/exec'; 

// ID del Spreadsheet principal (Maestros)
const MASTER_SPREADSHEET_ID = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
const BASE_URL_MASTER = `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/export?format=csv`;

// URL de la hoja publicada específicamente para NOVEDADES (REPORTE)
const PUBLISHED_REPORTS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUVn_15h-QFUfkpJr8-tpnW1RHt-lgjrzGjzu8g5_sy6px7WukL_z8Him-V5qRl9ZJiYAUYP7ISzMh/pub?output=csv&gid=0';

// ID del Spreadsheet de Operaciones (Kilometrajes y 5S)
const OPERATION_DOC_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const BASE_URL_OPERATION = `https://docs.google.com/spreadsheets/d/${OPERATION_DOC_ID}/export?format=csv`;

const VEHICLES_TAB_GID = '1506825194'; 
const DRIVERS_TAB_GID = '1834987510'; 
const MILEAGE_LOGS_GID = '1929496440'; 
const FIVES_TAB_GID = '393618683'; // GID exacto de la pestaña 5S CAMIONES según captura

const getCacheBuster = () => `&t=${new Date().getTime()}`;

const cleanSheetValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

const parseFlexibleDate = (dateStr: any): string => {
  const cleanStr = cleanSheetValue(dateStr);
  if (!cleanStr || cleanStr.toLowerCase().includes('fecha')) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) return cleanStr;
  
  const digits = cleanStr.match(/\d+/g);
  if (!digits || digits.length < 3) return '';
  
  let day, month, year;
  if (digits[0].length === 4) {
    [year, month, day] = digits.map(Number);
  } else {
    [day, month, year] = digits.map(Number);
    if (year < 100) year += (year < 50) ? 2000 : 1900;
  }
  
  try {
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  } catch { return ''; }
};

export const fetchVehiclesFromSheet = async (): Promise<Vehicle[]> => {
  try {
    const url = `${BASE_URL_MASTER}&gid=${VEHICLES_TAB_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const vehicles = rows.filter(row => {
            const rawPlateValue = cleanSheetValue(row[2]).toUpperCase();
            return rawPlateValue && !rawPlateValue.includes("PLACA") && normalizePlate(rawPlateValue).length >= 3;
          }).map((row): Vehicle => {
            const plateValue = normalizePlate(cleanSheetValue(row[2]));
            const soatExp = parseFlexibleDate(row[3]);
            const rtmExp = parseFlexibleDate(row[5]);
            const plcExp = parseFlexibleDate(row[7]);
            const extExp = parseFlexibleDate(row[9]);

            return {
              id: `v-${plateValue}`,
              cd: cleanSheetValue(row[0]).toUpperCase(),
              contractor: cleanSheetValue(row[1]).toUpperCase(),
              brand: "Vehículo",
              plate: plateValue,
              model: 'Unidad',
              propertyCardUrl: cleanSheetValue(row[19]),
              soat: { expiryDate: soatExp, lastRenewalDate: '', status: calculateStatus(soatExp), daysPending: parseInt(cleanSheetValue(row[4])) || undefined, url: cleanSheetValue(row[20]) },
              rtm: { expiryDate: rtmExp, lastRenewalDate: '', status: calculateStatus(rtmExp), daysPending: parseInt(cleanSheetValue(row[4])) || undefined, url: cleanSheetValue(row[21]) },
              plc: { expiryDate: plcExp, lastRenewalDate: '', status: calculateStatus(plcExp), daysPending: parseInt(cleanSheetValue(row[8])) || undefined, url: cleanSheetValue(row[22]) },
              extinguisher: { expiryDate: extExp, lastRenewalDate: '', status: calculateStatus(extExp), daysPending: parseInt(cleanSheetValue(row[10])) || undefined },
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
    const url = `${BASE_URL_MASTER}&gid=${DRIVERS_TAB_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const drivers = rows.filter(row => {
            const rawName = cleanSheetValue(row[2]).toUpperCase();
            return rawName && !rawName.includes("NOMBRE") && !rawName.includes("CONDUCTOR");
          }).map((row): Driver => {
            const nameValue = cleanSheetValue(row[2]);
            const licExp = parseFlexibleDate(row[9]);  
            const manExp = parseFlexibleDate(row[11]); 
            const medExp = parseFlexibleDate(row[13]); 

            return {
              id: `d-${cleanSheetValue(row[3]) || Math.random()}`,
              name: nameValue,
              identification: cleanSheetValue(row[3]) || 'SIN ID',
              hireDate: parseFlexibleDate(row[6]),
              position: cleanSheetValue(row[4]),
              photoUrl: cleanSheetValue(row[21]),
              cd: cleanSheetValue(row[0]), contractor: cleanSheetValue(row[1]), 
              license: { expiryDate: licExp, lastRenewalDate: '', status: calculateStatus(licExp), daysPending: parseInt(cleanSheetValue(row[10])) || undefined, url: cleanSheetValue(row[18]) },
              defensiveDriving: { expiryDate: manExp, lastRenewalDate: '', status: calculateStatus(manExp), daysPending: parseInt(cleanSheetValue(row[12])) || undefined, url: cleanSheetValue(row[19]) },
              medicalExam: { expiryDate: medExp, lastRenewalDate: '', status: calculateStatus(medExp), daysPending: parseInt(cleanSheetValue(row[14])) || undefined, url: cleanSheetValue(row[20]) }
            };
          });
          resolve(drivers);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchMileageLogsFromSheet = async (): Promise<MileageLog[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=${MILEAGE_LOGS_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const logs = rows.filter(row => {
            if (!row || row.length < 5) return false;
            const plateVal = cleanSheetValue(row[4]).toUpperCase();
            return plateVal && !plateVal.includes("PLACA");
          }).map((row): MileageLog => ({
            cd: cleanSheetValue(row[0]), contractor: cleanSheetValue(row[1]),
            week: cleanSheetValue(row[2]), date: parseFlexibleDate(row[3]),
            plate: normalizePlate(cleanSheetValue(row[4])),
            mileage: parseInt(String(row[5]).replace(/[^0-9]/g, '')) || 0
          }));
          resolve(logs);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchReportsFromSheet = async (): Promise<Report[]> => {
  try {
    const url = `${PUBLISHED_REPORTS_URL}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) return [];
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const reports = rows.filter(row => {
            const id = cleanSheetValue(row[0]).toUpperCase();
            return id && !id.includes("ID");
          }).map((row) => ({
            id: cleanSheetValue(row[0]), date: parseFlexibleDate(row[1]), plate: normalizePlate(cleanSheetValue(row[2])), 
            source: cleanSheetValue(row[3]), novelty: cleanSheetValue(row[4]), initialEvidence: cleanSheetValue(row[5]), 
            entryMap: cleanSheetValue(row[6]), status: (cleanSheetValue(row[7]).toUpperCase().includes('CERRADO') ? 'CERRADO' : 'ABIERTO') as 'ABIERTO' | 'CERRADO', 
            workshopEvidence: cleanSheetValue(row[8]), closureDate: parseFlexibleDate(row[9]), solutionEvidence: cleanSheetValue(row[10]), 
            exitMap: cleanSheetValue(row[11]), daysInShop: parseInt(cleanSheetValue(row[12])) || 0, closureComments: cleanSheetValue(row[13]), workshop: cleanSheetValue(row[14])          
          }));
          resolve(reports);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchFiveSReportsFromSheet = async (): Promise<FiveSReport[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=${FIVES_TAB_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) return [];
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const reports = rows.filter(row => {
             const plateVal = cleanSheetValue(row[4]).toUpperCase();
             return plateVal && !plateVal.includes("PLACA");
          }).map((row): FiveSReport => ({
            id: cleanSheetValue(row[0]),
            date: parseFlexibleDate(row[1]),
            month: cleanSheetValue(row[2]).toUpperCase(),
            week: cleanSheetValue(row[3]),
            plate: normalizePlate(cleanSheetValue(row[4])),
            evidenceUrl: cleanSheetValue(row[5]),
            status: (cleanSheetValue(row[6]).toUpperCase().includes('CERRADO') ? 'CERRADO' : 'ABIERTO') as 'ABIERTO' | 'CERRADO',
            closureEvidenceUrl: cleanSheetValue(row[7]),
            inspector: 'AUDITORÍA 5S', 
            totalScore: cleanSheetValue(row[6]).toUpperCase().includes('CERRADO') ? 100 : 0
          }));
          resolve(reports);
        }
      });
    });
  } catch (e) { return []; }
};

export const submitReportToSheet = async (report: Report): Promise<void> => {
  if (!GOOGLE_SCRIPT_WEB_APP_URL) return;
  await fetch(GOOGLE_SCRIPT_WEB_APP_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ method: 'POST_REPORT', data: report }) });
};
export const submitMileageToSheet = async (mileageData: any): Promise<void> => {
  if (!GOOGLE_SCRIPT_WEB_APP_URL) return;
  await fetch(GOOGLE_SCRIPT_WEB_APP_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ method: 'POST_MILEAGE', data: mileageData }) });
};
export const submitFiveSToSheet = async (fiveSData: any): Promise<void> => {
  if (!GOOGLE_SCRIPT_WEB_APP_URL) return;
  await fetch(GOOGLE_SCRIPT_WEB_APP_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ method: 'POST_FIVES', data: fiveSData }) });
};
