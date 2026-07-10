import { NextResponse } from 'next/server';
import { getState, getEvents, calculateStats } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [state, events] = await Promise.all([getState(), getEvents()]);
    
    const defaultState = {
      alert: false,
      lastChange: new Date().toISOString(),
      checkedAt: new Date().toISOString(),
    };

    const currentState = state ?? defaultState;
    const stats = calculateStats(events, state);
    
    const currentDuration = Math.floor(
      (Date.now() - new Date(currentState.lastChange).getTime()) / 1000
    );

    return NextResponse.json({
      success: true,
      state: currentState,
      currentDuration,
      stats,
      events: events.slice(-15).reverse(),
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}