const urls = process.argv.slice(2);
const timeoutMs = 60_000;
const intervalMs = 500;

if (urls.length === 0) {
  throw new Error('Provide at least one URL to wait for.');
}

async function waitForUrl(url: string): Promise<void> {
  const startedAt = Date.now();
  let lastError = 'No response received.';

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) return;
      lastError = `Received HTTP ${response.status}.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${url}. Last error: ${lastError}`);
}

await Promise.all(urls.map(waitForUrl));
console.log(`Ready: ${urls.join(', ')}`);
