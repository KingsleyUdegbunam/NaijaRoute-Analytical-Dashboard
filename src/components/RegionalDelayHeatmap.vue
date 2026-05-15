<script setup lang="ts">
import { computed } from 'vue';
import { Flame } from 'lucide-vue-next';
import { regions, useDashboardStore } from '../stores/dashboard';
import type { NigeriaRegion } from '../types/telemetry';

const store = useDashboardStore();
const regionRows = regions.filter((region): region is NigeriaRegion => region !== 'all');
const bucketCount = 8;

const buckets = computed(() => {
  const points = store.filteredPoints;
  const latest = points.at(-1)?.timestamp ?? Date.now();
  const earliest = points[0]?.timestamp ?? latest - 60 * 60 * 1000;
  const span = Math.max(latest - earliest, bucketCount);
  const bucketSize = span / bucketCount;

  return Array.from({ length: bucketCount }, (_, index) => {
    const start = earliest + index * bucketSize;
    const end = index === bucketCount - 1 ? latest + 1 : start + bucketSize;
    const label = new Intl.DateTimeFormat('en-NG', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(start);

    return { start, end, label };
  });
});

const cells = computed(() => {
  const maxPressure = { value: 1 };
  const next = regionRows.map((region) => {
    const values = buckets.value.map((bucket) => {
      const bucketPoints = store.filteredPoints.filter(
        (point) => point.region === region && point.timestamp >= bucket.start && point.timestamp < bucket.end
      );
      const avgDelay = average(bucketPoints.map((point) => point.avgDelayMinutes));
      const delayed = average(bucketPoints.map((point) => point.delayedShipments));
      const exceptions = average(bucketPoints.map((point) => point.exceptionCount));
      const pressure = Math.round(avgDelay * 1.8 + delayed * 0.04 + exceptions * 0.3);
      maxPressure.value = Math.max(maxPressure.value, pressure);

      return {
        avgDelay: Math.round(avgDelay),
        exceptions: Math.round(exceptions),
        pressure
      };
    });

    return { region, values };
  });

  return next.map((row) => ({
    ...row,
    values: row.values.map((value) => ({
      ...value,
      intensity: value.pressure / maxPressure.value
    }))
  }));
});

const hottestCell = computed(() => {
  return cells.value
    .flatMap((row) => row.values.map((value, index) => ({ ...value, region: row.region, label: buckets.value[index]?.label ?? '' })))
    .sort((first, second) => second.pressure - first.pressure)[0];
});

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const cellStyle = (intensity: number) => ({
  background: `color-mix(in srgb, #f97316 ${Math.round(Math.max(0.08, intensity) * 86)}%, var(--surface-2))`
});
</script>

<template>
  <section class="panel heatmap-panel">
    <header class="panel-header">
      <div>
        <h2>Regional Delay Heatmap</h2>
        <p>Region by time pressure intensity</p>
      </div>
      <Flame :size="20" />
    </header>

    <div class="heatmap-summary">
      <div>
        <span>Peak region</span>
        <strong>{{ hottestCell?.region ?? 'Loading...' }}</strong>
      </div>
      <div>
        <span>Pressure score</span>
        <b>{{ hottestCell?.pressure ?? 0 }}</b>
      </div>
      <div>
        <span>Time bucket</span>
        <small>{{ hottestCell?.label ?? '' }}</small>
      </div>
    </div>

    <div class="heatmap-matrix" role="table" aria-label="Delay pressure heatmap by Nigerian region and time">
      <div class="heatmap-corner" />
      <span v-for="bucket in buckets" :key="bucket.start" class="heatmap-time">{{ bucket.label }}</span>

      <template v-for="row in cells" :key="row.region">
        <strong class="heatmap-region-label">{{ row.region }}</strong>
        <span
          v-for="(cell, index) in row.values"
          :key="`${row.region}-${index}`"
          class="heatmap-block"
          :style="cellStyle(cell.intensity)"
          :title="`${row.region} at ${buckets[index].label}: ${cell.pressure} pressure, ${cell.avgDelay}m avg delay, ${cell.exceptions} exceptions`"
        />
      </template>
    </div>

    <div class="heatmap-scale" aria-hidden="true">
      <span>Low</span>
      <i />
      <span>High</span>
    </div>
  </section>
</template>
