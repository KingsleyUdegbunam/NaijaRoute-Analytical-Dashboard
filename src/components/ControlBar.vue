<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, ChevronDown, Moon, Pause, Play, RotateCcw, Search, Sun, X } from 'lucide-vue-next';
import { datasets, regions, statuses, useDashboardStore } from '../stores/dashboard';
import type { TimeRangeKey } from '../types/telemetry';

const store = useDashboardStore();
const searchDraft = ref(store.query);
const ranges: Array<{ key: TimeRangeKey; label: string }> = [
  { key: '15m', label: '15 min' },
  { key: '1h', label: '1 hour' },
  { key: '6h', label: '6 hours' },
  { key: '24h', label: '24 hours' }
];

const visibleMetricCount = computed(() => datasets.filter((dataset) => store.visibleDatasets[dataset.key]).length);
const searchSummary = computed(() => {
  if (!store.query.trim()) return '';
  return `${store.filteredShipments.length} shipments, ${store.filteredEvents.length} events`;
});
const hasPendingSearch = computed(() => searchDraft.value.trim() !== store.query.trim());
const hasActiveFilters = computed(
  () =>
    !!store.query.trim() ||
    store.regionFilter !== 'all' ||
    store.statusFilter !== 'all' ||
    store.timeRange !== '1h' ||
    store.severityFilter !== 'all' ||
    visibleMetricCount.value !== datasets.length
);

watch(
  () => store.query,
  (nextQuery) => {
    searchDraft.value = nextQuery;
  }
);

const applySearch = () => {
  store.setQuery(searchDraft.value.trim());
};

const clearSearch = () => {
  searchDraft.value = '';
  store.setQuery('');
};

const resetFilters = () => {
  store.resetFilters();
  searchDraft.value = '';
};

const formatOption = (value: string) =>
  value === 'all'
    ? 'All'
    : value
        .split('_')
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' ');
</script>

<template>
  <section class="control-bar">
    <div class="control-primary">
      <div class="search-control">
        <p v-if="hasPendingSearch" class="search-feedback">Press Enter to apply search</p>
        <p v-else-if="searchSummary" class="search-feedback">{{ searchSummary }}</p>
        <label class="search-box">
          <Search :size="18" />
          <input
            v-model="searchDraft"
            placeholder="Search shipment, vehicle, hub, region..."
            @keydown.enter.prevent="applySearch"
          />
        </label>
        <button v-if="searchDraft || store.query" class="search-clear" type="button" title="Clear search" @click="clearSearch">
          <X :size="16" />
        </button>
      </div>

      <div class="select-group">
        <select :value="store.regionFilter" aria-label="Region" @change="store.setRegion(($event.target as HTMLSelectElement).value as any)">
          <option v-for="region in regions" :key="region" :value="region">{{ region === 'all' ? 'All Nigeria' : region }}</option>
        </select>
        <select :value="store.statusFilter" aria-label="Shipment status" @change="store.setShipmentStatus(($event.target as HTMLSelectElement).value as any)">
          <option v-for="status in statuses" :key="status" :value="status">{{ formatOption(status) }}</option>
        </select>
      </div>

      <div class="toolbar-actions">
        <button class="icon-button" type="button" :title="store.paused ? 'Resume stream' : 'Pause stream'" @click="store.setPaused(!store.paused)">
          <Play v-if="store.paused" :size="18" />
          <Pause v-else :size="18" />
        </button>

        <button class="icon-button" type="button" title="Toggle theme" @click="store.setTheme(store.theme === 'dark' ? 'light' : 'dark')">
          <Sun v-if="store.theme === 'dark'" :size="18" />
          <Moon v-else :size="18" />
        </button>

        <button class="reset-button" type="button" :disabled="!hasActiveFilters" title="Reset filters" @click="resetFilters">
          <RotateCcw :size="16" />
          <span>Reset</span>
        </button>
      </div>
    </div>

    <div class="control-secondary">
      <div class="toolbar-group compact">
        <span>Window</span>
        <div class="segmented" aria-label="Time range">
          <button
            v-for="range in ranges"
            :key="range.key"
            type="button"
            :class="{ active: store.timeRange === range.key }"
            @click="store.setTimeRange(range.key)"
          >
            {{ range.label }}
          </button>
        </div>
      </div>

      <div class="toolbar-group signals">
        <span>Metrics</span>
        <details class="metric-menu">
          <summary>
            <span>{{ visibleMetricCount }} selected</span>
            <ChevronDown :size="16" />
          </summary>

          <div class="metric-menu-list" role="group" aria-label="Visible chart metrics">
            <label v-for="dataset in datasets" :key="dataset.key" class="metric-option">
              <input
                type="checkbox"
                :checked="store.visibleDatasets[dataset.key]"
                @change="store.toggleDataset(dataset.key)"
              />
              <span class="metric-check">
                <Check :size="14" />
              </span>
              <i :style="{ background: dataset.color }" />
              <span>{{ dataset.label }}</span>
            </label>
          </div>
        </details>
      </div>
    </div>
  </section>
</template>
