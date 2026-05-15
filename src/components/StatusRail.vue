<script setup lang="ts">
import { computed } from 'vue';
import { Activity, Radio, ShieldCheck, TriangleAlert } from 'lucide-vue-next';
import { useDashboardStore } from '../stores/dashboard';

const store = useDashboardStore();
const health = computed(() => {
  if (store.status === 'failed') return 'Connection degraded';
  if (store.status === 'reconnecting') return 'Reconnecting stream';
  if (store.malformedCount > 8) return 'Payload guard active';
  return 'Network live';
});
</script>

<template>
  <aside class="status-rail">
    <div class="status-pill" :class="store.status">
      <Radio :size="16" />
      {{ store.status }}
    </div>
    <div class="rail-item">
      <ShieldCheck :size="18" />
      <span>{{ health }}</span>
    </div>
    <div class="rail-item">
      <TriangleAlert :size="18" />
      <span>{{ store.malformedCount }} malformed dropped</span>
    </div>
    <div class="rail-item">
      <Activity :size="18" />
      <span>{{ store.shipments.length }} live shipments</span>
    </div>
  </aside>
</template>
