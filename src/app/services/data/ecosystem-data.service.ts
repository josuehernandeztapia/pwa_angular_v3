import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { 
  Ecosystem,
  Document,
  DocumentStatus,
  Client
} from '../../models/types';

@Injectable({
  providedIn: 'root'
})
export class EcosystemDataService {
  private ecosystemsDB = new Map<string, Ecosystem>();
  private ecosystemsSubject = new BehaviorSubject<Ecosystem[]>([]);

  public ecosystems$ = this.ecosystemsSubject.asObservable();

  constructor() {
    this.initializeEcosystems();
  }

  /**
   * Initialize with exact data from React simulationService.ts
   */
  private initializeEcosystems(): void {
    // Port exacto de initialEcosystems desde React
    const initialEcosystems: Ecosystem[] = [
      { 
        id: 'eco-1', 
        name: 'Ruta 27 de Toluca S.A. de C.V.', 
        status: 'Activo', 
        documents: [
          {id: 'eco-1-doc-1', name: 'Acta Constitutiva de la Ruta', status: DocumentStatus.Aprobado}, 
          {id: 'eco-1-doc-2', name: 'Poder del Representante Legal', status: DocumentStatus.Aprobado}
        ]
      },
      { 
        id: 'eco-2', 
        name: 'Autotransportes de Tlalnepantla', 
        status: 'Expediente Pendiente', 
        documents: [
          {id: 'eco-2-doc-1', name: 'Acta Constitutiva de la Ruta', status: DocumentStatus.Pendiente}
        ]
      },
    ];

    // Initialize ecosystemsDB Map
    this.ecosystemsDB.clear();
    initialEcosystems.forEach(ecosystem => this.ecosystemsDB.set(ecosystem.id, ecosystem));

    // Update observable
    this.ecosystemsSubject.next(Array.from(this.ecosystemsDB.values()));
  }

  /**
   * Get all ecosystems
   */
  getEcosystems(): Observable<Ecosystem[]> {
    return of(Array.from(this.ecosystemsDB.values())).pipe(delay(300));
  }

  /**
   * Get ecosystem by ID
   */
  getEcosystemById(id: string): Observable<Ecosystem | null> {
    return of(this.ecosystemsDB.get(id) || null).pipe(delay(200));
  }

  /**
   * Get active ecosystems
   */
  getActiveEcosystems(): Observable<Ecosystem[]> {
    return of(Array.from(this.ecosystemsDB.values()).filter(eco => eco.status === 'Activo'))
      .pipe(delay(250));
  }

  /**
   * Get ecosystems with pending documents
   */
  getEcosystemsWithPendingDocs(): Observable<Ecosystem[]> {
    return of(Array.from(this.ecosystemsDB.values()).filter(eco => 
      eco.status === 'Expediente Pendiente' || 
      eco.documents.some(doc => doc.status === DocumentStatus.Pendiente)
    )).pipe(delay(300));
  }

  /**
   * Create new ecosystem
   */
  createEcosystem(ecosystemData: Partial<Ecosystem>): Observable<Ecosystem> {
    const newEcosystem: Ecosystem = {
      id: `eco-${Date.now()}`,
      name: ecosystemData.name || 'Nuevo Ecosistema',
      status: 'Expediente Pendiente',
      documents: [
        {
          id: `doc-${Date.now()}-1`,
          name: 'Acta Constitutiva de la Ruta',
          status: DocumentStatus.Pendiente
        },
        {
          id: `doc-${Date.now()}-2`,
          name: 'Poder del Representante Legal',
          status: DocumentStatus.Pendiente
        }
      ],
      ...ecosystemData
    };

    this.ecosystemsDB.set(newEcosystem.id, newEcosystem);
    this.ecosystemsSubject.next(Array.from(this.ecosystemsDB.values()));

    return of(newEcosystem).pipe(delay(500));
  }

  /**
   * Update ecosystem
   */
  updateEcosystem(id: string, updates: Partial<Ecosystem>): Observable<Ecosystem | null> {
    const existingEcosystem = this.ecosystemsDB.get(id);
    if (!existingEcosystem) {
      return of(null).pipe(delay(300));
    }

    const updatedEcosystem = { ...existingEcosystem, ...updates };
    this.ecosystemsDB.set(id, updatedEcosystem);
    this.ecosystemsSubject.next(Array.from(this.ecosystemsDB.values()));

    return of(updatedEcosystem).pipe(delay(400));
  }

  /**
   * Update ecosystem document status
   */
  updateEcosystemDocumentStatus(ecosystemId: string, documentId: string, status: DocumentStatus): Observable<Ecosystem | null> {
    const ecosystem = this.ecosystemsDB.get(ecosystemId);
    if (!ecosystem) {
      return of(null).pipe(delay(200));
    }

    const updatedDocuments = ecosystem.documents.map(doc =>
      doc.id === documentId ? { ...doc, status } : doc
    );

    const updatedEcosystem = {
      ...ecosystem,
      documents: updatedDocuments,
      // Auto-update ecosystem status based on documents
      status: this.calculateEcosystemStatus(updatedDocuments)
    };

    this.ecosystemsDB.set(ecosystemId, updatedEcosystem);
    this.ecosystemsSubject.next(Array.from(this.ecosystemsDB.values()));

    return of(updatedEcosystem).pipe(delay(400));
  }

