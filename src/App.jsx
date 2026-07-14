import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Users, CalendarRange, Clock, Info, X, FileSpreadsheet, Upload, LogOut } from "lucide-react";

import { supabase } from "./lib/supabaseClient";
import { CODIGOS, todayISO, addDays, computeBolsa, tramoEnFecha } from "./lib/logic";
import { exportarExcel, importarExcelHoras, importarExcelTramos, descargarPlantillaTramos } from "./lib/importExport";
import {
  cargarEmpleadosCompletos,
  crearEmpleado,
  eliminarEmpleado,
  actualizarEmpleado,
  insertarTramo,
  actualizarFinTramo,
  eliminarTramo,
  reemplazarTramosDeEmpleado,
  insertarRegistro,
  insertarRegistrosMasivo,
  eliminarRegistro,
} from "./lib/dataStore";
import {
  DesglosePanel,
  BolsaCard,
  ImportTramosSummaryModal,
  ImportSummaryModal,
  EmployeeSelector,
  ExportPickerModal,
  WarningModal,
  NuevoEmpleadoForm,
  TramosPanel,
  RegistrosPanel,
} from "./components";
import Login from "./Login";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = comprobando, null = sin sesión, objeto = logueado

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Comprobando sesión...</div>;
  }
  if (!session) {
    return <Login />;
  }
  return <ControlHoras />;
}

