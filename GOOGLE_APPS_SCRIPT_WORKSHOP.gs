// SCRIPT INDEPENDIENTE PARA HOJA DE TALLERES
// ID: 1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo

var ID_HOJA = '1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo';

function log(msg) {
  try {
    var ss = SpreadsheetApp.openById(ID_HOJA);
    var s = getS(ss, "LOGS");
    s.appendRow([new Date(), msg]);
  } catch(e) {
    console.error("Error en log: " + e.toString());
  }
}

function doGet(e) {
  var m = e.parameter.method;
  var sheetName = e.parameter.sheetName;
  var docId = e.parameter.docId || ID_HOJA;
  
  if (m === 'GET_DATA') {
    try {
      var ss = SpreadsheetApp.openById(docId);
      var s = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!s) return output("error", "Hoja no encontrada");
      var values = s.getDataRange().getDisplayValues();
      return output("success", values);
    } catch(e) {
      return output("error", e.toString());
    }
  }
  return output("success", "Script de Talleres Operativo");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    if (!e.postData.contents) return output("error", "No hay datos en el cuerpo del POST");
    
    var req = JSON.parse(e.postData.contents);
    var d = req.data;
    var m = req.method;
    
    log("Ejecutando Método: " + m + " - Placa: " + ((d && d.plate) || "N/A"));

    if (m === 'GET_DATA') {
      var docId = (d && d.docId) || ID_HOJA;
      var ss = SpreadsheetApp.openById(docId);
      var s = (d && d.sheetName) ? ss.getSheetByName(d.sheetName) : ss.getSheets()[0];
      if (!s) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Hoja no encontrada");
      }
      var values = s.getDataRange().getDisplayValues();
      if (lock.hasLock()) lock.releaseLock();
      return output("success", values);
    }

    if (m === 'POST_WORKSHOP_RECORD') {
      var ss = SpreadsheetApp.openById(ID_HOJA);
      var s = getS(ss, "TALLERES");
      
      // Procesar imágenes (se guardan en Drive y devuelven URL)
      var ev1Url = sImg(d.evidence1Url, "EV1_" + d.plate);
      var ev2Url = sImg(d.evidence2Url, "EV2_" + d.plate);
      
      s.appendRow([
        d.month,
        d.week,
        d.date,
        d.plate,
        d.status,
        d.novelty,
        ev1Url,
        ev2Url,
        d.workshopName,
        new Date() // Fecha de registro del sistema
      ]);
      
      lock.releaseLock();
      return output("success", "Registro guardado correctamente en Talleres.");
    }

    lock.releaseLock();
    return output("error", "Método no soportado en este script: " + m);
  } catch (e) {
    if (lock.hasLock()) lock.releaseLock();
    log("ERROR CRÍTICO: " + e.toString());
    return output("error", e.toString());
  }
}

// Función para procesar Base64 a Drive
function sImg(base64, name) {
  if (!base64 || base64.length < 100 || base64.startsWith("http")) return base64;
  try {
    var folderName = "BQA_EVIDENCIAS_TALLERES";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var mimeType = base64.substring(5, base64.indexOf(';'));
    var bytes = Utilities.base64Decode(base64.split(',')[1]);
    var extension = mimeType === 'application/pdf' ? '.pdf' : '.jpg';
    var blob = Utilities.newBlob(bytes, mimeType, name + "_" + Date.now() + extension);
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { 
    log("Error guardando imagen: " + e.toString());
    return "Error Archivo"; 
  }
}

function getS(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  return s;
}

function output(status, message) {
  return ContentService.createTextOutput(JSON.stringify({status: status, message: message}))
    .setMimeType(ContentService.MimeType.JSON);
}
