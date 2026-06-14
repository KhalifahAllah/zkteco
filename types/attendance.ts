export interface AttendancePunchLog {
  log_id: string;
  device_sn: string;
  device_name: string | null;
  user_pin: string;
  full_name: string | null;
  timestamp: string;
  state: number;
  verify_mode: number;
  work_code: string | null;
}
