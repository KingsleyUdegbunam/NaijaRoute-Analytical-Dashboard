<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import {
  Bell,
  Clock3,
  PackageSearch,
  Route,
  Truck
} from 'lucide-vue-next';
import ActivityFeed from './components/ActivityFeed.vue';
import ChartPanel from './components/ChartPanel.vue';
import ControlBar from './components/ControlBar.vue';
import HubBacklog from './components/HubBacklog.vue';
import MetricCard from './components/MetricCard.vue';
import NigeriaRouteMap from './components/NigeriaRouteMap.vue';
import RegionalDelayHeatmap from './components/RegionalDelayHeatmap.vue';
import ShipmentTable from './components/ShipmentTable.vue';
import StatusRail from './components/StatusRail.vue';
import { useStream } from './composables/useStream';
import { datasets, useDashboardStore } from './stores/dashboard';

const store = useDashboardStore();
useStream();

const handleDashboardShortcut = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  const isTyping = target?.matches('input, textarea, select, [contenteditable="true"]');
  if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return;

  if (event.key.toLowerCase() === 'p') {
    store.setPaused(!store.paused);
  }

  if (event.key.toLowerCase() === 't') {
    store.setTheme(store.theme === 'dark' ? 'light' : 'dark');
  }
};

onMounted(() => {
  store.setTheme(store.theme);
  window.addEventListener('keydown', handleDashboardShortcut);
});

onBeforeUnmount(() => window.removeEventListener('keydown', handleDashboardShortcut));

const selected = (keys: string[]) => datasets.filter((dataset) => keys.includes(dataset.key) && store.visibleDatasets[dataset.key]);
const deliveryDatasets = computed(() => selected(['activeShipments', 'deliveredToday', 'delayedShipments']));
const serviceDatasets = computed(() => selected(['onTimeRate', 'routeEfficiency']));
const delayDatasets = computed(() => selected(['avgDelayMinutes', 'exceptionCount']));
const previous = computed(() => store.previous);

const networkScore = computed(() => {
  const latest = store.latest;
  if (!latest) return 0;
  return Math.max(0, Math.round(latest.onTimeRate * 0.7 + latest.routeEfficiency * 0.3 - latest.exceptionCount * 0.05));
});

const formatNaira = (value: number | undefined) => {
  if (value === undefined) return '...';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
};
</script>

<template>
  <div class="product-frame">
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Nigeria logistics control tower</p>
          <h1>Live shipment operations</h1>
        </div>

        <div class="topbar-actions">
          <StatusRail />
          <button class="notify-button" type="button" title="Critical shipment alerts">
            <Bell :size="18" />
            <span>{{ store.criticalEvents }}</span>
          </button>
        </div>
      </header>

      <ControlBar />

      <section class="summary-card" aria-label="Network summary">
        <div class="summary-copy">
          <span>Network score</span>
          <strong>{{ networkScore }}</strong>
          <p>Live score from on-time rate, route efficiency, exceptions, and delay pressure across Nigerian corridors.</p>
        </div>
        <div class="summary-stat">
          <span>Revenue at risk</span>
          <strong>{{ formatNaira(store.latest?.revenueAtRisk) }}</strong>
        </div>
        <div class="summary-stat">
          <span>Current hub</span>
          <strong>{{ store.latest?.hub ?? 'Loading...' }}</strong>
        </div>
      </section>

      <div class="section-heading">
        <div>
          <span>Today</span>
          <h2>Operational KPIs</h2>
        </div>
      </div>

      <section class="metric-grid">
        <MetricCard label="Active shipments" :value="store.latest?.activeShipments" :previous="previous?.activeShipments" accent="#5b5ff0" :icon="PackageSearch" />
        <MetricCard label="Delayed shipments" :value="store.latest?.delayedShipments" :previous="previous?.delayedShipments" accent="#f59e0b" :icon="Clock3" />
        <MetricCard label="On-time rate" :value="store.latest?.onTimeRate" unit="%" :previous="previous?.onTimeRate" accent="#22c55e" :icon="Route" />
        <MetricCard label="Active vehicles" :value="store.latest?.activeVehicles" :previous="previous?.activeVehicles" accent="#0ea5e9" :icon="Truck" />
      </section>

      <div class="section-heading">
        <div>
          <span>Live network</span>
          <h2>Route performance</h2>
        </div>
      </div>

      <section class="dashboard-grid">
        <ChartPanel
          class="delivery-chart"
          title="Shipment Flow"
          subtitle="Active, delivered, and delayed shipments over the selected window"
          type="area"
          :points="store.filteredPoints"
          :datasets="deliveryDatasets"
        />
        <NigeriaRouteMap />
        <RegionalDelayHeatmap />
      </section>

      <div class="section-heading">
        <div>
          <span>Operations</span>
          <h2>Exceptions, workload, and priority shipments</h2>
        </div>
      </div>

      <section class="operations-grid">
        <div class="analysis-column">
          <ChartPanel title="Service Level" subtitle="On-time rate and route efficiency" type="line" :points="store.filteredPoints" :datasets="serviceDatasets" />
          <ChartPanel title="Delay & Exceptions" subtitle="Average delay minutes and exception volume" type="bar" :points="store.filteredPoints" :datasets="delayDatasets" dense />
          <HubBacklog />
        </div>

        <div class="side-column">
          <ShipmentTable />
          <ActivityFeed />
        </div>
      </section>
    </main>
  </div>
</template>
