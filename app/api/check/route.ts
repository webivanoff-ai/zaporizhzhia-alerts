import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://vadimklimenko.com/map/statuses.json', {
      headers: { 'User-Agent': 'AlertTracker/1.0' },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'API unavailable', status: response.status }, { status: 502 });
    }
    
    const data = await response.json();
    
    // Ищем Запорожскую область по точному ключу
    const regionKey = 'Запорізька область';
    let isAlertNow = false;
    let alertDistricts: string[] = [];
    
    if (data[regionKey]) {
      // Проверяем статус всей области
      isAlertNow = Boolean(data[regionKey].enabled);
      
      // Если область не в тревоге, проверяем районы
      if (!isAlertNow && data[regionKey].districts) {
        const districts = data[regionKey].districts;
        alertDistricts = Object.keys(districts).filter(
          (district) => districts[district].enabled
        );
        // Если есть хотя бы один район с тревогой — считаем что тревога
        if (alertDistricts.length > 0) {
          isAlertNow = true;
        }
      }
    }
    
    const { redis } = await import('@/lib/redis');
    
    const stateStr = await redis.get('alert:state');
    const currentState = stateStr ? JSON.parse(stateStr) : null;
    const now = new Date().toISOString();
    
    if (!currentState || currentState.alert !== isAlertNow) {
      await redis.rpush('alert:events', JSON.stringify({
        type: isAlertNow ? 'alert_start' : 'alert_end',
        time: now,
        districts: alertDistricts.length > 0 ? alertDistricts : undefined
      }));
      await redis.set('alert:state', JSON.stringify({
        alert: isAlertNow,
        lastChange: now,
        checkedAt: now,
        districts: alertDistricts
      }));
    } else {
      await redis.set('alert:state', JSON.stringify({
        ...currentState,
        checkedAt: now,
        districts: alertDistricts
      }));
    }
    
    return NextResponse.json({ 
      success: true, 
      alert: isAlertNow,
      source: 'vadimklimenko.com',
      districts: alertDistricts,
      time: now 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
}
