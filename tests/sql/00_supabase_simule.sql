-- Doublures de ce que Supabase fournit (rôles, auth.uid(), pg_net, pg_cron) pour tester nos scripts sur un PostgreSQL ordinaire.
create role anon nologin; create role authenticated nologin;
create schema auth; create schema extensions; create extension pgcrypto schema extensions;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
create schema net; create table net.appels(id serial, url text, body jsonb, headers jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ insert into net.appels(url,body,headers) values(url,body,headers) returning id $$;
create schema cron; create table cron.job(jobname text primary key, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job values(n,s,c) on conflict (jobname) do update set schedule=excluded.schedule, command=excluded.command returning 1::bigint $$;
create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname=n returning true $$;
create publication supabase_realtime;
grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated, anon;
