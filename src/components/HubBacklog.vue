<script setup lang="ts">
import { computed } from 'vue';
import { Warehouse } from 'lucide-vue-next';
import { useDashboardStore } from '../stores/dashboard';

const store = useDashboardStore();
const maxBacklog = computed(() => Math.max(...store.hubBacklog.map((hub) => hub.backlog), 1));
</script>

<template>
  <section class="panel backlog-panel">
    <header class="panel-header">
      <div>
        <h2>Hub Backlog</h2>
        <p>Live workload pressure by facility</p>
      </div>
      <Warehouse :size="20" />
    </header>

    <div v-if="store.hubBacklog.length" class="hub-list">
      <article v-for="hub in store.hubBacklog" :key="hub.hub" class="hub-row">
        <div>
          <strong>{{ hub.hub }}</strong>
          <span>{{ hub.delayed }} delayed shipments</span>
        </div>
        <div class="hub-meter">
          <i :style="{ width: `${Math.max(8, (hub.backlog / maxBacklog) * 100)}%` }" />
        </div>
        <b>{{ hub.backlog }}</b>
      </article>
    </div>

    <div v-else class="empty-state">Waiting for hub workload data...</div>
  </section>
</template>
