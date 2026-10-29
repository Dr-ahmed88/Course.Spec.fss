-- نفّذ هذا الملف من SQL Editor داخل مشروع Supabase.
create extension if not exists pgcrypto;

create table if not exists public.app_records (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('courses','standards','program_outcomes','course_outcomes','course_contents','teaching_methods','assessment_methods','mappings','institution_info')),
  title text not null,
  code text not null default '',
  description text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_records_category_idx on public.app_records(category);
create index if not exists app_records_title_idx on public.app_records(title);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor','viewer')) default 'viewer',
  created_at timestamptz not null default now()
);

alter table public.app_records enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.user_roles where user_id = auth.uid() limit 1 $$;

-- يمكن للمسؤول إدارة جميع السجلات. هذا النموذج الأولي يقصر الكتابة على المسؤول فقط.
drop policy if exists "Admins can read all app records" on public.app_records;
create policy "Admins can read all app records" on public.app_records for select to authenticated using (public.current_app_role() = 'admin');
drop policy if exists "Admins can insert app records" on public.app_records;
create policy "Admins can insert app records" on public.app_records for insert to authenticated with check (public.current_app_role() = 'admin');
drop policy if exists "Admins can update app records" on public.app_records;
create policy "Admins can update app records" on public.app_records for update to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
drop policy if exists "Admins can delete app records" on public.app_records;
create policy "Admins can delete app records" on public.app_records for delete to authenticated using (public.current_app_role() = 'admin');

-- يستطيع المستخدم قراءة دوره فقط؛ لا توجد سياسة تسمح للمستخدم بمنح نفسه دور المسؤول.
drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- إنشاء المسؤول:
-- 1) أنشئ مستخدمًا من Authentication > Users داخل Supabase.
-- 2) انسخ UUID الخاص به ثم نفّذ الأمر التالي مع استبدال UUID:
-- insert into public.user_roles(user_id, role) values ('PUT-AUTH-USER-UUID-HERE', 'admin')
-- on conflict (user_id) do update set role = excluded.role;
