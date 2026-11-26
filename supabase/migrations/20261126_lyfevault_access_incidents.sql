begin;

alter table public.user_privacy_settings
  add column if not exists share_insurance_in_practitioner_view boolean not null default false,
  add column if not exists mask_insurance_by_default boolean not null default true;
update public.user_privacy_settings
set share_insurance_in_practitioner_view = practitioner_insurance_visible,
    mask_insurance_by_default = mask_sensitive_fields;

alter table public.privacy_audit_logs
  add column if not exists event_type text;
update public.privacy_audit_logs set event_type = action where event_type is null;

create or replace function public.log_privacy_activity(p_action text, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_action not in (
    'insurance_reveal','ecard_view','practitioner_access','settings_update','consent_granted','consent_withdrawn','data_export','account_deletion_requested'
  ) then raise exception 'Invalid privacy activity'; end if;
  insert into public.privacy_audit_logs(user_id, action, event_type, details)
  values (auth.uid(), p_action, p_action, coalesce(p_details, '{}'::jsonb));
end;
$$;

create or replace function public.lyfevault_user_is_adult(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.auth_user_id = p_user_id
    and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date));
$$;
revoke all on function public.lyfevault_user_is_adult(uuid) from public, anon;
grant execute on function public.lyfevault_user_is_adult(uuid) to authenticated;

