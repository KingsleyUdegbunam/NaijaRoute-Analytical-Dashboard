import { computed, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import type {
  ActivityEvent,
  ChartDataset,
  ConnectionStatus,
  LogisticsPoint,
  NigeriaRegion,
  ShipmentSnapshot,
  ShipmentStatus,
  StreamPayload,
  TimeRangeKey
} from '../types/telemetry';
import { validatePayload } from '../utils/validation';

const MAX_POINTS = 5_000;
const MAX_EVENTS = 800;
const MAX_SHIPMENTS = 180;
const HISTORY_STEP_MS = 5 * 60 * 1_000;

export const timeRangeSeconds: Record<TimeRangeKey, number> = {
  '15m': 900,
  '1h': 3_600,
  '6h': 21_600,
  '24h': 86_400
};

export const regions: Array<'all' | NigeriaRegion> = ['all', 'South West', 'South South', 'South East', 'North Central', 'North West', 'North East'];
export const statuses: Array<'all' | ShipmentStatus> = ['all', 'in_transit', 'at_hub', 'delayed', 'delivered', 'exception'];

export const datasets: ChartDataset[] = [
  { key: 'activeShipments', label: 'Active shipments', color: '#5b5ff0', unit: '' },
  { key: 'deliveredToday', label: 'Delivered today', color: '#14b8a6', unit: '' },
  { key: 'delayedShipments', label: 'Delayed shipments', color: '#f59e0b', unit: '' },
  { key: 'onTimeRate', label: 'On-time rate', color: '#22c55e', unit: '%' },
  { key: 'avgDelayMinutes', label: 'Avg delay', color: '#f97316', unit: 'm' },
  { key: 'activeVehicles', label: 'Active vehicles', color: '#0ea5e9', unit: '' },
  { key: 'hubBacklog', label: 'Hub backlog', color: '#a855f7', unit: '' },
  { key: 'exceptionCount', label: 'Exceptions', color: '#e11d48', unit: '' },
  { key: 'routeEfficiency', label: 'Route efficiency', color: '#10b981', unit: '%' },
  { key: 'revenueAtRisk', label: 'Revenue at risk', color: '#fb7185', unit: 'NGN' }
];

export const useDashboardStore = defineStore('dashboard', () => {
  const points = shallowRef<LogisticsPoint[]>([]);
  const events = shallowRef<ActivityEvent[]>([]);
  const shipments = shallowRef<ShipmentSnapshot[]>([]);
  const malformedCount = shallowRef(0);
  const droppedCount = shallowRef(0);
  const status = shallowRef<ConnectionStatus>('connecting');
  const paused = shallowRef(false);
  const timeRange = shallowRef<TimeRangeKey>('1h');
  const query = shallowRef('');
  const severityFilter = shallowRef<'all' | 'info' | 'warning' | 'critical'>('all');
  const regionFilter = shallowRef<'all' | NigeriaRegion>('all');
  const statusFilter = shallowRef<'all' | ShipmentStatus>('all');
  const theme = shallowRef<'dark' | 'light'>('light');
  const visibleDatasets = shallowRef<Record<string, boolean>>(
    Object.fromEntries(datasets.map((dataset) => [dataset.key, true]))
  );

  const latest = computed(() => points.value.at(-1));
  const previous = computed(() => points.value.at(-2));
  const windowStart = computed(() => (latest.value?.timestamp ?? Date.now()) - timeRangeSeconds[timeRange.value] * 1_000);
  const normalizedQuery = computed(() => query.value.trim().toLowerCase());
  const matchesQuery = (text: string) => !normalizedQuery.value || text.toLowerCase().includes(normalizedQuery.value);
  const analyticsQueryActive = computed(
    () => !!normalizedQuery.value && points.value.some((point) => `${point.region} ${point.hub}`.toLowerCase().includes(normalizedQuery.value))
  );

  const filteredPoints = computed(() =>
    points.value.filter((point) => {
      const timeMatch = point.timestamp >= windowStart.value;
      const regionMatch = regionFilter.value === 'all' || point.region === regionFilter.value;
      const textMatch = !analyticsQueryActive.value || matchesQuery(`${point.region} ${point.hub}`);
      return timeMatch && regionMatch && textMatch;
    })
  );

  const filteredShipments = computed(() => {
    return shipments.value.filter((shipment) => {
      const regionMatch = regionFilter.value === 'all' || shipment.region === regionFilter.value;
      const statusMatch = statusFilter.value === 'all' || shipment.status === statusFilter.value;
      const textMatch = matchesQuery(
        `${shipment.shipmentId} ${shipment.vehicleId} ${shipment.routeId} ${shipment.origin} ${shipment.destination} ${shipment.currentHub} ${shipment.region} ${shipment.status} ${shipment.cargo}`
      );
      return regionMatch && statusMatch && textMatch;
    });
  });

  const filteredEvents = computed(() => {
    return events.value.filter((event) => {
      const severityMatch = severityFilter.value === 'all' || event.severity === severityFilter.value;
      const statusMatch = statusFilter.value === 'all' || event.status === statusFilter.value;
      if (!severityMatch || !statusMatch) return false;
      return matchesQuery(`${event.shipmentId} ${event.vehicleId} ${event.location} ${event.route} ${event.status} ${event.message}`);
    });
  });

  const criticalEvents = computed(() => events.value.filter((event) => event.severity === 'critical').length);
  const activeDatasets = computed(() => datasets.filter((dataset) => visibleDatasets.value[dataset.key]));

  const hubBacklog = computed(() => {
    const grouped = new Map<string, { hub: string; backlog: number; delayed: number }>();
    for (const point of filteredPoints.value.slice(-220)) {
      const current = grouped.get(point.hub) ?? { hub: point.hub, backlog: 0, delayed: 0 };
      current.backlog = Math.max(current.backlog, point.hubBacklog);
      current.delayed = Math.max(current.delayed, point.delayedShipments);
      grouped.set(point.hub, current);
    }
    return [...grouped.values()].sort((a, b) => b.backlog - a.backlog).slice(0, 6);
  });

  const regionalDelayHeatmap = computed(() => {
    const grouped = new Map<NigeriaRegion, { region: NigeriaRegion; delayTotal: number; exceptions: number; delayed: number; samples: number }>();
    const knownRegions = regions.filter((region): region is NigeriaRegion => region !== 'all');

    for (const region of knownRegions) {
      grouped.set(region, { region, delayTotal: 0, exceptions: 0, delayed: 0, samples: 0 });
    }

    for (const point of filteredPoints.value) {
      const current = grouped.get(point.region);
      if (!current) continue;
      current.delayTotal += point.avgDelayMinutes;
      current.exceptions += point.exceptionCount;
      current.delayed += point.delayedShipments;
      current.samples += 1;
    }

    return [...grouped.values()].map((item) => {
      const avgDelay = item.samples ? Math.round(item.delayTotal / item.samples) : 0;
      const pressure = Math.min(100, Math.round(avgDelay * 1.6 + item.exceptions * 0.25 + item.delayed * 0.04));
      return {
        region: item.region,
        avgDelay,
        exceptions: item.exceptions,
        delayed: item.delayed,
        pressure
      };
    });
  });

  function ingest(rawPayload: unknown) {
    if (paused.value) return;
    const payload = validatePayload(rawPayload);
    if (!payload) {
      malformedCount.value += 1;
      return;
    }

    if (points.value.length === 0) {
      points.value = seedHistoricalPoints(payload.point);
    }

    const nextPoints = points.value.length >= MAX_POINTS ? points.value.slice(-MAX_POINTS + 1) : points.value.slice();
    nextPoints.push(payload.point);
    points.value = nextPoints;

    const nextEvents = events.value.length >= MAX_EVENTS ? events.value.slice(0, MAX_EVENTS - 1) : events.value.slice();
    events.value = [payload.event, ...nextEvents];

    const existing = shipments.value.filter((shipment) => shipment.shipmentId !== payload.shipment.shipmentId);
    shipments.value = [payload.shipment, ...existing].slice(0, MAX_SHIPMENTS);
  }

  function ingestBatch(payloads: StreamPayload[]) {
    if (paused.value || payloads.length === 0) return;
    for (const payload of payloads) ingest(payload);
  }

  function markMalformed() {
    malformedCount.value += 1;
  }

  function setStatus(nextStatus: ConnectionStatus) {
    status.value = nextStatus;
  }

  function setPaused(nextPaused: boolean) {
    paused.value = nextPaused;
  }

  function setTimeRange(nextRange: TimeRangeKey) {
    timeRange.value = nextRange;
  }

  function setSeverity(nextSeverity: typeof severityFilter.value) {
    severityFilter.value = nextSeverity;
  }

  function setRegion(nextRegion: typeof regionFilter.value) {
    regionFilter.value = nextRegion;
  }

  function setShipmentStatus(nextStatus: typeof statusFilter.value) {
    statusFilter.value = nextStatus;
  }

  function setQuery(nextQuery: string) {
    query.value = nextQuery;
  }

  function setTheme(nextTheme: typeof theme.value) {
    theme.value = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
  }

  function toggleDataset(key: string) {
    visibleDatasets.value = {
      ...visibleDatasets.value,
      [key]: !visibleDatasets.value[key]
    };
  }

  function resetFilters() {
    query.value = '';
    timeRange.value = '1h';
    severityFilter.value = 'all';
    regionFilter.value = 'all';
    statusFilter.value = 'all';
    visibleDatasets.value = Object.fromEntries(datasets.map((dataset) => [dataset.key, true]));
  }

  function noteDroppedFrame() {
    droppedCount.value += 1;
  }

  function seedHistoricalPoints(point: LogisticsPoint) {
    const total = Math.floor(timeRangeSeconds['24h'] / (HISTORY_STEP_MS / 1_000));
    return Array.from({ length: total }, (_, index) => {
      const age = total - index;
      const wave = Math.sin(index / 9);
      const drift = Math.cos(index / 17);
      const pressure = 1 + wave * 0.045 + drift * 0.025;

      return {
        ...point,
        id: `${point.id}-history-${index}`,
        timestamp: point.timestamp - age * HISTORY_STEP_MS,
        activeShipments: Math.max(0, Math.round(point.activeShipments * pressure)),
        deliveredToday: Math.max(0, Math.round(point.deliveredToday - age * 7)),
        delayedShipments: Math.max(0, Math.round(point.delayedShipments * (1 + wave * 0.18))),
        onTimeRate: Math.max(50, Math.min(99.5, Number((point.onTimeRate + drift * 2.2).toFixed(1)))),
        avgDelayMinutes: Math.max(0, Math.round(point.avgDelayMinutes * (1 + wave * 0.22))),
        activeVehicles: Math.max(0, Math.round(point.activeVehicles * (1 + drift * 0.06))),
        hubBacklog: Math.max(0, Math.round(point.hubBacklog * (1 + wave * 0.2))),
        exceptionCount: Math.max(0, Math.round(point.exceptionCount * (1 + drift * 0.16))),
        routeEfficiency: Math.max(42, Math.min(99, Number((point.routeEfficiency + wave * 3.4).toFixed(1)))),
        revenueAtRisk: Math.max(0, Math.round(point.revenueAtRisk * (1 + wave * 0.24)))
      };
    });
  }

  return {
    points,
    events,
    shipments,
    malformedCount,
    droppedCount,
    status,
    paused,
    timeRange,
    query,
    severityFilter,
    regionFilter,
    statusFilter,
    theme,
    visibleDatasets,
    latest,
    previous,
    filteredPoints,
    filteredEvents,
    filteredShipments,
    criticalEvents,
    activeDatasets,
    hubBacklog,
    regionalDelayHeatmap,
    ingest,
    ingestBatch,
    markMalformed,
    setStatus,
    setPaused,
    setTimeRange,
    setSeverity,
    setRegion,
    setShipmentStatus,
    setQuery,
    setTheme,
    toggleDataset,
    resetFilters,
    noteDroppedFrame
  };
});
