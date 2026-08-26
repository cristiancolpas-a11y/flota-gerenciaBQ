// SISTEMA GESTIÓN FLOTA BQA - BACKEND UNIFICADO

// ⚠️ ASEGÚRATE DE QUE ESTE ID SEA EL DE TU HOJA DE CÁLCULO ACTUAL
var DEFAULT_FALLBACK_ID = '1lRQGdS6aNJnDCPpkieWj-EEb3RAbp1-zY7uWVt-7UQU';
var ID_HOJA = (function() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss ? ss.getId() : DEFAULT_FALLBACK_ID;
  } catch(e) {
    return DEFAULT_FALLBACK_ID;
  }
})();
var ID_MAESTRO = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
var MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function cleanId(id) {
  if (!id) return '';
  id = id.toString().trim();

  var dMatch = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  var editMatch = id.match(/^([a-zA-Z0-9-_]+)\/edit/);
  if (editMatch && editMatch[1]) return editMatch[1];

  id = id.split('?')[0].split('#')[0];
  if (id.charAt(id.length - 1) === '/') {
    id = id.substring(0, id.length - 1);
  }

  if (id.indexOf('/') !== -1) {
    var parts = id.split('/');
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].length >= 25 && /^[a-zA-Z0-9-_]+$/.test(parts[i])) {
        return parts[i];
      }
    }
    return parts[parts.length - 1];
  }

  return id;
}

