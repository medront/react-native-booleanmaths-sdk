import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Button,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BooleanMaths } from '@booleanmaths/booleanmaths-rn-sdk';
import * as NotificationDemo from './NotificationDemo';
import type { IntentInfo } from './NotificationDemo';

const API_KEY = 'your-api-key';
const PIXEL_ID = 'your-pixel-id';
const NOTIFICATION_DELAY_SECONDS = 10;

type Screen =
  { name: 'home' } | { name: 'promo'; params: Record<string, string> };

/**
 * Minimal deep-link parser. `new URL()` does not handle custom schemes
 * reliably in React Native, and the example deliberately has no navigation
 * library.
 */
function parseDeepLink(url: string) {
  const [beforeQuery = '', query] = url.split('?');
  const withoutScheme = beforeQuery.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const segments = withoutScheme.split('/').filter(Boolean);
  const params: Record<string, string> = {};

  if (query) {
    for (const pair of query.split('&')) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
      }
    }
  }

  return { target: segments[0] ?? '', params };
}

//initialize SDK
BooleanMaths.initialize(API_KEY, PIXEL_ID);

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [intentInfo, setIntentInfo] = useState<IntentInfo | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const append = useCallback((line: string) => {
    setLog((previous) => [
      `${new Date().toISOString().slice(11, 19)}  ${line}`,
      ...previous,
    ]);
  }, []);

  /**
   * Everything that must happen when the app is opened by a notification or a
   * deep link: hand the intent to the SDK, then navigate.
   */
  const handleIncomingLink = useCallback(
    async (url: string, origin: string) => {
      // Attribution first — this is what produces the NotificationClick event.
      BooleanMaths.handleNotificationIntent();
      append(`${origin}: ${url}`);

      const info = await NotificationDemo.getCurrentIntentInfo();
      setIntentInfo(info);

      const { target, params } = parseDeepLink(url);
      if (target === 'promo') {
        setScreen({ name: 'promo', params });
      }
    },
    [append]
  );

  useEffect(() => {
    // BooleanMaths.initialize(API_KEY, PIXEL_ID);
    append(
      BooleanMaths.isSupported
        ? 'SDK initialized'
        : `SDK unavailable on ${Platform.OS} — calls are no-ops`
    );

    NotificationDemo.requestPermission().then((granted) => {
      if (!granted && NotificationDemo.isAvailable) {
        append('notification permission denied');
      }
    });

    // Cold start: the app was launched by tapping the notification. The
    // wrapper already forwarded this intent during initialize(), so the
    // NotificationClick event is attributed even though React Native mounts
    // long after the Activity was created.
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleIncomingLink(url, 'launched by link');
      }
    });

    // Warm start: notification tapped while the app was already running.
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingLink(url, 'deep link');
    });

    // Safety net for taps that do not carry a URL.
    const stateSubscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        BooleanMaths.handleNotificationIntent();
      }
    });

    return () => {
      linkSubscription.remove();
      stateSubscription.remove();
    };
  }, [append, handleIncomingLink]);

  if (screen.name === 'promo') {
    return (
      <PromoScreen
        params={screen.params}
        intentInfo={intentInfo}
        onBack={() => {
          BooleanMaths.trackEvent('promo_screen_dismissed', {
            campaignId: intentInfo?.extras.campaign_id ?? 'unknown',
          });
          setScreen({ name: 'home' });
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BooleanMaths SDK</Text>

      <Text style={BooleanMaths.isSupported ? styles.ok : styles.warn}>
        {BooleanMaths.isSupported
          ? `Native SDK active on ${Platform.OS}`
          : `No native SDK on ${Platform.OS} — every call is a safe no-op`}
      </Text>

      <View style={styles.buttons}>
        <Button
          title={`Schedule notification (${NOTIFICATION_DELAY_SECONDS}s)`}
          // The scheduler is Android-only example code, so there is nothing to
          // press on iOS or web.
          disabled={!NotificationDemo.isAvailable}
          onPress={async () => {
            try {
              const { notificationId, exact } =
                await NotificationDemo.scheduleNotification(
                  NOTIFICATION_DELAY_SECONDS
                );
              append(
                `notification #${notificationId} scheduled in ${NOTIFICATION_DELAY_SECONDS}s` +
                  (exact ? '' : ' (inexact alarm)')
              );
              append('background the app, then tap the notification');
            } catch (error) {
              append(`schedule failed: ${String(error)}`);
            }
          }}
        />

        <Button
          title="Track simple event"
          onPress={() => {
            BooleanMaths.trackEvent('button_tapped');
            append('trackEvent("button_tapped")');
          }}
        />

        <Button
          title="Track event with properties"
          onPress={() => {
            BooleanMaths.trackEvent('purchase', {
              orderId: 'ORD-1024',
              value: 2499,
              currency: 'INR',
              isFirstPurchase: true,
              items: [
                { sku: 'SKU-1', quantity: 2, price: 999.5 },
                { sku: 'SKU-2', quantity: 1, price: 500 },
              ],
            });
            append('trackEvent("purchase", { ... })');
          }}
        />

        <Button
          title="Bridge smoke test"
          onPress={() =>
            append(`getHelloMessage() -> ${BooleanMaths.getHelloMessage()}`)
          }
        />
      </View>

      <ScrollView style={styles.log}>
        {log.map((line, index) => (
          <Text key={`${index}-${line}`} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

function PromoScreen({
  params,
  intentInfo,
  onBack,
}: {
  params: Record<string, string>;
  intentInfo: IntentInfo | null;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🎉 Summer Sale</Text>
      <Text style={styles.ok}>
        Navigated here from the notification tap. A `NotificationClick` event
        has been queued with the campaign data below.
      </Text>

      <Text style={styles.sectionTitle}>Deep link query params</Text>
      {Object.entries(params).map(([key, value]) => (
        <Text key={key} style={styles.row}>
          {key}: {value}
        </Text>
      ))}

      <Text style={styles.sectionTitle}>What the SDK read from the intent</Text>
      <Text style={styles.row}>action: {intentInfo?.action ?? '—'}</Text>
      <Text style={styles.row}>data: {intentInfo?.data ?? '—'}</Text>
      {Object.entries(intentInfo?.extras ?? {}).map(([key, value]) => (
        <Text key={key} style={styles.row}>
          {key}: {String(value)}
        </Text>
      ))}

      <View style={styles.backButton}>
        <Button title="Back" onPress={onBack} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  ok: {
    color: '#1a7f37',
  },
  warn: {
    color: '#9a6700',
  },
  buttons: {
    gap: 8,
  },
  row: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  backButton: {
    marginTop: 20,
  },
  log: {
    flex: 1,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cccccc',
    paddingTop: 8,
  },
  logLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    paddingVertical: 2,
  },
});
