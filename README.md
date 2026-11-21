# Solicitud S-73-S · formulario en línea

Sitio estático (GitHub Pages) + Supabase como base de datos y login.

| Archivo | Qué es |
|---|---|
| `index.html` + `form.js` | Formulario público del solicitante (página 1) |
| `comite.html` + `comite.js` | Página privada del comité: lista, detalle, evaluación, comentarios, imprimir |
| `config.js` | URL y llave pública de Supabase (lo único que hay que editar) |
| `schema.sql` | Tablas y reglas de seguridad |
| `style.css` | Estilos |

## Puesta en marcha

> El proyecto Supabase `s73-comite` ya está creado, con las tablas y reglas aplicadas, y `config.js` ya tiene su URL y llave pública.
> Solo faltan los pasos 3 y 4 de la sección Supabase (desactivar registro, crear las 3 cuentas) y la sección GitHub Pages.

(Referencia completa, por si se repite en otro proyecto:)

### 1. Supabase
1. Crea una cuenta en supabase.com → **New project** (plan gratis).
2. **SQL Editor → New query**: pega todo `schema.sql` → **Run**.
3. **Authentication → Providers → Email**: apaga **"Allow new users to sign up"** (para que nadie más pueda crear cuenta).
4. **Authentication → Users → Add user**: crea las 3 cuentas (correo + contraseña, marca *Auto Confirm*).
5. En **SQL Editor** corre esto una vez por persona (cambia correo, nombre y rol):
   ```sql
   insert into public.profiles (user_id, nombre, rol)
   select id, 'Nombre Apellido', 'coordinador'   -- 'secretario' | 'superintendente_servicio'
   from auth.users where email = 'correo@ejemplo.com';
   ```
6. **Project Settings → API**: copia **Project URL** y la llave **anon public**.

### 2. config.js
Pega esos dos valores en `config.js`. **Nunca** uses la llave `service_role`.

### 3. GitHub Pages
1. Crea un repositorio y sube estos archivos a la raíz.
2. **Settings → Pages → Deploy from a branch → main / (root)**.
3. Listo:
   - Solicitantes: `https://TU-USUARIO.github.io/TU-REPO/`
   - Comité: `https://TU-USUARIO.github.io/TU-REPO/comite.html`

## Seguridad
- La llave anon es pública por diseño; los datos se protegen con las reglas (RLS) de `schema.sql`:
  cualquiera puede **enviar** una solicitud, pero solo el comité con sesión puede **leer** y cada persona solo **edita su propia** evaluación.
- No subas datos reales al repositorio. Prueba con datos falsos.
- Las páginas llevan `noindex` para que Google no las muestre.
- Para borrar una solicitud: Supabase → Table Editor → `applications` → borrar fila.
