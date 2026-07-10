import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Новый надёжный источник: alerts.in.ua (офіційне джерело)
    const response = await fetch('https://api.alerts.in.ua/v1/alerts/current.json', {
      headers: { 'User-Agent': 'AlertTracker/1.0' },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'API unavailable', status: response.status }, { status: 502 });
    }
    
    const data = await response.json();
    
    // В Запорожской области id = 17 (стандартный id в alerts.in.ua)
    // Проверяем есть ли Запорожская область в активных тревогах
    const zaporizhzhiaId = 17;
    const activeAlerts = data.alerts || [];
    const isAlertNow = activeAlerts.some((alert: any) => alert.id === zaporizhzhiaId);
    
    const { redis } = await import('@/lib/redis');
    
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
    } else {
      await redis.set('alert:state', JSON.stringify({
        ...currentState,
        checkedAt: now
      }));
    }
    
    return NextResponse.json({ 
      success: true, 
      alert: isAlertNow,
      source: 'alerts.in.ua',
      time: now 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
}
