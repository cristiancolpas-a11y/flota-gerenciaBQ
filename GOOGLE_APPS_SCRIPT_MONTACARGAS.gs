/**
 * =========================================================================
 * GOOGLE APPS SCRIPT EXCLUSIVO: MÓDULO DE MONTACARGAS
 * =========================================================================
 * Documento de Montacargas: 1YLALShwjII0BUYfRsQthGMuVw-5m9Qd-Xuk00yniNe8
 * Hoja de Cierre: "CIERRE" (GID: 1238373688)
 * Hoja de Auditoría / Estándar: "ESTANDAR" (GID: 837525557)
 * 
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Abre tu hoja de cálculo de Montacargas o ve a script.google.com
 * 2. Pega este código completo en el editor de Apps Script (reemplaza cualquier código anterior).
 * 3. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 4. Tipo: "Aplicación web" (Web App).
 * 5. Ejecutar como: "Yo" (tu cuenta de correo).
 * 6. Quién tiene acceso: "Cualquier persona" (Anyone - incluso anónimos).
 * 7. Copia la URL generada (/exec) y pégala en la app en:
 *    Módulo Montacargas > Cierre de Novedades > Configurar Fuente (engranaje).
 * =========================================================================
 */

// ID por defecto de la hoja de cálculo de Montacargas
var ID_HOJA_MONTACARGAS = "1YLALShwjII0BUYfRsQthGMuVw-5m9Qd-Xuk00yniNe8";
var GID_CIERRE_MONTACARGAS = "1238373688";
var GID_ESTANDAR_MONTACARGAS = "837525557";
var NOMBRE_CARPETA_DRIVE = "EVIDENCIAS_MONTACARGAS";

