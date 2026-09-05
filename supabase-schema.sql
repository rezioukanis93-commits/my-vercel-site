-- ELVRA database schema
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Your Name',
  slug text not null unique,
  bio text default '',
  location text default '',
  website text default '',
  avatar_url text,
  cover_url text,
  accent text not null default '#00D084',
  auto_color boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  value text not null,
  url text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  link_id uuid references public.profile_links(id) on delete set null,
  event_type text not null check (event_type in ('visit','click')),
  created_at timestamptz not null default now()
);

create index if not exists profile_links_profile_idx on public.profile_links(profile_id, sort_order);
create index if not exists analytics_profile_idx on public.analytics_events(profile_id, created_at desc);
create index if not exists analytics_link_idx on public.analytics_events(link_id, event_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_slug text;
  final_slug text;
begin
  base_slug := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1), 'user'), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'user'; end if;
  final_slug := left(base_slug, 32) || '-' || substr(new.id::text, 1, 6);
  insert into public.profiles(id, display_name, slug)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name','Your Name'), final_slug)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.profile_links enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_owner_insert on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_select on public.profiles for select to authenticated using (auth.uid() = id);
create policy profiles_owner_insert on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_owner_update on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists links_owner_select on public.profile_links;
drop policy if exists links_owner_insert on public.profile_links;
drop policy if exists links_owner_update on public.profile_links;
drop policy if exists links_owner_delete on public.profile_links;
create policy links_owner_select on public.profile_links for select to authenticated using (auth.uid() = profile_id);
create policy links_owner_insert on public.profile_links for insert to authenticated with check (auth.uid() = profile_id);
create policy links_owner_update on public.profile_links for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy links_owner_delete on public.profile_links for delete to authenticated using (auth.uid() = profile_id);

drop policy if exists analytics_owner_select on public.analytics_events;
create policy analytics_owner_select on public.analytics_events for select to authenticated using (auth.uid() = profile_id);

create or replace function public.get_public_profile(p_slug text)
returns table (id uuid, display_name text, slug text, bio text, location text, website text, avatar_url text, cover_url text, accent text)
language sql
security definer set search_path = public
as $$
  select p.id,p.display_name,p.slug,p.bio,p.location,p.website,p.avatar_url,p.cover_url,p.accent
  from public.profiles p
  where p.slug = p_slug
  limit 1;
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;

create or replace function public.get_public_links(p_profile_id uuid)
returns table (id uuid, type text, title text, value text, url text, sort_order integer)
language sql
security definer set search_path = public
as $$
  select l.id,l.type,l.title,l.value,l.url,l.sort_order
  from public.profile_links l
  where l.profile_id = p_profile_id and l.active = true
  order by l.sort_order, l.created_at;
$$;

grant execute on function public.get_public_links(uuid) to anon, authenticated;

create or replace function public.record_profile_event(p_profile_id uuid, p_event_type text, p_link_id uuid default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_event_type not in ('visit','click') then
    raise exception 'Invalid event type';
  end if;
  if p_event_type = 'click' and p_link_id is null then
    raise exception 'A link id is required for click events';
  end if;
  if p_event_type = 'click' and not exists (select 1 from public.profile_links where id = p_link_id and profile_id = p_profile_id and active) then
    raise exception 'Invalid link';
  end if;
  insert into public.analytics_events(profile_id,link_id,event_type) values (p_profile_id,p_link_id,p_event_type);
end;
$$;

grant execute on function public.record_profile_event(uuid,text,uuid) to anon, authenticated;

create or replace function public.get_profile_stats(p_profile_id uuid)
returns table (visits bigint, clicks bigint, top_links jsonb)
language plpgsql
security definer set search_path = public
as $$
declare
  v_visits bigint;
  v_clicks bigint;
  v_top jsonb;
begin
  if auth.uid() <> p_profile_id then
    raise exception 'Not allowed';
  end if;
  select count(*) into v_visits from public.analytics_events where profile_id = p_profile_id and event_type='visit';
  select count(*) into v_clicks from public.analytics_events where profile_id = p_profile_id and event_type='click';
  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'title', q.title, 'type', q.type, 'clicks', q.clicks) order by q.clicks desc), '[]'::jsonb)
    into v_top
  from (
    select l.id,l.title,l.type,count(e.id)::bigint clicks
    from public.profile_links l
    left join public.analytics_events e on e.link_id=l.id and e.event_type='click'
    where l.profile_id=p_profile_id
    group by l.id,l.title,l.type
    order by count(e.id) desc, l.sort_order
    limit 10
  ) q;
  return query select v_visits,v_clicks,v_top;
end;
$$;

grant execute on function public.get_profile_stats(uuid) to authenticated;

-- Optional but recommended: let authenticated users update their own email/display metadata through Supabase Auth UI/API only.
