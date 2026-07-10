'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/status');
        const json = await res.json();
        if (json.success) {
          setData(json);
        } else {
          setError('API error');
        }
      } catch (e: any) {
        setError(e.message || 'Fetch failed');
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      const last = new Date(data.state.lastChange).getTime();
      setDuration(Math.floor((Date.now() - last) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (error) {
    return <div className="min-h-screen bg-black text-red-500 p-10">Ошибка: {error}</div>;
  }

  if (!data) {
    return <div className="min-h-screen bg-black text-white p-10">Завантаження...</div>;
  }

  const formatTime = (s: number) => {
    if (s < 0) s = 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h} год ${m} хв`;
    if (m > 0) return `${m} хв ${sec} сек`;
    return `${sec} сек`;
  };

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  
  // Подсчет статистики за сегодня
  const todayEvents = data.events.filter((e: any) => e.time.startsWith(today));
  const todayCount = todayEvents.filter((e: any) => e.type === 'alert_start').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🇺🇦 Тривоги — Запоріжжя</h1>
      
      {/* Статус */}
      <div className={`rounded-2xl p-8 mb-6 border-2 ${data.state.alert ? 'border-red-500 bg-red-950/30' : 'border-green-500 bg-green-950/30'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${data.state.alert ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-xl font-medium">{data.state.alert ? '🚨 Тривога' : '✅ Відбій'}</span>
        </div>
        <div className="text-5xl font-bold tabular-nums">{formatTime(duration)}</div>
        <div className="text-sm text-neutral-400 mt-2">
          з {new Date(data.state.lastChange).toLocaleTimeString('uk-UA')}
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold">{todayCount}</div>
          <div className="text-xs text-neutral-400 mt-1">тривог сьогодні</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold">{data.events.length}</div>
          <div className="text-xs text-neutral-400 mt-1">всього подій</div>
        </div>
      </div>

      {/* События */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">Останні події</h2>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 max-h-96 overflow-y-auto">
        {data.events && data.events.length > 0 ? (
          data.events.map((event: any, i: number) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-neutral-800">
              <span className="text-sm tabular-nums text-neutral-500">
                {new Date(event.time).toLocaleString('uk-UA')}
              </span>
              <span className={`text-sm font-medium ${event.type === 'alert_start' ? 'text-red-500' : 'text-green-500'}`}>
                {event.type === 'alert_start' ? 'Тривога' : 'Відбій'}
              </span>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-neutral-500 text-sm">
            Очікування зміни статусу...<br />
            <span className="text-xs">Сайт записує події при зміні тривоги/відбою</span>
          </div>
        )}
      </div>

      <footer className="mt-8 pt-6 border-t border-neutral-800 text-center text-xs text-neutral-600">
        Оновлення: {new Date(data.state.checkedAt).toLocaleTimeString('uk-UA')}
      </footer>
    </div>
  );
}
