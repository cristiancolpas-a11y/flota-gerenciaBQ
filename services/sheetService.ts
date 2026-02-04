
import Papa from 'papaparse';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration } from '../types';
import { calculateStatus, normalizePlate, normalizeStr } from '../utils';

const GOOGLE_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxV6w7hv7_BYaEtfneVrwNx2CvXkB1-aUv6yeKBEgPKv8GncwaM6aA10Stli36YWiH6/exec'; 

// ID del documento Maestro (Vehículos/Conductores)
const MASTER_DOC_ID = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
const BASE_URL_MASTER = `https://docs.google.com/spreadsheets/d/${MASTER_DOC_ID}/export?format=csv`;

// ID del documento de Operación (Novedades/Kilometrajes)
const OPERATION_DOC_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const BASE_URL_OPERATION = `https://docs.google.com/spreadsheets/d/${OPERATION_DOC_ID}/export?format=csv`;

// GIDs específicos confirmados
const REPORTS_TAB_GID = '1789987673'; 
const MILEAGE_LOGS_GID = '1309852084'; 

const getCacheBuster = () => `&t=${new Date().getTime()}`;

const cleanSheetValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

const parseFlexibleDate = (dateStr: any): string => {
  const cleanStr = cleanSheetValue(dateStr);
  if (!cleanStr || cleanStr.toLowerCase().includes('fecha')) return '';
  try {
    // Intentar parsear fecha estándar o formato Excel
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
      return d.toISOString().split('T')[0];
    }
    return cleanStr;
  } catch { return cleanStr; }
};