// Helper global: devuelve el primer valor no vacío
function pickVal() {
  for (var i = 0; i < arguments.length; i++) {
    var v = arguments[i];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

function log(msg, customDocId) {
  try {
    var targetId = cleanId(customDocId || ID_HOJA);
    if (!targetId) return;
    var ss = SpreadsheetApp.openById(targetId);
    if (!ss) return;
    var s = getS(ss, "LOGS");
    if (s) s.appendRow([new Date(), msg]);
  } catch(e) {}
}

function doGet(e) {
  var m = e.parameter.method;
  var sheetName = e.parameter.sheetName;
  var docId = cleanId(e.parameter.docId || ID_HOJA);

  if (m === 'GET_DATA') {
    try {
      var ss = SpreadsheetApp.openById(docId);
      var s = sheetName ? (findSheetCaseInsensitive(ss, sheetName) || ss.getSheetByName(sheetName)) : ss.getSheets()[0];
      if (!s) return output("error", "Hoja no encontrada");
      var values = s.getDataRange().getDisplayValues();
      return output("success", values);
    } catch(e) {
      return output("error", e.toString());
    }
  }
  return output("error", "Metodo no soportado");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    if (!e.postData.contents) return output("error", "No hay datos en el postBody");

    var req = JSON.parse(e.postData.contents);
    var d = req.data || {};
    var m = req.method;

    var docId = cleanId((d && d.docId) || ID_HOJA);

    log("Method: " + m + " - Data: " + JSON.stringify(d).substring(0, 500), docId);

    var ss = null;
    try {
      if (docId) {
        ss = SpreadsheetApp.openById(docId);
      }
    } catch (err) {
      log("Error opening spreadsheet in doPost: " + err.toString(), docId);
    }

    if (m === 'GET_DATA') {
      if (!ss) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se pudo abrir el documento (ID: " + docId + ").");
      }
      var s = d.sheetName ? (findSheetCaseInsensitive(ss, d.sheetName) || ss.getSheetByName(d.sheetName)) : ss.getSheets()[0];
      if (!s) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Hoja no encontrada");
      }
      var values = s.getDataRange().getDisplayValues();
      if (lock.hasLock()) lock.releaseLock();
      return output("success", values);
    }

    if (m === 'POST_FINE') {
      var targetDocId = cleanId(d.docId || ID_HOJA);
      var ssC = SpreadsheetApp.openById(targetDocId);
      var s = findSheetCaseInsensitive(ssC, "MULTAS") || ssC.getSheetByName("MULTAS") || ssC.getSheets()[0];
      var placa = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      var img = sImg(d.evidenceUrl, "SOPORTE_" + placa);

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
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Soporte vinculado.");
        }
      }

      var dInf = new Date((d.date || today()) + "T12:00:00");
      var mes = MESES[dInf.getMonth()] || "GENERAL";
      s.appendRow([mes, today(), d.cd || "G", d.contractor || "G", d.driverName || "", d.driverId || "", d.driverPosition || "CONDUCTOR", img, d.status === 'PENDIENTE' ? 'SI' : 'NO', d.paymentAgreement || "NO", d.amount, d.infractionCode, d.date, d.description, placa]);
    }

    else if (m === 'POST_DOC_UPDATE') {
      var targetDocId = cleanId(d.docId || ID_HOJA);
      var ssM = SpreadsheetApp.openById(targetDocId);
      var s = getSheetByGid(ssM, "1506825194") || findSheetCaseInsensitive(ssM, "CONTROL DE DOCUMENTOS") || ssM.getSheetByName("CONTROL DE DOCUMENTOS") || ssM.getSheets()[0];
      var rows = s.getDataRange().getValues();
      var placaBusqueda = (d.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      var foundIdx = -1;
      for (var i = 0; i < rows.length; i++) {
        if ((rows[i][2] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "") === placaBusqueda) {
          foundIdx = i + 1;
          break;
        }
      }
      if (foundIdx !== -1) {
        var imgUrl = sImg(d.url, d.type + "_" + placaBusqueda);
        var colIdx = d.type === 'SOAT' ? 21 : d.type === 'RTM' ? 22 : d.type === 'EXTINTOR' ? 24 : -1;
        var dateColIdx = d.type === 'SOAT' ? 4 : d.type === 'RTM' ? 6 : d.type === 'EXTINTOR' ? 10 : -1;
        if (colIdx !== -1) {
          s.getRange(foundIdx, colIdx).setValue(imgUrl);
          if (d.expiryDate) s.getRange(foundIdx, dateColIdx).setValue(d.expiryDate);
        }
      }
    }
    else {
      if (!ss) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se pudo abrir el documento de Google Sheets. Verifica el ID y los permisos (ID intentado: " + docId + ").");
      }

      if (m === 'POST_REPORT') {
        var s = findSheetCaseInsensitive(ss, "NOVEDADES") || getSheetByGid(ss, "1789987673") || getS(ss, "NOVEDADES");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var existingRow = null;

        var targetId = (d && d.id !== undefined && d.id !== null) ? d.id.toString().trim() : "";

        if (targetId) {
          for (var i = 1; i < rows.length; i++) {
            if (rows[i][0] && rows[i][0].toString().trim() === targetId) {
              foundIdx = i + 1;
              existingRow = rows[i];
              break;
            }
          }
        }

        var plateName = (d && d.plate) ? d.plate.toString().trim() : "PLACA";
        var imgIni = sImg(d.initialEvidence, "NOV_INI_" + plateName);
        var imgWork = sImg(d.workshopEvidence, "NOV_TALLER_" + plateName);
        var imgSol = sImg(d.solutionEvidence, "NOV_SOL_" + plateName);
        var imgMapEntry = sImg(d.entryMap, "MAPA_ENTRADA_" + plateName);
        var imgMapExit = sImg(d.exitMap, "MAPA_SALIDA_" + plateName);

        if (existingRow) {
          if (!imgIni && existingRow[7]) imgIni = existingRow[7];
          if (!imgMapEntry && existingRow[10]) imgMapEntry = existingRow[10];
          if (!imgWork && existingRow[12]) imgWork = existingRow[12];
          if (!imgSol && existingRow[14]) imgSol = existingRow[14];
          if (!imgMapExit && existingRow[15]) imgMapExit = existingRow[15];
        }

        var safeStr = function(v) {
          if (v === undefined || v === null) return "";
          return v.toString();
        };

        var rowData = [
          safeStr(d.id),
          safeStr(d.date),
          safeStr(d.cd) || "GENERAL",
          safeStr(d.contractor) || "GENERAL",
          safeStr(d.plate).toUpperCase(),
          safeStr(d.source),
          safeStr(d.workshopDate),
          safeStr(imgIni),
          safeStr(d.novelty),
          Number(d.daysToAttend) || 0,
          safeStr(imgMapEntry),
          safeStr(d.status) || "PENDIENTES",
          safeStr(imgWork),
          safeStr(d.closureDate),
          safeStr(imgSol),
          safeStr(imgMapExit),
          Number(d.daysInShop) || 0,
          safeStr(d.closureComments),
          safeStr(d.workshop)
        ];

        if (foundIdx !== -1) {
          s.getRange(foundIdx, 1, 1, rowData.length).setValues([rowData]);
        } else {
          s.appendRow(rowData);
        }

        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Novedad registrada exitosamente.");
      }
      else if (m === 'POST_WORKSHOP_RECORD') {
        var s = getS(ss, "TALLERES");
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
          new Date()
        ]);
      }
      else if (m === 'POST_WORKSHOP_VISIT_UPDATE') {
        var s = getSheetByGid(ss, "239875479") || getS(ss, "VISITAS A TALLER");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;

        var searchId = (d.id || "").toString().trim();
        var searchPlate = (d.plate || "").toString().toUpperCase().trim();
        var searchProgDate = (d.progDate || "").toString().trim();

        for (var i = 1; i < rows.length; i++) {
          var rowHash = (rows[i][7] || "").toString().trim();
          var rowPlate = (rows[i][2] || "").toString().toUpperCase().trim();
          var rowDateRaw = rows[i][1];
          var rowDateStr = "";

          if (rowDateRaw instanceof Date) {
            rowDateStr = Utilities.formatDate(rowDateRaw, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
          } else if (rowDateRaw) {
            rowDateStr = rowDateRaw.toString();
          }

          if (searchId && searchId.indexOf("vprog-") !== 0 && rowHash === searchId) {
            foundIdx = i + 1;
            break;
          }

          if (rowPlate === searchPlate && rowDateStr.indexOf(searchProgDate) !== -1) {
            foundIdx = i + 1;
            break;
          }
        }

        if (foundIdx !== -1) {
          s.getRange(foundIdx, 4).setValue(d.workshop);
          s.getRange(foundIdx, 5).setValue(d.visitDate);
          s.getRange(foundIdx, 6).setValue(sImg(d.evidence, "VISITA_" + d.plate));
          s.getRange(foundIdx, 7).setValue(d.status);

          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Visita actualizada en fila " + foundIdx);
        } else {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró el registro para " + searchPlate + " en " + searchProgDate);
        }
      }
      else if (m === 'POST_PREVENTIVE_UPDATE') {
        var s = getSheetByGid(ss, "2086109634") || getS(ss, "PREVENTIVO");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][5] || "").toString().toUpperCase().trim();
          if (rowPlate === plateSearch) {
            foundIdx = i + 1;
            break;
          }
        }

        if (foundIdx !== -1) {
          var imgUrls = [];
          if (Array.isArray(d.evidence)) {
            for (var j = 0; j < d.evidence.length; j++) {
              var url = sImg(d.evidence[j], "PREV_" + plateSearch + "_" + (j+1));
              if (url) imgUrls.push(url);
            }
          } else if (d.evidence) {
            var singleUrl = sImg(d.evidence, "PREV_" + plateSearch);
            if (singleUrl) imgUrls.push(singleUrl);
          }
          var img = imgUrls.join(", ");

          s.getRange(foundIdx, 19).setValue(img); // EVIDENCIA (Columna S)
        }
      }
      else if (m === 'POST_CORRECTIVE_UPDATE') {
        var targetDocId = cleanId(d.docId || ID_HOJA);
        var ssProg = SpreadsheetApp.openById(targetDocId);
        var s = findSheetCaseInsensitive(ssProg, "PROGRAMACIÓN") || ssProg.getSheetByName("PROGRAMACIÓN") || ssProg.getSheetByName("PROGRAMCION") || ssProg.getSheets()[0];
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();
        var dateSearch = (d.date || "").toString().trim();

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][3] || "").toString().toUpperCase().trim();
          if (rowPlate !== plateSearch) continue;

          var rowDateRaw = rows[i][0];
          var rowDateStr = "";

          if (rowDateRaw instanceof Date) {
            rowDateStr = Utilities.formatDate(rowDateRaw, ssProg.getSpreadsheetTimeZone(), "yyyy-MM-dd");
          } else if (rowDateRaw) {
            rowDateStr = rowDateRaw.toString();
            if (rowDateStr.indexOf('/') !== -1) {
              var p = rowDateStr.split('/');
              if (p.length === 3) {
                if (p[2].length === 4) rowDateStr = p[2] + "-" + ("0" + p[1]).slice(-2) + "-" + ("0" + p[0]).slice(-2);
                else if (p[0].length === 4) rowDateStr = p[0] + "-" + ("0" + p[1]).slice(-2) + "-" + ("0" + p[2]).slice(-2);
              }
            }
          }

          if (rowDateStr.indexOf(dateSearch) !== -1) {
            foundIdx = i + 1;
            break;
          }
        }

        if (foundIdx !== -1) {
          var img1 = sImg(d.evidence1, "CORR_EV1_" + plateSearch);
          var img2 = sImg(d.evidence2, "CORR_EV2_" + plateSearch);
          var img3 = sImg(d.evidence3, "CORR_EV3_" + plateSearch);

          if (img1) s.getRange(foundIdx, 10).setValue(img1);
          if (img2) s.getRange(foundIdx, 11).setValue(img2);
          if (img3) s.getRange(foundIdx, 12).setValue(img3);
          if (d.evidence4) {
            var img4 = sImg(d.evidence4, "CORR_EV4_" + plateSearch);
            if (img4) s.getRange(foundIdx, 13).setValue(img4);
          }

          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Evidencias registradas en fila " + foundIdx);
        } else {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró la programación para " + plateSearch + " en " + dateSearch);
        }
      }
      else if (m === 'POST_ROUTINE' || m === 'POSTROUTINE' || m === 'POST_RUTINA' || m === 'POSTRUTINA') {
        var targetDocId = cleanId(d.docId || ID_HOJA || DEFAULT_FALLBACK_ID);
        var targetSS = null;
        if (targetDocId) {
          try { targetSS = SpreadsheetApp.openById(targetDocId); } catch(e) {}
        }
        if (!targetSS) {
          try { targetSS = ss; } catch(e) {}
        }
        if (!targetSS) {
          try { targetSS = SpreadsheetApp.getActiveSpreadsheet(); } catch(e) {}
        }

        if (!targetSS) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se pudo abrir la hoja de cálculo (ID: " + targetDocId + ")");
        }

        var sheetName = "";
        var rowData = [];

        var imgEvidence = sImg(d.evidenceUrl, "ROUTINE_EV_" + d.plate);
        var imgSignature = sImg(d.signatureUrl, "ROUTINE_SIG_" + d.plate);

        var responsesMap = {};
        if (d.responses && Array.isArray(d.responses)) {
          for (var i = 0; i < d.responses.length; i++) {
            var resp = d.responses[i];
            responsesMap[resp.itemId] = resp.status;
          }
        }

        var tid = (d.templateId || "").toString().toLowerCase().trim();

        if (tid === 'rutina_4' || tid === 'rutina 4' || tid === 'r4') {
          sheetName = "RUTINA 4";

          var detailFailures = "";
          if (d.responses && Array.isArray(d.responses)) {
            var fails = [];
            for (var i = 0; i < d.responses.length; i++) {
              var resp = d.responses[i];
              if (resp.status === 'FAIL') {
                fails.push(resp.itemId.replace('r4_c_', '').replace('r4_e_', '').replace('r4_a_', '').replace('r4_l_', '').replace('r4_t_', '').replace('r4_i_', '').toUpperCase());
              }
            }
            detailFailures = fails.join(", ");
          }

          rowData = [
            d.id,
            d.date,
            d.cd || "",
            d.plate,
            d.templateName || "Rutina 4",
            d.frequency || "5.000 km",
            d.taller || d.driverName || "",
            d.mileage || "",
            (d.score !== undefined ? d.score + "%" : "0%"),
            (d.hasFailures ? "SI" : "NO"),
            detailFailures,
            imgEvidence || "",
            imgSignature || "",
            d.notes || "",

            responsesMap['r4_c_aceite_motor'] || "NA",
            responsesMap['r4_c_filtro_aceite'] || "NA",
            responsesMap['r4_c_filtro_aire_secundario'] || "NA",
            responsesMap['r4_c_filtro_aceite_hidraulico'] || "NA",
            responsesMap['r4_c_filtro_transmision'] || "NA",
            responsesMap['r4_c_aceite_direccion'] || "NA",
            responsesMap['r4_c_correas_motor'] || "NA",
            responsesMap['r4_c_liquido_refrigerante'] || "NA",
            responsesMap['r4_c_filtro_aire_primario'] || "NA",
            responsesMap['r4_c_filtro_combustible_primario'] || "NA",
            responsesMap['r4_c_filtro_combustible_secundario'] || "NA",
            responsesMap['r4_c_aceite_diferencial'] || "NA",
            responsesMap['r4_c_aceite_caja_velocidades'] || "NA",
            responsesMap['r4_c_filtro_aire_compresor'] || "NA",
            responsesMap['r4_e_general_suspension'] || "NA",
            responsesMap['r4_e_articulaciones'] || "NA",
            responsesMap['r4_e_rodamientos_delanteros'] || "NA",
            responsesMap['r4_a_direccion'] || "NA",
            responsesMap['r4_l_agua_bateria'] || "NA",
            responsesMap['r4_l_refrigerante_limpiaparabrisas'] || "NA",
            responsesMap['r4_l_aceites'] || "NA",
            responsesMap['r4_t_frenos'] || "NA",
            responsesMap['r4_t_correas_motor'] || "NA",
            responsesMap['r4_t_embrague'] || "NA",
            responsesMap['r4_i_luces'] || "NA",
            responsesMap['r4_i_luces_tablero'] || "NA",
            responsesMap['r4_i_tuberias_mangueras_refrigeracion'] || "NA",
            responsesMap['r4_i_tuberias_mangueras_aceite'] || "NA",
            responsesMap['r4_i_sistema_admision_escape'] || "NA",
            responsesMap['r4_i_terminales_rotulas'] || "NA",
            responsesMap['r4_i_fugas'] || "NA",
            responsesMap['r4_i_suspension'] || "NA",
            responsesMap['r4_i_marcha_minima'] || "NA",
            responsesMap['r4_i_presion_llantas'] || "NA",
            responsesMap['r4_i_rotar_llantas'] || "NA",
            responsesMap['r4_i_freno_motor'] || "NA",
            responsesMap['r4_i_varillaje_direccion'] || "NA"
          ];
        }
        else if (tid === 'rutina_3' || tid === 'rutina 3' || tid === 'r3') {
          sheetName = "RUTINA 3";

          rowData = [
            d.id,
            d.date,
            d.plate,
            d.taller || d.driverName || "",
            d.cd || "",
            d.contractor || "",
            d.frequency || "5.000 km",
            d.mileage || "",
            (d.score !== undefined ? d.score + "%" : "0%"),
            (d.hasFailures ? "SI" : "NO"),
            d.notes || "",
            imgSignature || "",
            imgEvidence || "",

            responsesMap['r3_c_aceite_motor'] || "NA",
            responsesMap['r3_c_filtro_aceite'] || "NA",
            responsesMap['r3_c_filtro_primario'] || "NA",
            responsesMap['r3_c_filtro_secundario'] || "NA",
            responsesMap['r3_i_filtro_aire'] || "NA",
            responsesMap['r3_e_suspension'] || "NA",
            responsesMap['r3_e_articulaciones'] || "NA",
            responsesMap['r3_l_agua_bateria'] || "NA",
            responsesMap['r3_l_refrigerante'] || "NA",
            responsesMap['r3_l_aceites_direccion'] || "NA",
            responsesMap['r3_t_frenos'] || "NA",
            responsesMap['r3_t_correas'] || "NA",
            responsesMap['r3_t_embrague'] || "NA",
            responsesMap['r3_i_luces'] || "NA",
            responsesMap['r3_i_luces_tablero'] || "NA",
            responsesMap['r3_i_mangueras_ref'] || "NA",
            responsesMap['r3_i_mangueras_aceite'] || "NA",
            responsesMap['r3_i_terminales_rotulas'] || "NA",
            responsesMap['r3_i_suspension'] || "NA",
            responsesMap['r3_i_admision_escape'] || "NA",
            responsesMap['r3_i_fugas'] || "NA",
            responsesMap['r3_i_marcha_minima'] || "NA",
            responsesMap['r3_i_direccion'] || "NA",
            responsesMap['r3_i_freno_motor'] || "NA",
            responsesMap['r3_i_varillaje_direccion'] || "NA",
            responsesMap['r3_i_sistema_combustible'] || "NA"
          ];
        }
        else if (tid === 'rutina_2' || tid === 'rutina 2' || tid === 'r2') {
          sheetName = "RUTINA 2";

          rowData = [
            d.id,
            d.date,
            d.cd || "",
            d.plate,
            d.templateName || "Rutina 2",
            d.frequency || "5.000 km",
            d.mileage || "",
            d.taller || d.driverName || "",
            d.contractor || "",

            responsesMap['r2_c_aceite_motor'] || "NA",
            responsesMap['r2_c_filtro_aceite'] || "NA",
            responsesMap['r2_c_filtro_primario'] || "NA",
            responsesMap['r2_c_filtro_secundario'] || "NA",
            responsesMap['r2_c_filtro_aire_primario'] || "NA",
            responsesMap['r2_e_suspension_rodamientos'] || "NA",
            responsesMap['r2_e_articulaciones'] || "NA",
            responsesMap['r2_l_agua_bateria'] || "NA",
            responsesMap['r2_l_refrigerante'] || "NA",
            responsesMap['r2_l_aceites_direccion'] || "NA",
            responsesMap['r2_t_frenos'] || "NA",
            responsesMap['r2_t_correas'] || "NA",
            responsesMap['r2_t_embrague'] || "NA",
            responsesMap['r2_i_luces'] || "NA",
            responsesMap['r2_i_luces_tablero'] || "NA",
            responsesMap['r2_i_mangueras_ref'] || "NA",
            responsesMap['r2_i_mangueras_aceite'] || "NA",
            responsesMap['r2_i_terminales_rotulas'] || "NA",
            responsesMap['r2_i_suspension'] || "NA",
            responsesMap['r2_i_admision_escape'] || "NA",
            responsesMap['r2_i_fugas'] || "NA",
            responsesMap['r2_i_marcha_minima'] || "NA",
            responsesMap['r2_i_direccion'] || "NA",
            responsesMap['r2_i_freno_motor'] || "NA",
            responsesMap['r2_i_varillaje_direccion'] || "NA",
            responsesMap['r2_i_sistema_combustible'] || "NA",
            imgEvidence || "",
            imgSignature || ""
          ];
        }
        else {
          sheetName = "RUTINA 1";

          rowData = [
            d.id,
            d.date,
            d.plate,
            d.taller || d.driverName || "",
            d.mileage || "",
            d.frequency || "5.000 km",
            d.cd || "",
            d.contractor || "",
            (d.score !== undefined ? d.score + "%" : "0%"),
            (d.hasFailures ? "SI" : "NO"),
            d.notes || "",

            responsesMap['r1_c_aceite_motor'] || "NA",
            responsesMap['r1_c_filtro_aceite'] || "NA",
            responsesMap['r1_c_filtro_primario'] || "NA",
            responsesMap['r1_c_filtro_secundario'] || "NA",
            responsesMap['r1_e_suspension'] || "NA",
            responsesMap['r1_e_articulaciones'] || "NA",
            responsesMap['r1_l_agua_bateria'] || "NA",
            responsesMap['r1_l_refrigerante'] || "NA",
            responsesMap['r1_l_aceites_direccion'] || "NA",
            responsesMap['r1_t_frenos'] || "NA",
            responsesMap['r1_t_correas'] || "NA",
            responsesMap['r1_t_embrague'] || "NA",
            responsesMap['r1_i_filtro_aire'] || "NA",
            responsesMap['r1_i_luces'] || "NA",
            responsesMap['r1_i_luces_tablero'] || "NA",
            responsesMap['r1_i_mangueras_ref'] || "NA",
            responsesMap['r1_i_mangueras_aceite'] || "NA",
            responsesMap['r1_i_admision_escape'] || "NA",
            responsesMap['r1_i_terminales_rotulas'] || "NA",
            responsesMap['r1_i_fugas'] || "NA",
            responsesMap['r1_i_suspension'] || "NA",
            responsesMap['r1_i_marcha_minima'] || "NA",
            responsesMap['r1_i_presion_llantas'] || "NA",
            imgEvidence || "",
            imgSignature || ""
          ];
        }

        if (sheetName) {
          var s = getS(targetSS, sheetName);
          if (!s) {
            if (lock.hasLock()) lock.releaseLock();
            return output("error", "No se encontró ni se pudo crear la pestaña " + sheetName);
          }
          s.appendRow(rowData);
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Registro de rutina agregado exitosamente en " + sheetName);
        } else {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Nombre de plantilla desconocido: " + d.templateId);
        }
      }

      // ============================================================
      // POST_MILEAGE — BLOQUE MEJORADO Y DINÁMICO
      // ============================================================
      else if (m === 'POST_MILEAGE') {
        var s = findSheetCaseInsensitive(ss, d.sheetName || "KILOMETRAJE")
             || findSheetCaseInsensitive(ss, "KILOMETRAJE")
             || findSheetCaseInsensitive(ss, "KILOMETRAJES")
             || getSheetByGid(ss, "1929496440")
             || getS(ss, "KILOMETRAJE");

        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró ni se pudo crear la pestaña KILOMETRAJE.");
        }

        if (s.getLastRow() === 0) {
          s.appendRow(["CD", "CONTRATISTA", "SEMANA", "FECHA", "PLACA", "KILOMETRAJE"]);
        }

        var kmRows = s.getDataRange().getValues();
        var headers = kmRows.length > 0 ? kmRows[0].map(function(h) { return (h || "").toString().toUpperCase().trim(); }) : [];

        var cdIdx = -1, contractorIdx = -1, weekIdx = -1, dateIdx = -1, plateIdx = -1, mileageIdx = -1;

        for (var h = 0; h < headers.length; h++) {
          var hText = headers[h];
          if (hText === "CD" || hText.indexOf("CENTRO") !== -1) cdIdx = h;
          else if (hText.indexOf("CONTRATISTA") !== -1) contractorIdx = h;
          else if (hText.indexOf("SEMANA") !== -1) weekIdx = h;
          else if (hText.indexOf("FECHA") !== -1) dateIdx = h;
          else if (hText.indexOf("PLACA") !== -1 || hText.indexOf("VEHICULO") !== -1) plateIdx = h;
          else if (hText.indexOf("KILOMETRAJE") !== -1 || hText === "KM") mileageIdx = h;
        }

        if (cdIdx === -1) cdIdx = 0;
        if (contractorIdx === -1) contractorIdx = 1;
        if (weekIdx === -1) weekIdx = 2;
        if (dateIdx === -1) dateIdx = 3;
        if (plateIdx === -1) plateIdx = 4;
        if (mileageIdx === -1) mileageIdx = 5;

        var rowPlate = pickVal(d.plate, d.PLACA, d.placa).toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!rowPlate) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Placa requerida: no puede estar vacía.");
        }

        var rawKm = pickVal(d.mileage, d.KILOMETRAJE, d.kilometraje, d.km, 0);
        var rowMileage = Number(String(rawKm).replace(/[.,\s]/g, ""));
        if (isNaN(rowMileage) || rowMileage < 0) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Kilometraje inválido: " + rawKm);
        }

        var rowCd         = pickVal(d.cd, d.CD, d.centroDistribucion, "GENERAL");
        var rowContractor = pickVal(d.contractor, d.CONTRATISTA, d.contratista, "GENERAL");
        var rowWeek       = pickVal(d.week, d.SEMANA, d.semana);
        if (!rowWeek) {
          rowWeek = "SEMANA " + getIsoWeek(d.date || today());
        }
        var rowDate       = pickVal(d.date, d.FECHA, d.fecha, today()).toString();

        // Anti-duplicado: misma placa + misma fecha (o misma semana)
        var dupIdx = -1;
        var lastRecordedKm = 0;
        for (var i = 1; i < kmRows.length; i++) {
          var rp = (kmRows[i][plateIdx] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (rp !== rowPlate) continue;

          var kmVal = Number(String(kmRows[i][mileageIdx] || 0).replace(/[.,\s]/g, ""));
          if (!isNaN(kmVal) && kmVal > lastRecordedKm) {
            lastRecordedKm = kmVal;
          }

          var rd = kmRows[i][dateIdx];
          var rdStr = (rd instanceof Date)
            ? Utilities.formatDate(rd, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd")
            : (rd || "").toString();
          
          var rw = (kmRows[i][weekIdx] || "").toString().trim();

          if ((rowDate && rdStr.indexOf(rowDate) !== -1) || (rowWeek && rw === rowWeek.toString().trim())) {
            dupIdx = i + 1;
          }
        }

        // Validación: El kilometraje debe ser estrictamente mayor al último registrado (salvo que se esté actualizando el mismo registro)
        if (dupIdx === -1 && lastRecordedKm > 0 && rowMileage <= lastRecordedKm) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "El kilometraje ingresado (" + rowMileage.toLocaleString() + " KM) debe ser estrictamente mayor al último registrado (" + lastRecordedKm.toLocaleString() + " KM) para la placa " + rowPlate + ".");
        }

        var maxCol = Math.max(cdIdx, contractorIdx, weekIdx, dateIdx, plateIdx, mileageIdx) + 1;
        var rowData = new Array(maxCol);
        for (var c = 0; c < maxCol; c++) rowData[c] = "";

        rowData[cdIdx] = rowCd;
        rowData[contractorIdx] = rowContractor;
        rowData[weekIdx] = rowWeek;
        rowData[dateIdx] = rowDate;
        rowData[plateIdx] = rowPlate;
        rowData[mileageIdx] = rowMileage;

        if (dupIdx !== -1) {
          s.getRange(dupIdx, 1, 1, rowData.length).setValues([rowData]);
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Kilometraje actualizado (fila " + dupIdx + ") en la hoja " + s.getName() + ".");
        }

        // Escribir en la siguiente fila en blanco entre las columnas leídas
        var nextBlankRow = kmRows.length + 1;
        s.getRange(nextBlankRow, 1, 1, rowData.length).setValues([rowData]);
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Kilometraje registrado exitosamente (fila " + nextBlankRow + ") en la hoja " + s.getName() + ".");
      }

      else if (m === 'POST_VARADA' || m === 'POSTVARADA' || m === 'POST_VARADAS' || m === 'POSTVARADAS') {
        var s = getSheetByGid(ss, "1900206774")
             || findSheetCaseInsensitive(ss, d.sheetName || "VARADAS")
             || findSheetCaseInsensitive(ss, "VARADAS")
             || getS(ss, "VARADAS");

        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró ni se pudo crear la pestaña VARADAS.");
        }

        if (s.getLastRow() === 0) {
          s.appendRow([
            "SEMANA", "FECHA DE VARADA", "PLACA", "LUGAR DE VARADA", "SISTEMA",
            "COMPONENTE", "DESCRIPCION", "TALLER QUE PRESTA EL SERVICIO",
            "TRANSPORTADO EN GRUA", "FECHA DE SOLUCION", "OBSERVACION",
            "HORAS VARADOS", "EVIDENCIA"
          ]);
        }

        var rowPlate = pickVal(d.plate, d.PLACA, d.placa).toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!rowPlate) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Placa requerida: no puede estar vacía.");
        }

        var rawEv = pickVal(d.evidence, d.evidencia, d.evidenceUrl, "");
        var imgUrl = sImg(rawEv, "VARADA_" + rowPlate);

        var rowData = [
          pickVal(d.week, d.SEMANA, d.semana, ""),
          pickVal(d.breakdownDate, d.fechaVarada, d.fecha, ""),
          rowPlate,
          pickVal(d.location, d.lugarVarada, d.lugar, ""),
          pickVal(d.system, d.sistema, ""),
          pickVal(d.component, d.componente, ""),
          pickVal(d.description, d.descripcion, ""),
          pickVal(d.workshop, d.taller, ""),
          pickVal(d.towed, d.grua, ""),
          pickVal(d.solutionDate, d.fechaSolucion, ""),
          pickVal(d.observation, d.observacion, ""),
          pickVal(d.hoursDown, d.horasVarados, d.horas, ""),
          imgUrl
        ];

        s.appendRow(rowData);
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Varada registrada correctamente.");
      }

      else if (m === 'POST_REPUESTO' || m === 'POST_REPUESTOS' || m === 'POSTREPUESTO' || m === 'POSTREPUESTOS') {
        var s = findSheetCaseInsensitive(ss, d.sheetName || "REPUESTO")
             || findSheetCaseInsensitive(ss, "REPUESTO")
             || findSheetCaseInsensitive(ss, "REPUESTOS")
             || getS(ss, "REPUESTO");

        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró ni se pudo crear la pestaña REPUESTO.");
        }

        if (s.getLastRow() === 0) {
          s.appendRow([
            "FECHA", "INSPECTOR", "PROVEEDOR", "TALLER", "REPUESTO",
            "CANTIDAD ENCONTRADA", "MINIMO REQUERIDO", "UND", "ESTADO", "OBSERVACION", "EVIDENCIA"
          ]);
        }

        var repuesto = pickVal(d.repuesto, d.part, "").toString();
        if (!repuesto) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Repuesto requerido: no puede estar vacío.");
        }

        var cantidad = Number(pickVal(d.cantidad, d.quantity, 0));
        var minimo = Number(pickVal(d.minimo, d.min, 0));
        var estado = (cantidad < minimo) ? "ALERTA" : "OK";
        var rawEv = pickVal(d.evidencia, d.evidence, "");
        var evidenciaUrl = "";
        if (rawEv) {
          evidenciaUrl = (typeof rawEv === 'string' && rawEv.indexOf('data:image') === 0) 
            ? sImg(rawEv, "REPUESTO_" + (d.taller || "") + "_" + (d.fecha || today())) 
            : rawEv;
        }

        var rowData = [
          pickVal(d.fecha, d.date, today()),
          pickVal(d.inspector, d.inspectorName, ""),
          pickVal(d.proveedor, d.provider, ""),
          pickVal(d.taller, d.workshop, ""),
          repuesto,
          cantidad,
          minimo,
          pickVal(d.und, d.unit, ""),
          estado,
          pickVal(d.observacion, d.observation, ""),
          evidenciaUrl
        ];

        s.appendRow(rowData);
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Repuesto registrado correctamente. Estado: " + estado);
      }

      else if (m === 'POST_REPUESTO_INSPECCION') {
        var s = findSheetCaseInsensitive(ss, d.sheetName || "REPUESTO")
             || findSheetCaseInsensitive(ss, "REPUESTO")
             || findSheetCaseInsensitive(ss, "REPUESTOS")
             || getS(ss, "REPUESTO");

        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró ni se pudo crear la pestaña REPUESTO.");
        }

        if (s.getLastRow() === 0) {
          s.appendRow([
            "FECHA", "INSPECTOR", "PROVEEDOR", "TALLER", "REPUESTO",
            "CANTIDAD ENCONTRADA", "MINIMO REQUERIDO", "UND", "ESTADO", "OBSERVACION", "EVIDENCIA"
          ]);
        }

        var fecha = pickVal(d.fecha, d.date, today());
        var inspector = pickVal(d.inspector, d.inspectorName, "");
        var proveedor = pickVal(d.proveedor, d.provider, "");
        var taller = pickVal(d.taller, d.workshop, "");
        var items = d.items || [];
        var rawEv = pickVal(d.evidencia, d.evidence, "");
        var evidenciaUrl = "";
        if (rawEv) {
          evidenciaUrl = (typeof rawEv === 'string' && rawEv.indexOf('data:image') === 0)
            ? sImg(rawEv, "REPUESTO_" + taller + "_" + fecha)
            : rawEv;
        }

        if (!items.length) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "La inspección no tiene ítems.");
        }

        var alertas = [];
        var filas = [];

        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var cantidad = Number(it.cantidad || 0);
          var minimo = Number(it.minimo || 0);
          var estado = (cantidad < minimo) ? "ALERTA" : "OK";

          filas.push([
            fecha, inspector, proveedor, taller,
            it.repuesto || "", cantidad, minimo, it.und || "", estado, it.observacion || "",
            evidenciaUrl
          ]);

          if (estado === "ALERTA") {
            alertas.push({ repuesto: it.repuesto || "", cantidad: cantidad, minimo: minimo, faltan: (minimo - cantidad) });
          }
        }

        s.getRange(s.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);

        try {
          enviarCorreoInspeccionRepuestos(taller, inspector, fecha, items, alertas.length);
        } catch (mailErr) {
          log("Error enviando correo de inspección: " + mailErr.toString(), docId);
        }

        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Inspección guardada. " + filas.length + " ítems registrados, " + alertas.length + " en alerta.");
      }

      else if (m === 'POST_CLEANING') {
        var s = getSheetByGid(ss, "1853969081") || getS(ss, "CRONOGRAMA 5S");
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró ni se pudo crear la pestaña CRONOGRAMA 5S.");
        }
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();

        var dateParts = (d.date || today()).split("-");
        var searchYear = parseInt(dateParts[0]);
        var searchMonth = parseInt(dateParts[1]);
        var searchDay = parseInt(dateParts[2]);

        log("Buscando limpieza: " + plateSearch + " para fecha " + d.date, docId);

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][3] || "").toString().toUpperCase().trim();
          if (rowPlate !== plateSearch) continue;

          var rowDateRaw = rows[i][0];
          var matchDate = false;

          if (rowDateRaw instanceof Date) {
            if (rowDateRaw.getFullYear() === searchYear &&
                (rowDateRaw.getMonth() + 1) === searchMonth &&
                rowDateRaw.getDate() === searchDay) {
              matchDate = true;
            }
          } else if (rowDateRaw) {
            var rowDateStr = rowDateRaw.toString();
            if (rowDateStr.indexOf(d.date) !== -1) {
              matchDate = true;
            }
          }

          if (matchDate) {
            foundIdx = i + 1;
            break;
          }
        }

        var imgIni = sImg(d.initialEvidence, "LIMPIEZA_INI_" + d.plate);
        var imgFin = sImg(d.finalEvidence, "LIMPIEZA_FIN_" + d.plate);
        var finalStatus = (imgIni && imgFin && imgIni.indexOf("http") === 0 && imgFin.indexOf("http") === 0) ? "COMPLETADO" : "PENDIENTE";

        if (foundIdx !== -1) {
          s.getRange(foundIdx, 5).setValue(finalStatus);
          s.getRange(foundIdx, 6).setValue(imgIni);
          s.getRange(foundIdx, 7).setValue(imgFin);
          log("Fila encontrada y actualizada: " + foundIdx, docId);
        } else {
          var rowDataC = [d.date, d.month || "", d.week, d.plate, finalStatus, imgIni, imgFin];
          s.appendRow(rowDataC);
          log("No se encontró fila pre-existente. Se creó una nueva al final.", docId);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Limpieza registrada correctamente.");
      }
      else if (m === 'POST_WASH') {
        var s = findSheetCaseInsensitive(ss, d.sheetName || "LAVADOS")
             || findSheetCaseInsensitive(ss, "LAVADOS")
             || findSheetCaseInsensitive(ss, "LAVADO")
             || findSheetCaseInsensitive(ss, "REGISTRO DE LAVADOS")
             || getS(ss, "LAVADOS");

        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró ni se pudo crear la pestaña LAVADOS.");
        }

        if (s.getLastRow() === 0) {
          s.appendRow(["ID", "MES", "SEMANA", "FECHA", "PLACA", "EVIDENCIA", "MAPA", "TALLER"]);
        }

        var rowPlate = (d.plate || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
        var rowDate = (d.date || today()).toString();
        var rowWeek = d.week ? d.week.toString() : ("SEMANA " + getIsoWeek(rowDate));
        var rowMonth = d.month ? d.month.toString() : "";

        var imgEvidence = sImg(d.evidenceUrl, "LAVADO_" + rowPlate);
        var imgMap = sImg(d.mapUrl, "MAPA_LAVADO_" + rowPlate);

        var rowData = [
          d.id || ("LAV-" + Date.now()),
          rowMonth,
          rowWeek,
          rowDate,
          rowPlate,
          imgEvidence,
          imgMap,
          d.workshop || ""
        ];

        var washRows = s.getDataRange().getValues();
        var nextBlankRow = washRows.length + 1;
        s.getRange(nextBlankRow, 1, 1, rowData.length).setValues([rowData]);

        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Lavado registrado correctamente (fila " + nextBlankRow + ") en " + s.getName());
      }
      else if (m === 'POST_CALIBRATION_UPDATE') {
        var s = getSheetByGid(ss, "505557891") || getS(ss, "CALIBRACIONES");
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró ni se pudo crear la pestaña CALIBRACIONES.");
        }
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.originalPlate || d.plate || "").toString().toUpperCase().trim();
        var dateSearch = (d.originalDate || d.calibrationDate || "").toString().trim();

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][3] || "").toString().toUpperCase().trim();
          if (rowPlate !== plateSearch) continue;

          var rowDateRaw = rows[i][1];
          var matchDate = false;

          if (rowDateRaw instanceof Date) {
            var searchParts = dateSearch.split("-");
            if (rowDateRaw.getFullYear() === parseInt(searchParts[0]) &&
                (rowDateRaw.getMonth() + 1) === parseInt(searchParts[1]) &&
                rowDateRaw.getDate() === parseInt(searchParts[2])) {
              matchDate = true;
            }
          } else if (rowDateRaw) {
            if (rowDateRaw.toString().indexOf(dateSearch) !== -1) matchDate = true;
          }

          if (matchDate) {
            foundIdx = i + 1;
            break;
          }
        }

        var img = sImg(d.certificateUrl, "CALIB_" + d.plate);
        var press = d.pressures || {};
        var p1_ini = pickVal(d.p1i, d.p1_inicial, d.p1Inicial, press.p1i, press.p1_inicial, "");
        var p1_fin = pickVal(d.p1f, d.p1_final, d.p1Final, press.p1f, press.p1_final, "");
        var p2_ini = pickVal(d.p2i, d.p2_inicial, d.p2Inicial, press.p2i, press.p2_inicial, "");
        var p2_fin = pickVal(d.p2f, d.p2_final, d.p2Final, press.p2f, press.p2_final, "");
        var p3_ini = pickVal(d.p3i, d.p3_inicial, d.p3Inicial, press.p3i, press.p3_inicial, "");
        var p3_fin = pickVal(d.p3f, d.p3_final, d.p3Final, press.p3f, press.p3_final, "");
        var p4_ini = pickVal(d.p4i, d.p4_inicial, d.p4Inicial, press.p4i, press.p4_inicial, "");
        var p4_fin = pickVal(d.p4f, d.p4_final, d.p4Final, press.p4f, press.p4_final, "");
        var p5_ini = pickVal(d.p5i, d.p5_inicial, d.p5Inicial, press.p5i, press.p5_inicial, "");
        var p5_fin = pickVal(d.p5f, d.p5_final, d.p5Final, press.p5f, press.p5_final, "");
        var p6_ini = pickVal(d.p6i, d.p6_inicial, d.p6Inicial, press.p6i, press.p6_inicial, "");
        var p6_fin = pickVal(d.p6f, d.p6_final, d.p6Final, press.p6f, press.p6_final, "");

        var rowCalib = [
          d.month, d.calibrationDate, d.week, d.plate, d.taller || d.equipment, img, "COMPLETADO", d.cd || "", d.contractor || "",
          p1_ini, p1_fin, p2_ini, p2_fin, p3_ini, p3_fin, p4_ini, p4_fin, p5_ini, p5_fin, p6_ini, p6_fin
        ];

        if (foundIdx !== -1) {
          s.getRange(foundIdx, 1, 1, rowCalib.length).setValues([rowCalib]);
        } else {
          s.appendRow(rowCalib);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Calibración actualizada correctamente.");
      }
      else if (m === 'POST_CALIBRATION') {
        var s = getSheetByGid(ss, "505557891") || getS(ss, "CALIBRACIONES");
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró ni se pudo crear la pestaña CALIBRACIONES.");
        }
        var img = sImg(d.certificateUrl, "CALIB_" + d.plate);
        var press = d.pressures || {};
        var p1_ini = pickVal(d.p1i, d.p1_inicial, d.p1Inicial, press.p1i, press.p1_inicial, "");
        var p1_fin = pickVal(d.p1f, d.p1_final, d.p1Final, press.p1f, press.p1_final, "");
        var p2_ini = pickVal(d.p2i, d.p2_inicial, d.p2Inicial, press.p2i, press.p2_inicial, "");
        var p2_fin = pickVal(d.p2f, d.p2_final, d.p2Final, press.p2f, press.p2_final, "");
        var p3_ini = pickVal(d.p3i, d.p3_inicial, d.p3Inicial, press.p3i, press.p3_inicial, "");
        var p3_fin = pickVal(d.p3f, d.p3_final, d.p3Final, press.p3f, press.p3_final, "");
        var p4_ini = pickVal(d.p4i, d.p4_inicial, d.p4Inicial, press.p4i, press.p4_inicial, "");
        var p4_fin = pickVal(d.p4f, d.p4_final, d.p4Final, press.p4f, press.p4_final, "");
        var p5_ini = pickVal(d.p5i, d.p5_inicial, d.p5Inicial, press.p5i, press.p5_inicial, "");
        var p5_fin = pickVal(d.p5f, d.p5_final, d.p5Final, press.p5f, press.p5_final, "");
        var p6_ini = pickVal(d.p6i, d.p6_inicial, d.p6Inicial, press.p6i, press.p6_inicial, "");
        var p6_fin = pickVal(d.p6f, d.p6_final, d.p6Final, press.p6f, press.p6_final, "");

        s.appendRow([
          d.month, d.calibrationDate, d.week, d.plate, d.taller || d.equipment, img, "COMPLETADO", d.cd || "", d.contractor || "",
          p1_ini, p1_fin, p2_ini, p2_fin, p3_ini, p3_fin, p4_ini, p4_fin, p5_ini, p5_fin, p6_ini, p6_fin
        ]);
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Calibración registrada correctamente.");
      }
      else if (m === 'POST_UNAVAILABILITY_BATCH') {
        var targetDocId = cleanId((req.docId) || (d && d.docId) || ID_HOJA);
        var ssUnav = SpreadsheetApp.openById(targetDocId);
        var s = findSheetCaseInsensitive(ssUnav, "INDISPONIBILIDAD") || ssUnav.getSheetByName("INDISPONIBILIDAD");
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Hoja INDISPONIBILIDAD no encontrada");
        }
        // El payload puede venir como array directo en data, o como data.rows
        var batch = Array.isArray(d) ? d : (Array.isArray(d.rows) ? d.rows : null);
        if (!batch || batch.length === 0) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "POST_UNAVAILABILITY_BATCH requiere un array de filas en 'data' o 'data.rows'.");
        }
        s.getRange(s.getLastRow() + 1, 1, batch.length, batch[0].length).setValues(batch);
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Lote de indisponibilidad procesado: " + batch.length + " filas.");
      }
      else if (m === 'POST_AUDIT_UPDATE') {
        var s = getS(ss, "ESTANDAR");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var idSearch = (d.id || "").toString().trim();

        for (var i = 1; i < rows.length; i++) {
          if ((rows[i][0] || "").toString().trim() === idSearch) {
            foundIdx = i + 1;
            break;
          }
        }

        if (foundIdx !== -1) {
          // Col 73 (BU): Fecha Novedad | 74 (BV): Estado | 75 (BW): Evidencia | 76 (BX): Observación
          var statusToSet = (d.evidence || d.status === "REALIZADO") ? "REALIZADO" : (d.status || "REALIZADO");
          s.getRange(foundIdx, 74).setValue(statusToSet);
          if (d.noveltyObservation) s.getRange(foundIdx, 76).setValue(d.noveltyObservation);
          if (d.noveltyDate) s.getRange(foundIdx, 73).setValue(d.noveltyDate);

          if (d.evidence) {
            var evidenceUrl = "";
            if (Array.isArray(d.evidence)) {
              var links = [];
              for (var j = 0; j < d.evidence.length; j++) {
                if (d.evidence[j] && (d.evidence[j].indexOf("data:image") === 0 || d.evidence[j].indexOf("http") !== 0)) {
                  links.push(sImg(d.evidence[j], "EVI_" + idSearch + "_" + j));
                } else if (d.evidence[j]) {
                  links.push(d.evidence[j]);
                }
              }
              evidenceUrl = links.join(", ");
            } else if (typeof d.evidence === 'string' && d.evidence.indexOf("data:image") === 0) {
              evidenceUrl = sImg(d.evidence, "EVI_" + idSearch);
            } else {
              evidenceUrl = d.evidence;
            }
            s.getRange(foundIdx, 75).setValue(evidenceUrl);
          }

          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Auditoría actualizada en columna BW, fila " + foundIdx);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Auditoria no encontrada con ID: " + idSearch);
      }
      else if (m === 'POST_CIERRE_UPDATE' || m === 'POST_CONTROL_TOWER_UPDATE') {
        var sheetName = d.sheetName || "cierre";
        var targetDocId = cleanId(d.docId || ID_HOJA);
        var ssCT = null;
        try { ssCT = SpreadsheetApp.openById(targetDocId); } catch(e) {}
        if (!ssCT) ssCT = ss;

        var s = findSheetCaseInsensitive(ssCT, sheetName) || ssCT.getSheetByName(sheetName) || ssCT.getSheets()[0];
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Hoja " + sheetName + " no encontrada");
        }
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
        var itemSearch = (d.item || d.novelty || "").toString().toLowerCase().trim();

        // Buscar por PLACA (col 1 / índice 1) e ITEM (col 4 / índice 4)
        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][1] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
          var rowItem = (rows[i][4] || "").toString().toLowerCase().trim();

          if (rowPlate === plateSearch && (rowItem === itemSearch || itemSearch === "")) {
            foundIdx = i + 1;
            var rowStatus = (rows[i][7] || "").toString().trim().toUpperCase();
            if (rowStatus === "PENDIENTE" || rowStatus === "") break;
          }
        }

        // Fallback: si no encontró en col 1/4, intentar buscar en formato previo (col 5 placa / col 7 novedad)
        if (foundIdx === -1) {
          for (var i = 1; i < rows.length; i++) {
            var rP = (rows[i][5] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
            var rN = (rows[i][7] || "").toString().toLowerCase().trim();
            if (rP === plateSearch && (rN === itemSearch || itemSearch === "")) {
              foundIdx = i + 1;
              break;
            }
          }
        }

        if (foundIdx !== -1) {
          var evidenceUrl = "";
          var rawEv = d.evidence || d.evidenceAfter || d.evidenceBefore;
          if (rawEv) {
            if (Array.isArray(rawEv)) {
              var links = [];
              for (var j = 0; j < rawEv.length; j++) {
                if (rawEv[j] && (rawEv[j].indexOf("data:image") === 0 || rawEv[j].indexOf("http") !== 0)) {
                  links.push(sImg(rawEv[j], "CIERRE_" + plateSearch + "_" + j));
                } else if (rawEv[j]) {
                  links.push(rawEv[j]);
                }
              }
              evidenceUrl = links.join(", ");
            } else if (typeof rawEv === 'string' && rawEv.indexOf("data:image") === 0) {
              evidenceUrl = sImg(rawEv, "CIERRE_" + plateSearch);
            } else {
              evidenceUrl = rawEv;
            }
            // Col 7 en 1-based (índice 6 base 0 = columna G / EVIDENCIA)
            s.getRange(foundIdx, 7).setValue(evidenceUrl);
          }

          // Col 8 en 1-based (índice 7 base 0 = columna H / ESTADO): Al subir evidencia el estado siempre es REALIZADO
          var nuevoEstado = (rawEv || d.estado === "REALIZADO" || d.status === "REALIZADO") ? "REALIZADO" : (d.estado || d.status || "REALIZADO");
          s.getRange(foundIdx, 8).setValue(nuevoEstado);

          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Cierre de novedad actualizado en hoja " + sheetName + ", fila " + foundIdx);
        } else {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró registro en " + sheetName + " para: Placa " + plateSearch + ", Item " + itemSearch);
        }
      }
      else if (m === 'POST_FLEET_CIERRE_UPDATE') {
        var targetDocId = cleanId(d.docId || ID_HOJA);
        var ssFleet = null;
        try { ssFleet = SpreadsheetApp.openById(targetDocId); } catch(e) {}
        if (!ssFleet) ssFleet = ss;

        var s = findSheetCaseInsensitive(ssFleet, "CIERRE") || ssFleet.getSheetByName("CIERRE") || ssFleet.getSheetByName("cierre") || ssFleet.getSheets()[0];
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Hoja CIERRE no encontrada");
        }
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
        var itemSearch = (d.item || "").toString().toLowerCase().trim();

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][1] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
          var rowItem = (rows[i][4] || "").toString().toLowerCase().trim();
          var rowStatus = (rows[i][7] || "").toString().trim().toUpperCase();

          if (rowPlate === plateSearch && rowItem === itemSearch) {
            foundIdx = i + 1;
            if (rowStatus === "PENDIENTE") break;
          }
        }

        if (foundIdx !== -1) {
          if (d.evidence) {
            var evidenceUrl = "";
            if (Array.isArray(d.evidence)) {
              var links = [];
              for (var j = 0; j < d.evidence.length; j++) {
                if (d.evidence[j] && (d.evidence[j].indexOf("data:image") === 0 || d.evidence[j].indexOf("http") !== 0)) {
                  links.push(sImg(d.evidence[j], "CIERRE_" + plateSearch + "_" + j));
                } else if (d.evidence[j]) {
                  links.push(d.evidence[j]);
                }
              }
              evidenceUrl = links.join(", ");
            } else if (typeof d.evidence === 'string' && d.evidence.indexOf("data:image") === 0) {
              evidenceUrl = sImg(d.evidence, "CIERRE_" + plateSearch);
            } else {
              evidenceUrl = d.evidence;
            }
            s.getRange(foundIdx, 7).setValue(evidenceUrl);
          }

          // Al subir evidencia el estado es REALIZADO
          var nuevoEstado = (d.evidence || d.estado === "REALIZADO" || d.status === "REALIZADO") ? "REALIZADO" : (d.estado || d.status || "REALIZADO");
          s.getRange(foundIdx, 8).setValue(nuevoEstado);

          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Cierre de auditoría actualizado en hoja CIERRE, fila " + foundIdx);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró registro en CIERRE para: Placa " + plateSearch + ", Item " + itemSearch);
      }
      else if (m === 'POST_CALIDAD_CIERRE_UPDATE') {
        var s = findSheetCaseInsensitive(ss, "CIERRE1") || ss.getSheetByName("CIERRE1");
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Hoja CIERRE1 no encontrada");
        }
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
        var itemSearch = (d.item || "").toString().toLowerCase().trim();

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][2] || "").toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
          var rowItem = (rows[i][3] || "").toString().toLowerCase().trim();
          var rowStatus = (rows[i][6] || "").toString().trim().toUpperCase();

          if (rowPlate === plateSearch && rowItem === itemSearch) {
            foundIdx = i + 1;
            if (rowStatus === "PENDIENTE") break;
          }
        }

        if (foundIdx !== -1) {
          if (d.evidence) {
            var evidenceUrl = "";
            if (Array.isArray(d.evidence)) {
              var links = [];
              for (var j = 0; j < d.evidence.length; j++) {
                if (d.evidence[j] && (d.evidence[j].indexOf("data:image") === 0 || d.evidence[j].indexOf("http") !== 0)) {
                  links.push(sImg(d.evidence[j], "CIERRE_CALIDAD_" + plateSearch + "_" + j));
                } else if (d.evidence[j]) {
                  links.push(d.evidence[j]);
                }
              }
              evidenceUrl = links.join(", ");
            } else if (typeof d.evidence === 'string' && d.evidence.indexOf("data:image") === 0) {
              evidenceUrl = sImg(d.evidence, "CIERRE_CALIDAD_" + plateSearch);
            } else {
              evidenceUrl = d.evidence;
            }
            s.getRange(foundIdx, 6).setValue(evidenceUrl);
          }

          // Actualizar Estado en columna 7 (G) de CIERRE1 a REALIZADO cuando se sube evidencia
          var nuevoEstadoCalidad = (d.evidence || d.estado === "REALIZADO" || d.status === "REALIZADO" || d.status === "CERRADO") ? (d.status === "CERRADO" ? "CERRADO" : "REALIZADO") : (d.estado || d.status || "REALIZADO");
          s.getRange(foundIdx, 7).setValue(nuevoEstadoCalidad);

          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Cierre de calidad actualizado en hoja CIERRE1, fila " + foundIdx);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró registro en CIERRE1 para: Placa " + plateSearch + ", Item " + itemSearch);
      }
      else if (m === 'POST_FLEET_STANDARD_AUDIT_UPDATE') {
        var s = findSheetCaseInsensitive(ss, "ESTRANDAR") || ss.getSheetByName("ESTRANDAR") || ss.getSheetByName("ESTANDAR") || ss.getSheets()[0];
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var idVal = (d.id || "").toString().trim().toUpperCase();
        var plateVal = (d.placa || d.plate || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

        for (var i = 1; i < rows.length; i++) {
          var rowId = (rows[i][0] || "").toString().trim().toUpperCase();
          var rowPlate = (rows[i][8] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, ""); // Col I

          if (idVal && idVal.indexOf("STD-AUDIT-") !== 0 && rowId === idVal) {
            foundIdx = i + 1;
            break;
          }
          if (plateVal && rowPlate === plateVal) {
            foundIdx = i + 1;
            var rowStatus = (rows[i][88] || "").toString().trim().toUpperCase(); // Col CK
            if (rowStatus === "PENDIENTE" || rowStatus === "ABIERTO" || rowStatus === "") {
              break;
            }
          }
        }

        if (foundIdx !== -1) {
          if (d.evidenciaAntes) s.getRange(foundIdx, 86).setValue(d.evidenciaAntes);
          if (d.fechaCierre) s.getRange(foundIdx, 87).setValue(d.fechaCierre);
          if (d.estado) s.getRange(foundIdx, 89).setValue(d.estado);
          if (d.evidenciaDespues) s.getRange(foundIdx, 90).setValue(d.evidenciaDespues);

          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Auditoria actualizada en fila " + foundIdx);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró auditoria. ID: " + (idVal || "(vacío)") + " | Placa: " + (plateVal || "(vacía)"));
      }
      else if (m === 'POST_CAMPAIGN') {
        var s = findSheetCaseInsensitive(ss, d.sheetName) || ss.getSheetByName(d.sheetName);
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Hoja de campaña '" + d.sheetName + "' no encontrada.");
        }

        var img1 = sImg(d.evidence1, "CAMP_EVI1_" + d.plate);
        var img2 = sImg(d.evidence2, "CAMP_EVI2_" + d.plate);
        var img3 = sImg(d.evidence3, "CAMP_EVI3_" + d.plate);

        var rowDataCamp = [
          d.semana || "",
          d.mes || "",
          d.fecha || "",
          (d.plate || "").toUpperCase(),
          d.taller || "",
          d.observacion || "",
          img1 || "",
          img2 || "",
          img3 || ""
        ];

        s.appendRow(rowDataCamp);
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Campaña guardada con éxito en la hoja " + d.sheetName);
      }
      else if (m === 'UPLOAD_IMAGE') {
        var url = sImg(d.base64, d.name);
        if (lock.hasLock()) lock.releaseLock();
        return output("success", url);
      }
      else {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Método no soportado: " + m);
      }
    }

    if (lock.hasLock()) lock.releaseLock();
    return output("success", "Datos procesados.");
  } catch (e) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", e.toString());
  }
}

