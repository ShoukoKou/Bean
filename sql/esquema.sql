-- Esquema propuesto para un proyecto de Supabase. La demo usa localStorage.
begin;

create type public.bean_tipo as enum ('catalogo', 'personalizada');
create type public.bean_estado as enum (
    'recibida', 'propuesta', 'acuerdo', 'pendiente_adelanto', 'no_viable',
    'rechazada', 'no_concretado', 'confirmado', 'elaboracion', 'listo',
    'en_envio', 'pendiente_saldo', 'por_verificar', 'regularizacion', 'entregado'
);

create table public.bean_solicitudes (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique check (codigo ~ '^BB-[A-F0-9]{12}$'),
    cliente_id uuid not null references auth.users (id) on delete restrict,
    tipo public.bean_tipo not null,
    estado public.bean_estado not null,
    nombre text not null check (length(btrim(nombre)) between 2 and 60),
    titulo text not null check (length(btrim(titulo)) between 2 and 80),
    zona text not null check (length(btrim(zona)) between 2 and 80),
    fecha_deseada date not null,
    dedicatoria text not null default '' check (length(dedicatoria) <= 180),
    producto text,
    cantidad integer check (cantidad between 1 and 20),
    descripcion text check (length(btrim(descripcion)) between 10 and 600),
    colores text check (length(btrim(colores)) between 2 and 100),
    estimado_centimos integer check (estimado_centimos >= 100),
    propuesta_detalle text check (length(btrim(propuesta_detalle)) between 5 and 500),
    propuesta_alternativa boolean,
    propuesta_fecha date,
    propuesta_centimos integer check (propuesta_centimos between 100 and 999999),
    motivo text check (length(btrim(motivo)) between 5 and 500),
    adelanto_centimos integer,
    adelanto_registrado timestamptz,
    saldo_centimos integer,
    saldo_informado timestamptz,
    saldo_verificado timestamptz,
    creada timestamptz not null default now(),
    constraint bean_datos_tipo check (
        (tipo = 'catalogo' and producto is not null and cantidad is not null
            and estimado_centimos is not null and descripcion is null and colores is null)
        or
        (tipo = 'personalizada' and producto is null and cantidad is null
            and estimado_centimos is null and descripcion is not null and colores is not null)
    ),
    constraint bean_propuesta_completa check (
        num_nonnulls(propuesta_detalle, propuesta_alternativa, propuesta_fecha, propuesta_centimos) in (0, 4)
    ),
    constraint bean_estado_con_propuesta check (
        estado not in ('propuesta', 'acuerdo', 'rechazada') or propuesta_centimos is not null
    ),
    constraint bean_motivo_no_viable check (estado <> 'no_viable' or motivo is not null),
    constraint bean_adelanto_coherente check (
        num_nonnulls(adelanto_centimos, adelanto_registrado) in (0, 2)
        and (adelanto_centimos is null or
            (coalesce(propuesta_centimos, estimado_centimos) is not null
             and adelanto_centimos = (coalesce(propuesta_centimos, estimado_centimos)::bigint + 1) / 2))
    ),
    constraint bean_pedido_confirmado check (
        (estado in ('confirmado', 'elaboracion', 'listo', 'en_envio', 'pendiente_saldo',
            'por_verificar', 'regularizacion', 'entregado')) = (adelanto_registrado is not null)
    ),
    constraint bean_saldo_coherente check (
        num_nonnulls(saldo_centimos, saldo_informado) in (0, 2)
        and (saldo_centimos is null or (adelanto_centimos is not null
             and saldo_centimos = coalesce(propuesta_centimos, estimado_centimos) - adelanto_centimos))
        and ((estado in ('por_verificar', 'regularizacion', 'entregado')) = (saldo_informado is not null))
        and ((estado = 'entregado') = (saldo_verificado is not null))
    )
);

create table public.bean_historial (
    id bigint generated always as identity primary key,
    solicitud_id uuid not null references public.bean_solicitudes (id) on delete cascade,
    estado public.bean_estado not null,
    registrado timestamptz not null default now()
);

create index bean_solicitudes_cliente_fecha on public.bean_solicitudes (cliente_id, creada desc);
create index bean_solicitudes_estado_fecha on public.bean_solicitudes (estado, creada desc);
create index bean_historial_solicitud on public.bean_historial (solicitud_id, id);

alter table public.bean_solicitudes enable row level security;
alter table public.bean_historial enable row level security;

revoke all on public.bean_solicitudes, public.bean_historial from public, anon, authenticated;
grant select on public.bean_solicitudes, public.bean_historial to authenticated;
grant select, insert, update, delete on public.bean_solicitudes, public.bean_historial to service_role;
grant usage on sequence public.bean_historial_id_seq to service_role;

-- El rol del taller se asigna en app_metadata desde un servicio autorizado.
create policy "lectura de solicitudes propias o del taller"
on public.bean_solicitudes for select to authenticated
using ((select auth.uid()) = cliente_id
    or (select auth.jwt() -> 'app_metadata' ->> 'bean_rol') = 'taller');

create policy "lectura del historial de solicitudes visibles"
on public.bean_historial for select to authenticated
using (exists (
    select 1 from public.bean_solicitudes solicitud where solicitud.id = solicitud_id
));

commit;
