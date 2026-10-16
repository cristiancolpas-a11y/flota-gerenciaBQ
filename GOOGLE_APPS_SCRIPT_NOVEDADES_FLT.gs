/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: MÓDULO NOVEDADES CHECK LIST MONTACARGAS
 * =========================================================================
 * Documento de Novedades Check List: 1cdocNK5v-ENbTt7cDSPggErghESuWbL40IqF5X-xg4I
 * Hoja: "CIERRE DE NOVEDADES" (GID: 0)
 * Columna de Links: Columna 20 (T) -> "LINKS"
 * 
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Abre el documento de Google Sheets o ve a script.google.com
 * 2. Crea un nuevo proyecto o pega este código completo en el editor.
 * 3. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 4. Tipo: "Aplicación web" (Web App).
 * 5. Ejecutar como: "Yo" (tu cuenta con permisos de edición).
 * 6. Quién tiene acceso: "Cualquier persona" (Anyone - anónimos).
 * 7. Copia la URL de la aplicación web terminada en /exec
 * 8. Configura esa URL en la aplicación (en services/sheetService.ts o en el botón de configuración del módulo).
 * =========================================================================
 */

var ID_HOJA_NOVEDADES = "1cdocNK5v-ENbTt7cDSPggErghESuWbL40IqF5X-xg4I";
var GID_NOVEDADES = "0";
var NOMBRE_CARPETA_DRIVE = "EVIDENCIAS_NOVEDADES_FLT";

/**
 * Manejador GET para verificación de estado y lectura
 */
