-- ELVRA v2 database schema / migration
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text not null default 'Your Name',
  slug text not null unique,
  bio text default '', location text default '', website text default '',
  avatar_url text, cover_url text,
  accent text not null default '#00D084',
  auto_color boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;

-- Backfill usernames for profiles created by the previous ELVRA version.
update public.profiles
set username = regexp_replace(lower(slug), '-[a-f0-9]{6}$', '')
where username is null or username = '';

-- Resolve legacy duplicate usernames before enforcing uniqueness.
do $$
declare r record; base text; candidate text; n integer;
begin
  for r in select id, username from public.profiles where username is not null and username <> '' group by id, username having count(*) >= 1 loop
    base := lower(regexp_replace(r.username,'[^a-z0-9_-]','','g'));
    if base = '' then base := 'user'; end if;
    candidate := base; n := 0;
    while exists(select 1 from public.profiles p where p.id <> r.id and lower(p.username)=lower(candidate)) loop
      n := n + 1; candidate := left(base,25)||'-'||n;
    end loop;
    if candidate <> r.username then update public.profiles set username=candidate, slug=candidate where id=r.id; end if;
  end loop;
end $$;

create unique index if not exists profiles_username_uidx on public.profiles(lower(username));

create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, title text not null, value text not null, url text not null,
  sort_order integer not null default 0, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  link_id uuid references public.profile_links(id) on delete set null,
  event_type text not null check (event_type in ('visit','click')), created_at timestamptz not null default now()
);
create index if not exists profile_links_profile_idx on public.profile_links(profile_id,sort_order);
create index if not exists analytics_profile_idx on public.analytics_events(profile_id,created_at desc);
create index if not exists analytics_link_idx on public.analytics_events(link_id,event_type);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare u text; base_slug text; final_slug text; candidate text; n integer := 0;
begin
  u := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1), 'user'),'[^a-zA-Z0-9_-]','','g'));
  if u='' then u:='user'; end if;
  base_slug:=u; candidate:=base_slug;
  while exists(select 1 from public.profiles where lower(username)=lower(candidate) or lower(slug)=lower(candidate)) loop
    n:=n+1; candidate:=left(base_slug,25)||'-'||n;
  end loop;
  insert into public.profiles(id,username,display_name,slug)
  values(new.id,candidate,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),candidate),candidate)
  on conflict(id) do update set username=excluded.username,slug=excluded.slug;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.profile_links enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_owner_insert on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_select on public.profiles for select to authenticated using(auth.uid()=id);
create policy profiles_owner_insert on public.profiles for insert to authenticated with check(auth.uid()=id);
create policy profiles_owner_update on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);

drop policy if exists links_owner_select on public.profile_links;
drop policy if exists links_owner_insert on public.profile_links;
drop policy if exists links_owner_update on public.profile_links;
drop policy if exists links_owner_delete on public.profile_links;
create policy links_owner_select on public.profile_links for select to authenticated using(auth.uid()=profile_id);
create policy links_owner_insert on public.profile_links for insert to authenticated with check(auth.uid()=profile_id);
create policy links_owner_update on public.profile_links for update to authenticated using(auth.uid()=profile_id) with check(auth.uid()=profile_id);
create policy links_owner_delete on public.profile_links for delete to authenticated using(auth.uid()=profile_id);

drop policy if exists analytics_owner_select on public.analytics_events;
create policy analytics_owner_select on public.analytics_events for select to authenticated using(auth.uid()=profile_id);

create or replace function public.is_username_available(p_username text) returns boolean language sql security definer set search_path=public as $$
  select not exists(select 1 from public.profiles where lower(username)=lower(trim(p_username)) or lower(slug)=lower(trim(p_username)));
$$;
grant execute on function public.is_username_available(text) to anon,authenticated;

create or replace function public.get_public_profile(p_slug text)
returns table(id uuid,username text,display_name text,slug text,bio text,location text,website text,avatar_url text,cover_url text,accent text)
language sql security definer set search_path=public as $$
  select p.id,p.username,p.display_name,p.slug,p.bio,p.location,p.website,p.avatar_url,p.cover_url,p.accent
  from public.profiles p where lower(p.slug)=lower(trim(p_slug)) or lower(p.username)=lower(trim(p_slug)) limit 1;
