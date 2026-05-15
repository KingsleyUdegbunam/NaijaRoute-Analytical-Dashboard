# NaijaRoute Control Tower

Nigeria-focused real-time logistics control tower built with Vue 3, TypeScript, Pinia, and ECharts.

## Setup

```bash
npm install
npm run dev
```

On this Windows/PowerShell setup, use:

```powershell
npm.cmd run dev
```

Build check:

```powershell
npm.cmd run build
```

## What It Tracks

The dashboard simulates live logistics telemetry across Nigerian routes and hubs:

- active shipments
- delivered shipments today
- delayed shipments
- on-time delivery rate
- average delay minutes
- active vehicles
- hub backlog
- exception count
- route efficiency
- revenue at risk
- shipment location, status, ETA, route, vehicle, cargo, and hub

The stream is scoped to Nigerian logistics regions and corridors including Lagos, Abuja, Kano, Port Harcourt, Onitsha, and Maiduguri.

## Architecture

- `src/services/streamSimulator.ts` simulates a live logistics stream with shipment updates, hub pressure, ETA changes, delays, exceptions, malformed payloads, and reconnect states.
- `src/utils/validation.ts` validates and sanitizes every incoming payload before UI state receives it.
- `src/stores/dashboard.ts` centralizes real-time state in Pinia, keeps bounded buffers, and exposes filtered/computed views.
- `src/composables/useStream.ts` batches stream updates with `requestAnimationFrame` and cleans up listeners/timers.
- `src/components/ChartPanel.vue` provides reusable line, area, and bar chart rendering.
- `src/components/NigeriaRouteMap.vue`, `ShipmentTable.vue`, `HubBacklog.vue`, `StatusRail.vue`, and `ActivityFeed.vue` build the logistics operations experience.
- `src/components/RegionalDelayHeatmap.vue` adds a bonus heatmap view for regional delay and exception pressure.

## State Management Strategy

Pinia is the single data boundary. Components do not consume raw stream messages directly. Payloads are validated first, then stored in bounded arrays for time-series points, shipment snapshots, and live events. Filters for time range, Nigerian region, shipment status, severity, search, theme, pause/resume, and visible chart datasets all live in the store.

## Rendering Optimization Decisions

- Stream payloads are queued and flushed once per animation frame.
- Incoming bursts are capped before entering the store.
- Time-series, event, and shipment buffers are bounded to avoid memory leaks.
- ECharts canvas rendering is used with `sampling: 'lttb'`.
- Chart data is decimated before render for large windows.
- The activity feed and shipment table render capped windows of the retained buffers.
- Intervals, reconnect timers, animation frames, and listeners are cleaned up on unmount.

## Bonus Features

- Regional delay heatmap for Nigerian logistics pressure by region.
- Keyboard shortcuts: `P` pauses/resumes streaming, and `T` toggles theme when not typing in a form control.

## Data Streaming Approach

The app uses a self-contained mocked stream via `EventTarget`. It behaves like a live transport by emitting:

- logistics metric payloads
- shipment snapshots
- operational events
- malformed payloads
- connection status changes
- reconnect/backoff behavior

This keeps the project runnable without a backend while still demonstrating real-time systems thinking.

## UI Direction

The UI draws inspiration from the attached dashboard references: focused control surfaces, clear KPI cards, compact filters, soft shadows, high-contrast typography, and friendly color-coded summaries. The result is adapted into a functional logistics product rather than copied as a static layout.

## Error Handling & Stability

- Malformed payloads are rejected and counted.
- Text fields are sanitized to avoid unsafe DOM injection.
- Numeric fields are clamped to logistics-safe ranges.
- Connection failures surface in the UI and automatically reconnect.
- Empty states are shown for filters and loading windows.

## Trade-Offs

- The stream is mocked instead of using a real WebSocket backend.
- The Nigeria map is a lightweight custom visual, not a GIS map provider.
- Feed/table rendering uses capped windows rather than a full virtualization library because retained buffers are intentionally bounded.
