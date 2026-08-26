/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT DEDICADO: MÓDULO DE RUTINAS DE MANTENIMIENTO PREVENTIVO
 * =========================================================================================
 * 
 * Este script procesa y almacena exclusivamente los registros de:
 *  - RUTINA 1: Mantenimiento Preventivo Básico
 *  - RUTINA 2: Mantenimiento Preventivo Intermedio
 *  - RUTINA 3: Mantenimiento Preventivo Integral
 *  - RUTINA 4: Mantenimiento Preventivo Avanzado / Especializado
 *  - PREVENTIVO: Actualizaciones de ejecución de preventivos
 * 
 * INSTRUCCIONES DE IMPLEMENTACIÓN:
 * 1. Abre tu hoja de cálculo de Google Sheets de Rutinas (o crea un proyecto en script.google.com).
 * 2. En Google Sheets ve a: Extensiones > Apps Script.
 * 3. Borra cualquier código existente y pega TODO este archivo.
 * 4. Si el script no está vinculado directamente a la hoja, coloca el ID de tu hoja en ID_HOJA_DEFAULT.
 * 5. Haz clic en "Implementar" > "Nueva implementación" (Deploy > New deployment).
 * 6. Selecciona tipo "Aplicación web" (Web app).
 * 7. Configura:
 *    - Ejecutar como: "Yo" (Tu cuenta de Google / Me).
 *    - Quién tiene acceso: "Cualquier usuario" (Anyone / Incluso anónimo).
 * 8. Copia la URL generada (termina en /exec) y pégala en la aplicación web.
 * =========================================================================================
 */

// ID por defecto de la hoja de cálculo de Rutinas (si el script no está vinculado a la hoja)
var ID_HOJA_DEFAULT = "1IKgWuUo5r0ofd8T95bJbstDn7FXigWLJGbr_mWoaFzE";

// Nombre de la carpeta en Google Drive donde se guardarán las fotos de evidencia y firmas
var CARPETA_DRIVE_EVIDENCIAS = "RUTINAS_EVIDENCIAS_FLOTA";

/**
 * Encabezados oficiales para cada pestaña de Rutina
 */
