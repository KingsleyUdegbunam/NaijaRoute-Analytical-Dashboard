import type { ActivityEvent, LogisticsPoint, NigeriaRegion, Severity, ShipmentSnapshot, ShipmentStatus, StreamPayload } from '../types/telemetry';

const severities = new Set<Severity>(['info', 'warning', 'critical']);
const statuses = new Set<ShipmentStatus>(['in_transit', 'at_hub', 'delayed', 'delivered', 'exception']);
const regions = new Set<NigeriaRegion>(['South West', 'South South', 'South East', 'North Central', 'North West', 'North East']);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const cleanText = (value: unknown, fallback: string, maxLength = 120) =>
  String(value ?? fallback)
    .replace(/[<>]/g, '')
    .slice(0, maxLength);

const asFiniteNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const next = Number(value);
  return Number.isFinite(next) ? clamp(next, min, max) : fallback;
};

const cleanRegion = (value: unknown): NigeriaRegion => (regions.has(value as NigeriaRegion) ? (value as NigeriaRegion) : 'South West');
const cleanStatus = (value: unknown): ShipmentStatus => (statuses.has(value as ShipmentStatus) ? (value as ShipmentStatus) : 'in_transit');

export function validatePayload(payload: unknown): StreamPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Partial<StreamPayload>;
  if (!candidate.point || !candidate.shipment || !candidate.event) return null;

  const now = Date.now();
  const rawPoint = candidate.point as Partial<LogisticsPoint>;
  const timestamp = asFiniteNumber(rawPoint.timestamp, now, now - 86_400_000, now + 5_000);

  const point: LogisticsPoint = {
    id: cleanText(rawPoint.id, crypto.randomUUID()),
    timestamp,
    activeShipments: Math.round(asFiniteNumber(rawPoint.activeShipments, 0, 0, 100_000)),
    deliveredToday: Math.round(asFiniteNumber(rawPoint.deliveredToday, 0, 0, 100_000)),
    delayedShipments: Math.round(asFiniteNumber(rawPoint.delayedShipments, 0, 0, 100_000)),
    onTimeRate: asFiniteNumber(rawPoint.onTimeRate, 0, 0, 100),
    avgDelayMinutes: Math.round(asFiniteNumber(rawPoint.avgDelayMinutes, 0, 0, 1_440)),
    activeVehicles: Math.round(asFiniteNumber(rawPoint.activeVehicles, 0, 0, 20_000)),
    hubBacklog: Math.round(asFiniteNumber(rawPoint.hubBacklog, 0, 0, 100_000)),
    exceptionCount: Math.round(asFiniteNumber(rawPoint.exceptionCount, 0, 0, 20_000)),
    routeEfficiency: asFiniteNumber(rawPoint.routeEfficiency, 0, 0, 100),
    revenueAtRisk: Math.round(asFiniteNumber(rawPoint.revenueAtRisk, 0, 0, 10_000_000_000)),
    region: cleanRegion(rawPoint.region),
    hub: cleanText(rawPoint.hub, 'Lagos Mega Hub')
  };

  const rawShipment = candidate.shipment as Partial<ShipmentSnapshot>;
  const shipment: ShipmentSnapshot = {
    shipmentId: cleanText(rawShipment.shipmentId, 'NG-00000', 24),
    vehicleId: cleanText(rawShipment.vehicleId, 'TRK-000', 24),
    routeId: cleanText(rawShipment.routeId, 'LOS-ABV', 24),
    origin: cleanText(rawShipment.origin, 'Lagos'),
    destination: cleanText(rawShipment.destination, 'Abuja'),
    currentHub: cleanText(rawShipment.currentHub, point.hub),
    region: cleanRegion(rawShipment.region),
    status: cleanStatus(rawShipment.status),
    progress: Math.round(asFiniteNumber(rawShipment.progress, 0, 0, 100)),
    etaMinutes: Math.round(asFiniteNumber(rawShipment.etaMinutes, 0, 0, 10_080)),
    delayMinutes: Math.round(asFiniteNumber(rawShipment.delayMinutes, 0, 0, 10_080)),
    latitude: asFiniteNumber(rawShipment.latitude, 6.5244, 4, 14),
    longitude: asFiniteNumber(rawShipment.longitude, 7.3986, 2, 15),
    cargo: cleanText(rawShipment.cargo, 'Retail parcels')
  };

  const rawEvent = candidate.event as Partial<ActivityEvent>;
  const severity = severities.has(rawEvent.severity as Severity) ? (rawEvent.severity as Severity) : 'info';

  return {
    point,
    shipment,
    event: {
      id: cleanText(rawEvent.id, crypto.randomUUID()),
      timestamp,
      severity,
      shipmentId: cleanText(rawEvent.shipmentId, shipment.shipmentId, 24),
      vehicleId: cleanText(rawEvent.vehicleId, shipment.vehicleId, 24),
      location: cleanText(rawEvent.location, shipment.currentHub),
      route: cleanText(rawEvent.route, `${shipment.origin} - ${shipment.destination}`),
      status: cleanStatus(rawEvent.status),
      message: cleanText(rawEvent.message, 'Shipment update received', 150),
      delayMinutes: Math.round(asFiniteNumber(rawEvent.delayMinutes, shipment.delayMinutes, 0, 10_080))
    }
  };
}