function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var action = p.action || p.method || "";                          // acepta action Y method
  var docId = p.docId ? cleanId(p.docId) : ID_HOJA_NOVEDADES;
  var sheetName = p.sheet || p.sheetName || "CIERRE DE NOVEDADES";   // acepta sheet Y sheetName

  if (action === "read" || action === "read_sheet" || action === "getData" || action === "GET_DATA") {
    try {
      var ss = getSpreadsheet(docId);
      var s = getSheetByGid(ss, GID_NOVEDADES) || findSheetCaseInsensitive(ss, sheetName) || ss.getSheets()[0];
      var data = s.getDataRange().getValues();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: data, data: data }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Apps Script - Novedades Check List Montacargas",
    timestamp: new Date().toISOString(),
    docId: ID_HOJA_NOVEDADES,
    gid: GID_NOVEDADES,
    supportedMethods: ["POST_NOVEDAD_FLT_LINK", "GET_DATA"]
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Manejador POST con LockService para evitar colisiones
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

    var payload = null;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch(err) {
      // Intentar leer de parámetros form-encoded
      if (e.parameter && e.parameter.data) {
        payload = { method: e.parameter.method, data: JSON.parse(e.parameter.data) };
      } else {
        payload = e.parameter;
      }
    }

    if (!payload) {
      if (lock.hasLock()) lock.releaseLock();
      return output("error", "Estructura JSON inválida.");
    }

    var m = payload.method || (payload.data ? payload.data.method : "") || "";
    var d = payload.data || payload;

    // MÉTODO: Subir link de evidencia a una novedad
    if (m === 'POST_NOVEDAD_FLT_LINK') {
      var ss = SpreadsheetApp.openById(cleanId(d.docId) || ID_HOJA_NOVEDADES);
      var s = getSheetByGid(ss, "0") || findSheetCaseInsensitive(ss, "CIERRE DE NOVEDADES") || ss.getSheets()[0];
      if (!s) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Hoja CIERRE DE NOVEDADES no encontrada");
      }

      var rowIndex = Number(d.rowIndex);
      var placaSearch = (d.placa || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
      var foundIdx = -1;

      // Prioridad: rowIndex exacto (validando placa en col 6/idx 5)
      if (rowIndex >= 2) {
        var rows = s.getDataRange().getValues();
        if (rowIndex <= rows.length) {
          var rp = (rows[rowIndex - 1][5] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (!placaSearch || rp === placaSearch) {
            foundIdx = rowIndex;
          }
        }
        // fallback: buscar por placa si rowIndex no valida
        if (foundIdx === -1 && placaSearch) {
          for (var i = 1; i < rows.length; i++) {
            var p = (rows[i][5] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (p === placaSearch) {
              foundIdx = i + 1;
              break;
            }
          }
        }
      }

      if (foundIdx === -1) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró la novedad (placa " + placaSearch + ")");
      }

      // Subir imagen si viene base64, o usar el link tal cual
      var raw = d.link || d.evidencia || "";
      var linkFinal = "";
      if (typeof raw === 'string' && raw.indexOf('data:image') === 0) {
        linkFinal = saveImageToDrive(raw, "NOV_FLT_" + placaSearch);
      } else {
        linkFinal = String(raw).trim();
      }

      if (!linkFinal) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "El link o evidencia no puede estar vacío");
      }

      // slot 1 -> columna T (20) ; slot 2 -> columna U (21) ; slot 3 -> columna V (22)
      var slot = Number(d.slot);
      if (slot !== 2 && slot !== 3) slot = 1;           // por defecto 1
      var targetCol = slot === 3 ? 22 : (slot === 2 ? 21 : 20);
      var colLetra = slot === 3 ? "V" : (slot === 2 ? "U" : "T");

      s.getRange(foundIdx, targetCol).setValue(linkFinal);

      // Si se envió estado (ej. "Cerrado")
      if (d.estado) {
        s.getRange(foundIdx, 10).setValue(d.estado); // Columna 10 (J) = ESTADO
      }

      // Si se envió fecha de solución o si el estado es Cerrado
      if (d.fechaSolucion) {
        s.getRange(foundIdx, 12).setValue(d.fechaSolucion); // Columna 12 (L) = FECHA SOLUCIÓN
      } else if (d.estado && d.estado.toString().toLowerCase().indexOf('cerrad') !== -1) {
        var fechaHoy = Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd");
        s.getRange(foundIdx, 12).setValue(fechaHoy);
      }

      // Si se enviaron observaciones adicionales
      if (d.observaciones) {
        var currentObs = (s.getRange(foundIdx, 19).getValue() || "").toString();
        var newObs = currentObs ? (currentObs + " | " + d.observaciones) : d.observaciones;
        s.getRange(foundIdx, 19).setValue(newObs); // Columna 19 (S) = OBSERVACIONES
      }

      SpreadsheetApp.flush();
      if (lock.hasLock()) lock.releaseLock();
      return output("success", "Evidencia guardada en fila " + foundIdx + " (columna " + colLetra + ")", {
        rowIndex: foundIdx,
        placa: placaSearch,
        link: linkFinal,
        slot: slot,
        estado: d.estado || null
      });
    }

    // MÉTODO: Subir imagen Base64 directamente a Drive
    else if (m === 'UPLOAD_IMAGE') {
      var base64 = d.base64 || d.image || d.imageBase64;
      var name = d.name || ("NOVEDAD_FLT_" + Date.now());
      if (!base64) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se recibió la imagen en base64.");
      }
      var driveUrl = saveImageToDrive(base64, name);
      if (lock.hasLock()) lock.releaseLock();
      return output("success", "Imagen subida exitosamente", { link: driveUrl, url: driveUrl });
    }

    if (lock.hasLock()) lock.releaseLock();
    return output("error", "Método no soportado: " + m);

  } catch(err) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", "Excepción en el servidor: " + err.toString());
  }
}

/**
 * Guarda una imagen Base64 en Google Drive en una carpeta pública y retorna el enlace
 */
function saveImageToDrive(base64Data, filenamePrefix) {
  try {
    var parts = base64Data.split(",");
    var meta = parts[0];
    var data = parts[1];
    var mime = "image/jpeg";
    var ext = "jpg";

    if (meta.indexOf("png") > -1) { mime = "image/png"; ext = "png"; }
    else if (meta.indexOf("webp") > -1) { mime = "image/webp"; ext = "webp"; }

    var decoded = Utilities.base64Decode(data);
    var timestamp = Utilities.formatDate(new Date(), "GMT-5", "yyyyMMdd_HHmmss");
    var fileName = (filenamePrefix || "EVIDENCIA_FLT") + "_" + timestamp + "." + ext;
    var blob = Utilities.newBlob(decoded, mime, fileName);

    var folders = DriveApp.getFoldersByName(NOMBRE_CARPETA_DRIVE);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(NOMBRE_CARPETA_DRIVE);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Enlace público directo
    return "https://drive.google.com/uc?export=view&id=" + file.getId();
  } catch(e) {
    return "Error_Drive: " + e.toString();
  }
}

/**
 * Busca una hoja por su GID numérico
 */
function getSheetByGid(spreadsheet, targetGid) {
  if (targetGid === undefined || targetGid === null) return null;
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
 * Abre el Spreadsheet por ID
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
  throw new Error("No se pudo abrir la hoja con ID: " + docId);
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
