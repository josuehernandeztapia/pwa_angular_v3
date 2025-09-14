import { Injectable } from '@nestjs/common';

@Injectable()
export class GnvService {
  getHealth(date?: string) {
    // Stub: return fixed set with green/yellow/red
    const d = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return [
      {
        stationId: 'AGS-01',
        stationName: 'Estación Aguascalientes 01',
        fileName: `ags01_${d}.csv`,
        rowsTotal: 1200,
        rowsAccepted: 1200,
        rowsRejected: 0,
        warnings: 0,
        status: 'green',
        updatedAt: `${d}T07:12:00Z`,
      },
      {
        stationId: 'EDMX-11',
        stationName: 'Estación EdoMex 11',
        fileName: `edmx11_${d}.csv`,
        rowsTotal: 980,
        rowsAccepted: 940,
        rowsRejected: 40,
        warnings: 3,
        status: 'yellow',
        updatedAt: `${d}T07:22:00Z`,
      },
      {
        stationId: 'AGS-02',
        stationName: 'Estación Aguascalientes 02',
        fileName: '',
        rowsTotal: 0,
        rowsAccepted: 0,
        rowsRejected: 0,
        warnings: 0,
        status: 'red',
        updatedAt: `${d}T07:00:00Z`,
      },
    ];
  }

  getTemplateCsv(): string {
    return 'station_id,station_name,file_name,rows_total,rows_accepted,rows_rejected,warnings\nSAMPLE-01,Estación Ejemplo 01,example.csv,100,100,0,0\n';
  }

  getGuidePdf(): Buffer {
    // Very small one-page PDF (stub)
    const pdf = `%PDF-1.1\n1 0 obj<<>>endobj\n2 0 obj<< /Length 44 >>stream\nBT /F1 24 Tf 72 720 Td (GNV Guide Stub) Tj ET\nendstream endobj\n3 0 obj<< /Type /Page /Parent 4 0 R /Contents 2 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 612 792] >>endobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n6 0 obj<< /Type /Catalog /Pages 4 0 R >>endobj\nxref\n0 7\n0000000000 65535 f \n0000000010 00000 n \n0000000033 00000 n \n0000000123 00000 n \n0000000255 00000 n \n0000000351 00000 n \n0000000421 00000 n \ntrailer<< /Size 7 /Root 6 0 R >>\nstartxref\n488\n%%EOF`;
    return Buffer.from(pdf);
  }
}