var HEADERS_RUTINAS = {
  "RUTINA 1": [
    "ID_REGISTRO", "FECHA", "PLACA", "TALLER_RESPONSABLE", "KILOMETRAJE", "FRECUENCIA", "CENTRO_DISTRIBUCION", "CONTRATISTA",
    "PUNTAJE", "TIENE_FALLAS", "OBSERVACIONES",
    "C_ACEITE_MOTOR", "C_FILTRO_ACEITE", "C_FILTRO_PRIMARIO", "C_FILTRO_SECUNDARIO",
    "E_SUSPENSION", "E_ARTICULACIONES", "L_AGUA_BATERIA", "L_REFRIGERANTE", "L_ACEITES_DIRECCION",
    "T_FRENOS", "T_CORREAS", "T_EMBRAGUE", "I_FILTRO_AIRE", "I_LUCES", "I_LUCES_TABLERO",
    "I_MANGUERAS_REF", "I_MANGUERAS_ACEITE", "I_ADMISION_ESCAPE", "I_TERMINALES_ROTULAS",
    "I_FUGAS", "I_SUSPENSION", "I_MARCHA_MINIMA", "I_PRESION_LLANTAS",
    "URL_EVIDENCIA_FOTOS", "URL_FIRMA_DIGITAL"
  ],
  "RUTINA 2": [
    "ID_REGISTRO", "FECHA", "CENTRO_DISTRIBUCION", "PLACA", "NOMBRE_RUTINA", "FRECUENCIA", "KILOMETRAJE", "TALLER_RESPONSABLE", "CONTRATISTA",
    "C_ACEITE_MOTOR", "C_FILTRO_ACEITE", "C_FILTRO_PRIMARIO", "C_FILTRO_SECUNDARIO", "C_FILTRO_AIRE_PRIMARIO",
    "E_SUSPENSION_RODAMIENTOS", "E_ARTICULACIONES", "L_AGUA_BATERIA", "L_REFRIGERANTE", "L_ACEITES_DIRECCION",
    "T_FRENOS", "T_CORREAS", "T_EMBRAGUE", "I_LUCES", "I_LUCES_TABLERO", "I_MANGUERAS_REF", "I_MANGUERAS_ACEITE",
    "I_TERMINALES_ROTULAS", "I_SUSPENSION", "I_ADMISION_ESCAPE", "I_FUGAS", "I_MARCHA_MINIMA", "I_DIRECCION",
    "I_FRENO_MOTOR", "I_VARILLAJE_DIRECCION", "I_SISTEMA_COMBUSTIBLE",
    "URL_EVIDENCIA_FOTOS", "URL_FIRMA_DIGITAL"
  ],
  "RUTINA 3": [
    "ID_REGISTRO", "FECHA", "PLACA", "TALLER_RESPONSABLE", "CENTRO_DISTRIBUCION", "CONTRATISTA", "FRECUENCIA", "KILOMETRAJE",
    "PUNTAJE", "TIENE_FALLAS", "OBSERVACIONES", "URL_FIRMA_DIGITAL", "URL_EVIDENCIA_FOTOS",
    "C_ACEITE_MOTOR", "C_FILTRO_ACEITE", "C_FILTRO_PRIMARIO", "C_FILTRO_SECUNDARIO", "I_FILTRO_AIRE",
    "E_SUSPENSION", "E_ARTICULACIONES", "L_AGUA_BATERIA", "L_REFRIGERANTE", "L_ACEITES_DIRECCION",
    "T_FRENOS", "T_CORREAS", "T_EMBRAGUE", "I_LUCES", "I_LUCES_TABLERO", "I_MANGUERAS_REF", "I_MANGUERAS_ACEITE",
    "I_TERMINALES_ROTULAS", "I_SUSPENSION", "I_ADMISION_ESCAPE", "I_FUGAS", "I_MARCHA_MINIMA", "I_DIRECCION",
    "I_FRENO_MOTOR", "I_VARILLAJE_DIRECCION", "I_SISTEMA_COMBUSTIBLE"
  ],
  "RUTINA 4": [
    "ID_REGISTRO", "FECHA", "CENTRO_DISTRIBUCION", "PLACA", "NOMBRE_RUTINA", "FRECUENCIA", "TALLER_RESPONSABLE", "KILOMETRAJE",
    "PUNTAJE", "TIENE_FALLAS", "DETALLE_FALLAS", "URL_EVIDENCIA_FOTOS", "URL_FIRMA_DIGITAL", "OBSERVACIONES",
    "C_ACEITE_MOTOR", "C_FILTRO_ACEITE", "C_FILTRO_AIRE_SECUNDARIO", "C_FILTRO_ACEITE_HIDRAULICO", "C_FILTRO_TRANSMISION",
    "C_ACEITE_DIRECCION", "C_CORREAS_MOTOR", "C_LIQUIDO_REFRIGERANTE", "C_FILTRO_AIRE_PRIMARIO", "C_FILTRO_COMBUSTIBLE_PRIMARIO",
    "C_FILTRO_COMBUSTIBLE_SECUNDARIO", "C_ACEITE_DIFERENCIAL", "C_ACEITE_CAJA_VELOCIDADES", "C_FILTRO_AIRE_COMPRESOR",
    "E_GENERAL_SUSPENSION", "E_ARTICULACIONES", "E_RODAMIENTOS_DELANTEROS", "A_DIRECCION", "L_AGUA_BATERIA",
    "L_REFRIGERANTE_LIMPIAPARABRISAS", "L_ACEITES", "T_FRENOS", "T_CORREAS_MOTOR", "T_EMBRAGUE", "I_LUCES",
    "I_LUCES_TABLERO", "I_TUBERIAS_MANGUERAS_REFRIGERACION", "I_TUBERIAS_MANGUERAS_ACEITE", "I_SISTEMA_ADMISION_ESCAPE",
    "I_TERMINALES_ROTULAS", "I_FUGAS", "I_SUSPENSION", "I_MARCHA_MINIMA", "I_PRESION_LLANTAS", "I_ROTAR_LLANTAS",
    "I_FRENO_MOTOR", "I_VARILLAJE_DIRECCION"
  ]
};

/**
 * Petición GET: Comprobación de estado y consulta de datos
 */
