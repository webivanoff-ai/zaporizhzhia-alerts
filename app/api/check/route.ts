import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Обращаемся к API тревог
    const response = await fetch('https://ubilling.net.ua/aerialalerts/', {
      headers: { 'User-Agent': 'AlertTracker/1.0' },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'API unavailable' }, { status: 502 });
    }
    
    const data = await response.json();
    const isAlertNow = Boolean(data['Запорізька область']?.alertnow);
    
    // Импортируем Redis внутри функции, чтобы не падал build
    const { redis } = await import('@/lib/redis');
    
    const stateStr = await redis.get('alert:state');
    const currentState = stateStr ? JSON.parse(stateStr) : null;
    const now = new Date().toISOString();
    
    // Если статус изменился — записываем событие
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
    } else {
      // Обновляем только время проверки
      await redis.set('alert:state', JSON.stringify({
        ...currentState,
        checkedAt: now
      }));
    }
    
    return NextResponse.json({ 
      success: true, 
      alert: isAlertNow,
      time: now 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
