begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.dependents
  add column if not exists guardian_id uuid references auth.users(id) on delete cascade,
  add column if not exists dependent_type text not null default 'child',
  add column if not exists secret_code_hash text,
  add column if not exists medications jsonb not null default '[]'::jsonb;

update public.dependents d
set guardian_id = p.auth_user_id
from public.profiles p
where d.guardian_id is null and lower(d.owner_email) = lower(p.email) and p.auth_user_id is not null;

update public.dependents
set secret_code_hash = extensions.crypt(parental_secret_code, extensions.gen_salt('bf'))
where secret_code_hash is null and coalesce(parental_secret_code, '') <> '';

update public.dependents set parental_secret_code = '', assigned_password = ''
where coalesce(parental_secret_code, '') <> '' or coalesce(assigned_password, '') <> '';

alter table public.medical_reports
  add column if not exists file_path text,
  add column if not exists uploaded_by_role text not null default 'patient',
  add column if not exists doctor_mmc_id text,
  add column if not exists hospital_phone text,
  add column if not exists dependent_id text references public.dependents(id) on delete cascade;

create table if not exists public.practitioner_allowlist (
  mmc_id text primary key,
  clinic_name text not null,
  hospital_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (mmc_id, hospital_phone)
);
alter table public.practitioner_allowlist enable row level security;
revoke all on public.practitioner_allowlist from anon, authenticated;
grant select on public.practitioner_allowlist to authenticated;
create policy practitioner_allowlist_self_read on public.practitioner_allowlist
  for select to authenticated using (active and hospital_phone = (auth.jwt() ->> 'phone'));

insert into public.practitioner_allowlist (mmc_id, clinic_name, hospital_phone) values
  ('2024/06/18402', 'Der-med Clinic', null),
  ('2023/11/54910', 'Apollo Hospitals', null),
  ('2024/02/31208', 'Seawoods Hospital', null),
  ('2023/09/67421', 'Terna Speciality Hospital', null),
  ('2024/04/89105', 'D Y Patil Hospital', null),
  ('2023/07/42019', 'Fortis Hiranandani Hospital', null),
  ('2024/01/73564', 'MGM Hospital', null)
on conflict (mmc_id) do update set clinic_name = excluded.clinic_name;

create table if not exists public.dependent_link_requests (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references auth.users(id) on delete cascade,
  dependent_email text not null,
  dependent_type text not null check (dependent_type in ('child', 'adult')),
  relationship text not null,
  name text not null,
  dob text not null default '',
  blood_group text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  completed_at timestamptz
);
alter table public.dependent_link_requests enable row level security;
revoke all on public.dependent_link_requests from anon, authenticated;
grant select, insert, update on public.dependent_link_requests to authenticated;
create policy dependent_link_requests_guardian_read on public.dependent_link_requests
  for select to authenticated using (guardian_id = auth.uid());
create policy dependent_link_requests_guardian_insert on public.dependent_link_requests
  for insert to authenticated with check (guardian_id = auth.uid());

