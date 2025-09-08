import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Client, DOC_NAME_COMPROBANTE, DOC_NAME_INE, DOC_NAME_KYC_CONTAINS, DocumentStatus, EventType } from '../models/types';
import { DataService } from './data.service';

// Port exacto de TypeScript declarations desde React types.ts líneas 3-14
declare global {
  interface HTMLElementTagNameMap {
    'metamap-button': HTMLElement;
  }
}

@Injectable({
  providedIn: 'root'
})
export class MetaMapService {

  // Port exacto de production MetaMap credentials desde React
  private readonly METAMAP_CONFIG = {
    clientId: environment.services?.metamap?.clientId || '',
    flowId: environment.services?.metamap?.flowId || '',
    sdkUrl: 'https://sdk.getmati.com'
  };

  // Event subjects for MetaMap callbacks
  private kycSuccessSubject = new Subject<{ clientId: string; verificationData: any }>();
  private kycExitSubject = new Subject<{ clientId: string; reason: string }>();

  public kycSuccess$ = this.kycSuccessSubject.asObservable();
  public kycExit$ = this.kycExitSubject.asObservable();

  constructor(private clientData: DataService) { 
    this.initializeMetaMapSDK();
  }

  /**
   * Port exacto de MetaMap SDK initialization
   */
  private initializeMetaMapSDK(): void {
    if (typeof window !== 'undefined' && !document.querySelector('script[src*="getmati.com"]')) {
      const script = document.createElement('script');
      script.src = this.METAMAP_CONFIG.sdkUrl;
      script.async = true;
      document.head.appendChild(script);
    }
  }

