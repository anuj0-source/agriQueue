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
    // Use the url and type fields sent by the backend for deep-linking
    const targetUrl = data.url || '/';
    const notifType = data.type || 'success';

    const options = {
        body: data.body || '',
        icon: data.icon || '/logo.png',
        badge: data.badge || '/logo.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: data.tag || ('agriqueue-push-' + Date.now()),
        renotify: true,
        requireInteraction: true,
        data: {
            url: targetUrl,
            type: notifType
        }
    };

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(title, options),
            // Forward to all open app windows so the in-app panel updates immediately
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                for (const client of clientList) {
                    client.postMessage({
                        type: 'PUSH_NOTIFICATION_RECEIVED',
                        notification: {
                            title: title,
                            message: options.body,
                            // Pass real type from backend (e.g. 'payment', 'success', 'alert')
                            type: notifType,
                            url: targetUrl
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
            // Try to focus an existing window first
            for (const client of clientList) {
                if (client.url && new URL(client.url).pathname !== undefined) {
                    if ('navigate' in client) {
                        client.navigate(targetUrl);
                        return client.focus();
                    }
                    if ('focus' in client) {
                        return client.focus();
                    }
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