/**
 * Manejador GET (para verificación y lectura directa)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  var docId = (e && e.parameter && e.parameter.docId) ? cleanId(e.parameter.docId) : ID_HOJA_MONTACARGAS;
  var sheetName = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : "CIERRE";
  
  if (action === "read" || action === "read_sheet" || action === "getData") {
    try {
      var ss = getSpreadsheet(docId);
      var s = findSheetCaseInsensitive(ss, sheetName) || ss.getSheetByName(sheetName) || ss.getSheets()[0];
      var data = s.getDataRange().getValues();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Respuesta de estado por defecto
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Apps Script - Módulo de Montacargas",
    timestamp: new Date().toISOString(),
    docId: ID_HOJA_MONTACARGAS,
    cierreGid: GID_CIERRE_MONTACARGAS,
    supportedMethods: [
      "POST_MONTACARGAS_CIERRE",
      "POST_FORKLIFT_CIERRE",
      "UPLOAD_IMAGE",
      "GET_DATA"
    ]
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Manejador POST principal para cierres y subida de imágenes
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 segundos
  } catch (err) {
    return output("error", "Servidor ocupado. Intenta nuevamente en unos segundos.");
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      if (lock.hasLock()) lock.releaseLock();
      return output("error", "No se recibieron datos en la petición POST.");
    }

    var payload = {};
    try {
      payload = JSON.parse(e.postData.contents);
    } catch(errJson) {
      // Fallback si viene url-encoded
      var postParams = e.parameter || {};
      if (postParams.data) {
        try { payload = JSON.parse(postParams.data); } catch(e2) { payload = postParams; }
      } else {
        payload = postParams;
      }
    }

    var method = payload.method || payload.action || "";
    var data = payload.data || payload;

    // Normalizar método a mayúsculas
    var m = method.toString().toUpperCase().trim();

    // -------------------------------------------------------------
    // MÉTODO: CIERRE DE NOVEDADES DE MONTACARGAS
    // -------------------------------------------------------------
    if (m === 'POST_MONTACARGAS_CIERRE' || m === 'POST_FORKLIFT_CIERRE' || m === 'CIERRE' || m === 'POST_CIERRE') {
      var targetDocId = cleanId(data.docId || ID_HOJA_MONTACARGAS);
      var ss = getSpreadsheet(targetDocId);

      // Buscar hoja CIERRE por GID o por nombre
      var sheetGid = data.gid || GID_CIERRE_MONTACARGAS;
      var s = getSheetByGid(ss, sheetGid) || 
              findSheetCaseInsensitive(ss, "CIERRE") || 
              ss.getSheetByName("CIERRE") || 
              ss.getSheetByName("cierre") || 
              ss.getSheets()[0];

      if (!s) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Hoja 'CIERRE' no encontrada en el documento " + targetDocId);
      }

      var rows = s.getDataRange().getValues();
      var foundIdx = -1;
      var reqRowIndex = Number(data.rowIndex);
      var plateSearch = (data.placa || data.plate || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
      var itemSearch = (data.item || "").toString().toLowerCase().trim();
      var fechaSearch = (data.fecha || "").toString().trim();

      // 1. Prioridad: Validación directa por rowIndex (si viene desde el cliente)
      if (reqRowIndex && reqRowIndex >= 2 && reqRowIndex <= rows.length) {
        var rowPlate = (rows[reqRowIndex - 1][2] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
        var rowItem = (rows[reqRowIndex - 1][3] || "").toString().toLowerCase().trim();
        
        // Si la placa coincide o está vacía, o si el ítem coincide, validamos la fila exacta
        if (!plateSearch || rowPlate === plateSearch || rowPlate.indexOf(plateSearch) !== -1 || plateSearch.indexOf(rowPlate) !== -1 || rowItem === itemSearch) {
          foundIdx = reqRowIndex;
        }
      }

      // 2. Coincidencia por Máquina (Col C / idx 2) e Ítem (Col D / idx 3)
      if (foundIdx === -1) {
        for (var i = 1; i < rows.length; i++) {
          var rPlate = (rows[i][2] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
          var rItem = (rows[i][3] || "").toString().toLowerCase().trim();
          var rStatus = (rows[i][6] || "").toString().trim().toUpperCase();
          var rFecha = (rows[i][0] || "").toString().trim();

          if (rPlate === plateSearch && rItem === itemSearch) {
            if (fechaSearch && rFecha && (rFecha.indexOf(fechaSearch) !== -1 || fechaSearch.indexOf(rFecha) !== -1)) {
              foundIdx = i + 1;
              if (rStatus === "PENDIENTE") break;
            } else if (foundIdx === -1) {
              foundIdx = i + 1;
              if (rStatus === "PENDIENTE") break;
            }
          }
        }
      }

      // 3. Fallback: Coincidencia aproximada por máquina e ítem
      if (foundIdx === -1) {
        for (var i = 1; i < rows.length; i++) {
          var rPlate = (rows[i][2] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
          var rItem = (rows[i][3] || "").toString().toLowerCase().trim();
          var rStatus = (rows[i][6] || "").toString().trim().toUpperCase();

          if (rPlate === plateSearch && (rItem.indexOf(itemSearch) !== -1 || itemSearch.indexOf(rItem) !== -1)) {
            foundIdx = i + 1;
            if (rStatus === "PENDIENTE") break;
          }
        }
      }

      // 4. Último fallback: primera fila pendiente de esa máquina
      if (foundIdx === -1) {
        for (var i = 1; i < rows.length; i++) {
          var rPlate = (rows[i][2] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
          var rStatus = (rows[i][6] || "").toString().trim().toUpperCase();

          if (rPlate === plateSearch && rStatus === "PENDIENTE") {
            foundIdx = i + 1;
            break;
          }
        }
      }

      if (foundIdx === -1) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró registro pendiente en CIERRE para: Máquina " + plateSearch + ", Ítem " + itemSearch);
      }

      // Procesar Evidencia Fotográfica
      var rawEv = data.evidencia || data.evidence;
      var evidenceUrl = "";
      if (rawEv) {
        if (Array.isArray(rawEv)) {
          var links = [];
          for (var j = 0; j < rawEv.length; j++) {
            if (rawEv[j] && (rawEv[j].indexOf("data:image") === 0 || rawEv[j].indexOf("http") !== 0)) {
              links.push(saveImageToDrive(rawEv[j], "CIERRE_FLT_" + plateSearch + "_" + j));
            } else if (rawEv[j]) {
              links.push(rawEv[j]);
            }
          }
          evidenceUrl = links.join(", ");
        } else if (typeof rawEv === 'string' && rawEv.indexOf("data:image") === 0) {
          evidenceUrl = saveImageToDrive(rawEv, "CIERRE_FLT_" + plateSearch);
        } else {
          evidenceUrl = rawEv;
        }

        // Columna F (6): EVIDENCIA
        s.getRange(foundIdx, 6).setValue(evidenceUrl);
      }

      // Columna E (5): VERIFICACION (se actualiza a 'SI')
      var verif = data.verificacion || data.verification || "SI";
      s.getRange(foundIdx, 5).setValue(verif);

      // Columna G (7): ESTADO -> REALIZADO
      var finalStatus = (evidenceUrl || data.estado === "REALIZADO" || data.status === "REALIZADO" || data.status === "CERRADO")
        ? (data.status === "CERRADO" ? "CERRADO" : "REALIZADO")
        : (data.estado || data.status || "REALIZADO");
      s.getRange(foundIdx, 7).setValue(finalStatus);

      if (lock.hasLock()) lock.releaseLock();
      return output("success", "Cierre de novedad de montacargas registrado exitosamente en fila " + foundIdx + " (Máquina: " + plateSearch + ")", {
        rowIndex: foundIdx,
        placa: plateSearch,
        estado: finalStatus,
        evidencia: evidenceUrl
      });
    }

    // -------------------------------------------------------------
    // MÉTODO: SUBIDA DE IMAGEN
    // -------------------------------------------------------------
    else if (m === 'UPLOAD_IMAGE') {
      var url = saveImageToDrive(data.base64 || data.image, data.name || "FLT_IMG_" + Date.now());
      if (lock.hasLock()) lock.releaseLock();
      return output("success", url);
    }

    // Método no reconocido
    else {
      if (lock.hasLock()) lock.releaseLock();
      return output("error", "Método no soportado en script de montacargas: " + method);
    }

  } catch(errGlobal) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", "Excepción no controlada: " + errGlobal.toString());
  }
}

/**
 * Función para guardar imágenes Base64 en Google Drive con permisos públicos
 */
