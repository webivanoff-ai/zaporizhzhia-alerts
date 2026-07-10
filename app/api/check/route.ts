import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Простой и надёжный источник
    const response = await fetch('https://ubilling.net.ua/aerialalerts/', {
      headers: { 'User-Agent': 'AlertTracker/1.0' },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'API failed', 
        status: response.status 
      }, { status: 502 });
    }
    
    const data = await response.json();
    
    // Логируем что получили
    console.log('API Response:', JSON.stringify(data).substring(0, 500));
    
    // Проверяем Запорожскую область
    const regionData = data['Запорізька область'];
    
    if (!regionData) {
      return NextResponse.json({ 
        error: 'Region not found',
        availableRegions: Object.keys(data).slice(0, 5)
      }, { status: 404 });
    }
    
    // Простое преобразование в boolean
    const isAlertNow = regionData.alertnow === true || regionData.alertnow === 'true';
    
    const { redis } = await import('@/lib/redis');
    const stateStr = await redis.get('alert:state');
    const currentState = stateStr ? JSON.parse(stateStr) : null;
    const now = new Date().toISOString();
    
    // Записываем изменение
    if (!currentState || currentState.alert !== isAlertNow) {
      await redis.rpush('alert:events', JSON.stringify({
        type: isAlertNow ? 'alert_start' : 'alert_end',
        time: now,
        apiValue: regionData.alertnow,
        changed: regionData.changed
      }));
      
      await redis.set('alert:state', JSON.stringify({
        alert: isAlertNow,
        lastChange: now,
        checkedAt: now,
        apiChanged: regionData.changed
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
      alertnow: regionData.alertnow,
      changed: regionData.changed,
      source: 'ubilling.net.ua',
      time: now 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Server error', 
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    }, { status: 500 });
  }
}