create table if not exists public.emergency_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  incident_type text not null,
  occurred_at timestamptz not null,
  location text not null default '',
  description text not null default '',
  photo_path text,
  created_at timestamptz not null default now()
);
create index if not exists emergency_incidents_user_created_idx on public.emergency_incidents(user_id, created_at desc);
alter table public.emergency_incidents enable row level security;
revoke all on public.emergency_incidents from anon, authenticated;
grant select, insert, update, delete on public.emergency_incidents to authenticated;
create policy emergency_incidents_owner_select on public.emergency_incidents for select to authenticated using (user_id = auth.uid());
create policy emergency_incidents_owner_insert on public.emergency_incidents for insert to authenticated with check (user_id = auth.uid());
create policy emergency_incidents_owner_update on public.emergency_incidents for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy emergency_incidents_owner_delete on public.emergency_incidents for delete to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('emergency-incidents','emergency-incidents',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;
create policy emergency_incidents_photo_select on storage.objects for select to authenticated
  using (bucket_id = 'emergency-incidents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy emergency_incidents_photo_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'emergency-incidents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy emergency_incidents_photo_delete on storage.objects for delete to authenticated
  using (bucket_id = 'emergency-incidents' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.guardian_dependent_access (
  dependent_id text primary key references public.dependents(id) on delete cascade,
  guardian_id uuid not null references auth.users(id) on delete cascade,
  master_key_sha256 text not null check (master_key_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.guardian_dependent_access enable row level security;
revoke all on public.guardian_dependent_access from anon, authenticated;
grant select, insert, update, delete on public.guardian_dependent_access to authenticated;
create policy guardian_dependent_access_guardian_select on public.guardian_dependent_access for select to authenticated using (guardian_id = auth.uid());
create policy guardian_dependent_access_guardian_insert on public.guardian_dependent_access for insert to authenticated with check (guardian_id = auth.uid() and exists (select 1 from public.dependents d where d.id = dependent_id and d.guardian_id = auth.uid()));
create policy guardian_dependent_access_guardian_update on public.guardian_dependent_access for update to authenticated using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());

create or replace function public.set_guardian_access_key(p_dependent_id text, p_key_sha256 text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_key_sha256 !~ '^[0-9a-f]{64}$' or not exists (
    select 1 from public.dependents d where d.id = p_dependent_id and d.guardian_id = auth.uid()
  ) then raise exception 'Guardian authorization is required'; end if;
  insert into public.guardian_dependent_access(dependent_id, guardian_id, master_key_sha256)
  values (p_dependent_id, auth.uid(), p_key_sha256)
  on conflict (dependent_id) do update set guardian_id = excluded.guardian_id, master_key_sha256 = excluded.master_key_sha256, created_at = now();
end;
$$;
revoke all on function public.set_guardian_access_key(text,text) from public, anon;
grant execute on function public.set_guardian_access_key(text,text) to authenticated;

create table if not exists public.guardian_access_sessions (
  guardian_id uuid not null references auth.users(id) on delete cascade,
  dependent_id text not null references public.dependents(id) on delete cascade,
  expires_at timestamptz not null,
  primary key (guardian_id, dependent_id)
);
alter table public.guardian_access_sessions enable row level security;
revoke all on public.guardian_access_sessions from public, anon, authenticated;

create or replace function public.guardian_access_verified(p_dependent_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.guardian_access_sessions s
    where s.dependent_id = p_dependent_id and s.guardian_id = auth.uid() and s.expires_at > now()
  );
$$;
revoke all on function public.guardian_access_verified(text) from public, anon;
grant execute on function public.guardian_access_verified(text) to authenticated;

create or replace function public.verify_guardian_access_key(p_dependent_id text, p_key_sha256 text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.guardian_dependent_access a
    where a.dependent_id = p_dependent_id and a.guardian_id = auth.uid() and a.master_key_sha256 = p_key_sha256
  ) then return false; end if;
  insert into public.guardian_access_sessions(guardian_id, dependent_id, expires_at)
  values (auth.uid(), p_dependent_id, now() + interval '20 minutes')
  on conflict (guardian_id, dependent_id) do update set expires_at = excluded.expires_at;
  return true;
end;
$$;
revoke all on function public.verify_guardian_access_key(text,text) from public, anon;
grant execute on function public.verify_guardian_access_key(text,text) to authenticated;

create or replace function public.end_guardian_access_session(p_dependent_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  delete from public.guardian_access_sessions where guardian_id = auth.uid() and dependent_id = p_dependent_id;
end;
$$;
revoke all on function public.end_guardian_access_session(text) from public, anon;
grant execute on function public.end_guardian_access_session(text) to authenticated;

create or replace function public.guardian_dependent_user_id(p_dependent_id text)
returns uuid language sql stable security definer set search_path = '' as $$
  select p.auth_user_id from public.dependents d
  join public.profiles p on lower(p.email) = lower(d.assigned_email)
  where d.id = p_dependent_id and d.guardian_id = auth.uid()
    and public.guardian_access_verified(d.id)
  limit 1;
$$;
revoke all on function public.guardian_dependent_user_id(text) from public, anon;
grant execute on function public.guardian_dependent_user_id(text) to authenticated;

drop policy if exists dependents_guardian_update on public.dependents;
create policy dependents_guardian_update on public.dependents for update to authenticated
using ((guardian_id = auth.uid() or exists (select 1 from public.profiles p where lower(p.email) = lower(dependents.owner_email) and p.auth_user_id = auth.uid())) and public.guardian_access_verified(id))
with check ((guardian_id = auth.uid() or exists (select 1 from public.profiles p where lower(p.email) = lower(dependents.owner_email) and p.auth_user_id = auth.uid())) and public.guardian_access_verified(id));

-- Self-edit policies enforce the age boundary in the database, not only in the UI.
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated
using (auth_user_id = auth.uid() and (dob = '' or dob is null or dob::date <= (current_date - interval '18 years')::date))
with check (auth_user_id = auth.uid() and (dob = '' or dob is null or dob::date <= (current_date - interval '18 years')::date));

drop policy if exists health_insurance_owner_insert on public.health_insurance;
drop policy if exists health_insurance_owner_update on public.health_insurance;
drop policy if exists health_insurance_owner_delete on public.health_insurance;
create policy health_insurance_owner_insert on public.health_insurance for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)));
create policy health_insurance_owner_update on public.health_insurance for update to authenticated
using (user_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)))
with check (user_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)));
create policy health_insurance_owner_delete on public.health_insurance for delete to authenticated
using (user_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)));