function getSheetByGid(ss, gid) {
  try {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId().toString() === gid.toString()) {
        return sheets[i];
      }
    }
  } catch (e) {}
  return null;
}

function findSheetCaseInsensitive(ss, name) {
  if (!ss || !name) return null;
  try {
    var sheets = ss.getSheets();

    function normalize(str) {
      if (!str) return "";
      var s = str.toString().toUpperCase().trim();
      s = s.replace(/[ÁÀÄÂ]/g, "A")
           .replace(/[ÉÈËÊ]/g, "E")
           .replace(/[ÍÌÏÎ]/g, "I")
           .replace(/[ÓÒÖÔ]/g, "O")
           .replace(/[ÚÙÜÛ]/g, "U")
           .replace(/[Ñ]/g, "N")
           .replace(/[^A-Z0-9\s]/g, "");
      return s.replace(/\s+/g, " ");
    }

    var searchNorm = normalize(name);
    if (!searchNorm) return null;

    for (var i = 0; i < sheets.length; i++) {
      if (normalize(sheets[i].getName()) === searchNorm) return sheets[i];
    }

    for (var i = 0; i < sheets.length; i++) {
      var sNameNorm = normalize(sheets[i].getName());
      if (sNameNorm.indexOf(searchNorm) !== -1 || searchNorm.indexOf(sNameNorm) !== -1) {
        return sheets[i];
      }
    }
  } catch (e) {}

  return null;
}

