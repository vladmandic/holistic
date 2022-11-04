export async function log(...msg): Promise<void> {
  const dt = new Date();
  const ts = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}.${dt.getMilliseconds().toString().padStart(3, '0')}`;
  if (msg) console.log(ts, ...msg); // eslint-disable-line no-console
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(() => resolve(), ms); });
}
