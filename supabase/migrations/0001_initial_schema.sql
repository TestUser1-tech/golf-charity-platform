create extension if not exists pgcrypto;

create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  is_featured boolean default false,
  upcoming_events jsonb,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text default 'subscriber' check (role in ('subscriber', 'admin')),
  subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'lapsed', 'cancelled')),
  subscription_plan text check (subscription_plan in ('monthly', 'yearly')),
  subscription_renewal_date timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  charity_id uuid references public.charities(id),
  charity_contribution_pct integer default 10 check (charity_contribution_pct >= 10),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 1 and 45),
  score_date date not null,
  created_at timestamptz default now()
);

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  draw_month date not null,
  draw_type text not null check (draw_type in ('random', 'algorithmic')),
  drawn_numbers integer[],
  status text default 'pending' check (status in ('pending', 'simulation', 'published')),
  jackpot_carried_over boolean default false,
  total_prize_pool numeric(10,2),
  created_at timestamptz default now(),
  published_at timestamptz
);

create table if not exists public.draw_entries (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scores_snapshot integer[],
  match_type text check (match_type in ('none', '3-match', '4-match', '5-match')),
  created_at timestamptz default now()
);

create table if not exists public.prize_pools (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  match_type text not null check (match_type in ('5-match', '4-match', '3-match')),
  pool_amount numeric(10,2),
  winner_count integer default 0,
  payout_per_winner numeric(10,2),
  jackpot_rollover_amount numeric(10,2) default 0,
  created_at timestamptz default now(),
  unique(draw_id, match_type)
);

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_type text not null check (match_type in ('5-match', '4-match', '3-match')),
  prize_amount numeric(10,2),
  proof_image_url text,
  verification_status text default 'pending' check (verification_status in ('pending', 'approved', 'rejected')),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid')),
  created_at timestamptz default now(),
  paid_at timestamptz
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_created on auth.users;
create trigger auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.enforce_rolling_five_scores()
returns trigger
language plpgsql
as $$
begin
  delete from public.scores
  where id in (
    select id
    from public.scores
    where user_id = new.user_id
    order by score_date asc, created_at asc
    offset 5
  );
  return new;
end;
$$;

drop trigger if exists scores_rolling_five on public.scores;
create trigger scores_rolling_five
after insert on public.scores
for each row execute function public.enforce_rolling_five_scores();

alter table public.profiles enable row level security;
alter table public.scores enable row level security;
alter table public.charities enable row level security;
alter table public.draws enable row level security;
alter table public.draw_entries enable row level security;
alter table public.prize_pools enable row level security;
alter table public.winners enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
for select using (auth.uid() = id or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "profiles_update_own_or_admin" on public.profiles
for update using (auth.uid() = id or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "scores_manage_own_or_admin" on public.scores
for all using (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
)) with check (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "charities_public_read" on public.charities
for select using (true);

create policy "charities_admin_write" on public.charities
for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "draws_public_published_read" on public.draws
for select using (status = 'published' or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "draws_admin_write" on public.draws
for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "draw_entries_read_own_or_admin" on public.draw_entries
for select using (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "draw_entries_admin_write" on public.draw_entries
for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "prize_pools_public_read" on public.prize_pools
for select using (true);

create policy "prize_pools_admin_write" on public.prize_pools
for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "winners_read_own_or_admin" on public.winners
for select using (user_id = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "winners_admin_update" on public.winners
for update using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "winners_admin_insert" on public.winners
for insert with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));
