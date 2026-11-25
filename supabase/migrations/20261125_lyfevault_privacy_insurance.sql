begin;

create sequence if not exists public.lyfevault_card_id_seq as integer minvalue 1000 maxvalue 3000 start with 1000 no cycle;

select setval(
  'public.lyfevault_card_id_seq',
  greatest(999, coalesce(max(substring(card_id from '^LV-([0-9]{4})$')::integer), 999)),
  true
)
from public.profiles
where card_id ~ '^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$';

with duplicates as (
  select ctid,
         row_number() over (partition by card_id order by auth_user_id nulls last, email) as duplicate_number
  from public.profiles
  where card_id ~ '^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$'
),
needs_id as (
  select p.ctid,
         row_number() over (order by p.auth_user_id nulls last, p.email, p.ctid) as row_number
  from public.profiles p
  left join duplicates d on d.ctid = p.ctid
  where p.card_id is null
     or p.card_id !~ '^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$'
     or d.duplicate_number > 1
),
available_ids as (
  select gs.card_number,
         row_number() over (order by gs.card_number) as row_number
  from generate_series(1000, 3000) as gs(card_number)
  where not exists (
    select 1 from public.profiles p where p.card_id = 'LV-' || gs.card_number::text
  )
)
update public.profiles p
set card_id = 'LV-' || a.card_number::text
from needs_id n
join available_ids a on a.row_number = n.row_number
where p.ctid = n.ctid;

do $$
begin
  if exists (
    select 1 from public.profiles
    where card_id is null or card_id !~ '^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$'
  ) or exists (
    select 1 from public.profiles group by card_id having count(*) > 1
  ) then
    raise exception 'Unable to assign unique LV-1000 to LV-3000 Card IDs to every existing profile';
  end if;
end;
$$;

update public.profiles p
set auth_user_id = u.id
from auth.users u
where p.auth_user_id is null and lower(p.email) = lower(u.email);

create unique index if not exists profiles_card_id_unique on public.profiles(card_id);
create unique index if not exists profiles_auth_user_id_unique on public.profiles(auth_user_id);
insert into public.profiles (
  auth_user_id, email, name, dob, blood_group, gender, card_id,
  allergies, conditions, medications, contacts, updated_at
)
select
  u.id,
  lower(u.email),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data ->> 'dob', ''),
  coalesce(u.raw_user_meta_data ->> 'blood_group', ''),
  coalesce(u.raw_user_meta_data ->> 'gender', ''),
  'LV-' || nextval('public.lyfevault_card_id_seq')::text,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  floor(extract(epoch from now()) * 1000)::bigint
from auth.users u
where u.email is not null
  and not exists (select 1 from public.profiles p where p.auth_user_id = u.id or lower(p.email) = lower(u.email));

revoke insert, update, select on public.profiles from authenticated;
grant select (auth_user_id, email, name, dob, blood_group, gender, card_id, allergies, conditions, medications, contacts, updated_at)
  on public.profiles to authenticated;
grant update (name, dob, blood_group, gender, allergies, conditions, medications, contacts, updated_at)
  on public.profiles to authenticated;
revoke select on public.dependents from authenticated;
grant select (id, owner_email, guardian_id, dependent_type, name, dob, relationship, blood_group, allergies, conditions, medications, contacts, assigned_email, medi_tag_id)
  on public.dependents to authenticated;

create or replace function public.protect_lyfevault_card_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and new.card_id is distinct from old.card_id then
    raise exception 'Card IDs are assigned by LyfeVault and cannot be changed';
  end if;
  return new;
end;
$$;
create trigger protect_lyfevault_card_id
before insert or update on public.profiles
for each row execute function public.protect_lyfevault_card_id();

