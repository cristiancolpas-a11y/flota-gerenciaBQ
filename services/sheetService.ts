
import Papa from 'papaparse';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration } from '../types';
import { calculateStatus, normalizePlate, getWeekNumber, normalizeStr } from '../utils';

// URL DE TU WEB APP (ACTUALIZADA EL 02/02/2025)
const GOOGLE_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzQ9hGWW4Kt7zgpW1wygXUfGRxiSlP1C13RMHr_IkRxRqf6VTEgMHfIcfiWU2Xs1-Fi/exec'; 

const MASTER_DOC_ID = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
const BASE_URL_MASTER = `https://docs.google.com/spreadsheets/d/${MASTER_DOC_ID}/export?format=csv`;

const OPERATION_DOC_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const BASE_URL_OPERATION = `https://docs.google.com/spreadsheets/d/${OPERATION_DOC_ID}/export?format=csv`;

const VEHICLES_TAB_GID = '1506825194'; 
const DRIVERS_TAB_GID = '1834987510'; 
const MILEAGE_LOGS_GID = '1929496440'; 
const FIVES_TAB_GID = '393618683'; 
const CALIBRATIONS_TAB_GID = '50555789'; 
const REPORTS_TAB_GID = '0'; // Asegúrate de que la pestaña "REPORTE" sea la primera (GID 0)

const getCacheBuster = () => `&t=${new Date().getTime()}`;

const cleanSheetValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  // Si el valor parece código CSS/HTML, limpiarlo
  if (str.includes('{') && str.includes('}') || str.includes('<style')) return 'Error de Formato';
  return str;
};

