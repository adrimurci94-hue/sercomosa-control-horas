import * as XLSX from "xlsx";
import { CODIGOS, CONVENIOS, JORNADA_COMPLETA_SEMANAL, LIMITE_EXTRA_ANUAL, computeBolsa, tramoEnFecha, tramosEnMes, uid } from "./logic";

// -----------------------------------------------------------------------
// Importacion y exportacion de Excel: funciones trasladadas tal cual
// desde el prototipo. Los comentarios "por que HTML en vez de escribir
// xlsx binario" siguen aplicando: la libreria xlsx en el navegador no
// aplica bien los colores de celda, por eso el informe se genera como
// una tabla HTML con estilos, que Excel abre e interpreta perfectamente.
// -----------------------------------------------------------------------

export function colorEstado(restante, tope) {
  if (tope <= 0) return { bg: "#E4E7EC", text: "#667085" };
  const pct = restante / tope;
  if (restante < 0) return { bg: "#FECACA", text: "#991B1B" };
  if (pct < 0.2) return { bg: "#FECACA", text: "#991B1B" };
  if (pct < 0.5) return { bg: "#FDE68A", text: "#92400E" };
  return { bg: "#BBF7D0", text: "#166534" };
}

export function celdaPlano(valor, unidad, aplica) {
  if (!aplica) {
    return `<td style="background:#F3F4F6;color:#9CA3AF;font-style:italic;text-align:center;padding:10px 8px;border:1px solid #E5E7EB;">No aplica</td>`;
  }
  return `<td style="background:#FFFFFF;color:#374151;text-align:center;padding:10px 8px;border:1px solid #E5E7EB;font-weight:600;">${valor.toFixed(1)}${unidad}</td>`;
}

export function celdaRestante(restante, tope, aplica, unidad) {
  if (!aplica) {
    return `<td style="background:#F3F4F6;color:#9CA3AF;font-style:italic;text-align:center;padding:10px 8px;border:1px solid #E5E7EB;">No aplica</td>`;
  }
  const { bg, text } = colorEstado(restante, tope);
  return `<td style="background:${bg};color:${text};text-align:center;padding:10px 8px;border:1px solid #E5E7EB;font-weight:700;font-size:15px;">${restante.toFixed(1)}${unidad}</td>`;
}

