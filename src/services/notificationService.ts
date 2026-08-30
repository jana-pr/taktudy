import { Reminder } from '../types';

class NotificationService {
  private notifiedIds = new Set<string>();

  // Check if browser/phone supports Notification API
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  // Get current permission: 'default' | 'granted' | 'denied' | 'unsupported'
  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  // Request permission from user
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  // Trigger immediate notification (with sound/vibration)
  public async sendNotification(title: string, options?: NotificationOptions): Promise<boolean> {
    // Vibrate device if supported (phone vibration pattern: vibrate, pause, vibrate)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // Ignore vibration errors
      }
    }

    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Focus window on notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch {
      return false;
    }
  }

  // Test phone notification with user feedback
  public async sendTestNotification(): Promise<{ success: boolean; message: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: 'Tento prohlížeč nepodporuje systémové notifikace.',
      };
    }

    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        return {
          success: false,
          message: 'Povolení pro notifikace bylo odmítnuto nebo zrušeno v nastavení prohlížeče.',
        };
      }
    }

    const ok = await this.sendNotification('🔔 Tak tudy! — Test notifikace', {
      body: 'Notifikace pro váš telefon nebo prohlížeč fungují v pořádku! Budete včas upozorněni na rezervace a úkoly k trase.',
      tag: 'taktudy-test-notification',
    });

    if (ok) {
      return {
        success: true,
        message: 'Zkušební notifikace byla úspěšně odeslána na vaše zařízení.',
      };
    } else {
      return {
        success: false,
        message: 'Nepodařilo se zobrazit notifikaci.',
      };
    }
  }

  // Check pending reminders and trigger notification when remind_at has passed
  public checkReminders(reminders: Reminder[], onTrigger?: (reminder: Reminder) => void) {
    const now = new Date().getTime();

    for (const r of reminders) {
      if (r.is_completed) continue;
      if (this.notifiedIds.has(r.id)) continue;

      const dueTime = new Date(r.remind_at).getTime();
      // If due now or up to 2 hours overdue, trigger notification
      if (dueTime <= now && now - dueTime < 2 * 60 * 60 * 1000) {
        this.notifiedIds.add(r.id);

        const categoryPrefix: Record<string, string> = {
          restaurant: '🍽️ Rezervace stolu: ',
          tickets: '🎟️ Lístky a vstupenky: ',
          transport: '🚆 Jízdenky / Doprava: ',
          activity: '🗺️ Aktivita / Výlet: ',
          general: '⏰ Připomínka: ',
        };

        const prefix = categoryPrefix[r.category] || '⏰ Připomínka: ';
        const title = `${prefix}${r.title}`;
        const body = r.notes ? `${r.notes} (naplánováno na ${new Date(r.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : `Naplánováno na ${new Date(r.remind_at).toLocaleString('cs-CZ')}`;

        this.sendNotification(title, {
          body,
          tag: `reminder-${r.id}`,
        });

        if (onTrigger) {
          onTrigger(r);
        }
      }
    }
  }
}

export const notificationService = new NotificationService();
