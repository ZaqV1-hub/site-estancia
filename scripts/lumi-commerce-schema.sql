BEGIN;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS lumi_guest boolean NOT NULL DEFAULT false;
ALTER TABLE compra ADD COLUMN IF NOT EXISTS origem_checkout varchar(30);
CREATE TABLE IF NOT EXISTS lumi_orders (
  token text PRIMARY KEY,
  tenant_id text NOT NULL,
  conversation_id text NOT NULL,
  selection jsonb NOT NULL,
  state text NOT NULL DEFAULT 'quoted',
  purchase_id integer UNIQUE REFERENCES compra(idcompra),
  cpf varchar(11),
  buyer jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS lumi_orders_conversation ON lumi_orders(tenant_id, conversation_id);
ALTER TABLE lumi_orders ADD COLUMN IF NOT EXISTS payment_attempt jsonb;
COMMIT;
