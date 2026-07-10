const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const redis = {
  async get(key: string): Promise<string | null> {
    if (!REDIS_URL || !REDIS_TOKEN) return null;
    try {
      const res = await fetch(`${REDIS_URL}/get/${key}`, {
        headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
      });
      const data = await res.json();
      return data.result || null;
    } catch { 
      return null; 
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (!REDIS_URL || !REDIS_TOKEN) return;
    await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
    });
  },
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!REDIS_URL || !REDIS_TOKEN) return [];
    const res = await fetch(`${REDIS_URL}/lrange/${key}/${start}/${stop}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
    });
    const data = await res.json();
    return data.result || [];
  },
  async rpush(key: string, value: string): Promise<void> {
    if (!REDIS_URL || !REDIS_TOKEN) return;
    await fetch(`${REDIS_URL}/rpush/${key}/${encodeURIComponent(value)}`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` },
    });
  },
};
