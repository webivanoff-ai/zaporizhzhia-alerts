'use client';

import { useEffect, useState } from 'react';

interface AlertState {
  alert: boolean;
  lastChange: string;
  checkedAt: string;
}

interface AlertEvent {
  type: 'alert_start' | 'alert_end';
  time: string;
}

interface Stats {
  today: { count: number; alarmTime: number; avg: number };
  month: { count: number; alarmTime: number; avg: number };
}

interface Data {
  state: AlertState;
  currentDuration: number;
  stats: Stats;
  events: AlertEvent[];
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 хв';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours} год ${minutes} хв`;
  }
  if (minutes > 0) {
    return `${minutes} хв ${secs} сек`;
  }
  return `${secs} сек`;
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/status');
        const json = await res.json();
        if (json.success) {
          setData(json);
          setCurrentDuration(json.currentDuration);
          setApiStatus('ok');
        } else {
          setApiStatus('error');
        }
      } catch {
        setApiStatus('error');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Живой таймер
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      const lastChange = new Date(data.state.lastChange).getTime();
      setCurrentDuration(Math.floor((Date.now() - lastChange) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-neutral-500">Завантаження...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* API Status */}
        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg mb-4 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              apiStatus === 'ok'
                ? 'bg-emerald-500'
                : apiStatus === 'error'
                ? 'bg-red-500'
                : 'bg-neutral-500'
            }`}
          />
          <span className="text-neutral-400">
            {apiStatus === 'ok'
              ? 'API підключено'
              : apiStatus === 'error'
              ? 'API недоступний'
              : 'Перевірка...'}
          </span>
        </div>

        {/* Status Card */}
        <div
          className={`rounded-2xl p-8 mb-8 border transition-all ${
            data.state.alert
              ? 'bg-gradient-to-br from-neutral-900 to-red-950/30 border-red-500/50'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-3 h-3 rounded-full ${
                data.state.alert
                  ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse'
                  : 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
              }`}
            />
            <span className="text-lg font-medium tracking-wide">
              {data.state.alert ? 'Тривога' : 'Відбій'}
            </span>
          </div>
          <div className="text-5xl font-bold tracking-tight text-white tabular-nums">
            {formatDuration(currentDuration)}
          </div>
          <div className="text-xs text-neutral-500 mt-2">
            з {new Date(data.state.lastChange).toLocaleTimeString('uk-UA')}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-6 mb-8">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4">
              Сьогодні
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={data.stats.today.count.toString()} label="тривог" />
              <StatCard value={formatDuration(data.stats.today.alarmTime)} label="під тривогою" />
              <StatCard value={formatDuration(data.stats.today.avg)} label="середня" />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4">
              За місяць
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={data.stats.month.count.toString()} label="тривог" />
              <StatCard value={formatDuration(data.stats.month.alarmTime)} label="під тривогою" />
              <StatCard value={formatDuration(data.stats.month.avg)} label="середня" />
            </div>
          </section>
        </div>

        {/* Events */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4">
            Останні події
          </h2>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 max-h-96 overflow-y-auto">
            {data.events.length === 0 ? (
              <div className="py-6 text-center text-neutral-500">Очікування даних...</div>
            ) : (
              data.events.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <span className="text-sm tabular-nums text-neutral-500">
                    {new Date(event.time).toLocaleTimeString('uk-UA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      event.type === 'alert_start' ? 'text-red-500' : 'text-emerald-500'
                    }`}
                  >
                    {event.type === 'alert_start' ? 'Тривога' : 'Відбій'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-neutral-800 text-center text-xs text-neutral-600">
          <div className="mb-2">
            Оновлення:{' '}
            {new Date(data.state.checkedAt).toLocaleTimeString('uk-UA')}
          </div>
          <div className="flex justify-center gap-4">
            <a
              href="https://ubilling.net.ua/aerialalerts/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Джерело даних
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center">
      <div className="text-2xl font-bold text-white tabular-nums mb-1">{value}</div>
      <div className="text-xs text-neutral-500 lowercase">{label}</div>
    </div>
  );
}