function saveImageToDrive(base64Data, fileName) {
  if (!base64Data || typeof base64Data !== 'string') return "";
  if (base64Data.indexOf("http") === 0) return base64Data; // Ya es un enlace web

  try {
    var parts = base64Data.split(",");
    var rawBase64 = parts.length > 1 ? parts[1] : parts[0];
    var contentType = "image/jpeg";

    if (parts.length > 1 && parts[0].indexOf("image/png") !== -1) {
      contentType = "image/png";
    }

    var decoded = Utilities.base64Decode(rawBase64);
    var blob = Utilities.newBlob(decoded, contentType, (fileName || "EVIDENCIA_FLT") + ".jpg");

    // Buscar o crear la carpeta en Google Drive
    var folder;
    var folders = DriveApp.getFoldersByName(NOMBRE_CARPETA_DRIVE);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(NOMBRE_CARPETA_DRIVE);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Formato de enlace directo de visualización
    return "https://drive.google.com/uc?export=view&id=" + file.getId();
  } catch(e) {
    // Si falla Drive, intentar retornar base64 acotado o mensaje
    return "Error_Drive: " + e.toString();
  }
}

/**
 * Busca una hoja por su GID numérico
 */
function getSheetByGid(spreadsheet, targetGid) {
  if (!targetGid) return null;
  var targetStr = targetGid.toString().trim();
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId().toString() === targetStr) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * Busca una hoja ignorando mayúsculas, minúsculas y espacios
 */
function findSheetCaseInsensitive(spreadsheet, sheetName) {
  if (!sheetName) return null;
  var target = sheetName.toString().trim().toUpperCase();
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName().trim().toUpperCase();
    if (sName === target) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * Obtiene el Spreadsheet ya sea por ID o el activo
 */
function getSpreadsheet(docId) {
  var id = cleanId(docId);
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch(e) {}
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch(e) {}
  throw new Error("No se pudo abrir la hoja de cálculo con ID: " + docId);
}

/**
 * Limpia y normaliza el ID de un Google Sheet
 */
function cleanId(raw) {
  if (!raw) return "";
  var str = raw.toString().trim();
  var m = str.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m && m[1]) return m[1];
  return str.replace(/[^a-zA-Z0-9-_]/g, "");
}

/**
 * Formatea salida JSON con cabecera CORS abierta
 */
function output(status, message, extraData) {
  var res = {
    status: status,
    message: message || ""
  };
  if (extraData && typeof extraData === 'object') {
    for (var key in extraData) {
      res[key] = extraData[key];
    }
  }
  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}