function doGet(e) {
  var params = e ? e.parameter : {};
  var action = params.action || params.method || "ping";
  var docId = cleanSpreadsheetId(params.docId || ID_HOJA_DEFAULT);

  if (action === "ping" || action === "status") {
    return createJsonResponse({
      status: "success",
      message: "Google Apps Script de RUTINAS DE MTTO PREVENTIVO activo y operando correctamente.",
      timestamp: new Date().toISOString(),
      docId: docId
    });
  }

  // Consulta de datos de una pestaña de rutina
  if (action === "get_rutina" || action === "GET_DATA") {
    try {
      var ss = getSpreadsheet(docId);
      if (!ss) {
        return createJsonResponse({ status: "error", message: "No se pudo abrir la hoja con ID: " + docId });
      }
      var sheetName = params.sheet || params.sheetName || "RUTINA 1";
      var sheet = findSheetCaseInsensitive(ss, sheetName);
      if (!sheet) {
        return createJsonResponse({ status: "error", message: "No se encontró la pestaña " + sheetName });
      }
      var data = sheet.getDataRange().getValues();
      return createJsonResponse({
        status: "success",
        sheetName: sheetName,
        totalRows: data.length,
        data: data
      });
    } catch (err) {
      return createJsonResponse({ status: "error", message: err.toString() });
    }
  }

  return createJsonResponse({
    status: "success",
    message: "Servicio de Rutinas disponible.",
    instructions: "Envía una petición POST con method='POST_ROUTINE' para guardar inspecciones."
  });
}

