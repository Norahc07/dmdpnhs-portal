-- Document requests: only SF9 / SF10 / Good Moral + pickup appointment
-- Run in Supabase SQL Editor

ALTER TABLE public.document_requests
  ADD COLUMN IF NOT EXISTS appointment_date date,
  ADD COLUMN IF NOT EXISTS appointment_time time;

COMMENT ON COLUMN public.document_requests.appointment_date IS
  'Preferred pickup / release appointment date booked by the student';
COMMENT ON COLUMN public.document_requests.appointment_time IS
  'Preferred pickup appointment time';

-- Align check constraint with portal DOCUMENT_TYPES (SF9 / SF10 / Good Moral)
DO $$
BEGIN
  IF to_regclass('public.document_requests') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.document_requests
    DROP CONSTRAINT IF EXISTS document_requests_document_type_check;

  UPDATE public.document_requests
  SET document_type = 'SF10'
  WHERE document_type IN ('Form 137', 'SF 10', 'Permanent Record');

  UPDATE public.document_requests
  SET document_type = 'SF9'
  WHERE document_type IN ('Form 138', 'SF 9', 'Report Card');

  UPDATE public.document_requests
  SET document_type = 'Good Moral'
  WHERE document_type IN (
    'Good Moral Certificate',
    'Certificate of Good Moral Character',
    'Certificate of Good Moral'
  );

  UPDATE public.document_requests
  SET document_type = 'Good Moral'
  WHERE document_type NOT IN ('SF9', 'SF10', 'Good Moral');

  ALTER TABLE public.document_requests
    ADD CONSTRAINT document_requests_document_type_check
    CHECK (document_type IN ('SF9', 'SF10', 'Good Moral'));

  -- Pipeline statuses: Pending → Ready for Pickup → Already Claimed
  ALTER TABLE public.document_requests
    DROP CONSTRAINT IF EXISTS document_requests_status_check;

  UPDATE public.document_requests
  SET status = 'Pending'
  WHERE status IS NULL
     OR status NOT IN ('Pending', 'Ready for Pickup', 'Already Claimed', 'Processing');

  UPDATE public.document_requests
  SET status = 'Pending'
  WHERE status = 'Processing';

  ALTER TABLE public.document_requests
    ADD CONSTRAINT document_requests_status_check
    CHECK (status IN ('Pending', 'Ready for Pickup', 'Already Claimed'));
END $$;