function sImg(base64, name) {
  if (!base64 || base64.length < 100 || base64.toString().indexOf("http") === 0) return base64 || "";
  try {
    var folderName = "BQA_COMPROBANTES_FLOTA";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    var mimeType = "image/jpeg";
    var str = base64.toString();
    if (str.indexOf("data:") === 0 && str.indexOf(";") > 5) {
      mimeType = str.substring(5, str.indexOf(';'));
    }
    var parts = str.split(',');
    if (parts.length < 2) return base64 || "";
    var bytes = Utilities.base64Decode(parts[1]);
    var blob = Utilities.newBlob(bytes, mimeType, (name || "FILE") + "_" + Date.now() + (mimeType === 'application/pdf' ? '.pdf' : '.jpg'));
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return (base64 && base64.length > 500) ? "Error Archivo" : (base64 || "");
  }
}

function getS(ss, name) {
  if (!ss) return null;
  var s = findSheetCaseInsensitive(ss, name);
  if (!s) {
    try {
      s = ss.getSheetByName(name);
    } catch(e) {}
  }
  if (!s) {
    try {
      s = ss.insertSheet(name);
    } catch (e) {
      try {
        s = ss.getSheets()[0];
      } catch(e2) {}
    }
  }
  return s;
}

function today() { return Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd"); }

function getIsoWeek(dateStr) {
  try {
    var d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return "1";
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    var yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7).toString();
  } catch (e) {
    return "1";
  }
}

