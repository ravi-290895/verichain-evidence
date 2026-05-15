ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;

ALTER TABLE public.evidence_ledger
  ADD COLUMN IF NOT EXISTS signer_address TEXT,
  ADD COLUMN IF NOT EXISTS signature TEXT;

CREATE INDEX IF NOT EXISTS idx_evidence_ledger_signer ON public.evidence_ledger(signer_address);