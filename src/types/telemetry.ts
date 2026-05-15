export type Severity = 'info' | 'warning' | 'critical';
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'failed';
export type TimeRangeKey = '15m' | '1h' | '6h' | '24h';
export type ShipmentStatus = 'in_transit' | 'at_hub' | 'delayed' | 'delivered' | 'exception';
export type NigeriaRegion = 'South West' | 'South South' | 'South East' | 'North Central' | 'North West' | 'North East';

export interface LogisticsPoint {
  id: string;
  timestamp: number;
  activeShipments: number;
  deliveredToday: number;
  delayedShipments: number;
  onTimeRate: number;
  avgDelayMinutes: number;
  activeVehicles: number;
  hubBacklog: number;
  exceptionCount: number;
  routeEfficiency: number;
  revenueAtRisk: number;
  region: NigeriaRegion;
  hub: string;
}

export interface ShipmentSnapshot {
  shipmentId: string;
  vehicleId: string;
  routeId: string;
  origin: string;
  destination: string;
  currentHub: string;
  region: NigeriaRegion;
  status: ShipmentStatus;
  progress: number;
  etaMinutes: number;
  delayMinutes: number;
  latitude: number;
  longitude: number;
  cargo: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: number;
  severity: Severity;
  shipmentId: string;
  vehicleId: string;
  location: string;
  route: string;
  status: ShipmentStatus;
  message: string;
  delayMinutes: number;
}

export interface StreamPayload {
  point: LogisticsPoint;
  shipment: ShipmentSnapshot;
  event: ActivityEvent;
}

export interface ChartDataset {
  key: keyof Pick<
    LogisticsPoint,
    | 'activeShipments'
    | 'deliveredToday'
    | 'delayedShipments'
    | 'onTimeRate'
    | 'avgDelayMinutes'
    | 'activeVehicles'
    | 'hubBacklog'
    | 'exceptionCount'
    | 'routeEfficiency'
    | 'revenueAtRisk'
  >;
  label: string;
  color: string;
  unit: string;
}
