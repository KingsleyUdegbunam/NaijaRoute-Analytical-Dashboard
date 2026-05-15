<script setup lang="ts">
import { computed } from 'vue';
import { MapPin, Navigation } from 'lucide-vue-next';
import { useDashboardStore } from '../stores/dashboard';

const store = useDashboardStore();

const hubs = [
  { city: 'Lagos', label: 'Lagos', x: 20, y: 78 },
  { city: 'Abuja', label: 'Abuja', x: 52, y: 50 },
  { city: 'Kano', label: 'Kano', x: 48, y: 20 },
  { city: 'Maiduguri', label: 'Maiduguri', x: 78, y: 23 },
  { city: 'Onitsha', label: 'Onitsha', x: 48, y: 78 },
  { city: 'Port Harcourt', label: 'Port Harcourt', x: 56, y: 89 }
];

const plottedShipments = computed(() => store.filteredShipments.slice(0, 18));
const statusClass = (status: string) => status.replace('_', '-');
</script>

<template>
  <section class="panel map-panel">
    <header class="panel-header">
      <div>
        <h2>Nigeria Live Route Map</h2>
        <p>{{ plottedShipments.length }} moving shipments plotted</p>
      </div>
      <Navigation :size="20" />
    </header>

    <div class="nigeria-map">
      <svg viewBox="0 0 100 100" role="img" aria-label="Stylized Nigeria logistics route map">
        <path class="country-shape" d="M24 18 L45 10 L70 16 L84 31 L81 51 L90 68 L72 87 L47 92 L25 82 L12 62 L17 38 Z" />
        <path class="route-line" d="M20 78 C34 66, 42 58, 52 50 C53 38, 50 28, 48 20" />
        <path class="route-line" d="M52 50 C64 42, 72 33, 78 23" />
        <path class="route-line" d="M20 78 C34 79, 43 79, 48 78 C52 82, 54 86, 56 89" />
        <path class="route-line" d="M52 50 C50 61, 50 70, 48 78" />
      </svg>

      <div v-for="hub in hubs" :key="hub.city" class="hub-dot" :style="{ left: `${hub.x}%`, top: `${hub.y}%` }">
        <MapPin :size="15" />
        <span>{{ hub.label }}</span>
      </div>

      <div
        v-for="shipment in plottedShipments"
        :key="shipment.shipmentId"
        class="shipment-dot"
        :class="statusClass(shipment.status)"
        :style="{ left: `${18 + ((shipment.longitude - 2) / 13) * 68}%`, top: `${88 - ((shipment.latitude - 4) / 10) * 74}%` }"
        :title="`${shipment.shipmentId} - ${shipment.origin} to ${shipment.destination}`"
      />
    </div>
  </section>
</template>
