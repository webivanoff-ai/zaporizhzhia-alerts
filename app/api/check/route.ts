import { NextResponse } from 'next/server';
import { checkAndUpdate } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Проверка секретного токена (опционально)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await checkAndUpdate();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}