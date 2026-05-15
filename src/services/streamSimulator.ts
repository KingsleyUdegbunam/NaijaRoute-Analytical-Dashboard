import type {
  ActivityEvent,
  ConnectionStatus,
  LogisticsPoint,
  NigeriaRegion,
  Severity,
  ShipmentSnapshot,
  ShipmentStatus,
  StreamPayload
} from '../types/telemetry';

type StreamEvents = 'payload' | 'status' | 'malformed';

const hubs = [
  { name: 'Lagos Mega Hub', city: 'Lagos', region: 'South West' as NigeriaRegion, lat: 6.5244, lng: 3.3792 },
  { name: 'Abuja Gateway', city: 'Abuja', region: 'North Central' as NigeriaRegion, lat: 9.0765, lng: 7.3986 },
  { name: 'Kano Inland Port', city: 'Kano', region: 'North West' as NigeriaRegion, lat: 12.0022, lng: 8.592 },
  { name: 'Port Harcourt Dock', city: 'Port Harcourt', region: 'South South' as NigeriaRegion, lat: 4.8156, lng: 7.0498 },
  { name: 'Onitsha Fulfilment', city: 'Onitsha', region: 'South East' as NigeriaRegion, lat: 6.1667, lng: 6.7833 },
  { name: 'Maiduguri Relay', city: 'Maiduguri', region: 'North East' as NigeriaRegion, lat: 11.8311, lng: 13.151 }
];

const routes = [
  { id: 'LOS-ABV', origin: 'Lagos', destination: 'Abuja', route: 'Lagos - Abuja Express' },
  { id: 'ABV-KAN', origin: 'Abuja', destination: 'Kano', route: 'Abuja - Kano Corridor' },
  { id: 'PHC-ONI', origin: 'Port Harcourt', destination: 'Onitsha', route: 'Port Harcourt - Onitsha' },
  { id: 'KAN-MAI', origin: 'Kano', destination: 'Maiduguri', route: 'Kano - Maiduguri Line' },
  { id: 'LOS-PHC', origin: 'Lagos', destination: 'Port Harcourt', route: 'Coastal Freight Run' },
  { id: 'ABV-ONI', origin: 'Abuja', destination: 'Onitsha', route: 'Central Market Link' }
];

const cargoTypes = ['Pharma cold chain', 'Retail parcels', 'Industrial parts', 'Food staples', 'E-commerce bags', 'Bank documents'];

export class StreamSimulator extends EventTarget {
  private timerId: number | undefined;
  private reconnectTimerId: number | undefined;
  private status: ConnectionStatus = 'connecting';
  private backoffMs = 800;
  private tick = 0;
  private deliveredToday = 2180;
  private base = {
    activeShipments: 4380,
    delayedShipments: 312,
    onTimeRate: 91.8,
    avgDelayMinutes: 22,
    activeVehicles: 742,
    hubBacklog: 1180,
    exceptionCount: 42,
    routeEfficiency: 84.5,
    revenueAtRisk: 18_500_000
  };

  start() {
    if (this.timerId) return;
    this.setStatus('connecting');
    this.reconnectTimerId = window.setTimeout(() => {
      this.setStatus('connected');
      this.timerId = window.setInterval(() => this.emitPayload(), 720);
    }, 420);
  }

  stop() {
    if (this.timerId) window.clearInterval(this.timerId);
    if (this.reconnectTimerId) window.clearTimeout(this.reconnectTimerId);
    this.timerId = undefined;
    this.reconnectTimerId = undefined;
  }

  on<T>(event: StreamEvents, handler: (payload: T) => void) {
    const listener = (message: Event) => handler((message as CustomEvent<T>).detail);
    this.addEventListener(event, listener);
    return () => this.removeEventListener(event, listener);
  }

  private emitPayload() {
    this.tick += 1;

    if (Math.random() < 0.01) {
      this.simulateDisconnect();
      return;
    }

    if (Math.random() < 0.015) {
      this.dispatchEvent(new CustomEvent('malformed', { detail: { status: '<img onerror=alert(1)>', activeShipments: 'many' } }));
      return;
    }

    const shipment = this.nextShipment();
    const point = this.nextPoint(shipment);
    const event = this.nextEvent(shipment);
    this.dispatchEvent(new CustomEvent<StreamPayload>('payload', { detail: { point, shipment, event } }));
  }