  /**
   * Calculate ecosystem status based on document completion
   */
  private calculateEcosystemStatus(documents: Document[]): 'Activo' | 'Expediente Pendiente' {
    const allApproved = documents.every(doc => doc.status === DocumentStatus.Aprobado);
    return allApproved ? 'Activo' : 'Expediente Pendiente';
  }

  /**
   * Add document to ecosystem
   */
  addEcosystemDocument(ecosystemId: string, documentData: Omit<Document, 'id'>): Observable<Ecosystem | null> {
    const ecosystem = this.ecosystemsDB.get(ecosystemId);
    if (!ecosystem) {
      return of(null).pipe(delay(200));
    }

    const newDocument: Document = {
      id: `doc-${Date.now()}`,
      ...documentData
    };

    const updatedEcosystem = {
      ...ecosystem,
      documents: [...ecosystem.documents, newDocument]
    };

    this.ecosystemsDB.set(ecosystemId, updatedEcosystem);
    this.ecosystemsSubject.next(Array.from(this.ecosystemsDB.values()));

    return of(updatedEcosystem).pipe(delay(300));
  }

  /**
   * Search ecosystems
   */
  searchEcosystems(query: string): Observable<Ecosystem[]> {
    const lowerQuery = query.toLowerCase();
    const matchingEcosystems = Array.from(this.ecosystemsDB.values()).filter(ecosystem =>
      ecosystem.name.toLowerCase().includes(lowerQuery) ||
      ecosystem.status.toLowerCase().includes(lowerQuery)
    );

    return of(matchingEcosystems).pipe(delay(400));
  }

  /**
   * Get ecosystem statistics
   */
  getEcosystemStats(): Observable<{
    total: number;
    active: number;
    pending: number;
    documentCompletionRate: number;
  }> {
    const ecosystems = Array.from(this.ecosystemsDB.values());
    const active = ecosystems.filter(eco => eco.status === 'Activo').length;
    const pending = ecosystems.filter(eco => eco.status === 'Expediente Pendiente').length;
    
    const totalDocs = ecosystems.reduce((sum, eco) => sum + eco.documents.length, 0);
    const approvedDocs = ecosystems.reduce((sum, eco) => 
      sum + eco.documents.filter(doc => doc.status === DocumentStatus.Aprobado).length, 0);
    
    const documentCompletionRate = totalDocs > 0 ? (approvedDocs / totalDocs) * 100 : 0;

    return of({
      total: ecosystems.length,
      active,
      pending,
      documentCompletionRate
    }).pipe(delay(300));
  }

  /**
   * Get ecosystem members (clients in ecosystem)
   */
  getEcosystemMembers(ecosystemId: string, clientDataService: any): Observable<Client[]> {
    // This would typically be injected, but for demo purposes we'll return mock data
    return of([]).pipe(delay(300));
  }

  /**
   * Approve all pending documents for ecosystem
   */
  approveAllDocuments(ecosystemId: string): Observable<Ecosystem | null> {
    const ecosystem = this.ecosystemsDB.get(ecosystemId);
    if (!ecosystem) {
      return of(null).pipe(delay(200));
    }

    const updatedDocuments = ecosystem.documents.map(doc => ({
      ...doc,
      status: DocumentStatus.Aprobado
    }));

    const updatedEcosystem = {
      ...ecosystem,
      documents: updatedDocuments,
      status: 'Activo' as const
    };

    this.ecosystemsDB.set(ecosystemId, updatedEcosystem);
    this.ecosystemsSubject.next(Array.from(this.ecosystemsDB.values()));

    return of(updatedEcosystem).pipe(delay(500));
  }

  /**
   * Get document progress for ecosystem
   */
  getDocumentProgress(ecosystemId: string): Observable<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    percentage: number;
  } | null> {
    const ecosystem = this.ecosystemsDB.get(ecosystemId);
    if (!ecosystem) {
      return of(null).pipe(delay(200));
    }

    const total = ecosystem.documents.length;
    const approved = ecosystem.documents.filter(doc => doc.status === DocumentStatus.Aprobado).length;
    const pending = ecosystem.documents.filter(doc => doc.status === DocumentStatus.Pendiente).length;
    const rejected = ecosystem.documents.filter(doc => doc.status === DocumentStatus.Rechazado).length;
    const percentage = total > 0 ? (approved / total) * 100 : 0;

    return of({
      total,
      approved,
      pending,
      rejected,
      percentage
    }).pipe(delay(250));
  }
}