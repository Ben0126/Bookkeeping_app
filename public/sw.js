// StudyBudget Pro Service Worker
import { precacheAndRoute } from 'workbox-precaching';

// Workbox 預快取清單注入點
precacheAndRoute(self.__WB_MANIFEST);

// 版本控制
const CACHE_NAME = 'studybudget-pro-v1.0.0';
const STATIC_CACHE_NAME = 'studybudget-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'studybudget-dynamic-v1.0.0';

// 需要預先快取的靜態資源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  // 將在安裝時動態添加其他資源
];

// 需要網路優先的資源模式
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/notifications/,
];

// 需要快取優先的資源模式
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:css|js)$/,
];

// Service Worker 安裝事件
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        // 強制新的 Service Worker 立即啟動
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Service Worker 啟動事件
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // 清理舊版本的快取
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 立即控制所有客戶端
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// 攔截網路請求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳過非 HTTP(S) 請求
  if (!request.url.startsWith('http')) {
    return;
  }

  // 跳過 Chrome 擴展請求
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    handleFetchRequest(request)
  );
});

// 處理請求的主要邏輯
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 1. 網路優先策略 (API 請求、動態內容)
    if (isNetworkFirst(request)) {
      return await networkFirstStrategy(request);
    }
    
    // 2. 快取優先策略 (靜態資源)
    if (isCacheFirst(request)) {
      return await cacheFirstStrategy(request);
    }
    
    // 3. 預設策略：網路優先，回退到快取
    return await networkFirstStrategy(request);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    
    // 離線時返回快取的版本或離線頁面
    return await handleOfflineResponse(request);
  }
}

// 判斷是否使用網路優先策略
function isNetworkFirst(request) {
  return NETWORK_FIRST_PATTERNS.some(pattern => 
    pattern.test(request.url)
  );
}

// 判斷是否使用快取優先策略
function isCacheFirst(request) {
  return CACHE_FIRST_PATTERNS.some(pattern => 
    pattern.test(request.url)
  );
}

// 網路優先策略
async function networkFirstStrategy(request) {
  try {
    // 先嘗試從網路獲取
    const networkResponse = await fetch(request);
    
    // 成功獲取後存入快取
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // 網路失敗，嘗試從快取獲取
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// 快取優先策略
async function cacheFirstStrategy(request) {
  // 先嘗試從快取獲取
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url);
    return cachedResponse;
  }
  
  // 快取中沒有，從網路獲取並快取
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    throw error;
  }
}

// 處理離線響應
async function handleOfflineResponse(request) {
  const url = new URL(request.url);
  
  // 1. 嘗試從快取獲取
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // 2. 如果是導航請求，返回主頁面
  if (request.mode === 'navigate') {
    const cachedIndex = await caches.match('/');
    if (cachedIndex) {
      return cachedIndex;
    }
  }
  
  // 3. 返回離線頁面或錯誤響應
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This content is not available offline'
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// 監聽消息事件
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        version: CACHE_NAME
      });
      break;
      
    case 'CACHE_URLS':
      // 手動快取特定 URL
      if (data && data.urls) {
        cacheUrls(data.urls);
      }
      break;
      
    case 'CLEAR_CACHE':
      // 清理快取
      clearAllCaches();
      break;
  }
});

// 手動快取 URL
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    await cache.addAll(urls);
    console.log('[SW] URLs cached successfully:', urls);
  } catch (error) {
    console.error('[SW] Failed to cache URLs:', error);
  }
}

// 清理所有快取
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('[SW] All caches cleared');
  } catch (error) {
    console.error('[SW] Failed to clear caches:', error);
  }
}

// 後台同步事件 (如果支援)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 執行後台同步
async function doBackgroundSync() {
  try {
    // 這裡可以實現離線時的數據同步邏輯
    console.log('[SW] Performing background sync...');
    
    // 例如：同步離線時創建的交易記錄
    // await syncOfflineTransactions();
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// 推送通知事件
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from StudyBudget Pro',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'studybudget-notification',
    data: {
      url: '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('StudyBudget Pro', options)
  );
});

// 通知點擊事件
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('[SW] Service Worker script loaded');
