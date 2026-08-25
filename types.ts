
export type DocumentStatus = 'active' | 'warning' | 'critical' | 'expired';

export interface VehicleDocument {
  expiryDate: string;
  lastRenewalDate: string;
  status: DocumentStatus;
  url?: string;
  daysPending?: number;
}

export interface Corrective {
  id: string;
  date: string;
  contractor: string;
  cd: string;
  plate: string;
  system: string;
  novelty: string;
  workshop: string;
  status: string;
  exitDate: string;
  evidence1?: string;
  evidence2?: string;
  evidence3?: string;
  evidence4?: string;
}

export interface TirePressures {
  p1i?: string;
  p1f?: string;
  p2i?: string;
  p2f?: string;
  p3i?: string;
  p3f?: string;
  p4i?: string;
  p4f?: string;
  p5i?: string;
  p5f?: string;
  p6i?: string;
  p6f?: string;
  p1_inicial?: string;
  p1_final?: string;
  p2_inicial?: string;
  p2_final?: string;
  p3_inicial?: string;
  p3_final?: string;
  p4_inicial?: string;
  p4_final?: string;
  p5_inicial?: string;
  p5_final?: string;
  p6_inicial?: string;
  p6_final?: string;
}

export type CalibrationSemaforo = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';

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
  semaforo?: CalibrationSemaforo;
  daysPending?: number;
  daysToExpiry?: number;
  month?: string;
  week?: string;
  estado?: string;
  year?: number;
  pressures?: TirePressures;
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
  id?: string;
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
  semProgramado: string;       // Index 0
  fechaProgramada: string;     // Index 1
  semEjecucion: string;        // Index 2
  mes: string;                 // Index 3
  fechaEjecucion: string;      // Index 4
  placa: string;               // Index 5
  frecuencia: number;          // Index 6
  ultimoKm: number;            // Index 7
  proximoKm: number;           // Index 8
  kmRegistrado: number;        // Index 9
  tipo: string;                // Index 10
  diferencia: number;          // Index 11
  cumplimientoRango: string;   // Index 12
  validaccionCumplimiento: number; // Index 13 (1 o 0)
  cumplimientoProgramacion: number; // Index 14 (1 o 0)
  cd: string;                  // Index 16
  linea: string;               // Index 17
  evidenceUrl?: string;        // Index 15
  status: 'ok' | 'warning' | 'critical'; // Derived
}

export interface FleetComposition {
  cd: string;
  contractor: string;
  count: number;
}

export interface AvailabilityRecord {
  id: string;
  fecha: string;               // Col B
  cdRegistro: string;          // Col S (cd)
  sistema: string;             // Col D
  detalle: string;             // Col E
  placa: string;               // Col F
  taller: string;              // Col G
  fechaIngreso: string;        // Col H
  fechaEstimadaSalida: string; // Col I
  placasKey: string;           // Col J
  contratista: string;         // Col K
  diasIndisponible: number;    // Col L
  totalVH: number;             // Col M
  vehiculoIndisponible: number;// Col N
  vehiculosDisponibles: number;// Col O
  indisponibilidadPrc: number; // Col P
  disponibilidadPrc: number;    // Col Q
  vhsCd: number;               // Col R
  cdOriginal?: string;         // Col C
  mes?: string;                // Col T (Index 19)
  semana?: string;             // Col U (Index 20)
}

export interface AvailabilitySummary {
  fecha: string;               // Col B
  cd: string;                  // Col C
  contratista: string;         // Col D
  indisponibles: number;       // Col E
  disponibles: number;         // Col F
  total: number;               // Col G
  promedio: number;            // Col H
}