create or replace function public.guardian_can_access_health_insurance(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles target join public.dependents d on lower(d.assigned_email) = lower(target.email)
    where target.auth_user_id = p_user_id and d.guardian_id = auth.uid() and public.guardian_access_verified(d.id)
  );
$$;
revoke all on function public.guardian_can_access_health_insurance(uuid) from public, anon;
grant execute on function public.guardian_can_access_health_insurance(uuid) to authenticated;
create policy health_insurance_guardian_select on public.health_insurance for select to authenticated
using (public.guardian_can_access_health_insurance(user_id));
create policy health_insurance_guardian_insert on public.health_insurance for insert to authenticated
with check (public.guardian_can_access_health_insurance(user_id));
create policy health_insurance_guardian_update on public.health_insurance for update to authenticated
using (public.guardian_can_access_health_insurance(user_id)) with check (public.guardian_can_access_health_insurance(user_id));
create policy health_insurance_guardian_delete on public.health_insurance for delete to authenticated
using (public.guardian_can_access_health_insurance(user_id));

create or replace function public.guardian_insurance_path_access(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles target join public.dependents d on lower(d.assigned_email) = lower(target.email)
    where target.auth_user_id::text = split_part(p_path, '/', 1)
      and d.guardian_id = auth.uid() and public.guardian_access_verified(d.id)
  );
$$;
revoke all on function public.guardian_insurance_path_access(text) from public, anon;
grant execute on function public.guardian_insurance_path_access(text) to authenticated;

drop policy if exists insurance_ecards_owner_select on storage.objects;
drop policy if exists insurance_ecards_owner_insert on storage.objects;
drop policy if exists insurance_ecards_owner_update on storage.objects;
drop policy if exists insurance_ecards_owner_delete on storage.objects;
drop policy if exists insurance_ecards_select_guard on storage.objects;
drop policy if exists insurance_ecards_insert_guard on storage.objects;
drop policy if exists insurance_ecards_update_guard on storage.objects;
drop policy if exists insurance_ecards_delete_guard on storage.objects;
create policy insurance_ecards_owner_select on storage.objects for select to authenticated
using (bucket_id = 'insurance-ecards' and (split_part(name, '/', 1) = auth.uid()::text or public.guardian_insurance_path_access(name)));
create policy insurance_ecards_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'insurance-ecards' and ((split_part(name, '/', 1) = auth.uid()::text and public.lyfevault_user_is_adult(auth.uid())) or public.guardian_insurance_path_access(name)));
create policy insurance_ecards_owner_update on storage.objects for update to authenticated
using (bucket_id = 'insurance-ecards' and ((split_part(name, '/', 1) = auth.uid()::text and public.lyfevault_user_is_adult(auth.uid())) or public.guardian_insurance_path_access(name)))
with check (bucket_id = 'insurance-ecards' and ((split_part(name, '/', 1) = auth.uid()::text and public.lyfevault_user_is_adult(auth.uid())) or public.guardian_insurance_path_access(name)));
create policy insurance_ecards_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'insurance-ecards' and ((split_part(name, '/', 1) = auth.uid()::text and public.lyfevault_user_is_adult(auth.uid())) or public.guardian_insurance_path_access(name)));
create policy insurance_ecards_select_guard on storage.objects as restrictive for select to anon, authenticated
using (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and (split_part(name, '/', 1) = auth.uid()::text or public.guardian_insurance_path_access(name))));
create policy insurance_ecards_insert_guard on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and ((split_part(name, '/', 1) = auth.uid()::text and public.lyfevault_user_is_adult(auth.uid())) or public.guardian_insurance_path_access(name))));
create policy insurance_ecards_update_guard on storage.objects as restrictive for update to anon, authenticated
using (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and ((split_part(name, '/', 1) = auth.uid()::text and public.lyfevault_user_is_adult(auth.uid())) or public.guardian_insurance_path_access(name))))
with check (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and ((split_part(name, '/', 1) = auth.uid()::text and public.lyfevault_user_is_adult(auth.uid())) or public.guardian_insurance_path_access(name))));
create policy insurance_ecards_delete_guard on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'insurance-ecards' or (auth.uid() is not null and ((split_part(name, '/', 1) = auth.uid()::text and public.lyfevault_user_is_adult(auth.uid())) or public.guardian_insurance_path_access(name))));

