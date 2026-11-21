-- =====================================================================
-- S-73-S  ·  Supabase schema
-- Paste this whole file in Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- Tables ----------------------------------------------------

create table if not exists public.applications (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  apellidos        text not null check (char_length(apellidos) <= 120),
  primer_nombre    text not null check (char_length(primer_nombre) <= 120),
  segundo_nombre   text check (char_length(segundo_nombre) <= 120),

  direccion        text check (char_length(direccion) <= 300),
  ciudad           text check (char_length(ciudad) <= 120),
  estado           text check (char_length(estado) <= 120),
  codigo_postal    text check (char_length(codigo_postal) <= 20),
  email            text check (char_length(email) <= 200),
  tel_fijo         text check (char_length(tel_fijo) <= 40),
  celular          text check (char_length(celular) <= 40),

  cong_nombre      text check (char_length(cong_nombre) <= 200),
  cong_ciudad      text check (char_length(cong_ciudad) <= 120),
  cong_estado      text check (char_length(cong_estado) <= 120),

  idiomas          text check (char_length(idiomas) <= 300),

  fecha_nacimiento date,
  fecha_bautismo   date,
  sexo             text check (sexo in ('masculino','femenino')),

  estado_civil     text check (estado_civil in ('casado','soltero','divorciado','separado','viudo')),
  conyuge          text check (char_length(conyuge) <= 200),

  sirve_como       text[] not null default '{}',
  sirve_otro       text check (char_length(sirve_otro) <= 200),

  desea_capacidad  text check (desea_capacidad in ('si','no')),
  participo_antes  text check (participo_antes in ('si','no')),
  lugares          text check (char_length(lugares) <= 500),

  disponibilidad   jsonb not null default '{}',   -- {lunes:'M', martes:'TD', ...}
  fines_semana     jsonb not null default '{}',   -- {sabado:2, domingo:1}

  firma            text check (char_length(firma) <= 200),
  firma_fecha      date
);

create table if not exists public.profiles (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  nombre   text not null,
  rol      text not null check (rol in ('coordinador','secretario','superintendente_servicio'))
);
-- one person per role
create unique index if not exists profiles_rol_unique on public.profiles(rol);

create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  rol             text not null check (rol in ('coordinador','secretario','superintendente_servicio')),
  user_id         uuid not null references auth.users(id),
  respuestas      jsonb not null default '{}',   -- {q1:'si', q2:'no', q6a:'si', ...}
  calificaciones  jsonb not null default '{}',   -- {apariencia:{g:'A', n:'comentario'}, ...}
  firma           text check (char_length(firma) <= 200),
  firma_fecha     date,
  updated_at      timestamptz not null default now(),
  unique (application_id, rol)
);

create table if not exists public.comments (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  user_id         uuid not null references auth.users(id),
  author_name     text not null,
  rol             text not null,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
);

-- ---------- Indexes ----------------------------------------------------
create index if not exists applications_created_idx on public.applications (created_at desc);
create index if not exists comments_app_idx         on public.comments (application_id, created_at);
create index if not exists reviews_user_idx         on public.reviews (user_id);

-- ---------- Helpers (in a PRIVATE schema, not exposed by the Data API) -------
-- SECURITY DEFINER is needed so the policies can read `profiles` without recursion.
-- Kept out of `public` so they are not callable as API endpoints.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_committee()
returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (select 1 from public.profiles where user_id = (select auth.uid()));
$$;

create or replace function private.my_role()
returns text
language sql security definer stable
set search_path = ''
as $$
  select rol from public.profiles where user_id = (select auth.uid());
$$;

revoke all on function private.is_committee() from public, anon;
revoke all on function private.my_role()      from public, anon;
grant execute on function private.is_committee() to authenticated;
grant execute on function private.my_role()      to authenticated;

-- ---------- Row Level Security ----------------------------------------
alter table public.applications enable row level security;
alter table public.profiles     enable row level security;
alter table public.reviews      enable row level security;
alter table public.comments     enable row level security;

-- applications: anyone can SUBMIT (public form); only committee can READ
drop policy if exists "submit application"   on public.applications;
drop policy if exists "committee reads apps" on public.applications;
create policy "submit application" on public.applications
  for insert to anon, authenticated with check (true);
create policy "committee reads apps" on public.applications
  for select to authenticated using ((select private.is_committee()));

-- profiles: committee can read names/roles
drop policy if exists "committee reads profiles" on public.profiles;
create policy "committee reads profiles" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_committee()));

-- reviews: committee reads all; each person writes ONLY their own role's row
drop policy if exists "committee reads reviews" on public.reviews;
drop policy if exists "write own review"        on public.reviews;
drop policy if exists "update own review"       on public.reviews;
create policy "committee reads reviews" on public.reviews
  for select to authenticated using ((select private.is_committee()));
create policy "write own review" on public.reviews
  for insert to authenticated
  with check (user_id = (select auth.uid()) and rol = (select private.my_role()));
create policy "update own review" on public.reviews
  for update to authenticated
  using      (user_id = (select auth.uid()) and rol = (select private.my_role()))
  with check (user_id = (select auth.uid()) and rol = (select private.my_role()));

-- comments: committee reads all, writes as themselves
drop policy if exists "committee reads comments"  on public.comments;
drop policy if exists "committee writes comments" on public.comments;
create policy "committee reads comments" on public.comments
  for select to authenticated using ((select private.is_committee()));
create policy "committee writes comments" on public.comments
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and (select private.is_committee())
              and rol = (select private.my_role()));

-- ---------- Grants (needed for the Data API) --------------------------
grant usage on schema public to anon, authenticated;
grant insert                 on public.applications to anon, authenticated;
grant select                 on public.applications to authenticated;
grant select                 on public.profiles     to authenticated;
grant select, insert, update on public.reviews      to authenticated;
grant select, insert         on public.comments     to authenticated;

-- =====================================================================
-- AFTER running the above:
-- 1) Supabase > Authentication > Providers > Email: turn OFF "Allow new users to sign up"
-- 2) Supabase > Authentication > Users > "Add user" (email + password, auto-confirm) x3
-- 3) Run this for each person (change the email, name and role):
--
-- insert into public.profiles (user_id, nombre, rol)
-- select id, 'Nombre Apellido', 'coordinador'            -- or 'secretario' / 'superintendente_servicio'
-- from auth.users where email = 'correo@ejemplo.com';
-- =====================================================================
