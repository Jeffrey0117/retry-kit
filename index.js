// ============================================================================
// retry-kit — 指數退避重試 + 可重試錯誤判斷（fetch / 任何 async）
// ----------------------------------------------------------------------------
// 零依賴、瀏覽器/Node 皆可（用全域 fetch）。從 meetube 抽出並去耦（拿掉 logger）。
//
//   const { withRetry, retryFetch, isRetryableError } = require('retry-kit');
//   await withRetry(() => doThing(), { maxRetries: 3, onRetry: (a,e,d)=>{} });
//   const res = await retryFetch('/api/x');   // 5xx/429/408/網路錯誤自動退避重試
// ============================================================================

const DEFAULT_OPTIONS = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: () => true,
  onRetry: null,
};

// 指數退避 + ±25% jitter，夾在 maxDelay 內。
function calculateDelay(attempt, baseDelay, maxDelay) {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(Math.min(exponentialDelay + jitter, maxDelay));
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// 網路類錯誤（fetch 失敗 / timeout / abort）→ 可重試。
function isNetworkError(error) {
  if (!error) return false;
  if (error.name === 'TypeError' && error.message === 'Failed to fetch') return true;
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return true;
  if (error.message && /network/i.test(error.message)) return true;
  return false;
}

// Response 或 Error → 是否可重試（5xx / 429 / 408 / 網路錯誤）。
function isRetryableError(errorOrResponse) {
  if (errorOrResponse instanceof Error) return isNetworkError(errorOrResponse);
  if (errorOrResponse && errorOrResponse.status) {
    const s = errorOrResponse.status;
    if (s >= 500 && s < 600) return true;
    if (s === 429 || s === 408) return true;
  }
  return false;
}

// 跑一個 async fn，失敗就退避重試。onRetry(attempt, error, delayMs) 是唯一的觀測 hook。
async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError;
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!(attempt < config.maxRetries && config.shouldRetry(error))) throw error;
      const delay = calculateDelay(attempt, config.baseDelay, config.maxDelay);
      if (config.onRetry) config.onRetry(attempt + 1, error, delay);
      await sleep(delay);
    }
  }
  throw lastError;
}

// 產一個「會自動重試的 fetch」。5xx/429/408 會被當成可重試錯誤丟出再重試。
function createRetryFetch(defaultOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...defaultOptions };
  return function retryFetch(url, fetchOptions = {}, retryOptions = {}) {
    const options = { ...config, ...retryOptions };
    return withRetry(async () => {
      const response = await fetch(url, fetchOptions);
      if (!response.ok && isRetryableError(response)) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }
      return response;
    }, {
      ...options,
      shouldRetry: (error) => isRetryableError(error) || (options.shouldRetry ? options.shouldRetry(error) : false),
    });
  };
}

const retryFetch = createRetryFetch({ maxRetries: 3, baseDelay: 1000, maxDelay: 10000, shouldRetry: isRetryableError });

module.exports = { withRetry, isRetryableError, isNetworkError, createRetryFetch, retryFetch, calculateDelay };