export function exportarExcel(empleados, fechaCorte) {
  const anio = fechaCorte.slice(0, 4);
  const NAVY = "#1F3B57";
  const CONVENIO_BG = "#0F766E";
  const CONVENIO_LIGHT = "#CCFBF1";
  const GREY_HEADER = "#4A6178";
  const TOTAL_BG = "#334155";
  const NCOLS = 9;

  const porConvenio = {};
  empleados.forEach((e) => {
    porConvenio[e.convenio] = porConvenio[e.convenio] || [];
    porConvenio[e.convenio].push(e);
  });

  let seccionesHtml = "";

  const celdaTotal = (valor, unidad) =>
    `<td style="background:${TOTAL_BG};color:#FFFFFF;text-align:center;padding:10px 8px;border:1px solid #E5E7EB;font-weight:700;font-size:14px;">${valor.toFixed(1)}${unidad}</td>`;

  CONVENIOS.forEach((conv) => {
    const lista = (porConvenio[conv] || []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (lista.length === 0) return;

    let filasHtml = "";
    let sumTopeExtra = 0;
    let sumConsExtra = 0;
    let sumRestExtra = 0;
    let sumTopeCompl = 0;
    let sumConsCompl = 0;
    let sumRestCompl = 0;

    lista.forEach((emp) => {
      const bolsa = computeBolsa(emp, fechaCorte);
      const tramoActual = tramoEnFecha(emp, fechaCorte);
      const aplicaComplementaria = tramoActual?.tipo === "Parcial";

      const topeExtra = LIMITE_EXTRA_ANUAL;
      const consExtra = bolsa.extra.consumido;
      const restExtra = bolsa.extra.restanteHastaHoy;
      const topeCompl = bolsa.complementaria.disponibleHastaHoy;
      const consCompl = bolsa.complementaria.consumido;
      const restCompl = bolsa.complementaria.restanteHastaHoy;

      sumTopeExtra += topeExtra;
      sumConsExtra += consExtra;
      sumRestExtra += restExtra;
      if (aplicaComplementaria) {
        sumTopeCompl += topeCompl;
        sumConsCompl += consCompl;
        sumRestCompl += restCompl;
      }

      filasHtml += `<tr>
        <td style="padding:10px 12px;border:1px solid #E5E7EB;font-weight:600;color:#1F2937;">${emp.nombre}</td>
        <td style="padding:10px 12px;border:1px solid #E5E7EB;color:#6B7280;text-align:center;">${emp.sap}</td>
        <td style="padding:10px 12px;border:1px solid #E5E7EB;color:#6B7280;text-align:center;">${emp.numSercomosa || "—"}</td>
        ${celdaPlano(topeExtra, "h", true)}
        ${celdaPlano(consExtra, "h", true)}
        ${celdaRestante(restExtra, topeExtra, true, "h")}
        ${celdaPlano(topeCompl, "h", aplicaComplementaria)}
        ${celdaPlano(consCompl, "h", aplicaComplementaria)}
        ${celdaRestante(restCompl, topeCompl, aplicaComplementaria, "h")}
      </tr>`;
    });

    seccionesHtml += `
      <tr><td colspan="${NCOLS}" style="background:${CONVENIO_BG};color:#FFFFFF;font-weight:700;font-size:13px;padding:8px 12px;border:1px solid ${CONVENIO_BG};">${conv.toUpperCase()}</td></tr>
      <tr>
        <td colspan="3" style="background:${CONVENIO_LIGHT};color:${CONVENIO_BG};font-weight:700;font-size:10px;text-align:center;padding:6px;border:1px solid #E5E7EB;">TRABAJADOR</td>
        <td colspan="3" style="background:${CONVENIO_LIGHT};color:${CONVENIO_BG};font-weight:700;font-size:10px;text-align:center;padding:6px;border:1px solid #E5E7EB;">HORAS EXTRA (fijo 80h/año)</td>
        <td colspan="3" style="background:${CONVENIO_LIGHT};color:${CONVENIO_BG};font-weight:700;font-size:10px;text-align:center;padding:6px;border:1px solid #E5E7EB;">HORAS COMPLEMENTARIAS (hasta hoy)</td>
      </tr>
      <tr>
        <td style="background:${GREY_HEADER};color:#FFFFFF;font-weight:600;font-size:11px;padding:6px 12px;border:1px solid #E5E7EB;">Nombre</td>
        <td style="background:${GREY_HEADER};color:#FFFFFF;font-weight:600;font-size:11px;text-align:center;padding:6px;border:1px solid #E5E7EB;">Id. SAP</td>
        <td style="background:${GREY_HEADER};color:#FFFFFF;font-weight:600;font-size:11px;text-align:center;padding:6px;border:1px solid #E5E7EB;">Núm. Sercomosa</td>
        <td style="background:${GREY_HEADER};color:#FFFFFF;font-weight:600;font-size:11px;text-align:center;padding:6px;border:1px solid #E5E7EB;">Total</td>
        <td style="background:${GREY_HEADER};color:#FFFFFF;font-weight:600;font-size:11px;text-align:center;padding:6px;border:1px solid #E5E7EB;">Consumidas</td>
        <td style="background:${GREY_HEADER};color:#FFFFFF;font-weight:600;font-size:11px;text-align:center;padding:6px;border:1px solid #E5E7EB;">Restantes</td>
        <td style="background:${GREY_HEADER};color:#FFFFFF;font-weight:600;font-size:11px;text-align:center;padding:6px;border:1px solid #E5E7EB;">Total</td>
        <td style="background:${GREY_HEADER};color:#FFFFFF;font-weight:600;font-size:11px;text-align:center;padding:6px;border:1px solid #E5E7EB;">Consumidas</td>
        <td style="background:${GREY_HEADER};color:#FFFFFF;font-weight:600;font-size:11px;text-align:center;padding:6px;border:1px solid #E5E7EB;">Restantes</td>
      </tr>
      ${filasHtml}
      <tr>
        <td colspan="3" style="background:${TOTAL_BG};color:#FFFFFF;font-weight:700;font-size:12px;padding:10px 12px;border:1px solid #E5E7EB;">TOTAL ${conv.toUpperCase()} (${lista.length} trabajador${lista.length === 1 ? "" : "es"})</td>
        ${celdaTotal(sumTopeExtra, "h")}
        ${celdaTotal(sumConsExtra, "h")}
        ${celdaTotal(sumRestExtra, "h")}
        ${celdaTotal(sumTopeCompl, "h")}
        ${celdaTotal(sumConsCompl, "h")}
        ${celdaTotal(sumRestCompl, "h")}
      </tr>
      <tr><td colspan="${NCOLS}" style="padding:6px;border:none;">&nbsp;</td></tr>
    `;
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>Saldo de horas</x:Name><x:WorksheetOptions>
      <x:DisplayGridlines/><x:Selected/><x:FreezePanes/><x:FrozenNoSplit/>
      <x:SplitHorizontal>3</x:SplitHorizontal><x:TopRowBottomPane>3</x:TopRowBottomPane>
      <x:ActivePane>2</x:ActivePane>
      <x:Panes><x:Pane><x:Number>3</x:Number></x:Pane><x:Pane><x:Number>2</x:Number><x:ActiveRow>0</x:ActiveRow></x:Pane></x:Panes>
      </x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; width: 100%; }
        td { font-size: 13px; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="${NCOLS}" style="background:${NAVY};color:#FFFFFF;font-size:18px;font-weight:700;text-align:center;padding:16px;">SALDO DE HORAS — EXTRA Y COMPLEMENTARIAS</td></tr>
        <tr><td colspan="${NCOLS}" style="text-align:center;color:#6B7280;font-style:italic;padding:8px;">A fecha ${fechaCorte} (año ${anio})</td></tr>
        <tr><td colspan="${NCOLS}" style="padding:6px;">&nbsp;</td></tr>
        ${seccionesHtml}
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Saldo_Horas_${fechaCorte}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseNumero(valor) {
  if (valor == null || valor === "") return null;
  if (typeof valor === "number") return valor;
  const n = Number(String(valor).trim().replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export function parseFechaExcel(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF && XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    return null;
  }
  const texto = String(value).trim();
  const conPuntos = texto.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (conPuntos) return `${conPuntos[3]}-${conPuntos[2].padStart(2, "0")}-${conPuntos[1].padStart(2, "0")}`;
  const conBarras = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (conBarras) return `${conBarras[3]}-${conBarras[2].padStart(2, "0")}-${conBarras[1].padStart(2, "0")}`;
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return texto.slice(0, 10);
  return null;
}

export async function importarExcelHoras(file, empleados) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("variable")) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  const headerRowIdx = rows.findIndex((r) => r.some((c) => String(c ?? "").trim().toLowerCase() === "infotipo"));
  if (headerRowIdx === -1) {
    return { error: `No se ha encontrado la fila de cabecera ("INFOTIPO") en la hoja "${sheetName}". Revisa que el Excel siga el formato habitual.` };
  }
  const header = rows[headerRowIdx].map((c) => String(c ?? "").trim().toLowerCase());

  const idCol = header.findIndex((h) => h.includes("sap") && h.includes("id"));
  const codCol = header.findIndex((h) => h.includes("codigo") || h.includes("código") || h.includes("incidencia"));
  const horasCol = header.findIndex((h) => h.includes("unidad"));
  const fechaFinCol = header.findIndex((h) => h.includes("fecha") && h.includes("fin"));
  const fechaIniCol = header.findIndex((h) => h.includes("fecha") && h.includes("inicio"));
  const fechaCol = fechaFinCol !== -1 ? fechaFinCol : fechaIniCol;

  if ([idCol, codCol, horasCol, fechaCol].some((c) => c === -1)) {
    return { error: `No se han reconocido todas las columnas necesarias (Id. SAP, Código, Unidades, Fecha) en la hoja "${sheetName}".` };
  }

  let importados = 0;
  let ignoradosPorCodigo = 0;
  const errores = [];
  const avisos = [];
  const noEncontrados = new Set();
  const registrosPorEmpleado = {};
  const porCodigo = {};
  Object.entries(CODIGOS).forEach(([cod, info]) => {
    porCodigo[cod] = { label: info.label, tipo: info.tipo, horas: 0, filas: 0 };
  });

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === "")) continue;

    const sapRaw = row[idCol];
    const codigoRaw = row[codCol];
    const horasRaw = row[horasCol];
    const fechaRaw = row[fechaCol];
    if (sapRaw == null || codigoRaw == null) continue;

    const sap = String(sapRaw).trim();
    const codigo = String(codigoRaw).trim();
    if (!CODIGOS[codigo]) {
      ignoradosPorCodigo++;
      continue;
    }
    const horas = parseNumero(horasRaw);
    if (!horas || Number.isNaN(horas)) {
      errores.push(`Fila ${i + 1}: horas no válidas ("${horasRaw}") para el código ${codigo}, fila descartada`);
      continue;
    }

    const fecha = parseFechaExcel(fechaRaw);
    if (!fecha) {
      errores.push(`Fila ${i + 1}: fecha no reconocida ("${fechaRaw}"), fila descartada`);
      continue;
    }

    const emp = empleados.find((e) => e.sap.trim() === sap);
    if (!emp) {
      noEncontrados.add(sap);
      errores.push(`Fila ${i + 1}: Id. SAP "${sap}" no encontrado en la app, fila descartada`);
      continue;
    }

    const mesTexto = fecha.slice(0, 7);
    const tramosDelMes = tramosEnMes(emp, fecha);
    const tipoCodigo = CODIGOS[codigo].tipo;

    if (tramosDelMes.length === 0) {
      avisos.push(`${emp.nombre} (${sap}) — ${mesTexto}: sin ningún tramo de jornada definido ese mes`);
    } else if (tramosDelMes.every((t) => t.tipo === "Baja")) {
      avisos.push(`${emp.nombre} (${sap}) — ${mesTexto}: importado pese a figurar de BAJA todo ese mes`);
    } else {
      const algunTramoCoincide = tramosDelMes.some(
        (t) => (t.tipo === "Completa" && tipoCodigo === "extra") || (t.tipo === "Parcial" && tipoCodigo === "complementaria")
      );
      if (!algunTramoCoincide) {
        const tiposDelMes = [...new Set(tramosDelMes.map((t) => t.tipo))].join("/");
        avisos.push(`${emp.nombre} (${sap}) — ${mesTexto}: código ${codigo} (${tipoCodigo}) no coincide con ningún tramo de ese mes (tramos: ${tiposDelMes})`);
      }
    }

    registrosPorEmpleado[emp.id] = registrosPorEmpleado[emp.id] || [];
    registrosPorEmpleado[emp.id].push({ id: uid(), fecha, codigo, horas });
    porCodigo[codigo].horas += horas;
    porCodigo[codigo].filas += 1;
    importados++;
  }

  const totalHoras = Object.values(porCodigo).reduce((s, c) => s + c.horas, 0);

  return {
    registrosPorEmpleado,
    importados,
    ignoradosPorCodigo,
    porCodigo,
    totalHoras,
    errores,
    avisos,
    noEncontrados: Array.from(noEncontrados),
  };
}

