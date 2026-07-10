import { AlertEvent, AlertState } from './types';
import { redis } from './redis';

const STATE_KEY = 'alert:state';
const EVENTS_KEY = 'alert:events';
const MAX_EVENTS = 5000;

export async function fetchAlertStatus(): Promise<boolean | null> {
  try {
    const response = await fetch('https://ubilling.net.ua/aerialalerts/', {
      next: { revalidate: 0 },
      headers: {
        'User-Agent': 'AlertTracker/1.0',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const regionName = process.env.REGION_NAME || 'Запорізька область';

    if (data[regionName]) {
      return Boolean(data[regionName].alertnow);
    }

    return null;
  } catch (error) {
    console.error('Error fetching alert status:', error);
    return null;
  }
}

export async function getState(): Promise<AlertState | null> {
  const stateStr = await redis.get(STATE_KEY);
  if (!stateStr) return null;
  return JSON.parse(stateStr);
}

export async function setState(state: AlertState): Promise<void> {
  await redis.set(STATE_KEY, JSON.stringify(state));
}

export async function getEvents(): Promise<AlertEvent[]> {
  const events = await redis.lrange(EVENTS_KEY, 0, -1);
  return events.map((e) => JSON.parse(e));
}

export async function addEvent(event: AlertEvent): Promise<void> {
  await redis.rpush(EVENTS_KEY, JSON.stringify(event));
  const length = await redis.llen(EVENTS_KEY);
  if (length > MAX_EVENTS) {
    await redis.ltrim(EVENTS_KEY, -MAX_EVENTS, -1);
  }
}

export async function checkAndUpdate(): Promise<void> {
  const isAlertNow = await fetchAlertStatus();
  if (isAlertNow === null) return;

  const currentState = await getState();
  const now = new Date().toISOString();

  if (!currentState) {
    // Первый запуск
    await setState({
      alert: isAlertNow,
      lastChange: now,
      checkedAt: now,
    });
    await addEvent({
      type: isAlertNow ? 'alert_start' : 'alert_end',
      time: now,
    });
    return;
  }

  if (currentState.alert !== isAlertNow) {
    // Статус изменился
    const newEvent: AlertEvent = {
      type: isAlertNow ? 'alert_start' : 'alert_end',
      time: now,
    };
    await addEvent(newEvent);
    await setState({
      alert: isAlertNow,
      lastChange: now,
      checkedAt: now,
    });
  } else {
    // Обновляем только время проверки
    await setState({
      ...currentState,
      checkedAt: now,
    });
  }
}

export function calculateStats(events: AlertEvent[], currentState: AlertState | null) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let todayCount = 0;
  let todayTime = 0;
  let monthCount = 0;
  let monthTime = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.type !== 'alert_start') continue;

    const startTime = new Date(event.time);
    let endTime: Date | null = null;

    // Ищем соответствующий отбой
    for (let j = i + 1; j < events.length; j++) {
      if (events[j].type === 'alert_end' && new Date(events[j].time) > startTime) {
        endTime = new Date(events[j].time);
        break;
      }
    }

    // Если нет отбоя и это последняя тревога, используем текущее время
    if (!endTime && i === events.length - 1 && currentState?.alert) {
      endTime = now;
    }

    if (!endTime) continue;

    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    if (startTime >= today) {
      todayCount++;
      todayTime += duration;
    }

    if (startTime >= monthAgo) {
      monthCount++;
      monthTime += duration;
    }
  }

  // Если сейчас тревога и она не была учтена
  if (currentState?.alert) {
    const lastChange = new Date(currentState.lastChange);
    const currentDuration = (now.getTime() - lastChange.getTime()) / 1000;
    
    // Проверяем, учтена ли уже текущая тревога
    const lastEvent = events[events.length - 1];
    if (!lastEvent || lastEvent.type !== 'alert_start') {
      if (lastChange >= today) {
        todayCount++;
        todayTime += currentDuration;
      }
      if (lastChange >= monthAgo) {
        monthCount++;
        monthTime += currentDuration;
      }
    }
  }

  return {
    today: {
      count: todayCount,
      alarmTime: Math.floor(todayTime),
      avg: todayCount > 0 ? Math.floor(todayTime / todayCount) : 0,
    },
    month: {
      count: monthCount,
      alarmTime: Math.floor(monthTime),
      avg: monthCount > 0 ? Math.floor(monthTime / monthCount) : 0,
    },
  };
}