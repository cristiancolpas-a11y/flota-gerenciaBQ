
// SISTEMA GESTIÓN FLOTA BQA - BACKEND UNIFICADO

var ID_HOJA = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
var ID_MAESTRO = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
var MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var req = JSON.parse(e.postData.contents);
    var d = req.data;
    var m = req.method;

    // LÓGICA COMPARENDOS MEJORADA CON ACTUALIZACIÓN DE SOPORTE Y PDF
    if (m === 'POST_FINE') {
      var ssC = SpreadsheetApp.openById("1WnzEFfVMTHZVVKWGTMLU2WjY-GIzSRpWz52i_Es0E1M"); 
      var s = getS(ssC, "COMPARENDOS");
      var placa = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      var img = sImg(d.evidenceUrl, "DOC_" + placa);
      
      if (d.updateMode === true) {
        var rows = s.getDataRange().getValues();
        var nComp = (d.infractionCode || "").toString();
        var foundIdx = -1;
        
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][11] && rows[i][11].toString() === nComp) {
            foundIdx = i + 1;
            break;
          }
        }
        
        if (foundIdx !== -1) {
          s.getRange(foundIdx, 8).setValue(img);
          lock.releaseLock();
          return output("success", "Soporte actualizado correctamente.");
        }
      }

      var dInf = new Date((d.date || today()) + "T12:00:00");
      var mes = MESES[dInf.getMonth()] || "GENERAL";
      var tieneSiNo = d.status === 'PENDIENTE' ? 'SI' : 'NO';

      s.appendRow([
        mes, today(), d.cd || "G", d.contractor || "G", d.driverName || "", d.driverId || "", d.driverPosition || "CONDUCTOR", img, tieneSiNo, d.paymentAgreement || "NO", d.amount, d.infractionCode, d.date, d.description, placa
      ]);
    }
    
    // ACTUALIZACIÓN DE DOCUMENTOS (SOAT, RTM, EXTINTOR)
    else if (m === 'POST_DOC_UPDATE') {
      var ssM = SpreadsheetApp.openById(ID_MAESTRO);
      var s = ssM.getSheets()[0]; 
      var rows = s.getDataRange().getValues();
      var placaBusqueda = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      var foundIdx = -1;
      
      for (var i = 0; i < rows.length; i++) {
        var placaFila = (rows[i][2] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (placaFila === placaBusqueda) {
          foundIdx = i + 1;
          break;
        }
      }
      
      if (foundIdx !== -1) {
        var imgUrl = sImg(d.url, d.type + "_" + placaBusqueda);
        var colIdx = -1;
        var dateColIdx = -1;
        
        if (d.type === 'SOAT') { colIdx = 21; dateColIdx = 4; }
        else if (d.type === 'RTM') { colIdx = 22; dateColIdx = 6; }
        else if (d.type === 'EXTINTOR') { colIdx = 24; dateColIdx = 10; }
        
        if (colIdx !== -1) {
          s.getRange(foundIdx, colIdx).setValue(imgUrl);
          if (d.expiryDate) s.getRange(foundIdx, dateColIdx).setValue(d.expiryDate);
        }
      }
    }
    // OTROS MÉTODOS (KM, LAVADOS, ETC)
    else {
      var ss = SpreadsheetApp.openById(ID_HOJA);
      
      if (m === 'POST_REPORT') {
        var s = getS(ss, "NOVEDADES");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][0] && rows[i][0].toString() === d.id.toString()) {
            foundIdx = i + 1;
            break;
          }
        }

        var rowData = [
          d.id, d.date, d.plate, d.source, d.initialEvidence || "", d.novelty, d.entryMap || "", d.status, 
          d.workshopEvidence || "", d.closureDate || "", d.solutionEvidence || "", d.exitMap || "", 
          d.daysInShop || 0, d.closureComments || "", d.workshop || "", d.cd || "GENERAL"
        ];

        if (foundIdx !== -1) {
          s.getRange(foundIdx, 1, 1, rowData.length).setValues([rowData]);
        } else {
          s.appendRow(rowData);
        }
      }
      else if (m === 'POST_WORKSHOP_VISIT_UPDATE') {
        var s = getS(ss, "VISITAS A TALLER");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var searchId = (d.id || "").toString();
        
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][7] && rows[i][7].toString() === searchId) {
            foundIdx = i + 1;
            break;
          }
        }
        
        if (foundIdx !== -1) {
          s.getRange(foundIdx, 4).setValue(d.workshop);
          s.getRange(foundIdx, 5).setValue(d.visitDate);
          var imgUrl = sImg(d.evidence, "VISITA_" + d.plate);
          s.getRange(foundIdx, 6).setValue(imgUrl);
          s.getRange(foundIdx, 7).setValue(d.status);
        }
      }
      else if (m === 'POST_MILEAGE') {
        var s = getS(ss, "KILOMETRAJE");
        s.appendRow([d.cd, d.contractor, d.week, d.date, d.plate, d.mileage]);
      }
      else if (m === 'POST_FIVES') {
        var s = getS(ss, "5S CAMIONES");
        s.appendRow([d.id, d.date, "", d.week, d.plate, d.evidenceUrl, d.status]);
      }
      else if (m === 'POST_WASH') {
        var s = getS(ss, "LAVADOS");
        s.appendRow([d.id, d.month, d.week, d.date, d.plate, d.evidenceUrl, d.mapUrl, d.workshop]);
      }
      else if (m === 'POST_CALIBRATION') {
        var s = getS(ss, "CALIBRACIONES");
        s.appendRow([d.id, d.calibrationDate, "", d.plate, d.equipment, d.certificateUrl]);
      }
    }

    lock.releaseLock();
    return output("success", "Datos procesados correctamente.");
  } catch (e) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", "Error en procesamiento: " + e.toString());
  }
}

/**
 * Guarda archivo (Imagen o PDF) en Drive y retorna URL
 */
function sImg(base64, name) {
  if (!base64 || base64.length < 100) return base64;
  try {
    var folderName = "BQA_COMPROBANTES_FLOTA";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var mimeType = base64.substring(5, base64.indexOf(';'));
    var extension = mimeType === 'application/pdf' ? '.pdf' : '.jpg';
    
    var bytes = Utilities.base64Decode(base64.split(',')[1]);
    var blob = Utilities.newBlob(bytes, mimeType, name + "_" + Date.now() + extension);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (e) { return "Error Archivo"; }
}

function getS(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  return s;
}

function today() {
  return Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd");
}

function output(status, message) {
  return ContentService.createTextOutput(JSON.stringify({status: status, message: message}))
    .setMimeType(ContentService.MimeType.JSON);
}
