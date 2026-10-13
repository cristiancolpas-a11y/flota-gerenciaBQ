/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: MÓDULO NOVEDADES CHECK LIST MONTACARGAS
 * =========================================================================
 * Documento: 1cdocNK5v-ENbTt7cDSPggErghESuWbL40IqF5X-xg4I
 * Hoja: "CIERRE DE NOVEDADES" (GID: 0)
 * 
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Abre Google Apps Script (script.google.com) o ve a Extensiones > Apps Script
 *    en tu hoja de cálculo "1cdocNK5v-ENbTt7cDSPggErghESuWbL40IqF5X-xg4I".
 * 2. Pega este código completo en el editor de Apps Script.
 * 3. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 4. Selecciona tipo: "Aplicación web" (Web App).
 * 5. Descripción: "API Novedades Check List Montacargas".
 * 6. Ejecutar como: "Yo" (tu cuenta de Google).
 * 7. Quién tiene acceso: "Cualquier persona" (Anyone - incluso usuarios anónimos).
 * 8. Haz clic en "Implementar" y autoriza los permisos si los solicita.
 * 9. Copia la URL de la aplicación web generada (termina en /exec) y pégala en la
 *    aplicación en: Montacargas > Novedades Check List > Configurar Script.
 * =========================================================================
 */

var DOC_ID_NOVEDADES_FLT = "1cdocNK5v-ENbTt7cDSPggErghESuWbL40IqF5X-xg4I";
var HOJA_NOVEDADES_FLT = "CIERRE DE NOVEDADES";
var CARPETA_EVIDENCIAS_DRIVE = "EVIDENCIAS_NOVEDADES_CHECKLIST_MONTACARGAS";

