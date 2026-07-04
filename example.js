const { withRetry, isRetryableError } = require('./index');
(async () => {
  let n = 0;
  const r = await withRetry(async () => { n++; if (n < 3) throw new Error('boom ' + n); return 'ok@' + n; },
    { maxRetries: 5, baseDelay: 5, onRetry: (a, e, d) => console.log(`  retry ${a} in ${d}ms: ${e.message}`) });
  console.log('result:', r);
  console.log('retryable 503:', isRetryableError({ status: 503 }), '| 404:', isRetryableError({ status: 404 }), '| 429:', isRetryableError({ status: 429 }));
})();
