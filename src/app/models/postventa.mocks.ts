import { DeliveryChecklistItem, DeliveryData, PostSalesRecord, ServicePackageEnum } from './postventa';

export function mockDeliveryData(): DeliveryData {
  const checklist: DeliveryChecklistItem[] = [
    { item: 'INE verificada', status: 'approved' },
    { item: 'Contrato firmado', status: 'approved' },
    { item: 'Tarjeta de circulación', status: 'with_issues', notes: 'Pendiente reimpresión' }
  ];

  return {
    odometroEntrega: 12,
    fechaEntrega: new Date(),
    horaEntrega: '10:30',
    domicilioEntrega: 'Av. Siempre Viva 123',
    fotosVehiculo: [],
    firmaDigitalCliente: 'https://example.com/signature.png',
    checklistEntrega: checklist,
    incidencias: [],
    entregadoPor: 'user_123'
  };
}

export function mockPostSalesRecord(): PostSalesRecord {
  return {
    id: 'ps_1',
    vin: 'VIN1234567890',
    clientId: 'cli_1',
    postSalesAgent: 'agent_1',
    warrantyStatus: 'active',
    servicePackage: ServicePackageEnum.Premium,
    nextMaintenanceDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    nextMaintenanceKm: 5000,
    odometroEntrega: 12,
    createdAt: new Date(),
    warrantyStart: new Date(),
    warrantyEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
  };
}

