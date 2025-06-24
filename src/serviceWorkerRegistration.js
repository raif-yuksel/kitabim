// src/serviceWorkerRegistration.js

// Bu kod, CRA’nın PWA desteği için Workbox tabanlı service worker’ı register eder.
// Dosyayı mutlaka projenizin src/ altında oluşturun.

const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
      // IPv6 localhost
      window.location.hostname === '[::1]' ||
      // 127.0.0.0/8 IPv4 localhost
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/
      )
  );
  
  export function register(config) {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
      if (publicUrl.origin !== window.location.origin) {
        // Farklı origin’ler için SW çalışmaz
        return;
      }
  
      window.addEventListener('load', () => {
        const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
  
        if (isLocalhost) {
          // localhost: SW’ın varlığını kontrol et
          checkValidServiceWorker(swUrl, config);
          navigator.serviceWorker.ready.then(() => {
            console.log('This web app is being served cache-first by a service worker.');
          });
        } else {
          // Prod’da doğrudan register et
          registerValidSW(swUrl, config);
        }
      });
    }
  }
  
  function registerValidSW(swUrl, config) {
    navigator.serviceWorker
      .register(swUrl)
      .then(registration => {
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Yeni içerik cache’lenmiş
                if (config && config.onUpdate) config.onUpdate(registration);
              } else {
                // İlk defa içerik cache’lendi
                if (config && config.onSuccess) config.onSuccess(registration);
              }
            }
          };
        };
      })
      .catch(error => {
        console.error('Error during service worker registration:', error);
      });
  }
  
  function checkValidServiceWorker(swUrl, config) {
    fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
      .then(response => {
        const contentType = response.headers.get('content-type');
        if (
          response.status === 404 ||
          (contentType && contentType.indexOf('javascript') === -1)
        ) {
          // SW yoksa mevcut SW’ı unregister edip sayfayı reload’et
          navigator.serviceWorker.ready.then(registration => {
            registration.unregister().then(() => {
              window.location.reload();
            });
          });
        } else {
          // SW varsa normal bir şekilde register et
          registerValidSW(swUrl, config);
        }
      })
      .catch(() => {
        console.log('No internet connection found. App is running in offline mode.');
      });
  }
  
  export function unregister() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.unregister();
      });
    }
  }
  