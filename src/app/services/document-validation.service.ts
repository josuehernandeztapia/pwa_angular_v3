import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BusinessFlow, Client, Document, Market } from '../models/types';

export interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  market?: Market;
  flow?: BusinessFlow;
  condition?: (client: Client) => boolean;
  validationRules: DocumentValidationRule[];
  expirationMonths?: number;
  maxFileSize?: number; // MB
  allowedFormats?: string[];
}

export interface DocumentValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'format' | 'content' | 'expiration' | 'signature' | 'official';
  validator: (document: Document, client?: Client) => DocumentValidationResult;
  severity: 'error' | 'warning' | 'info';
}

export interface DocumentValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: DocumentIssue[];
  suggestions: string[];
  autoCorrections: DocumentAutoCorrection[];
}

export interface DocumentIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  field?: string;
  severity: number; // 1-10
  fixable: boolean;
}

export interface DocumentAutoCorrection {
  type: 'format' | 'data' | 'metadata';
  description: string;
  originalValue: any;
  correctedValue: any;
  confidence: number; // 0-100
}

export interface DocumentComplianceReport {
  clientId: string;
  market: Market;
  flow: BusinessFlow;
  overallScore: number;
  requiredDocuments: DocumentRequirement[];
  submittedDocuments: Document[];
  missingDocuments: DocumentRequirement[];
  validDocuments: Document[];
  invalidDocuments: Document[];
  warningDocuments: Document[];
  complianceLevel: 'complete' | 'partial' | 'insufficient' | 'non-compliant';
  blockingIssues: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface EcosystemDocumentValidation {
  ecosystemId: string;
  constitutiveActValid: boolean;
  rfcValid: boolean;
  bankStatementsValid: boolean;
  memberRegistryValid: boolean;
  boardResolutionValid: boolean;
  overallValid: boolean;
  validationDetails: { [documentType: string]: DocumentValidationResult };
  ecosystemRiskLevel: 'low' | 'medium' | 'high';
  validationNotes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentValidationService {

  private documentRequirements: DocumentRequirement[] = [];
  private validationRules: DocumentValidationRule[] = [];

  constructor() {
    this.initializeDocumentRequirements();
    this.initializeValidationRules();
  }

  /**
   * Validate individual document against business rules
   */
  validateDocument(document: Document, client?: Client): Observable<DocumentValidationResult> {
    const applicableRules = this.getApplicableRules(document, client);
    const results = applicableRules.map(rule => rule.validator(document, client));
    
    const consolidatedResult = this.consolidateValidationResults(results);
    
    // Add auto-corrections based on common issues
    consolidatedResult.autoCorrections = this.generateAutoCorrections(document, consolidatedResult.issues);

    return of(consolidatedResult).pipe(delay(300));
  }

  /**
   * Generate complete compliance report for client
   */
  generateComplianceReport(client: Client): Observable<DocumentComplianceReport> {
    const requiredDocs = this.getRequiredDocuments((client.market || 'all') as any, client.flow, client);
    const submittedDocs = client.documents || [];
    
    // Find missing documents
    const missingDocs = requiredDocs.filter(reqDoc => 
      !submittedDocs.some(subDoc => 
        subDoc.name.toLowerCase().includes(reqDoc.name.toLowerCase()) ||
        reqDoc.name.toLowerCase().includes(subDoc.name.toLowerCase())
      )
    );

    // Validate submitted documents
    const validDocs: Document[] = [];
    const invalidDocs: Document[] = [];
    const warningDocs: Document[] = [];

    submittedDocs.forEach(doc => {
      const validation = this.validateDocumentSync(doc, client);
      if (validation.valid) {
        validDocs.push(doc);
      } else {
        const hasErrors = validation.issues.some(issue => issue.type === 'error');
        if (hasErrors) {
          invalidDocs.push(doc);
        } else {
          warningDocs.push(doc);
        }
      }
    });

    // Calculate overall compliance
    const totalRequired = requiredDocs.length;
    const totalValid = validDocs.length;
    const overallScore = totalRequired > 0 ? (totalValid / totalRequired) * 100 : 100;

    let complianceLevel: 'complete' | 'partial' | 'insufficient' | 'non-compliant' = 'non-compliant';
    if (overallScore >= 100) complianceLevel = 'complete';
    else if (overallScore >= 80) complianceLevel = 'partial';
    else if (overallScore >= 50) complianceLevel = 'insufficient';

    const blockingIssues = this.identifyBlockingIssues(client, missingDocs, invalidDocs);
    const recommendations = this.generateComplianceRecommendations(client, missingDocs, invalidDocs);
    const nextSteps = this.generateNextSteps(client, missingDocs, invalidDocs, complianceLevel);

    const report: DocumentComplianceReport = {
      clientId: client.id,
      market: (client.market || 'all') as any,
      flow: client.flow,
      overallScore,
      requiredDocuments: requiredDocs,
      submittedDocuments: submittedDocs,
      missingDocuments: missingDocs,
      validDocuments: validDocs,
      invalidDocuments: invalidDocs,
      warningDocuments: warningDocs,
      complianceLevel,
      blockingIssues,
      recommendations,
      nextSteps
    };

    return of(report).pipe(delay(600));
  }

  /**
   * Validate ecosystem documents for EdoMex clients
   */
  validateEcosystemDocuments(
    ecosystemId: string,
    documents: Document[]
  ): Observable<EcosystemDocumentValidation> {
    
    // Documentos de la ruta/ecosistema
    const constitutiveAct = documents.find(d => d.name.includes('Acta Constitutiva'));
    const poderes = documents.find(d => d.name.includes('Poderes'));
    const ineRepresentante = documents.find(d => d.name.includes('INE Representante'));
    const rfcRuta = documents.find(d => d.name.includes('Constancia Situación Fiscal') && d.name.includes('Ruta'));
    
    // Documentos adicionales para agremiados (CRÍTICOS)
    const cartaAvalRuta = documents.find(d => d.name.includes('Carta Aval de Ruta'));
    const cartaAntiguedad = documents.find(d => d.name.includes('Carta de Antigüedad'));

    const validationDetails: { [documentType: string]: DocumentValidationResult } = {};

    // Validate each ecosystem document type
    const constitutiveActValid = constitutiveAct 
      ? this.validateConstitutiveAct(constitutiveAct) 
      : false;
    
    const poderesValid = poderes 
      ? this.validatePoderes(poderes) 
      : false;
    
    const ineRepresentanteValid = ineRepresentante 
      ? this.validateINERepresentante(ineRepresentante) 
      : false;
      
    const rfcRutaValid = rfcRuta 
      ? this.validateRFCRuta(rfcRuta) 
      : false;
    
    // Documentos CRÍTICOS del agremiado
    const cartaAvalRutaValid = cartaAvalRuta 
      ? this.validateCartaAvalRuta(cartaAvalRuta) 
      : false;
    
    const cartaAntiguedadValid = cartaAntiguedad 
      ? this.validateCartaAntiguedad(cartaAntiguedad) 
      : false;

    // Store detailed validation results
    if (constitutiveAct) {
      validationDetails['constitutive_act'] = this.validateDocumentSync(constitutiveAct);
    }
    const rfc = rfcRuta;
    if (rfc) {
      validationDetails['rfc'] = this.validateDocumentSync(rfc);
    }

    // Derivar estatus adicionales para compatibilidad
    const rfcValid = rfcRutaValid;
    const memberRegistry = documents.find(d => d.name.includes('Padrón') || d.name.includes('Registro de Socios'));
    const boardResolution = documents.find(d => d.name.includes('Poder del Representante Legal'));
    const bankStatements = documents.find(d => d.name.includes('Estado de Cuenta') || d.name.includes('Estados de Cuenta'));

    const memberRegistryValid = memberRegistry ? this.validateDocumentSync(memberRegistry).valid : false;
    const boardResolutionValid = boardResolution ? this.validatePoderes(boardResolution) : false;
    const bankStatementsValid = bankStatements ? this.validateDocumentSync(bankStatements).valid : false;

    // Make bank statements optional for ecosystem validation
    const overallValid = constitutiveActValid && rfcValid && 
                        memberRegistryValid && boardResolutionValid;

    // Assess ecosystem risk level
    let ecosystemRiskLevel: 'low' | 'medium' | 'high' = 'high';
    const validDocCount = [constitutiveActValid, rfcValid, 
                          memberRegistryValid, boardResolutionValid]
                          .filter(Boolean).length;
    
    if (validDocCount >= 5) ecosystemRiskLevel = 'low';
    else if (validDocCount >= 3) ecosystemRiskLevel = 'medium';

    const validationNotes = this.generateEcosystemValidationNotes(
      ecosystemId, 
      {constitutiveActValid, rfcValid, bankStatementsValid, memberRegistryValid, boardResolutionValid}
    );

    const validation: EcosystemDocumentValidation = {
      ecosystemId,
      constitutiveActValid,
      rfcValid,
      bankStatementsValid,
      memberRegistryValid,
      boardResolutionValid,
      overallValid,
      validationDetails,
      ecosystemRiskLevel,
      validationNotes
    };

    return of(validation).pipe(delay(800));
  }

  /**
   * Get required documents for specific client profile
   */
  getRequiredDocuments(
    market: Market, 
    flow: BusinessFlow, 
    client?: Client
  ): DocumentRequirement[] {
    return this.documentRequirements.filter(req => {
      // Market filter
      if (req.market && req.market !== market) return false;
      
      // Flow filter
      if (req.flow && req.flow !== flow) return false;
      
      // Condition filter
      if (req.condition && client && !req.condition(client)) return false;
      
      return req.required;
    });
  }

  /**
   * Detect document type from filename/content
   */
  detectDocumentType(filename: string, content?: string): Observable<{
    detectedType: string;
    confidence: number;
    suggestions: string[];
  }> {
    const filename_lower = filename.toLowerCase();
    let detectedType = 'unknown';
    let confidence = 0;
    const suggestions: string[] = [];

    // Basic filename detection
    if (filename_lower.includes('ine')) {
      detectedType = 'INE';
      confidence = 90;
    } else if (filename_lower.includes('constancia') && filename_lower.includes('fiscal')) {
      detectedType = 'Constancia de Situación Fiscal';
      confidence = 85;
    } else if (filename_lower.includes('concesion')) {
      detectedType = 'Copia Concesión';
      confidence = 85;
    } else if (filename_lower.includes('tarjeta') && filename_lower.includes('circulacion')) {
      detectedType = 'Tarjeta de Circulación';
      confidence = 85;
    } else if (filename_lower.includes('comprobante') && filename_lower.includes('domicilio')) {
      detectedType = 'Comprobante de Domicilio';
      confidence = 80;
    } else if (filename_lower.includes('acta') && filename_lower.includes('constitutiva')) {
      detectedType = 'Acta Constitutiva de la Ruta';
      confidence = 85;
    } else if (filename_lower.includes('poderes')) {
      detectedType = 'Poderes';
      confidence = 90;
    } else if (filename_lower.includes('carta') && filename_lower.includes('aval')) {
      detectedType = 'Carta Aval de Ruta';
      confidence = 95;
    } else if (filename_lower.includes('carta') && filename_lower.includes('antiguedad')) {
      detectedType = 'Carta de Antigüedad de la Ruta';
      confidence = 90;
    } else if (filename_lower.includes('factura')) {
      detectedType = 'Copia Factura de Unidad';
      confidence = 85;
    }

    // Generate suggestions for improvement
    if (confidence < 70) {
      suggestions.push('Considere renombrar el archivo con un nombre más descriptivo');
      suggestions.push('Incluya el tipo de documento en el nombre del archivo');
    }

    return of({
      detectedType,
      confidence,
      suggestions
    }).pipe(delay(150));
  }

  // === PRIVATE METHODS ===

  private initializeDocumentRequirements(): void {
    this.documentRequirements = [
      // Universal requirements
      {
        id: 'ine',
        name: 'INE',
        description: 'Identificación oficial vigente',
        required: true,
        validationRules: [],
        expirationMonths: 120, // 10 years
        maxFileSize: 5,
        allowedFormats: ['pdf', 'jpg', 'png']
      },
      {
        id: 'curp',
        name: 'CURP',
        description: 'Clave Única de Registro de Población',
        required: true,
        validationRules: [],
        maxFileSize: 2,
        allowedFormats: ['pdf', 'jpg', 'png']
      },
      {
        id: 'rfc',
        name: 'RFC',
        description: 'Registro Federal de Contribuyentes',
        required: true,
        validationRules: [],
        maxFileSize: 2,
        allowedFormats: ['pdf']
      },

      // AGS specific
      {
        id: 'comprobante-ingresos-ags',
        name: 'Comprobante de Ingresos',
        description: 'Comprobante de ingresos últimos 3 meses',
        required: true,
        market: 'aguascalientes',
        validationRules: [],
        maxFileSize: 10,
        allowedFormats: ['pdf']
      },

      // EdoMex specific
      {
        id: 'acta-constitutiva-ecosistema',
        name: 'Acta Constitutiva del Ecosistema',
        description: 'Acta constitutiva del ecosistema validada',
        required: true,
        market: 'edomex',
        validationRules: [],
        maxFileSize: 15,
        allowedFormats: ['pdf']
      },
      {
        id: 'padron-socios',
        name: 'Padrón de Socios Actualizado',
        description: 'Lista actualizada de socios del ecosistema',
        required: true,
        market: 'edomex',
        flow: BusinessFlow.CreditoColectivo,
        validationRules: [],
        maxFileSize: 5,
        allowedFormats: ['pdf', 'xlsx']
      }
    ];
  }

  private initializeValidationRules(): void {
    this.validationRules = [
      {
        id: 'file-format',
        name: 'Formato de Archivo',
        description: 'Validar formato de archivo permitido',
        type: 'format',
        severity: 'error',
        validator: (doc: Document) => this.validateFileFormat(doc)
      },
      {
        id: 'file-size',
        name: 'Tamaño de Archivo',
        description: 'Validar tamaño máximo de archivo',
        type: 'format',
        severity: 'warning',
        validator: (doc: Document) => this.validateFileSize(doc)
      },
      {
        id: 'document-expiration',
        name: 'Vigencia del Documento',
        description: 'Verificar que el documento esté vigente',
        type: 'expiration',
        severity: 'error',
        validator: (doc: Document) => this.validateExpiration(doc)
      },
      {
        id: 'content-legibility',
        name: 'Legibilidad del Contenido',
        description: 'Verificar que el contenido sea legible',
        type: 'content',
        severity: 'warning',
        validator: (doc: Document) => this.validateLegibility(doc)
      }
    ];
  }

  private getApplicableRules(document: Document, client?: Client): DocumentValidationRule[] {
    // Return all rules for now - in real implementation, filter by document type
    return this.validationRules;
  }

  private validateDocumentSync(document: Document, client?: Client): DocumentValidationResult {
    const applicableRules = this.getApplicableRules(document, client);
    const results = applicableRules.map(rule => rule.validator(document, client));
    
    return this.consolidateValidationResults(results);
  }

  private consolidateValidationResults(results: DocumentValidationResult[]): DocumentValidationResult {
    const allIssues = results.flatMap(r => r.issues);
    const hasErrors = allIssues.some(issue => issue.type === 'error');
    const averageScore = results.length > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
      : 0;

    return {
      valid: !hasErrors && allIssues.every(issue => issue.type !== 'error'),
      score: averageScore,
      issues: allIssues,
      suggestions: results.flatMap(r => r.suggestions),
      autoCorrections: results.flatMap(r => r.autoCorrections)
    };
  }

  private generateAutoCorrections(document: Document, issues: DocumentIssue[]): DocumentAutoCorrection[] {
    const corrections: DocumentAutoCorrection[] = [];

    issues.forEach(issue => {
      if (issue.fixable) {
        switch (issue.code) {
          case 'FILENAME_FORMAT':
            corrections.push({
              type: 'format',
              description: 'Renombrar archivo con formato estándar',
              originalValue: document.name,
              correctedValue: this.generateStandardFilename(document),
              confidence: 85
            });
            break;
          case 'DATE_FORMAT':
            corrections.push({
              type: 'data',
              description: 'Corregir formato de fecha',
              originalValue: document.uploadedAt,
              correctedValue: new Date().toISOString(),
              confidence: 70
            });
            break;
        }
      }
    });

    return corrections;
  }

  // Document-specific validation methods
  private validateConstitutiveAct(document: Document): boolean {
    return document.status === 'Aprobado' && 
           document.name.includes('Acta Constitutiva');
  }

  private validatePoderes(document: Document): boolean {
    return document.status === 'Aprobado' && 
           document.name.includes('Poderes');
  }

  private validateINERepresentante(document: Document): boolean {
    return document.status === 'Aprobado' && 
           document.name.includes('INE Representante') &&
           this.isDocumentRecent(document, 3650); // INE válido por ~10 años
  }

  private validateRFCRuta(document: Document): boolean {
    return document.status === 'Aprobado' && 
           document.name.includes('Constancia Situación Fiscal');
  }

  private validateCartaAvalRuta(document: Document): boolean {
    // DOCUMENTO CRÍTICO para agremiados
    return document.status === 'Aprobado' && 
           document.name.includes('Carta Aval de Ruta') &&
           this.isDocumentRecent(document, 180); // Válido por 6 meses
  }

  private validateCartaAntiguedad(document: Document): boolean {
    return document.status === 'Aprobado' && 
           document.name.includes('Carta de Antigüedad') &&
           this.isDocumentRecent(document, 90); // Válido por 3 meses
  }

  // Validation rule implementations
  private validateFileFormat(document: Document): DocumentValidationResult {
    const allowedFormats = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExtension = document.name.split('.').pop()?.toLowerCase();
    const valid = fileExtension ? allowedFormats.includes(fileExtension) : false;

    return {
      valid,
      score: valid ? 100 : 0,
      issues: valid ? [] : [{
        type: 'error',
        code: 'INVALID_FORMAT',
        message: `Formato no permitido: ${fileExtension}. Use: ${allowedFormats.join(', ')}`,
        severity: 8,
        fixable: false
      }],
      suggestions: valid ? [] : ['Convierta el archivo a PDF antes de subirlo'],
      autoCorrections: []
    };
  }

  private validateFileSize(document: Document): DocumentValidationResult {
    // Simulate file size validation (would normally check actual file size)
    const maxSizeMB = 10;
    const estimatedSize = document.name.length * 0.1; // Rough estimate
    const valid = estimatedSize <= maxSizeMB;

    return {
      valid: true, // Always pass for now
      score: valid ? 100 : 70,
      issues: valid ? [] : [{
        type: 'warning',
        code: 'FILE_TOO_LARGE',
        message: `Archivo muy grande (${estimatedSize.toFixed(1)}MB). Máximo: ${maxSizeMB}MB`,
        severity: 5,
        fixable: true
      }],
      suggestions: valid ? [] : ['Comprima el archivo o use menor resolución'],
      autoCorrections: []
    };
  }

  private validateExpiration(document: Document): DocumentValidationResult {
    if (!document.expirationDate) {
      return {
        valid: true,
        score: 90,
        issues: [{
          type: 'info',
          code: 'NO_EXPIRATION',
          message: 'Documento sin fecha de expiración definida',
          severity: 2,
          fixable: false
        }],
        suggestions: [],
        autoCorrections: []
      };
    }

    const isExpired = new Date(document.expirationDate) < new Date();
    const valid = !isExpired;

    return {
      valid,
      score: valid ? 100 : 0,
      issues: valid ? [] : [{
        type: 'error',
        code: 'DOCUMENT_EXPIRED',
        message: 'Documento vencido',
        severity: 9,
        fixable: false
      }],
      suggestions: valid ? [] : ['Solicite documento actualizado al cliente'],
      autoCorrections: []
    };
  }

  private validateLegibility(document: Document): DocumentValidationResult {
    // Simulate legibility check - in real implementation would use OCR
    const legibilityScore = 85 + Math.random() * 15; // 85-100%
    const valid = legibilityScore >= 80;

    return {
      valid,
      score: legibilityScore,
      issues: valid ? [] : [{
        type: 'warning',
        code: 'LOW_LEGIBILITY',
        message: 'Documento con baja legibilidad',
        severity: 6,
        fixable: true
      }],
      suggestions: valid ? [] : ['Solicite nueva foto con mejor calidad'],
      autoCorrections: []
    };
  }

  private isDocumentRecent(document: Document, days: number): boolean {
    const documentDate = new Date(document.uploadedAt as any);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return documentDate >= cutoffDate;
  }

  private generateStandardFilename(document: Document): string {
    const type = document.name.includes('INE') ? 'INE' : 'DOCUMENTO';
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${type}_${timestamp}.pdf`;
  }

  private identifyBlockingIssues(
    client: Client, 
    missingDocs: DocumentRequirement[], 
    invalidDocs: Document[]
  ): string[] {
    const issues: string[] = [];

    // EdoMex specific blocking issues
    if (client.market === 'edomex') {
      const missingEcosystem = missingDocs.some(d => d.name.includes('Acta Constitutiva'));
      if (missingEcosystem) {
        issues.push('Falta Acta Constitutiva del Ecosistema (OBLIGATORIO para EdoMex)');
      }
    }

    // Universal blocking issues
    const missingINE = missingDocs.some(d => d.name === 'INE');
    if (missingINE) {
      issues.push('Falta identificación oficial (INE)');
    }

    const expiredDocs = invalidDocs.filter(d => (d as any).expirationDate && new Date((d as any).expirationDate) < new Date());
    if (expiredDocs.length > 0) {
      issues.push(`${expiredDocs.length} documento(s) vencido(s)`);
    }

    return issues;
  }

  private generateComplianceRecommendations(
    client: Client,
    missingDocs: DocumentRequirement[],
    invalidDocs: Document[]
  ): string[] {
    const recommendations: string[] = [];

    if (missingDocs.length > 0) {
      recommendations.push(`Solicitar ${missingDocs.length} documento(s) faltante(s) al cliente`);
    }

    if (invalidDocs.length > 0) {
      recommendations.push(`Revisar y corregir ${invalidDocs.length} documento(s) rechazado(s)`);
    }

    if (client.market === 'edomex' && !client.ecosystemId) {
      recommendations.push('Asignar cliente a ecosistema antes de continuar');
    }

    return recommendations;
  }

  private generateNextSteps(
    client: Client,
    missingDocs: DocumentRequirement[],
    invalidDocs: Document[],
    complianceLevel: string
  ): string[] {
    const steps: string[] = [];

    if (complianceLevel === 'complete') {
      steps.push('Proceder con validación financiera');
      steps.push('Programar entrega de unidad');
    } else {
      if (missingDocs.length > 0) {
        steps.push('1. Contactar cliente para documentos faltantes');
      }
      if (invalidDocs.length > 0) {
        steps.push('2. Solicitar corrección de documentos rechazados');
      }
      steps.push('3. Re-evaluar completitud documental');
    }

    return steps;
  }

  private generateEcosystemValidationNotes(
    ecosystemId: string,
    validationStatus: { [key: string]: boolean }
  ): string[] {
    const notes: string[] = [];
    
    notes.push(`Ecosistema ID: ${ecosystemId}`);
    
    const validCount = Object.values(validationStatus).filter(Boolean).length;
    const totalCount = Object.keys(validationStatus).length;
    
    notes.push(`Documentos válidos: ${validCount}/${totalCount}`);
    
    if (validationStatus['constitutiveActValid']) {
      notes.push('Acta Constitutiva aprobada');
    }
    
    if (!validationStatus['rfcValid']) {
      notes.push('RFC del ecosistema pendiente');
    }
    
    return notes;
  }
}