export interface FleetListRecord {
  placa: string;               // INDICE 0
  cd: string;                  // INDICE 1
  canal: string;               // INDICE 2
  distribuidor: string;        // INDICE 3
  contratista: string;         // INDICE 4
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
  cd?: string;
  source?: 'ARENOSA' | 'GALAPA';
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

export interface ControlTowerRecord {
  id: string;
  contractor: string;        // Indice 0: TRANSPORTISTA
  cd: string;                // Indice 1: CD
  reportDate: string;        // Indice 2: FECHA REPORTE
  week: string;              // Indice 3: SEMANA
  month: string;             // Indice 4: MES
  plate: string;             // Indice 5: PLACA
  source: string;            // Indice 6: FUENTE
  novelty: string;           // Indice 7: REPORTE
  system: string;            // Indice 8: SISTEMA
  status: string;            // Indice 9: ESTADO
  criticality: string;       // Indice 10: CRITICIDAD
  solutionDate: string;      // Indice 11: FECHA SOLUCIÓN
  closureDays: number;       // Indice 12: DÍAS DE CIERRE
  daysToClose: number;       // Indice 13: DÍAS PARA CIERRE
  maintenanceCompliance: string; // Indice 14: CUMPLIMIENTO MTTO COR
  maintenanceGoal: number;   // Indice 15: META
  workshopGoal: number;      // Indice 16: META RT
  workshopResponsePercentage: number; // Indice 17: PORCENTAJE DE RESPUESTA TALLER
  observations: string;      // Indice 18: OBSERVACIONES
  evidenceBefore?: string;   // Indice 19: EVIDENCIA ANTES (Col T)
  evidenceAfter?: string;    // Indice 20: EVIDENCIA DESPUES (Col U)
}

export interface UnavailabilityRecord {
  id: string;
  fecha: string;
  semana: string;
  placa: string;
  contratista: string;
  cd: string;
  estado: string;
  sistema: string;
  novedad: string;
  criticidad: string;
  taller: string;
  fechaIngreso: string;
  fechaSalida: string;
  diasTaller: number;
}

export interface OperatorRecord {
  id: string;
  cd: string;                // Indice 1
  provider: string;          // Indice 2
  name: string;              // Indice 3
  identification: string;    // Indice 4
  position: string;          // Indice 5
  hireDate: string;          // Indice 7
  licenseExpiry: string;     // Indice 14
  licenseDaysPending: number;// Indice 15
  category: string;          // Indice 16
  restrictions: string;      // Indice 17
  fines: string;             // Indice 18
  courseExpiry: string;      // Indice 22
  courseDaysPending: number; // Indice 23
  entity: string;            // Indice 24
  examStatus: string;        // Indice 25
  examExpiry: string;        // Indice 26
  examDaysPending: number;   // Indice 27
  opmCourseDate: string;     // Indice 28
  opmExpiry: string;         // Indice 29
  opmDaysPending: number;    // Indice 30
  opmEntity: string;         // Indice 31
  licenseUrl?: string;       // Indice 32 (AG)
  courseUrl?: string;        // Indice 33 (AH)
  examUrl?: string;          // Indice 34 (AI)
  opmUrl?: string;           // Indice 35 (AJ)
  photoUrl?: string;         // Indice 36 (AK)
}

export interface FleetStandardAudit {
  id: string;               // Col A
  startTime: string;        // Col B
  endTime: string;          // Col C
  email: string;            // Col D
  regional: string;         // Col E
  centro: string;           // Col F
  tipoAuditoria: string;    // Col G
  auditor: string;          // Col H
  placa: string;            // Col I
  // Security Items (Scores AU-BQ)
  securityScores: number[]; // AU to BQ (27 cols)
  // Quality Items (Scores BR-BW)
  qualityScores: number[];  // BR to BW (6 cols)
  // Scores Finales
  scoreSegNoMand: number;   // Col BX
  scoreCalNoMand: number;   // Col BY
  scoreTotalNoMand: number; // Col BZ
  scoreSegMand: number;     // Col CA
  scoreCalMand: number;     // Col CB
  scoreTotalMand: number;   // Col CC
  // Meta
  observations: string;     // Col AQ
  mes: string;              // Col AR
  año: number;              // Col AS
  tiempoMin: number;        // Col AT
  // Novedades
  estado?: string;          // Col CK
  fechaCierre?: string;     // Col CI
  diasCierre?: number;      // Col CJ
  evidenciaAntes?: string;  // Col CH
  evidenciaDespues?: string; // Col CL
}

export interface AuditRecord {
  id: string;
  regional: string;
  cd: string;
  auditType: string;
  auditor: string;
  plate: string;
  observations: string;
  month: string;
  year: number;
  docBin: number[]; 
  signBin: number[]; 
  imgBin: number[]; 
  docNoMand: number;
  signNoMand: number;
  imgNoMand: number;
  totalNoMand: number;
  docMand: number;
  signMand: number;
  imgMand: number;
  totalMand: number;
  date: string;
  status: string;
  noveltyDate: string;
  evidence?: string;
  noveltyObservation?: string;
  verification?: string;
  isCierre?: boolean;
  executionTime?: number;
}

export interface AuditMasterVehicle {
  plate: string;
  contractor: string;
  cd: string;
}

export interface ForkliftFine {
  id: string;
  month: string;              // MES Col A
  date: string;               // FECHA Col B
  cd: string;                 // CD Col C
  contractor: string;         // CONTRATISTA Col D
  driverName: string;         // NOMBRES Col E
  driverId: string;           // CÉDULA Col F
  driverPosition: string;     // CARGO Col G
  revision01To15Pdf?: string; // REVISION DEL 01 - 15 Col H (links to PDF)
  revisionDate?: string;      // FECHA Col I
  revision15To30Pdf?: string; // REVISION 15 - 30 Col J (links to PDF)
  hasFine: string;            // TIENE SI/NO Col K
  observation: string;        // OBSERVACION Col L
  paymentAgreement: string;   // ACUERDO DE PAGO Col M
  receiptPdf?: string;        // COMPROBANTE Col N
  amount: number;             // VALOR Col O
  receiptNo: string;          // N° COMP Col P
  concept: string;            // CONCEPTO Col Q
}

export interface WorkshopActivityRecord {
  contratista: string;
  placa: string;
  sucursal: string;
  vehiculo: string;
  proveedor: string;
  revision: number;
  fechaIngreso: string; // YYYY-MM-DD
  fechaSalida: string; // YYYY-MM-DD
  diasTaller: number;
  horasTaller: number;
  cd: string;
  componentes: string;
  sistema: string;
  insumosMenores: string;
  actividad: string;
  tipoIngreso: 'PREVENTIVO' | 'CORRECTIVO';
}

export interface VclBillingRecord {
  id: string;
  cd: string;
  fecha: string;
  proveedor: string;
  sistema: string;
  empresaAsume: string;
  valor: number;
}

export interface FleetCierreRecord {
  id: string;
  fecha: string;        // Columna A (FECHA)
  cd: string;           // Columna B (CD)
  placa: string;        // Columna C (PLACA)
  item: string;         // Columna D (ITEM)
  verificacion: string; // Columna E (VERIFICACION)
  evidencia: string;    // Columna F (EVIDENCIA)
  estado: string;       // Columna G (ESTADO)
  contratista?: string;  // Derived or optional
}

export interface FleetSeguimientoRecord {
  id: string;
  llave?: string;       // Indice 0 (LLAVE)
  fecha?: string;       // Indice 1 (FECHA)
  mes: string;          // Indice 2 (MES)
  cd: string;           // Indice 3 (CD)
  contratista: string;  // Indice 4 (contratista)
  placa: string;        // Indice 5 (PLACA / MATRÍCULA)
  validador: string;    // Indice 6 (VALIDADOR)
  encargado: string;    // Indice 7 (ENCARCADO / ENCARGADO)
}

export interface VaradaRecord {
  id?: string;
  week: string;            // Indice 0: SEMANA
  breakdownDate: string;   // Indice 1: FECHA DE VARADA
  plate: string;           // Indice 2: PLACA
  location: string;        // Indice 3: LUGAR DE VARADA
  system: string;          // Indice 4: SISTEMA
  component: string;       // Indice 5: COMPONENTE
  description: string;     // Indice 6: DESCRIPCION
  workshop: string;        // Indice 7: TALLER QUE PRESTA EL SERVICIO
  towed: string;           // Indice 8: TRANSPORTADO EN GRUA
  solutionDate?: string;   // Indice 9: FECHA DE SOLUCION
  observation?: string;    // Indice 10: OBSERVACION
  hoursDown?: number | string; // Indice 11: HORAS VARADOS
  evidence?: string;       // Indice 12: EVIDENCIA
  status?: 'ABIERTO' | 'CERRADO' | string;
}

export interface SparePartRecord {
  id: string;
  fecha: string;         // FECHA
  inspector: string;     // INSPECTOR
  proveedor: string;     // PROVEEDOR
  taller: string;        // TALLER
  repuesto: string;      // REPUESTO
  cantidad: number;      // CANTIDAD ENCONTRADA
  minimo: number;        // MINIMO REQUERIDO
  und: string;           // UND
  estado: string;        // ESTADO (OK / ALERTA)
  observacion: string;   // OBSERVACION
}

export interface SparePartDefinition {
  name: string;
  min: number;
  unit: string;
}