$$;
grant execute on function public.get_public_profile(text) to anon,authenticated;

create or replace function public.get_public_links(p_profile_id uuid)
returns table(id uuid,type text,title text,value text,url text,sort_order integer)
language sql security definer set search_path=public as $$
  select l.id,l.type,l.title,l.value,l.url,l.sort_order from public.profile_links l where l.profile_id=p_profile_id and l.active=true order by l.sort_order,l.created_at;
$$;
grant execute on function public.get_public_links(uuid) to anon,authenticated;

create or replace function public.record_profile_event(p_profile_id uuid,p_event_type text,p_link_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_event_type not in('visit','click') then raise exception 'Invalid event type'; end if;
  if p_event_type='click' and p_link_id is null then raise exception 'A link id is required for click events'; end if;
  if p_event_type='click' and not exists(select 1 from public.profile_links where id=p_link_id and profile_id=p_profile_id and active) then raise exception 'Invalid link'; end if;
  insert into public.analytics_events(profile_id,link_id,event_type) values(p_profile_id,p_link_id,p_event_type);
end; $$;
grant execute on function public.record_profile_event(uuid,text,uuid) to anon,authenticated;

create or replace function public.get_profile_stats(p_profile_id uuid)
returns table(visits bigint,clicks bigint,top_links jsonb)
language plpgsql security definer set search_path=public as $$
declare v_visits bigint; v_clicks bigint; v_top jsonb;
begin
  if auth.uid()<>p_profile_id then raise exception 'Not allowed'; end if;
  select count(*) into v_visits from public.analytics_events where profile_id=p_profile_id and event_type='visit';
  select count(*) into v_clicks from public.analytics_events where profile_id=p_profile_id and event_type='click';
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'title',q.title,'type',q.type,'clicks',q.clicks) order by q.clicks desc),'[]'::jsonb) into v_top
  from (select l.id,l.title,l.type,count(e.id)::bigint clicks from public.profile_links l left join public.analytics_events e on e.link_id=l.id and e.event_type='click' where l.profile_id=p_profile_id group by l.id,l.title,l.type order by count(e.id) desc,l.sort_order limit 10) q;
  return query select v_visits,v_clicks,v_top;
end; $$;
grant execute on function public.get_profile_stats(uuid) to authenticated;


-- ELVRA v2.1 reliability migration
-- Safe to run after the original schema. Adds public read views, stable slug aliases,
-- robust RPCs, and explicitly asks PostgREST to reload its schema cache.

