-- Trivo 0001: cobros y trazabilidad.
-- PROPUESTA, no aplicada. Se corre una sola vez contra Supabase tras aprobarla.
-- Dinero: pesos enteros (COP), sin decimales. Fechas: timestamptz (UTC).

begin;

create table comercios (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null check (char_length(nombre) between 1 and 80),
  ultimo_numero integer not null default 0,
  creado_en     timestamptz not null default now()
);

create table cobros (
  id           uuid primary key default gen_random_uuid(),
  comercio_id  uuid not null references comercios (id),
  numero       integer not null,
  codigo       char(6) not null check (codigo ~ '^[0-9]{6}$'),
  monto        bigint not null check (monto > 0 and monto <= 999999999),
  concepto     text not null default '' check (char_length(concepto) <= 30),
  estado       text not null default 'esperando'
               check (estado in ('esperando', 'procesando', 'cobrado', 'vencido')),
  creado_en    timestamptz not null default now(),
  vence_en     timestamptz not null,
  pagado_en    timestamptz,
  -- Open Payments: quedan vacías hasta integrar el flujo real.
  incoming_payment_url text,
  quote_url            text,
  outgoing_payment_url text,
  unique (comercio_id, numero),
  check (vence_en > creado_en),
  check ((estado = 'cobrado') = (pagado_en is not null))
);

-- Un código en uso no puede repetirse (el pagador lo busca solo por código).
create unique index cobros_codigo_en_uso
  on cobros (codigo) where estado in ('esperando', 'procesando');

create index cobros_comercio_recientes on cobros (comercio_id, creado_en desc);

create table eventos (
  id         bigint generated always as identity primary key,
  cobro_id   uuid not null references cobros (id),
  tipo       text not null check (tipo in (
               'creado', 'compartido_whatsapp', 'link_copiado',
               'abierto_por_pagador', 'aprobacion_iniciada', 'cobrado', 'vencido')),
  detalle    text check (char_length(detalle) <= 300),
  creado_en  timestamptz not null default now()
);

create index eventos_por_cobro on eventos (cobro_id, creado_en);

-- Trazabilidad que no se puede reescribir: los eventos solo se agregan.
create function eventos_solo_agregar() returns trigger
language plpgsql as $$
begin
  raise exception 'eventos es de solo agregar (no se actualiza ni se borra)';
end;
$$;

create trigger eventos_inmutables
  before update or delete on eventos
  for each row execute function eventos_solo_agregar();

-- Número consecutivo por comercio, atómico (sin huecos ni repetidos con cobros simultáneos).
create function siguiente_numero(p_comercio uuid) returns integer
language sql as $$
  update comercios set ultimo_numero = ultimo_numero + 1
  where id = p_comercio
  returning ultimo_numero;
$$;

-- Solo el servidor toca estas tablas. Con RLS activa y sin políticas, la API pública
-- de Supabase (claves anon y authenticated) no ve ni una fila.
alter table comercios enable row level security;
alter table cobros    enable row level security;
alter table eventos   enable row level security;

commit;
