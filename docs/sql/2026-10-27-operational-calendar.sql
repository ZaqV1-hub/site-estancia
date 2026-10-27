-- Additive migration; preserves voucher values and validity.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='agenda' AND column_name='nmpromocional' AND character_maximum_length<52) THEN
    ALTER TABLE public.agenda ALTER COLUMN nmpromocional TYPE varchar(52);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.estancia_calendar_rules (
  date date PRIMARY KEY,
  agenda_id integer NOT NULL UNIQUE REFERENCES public.agenda(idagenda) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('dayuse', 'event')),
  status text NOT NULL CHECK (status IN ('abe', 'fec', 'lot')),
  validity text NOT NULL CHECK (validity IN ('day', '1d', '7d', '30d', '6m')),
  passport_ids text[] NOT NULL,
  addon_ids text[] NOT NULL,
  event_id text,
  event_title text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.estancia_voucher_reschedules (
  voucher_id integer PRIMARY KEY REFERENCES public.voucher(idvoucher),
  original_date date NOT NULL,
  previous_date date NOT NULL,
  target_date date NOT NULL,
  reason text NOT NULL,
  actor_name text,
  actor_cpf text,
  moved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS estancia_reschedules_target_idx
  ON public.estancia_voucher_reschedules(target_date);

COMMIT;
