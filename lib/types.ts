export interface AlertEvent {
  type: 'alert_start' | 'alert_end';
  time: string;
}

export interface AlertState {
  alert: boolean;
  lastChange: string;
  checkedAt: string;
}