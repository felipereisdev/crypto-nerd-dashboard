const CACHE_NAME = 'cryptonerd-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline',
  '/offline/page'
];

// Instalação do service worker e cacheamento de recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptação de requisições e resposta do cache quando possível
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && 
       event.request.headers.get('accept').includes('text/html'))) {
    
    // Estratégia 'network-first' para navegação
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline');
        })
    );
  } else if (event.request.url.startsWith(self.location.origin)) {
    // Para requisições à API, sempre busque do servidor primeiro
    if (event.request.url.includes('/api/')) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            return response;
          })
          .catch(() => {
            // Tenta do cache se estiver offline
            return caches.match(event.request);
          })
      );
    } else {
      // Para recursos estáticos, use o cache-first
      event.respondWith(
        caches.match(event.request)
          .then((response) => {
            // Cache hit - retornar resposta
            if (response) {
              return response;
            }

            // Clone da requisição
            const fetchRequest = event.request.clone();

            return fetch(fetchRequest).then(
              (response) => {
                // Verificar se recebemos uma resposta válida
                if (!response || response.status !== 200 || response.type !== 'basic') {
                  return response;
                }

                // Clone da resposta
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });

                return response;
              }
            ).catch(() => {
              // Se for uma imagem, retorna uma imagem padrão
              if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
                return caches.match('/icons/icon-192x192.png');
              }
            });
          })
      );
    }
  }
});

// Atualização do service worker e remoção de caches antigos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Controle as páginas imediatamente após a ativação
      return self.clients.claim();
    })
  );
});

// Evento de sincronização em segundo plano (quando o dispositivo volta a ficar online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

// Função para sincronizar dados quando voltar online
async function syncFavorites() {
  // Aqui você pode implementar a lógica para sincronizar dados que estavam
  // em fila para serem enviados enquanto o dispositivo estava offline
  console.log('Sincronizando dados em segundo plano...');
  
  // Se houver clientes abertos, atualiza-os
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage({ action: 'refresh' }));
} 