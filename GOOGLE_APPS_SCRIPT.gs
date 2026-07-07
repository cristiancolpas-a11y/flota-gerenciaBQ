
// SISTEMA GESTIÓN FLOTA BQA - BACKEND UNIFICADO

// ⚠️ ASEGÚRATE DE QUE ESTE ID SEA EL DE TU HOJA DE CÁLCULO ACTUAL
var ID_HOJA = '1IKgWuUo5r0ofd8T95bJbstDn7FXigWLJGbr_mWoaFzE';
var ID_MAESTRO = '1GPfhWOUM8As4vVRirzWgSzFwvQ01I6EAc14uGoWc98U';
var MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function cleanId(id) {
  if (!id) return '';
  id = id.toString().trim();
  
  // 1. If it has /spreadsheets/d/ID
  var dMatch = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (dMatch && dMatch[1]) {
    return dMatch[1];
  }
  
  // 2. If it is ID/edit...
  var editMatch = id.match(/^([a-zA-Z0-9-_]+)\/edit/);
  if (editMatch && editMatch[1]) {
    return editMatch[1];
  }
  
  // 3. Just clean up any query params, hash fragments, or trailing slashes
  id = id.split('?')[0].split('#')[0];
  if (id.charAt(id.length - 1) === '/') {
    id = id.substring(0, id.length - 1);
  }
  
  // 4. If it still contains a slash, try to get the longest alphanumeric part or the last part
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

function log(msg) {
  try {
    var ss = SpreadsheetApp.openById(cleanId(ID_HOJA));
    var s = getS(ss, "LOGS");
    s.appendRow([new Date(), msg]);
  } catch(e) {}
}

function doGet(e) {
  var m = e.parameter.method;
  var sheetName = e.parameter.sheetName;
  var docId = cleanId(e.parameter.docId || ID_HOJA);
  
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
  return output("error", "Metodo no soportado");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // Aumentado a 20 segundos
    if (!e.postData.contents) return output("error", "No hay datos en el postBody");
    
    var req = JSON.parse(e.postData.contents);
    var d = req.data;
    var m = req.method;
    
    log("Method: " + m + " - Data: " + JSON.stringify(d).substring(0, 500));

    if (m === 'GET_DATA') {
      var docId = cleanId(d.docId || ID_HOJA);
      var ss = SpreadsheetApp.openById(docId);
      var s = d.sheetName ? ss.getSheetByName(d.sheetName) : ss.getSheets()[0];
      if (!s) {
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Hoja no encontrada");
      }
      var values = s.getDataRange().getDisplayValues();
      if (lock.hasLock()) lock.releaseLock();
      return output("success", values);
    }

    if (m === 'POST_FINE') {
      var ssC = SpreadsheetApp.openById("1WnzEFfVMTHZVVKWGTMLU2WjY-GIzSRpWz52i_Es0E1M"); 
      var s = ssC.getSheets()[0];
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
          lock.releaseLock();
          return output("success", "Soporte vinculado.");
        }
      }

      var dInf = new Date((d.date || today()) + "T12:00:00");
      var mes = MESES[dInf.getMonth()] || "GENERAL";
      s.appendRow([mes, today(), d.cd || "G", d.contractor || "G", d.driverName || "", d.driverId || "", d.driverPosition || "CONDUCTOR", img, d.status === 'PENDIENTE' ? 'SI' : 'NO', d.paymentAgreement || "NO", d.amount, d.infractionCode, d.date, d.description, placa]);
    }
    
    else if (m === 'POST_DOC_UPDATE') {
      var ssM = SpreadsheetApp.openById(ID_MAESTRO);
      var s = getSheetByGid(ssM, "1506825194") || ssM.getSheets()[0]; 
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
      var ss = SpreadsheetApp.openById(ID_HOJA);
      
      if (m === 'POST_REPORT') {
        var s = getSheetByGid(ss, "1789987673") || getS(ss, "NOVEDADES");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var existingRow = null;
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][0] && rows[i][0].toString().trim() === d.id.toString().trim()) {
            foundIdx = i + 1;
            existingRow = rows[i];
            break;
          }
        }

        var imgIni = sImg(d.initialEvidence, "NOV_INI_" + d.plate);
        var imgWork = sImg(d.workshopEvidence, "NOV_TALLER_" + d.plate);
        var imgSol = sImg(d.solutionEvidence, "NOV_SOL_" + d.plate);
        var imgMapEntry = sImg(d.entryMap, "MAPA_ENTRADA_" + d.plate);
        var imgMapExit = sImg(d.exitMap, "MAPA_SALIDA_" + d.plate);

        // Si ya existe la fila, preservamos los links si los nuevos vienen vacíos
        if (existingRow) {
          if (!imgIni && existingRow[7]) imgIni = existingRow[7];
          if (!imgMapEntry && existingRow[10]) imgMapEntry = existingRow[10];
          if (!imgWork && existingRow[12]) imgWork = existingRow[12];
          if (!imgSol && existingRow[14]) imgSol = existingRow[14];
          if (!imgMapExit && existingRow[15]) imgMapExit = existingRow[15];
        }

        var rowData = [
          d.id, 
          d.date, 
          d.cd || "GENERAL",
          d.contractor || "GENERAL",
          d.plate, 
          d.source, 
          d.workshopDate || "",
          imgIni || "",
          d.novelty,
          d.daysToAttend || 0,
          imgMapEntry || "",
          d.status,
          imgWork || "",
          d.closureDate || "",
          imgSol || "",
          imgMapExit || "",
          d.daysInShop || 0,
          d.closureComments || "",
          d.workshop || ""
        ];

        if (foundIdx !== -1) s.getRange(foundIdx, 1, 1, rowData.length).setValues([rowData]);
        else s.appendRow(rowData);
      }
      else if (m === 'POST_WORKSHOP_RECORD') {
        var docId = cleanId(d.docId || '1rrY2XyCYqZyAbCJtEOWuPxAtWaQ_lmqG28KQz5w_NSo');
        var ssW = SpreadsheetApp.openById(docId);
        var s = getS(ssW, "TALLERES");
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

          // Intento 1: Por Hash ID (si no es un ID generado vprog-)
          if (searchId && !searchId.startsWith("vprog-") && rowHash === searchId) {
            foundIdx = i + 1;
            break;
          }
          
          // Intento 2: Por Placa y Fecha Programada (Fallback)
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
          
          lock.releaseLock();
          return output("success", "Visita actualizada en fila " + foundIdx);
        } else {
          lock.releaseLock();
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
        var ssProg = SpreadsheetApp.openById("1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0");
        var s = ssProg.getSheetByName("PROGRAMACIÓN") || ssProg.getSheetByName("PROGRAMCION") || ssProg.getSheets()[0];
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();
        var dateSearch = (d.date || "").toString().trim(); // YYYY-MM-DD

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][3] || "").toString().toUpperCase().trim();
          if (rowPlate !== plateSearch) continue;

          var rowDateRaw = rows[i][0];
          var rowDateStr = "";
          
          if (rowDateRaw instanceof Date) {
            rowDateStr = Utilities.formatDate(rowDateRaw, ssProg.getSpreadsheetTimeZone(), "yyyy-MM-dd");
          } else if (rowDateRaw) {
            rowDateStr = rowDateRaw.toString();
            // Normalizar formatos comunes DD/MM/YYYY a YYYY-MM-DD
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
          
          if (img1) s.getRange(foundIdx, 10).setValue(img1); // EVIDDENCIA 1 (Indice 9 -> Columna 10)
          if (img2) s.getRange(foundIdx, 11).setValue(img2); // EVIDENCIA 2 (Indice 10 -> Columna 11)
          if (img3) s.getRange(foundIdx, 12).setValue(img3); // ENVIDENCIA (Indice 11 -> Columna 12)
          if (d.evidence4) {
            var img4 = sImg(d.evidence4, "CORR_EV4_" + plateSearch);
            if (img4) s.getRange(foundIdx, 13).setValue(img4); // EVIDENCIA 4 (Indice 12 -> Columna 13)
          }
          
          lock.releaseLock();
          return output("success", "Evidencias registradas en fila " + foundIdx);
        } else {
          lock.releaseLock();
          return output("error", "No se encontró la programación para " + plateSearch + " en " + dateSearch);
        }
      }
      else if (m === 'POST_ROUTINE') {
        var docId = cleanId(d.docId || ID_HOJA);
        var ss = SpreadsheetApp.openById(docId);
        var sheetName = "";
        var rowData = [];
        
        var imgEvidence = sImg(d.evidenceUrl, "ROUTINE_EV_" + d.plate);
        var imgSignature = sImg(d.signatureUrl, "ROUTINE_SIG_" + d.plate);
        
        var responsesMap = {};
        if (d.responses && Array.isArray(d.responses)) {
          for (var i = 0; i < d.responses.length; i++) {
            var resp = d.responses[i];
            responsesMap[resp.itemId] = resp.status; // OK, FAIL, NA
          }
        }
        
        if (d.templateId === 'rutina_4') {
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
            d.id,                                              // 0: ID Registro
            d.date,                                            // 1: Fecha
            d.cd || "",                                        // 2: Centro de Distribución
            d.plate,                                           // 3: Placa
            d.templateName || "Rutina 4",                       // 4: Tipo de Rutina
            d.frequency || "5.000 km",                         // 5: Frecuencia
            d.taller || d.driverName || "",                    // 6: TALLER
            d.mileage || "",                                   // 7: Kilometraje Actual
            (d.score !== undefined ? d.score + "%" : "0%"),     // 8: Puntaje %
            (d.hasFailures ? "SI" : "NO"),                     // 9: ¿Tiene Fallas?
            detailFailures,                                    // 10: Detalle de Fallas
            imgEvidence || "",                                 // 11: Evidencia Fotográfica
            imgSignature || "",                                // 12: Firma Digital
            d.notes || "",                                     // 13: Observaciones Generales
            
            // Checklist Items starting at index 14
            responsesMap['r4_c_aceite_motor'] || "NA",         // 14: Cambio: Aceite Motor
            responsesMap['r4_c_filtro_aceite'] || "NA",        // 15: Cambio: Filtro de aceite
            responsesMap['r4_c_filtro_aire_secundario'] || "NA", // 16: Cambio: Filtro Aire Secundario
            responsesMap['r4_c_filtro_aceite_hidraulico'] || "NA", // 17: Cambio: Filtro aceite hidráulico
            responsesMap['r4_c_filtro_transmision'] || "NA",   // 18: Cambio: Filtro de transmisión
            responsesMap['r4_c_aceite_direccion'] || "NA",     // 19: Cambio: Aceite dirección
            responsesMap['r4_c_correas_motor'] || "NA",        // 20: Cambio: Correas Motor
            responsesMap['r4_c_liquido_refrigerante'] || "NA",  // 21: Cambio: Líquido Refrigerante
            responsesMap['r4_c_filtro_aire_primario'] || "NA",  // 22: Cambio: Filtro de aire primario
            responsesMap['r4_c_filtro_combustible_primario'] || "NA", // 23: Cambio: Filtro combustible primario
            responsesMap['r4_c_filtro_combustible_secundario'] || "NA", // 24: Cambio: Filtro de combustible secundario o trampa de agua
            responsesMap['r4_c_aceite_diferencial'] || "NA",   // 25: Cambio: Aceite diferencial
            responsesMap['r4_c_aceite_caja_velocidades'] || "NA", // 26: Cambio: Aceite caja de velocidades
            responsesMap['r4_c_filtro_aire_compresor'] || "NA", // 27: Cambio: Filtro aire compresor
            responsesMap['r4_e_general_suspension'] || "NA",   // 28: Engrase: General Suspensión
            responsesMap['r4_e_articulaciones'] || "NA",       // 29: Engrase: Articulaciones, Crucetas, Cardanes, Bujes y
            responsesMap['r4_e_rodamientos_delanteros'] || "NA", // 30: Engrase: Rodamientos ruedas delanteras
            responsesMap['r4_a_direccion'] || "NA",            // 31: Alineación: Dirección
            responsesMap['r4_l_agua_bateria'] || "NA",         // 32: Líquidos: Agua Batería
            responsesMap['r4_l_refrigerante_limpiaparabrisas'] || "NA", // 33: Líquidos: Liquido Refrigerante y LimpiaParabrisas
            responsesMap['r4_l_aceites'] || "NA",              // 34: Líquidos: Aceites de dirección, Caja y Diferencial
            responsesMap['r4_t_frenos'] || "NA",               // 35: Tensión: Frenos
            responsesMap['r4_t_correas_motor'] || "NA",        // 36: Tensión: Correas Motor
            responsesMap['r4_t_embrague'] || "NA",             // 37: Tensión: Embrague y/o calibrar varillaje
            responsesMap['r4_i_luces'] || "NA",                // 38: Inspección: Luces Delanteras, Traseras
            responsesMap['r4_i_luces_tablero'] || "NA",        // 39: Inspección: Luces e Indicadores de Tablero
            responsesMap['r4_i_tuberias_mangueras_refrigeracion'] || "NA", // 40: Inspección: Tuberías y Mangueras Refrigeración
            responsesMap['r4_i_tuberias_mangueras_aceite'] || "NA", // 41: Inspección: Tuberías y Mangueras Aceite
            responsesMap['r4_i_sistema_admision_escape'] || "NA", // 42: Inspección: Sistema Admisión y Escape
            responsesMap['r4_i_terminales_rotulas'] || "NA",    // 43: Inspección: Terminales y Rótulas
            responsesMap['r4_i_fugas'] || "NA",                // 44: Inspección: Fugas de aire y aceites
            responsesMap['r4_i_suspension'] || "NA",           // 45: Inspección: Suspensión en General
            responsesMap['r4_i_marcha_minima'] || "NA",        // 46: Inspección: Marcha Mínima motor
            responsesMap['r4_i_presion_llantas'] || "NA",      // 47: Inspección: Presión y labrado llantas
            responsesMap['r4_i_rotar_llantas'] || "NA",        // 48: Inspección: Rotar llantas
            responsesMap['r4_i_freno_motor'] || "NA",          // 49: Inspección: Freno de motor
            responsesMap['r4_i_varillaje_direccion'] || "NA"   // 50: Inspección: Varillaje dirección
          ];
        }
        else if (d.templateId === 'rutina_3') {
          sheetName = "RUTINA 3";
          
          rowData = [
            d.id,                                              // 0: ID_EJECUCION
            d.date,                                            // 1: FECHA
            d.plate,                                           // 2: PLACA
            d.taller || d.driverName || "",                    // 3: TALLER
            d.cd || "",                                        // 4: CENTRO_DISTRIBUCION
            d.contractor || "",                                // 5: CONTRATISTA
            d.frequency || "5.000 km",                         // 6: FRECUENCIA
            d.mileage || "",                                   // 7: KILOMETRAJE_ACTUAL
            (d.score !== undefined ? d.score + "%" : "0%"),     // 8: CALIFICACION_CUMPLIMIENTO
            (d.hasFailures ? "SI" : "NO"),                     // 9: TIENE_FALLAS
            d.notes || "",                                     // 10: OBSERVACIONES_GENERALES
            imgSignature || "",                                // 11: FIRMA_DIGITAL
            imgEvidence || "",                                 // 12: EVIDENCIA_VISUAL
            
            // Checklist Items
            responsesMap['r3_c_aceite_motor'] || "NA",         // 13: Aceite Motor
            responsesMap['r3_c_filtro_aceite'] || "NA",        // 14: Filtro de aceite
            responsesMap['r3_c_filtro_primario'] || "NA",      // 15: Filtro combustible primario
            responsesMap['r3_c_filtro_secundario'] || "NA",    // 16: Filtro combustible secundario o trampa de agua
            responsesMap['r3_i_filtro_aire'] || "NA",          // 17: Filtro de aire primario
            responsesMap['r3_e_suspension'] || "NA",           // 18: General Suspensión y rodamientos ruedas delanteras
            responsesMap['r3_e_articulaciones'] || "NA",       // 19: Articulaciones, Crucetas, Cardanes, Bujes y Pasadores
            responsesMap['r3_l_agua_bateria'] || "NA",         // 20: Agua Batería
            responsesMap['r3_l_refrigerante'] || "NA",         // 21: Liquido Refrigerante y LimpiaParabrisas
            responsesMap['r3_l_aceites_direccion'] || "NA",    // 22: Aceites de dirección, Caja y Diferencial
            responsesMap['r3_t_frenos'] || "NA",               // 23: Frenos
            responsesMap['r3_t_correas'] || "NA",              // 24: Correas Motor
            responsesMap['r3_t_embrague'] || "NA",             // 25: Embrague y/o calibrar varillaje
            responsesMap['r3_i_luces'] || "NA",                // 26: Luces Delanteras, Traseras y furgón
            responsesMap['r3_i_luces_tablero'] || "NA",        // 27: Luces e Indicadores de Tablero
            responsesMap['r3_i_mangueras_ref'] || "NA",        // 28: Tuberías y Mangueras Refrigeración y la Concentración de refrigerante
            responsesMap['r3_i_mangueras_aceite'] || "NA",     // 29: Tuberías y Mangueras Aceite
            responsesMap['r3_i_terminales_rotulas'] || "NA",   // 30: Terminales y Rotulas
            responsesMap['r3_i_suspension'] || "NA",           // 31: Suspensión en General
            responsesMap['r3_i_admision_escape'] || "NA",      // 32: Sistema Admisión y Escape (Conductos y Turbo)
            responsesMap['r3_i_fugas'] || "NA",                // 33: Fugas de aire y aceites
            responsesMap['r3_i_marcha_minima'] || "NA",        // 34: Marcha Mínima motor
            responsesMap['r3_i_direccion'] || "NA",            // 35: Dirección
            responsesMap['r3_i_freno_motor'] || "NA",          // 36: Funcionamiento Freno de Motor
            responsesMap['r3_i_varillaje_direccion'] || "NA",  // 37: Varillaje Dirección
            responsesMap['r3_i_sistema_combustible'] || "NA"   // 38: Sistema Combustible (Abrazaderas y Mangueras)
          ];
        }
        else if (d.templateId === 'rutina_2') {
          sheetName = "RUTINA 2";
          
          rowData = [
            d.id,                                              // 0: ID_EJECUCION
            d.date,                                            // 1: Fecha de Registro
            d.cd || "",                                        // 2: Centro de Distribución (CD)
            d.plate,                                           // 3: Placa
            d.templateName || "Rutina 2",                       // 4: Tipo de Rutina
            d.frequency || "5.000 km",                         // 5: Frecuencia
            d.mileage || "",                                   // 6: Kilometraje Actual
            d.taller || d.driverName || "",                    // 7: TALLER
            d.contractor || "",                                // 8: Contratista / Empresa
            
            // Checklist Items
            responsesMap['r2_c_aceite_motor'] || "NA",         // 9: Cambio: Aceite Motor
            responsesMap['r2_c_filtro_aceite'] || "NA",        // 10: Cambio: Filtro de aceite
            responsesMap['r2_c_filtro_primario'] || "NA",      // 11: Cambio: Filtro combustible primario
            responsesMap['r2_c_filtro_secundario'] || "NA",    // 12: Cambio: Filtro combustible secundario o trampa de agua
            responsesMap['r2_c_filtro_aire_primario'] || "NA", // 13: Cambio: Filtro de aire primario
            responsesMap['r2_e_suspension_rodamientos'] || "NA", // 14: Engrase: General Suspensión y rodamientos ruedas delanteras
            responsesMap['r2_e_articulaciones'] || "NA",       // 15: Engrase: Articulaciones, Crucetas, Cardanes, Bujes y Pasadores
            responsesMap['r2_l_agua_bateria'] || "NA",         // 16: Líquidos: Agua Batería
            responsesMap['r2_l_refrigerante'] || "NA",         // 17: Líquidos: Liquido Refrigerante y LimpiaParabrisas
            responsesMap['r2_l_aceites_direccion'] || "NA",    // 18: Líquidos: Aceites de dirección, Caja y Diferencial
            responsesMap['r2_t_frenos'] || "NA",               // 19: Tensión: Frenos
            responsesMap['r2_t_correas'] || "NA",              // 20: Tensión: Correas Motor
            responsesMap['r2_t_embrague'] || "NA",             // 21: Tensión: Embrague y/o calibrar varillaje (según parámetros)
            responsesMap['r2_i_luces'] || "NA",                // 22: Inspección: Luces Delanteras, Traseras y furgon
            responsesMap['r2_i_luces_tablero'] || "NA",        // 23: Inspección: Luces e Indicadores de Tablero
            responsesMap['r2_i_mangueras_ref'] || "NA",        // 24: Inspección: Tuberías y Mangueras Refrigeración y la Concentración
            responsesMap['r2_i_mangueras_aceite'] || "NA",     // 25: Inspección: Tuberías y Mangueras Aceite
            responsesMap['r2_i_terminales_rotulas'] || "NA",   // 26: Inspección: Terminales y Rotulas
            responsesMap['r2_i_suspension'] || "NA",           // 27: Inspección: Suspensión en General
            responsesMap['r2_i_admision_escape'] || "NA",      // 28: Inspección: Sistema Admisión y Escape (Conductos y Turbo)
            responsesMap['r2_i_fugas'] || "NA",                // 29: Inspección: Fugas de aire y aceites
            responsesMap['r2_i_marcha_minima'] || "NA",        // 30: Inspección: Marcha Mínima motor
            responsesMap['r2_i_direccion'] || "NA",            // 31: Inspección: Dirección
            responsesMap['r2_i_freno_motor'] || "NA",          // 32: Inspección: Funcionamiento Freno de Motor
            responsesMap['r2_i_varillaje_direccion'] || "NA",  // 33: Inspección: Varillaje Dirección
            responsesMap['r2_i_sistema_combustible'] || "NA",  // 34: Inspección: Sistema Combustible (Abrazaderas y Mangueras)
            imgEvidence || "",                                 // 35: Evidencia Fotográfica
            imgSignature || ""                                 // 36: Firma Digital
          ];
        }
        else if (d.templateId === 'rutina_1') {
          sheetName = "RUTINA 1";
          
          rowData = [
            d.id,                                              // 0: ID_EJECUCION
            d.date,                                            // 1: FECHA
            d.plate,                                           // 2: PLACA
            d.taller || d.driverName || "",                    // 3: TALLER
            d.mileage || "",                                   // 4: KILOMETRAJE
            d.frequency || "5.000 km",                         // 5: FRECUENCIA
            d.cd || "",                                        // 6: CENTRO_DISTRIBUCION
            d.contractor || "",                                // 7: CONTRATISTA
            (d.score !== undefined ? d.score + "%" : "0%"),     // 8: CUMPLIMIENTO
            (d.hasFailures ? "SI" : "NO"),                     // 9: TIENE_FALLAS
            d.notes || "",                                     // 10: OBSERVACIONES_GENERALES
            
            // Checklist Items
            responsesMap['r1_c_aceite_motor'] || "NA",         // 11: CAMBIO_ACEITE_MOTOR
            responsesMap['r1_c_filtro_aceite'] || "NA",        // 12: CAMBIO_FILTRO_ACEITE
            responsesMap['r1_c_filtro_primario'] || "NA",      // 13: CAMBIO_FILTRO_PRIMARIO
            responsesMap['r1_c_filtro_secundario'] || "NA",    // 14: CAMBIO_FILTRO_SECUNDARIO
            responsesMap['r1_e_suspension'] || "NA",           // 15: ENGRASE_SUSPENSION
            responsesMap['r1_e_articulaciones'] || "NA",       // 16: ENGRASE_ARTICULACIONES
            responsesMap['r1_l_agua_bateria'] || "NA",         // 17: LIQUIDOS_AGUA_BATERIA
            responsesMap['r1_l_refrigerante'] || "NA",         // 18: LIQUIDOS_REFRIGERANTE
            responsesMap['r1_l_aceites_direccion'] || "NA",    // 19: LIQUIDOS_ACEITE_DIRECCION
            responsesMap['r1_t_frenos'] || "NA",               // 20: TENSION_FRENOS
            responsesMap['r1_t_correas'] || "NA",              // 21: TENSION_CORREAS_MOTOR
            responsesMap['r1_t_embrague'] || "NA",             // 22: TENSION_EMBRAGUE
            responsesMap['r1_i_filtro_aire'] || "NA",          // 23: INSPEC_FILTRO_AIRE
            responsesMap['r1_i_luces'] || "NA",                // 24: INSPEC_LUCES
            responsesMap['r1_i_luces_tablero'] || "NA",        // 25: INSPEC_LUCES_TABLERO
            responsesMap['r1_i_mangueras_ref'] || "NA",        // 26: INSPEC_MANGUERAS_REFRIGERACION
            responsesMap['r1_i_mangueras_aceite'] || "NA",     // 27: INSPEC_MANGUERAS_ACEITE
            responsesMap['r1_i_admision_escape'] || "NA",      // 28: INSPEC_ADMISION_ESCAPE
            responsesMap['r1_i_terminales_rotulas'] || "NA",   // 29: INSPEC_TERMINALES_ROTULAS
            responsesMap['r1_i_fugas'] || "NA",                // 30: INSPEC_FUGAS
            responsesMap['r1_i_suspension'] || "NA",           // 31: INSPEC_SUSPENSION_GRAL
            responsesMap['r1_i_marcha_minima'] || "NA",        // 32: INSPEC_MARCHA_MINIMA
            responsesMap['r1_i_presion_llantas'] || "NA",      // 33: INSPEC_PRESION_LLANTAS
            imgEvidence || "",                                 // 34: EVIDENCIA_FOTO
            imgSignature || ""                                 // 35: FIRMA_DIGITAL
          ];
        }
        
        if (sheetName) {
          var s = getS(ss, sheetName);
          s.appendRow(rowData);
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Registro de rutina agregado exitosamente en " + sheetName);
        } else {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Nombre de plantilla desconocido: " + d.templateId);
        }
      }
      else if (m === 'POST_MILEAGE') {
        var s = getSheetByGid(ss, "1929496440") || getS(ss, "KILOMETRAJE");
        s.appendRow([d.cd, d.contractor, d.week, d.date, d.plate, d.mileage]);
      }
      else if (m === 'POST_CLEANING') {
        var s = getSheetByGid(ss, "1853969081") || getS(ss, "CRONOGRAMA 5S");
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();
        
        // d.date viene como YYYY-MM-DD
        var dateParts = d.date.split("-");
        var searchYear = parseInt(dateParts[0]);
        var searchMonth = parseInt(dateParts[1]);
        var searchDay = parseInt(dateParts[2]);
        
        log("Buscando limpieza: " + plateSearch + " para fecha " + d.date);
        
        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][3] || "").toString().toUpperCase().trim();
          if (rowPlate !== plateSearch) continue;

          var rowDateRaw = rows[i][0];
          var matchDate = false;
          
          if (rowDateRaw instanceof Date) {
            // Comparación por componentes para evitar errores de zona horaria
            if (rowDateRaw.getFullYear() === searchYear && 
                (rowDateRaw.getMonth() + 1) === searchMonth && 
                rowDateRaw.getDate() === searchDay) {
              matchDate = true;
            }
          } else {
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
        var finalStatus = (imgIni && imgFin && imgIni.startsWith("http") && imgFin.startsWith("http")) ? "COMPLETADO" : "PENDIENTE";
        
        if (foundIdx !== -1) {
          s.getRange(foundIdx, 5).setValue(finalStatus); 
          s.getRange(foundIdx, 6).setValue(imgIni);      
          s.getRange(foundIdx, 7).setValue(imgFin);      
          log("Fila encontrada y actualizada: " + foundIdx);
        } else {
          var rowData = [d.date, d.month || "", d.week, d.plate, finalStatus, imgIni, imgFin];
          s.appendRow(rowData);
          log("No se encontró fila pre-existente. Se creó una nueva al final.");
        }
      }
      else if (m === 'POST_WASH') {
        var s = getS(ss, "LAVADOS");
        s.appendRow([d.id, d.month, d.week, d.date, d.plate, sImg(d.evidenceUrl, "LAVADO_" + d.plate), sImg(d.mapUrl, "MAPA_LAVADO_" + d.plate), d.workshop]);
      }
      else if (m === 'POST_CALIBRATION_UPDATE') {
        var s = getSheetByGid(ss, "505557891") || getS(ss, "CALIBRACIONES");
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
          } else {
            if (rowDateRaw.toString().indexOf(dateSearch) !== -1) matchDate = true;
          }
          
          if (matchDate) {
            foundIdx = i + 1;
            break;
          }
        }
        
        var img = sImg(d.certificateUrl, "CALIB_" + d.plate);
        if (foundIdx !== -1) {
          s.getRange(foundIdx, 5).setValue(d.taller); // TALLER INDICE 4 (Columna 5)
          s.getRange(foundIdx, 6).setValue(img);      // FOTO INDICE 5 (Columna 6)
          s.getRange(foundIdx, 7).setValue("COMPLETADO"); // ESTADO INDICE 6 (Columna 7)
          
          // Actualizar metadatos si cambiaron
          s.getRange(foundIdx, 1).setValue(d.month);
          s.getRange(foundIdx, 2).setValue(d.calibrationDate);
          s.getRange(foundIdx, 3).setValue(d.week);
          s.getRange(foundIdx, 4).setValue(d.plate);
        } else {
          s.appendRow([d.month, d.calibrationDate, d.week, d.plate, d.taller, img, "COMPLETADO"]);
        }
      }
      else if (m === 'POST_CALIBRATION') {
        var s = getSheetByGid(ss, "505557891") || getS(ss, "CALIBRACIONES");
        s.appendRow([d.month, d.calibrationDate, d.week, d.plate, d.taller || d.equipment, sImg(d.certificateUrl, "CALIB_" + d.plate), "COMPLETADO"]);
      }
      else if (m === 'POST_UNAVAILABILITY_BATCH') {
        var ssUnav = SpreadsheetApp.openById("1mE8aBo0DG5Lk3GUHAGegwuBnk4vEhjOA_xj2lvvtcV0");
        var s = ssUnav.getSheetByName("INDISPONIBILIDAD");
        if (!s) {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "Hoja INDISPONIBILIDAD no encontrada");
        }
        if (d && d.length > 0) {
          s.getRange(s.getLastRow() + 1, 1, d.length, d[0].length).setValues(d);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("success", "Lote de indisponibilidad procesado.");
      }
      else if (m === 'POST_AUDIT_UPDATE') {
        var docId = cleanId(d.docId || '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs');
        var auditSS = SpreadsheetApp.openById(docId);
        var s = getS(auditSS, "ESTANDAR");
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
          // Columnas Novedad Auditoría:
          // Col 73 (BU): Fecha Novedad
          // Col 74 (BV): Estado (REALIZADO/PENDIENTE)
          // Col 75 (BW): Evidencia (Link)
          // Col 76 (BX): Observación Novedad

          if (d.status) s.getRange(foundIdx, 74).setValue(d.status); 
          if (d.noveltyObservation) s.getRange(foundIdx, 76).setValue(d.noveltyObservation);
          if (d.noveltyDate) s.getRange(foundIdx, 73).setValue(d.noveltyDate);
          
          if (d.evidence) {
            var evidenceUrl = "";
            if (Array.isArray(d.evidence)) {
              var links = [];
              for(var j=0; j<d.evidence.length; j++) {
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
            s.getRange(foundIdx, 75).setValue(evidenceUrl); // SIEMPRE EN BW (75)
          }
          
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Audit record updated in column BW for row " + foundIdx);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "Auditoria no encontrada con ID: " + idSearch);
      }
      else if (m === 'POST_CONTROL_TOWER_UPDATE') {
        var targetDocId = cleanId(d.docId || '1LdneoDkFwIdYf-7Xii94an5hzwuL2BqQlKqK2DQ3G60');
        var ssCT = SpreadsheetApp.openById(targetDocId);
        var s = ssCT.getSheetByName("CIERRE DE NOVEDADES") || ssCT.getSheets()[0];
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var plateSearch = (d.plate || "").toString().toUpperCase().trim();
        var noveltySearch = (d.novelty || "").toString().trim();
        var dateSearch = (d.reportDate || "").toString().trim();

        for (var i = 1; i < rows.length; i++) {
          var rowPlate = (rows[i][5] || "").toString().toUpperCase().trim();
          var rowNovelty = (rows[i][7] || "").toString().trim();
          var rowDateRaw = rows[i][2];
          var rowDateStr = "";
          
          if (rowDateRaw instanceof Date) {
            rowDateStr = Utilities.formatDate(rowDateRaw, ssCT.getSpreadsheetTimeZone(), "yyyy-MM-dd");
          } else if (rowDateRaw) {
            rowDateStr = rowDateRaw.toString();
          }

          if (rowPlate === plateSearch && rowNovelty === noveltySearch && rowDateStr.indexOf(dateSearch) !== -1) {
            foundIdx = i + 1;
            break;
          }
        }

        if (foundIdx !== -1) {
          if (d.evidenceBefore) {
            var imgBefore = sImg(d.evidenceBefore, "CT_BEFORE_" + plateSearch);
            s.getRange(foundIdx, 20).setValue(imgBefore); // Col T (20)
          }
          if (d.evidenceAfter) {
            var imgAfter = sImg(d.evidenceAfter, "CT_AFTER_" + plateSearch);
            s.getRange(foundIdx, 21).setValue(imgAfter); // Col U (21)
          }
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Evidencias actualizadas en fila " + foundIdx);
        } else {
          if (lock.hasLock()) lock.releaseLock();
          return output("error", "No se encontró el registro para " + plateSearch + " (" + dateSearch + ")");
        }
      }
      else if (m === 'POST_FLEET_CIERRE_UPDATE') {
        var docId = cleanId(d.docId || '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs');
        var ssA = SpreadsheetApp.openById(docId);
        var s = ssA.getSheetByName("CIERRE");
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
            if (rowStatus === "PENDIENTE") {
              break;
            }
          }
        }

        if (foundIdx !== -1) {
          if (d.evidence) {
            var evidenceUrl = "";
            if (Array.isArray(d.evidence)) {
              var links = [];
              for(var j=0; j<d.evidence.length; j++) {
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
            s.getRange(foundIdx, 7).setValue(evidenceUrl); // Col G (Index 7)
          }
          
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Audit closure updated in sheet CIERRE for row " + foundIdx);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró registro en CIERRE para: Placa " + plateSearch + ", Item " + itemSearch);
      }
      else if (m === 'POST_CALIDAD_CIERRE_UPDATE') {
        var docId = cleanId(d.docId || '1HnykQOrnSZQTwY8uYa-JUpVr_tEr2K3QyZliltI06BM');
        var ssA = SpreadsheetApp.openById(docId);
        var s = ssA.getSheetByName("CIERRE1");
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
            if (rowStatus === "PENDIENTE") {
              break;
            }
          }
        }

        if (foundIdx !== -1) {
          if (d.evidence) {
            var evidenceUrl = "";
            if (Array.isArray(d.evidence)) {
              var links = [];
              for(var j=0; j<d.evidence.length; j++) {
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
            s.getRange(foundIdx, 6).setValue(evidenceUrl); // Col F (Index 6)
          }
          
          if (lock.hasLock()) lock.releaseLock();
          return output("success", "Audit closure updated in sheet CIERRE1 for row " + foundIdx);
        }
        if (lock.hasLock()) lock.releaseLock();
        return output("error", "No se encontró registro en CIERRE1 para: Placa " + plateSearch + ", Item " + itemSearch);
      }
      else if (m === 'POST_FLEET_STANDARD_AUDIT_UPDATE') {
        var docId = cleanId(d.docId || '1y58Rna0-JfBNVBbh6Pt381cHqQWGTupkSVUQYsK1nxs');
        var ssA = SpreadsheetApp.openById(docId);
        // Prioritize "ESTRANDAR" as the user explicitly mentioned it, then fallback to "ESTANDAR" or first sheet.
        var s = ssA.getSheetByName("ESTRANDAR") || ssA.getSheetByName("ESTANDAR") || ssA.getSheets()[0];
        var rows = s.getDataRange().getValues();
        var foundIdx = -1;
        var idVal = (d.id || "").toString().trim().toUpperCase();
        var plateVal = (d.placa || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

        for (var i = 1; i < rows.length; i++) {
          var rowId = (rows[i][0] || "").toString().trim().toUpperCase();
          var rowPlate = (rows[i][8] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, ""); // Col I
          
          if (idVal && !idVal.startsWith("STD-AUDIT-") && rowId === idVal) {
            foundIdx = i + 1;
            break;
          }
          if (plateVal && rowPlate === plateVal) {
             foundIdx = i + 1;
             // Check status (Col CK - index 88)
             var rowStatus = (rows[i][88] || "").toString().trim().toUpperCase();
             if (rowStatus === "PENDIENTE" || rowStatus === "ABIERTO" || rowStatus === "") {
               // If it's pending, this is definitely the one we want to close
               break; 
             }
             // If not pending, keep searching for a pending one, but remember this index as fallback
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
        return output("error", "No se encontró auditoria " + idSearch);
      }
      else if (m === 'UPLOAD_IMAGE') {
        var url = sImg(d.base64, d.name);
        if (lock.hasLock()) lock.releaseLock();
        return output("success", url);
      }
    }

    lock.releaseLock();
    return output("success", "Datos procesados.");
  } catch (e) {
    if (lock.hasLock()) lock.releaseLock();
    return output("error", e.toString());
  }
}

function getSheetByGid(ss, gid) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId().toString() === gid.toString()) {
      return sheets[i];
    }
  }
  return null;
}

function sImg(base64, name) {
  if (!base64 || base64.length < 100 || base64.startsWith("http")) return base64;
  try {
    var folderName = "BQA_COMPROBANTES_FLOTA";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    var mimeType = base64.substring(5, base64.indexOf(';'));
    var bytes = Utilities.base64Decode(base64.split(',')[1]);
    var blob = Utilities.newBlob(bytes, mimeType, name + "_" + Date.now() + (mimeType === 'application/pdf' ? '.pdf' : '.jpg'));
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

function today() { return Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd"); }

function output(status, message) {
  return ContentService.createTextOutput(JSON.stringify({status: status, message: message})).setMimeType(ContentService.MimeType.JSON);
}
