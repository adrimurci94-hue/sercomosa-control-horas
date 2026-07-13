import { supabase } from "./supabaseClient";

// -----------------------------------------------------------------------
// Esta capa traduce entre el modelo que usa la app en memoria
// (empleado.tramos, empleado.registros anidados) y las 3 tablas planas
// de Supabase (empleados, tramos_jornada, registros_horas).
// El resto de la app (computeBolsa, importadores, exportador...) no sabe
// nada de Supabase: solo trabaja con el array "empleados" ya montado.
// -----------------------------------------------------------------------

function tramoDeFila(fila) {
  return {
    id: fila.id,
    inicio: fila.inicio,
    fin: fila.fin,
    tipo: fila.tipo,
    horasSemana: fila.horas_semana,
    pctComplementaria: fila.pct_complementaria,
    pct: fila.tipo === "Completa" ? 100 : null, // se recalcula en pantalla si hace falta
  };
}

function registroDeFila(fila) {
  return {
    id: fila.id,
    fecha: fila.fecha,
    codigo: fila.codigo,
    horas: Number(fila.horas),
  };
}

export async function cargarEmpleadosCompletos() {
  const [empleadosRes, tramosRes, registrosRes] = await Promise.all([
    supabase.from("empleados").select("*"),
    supabase.from("tramos_jornada").select("*"),
    supabase.from("registros_horas").select("*"),
  ]);

  if (empleadosRes.error) throw empleadosRes.error;
  if (tramosRes.error) throw tramosRes.error;
  if (registrosRes.error) throw registrosRes.error;

  const tramosPorEmpleado = {};
  (tramosRes.data || []).forEach((t) => {
    tramosPorEmpleado[t.empleado_id] = tramosPorEmpleado[t.empleado_id] || [];
    tramosPorEmpleado[t.empleado_id].push(tramoDeFila(t));
  });

  const registrosPorEmpleado = {};
  (registrosRes.data || []).forEach((r) => {
    registrosPorEmpleado[r.empleado_id] = registrosPorEmpleado[r.empleado_id] || [];
    registrosPorEmpleado[r.empleado_id].push(registroDeFila(r));
  });

  return (empleadosRes.data || []).map((e) => ({
    id: e.id,
    sap: e.sap,
    numSercomosa: e.num_sercomosa || "",
    nombre: e.nombre,
    convenio: e.convenio,
    tramos: (tramosPorEmpleado[e.id] || []).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    registros: registrosPorEmpleado[e.id] || [],
  }));
}

export async function crearEmpleado({ sap, numSercomosa, nombre, convenio }) {
  const { data, error } = await supabase
    .from("empleados")
    .insert({ sap, num_sercomosa: numSercomosa || null, nombre, convenio })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, sap: data.sap, numSercomosa: data.num_sercomosa || "", nombre: data.nombre, convenio: data.convenio, tramos: [], registros: [] };
}

export async function eliminarEmpleado(empleadoId) {
  const { error } = await supabase.from("empleados").delete().eq("id", empleadoId);
  if (error) throw error;
}

export async function actualizarEmpleado(empleadoId, campos) {
  const payload = {};
  if (campos.nombre !== undefined) payload.nombre = campos.nombre;
  if (campos.convenio !== undefined) payload.convenio = campos.convenio;
  if (campos.numSercomosa !== undefined) payload.num_sercomosa = campos.numSercomosa || null;
  const { error } = await supabase.from("empleados").update(payload).eq("id", empleadoId);
  if (error) throw error;
}

export async function insertarTramo(empleadoId, tramo) {
  const { data, error } = await supabase
    .from("tramos_jornada")
    .insert({
      empleado_id: empleadoId,
      inicio: tramo.inicio,
      fin: tramo.fin || null,
      tipo: tramo.tipo,
      horas_semana: tramo.horasSemana,
      pct_complementaria: tramo.pctComplementaria,
    })
    .select()
    .single();
  if (error) throw error;
  return tramoDeFila(data);
}

export async function actualizarFinTramo(tramoId, fin) {
  const { error } = await supabase.from("tramos_jornada").update({ fin }).eq("id", tramoId);
  if (error) throw error;
}

export async function eliminarTramo(tramoId) {
  const { error } = await supabase.from("tramos_jornada").delete().eq("id", tramoId);
  if (error) throw error;
}

// Sustituye TODOS los tramos de un empleado por una lista nueva
// (usado en la importación masiva de tramos, que trae el historial completo).
export async function reemplazarTramosDeEmpleado(empleadoId, tramos) {
  const del = await supabase.from("tramos_jornada").delete().eq("empleado_id", empleadoId);
  if (del.error) throw del.error;
  if (tramos.length === 0) return [];
  const filas = tramos.map((t) => ({
    empleado_id: empleadoId,
    inicio: t.inicio,
    fin: t.fin || null,
    tipo: t.tipo,
    horas_semana: t.horasSemana,
    pct_complementaria: t.pctComplementaria,
  }));
  const { data, error } = await supabase.from("tramos_jornada").insert(filas).select();
  if (error) throw error;
  return (data || []).map(tramoDeFila);
}

export async function insertarRegistro(empleadoId, registro) {
  const { data, error } = await supabase
    .from("registros_horas")
    .insert({ empleado_id: empleadoId, fecha: registro.fecha, codigo: registro.codigo, horas: registro.horas })
    .select()
    .single();
  if (error) throw error;
  return registroDeFila(data);
}

export async function insertarRegistrosMasivo(empleadoId, registros) {
  if (registros.length === 0) return [];
  const filas = registros.map((r) => ({ empleado_id: empleadoId, fecha: r.fecha, codigo: r.codigo, horas: r.horas }));
  const { data, error } = await supabase.from("registros_horas").insert(filas).select();
  if (error) throw error;
  return (data || []).map(registroDeFila);
}

export async function eliminarRegistro(registroId) {
  const { error } = await supabase.from("registros_horas").delete().eq("id", registroId);
  if (error) throw error;
}
