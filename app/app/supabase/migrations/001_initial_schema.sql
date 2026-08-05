-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create custom types
create type user_role as enum ('user', 'admin', 'super_admin');
create type todo_status as enum ('pending', 'in_progress', 'completed');

-- Todos table
create table public.todos (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  status todo_status default 'pending',
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User profiles table (extends auth.users)
create table public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  role user_role default 'user',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for faster queries
create index idx_todos_user_id on public.todos(user_id);
create index idx_todos_status on public.todos(status);
create index idx_user_profiles_role on public.user_profiles(role);

-- Enable Row Level Security
alter table public.todos enable row level security;
alter table public.user_profiles enable row level security;

-- RLS policies for todos
create policy "Users can view their own todos"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own todos"
  on public.todos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own todos"
  on public.todos for delete
  using (auth.uid() = user_id);

-- RLS policies for user_profiles
create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create or replace trigger update_todos_updated_at
  before update on public.todos
  for each row execute function public.update_updated_at();

create or replace trigger update_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.update_updated_at();

-- Create storage bucket for files
insert into storage.buckets (id, name, public)
values ('files', 'files', false);

-- Storage policies
create policy "Authenticated users can upload files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'files');

create policy "Users can view their own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'files' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'files' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Enable realtime for todos table
alter publication supabase_realtime add table public.todos;
