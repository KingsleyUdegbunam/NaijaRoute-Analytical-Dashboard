<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import type { GridComponentOption, LegendComponentOption, TooltipComponentOption } from 'echarts/components';
import type { ChartDataset, LogisticsPoint } from '../types/telemetry';

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent]);

type ChartOption = ComposeOption<LineSeriesOption | BarSeriesOption | GridComponentOption | TooltipComponentOption | LegendComponentOption>;

const props = defineProps<{
  title: string;
  subtitle?: string;
  type: 'line' | 'area' | 'bar';
  points: LogisticsPoint[];
  datasets: ChartDataset[];
  dense?: boolean;
}>();

const decimatedPoints = computed(() => {
  const limit = props.dense ? 140 : 260;
  if (props.points.length <= limit) return props.points;
  const step = Math.ceil(props.points.length / limit);
  return props.points.filter((_, index) => index % step === 0 || index === props.points.length - 1);
});

const option = computed<ChartOption>(() => ({
  animation: true,
  animationDuration: 240,
  animationEasing: 'cubicOut',
  color: props.datasets.map((dataset) => dataset.color),
  grid: { top: 26, right: 14, bottom: 28, left: 40, containLabel: true },
  legend: {
    show: props.datasets.length > 1,
    top: 0,
    right: 0,
    textStyle: { color: 'var(--muted)' },
    itemWidth: 10,
    itemHeight: 10
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'var(--panel-strong)',
    borderColor: 'var(--border)',
    textStyle: { color: 'var(--text)' },
    valueFormatter: (value) => Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(Number(value))
  },
  xAxis: {
    type: 'category',
    boundaryGap: props.type === 'bar',
    data: decimatedPoints.value.map((point) => new Date(point.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })),
    axisLabel: { color: 'var(--muted)', hideOverlap: true },
    axisLine: { lineStyle: { color: 'var(--border)' } },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value',
    scale: true,
    axisLabel: { color: 'var(--muted)' },
    splitLine: { lineStyle: { color: 'var(--border-soft)' } }
  },
  series: props.datasets.map((dataset) => ({
    name: dataset.label,
    type: props.type === 'bar' ? 'bar' : 'line',
    data: decimatedPoints.value.map((point) => Number(point[dataset.key])),
    smooth: props.type !== 'bar',
    showSymbol: false,
    sampling: 'lttb',
    large: props.type === 'bar',
    areaStyle: props.type === 'area' ? { opacity: 0.18 } : undefined,
    lineStyle: { width: props.dense ? 2 : 2.5 },
    barMaxWidth: 22
  }))
}));
</script>

<template>
  <section class="panel chart-panel">
    <header class="panel-header">
      <div>
        <h2>{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>
    <div v-if="points.length && datasets.length" class="chart-frame" :class="{ dense }">
      <VChart autoresize :option="option" />
    </div>
    <div v-else-if="points.length" class="empty-state">No active series selected.</div>
    <div v-else class="empty-state">Waiting for stream data...</div>
  </section>
</template>
