/**
 * Google Apps Script - Módulo de Campañas Especiales de Flota
 * 
 * INSTRUCCIONES DE USO:
 * 1. Abre tu hoja de cálculo de Campañas (ID: 1HZXNev6Wbek7YPX_47sx7KXfi6H4S15f1rc6rmQ18MY).
 * 2. En el menú superior, ve a "Extensiones" > "Apps Script".
 * 3. Elimina cualquier código existente y pega este script.
 * 4. Guarda el proyecto (clic en el ícono de disquete).
 * 5. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 6. Selecciona tipo de implementación: "Aplicación web" (Web app).
 * 7. Configura:
 *    - Descripción: "Backend Campañas Especiales"
 *    - Ejecutar como: "Yo" (Tu correo electrónico)
 *    - Quién tiene acceso: "Cualquiera" (Anyone)
 * 8. Haz clic en "Implementar", autoriza los permisos de Google Drive y Google Sheets.
 * 9. Copia la URL de la aplicación web obtenida para integrarla o usarla en la aplicación de flota.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Intentar obtener bloqueo por un máximo de 30 segundos
    if (!lock.tryLock(30000)) {
      return output("error", "Servidor ocupado. Por favor intenta de nuevo en unos segundos.");
    }

    if (!e || !e.postData || !e.postData.contents) {
      if (lock.hasLock()) lock.releaseLock();
      return output("error", "No se recibieron datos en la petición POST.");
    }

    var requestData = JSON.parse(e.postData.contents);
    var method = requestData.method;
    var d = requestData.data || {};

    // Obtener la hoja de cálculo activa donde está instalado el script
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      // Si se ejecuta fuera de contenedor o se pasa un docId
      var docId = cleanId(d.docId || '1HZXNev6Wbek7YPX_47sx7KXfi6H4S15f1rc6rmQ18MY');
      ss = SpreadsheetApp.openById(docId);
    }

    if (!ss) {
      if (lock.hasLock()) lock.releaseLock();
      return output("error", "No se pudo acceder a la hoja de cálculo de Campañas.");
    }

    if (method === 'POST_CAMPAIGN') {
      var sheetName = d.sheetName || 'GENERAL';
      var sheet = ss.getSheetByName(sheetName);
      
      // Crear la pestaña de campaña si no existe automáticamente
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        // Formatear cabeceras para una nueva hoja
        var headers = [
          "SEMANA", 
          "MES", 
          "FECHA", 
          "PLACA", 
          "TALLER RESPONSABLE", 
          "OBSERVACIÓN GENERAL", 
          "COLLAGE DE EVIDENCIAS", 
          "FOTO INDIVIDUAL 1", 
          "FOTO INDIVIDUAL 2"
        ];
        sheet.appendRow(headers);
        
        // Estilo elegante para la primera fila
        var headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setBackground("#3b82f6") // Azul moderno
                   .setFontColor("#ffffff")
                   .setFontWeight("bold")
                   .setHorizontalAlignment("center");
        sheet.setFrozenRows(1);
      }

      // Procesar imágenes base64 a URLs reales de Google Drive
      var img1 = saveImageToDrive(d.evidence1, "CAMP_COLLAGE_" + d.plate);
      var img2 = saveImageToDrive(d.evidence2, "CAMP_FOTO1_" + d.plate);
      var img3 = saveImageToDrive(d.evidence3, "CAMP_FOTO2_" + d.plate);

      // Preparar fila de datos
      var rowData = [
        d.semana || "",
        d.mes || "",
        d.fecha || "",
        (d.plate || "").toUpperCase().trim(),
        d.taller || "",
        d.observacion || "",
        img1 || "",
        img2 || "",
        img3 || ""
      ];

      // Insertar datos en la última fila
      sheet.appendRow(rowData);

      // Auto-ajustar columnas para mantener orden
      try {
        sheet.autoResizeColumns(1, rowData.length);
      } catch(e) {
        // Ignorar si falla el resize
      }

      if (lock.hasLock()) lock.releaseLock();
      return output("success", "El reporte de auditoría se guardó con éxito en la pestaña '" + sheetName + "'.");
    } 
    else if (method === 'PING') {
      if (lock.hasLock()) lock.releaseLock();
      return output("success", "Conexión exitosa con la hoja de Campañas.");
    }
    
    if (lock.hasLock()) lock.releaseLock();
    return output("error", "Método no soportado: " + method);

  } catch (error) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", "Error interno en Apps Script: " + error.toString());
  }
}

/**
 * Guarda una imagen en Base64 dentro de una carpeta en Google Drive y retorna su URL pública.
 */
function saveImageToDrive(base64, name) {
  if (!base64 || base64.length < 100 || base64.indexOf("http") === 0) {
    return base64 || "";
  }
  try {
    var folderName = "BQA_COMPROBANTES_CAMPANAS";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var mimeType = "image/jpeg";
    if (base64.indexOf(";") !== -1) {
      mimeType = base64.substring(5, base64.indexOf(';'));
    }
    
    var base64Data = base64;
    if (base64.indexOf(",") !== -1) {
      base64Data = base64.split(',')[1];
    }
    
    var bytes = Utilities.base64Decode(base64Data);
    var extension = (mimeType === 'application/pdf') ? '.pdf' : '.jpg';
    var blob = Utilities.newBlob(bytes, mimeType, name + "_" + Date.now() + extension);
    
    var file = folder.createFile(blob);
    // Compartir públicamente para que la app cliente de React pueda mostrar las imágenes directamente
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Error al guardar evidencia: " + e.toString();
  }
}

/**
 * Limpia y normaliza el ID de un Spreadsheet.
 */
function cleanId(idOrUrl) {
  if (!idOrUrl) return '';
  var id = idOrUrl.trim();
  var dMatch = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (dMatch && dMatch[1]) {
    return dMatch[1];
  }
  return id;
}

/**
 * Retorna salida estructurada en formato JSON para la aplicación web React.
 */
function output(status, message) {
  var response = {
    status: status,
    message: message,
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(response))
                       .setMimeType(ContentService.MimeType.JSON);
}
