import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Client, BusinessFlow } from '../models/types';

// Port exacto de interfaces desde React mifieldService.ts líneas 447-492
interface DocumentSigner {
  name: string;
  email: string;
  taxId: string;
  phone?: string;
}

interface DocumentSignData {
  name: string;
  hash: string;
  signers: DocumentSigner[];
  expiresAt: Date;
  metadata: {
    client_id: string;
    contract_type: 'venta_plazo' | 'venta_directa' | 'plan_ahorro' | 'credito_colectivo';
    created_at: string;
  };
}

interface MifieldDocument {
  id: string;
  name: string;
  status: 'pending' | 'signed' | 'expired' | 'cancelled';
  hash: string;
  signers: DocumentSigner[];
  createdAt: Date;
  expiresAt: Date;
  signedAt?: Date;
  signatureUrl?: string;
  metadata: any;
}

interface SignatureResponse {
  success: boolean;
  documentId: string;
  signatureId: string;
  signedAt: Date;
  certificateSerial: string;
  signerInfo: {
    name: string;
    email: string;
    taxId: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MifielService {

  // Port exacto de Mifiel API configuration desde React
  private readonly MIFIEL_CONFIG = {
    apiUrl: 'https://api.mifiel.com',
    appId: process.env['MIFIEL_APP_ID'] || 'demo_app_id',
    secret: process.env['MIFIEL_SECRET'] || 'demo_secret',
    webhook_url: process.env['MIFIEL_WEBHOOK_URL'] || 'https://api.conductores.com/webhooks/mifiel'
  };

  // Simulated document storage
  private documentsDB = new Map<string, MifieldDocument>();

  constructor() { }

  /**
   * Port exacto de generateDocumentHash desde React mifieldService.ts
   */
  static generateDocumentHash(content: string): string {
    // Simulate hash generation (in real implementation use crypto)
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    return btoa(String.fromCharCode(...data)).substring(0, 32);
  }

  /**
   * Port exacto de generateDocumentHashFromFile desde React
   */
  static async generateDocumentHashFromFile(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        resolve(MifielService.generateDocumentHash(content));
      };
      reader.readAsText(file);
    });
  }

  /**
   * Port exacto de createDocument desde React mifieldService.ts
   */
  createDocument(documentData: DocumentSignData): Observable<MifieldDocument> {
    const documentId = `mifiel-${Date.now()}`;
    
    const document: MifieldDocument = {
      id: documentId,
      name: documentData.name,
      status: 'pending',
      hash: documentData.hash,
      signers: documentData.signers,
      createdAt: new Date(),
      expiresAt: documentData.expiresAt,
      signatureUrl: `https://app.mifiel.com/sign/${documentId}`,
      metadata: documentData.metadata
    };

    this.documentsDB.set(documentId, document);
    
    return of(document).pipe(delay(1000));
  }

  /**
   * Port exacto de createContractForClient desde React mifieldService.ts líneas 447-492
   */
  createContractForClient(
    clientId: string,
    clientData: {
      name: string;
      email: string;
      rfc: string;
      phone?: string;
    },
    contractType: 'venta_plazo' | 'venta_directa' | 'plan_ahorro' | 'credito_colectivo',
    contractContent: string | File
  ): Observable<MifieldDocument> {
    return new Observable(observer => {
      const processContract = async () => {
        let hash: string;
        let documentName: string;

        if (typeof contractContent === 'string') {
          hash = MifielService.generateDocumentHash(contractContent);
          documentName = `Contrato ${contractType} - ${clientData.name}`;
        } else {
          hash = await MifielService.generateDocumentHashFromFile(contractContent);
          documentName = contractContent.name;
        }

        const signers: DocumentSigner[] = [
          {
            name: clientData.name,
            email: clientData.email,
            taxId: clientData.rfc,
            phone: clientData.phone
          }
        ];

        // Add company signer for all contracts
        signers.push({
          name: 'Conductores del Mundo S.A. de C.V.',
          email: 'contratos@conductoresdelmundo.com',
          taxId: 'CDM123456ABC'
        });

        const documentData: DocumentSignData = {
          name: documentName,
          hash,
          signers,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          metadata: {
            client_id: clientId,
            contract_type: contractType,
            created_at: new Date().toISOString()
          }
        };

        this.createDocument(documentData).subscribe({
          next: (document) => observer.next(document),
          error: (error) => observer.error(error),
          complete: () => observer.complete()
        });
      };

      processContract();
    });
  }

  /**
   * Port exacto de multi-member contract creation for collective credit
   */
  createCollectiveContract(
    groupMembers: Array<{
      clientId: string;
      name: string;
      email: string;
      rfc: string;
      phone?: string;
    }>,
    contractContent: string,
    groupName: string
  ): Observable<MifieldDocument> {
    const signers: DocumentSigner[] = groupMembers.map(member => ({
      name: member.name,
      email: member.email,
      taxId: member.rfc,
      phone: member.phone
    }));

    // Add company signer
    signers.push({
      name: 'Conductores del Mundo S.A. de C.V.',
      email: 'contratos@conductoresdelmundo.com',
      taxId: 'CDM123456ABC'
    });

    const hash = MifielService.generateDocumentHash(contractContent);
    const documentName = `Contrato Crédito Colectivo - ${groupName}`;

    const documentData: DocumentSignData = {
      name: documentName,
      hash,
      signers,
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days for group contracts
      metadata: {
        client_id: groupMembers.map(m => m.clientId).join(','),
        contract_type: 'credito_colectivo',
        created_at: new Date().toISOString(),
        group_name: groupName,
        member_count: groupMembers.length
      }
    };

    return this.createDocument(documentData);
  }

  /**
   * Get document status
   */
  getDocumentStatus(documentId: string): Observable<MifieldDocument | null> {
    const document = this.documentsDB.get(documentId);
    return of(document || null).pipe(delay(200));
  }

  /**
   * Send signature request to client
   */
  sendSignatureRequest(documentId: string, signerEmail: string): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      const document = this.documentsDB.get(documentId);
      if (!document) {
        observer.error('Document not found');
        return;
      }

      const signer = document.signers.find(s => s.email === signerEmail);
      if (!signer) {
        observer.error('Signer not found');
        return;
      }

      // Simulate sending email
      const message = `Solicitud de firma enviada a ${signer.name} (${signerEmail})`;
      observer.next({ success: true, message });
      observer.complete();
    }).pipe(delay(800));
  }

  /**
   * Simulate signature completion (for testing)
   */
  simulateSignature(documentId: string, signerEmail: string): Observable<SignatureResponse> {
    return new Observable(observer => {
      const document = this.documentsDB.get(documentId);
      if (!document) {
        observer.error('Document not found');
        return;
      }

      const signer = document.signers.find(s => s.email === signerEmail);
      if (!signer) {
        observer.error('Signer not found');
        return;
      }

      // Update document status
      const allSigned = document.signers.every(s => 
        s.email === signerEmail || s.email === 'contratos@conductoresdelmundo.com'
      );
      
      const updatedDocument: MifieldDocument = {
        ...document,
        status: allSigned ? 'signed' : 'pending',
        signedAt: allSigned ? new Date() : document.signedAt
      };

      this.documentsDB.set(documentId, updatedDocument);

      const response: SignatureResponse = {
        success: true,
        documentId,
        signatureId: `sig-${Date.now()}`,
        signedAt: new Date(),
        certificateSerial: `CERT${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        signerInfo: {
          name: signer.name,
          email: signer.email,
          taxId: signer.taxId
        }
      };

      observer.next(response);
      observer.complete();
    }).pipe(delay(1500));
  }

  /**
   * Cancel document signature process
   */
  cancelDocument(documentId: string, reason: string): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      const document = this.documentsDB.get(documentId);
      if (!document) {
        observer.error('Document not found');
        return;
      }

      const updatedDocument: MifieldDocument = {
        ...document,
        status: 'cancelled',
        metadata: {
          ...document.metadata,
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString()
        }
      };

      this.documentsDB.set(documentId, updatedDocument);

      observer.next({ 
        success: true, 
        message: `Documento cancelado: ${reason}` 
      });
      observer.complete();
    }).pipe(delay(400));
  }

  /**
   * Get signature URL for client
   */
  getSignatureUrl(documentId: string, signerEmail: string): Observable<string | null> {
    return new Observable(observer => {
      const document = this.documentsDB.get(documentId);
      if (!document) {
        observer.next(null);
        observer.complete();
        return;
      }

      const signer = document.signers.find(s => s.email === signerEmail);
      if (!signer) {
        observer.next(null);
        observer.complete();
        return;
      }

      // Generate personalized signature URL
      const signatureUrl = `${document.signatureUrl}?signer=${encodeURIComponent(signerEmail)}&token=${btoa(signerEmail + documentId)}`;
      observer.next(signatureUrl);
      observer.complete();
    }).pipe(delay(100));
  }

  /**
   * List documents for client
   */
  getClientDocuments(clientId: string): Observable<MifieldDocument[]> {
    const clientDocs = Array.from(this.documentsDB.values())
      .filter(doc => 
        doc.metadata.client_id === clientId || 
        doc.metadata.client_id.includes(clientId)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return of(clientDocs).pipe(delay(300));
  }

  /**
   * Get document statistics
   */
  getDocumentStats(): Observable<{
    totalDocuments: number;
    pendingSignatures: number;
    completedSignatures: number;
    expiredDocuments: number;
    averageSigningTime: number;
  }> {
    const documents = Array.from(this.documentsDB.values());
    const totalDocuments = documents.length;
    const pendingSignatures = documents.filter(d => d.status === 'pending').length;
    const completedSignatures = documents.filter(d => d.status === 'signed').length;
    const expiredDocuments = documents.filter(d => d.status === 'expired' || d.expiresAt < new Date()).length;
    
    // Calculate average signing time (mock calculation)
    const signedDocs = documents.filter(d => d.status === 'signed' && d.signedAt);
    const averageSigningTime = signedDocs.length > 0 
      ? signedDocs.reduce((acc, doc) => {
          const signingTime = doc.signedAt!.getTime() - doc.createdAt.getTime();
          return acc + signingTime;
        }, 0) / signedDocs.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    return of({
      totalDocuments,
      pendingSignatures,
      completedSignatures,
      expiredDocuments,
      averageSigningTime: Math.round(averageSigningTime * 10) / 10
    }).pipe(delay(200));
  }

  /**
   * Webhook handler for Mifiel callbacks
   */
  handleWebhook(webhookData: any): Observable<{ processed: boolean; documentId?: string }> {
    // Port exacto de webhook handling logic desde React
    const { document_id, event_type, signature_data } = webhookData;
    
    return new Observable(observer => {
      const document = this.documentsDB.get(document_id);
      if (!document) {
        observer.next({ processed: false });
        observer.complete();
        return;
      }

      let updatedStatus: MifieldDocument['status'] = document.status;
      
      switch (event_type) {
        case 'document.signed':
          updatedStatus = 'signed';
          break;
        case 'document.expired':
          updatedStatus = 'expired';
          break;
        case 'document.cancelled':
          updatedStatus = 'cancelled';
          break;
      }

      const updatedDocument: MifieldDocument = {
        ...document,
        status: updatedStatus,
        signedAt: event_type === 'document.signed' ? new Date() : document.signedAt,
        metadata: {
          ...document.metadata,
          webhook_data: webhookData,
          processed_at: new Date().toISOString()
        }
      };

      this.documentsDB.set(document_id, updatedDocument);

      observer.next({ processed: true, documentId: document_id });
      observer.complete();
    }).pipe(delay(300));
  }
}