<script setup lang="ts">
import { computed } from 'vue';
import type { LucideIcon } from 'lucide-vue-next';

const props = defineProps<{
  label: string;
  value: number | undefined;
  unit?: string;
  accent: string;
  icon: LucideIcon;
  previous?: number;
}>();

const formattedValue = computed(() => {
  if (props.value === undefined) return '...';
  return Intl.NumberFormat('en', { notation: props.value > 9999 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(props.value);
});

const delta = computed(() => (props.value !== undefined && props.previous !== undefined ? props.value - props.previous : 0));
</script>

<template>
  <article class="metric-card" :style="{ '--accent': accent }">
    <div class="metric-icon" :style="{ color: accent, background: `${accent}18` }">
      <component :is="icon" :size="20" />
    </div>
    <div>
      <p>{{ label }}</p>
      <strong>{{ unit === '$' ? unit : '' }}{{ formattedValue }}{{ unit && unit !== '$' ? unit : '' }}</strong>
      <span :class="{ negative: delta < 0, positive: delta >= 0 }">
        {{ delta >= 0 ? '+' : '' }}{{ delta.toFixed(2) }}
      </span>
    </div>
  </article>
</template>