  private nextPoint(shipment: ShipmentSnapshot): LogisticsPoint {
    const wave = Math.sin(this.tick / 8);
    const rush = Math.cos(this.tick / 19);
    const random = (scale: number) => (Math.random() - 0.5) * scale;
    const incidentPressure = shipment.status === 'exception' ? 18 : shipment.status === 'delayed' ? 8 : -2;

    this.deliveredToday += Math.random() > 0.62 ? Math.round(4 + Math.random() * 18) : 0;
    this.base.activeShipments = Math.max(600, this.base.activeShipments + random(180) - (this.deliveredToday % 7));
    this.base.delayedShipments = Math.max(0, this.base.delayedShipments + random(35) + incidentPressure * 0.8);
    this.base.avgDelayMinutes = Math.max(2, this.base.avgDelayMinutes + random(4) + incidentPressure * 0.12);
    this.base.activeVehicles = Math.max(80, this.base.activeVehicles + random(18));
    this.base.hubBacklog = Math.max(0, this.base.hubBacklog + rush * 18 + random(110) + incidentPressure * 1.6);
    this.base.exceptionCount = Math.max(0, this.base.exceptionCount + (shipment.status === 'exception' ? 1 : Math.random() > 0.88 ? -1 : 0));
    this.base.onTimeRate = Math.max(50, Math.min(99.5, 96 - this.base.delayedShipments / 85 - this.base.avgDelayMinutes / 18 + random(0.8)));
    this.base.routeEfficiency = Math.max(42, Math.min(99, 92 - this.base.avgDelayMinutes / 3 - this.base.hubBacklog / 380 + wave * 3));
    this.base.revenueAtRisk = Math.max(800_000, this.base.delayedShipments * 42_000 + this.base.exceptionCount * 310_000 + random(900_000));

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      activeShipments: Math.round(this.base.activeShipments),
      deliveredToday: this.deliveredToday,
      delayedShipments: Math.round(this.base.delayedShipments),
      onTimeRate: Number(this.base.onTimeRate.toFixed(1)),
      avgDelayMinutes: Math.round(this.base.avgDelayMinutes),
      activeVehicles: Math.round(this.base.activeVehicles),
      hubBacklog: Math.round(this.base.hubBacklog),
      exceptionCount: Math.round(this.base.exceptionCount),
      routeEfficiency: Number(this.base.routeEfficiency.toFixed(1)),
      revenueAtRisk: Math.round(this.base.revenueAtRisk),
      region: shipment.region,
      hub: shipment.currentHub
    };
  }

  private nextShipment(): ShipmentSnapshot {
    const route = routes[Math.floor(Math.random() * routes.length)];
    const hub = hubs.find((candidate) => candidate.city === route.destination) ?? hubs[Math.floor(Math.random() * hubs.length)];
    const delayMinutes = Math.max(0, Math.round((Math.random() - 0.35) * 95 + (Math.random() > 0.92 ? 180 : 0)));
    const progress = Math.min(100, Math.max(4, Math.round(Math.random() * 100)));
    const status = this.statusFrom(delayMinutes, progress);

    return {
      shipmentId: `NG-${String(70_000 + Math.floor(Math.random() * 29_999))}`,
      vehicleId: `TRK-${String(100 + Math.floor(Math.random() * 850))}`,
      routeId: route.id,
      origin: route.origin,
      destination: route.destination,
      currentHub: hub.name,
      region: hub.region,
      status,
      progress,
      etaMinutes: Math.max(8, Math.round((100 - progress) * 8 + delayMinutes)),
      delayMinutes,
      latitude: Number((hub.lat + (Math.random() - 0.5) * 1.3).toFixed(4)),
      longitude: Number((hub.lng + (Math.random() - 0.5) * 1.3).toFixed(4)),
      cargo: cargoTypes[Math.floor(Math.random() * cargoTypes.length)]
    };
  }

  private statusFrom(delayMinutes: number, progress: number): ShipmentStatus {
    if (Math.random() > 0.965) return 'exception';
    if (progress > 96) return 'delivered';
    if (delayMinutes > 60) return 'delayed';
    if (Math.random() > 0.78) return 'at_hub';
    return 'in_transit';
  }

  private nextEvent(shipment: ShipmentSnapshot): ActivityEvent {
    const severity: Severity = shipment.status === 'exception' ? 'critical' : shipment.delayMinutes > 60 ? 'warning' : 'info';
    const messages: Record<ShipmentStatus, string[]> = {
      in_transit: ['Checkpoint scan received', 'Vehicle crossed route geofence', 'ETA refreshed from live traffic'],
      at_hub: ['Shipment arrived at hub', 'Dock assignment updated', 'Sorting lane completed'],
      delayed: ['Delay risk detected', 'Traffic hold affecting delivery window', 'Route supervisor review requested'],
      delivered: ['Proof of delivery received', 'Shipment delivered successfully', 'Recipient confirmation captured'],
      exception: ['Cold-chain threshold breached', 'Route deviation detected', 'Failed delivery attempt escalated']
    };

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      severity,
      shipmentId: shipment.shipmentId,
      vehicleId: shipment.vehicleId,
      location: shipment.currentHub,
      route: `${shipment.origin} - ${shipment.destination}`,
      status: shipment.status,
      message: messages[shipment.status][Math.floor(Math.random() * messages[shipment.status].length)],
      delayMinutes: shipment.delayMinutes
    };
  }

  private simulateDisconnect() {
    if (this.timerId) window.clearInterval(this.timerId);
    this.timerId = undefined;
    this.setStatus('reconnecting');

    this.reconnectTimerId = window.setTimeout(() => {
      this.backoffMs = Math.min(6_500, Math.round(this.backoffMs * 1.38));
      this.setStatus(Math.random() > 0.08 ? 'connected' : 'failed');
      if (this.status === 'connected') {
        this.timerId = window.setInterval(() => this.emitPayload(), 720);
      } else {
        this.simulateDisconnect();
      }
    }, this.backoffMs);
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    if (status === 'connected') this.backoffMs = 800;
    this.dispatchEvent(new CustomEvent<ConnectionStatus>('status', { detail: status }));
  }
}
