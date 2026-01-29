
export type DocumentStatus = 'active' | 'warning' | 'expired';

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
}

export interface Driver {
  id: string;
  name: string;
  identification: string;
  hireDate: string;
  position?: string;
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

export interface Report {
  id: string;
  date: string;
  plate: string;
  source: string;
  novelty: string;
  initialEvidence?: string;
  entryMap?: string;
  status: 'ABIERTO' | 'CERRADO';
  workshopEvidence?: string;
  closureDate?: string;
  solutionEvidence?: string;
  exitMap?: string;
  daysInShop?: number;
  closureComments?: string;
  workshop?: string;
  cd?: string;
}

export interface FiveSReport {
  id: string;
  date: string;
  month?: string;
  week?: string;
  plate: string;
  inspector: string;
  totalScore: number;
  observations?: string;
  evidenceUrl?: string;
  status: 'ABIERTO' | 'CERRADO';
  closureDate?: string;
  closureEvidenceUrl?: string;
  closureObservations?: string;
  cd?: string;
}

export interface MaintenanceInsight {
  score: number;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}
