/**
 * Timesheet Hours Calculation Service
 * 
 * Centralized business logic for calculating work hours from clock-in/out times.
 * Applies break deduction, minimum hours, and overtime rules consistently.
 */

export type HoursCalculationInput = {
  clockIn: string;  // ISO timestamp
  clockOut: string; // ISO timestamp
  breakMinutes?: number;    // from timesheet (default: auto-calculated if > 6h)
  minimumHours?: number;    // default 4
  overtimeThresholdHours?: number; // default 8 if not stored in DB
};

export type HoursCalculationResult = {
  totalHours: number;       // after break deduction, before min-hours & split
  billableHours: number;    // after applying min 4h rule
  regularHours: number;
  overtimeHours: number;
  totalMinutes: number;      // raw total minutes worked
  billableMinutes: number;   // after break deduction
  breakMinutes: number;      // actual break minutes applied
};

/**
 * Calculate work hours from clock-in and clock-out times
 * 
 * Business rules:
 * - Break deduction: 45 min unpaid break for shifts over 6 hours
 * - Minimum billable hours: 4 hours minimum, even if worker worked less
 * - Overtime: hours over 8 are considered overtime
 * 
 * @param input - Clock times and calculation parameters
 * @returns Calculated hours breakdown
 */
export function calculateHoursFromTimes(
  input: HoursCalculationInput
): HoursCalculationResult {
  const {
    clockIn,
    clockOut,
    breakMinutes: providedBreakMinutes,
    minimumHours = 4,
    overtimeThresholdHours = 8,
  } = input;

  // Parse times
  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);

  // Calculate raw total minutes
  let totalMinutes = Math.round(
    (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60)
  );

  // Handle overnight shifts (if clock-out is before clock-in, add 24 hours)
  if (totalMinutes <= 0) {
    totalMinutes += 24 * 60;
  }

  // Calculate total hours before break
  const totalHoursBeforeBreak = totalMinutes / 60;

  // Auto-calculate break if not provided: 45 min for shifts > 6 hours
  let breakMinutes = providedBreakMinutes ?? 0;
  if (providedBreakMinutes === undefined || providedBreakMinutes === null) {
    if (totalHoursBeforeBreak > 6) {
      breakMinutes = 45;
    } else {
      breakMinutes = 0;
    }
  }

  // Ensure break doesn't exceed total time
  if (breakMinutes > totalMinutes) {
    breakMinutes = 0;
  }

  // Calculate billable minutes (after break deduction)
  const billableMinutes = Math.max(0, totalMinutes - breakMinutes);
  const totalHours = billableMinutes / 60;

  // Apply minimum hours rule
  const billableHours = Math.max(totalHours, minimumHours);

  // Split into regular and overtime
  const regularHours = Math.min(billableHours, overtimeThresholdHours);
  const overtimeHours = Math.max(0, billableHours - overtimeThresholdHours);

  return {
    totalHours,
    billableHours,
    regularHours,
    overtimeHours,
    totalMinutes,
    billableMinutes,
    breakMinutes,
  };
}