/**
 * Petición POST: Guardar Rutinas y Actualizaciones de Preventivo
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Espera hasta 30 segundos para adquirir el bloqueo y evitar colisiones
    lock.waitLock(30000);
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: "El servidor está ocupado procesando otra rutina. Por favor reintenta en unos segundos."
    });
  }

  try {
    var rawContents = "";
    if (e && e.postData && e.postData.contents) {
      rawContents = e.postData.contents;
    }

    var payload = {};
    if (rawContents) {
      try {
        payload = JSON.parse(rawContents);
      } catch (parseErr) {
        // Intenta parsear si viene como querystring
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var method = (payload.method || payload.action || "").toUpperCase().trim();
    var data = payload.data || payload;

    // Obtener hoja de cálculo destino
    var targetDocId = cleanSpreadsheetId(data.docId || payload.docId || ID_HOJA_DEFAULT);
    var ss = getSpreadsheet(targetDocId);

    if (!ss) {
      if (lock.hasLock()) lock.releaseLock();
      return createJsonResponse({
        status: "error",
        message: "No se pudo acceder al Google Spreadsheet (ID: " + targetDocId + ")."
      });
    }

    // -------------------------------------------------------------------------------------
    // MÉTODO: POST_ROUTINE (Guardado de Inspecciones de Rutina 1, 2, 3 o 4)
    // -------------------------------------------------------------------------------------
    if (method === "POST_ROUTINE" || method === "POSTROUTINE" || method === "POST_RUTINA" || method === "POSTRUTINA") {
      var d = data;
      var templateId = (d.templateId || "").toString().toLowerCase().trim();
      var sheetName = "RUTINA 1";

      if (templateId === "rutina_4" || templateId === "rutina 4" || templateId === "r4") {
        sheetName = "RUTINA 4";
      } else if (templateId === "rutina_3" || templateId === "rutina 3" || templateId === "r3") {
        sheetName = "RUTINA 3";
      } else if (templateId === "rutina_2" || templateId === "rutina 2" || templateId === "r2") {
        sheetName = "RUTINA 2";
      } else {
        sheetName = "RUTINA 1";
      }

      // Guardar imágenes en Google Drive
      var imgEvidence = saveBase64ToDrive(d.evidenceUrl, "ROUTINE_EV_" + (d.plate || "VEH"));
      var imgSignature = saveBase64ToDrive(d.signatureUrl, "ROUTINE_SIG_" + (d.plate || "VEH"));

      // Mapear respuestas
      var responsesMap = {};
      if (d.responses && Array.isArray(d.responses)) {
        for (var i = 0; i < d.responses.length; i++) {
          var resp = d.responses[i];
          if (resp && resp.itemId) {
            responsesMap[resp.itemId] = resp.status;
          }
        }
      }

      var rowData = [];

      // CONSTRUCCIÓN DE FILA SEGÚN LA RUTINA
      if (sheetName === "RUTINA 4") {
        var fails = [];
        if (d.responses && Array.isArray(d.responses)) {
          for (var j = 0; j < d.responses.length; j++) {
            var item = d.responses[j];
            if (item && item.status === "FAIL") {
              fails.push(item.itemId.replace(/r4_[c|e|a|l|t|i]_/g, '').toUpperCase());
            }
          }
        }
        var detailFailures = fails.join(", ");

        rowData = [
          d.id || ("RUT4-" + Date.now()),
          d.date || Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd"),
          d.cd || "",
          d.plate || "",
          d.templateName || "RUTINA 4: Mantenimiento Avanzado",
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
      else if (sheetName === "RUTINA 3") {
        rowData = [
          d.id || ("RUT3-" + Date.now()),
          d.date || Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd"),
          d.plate || "",
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
      else if (sheetName === "RUTINA 2") {
        rowData = [
          d.id || ("RUT2-" + Date.now()),
          d.date || Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd"),
          d.cd || "",
          d.plate || "",
          d.templateName || "RUTINA 2",
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
        // RUTINA 1 POR DEFECTO
        sheetName = "RUTINA 1";
        rowData = [
          d.id || ("RUT1-" + Date.now()),
          d.date || Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd"),
          d.plate || "",
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

      // Obtener o crear la pestaña con encabezados
      var sheet = getOrCreateSheetWithHeaders(ss, sheetName, HEADERS_RUTINAS[sheetName]);
      if (!sheet) {
        if (lock.hasLock()) lock.releaseLock();
        return createJsonResponse({
          status: "error",
          message: "No se pudo acceder ni crear la pestaña '" + sheetName + "'."
        });
      }

      // Insertar la fila
      sheet.appendRow(rowData);

      if (lock.hasLock()) lock.releaseLock();

      return createJsonResponse({
        status: "success",
        message: "Rutina registrada exitosamente en " + sheetName,
        sheet: sheetName,
        rowId: d.id,
        plate: d.plate,
        evidenceUrl: imgEvidence,
        signatureUrl: imgSignature
      });
    }

    // -------------------------------------------------------------------------------------
    // MÉTODO: POST_PREVENTIVE_UPDATE (Actualización de hoja de Preventivos)
    // -------------------------------------------------------------------------------------
    else if (method === "POST_PREVENTIVE_UPDATE") {
      var d = data;
      var sheetPreventivo = findSheetCaseInsensitive(ss, "PREVENTIVO") || ss.getSheetByName("PREVENTIVO");
      
      if (!sheetPreventivo) {
        if (lock.hasLock()) lock.releaseLock();
        return createJsonResponse({
          status: "error",
          message: "No se encontró la pestaña 'PREVENTIVO' en la hoja de cálculo."
        });
      }

      var plateSearch = (d.plate || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
      var dateSearch = (d.date || "").toString().trim();
      var pData = sheetPreventivo.getDataRange().getValues();
      var updated = false;

      var imgEvidencePrev = saveBase64ToDrive(d.evidence, "PREV_EV_" + plateSearch);

      for (var r = 1; r < pData.length; r++) {
        var rowPlate = (pData[r][1] || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
        var rowDate = "";
        if (pData[r][0] instanceof Date) {
          rowDate = Utilities.formatDate(pData[r][0], "GMT-5", "yyyy-MM-dd");
        } else {
          rowDate = (pData[r][0] || "").toString().split("T")[0].trim();
        }

        if (rowPlate === plateSearch && (dateSearch === "" || rowDate === dateSearch)) {
          // Actualizar estado a EJECUTADO y registrar datos
          sheetPreventivo.getRange(r + 1, 9).setValue("EJECUTADO"); // ESTADO
          if (d.currentKm) sheetPreventivo.getRange(r + 1, 5).setValue(d.currentKm); // KM REAL
          if (imgEvidencePrev) sheetPreventivo.getRange(r + 1, 10).setValue(imgEvidencePrev); // EVIDENCIA
          updated = true;
          break;
        }
      }

      if (lock.hasLock()) lock.releaseLock();

      if (updated) {
        return createJsonResponse({
          status: "success",
          message: "Mantenimiento preventivo actualizado a EJECUTADO para " + plateSearch
        });
      } else {
        return createJsonResponse({
          status: "warning",
          message: "No se encontró programación previa para " + plateSearch + ", pero la rutina quedó registrada."
        });
      }
    }

    // -------------------------------------------------------------------------------------
    // MÉTODO: UPLOAD_IMAGE (Subida directa de imágenes a Google Drive)
    // -------------------------------------------------------------------------------------
    if (method === "UPLOAD_IMAGE" || method === "UPLOADIMAGE") {
      var imgToSave = (data && (data.base64 || data.evidence || data.url)) || (payload && (payload.base64 || payload.evidence || payload.url)) || "";
      var imgName = (data && data.name) || (payload && payload.name) || "IMG_EVIDENCIA";
      var uploadedUrl = saveBase64ToDrive(imgToSave, imgName);
      if (lock.hasLock()) lock.releaseLock();
      return createJsonResponse({
        status: "success",
        message: uploadedUrl || imgToSave
      });
    }

    if (lock.hasLock()) lock.releaseLock();
    return createJsonResponse({
      status: "error",
      message: "Método desconocido: " + method
    });

  } catch (err) {
    if (lock.hasLock()) lock.releaseLock();
    return createJsonResponse({
      status: "error",
      message: "Error interno en el script: " + err.toString()
    });
  }
}

/**
 * Abre una hoja de cálculo por ID o retorna la activa
 */
