import React, { useState, useEffect } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Users, CalendarRange, Clock, Info, X, FileSpreadsheet, Upload, Lock } from "lucide-react";
import { CODIGOS, CONVENIOS, JORNADA_COMPLETA_SEMANAL, todayISO, tramoEnFecha, PASSWORD_ELIMINAR } from "../lib/logic";

export function DesglosePanel({ desglose, anio }) {
  const [abierto, setAbierto] = useState(true);
  const ordenado = [...desglose].sort((a, b) => a.inicio.localeCompare(b.inicio));

  const badgeClase = (categoria) =>
    categoria === "extra" ? "bg-sky-100 text-sky-700" : categoria === "complementaria" ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-600";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
      <button onClick={() => setAbierto(!abierto)} className="w-full flex items-center justify-between text-left">
        <div>
          <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
            <Info size={15} /> Desglose por tramo (auditoría) — año {anio}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 ml-6">
            Sirve para calcular el total de horas complementarias sumando lo que aporta cada tramo día a día. Las filas de horas extra muestran "—" porque
            esa bolsa es un contador fijo (80h/año) y no se calcula tramo a tramo.
          </p>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{abierto ? "Ocultar ▲" : "Ver ▼"}</span>
      </button>

      {abierto && (
        <div className="mt-4 overflow-auto">
          {ordenado.length === 0 ? (
            <p className="text-xs text-slate-400">Sin tramos definidos todavía.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="text-left font-medium py-1.5 pr-2">Tramo (porción de {anio})</th>
                  <th className="text-left font-medium py-1.5 pr-2">Tipo</th>
                  <th className="text-right font-medium py-1.5 pr-2">Días transcurridos</th>
                  <th className="text-right font-medium py-1.5 pr-2">Aporte hasta hoy</th>
                  <th className="text-right font-medium py-1.5">Aporte proyectado anual</th>
                </tr>
              </thead>
              <tbody>
                {ordenado.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50">
                    <td className="py-1.5 pr-2 text-slate-600">
                      {d.inicioEnAnio} → {d.finEnAnio}
                      {d.continuaEnAniosSiguientes && d.finEnAnio === `${anio}-12-31` && (
                        <span className="ml-1 text-sky-500" title={`Sigue vigente: continuará en ${Number(anio) + 1} con el mismo %`}>
                          ↷
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className={`px-1.5 py-0.5 rounded ${badgeClase(d.categoria)}`}>{d.tipo}</span>
                    </td>
                    <td className="py-1.5 pr-2 text-right text-slate-500">
                      {d.diasTranscurridos} / {d.diasTotalTramoEnAnio}
                    </td>
                    <td className="py-1.5 pr-2 text-right font-medium text-slate-700">
                      {d.categoria !== "complementaria" ? (
                        "—"
                      ) : d.sinDerechoPorMinimoLegal ? (
                        <span className="text-rose-600 font-semibold">0.00 h</span>
                      ) : (
                        `${d.aporteHastaHoy.toFixed(2)} h`
                      )}
                      {d.limitadoPorJornadaCompleta && (
                        <span className="ml-1 text-amber-500" title="Limitado por la jornada completa del convenio, no por el % pactado">
                          ⚠
                        </span>
                      )}
                      {d.sinDerechoPorMinimoLegal && (
                        <span className="ml-1 text-rose-500" title="Jornada inferior a 10h/semana: no se pueden pactar horas complementarias (art. 12.5.b ET)">
                          ⛔
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-slate-500">
                      {d.categoria !== "complementaria" ? "—" : d.sinDerechoPorMinimoLegal ? "0.00 h" : `${d.aporteAnual.toFixed(2)} h`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-slate-400 mt-3">
            Cada año empieza de cero: el contador de 80h de extra y la bolsa de complementarias se reinician el 1 de enero. Solo los tramos "Parcial" aportan a la
            bolsa de complementarias, y esa suma debe coincidir con la tarjeta de arriba.
            <br />
            <span className="text-amber-500">⚠</span> = en ese tramo, lo que limita las complementarias no es el % pactado del convenio, sino que ordinarias +
            complementarias no pueden superar la jornada completa (art. 12.4.c ET).
            <br />
            <span className="text-rose-500">⛔</span> = jornada inferior a 10h/semana: no cabe pacto de complementarias en absoluto (art. 12.5.b ET), aunque el
            tramo tenga un % configurado.
            <br />
            <span className="text-sky-500">↷</span> = tramo sin fecha de fin: si no se registra un tramo nuevo, seguirá con el mismo % en {Number(anio) + 1}.
          </p>
        </div>
      )}
    </div>
  );
}

export function BolsaCard({ titulo, subtitulo, data, unidad = "h" }) {
  const pct = data.disponibleHastaHoy > 0 ? Math.min(150, (data.consumido / data.disponibleHastaHoy) * 100) : data.consumido > 0 ? 150 : 0;
  const excedido = data.consumido > data.disponibleHastaHoy + 0.01;
  const cerca = !excedido && pct >= 80;
  const barColor = excedido ? "bg-rose-500" : cerca ? "bg-amber-500" : "bg-emerald-500";
  const bg = excedido ? "border-rose-300 bg-rose-50" : cerca ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border ${bg} p-5 flex-1 min-w-64`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm tracking-wide uppercase">{titulo}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>
        </div>
        {excedido ? (
          <AlertTriangle className="text-rose-500 shrink-0" size={20} />
        ) : cerca ? (
          <AlertTriangle className="text-amber-500 shrink-0" size={20} />
        ) : (
          <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">{data.consumido.toFixed(2)}</span>
        <span className="text-slate-400 text-sm">/ {data.disponibleHastaHoy.toFixed(2)} {unidad} disponibles hoy</span>
      </div>

      <div className="mt-3 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Proyección a 31/dic: {data.disponibleAnual.toFixed(2)} {unidad}</span>
        <span className={excedido ? "text-rose-600 font-semibold" : "text-slate-500"}>
          {excedido ? `Excedido ${(data.consumido - data.disponibleHastaHoy).toFixed(2)} ${unidad}` : `Quedan ${data.restanteHastaHoy.toFixed(2)} ${unidad}`}
        </span>
      </div>
    </div>
  );
}

export function ImportTramosSummaryModal({ resumen, onClose }) {
  return (
    <div className="absolute inset-0 z-50">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl flex flex-col overflow-hidden" style={{ maxHeight: "600px" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Upload size={18} className="text-emerald-600" /> Resultado de la importación de tramos
          </h3>
          <button onClick={onClose}>
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {resumen.error ? (
          <div className="text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3">{resumen.error}</div>
        ) : (
          <div className="overflow-auto flex-1 min-h-0 space-y-3 text-sm">
            <div className="flex gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex-1 text-center">
                <div className="text-2xl font-bold text-emerald-700">{resumen.actualizados.length}</div>
                <div className="text-xs text-emerald-600">trabajadores actualizados (tramos sustituidos)</div>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2 flex-1 text-center">
                <div className="text-2xl font-bold text-sky-700">{resumen.creados.length}</div>
                <div className="text-xs text-sky-600">trabajadores nuevos, dados de alta</div>
              </div>
            </div>

            {resumen.tieneJornada ? (
              resumen.actualizados.length > 0 && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  Los tramos de {resumen.actualizados.join(", ")} se han reemplazado por completo con los del fichero.
                </p>
              )
            ) : (
              <p className="text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                Este fichero solo traía datos de identidad (sin fechas de jornada), así que se ha actualizado el nombre, convenio, número de
                Sercomosa y/o NIF de los trabajadores que correspondía — sus tramos de jornada existentes <strong>no se han tocado</strong>.
              </p>
            )}

            {resumen.filasConError.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">Filas con error, no importadas ({resumen.filasConError.length}):</p>
                <ul className="text-xs text-amber-700 space-y-1 max-h-40 overflow-auto">
                  {resumen.filasConError.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700">
          Cerrar
        </button>
      </div>
      </div>
    </div>
  );
}


export function ImportSummaryModal({ resumen, onClose }) {
  return (
    <div className="absolute inset-0 z-50">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl flex flex-col overflow-hidden" style={{ maxHeight: "600px" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Upload size={18} className="text-emerald-600" /> Resultado de la importación
          </h3>
          <button onClick={onClose}>
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {resumen.error ? (
          <div className="text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3">{resumen.error}</div>
        ) : (
          <div className="overflow-auto flex-1 min-h-0 space-y-3 text-sm">
            <div className="flex gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex-1 text-center">
                <div className="text-2xl font-bold text-emerald-700">{resumen.importados}</div>
                <div className="text-xs text-emerald-600">registros importados</div>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2 flex-1 text-center">
                <div className="text-2xl font-bold text-sky-700">{resumen.totalHoras.toFixed(2)}h</div>
                <div className="text-xs text-sky-600">horas totales procesadas</div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Desglose por código:</p>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 text-slate-500">
                    <th className="text-left font-medium py-1.5 px-2">Código</th>
                    <th className="text-left font-medium py-1.5 px-2">Concepto</th>
                    <th className="text-right font-medium py-1.5 px-2">Filas</th>
                    <th className="text-right font-medium py-1.5 px-2">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(resumen.porCodigo).map(([cod, d]) => (
                    <tr key={cod} className="border-t border-slate-100">
                      <td className="py-1.5 px-2 font-mono text-slate-600">{cod}</td>
                      <td className="py-1.5 px-2 text-slate-600">{d.label}</td>
                      <td className={`py-1.5 px-2 text-right ${d.filas === 0 ? "text-slate-300" : "text-slate-700 font-medium"}`}>{d.filas}</td>
                      <td className={`py-1.5 px-2 text-right ${d.filas === 0 ? "text-slate-300" : "text-slate-700 font-medium"}`}>{d.horas.toFixed(2)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {resumen.ignoradosPorCodigo > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  + {resumen.ignoradosPorCodigo} filas con otros códigos (pluses, dietas, etc.) ignoradas por no ser relevantes para este control.
                </p>
              )}
            </div>

            {resumen.errores.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-rose-800 mb-1">Errores — filas NO importadas ({resumen.errores.length}):</p>
                <ul className="text-xs text-rose-700 space-y-1 max-h-40 overflow-auto">
                  {resumen.errores.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
            )}

            {resumen.avisos.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">Avisos — importadas pero revisar ({resumen.avisos.length}):</p>
                <ul className="text-xs text-amber-700 space-y-1 max-h-40 overflow-auto">
                  {resumen.avisos.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
            )}

            {resumen.importados > 0 && resumen.avisos.length === 0 && resumen.errores.length === 0 && (
              <p className="text-xs text-slate-500">Todo importado sin incidencias.</p>
            )}
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700">
          Cerrar
        </button>
      </div>
      </div>
    </div>
  );
}

export function EmployeeSelector({ empleados, selectedId, onSelect }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedorRef = React.useRef(null);

  const seleccionado = empleados.find((e) => e.id === selectedId);

  useEffect(() => {
    const handleClickFuera = (ev) => {
      if (contenedorRef.current && !contenedorRef.current.contains(ev.target)) {
        setAbierto(false);
        setBusqueda("");
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const filtrados = empleados.filter((e) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return e.nombre.toLowerCase().includes(q) || e.sap.toLowerCase().includes(q) || (e.numSercomosa || "").toLowerCase().includes(q);
  });

  return (
    <div ref={contenedorRef} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-56 text-left"
      >
        <Users size={16} className="text-slate-400 shrink-0" />
        <span className="truncate">{seleccionado ? `${seleccionado.sap} — ${seleccionado.nombre}` : "Selecciona un trabajador"}</span>
      </button>

      {abierto && (
        <div className="absolute z-40 mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              placeholder="Escribe un nombre, Id. SAP o Nº Sercomosa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-md outline-none focus:border-slate-400"
            />
          </div>
          <div className="max-h-64 overflow-auto">
            {filtrados.length === 0 && <p className="text-xs text-slate-400 px-3 py-3">Sin resultados para "{busqueda}"</p>}
            {filtrados.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  onSelect(e.id);
                  setAbierto(false);
                  setBusqueda("");
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${e.id === selectedId ? "bg-sky-50 font-medium text-sky-700" : "text-slate-700"}`}
              >
                <div>
                  <span className="text-slate-400 text-xs mr-2">{e.sap}</span>
                  {e.nombre}
                </div>
                {e.numSercomosa && <div className="text-xs text-slate-400 mt-0.5">Nº Sercomosa: {e.numSercomosa}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export function ExportPickerModal({ empleados, seleccion, setSeleccion, onCancel, onConfirm, fechaCorte }) {
  const [convenioAbierto, setConvenioAbierto] = useState(null);

  const porConvenio = {};
  empleados.forEach((e) => {
    porConvenio[e.convenio] = porConvenio[e.convenio] || [];
    porConvenio[e.convenio].push(e);
  });

  const totalSeleccionados = Object.values(seleccion).filter(Boolean).length;

  const marcarTodos = (valor) => {
    const nuevo = {};
    empleados.forEach((e) => (nuevo[e.id] = valor));
    setSeleccion(nuevo);
  };

  const marcarConvenio = (conv, valor) => {
    const nuevo = { ...seleccion };
    porConvenio[conv].forEach((e) => (nuevo[e.id] = valor));
    setSeleccion(nuevo);
  };

  const excluirDeBaja = () => {
    const nuevo = { ...seleccion };
    empleados.forEach((e) => {
      const tramo = tramoEnFecha(e, fechaCorte);
      if (tramo?.tipo === "Baja") nuevo[e.id] = false;
    });
    setSeleccion(nuevo);
  };

  return (
    <div className="absolute inset-0 z-50">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl flex flex-col overflow-hidden" style={{ maxHeight: "480px" }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-emerald-600" /> ¿De qué trabajadores quieres el informe?
          </h3>
          <button onClick={onCancel}>
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Haz clic en un convenio para ver y marcar sus trabajadores.</p>

        <div className="flex gap-3 mb-3 text-xs flex-wrap">
          <button onClick={() => marcarTodos(true)} className="text-sky-600 hover:underline">
            Marcar todos
          </button>
          <button onClick={() => marcarTodos(false)} className="text-sky-600 hover:underline">
            Desmarcar todos
          </button>
          <button onClick={excluirDeBaja} className="text-amber-600 hover:underline" title={`Desmarca a quien esté de baja a fecha ${fechaCorte}`}>
            Excluir de baja
          </button>
        </div>

        <div className="overflow-auto flex-1 min-h-0 border-t border-slate-100 pt-2">
          {CONVENIOS.filter((c) => porConvenio[c]?.length).map((conv) => {
            const lista = porConvenio[conv];
            const marcados = lista.filter((e) => seleccion[e.id]).length;
            const todosMarcados = marcados === lista.length;
            const algunoMarcado = marcados > 0 && !todosMarcados;
            const desplegado = convenioAbierto === conv;

            return (
              <div key={conv} className="mb-1 border-b border-slate-50">
                <div className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={todosMarcados}
                    ref={(el) => {
                      if (el) el.indeterminate = algunoMarcado;
                    }}
                    onChange={(ev) => marcarConvenio(conv, ev.target.checked)}
                  />
                  <button
                    onClick={() => setConvenioAbierto(desplegado ? null : conv)}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      {conv} <span className="text-slate-400 font-normal normal-case">({marcados}/{lista.length})</span>
                    </span>
                    <span className="text-slate-400 text-xs">{desplegado ? "▲" : "▼"}</span>
                  </button>
                </div>
                {desplegado && (
                  <div className="pl-5 pb-1">
                    {lista.map((e) => (
                      <label key={e.id} className="flex items-center gap-2 text-sm py-1 px-1 rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!seleccion[e.id]}
                          onChange={(ev) => setSeleccion({ ...seleccion, [e.id]: ev.target.checked })}
                        />
                        <span className="text-slate-500 text-xs">{e.sap}{e.numSercomosa ? ` / ${e.numSercomosa}` : ""}</span>
                        <span className="text-slate-700 text-sm">{e.nombre}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">{totalSeleccionados} de {empleados.length} seleccionados</span>
          <div className="flex gap-2">
            <button onClick={onCancel} className="text-sm px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              disabled={totalSeleccionados === 0}
              onClick={onConfirm}
              className="text-sm px-4 py-2 rounded-lg bg-emerald-700 disabled:opacity-40 text-white hover:bg-emerald-600"
            >
              Generar informe
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export function WarningModal({ mensaje, onCancel, onConfirm }) {
  return (
    <div className="absolute inset-0 z-50">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Revisa este registro</h3>
            <p className="text-sm text-slate-600">{mensaje}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="text-sm px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button onClick={onConfirm} className="text-sm px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600">
            Registrar igualmente
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

export function ConfirmarBorradoModal({ titulo, mensaje, onCancel, onConfirm }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleConfirmar = () => {
    if (password !== PASSWORD_ELIMINAR) {
      setError("Contraseña incorrecta.");
      return;
    }
    onConfirm();
  };

  return (
    <div className="absolute inset-0 z-50">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center p-4 bg-slate-900/40">
        <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
          <div className="flex items-start gap-3 mb-3">
            <Lock className="text-rose-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">{titulo || "Confirmar borrado"}</h3>
              <p className="text-sm text-slate-600">{mensaje || "Esta acción no se puede deshacer. Introduce la contraseña para confirmar."}</p>
            </div>
          </div>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleConfirmar()}
            placeholder="Contraseña"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={onCancel} className="text-sm px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button onClick={handleConfirmar} className="text-sm px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700">
              Borrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NuevoEmpleadoForm({ onCancel, onSave }) {
  const [sap, setSap] = useState("");
  const [numSercomosa, setNumSercomosa] = useState("");
  const [nif, setNif] = useState("");
  const [nombre, setNombre] = useState("");
  const [convenio, setConvenio] = useState(CONVENIOS[0]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-800">Nuevo trabajador</h3>
        <button onClick={onCancel}>
          <X size={16} className="text-slate-400" />
        </button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <input placeholder="Id. SAP" value={sap} onChange={(e) => setSap(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        <input
          placeholder="Número de Sercomosa (opcional)"
          value={numSercomosa}
          onChange={(e) => setNumSercomosa(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <input placeholder="NIF (opcional)" value={nif} onChange={(e) => setNif(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        <input
          placeholder="Apellidos y nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-2"
        />
        <select value={convenio} onChange={(e) => setConvenio(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-3">
          {CONVENIOS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <button
        disabled={!sap || !nombre}
        onClick={() => onSave({ sap, numSercomosa, nif, nombre, convenio })}
        className="mt-3 text-sm bg-slate-900 disabled:opacity-40 text-white px-4 py-2 rounded-lg"
      >
        Guardar
      </button>
    </div>
  );
}

export function EditarEmpleadoForm({ empleado, onCancel, onSave }) {
  const [numSercomosa, setNumSercomosa] = useState(empleado.numSercomosa || "");
  const [nif, setNif] = useState(empleado.nif || "");
  const [nombre, setNombre] = useState(empleado.nombre || "");
  const [convenio, setConvenio] = useState(empleado.convenio || CONVENIOS[0]);

  const cambioConvenio = convenio !== empleado.convenio;

  return (
    <div className="bg-white border border-amber-200 bg-amber-50/30 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-800">Editar trabajador — {empleado.sap}</h3>
        <button onClick={onCancel}>
          <X size={16} className="text-slate-400" />
        </button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <input
          placeholder="Número de Sercomosa (opcional)"
          value={numSercomosa}
          onChange={(e) => setNumSercomosa(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <input placeholder="NIF (opcional)" value={nif} onChange={(e) => setNif(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        <input
          placeholder="Apellidos y nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <select value={convenio} onChange={(e) => setConvenio(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-3">
          {CONVENIOS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {cambioConvenio && (
        <p className="text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 mt-3">
          ⚠ Vas a cambiar el convenio de <strong>{empleado.convenio}</strong> a <strong>{convenio}</strong>. El % de jornada de los tramos ya guardados se
          recalculará en pantalla con la jornada de referencia del convenio nuevo (las horas exactas guardadas no se tocan). Si esto representa un cambio de
          servicio real, lo correcto es primero cerrar el último tramo con su fecha fin y luego cambiar el convenio aquí.
        </p>
      )}

      <button
        disabled={!nombre}
        onClick={() => onSave(empleado.id, { numSercomosa, nif, nombre, convenio })}
        className="mt-3 text-sm bg-amber-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
      >
        Guardar cambios
      </button>
    </div>
  );
}

const FECHA_INICIO_SISTEMA = "2026-01-01";

export function TramosPanel({ empleado, onAdd, onRemove }) {
  const referencia = JORNADA_COMPLETA_SEMANAL[empleado.convenio] || 40;
  const [form, setForm] = useState({ inicio: todayISO(), esBaja: false, horasSemana: referencia, pctComplementaria: 30 });
  const [pendingDelete, setPendingDelete] = useState(null);
  const ordenados = [...empleado.tramos]
    .filter((t) => !t.fin || t.fin >= FECHA_INICIO_SISTEMA)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const horasSemana = Number(form.horasSemana) || 0;
  const pctCalculado = Math.min(100, (horasSemana / referencia) * 100);
  const tipoCalculado = form.esBaja ? "Baja" : horasSemana >= referencia - 0.01 ? "Completa" : "Parcial";
  const cumpleMinimoLegal = horasSemana >= 10;
  const complSemanaPorPorcentaje = horasSemana * ((form.pctComplementaria || 30) / 100);
  const complSemanaMaxPorJornada = Math.max(0, referencia - horasSemana);
  const complSemanaPermitida = cumpleMinimoLegal ? Math.min(complSemanaPorPorcentaje, complSemanaMaxPorJornada) : 0;
  const limitaJornadaCompleta = tipoCalculado === "Parcial" && cumpleMinimoLegal && complSemanaMaxPorJornada < complSemanaPorPorcentaje;

  const handleAdd = () => {
    onAdd({
      inicio: form.inicio,
      tipo: tipoCalculado,
      pct: tipoCalculado === "Parcial" ? pctCalculado : 100,
      horasSemana: tipoCalculado === "Baja" ? 0 : horasSemana,
      pctComplementaria: form.pctComplementaria,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
        <CalendarRange size={15} /> Tramos de jornada
      </h3>
      <p className="text-xs text-slate-400 -mt-2 mb-3">
        Jornada completa de referencia ({empleado.convenio}): <span className="font-medium text-slate-500">{referencia}h/semana</span>
        <br />
        Solo se muestran tramos vigentes en 2026 o posteriores; los anteriores no se han borrado, solo están ocultos aquí.
      </p>

      <div className="space-y-2 mb-4 max-h-64 overflow-auto pr-1">
        {ordenados.length === 0 && <p className="text-xs text-slate-400">Sin tramos definidos todavía.</p>}
        {ordenados.map((t) => {
          const convenioTramo = t.convenio || empleado.convenio;
          const referenciaTramo = JORNADA_COMPLETA_SEMANAL[convenioTramo] || 40;
          const pctReal = referenciaTramo > 0 ? (t.horasSemana / referenciaTramo) * 100 : 0;
          const inicioMostrado = t.inicio < FECHA_INICIO_SISTEMA ? FECHA_INICIO_SISTEMA : t.inicio;
          const convenioDistinto = t.convenio && t.convenio !== empleado.convenio;
          return (
            <div key={t.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
              <div>
                <span className="font-medium">{inicioMostrado}</span> → <span className="font-medium">{t.fin || "vigente"}</span>
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded ${
                    t.tipo === "Completa" ? "bg-sky-100 text-sky-700" : t.tipo === "Parcial" ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {t.tipo} {t.tipo === "Parcial" ? `${pctReal.toFixed(2)}%` : ""}
                </span>
                {t.tipo !== "Baja" && <span className="ml-2 text-slate-400">{t.horasSemana.toFixed(2)}h/sem</span>}
                {convenioDistinto && (
                  <span className="ml-2 text-[10px] text-amber-600" title={`Este tramo pertenece a ${t.convenio}, distinto del convenio actual del trabajador`}>
                    ({t.convenio})
                  </span>
                )}
              </div>
              <button onClick={() => setPendingDelete(t.id)}>
                <Trash2 size={13} className="text-slate-300 hover:text-rose-500" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 items-end">
          <label className="text-xs text-slate-500">
            Fecha inicio
            <input type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 mt-0.5" />
          </label>
          <label className="text-xs text-slate-500 flex items-center gap-2 pb-2">
            <input type="checkbox" checked={form.esBaja} onChange={(e) => setForm({ ...form, esBaja: e.target.checked })} />
            Trabajador de baja desde esta fecha
          </label>
        </div>

        {!form.esBaja && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-500">
              Horas semanales reales
              <span className="block text-xs text-slate-400 font-normal normal-case">Formato centesimal: 37,5 = 37h 30min (no horas:minutos)</span>
              <input
                type="number"
                step="0.25"
                value={form.horasSemana}
                onChange={(e) => setForm({ ...form, horasSemana: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 mt-0.5"
              />
            </label>
            <label className="text-xs text-slate-500">
              % complementarias (si parcial)
              <input
                type="number"
                value={form.pctComplementaria}
                onChange={(e) => setForm({ ...form, pctComplementaria: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 mt-0.5"
                disabled={tipoCalculado !== "Parcial"}
              />
            </label>
          </div>
        )}

        <div className="text-xs bg-slate-50 rounded-lg px-3 py-2 flex items-center justify-between">
          {form.esBaja ? (
            <span className="text-slate-500">Periodo sin actividad: no cuenta para ningún tope ni bolsa.</span>
          ) : (
            <>
              <span className={`px-1.5 py-0.5 rounded font-medium ${tipoCalculado === "Completa" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}>
                {tipoCalculado}
              </span>
              <span className="text-slate-500">
                {horasSemana.toFixed(2)}h de {referencia.toFixed(2)}h → <span className="font-semibold text-slate-700">{pctCalculado.toFixed(2)}% de jornada</span>
              </span>
            </>
          )}
        </div>

        {tipoCalculado === "Parcial" && (
          <div className={`text-xs rounded-lg px-3 py-2 ${cumpleMinimoLegal ? "bg-slate-50 text-slate-500" : "bg-rose-50 text-rose-700"}`}>
            {!cumpleMinimoLegal ? (
              <span>
                ⛔ Con {horasSemana.toFixed(2)}h/semana no llega al mínimo de 10h/semana que exige el art. 12.5.b ET para poder pactar horas complementarias. Este tramo
                tendrá <strong>0h complementarias permitidas</strong>, sea cual sea el % que pongas.
              </span>
            ) : (
              <>
                Complementarias permitidas: <span className="font-semibold text-slate-700">{complSemanaPermitida.toFixed(2)} h/semana</span>
                {limitaJornadaCompleta ? (
                  <span className="text-amber-600">
                    {" "}
                    ⚠ limitado por la jornada completa del convenio ({referencia}h), no por el {form.pctComplementaria}% pactado (que permitiría{" "}
                    {complSemanaPorPorcentaje.toFixed(2)}h)
                  </span>
                ) : (
                  <span>
                    {" "}
                    ({form.pctComplementaria}% de {horasSemana.toFixed(2)}h)
                  </span>
                )}
              </>
            )}
          </div>
        )}

        <button onClick={handleAdd} className="w-full flex items-center justify-center gap-1 text-sm bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-700">
          <Plus size={14} /> Añadir tramo (cierra el anterior)
        </button>
      </div>

      {pendingDelete && (
        <ConfirmarBorradoModal
          titulo="Borrar tramo de jornada"
          mensaje="Esta acción no se puede deshacer. Introduce la contraseña para confirmar el borrado de este tramo."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onRemove(pendingDelete);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}

export function RegistrosPanel({ empleado, fechaCorte, onAdd, onRemove }) {
  const [form, setForm] = useState({ fecha: todayISO(), codigo: "2005", horas: "" });
  const [pendingDelete, setPendingDelete] = useState(null);
  const anio = fechaCorte.slice(0, 4);
  const ordenados = [...empleado.registros].filter((r) => r.fecha.slice(0, 4) === anio).sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
        <Clock size={15} /> Registro de horas <span className="text-xs font-normal text-slate-400">— año {anio}</span>
      </h3>

      <div className="space-y-2 mb-4 max-h-64 overflow-auto pr-1">
        {ordenados.length === 0 && <p className="text-xs text-slate-400">Sin horas registradas en {anio} todavía.</p>}
        {ordenados.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
            <div>
              <span className="font-medium">{r.fecha}</span>
              <span className={`ml-2 px-1.5 py-0.5 rounded ${CODIGOS[r.codigo]?.tipo === "extra" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}>
                {r.codigo} · {CODIGOS[r.codigo]?.label}
              </span>
              <span className="ml-2 text-slate-500">{Number(r.horas).toFixed(2)}h</span>
            </div>
            <button onClick={() => setPendingDelete(r.id)}>
              <Trash2 size={13} className="text-slate-300 hover:text-rose-500" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-slate-500 col-span-1">
            Fecha
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 mt-0.5" />
          </label>
          <label className="text-xs text-slate-500 col-span-1">
            Código
            <select value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 mt-0.5">
              {Object.entries(CODIGOS).map(([c, v]) => (
                <option key={c} value={c}>
                  {c} — {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500 col-span-1">
            Horas <span className="text-xs text-slate-400">(centesimal)</span>
            <input type="number" step="0.5" value={form.horas} onChange={(e) => setForm({ ...form, horas: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 mt-0.5" />
          </label>
        </div>
        <button
          disabled={!form.horas}
          onClick={() => onAdd({ ...form, horas: Number(form.horas) })}
          className="w-full flex items-center justify-center gap-1 text-sm bg-slate-900 disabled:opacity-40 text-white px-3 py-2 rounded-lg hover:bg-slate-700"
        >
          <Plus size={14} /> Registrar horas
        </button>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Info size={11} /> Se avisará si el código no corresponde al tipo de jornada de esa fecha.
        </p>
      </div>

      {pendingDelete && (
        <ConfirmarBorradoModal
          titulo="Borrar registro de horas"
          mensaje="Esta acción no se puede deshacer. Introduce la contraseña para confirmar el borrado de este registro."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onRemove(pendingDelete);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
