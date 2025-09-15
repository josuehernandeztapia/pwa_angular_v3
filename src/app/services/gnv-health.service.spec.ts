import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GnvHealthService, StationHealthRow } from './gnv-health.service';

describe('GnvHealthService', () => {
  let service: GnvHealthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GnvHealthService]
    });
    service = TestBed.inject(GnvHealthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('CSV parsing with optimized health scoring', () => {
    it('should assign GREEN status for high acceptance rate (≥85% health score)', () => {
      const csvData = `station_id,station_name,file_name,rows_total,rows_accepted,rows_rejected,warnings
STN001,Station Alpha,data.csv,100,95,5,0`;

      const result = service['parseCsv'](csvData);
      
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('green');
      expect(result[0].rowsTotal).toBe(100);
      expect(result[0].rowsAccepted).toBe(95);
      expect(result[0].rowsRejected).toBe(5);
    });

    it('should assign YELLOW status for moderate acceptance rate (65-84% health score)', () => {
      const csvData = `station_id,station_name,file_name,rows_total,rows_accepted,rows_rejected,warnings
STN002,Station Beta,data.csv,100,75,15,10`;

      const result = service['parseCsv'](csvData);
      
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('yellow');
    });

    it('should assign YELLOW status for stations with ≥80% acceptance and ≤10% rejection', () => {
      const csvData = `station_id,station_name,file_name,rows_total,rows_accepted,rows_rejected,warnings
STN003,Station Gamma,data.csv,100,80,10,10`;

      const result = service['parseCsv'](csvData);
      
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('yellow');
    });

    it('should assign RED status for low health scores', () => {
      const csvData = `station_id,station_name,file_name,rows_total,rows_accepted,rows_rejected,warnings
STN004,Station Delta,data.csv,100,50,40,10`;

      const result = service['parseCsv'](csvData);
      
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('red');
    });

    it('should assign RED status when no file or total is 0', () => {
      const csvData = `station_id,station_name,file_name,rows_total,rows_accepted,rows_rejected,warnings
STN005,Station Echo,,0,0,0,0`;

      const result = service['parseCsv'](csvData);
      
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('red');
    });

    it('should correctly weight rejections more heavily than warnings', () => {
      // Station with high warnings but low rejections should score better
      const csvData1 = `station_id,station_name,file_name,rows_total,rows_accepted,rows_rejected,warnings
STN006,Station Warnings,data.csv,100,85,5,50`;

      const result1 = service['parseCsv'](csvData1);

      // Station with low warnings but high rejections should score worse  
      const csvData2 = `station_id,station_name,file_name,rows_total,rows_accepted,rows_rejected,warnings
STN007,Station Rejections,data.csv,100,70,25,5`;

      const result2 = service['parseCsv'](csvData2);

      // Station with warnings should perform better than station with rejections
      expect(result1[0].status).not.toBe('red');
      expect(result2[0].status).toBe('red');
    });
  });

  describe('BFF data normalization with optimized health scoring', () => {
    it('should apply same scoring logic to BFF data', () => {
      const bffData = [{
        stationId: 'STN008',
        stationName: 'Station Zeta',
        fileName: 'data.csv',
        rowsTotal: 100,
        rowsAccepted: 90,
        rowsRejected: 10,
        warnings: 0
      }];

      const result = service['normalize'](bffData);
      
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('green');
      expect(result[0].stationId).toBe('STN008');
    });
  });
});