create extension if not exists pgcrypto;

create table if not exists public.families (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_access (
  family_id uuid primary key references public.families(id) on delete cascade,
  code_hash text not null
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id,user_id)
);

create table if not exists public.family_words (
  family_id uuid not null references public.families(id) on delete cascade,
  word text not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  primary key (family_id,word)
);

create table if not exists public.family_attempts (
  event_id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  word text not null,
  result text not null check (result in ('lido','nao')),
  who text not null check (who in ('gabriela','adulto')),
  duration_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.family_settings (
  family_id uuid primary key references public.families(id) on delete cascade,
  case_mode text not null default 'lower' check (case_mode in ('lower','upper')),
  adaptive boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.families(id,name)
values ('91cb1562-7220-4bd9-8faa-8eb3886086bb','Gabriela')
on conflict (id) do nothing;

alter table public.families enable row level security;
alter table public.family_access enable row level security;
alter table public.family_members enable row level security;
alter table public.family_words enable row level security;
alter table public.family_attempts enable row level security;
alter table public.family_settings enable row level security;

drop policy if exists "members see own membership" on public.family_members;
drop policy if exists "members use family words" on public.family_words;
drop policy if exists "members use family attempts" on public.family_attempts;
drop policy if exists "members use family settings" on public.family_settings;

create policy "members see own membership"
on public.family_members for select to authenticated
using (auth.uid() = user_id);

create policy "members use family words"
on public.family_words for all to authenticated
using (exists (select 1 from public.family_members m where m.family_id = family_words.family_id and m.user_id = auth.uid()))
with check (exists (select 1 from public.family_members m where m.family_id = family_words.family_id and m.user_id = auth.uid()));

create policy "members use family attempts"
on public.family_attempts for all to authenticated
using (exists (select 1 from public.family_members m where m.family_id = family_attempts.family_id and m.user_id = auth.uid()))
with check (exists (select 1 from public.family_members m where m.family_id = family_attempts.family_id and m.user_id = auth.uid()));

create policy "members use family settings"
on public.family_settings for all to authenticated
using (exists (select 1 from public.family_members m where m.family_id = family_settings.family_id and m.user_id = auth.uid()))
with check (exists (select 1 from public.family_members m where m.family_id = family_settings.family_id and m.user_id = auth.uid()));

create or replace function public.join_family(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
begin
  select a.family_id into v_family
  from public.family_access a
  where crypt(p_code,a.code_hash) = a.code_hash
  limit 1;

  if v_family is null then
    raise exception 'Código de acesso inválido';
  end if;

  insert into public.family_members(family_id,user_id)
  values (v_family,auth.uid())
  on conflict do nothing;

  return v_family;
end;
$$;

revoke all on function public.join_family(text) from public;
grant execute on function public.join_family(text) to authenticated;

grant select on public.family_members to authenticated;
grant select,insert,update,delete on public.family_words to authenticated;
grant select,insert,update,delete on public.family_attempts to authenticated;
grant select,insert,update,delete on public.family_settings to authenticated;

create index if not exists family_attempts_family_created_idx on public.family_attempts(family_id,created_at);
create index if not exists family_attempts_family_word_idx on public.family_attempts(family_id,word);

-- O código privado da família não deve ser salvo em um repositório público.
-- Configure o hash do código separadamente pelo SQL Editor.
