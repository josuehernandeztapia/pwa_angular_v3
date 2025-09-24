/**
 * MICRO-LOCAL QUESTIONS GENERATOR - AVI_LAB Implementation
 * JavaScript equivalent of Angular AVI-Question-Generator Service
 * Provides municipality-specific questions that only local transportistas can answer
 */

class MicroLocalQuestionsEngine {
    constructor() {
        this.questionPools = new Map();
        this.REFRESH_INTERVAL_DAYS = 30;

        this.initializeLocalQuestionPools();
        this.initializeFromStorage();
    }

    /**
     * Initialize default question pools for supported municipalities
     */
    initializeLocalQuestionPools() {
        // Aguascalientes Questions - Identical to MAIN
        const agsQuestions = [
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

        // Estado de México Questions - Identical to MAIN
        const edomexQuestions = [
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

        // Initialize question pools - identical structure to MAIN
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

    /**
     * Get random micro-local questions for a municipality
     * @param {string} municipality - 'aguascalientes' or 'edomex'
     * @param {number} count - Number of questions to return (default: 2)
     * @param {string} specificZone - Optional zone filter
     * @returns {Array} Array of selected questions
     */
    getRandomMicroLocalQuestions(municipality, count = 2, specificZone = null) {
        const pool = this.questionPools.get(municipality);

        if (!pool) {
            console.warn(`No question pool found for municipality: ${municipality}`);
            return [];
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

        return selectedQuestions;
    }

    /**
     * Check if questions need refresh based on 30-day interval
     * @param {string} municipality
     * @returns {boolean} True if refresh is needed
     */
    needsRefresh(municipality) {
        const pool = this.questionPools.get(municipality);
        if (!pool) return true;

        const daysSinceUpdate = (Date.now() - new Date(pool.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate >= this.REFRESH_INTERVAL_DAYS;
    }

    /**
     * Refresh questions from LLM API (identical to MAIN implementation)
     * @param {string} municipality - Municipality to refresh
     * @returns {Promise<boolean>} True if refresh was successful
     */
    async refreshQuestionsFromLLM(municipality) {
        try {
            // Check if refresh is needed
            if (!this.needsRefresh(municipality)) {
                console.log(`Questions for ${municipality} are still fresh, no refresh needed`);
                return false;
            }

            console.log(`Refreshing questions for ${municipality} from LLM...`);

            // Generate new questions via LLM API
            const newQuestions = await this.generateQuestionsViaLLM(municipality);

            if (newQuestions.length > 0) {
                // Update the question pool
                const updatedPool = {
                    zone: municipality,
                    municipality: municipality,
                    questions: newQuestions,
                    lastUpdated: new Date(),
                    version: this.generateVersion()
                };

                this.questionPools.set(municipality, updatedPool);

                // Save to localStorage for persistence
                this.saveQuestionPoolToStorage(municipality, updatedPool);

                console.log(`Successfully refreshed ${newQuestions.length} questions for ${municipality}`);
                return true;
            }

            console.warn(`No new questions generated for ${municipality}`);
            return false;
        } catch (error) {
            console.error('Error refreshing questions from LLM:', error);
            return false;
        }
    }

    /**
     * Generate questions via LLM API call (identical to MAIN logic)
     * @param {string} municipality
     * @returns {Promise<Array>} Generated questions
     */
    async generateQuestionsViaLLM(municipality) {
        const prompt = this.buildLLMPrompt(municipality);

        try {
            // Mock implementation - replace with actual LLM API call
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
                throw new Error(`LLM API call failed: ${response.status}`);
            }

            const data = await response.json();
            return this.parseLLMResponse(data.questions, municipality);
        } catch (error) {
            console.error('LLM API error:', error);

            // Fallback: Return current questions if LLM fails
            console.log('Using existing questions as fallback');
            return this.getCurrentQuestions(municipality);
        }
    }

    /**
     * Build LLM prompt for question generation (identical to MAIN)
     * @param {string} municipality
     * @returns {string} Formatted prompt
     */
    buildLLMPrompt(municipality) {
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

    /**
     * Parse LLM response into question format
     * @param {Array} llmQuestions - Raw questions from LLM
     * @param {string} municipality
     * @returns {Array} Formatted questions
     */
    parseLLMResponse(llmQuestions, municipality) {
        if (!Array.isArray(llmQuestions)) {
            console.warn('Invalid LLM response format, expected array');
            return [];
        }

        return llmQuestions.map((q, index) => ({
            id: `${municipality}_llm_${Date.now()}_${index}`,
            question: q.question || 'Invalid question',
            category: q.category || 'business',
            difficulty: q.difficulty || 'medium',
            zone: `${municipality}_general`,
            expectedAnswerType: q.expectedAnswerType || 'specific_place'
        }));
    }

    /**
     * Get current questions for a municipality
     * @param {string} municipality
     * @returns {Array} Current questions
     */
    getCurrentQuestions(municipality) {
        const pool = this.questionPools.get(municipality);
        return pool ? pool.questions : [];
    }

    /**
     * Get previous questions for excluding from LLM generation
     * @param {string} municipality
     * @returns {Array} Array of question strings
     */
    getPreviousQuestions(municipality) {
        const pool = this.questionPools.get(municipality);
        return pool ? pool.questions.map(q => q.question) : [];
    }

    /**
     * Generate version string
     * @returns {string} Version string
     */
    generateVersion() {
        const date = new Date();
        return `${date.getFullYear()}.${date.getMonth() + 1}.${Date.now()}`;
    }

    /**
     * Shuffle array using Fisher-Yates algorithm
     * @param {Array} array
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Save question pool to localStorage
     * @param {string} municipality
     * @param {Object} pool
     */
    saveQuestionPoolToStorage(municipality, pool) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(`avi_lab_questions_${municipality}`, JSON.stringify(pool));
                console.log(`Saved question pool for ${municipality} to storage`);
            }
        } catch (error) {
            console.error('Error saving question pool to storage:', error);
        }
    }

    /**
     * Load question pool from localStorage
     * @param {string} municipality
     * @returns {Object|null} Stored pool or null
     */
    loadQuestionPoolFromStorage(municipality) {
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem(`avi_lab_questions_${municipality}`);
                return stored ? JSON.parse(stored) : null;
            }
            return null;
        } catch (error) {
            console.error('Error loading question pool from storage:', error);
            return null;
        }
    }

    /**
     * Initialize question pools from localStorage
     */
    initializeFromStorage() {
        ['aguascalientes', 'edomex'].forEach(municipality => {
            const storedPool = this.loadQuestionPoolFromStorage(municipality);
            if (storedPool) {
                this.questionPools.set(municipality, {
                    ...storedPool,
                    lastUpdated: new Date(storedPool.lastUpdated)
                });
                console.log(`Loaded stored question pool for ${municipality}`);
            }
        });
    }

    /**
     * Get question pool statistics
     * @param {string} municipality
     * @returns {Object} Pool statistics
     */
    getQuestionPoolStats(municipality) {
        const pool = this.questionPools.get(municipality);
        if (!pool) return null;

        const questions = pool.questions;
        const categories = {};
        const difficulties = {};

        questions.forEach(q => {
            categories[q.category] = (categories[q.category] || 0) + 1;
            difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1;
        });

        return {
            municipality,
            totalQuestions: questions.length,
            version: pool.version,
            lastUpdated: pool.lastUpdated,
            needsRefresh: this.needsRefresh(municipality),
            categories,
            difficulties
        };
    }

    /**
     * Validate question format
     * @param {Object} question
     * @returns {boolean} True if valid
     */
    validateQuestion(question) {
        const requiredFields = ['id', 'question', 'category', 'difficulty', 'zone', 'expectedAnswerType'];
        const validCategories = ['location', 'route', 'business', 'cultural'];
        const validDifficulties = ['easy', 'medium', 'hard'];
        const validAnswerTypes = ['specific_place', 'local_term', 'route_detail'];

        // Check required fields
        for (const field of requiredFields) {
            if (!question[field]) {
                console.warn(`Question missing required field: ${field}`);
                return false;
            }
        }

        // Validate enums
        if (!validCategories.includes(question.category)) {
            console.warn(`Invalid category: ${question.category}`);
            return false;
        }

        if (!validDifficulties.includes(question.difficulty)) {
            console.warn(`Invalid difficulty: ${question.difficulty}`);
            return false;
        }

        if (!validAnswerTypes.includes(question.expectedAnswerType)) {
            console.warn(`Invalid answer type: ${question.expectedAnswerType}`);
            return false;
        }

        return true;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MicroLocalQuestionsEngine };
} else if (typeof window !== 'undefined') {
    window.MicroLocalQuestionsEngine = MicroLocalQuestionsEngine;
}

export { MicroLocalQuestionsEngine };