const getColumnMapping = (rows: any[][], mapping: Record<string, string[]>) => {
  const result: Record<string, number> = {};
  let headerRowIdx = -1;

  // Buscar la fila que contiene la palabra "PLACA" o "NOMBRE" para identificar el encabezado
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const rowStr = rows[i].join('|').toUpperCase();
    if (rowStr.includes("PLACA") || rowStr.includes("NOMBRE")) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) return { startRow: 1, map: {} as any };

  const headerRow = rows[headerRowIdx].map(cell => normalizeStr(String(cell)));
  
  Object.keys(mapping).forEach(key => {
    const terms = mapping[key];
    let idx = headerRow.findIndex(cell => terms.some(term => cell === normalizeStr(term)));
    
    if (idx === -1) {
      idx = headerRow.findIndex(cell => 
        terms.some(term => {
          const c = normalizeStr(cell);
          const t = normalizeStr(term);
          if (key === 'workshop') return c.includes(t) && !c.includes("EVIDENCIA");
          return c.includes(t);
        })
      );
    }
    result[key] = idx; 
  });

  return { startRow: headerRowIdx + 1, map: result };
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
            plate: ["PLACA"],
            soat: ["SOAT"],
            rtm: ["RTM", "TECNOMECANICA"],
            plc: ["PLC", "TARJETA CONTROL"],
            ext: ["EXTINTOR"],
            cd: ["CD", "CENTRO"],
            contractor: ["CONTRATISTA", "OPERADOR"],
            urlSoat: ["URL SOAT", "SOPORTE SOAT"],
            urlRtm: ["URL RTM", "SOPORTE RTM"]
          });

          const pIdx = map.plate !== -1 ? map.plate : 4;

          const vehicles = rows.slice(startRow)
            .filter(row => cleanSheetValue(row[pIdx]).length >= 4)
            .map((row): Vehicle => {
              const plate = normalizePlate(cleanSheetValue(row[pIdx]));
              const soatDate = parseFlexibleDate(row[map.soat !== -1 ? map.soat : 3]);
              const rtmDate = parseFlexibleDate(row[map.rtm !== -1 ? map.rtm : 5]);
              const plcDate = parseFlexibleDate(row[map.plc !== -1 ? map.plc : 7]);
              const extDate = parseFlexibleDate(row[map.ext !== -1 ? map.ext : 9]);

              return {
                id: `v-${plate}`,
                cd: cleanSheetValue(row[map.cd !== -1 ? map.cd : 0]),
                contractor: cleanSheetValue(row[map.contractor !== -1 ? map.contractor : 1]),
                brand: "Vehículo",
                plate: plate,
                model: 'Unidad',
                soat: { 
                  expiryDate: soatDate, 
                  lastRenewalDate: '', 
                  status: calculateStatus(soatDate), 
                  url: cleanSheetValue(row[map.urlSoat !== -1 ? map.urlSoat : 20]) 
                },
                rtm: { 
                  expiryDate: rtmDate, 
                  lastRenewalDate: '', 
                  status: calculateStatus(rtmDate), 
                  url: cleanSheetValue(row[map.urlRtm !== -1 ? map.urlRtm : 21]) 
                },
                plc: { 
                  expiryDate: plcDate, 
                  lastRenewalDate: '', 
                  status: calculateStatus(plcDate), 
                  url: cleanSheetValue(row[22]) 
                },
                extinguisher: { 
                  expiryDate: extDate, 
                  lastRenewalDate: '', 
                  status: calculateStatus(extDate) 
                },
                lastUpdate: new Date().toISOString()
              };
            });
          
          console.log(`Vehículos cargados: ${vehicles.length}`);
          resolve(vehicles);
        }
      });
    });
  } catch (e) { 
    console.error("Error cargando vehículos:", e);
    return []; 
  }
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
            name: ["NOMBRE"],
            id: ["CEDULA", "IDENTIFICACION"],
            license: ["LICENCIA", "VENCIMIENTO LICENCIA"],
            photo: ["FOTO", "URL FOTO"],
            cd: ["CD"],
            contractor: ["CONTRATISTA"]
          });

          const nIdx = map.name !== -1 ? map.name : 2;
          const idIdx = map.id !== -1 ? map.id : 3;

          const drivers = rows.slice(startRow)
            .filter(row => cleanSheetValue(row[nIdx]).length > 2)
            .map((row): Driver => {
              const licExp = parseFlexibleDate(row[map.license !== -1 ? map.license : 9]);
              return {
                id: `d-${cleanSheetValue(row[idIdx])}`,
                name: cleanSheetValue(row[nIdx]),
                identification: cleanSheetValue(row[idIdx]),
                hireDate: parseFlexibleDate(row[6]),
                position: cleanSheetValue(row[4]),
                photoUrl: cleanSheetValue(row[map.photo !== -1 ? map.photo : 21]),
                cd: cleanSheetValue(row[map.cd !== -1 ? map.cd : 0]),
                contractor: cleanSheetValue(row[map.contractor !== -1 ? map.contractor : 1]),
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

export const fetchReportsFromSheet = async (): Promise<Report[]> => {
  try {
    const url = `${BASE_URL_OPERATION}&gid=${REPORTS_TAB_GID}${getCacheBuster()}`;
    const response = await fetch(url);
    const csvText = await response.text();
    if (csvText.includes("<!DOCTYPE html")) return [];

    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (rows.length < 1) { resolve([]); return; }
          const { startRow, map } = getColumnMapping(rows, {
            id: ["ID_REPORTE"], date: ["FECHA"], plate: ["PLACA"], novelty: ["NOVEDAD"], status: ["ESTADO"], workshop: ["TALLER"]
          });
          const getIdx = (key: string, def: number) => (map[key] !== undefined && map[key] !== -1) ? map[key] : def;
          const reports = rows.slice(startRow).filter(row => cleanSheetValue(row[getIdx('plate', 2)]).length >= 3).map((row): Report => {
            const statusRaw = cleanSheetValue(row[getIdx('status', 7)]).toUpperCase();
            return {
              id: cleanSheetValue(row[getIdx('id', 0)]),
              date: parseFlexibleDate(row[getIdx('date', 1)]),
              plate: normalizePlate(cleanSheetValue(row[getIdx('plate', 2)])),
              source: cleanSheetValue(row[3]),
              initialEvidence: cleanSheetValue(row[4]), 
              novelty: cleanSheetValue(row[getIdx('novelty', 5)]),
              entryMap: cleanSheetValue(row[6]),
              status: statusRaw.includes('CERRADO') ? 'CERRADO' : 'ABIERTO',
              workshopEvidence: cleanSheetValue(row[8]),
              closureDate: parseFlexibleDate(row[9]),
              solutionEvidence: cleanSheetValue(row[10]),
              exitMap: cleanSheetValue(row[11]),
              daysInShop: parseInt(cleanSheetValue(row[12])) || 0,
              closureComments: cleanSheetValue(row[13]),
              workshop: cleanSheetValue(row[getIdx('workshop', 14)]),
              cd: cleanSheetValue(row[15])
            };
          });
          resolve(reports);
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
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: false, skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as any[][];
          if (rows.length < 2) { resolve([]); return; }
          const logs = rows.slice(1).filter(row => cleanSheetValue(row[4])).map((row): MileageLog => ({
            date: parseFlexibleDate(row[3]), plate: normalizePlate(cleanSheetValue(row[4])), mileage: parseInt(cleanSheetValue(row[5])) || 0, cd: cleanSheetValue(row[0]), contractor: cleanSheetValue(row[1]), week: cleanSheetValue(row[2])
          }));
          resolve(logs);
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
          const reports = rows.slice(1).filter(row => cleanSheetValue(row[0])).map((row): FiveSReport => ({
            id: cleanSheetValue(row[0]), date: parseFlexibleDate(row[1]), plate: normalizePlate(cleanSheetValue(row[4])), inspector: 'AUDITORÍA 5S', totalScore: parseInt(cleanSheetValue(row[6])) || 0, evidenceUrl: cleanSheetValue(row[5]), status: cleanSheetValue(row[6]).toUpperCase().includes('CERRADO') ? 'CERRADO' : 'ABIERTO', closureEvidenceUrl: cleanSheetValue(row[7]), cd: cleanSheetValue(row[8]), week: cleanSheetValue(row[3]), month: cleanSheetValue(row[2])
          }));
          resolve(reports);
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
          const cals = rows.slice(1).filter(row => cleanSheetValue(row[3])).map((row): Calibration => ({
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
export const submitCalibrationToSheet = async (calibrationData: any): Promise<void> => { await sendToGAS({ method: 'POST_CALIBRATION', data: calibrationData }); };
