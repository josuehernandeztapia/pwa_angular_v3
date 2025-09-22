import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SimpleAviQuestion {
  id: string;
  text: string;
  order: number;
  isActive: boolean;
  weight: number; // 0-100 (percentage of the question's importance within AVI)
  category: 'personal' | 'operation' | 'business' | 'vehicle' | 'resilience' | 'micro_local';
}

export interface AviConfig {
  haseContribution: number; // Percentage of total HASE score (default 25%)
  questions: SimpleAviQuestion[];
  microLocalQuestions: number; // How many random micro-local questions to add
  isActive: boolean;
}

export interface HaseScore {
  avi_score: number;      // 0-25 (or whatever haseContribution is set to)
  financial_score: number; // Dummy for now
  document_score: number;  // Dummy for now  
  market_score: number;    // Dummy for now
  behavioral_score: number; // Dummy for now
  total: number;           // Sum of all components
}

@Injectable({
  providedIn: 'root'
})
export class AviSimpleConfigService {
  private configSubject = new BehaviorSubject<AviConfig>({
    haseContribution: 25,
    microLocalQuestions: 2,
    isActive: true,
    questions: [
      // Personal (15% of AVI weight)
      { id: 'p1', text: 'Por favor, dígame su nombre completo y edad', order: 1, isActive: true, weight: 5, category: 'personal' },
      { id: 'p2', text: '¿De qué ruta específica es usted?', order: 2, isActive: true, weight: 10, category: 'personal' },
      { id: 'p3', text: '¿Cuántos años lleva trabajando en esa ruta?', order: 3, isActive: true, weight: 15, category: 'personal' },
      
      // Daily Operations (35% of AVI weight)
      { id: 'o1', text: '¿Cuántas vueltas da al día en su ruta?', order: 4, isActive: true, weight: 15, category: 'operation' },
      { id: 'o2', text: '¿De cuántos kilómetros es cada vuelta aproximadamente?', order: 5, isActive: true, weight: 10, category: 'operation' },
      { id: 'o3', text: '¿Cuáles son sus ingresos promedio diarios?', order: 6, isActive: true, weight: 20, category: 'operation' },
      { id: 'o4', text: '¿Cuánto gasta al día en combustible?', order: 7, isActive: true, weight: 15, category: 'operation' },
      { id: 'o5', text: '¿Cuántas vueltas hace con esa carga de combustible?', order: 8, isActive: true, weight: 10, category: 'operation' },
      
      // Business Structure (30% of AVI weight)
      { id: 'b1', text: '¿Cuántos choferes tiene trabajando?', order: 9, isActive: true, weight: 15, category: 'business' },
      { id: 'b2', text: '¿Usted opera la unidad o solo administra el negocio?', order: 10, isActive: true, weight: 10, category: 'business' },
      { id: 'b3', text: '¿Es dueño de concesión o permisionario?', order: 11, isActive: true, weight: 20, category: 'business' },
      
      // Vehicle Information (20% of AVI weight)
      { id: 'v1', text: '¿Qué modelo y año es su unidad, y ya tiene su factura liberada?', order: 12, isActive: true, weight: 12, category: 'vehicle' },
      { id: 'v2', text: '¿Qué tipo de combustible utiliza: GNV, GLP o gasolina?', order: 13, isActive: true, weight: 8, category: 'vehicle' },
      { id: 'v3', text: '¿Solo tiene una unidad o tiene más vehículos?', order: 14, isActive: true, weight: 10, category: 'vehicle' },
      
      // Operational Resilience (25% of AVI weight) - NEW CATEGORY FOR RIESGO OPERATIVO
      { id: 'r1', text: '¿Cómo maneja su ruta cuando llueve fuerte o hay mal tiempo?', order: 15, isActive: true, weight: 12, category: 'resilience' },
      { id: 'r2', text: '¿Qué hace cuando hay obras o bloqueos en su corredor principal?', order: 16, isActive: true, weight: 15, category: 'resilience' },
      { id: 'r3', text: '¿Le afectan mucho las vacaciones escolares en sus ingresos?', order: 17, isActive: true, weight: 10, category: 'resilience' },
      { id: 'r4', text: '¿Ha tenido que adaptarse a cambios en rutas por nuevas regulaciones?', order: 18, isActive: true, weight: 13, category: 'resilience' },
      { id: 'r5', text: '¿Cómo compite cuando llegan nuevos transportistas a su zona?', order: 19, isActive: true, weight: 15, category: 'resilience' }
    ]
  });

