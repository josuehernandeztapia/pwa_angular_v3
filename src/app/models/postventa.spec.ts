import { isDeliveryData, isPostSalesRecord, ServicePackageEnum } from './postventa';
import { mockDeliveryData, mockPostSalesRecord } from './postventa.mocks';

describe('Postventa type-guards', () => {
  it('should validate DeliveryData', () => {
    const d = mockDeliveryData();
    expect(isDeliveryData(d)).toBeTrue();
    const invalid = { ...d, odometroEntrega: 'x' } as any;
    expect(isDeliveryData(invalid)).toBeFalse();
  });

  it('should validate PostSalesRecord', () => {
    const r = mockPostSalesRecord();
    expect(isPostSalesRecord(r)).toBeTrue();
    const invalid = { ...r, servicePackage: 'gold' } as any;
    expect(isPostSalesRecord(invalid)).toBeFalse();
    const validEnum = { ...r, servicePackage: ServicePackageEnum.Basic };
    expect(isPostSalesRecord(validEnum)).toBeTrue();
  });
});

