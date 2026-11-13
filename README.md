<p align="center">
  <img src="logo.svg" width="96" height="96" alt="retry-kit logo">
</p>

# retry-kit 🔁

**指數退避重試 + 可重試錯誤判斷。** fetch 或任何 async 操作，失敗自動退避重試（±25% jitter）。
零依賴、瀏覽器/Node 皆可（用全域 fetch）。從 meetube 抽出並去耦。

## 安裝
```bash
npm i github:Jeffrey0117/retry-kit   # 或直接複製 index.js
```

## 用法
```js
const { withRetry, retryFetch, isRetryableError, createRetryFetch } = require('retry-kit');

// 包任何 async
await withRetry(() => doThing(), {
  maxRetries: 3, baseDelay: 1000, maxDelay: 10000,
  shouldRetry: (err) => isRetryableError(err),
  onRetry: (attempt, err, delayMs) => console.warn(`retry ${attempt} in ${delayMs}ms`),
});

// 會自動重試的 fetch（5xx/429/408/網路錯誤）
const res = await retryFetch('/api/x', { method: 'POST', body });

// 自己配一個
const myFetch = createRetryFetch({ maxRetries: 5, baseDelay: 500 });
```

## API
| 方法 | 說明 |
|---|---|
| `withRetry(fn, opts)` | 跑 `fn`，失敗依 `shouldRetry` 退避重試；全失敗丟最後的 error。 |
| `retryFetch(url, fetchOpts?, retryOpts?)` | 預配好的自動重試 fetch。 |
| `createRetryFetch(defaults)` | 產一個自訂預設的 retryFetch。 |
| `isRetryableError(errOrResponse)` | 5xx / 429 / 408 / 網路錯誤 → true。 |
| `isNetworkError(err)` | fetch 失敗 / timeout / abort → true。 |

`opts`: `maxRetries`(3) / `baseDelay`(1000ms) / `maxDelay`(10000ms) / `shouldRetry(err)` / `onRetry(attempt,err,delayMs)`。

## License
MIT © Jeffrey0117