  config$ = this.configSubject.asObservable();

  constructor() {
    this.loadConfigFromStorage();
  }

  // Get current configuration
  getConfig(): AviConfig {
    return this.configSubject.value;
  }

  // Update HASE contribution percentage
  updateHaseContribution(percentage: number): void {
    if (percentage >= 0 && percentage <= 100) {
      const config = this.configSubject.value;
      this.configSubject.next({
        ...config,
        haseContribution: percentage
      });
      this.saveConfigToStorage();
    }
  }

  // Toggle AVI system on/off
  toggleAviSystem(isActive: boolean): void {
    const config = this.configSubject.value;
    this.configSubject.next({
      ...config,
      isActive
    });
    this.saveConfigToStorage();
  }

  // Get active questions in order
  getActiveQuestions(): SimpleAviQuestion[] {
    return this.configSubject.value.questions
      .filter(q => q.isActive)
      .sort((a, b) => a.order - b.order);
  }

  // Update question
  updateQuestion(questionId: string, updates: Partial<SimpleAviQuestion>): boolean {
    const config = this.configSubject.value;
    const questionIndex = config.questions.findIndex(q => q.id === questionId);
    
    if (questionIndex === -1) return false;
    
    config.questions[questionIndex] = {
      ...config.questions[questionIndex],
      ...updates
    };
    
    this.configSubject.next({ ...config });
    this.saveConfigToStorage();
    return true;
  }

  // Toggle question active/inactive
  toggleQuestion(questionId: string): boolean {
    const config = this.configSubject.value;
    const question = config.questions.find(q => q.id === questionId);
    
    if (!question) return false;
    
    return this.updateQuestion(questionId, { isActive: !question.isActive });
  }

  // Update question weight
  updateQuestionWeight(questionId: string, weight: number): boolean {
    if (weight < 0 || weight > 100) return false;
    return this.updateQuestion(questionId, { weight });
  }

  // Add custom question
  addCustomQuestion(text: string, category: SimpleAviQuestion['category'], weight: number = 10): string {
    const config = this.configSubject.value;
    const newId = `custom_${Date.now()}`;
    const maxOrder = Math.max(...config.questions.map(q => q.order), 0);
    
    const newQuestion: SimpleAviQuestion = {
      id: newId,
      text,
      category,
      weight,
      order: maxOrder + 1,
      isActive: true
    };
    
    this.configSubject.next({
      ...config,
      questions: [...config.questions, newQuestion]
    });
    
    this.saveConfigToStorage();
    return newId;
  }

  // Remove question
  removeQuestion(questionId: string): boolean {
    const config = this.configSubject.value;
    const filteredQuestions = config.questions.filter(q => q.id !== questionId);
    
    if (filteredQuestions.length === config.questions.length) return false;
    
    this.configSubject.next({
      ...config,
      questions: filteredQuestions
    });
    
    this.saveConfigToStorage();
    return true;
  }

  // Calculate AVI score from responses with fraud detection integration
  calculateAviScore(responses: { [questionId: string]: any }, fraudAnalysis?: any): number {
    const activeQuestions = this.getActiveQuestions();
    let totalScore = 0;
    let totalWeight = 0;
    
    activeQuestions.forEach(question => {
      const response = responses[question.id];
      if (response !== undefined && response !== '') {
        // Simple scoring: give points based on response quality
        const responseScore = this.scoreResponse(question, response);
        totalScore += responseScore * question.weight;
        totalWeight += question.weight;
      }
    });
    
    // Calculate base percentage score (0-100)
    let percentageScore = totalWeight > 0 ? (totalScore / totalWeight) : 0;
    
    // Apply fraud detection penalty if available
    if (fraudAnalysis && fraudAnalysis.overallFraudScore > 0) {
      const fraudPenalty = this.calculateFraudPenalty(fraudAnalysis);
      percentageScore = Math.max(0, percentageScore - fraudPenalty);
    }
    
    // Convert to AVI contribution to HASE
    const config = this.getConfig();
    return (percentageScore * config.haseContribution) / 100;
  }

