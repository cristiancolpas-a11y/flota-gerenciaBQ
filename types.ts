
export type DocumentStatus = 'active' | 'warning' | 'critical' | 'expired';

export interface VehicleDocument {
  expiryDate: string;
  lastRenewalDate: string;
  status: DocumentStatus;
  url?: string;
  daysPending?: number;
}

export interface Calibration {
  id: string;
  plate: string;
  equipment: string;
  cd?: string;
  contractor?: string;
  calibrationDate: string;
  expiryDate: string;
  certificateUrl?: string;
  status: DocumentStatus;
  daysPending?: number;
  month?: string;
  week?: string;
  estado?: string;
  year?: number;
}

export interface Fine {
  id: string;
  date: string; // Fecha Infracción (Index 12)
  month?: string; // Mes (Index 0)
  registrationDate?: string; // Fecha Registro (Index 1)
  plate: string; // Placa (Index 14 - Hidden/App Logic)
  infractionCode: string; // N° Comp (Index 11)
  description: string; // Concepto (Index 13)
  amount: number; // Valor (Index 10)
  status: 'PENDIENTE' | 'PAGADO'; // Tiene SI/NO (Index 8)
  evidenceUrl?: string; // Comprobante (Index 7)
  cd?: string; // CD (Index 2)
  contractor?: string; // Contratista (Index 3)
  driverName?: string; // Nombres (Index 4)
  driverId?: string; // Cédula (Index 5)
  driverPosition?: string; // Cargo (Index 6)
  paymentAgreement?: string; // Acuerdo de Pago (Index 9)
  week?: string;
  // Campos de Seguimiento Documental (Extraídos de la misma hoja)
  soatExpiry?: string;   // Index 15
  rtmExpiry?: string;    // Index 16
  extExpiry?: string;    // Index 17
}

export interface Driver {
  id: string;
  name: string;
  identification: string;
  hireDate: string;
  position?: string;
  status?: string;
  experienceTime?: string;
  licenseIssueDate?: string;
  photoUrl?: string;
  cd?: string;
  contractor?: string;
  license: VehicleDocument;
  defensiveDriving: VehicleDocument;
  medicalExam: VehicleDocument;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  cd?: string;
  contractor?: string;
  week?: string;
  soat: VehicleDocument;
  rtm: VehicleDocument;
  plc: VehicleDocument;
  extinguisher: VehicleDocument;
  calibration?: VehicleDocument;
  currentMileage?: number;
  lastMileageUpdate?: string;
  propertyCardUrl?: string;
  lastUpdate: string;
}

export interface MileageLog {
  date: string;
  plate: string;
  mileage: number;
  cd: string;
  contractor: string;
  week?: string;
}

export interface WorkshopRecord {
  id: string;
  month: string;
  week: string;
  date: string;
  plate: string;
  status: string;
  novelty: string;
  evidence1Url?: string;
  evidence2Url?: string;
  workshopName: string;
}

export interface Report {
  id: string;
  date: string;
  plate: string;
  source: string;
  cd?: string;
  contractor?: string;
  workshopDate?: string;
  initialEvidence?: string;
  novelty: string;
  daysToAttend?: number;
  entryMap?: string;
  status: 'PENDIENTES' | 'COMPLETADOS';
  workshopEvidence?: string;
  closureDate?: string;
  solutionEvidence?: string;
  exitMap?: string;
  daysInShop?: number;
  closureComments?: string;
  workshop?: string;
  week?: string;
  driverName?: string;
}

export interface WashReport {
  id: string;
  month: string;
  week: string;
  date: string;
  plate: string;
  evidenceUrl: string;
  initialEvidenceUrl?: string;
  finalEvidenceUrl?: string;
  mapUrl: string;
  workshop: string;
  status?: 'ABIERTO' | 'CERRADO';
  closureDate?: string;
}

export interface Preventive {
  id: string;
  cd: string;
  contractor: string;
  plate: string;
  lastMaintenanceMileage: number;
  nextMaintenanceMileage: number;
  currentMileage: number;
  kmsToNext: number;
  status: 'ok' | 'warning' | 'critical';
  lastUpdate?: string;
  week?: string;
  month?: string;
  evidenceUrl?: string;
  complianceStatus?: string;
  validationStatus?: string;
  frequency?: number;
  difference?: number;
}

export interface FleetComposition {
  cd: string;
  contractor: string;
  count: number;
}

export interface AvailabilityRecord {
  id: string;
  date: string;
  cd: string;
  system: string;
  detail: string;
  plate: string;
  workshop: string;
  entryDate: string;
  estimatedExitDate: string;
  contractor: string;
  daysUnavailable: number;
  fullPlate: string;
}

export interface OperationalIndicator {
  id: string;
  month: string;
  week: string;
  cd: string;
  indicator: string;
  actual: number;
  trigger: number;
  meta: number;
}

export interface CheckList {
  id: string;
  fecha: string;
  vehiculo: string;
  salida: string;
  retorno: string;
  estado: string;
  contratista: string;
  empresa: string;
  conductor: string;
  semana: string;
  novedades: string;
}

export interface FuelPerformance {
  id: string;
  month: string;
  week: string;
  date: string;
  plate: string;
  driver: string;
  contractor: string;
  cd: string;
  mileage: number;
  gallons: number;
  kmpg: number;
  speeding: number;
  idlingCount: number;
  idlingTime: string;
  trips: number;
  targetKmpg: number;
  compliance: number;
}

export interface PlateAdherence {
  id: string;
  date: string;
  plate: string;
  driverName: string;
  isValid: boolean; // Column J: 1 = true, 0 = false
}