function output(status, message) {
  return ContentService.createTextOutput(JSON.stringify({status: status, message: message})).setMimeType(ContentService.MimeType.JSON);
}

function enviarCorreoInspeccionRepuestos(taller, inspector, fecha, items, numAlertas) {
  var destinatarios = "edgar.arrieta@ab-inbev.com,aperez@rentingcolombia.com";
  var todoOk = (numAlertas === 0);

  var asunto = todoOk
    ? "✅ Inspección de repuestos COMPLETA - Taller " + taller
    : "⚠️ Inspección de repuestos - Taller " + taller + " (" + numAlertas + " en alerta)";

  var filasHtml = "";
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var cantidad = Number(it.cantidad || 0);
    var minimo = Number(it.minimo || 0);
    var enAlerta = cantidad < minimo;
    var bg = enAlerta ? "#fdecec" : "#eafaf1";
    var estadoTxt = enAlerta ? "ALERTA" : "OK";
    var estadoColor = enAlerta ? "#c0392b" : "#1e8449";

    filasHtml +=
      '<tr style="background:' + bg + ';">' +
        '<td style="padding:8px;border:1px solid #ddd;">' + (it.repuesto || "") + '</td>' +
        '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + cantidad + '</td>' +
        '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + minimo + '</td>' +
        '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + (it.und || "") + '</td>' +
        '<td style="padding:8px;border:1px solid #ddd;text-align:center;color:' + estadoColor + ';font-weight:bold;">' + estadoTxt + '</td>' +
      '</tr>';
  }

  var encabezadoColor = todoOk ? "#1e8449" : "#c0392b";
  var mensajeIntro = todoOk
    ? '¡Buenas noticias! La inspección del taller <b>' + taller + '</b> se completó y <b>todos los repuestos están en óptimo nivel de stock</b>. A continuación el detalle completo:'
    : 'Inspección del taller <b>' + taller + '</b> completada. Hay <b>' + numAlertas + '</b> repuesto(s) por debajo del mínimo (resaltados en rojo). Detalle completo:';

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:640px;">' +
      '<h2 style="color:' + encabezadoColor + ';">' + (todoOk ? "✅" : "⚠️") + ' Inspección de repuestos - Taller ' + taller + '</h2>' +
      '<p>Fecha: <b>' + fecha + '</b> &nbsp;|&nbsp; Inspector: <b>' + (inspector || "N/D") + '</b></p>' +
      '<p>' + mensajeIntro + '</p>' +
      '<table style="border-collapse:collapse;width:100%;font-size:14px;">' +
        '<thead>' +
          '<tr style="background:#2c3e50;color:#fff;">' +
            '<th style="padding:10px;border:1px solid #ddd;text-align:left;">Repuesto</th>' +
            '<th style="padding:10px;border:1px solid #ddd;">Encontrado</th>' +
            '<th style="padding:10px;border:1px solid #ddd;">Mínimo</th>' +
            '<th style="padding:10px;border:1px solid #ddd;">Und</th>' +
            '<th style="padding:10px;border:1px solid #ddd;">Estado</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + filasHtml + '</tbody>' +
      '</table>' +
      '<p style="margin-top:16px;font-size:13px;color:#555;">Total repuestos inspeccionados: <b>' + items.length + '</b> &nbsp;|&nbsp; En alerta: <b style="color:#c0392b;">' + numAlertas + '</b> &nbsp;|&nbsp; En orden: <b style="color:#1e8449;">' + (items.length - numAlertas) + '</b></p>' +
      '<p style="color:#888;font-size:12px;margin-top:20px;">Mensaje automático del Sistema de Gestión Flota BQA.</p>' +
    '</div>';

  MailApp.sendEmail({
    to: destinatarios,
    subject: asunto,
    htmlBody: html
  });
}

