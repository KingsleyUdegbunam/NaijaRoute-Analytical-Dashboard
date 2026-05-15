<script setup lang="ts">
import { computed } from 'vue';
import { PackageSearch } from 'lucide-vue-next';
import { useDashboardStore } from '../stores/dashboard';

const store = useDashboardStore();
const riskyShipments = computed(() =>
  store.filteredShipments
    .slice()
    .sort((a, b) => b.delayMinutes - a.delayMinutes)
    .slice(0, 8)
);

const formatStatus = (status: string) =>
  status
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
</script>

<template>
  <section class="panel shipment-panel">
    <header class="panel-header">
      <div>
        <h2>Priority Shipments</h2>
        <p>Highest delay risk across Nigeria</p>
      </div>
      <PackageSearch :size="20" />
    </header>

    <div v-if="riskyShipments.length" class="shipment-table">
      <div class="shipment-head">
        <span>Shipment</span>
        <span>Route</span>
        <span>Status</span>
        <span>ETA</span>
      </div>
      <article v-for="shipment in riskyShipments" :key="shipment.shipmentId" class="shipment-row">
        <div>
          <strong>{{ shipment.shipmentId }}</strong>
          <small>{{ shipment.vehicleId }} / {{ shipment.cargo }}</small>
        </div>
        <div>
          <strong>{{ shipment.origin }} to {{ shipment.destination }}</strong>
          <small>{{ shipment.currentHub }}</small>
        </div>
        <span class="status-chip" :class="shipment.status">{{ formatStatus(shipment.status) }}</span>
        <div class="eta-cell">
          <strong>{{ shipment.etaMinutes }}m</strong>
          <small>{{ shipment.delayMinutes }}m delay</small>
        </div>
      </article>
    </div>

    <div v-else class="empty-state">No shipments match the current filters.</div>
  </section>
</template>
