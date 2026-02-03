
// SISTEMA GESTIÓN FLOTA BQA - BACKEND UNIFICADO
// REVISIÓN DEFINITIVA: INSERCIÓN ROBUSTA EN FILAS VACÍAS

var ID_HOJA = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
var MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function doPost(e) {
  var ss;
  try {
    ss = SpreadsheetApp.openById(ID_HOJA);
  } catch (err) {
    return output("error", "Error al abrir la hoja: " + err.toString());
  }
  
  try {
    var req = JSON.parse(e.postData.contents);
    var d = req.data;
    var m = req.method;
    var lock = LockService.getScriptLock();
    lock.waitLock(15000); // Esperar un poco más por seguridad

    if (m === 'POST_MILEAGE') {
      var s = getS(ss, "KILOMETRAJE");
      var placa = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      s.appendRow([d.cd || "G", d.contractor || "G", d.weekNumber || 0, d.date || today(), placa, d.mileage || 0]);
    } 
    
    else if (m === 'POST_CALIBRATION') {
      var s = getS(ss, "CALIBRACIONES");
      var dt = d.calibrationDate || today();
      var dObj = new Date(dt + "T12:00:00");
      if (isNaN(dObj.getTime())) dObj = new Date();
      
      var mes = MESES[dObj.getMonth()];
      var placa = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      var img = sImg(d.certificateUrl, "CAL_" + placa);
      
      // DATOS: [MES(A), FECHA(B), SEMANA(C), PLACA(D), TALLER(E), FOTO(F)]
      var rowData = [mes, dt, getW(dObj), placa, (d.taller || "GENERAL").toUpperCase(), img];
      
      // MEJORA: Buscar primera fila vacía basada en la columna D (PLACA)
      // para evitar saltos por culpa de fórmulas en la columna G
      var colD = s.getRange("D:D").getValues();
      var targetRow = 1;
      while (targetRow <= colD.length && colD[targetRow - 1][0] !== "") {
        targetRow++;
      }
      
      // Escribir los datos en la fila encontrada
      s.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    }

    else if (m === 'POST_REPORT') {
      var s = getS(ss, "REPORTE");
      var rows = s.getDataRange().getValues();
      var idx = -1;
      var tid = (d.id || "").toString();
      var placa = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toString() === tid) { idx = i + 1; break; }
      }
      
      if (idx === -1) {
        var uI = sImg(d.initialEvidence, "INI_" + placa);
        var uM = sImg(d.entryMap, "MAP_" + placa);
        s.appendRow([d.id, d.date, placa, d.source, d.novelty, uI, uM, "ABIERTO", "", "", "", "", "", "", (d.workshop || "").toUpperCase(), d.cd || "G"]);
      } else {
        if (d.status) s.getRange(idx, 8).setValue(d.status);
        if (d.workshopEvidence) s.getRange(idx, 9).setValue(sImg(d.workshopEvidence, "TALLER_" + placa));
        if (d.closureDate) s.getRange(idx, 10).setValue(d.closureDate);
        if (d.solutionEvidence) s.getRange(idx, 11).setValue(sImg(d.solutionEvidence, "SOL_" + placa));
        if (d.exitMap) s.getRange(idx, 12).setValue(sImg(d.exitMap, "EXIT_" + placa));
        if (d.daysInShop !== undefined) s.getRange(idx, 13).setValue(d.daysInShop);
        if (d.closureComments) s.getRange(idx, 14).setValue(d.closureComments);
      }
    }

    else if (m === 'POST_FIVES') {
      var s = getS(ss, "5S CAMIONES");
      var rows = s.getDataRange().getValues();
      var idx = -1;
      var tid = (d.id || "").toString();
      var placa = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toString() === tid) { idx = i + 1; break; }
      }
      
      if (idx === -1) {
        var u = sImg(d.evidenceUrl, "5S_" + placa);
        var dObj = new Date((d.date || today()) + "T12:00:00");
        s.appendRow([d.id, d.date, MESES[dObj.getMonth()], getW(dObj), placa, u, "ABIERTO", "", d.cd || "G"]);
      } else {
        var uS = sImg(d.closureEvidenceUrl, "5S_SOL_" + placa);
        s.getRange(idx, 7).setValue("CERRADO"); 
        if (uS) s.getRange(idx, 8).setValue(uS);    
      }
    }

    lock.releaseLock();
    return output("success", "Datos procesados correctamente.");
  } catch (e) {
    return output("error", "Error en procesamiento: " + e.toString());
  }
}

function getS(ss, n) {
  if (!ss) return null;
  var sheets = ss.getSheets();
  var nameClean = n.trim().toUpperCase();
  for(var i=0; i<sheets.length; i++){
    var sn = sheets[i].getName().trim().toUpperCase();
    if(sn === nameClean) return sheets[i];
  }
  return ss.insertSheet(n);
}

function sImg(b64, n) {
  if (!b64 || typeof b64 !== 'string' || b64.indexOf('data:image') !== 0) return b64 || "";
  try {
    var p = b64.split(',');
    var t = p[0].match(/:(.*?);/)[1];
    var bt = Utilities.base64Decode(p[1]);
    var bl = Utilities.newBlob(bt, t, n + ".jpg");
    var fds = DriveApp.getFoldersByName("EVIDENCIAS_FLOTA_BQA");
    var f = fds.hasNext() ? fds.next() : DriveApp.createFolder("EVIDENCIAS_FLOTA_BQA");
    var fl = f.createFile(bl);
    fl.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return fl.getUrl();
  } catch (e) { 
    return "DRIVE_ERROR: Revise permisos."; 
  }
}

function getW(d) {
  try {
    var t = new Date(d.valueOf());
    var day = (d.getDay() + 6) % 7;
    t.setDate(t.getDate() - day + 3);
    var f = t.valueOf();
    t.setMonth(0, 1);
    if (t.getDay() != 4) t.setMonth(0, 1 + ((4 - t.getDay()) + 7) % 7);
    return 1 + Math.ceil((f - t) / 604800000);
  } catch(e) { return 0; }
}

function today() { return new Date().toISOString().split('T')[0]; }

function output(s, m) {
  var res = {status: s, message: m};
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}
