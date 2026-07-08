import Papa from 'papaparse';

const REAL_MASTER_ID = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
const VEHICLES_GID = '1506825194';

const BACKEND_DOC_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
const MILEAGE_GID = '1929496440';

const normalizePlate = (plate: string): string => {
  if (!plate) return "";
  return String(plate)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
};

const cleanSheetValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
};

const parseFlexibleDate = (dateStr: any): string => {
  return cleanSheetValue(dateStr);
};

const extractNumber = (str: any): number => {
  if (typeof str === 'number') return str;
  const num = parseInt(String(str).replace(/[^0-9]/g, '')) || 0;
  return num;
};

// Mock processVehicleRows
const processVehicleRows = (rows: any[][]): any[] => {
  const vehicles: any[] = [];
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
      vehicles.push({
        cd: lastCd,
        contractor: lastCnt,
        plate
      });
    }
  }
  return vehicles;
};

async function test() {
  try {
    // 1. Fetch vehicles
    const vUrl = `https://docs.google.com/spreadsheets/d/${REAL_MASTER_ID}/gviz/tq?tqx=out:csv&gid=${VEHICLES_GID}`;
    const vRes = await fetch(vUrl);
    const vText = await vRes.text();
    let vehicles: any[] = [];
    Papa.parse(vText, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        vehicles = processVehicleRows(results.data as any[][]);
      }
    });

    // 2. Fetch mileage logs
    const mUrl = `https://docs.google.com/spreadsheets/d/${BACKEND_DOC_ID}/gviz/tq?tqx=out:csv&gid=${MILEAGE_GID}`;
    const mRes = await fetch(mUrl);
    const mText = await mRes.text();
    let mileageLogs: any[] = [];
    Papa.parse(mText, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const rows = results.data as any[][];
        mileageLogs = rows.slice(1).filter(row => row && row[4]).map((row): any => ({
          cd: cleanSheetValue(row[0]),          
          contractor: cleanSheetValue(row[1]),  
          week: cleanSheetValue(row[2]),        
          date: parseFlexibleDate(row[3]),      
          plate: normalizePlate(cleanSheetValue(row[4])), 
          mileage: parseInt(cleanSheetValue(row[5]).replace(/[^0-9]/g, '')) || 0 
        }));
      }
    });

    console.log(`Fetched ${vehicles.length} vehicles.`);
    console.log(`Fetched ${mileageLogs.length} mileage logs.`);

    // Check plates overlap
    const vehiclePlates = new Set(vehicles.map(v => v.plate));
    const mileagePlates = new Set(mileageLogs.map(l => l.plate));

    console.log(`Distinct vehicle plates (from master): ${vehiclePlates.size}`);
    console.log(`Distinct mileage plates (from logs): ${mileagePlates.size}`);

    // Intersection
    const intersection = Array.from(vehiclePlates).filter(p => mileagePlates.has(p));
    console.log(`Plates in both lists: ${intersection.length}`);
    if (intersection.length > 0) {
      console.log("Example matching plates:", intersection.slice(0, 5));
    }

    // Example mismatched plate in logs
    const missingInMaster = Array.from(mileagePlates).filter(p => !vehiclePlates.has(p));
    console.log(`Plates in logs but NOT in master: ${missingInMaster.length}`);
    if (missingInMaster.length > 0) {
      console.log("Example missing plates:", missingInMaster.slice(0, 5));
    }

    // Check week 28 matching specifically
    const week28Logs = mileageLogs.filter(l => extractNumber(l.week) === 28);
    console.log(`Total logs in week 28: ${week28Logs.length}`);
    const week28Plates = new Set(week28Logs.map(l => l.plate));
    console.log(`Distinct plates in week 28: ${week28Plates.size}`);

    const week28Intersection = Array.from(vehiclePlates).filter(p => week28Plates.has(p));
    console.log(`Plates in both vehicle master and week 28 logs: ${week28Intersection.length}`);

  } catch (e) {
    console.error(e);
  }
}

test();