export function normalizarTipo(valor) {
  const t = String(valor ?? "").trim().toLowerCase();
  if (t === "completa") return "Completa";
  if (t === "parcial") return "Parcial";
  if (t === "baja") return "Baja";
  return null;
}

export function normalizarConvenio(valor) {
  const v = String(valor ?? "").trim().toLowerCase();
  return CONVENIOS.find((c) => c.toLowerCase() === v) || null;
}

export function descargarPlantillaTramos() {
  const NAVY = "#1F3B57";
  const headers = [
    "Id. SAP",
    "Número de Sercomosa",
    "Apellidos y nombre",
    "Convenio",
    "Fecha inicio tramo",
    "Fecha fin tramo",
    "Tipo",
    "Horas semanales reales",
    "% complementarias (si Parcial)",
    "Observaciones",
  ];

  const ejemplo = [
    ["90184687", "", "MARTINEZ SALAR JOSE ANTONIO", "Limpiezas Publicas", "2026-01-01", "2026-06-30", "Completa", "37,5", "", "Alta inicial (jornada completa del convenio)"],
    ["90184687", "", "MARTINEZ SALAR JOSE ANTONIO", "Limpiezas Publicas", "2026-07-01", "", "Parcial", "28", "30", "Reducción de jornada. Sin fecha fin = sigue vigente"],
  ];

  const thStyle = "background:" + NAVY + ";color:#FFFFFF;font-weight:700;font-size:12px;padding:8px 10px;border:1px solid #14283B;text-align:center;";
  const tdEjemplo = "padding:8px 10px;border:1px solid #E5E7EB;color:#6B7280;font-style:italic;font-size:12px;";
  const tdVacio = "padding:12px 10px;border:1px solid #E5E7EB;font-size:12px;";

  const filaEjemplo = (fila) => `<tr>${fila.map((v) => `<td style="${tdEjemplo}">${v}</td>`).join("")}</tr>`;
  const filaVacia = () => `<tr>${headers.map(() => `<td style="${tdVacio}">&nbsp;</td>`).join("")}</tr>`;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>Tramos_Jornada</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; width: 100%; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="${headers.length}" style="background:${NAVY};color:#FFFFFF;font-size:16px;font-weight:700;text-align:center;padding:14px;">PLANTILLA DE TRAMOS DE JORNADA</td></tr>
        <tr><td colspan="${headers.length}" style="text-align:center;color:#6B7280;font-style:italic;padding:6px;font-size:11px;">Una fila por cada tramo distinto de un trabajador. Borra las 2 filas de ejemplo antes de rellenar las tuyas.</td></tr>
        <tr><td colspan="${headers.length}" style="padding:4px;">&nbsp;</td></tr>
        <tr>${headers.map((h) => `<th style="${thStyle}">${h}</th>`).join("")}</tr>
        ${ejemplo.map(filaEjemplo).join("")}
        ${Array.from({ length: 20 }).map(filaVacia).join("")}
        <tr><td colspan="${headers.length}" style="padding:10px;">&nbsp;</td></tr>
        <tr><td colspan="${headers.length}" style="background:#F3F4F6;font-weight:700;font-size:12px;padding:8px 10px;border:1px solid #E5E7EB;">CÓMO RELLENAR</td></tr>
        <tr><td colspan="${headers.length}" style="padding:6px 10px;border:1px solid #E5E7EB;font-size:11px;">"Tipo" debe ser exactamente: Completa, Parcial o Baja.</td></tr>
        <tr><td colspan="${headers.length}" style="padding:6px 10px;border:1px solid #E5E7EB;font-size:11px;">"Convenio" debe ser exactamente uno de: Aguas, Alumbrado, Jardines, Limpieza de edificios, Limpiezas Publicas, Piscinas, Instalaciones Deportivas.</td></tr>
        <tr><td colspan="${headers.length}" style="padding:6px 10px;border:1px solid #E5E7EB;font-size:11px;">"Horas semanales reales" en formato centesimal (37,5 = 37h 30min, no horas:minutos). Dejar en blanco si Tipo = Baja.</td></tr>
        <tr><td colspan="${headers.length}" style="padding:6px 10px;border:1px solid #E5E7EB;font-size:11px;">"% complementarias" solo si Tipo = Parcial (normalmente 30, ampliable hasta 60 según convenio). Si la jornada de ese tramo es menor de 10h/semana, no cabe pacto de complementarias (art. 12.5.b ET), aunque pongas un %.</td></tr>
        <tr><td colspan="${headers.length}" style="padding:6px 10px;border:1px solid #E5E7EB;font-size:11px;">"Fecha fin" en blanco = el tramo sigue vigente (continuará igual el año que viene si no se añade uno nuevo).</td></tr>
        <tr><td colspan="${headers.length}" style="padding:10px;">&nbsp;</td></tr>
        <tr><td colspan="${headers.length}" style="background:#EFF6FF;font-weight:700;font-size:12px;padding:8px 10px;border:1px solid #BFDBFE;color:#1E40AF;">¿YA TIENES UN EXTRACTO DE PERSONAL DE SAP?</td></tr>
        <tr><td colspan="${headers.length}" style="padding:6px 10px;border:1px solid #E5E7EB;font-size:11px;">No hace falta que rellenes esta plantilla a mano: la app también acepta directamente el extracto con columnas "Subdivisión personal_1", "Número de personal", "Apellido", "Segundo apellido", "Nombre de pila", "Fecha Alta", "Fecha Baja" y "H tbjo.p/semana". El tipo de jornada (Completa/Parcial) se calcula solo a partir de las horas semanales, y "Fecha Baja" se entiende como fin de ese tramo concreto (no como baja médica). Súbelo tal cual por el mismo botón "Importar tramos".</td></tr>
        <tr><td colspan="${headers.length}" style="padding:10px;">&nbsp;</td></tr>
        <tr><td colspan="${headers.length}" style="background:#F3F4F6;font-weight:700;font-size:12px;padding:8px 10px;border:1px solid #E5E7EB;">JORNADA SEMANAL COMPLETA DE REFERENCIA POR CONVENIO</td></tr>
        <tr><td colspan="${headers.length}" style="padding:6px 10px;border:1px solid #E5E7EB;font-size:11px;">Aguas: 38,75 h &nbsp;·&nbsp; Alumbrado: 40,00 h &nbsp;·&nbsp; Jardines: 37,50 h &nbsp;·&nbsp; Limpieza de edificios: 39,00 h &nbsp;·&nbsp; Limpiezas Publicas: 37,50 h &nbsp;·&nbsp; Piscinas: 40,00 h &nbsp;·&nbsp; Instalaciones Deportivas: 40,00 h</td></tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Plantilla_tramos.xls";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sinAcentos(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function importarExcelTramos(file, empleadosActuales) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("tramo")) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  if (rows.length === 0) return { error: `La hoja "${sheetName}" está vacía.` };

  let headerRowIdx = -1;
  let idCol = -1,
    nombreCol = -1,
    apellidoCol = -1,
    apellido2Col = -1,
    nombrePilaCol = -1,
    convenioCol = -1,
    fechaIniCol = -1,
    fechaFinCol = -1,
    tipoCol = -1,
    horasCol = -1,
    pctComplCol = -1,
    numSercomosaCol = -1,
    nifCol = -1;

  for (let i = 0; i < rows.length; i++) {
    const header = rows[i].map((c) => sinAcentos(String(c ?? "").trim().toLowerCase()));
    const tryId = header.findIndex((h) => (h.includes("sap") && h.includes("id")) || (h.includes("numero") && h.includes("personal")) || h.includes("dni"));
    const tryConvenio = header.findIndex((h) => h.includes("convenio") || h.includes("subdivision"));
    // Ya NO exigimos que haya fecha de inicio/alta para reconocer la cabecera: puede ser
    // un fichero solo de identidad (sin jornada), que se procesa en modo distinto más abajo.
    if (tryId !== -1 && tryConvenio !== -1) {
      headerRowIdx = i;
      idCol = tryId;
      convenioCol = tryConvenio;
      fechaIniCol = header.findIndex((h) => h.includes("inicio") || h.includes("alta"));
      tipoCol = header.findIndex((h) => h.includes("tipo"));
      nombreCol = header.findIndex((h) => h.includes("apellidos") && h.includes("nombre"));
      apellidoCol = header.findIndex((h) => h.includes("apellido") && !h.includes("segundo"));
      apellido2Col = header.findIndex((h) => h.includes("segundo") && h.includes("apellido"));
      nombrePilaCol = header.findIndex((h) => h.includes("nombre") && (h.includes("pila") || h.includes("propio")));
      fechaFinCol = header.findIndex((h) => (h.includes("fin") || h.includes("baja")) && !h.includes("complementaria"));
      horasCol = header.findIndex((h) => h.includes("semana") || h.includes("horas"));
      pctComplCol = header.findIndex((h) => h.includes("complementaria"));
      numSercomosaCol = header.findIndex((h) => h.includes("sercomosa"));
      nifCol = header.findIndex((h) => h.includes("nif") || h.includes("dni"));
      // el idCol ya pudo haber capturado "dni" si no habia sap+id: evitamos que nifCol apunte a la misma columna
      if (nifCol === idCol) nifCol = -1;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return { error: `No se ha encontrado la fila de cabecera (identificador y convenio/subdivisión) en la hoja "${sheetName}".` };
  }

  const tieneJornada = fechaIniCol !== -1;
  if (tieneJornada && tipoCol === -1 && horasCol === -1) {
    return {
      error: `Este fichero trae fechas de jornada pero ni una columna "Tipo" ni una de horas semanales, así que no hay forma de saber si cada tramo es Completa o Parcial en la hoja "${sheetName}".`,
    };
  }

  const tramosPorSap = {};
  const filasConError = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === "")) continue;

    const convenioRaw = row[convenioCol];
    const sap = String(row[idCol] ?? "").trim();
    if (!sap) continue;
    if (!convenioRaw) continue; // fila decorativa/instrucciones, no es una fila de datos

    let nombre = "";
    if (nombreCol !== -1) {
      nombre = String(row[nombreCol] ?? "").trim();
    } else if (apellidoCol !== -1 || apellido2Col !== -1 || nombrePilaCol !== -1) {
      nombre = [row[apellidoCol], row[apellido2Col], row[nombrePilaCol]]
        .filter((v) => v != null && String(v).trim() !== "")
        .join(" ")
        .trim();
    }

    const convenio = normalizarConvenio(convenioRaw);
    const numSercomosa = numSercomosaCol !== -1 ? String(row[numSercomosaCol] ?? "").trim() : "";
    const nif = nifCol !== -1 ? String(row[nifCol] ?? "").trim() : "";

    if (!convenio) {
      filasConError.push(`Fila ${i + 1}: convenio "${convenioRaw}" no reconocido`);
      continue;
    }

    tramosPorSap[sap] = tramosPorSap[sap] || { nombre, convenio, numSercomosa, nif, tramos: [], tieneJornadaEnFichero: tieneJornada };
    if (nombre) tramosPorSap[sap].nombre = nombre;
    if (numSercomosa) tramosPorSap[sap].numSercomosa = numSercomosa;
    if (nif) tramosPorSap[sap].nif = nif;

    if (!tieneJornada) continue; // fichero solo de identidad: no se crean tramos

    const fechaIniRaw = row[fechaIniCol];
    const tipoRaw = tipoCol !== -1 ? row[tipoCol] : null;
    const fechaInicio = parseFechaExcel(fechaIniRaw);
    const fechaFin = fechaFinCol !== -1 ? parseFechaExcel(row[fechaFinCol]) : null;
    const horasSemana = horasCol !== -1 ? parseNumero(row[horasCol]) ?? 0 : 0;
    const pctComplementaria = pctComplCol !== -1 && row[pctComplCol] != null ? parseNumero(row[pctComplCol]) ?? 30 : 30;

    if (!fechaInicio) {
      filasConError.push(`Fila ${i + 1}: fecha de inicio no reconocida ("${fechaIniRaw}")`);
      continue;
    }

    let tipo = normalizarTipo(tipoRaw);
    if (!tipo) {
      if (horasCol === -1) {
        filasConError.push(`Fila ${i + 1}: sin columna "Tipo" ni horas semanales, no se puede clasificar como Completa/Parcial`);
        continue;
      }
      const referencia = JORNADA_COMPLETA_SEMANAL[convenio] || 40;
      tipo = horasSemana >= referencia - 0.01 ? "Completa" : horasSemana > 0 ? "Parcial" : null;
      if (!tipo) {
        filasConError.push(`Fila ${i + 1}: horas semanales en 0 y sin columna "Tipo", no se puede clasificar`);
        continue;
      }
    }

    tramosPorSap[sap].tramos.push({
      id: uid(),
      inicio: fechaInicio,
      fin: fechaFin,
      tipo,
      pct: tipo === "Parcial" ? Math.round((horasSemana / (JORNADA_COMPLETA_SEMANAL[convenio] || 40)) * 1000) / 10 : 100,
      horasSemana: tipo === "Baja" ? 0 : horasSemana,
      pctComplementaria,
    });
  }

  Object.values(tramosPorSap).forEach((e) => e.tramos.sort((a, b) => a.inicio.localeCompare(b.inicio)));

  const creados = [];
  const actualizados = [];
  Object.keys(tramosPorSap).forEach((sap) => {
    const existe = empleadosActuales.some((e) => e.sap.trim() === sap);
    if (existe) actualizados.push(sap);
    else creados.push(sap);
  });

  return { tramosPorSap, creados, actualizados, filasConError, tieneJornada };
}
