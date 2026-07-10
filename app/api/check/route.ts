import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Надёжный источник: vadimklimenko.com (обновляется в реальном времени)
    const response = await fetch('https://vadimklimenko.com/map/statuses.json', {
      headers: { 'User-Agent': 'AlertTracker/1.0' },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'API unavailable', status: response.status }, { status: 502 });
    }
    
    const data = await response.json();
    
    // Ищем Запорожскую область в массиве регионов
    let isAlertNow = false;
    const regions = Array.isArray(data) ? data : Object.values(data);
    
    for (const region of regions) {
      const name = String(region.name || '').toLowerCase();
      if (name.includes('запоріз') || name.includes('zaporizh')) {
        isAlertNow = Boolean(region.status);
        break;
      }
    }
    
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
      source: 'vadimklimenko.com',
      time: now 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
}