  /**
   * Port exacto de createMetaMapButton desde React KycModalContent component líneas 546-580
   */
  createKycButton(
    containerId: string, 
    client: Client,
    onSuccess?: (data: any) => void,
    onExit?: (reason: string) => void
  ): Observable<(HTMLElement & { clientid?: string; flowid?: string; metadata?: string }) | null> {
    return new Observable(observer => {
      const container = document.getElementById(containerId);
      if (!container) {
        observer.error(`Container with ID ${containerId} not found`);
        return;
      }

      // Create metamap-button element (exact port from React)
      const metamapButton = document.createElement('metamap-button') as HTMLElement & { clientid?: string; flowid?: string; metadata?: string };
      (metamapButton as any).clientid = this.METAMAP_CONFIG.clientId;
      (metamapButton as any).flowid = this.METAMAP_CONFIG.flowId;
      (metamapButton as any).metadata = JSON.stringify({ 
        clientId: client.id, 
        clientName: client.name 
      });

      // Port exacto de event listeners desde React useEffect
      const handleSuccess = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        const verificationData = detail;
        this.kycSuccessSubject.next({ clientId: client.id, verificationData });
        onSuccess?.(verificationData);
      };

      const handleExit = (event: Event) => {
        const detail = (event as CustomEvent).detail as any;
        const reason = detail?.reason || 'User cancelled';
        this.kycExitSubject.next({ clientId: client.id, reason });
        onExit?.(reason);
      };

      metamapButton.addEventListener('metamap:verificationSuccess', handleSuccess as any);
      metamapButton.addEventListener('metamap:userFinished', handleExit as any);

      // Add to container
      container.appendChild(metamapButton);

      observer.next(metamapButton);
      observer.complete();

      // Cleanup function
      return () => {
        metamapButton.removeEventListener('metamap:verificationSuccess', handleSuccess as any);
        metamapButton.removeEventListener('metamap:userFinished', handleExit as any);
        if (metamapButton.parentNode) {
          (metamapButton.parentNode as Node).removeChild(metamapButton);
        }
      };
    });
  }

  /**
   * Port exacto de completeKyc desde React simulationService.ts líneas 515-522
   */
  completeKyc(clientId: string, verificationData?: any): Observable<Client> {
    return new Observable<Client>(observer => {
      this.clientData.getClientById(clientId).subscribe(client => {
        if (!client) {
          observer.error('Client not found');
          return;
        }

        // Find and update KYC document status (exact port from React)
        const updatedDocs = client.documents.map(doc => {
          if (doc.name.includes('Verificación Biométrica')) {
            return {
              ...doc,
              status: DocumentStatus.Aprobado,
              completedAt: new Date(),
              verificationId: verificationData?.verificationId,
              verificationScore: verificationData?.score
            };
          }
          return doc;
        });

        const updatedClient: Client = {
          ...client,
          documents: updatedDocs,
          events: [
            ...client.events,
            {
              id: `${clientId}-evt-${Date.now()}`,
              timestamp: new Date(),
              message: 'Verificación biométrica completada exitosamente.',
              actor: 'Cliente' as any,
              type: EventType.KYCCompleted as any
            }
          ],
          // Update health score on KYC completion
          healthScore: Math.min((client.healthScore || 0) + 15, 100)
        };

        this.clientData.updateClient(updatedClient.id, updatedClient).subscribe(() => {
          observer.next(updatedClient);
          observer.complete();
        });
      });
    }).pipe(delay(800));
  }

  /**
   * Port exacto de KYC prerequisite validation desde React KycButton component líneas 639-673
   */
  validateKycPrerequisites(client: Client): {
    canStartKyc: boolean;
    isKycComplete: boolean;
    missingDocs: string[];
    tooltipMessage: string;
  } {
    const ine = client.documents.find(d => d.name === DOC_NAME_INE);
    const comprobante = client.documents.find(d => d.name === DOC_NAME_COMPROBANTE);
    const kyc = client.documents.find(d => d.name.includes(DOC_NAME_KYC_CONTAINS));
    
    const coreDocsApproved = ine?.status === DocumentStatus.Aprobado && 
                            comprobante?.status === DocumentStatus.Aprobado;
    const isKycComplete = kyc?.status === DocumentStatus.Aprobado;
    
    const missingDocs: string[] = [];
    if (ine?.status !== DocumentStatus.Aprobado) missingDocs.push(DOC_NAME_INE);
    if (comprobante?.status !== DocumentStatus.Aprobado) missingDocs.push(DOC_NAME_COMPROBANTE);

    let tooltipMessage = '';
    if (isKycComplete) {
      tooltipMessage = 'El KYC ya ha sido aprobado.';
    } else if (!coreDocsApproved) {
      tooltipMessage = 'Se requiere aprobar INE y Comprobante de Domicilio para iniciar KYC.';
    } else {
      tooltipMessage = 'Listo para iniciar verificación biométrica.';
    }

    return {
      canStartKyc: coreDocsApproved && !isKycComplete,
      isKycComplete,
      missingDocs,
      tooltipMessage
    };
  }

  /**
   * Get KYC verification status details
   */
  getKycStatus(client: Client): {
    status: 'not_started' | 'prerequisites_missing' | 'ready' | 'in_progress' | 'completed' | 'failed';
    statusMessage: string;
    canRetry: boolean;
    verificationId?: string;
    completedAt?: Date;
  } {
    const validation = this.validateKycPrerequisites(client);
    const kycDoc = client.documents.find(d => d.name.includes(DOC_NAME_KYC_CONTAINS));
    
    if (!kycDoc) {
      return {
        status: 'not_started',
        statusMessage: 'KYC no configurado para este cliente',
        canRetry: false
      };
    }

    switch (kycDoc.status) {
      case DocumentStatus.Aprobado:
        return {
          status: 'completed',
          statusMessage: 'Verificación biométrica completada',
          canRetry: false,
          verificationId: (kycDoc as any).verificationId,
          completedAt: (kycDoc as any).completedAt
        };
      
      case DocumentStatus.Rechazado:
        return {
          status: 'failed',
          statusMessage: 'Verificación biométrica falló',
          canRetry: true
        };
        
      case DocumentStatus.EnRevision:
        return {
          status: 'in_progress',
          statusMessage: 'Verificación en proceso',
          canRetry: false
        };
        
      default:
        if (!validation.canStartKyc) {
          return {
            status: 'prerequisites_missing',
            statusMessage: validation.tooltipMessage,
            canRetry: false
          };
        }
        
        return {
          status: 'ready',
          statusMessage: 'Listo para verificación biométrica',
          canRetry: false
        };
    }
  }

  /**
   * Simulate KYC failure for testing
   */
  simulateKycFailure(clientId: string, reason: string = 'Identity verification failed'): Observable<Client> {
    return new Observable<Client>(observer => {
      this.clientData.getClientById(clientId).subscribe(client => {
        if (!client) {
          observer.error('Client not found');
          return;
        }

        const updatedDocs = client.documents.map(doc => {
          if (doc.name.includes('Verificación Biométrica')) {
            return {
              ...doc,
              status: DocumentStatus.Rechazado,
              reviewNotes: reason,
              reviewedAt: new Date()
            };
          }
          return doc;
        });

        const updatedClient: Client = {
          ...client,
          documents: updatedDocs,
          events: [
            ...client.events,
            {
              id: `${clientId}-evt-${Date.now()}`,
              timestamp: new Date(),
              message: `Verificación biométrica falló: ${reason}`,
              actor: 'Sistema' as any,
              type: 'KYC_FAILED' as any
            }
          ]
        };

        this.clientData.updateClient(updatedClient.id, updatedClient).subscribe(() => {
          observer.next(updatedClient);
          observer.complete();
        });
      });
    }).pipe(delay(500));
  }

  /**
   * Check MetaMap SDK availability
   */
  checkSDKAvailability(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      if (typeof window === 'undefined') {
        observer.next(false);
        observer.complete();
        return;
      }

      const checkSDK = () => {
        const sdkLoaded = !!(window as any).Mati || !!document.querySelector('metamap-button') || Array.from(document.querySelectorAll('div')).some(d => (d as any).dataset?.tag === 'METAMAP-BUTTON');
        observer.next(sdkLoaded);
        observer.complete();
      };

      // Check immediately
      if (document.readyState === 'complete') {
        checkSDK();
      } else {
        // Wait for page load
        window.addEventListener('load', checkSDK);
      }
    }).pipe(delay(100));
  }
}