function getSpreadsheet(docId) {
  if (docId) {
    try {
      return SpreadsheetApp.openById(docId);
    } catch (e) {
      Logger.log("Error abriendo por ID " + docId + ": " + e);
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    return null;
  }
}

/**
 * Busca una pestaña sin distinguir mayúsculas ni espacios adicionales
 */
function findSheetCaseInsensitive(ss, name) {
  if (!ss || !name) return null;
  var target = name.toString().toLowerCase().replace(/[\s_-]+/g, "");
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName().toLowerCase().replace(/[\s_-]+/g, "");
    if (sName === target) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * Obtiene una pestaña existente o la crea con sus encabezados si no existe
 */
function getOrCreateSheetWithHeaders(ss, name, headers) {
  if (!ss) return null;
  var sheet = findSheetCaseInsensitive(ss, name);
  
  if (!sheet) {
    try {
      sheet = ss.getSheetByName(name);
    } catch (e) {}
  }

  if (!sheet) {
    try {
      sheet = ss.insertSheet(name);
      if (headers && Array.isArray(headers) && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
        sheet.setFrozenRows(1);
      }
    } catch (e) {
      try {
        sheet = ss.getSheets()[0];
      } catch (e2) {}
    }
  } else {
    // Si la pestaña existe pero está totalmente vacía, insertar encabezados
    if (sheet.getLastRow() === 0 && headers && Array.isArray(headers) && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

/**
 * Guarda una cadena base64 en Google Drive como archivo y retorna su URL pública
 */
function saveBase64ToDrive(base64, name) {
  if (!base64 || typeof base64 !== "string") return "";
  if (base64.indexOf("http") === 0) return base64; // Si ya es una URL, retornarla directamente
  if (base64.length < 100) return "";

  try {
    var folderName = CARPETA_DRIVE_EVIDENCIAS;
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    var mimeType = "image/jpeg";
    var str = base64.toString();
    if (str.indexOf("data:") === 0 && str.indexOf(";") > 5) {
      mimeType = str.substring(5, str.indexOf(";"));
    }

    var parts = str.split(",");
    if (parts.length < 2) return "";

    var bytes = Utilities.base64Decode(parts[1]);
    var fileName = (name || "RUTINA_EVIDENCIA") + "_" + Date.now() + ".jpg";
    var blob = Utilities.newBlob(bytes, mimeType, fileName);

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    Logger.log("Error guardando imagen en Drive: " + err);
    return "";
  }
}

/**
 * Limpia y normaliza el ID de una hoja de cálculo
 */
function cleanSpreadsheetId(id) {
  if (!id) return ID_HOJA_DEFAULT;
  var str = id.toString().trim();
  var match = str.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return str;
}

/**
 * Genera la respuesta JSON con encabezados CORS para el navegador
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
