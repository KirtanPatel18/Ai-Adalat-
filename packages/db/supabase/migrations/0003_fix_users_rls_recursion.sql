-- Fix: "infinite recursion detected in policy for relation users" (SQLSTATE 42P17)
-- The admin policies in 0001_init.sql query public.users from inside a policy
-- on public.users, so Postgres recurses. A SECURITY DEFINER helper bypasses RLS.

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "users: admin read all" on public.users;
create policy "users: admin read all" on public.users for select using (public.is_admin());

drop policy if exists "documents: admin read" on public.documents;
create policy "documents: admin read" on public.documents for select using (public.is_admin());

drop policy if exists "agent_traces: admin read all" on public.agent_traces;
create policy "agent_traces: admin read all" on public.agent_traces for select using (public.is_admin());