drop policy if exists medical_reports_patient_insert on public.medical_reports;
drop policy if exists medical_reports_patient_record_insert on public.medical_reports;
drop policy if exists medical_reports_bucket_insert_guard on storage.objects;
create policy medical_reports_bucket_insert_guard on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id <> 'medical-reports' or (
  exists (select 1 from public.practitioner_allowlist a where a.active and a.hospital_phone = (auth.jwt() ->> 'phone'))
  or (auth.uid() is not null and split_part(storage.objects.name, '/', 1) = 'patients' and split_part(storage.objects.name, '/', 2) = auth.uid()::text
    and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid()
      and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)))
));
create policy medical_reports_patient_insert on public.medical_reports for insert to authenticated
with check (uploaded_by_role = 'patient' and (
  (dependent_id is null and file_path like 'patients/' || auth.uid()::text || '/%' and exists (
    select 1 from public.profiles p where lower(p.email) = lower(owner_email) and p.auth_user_id = auth.uid()
      and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)
  ))
  or (dependent_id is not null and file_path like 'patients/' || auth.uid()::text || '/%' and exists (
    select 1 from public.dependents d where d.id = medical_reports.dependent_id
      and d.guardian_id = auth.uid() and public.guardian_access_verified(d.id)
  ))
));

drop policy if exists user_privacy_settings_owner_insert on public.user_privacy_settings;
drop policy if exists user_privacy_settings_owner_update on public.user_privacy_settings;
create policy user_privacy_settings_owner_insert on public.user_privacy_settings for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)));
create policy user_privacy_settings_owner_update on public.user_privacy_settings for update to authenticated
using (user_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)))
with check (user_id = auth.uid() and exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)));

create or replace function public.update_linked_dependent_profile(p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles p
    where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date)) then
    raise exception 'Only an adult account may update its linked profile';
  end if;
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

create or replace function public.emergency_incident_actor_is_adult(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.auth_user_id = p_user_id
    and (p.dob = '' or p.dob is null or p.dob::date <= (current_date - interval '18 years')::date));
$$;
revoke all on function public.emergency_incident_actor_is_adult(uuid) from public, anon;
grant execute on function public.emergency_incident_actor_is_adult(uuid) to authenticated;
drop policy if exists emergency_incidents_photo_insert on storage.objects;
drop policy if exists emergency_incidents_photo_delete on storage.objects;
create policy emergency_incidents_photo_insert on storage.objects for insert to authenticated
with check (bucket_id = 'emergency-incidents' and (storage.foldername(name))[1] = auth.uid()::text and public.emergency_incident_actor_is_adult(auth.uid()));
create policy emergency_incidents_photo_delete on storage.objects for delete to authenticated
using (bucket_id = 'emergency-incidents' and (storage.foldername(name))[1] = auth.uid()::text and public.emergency_incident_actor_is_adult(auth.uid()));
drop policy if exists emergency_incidents_owner_insert on public.emergency_incidents;
drop policy if exists emergency_incidents_owner_update on public.emergency_incidents;
drop policy if exists emergency_incidents_owner_delete on public.emergency_incidents;
create policy emergency_incidents_owner_insert on public.emergency_incidents for insert to authenticated
with check (user_id = auth.uid() and public.emergency_incident_actor_is_adult(auth.uid()));
create policy emergency_incidents_owner_update on public.emergency_incidents for update to authenticated
using (user_id = auth.uid() and public.emergency_incident_actor_is_adult(auth.uid())) with check (user_id = auth.uid() and public.emergency_incident_actor_is_adult(auth.uid()));
create policy emergency_incidents_owner_delete on public.emergency_incidents for delete to authenticated
using (user_id = auth.uid() and public.emergency_incident_actor_is_adult(auth.uid()));

commit;