/**
 * Manejador GET (para verificación, diagnóstico y lectura de datos)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  var docId = (e && e.parameter && e.parameter.docId) ? e.parameter.docId : DOC_ID_NOVEDADES_FLT;
  var sheetName = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : HOJA_NOVEDADES_FLT;
  
  if (action === "read" || action === "read_sheet" || action === "getData") {
    try {
      var ss = SpreadsheetApp.openById(docId);
      var s = ss.getSheetByName(sheetName) || ss.getSheets()[0];
      var data = s.getDataRange().getValues();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Apps Script - Novedades Check List Montacargas",
    timestamp: new Date().toISOString(),
    docId: DOC_ID_NOVEDADES_FLT,
    sheetName: HOJA_NOVEDADES_FLT,
    supportedMethods: ["POST_NOVEDAD_FLT_LINK", "UPLOAD_IMAGE", "GET_DATA"]
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Manejador POST principal para guardar el enlace de evidencia en la columna LINKS
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 segundos
  } catch (err) {
    return output("error", "El servidor de Apps Script está ocupado. Intenta de nuevo.");
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      if (lock.hasLock()) lock.releaseLock();
      return output("error", "No se recibieron datos en la petición.");
    }

    var payload = {};
    try {
      payload = JSON.parse(e.postData.contents);
    } catch(errJson) {
      var postParams = e.parameter || {};
      if (postParams.data) {
        try { payload = JSON.parse(postParams.data); } catch(e2) { payload = postParams; }
      } else {
        payload = postParams;
      }
    }

    var method = (payload.method || payload.action || "").toString().toUpperCase().trim();
    var data = payload.data || payload;

    // -----------------------------------------------------------------
    // MÉTODO: GUARDAR LINK DE EVIDENCIA EN COLUMNA LINKS
    // -----------------------------------------------------------------
    if (method === "POST_NOVEDAD_FLT_LINK") {
      var docId = data.docId || DOC_ID_NOVEDADES_FLT;
      var sheetName = data.sheetName || HOJA_NOVEDADES_FLT;
      var ss = SpreadsheetApp.openById(docId);
      var s = ss.getSheetByName(sheetName) || ss.getSheets()[0];
      
      var targetRow = Number(data.rowIndex);
      var linkValue = (data.link || data.url || data.links || "").toString().trim();

      // Si se envió una imagen en base64 para subir a Drive
      if (data.imageBase64 || (linkValue.indexOf("data:image") === 0)) {
        var base64Data = data.imageBase64 || linkValue;
        var placaNom = data.placa ? data.placa.toString().replace(/[^a-zA-Z0-9]/g, "") : "FLT";
        var fileName = "EVIDENCIA_NOVEDAD_" + placaNom + "_" + Date.now();
        linkValue = saveImageToDrive(base64Data, fileName);
      }

      if (!linkValue) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se proporcionó un enlace de evidencia válido.");
      }

      // Validar fila o buscar por placa y reporte si no viene rowIndex válido
      var lastRow = s.getLastRow();
      if (!targetRow || targetRow < 2 || targetRow > lastRow) {
        var placaTarget = (data.placa || "").toString().trim().toUpperCase();
        var reporteTarget = (data.reporte || "").toString().trim().toLowerCase();
        
        if (placaTarget) {
          var allRows = s.getDataRange().getValues();
          for (var r = 1; r < allRows.length; r++) {
            var rowPlaca = (allRows[r][5] || "").toString().trim().toUpperCase();
            var rowReporte = (allRows[r][7] || "").toString().trim().toLowerCase();
            if (rowPlaca === placaTarget && (reporteTarget ? rowReporte.indexOf(reporteTarget) !== -1 : true)) {
              targetRow = r + 1;
              break;
            }
          }
        }
      }

      if (!targetRow || targetRow < 2) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró la fila correspondiente a la novedad en la hoja.");
      }

      // Guardar en la columna 20 (Columna T = LINKS, índice 19 base cero)
      s.getRange(targetRow, 20).setValue(linkValue);

      // Opcional: Si se envía actualización de estado a Cerrado o similar
      if (data.estado) {
        s.getRange(targetRow, 10).setValue(data.estado); // Columna J (10) = ESTADO
      }

      // Opcional: Si se envía fecha de solución
      if (data.fechaSolucion) {
        s.getRange(targetRow, 12).setValue(data.fechaSolucion); // Columna L (12) = FECHA SOLUCIÓN
      }

      // Opcional: Si se envían observaciones adicionales
      if (data.observaciones) {
        var currentObs = (s.getRange(targetRow, 19).getValue() || "").toString();
        var newObs = currentObs ? (currentObs + " | " + data.observaciones) : data.observaciones;
        s.getRange(targetRow, 19).setValue(newObs); // Columna S (19) = OBSERVACIONES
      }

      SpreadsheetApp.flush();
      if (lock.hasLock()) lock.releaseLock();

      return output("success", "Link de evidencia guardado exitosamente en fila " + targetRow, {
        rowIndex: targetRow,
        link: linkValue,
        estado: data.estado || null
      });
    }

    // -----------------------------------------------------------------
    // MÉTODO: SUBIR IMAGEN A GOOGLE DRIVE
    // -----------------------------------------------------------------
    else if (method === "UPLOAD_IMAGE") {
      var base64 = data.base64 || data.image || data.imageBase64;
      var name = data.name || ("NOVEDAD_FLT_" + Date.now());
      if (!base64) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se recibió la imagen en base64.");
      }
      var driveUrl = saveImageToDrive(base64, name);
      if (lock.hasLock()) lock.releaseLock();
      return output("success", driveUrl, { url: driveUrl });
    }

    else {
      if (lock.hasLock()) lock.releaseLock();
      return output("error", "Método no soportado: " + method);
    }

  } catch(err) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", "Error interno en Apps Script: " + err.toString());
  }
}

/**
 * Guarda una imagen base64 en la carpeta designada de Google Drive y retorna su URL pública
 */
function saveImageToDrive(base64String, fileName) {
  try {
    var folder;
    var folders = DriveApp.getFoldersByName(CARPETA_EVIDENCIAS_DRIVE);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(CARPETA_EVIDENCIAS_DRIVE);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    var cleanBase64 = base64String;
    var contentType = "image/jpeg";
    var ext = ".jpg";

    if (base64String.indexOf("data:") === 0) {
      var parts = base64String.split(",");
      var meta = parts[0];
      cleanBase64 = parts[1];
      if (meta.indexOf("image/png") !== -1) {
        contentType = "image/png";
        ext = ".png";
      } else if (meta.indexOf("image/webp") !== -1) {
        contentType = "image/webp";
        ext = ".webp";
      }
    }

    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, contentType, fileName + ext);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();
  } catch(e) {
    throw new Error("Error al guardar la imagen en Drive: " + e.toString());
  }
}

/**
 * Helper para generar respuesta JSON con CORS
 */
function output(status, message, extra) {
  var res = {
    status: status,
    message: message,
    timestamp: new Date().toISOString()
  };
  if (extra) {
    for (var k in extra) {
      res[k] = extra[k];
    }
  }
  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}
