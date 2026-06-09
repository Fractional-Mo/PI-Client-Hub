-- PI Client Hub — Supabase Schema
-- Paste this entire file into Supabase → SQL Editor → Run

create table if not exists clients (
  id text primary key,
  name text not null,
  short_name text not null,
  color text not null default '#6366f1',
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists action_items (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','in_progress','done')),
  due_date date,
  source_note_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists discussion_topics (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  title text not null,
  body text,
  resolved boolean not null default false,
  source_note_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meeting_notes (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  title text not null,
  content text not null,
  source text not null default 'manual' check (source in ('manual','otter')),
  otter_meeting_id text,
  meeting_date date not null,
  extracted_action_items text[],
  extracted_topics text[],
  created_at timestamptz not null default now()
);

-- Indexes for fast client-filtered lookups
create index if not exists action_items_client_idx on action_items(client_id);
create index if not exists topics_client_idx on discussion_topics(client_id);
create index if not exists notes_client_idx on meeting_notes(client_id);

-- Enable realtime so both users see live updates
alter publication supabase_realtime add table clients;
alter publication supabase_realtime add table action_items;
alter publication supabase_realtime add table discussion_topics;
alter publication supabase_realtime add table meeting_notes;

-- Open read/write access (no login required — internal tool)
alter table clients enable row level security;
alter table action_items enable row level security;
alter table discussion_topics enable row level security;
alter table meeting_notes enable row level security;

create policy "allow all" on clients for all using (true) with check (true);
create policy "allow all" on action_items for all using (true) with check (true);
create policy "allow all" on discussion_topics for all using (true) with check (true);
create policy "allow all" on meeting_notes for all using (true) with check (true);

-- Seed the 6 default clients
insert into clients (id, name, short_name, color) values
  ('malman',    'Malman Law',        'Malman',    '#6366f1'),
  ('goldblatt', 'Goldblatt + Singer','Goldblatt', '#0ea5e9'),
  ('dubin',     'Dubin Law Group',   'Dubin',     '#10b981'),
  ('shulman',   'Shulman & Hill',    'Shulman',   '#f59e0b'),
  ('parnall',   'Parnall Law',       'Parnall',   '#ef4444'),
  ('burnetti',  'Burnetti, P.A.',    'Burnetti',  '#8b5cf6')
on conflict (id) do nothing;
