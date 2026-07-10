import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Тривоги — Запоріжжя',
  description: 'Статистика повітряних тривог у реальному часі',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}