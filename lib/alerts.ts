import { redis } from './redis';

export async function fetchAlertStatus(): Promise<boolean | null> {
  try {
    const response = await fetch('https://ubilling.net.ua/aerialalerts/', {
      headers: { 'User-Agent': 'AlertTracker/1.0' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data['Запорізька область']) {
      return Boolean(data['Запорізька область'].alertnow);
    }
    return null;
  } catch {
    return null;
  }
}

export async function checkAndUpdate() {
  const isAlertNow = await fetchAlertStatus();
  if (isAlertNow === null) return;
  
  const stateStr = await redis.get('alert:state');
  const currentState = stateStr ? JSON.parse(stateStr) : null;
  const now = new Date().toISOString();
  
  if (!currentState || currentState.alert !== isAlertNow) {
    await redis.rpush('alert:events', JSON.stringify({
      type: isAlertNow ? 'alert_start' : 'alert_end',
      time: now
    }));
    await redis.set('alert:state', JSON.stringify({
      alert: isAlertNow,
      lastChange: now,
      checkedAt: now
    }));
  }
}
