self.addEventListener('install', function (event) {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = {
                title: 'AgriQueue Update',
                body: event.data.text()
            };
        }
    } else {
        data = {
            title: 'AgriQueue Notification',
            body: 'You have a new update from AgriQueue.'
        };
    }

    const title = data.title || 'AgriQueue Notification';
    const options = {
        body: data.body || '',
        icon: data.icon || '/logo.png',
        badge: data.badge || '/logo.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: data.tag || ('agriqueue-push-' + Date.now()),
        renotify: true,
        requireInteraction: true,
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(title, options),
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                for (const client of clientList) {
                    client.postMessage({
                        type: 'PUSH_NOTIFICATION_RECEIVED',
                        notification: {
                            title: title,
                            message: options.body,
                            type: 'success'
                        }
                    });
                }
            })
        ])
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
