CREATE OR REPLACE FUNCTION private.apply_distribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_type TEXT;
  a_qty INTEGER;
  tx_notes TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT asset_type, quantity INTO a_type, a_qty FROM public.assets WHERE id = NEW.asset_id FOR UPDATE;
    IF a_type <> 'disposable' THEN RAISE EXCEPTION 'Distributions only allowed for disposable assets'; END IF;
    IF NEW.quantity > a_qty THEN RAISE EXCEPTION 'Insufficient stock for distribution'; END IF;
    UPDATE public.assets SET quantity = quantity - NEW.quantity, updated_at = now() WHERE id = NEW.asset_id;
    tx_notes := 'Distribution' || CASE WHEN NEW.notes IS NULL OR NEW.notes = '' THEN '' ELSE ': ' || NEW.notes END;
    INSERT INTO public.asset_transactions (asset_id, transaction_type, quantity, performed_by, notes)
    VALUES (NEW.asset_id, 'stock_out', NEW.quantity, NEW.distributed_by, tx_notes);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.assets SET quantity = quantity + OLD.quantity, updated_at = now() WHERE id = OLD.asset_id;
    INSERT INTO public.asset_transactions (asset_id, transaction_type, quantity, performed_by, notes)
    VALUES (OLD.asset_id, 'stock_in', OLD.quantity, auth.uid(), 'Reversed distribution');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