function ControlHoras() {
  const [empleados, setEmpleados] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fechaCorte, setFechaCorte] = useState(todayISO());
  const [siguiendoHoy, setSiguiendoHoy] = useState(true);
  const [showNewEmpleado, setShowNewEmpleado] = useState(false);
  const [pendingWarning, setPendingWarning] = useState(null);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [seleccionExport, setSeleccionExport] = useState({});
  const [importSummary, setImportSummary] = useState(null);
  const [importando, setImportando] = useState(false);
  const [importTramosSummary, setImportTramosSummary] = useState(null);
  const [importandoTramos, setImportandoTramos] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const datos = await cargarEmpleadosCompletos();
        setEmpleados(datos);
        setSelectedId(datos[0]?.id ?? null);
      } catch (e) {
        setError("No se han podido cargar los datos de Supabase: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const hoy = todayISO();
      setFechaCorte((prev) => (siguiendoHoy ? hoy : prev));
    }, 60000);
    return () => clearInterval(id);
  }, [siguiendoHoy]);

  const empleado = empleados.find((e) => e.id === selectedId) || null;
  const bolsa = useMemo(() => (empleado ? computeBolsa(empleado, fechaCorte) : null), [empleado, fechaCorte]);

  const addEmpleado = async (data) => {
    try {
      const nuevo = await crearEmpleado(data);
      setEmpleados((prev) => [...prev, nuevo]);
      setSelectedId(nuevo.id);
      setShowNewEmpleado(false);
    } catch (e) {
      setError("No se ha podido crear el trabajador: " + e.message);
    }
  };

  const removeEmpleado = async (id) => {
    try {
      await eliminarEmpleado(id);
      setEmpleados((prev) => prev.filter((e) => e.id !== id));
      if (selectedId === id) {
        const rest = empleados.filter((e) => e.id !== id);
        setSelectedId(rest[0]?.id ?? null);
      }
    } catch (e) {
      setError("No se ha podido eliminar el trabajador: " + e.message);
    }
  };

  const addTramo = async (empId, tramo) => {
    try {
      const emp = empleados.find((e) => e.id === empId);
      const ordenados = [...emp.tramos].sort((a, b) => a.inicio.localeCompare(b.inicio));
      const abiertoAnterior = [...ordenados].reverse().find((t) => !t.fin || t.fin >= tramo.inicio);

      let finCierre = null;
      if (abiertoAnterior && abiertoAnterior.inicio < tramo.inicio) {
        finCierre = addDays(tramo.inicio, -1);
        await actualizarFinTramo(abiertoAnterior.id, finCierre);
      }

      const nuevoTramo = await insertarTramo(empId, tramo);

      setEmpleados((prev) =>
        prev.map((e) => {
          if (e.id !== empId) return e;
          const tramos = finCierre ? e.tramos.map((t) => (t.id === abiertoAnterior.id ? { ...t, fin: finCierre } : t)) : e.tramos;
          const nuevos = [...tramos, nuevoTramo].sort((a, b) => a.inicio.localeCompare(b.inicio));
          return { ...e, tramos: nuevos };
        })
      );
    } catch (e) {
      setError("No se ha podido guardar el tramo: " + e.message);
    }
  };

  const removeTramo = async (empId, tramoId) => {
    try {
      await eliminarTramo(tramoId);
      setEmpleados((prev) => prev.map((e) => (e.id === empId ? { ...e, tramos: e.tramos.filter((t) => t.id !== tramoId) } : e)));
    } catch (e) {
      setError("No se ha podido eliminar el tramo: " + e.message);
    }
  };

  const addRegistro = async (empId, registro, force = false) => {
    const emp = empleados.find((e) => e.id === empId);
    const tramo = tramoEnFecha(emp, registro.fecha);
    const tipoCodigo = CODIGOS[registro.codigo]?.tipo;
    const tipoTramo = tramo?.tipo === "Completa" ? "extra" : tramo?.tipo === "Parcial" ? "complementaria" : null;

    if (!force && tramo?.tipo === "Baja") {
      setPendingWarning({
        empId,
        registro,
        mensaje: `El ${registro.fecha} el trabajador figura de BAJA. No debería haber horas trabajadas (ni extra ni complementarias) durante un periodo de baja. Revisa la fecha o el tramo antes de registrar.`,
      });
      return;
    }
    if (!force && tipoTramo && tipoCodigo !== tipoTramo) {
      setPendingWarning({
        empId,
        registro,
        mensaje:
          tipoTramo === "extra"
            ? `El ${registro.fecha} este trabajador estaba a jornada COMPLETA. El código ${registro.codigo} (${CODIGOS[registro.codigo]?.label}) se registra como ${tipoCodigo}, pero en jornada completa no deberían imputarse horas complementarias.`
            : `El ${registro.fecha} este trabajador estaba a jornada PARCIAL. El código ${registro.codigo} (${CODIGOS[registro.codigo]?.label}) se registra como ${tipoCodigo}, pero en jornada parcial no se pueden hacer horas extra (salvo fuerza mayor).`,
      });
      return;
    }
    if (!force && !tramo) {
      setPendingWarning({
        empId,
        registro,
        mensaje: `No hay ningún tramo de jornada definido para la fecha ${registro.fecha}. Se registrará igualmente, pero no se podrá calcular el tope correcto para ese día hasta que definas el tramo.`,
      });
      return;
    }

    try {
      const nuevo = await insertarRegistro(empId, registro);
      setEmpleados((prev) => prev.map((e) => (e.id === empId ? { ...e, registros: [...e.registros, nuevo] } : e)));
    } catch (e) {
      setError("No se ha podido guardar el registro: " + e.message);
    }
  };

  const removeRegistro = async (empId, regId) => {
    try {
      await eliminarRegistro(regId);
      setEmpleados((prev) => prev.map((e) => (e.id === empId ? { ...e, registros: e.registros.filter((r) => r.id !== regId) } : e)));
    } catch (e) {
      setError("No se ha podido eliminar el registro: " + e.message);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportando(true);
    try {
      const resumen = await importarExcelHoras(file, empleados);
      if (!resumen.error) {
        const empleadosActualizados = {};
        for (const [empId, registrosLocal] of Object.entries(resumen.registrosPorEmpleado)) {
          const guardados = await insertarRegistrosMasivo(empId, registrosLocal);
          empleadosActualizados[empId] = guardados;
        }
        setEmpleados((prev) => prev.map((emp) => (empleadosActualizados[emp.id] ? { ...emp, registros: [...emp.registros, ...empleadosActualizados[emp.id]] } : emp)));
      }
      setImportSummary(resumen);
    } catch (err) {
      setImportSummary({ error: "No se ha podido leer el archivo, o hubo un error guardando en la base de datos: " + err.message });
    } finally {
      setImportando(false);
    }
  };

  const handleImportTramosFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportandoTramos(true);
    try {
      const resumen = await importarExcelTramos(file, empleados);
      if (!resumen.error) {
        const sapsExistentes = new Set(empleados.map((e) => e.sap.trim()));
        const empleadosNuevos = [];
        const tramosGuardadosPorSap = {};

        for (const [sap, datos] of Object.entries(resumen.tramosPorSap)) {
          if (sapsExistentes.has(sap)) {
            const empExistente = empleados.find((e) => e.sap.trim() === sap);

            // Solo tocamos los tramos si el fichero trae fechas de jornada de verdad.
            // Un fichero solo de identidad (sin Fecha Alta/horas) NUNCA debe borrar
            // los tramos que ya tuviera cargados ese trabajador.
            if (resumen.tieneJornada) {
              const tramosGuardados = await reemplazarTramosDeEmpleado(empExistente.id, datos.tramos);
              tramosGuardadosPorSap[sap] = tramosGuardados;
            }

            const cambios = {};
            if (datos.numSercomosa && datos.numSercomosa !== empExistente.numSercomosa) cambios.numSercomosa = datos.numSercomosa;
            if (datos.nif && datos.nif !== empExistente.nif) cambios.nif = datos.nif;
            if (Object.keys(cambios).length > 0) await actualizarEmpleado(empExistente.id, cambios);
          } else {
            const nuevoEmp = await crearEmpleado({
              sap,
              numSercomosa: datos.numSercomosa,
              nif: datos.nif,
              nombre: datos.nombre || sap,
              convenio: datos.convenio,
            });
            let tramosGuardados = [];
            if (resumen.tieneJornada && datos.tramos.length > 0) {
              tramosGuardados = await reemplazarTramosDeEmpleado(nuevoEmp.id, datos.tramos);
            }
            empleadosNuevos.push({ ...nuevoEmp, tramos: tramosGuardados });
          }
        }

        setEmpleados((prev) => {
          const actualizados = prev.map((emp) => {
            const sap = emp.sap.trim();
            const datos = resumen.tramosPorSap[sap];
            if (!datos) return emp;
            return {
              ...emp,
              tramos: tramosGuardadosPorSap[sap] || emp.tramos,
              numSercomosa: datos.numSercomosa || emp.numSercomosa || "",
              nif: datos.nif || emp.nif || "",
            };
          });
          return [...actualizados, ...empleadosNuevos];
        });
      }
      setImportTramosSummary(resumen);
    } catch (err) {
      setImportTramosSummary({ error: "No se ha podido leer el archivo, o hubo un error guardando en la base de datos: " + err.message });
    } finally {
      setImportandoTramos(false);
    }
  };

  const abrirExportPicker = () => {
    const inicial = {};
    empleados.forEach((e) => (inicial[e.id] = true));
    setSeleccionExport(inicial);
    setShowExportPicker(true);
  };

  const confirmarExport = () => {
    const seleccionados = empleados.filter((e) => seleccionExport[e.id]);
    exportarExcel(seleccionados, fechaCorte);
    setShowExportPicker(false);
  };

  if (loading) {
    return <div className="p-10 text-slate-500 text-sm">Cargando control de horas...</div>;
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Control de horas extra y complementarias</h1>
            <p className="text-sm text-slate-500 mt-1">Bolsa acumulada por trabajador según sus tramos de jornada completa / parcial durante el año.</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            title="Cerrar sesión"
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </header>

        {error && <div className="mb-4 text-sm bg-amber-50 border border-amber-300 text-amber-800 rounded-lg px-4 py-2">{error}</div>}

        <div className="flex flex-wrap gap-3 items-center mb-6">
          <EmployeeSelector empleados={empleados} selectedId={selectedId} onSelect={setSelectedId} />
          <button
            onClick={() => setShowNewEmpleado(true)}
            className="flex items-center gap-1 text-sm bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus size={15} /> Nuevo trabajador
          </button>
          {empleado && (
            <button
              onClick={() => removeEmpleado(empleado.id)}
              className="flex items-center gap-1 text-sm text-rose-600 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={15} /> Eliminar trabajador
            </button>
          )}
          <button
            onClick={abrirExportPicker}
            disabled={empleados.length === 0}
            className="flex items-center gap-1 text-sm bg-emerald-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <FileSpreadsheet size={15} /> Exportar Excel
          </button>
          <label className="flex items-center gap-1 text-sm bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
            <Upload size={15} className="text-slate-400" />
            {importando ? "Importando..." : "Importar Excel de horas"}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} disabled={importando} />
          </label>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
            <label className="flex items-center gap-1 text-sm text-slate-700 px-3 py-2 hover:bg-slate-50 transition-colors cursor-pointer">
              <Upload size={15} className="text-slate-400" />
              {importandoTramos ? "Importando..." : "Importar tramos"}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportTramosFile} disabled={importandoTramos} />
            </label>
            <button
              onClick={descargarPlantillaTramos}
              className="text-sm text-sky-600 px-3 py-2 border-l border-slate-200 hover:bg-slate-50 transition-colors"
              title="Descargar plantilla en blanco"
            >
              Plantilla
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 ml-auto">
            <CalendarRange size={16} className="text-slate-400" />
            <button
              onClick={() => {
                const y = Number(fechaCorte.slice(0, 4)) - 1;
                if (y < 2026) return;
                setFechaCorte(`${y}-12-31`);
                setSiguiendoHoy(false);
              }}
              disabled={Number(fechaCorte.slice(0, 4)) <= 2026}
              className="text-xs text-slate-400 hover:text-slate-600 px-1 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:text-slate-400"
              title="Ver año anterior (31/12) — no disponible antes de 2026"
            >
              ◀
            </button>
            <label className="text-xs text-slate-500">{siguiendoHoy ? "Hoy:" : "Simulando fecha:"}</label>
            <input
              type="date"
              value={fechaCorte}
              min="2026-01-01"
              onChange={(e) => {
                const valor = e.target.value < "2026-01-01" ? "2026-01-01" : e.target.value;
                setFechaCorte(valor);
                setSiguiendoHoy(valor === todayISO());
              }}
              className="bg-transparent text-sm outline-none"
            />
            <button
              onClick={() => {
                const y = Number(fechaCorte.slice(0, 4)) + 1;
                const candidata = `${y}-12-31`;
                setFechaCorte(candidata > todayISO() ? todayISO() : candidata);
                setSiguiendoHoy(candidata > todayISO());
              }}
              className="text-xs text-slate-400 hover:text-slate-600 px-1"
              title="Ver año siguiente (31/12, o hoy si aún no ha llegado)"
            >
              ▶
            </button>
            {!siguiendoHoy && (
              <button
                onClick={() => {
                  setFechaCorte(todayISO());
                  setSiguiendoHoy(true);
                }}
                className="text-xs text-sky-600 hover:underline"
              >
                Volver a hoy
              </button>
            )}
          </div>
        </div>

        {!siguiendoHoy && (
          <div className="mb-4 text-xs bg-sky-50 border border-sky-200 text-sky-700 rounded-lg px-3 py-2">
            Estás viendo el cálculo simulado a fecha {fechaCorte} (año {fechaCorte.slice(0, 4)}), no el de hoy. Los datos reales de hoy no se ven afectados.
          </div>
        )}

        {showNewEmpleado && <NuevoEmpleadoForm onCancel={() => setShowNewEmpleado(false)} onSave={addEmpleado} />}

        {!empleado && !showNewEmpleado && (
          <div className="text-sm text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
            No hay trabajadores todavía. Añade uno para empezar.
          </div>
        )}

        {empleado && bolsa && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-500">Bolsa del año {bolsa.anio}</h2>
              <p className="text-xs text-slate-400">
                Si no se informa un tramo nuevo para el {Number(bolsa.anio) + 1}, se asume el mismo % vigente a 31/12/{bolsa.anio}.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 mb-8">
              <BolsaCard titulo="Horas extra" subtitulo="Contador fijo: 80h/año, sin prorratear por tramo" data={bolsa.extra} />
              <BolsaCard
                titulo="Horas complementarias"
                subtitulo="Solo en tramos de jornada parcial, según % pactado por convenio"
                data={bolsa.complementaria}
              />
            </div>

            <DesglosePanel desglose={bolsa.desglose} anio={bolsa.anio} />

            <div className="grid md:grid-cols-2 gap-6">
              <TramosPanel key={empleado.id} empleado={empleado} onAdd={(t) => addTramo(empleado.id, t)} onRemove={(id) => removeTramo(empleado.id, id)} />
              <RegistrosPanel
                empleado={empleado}
                fechaCorte={fechaCorte}
                onAdd={(r) => addRegistro(empleado.id, r)}
                onRemove={(id) => removeRegistro(empleado.id, id)}
              />
            </div>
          </>
        )}
      </div>

      {pendingWarning && (
        <WarningModal
          mensaje={pendingWarning.mensaje}
          onCancel={() => setPendingWarning(null)}
          onConfirm={() => {
            addRegistro(pendingWarning.empId, pendingWarning.registro, true);
            setPendingWarning(null);
          }}
        />
      )}

      {showExportPicker && (
        <ExportPickerModal
          empleados={empleados}
          seleccion={seleccionExport}
          setSeleccion={setSeleccionExport}
          onCancel={() => setShowExportPicker(false)}
          onConfirm={confirmarExport}
          fechaCorte={fechaCorte}
        />
      )}

      {importSummary && <ImportSummaryModal resumen={importSummary} onClose={() => setImportSummary(null)} />}
      {importTramosSummary && <ImportTramosSummaryModal resumen={importTramosSummary} onClose={() => setImportTramosSummary(null)} />}
    </div>
  );
}
