// -----------------------------------------------------------------------
// Lógica de negocio pura del control de horas extra y complementarias.
// No sabe nada de Supabase ni de React: solo recibe datos y calcula.
// Trasladada tal cual desde el prototipo, sin cambios de comportamiento.
// -----------------------------------------------------------------------

export const CODIGOS = {
  "2005": { tipo: "extra", label: "Hora extra normal" },
  "2007": { tipo: "extra", label: "Hora extra festiva" },
  "2492": { tipo: "extra", label: "Hora extra nocturna" },
  "2205": { tipo: "complementaria", label: "Hora complementaria" },
};

export const CONVENIOS = ["Aguas", "Alumbrado", "Jardines", "Limpieza de edificios", "Limpiezas Publicas", "Piscinas", "Instalaciones Deportivas"];

export const JORNADA_COMPLETA_SEMANAL = {
  Aguas: 38.75,
  Alumbrado: 40,
  Jardines: 37.5,
  "Limpieza de edificios": 39,
  "Limpiezas Publicas": 37.5,
  Piscinas: 40,
  "Instalaciones Deportivas": 40,
};

export const LIMITE_EXTRA_ANUAL = 80;

// Contraseña de confirmación antes de borrar un tramo o un registro de horas.
// Es solo una fricción para evitar despistes de quien ya tiene acceso legítimo
// (el login + RLS de Supabase son la protección real frente a terceros).
export const PASSWORD_ELIMINAR = "**";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000) + 1;

export const addDays = (iso, n) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const clampToYear = (iso, year) => {
  const min = `${year}-01-01`,
    max = `${year}-12-31`;
  if (iso < min) return min;
  if (iso > max) return max;
  return iso;
};

export function computeBolsa(empleado, hastaISO) {
  const year = hastaISO.slice(0, 4);
  const tramos = [...empleado.tramos].sort((a, b) => a.inicio.localeCompare(b.inicio));

  let horasComplementariasPermitidasHastaHoy = 0;
  let horasComplementariasPermitidasAnual = 0;
  const desglose = [];

  for (const t of tramos) {
    const inicioYear = clampToYear(t.inicio, year);
    const finReal = t.fin || `${year}-12-31`;
    const finYear = clampToYear(finReal, year);
    if (inicioYear > finYear) continue;

    const diasTotalTramoEnAnio = daysBetween(inicioYear, finYear);
    const finHastaHoy = finYear < hastaISO ? finYear : hastaISO;
    const diasTranscurridos = inicioYear <= hastaISO ? Math.max(0, daysBetween(inicioYear, finHastaHoy)) : 0;

    let aporteHastaHoy = 0;
    let aporteAnual = 0;
    let limitadoPorJornadaCompleta = false;
    let sinDerechoPorMinimoLegal = false;

    if (t.tipo === "Completa") {
      // El contador de horas extra es fijo (80h/año), no se prorratea por tramo:
      // este tramo solo marca "aquí se permiten horas extra", no aporta un importe propio.
    } else if (t.tipo === "Parcial") {
      const CUMPLE_MINIMO_LEGAL = t.horasSemana >= 10;
      sinDerechoPorMinimoLegal = !CUMPLE_MINIMO_LEGAL;
      if (CUMPLE_MINIMO_LEGAL) {
        const referencia = JORNADA_COMPLETA_SEMANAL[t.convenio || empleado.convenio] || 40;
        const horasDiaPorPorcentaje = (t.horasSemana / 7) * ((t.pctComplementaria || 30) / 100);
        const horasDiaMaxPorJornadaCompleta = Math.max(0, (referencia - t.horasSemana) / 7);
        const horasDiaPermitidas = Math.min(horasDiaPorPorcentaje, horasDiaMaxPorJornadaCompleta);
        horasComplementariasPermitidasAnual += diasTotalTramoEnAnio * horasDiaPermitidas;
        horasComplementariasPermitidasHastaHoy += diasTranscurridos * horasDiaPermitidas;
        aporteHastaHoy = diasTranscurridos * horasDiaPermitidas;
        aporteAnual = diasTotalTramoEnAnio * horasDiaPermitidas;
        limitadoPorJornadaCompleta = horasDiaMaxPorJornadaCompleta < horasDiaPorPorcentaje;
      }
      // Si no cumple el mínimo de 10h/semana (art. 12.5.b ET), no puede pactar complementarias:
      // el tramo aporta 0 a la bolsa, aunque tenga un % de convenio configurado.
    }
    // t.tipo === "Baja": periodo sin actividad, no aporta a ninguna bolsa (aporte queda en 0)

    desglose.push({
      id: t.id,
      inicio: t.inicio,
      fin: t.fin,
      inicioEnAnio: inicioYear,
      finEnAnio: finYear,
      continuaEnAniosSiguientes: !t.fin,
      tipo: t.tipo,
      diasTranscurridos,
      diasTotalTramoEnAnio,
      categoria: t.tipo === "Completa" ? "extra" : t.tipo === "Parcial" ? "complementaria" : "baja",
      limitadoPorJornadaCompleta,
      sinDerechoPorMinimoLegal,
      aporteHastaHoy,
      aporteAnual,
    });
  }

  const extraDisponibleHastaHoy = LIMITE_EXTRA_ANUAL;
  const extraDisponibleAnual = LIMITE_EXTRA_ANUAL;

  const consumidoExtra = empleado.registros
    .filter((r) => CODIGOS[r.codigo]?.tipo === "extra" && r.fecha.slice(0, 4) === year && r.fecha <= hastaISO)
    .reduce((s, r) => s + Number(r.horas || 0), 0);
  const consumidoComplementaria = empleado.registros
    .filter((r) => CODIGOS[r.codigo]?.tipo === "complementaria" && r.fecha.slice(0, 4) === year && r.fecha <= hastaISO)
    .reduce((s, r) => s + Number(r.horas || 0), 0);

  return {
    extra: {
      disponibleHastaHoy: extraDisponibleHastaHoy,
      disponibleAnual: extraDisponibleAnual,
      consumido: consumidoExtra,
      restanteHastaHoy: extraDisponibleHastaHoy - consumidoExtra,
    },
    complementaria: {
      disponibleHastaHoy: horasComplementariasPermitidasHastaHoy,
      disponibleAnual: horasComplementariasPermitidasAnual,
      consumido: consumidoComplementaria,
      restanteHastaHoy: horasComplementariasPermitidasHastaHoy - consumidoComplementaria,
    },
    desglose,
    anio: year,
  };
}

export function tramoEnFecha(empleado, fecha) {
  return empleado.tramos.find((t) => t.inicio <= fecha && (!t.fin || fecha <= t.fin));
}

export function primerDiaMes(fechaISO) {
  return `${fechaISO.slice(0, 7)}-01`;
}

export function tramosEnMes(empleado, fechaFinMes) {
  const inicioMes = primerDiaMes(fechaFinMes);
  return empleado.tramos.filter((t) => t.inicio <= fechaFinMes && (!t.fin || t.fin >= inicioMes));
}
