import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stateStr = await redis.get('alert:state');
    const state = stateStr 
      ? JSON.parse(stateStr) 
      : { alert: false, lastChange: new Date().toISOString(), checkedAt: new Date().toISOString() };
      
    const events = await redis.lrange('alert:events', 0, -1);
    const parsedEvents = events.map((e: string) => JSON.parse(e)).reverse().slice(0, 15);
    
    const currentDuration = Math.floor((Date.now() - new Date(state.lastChange).getTime()) / 1000);
    
    return NextResponse.json({
      success: true,
      state,
      currentDuration,
      events: parsedEvents,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