create or replace function public.create_dependent_link_request(
  p_email text, p_type text, p_relationship text, p_name text, p_dob text default '', p_blood_group text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare request_id uuid;
begin
  if auth.uid() is null or p_type not in ('child', 'adult') or lower(p_email) = lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Invalid dependent link request';
  end if;
  if not exists (select 1 from public.profiles p where p.auth_user_id = auth.uid()) then
    raise exception 'Guardian profile is unavailable';
  end if;
  insert into public.dependent_link_requests (guardian_id, dependent_email, dependent_type, relationship, name, dob, blood_group)
  values (auth.uid(), lower(trim(p_email)), p_type, trim(p_relationship), trim(p_name), coalesce(p_dob, ''), coalesce(p_blood_group, ''))
  returning id into request_id;
  return request_id;
end;
$$;
revoke all on function public.create_dependent_link_request(text,text,text,text,text,text) from public, anon;
grant execute on function public.create_dependent_link_request(text,text,text,text,text,text) to authenticated;

create or replace function public.complete_dependent_link(p_request_id uuid, p_secret_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare req public.dependent_link_requests%rowtype; guardian_email text; new_id text;
begin
  if auth.uid() is null or length(coalesce(p_secret_code, '')) < 5 then raise exception 'Verification is required'; end if;
  select * into req from public.dependent_link_requests
  where id = p_request_id and lower(dependent_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and completed_at is null and expires_at > now() for update;
  if not found then raise exception 'This verification request is invalid or expired'; end if;
  select p.email into guardian_email from public.profiles p where p.auth_user_id = req.guardian_id;
  if guardian_email is null then raise exception 'Guardian profile is unavailable'; end if;
  new_id := gen_random_uuid()::text;
  insert into public.dependents (id, owner_email, guardian_id, name, dob, relationship, blood_group, allergies, conditions, contacts,
    assigned_email, assigned_password, parental_secret_code, secret_code_hash, medi_tag_id, dependent_type)
  values (new_id, guardian_email, req.guardian_id, req.name, req.dob, req.relationship, req.blood_group, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    lower(req.dependent_email), '', '', extensions.crypt(p_secret_code, extensions.gen_salt('bf')), 'MT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)), req.dependent_type);
  update public.dependent_link_requests set completed_at = now() where id = req.id;
  return new_id;
end;
$$;
revoke all on function public.complete_dependent_link(uuid,text) from public, anon;
grant execute on function public.complete_dependent_link(uuid,text) to authenticated;

create or replace function public.update_dependent_secret_code(p_dependent_id text, p_secret_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or length(coalesce(p_secret_code, '')) < 5 then raise exception 'A valid secret code is required'; end if;
  update public.dependents d set secret_code_hash = extensions.crypt(p_secret_code, extensions.gen_salt('bf'))
  where d.id = p_dependent_id and (d.guardian_id = auth.uid() or exists (
    select 1 from public.profiles p where lower(p.email) = lower(d.owner_email) and p.auth_user_id = auth.uid()));
  if not found then raise exception 'Dependent profile not found'; end if;
end;
$$;
revoke all on function public.update_dependent_secret_code(text,text) from public, anon;
grant execute on function public.update_dependent_secret_code(text,text) to authenticated;

create or replace function public.practitioner_is_authorized(p_mmc_id text, p_phone text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.practitioner_allowlist a
    where a.active and a.mmc_id = trim(p_mmc_id) and a.hospital_phone = trim(p_phone));
$$;
revoke all on function public.practitioner_is_authorized(text,text) from public;
grant execute on function public.practitioner_is_authorized(text,text) to anon, authenticated;

create or replace function public.practitioner_lookup_patient(p_card_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; patient_email text; dependent_key text;
begin
  if not exists (select 1 from public.practitioner_allowlist a
    where a.active and a.hospital_phone = (auth.jwt() ->> 'phone')) then
    raise exception 'Practitioner phone is not verified';
  end if;
  select jsonb_build_object('kind','profile','email',p.email,'name',p.name,'dob',p.dob,'blood_group',p.blood_group,
    'gender',p.gender,'card_id',p.card_id,'allergies',p.allergies,'conditions',p.conditions,'medications',p.medications,'contacts',p.contacts)
  into result from public.profiles p where lower(trim(p.card_id)) = lower(trim(p_card_id)) limit 1;
  if result is not null then
    patient_email := result ->> 'email';
    dependent_key := null;
  else
    select jsonb_build_object('kind','dependent','email',d.owner_email,'name',d.name,'dob',d.dob,'blood_group',d.blood_group,
      'relationship',d.relationship,'card_id',d.medi_tag_id,'allergies',d.allergies,'conditions',d.conditions,'medications',d.medications,'contacts',d.contacts,
      'dependent_id',d.id)
    into result from public.dependents d where lower(trim(d.medi_tag_id)) = lower(trim(p_card_id)) limit 1;
    if result is null then return null; end if;
    patient_email := result ->> 'email'; dependent_key := result ->> 'dependent_id';
  end if;
  return result || jsonb_build_object('reports', coalesce((
    select jsonb_agg(jsonb_build_object('id',r.id,'doctor_name',r.doctor_name,'specialization',r.specialization,'clinic',r.clinic,
      'date',r.date,'time',r.time,'license_number',r.license_number,'file_name',r.file_name,'notes',r.notes,
      'created_at',r.created_at,'file_path',r.file_path,'uploaded_by_role',r.uploaded_by_role,'doctor_mmc_id',r.doctor_mmc_id)
      order by r.created_at desc) from public.medical_reports r
    where lower(r.owner_email) = lower(patient_email) and r.dependent_id is not distinct from dependent_key
  ), '[]'::jsonb));
end;
$$;
revoke all on function public.practitioner_lookup_patient(text) from public, anon;
grant execute on function public.practitioner_lookup_patient(text) to authenticated;

create or replace function public.emergency_lookup_card(p_card_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object('name',p.name,'dob',p.dob,'blood_group',p.blood_group,'gender',p.gender,'card_id',p.card_id,
    'allergies',p.allergies,'conditions',p.conditions,'medications',p.medications,'contacts',p.contacts)
  into result from public.profiles p where lower(trim(p.card_id)) = lower(trim(p_card_id)) limit 1;
  if result is not null then return result; end if;
  select jsonb_build_object('name',d.name,'dob',d.dob,'blood_group',d.blood_group,'relationship',d.relationship,
    'card_id',d.medi_tag_id,'allergies',d.allergies,'conditions',d.conditions,'medications',d.medications,'contacts',d.contacts)
  into result from public.dependents d where lower(trim(d.medi_tag_id)) = lower(trim(p_card_id)) limit 1;
  return result;
end;
$$;
revoke all on function public.emergency_lookup_card(text) from public;
grant execute on function public.emergency_lookup_card(text) to anon, authenticated;

-- Replace public-table policies so permissive legacy policies cannot widen access.
do $$ declare pol record; begin
  for pol in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('profiles','dependents','medical_reports')
  loop execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename); end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.dependents enable row level security;
alter table public.medical_reports enable row level security;
revoke all on public.profiles, public.dependents, public.medical_reports from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, delete on public.dependents to authenticated;
grant update (name, dob, relationship, blood_group, allergies, conditions, medications, contacts, medi_tag_id)
  on public.dependents to authenticated;
grant select, insert, delete on public.medical_reports to authenticated;
grant update (file_name, file_path) on public.medical_reports to authenticated;

create policy profiles_owner_select on public.profiles for select to authenticated using (auth_user_id = auth.uid());
create policy profiles_owner_insert on public.profiles for insert to authenticated with check (auth_user_id = auth.uid());
create policy profiles_owner_update on public.profiles for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy dependents_guardian_select on public.dependents for select to authenticated
  using (guardian_id = auth.uid() or exists (select 1 from public.profiles p where lower(p.email) = lower(dependents.owner_email) and p.auth_user_id = auth.uid()));
create policy dependents_guardian_update on public.dependents for update to authenticated
  using (guardian_id = auth.uid() or exists (select 1 from public.profiles p where lower(p.email) = lower(dependents.owner_email) and p.auth_user_id = auth.uid()))
  with check (guardian_id = auth.uid() or exists (select 1 from public.profiles p where lower(p.email) = lower(dependents.owner_email) and p.auth_user_id = auth.uid()));
create policy dependents_guardian_delete on public.dependents for delete to authenticated
  using (guardian_id = auth.uid() or exists (select 1 from public.profiles p where lower(p.email) = lower(dependents.owner_email) and p.auth_user_id = auth.uid()));
create policy dependents_linked_user_select on public.dependents for select to authenticated
  using (lower(assigned_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create or replace function public.verify_dependent_secret_code(p_dependent_id text, p_secret_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dependents d
    where d.id = p_dependent_id and d.secret_code_hash is not null
      and extensions.crypt(p_secret_code, d.secret_code_hash) = d.secret_code_hash
      and (d.guardian_id = auth.uid() or lower(d.assigned_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        or exists (select 1 from public.profiles p where lower(p.email) = lower(d.owner_email) and p.auth_user_id = auth.uid())));
$$;
revoke all on function public.verify_dependent_secret_code(text,text) from public, anon;
grant execute on function public.verify_dependent_secret_code(text,text) to authenticated;

create or replace function public.update_linked_dependent_profile(p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.dependents d set
    blood_group = coalesce(p_data ->> 'blood_group', d.blood_group),
    allergies = coalesce(p_data -> 'allergies', d.allergies),
    conditions = coalesce(p_data -> 'conditions', d.conditions),
    medications = coalesce(p_data -> 'medications', d.medications),
    contacts = coalesce(p_data -> 'contacts', d.contacts)
  where lower(d.assigned_email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  if not found then raise exception 'Linked dependent profile not found'; end if;
end;
$$;
revoke all on function public.update_linked_dependent_profile(jsonb) from public, anon;
grant execute on function public.update_linked_dependent_profile(jsonb) to authenticated;

create policy medical_reports_patient_select on public.medical_reports for select to authenticated
  using (exists (select 1 from public.profiles p where lower(p.email) = lower(owner_email) and p.auth_user_id = auth.uid())
    or exists (select 1 from public.dependents d join public.profiles p on lower(p.email) = lower(d.owner_email)
      where d.id = medical_reports.dependent_id and p.auth_user_id = auth.uid())
    or exists (select 1 from public.dependents d where d.id = medical_reports.dependent_id
      and lower(d.assigned_email) = lower(coalesce(auth.jwt() ->> 'email', ''))));
create policy medical_reports_practitioner_select on public.medical_reports for select to authenticated
  using (exists (select 1 from public.practitioner_allowlist a where a.active and a.hospital_phone = (auth.jwt() ->> 'phone')));
create policy medical_reports_patient_insert on public.medical_reports for insert to authenticated
  with check (uploaded_by_role = 'patient' and file_path is null and (exists (select 1 from public.profiles p where lower(p.email) = lower(owner_email) and p.auth_user_id = auth.uid())
    or exists (select 1 from public.dependents d join public.profiles p on lower(p.email) = lower(d.owner_email)
      where d.id = medical_reports.dependent_id and p.auth_user_id = auth.uid())));
create policy medical_reports_practitioner_insert on public.medical_reports for insert to authenticated
  with check (uploaded_by_role = 'practitioner' and exists (select 1 from public.practitioner_allowlist a
    where a.active and a.mmc_id = doctor_mmc_id and a.hospital_phone = (auth.jwt() ->> 'phone')
      and file_path is not null and split_part(file_path, '/', 1) = replace(a.mmc_id, '/', '_')
      and exists (select 1 from storage.objects o where o.bucket_id = 'medical-reports' and o.name = file_path)));
create policy medical_reports_practitioner_update on public.medical_reports for update to authenticated
  using (uploaded_by_role = 'practitioner' and exists (select 1 from public.practitioner_allowlist a
    where a.active and a.mmc_id = doctor_mmc_id and a.hospital_phone = (auth.jwt() ->> 'phone')))
  with check (uploaded_by_role = 'practitioner' and exists (select 1 from public.practitioner_allowlist a
    where a.active and a.mmc_id = doctor_mmc_id and a.hospital_phone = (auth.jwt() ->> 'phone')
      and split_part(file_path, '/', 1) = replace(a.mmc_id, '/', '_')
      and exists (select 1 from storage.objects o where o.bucket_id = 'medical-reports' and o.name = file_path)));
create policy medical_reports_practitioner_delete on public.medical_reports for delete to authenticated
  using (uploaded_by_role = 'practitioner' and exists (select 1 from public.practitioner_allowlist a
    where a.active and a.mmc_id = doctor_mmc_id and a.hospital_phone = (auth.jwt() ->> 'phone')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('medical-reports','medical-reports',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive policies intersect any legacy storage policy, so a broad old policy cannot expose this bucket.
create policy medical_reports_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'medical-reports' and (exists (select 1 from public.medical_reports r
      where r.file_path = storage.objects.name and exists (select 1 from public.profiles p where lower(p.email) = lower(r.owner_email) and p.auth_user_id = auth.uid()))
    or exists (select 1 from public.practitioner_allowlist a where a.active and a.hospital_phone = (auth.jwt() ->> 'phone'))
    or exists (select 1 from public.medical_reports r join public.dependents d on d.id = r.dependent_id
      join public.profiles p on lower(p.email) = lower(d.owner_email) where r.file_path = storage.objects.name and p.auth_user_id = auth.uid())
    or exists (select 1 from public.medical_reports r join public.dependents d on d.id = r.dependent_id
      where r.file_path = storage.objects.name and lower(d.assigned_email) = lower(coalesce(auth.jwt() ->> 'email', '')))));
create policy medical_reports_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'medical-reports' and exists (select 1 from public.practitioner_allowlist a
    where a.active and a.hospital_phone = (auth.jwt() ->> 'phone') and replace(a.mmc_id, '/', '_') = split_part(storage.objects.name, '/', 1)));
create policy medical_reports_bucket_update on storage.objects for update to authenticated
  using (bucket_id = 'medical-reports' and exists (select 1 from public.medical_reports r join public.practitioner_allowlist a
    on a.mmc_id = r.doctor_mmc_id and a.hospital_phone = (auth.jwt() ->> 'phone') and a.active where r.file_path = storage.objects.name))
  with check (bucket_id = 'medical-reports' and exists (select 1 from public.medical_reports r join public.practitioner_allowlist a
    on a.mmc_id = r.doctor_mmc_id and a.hospital_phone = (auth.jwt() ->> 'phone') and a.active where r.file_path = storage.objects.name));
create policy medical_reports_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'medical-reports' and exists (select 1 from public.practitioner_allowlist a
    where a.active and a.hospital_phone = (auth.jwt() ->> 'phone') and replace(a.mmc_id, '/', '_') = split_part(storage.objects.name, '/', 1)));
create policy medical_reports_bucket_read_guard on storage.objects as restrictive for select to anon, authenticated
  using (bucket_id <> 'medical-reports' or exists (
    select 1 from public.medical_reports r where r.file_path = storage.objects.name
    and (exists (select 1 from public.profiles p where lower(p.email) = lower(r.owner_email) and p.auth_user_id = auth.uid())
      or exists (select 1 from public.practitioner_allowlist a where a.active and a.hospital_phone = (auth.jwt() ->> 'phone'))
      or exists (select 1 from public.dependents d join public.profiles p on lower(p.email) = lower(d.owner_email)
        where d.id = r.dependent_id and p.auth_user_id = auth.uid())
      or exists (select 1 from public.dependents d where d.id = r.dependent_id
        and lower(d.assigned_email) = lower(coalesce(auth.jwt() ->> 'email', ''))))));
create policy medical_reports_bucket_insert_guard on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'medical-reports' or exists (
    select 1 from public.practitioner_allowlist a where a.active and a.hospital_phone = (auth.jwt() ->> 'phone')));
create policy medical_reports_bucket_update_guard on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id <> 'medical-reports' or exists (select 1 from public.medical_reports r join public.practitioner_allowlist a
    on a.mmc_id = r.doctor_mmc_id and a.hospital_phone = (auth.jwt() ->> 'phone') and a.active where r.file_path = storage.objects.name))
  with check (bucket_id <> 'medical-reports' or exists (select 1 from public.medical_reports r join public.practitioner_allowlist a
    on a.mmc_id = r.doctor_mmc_id and a.hospital_phone = (auth.jwt() ->> 'phone') and a.active where r.file_path = storage.objects.name));
create policy medical_reports_bucket_delete_guard on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id <> 'medical-reports' or exists (select 1 from public.practitioner_allowlist a
    where a.active and a.hospital_phone = (auth.jwt() ->> 'phone') and replace(a.mmc_id, '/', '_') = split_part(storage.objects.name, '/', 1)));

create or replace function public.practitioner_add_report(p_card_id text, p_report jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare owner_email text; target_dependent_id text; new_report_id text; mmc text; phone text;
begin
  mmc := p_report ->> 'doctor_mmc_id';
  phone := auth.jwt() ->> 'phone';
  if auth.uid() is null or not exists (select 1 from public.practitioner_allowlist a
    where a.active and a.mmc_id = mmc and a.hospital_phone = phone) then
    raise exception 'Practitioner verification is required';
  end if;
  if coalesce(p_report ->> 'file_path', '') = ''
    or split_part(p_report ->> 'file_path', '/', 1) <> replace(mmc, '/', '_')
    or not exists (select 1 from storage.objects o where o.bucket_id = 'medical-reports' and o.name = p_report ->> 'file_path') then
    raise exception 'The uploaded file is not bound to this practitioner';
  end if;
  select p.email into owner_email from public.profiles p where lower(trim(p.card_id)) = lower(trim(p_card_id)) limit 1;
  if owner_email is null then
    select d.owner_email, d.id into owner_email, target_dependent_id from public.dependents d
      where lower(trim(d.medi_tag_id)) = lower(trim(p_card_id)) limit 1;
  end if;
  if owner_email is null then raise exception 'Patient record was not found'; end if;
  new_report_id := gen_random_uuid()::text;
  insert into public.medical_reports (id, owner_email, dependent_id, doctor_name, specialization, clinic, date, time,
    license_number, file_name, notes, created_at, file_path, uploaded_by_role, doctor_mmc_id, hospital_phone)
  values (new_report_id, owner_email, target_dependent_id, coalesce(p_report ->> 'doctor_name','Verified practitioner'),
    coalesce(p_report ->> 'specialization',''), coalesce(p_report ->> 'clinic',''), coalesce(p_report ->> 'date',''),
    coalesce(p_report ->> 'time',''), coalesce(p_report ->> 'license_number',''), coalesce(p_report ->> 'file_name',''),
    coalesce(p_report ->> 'notes',''), floor(extract(epoch from now()) * 1000)::bigint, p_report ->> 'file_path', 'practitioner', mmc, phone);
  return new_report_id;
end;
$$;
revoke all on function public.practitioner_add_report(text,jsonb) from public, anon;
grant execute on function public.practitioner_add_report(text,jsonb) to authenticated;

commit;
