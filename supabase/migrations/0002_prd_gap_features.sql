create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text,
  created_at timestamptz default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean default false,
  starts_at timestamptz,
  ends_at timestamptz,
  country_code text,
  created_at timestamptz default now()
);

alter table public.profiles
  add column if not exists country_code text,
  add column if not exists organization_id uuid references public.organizations(id),
  add column if not exists renewal_reminder_sent_for date;

alter table public.draws
  add column if not exists campaign_id uuid references public.campaigns(id);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  charity_id uuid not null references public.charities(id),
  donor_email text not null,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'usd',
  message text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_donations_user_id on public.donations(user_id);
create index if not exists idx_donations_charity_id on public.donations(charity_id);
create index if not exists idx_donations_payment_status on public.donations(payment_status);

alter table public.organizations enable row level security;
alter table public.campaigns enable row level security;
alter table public.donations enable row level security;

create policy "organizations_public_read" on public.organizations
for select using (true);

create policy "organizations_admin_write" on public.organizations
for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "campaigns_public_read" on public.campaigns
for select using (true);

create policy "campaigns_admin_write" on public.campaigns
for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));

create policy "donations_read_own_or_admin" on public.donations
for select using (
  user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "donations_insert_own_or_admin" on public.donations
for insert with check (
  user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "donations_admin_update" on public.donations
for update using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
));
