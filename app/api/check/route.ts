import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://ubilling.net.ua/aerialalerts/', {
      headers: { 'User-Agent': 'AlertTracker/1.0' },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'API failed', status: response.status }, { status: 502 });
    }
    
    const data = await response.json();
    
    // ИСПРАВЛЕНИЕ: Данные лежат внутри массива data.states
    const states = data.states || [];
    const regionData = states.find((s: any) => s.name === 'Запорізька область');
    
    if (!regionData) {
      return NextResponse.json({ 
        error: 'Region not found', 
        available: states.map((s: any) => s.name).slice(0, 5) 
      }, { status: 404 });
    }
    
    // Берем статус тревоги
    const isAlertNow = Boolean(regionData.alertnow);
    
    const { redis } = await import('@/lib/redis');
    const stateStr = await redis.get('alert:state');
    const currentState = stateStr ? JSON.parse(stateStr) : null;
    const now = new Date().toISOString();
    
    // Если статус изменился - записываем событие
    if (!currentState || currentState.alert !== isAlertNow) {
      await redis.rpush('alert:events', JSON.stringify({
        type: isAlertNow ? 'alert_start' : 'alert_end',
        time: now,
      }));
      
      await redis.set('alert:state', JSON.stringify({
        alert: isAlertNow,
        lastChange: now,
        checkedAt: now,
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
      changed: regionData.changed,
      time: now 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
}
