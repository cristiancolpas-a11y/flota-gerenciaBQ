
/**
 * GOOGLE APPS SCRIPT - SISTEMA INTEGRAL BQA
 * Este archivo consolida Novedades, 5S, Kilometraje y Calibraciones.
 * IMPORTANTE: Borra cualquier otro archivo .gs que tenga declaraciones repetidas.
 */

// Declaración global única
var MONTHS_NAMES_GLOBAL = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYOR", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var FOLDER_NAME = "EVIDENCIAS_FLOTA_BQA";
  
  try {
    var request = JSON.parse(e.postData.contents);
    var data = request.data;
    var method = request.method;

    // --- 1. MANEJO DE KILOMETRAJES ---
    if (method === 'POST_MILEAGE') {
      var sheetMileage = ss.getSheetByName("KILOMETRAJE") || ss.insertSheet("KILOMETRAJE");
      if (sheetMileage.getLastRow() === 0) {
        sheetMileage.appendRow(["CD", "CONTRATISTA", "SEMANA", "FECHA", "PLACA", "KILOMETRAJE"]);
      }
      sheetMileage.appendRow([data.cd, data.contractor, data.weekNumber, data.date, data.plate, data.mileage]);
      return responseSuccess();
    }

    // --- 2. MANEJO DE CALIBRACIONES (MES, FECHA, SEMANA, PLACA, TALLER, EVIDENCIA) ---
    if (method === 'POST_CALIBRATION') {
      var sheetCal = ss.getSheetByName("CALIBRACIONES") || ss.insertSheet("CALIBRACIONES");
      if (sheetCal.getLastRow() === 0) {
        sheetCal.appendRow(["MES", "FECHA", "SEMANA", "PLACA", "TALLER", "EVIDENCIA"]);
      }
      
      var calDate = data.calibrationDate || new Date().toISOString().split('T')[0];
      var dateObj = new Date(calDate + "T12:00:00");
      if (isNaN(dateObj.getTime())) dateObj = new Date();

      var mes = MONTHS_NAMES_GLOBAL[dateObj.getMonth()];
      var semana = getWeekNumberGS(dateObj);
      
      var urlCert = (data.certificateUrl && data.certificateUrl.indexOf('data:image') === 0) 
        ? saveImageToDrive(data.certificateUrl, "CAL_" + data.plate + "_" + (data.taller || "GRL"), FOLDER_NAME) 
        : (data.certificateUrl || "");
      
      sheetCal.appendRow([mes, calDate, semana, data.plate, data.taller || "GENERAL", urlCert]);
      return responseSuccess();
    }

    // --- 3. MANEJO DE NOVEDADES ---
    if (method === 'POST_REPORT') {
      var sheetReport = ss.getSheetByName("REPORTE") || ss.insertSheet("REPORTE");
      if (sheetReport.getLastRow() === 0) {
        sheetReport.appendRow(["ID_Reporte", "Fecha", "Placa", "Fuente_Reporte", "Novedad", "Evidencia Inicial", "MAPA DE INGRESO TALLER", "Estado", "Evidencia en taller", "FECHA DE CIERRE", "Evidencia_Solucion", "MAPA DE SALIDA DE TALLER", "DIAS EN TALLER", "Comentarios_Cierre", "TALLER"]);
      }

      var rows = sheetReport.getDataRange().getValues();
      var rowIndex = -1;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toString() === data.id.toString()) { rowIndex = i + 1; break; }
      }

      var urlF = processImageField(data.initialEvidence, "INI_" + data.plate, FOLDER_NAME);
      var urlG = processImageField(data.entryMap, "MAPIN_" + data.plate, FOLDER_NAME);
      var urlI = processImageField(data.workshopEvidence, "TALLER_" + data.plate, FOLDER_NAME);
      var urlK = processImageField(data.solutionEvidence, "SOL_" + data.plate, FOLDER_NAME);
      var urlL = processImageField(data.exitMap, "MAPOUT_" + data.plate, FOLDER_NAME);

      if (rowIndex === -1) {
        sheetReport.appendRow([data.id, data.date, data.plate, data.source, data.novelty, urlF, urlG, "ABIERTO", "", "", "", "", "", "", data.workshop || ""]);
      } else {
        sheetReport.getRange(rowIndex, 8).setValue(data.status);
        if(urlI) sheetReport.getRange(rowIndex, 9).setValue(urlI);
        sheetReport.getRange(rowIndex, 10).setValue(data.closureDate);
        if(urlK) sheetReport.getRange(rowIndex, 11).setValue(urlK);
        if(urlL) sheetReport.getRange(rowIndex, 12).setValue(urlL);
        sheetReport.getRange(rowIndex, 13).setValue(data.daysInShop);
        sheetReport.getRange(rowIndex, 14).setValue(data.closureComments);
      }
      return responseSuccess();
    }

    // --- 4. MANEJO DE 5S ---
    if (method === 'POST_FIVES') {
      var sheetFiveS = ss.getSheetByName("5S CAMIONES") || ss.insertSheet("5S CAMIONES");
      if (sheetFiveS.getLastRow() === 0) {
        sheetFiveS.appendRow(["ID DE REPORTE", "FECHA", "MES", "SEMANA", "PLACA", "EVIDENCIA_INICIAL", "ESTADO", "EVIDENCIA_FINAL"]);
      }

      var rows = sheetFiveS.getDataRange().getValues();
      var rowIndex = -1;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toString() === data.id.toString()) { rowIndex = i + 1; break; }
      }

      var rawDate = data.date || new Date().toISOString().split('T')[0];
      var dateObj = new Date(rawDate + "T12:00:00");
      var mes = MONTHS_NAMES_GLOBAL[dateObj.getMonth()];
      var semana = getWeekNumberGS(dateObj);

      if (rowIndex === -1) {
        var urlIni = processImageField(data.evidenceUrl, "5S_INI_" + data.plate, FOLDER_NAME);
        sheetFiveS.appendRow([data.id, rawDate, mes, semana, data.plate, urlIni, "ABIERTO", ""]);
      } else {
        var urlSol = processImageField(data.closureEvidenceUrl, "5S_SOL_" + data.plate, FOLDER_NAME);
        sheetFiveS.getRange(rowIndex, 7).setValue("CERRADO"); 
        sheetFiveS.getRange(rowIndex, 8).setValue(urlSol);    
      }
      return responseSuccess();
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Funciones Auxiliares
function responseSuccess() {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
}

function processImageField(field, prefix, folder) {
  if (field && field.indexOf('data:image') === 0) {
    return saveImageToDrive(field, prefix + "_" + Date.now(), folder);
  }
  return field || "";
}

function getWeekNumberGS(d) {
  var target = new Date(d.valueOf());
  var dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  var firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() != 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function saveImageToDrive(base64Data, fileName, folderName) {
  try {
    var splitData = base64Data.split(',');
    var contentType = splitData[0].match(/:(.*?);/)[1];
    var byteCharacters = Utilities.base64Decode(splitData[1]);
    var blob = Utilities.newBlob(byteCharacters, contentType, fileName + ".jpg");
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "ERROR_IMAGE"; }
}
