import React, { useMemo, useState } from "react";
import { AuditRecord, AuditMasterVehicle, FleetCierreRecord, FleetListRecord } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Label,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  LabelList,
} from "recharts";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Filter,
  MapPin,
  Calendar,
  Search,
  Info,
  BarChart3,
  List,
  ChevronRight,
  X,
  User,
  Fuel,
  Target,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  Upload,
  Save,
  Loader2,
  Trash2,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { submitAuditUpdateToSheet, submitFleetCierreUpdateToSheet } from "../services/sheetService";
import { getDriveDirectLink, createMosaic, compressImage } from "../utils";
import { FleetSeguimientoTab } from "./FleetSeguimientoTab";

interface FleetStandardModuleProps {
  data: AuditRecord[];
  masterList: AuditMasterVehicle[];
  cierreRecords?: FleetCierreRecord[];
  fleetBase?: FleetListRecord[];
  onUpdateRecord?: (updatedRecord: any, isCierre: boolean) => void;
}

const ITEM_LABELS = {
  doc: [
    "Tarjeta de propiedad",
    "SOAT",
    "RTM",
    "Ficha Técnica homologación",
    "Acta de Comodato",
    "Permiso de concepto sanitario",
    "Permiso de circulación",
    "Permiso de cargue y descargue",
    "Certificado de fumigación",
    "Ficha técnica",
  ],
  sign: [
    "Avisos reglamentarios y corporativos",
    "Capacidad de carga en carretillas",
    "Prevención de la violencia",
    "Cintas reflectivas",
    "Cintas reflectivas (nivel 3)",
    "Placas adhesivas",
    "Placa metálica",
    "Etiqueta SGA",
    "Marcación 3 puntos de apoyo",
    "Calificación y estándar de 5S",
    "Números de emergencia",
  ],
  img: [
    "Carpas y cortinas en buen estado",
    "Estado de la imagen",
    "Imagen actualizada",
  ],
};

const getTrafficColor = (percent: number) => {
  if (percent >= 90) return "#10b981"; // green-500
  if (percent >= 70) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
};

