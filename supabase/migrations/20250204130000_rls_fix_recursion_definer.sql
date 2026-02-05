-- =============================================================================
-- FLEXIWORK: RLS recursion fix – SECURITY DEFINER functions + unified policies
-- Fixes: infinite recursion between shifts <-> applications (and 500 errors).
-- Run in Supabase SQL Editor or via migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SECURITY DEFINER helpers (bypass RLS inside policies to break cycles)
-- -----------------------------------------------------------------------------

-- Returns employer_id for a shift. Used by applications/timesheets so they
-- don't SELECT from shifts (which would re-trigger shifts RLS).
CREATE OR REPLACE FUNCTION public.get_shift_employer_id(p_shift_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employer_id FROM public.shifts WHERE id = p_shift_id LIMIT 1;
$$;

-- Returns true if worker p_worker_id can see internal/both shift p_shift_id:
-- worker profile check + (employed_by contains employer OR has application).
-- Does not use RLS so shifts policy can call this without touching applications RLS.
CREATE OR REPLACE FUNCTION public.worker_can_see_internal_shift(p_shift_id uuid, p_worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_id uuid;
  v_profile    record;
  v_has_app    boolean;
BEGIN
  SELECT employer_id INTO v_employer_id FROM public.shifts WHERE id = p_shift_id LIMIT 1;
  IF v_employer_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT user_type, is_blocked, employed_by
  INTO v_profile
  FROM public.profiles
  WHERE id = p_worker_id
  LIMIT 1;

  IF v_profile IS NULL OR v_profile.user_type <> 'worker' OR (v_profile.is_blocked = true) THEN
    RETURN false;
  END IF;

  -- Employed by this employer?
  IF v_profile.employed_by IS NOT NULL AND v_profile.employed_by <> '[]'::jsonb THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_profile.employed_by) AS emp
      WHERE (emp->>'employer_id') = v_employer_id::text
        AND ((emp->>'status') = 'active' OR (emp->>'status') IS NULL)
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Fallback: has application for this shift (direct read, no RLS)
  SELECT EXISTS (
    SELECT 1
    FROM public.applications
    WHERE shift_id = p_shift_id AND worker_id = p_worker_id
    LIMIT 1
  ) INTO v_has_app;

  RETURN v_has_app;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. APPLICATIONS – use get_shift_employer_id to avoid reading shifts
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS applications_select_employer_via_shift ON public.applications;
CREATE POLICY applications_select_employer_via_shift ON public.applications
  FOR SELECT
  USING (public.get_shift_employer_id(shift_id) = auth.uid());

DROP POLICY IF EXISTS applications_update_employer_via_shift ON public.applications;
CREATE POLICY applications_update_employer_via_shift ON public.applications
  FOR UPDATE
  USING (public.get_shift_employer_id(shift_id) = auth.uid());

-- Worker can select own applications (for listing "my applications")
DROP POLICY IF EXISTS applications_select_worker_own ON public.applications;
CREATE POLICY applications_select_worker_own ON public.applications
  FOR SELECT
  USING (worker_id = auth.uid());

-- applications_update_worker_own already exists in 20250107000001; ensure it exists
DROP POLICY IF EXISTS "applications_update_worker_own" ON public.applications;
CREATE POLICY "applications_update_worker_own" ON public.applications
  FOR UPDATE
  USING (worker_id = auth.uid());

-- Worker insert: apply to a shift (worker_id = self)
DROP POLICY IF EXISTS applications_insert_worker ON public.applications;
CREATE POLICY applications_insert_worker ON public.applications
  FOR INSERT
  WITH CHECK (worker_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3. TIMESHEETS – use get_shift_employer_id; worker can read/update own
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS timesheets_select_employer_via_shift ON public.timesheets;
CREATE POLICY timesheets_select_employer_via_shift ON public.timesheets
  FOR SELECT
  USING (public.get_shift_employer_id(shift_id) = auth.uid());

DROP POLICY IF EXISTS timesheets_update_employer_via_shift ON public.timesheets;
CREATE POLICY timesheets_update_employer_via_shift ON public.timesheets
  FOR UPDATE
  USING (public.get_shift_employer_id(shift_id) = auth.uid());

DROP POLICY IF EXISTS timesheets_select_worker_own ON public.timesheets;
CREATE POLICY timesheets_select_worker_own ON public.timesheets
  FOR SELECT
  USING (worker_id = auth.uid());

-- Worker may need to update own timesheet (clock in/out)
DROP POLICY IF EXISTS timesheets_update_worker_own ON public.timesheets;
CREATE POLICY timesheets_update_worker_own ON public.timesheets
  FOR UPDATE
  USING (worker_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. SHIFTS – drop all SELECT/UPDATE policies that cause recursion, recreate
-- -----------------------------------------------------------------------------

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Drop every known SELECT policy on shifts (from various migrations)
DROP POLICY IF EXISTS "shifts_select_worker_open_shifts" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select_worker_internal_shifts" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select_worker_linked" ON public.shifts;
DROP POLICY IF EXISTS shifts_select_employer_own ON public.shifts;
DROP POLICY IF EXISTS shifts_select_worker_browse ON public.shifts;

-- Drop UPDATE policies we will recreate
DROP POLICY IF EXISTS "shifts_update_worker_status" ON public.shifts;
DROP POLICY IF EXISTS "shifts_update_employer_own" ON public.shifts;
DROP POLICY IF EXISTS shifts_update_employer_own ON public.shifts;

-- Drop INSERT/DELETE to recreate with consistent naming
DROP POLICY IF EXISTS shifts_insert_employer ON public.shifts;
DROP POLICY IF EXISTS shifts_delete_employer_own ON public.shifts;

-- Employer: full CRUD on own shifts
CREATE POLICY shifts_select_employer_own ON public.shifts
  FOR SELECT
  USING (employer_id = auth.uid());

CREATE POLICY shifts_insert_employer ON public.shifts
  FOR INSERT
  WITH CHECK (employer_id = auth.uid());

CREATE POLICY shifts_update_employer_own ON public.shifts
  FOR UPDATE
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

CREATE POLICY shifts_delete_employer_own ON public.shifts
  FOR DELETE
  USING (employer_id = auth.uid());

-- Worker: browse open marketplace/both (no recursion; no subquery to applications)
CREATE POLICY shifts_select_worker_browse ON public.shifts
  FOR SELECT
  USING (
    status = 'open'
    AND visibility IN ('marketplace', 'both')
  );

-- Worker: internal/both shifts via DEFINER (no RLS on applications from here)
CREATE POLICY shifts_select_worker_internal ON public.shifts
  FOR SELECT
  USING (
    status = 'open'
    AND visibility IN ('internal', 'both')
    AND public.worker_can_see_internal_shift(id, auth.uid())
  );

-- Worker: update shift status to in_progress when they have a timesheet (clock in)
CREATE POLICY "shifts_update_worker_status" ON public.shifts
  FOR UPDATE
  USING (
    (status = 'open' OR status = 'in_progress')
    AND EXISTS (
      SELECT 1
      FROM public.timesheets t
      WHERE t.shift_id = shifts.id AND t.worker_id = auth.uid()
    )
  )
  WITH CHECK (status = 'in_progress');

-- -----------------------------------------------------------------------------
-- 5. Grant execute to authenticated (for policy use)
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_shift_employer_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shift_employer_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.worker_can_see_internal_shift(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.worker_can_see_internal_shift(uuid, uuid) TO service_role;