const parseFlexibleDate = (dateStr: any): string => {
  const cleanStr = cleanSheetValue(dateStr);
  if (!cleanStr || cleanStr.toLowerCase().includes('fecha') || cleanStr === 'Error de Formato') return '';
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

// Función auxiliar para validar si la respuesta es CSV real o basura HTML
const isValidCsv = (text: string): boolean => {
  if (!text) return false;
  // Si contiene etiquetas HTML o bloques de CSS, Google nos está pidiendo login o devolviendo un error
  if (text.includes('<!DOCTYPE html>') || text.includes('display:inline-block') || text.includes('google-signin')) {
    console.error("Acceso denegado: El Google Sheet no es público o la URL es incorrecta.");
    return false;
  }
  return true;
};

export const fetchVehiclesFromSheet = async (): Promise<Vehicle[]> => {
  try {
    const url = `${BASE_URL_MASTER}&gid=${VEHICLES_TAB_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!isValidCsv(csvText)) return [];
    
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
              cd: cleanSheetValue(row[0]).toUpperCase() || 'GENERAL',
              contractor: cleanSheetValue(row[1]).toUpperCase() || 'GENERAL',
              brand: "Vehículo",
              plate: plateValue,
              model: 'Unidad',
              soat: { expiryDate: soatExp, lastRenewalDate: '', status: calculateStatus(soatExp), daysPending: parseInt(cleanSheetValue(row[4])) || undefined, url: cleanSheetValue(row[20]) },
              rtm: { expiryDate: rtmExp, lastRenewalDate: '', status: calculateStatus(rtmExp), daysPending: parseInt(cleanSheetValue(row[6])) || undefined, url: cleanSheetValue(row[21]) },
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
    if (!isValidCsv(csvText)) return [];
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const drivers = rows.filter(row => {
            const rawName = cleanSheetValue(row[2]).toUpperCase();
            return rawName && !rawName.includes("NOMBRE");
          }).map((row): Driver => {
            const licExp = parseFlexibleDate(row[9]);
            return {
              id: `d-${cleanSheetValue(row[3])}`,
              name: cleanSheetValue(row[2]),
              identification: cleanSheetValue(row[3]),
              hireDate: parseFlexibleDate(row[6]),
              position: cleanSheetValue(row[4]),
              photoUrl: cleanSheetValue(row[21]),
              cd: cleanSheetValue(row[0]),
              contractor: cleanSheetValue(row[1]),
              license: { expiryDate: licExp, lastRenewalDate: '', status: calculateStatus(licExp), daysPending: parseInt(cleanSheetValue(row[10])) || 0, url: cleanSheetValue(row[18]) },
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
    const url = `${BASE_URL_OPERATION}&gid=${REPORTS_TAB_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!isValidCsv(csvText)) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          // Filtrar basura: Debe tener al menos una fecha o un ID válido
          const reports = rows.filter(row => {
            const id = cleanSheetValue(row[0]);
            return id && !id.includes("ID") && id.length > 2 && !id.includes('{');
          }).map((row): Report => ({
            id: cleanSheetValue(row[0]),
            date: parseFlexibleDate(row[1]),
            plate: normalizePlate(cleanSheetValue(row[2])),
            source: cleanSheetValue(row[3]),
            novelty: cleanSheetValue(row[4]),
            initialEvidence: cleanSheetValue(row[5]),
            entryMap: cleanSheetValue(row[6]),
            status: cleanSheetValue(row[7]) === 'CERRADO' ? 'CERRADO' : 'ABIERTO',
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

export const fetchFiveSReportsFromSheet = async (): Promise<FiveSReport[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=${FIVES_TAB_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!isValidCsv(csvText)) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const reports = rows.filter(row => row[0] && !row[0].toString().includes("ID")).map((row): FiveSReport => ({
            id: cleanSheetValue(row[0]),
            date: parseFlexibleDate(row[1]),
            plate: normalizePlate(cleanSheetValue(row[4])),
            inspector: 'AUDITORÍA 5S',
            totalScore: parseInt(cleanSheetValue(row[6])) || 0,
            evidenceUrl: cleanSheetValue(row[5]),
            status: cleanSheetValue(row[6]) === 'CERRADO' ? 'CERRADO' : 'ABIERTO',
            closureEvidenceUrl: cleanSheetValue(row[7]),
            cd: cleanSheetValue(row[8]),
            week: cleanSheetValue(row[3]),
            month: cleanSheetValue(row[2])
          }));
          resolve(reports);
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchCalibrationsFromSheet = async (): Promise<Calibration[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=${CALIBRATIONS_TAB_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (!isValidCsv(csvText)) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const cals = rows.filter(row => row[3] && !row[3].toString().includes("PLACA") && !row[3].toString().includes('{')).map((row): Calibration => ({
            id: `cal-${row[3]}-${row[1]}`,
            plate: normalizePlate(cleanSheetValue(row[3])), 
            equipment: cleanSheetValue(row[4]), 
            calibrationDate: parseFlexibleDate(row[1]), 
            expiryDate: '', 
            certificateUrl: cleanSheetValue(row[5]), 
            status: 'active',
            cd: 'GENERAL' 
          }));
          resolve(cals);
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
    if (!isValidCsv(csvText)) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[];
          const logs = rows.filter(row => row[4] && !row[4].toString().includes("PLACA")).map((row): MileageLog => ({
            date: parseFlexibleDate(row[3]),
            plate: normalizePlate(cleanSheetValue(row[4])),
            mileage: parseInt(cleanSheetValue(row[5])) || 0,
            cd: cleanSheetValue(row[0]),
            contractor: cleanSheetValue(row[1]),
            week: cleanSheetValue(row[2])
          }));
          resolve(logs);
        }
      });
    });
  } catch (e) { return []; }
};

const sendToGAS = async (payload: any) => {
  try {
    await fetch(GOOGLE_SCRIPT_WEB_APP_URL, { 
      method: 'POST', 
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify(payload) 
    });
  } catch (err) { console.error(err); }
};

export const submitDocumentUpdateToSheet = async (data: any): Promise<void> => {
  await sendToGAS({ method: 'POST_DOC_UPDATE', data });
};

export const submitReportToSheet = async (report: Report): Promise<void> => {
  await sendToGAS({ method: 'POST_REPORT', data: report });
};

export const submitMileageToSheet = async (mileageData: any): Promise<void> => {
  await sendToGAS({ method: 'POST_MILEAGE', data: mileageData });
};

export const submitFiveSToSheet = async (fiveSData: any): Promise<void> => {
  await sendToGAS({ method: 'POST_FIVES', data: fiveSData });
};

export const submitCalibrationToSheet = async (calibrationData: any): Promise<void> => {
  await sendToGAS({ method: 'POST_CALIBRATION', data: calibrationData });
};
