begin;

create or replace function public.assign_lyfevault_card_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));
  requested_card_id text := upper(trim(coalesce(new.raw_user_meta_data ->> 'custom_card_id', '')));
  assigned_card_id text;
begin
  if new.email is null then
    return new;
  end if;
  if coalesce(new.raw_user_meta_data ->> 'health_data_consent', 'false') <> 'true' then
    raise exception 'Health-data consent is required to create an account';
  end if;
  if requested_card_id <> '' and requested_card_id !~ '^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$' then
    raise exception 'Invalid LyfeVault Card ID';
  end if;
  if requested_card_id <> '' and exists (
    select 1 from public.profiles p where upper(p.card_id) = requested_card_id
  ) then
    raise exception 'That LyfeVault Card ID is already in use';
  end if;
  if requested_card_id <> '' then
    assigned_card_id := requested_card_id;
  else
    loop
      assigned_card_id := 'LV-' || nextval('public.lyfevault_card_id_seq')::text;
      exit when not exists (select 1 from public.profiles p where p.card_id = assigned_card_id);
    end loop;
  end if;

  update public.profiles
  set auth_user_id = new.id,
      email = lower(new.email),
      name = coalesce(nullif(name, ''), profile_name),
      card_id = case
        when requested_card_id <> '' then assigned_card_id
        when card_id ~ '^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$' then card_id
        else assigned_card_id
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
      assigned_card_id,
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
            when requested_card_id <> '' then excluded.card_id
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

commit;