  // Calculate fraud penalty based on voice analysis
  private calculateFraudPenalty(fraudAnalysis: any): number {
    const fraudScore = fraudAnalysis.overallFraudScore; // 0-100
    const highRiskFlags = fraudAnalysis.redFlags.filter((flag: any) => flag.severity === 'HIGH').length;
    const mediumRiskFlags = fraudAnalysis.redFlags.filter((flag: any) => flag.severity === 'MEDIUM').length;
    
    let penalty = 0;
    
    // Base penalty from fraud score
    if (fraudScore > 70) {
      penalty = 40; // High fraud risk = 40% penalty
    } else if (fraudScore > 50) {
      penalty = 25; // Medium fraud risk = 25% penalty
    } else if (fraudScore > 30) {
      penalty = 10; // Low fraud risk = 10% penalty
    }
    
    // Additional penalty for red flags
    penalty += (highRiskFlags * 5) + (mediumRiskFlags * 2);
    
    // Specific penalties for fraud types
    fraudAnalysis.redFlags.forEach((flag: any) => {
      switch (flag.type) {
        case 'REHEARSED_SPEECH':
          penalty += 15; // Heavy penalty for rehearsed responses
          break;
        case 'STRESS_DETECTED':
          penalty += flag.severity === 'HIGH' ? 8 : 4;
          break;
        case 'INCONSISTENT_RESPONSE':
          penalty += flag.severity === 'HIGH' ? 10 : 5;
          break;
        case 'LOW_CONFIDENCE':
          penalty += flag.severity === 'HIGH' ? 6 : 3;
          break;
        case 'LONG_HESITATION':
          penalty += flag.severity === 'HIGH' ? 7 : 3;
          break;
      }
    });
    
    return Math.min(penalty, 80); // Cap penalty at 80%
  }

  // Simple response scoring (can be enhanced with AI later)
  private scoreResponse(question: SimpleAviQuestion, response: any): number {
    // Basic scoring logic
    if (response === null || response === undefined || response === '') {
      return 0;
    }
    
    if (typeof response === 'number') {
      // For numeric responses, assume reasonable ranges
      if (question.id === 'o3') { // Daily income
        if (response >= 1000) return 90;
        if (response >= 600) return 70;
        if (response >= 400) return 50;
        return 30;
      }
      if (question.id === 'p3') { // Years of experience
        if (response >= 10) return 90;
        if (response >= 5) return 75;
        if (response >= 2) return 60;
        return 40;
      }
      // Default numeric scoring
      return response > 0 ? 70 : 30;
    }
    
    if (typeof response === 'string') {
      const responseText = response.toLowerCase();
      
      // Look for positive indicators
      const positiveWords = ['sí', 'si', 'bueno', 'excelente', 'propio', 'dueño', 'varios', 'muchos'];
      const negativeWords = ['no', 'poco', 'nada', 'malo', 'problema', 'deuda'];
      
      const hasPositive = positiveWords.some(word => responseText.includes(word));
      const hasNegative = negativeWords.some(word => responseText.includes(word));
      
      if (hasPositive && !hasNegative) return 80;
      if (hasNegative && !hasPositive) return 30;
      return 60; // Neutral response
    }
    
    return 50; // Default score
  }

  // Calculate complete HASE score (with dummy components and fraud integration)
  calculateHaseScore(aviResponses: { [questionId: string]: any }, fraudAnalysis?: any): HaseScore {
    const config = this.getConfig();
    const aviScore = config.isActive ? this.calculateAviScore(aviResponses, fraudAnalysis) : 0;
    
    // Adjust dummy scores based on fraud analysis
    const remainingPercentage = 100 - config.haseContribution;
    const dummyScores = this.generateDummyScores(remainingPercentage, aviScore, fraudAnalysis);
    
    return {
      avi_score: aviScore,
      financial_score: dummyScores.financial,
      document_score: dummyScores.document,
      market_score: dummyScores.market,
      behavioral_score: dummyScores.behavioral,
      total: aviScore + dummyScores.financial + dummyScores.document + dummyScores.market + dummyScores.behavioral
    };
  }