create or replace function public.assign_lyfevault_card_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));
begin
  if new.email is null then
    return new;
  end if;
  if coalesce(new.raw_user_meta_data ->> 'health_data_consent', 'false') <> 'true' then
    raise exception 'Health-data consent is required to create an account';
  end if;

  update public.profiles
  set auth_user_id = new.id,
      email = lower(new.email),
      name = coalesce(nullif(name, ''), profile_name),
      card_id = case
        when card_id ~ '^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$' then card_id
        else 'LV-' || nextval('public.lyfevault_card_id_seq')::text
      end,
      updated_at = floor(extract(epoch from now()) * 1000)::bigint
  where lower(email) = lower(new.email) and auth_user_id is null;

  if not found then
    insert into public.profiles (
      auth_user_id, email, name, dob, blood_group, gender, card_id,
      allergies, conditions, medications, contacts, updated_at
    ) values (
      new.id,
      lower(new.email),
      profile_name,
      coalesce(new.raw_user_meta_data ->> 'dob', ''),
      coalesce(new.raw_user_meta_data ->> 'blood_group', ''),
      coalesce(new.raw_user_meta_data ->> 'gender', ''),
      'LV-' || nextval('public.lyfevault_card_id_seq')::text,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      floor(extract(epoch from now()) * 1000)::bigint
    )
    on conflict (auth_user_id) do update
      set email = excluded.email,
          name = coalesce(nullif(public.profiles.name, ''), excluded.name),
          card_id = case
            when public.profiles.card_id ~ '^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$' then public.profiles.card_id
            else excluded.card_id
          end,
          updated_at = excluded.updated_at;
  end if;

  insert into public.user_privacy_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  insert into public.privacy_audit_logs (user_id, action, details)
  values (new.id, 'consent_granted', jsonb_build_object('policy_version', new.raw_user_meta_data ->> 'consent_version'));

  return new;
end;
$$;

create table if not exists public.user_privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mask_sensitive_fields boolean not null default true,
  practitioner_insurance_visible boolean not null default false,
  consent_active boolean not null default true,
  consent_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.user_privacy_settings(user_id)
select distinct auth_user_id from public.profiles where auth_user_id is not null
on conflict (user_id) do nothing;
alter table public.user_privacy_settings enable row level security;
revoke all on public.user_privacy_settings from anon, authenticated;
grant select, insert, update on public.user_privacy_settings to authenticated;
create policy user_privacy_settings_owner_select on public.user_privacy_settings
  for select to authenticated using (user_id = auth.uid());
create policy user_privacy_settings_owner_insert on public.user_privacy_settings
  for insert to authenticated with check (user_id = auth.uid());
create policy user_privacy_settings_owner_update on public.user_privacy_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.privacy_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('insurance_reveal','ecard_view','practitioner_access','settings_update','consent_granted','consent_withdrawn','data_export','account_deletion_requested')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists privacy_audit_logs_user_created_idx on public.privacy_audit_logs(user_id, created_at desc);
alter table public.privacy_audit_logs enable row level security;
revoke all on public.privacy_audit_logs from anon, authenticated;
grant select on public.privacy_audit_logs to authenticated;
create policy privacy_audit_logs_owner_select on public.privacy_audit_logs
  for select to authenticated using (user_id = auth.uid());

