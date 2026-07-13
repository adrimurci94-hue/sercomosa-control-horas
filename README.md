# Control de Horas — SERCOMOSA RRHH

Control de horas extra y complementarias por trabajador, con cálculo automático
según el Estatuto de los Trabajadores (contador fijo de 80h/año para extras,
cálculo día a día para complementarias, límite del 12.4.c ET y mínimo de 10h/semana
del 12.5.b ET). Conectado a Supabase, con login solo para RRHH.

---

## ⚠️ Paso obligatorio antes de usar la app: políticas de acceso (RLS)

Ya activaste Row Level Security al crear las tablas. Eso significa que, **sin
políticas**, nadie (ni siquiera logueado) puede leer ni escribir nada. Ejecuta
esto en el SQL Editor de tu proyecto Supabase (una sola vez):

```sql
create policy "usuarios_autenticados_empleados"
on empleados for all
to authenticated
using (true)
with check (true);

create policy "usuarios_autenticados_tramos"
on tramos_jornada for all
to authenticated
using (true)
with check (true);

create policy "usuarios_autenticados_registros"
on registros_horas for all
to authenticated
using (true)
with check (true);
```

Esto dice: "cualquier usuario logueado (con Supabase Auth) puede leer y
escribir todo en estas 3 tablas". Como el acceso ya lo controla el login
(solo entra quien tenga cuenta creada en Supabase Auth), esto es suficiente
para un equipo pequeño de confianza.

---

## 🚀 Cómo ponerlo en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Probarlo en tu ordenador

```bash
npm run dev
```

Abre la URL que te indique (normalmente `http://localhost:5173`). Debería
pedirte email y contraseña — usa la cuenta que creaste en Supabase Auth
(`adrianlopez@sercomosa.es`).

### 3. Publicarlo en GitHub Pages

**a) Crea el repo en GitHub** (por ejemplo `SERCOMOSA-CONTROL-HORAS`), y sube
este código:

```bash
git init
git add .
git commit -m "Primera version"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/SERCOMOSA-CONTROL-HORAS.git
git push -u origin main
```

**b) Revisa `vite.config.js`** — la línea `base: "/sercomosa-control-horas/"`
tiene que coincidir EXACTAMENTE con el nombre de tu repo (mayúsculas incluidas
no importan en la URL, pero el nombre sí debe ser igual). Si tu repo se llama
distinto, cambia esa línea antes de desplegar.

**c) Despliega:**

```bash
npm run deploy
```

Esto construye la app y la sube a una rama especial (`gh-pages`) de tu repo.

**d) Activa GitHub Pages:** en GitHub, entra en el repo → **Settings** →
**Pages** → en "Source" elige la rama **`gh-pages`** → Save.

A los pocos minutos, la app estará en:
`https://TU-USUARIO.github.io/SERCOMOSA-CONTROL-HORAS/`

---

## 👤 Añadir más personas de RRHH

En Supabase → **Authentication** → **Users** → **Add user**. Pon su email y
una contraseña provisional, marca "Auto Confirm User". Ya puede entrar.

---

## 🗂️ Estructura del proyecto

```
src/
  App.jsx              -> componente principal, login + toda la pantalla
  Login.jsx             -> formulario de acceso (Supabase Auth)
  lib/
    supabaseClient.js   -> conexión a Supabase (URL + clave anon)
    dataStore.js        -> traduce entre el modelo de la app y las 3 tablas
    logic.js            -> cálculo de bolsas (computeBolsa) y constantes legales
    importExport.js     -> importar/exportar Excel (horas, tramos, informe)
  components/
    index.jsx           -> todos los paneles, tarjetas y ventanas emergentes
```

La lógica de negocio (`logic.js`, `importExport.js`) es la misma que se
validó en el prototipo — no se ha tocado el comportamiento, solo se ha movido
a archivos separados y se ha cambiado de dónde lee/escribe los datos.

---

## 🔑 Reglas de negocio (referencia rápida)

- **Horas extra**: contador fijo de 80h/año por trabajador, se reinicia cada 1 de enero.
- **Horas complementarias**: solo en tramos "Parcial", cálculo día a día, limitadas por
  el menor entre el % pactado del convenio y el hueco hasta la jornada completa (art. 12.4.c ET).
- Si la jornada de un tramo Parcial es **menor de 10h/semana**, no caben complementarias (art. 12.5.b ET).
- Un tramo sin fecha de fin se considera vigente y continúa igual el año siguiente.
- Códigos: `2005`/`2007`/`2492` = horas extra · `2205` = horas complementarias.
- Jornada semanal completa de referencia por convenio: Aguas 38,75h · Alumbrado 40h ·
  Jardines 37,5h · Limpieza de edificios 39h · Limpiezas Publicas 37,5h · Piscinas 40h ·
  Instalaciones Deportivas 40h.

---

## 🩹 Si algo falla

- **Pantalla en blanco tras desplegar**: revisa que `base` en `vite.config.js`
  coincide con el nombre exacto del repo.
- **"Failed to fetch" o errores de red al cargar datos**: revisa que las
  políticas de RLS de arriba estén creadas.
- **Login no funciona**: comprueba en Supabase → Authentication → Users que
  el usuario existe y está confirmado.
