-- Tabla de usuarios de la app (no confundir con auth.users)
create table if not exists public.app_users (
  id uuid primary key,
  username text not null unique,
  nombre text not null,
  password_hash text not null,
  password_salt text not null,
  is_admin boolean not null default false,
  active boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger app_users_set_updated_at
before update on public.app_users
for each row execute procedure public.set_updated_at();

-- Configuración de seguridad
create table if not exists public.security_settings (
  id smallint primary key default 1,
  max_failed_attempts int not null default 5,
  lockout_minutes int not null default 15,
  session_timeout_minutes int not null default 60,
  updated_at timestamptz not null default now()
);

insert into public.security_settings (id)
  values (1)
  on conflict (id) do nothing;

-- RLS
alter table public.app_users enable row level security;
alter table public.security_settings enable row level security;

-- Políticas permisivas básicas (compatibles con Postgres, sin IF NOT EXISTS)
drop policy if exists "read users" on public.app_users;
create policy "read users" on public.app_users
  for select
  to anon, authenticated
  using (true);

drop policy if exists "manage users" on public.app_users;
create policy "manage users" on public.app_users
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "update users" on public.app_users;
create policy "update users" on public.app_users
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "read security settings" on public.security_settings;
create policy "read security settings" on public.security_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "update security settings" on public.security_settings;
create policy "update security settings" on public.security_settings
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- Índices útiles
create index if not exists app_users_username_idx on public.app_users (username);
create index if not exists app_users_locked_until_idx on public.app_users (locked_until);
