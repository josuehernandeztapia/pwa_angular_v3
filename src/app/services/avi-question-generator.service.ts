import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface MicroLocalQuestion {
  id: string;
  question: string;
  category: 'location' | 'route' | 'business' | 'cultural';
  difficulty: 'easy' | 'medium' | 'hard';
  zone: string;
  expectedAnswerType: 'specific_place' | 'local_term' | 'route_detail';
}

export interface QuestionPool {
  zone: string;
  municipality: 'aguascalientes' | 'edomex';
  questions: MicroLocalQuestion[];
  lastUpdated: Date;
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class AviQuestionGeneratorService {
  private questionPools: Map<string, QuestionPool> = new Map();
  private readonly REFRESH_INTERVAL_DAYS = 30;

  constructor() {
    this.initializeLocalQuestionPools();
  }

  private initializeLocalQuestionPools(): void {
    // Aguascalientes Questions
    const agsQuestions: MicroLocalQuestion[] = [
      {
        id: 'ags_001',
        question: '¿En qué esquina del centro histórico está el McDonald\'s más conocido?',
        category: 'location',
        difficulty: 'easy',
        zone: 'aguascalientes_centro',
        expectedAnswerType: 'specific_place'
      },
      {
        id: 'ags_002',
        question: '¿Cómo le dicen los choferes al túnel de la Avenida Chávez?',
        category: 'cultural',
        difficulty: 'medium',
        zone: 'aguascalientes_centro',
        expectedAnswerType: 'local_term'
      },
      {
        id: 'ags_003',
        question: '¿Dónde compran las llantas más baratas en López Mateos?',
        category: 'business',
        difficulty: 'medium',
        zone: 'aguascalientes_lopez_mateos',
        expectedAnswerType: 'specific_place'
      },
      {
        id: 'ags_004',
        question: '¿En qué parada de la Ruta 5 siempre se suben más estudiantes?',
        category: 'route',
        difficulty: 'hard',
        zone: 'aguascalientes_ruta5',
        expectedAnswerType: 'route_detail'
      },
      {
        id: 'ags_005',
        question: '¿Cuál es el taller mecánico que más recomiendan en tu ruta?',
        category: 'business',
        difficulty: 'medium',
        zone: 'aguascalientes_general',
        expectedAnswerType: 'specific_place'
      }
    ];

    // Estado de México Questions
    const edomexQuestions: MicroLocalQuestion[] = [
      {
        id: 'edomex_001',
        question: '¿Qué línea del Mexibús te deja más cerca del Palacio Municipal?',
        category: 'route',
        difficulty: 'medium',
        zone: 'edomex_ecatepec',
        expectedAnswerType: 'route_detail'
      },
      {
        id: 'edomex_002',
        question: '¿Cómo le dicen los locales al cerro que está al lado de la Vía Morelos?',
        category: 'cultural',
        difficulty: 'hard',
        zone: 'edomex_ecatepec',
        expectedAnswerType: 'local_term'
      },
      {
        id: 'edomex_003',
        question: '¿En qué mercado venden las refacciones más baratas para microbuses?',
        category: 'business',
        difficulty: 'medium',
        zone: 'edomex_general',
        expectedAnswerType: 'specific_place'
      },
      {
        id: 'edomex_004',
        question: '¿Dónde está el semáforo donde siempre hacen operativos de tránsito?',
        category: 'location',
        difficulty: 'hard',
        zone: 'edomex_general',
        expectedAnswerType: 'specific_place'
      },
      {
        id: 'edomex_005',
        question: '¿En qué terminal de autobuses cargan gas los transportistas?',
        category: 'business',
        difficulty: 'medium',
        zone: 'edomex_general',
        expectedAnswerType: 'specific_place'
      }
    ];

    // Initialize question pools
    this.questionPools.set('aguascalientes', {
      zone: 'aguascalientes',
      municipality: 'aguascalientes',
      questions: agsQuestions,
      lastUpdated: new Date(),
      version: '1.0.0'
    });

    this.questionPools.set('edomex', {
      zone: 'edomex',
      municipality: 'edomex',
      questions: edomexQuestions,
      lastUpdated: new Date(),
      version: '1.0.0'
    });
  }

  getRandomMicroLocalQuestions(
    municipality: 'aguascalientes' | 'edomex',
    count: number = 2,
    specificZone?: string
  ): Observable<MicroLocalQuestion[]> {
    const pool = this.questionPools.get(municipality);
    
    if (!pool) {
      return of([]);
    }

    let availableQuestions = pool.questions;
    
    // Filter by specific zone if provided
    if (specificZone) {
      availableQuestions = pool.questions.filter(q => 
        q.zone === specificZone || q.zone.includes('general')
      );
    }

    // Randomly select questions
    const selectedQuestions = this.shuffleArray([...availableQuestions])
      .slice(0, Math.min(count, availableQuestions.length));

    return of(selectedQuestions);
  }

  async refreshQuestionsFromLLM(municipality: 'aguascalientes' | 'edomex'): Promise<boolean> {
    try {
      // Check if refresh is needed
      const pool = this.questionPools.get(municipality);
      if (pool && !this.needsRefresh(pool.lastUpdated)) {
        return false;
      }

      // Generate new questions via LLM API
      const newQuestions = await this.generateQuestionsViaLLM(municipality);
      
      if (newQuestions.length > 0) {
        // Update the question pool
        const updatedPool: QuestionPool = {
          zone: municipality,
          municipality: municipality,
          questions: newQuestions,
          lastUpdated: new Date(),
          version: this.generateVersion()
        };
        
        this.questionPools.set(municipality, updatedPool);
        
        // Save to localStorage for persistence
        this.saveQuestionPoolToStorage(municipality, updatedPool);
        
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async generateQuestionsViaLLM(municipality: 'aguascalientes' | 'edomex'): Promise<MicroLocalQuestion[]> {
    // This would connect to your LLM API (OpenAI, Claude, Gemini)
    const prompt = this.buildLLMPrompt(municipality);
    
    try {
      const response = await fetch('/api/generate-micro-local-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          municipality,
          count: 20,
          exclude_previous: this.getPreviousQuestions(municipality)
        })
      });

      if (!response.ok) {
        throw new Error('LLM API call failed');
      }

      const data = await response.json();
      return this.parseLLMResponse(data.questions, municipality);
    } catch (error) {
      return [];
    }
  }

  private buildLLMPrompt(municipality: 'aguascalientes' | 'edomex'): string {
    const contextMap = {
      'aguascalientes': 'Aguascalientes, México - transportistas urbanos, rutas del centro histórico, López Mateos, terminales de autobuses',
      'edomex': 'Estado de México - transportistas que operan rutas hacia CDMX, Mexibús, microbuses, Ecatepec, Naucalpan'
    };

    return `
Genera 20 preguntas micro-locales específicas para transportistas de ${contextMap[municipality]}.

REQUISITOS CRÍTICOS:
1. Preguntas que SOLO un transportista local podría responder
2. NO se pueden googlear fácilmente
3. Relacionadas con: talleres, gasolineras, semáforos conocidos, terminales, rutas específicas
4. Evitar preguntas demasiado obvias o turísticas
5. Incluir jerga local y referencias que solo locales conocen

FORMATO de respuesta JSON:
[
  {
    "question": "¿En qué esquina del Mercado X está el taller de Y?",
    "category": "business|location|route|cultural",
    "difficulty": "easy|medium|hard",
    "expectedAnswerType": "specific_place|local_term|route_detail"
  }
]

EJEMPLOS del estilo deseado:
- "¿Dónde cargan gas los de la Ruta 15 cuando están por el centro?"
- "¿Cómo le dicen al semáforo donde siempre se paran los operativos?"
- "¿Cuál es el taller más barato para cambiar balatas en tu zona?"
`;
  }

  private parseLLMResponse(llmQuestions: any[], municipality: 'aguascalientes' | 'edomex'): MicroLocalQuestion[] {
    return llmQuestions.map((q, index) => ({
      id: `${municipality}_llm_${Date.now()}_${index}`,
      question: q.question,
      category: q.category || 'business',
      difficulty: q.difficulty || 'medium',
      zone: `${municipality}_general`,
      expectedAnswerType: q.expectedAnswerType || 'specific_place'
    }));
  }

  private needsRefresh(lastUpdated: Date): boolean {
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate >= this.REFRESH_INTERVAL_DAYS;
  }

  private getPreviousQuestions(municipality: string): string[] {
    const pool = this.questionPools.get(municipality);
    return pool ? pool.questions.map(q => q.question) : [];
  }

  private generateVersion(): string {
    return `${new Date().getFullYear()}.${new Date().getMonth() + 1}.${Date.now()}`;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private saveQuestionPoolToStorage(municipality: string, pool: QuestionPool): void {
    try {
      localStorage.setItem(`avi_questions_${municipality}`, JSON.stringify(pool));
    } catch (error) {
    }
  }

  private loadQuestionPoolFromStorage(municipality: string): QuestionPool | null {
    try {
      const stored = localStorage.getItem(`avi_questions_${municipality}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  // Initialize from storage on service creation
  private initializeFromStorage(): void {
    ['aguascalientes', 'edomex'].forEach(municipality => {
      const storedPool = this.loadQuestionPoolFromStorage(municipality);
      if (storedPool) {
        this.questionPools.set(municipality, {
          ...storedPool,
          lastUpdated: new Date(storedPool.lastUpdated)
        });
      }
    });
  }
}