create or replace function public.log_privacy_activity(p_action text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_action not in (
    'insurance_reveal','ecard_view','practitioner_access','settings_update','consent_granted','consent_withdrawn','data_export','account_deletion_requested'
  ) then
    raise exception 'Invalid privacy activity';
  end if;
  insert into public.privacy_audit_logs(user_id, action, details)
  values (auth.uid(), p_action, coalesce(p_details, '{}'::jsonb));
end;
$$;
revoke all on function public.log_privacy_activity(text,jsonb) from public, anon;
grant execute on function public.log_privacy_activity(text,jsonb) to authenticated;

create table if not exists public.health_insurance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider_name text not null,
  plan_name text not null default '',
  plan_type text not null default 'Individual' check (plan_type in ('Individual','Family Floater','Group')),
  policy_number text not null,
  member_id text not null default '',
  group_number text not null default '',
  tpa_name text not null default '',
  helpline_phone text not null default '',
  valid_from date,
  valid_until date,
  is_active boolean not null default true,
  ecard_path text,
  ecard_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.health_insurance enable row level security;
revoke all on public.health_insurance from anon, authenticated;
grant select, insert, update, delete on public.health_insurance to authenticated;
create policy health_insurance_owner_select on public.health_insurance
  for select to authenticated using (user_id = auth.uid());
create policy health_insurance_owner_insert on public.health_insurance
  for insert to authenticated with check (user_id = auth.uid());
create policy health_insurance_owner_update on public.health_insurance
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy health_insurance_owner_delete on public.health_insurance
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.get_email_by_card_id(p_card_id text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(p.email)
  from public.profiles p
  where upper(trim(p.card_id)) = upper(trim(p_card_id))
    and upper(trim(p.card_id)) ~ '^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$'
  limit 1;
$$;
revoke all on function public.get_email_by_card_id(text) from public, anon, authenticated;
grant execute on function public.get_email_by_card_id(text) to service_role;

create table if not exists public.card_login_attempts (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.card_login_attempts enable row level security;
revoke all on public.card_login_attempts from public, anon, authenticated;
grant all on public.card_login_attempts to service_role;

create or replace function public.register_card_login_attempt(p_ip_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(coalesce(p_ip_hash, '')) <> 64 then
    raise exception 'Service role and a hashed client address are required';
  end if;
  delete from public.card_login_attempts where window_started_at < now() - interval '1 day';
  insert into public.card_login_attempts(ip_hash, window_started_at, attempts)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update set
    window_started_at = case
      when public.card_login_attempts.window_started_at < now() - interval '15 minutes' then now()
      else public.card_login_attempts.window_started_at
    end,
    attempts = case
      when public.card_login_attempts.window_started_at < now() - interval '15 minutes' then 1
      else public.card_login_attempts.attempts + 1
    end
  returning attempts into attempt_count;
  return attempt_count;
end;
$$;
revoke all on function public.register_card_login_attempt(text) from public, anon, authenticated;
grant execute on function public.register_card_login_attempt(text) to service_role;

create table if not exists public.practitioner_lookup_attempts (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.practitioner_lookup_attempts enable row level security;
revoke all on public.practitioner_lookup_attempts from public, anon, authenticated;
grant all on public.practitioner_lookup_attempts to service_role;

create or replace function public.register_practitioner_lookup_attempt(p_ip_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(coalesce(p_ip_hash, '')) <> 64 then
    raise exception 'Service role and a hashed client address are required';
  end if;
  delete from public.practitioner_lookup_attempts where window_started_at < now() - interval '1 day';
  insert into public.practitioner_lookup_attempts(ip_hash, window_started_at, attempts)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update set
    window_started_at = case
      when public.practitioner_lookup_attempts.window_started_at < now() - interval '15 minutes' then now()
      else public.practitioner_lookup_attempts.window_started_at
    end,
    attempts = case
      when public.practitioner_lookup_attempts.window_started_at < now() - interval '15 minutes' then 1
      else public.practitioner_lookup_attempts.attempts + 1
    end
  returning attempts into attempt_count;
  return attempt_count;
end;
$$;
revoke all on function public.register_practitioner_lookup_attempt(text) from public, anon, authenticated;
grant execute on function public.register_practitioner_lookup_attempt(text) to service_role;

create or replace function public.practitioner_lookup_insurance(p_card_id text, p_mmc_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  patient_user_id uuid;
  result jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' or not exists (
    select 1 from public.practitioner_allowlist a
    where a.active and a.mmc_id = trim(p_mmc_id)
  ) then
    raise exception 'Practitioner authorization is required';
  end if;

  select p.auth_user_id into patient_user_id
  from public.profiles p
  where upper(trim(p.card_id)) = upper(trim(p_card_id))
  limit 1;

  if patient_user_id is null or not exists (
    select 1 from public.user_privacy_settings s
    where s.user_id = patient_user_id
      and s.consent_active
      and s.practitioner_insurance_visible
  ) then
    return null;
  end if;

  select jsonb_build_object(
    'provider_name', i.provider_name,
    'plan_name', i.plan_name,
    'plan_type', i.plan_type,
    'policy_number', case when i.policy_number = '' then '' else '••••••' || right(i.policy_number, 4) end,
    'member_id', case when i.member_id = '' then '' else '••••••' || right(i.member_id, 4) end,
    'group_number', case when i.group_number = '' then '' else '••••••' || right(i.group_number, 4) end,
    'helpline_phone', i.helpline_phone,
    'valid_from', i.valid_from,
    'valid_until', i.valid_until,
    'is_active', i.is_active
  ) into result
  from public.health_insurance i
  where i.user_id = patient_user_id and i.is_active
  order by i.updated_at desc
  limit 1;

  if result is not null then
    insert into public.privacy_audit_logs(user_id, action, details)
    values (patient_user_id, 'practitioner_access', jsonb_build_object('scope','insurance_summary','mmc_id',trim(p_mmc_id)));
  end if;
  return result;
end;
$$;
revoke all on function public.practitioner_lookup_insurance(text,text) from public, anon, authenticated;
grant execute on function public.practitioner_lookup_insurance(text,text) to service_role;

create or replace function public.practitioner_lookup_patient_readonly(p_card_id text, p_mmc_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  patient_record jsonb;
  patient_user_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;
  patient_record := public.practitioner_lookup_patient(p_card_id, p_mmc_id);
  if patient_record is null then
    return null;
  end if;

  select p.auth_user_id into patient_user_id
  from public.profiles p
  where upper(trim(p.card_id)) = upper(trim(p_card_id))
  limit 1;
  if patient_user_id is null then
    select p.auth_user_id into patient_user_id
    from public.dependents d
    join public.profiles p on lower(p.email) = lower(d.owner_email)
    where upper(trim(d.medi_tag_id)) = upper(trim(p_card_id))
    limit 1;
  end if;
  if patient_user_id is null then
    raise exception 'Patient account record is unavailable';
  end if;

  insert into public.privacy_audit_logs(user_id, action, details)
  values (patient_user_id, 'practitioner_access', jsonb_build_object('scope','medical_record','mmc_id',trim(p_mmc_id)));

  return patient_record - 'email' - 'dependent_id';
end;
$$;
revoke all on function public.practitioner_lookup_patient_readonly(text,text) from public, anon, authenticated;
grant execute on function public.practitioner_lookup_patient_readonly(text,text) to service_role;
revoke all on function public.practitioner_lookup_patient(text,text) from public, anon, authenticated;

create or replace function public.delete_lyfevault_user_data(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;
  delete from public.privacy_audit_logs where user_id = p_user_id;
  delete from public.user_privacy_settings where user_id = p_user_id;
  delete from public.health_insurance where user_id = p_user_id;
  delete from public.medical_reports where lower(owner_email) = lower(p_email);
  delete from public.dependent_link_requests where guardian_id = p_user_id;
  delete from public.dependents where guardian_id = p_user_id or lower(owner_email) = lower(p_email);
  delete from public.profiles where auth_user_id = p_user_id or lower(email) = lower(p_email);
end;
$$;
revoke all on function public.delete_lyfevault_user_data(uuid,text) from public, anon, authenticated;
grant execute on function public.delete_lyfevault_user_data(uuid,text) to service_role;

drop policy if exists medical_reports_practitioner_select on public.medical_reports;

drop policy if exists medical_reports_bucket_select on storage.objects;
create policy medical_reports_bucket_select on storage.objects
  for select to authenticated
  using (bucket_id = 'medical-reports' and exists (
    select 1 from public.medical_reports r
    where r.file_path = storage.objects.name
  ));
drop policy if exists medical_reports_bucket_read_guard on storage.objects;
create policy medical_reports_bucket_read_guard on storage.objects as restrictive
  for select to anon, authenticated
  using (bucket_id <> 'medical-reports' or (
    auth.uid() is not null and exists (
      select 1 from public.medical_reports r
      where r.file_path = storage.objects.name
    )
  ));

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']
where id = 'medical-reports';

revoke delete on public.medical_reports from authenticated;
revoke update (file_name, file_path) on public.medical_reports from authenticated;
revoke all on function public.practitioner_add_report(text,jsonb) from public, anon, authenticated;
drop policy if exists medical_reports_practitioner_insert on public.medical_reports;
drop policy if exists medical_reports_practitioner_update on public.medical_reports;
drop policy if exists medical_reports_practitioner_delete on public.medical_reports;
drop policy if exists medical_reports_bucket_insert on storage.objects;
drop policy if exists medical_reports_bucket_update on storage.objects;
drop policy if exists medical_reports_bucket_delete on storage.objects;
drop policy if exists medical_reports_bucket_update_guard on storage.objects;
drop policy if exists medical_reports_bucket_delete_guard on storage.objects;
drop policy if exists medical_reports_bucket_insert_guard on storage.objects;
create policy medical_reports_bucket_insert_guard on storage.objects as restrictive
  for insert to anon, authenticated
  with check (bucket_id <> 'medical-reports' or (
    exists (select 1 from public.practitioner_allowlist a where a.active and a.hospital_phone = (auth.jwt() ->> 'phone'))
    or (auth.uid() is not null and split_part(storage.objects.name, '/', 1) = 'patients'
      and split_part(storage.objects.name, '/', 2) = auth.uid()::text)
  ));
create policy medical_reports_patient_file_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'medical-reports' and split_part(name, '/', 1) = 'patients'
    and split_part(name, '/', 2) = auth.uid()::text);
create policy medical_reports_patient_record_insert on public.medical_reports
  for insert to authenticated
  with check (
    uploaded_by_role = 'patient'
    and file_path like 'patients/' || auth.uid()::text || '/%'
    and exists (select 1 from public.profiles p where lower(p.email) = lower(owner_email) and p.auth_user_id = auth.uid())
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'insurance-ecards',
  'insurance-ecards',
  false,
  52428800,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

create policy insurance_ecards_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'insurance-ecards' and split_part(name, '/', 1) = auth.uid()::text);
create policy insurance_ecards_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'insurance-ecards' and split_part(name, '/', 1) = auth.uid()::text);
create policy insurance_ecards_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'insurance-ecards' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'insurance-ecards' and split_part(name, '/', 1) = auth.uid()::text);
create policy insurance_ecards_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'insurance-ecards' and split_part(name, '/', 1) = auth.uid()::text);
create policy insurance_ecards_select_guard on storage.objects as restrictive
  for select to anon, authenticated
  using (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and split_part(name, '/', 1) = auth.uid()::text));
create policy insurance_ecards_insert_guard on storage.objects as restrictive
  for insert to anon, authenticated
  with check (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and split_part(name, '/', 1) = auth.uid()::text));
create policy insurance_ecards_update_guard on storage.objects as restrictive
  for update to anon, authenticated
  using (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and split_part(name, '/', 1) = auth.uid()::text))
  with check (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and split_part(name, '/', 1) = auth.uid()::text));
create policy insurance_ecards_delete_guard on storage.objects as restrictive
  for delete to anon, authenticated
  using (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and split_part(name, '/', 1) = auth.uid()::text));

create trigger lyfevault_assign_card_id_after_auth_insert
after insert on auth.users
for each row execute function public.assign_lyfevault_card_id();

commit;
