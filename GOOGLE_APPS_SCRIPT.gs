
/**
 * GOOGLE APPS SCRIPT - SISTEMA DE GESTIÓN DE FLOTA BQA
 * Estructura de 8 Columnas para 5S CAMIONES (Optimizada)
 */

const MONTHS_NAMES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var FOLDER_NAME = "EVIDENCIAS_FLOTA_BQA";
  
  try {
    var request = JSON.parse(e.postData.contents);
    var data = request.data;
    var method = request.method;

    // --- MANEJO DE KILOMETRAJES ---
    if (method === 'POST_MILEAGE') {
      var sheetMileage = ss.getSheetByName("KILOMETRAJE");
      if (!sheetMileage) {
        sheetMileage = ss.insertSheet("KILOMETRAJE");
        sheetMileage.appendRow(["CD", "CONTRATISTA", "SEMANA", "FECHA", "PLACA", "KILOMETRAJE"]);
      }
      sheetMileage.appendRow([data.cd, data.contractor, data.weekNumber, data.date, data.plate, data.mileage]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- MANEJO DE REPORTES DE NOVEDADES ---
    if (method === 'POST_REPORT') {
      var sheetReport = ss.getSheetByName("REPORTE");
      if (!sheetReport) {
        sheetReport = ss.insertSheet("REPORTE");
        sheetReport.appendRow(["ID_Reporte", "Fecha", "Placa", "Fuente_Reporte", "Novedad", "Evidencia Inicial", "MAPA DE INGRESO TALLER", "Estado", "Evidencia en taller", "FECHA DE CIERRE", "Evidencia_Solucion", "MAPA DE SALIDA DE TALLER", "DIAS EN TALLER", "Comentarios_Cierre", "TALLER"]);
      }

      var rows = sheetReport.getDataRange().getValues();
      var rowIndex = -1;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toString() === data.id.toString()) { rowIndex = i + 1; break; }
      }

      var urlF = (data.initialEvidence && data.initialEvidence.indexOf('data:image') === 0) ? saveImageToDrive(data.initialEvidence, "INI_" + data.plate + "_" + data.id, FOLDER_NAME) : (data.initialEvidence || "");
      var urlG = (data.entryMap && data.entryMap.indexOf('data:image') === 0) ? saveImageToDrive(data.entryMap, "MAPIN_" + data.plate + "_" + data.id, FOLDER_NAME) : (data.entryMap || "");
      var urlI = (data.workshopEvidence && data.workshopEvidence.indexOf('data:image') === 0) ? saveImageToDrive(data.workshopEvidence, "TALLER_" + data.plate + "_" + data.id, FOLDER_NAME) : (data.workshopEvidence || "");
      var urlK = (data.solutionEvidence && data.solutionEvidence.indexOf('data:image') === 0) ? saveImageToDrive(data.solutionEvidence, "SOL_" + data.plate + "_" + data.id, FOLDER_NAME) : (data.solutionEvidence || "");
      var urlL = (data.exitMap && data.exitMap.indexOf('data:image') === 0) ? saveImageToDrive(data.exitMap, "MAPOUT_" + data.plate + "_" + data.id, FOLDER_NAME) : (data.exitMap || "");

      if (rowIndex === -1) {
        sheetReport.appendRow([data.id, data.date, data.plate, data.source, data.novelty, urlF, urlG, "ABIERTO", "", "", "", "", "", "", data.workshop || ""]);
      } else {
        sheetReport.getRange(rowIndex, 8).setValue(data.status);
        sheetReport.getRange(rowIndex, 9).setValue(urlI);
        sheetReport.getRange(rowIndex, 10).setValue(data.closureDate);
        sheetReport.getRange(rowIndex, 11).setValue(urlK);
        sheetReport.getRange(rowIndex, 12).setValue(urlL);
        sheetReport.getRange(rowIndex, 13).setValue(data.daysInShop);
        sheetReport.getRange(rowIndex, 14).setValue(data.closureComments);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- MANEJO DE REPORTES 5S ---
    if (method === 'POST_FIVES') {
      var sheetFiveS = ss.getSheetByName("5S CAMIONES");
      if (!sheetFiveS) {
        sheetFiveS = ss.insertSheet("5S CAMIONES");
        sheetFiveS.appendRow(["ID DE REPORTE", "FECHA", "MES", "SEMANA", "PLACA", "EVIDENCIA_INICIAL", "ESTADO", "EVIDENCIA_FINAL"]);
      }

      var rows = sheetFiveS.getDataRange().getValues();
      var rowIndex = -1;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toString() === data.id.toString()) { rowIndex = i + 1; break; }
      }

      // Procesamiento de Fechas con validación de nulidad
      var rawDate = data.date ? data.date : new Date().toISOString().split('T')[0];
      var dateObj = new Date(rawDate + "T12:00:00");
      if (isNaN(dateObj.getTime())) dateObj = new Date(); // Fallback por si la fecha es inválida

      var mes = MONTHS_NAMES[dateObj.getMonth()];
      var semana = getWeekNumberGS(dateObj);

      if (rowIndex === -1) {
        // Registro de Hallazgo (Abrir) - Estructura de 8 columnas
        var urlIni = (data.evidenceUrl && data.evidenceUrl.indexOf('data:image') === 0) ? saveImageToDrive(data.evidenceUrl, "5S_INI_" + data.plate + "_" + data.id, FOLDER_NAME) : (data.evidenceUrl || "");
        
        sheetFiveS.appendRow([
          data.id,        // 0: ID DE REPORTE
          rawDate,        // 1: FECHA
          mes,            // 2: MES
          semana,         // 3: SEMANA
          data.plate,     // 4: PLACA
          urlIni,         // 5: EVIDENCIA_INICIAL
          "ABIERTO",      // 6: ESTADO
          ""              // 7: EVIDENCIA_FINAL
        ]);
      } else {
        // Registro de Solución (Cerrar)
        var urlSol = (data.closureEvidenceUrl && data.closureEvidenceUrl.indexOf('data:image') === 0) ? saveImageToDrive(data.closureEvidenceUrl, "5S_SOL_" + data.plate + "_" + data.id, FOLDER_NAME) : (data.closureEvidenceUrl || "");
        
        // En Google Sheets, las columnas son 1-based (A=1, B=2...)
        // Índice 6 (Col G) es ESTADO (7ma columna)
        // Índice 7 (Col H) es EVIDENCIA_FINAL (8va columna)
        sheetFiveS.getRange(rowIndex, 7).setValue("CERRADO"); 
        sheetFiveS.getRange(rowIndex, 8).setValue(urlSol);    
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Función robusta para obtener número de semana
 */
function getWeekNumberGS(d) {
  // Validación para evitar error "getFullYear" si d es undefined o nulo
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
    d = new Date();
  }
  
  var target = new Date(d.valueOf());
  var dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  var firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() != 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function saveImageToDrive(base64Data, fileName, folderName) {
  try {
    var splitData = base64Data.split(',');
    var contentType = splitData[0].match(/:(.*?);/)[1];
    var byteCharacters = Utilities.base64Decode(splitData[1]);
    var blob = Utilities.newBlob(byteCharacters, contentType, fileName + ".jpg");
    var folder;
    var folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) { folder = folders.next(); } else { folder = DriveApp.createFolder(folderName); }
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "ERROR"; }
}