const MetricCard = ({
  title,
  value,
  subtitle,
  color,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: any;
}) => (
  <div className="bg-[#1a1a2e] border border-slate-800 p-6 rounded-2xl shadow-xl flex items-start gap-4">
    {Icon && (
      <div className="p-3 bg-[#0f172a] rounded-xl text-slate-400">
        <Icon size={24} />
      </div>
    )}
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
        {title}
      </p>
      <h3
        className="text-3xl font-black text-white"
        style={{ color: color || "white" }}
      >
        {value}
      </h3>
      {subtitle && (
        <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-tight">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

const GaugeMetric = ({
  value,
  title,
  subValue,
  category,
}: {
  value: number;
  title: string;
  subValue: string;
  category: string;
}) => {
  const color = getTrafficColor(value);
  const data = [
    { value: value, fill: color },
    { value: Math.max(0, 100 - value), fill: "#1e293b" },
  ];

  return (
    <div className="bg-[#1e1e35] p-6 rounded-3xl border border-slate-800 flex flex-col items-center">
      <div className="w-full h-32 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={60}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={5}
            >
              <Label
                value={`${value.toFixed(0)}%`}
                position="center"
                style={{ fontSize: "20px", fontWeight: 900, fill: "white" }}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center mt-2">
        <p className="text-white font-black text-sm uppercase tracking-tighter">
          {title}
        </p>
        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
          NO MANDATORIO: {subValue}%
        </p>
      </div>
    </div>
  );
};

const NovedadesDonut = ({ compliance }: { compliance: number }) => {
  const data = [
    { value: compliance, fill: "#6366f1" },
    { value: Math.max(0, 100 - compliance), fill: "#1e293b" },
  ];
  return (
    <div className="w-24 h-24 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={42}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            cornerRadius={4}
          >
            <Label
              value={`${compliance.toFixed(1)}%`}
              position="center"
              style={{ fontSize: "10px", fontWeight: 900, fill: "white" }}
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const FleetStandardModule: React.FC<FleetStandardModuleProps> = ({
  data,
  masterList,
  cierreRecords,
  fleetBase,
  onUpdateRecord,
}) => {
  const [filterRegional, setFilterRegional] = useState<string>("Todas");
  const [filterCD, setFilterCD] = useState<string>("Todos");
  const [filterMonth, setFilterMonth] = useState<string>("Todos");
  const [filterYear, setFilterYear] = useState<string>("Todos");
  const [filterAuditor, setFilterAuditor] = useState<string>("Todos");
  const [filterContractor, setFilterContractor] = useState<string>("Todos");
  const [filterDuration, setFilterDuration] = useState<string>("Todos");
  const [filterCategory, setFilterCategory] = useState<string>("Todos");
  const [filterPlate, setFilterPlate] = useState<string>("Todos");
  
  const plates = useMemo(() => {
    const list = new Set<string>();
    masterList.forEach((m) => {
      if (m.plate) list.add(m.plate.toUpperCase().trim());
    });
    data.forEach((r) => {
      if (r.plate) list.add(r.plate.toUpperCase().trim());
    });
    if (cierreRecords) {
      cierreRecords.forEach((c) => {
        if (c.placa) list.add(c.placa.toUpperCase().trim());
      });
    }
    return Array.from(list).sort();
  }, [data, masterList, cierreRecords]);

  const [activeTab, setActiveTab] = useState<"dashboard" | "novedades" | "seguimiento">("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);

  // Evidence Registration State
  const [selectedNovelty, setSelectedNovelty] = useState<AuditRecord | null>(
    null,
  );
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [noveltyEvidence, setNoveltyEvidence] = useState<string[]>([]);
  const [noveltyObs, setNoveltyObs] = useState("");
  const [noveltyStatus, setNoveltyStatus] = useState("PENDIENTE");
  const [noveltyVerification, setNoveltyVerification] = useState("NO");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gallery View State
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [filterNovelty, setFilterNovelty] = useState<string>("Todos");
  const [filterCierreEstado, setFilterCierreEstado] = useState<"TODOS" | "PENDIENTE" | "REALIZADO">("TODOS");
  const [isDragging, setIsDragging] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files)
        .slice(0, 4 - noveltyEvidence.length)
        .forEach((file: File) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const rawBase64 = reader.result as string;
            try {
              const compressed = await compressImage(rawBase64, 1024);
              setNoveltyEvidence((prev) => [...prev, compressed]);
            } catch (err) {
              setNoveltyEvidence((prev) => [...prev, rawBase64]);
            }
          };
          reader.readAsDataURL(file);
        });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []) as File[];
    const imageFiles = files.filter(f => f.type && f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      const remainingSlots = 4 - noveltyEvidence.length;
      imageFiles.slice(0, remainingSlots).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawBase64 = reader.result as string;
          try {
            const compressed = await compressImage(rawBase64, 1024);
            setNoveltyEvidence((prev) => [...prev, compressed]);
          } catch (err) {
            setNoveltyEvidence((prev) => [...prev, rawBase64]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSaveEvidence = async () => {
    if (!selectedNovelty) return;
    setIsSubmitting(true);
    try {
      let finalEvidence = "";
      if (noveltyEvidence.length > 0) {
        if (noveltyEvidence.length === 1) {
          finalEvidence = noveltyEvidence[0];
        } else {
          // Use the robust utility from utils.ts
          const title = `EVIDENCIA: ${selectedNovelty.plate} - ${selectedNovelty.auditType}`;
          finalEvidence = await createMosaic(noveltyEvidence, title);
        }
      }

      let success = false;
      if (selectedNovelty.isCierre) {
        success = await submitFleetCierreUpdateToSheet({
          plate: selectedNovelty.plate,
          item: selectedNovelty.observations, // observations maps to c.item
          status: noveltyStatus,
          evidence: finalEvidence,
          verification: noveltyVerification
        });
      } else {
        success = await submitAuditUpdateToSheet({
          id: selectedNovelty.id,
          status: noveltyStatus,
          noveltyDate: new Date().toISOString().split("T")[0],
          evidence: finalEvidence,
          noveltyObservation: noveltyObs,
        });
      }
      if (success) {
        setIsEvidenceModalOpen(false);
        if (onUpdateRecord) {
          if (selectedNovelty.isCierre) {
            onUpdateRecord({
              plate: selectedNovelty.plate,
              item: selectedNovelty.observations,
              status: noveltyStatus,
              evidence: finalEvidence,
              verification: noveltyVerification
            }, true);
          } else {
            onUpdateRecord({
              id: selectedNovelty.id,
              status: noveltyStatus,
              noveltyDate: new Date().toISOString().split("T")[0],
              evidence: finalEvidence,
              noveltyObservation: noveltyObs,
            }, false);
          }
        }
        alert("EVIDENCIA REGISTRADA EXITOSAMENTE. LOS CAMBIOS SE HAN SINCROINZADO EN TIEMPO REAL.");
      } else {
        alert("No se pudo guardar la evidencia. Verifique la conexión.");
      }
    } catch (e) {
      alert("Error al guardar: " + e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const plateToContractor = useMemo(() => {
    const map: Record<string, string> = {};
    masterList.forEach((m) => {
      if (m.plate) {
        map[m.plate.toUpperCase().trim()] = m.contractor || "NO ASIGNADO";
      }
    });
    return map;
  }, [masterList]);

  const regionals = useMemo(
    () => Array.from(new Set(data.map((r) => r.regional))).filter(Boolean),
    [data],
  );
  const cds = useMemo(() => {
    const list =
      filterRegional === "Todas"
        ? data
        : data.filter((r) => r.regional === filterRegional);
    return Array.from(new Set(list.map((r) => r.cd))).filter(Boolean);
  }, [data, filterRegional]);
  const months = useMemo(
    () => Array.from(new Set(data.map((r) => r.month))).filter(Boolean),
    [data],
  );
  const years = useMemo(
    () =>
      Array.from(new Set(data.map((r) => r.year.toString()))).filter(Boolean),
    [data],
  );

  const auditors = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.auditor)))
      .filter(Boolean)
      .sort();
  }, [data]);

  const contractors = useMemo(() => {
    return Array.from(
      new Set(
        data.map(
          (r) =>
            plateToContractor[r.plate.toUpperCase().trim()] || "NO ASIGNADO",
        ),
      ),
    )
      .filter(Boolean)
      .sort();
  }, [data, plateToContractor]);

  const filteredData = useMemo(() => {
    return data.filter((r) => {
      const matchRegional =
        filterRegional === "Todas" || (r.regional || "").toLowerCase().trim() === filterRegional.toLowerCase().trim();
      const matchCD = filterCD === "Todos" || (r.cd || "").toLowerCase().trim() === filterCD.toLowerCase().trim() || (r.cd || "").toLowerCase().includes(filterCD.toLowerCase().replace('dc ', '').trim());
      const matchMonth = filterMonth === "Todos" || (r.month || "").toLowerCase().trim() === filterMonth.toLowerCase().trim();
      const matchYear =
        filterYear === "Todos" || (r.year ? r.year.toString() : "") === filterYear;
      const matchAuditor =
        filterAuditor === "Todos" || (r.auditor || "").toLowerCase().trim() === filterAuditor.toLowerCase().trim();

      const contr =
        plateToContractor[r.plate.toUpperCase().trim()] || "NO ASIGNADO";
      const matchContractor =
        filterContractor === "Todos" || contr.toLowerCase().trim() === filterContractor.toLowerCase().trim();

      const matchPlate =
        filterPlate === "Todos" || r.plate.toUpperCase().trim() === filterPlate.toUpperCase().trim();

      // Duration Filter
      const bucket = r.executionTime ? Math.floor(r.executionTime) : 0;
      const bucketLabel = r.executionTime
        ? bucket === 0
          ? "< 1 min"
          : `${bucket} min`
        : "Sin Registro";
      const matchDuration =
        filterDuration === "Todos" || bucketLabel === filterDuration;

      // Category Filter (non-compliance in that category)
      const matchCategory =
        filterCategory === "Todos" ||
        (filterCategory === "Documentación"
          ? r.docMand < 100 || r.docNoMand < 100
          : filterCategory === "Señalización"
            ? r.signMand < 100 || r.signNoMand < 100
            : filterCategory === "Imagen"
              ? r.imgMand < 100 || r.imgNoMand < 100
              : true);

      const matchSearch =
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.observations || "").toLowerCase().includes(searchTerm.toLowerCase());
      return (
        matchRegional &&
        matchCD &&
        matchMonth &&
        matchYear &&
        matchAuditor &&
        matchContractor &&
        matchPlate &&
        matchDuration &&
        matchCategory &&
        matchSearch
      );
    });
  }, [
    data,
    filterRegional,
    filterCD,
    filterMonth,
    filterYear,
    filterAuditor,
    filterContractor,
    filterPlate,
    filterDuration,
    filterCategory,
    plateToContractor,
    searchTerm,
  ]);

  // SPECIAL SUBSETS FOR GRAPH CONTEXT STABILITY (CROSS-FILTERING HIGHLIGHT STYLE)

  // 1. CD Rankings context (Exclude filterCD)
  const filteredDataExcludingCD = useMemo(() => {
    return data.filter((r) => {
      const matchRegional =
        filterRegional === "Todas" || r.regional === filterRegional;
      const matchMonth = filterMonth === "Todos" || r.month === filterMonth;
      const matchYear =
        filterYear === "Todos" || r.year.toString() === filterYear;
      const matchAuditor =
        filterAuditor === "Todos" || r.auditor === filterAuditor;
      const contr =
        plateToContractor[r.plate.toUpperCase().trim()] || "NO ASIGNADO";
      const matchContractor =
        filterContractor === "Todos" || contr === filterContractor;

      const bucket = r.executionTime ? Math.floor(r.executionTime) : 0;
      const bucketLabel = r.executionTime
        ? bucket === 0
          ? "< 1 min"
          : `${bucket} min`
        : "Sin Registro";
      const matchDuration =
        filterDuration === "Todos" || bucketLabel === filterDuration;

      const matchCategory =
        filterCategory === "Todos" ||
        (filterCategory === "Documentación"
          ? r.docMand < 100 || r.docNoMand < 100
          : filterCategory === "Señalización"
            ? r.signMand < 100 || r.signNoMand < 100
            : filterCategory === "Imagen"
              ? r.imgMand < 100 || r.imgNoMand < 100
              : true);

      const matchSearch =
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.observations || "").toLowerCase().includes(searchTerm.toLowerCase());
      return (
        matchRegional &&
        matchMonth &&
        matchYear &&
        matchAuditor &&
        matchContractor &&
        matchDuration &&
        matchCategory &&
        matchSearch
      );
    });
  }, [
    data,
    filterRegional,
    filterMonth,
    filterYear,
    filterAuditor,
    filterContractor,
    filterDuration,
    filterCategory,
    plateToContractor,
    searchTerm,
  ]);

  // 2. Trend charts context (Exclude filterMonth & filterYear)
  const filteredDataExcludingTime = useMemo(() => {
    return data.filter((r) => {
      const matchRegional =
        filterRegional === "Todas" || r.regional === filterRegional;
      const matchCD = filterCD === "Todos" || r.cd === filterCD;
      const matchAuditor =
        filterAuditor === "Todos" || r.auditor === filterAuditor;
      const contr =
        plateToContractor[r.plate.toUpperCase().trim()] || "NO ASIGNADO";
      const matchContractor =
        filterContractor === "Todos" || contr === filterContractor;

      const bucket = r.executionTime ? Math.floor(r.executionTime) : 0;
      const bucketLabel = r.executionTime
        ? bucket === 0
          ? "< 1 min"
          : `${bucket} min`
        : "Sin Registro";
      const matchDuration =
        filterDuration === "Todos" || bucketLabel === filterDuration;

      const matchCategory =
        filterCategory === "Todos" ||
        (filterCategory === "Documentación"
          ? r.docMand < 100 || r.docNoMand < 100
          : filterCategory === "Señalización"
            ? r.signMand < 100 || r.signNoMand < 100
            : filterCategory === "Imagen"
              ? r.imgMand < 100 || r.imgNoMand < 100
              : true);

      const matchSearch =
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.observations || "").toLowerCase().includes(searchTerm.toLowerCase());
      return (
        matchRegional &&
        matchCD &&
        matchAuditor &&
        matchContractor &&
        matchDuration &&
        matchCategory &&
        matchSearch
      );
    });
  }, [
    data,
    filterRegional,
    filterCD,
    filterAuditor,
    filterContractor,
    filterDuration,
    filterCategory,
    plateToContractor,
    searchTerm,
  ]);

  // 3. Auditor ranking context (Exclude filterAuditor)
  const filteredDataExcludingAuditor = useMemo(() => {
    return data.filter((r) => {
      const matchRegional =
        filterRegional === "Todas" || r.regional === filterRegional;
      const matchCD = filterCD === "Todos" || r.cd === filterCD;
      const matchMonth = filterMonth === "Todos" || r.month === filterMonth;
      const matchYear =
        filterYear === "Todos" || r.year.toString() === filterYear;
      const contr =
        plateToContractor[r.plate.toUpperCase().trim()] || "NO ASIGNADO";
      const matchContractor =
        filterContractor === "Todos" || contr === filterContractor;

      const bucket = r.executionTime ? Math.floor(r.executionTime) : 0;
      const bucketLabel = r.executionTime
        ? bucket === 0
          ? "< 1 min"
          : `${bucket} min`
        : "Sin Registro";
      const matchDuration =
        filterDuration === "Todos" || bucketLabel === filterDuration;

      const matchCategory =
        filterCategory === "Todos" ||
        (filterCategory === "Documentación"
          ? r.docMand < 100 || r.docNoMand < 100
          : filterCategory === "Señalización"
            ? r.signMand < 100 || r.signNoMand < 100
            : filterCategory === "Imagen"
              ? r.imgMand < 100 || r.imgNoMand < 100
              : true);

      const matchSearch =
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.observations || "").toLowerCase().includes(searchTerm.toLowerCase());
      return (
        matchRegional &&
        matchCD &&
        matchMonth &&
        matchYear &&
        matchContractor &&
        matchDuration &&
        matchCategory &&
        matchSearch
      );
    });
  }, [
    data,
    filterRegional,
    filterCD,
    filterMonth,
    filterYear,
    filterContractor,
    filterDuration,
    filterCategory,
    plateToContractor,
    searchTerm,
  ]);

  // 4. Contractor context (Exclude filterContractor)
  const filteredDataExcludingContractor = useMemo(() => {
    return data.filter((r) => {
      const matchRegional =
        filterRegional === "Todas" || r.regional === filterRegional;
      const matchCD = filterCD === "Todos" || r.cd === filterCD;
      const matchMonth = filterMonth === "Todos" || r.month === filterMonth;
      const matchYear =
        filterYear === "Todos" || r.year.toString() === filterYear;
      const matchAuditor =
        filterAuditor === "Todos" || r.auditor === filterAuditor;

      const bucket = r.executionTime ? Math.floor(r.executionTime) : 0;
      const bucketLabel = r.executionTime
        ? bucket === 0
          ? "< 1 min"
          : `${bucket} min`
        : "Sin Registro";
      const matchDuration =
        filterDuration === "Todos" || bucketLabel === filterDuration;

      const matchCategory =
        filterCategory === "Todos" ||
        (filterCategory === "Documentación"
          ? r.docMand < 100 || r.docNoMand < 100
          : filterCategory === "Señalización"
            ? r.signMand < 100 || r.signNoMand < 100
            : filterCategory === "Imagen"
              ? r.imgMand < 100 || r.imgNoMand < 100
              : true);

      const matchSearch =
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.observations || "").toLowerCase().includes(searchTerm.toLowerCase());
      return (
        matchRegional &&
        matchCD &&
        matchMonth &&
        matchYear &&
        matchAuditor &&
        matchDuration &&
        matchCategory &&
        matchSearch
      );
    });
  }, [
    data,
    filterRegional,
    filterCD,
    filterMonth,
    filterYear,
    filterAuditor,
    filterDuration,
    filterCategory,
    searchTerm,
  ]);

  // 5. Category average context (Exclude filterCategory)
  const filteredDataExcludingCategory = useMemo(() => {
    return data.filter((r) => {
      const matchRegional =
        filterRegional === "Todas" || r.regional === filterRegional;
      const matchCD = filterCD === "Todos" || r.cd === filterCD;
      const matchMonth = filterMonth === "Todos" || r.month === filterMonth;
      const matchYear =
        filterYear === "Todos" || r.year.toString() === filterYear;
      const matchAuditor =
        filterAuditor === "Todos" || r.auditor === filterAuditor;
      const contr =
        plateToContractor[r.plate.toUpperCase().trim()] || "NO ASIGNADO";
      const matchContractor =
        filterContractor === "Todos" || contr === filterContractor;

      const bucket = r.executionTime ? Math.floor(r.executionTime) : 0;
      const bucketLabel = r.executionTime
        ? bucket === 0
          ? "< 1 min"
          : `${bucket} min`
        : "Sin Registro";
      const matchDuration =
        filterDuration === "Todos" || bucketLabel === filterDuration;

      const matchSearch =
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.observations || "").toLowerCase().includes(searchTerm.toLowerCase());
      return (
        matchRegional &&
        matchCD &&
        matchMonth &&
        matchYear &&
        matchAuditor &&
        matchContractor &&
        matchDuration &&
        matchSearch
      );
    });
  }, [
    data,
    filterRegional,
    filterCD,
    filterMonth,
    filterYear,
    filterAuditor,
    filterContractor,
    filterDuration,
    plateToContractor,
    searchTerm,
  ]);

  // 6. Duration distribution context (Exclude filterDuration)
  const filteredDataExcludingDuration = useMemo(() => {
    return data.filter((r) => {
      const matchRegional =
        filterRegional === "Todas" || r.regional === filterRegional;
      const matchCD = filterCD === "Todos" || r.cd === filterCD;
      const matchMonth = filterMonth === "Todos" || r.month === filterMonth;
      const matchYear =
        filterYear === "Todos" || r.year.toString() === filterYear;
      const matchAuditor =
        filterAuditor === "Todos" || r.auditor === filterAuditor;
      const contr =
        plateToContractor[r.plate.toUpperCase().trim()] || "NO ASIGNADO";
      const matchContractor =
        filterContractor === "Todos" || contr === filterContractor;

      const matchCategory =
        filterCategory === "Todos" ||
        (filterCategory === "Documentación"
          ? r.docMand < 100 || r.docNoMand < 100
          : filterCategory === "Señalización"
            ? r.signMand < 100 || r.signNoMand < 100
            : filterCategory === "Imagen"
              ? r.imgMand < 100 || r.imgNoMand < 100
              : true);

      const matchSearch =
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.observations || "").toLowerCase().includes(searchTerm.toLowerCase());
      return (
        matchRegional &&
        matchCD &&
        matchMonth &&
        matchYear &&
        matchAuditor &&
        matchContractor &&
        matchCategory &&
        matchSearch
      );
    });
  }, [
    data,
    filterRegional,
    filterCD,
    filterMonth,
    filterYear,
    filterAuditor,
    filterContractor,
    filterCategory,
    plateToContractor,
    searchTerm,
  ]);

  const joinedNovedades = useMemo(() => {
    const rawNovedades = filteredData.filter((r) => {
      const obs = (r.observations || "").trim().toLowerCase();
      return obs !== "" && obs !== "sin observación registrada";
    });
    return rawNovedades.map((r) => {
      const master = masterList.find((m) => m.plate === r.plate);
      return { ...r, contractorName: master?.contractor || "NO ASIGNADO" };
    });
  }, [filteredData, masterList]);

  const mappedCierreRecords = useMemo(() => {
    if (!cierreRecords || cierreRecords.length === 0) return [];
    
    const monthNames = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    return cierreRecords.map((c) => {
      let monthName = "enero";
      let yearVal = 2026;
      if (c.fecha) {
        const parts = c.fecha.split("-");
        if (parts.length === 3) {
          yearVal = parseInt(parts[0]) || 2026;
          const monthIdx = parseInt(parts[1]) - 1;
          if (monthIdx >= 0 && monthIdx < 12) {
            monthName = monthNames[monthIdx];
          }
        }
      }

      let regionalVal = "Norte";
      const match = data.find(r => r.cd.trim().toLowerCase() === c.cd.trim().toLowerCase());
      if (match && match.regional) {
        regionalVal = match.regional;
      } else {
        const cleanCD = c.cd.trim().toLowerCase();
        if (cleanCD.includes("galapa") || cleanCD.includes("arenosa") || cleanCD.includes("turbaco") || cleanCD.includes("norte") || cleanCD.includes("soledad") || cleanCD.includes("barranquilla")) {
          regionalVal = "Norte";
        } else if (cleanCD.includes("pasto") || cleanCD.includes("sur") || cleanCD.includes("cali") || cleanCD.includes("palmira") || cleanCD.includes("popayan")) {
          regionalVal = "Sur";
        } else if (cleanCD.includes("siberia") || cleanCD.includes("centro") || cleanCD.includes("bogota") || cleanCD.includes("funza")) {
          regionalVal = "Centro";
        } else if (cleanCD.includes("andes") || cleanCD.includes("medellin") || cleanCD.includes("bucaramanga") || cleanCD.includes("pereira")) {
          regionalVal = "Andes";
        }
      }

      return {
        id: c.id,
        regional: regionalVal,
        cd: c.cd,
        auditType: "CIERRE",
        auditor: "SISTEMA",
        plate: c.placa,
        observations: c.item || "Falla detectada",
        month: monthName,
        year: yearVal,
        status: c.estado || "PENDIENTE",
        date: c.fecha,
        noveltyDate: c.fecha,
        evidence: c.evidencia || "",
        verification: c.verificacion || "",
        isCierre: true,
        docBin: [],
        signBin: [],
        imgBin: [],
        docNoMand: 0,
        signNoMand: 0,
        imgNoMand: 0,
        totalNoMand: 0,
        docMand: 0,
        signMand: 0,
        imgMand: 0,
        totalMand: 0
      } as AuditRecord;
    });
  }, [cierreRecords, data]);

  const noveltyOptions = useMemo(() => {
    const list = new Set<string>();
    if (mappedCierreRecords.length > 0) {
      mappedCierreRecords.forEach((r) => {
        if (r.observations) {
          const trimmed = r.observations.trim();
          if (trimmed) list.add(trimmed);
        }
      });
    } else {
      data.forEach((r) => {
        const obs = (r.observations || "").trim();
        if (obs && obs.toLowerCase() !== "sin observación registrada") {
          list.add(obs);
        }
      });
    }
    return Array.from(list).sort();
  }, [mappedCierreRecords, data]);

  const filteredCierreRecords = useMemo(() => {
    if (mappedCierreRecords.length === 0) return [];
    return mappedCierreRecords.filter((r) => {
      const regClean = (r.regional || "").toLowerCase().trim();
      const selRegClean = filterRegional.toLowerCase().trim();
      const matchRegional = filterRegional === "Todas" || regClean === selRegClean || regClean.includes(selRegClean) || selRegClean.includes(regClean);

      const cdClean = (r.cd || "").toLowerCase().trim();
      const selCdClean = filterCD.toLowerCase().trim();
      const selCdNoDC = selCdClean.replace('dc ', '').trim();
      const matchCD = filterCD === "Todos" || cdClean === selCdClean || cdClean.includes(selCdNoDC);

      const matchMonth = filterMonth === "Todos" || (r.month || "").toLowerCase().trim() === filterMonth.toLowerCase().trim();
      const matchYear = filterYear === "Todos" || (r.year ? r.year.toString() : "") === filterYear;

      let matchContractor = true;
      if (filterContractor !== "Todos") {
        const master = masterList.find((m) => m.plate.toUpperCase().trim() === r.plate.toUpperCase().trim());
        const recordContractor = (master?.contractor || "Otros").toLowerCase().trim();
        matchContractor = recordContractor === filterContractor.toLowerCase().trim();
      }

      const matchPlate = filterPlate === "Todos" || r.plate.toUpperCase().trim() === filterPlate.toUpperCase().trim();

      const matchNovelty = filterNovelty === "Todos" || (r.observations || "").toLowerCase().trim() === filterNovelty.toLowerCase().trim();

      const matchSearch = !searchTerm ||
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.observations || "").toLowerCase().includes(searchTerm.toLowerCase());

      return matchRegional && matchCD && matchMonth && matchYear && matchContractor && matchPlate && matchNovelty && matchSearch;
    });
  }, [mappedCierreRecords, filterRegional, filterCD, filterMonth, filterYear, filterContractor, filterPlate, filterNovelty, searchTerm, masterList]);

  const novedadesData = useMemo(() => {
    if (cierreRecords && cierreRecords.length > 0) {
      return filteredCierreRecords;
    }
    const rawNovedades = filteredData.filter((r) => {
      const obs = (r.observations || "").trim().toLowerCase();
      const matchNovelty = filterNovelty === "Todos" || r.observations === filterNovelty;
      return obs !== "" && obs !== "sin observación registrada" && matchNovelty;
    });
    return rawNovedades;
  }, [cierreRecords, filteredCierreRecords, filteredData, filterNovelty]);

  const displayedNovedadesData = useMemo(() => {
    return novedadesData.filter((r) => {
      const isRealizado = r.status?.toUpperCase() === "REALIZADO";
      if (filterCierreEstado === "PENDIENTE") {
        return !isRealizado;
      }
      if (filterCierreEstado === "REALIZADO") {
        return isRealizado;
      }
      return true;
    });
  }, [novedadesData, filterCierreEstado]);

  const handleExportNovedades = () => {
    if (displayedNovedadesData.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const exportData = displayedNovedadesData.map((item) => ({
      "FECHA REGISTRO / CIERRE": item.noveltyDate || item.date || "",
      "MES": item.month ? item.month.toUpperCase() : "",
      "AÑO": item.year || "",
      "REGIONAL": item.regional ? item.regional.toUpperCase() : "",
      "CENTRO DE DISTRIBUCIÓN": item.cd ? item.cd.toUpperCase() : "",
      "CONTRATISTA / OPERACIÓN": (item as any).contractorName ? (item as any).contractorName.toUpperCase() : ((item as any).contractor ? (item as any).contractor.toUpperCase() : ""),
      "VEHÍCULO / PLACA": item.plate ? item.plate.toUpperCase() : "",
      "NOVEDAD / OBSERVACIÓN": item.observations || "Sin observación registrada",
      "VERIFICACIÓN (COL F)": item.verification || "N/A",
      "ESTADO": item.status || "PENDIENTE",
      "EVIDENCIA (URL)": item.evidence || ""
    }));

    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(";"),
      ...exportData.map(row => 
        headers.map(fieldName => {
          const value = row[fieldName as keyof typeof row] || "";
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(";")
      )
    ];

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Cierre_Novedades_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const novedadesChartsData = useMemo(() => {
    const monthOrder = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    // Help compute Novedades Trend from stable time-unfiltered records
    const getNovedadesTrend = (records: AuditRecord[]) => {
      const withObs = records.filter((r) => {
        const obs = (r.observations || "").trim().toLowerCase();
        return obs !== "" && obs !== "sin observación registrada";
      });
      const monthly = withObs.reduce(
        (acc, r) => {
          const key = `${r.year}-${r.month}`;
          if (!acc[key])
            acc[key] = { month: r.month, year: r.year, total: 0, closed: 0 };
          acc[key].total += 1;
          if (r.status?.toUpperCase() === "REALIZADO") acc[key].closed += 1;
          return acc;
        },
        {} as Record<string, any>,
      );
      return Object.values(monthly)
        .sort((a: any, b: any) => {
          if (a.year !== b.year) return a.year - b.year;
          return (
            monthOrder.indexOf(a.month.toLowerCase()) -
            monthOrder.indexOf(b.month.toLowerCase())
          );
        })
        .map((m: any) => ({
          name: `${m.month.toUpperCase()} ${m.year}`,
          total: m.total,
          cerrados: m.closed,
          ejecucion: (m.closed / m.total) * 100,
          month: m.month,
          year: m.year,
        }));
    };

    // Help compute CD chart from stable CD-unfiltered records
    const getNovedadesCDChart = (records: AuditRecord[]) => {
      const withObs = records.filter((r) => {
        const obs = (r.observations || "").trim().toLowerCase();
        return obs !== "" && obs !== "sin observación registrada";
      });
      const byCD = withObs.reduce(
        (acc, r) => {
          const key = r.cd;
          if (!acc[key]) acc[key] = { name: key, total: 0, closed: 0 };
          acc[key].total += 1;
          if (r.status?.toUpperCase() === "REALIZADO") acc[key].closed += 1;
          return acc;
        },
        {} as Record<string, any>,
      );
      return Object.values(byCD)
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 10);
    };

    // Help compute Contractor chart from stable Contractor-unfiltered records
    const getNovedadesContractorChart = (records: AuditRecord[]) => {
      const withObs = records.filter((r) => {
        const obs = (r.observations || "").trim().toLowerCase();
        return obs !== "" && obs !== "sin observación registrada";
      });
      const byContractor = withObs.reduce(
        (acc, r) => {
          const contrName =
            masterList.find((m) => m.plate === r.plate)?.contractor ||
            "NO ASIGNADO";
          if (!acc[contrName])
            acc[contrName] = { name: contrName, total: 0, closed: 0 };
          acc[contrName].total += 1;
          if (r.status?.toUpperCase() === "REALIZADO")
            acc[contrName].closed += 1;
          return acc;
        },
        {} as Record<string, any>,
      );
      return Object.values(byContractor)
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 10);
    };

    // Help compute Execution Time chart from stable Auditor-unfiltered records
    const getNovedadesExecutionTimeChart = (records: AuditRecord[]) => {
      const byAuditorTime = records.reduce(
        (acc, r) => {
          const auditor = r.auditor || "SIN AUDITOR";
          const time = r.executionTime || 0;
          if (time > 0) {
            if (!acc[auditor])
              acc[auditor] = { name: auditor, totalTime: 0, count: 0 };
            acc[auditor].totalTime += time;
            acc[auditor].count += 1;
          }
          return acc;
        },
        {} as Record<string, any>,
      );
      return Object.values(byAuditorTime)
        .map((a: any) => ({
          name: a.name,
          avgTime: a.totalTime / a.count,
          count: a.count,
        }))
        .sort((a: any, b: any) => a.avgTime - b.avgTime);
    };

    // Help compute Duration Distribution histogram from stable Duration-unfiltered records
    const getNovedadesTimeDistributionChart = (records: AuditRecord[]) => {
      const timeBuckets = records.reduce(
        (acc, r) => {
          const time = r.executionTime || 0;
          if (time > 0) {
            const bucket = Math.floor(time);
            const bucketLabel = bucket === 0 ? "< 1 min" : `${bucket} min`;
            if (!acc[bucket])
              acc[bucket] = { name: bucketLabel, count: 0, order: bucket };
            acc[bucket].count += 1;
          }
          return acc;
        },
        {} as Record<number, any>,
      );
      return Object.values(timeBuckets).sort(
        (a: any, b: any) => a.order - b.order,
      );
    };

    const monthlyTrend = getNovedadesTrend(filteredDataExcludingTime);
    const cdChart = getNovedadesCDChart(filteredDataExcludingCD);
    const contractorChart = getNovedadesContractorChart(
      filteredDataExcludingContractor,
    );
    const executionTimeChart = getNovedadesExecutionTimeChart(
      filteredDataExcludingAuditor,
    );
    const timeDistributionChart = getNovedadesTimeDistributionChart(
      filteredDataExcludingDuration,
    );

    return {
      monthlyTrend,
      cdChart,
      contractorChart,
      executionTimeChart,
      timeDistributionChart,
    };
  }, [
    filteredDataExcludingTime,
    filteredDataExcludingCD,
    filteredDataExcludingContractor,
    filteredDataExcludingAuditor,
    filteredDataExcludingDuration,
    masterList,
  ]);

  const novedadesStats = useMemo(() => {
    if (novedadesData.length === 0)
      return { pending: 0, completed: 0, compliance: 0 };
    const completed = novedadesData.filter(
      (r) => r.status?.toUpperCase() === "REALIZADO",
    ).length;
    const pending = novedadesData.length - completed;
    const compliance = (completed / novedadesData.length) * 100;
    return { pending, completed, compliance };
  }, [novedadesData]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalAudits: 0,
        uniqueVehicles: 0,
        avgMand: 0,
        avgNoMand: 0,
        avgDocMand: 0,
        avgSignMand: 0,
        avgImgMand: 0,
        avgDocNoMand: 0,
        avgSignNoMand: 0,
        avgImgNoMand: 0,
        catScoresMand: [],
        catScoresNoMand: [],
        cdRankingMand: [],
        cdRankingNoMand: [],
        auditorRanking: [],
        auditTypes: [],
        topFails: [],
        trend: [],
        currentExecution: 0,
        currentAuditados: 0,
        currentFaltantes: 0,
        masterCount: 149,
      };
    }

    const uniquePlates = new Set(filteredData.map((r) => r.plate)).size;
    const avgMand =
      filteredData.reduce((acc, r) => acc + r.totalMand, 0) /
      filteredData.length;
    const avgNoMand =
      filteredData.reduce((acc, r) => acc + r.totalNoMand, 0) /
      filteredData.length;

    // Averages by category
    const avgDocMand =
      filteredData.reduce((acc, r) => acc + r.docMand, 0) / filteredData.length;
    const avgSignMand =
      filteredData.reduce((acc, r) => acc + r.signMand, 0) /
      filteredData.length;
    const avgImgMand =
      filteredData.reduce((acc, r) => acc + r.imgMand, 0) / filteredData.length;

    const avgDocNoMand =
      filteredData.reduce((acc, r) => acc + r.docNoMand, 0) /
      filteredData.length;
    const avgSignNoMand =
      filteredData.reduce((acc, r) => acc + r.signNoMand, 0) /
      filteredData.length;
    const avgImgNoMand =
      filteredData.reduce((acc, r) => acc + r.imgNoMand, 0) /
      filteredData.length;

    // CD Rankings computed on filteredDataExcludingCD
    const cdScores = filteredDataExcludingCD.reduce(
      (acc, r) => {
        if (!acc[r.cd]) acc[r.cd] = { sumMand: 0, sumNoMand: 0, count: 0 };
        acc[r.cd].sumMand += r.totalMand;
        acc[r.cd].sumNoMand += r.totalNoMand;
        acc[r.cd].count += 1;
        return acc;
      },
      {} as Record<
        string,
        { sumMand: number; sumNoMand: number; count: number }
      >,
    );

    const cdRankingMand = Object.entries(cdScores)
      .map(([name, s]: [string, { sumMand: number; count: number }]) => ({
        name,
        score: s.sumMand / s.count,
      }))
      .sort((a, b) => a.score - b.score);

    const cdRankingNoMand = Object.entries(cdScores)
      .map(([name, s]: [string, { sumNoMand: number; count: number }]) => ({
        name,
        score: s.sumNoMand / s.count,
      }))
      .sort((a, b) => a.score - b.score);

    // Auditor Ranking (Personal que reporta) computed on filteredDataExcludingAuditor
    const auditorMap = filteredDataExcludingAuditor.reduce(
      (acc, r) => {
        const name = r.auditor || "Desconocido";
        const type = r.auditType || "General";
        if (!acc[name]) acc[name] = {};
        acc[name][type] = (acc[name][type] || 0) + 1;
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    const auditTypes = Array.from(
      new Set(
        filteredDataExcludingAuditor.map((r) => r.auditType || "General"),
      ),
    );

    const auditorRanking = Object.keys(auditorMap)
      .map((name) => ({
        name,
        ...auditorMap[name],
        total: Object.values(auditorMap[name]).reduce(
          (a: number, b: number) => a + b,
          0,
        ),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Item Failures (Top 10) computed on main filteredData
    const getFailures = (
      binKey: "docBin" | "signBin" | "imgBin",
      labels: string[],
    ) => {
      const counts = labels.map((label, idx) => {
        const fails = filteredData.filter((r) => r[binKey][idx] === 0).length;
        return {
          label,
          count: fails,
          percent: (fails / filteredData.length) * 100,
        };
      });
      return counts;
    };

    const docFails = getFailures("docBin", ITEM_LABELS.doc);
    const signFails = getFailures("signBin", ITEM_LABELS.sign);
    const imgFails = getFailures("imgBin", ITEM_LABELS.img);

    const topFails = [...docFails, ...signFails, ...imgFails]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly Trend computed on filteredDataExcludingTime
    const monthOrder = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const trendData = filteredDataExcludingTime.reduce(
      (acc, r) => {
        const key = `${r.year}-${r.month}`;
        if (!acc[key])
          acc[key] = {
            month: r.month,
            year: r.year,
            sumMand: 0,
            sumNoMand: 0,
            count: 0,
            uniqueAudited: new Set<string>(),
          };
        acc[key].sumMand += r.totalMand;
        acc[key].sumNoMand += r.totalNoMand;
        acc[key].count += 1;
        acc[key].uniqueAudited.add(r.plate);
        return acc;
      },
      {} as Record<
        string,
        {
          month: string;
          year: number;
          sumMand: number;
          sumNoMand: number;
          count: number;
          uniqueAudited: Set<string>;
        }
      >,
    );

    const masterCount = 149; // Prompt says there are 149 vehicles in master list

    const trend = Object.values(trendData)
      .sort((a: any, b: any) => {
        if (a.year !== b.year) return a.year - b.year;
        return (
          monthOrder.indexOf(a.month.toLowerCase()) -
          monthOrder.indexOf(b.month.toLowerCase())
        );
      })
      .map((t: any) => ({
        name: `${t.month.toUpperCase()} ${t.year}`,
        mandatorio: t.sumMand / t.count,
        noMandatorio: t.sumNoMand / t.count,
        ejecucion: (t.uniqueAudited.size / masterCount) * 100,
        auditados: t.uniqueAudited.size,
        faltantes: Math.max(0, masterCount - t.uniqueAudited.size),
        meta: masterCount,
        month: t.month,
        year: t.year,
      }));

    // Categorized scores for bars computed on filteredDataExcludingCategory
    const avgDocMandEx =
      filteredDataExcludingCategory.reduce((acc, r) => acc + r.docMand, 0) /
      (filteredDataExcludingCategory.length || 1);
    const avgSignMandEx =
      filteredDataExcludingCategory.reduce((acc, r) => acc + r.signMand, 0) /
      (filteredDataExcludingCategory.length || 1);
    const avgImgMandEx =
      filteredDataExcludingCategory.reduce((acc, r) => acc + r.imgMand, 0) /
      (filteredDataExcludingCategory.length || 1);

    const avgDocNoMandEx =
      filteredDataExcludingCategory.reduce((acc, r) => acc + r.docNoMand, 0) /
      (filteredDataExcludingCategory.length || 1);
    const avgSignNoMandEx =
      filteredDataExcludingCategory.reduce((acc, r) => acc + r.signNoMand, 0) /
      (filteredDataExcludingCategory.length || 1);
    const avgImgNoMandEx =
      filteredDataExcludingCategory.reduce((acc, r) => acc + r.imgNoMand, 0) /
      (filteredDataExcludingCategory.length || 1);

    const catScoresMand = [
      { name: "Documentación", score: avgDocMandEx },
      { name: "Señalización", score: avgSignMandEx },
      { name: "Imagen", score: avgImgMandEx },
    ];

    const catScoresNoMand = [
      { name: "Documentación", score: avgDocNoMandEx },
      { name: "Señalización", score: avgSignNoMandEx },
      { name: "Imagen", score: avgImgNoMandEx },
    ];

    // Current month execution
    const currentTrend = trend[trend.length - 1];

    return {
      totalAudits: filteredData.length,
      uniqueVehicles: uniquePlates,
      avgMand,
      avgNoMand,
      avgDocMand,
      avgSignMand,
      avgImgMand,
      avgDocNoMand,
      avgSignNoMand,
      avgImgNoMand,
      catScoresMand,
      catScoresNoMand,
      cdRankingMand,
      cdRankingNoMand,
      auditorRanking,
      auditTypes,
      topFails,
      trend,
      currentExecution: currentTrend ? currentTrend.ejecucion : 0,
      currentAuditados: currentTrend ? currentTrend.auditados : 0,
      currentFaltantes: currentTrend ? currentTrend.faltantes : 0,
      masterCount,
    };
  }, [
    filteredData,
    filteredDataExcludingCD,
    filteredDataExcludingTime,
    filteredDataExcludingAuditor,
    filteredDataExcludingCategory,
  ]);

  return (
    <div className="space-y-8 pb-20 text-slate-200">
      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap gap-4 p-2 bg-[#1a1a2e] rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "dashboard"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-slate-500 hover:text-white hover:bg-slate-800"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("novedades")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "novedades"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-slate-500 hover:text-white hover:bg-slate-800"
          }`}
        >
          Cierre de Novedades
        </button>
        <button
          onClick={() => setActiveTab("seguimiento")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "seguimiento"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-slate-500 hover:text-white hover:bg-slate-800"
          }`}
        >
          Seguimiento
        </button>
      </div>

      {/* HEADER & FILTERS (solo visible en Dashboard y Cierre de Novedades) */}
      {activeTab !== "seguimiento" && (
        <>
          <div className="bg-[#1a1a2e] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative z-10">
              <div>
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">
                  ESTÁNDAR <span className="text-indigo-500">FLOTA DOC-IMG</span>
                </h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-500" /> Auditoría
                  Mensual de Cumplimiento - Camiones
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 w-full xl:w-auto">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 px-1">
                    Regional
                  </label>
                  <select
                    value={filterRegional}
                    onChange={(e) => {
                      setFilterRegional(e.target.value);
                      setFilterCD("Todos");
                    }}
                    className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none transition-all text-white font-black"
                  >
                    <option value="Todas">Todas</option>
                    {regionals.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 px-1">
                    CD
                  </label>
                  <select
                    value={filterCD}
                    onChange={(e) => setFilterCD(e.target.value)}
                    className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none transition-all text-white font-black"
                  >
                    <option value="Todos">Todos</option>
                    {cds.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 px-1">
                    Mes
                  </label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none transition-all text-white font-black"
                  >
                    <option value="Todos">Todos</option>
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 px-1">
                    Año
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none transition-all text-white font-black"
                  >
                    <option value="Todos">Todos</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 px-1">
                    Auditor
                  </label>
                  <select
                    value={filterAuditor}
                    onChange={(e) => setFilterAuditor(e.target.value)}
                    className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none transition-all text-white font-black"
                  >
                    <option value="Todos">Todos</option>
                    {auditors.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 px-1">
                    Contratista
                  </label>
                  <select
                    value={filterContractor}
                    onChange={(e) => setFilterContractor(e.target.value)}
                    className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none transition-all text-white font-black"
                  >
                    <option value="Todos">Todos</option>
                    {contractors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 px-1">
                    Placa
                  </label>
                  <select
                    value={filterPlate}
                    onChange={(e) => setFilterPlate(e.target.value)}
                    className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none transition-all text-white font-black"
                  >
                    <option value="Todos">Todos</option>
                    {plates.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* MULTIFILTROS CRUZADOS ACTIVOS */}
          {(filterRegional !== "Todas" ||
            filterCD !== "Todos" ||
            filterMonth !== "Todos" ||
            filterYear !== "Todos" ||
            filterAuditor !== "Todos" ||
            filterContractor !== "Todos" ||
            filterPlate !== "Todos" ||
            filterDuration !== "Todos" ||
            filterCategory !== "Todos") && (
            <div className="bg-[#1e1e35]/80 border border-indigo-500/30 p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <Filter size={18} className="text-indigo-400 animate-pulse" />
                <div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Multi-Filtros Cruzados Activos:
                  </span>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mt-1">
                    Haz clic en las barras, porciones, tarjetas o puntos de las
                    gráficas para filtrar cruzado; haz clic de nuevo para desmarcar.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {filterRegional !== "Todas" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    REGIONAL: {filterRegional}
                    <button
                      onClick={() => setFilterRegional("Todas")}
                      className="hover:bg-blue-500/25 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterCD !== "Todos" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    CD: {filterCD}
                    <button
                      onClick={() => setFilterCD("Todos")}
                      className="hover:bg-purple-500/25 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterMonth !== "Todos" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    MES: {filterMonth}
                    <button
                      onClick={() => setFilterMonth("Todos")}
                      className="hover:bg-emerald-500/25 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterYear !== "Todos" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    AÑO: {filterYear}
                    <button
                      onClick={() => setFilterYear("Todos")}
                      className="hover:bg-yellow-500/25 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterAuditor !== "Todos" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    AUDITOR: {filterAuditor}
                    <button
                      onClick={() => setFilterAuditor("Todos")}
                      className="hover:bg-rose-500/25 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterContractor !== "Todos" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    CONTRATISTA: {filterContractor}
                    <button
                      onClick={() => setFilterContractor("Todos")}
                      className="hover:bg-sky-500/25 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterPlate !== "Todos" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    PLACA: {filterPlate}
                    <button
                      onClick={() => setFilterPlate("Todos")}
                      className="hover:bg-pink-500/25 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterDuration !== "Todos" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    DURACIÓN: {filterDuration}
                    <button
                      onClick={() => setFilterDuration("Todos")}
                      className="hover:bg-cyan-500/25 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterCategory !== "Todos" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                    CATEGORÍA: {filterCategory}
                    <button
                      onClick={() => setFilterCategory("Todos")}
                      className="hover:bg-orange-500/25 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setFilterRegional("Todas");
                    setFilterCD("Todos");
                    setFilterMonth("Todos");
                    setFilterYear("Todos");
                    setFilterAuditor("Todos");
                    setFilterContractor("Todos");
                    setFilterDuration("Todos");
                    setFilterCategory("Todos");
                  }}
                  className="text-[10px] font-black text-rose-400 hover:text-rose-300 underline uppercase tracking-widest px-2 py-1 cursor-pointer"
                >
                  Cerrar Todos
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT */}
      <div className="relative z-0">
        {activeTab === "dashboard" && (
          filteredData.length === 0 ? (
            <div className="bg-[#1a1a2e] p-12 rounded-[2.5rem] border border-slate-800 text-center shadow-xl">
              <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4 animate-bounce" />
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                No se encontraron datos para el Dashboard
              </h2>
              <p className="text-slate-500 mt-2 text-sm">
                Ajusta los filtros seleccionados para ver la información.
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
            {/* SECTION 1: GLOBAL KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Auditorías"
                value={stats.totalAudits.toString()}
                subtitle="Registros procesados en el periodo"
              />
              <MetricCard
                title="Vehículos Únicos"
                value={stats.uniqueVehicles.toString()}
                subtitle="Flota distinta auditada"
              />
              <MetricCard
                title="Score Mandatorio General"
                value={`${stats.avgMand.toFixed(0)}%`}
                color={getTrafficColor(stats.avgMand)}
                subtitle="Cumplimiento crítico global"
              />
              <MetricCard
                title="Score No Mandatorio General"
                value={`${stats.avgNoMand.toFixed(0)}%`}
                color={getTrafficColor(stats.avgNoMand)}
                subtitle="Mejora continua / Seguimiento"
              />
            </div>

            {/* EJECUCIÓN SECTION */}
            <div className="bg-[#1a1a2e] p-8 md:p-12 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-[100px] -mr-40 -mt-40"></div>

              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-2xl">
                      <Target size={32} />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                        EJECUCIÓN DE AUDITORÍA
                      </h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-500" />{" "}
                        CUMPLIMIENTO DE META MENSUAL (149 VEHÍCULOS)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full lg:w-auto">
                  <div className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 flex flex-col items-center justify-center">
                    <div className="w-16 h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                value: stats.currentExecution,
                                fill: "#10b981",
                              },
                              {
                                value: Math.max(
                                  0,
                                  100 - stats.currentExecution,
                                ),
                                fill: "#1e293b",
                              },
                            ]}
                            innerRadius={20}
                            outerRadius={30}
                            dataKey="value"
                            stroke="none"
                          >
                            <Label
                              value={`${stats.currentExecution.toFixed(0)}%`}
                              position="center"
                              style={{
                                fontSize: "10px",
                                fontWeight: 900,
                                fill: "white",
                              }}
                            />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1">
                      CUMPLIMIENTO
                    </p>
                  </div>
                  <div className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      AUDITADOS
                    </p>
                    <h3 className="text-3xl font-black text-white">
                      {stats.currentAuditados}
                    </h3>
                  </div>
                  <div className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      FALTAN
                    </p>
                    <h3 className="text-3xl font-black text-rose-500">
                      {stats.currentFaltantes}
                    </h3>
                  </div>
                  <div className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      META
                    </p>
                    <h3 className="text-3xl font-black text-indigo-400">
                      {stats.masterCount}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.trend}
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    className="cursor-pointer"
                    onClick={(state: any) => {
                      if (
                        state &&
                        state.activePayload &&
                        state.activePayload[0]
                      ) {
                        const clickedData = state.activePayload[0].payload;
                        const month = clickedData.month;
                        const year = clickedData.year.toString();
                        if (filterMonth === month && filterYear === year) {
                          setFilterMonth("Todos");
                          setFilterYear("Todos");
                        } else {
                          setFilterMonth(month);
                          setFilterYear(year);
                        }
                      }
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#1e293b"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#ffffff", fontSize: 10, fontWeight: 900 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#ffffff", fontSize: 10, fontWeight: 900 }}
                      unit="%"
                      domain={[0, 110]}
                    />
                    <Tooltip
                      cursor={{ fill: "#1e293b" }}
                      contentStyle={{
                        borderRadius: "24px",
                        border: "1px solid #334155",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.3)",
                        fontSize: "12px",
                        fontWeight: "900",
                        textTransform: "uppercase",
                        backgroundColor: "#0f172a",
                        color: "#fff",
                      }}
                    />
                    <Bar
                      dataKey="ejecucion"
                      name="Cumplimiento %"
                      radius={[10, 10, 10, 10]}
                      barSize={40}
                    >
                      {stats.trend.map((entry, index) => {
                        const isSelected =
                          (filterMonth === "Todos" && filterYear === "Todos") ||
                          (filterMonth === entry.month &&
                            filterYear === entry.year.toString());
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.ejecucion >= 95
                                ? "#10b981"
                                : entry.ejecucion >= 80
                                  ? "#f59e0b"
                                  : "#ef4444"
                            }
                            opacity={isSelected ? 1 : 0.3}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const month = entry.month;
                              const year = entry.year.toString();
                              if (
                                filterMonth === month &&
                                filterYear === year
                              ) {
                                setFilterMonth("Todos");
                                setFilterYear("Todos");
                              } else {
                                setFilterMonth(month);
                                setFilterYear(year);
                              }
                            }}
                          />
                        );
                      })}
                      <LabelList
                        dataKey="ejecucion"
                        position="top"
                        style={{
                          fill: "#ffffff",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                        formatter={(val: number) => `${val.toFixed(0)}%`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* SECTION 2: MANDATORIO */}
              <div className="bg-[#1a1a2e] rounded-[3rem] p-8 border-l-8 border-rose-500 shadow-xl overflow-hidden relative">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-rose-500 tracking-tighter uppercase">
                      Sección 2: MANDATORIO
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      Nivel Crítico de Operación (BR, BS, BT, BU)
                    </p>
                  </div>
                  <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 shadow-lg">
                    <Shield size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-[#0f172a] p-4 rounded-[2rem] border border-slate-800 flex flex-col items-center justify-center">
                    <div className="w-full h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                value: stats.avgMand,
                                fill: getTrafficColor(stats.avgMand),
                              },
                              { value: 100 - stats.avgMand, fill: "#1e293b" },
                            ]}
                            cx="50%"
                            cy="80%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={180}
                            endAngle={0}
                            dataKey="value"
                            stroke="none"
                          >
                            <Label
                              value={`${stats.avgMand.toFixed(0)}%`}
                              position="center"
                              dy={-10}
                              style={{
                                fontSize: "24px",
                                fontWeight: 900,
                                fill: "white",
                              }}
                            />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs font-black text-white uppercase tracking-widest -mt-4">
                      Mandatorio Total
                    </p>
                  </div>

                  <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-slate-800">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                      Promedio por Categoría
                    </h4>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.catScoresMand}
                          margin={{ top: 15 }}
                          className="cursor-pointer"
                          onClick={(state: any) => {
                            if (
                              state &&
                              state.activePayload &&
                              state.activePayload[0]
                            ) {
                              const clicked =
                                state.activePayload[0].payload.name;
                              setFilterCategory((prev) =>
                                prev === clicked ? "Todos" : clicked,
                              );
                            }
                          }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{
                              fill: "#94a3b8",
                              fontSize: 10,
                              fontWeight: 900,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide domain={[0, 115]} />
                          <Tooltip
                            cursor={{ fill: "transparent" }}
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: "12px",
                            }}
                            itemStyle={{ color: "#fff" }}
                            labelStyle={{ color: "#94a3b8" }}
                            formatter={(val: number) => [
                              `${Math.round(val)}%`,
                              "Puntaje",
                            ]}
                          />
                          <Bar
                            dataKey="score"
                            radius={[5, 5, 0, 0]}
                            barSize={30}
                          >
                            {stats.catScoresMand.map((entry, index) => {
                              const isSelected =
                                filterCategory === "Todos" ||
                                filterCategory.toLowerCase() ===
                                  entry.name.toLowerCase();
                              return (
                                <Cell
                                  key={index}
                                  fill={getTrafficColor(entry.score)}
                                  opacity={isSelected ? 1 : 0.3}
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const clicked = entry.name;
                                    setFilterCategory((prev) =>
                                      prev === clicked ? "Todos" : clicked,
                                    );
                                  }}
                                />
                              );
                            })}
                            <LabelList
                              dataKey="score"
                              position="top"
                              formatter={(val: number) => `${Math.round(val)}%`}
                              style={{
                                fill: "#ffffff",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 h-96 overflow-hidden flex flex-col">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                      Ranking CDs Score Bajo
                    </h4>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.cdRankingMand.slice(0, 15)}
                          layout="vertical"
                          margin={{ right: 50, left: 10 }}
                          className="cursor-pointer"
                          onClick={(state: any) => {
                            if (
                              state &&
                              state.activePayload &&
                              state.activePayload[0]
                            ) {
                              const clickedCd =
                                state.activePayload[0].payload.name;
                              setFilterCD((prev) =>
                                prev === clickedCd ? "Todos" : clickedCd,
                              );
                            }
                          }}
                        >
                          <XAxis type="number" hide domain={[0, 110]} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{
                              fill: "#ffffff",
                              fontSize: 9,
                              fontWeight: 900,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "#1e293b" }}
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: "12px",
                            }}
                            itemStyle={{ color: "#fff" }}
                            labelStyle={{ color: "#94a3b8" }}
                          />
                          <Bar
                            dataKey="score"
                            radius={[0, 8, 8, 0]}
                            barSize={16}
                          >
                            {stats.cdRankingMand
                              .slice(0, 15)
                              .map((entry, index) => {
                                const isSelected =
                                  filterCD === "Todos" ||
                                  filterCD === entry.name;
                                return (
                                  <Cell
                                    key={index}
                                    fill={getTrafficColor(entry.score)}
                                    opacity={isSelected ? 1 : 0.3}
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const clickedCd = entry.name;
                                      setFilterCD((prev) =>
                                        prev === clickedCd
                                          ? "Todos"
                                          : clickedCd,
                                      );
                                    }}
                                  />
                                );
                              })}
                            <LabelList
                              dataKey="score"
                              position="right"
                              formatter={(val: number) => `${val.toFixed(0)}%`}
                              style={{
                                fill: "#ffffff",
                                fontSize: 10,
                                fontWeight: 900,
                              }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#0f172a] p-6 md:p-8 rounded-[2.5rem] border border-slate-800 h-[450px] flex flex-col shadow-2xl">
                    <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] mb-6 text-center">
                      Tendencia de Cumplimiento Mensual
                    </h4>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={stats.trend}
                          margin={{ top: 30, right: 40, left: 40, bottom: 40 }}
                          className="cursor-pointer"
                          onClick={(state: any) => {
                            if (
                              state &&
                              state.activePayload &&
                              state.activePayload[0]
                            ) {
                              const clickedData =
                                state.activePayload[0].payload;
                              const month = clickedData.month;
                              const year = clickedData.year.toString();
                              if (
                                filterMonth === month &&
                                filterYear === year
                              ) {
                                setFilterMonth("Todos");
                                setFilterYear("Todos");
                              } else {
                                setFilterMonth(month);
                                setFilterYear(year);
                              }
                            }
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#1e293b"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{
                              fill: "#ffffff",
                              fontSize: 9,
                              fontWeight: 900,
                            }}
                            axisLine={false}
                            tickLine={false}
                            padding={{ left: 20, right: 20 }}
                            angle={-15}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis hide domain={[0, 120]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: "24px",
                            }}
                            itemStyle={{ color: "#fff" }}
                            labelStyle={{ color: "#94a3b8" }}
                            formatter={(val: number) => [
                              `${val.toFixed(0)}%`,
                              "Puntaje",
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="mandatorio"
                            name="Mandatorio"
                            stroke="#f43f5e"
                            strokeWidth={5}
                            activeDot={{ r: 8 }}
                            dot={(props: any) => {
                              const { cx, cy, payload } = props;
                              const isSelected =
                                (filterMonth === "Todos" &&
                                  filterYear === "Todos") ||
                                (filterMonth === payload.month &&
                                  filterYear === payload.year.toString());
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isSelected ? 6 : 3}
                                  fill="#f43f5e"
                                  stroke="#0f172a"
                                  strokeWidth={isSelected ? 2 : 1}
                                  opacity={isSelected ? 1 : 0.4}
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const month = payload.month;
                                    const year = payload.year.toString();
                                    if (
                                      filterMonth === month &&
                                      filterYear === year
                                    ) {
                                      setFilterMonth("Todos");
                                      setFilterYear("Todos");
                                    } else {
                                      setFilterMonth(month);
                                      setFilterYear(year);
                                    }
                                  }}
                                />
                              );
                            }}
                          >
                            <LabelList
                              dataKey="mandatorio"
                              position="top"
                              formatter={(val: number) => `${val.toFixed(0)}%`}
                              style={{
                                fill: "#ffffff",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            />
                          </Line>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: NO MANDATORIO */}
              <div className="bg-[#1a1a2e] rounded-[3rem] p-8 border-l-8 border-indigo-500 shadow-xl overflow-hidden relative">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-indigo-500 tracking-tighter uppercase">
                      Sección 3: NO MANDATORIO
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      Mejora Continua y Evolución (BN, BO, BP, BQ)
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 shadow-lg">
                    <TrendingUp size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-[#0f172a] p-4 rounded-[2rem] border border-slate-800 flex flex-col items-center justify-center">
                    <div className="w-full h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: stats.avgNoMand, fill: "#6366f1" },
                              { value: 100 - stats.avgNoMand, fill: "#1e293b" },
                            ]}
                            cx="50%"
                            cy="80%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={180}
                            endAngle={0}
                            dataKey="value"
                            stroke="none"
                          >
                            <Label
                              value={`${stats.avgNoMand.toFixed(0)}%`}
                              position="center"
                              dy={-10}
                              style={{
                                fontSize: "24px",
                                fontWeight: 900,
                                fill: "white",
                              }}
                            />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs font-black text-white uppercase tracking-widest -mt-4">
                      No Mandatorio Total
                    </p>
                  </div>

                  <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-slate-800">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                      Comparativo Categorías
                    </h4>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.catScoresNoMand}
                          margin={{ top: 15 }}
                          className="cursor-pointer"
                          onClick={(state: any) => {
                            if (
                              state &&
                              state.activePayload &&
                              state.activePayload[0]
                            ) {
                              const clicked =
                                state.activePayload[0].payload.name;
                              setFilterCategory((prev) =>
                                prev === clicked ? "Todos" : clicked,
                              );
                            }
                          }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{
                              fill: "#94a3b8",
                              fontSize: 10,
                              fontWeight: 900,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide domain={[0, 115]} />
                          <Tooltip
                            cursor={{ fill: "transparent" }}
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: "12px",
                            }}
                            itemStyle={{ color: "#fff" }}
                            labelStyle={{ color: "#94a3b8" }}
                            formatter={(val: number) => [
                              `${Math.round(val)}%`,
                              "Puntaje",
                            ]}
                          />
                          <Bar
                            dataKey="score"
                            fill="#6366f1"
                            radius={[5, 5, 0, 0]}
                            barSize={30}
                          >
                            {stats.catScoresNoMand.map((entry, index) => {
                              const isSelected =
                                filterCategory === "Todos" ||
                                filterCategory.toLowerCase() ===
                                  entry.name.toLowerCase();
                              return (
                                <Cell
                                  key={index}
                                  fill="#6366f1"
                                  opacity={isSelected ? 1 : 0.3}
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const clicked = entry.name;
                                    setFilterCategory((prev) =>
                                      prev === clicked ? "Todos" : clicked,
                                    );
                                  }}
                                />
                              );
                            })}
                            <LabelList
                              dataKey="score"
                              position="top"
                              formatter={(val: number) => `${Math.round(val)}%`}
                              style={{
                                fill: "#ffffff",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 h-96 overflow-hidden flex flex-col">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                      Ranking CDs Score Bajo No Mandatorio
                    </h4>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.cdRankingNoMand.slice(0, 15)}
                          layout="vertical"
                          margin={{ right: 50, left: 10 }}
                          className="cursor-pointer"
                          onClick={(state: any) => {
                            if (
                              state &&
                              state.activePayload &&
                              state.activePayload[0]
                            ) {
                              const clickedCd =
                                state.activePayload[0].payload.name;
                              setFilterCD((prev) =>
                                prev === clickedCd ? "Todos" : clickedCd,
                              );
                            }
                          }}
                        >
                          <XAxis type="number" hide domain={[0, 110]} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{
                              fill: "#ffffff",
                              fontSize: 9,
                              fontWeight: 900,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "#1e293b" }}
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: "12px",
                            }}
                            itemStyle={{ color: "#fff" }}
                            labelStyle={{ color: "#94a3b8" }}
                          />
                          <Bar
                            dataKey="score"
                            radius={[0, 8, 8, 0]}
                            barSize={16}
                            fill="#6366f1"
                          >
                            {stats.cdRankingNoMand
                              .slice(0, 15)
                              .map((entry, index) => {
                                const isSelected =
                                  filterCD === "Todos" ||
                                  filterCD === entry.name;
                                return (
                                  <Cell
                                    key={index}
                                    fill="#6366f1"
                                    opacity={isSelected ? 1 : 0.4}
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const clickedCd = entry.name;
                                      setFilterCD((prev) =>
                                        prev === clickedCd
                                          ? "Todos"
                                          : clickedCd,
                                      );
                                    }}
                                  />
                                );
                              })}
                            <LabelList
                              dataKey="score"
                              position="right"
                              formatter={(val: number) => `${val.toFixed(0)}%`}
                              style={{
                                fill: "#ffffff",
                                fontSize: 10,
                                fontWeight: 900,
                              }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#0f172a] p-6 md:p-8 rounded-[2.5rem] border border-slate-800 h-[450px] flex flex-col shadow-2xl">
                    <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 text-center">
                      Tendencia Mensual No Mandatorio
                    </h4>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={stats.trend}
                          margin={{ top: 30, right: 40, left: 40, bottom: 40 }}
                          className="cursor-pointer"
                          onClick={(state: any) => {
                            if (
                              state &&
                              state.activePayload &&
                              state.activePayload[0]
                            ) {
                              const clickedData =
                                state.activePayload[0].payload;
                              const month = clickedData.month;
                              const year = clickedData.year.toString();
                              if (
                                filterMonth === month &&
                                filterYear === year
                              ) {
                                setFilterMonth("Todos");
                                setFilterYear("Todos");
                              } else {
                                setFilterMonth(month);
                                setFilterYear(year);
                              }
                            }
                          }}
                        >
                          <defs>
                            <linearGradient
                              id="colorNoMand"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#6366f1"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#6366f1"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#1e293b"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{
                              fill: "#ffffff",
                              fontSize: 9,
                              fontWeight: 900,
                            }}
                            axisLine={false}
                            tickLine={false}
                            padding={{ left: 20, right: 20 }}
                            angle={-15}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis hide domain={[0, 120]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: "24px",
                            }}
                            itemStyle={{ color: "#fff" }}
                            labelStyle={{ color: "#94a3b8" }}
                            formatter={(val: number) => [
                              `${val.toFixed(0)}%`,
                              "Puntaje",
                            ]}
                          />
                          <Area
                            type="monotone"
                            dataKey="noMandatorio"
                            name="No Mandatorio"
                            stroke="#6366f1"
                            strokeWidth={5}
                            fill="url(#colorNoMand)"
                            dot={(props: any) => {
                              const { cx, cy, payload } = props;
                              const isSelected =
                                (filterMonth === "Todos" &&
                                  filterYear === "Todos") ||
                                (filterMonth === payload.month &&
                                  filterYear === payload.year.toString());
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isSelected ? 6 : 3}
                                  fill="#6366f1"
                                  stroke="#0f172a"
                                  strokeWidth={isSelected ? 2 : 1}
                                  opacity={isSelected ? 1 : 0.4}
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const month = payload.month;
                                    const year = payload.year.toString();
                                    if (
                                      filterMonth === month &&
                                      filterYear === year
                                    ) {
                                      setFilterMonth("Todos");
                                      setFilterYear("Todos");
                                    } else {
                                      setFilterMonth(month);
                                      setFilterYear(year);
                                    }
                                  }}
                                />
                              );
                            }}
                          >
                            <LabelList
                              dataKey="noMandatorio"
                              position="top"
                              formatter={(val: number) => `${val.toFixed(0)}%`}
                              style={{
                                fill: "#ffffff",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            />
                          </Area>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PERSONAL QUE REPORTA CHART (Encima de Sección 5) */}
            <div className="bg-[#1a1a2e] rounded-[3.5rem] p-12 shadow-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none underline decoration-emerald-500 underline-offset-8">
                    Personal que Reporta
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                    Ranking de auditores con mayor número de registros
                    acumulados
                  </p>
                </div>
                <div className="p-5 bg-emerald-600/10 text-emerald-400 rounded-3xl border border-emerald-500/20 shadow-inner">
                  <User size={40} />
                </div>
              </div>
              <div className="h-[500px] w-full overflow-hidden bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.auditorRanking}
                    layout="vertical"
                    margin={{ right: 80, left: 30, top: 20 }}
                    className="cursor-pointer"
                    onClick={(state: any) => {
                      if (
                        state &&
                        state.activePayload &&
                        state.activePayload[0]
                      ) {
                        const clickedAuditor =
                          state.activePayload[0].payload.name;
                        setFilterAuditor((prev) =>
                          prev === clickedAuditor ? "Todos" : clickedAuditor,
                        );
                      }
                    }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      tick={{ fill: "#ffffff", fontSize: 10, fontWeight: 900 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#1e293b" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "24px",
                        padding: "16px",
                      }}
                      itemStyle={{ color: "#fff" }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: "30px" }}
                    />
                    {stats.auditTypes.map((type, idx) => (
                      <Bar
                        key={type}
                        dataKey={type}
                        stackId="a"
                        fill={
                          idx === 0
                            ? "#10b981"
                            : idx === 1
                              ? "#6366f1"
                              : idx === 2
                                ? "#f59e0b"
                                : "#ec4899"
                        }
                        radius={
                          idx === stats.auditTypes.length - 1
                            ? [0, 8, 8, 0]
                            : [0, 0, 0, 0]
                        }
                        barSize={30}
                      >
                        {stats.auditorRanking.map(
                          (entry: any, index: number) => {
                            const isSelected =
                              filterAuditor === "Todos" ||
                              filterAuditor === entry.name;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  idx === 0
                                    ? "#10b981"
                                    : idx === 1
                                      ? "#6366f1"
                                      : idx === 2
                                        ? "#f59e0b"
                                        : "#ec4899"
                                }
                                opacity={isSelected ? 1 : 0.3}
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const clickedAuditor = entry.name;
                                  setFilterAuditor((prev) =>
                                    prev === clickedAuditor
                                      ? "Todos"
                                      : clickedAuditor,
                                  );
                                }}
                              />
                            );
                          },
                        )}
                        <LabelList
                          dataKey={type}
                          position="center"
                          style={{
                            fill: "#ffffff",
                            fontSize: 10,
                            fontWeight: 900,
                          }}
                          formatter={(val: number) => (val > 0 ? val : "")}
                        />
                        {idx === stats.auditTypes.length - 1 && (
                          <LabelList
                            dataKey="total"
                            position="right"
                            offset={15}
                            style={{
                              fill: "#ffffff",
                              fontSize: 18,
                              fontWeight: 900,
                            }}
                          />
                        )}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DISTRIBUCIÓN DE TIEMPOS CHART */}
            <div className="bg-[#1a1a2e] rounded-[3.5rem] p-12 shadow-2xl border border-slate-800 mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none underline decoration-sky-500 underline-offset-8 flex items-center gap-4">
                    <BarChart3 size={32} className="text-sky-500" />{" "}
                    DISTRIBUCIÓN POR DURACIÓN
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                    Cantidad de auditorías según el tiempo de ejecución
                    (Frecuencia)
                  </p>
                </div>
                <div className="px-6 py-3 bg-sky-500/10 rounded-2xl border border-sky-500/20 shadow-xl">
                  <p className="text-[11px] font-black text-sky-400 uppercase tracking-widest">
                    ANÁLISIS DE PRODUCTIVIDAD
                  </p>
                </div>
              </div>
              <div className="h-[300px] w-full bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={novedadesChartsData.timeDistributionChart}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    className="cursor-pointer"
                    onClick={(state: any) => {
                      if (
                        state &&
                        state.activePayload &&
                        state.activePayload[0]
                      ) {
                        const clickedLabel =
                          state.activePayload[0].payload.name;
                        setFilterDuration((prev) =>
                          prev === clickedLabel ? "Todos" : clickedLabel,
                        );
                      }
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: "24px",
                      }}
                      cursor={{ fill: "#1e293b", opacity: 0.4 }}
                      labelStyle={{ color: "#ffffff", fontWeight: "bold" }}
                      itemStyle={{ color: "#0ea5e9" }}
                    />
                    <Bar
                      dataKey="count"
                      name="Cantidad de Auditorías"
                      fill="#0ea5e9"
                      radius={[12, 12, 0, 0]}
                      barSize={40}
                    >
                      {novedadesChartsData.timeDistributionChart.map(
                        (entry, index) => {
                          const isSelected =
                            filterDuration === "Todos" ||
                            filterDuration.toLowerCase() ===
                              entry.name.toLowerCase();
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.order < 3
                                  ? "#f43f5e"
                                  : entry.order < 7
                                    ? "#f59e0b"
                                    : "#10b981"
                              }
                              fillOpacity={isSelected ? 0.8 : 0.3}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const clickedLabel = entry.name;
                                setFilterDuration((prev) =>
                                  prev === clickedLabel
                                    ? "Todos"
                                    : clickedLabel,
                                );
                              }}
                            />
                          );
                        },
                      )}
                      <LabelList
                        dataKey="count"
                        position="top"
                        style={{
                          fill: "#ffffff",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* EXPRESS AUDITS ALERT LIST */}
            <div className="bg-[#1a1a2e] rounded-[3.5rem] p-12 shadow-2xl border border-slate-800 mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none underline decoration-rose-500 underline-offset-8 flex items-center gap-4">
                    <AlertTriangle size={32} className="text-rose-500" />{" "}
                    ALERTAS: TIEMPOS ATÍPICOS
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                    Auditorías realizadas en menos de 3 minutos (Posible falta
                    de rigor)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                {filteredData
                  .filter(
                    (r) =>
                      (r.executionTime || 0) > 0 && (r.executionTime || 0) < 3,
                  )
                  .sort(
                    (a, b) => (a.executionTime || 0) - (b.executionTime || 0),
                  )
                  .map((r) => (
                    <div
                      key={r.id}
                      className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 hover:border-rose-500/50 transition-all group cursor-pointer shadow-lg hover:shadow-rose-500/5"
                      onClick={() => setSelectedAudit(r)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                            <Clock size={18} className="text-rose-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none">
                              {(r.executionTime || 0).toFixed(1)} min
                            </p>
                            <p className="text-lg font-black text-white tracking-tighter mt-1">
                              {r.plate}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase leading-none">
                            {r.date}
                          </p>
                          <p className="text-[11px] font-black text-sky-400 mt-1 uppercase tracking-tighter truncate max-w-[100px]">
                            {r.auditor}
                          </p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span className="truncate max-w-[120px]">
                          {r.auditType}
                        </span>
                        <span className="px-2 py-1 bg-slate-800 rounded-lg text-slate-300">
                          {r.cd}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              {filteredData.filter(
                (r) => (r.executionTime || 0) > 0 && (r.executionTime || 0) < 3,
              ).length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle
                    size={48}
                    className="text-emerald-500 mx-auto mb-4 opacity-20"
                  />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                    No se encontraron auditorías con tiempos atípicos
                  </p>
                </div>
              )}
            </div>

            {/* TIEMPOS DE EJECUCIÓN CHART */}
            <div className="bg-[#1a1a2e] rounded-[3.5rem] p-12 shadow-2xl border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none underline decoration-rose-500 underline-offset-8 flex items-center gap-4">
                    <Clock size={32} className="text-rose-500" /> TIEMPOS DE
                    EJECUCIÓN
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                    Auditores ordenados por tiempo promedio de ejecución (Menor
                    a Mayor)
                  </p>
                </div>
                <div className="px-6 py-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-xl">
                  <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest">
                    ALERTA DE CALIDAD OPERATIVA
                  </p>
                </div>
              </div>
              <div className="h-[600px] w-full bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800 overflow-y-auto">
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(
                    400,
                    novedadesChartsData.executionTimeChart.length * 35,
                  )}
                >
                  <BarChart
                    layout="vertical"
                    data={novedadesChartsData.executionTimeChart}
                    margin={{ left: 40, right: 60, top: 20, bottom: 20 }}
                    className="cursor-pointer"
                    onClick={(state: any) => {
                      if (
                        state &&
                        state.activePayload &&
                        state.activePayload[0]
                      ) {
                        const clickedAuditor =
                          state.activePayload[0].payload.name;
                        setFilterAuditor((prev) =>
                          prev === clickedAuditor ? "Todos" : clickedAuditor,
                        );
                      }
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#ffffff", fontSize: 10, fontWeight: 900 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: "24px",
                      }}
                      formatter={(value: any, name: any, props: any) => [
                        `${value.toFixed(2)} min`,
                        `Tiempo Promedio (${props.payload.count} audits)`,
                      ]}
                    />
                    <Bar
                      dataKey="avgTime"
                      name="Tiempo Promedio"
                      fill="#f43f5e"
                      radius={[0, 12, 12, 0]}
                      barSize={20}
                    >
                      {novedadesChartsData.executionTimeChart.map(
                        (entry, index) => {
                          const isSelected =
                            filterAuditor === "Todos" ||
                            filterAuditor === entry.name;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.avgTime < 5
                                  ? "#f43f5e"
                                  : entry.avgTime < 10
                                    ? "#f59e0b"
                                    : "#10b981"
                              }
                              fillOpacity={isSelected ? 0.9 : 0.3}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const clickedAuditor = entry.name;
                                setFilterAuditor((prev) =>
                                  prev === clickedAuditor
                                    ? "Todos"
                                    : clickedAuditor,
                                );
                              }}
                            />
                          );
                        },
                      )}
                      <LabelList
                        dataKey="avgTime"
                        position="right"
                        formatter={(v: any) => `${v.toFixed(1)}m`}
                        style={{
                          fill: "#fb7185",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECTION 5: TOP PROBLEMS (Bars horizontales) */}
            <div className="bg-[#1a1a2e] rounded-[3.5rem] p-10 shadow-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                    Sección 5: TOP Incumplimientos
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                    Ranking de ítems con mayor frecuencia de NO
                  </p>
                </div>
                <div className="p-4 bg-indigo-600/20 text-indigo-400 rounded-full shadow-inner">
                  <BarChart3 size={32} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-5">
                  {stats.topFails.slice(0, 5).map((fail, i) => (
                    <div key={i} className="group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-black text-white uppercase truncate max-w-[80%]">
                          {fail.label}
                        </span>
                        <span className="text-xs font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                          {fail.percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${fail.percent}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full bg-gradient-to-r from-rose-600 to-rose-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-5">
                  {stats.topFails.slice(5, 10).map((fail, i) => (
                    <div key={i} className="group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-black text-white uppercase truncate max-w-[80%]">
                          {fail.label}
                        </span>
                        <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          {fail.percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${fail.percent}%` }}
                          transition={{ duration: 1, delay: (i + 5) * 0.1 }}
                          className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 4: VEHICLE DETAIL TABLE */}
            <div className="bg-[#1a1a2e] rounded-[3.5rem] p-10 shadow-2xl border border-slate-800 overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                    Sección 4: DETALLE OPERATIVO
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                    Buscador interactivo de auditorías individuales
                  </p>
                </div>
                <div className="relative w-full md:w-96 shadow-2xl">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Buscar por placa o auditor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:ring-2 ring-indigo-500 outline-none transition-all placeholder:text-slate-600 font-black uppercase"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-[2rem] border border-slate-800 bg-[#0f172a] shadow-inner">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#1e1e35]">
                      <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800">
                        Vehículo
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800">
                        CD / Regional
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800 text-center">
                        Periodo
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800">
                        Mandatorio
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800">
                        No Mandatorio
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800 text-center">
                        Detalle
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <AnimatePresence>
                      {filteredData.slice(0, 50).map((r, i) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{
                            duration: 0.2,
                            delay: Math.min(i, 20) * 0.03,
                          }}
                          className="hover:bg-indigo-600/10 transition-all group cursor-pointer"
                          onClick={() => setSelectedAudit(r)}
                        >
                          <td className="px-6 py-5 border-b border-slate-800/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-xs font-black text-white group-hover:bg-indigo-600 group-hover:text-white transition-all border border-slate-700">
                                {r.plate.substring(0, 3)}
                              </div>
                              <span className="font-black text-white">
                                {r.plate}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 border-b border-slate-800/50">
                            <div className="flex flex-col">
                              <span className="text-white font-black text-xs uppercase tracking-tighter">
                                {r.cd}
                              </span>
                              <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                                {r.regional}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 border-b border-slate-800/50 text-center">
                            <span className="px-3 py-1 bg-slate-800 rounded-lg text-[9px] font-black text-slate-300 uppercase border border-slate-700">
                              {r.month} {r.year}
                            </span>
                          </td>
                          <td className="px-6 py-5 border-b border-slate-800/50">
                            <div className="flex flex-col gap-1.5 w-24">
                              <div className="flex justify-between items-center text-[9px] font-black">
                                <span
                                  style={{
                                    color: getTrafficColor(r.totalMand),
                                  }}
                                >
                                  {r.totalMand.toFixed(0)}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                                <div
                                  className="h-full transition-all duration-1000"
                                  style={{
                                    width: `${r.totalMand}%`,
                                    backgroundColor: getTrafficColor(
                                      r.totalMand,
                                    ),
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 border-b border-slate-800/50">
                            <div className="flex flex-col gap-1.5 w-24">
                              <div className="flex justify-between items-center text-[9px] font-black">
                                <span className="text-indigo-400">
                                  {r.totalNoMand.toFixed(0)}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                                <div
                                  className="h-full bg-indigo-500 transition-all duration-1000"
                                  style={{ width: `${r.totalNoMand}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 border-b border-slate-800/50 text-center">
                            <button className="p-3 bg-slate-800 text-slate-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl border border-slate-700">
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredData.length > 50 && (
                  <div className="p-6 text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] border-t border-slate-800 bg-[#0f172a]">
                    Mostrando las primeras 50 auditorías de{" "}
                    {filteredData.length} totales
                  </div>
                )}
              </div>
            </div>
          </div>
          )
        )}

        {activeTab === "novedades" && (
          <div className="bg-[#1a1a2e] rounded-[3.5rem] p-10 shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in duration-500">
            {/* NOVELTY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div 
                onClick={() => setFilterCierreEstado("TODOS")}
                className={`p-8 rounded-[2.5rem] border flex flex-col items-center cursor-pointer select-none transition-all duration-300 hover:scale-[1.04] hover:shadow-indigo-500/10 active:scale-95 shadow-2xl ${
                  filterCierreEstado === "TODOS" 
                    ? "bg-[#16203d] border-indigo-500/80 shadow-indigo-900/10 ring-2 ring-indigo-500/10" 
                    : "bg-[#0f172a] border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="p-3 bg-slate-800 text-slate-400 rounded-xl mb-4 transition-colors">
                  <List size={24} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Total Novedades
                </p>
                <h3 className="text-4xl font-black text-white">
                  {novedadesData.length}
                </h3>
                <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider mt-2">
                  {filterCierreEstado === "TODOS" ? "✓ Filtro Activo" : "Haga clic para ver todo"}
                </span>
              </div>
              <div 
                onClick={() => setFilterCierreEstado("PENDIENTE")}
                className={`p-8 rounded-[2.5rem] border flex flex-col items-center cursor-pointer select-none transition-all duration-300 hover:scale-[1.04] hover:shadow-rose-500/10 active:scale-95 shadow-2xl ${
                  filterCierreEstado === "PENDIENTE" 
                    ? "bg-[#2d121c] border-rose-500/80 shadow-rose-950/10 ring-2 ring-rose-500/10" 
                    : "bg-[#0f172a] border-rose-500/20 hover:border-rose-500/40"
                }`}
              >
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl mb-4">
                  <AlertTriangle size={24} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Pendientes
                </p>
                <h3 className="text-4xl font-black text-white">
                  {novedadesStats.pending}
                </h3>
                <span className="text-[8px] font-bold text-rose-400 uppercase tracking-wider mt-2">
                  {filterCierreEstado === "PENDIENTE" ? "✓ Filtro Activo" : "Haga clic para filtrar"}
                </span>
              </div>
              <div 
                onClick={() => setFilterCierreEstado("REALIZADO")}
                className={`p-8 rounded-[2.5rem] border flex flex-col items-center cursor-pointer select-none transition-all duration-300 hover:scale-[1.04] hover:shadow-emerald-500/10 active:scale-95 shadow-2xl ${
                  filterCierreEstado === "REALIZADO" 
                    ? "bg-[#0d2821] border-emerald-500/80 shadow-emerald-950/10 ring-2 ring-emerald-500/10" 
                    : "bg-[#0f172a] border-emerald-500/20 hover:border-emerald-500/40"
                }`}
              >
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl mb-4">
                  <CheckCircle size={24} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Realizados
                </p>
                <h3 className="text-4xl font-black text-white">
                  {novedadesStats.completed}
                </h3>
                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider mt-2">
                  {filterCierreEstado === "REALIZADO" ? "✓ Filtro Activo" : "Haga clic para filtrar"}
                </span>
              </div>
              <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl flex flex-col items-center justify-center">
                <NovedadesDonut compliance={novedadesStats.compliance} />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
                  Cumplimiento
                </p>
              </div>
            </div>

            {/* NOVELTY CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                  <TrendingUp size={16} className="text-indigo-400" /> Tendencia
                  Mensual
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={novedadesChartsData.monthlyTrend}
                      className="cursor-pointer"
                      onClick={(state: any) => {
                        if (
                          state &&
                          state.activePayload &&
                          state.activePayload[0]
                        ) {
                          const clickedData = state.activePayload[0].payload;
                          const month = clickedData.month;
                          const year = clickedData.year.toString();
                          if (filterMonth === month && filterYear === year) {
                            setFilterMonth("Todos");
                            setFilterYear("Todos");
                          } else {
                            setFilterMonth(month);
                            setFilterYear(year);
                          }
                        }
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#1e293b"
                      />
                      <XAxis dataKey="name" hide />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.1}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          const isSelected =
                            (filterMonth === "Todos" &&
                              filterYear === "Todos") ||
                            (filterMonth === payload.month &&
                              filterYear === payload.year.toString());
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected ? 5 : 3}
                              fill="#6366f1"
                              stroke="#0f172a"
                              strokeWidth={isSelected ? 2 : 1}
                              opacity={isSelected ? 1 : 0.4}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const month = payload.month;
                                const year = payload.year.toString();
                                if (
                                  filterMonth === month &&
                                  filterYear === year
                                ) {
                                  setFilterMonth("Todos");
                                  setFilterYear("Todos");
                                } else {
                                  setFilterMonth(month);
                                  setFilterYear(year);
                                }
                              }}
                            />
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cerrados"
                        name="Cerrados"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.1}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          const isSelected =
                            (filterMonth === "Todos" &&
                              filterYear === "Todos") ||
                            (filterMonth === payload.month &&
                              filterYear === payload.year.toString());
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected ? 5 : 3}
                              fill="#10b981"
                              stroke="#0f172a"
                              strokeWidth={isSelected ? 2 : 1}
                              opacity={isSelected ? 1 : 0.4}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const month = payload.month;
                                const year = payload.year.toString();
                                if (
                                  filterMonth === month &&
                                  filterYear === year
                                ) {
                                  setFilterMonth("Todos");
                                  setFilterYear("Todos");
                                } else {
                                  setFilterMonth(month);
                                  setFilterYear(year);
                                }
                              }}
                            />
                          );
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                  <BarChart3 size={16} className="text-indigo-400" /> Novedades
                  por CD
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={novedadesChartsData.cdChart}
                      className="cursor-pointer"
                      onClick={(state: any) => {
                        if (
                          state &&
                          state.activePayload &&
                          state.activePayload[0]
                        ) {
                          const clickedCd = state.activePayload[0].payload.name;
                          setFilterCD((prev) =>
                            prev === clickedCd ? "Todos" : clickedCd,
                          );
                        }
                      }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={80}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#ffffff",
                          fontSize: 10,
                          fontWeight: 900,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "12px",
                        }}
                      />
                      <Bar
                        dataKey="total"
                        name="Total"
                        radius={[0, 4, 4, 0]}
                        barSize={10}
                      >
                        {novedadesChartsData.cdChart.map((entry, index) => {
                          const isSelected =
                            filterCD === "Todos" || filterCD === entry.name;
                          return (
                            <Cell
                              key={`total-${index}`}
                              fill="#334155"
                              opacity={isSelected ? 1 : 0.3}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const clickedCd = entry.name;
                                setFilterCD((prev) =>
                                  prev === clickedCd ? "Todos" : clickedCd,
                                );
                              }}
                            />
                          );
                        })}
                      </Bar>
                      <Bar
                        dataKey="closed"
                        name="Cerrados"
                        radius={[0, 4, 4, 0]}
                        barSize={10}
                      >
                        {novedadesChartsData.cdChart.map((entry, index) => {
                          const isSelected =
                            filterCD === "Todos" || filterCD === entry.name;
                          return (
                            <Cell
                              key={`closed-${index}`}
                              fill="#10b981"
                              opacity={isSelected ? 1 : 0.3}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const clickedCd = entry.name;
                                setFilterCD((prev) =>
                                  prev === clickedCd ? "Todos" : clickedCd,
                                );
                              }}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                  <User size={16} className="text-indigo-400" /> Por Contratista
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={novedadesChartsData.contractorChart}
                      className="cursor-pointer"
                      onClick={(state: any) => {
                        if (
                          state &&
                          state.activePayload &&
                          state.activePayload[0]
                        ) {
                          const clickedContractor =
                            state.activePayload[0].payload.name;
                          setFilterContractor((prev) =>
                            prev === clickedContractor
                              ? "Todos"
                              : clickedContractor,
                          );
                        }
                      }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={80}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#ffffff",
                          fontSize: 10,
                          fontWeight: 900,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "12px",
                        }}
                      />
                      <Bar
                        dataKey="total"
                        name="Total"
                        radius={[0, 4, 4, 0]}
                        barSize={10}
                      >
                        {novedadesChartsData.contractorChart.map(
                          (entry, index) => {
                            const isSelected =
                              filterContractor === "Todos" ||
                              filterContractor === entry.name;
                            return (
                              <Cell
                                key={`c-total-${index}`}
                                fill="#334155"
                                opacity={isSelected ? 1 : 0.3}
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const clickedContractor = entry.name;
                                  setFilterContractor((prev) =>
                                    prev === clickedContractor
                                      ? "Todos"
                                      : clickedContractor,
                                  );
                                }}
                              />
                            );
                          },
                        )}
                      </Bar>
                      <Bar
                        dataKey="closed"
                        name="Cerrados"
                        radius={[0, 4, 4, 0]}
                        barSize={10}
                      >
                        {novedadesChartsData.contractorChart.map(
                          (entry, index) => {
                            const isSelected =
                              filterContractor === "Todos" ||
                              filterContractor === entry.name;
                            return (
                              <Cell
                                key={`c-closed-${index}`}
                                fill="#6366f1"
                                opacity={isSelected ? 1 : 0.3}
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const clickedContractor = entry.name;
                                  setFilterContractor((prev) =>
                                    prev === clickedContractor
                                      ? "Todos"
                                      : clickedContractor,
                                  );
                                }}
                              />
                            );
                          },
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none underline decoration-indigo-500 underline-offset-8">
                  Cierre de Novedades
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                  Seguimiento y cierre de hallazgos detectados en auditorías
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                {/* Export to Excel Button */}
                <div className="flex flex-col gap-1 w-full sm:w-auto justify-end">
                  <span className="text-[9px] font-black text-indigo-300 uppercase ml-2 px-1 block h-4"></span>
                  <button
                    onClick={handleExportNovedades}
                    className="flex items-center justify-center gap-2 px-6 py-[14px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all active:scale-95 group shrink-0"
                    title="Exportar novedades a archivo Excel/CSV"
                  >
                    <FileSpreadsheet size={16} className="group-hover:rotate-12 transition-transform" />
                    Exportar Excel
                  </button>
                </div>
                {/* Select Filter */}
                <div className="flex flex-col gap-1 w-full sm:w-72">
                  <label className="text-[9px] font-black text-indigo-300 uppercase ml-2 px-1">
                    Novedad / Observación
                  </label>
                  <select
                    value={filterNovelty}
                    onChange={(e) => setFilterNovelty(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-4 py-3.5 text-xs text-white focus:ring-2 ring-indigo-500 outline-none transition-all font-black uppercase appearance-none cursor-pointer"
                  >
                    <option value="Todos">Todas las novedades</option>
                    {noveltyOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Search Bar */}
                <div className="flex flex-col gap-1 w-full sm:w-72 relative shadow-2xl">
                  <label className="text-[9px] font-black text-indigo-300 uppercase ml-2 px-1">
                    Buscar por Placa / Texto
                  </label>
                  <div className="relative">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Buscar por placa o novedad..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl pl-12 pr-6 py-3.5 text-xs text-white focus:ring-2 ring-indigo-500 outline-none transition-all placeholder:text-slate-650 font-black uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-slate-800 bg-[#0f172a] shadow-inner">
              <table className="w-full text-left text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#1e1e35]">
                    <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800">
                      Fecha Cierre
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800">
                      Mes
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800">
                      Vehículo
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800">
                      Novedad / Observación
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800 text-center">
                      Verificación (Col F)
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800 text-center">
                      Estado
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] border-b border-slate-800 text-center">
                      Evidencia
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <AnimatePresence>
                    {displayedNovedadesData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-wider">
                          <AlertTriangle className="text-amber-500 mx-auto mb-3" size={32} />
                          No se encontraron novedades para esta placa y filtros
                        </td>
                      </tr>
                    ) : (
                      displayedNovedadesData.map((r, i) => (
                       <motion.tr
                        key={`novelty-${r.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          duration: 0.2,
                          delay: Math.min(i, 20) * 0.03,
                        }}
                        className="hover:bg-indigo-600/10 transition-all group"
                      >
                        <td className="px-6 py-5 border-b border-slate-800/50">
                          <div className="flex flex-col">
                            <span className="text-white font-black text-xs">
                              {r.noveltyDate || r.date}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">
                              Registro Audit
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-800/50">
                          <span className="text-white font-black text-xs uppercase">
                            {r.month}
                          </span>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-800/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-xs font-black text-white group-hover:bg-indigo-600 transition-all border border-slate-700">
                              {r.plate.substring(0, 3)}
                            </div>
                            <span className="font-black text-white">
                              {r.plate}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-800/50">
                          <p className="text-slate-300 text-xs font-bold leading-relaxed line-clamp-2 max-w-xs">
                            {r.observations || "Sin observación registrada"}
                          </p>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-800/50 text-center">
                          <span
                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              r.verification?.toUpperCase() === "SI"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : r.verification?.toUpperCase() === "NO"
                                ? "bg-rose-500/10 text-rose-450 border border-rose-500/20"
                                : "bg-[#1e1e35] text-slate-400 border border-slate-700/55"
                            }`}
                          >
                            {r.verification || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-800/50 text-center">
                          <span
                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              r.status?.toUpperCase() === "REALIZADO"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            }`}
                          >
                            {r.status || "PENDIENTE"}
                          </span>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-800/50 text-center">
                          <div className="flex justify-center gap-2">
                            {r.evidence ? (
                              <button
                                onClick={() => {
                                  const imgs = r.evidence
                                    ? r.evidence.split(",").map((s) => s.trim())
                                    : [];
                                  setGalleryImages(imgs);
                                  setIsGalleryOpen(true);
                                  setSelectedNovelty(r);
                                }}
                                className="p-3 bg-emerald-600/20 text-emerald-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-xl flex items-center gap-2 font-black text-xs"
                              >
                                <span className="text-xl">🖼️</span> VER
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedNovelty(r);
                                  setNoveltyObs(r.noveltyObservation || "");
                                  setNoveltyStatus(r.status || "PENDIENTE");
                                  setNoveltyVerification(r.verification || "NO");
                                  setNoveltyEvidence([]);
                                  setIsEvidenceModalOpen(true);
                                }}
                                className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-xl flex items-center gap-2 font-black text-xs"
                              >
                                <span className="text-xl">📸</span> REGISTRAR
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )))
                    }
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "seguimiento" && (
          <FleetSeguimientoTab isDarkTheme={true} />
        )}
      </div>

      <AnimatePresence>
        {selectedAudit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAudit(null)}
              className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-3xl pointer-events-auto"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="bg-[#1a1a2e] w-full max-w-5xl max-h-[90vh] rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] border border-white/10 relative z-10 flex flex-col pointer-events-auto overflow-hidden"
            >
              <div className="p-8 md:p-12 border-b border-slate-800 flex justify-between items-start bg-[#16162a]">
                <div className="flex gap-8 items-center">
                  <div className="w-28 h-28 bg-[#0f172a] rounded-[2.5rem] border-4 border-indigo-500/30 flex flex-col items-center justify-center shadow-2xl relative">
                    <div className="absolute inset-0 bg-indigo-500/5 rounded-[2.5rem] blur-xl"></div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest -mb-1 relative z-10">
                      Placa
                    </span>
                    <span className="text-3xl font-black text-white relative z-10">
                      {selectedAudit.plate}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase leading-none">
                      {selectedAudit.plate}
                    </h2>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[11px] mt-4 flex items-center gap-6">
                      <span className="flex items-center gap-2">
                        <User size={16} className="text-indigo-400" />{" "}
                        {selectedAudit.auditor}
                      </span>
                      <span className="flex items-center gap-2">
                        <Calendar size={16} className="text-indigo-400" />{" "}
                        {selectedAudit.month} {selectedAudit.year}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAudit(null)}
                  className="p-5 bg-[#0f172a] text-slate-500 hover:text-white hover:bg-rose-500 rounded-3xl transition-all shadow-2xl border border-slate-800"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:px-12 md:pb-12 space-y-12 custom-scrollbar bg-[#1a1a2e]">
                {/* Stats Grid inside Modal */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-rose-500/20 ring-4 ring-rose-500/5 shadow-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Score Mandatorio
                    </p>
                    <p className="text-5xl font-black text-rose-500 tracking-tighter">
                      {selectedAudit.totalMand.toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-indigo-500/20 ring-4 ring-indigo-500/5 shadow-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Score No Mandatorio
                    </p>
                    <p className="text-5xl font-black text-indigo-400 tracking-tighter">
                      {selectedAudit.totalNoMand.toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-slate-800 lg:col-span-2 shadow-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Centro de Distribución
                    </p>
                    <p className="text-3xl font-black text-white tracking-tighter uppercase mb-1">
                      {selectedAudit.cd}
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {selectedAudit.regional}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-10">
                    <div className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
                      <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-8 pb-4 border-b border-slate-800 flex justify-between items-center">
                        <span className="flex items-center gap-3">
                          <Shield size={20} className="text-indigo-400" />{" "}
                          Documentación
                        </span>
                        <span className="px-4 py-1 bg-indigo-500/10 rounded-full text-indigo-400">
                          {selectedAudit.docMand.toFixed(0)}%
                        </span>
                      </h3>
                      <div className="space-y-4">
                        {ITEM_LABELS.doc.map((label, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-[#1a1a2e] p-5 rounded-2xl border border-slate-800/50 hover:bg-slate-800/20 transition-all"
                          >
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">
                              {label}
                            </span>
                            {selectedAudit.docBin[idx] === 1 ? (
                              <CheckCircle
                                size={20}
                                className="text-emerald-500"
                              />
                            ) : (
                              <X size={20} className="text-rose-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
                      <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-8 pb-4 border-b border-slate-800 flex justify-between items-center">
                        <span className="flex items-center gap-3">
                          <Fuel size={20} className="text-indigo-400" /> Imagen
                          Corporativa
                        </span>
                        <span className="px-4 py-1 bg-indigo-500/10 rounded-full text-indigo-400">
                          {selectedAudit.imgMand.toFixed(0)}%
                        </span>
                      </h3>
                      <div className="space-y-4">
                        {ITEM_LABELS.img.map((label, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-[#1a1a2e] p-5 rounded-2xl border border-slate-800/50 hover:bg-slate-800/20 transition-all"
                          >
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">
                              {label}
                            </span>
                            {selectedAudit.imgBin[idx] === 1 ? (
                              <CheckCircle
                                size={20}
                                className="text-emerald-500"
                              />
                            ) : (
                              <X size={20} className="text-rose-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
                      <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-8 pb-4 border-b border-slate-800 flex justify-between items-center">
                        <span className="flex items-center gap-3">
                          <TrendingUp size={20} className="text-indigo-400" />{" "}
                          Señalización
                        </span>
                        <span className="px-4 py-1 bg-indigo-500/10 rounded-full text-indigo-400">
                          {selectedAudit.signMand.toFixed(0)}%
                        </span>
                      </h3>
                      <div className="space-y-4">
                        {ITEM_LABELS.sign.map((label, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center bg-[#1a1a2e] p-5 rounded-2xl border border-slate-800/50 hover:bg-slate-800/20 transition-all"
                          >
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">
                              {label}
                            </span>
                            {selectedAudit.signBin[idx] === 1 ? (
                              <CheckCircle
                                size={20}
                                className="text-emerald-500"
                              />
                            ) : (
                              <X size={20} className="text-rose-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#0f172a] p-10 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
                      <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-3 underline underline-offset-4">
                        <Info size={16} /> Observaciones del Auditor
                      </h3>
                      <p className="text-slate-200 font-bold italic text-lg leading-relaxed relative z-10 p-6 bg-[#1a1a2e]/50 rounded-2xl border border-white/5">
                        "
                        {selectedAudit.observations ||
                          "Sin observaciones registradas para esta auditoría operativa."}
                        "
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EVIDENCE REGISTRATION MODAL */}
      <AnimatePresence>
        {isEvidenceModalOpen && selectedNovelty && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsEvidenceModalOpen(false)}
              className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="bg-[#1a1a2e] w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 relative z-10 flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#16162a]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl">
                    <Camera size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                      Registrar Evidencia
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {selectedNovelty.plate} | {selectedNovelty.auditType}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEvidenceModalOpen(false)}
                  className="p-3 bg-[#0f172a] text-slate-500 hover:text-white rounded-2xl transition-all"
                  disabled={isSubmitting}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">
                    Cargar Fotos (Máx. 4)
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`p-6 border-2 border-dashed rounded-3xl transition-all duration-200 ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 scale-[1.01]' 
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20 text-slate-400'
                    }`}
                  >
                    <div className="grid grid-cols-4 gap-4">
                      {noveltyEvidence.map((img, idx) => (
                        <div
                          key={idx}
                          className="aspect-square bg-[#0f172a] rounded-2xl border border-slate-800 relative group overflow-hidden"
                        >
                          <img
                            src={getDriveDirectLink(img)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          <button
                            onClick={() =>
                              setNoveltyEvidence((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {noveltyEvidence.length < 4 && (
                        <label className="aspect-square bg-[#0f172a]/60 rounded-2xl border-2 border-dashed border-slate-750 hover:border-indigo-500 flex flex-col items-center justify-center cursor-pointer group transition-all">
                          <Upload
                            size={24}
                            className={`mb-1 transition-transform duration-200 ${isDragging ? 'scale-110 text-indigo-400' : 'text-slate-600 group-hover:text-indigo-400'}`}
                          />
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-400 text-center px-1">
                            {isDragging ? '¡Sueltas!' : 'Añadir / Arrastrar'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                    {noveltyEvidence.length === 0 && (
                      <p className="text-[10px] text-slate-600 text-center mt-3 font-bold uppercase tracking-wider">
                        {isDragging ? '¡Suelta las imágenes aquí mismo!' : 'Arrastra tus fotos o haz clic en Añadir (Hasta 4 fotos, se guardarán como collage)'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">
                    Cambiar Estado
                  </label>
                  <div className="flex gap-2">
                    {["PENDIENTE", "REALIZADO"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setNoveltyStatus(st)}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          noveltyStatus === st
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-[#0f172a] text-slate-500 border border-slate-800"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedNovelty.isCierre && (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">
                      Verificación (Columna F)
                    </label>
                    <div className="flex gap-2">
                      {["SI", "NO"].map((v) => (
                        <button
                          key={v}
                          onClick={() => setNoveltyVerification(v)}
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            noveltyVerification === v
                              ? "bg-[#D97706] text-white shadow-lg shadow-amber-500/20"
                              : "bg-[#0f172a] text-slate-500 border border-slate-800"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">
                    Observación del Cierre
                  </label>
                  <textarea
                    value={noveltyObs}
                    onChange={(e) => setNoveltyObs(e.target.value)}
                    placeholder="Escriba aquí los detalles del cumplimiento..."
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-3xl p-6 text-sm text-white focus:ring-2 ring-indigo-500 outline-none transition-all font-bold min-h-[120px]"
                  />
                </div>

                <button
                  onClick={handleSaveEvidence}
                  disabled={isSubmitting}
                  className={`w-full py-5 rounded-[2rem] flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all shadow-2xl ${
                    isSubmitting
                      ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />{" "}
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Save size={20} /> Guardar Evidencia
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GALLERY MODAL */}
      <AnimatePresence>
        {isGalleryOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGalleryOpen(false)}
              className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-3xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a2e] w-full max-w-4xl p-8 rounded-[3.5rem] border border-white/10 relative z-10 overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                    Evidencias Registradas
                  </h3>
                  {selectedNovelty && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {selectedNovelty.plate} | {selectedNovelty.auditType}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsGalleryOpen(false)}
                  className="p-4 bg-white/5 text-slate-400 hover:text-white rounded-[1.5rem] transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                <div
                  className={`grid gap-4 ${galleryImages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  {galleryImages.map((img, i) => (
                    <div
                      key={i}
                      className="aspect-video rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative group bg-[#0f172a]"
                    >
                      <img
                        src={getDriveDirectLink(img)}
                        alt={`Evidence ${i}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <a
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-white/10 backdrop-blur-md text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 shadow-2xl border border-white/20"
                      >
                        <ExternalLink size={24} />
                      </a>
                    </div>
                  ))}
                </div>
                {galleryImages.length === 0 && (
                  <div className="flex flex-col items-center py-20 bg-[#0f172a]/50 rounded-[3rem] border border-dashed border-slate-800">
                    <ImageIcon size={48} className="text-slate-700 mb-4" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">
                      No hay imágenes disponibles
                    </p>
                  </div>
                )}
              </div>

              {selectedNovelty && selectedNovelty.noveltyObservation && (
                <div className="mt-8 p-8 bg-[#0f172a] rounded-[2.5rem] border border-slate-800 shadow-inner">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
                    <Info size={14} /> Observación de Cierre
                  </h4>
                  <p className="text-slate-200 font-bold text-sm leading-relaxed italic">
                    "{selectedNovelty.noveltyObservation}"
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FleetStandardModule;
