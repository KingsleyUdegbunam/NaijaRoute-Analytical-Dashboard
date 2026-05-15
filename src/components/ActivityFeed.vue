<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle, CircleAlert, Info, PackageCheck } from 'lucide-vue-next';
import { useDashboardStore } from '../stores/dashboard';
import type { Severity } from '../types/telemetry';

const store = useDashboardStore();
const visibleEvents = computed(() => store.filteredEvents.slice(0, 90));

const severityIcon: Record<Severity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: CircleAlert
};

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(timestamp);
</script>

<template>
  <section class="panel feed-panel">
    <header class="panel-header">
      <div>
        <h2>Live Shipment Events</h2>
        <p>{{ store.filteredEvents.length }} matching updates</p>
      </div>
      <select :value="store.severityFilter" @change="store.setSeverity(($event.target as HTMLSelectElement).value as any)">
        <option value="all">All severity</option>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="critical">Critical</option>
      </select>
    </header>

    <div v-if="visibleEvents.length" class="feed-list">
      <article v-for="event in visibleEvents" :key="event.id" class="feed-row" :class="event.severity">
        <div class="feed-icon">
          <component :is="severityIcon[event.severity]" :size="17" />
        </div>
        <div class="feed-copy">
          <strong>{{ event.message }}</strong>
          <span>{{ event.shipmentId }} · {{ event.route }} · {{ event.delayMinutes }}m delay</span>
        </div>
        <time>{{ formatTime(event.timestamp) }}</time>
      </article>
    </div>

    <div v-else class="empty-state">
      <PackageCheck :size="24" />
      No shipment events match the current filters.
    </div>
  </section>
</template>