  // Generate dummy scores for other HASE components with fraud impact
  private generateDummyScores(totalPercentage: number, aviScore: number, fraudAnalysis?: any) {
    // Distribute remaining percentage across other components
    // Make them somewhat correlated with AVI score for realism
    const baseScore = (aviScore / this.getConfig().haseContribution) * totalPercentage;
    const variance = 0.2; // 20% variance
    
    // Apply fraud impact to other components
    let fraudImpactFactor = 1.0;
    if (fraudAnalysis && fraudAnalysis.overallFraudScore > 0) {
      // Reduce other scores if fraud is detected
      const fraudScore = fraudAnalysis.overallFraudScore / 100; // 0-1
      fraudImpactFactor = Math.max(0.4, 1 - (fraudScore * 0.3)); // Max 30% reduction, min 60% of original
    }
    
    const financial = Math.max(0, Math.min(30, (baseScore * 0.4 + (Math.random() - 0.5) * variance * 30) * fraudImpactFactor));
    const document = Math.max(0, Math.min(20, (baseScore * 0.27 + (Math.random() - 0.5) * variance * 20) * fraudImpactFactor));
    const market = Math.max(0, Math.min(15, (baseScore * 0.2 + (Math.random() - 0.5) * variance * 15) * fraudImpactFactor));
    
    // Behavioral score is most affected by voice fraud patterns
    let behavioralMultiplier = fraudImpactFactor;
    if (fraudAnalysis?.redFlags?.some((flag: any) => 
      flag.type === 'STRESS_DETECTED' || flag.type === 'LOW_CONFIDENCE' || flag.type === 'INCONSISTENT_RESPONSE')) {
      behavioralMultiplier *= 0.7; // Additional 30% penalty for behavioral indicators
    }
    const behavioral = Math.max(0, Math.min(10, (baseScore * 0.13 + (Math.random() - 0.5) * variance * 10) * behavioralMultiplier));
    
    return { financial, document, market, behavioral };
  }

  // Export configuration
  exportConfig(): string {
    return JSON.stringify(this.configSubject.value, null, 2);
  }

  // Import configuration
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      // Basic validation
      if (config.questions && Array.isArray(config.questions) && typeof config.haseContribution === 'number') {
        this.configSubject.next(config);
        this.saveConfigToStorage();
        return true;
      }
      return false;
    } catch (error) {
// removed by clean-audit
      return false;
    }
  }

  // Reset to defaults
  resetToDefaults(): void {
    const defaultConfig = new AviSimpleConfigService().configSubject.value;
    this.configSubject.next(defaultConfig);
    this.saveConfigToStorage();
  }

  // Storage methods
  private saveConfigToStorage(): void {
    try {
      localStorage.setItem('avi_config', JSON.stringify(this.configSubject.value));
    } catch (error) {
// removed by clean-audit
    }
  }

  private loadConfigFromStorage(): void {
    try {
      const stored = localStorage.getItem('avi_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.configSubject.next(config);
      }
    } catch (error) {
// removed by clean-audit
    }
  }

  // Get summary stats
  getConfigSummary() {
    const config = this.configSubject.value;
    const activeQuestions = config.questions.filter(q => q.isActive);
    const totalWeight = activeQuestions.reduce((sum, q) => sum + q.weight, 0);
    
    return {
      isActive: config.isActive,
      haseContribution: config.haseContribution,
      totalQuestions: config.questions.length,
      activeQuestions: activeQuestions.length,
      totalWeight,
      categories: {
        personal: activeQuestions.filter(q => q.category === 'personal').length,
        operation: activeQuestions.filter(q => q.category === 'operation').length,
        business: activeQuestions.filter(q => q.category === 'business').length,
        vehicle: activeQuestions.filter(q => q.category === 'vehicle').length
      }
    };
  }
}
// removed by clean-audit