create table if not exists public.profile_slug_aliases (
  slug text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists profile_slug_aliases_profile_idx on public.profile_slug_aliases(profile_id);

alter table public.profile_slug_aliases enable row level security;
drop policy if exists profile_slug_aliases_owner_select on public.profile_slug_aliases;
create policy profile_slug_aliases_owner_select on public.profile_slug_aliases
  for select to authenticated using(auth.uid()=profile_id);


create or replace function public.remember_old_profile_slug()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.slug is not null and new.slug is not null and lower(old.slug) <> lower(new.slug) then
    if not exists (select 1 from public.profiles where id <> old.id and lower(slug)=lower(old.slug)) then
      insert into public.profile_slug_aliases(slug, profile_id)
      values(lower(old.slug), old.id)
      on conflict (slug) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_slug_aliases on public.profiles;
create trigger profiles_slug_aliases
before update of slug on public.profiles
for each row execute function public.remember_old_profile_slug();

-- Keep public reads narrowly scoped to fields that belong on the digital card.
drop view if exists public.public_profiles cascade;
create view public.public_profiles as
select p.id,p.username,p.display_name,p.slug,p.bio,p.location,p.website,p.avatar_url,p.cover_url,p.accent
from public.profiles p
union all
select p.id,p.username,p.display_name,a.slug,p.bio,p.location,p.website,p.avatar_url,p.cover_url,p.accent
from public.profile_slug_aliases a
join public.profiles p on p.id=a.profile_id;

drop view if exists public.public_profile_links;
create view public.public_profile_links as
select l.id,l.profile_id,l.type,l.title,l.value,l.url,l.sort_order
from public.profile_links l
where l.active=true;

grant select on public.public_profiles, public.public_profile_links to anon, authenticated;

-- Recreate public profile RPCs so the signatures are exactly what the app calls.
drop function if exists public.get_public_profile(text);
create or replace function public.get_public_profile(p_slug text)
returns table(id uuid,username text,display_name text,slug text,bio text,location text,website text,avatar_url text,cover_url text,accent text)
language sql
security definer
set search_path=public
as $$
  select v.id,v.username,v.display_name,v.slug,v.bio,v.location,v.website,v.avatar_url,v.cover_url,v.accent
  from public.public_profiles v
  where lower(v.slug)=lower(trim(p_slug)) or lower(v.username)=lower(trim(p_slug))
  limit 1;
$$;
grant execute on function public.get_public_profile(text) to anon, authenticated;

drop function if exists public.get_public_links(uuid);
create or replace function public.get_public_links(p_profile_id uuid)
returns table(id uuid,type text,title text,value text,url text,sort_order integer)
language sql
security definer
set search_path=public
as $$
  select l.id,l.type,l.title,l.value,l.url,l.sort_order
  from public.public_profile_links l
  where l.profile_id=p_profile_id
  order by l.sort_order,l.id;
$$;
grant execute on function public.get_public_links(uuid) to anon, authenticated;

-- Anonymous visitors may record only visits/clicks through this validated function.
drop function if exists public.record_profile_event(uuid,text,uuid);
create or replace function public.record_profile_event(p_profile_id uuid,p_event_type text,p_link_id uuid default null)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_event_type not in ('visit','click') then
    raise exception 'Invalid event type';
  end if;
  if not exists (select 1 from public.profiles where id=p_profile_id) then
    raise exception 'Profile not found';
  end if;
  if p_event_type='click' then
    if p_link_id is null then raise exception 'A link id is required for click events'; end if;
    if not exists(select 1 from public.profile_links where id=p_link_id and profile_id=p_profile_id and active=true) then
      raise exception 'Invalid link';
    end if;
  else
    p_link_id := null;
  end if;
  insert into public.analytics_events(profile_id,link_id,event_type)
  values(p_profile_id,p_link_id,p_event_type);
end;
$$;
grant execute on function public.record_profile_event(uuid,text,uuid) to anon, authenticated;

-- Keep the old stats RPC available for any older client, but make it bulletproof.
drop function if exists public.get_profile_stats(uuid);
create or replace function public.get_profile_stats(p_profile_id uuid)
returns table(visits bigint,clicks bigint,top_links jsonb)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_visits bigint;
  v_clicks bigint;
  v_top jsonb;
begin
  if auth.uid()<>p_profile_id then raise exception 'Not allowed'; end if;
  select count(*) into v_visits from public.analytics_events where profile_id=p_profile_id and event_type='visit';
  select count(*) into v_clicks from public.analytics_events where profile_id=p_profile_id and event_type='click';
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'title',q.title,'type',q.type,'clicks',q.clicks) order by q.clicks desc,q.sort_order),'[]'::jsonb)
    into v_top
  from (
    select l.id,l.title,l.type,l.sort_order,count(e.id)::bigint clicks
    from public.profile_links l
    left join public.analytics_events e on e.link_id=l.id and e.event_type='click'
    where l.profile_id=p_profile_id
    group by l.id,l.title,l.type,l.sort_order
    limit 10
  ) q;
  return query select v_visits,v_clicks,v_top;
end;
$$;
grant execute on function public.get_profile_stats(uuid) to authenticated;

-- Useful diagnostic RPC: returns whether the current profile and analytics tables are reachable.
drop function if exists public.get_elvra_health(uuid);
create or replace function public.get_elvra_health(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid()<>p_profile_id then raise exception 'Not allowed'; end if;
  return jsonb_build_object(
    'profile_exists', exists(select 1 from public.profiles where id=p_profile_id),
    'links_count', (select count(*) from public.profile_links where profile_id=p_profile_id),
    'events_count', (select count(*) from public.analytics_events where profile_id=p_profile_id)
  );
end;
$$;
grant execute on function public.get_elvra_health(uuid) to authenticated;

-- Ask PostgREST/Supabase API to refresh its schema cache immediately.
select pg_notify('pgrst','reload schema');
