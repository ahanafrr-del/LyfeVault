create or replace function public.practitioner_is_authorized_by_mmc(p_mmc_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.practitioner_allowlist a
    where a.active and a.mmc_id = trim(p_mmc_id)
  );
$$;
revoke all on function public.practitioner_is_authorized_by_mmc(text) from public;
grant execute on function public.practitioner_is_authorized_by_mmc(text) to anon, authenticated;

create or replace function public.practitioner_lookup_patient(p_card_id text, p_mmc_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; patient_email text; dependent_key text;
begin
  if not exists (
    select 1 from public.practitioner_allowlist a
    where a.active and a.mmc_id = trim(p_mmc_id)
  ) then
    raise exception 'Practitioner MMC ID is not authorized';
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
revoke all on function public.practitioner_lookup_patient(text,text) from public;
grant execute on function public.practitioner_lookup_patient(text,text) to anon, authenticated;
