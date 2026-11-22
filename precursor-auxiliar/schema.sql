begin;

create table public.aux_committee (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  rol text unique not null check (rol in ('coordinador','secretario','superintendente_servicio'))
);

create table public.aux_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null check (length(btrim(nombre)) between 1 and 160),
  congregacion text not null check (congregacion = 'Las Brisas Spanish'),
  meses date[] not null check (cardinality(meses) between 1 and 24),
  continuo boolean not null check (not continuo or cardinality(meses) = 1),
  declaracion boolean not null check (declaracion),
  firma text not null check (length(btrim(firma)) between 1 and 160)
);

create table public.aux_approvals (
  application_id uuid references public.aux_applications(id) on delete cascade,
  rol text not null check (rol in ('coordinador','secretario','superintendente_servicio')),
  user_id uuid not null references auth.users(id),
  iniciales text not null check (length(btrim(iniciales)) between 1 and 12),
  approved_at timestamptz not null default now(),
  primary key (application_id, rol),
  unique (application_id, user_id)
);

create table public.aux_notifications (
  application_id uuid references public.aux_applications(id) on delete cascade,
  event text check (event in ('submitted','approved')),
  created_at timestamptz not null default now(),
  primary key (application_id, event)
);

alter table public.aux_committee enable row level security;
alter table public.aux_applications enable row level security;
alter table public.aux_approvals enable row level security;
alter table public.aux_notifications enable row level security;
revoke all on public.aux_committee, public.aux_applications, public.aux_approvals,
  public.aux_notifications from public, anon, authenticated;
grant select on public.aux_committee, public.aux_applications, public.aux_approvals to authenticated;
create policy "Auxiliar own membership" on public.aux_committee for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Auxiliar committee reads applications" on public.aux_applications for select to authenticated
  using (exists (select 1 from public.aux_committee where user_id = (select auth.uid())));
create policy "Auxiliar committee reads approvals" on public.aux_approvals for select to authenticated
  using (exists (select 1 from public.aux_committee where user_id = (select auth.uid())));

create function public.submit_aux_application(
  applicant text, congregation text, months date[], ongoing boolean,
  attested boolean, signature text
) returns void language plpgsql security definer set search_path = '' as $$
declare application_id uuid;
begin
  if months is null or exists (
    select 1 from unnest(months) as m(month) where month is null or extract(day from month) <> 1
  ) or cardinality(months) <> (select count(distinct month) from unnest(months) as m(month)) then
    raise exception 'Período de servicio inválido';
  end if;
  insert into public.aux_applications (nombre, congregacion, meses, continuo, declaracion, firma)
  values (btrim(applicant), congregation, months, ongoing, attested, btrim(signature))
  returning id into application_id;
  insert into public.aux_notifications values (application_id, 'submitted');
end;
$$;

create function public.approve_aux_application(application uuid, initials text)
returns void language plpgsql security definer set search_path = '' as $$
declare member_role text;
begin
  select rol into member_role from public.aux_committee where user_id = auth.uid();
  if member_role is null then
    raise exception 'Acceso no autorizado' using errcode = '42501';
  end if;
  perform 1 from public.aux_applications where id = application for update;
  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
  insert into public.aux_approvals (application_id, rol, user_id, iniciales)
    values (application, member_role, auth.uid(), btrim(initials))
    on conflict do nothing;
  if (select count(*) from public.aux_approvals where application_id = application) = 3 then
    insert into public.aux_notifications values (application, 'approved') on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.submit_aux_application(text,text,date[],boolean,boolean,text)
  from public, anon, authenticated;
revoke all on function public.approve_aux_application(uuid,text) from public, anon, authenticated;
grant execute on function public.submit_aux_application(text,text,date[],boolean,boolean,text) to anon, authenticated;
grant execute on function public.approve_aux_application(uuid,text) to authenticated;

commit;
