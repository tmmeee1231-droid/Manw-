-- MANW chat media: images and voice notes
-- Run this in the Supabase SQL Editor for project fgierwevhdmnmrkmqzcw.

alter table public.subject_chat_messages
  alter column body drop not null;

alter table public.subject_chat_messages
  drop constraint if exists subject_chat_messages_body_check;

alter table public.subject_chat_messages
  add column if not exists media_path text,
  add column if not exists media_type text,
  add column if not exists media_name text;

alter table public.subject_chat_messages
  add constraint subject_chat_messages_body_or_media_check
  check (
    (coalesce(char_length(body), 0) between 1 and 3000)
    or media_path is not null
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'manw-chat-media',
  'manw-chat-media',
  false,
  20971520,
  array['image/jpeg','image/png','image/webp','image/gif','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/aac']
)
on conflict (id) do update
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "MANW chat media authenticated read" on storage.objects;
create policy "MANW chat media authenticated read"
on storage.objects for select
to authenticated
using (bucket_id = 'manw-chat-media');

drop policy if exists "MANW chat media upload own folder" on storage.objects;
create policy "MANW chat media upload own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'manw-chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "MANW chat media delete own folder" on storage.objects;
create policy "MANW chat media delete own folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'manw-chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- Allow each student to delete only their own chat rows.
drop policy if exists "students delete own or expired messages"
on public.subject_chat_messages;

create policy "students delete own or expired messages"
on public.subject_chat_messages
for delete
to authenticated
using (
  user_id = auth.uid()
  or created_at < now() - interval '5 hours'
);

notify pgrst, 'reload schema';
