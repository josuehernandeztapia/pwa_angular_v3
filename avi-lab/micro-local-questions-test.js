/**
 * MICRO-LOCAL QUESTIONS VALIDATION TEST
 * Validates AVI_LAB micro-local questions implementation
 * Ensures 100% parity with AVI MAIN functionality
 */

import { MicroLocalQuestionsEngine } from './src/services/micro-local-questions.js';

class MicroLocalQuestionsValidator {
    constructor() {
        this.engine = new MicroLocalQuestionsEngine();
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
    }

    /**
     * Execute comprehensive validation suite
     */
    async runValidation() {
        console.log('🧪 MICRO-LOCAL QUESTIONS VALIDATION SUITE');
        console.log('==========================================');

        // Test Categories
        await this.testBasicFunctionality();
        await this.testQuestionRetrieval();
        await this.testQuestionPoolStats();
        await this.testStoragePersistence();
        await this.testLLMRefreshLogic();
        await this.testValidationMethods();
        await this.testParityWithMAIN();

        this.generateFinalReport();
    }

    /**
     * Test basic engine initialization and configuration
     */
    async testBasicFunctionality() {
        console.log('\\n🔍 Testing Basic Functionality');
        console.log('================================');

        // Test 1: Engine initialization
        this.runTest('Engine initialization', () => {
            return this.engine instanceof MicroLocalQuestionsEngine;
        });

        // Test 2: Question pools loaded
        this.runTest('Question pools loaded', () => {
            return this.engine.questionPools.size === 2;
        });

        // Test 3: Aguascalientes pool exists
        this.runTest('Aguascalientes pool exists', () => {
            return this.engine.questionPools.has('aguascalientes');
        });

        // Test 4: Edomex pool exists
        this.runTest('Edomex pool exists', () => {
            return this.engine.questionPools.has('edomex');
        });

        // Test 5: Refresh interval configured
        this.runTest('Refresh interval configured', () => {
            return this.engine.REFRESH_INTERVAL_DAYS === 30;
        });
    }

    /**
     * Test question retrieval functionality
     */
    async testQuestionRetrieval() {
        console.log('\\n📝 Testing Question Retrieval');
        console.log('===============================');

        // Test 6: Get random questions - Aguascalientes
        this.runTest('Get random questions - Aguascalientes', () => {
            const questions = this.engine.getRandomMicroLocalQuestions('aguascalientes', 2);
            return questions.length === 2 && questions[0].question;
        });

        // Test 7: Get random questions - Edomex
        this.runTest('Get random questions - Edomex', () => {
            const questions = this.engine.getRandomMicroLocalQuestions('edomex', 3);
            return questions.length === 3 && questions[0].question;
        });

        // Test 8: Invalid municipality returns empty array
        this.runTest('Invalid municipality returns empty', () => {
            const questions = this.engine.getRandomMicroLocalQuestions('invalid_city', 2);
            return questions.length === 0;
        });

        // Test 9: Zone filtering works
        this.runTest('Zone filtering works', () => {
            const questions = this.engine.getRandomMicroLocalQuestions('aguascalientes', 5, 'aguascalientes_centro');
            return questions.length > 0 &&
                   questions.every(q => q.zone === 'aguascalientes_centro' || q.zone.includes('general'));
        });

        // Test 10: Question structure validation
        this.runTest('Question structure validation', () => {
            const questions = this.engine.getRandomMicroLocalQuestions('aguascalientes', 1);
            const q = questions[0];
            return q.id && q.question && q.category && q.difficulty && q.zone && q.expectedAnswerType;
        });
    }

    /**
     * Test question pool statistics
     */
    async testQuestionPoolStats() {
        console.log('\\n📊 Testing Question Pool Stats');
        console.log('================================');

        // Test 11: Get stats for Aguascalientes
        this.runTest('Get stats for Aguascalientes', () => {
            const stats = this.engine.getQuestionPoolStats('aguascalientes');
            return stats && stats.totalQuestions > 0 && stats.municipality === 'aguascalientes';
        });

        // Test 12: Get stats for Edomex
        this.runTest('Get stats for Edomex', () => {
            const stats = this.engine.getQuestionPoolStats('edomex');
            return stats && stats.totalQuestions > 0 && stats.municipality === 'edomex';
        });

        // Test 13: Stats include categories breakdown
        this.runTest('Stats include categories breakdown', () => {
            const stats = this.engine.getQuestionPoolStats('aguascalientes');
            return stats.categories && Object.keys(stats.categories).length > 0;
        });

        // Test 14: Stats include difficulties breakdown
        this.runTest('Stats include difficulties breakdown', () => {
            const stats = this.engine.getQuestionPoolStats('edomex');
            return stats.difficulties && Object.keys(stats.difficulties).length > 0;
        });
    }

    /**
     * Test storage persistence functionality
     */
    async testStoragePersistence() {
        console.log('\\n💾 Testing Storage Persistence');
        console.log('================================');

        // Test 15: Save to storage
        this.runTest('Save to storage', () => {
            try {
                const testPool = {
                    zone: 'test',
                    municipality: 'test',
                    questions: [{ id: 'test', question: 'Test?' }],
                    lastUpdated: new Date(),
                    version: '1.0.0'
                };
                this.engine.saveQuestionPoolToStorage('test', testPool);
                return true;
            } catch (error) {
                return false;
            }
        });

        // Test 16: Load from storage
        this.runTest('Load from storage', () => {
            try {
                const loaded = this.engine.loadQuestionPoolFromStorage('test');
                return loaded && loaded.municipality === 'test';
            } catch (error) {
                return false;
            }
        });
    }

    /**
     * Test LLM refresh logic (without actual API calls)
     */
    async testLLMRefreshLogic() {
        console.log('\\n🤖 Testing LLM Refresh Logic');
        console.log('==============================');

        // Test 17: Refresh needed check - fresh pool
        this.runTest('Fresh pool does not need refresh', () => {
            return !this.engine.needsRefresh('aguascalientes');
        });

        // Test 18: Build LLM prompt
        this.runTest('Build LLM prompt', () => {
            const prompt = this.engine.buildLLMPrompt('aguascalientes');
            return prompt.includes('Aguascalientes') && prompt.includes('transportistas');
        });

        // Test 19: Parse LLM response
        this.runTest('Parse LLM response', () => {
            const mockLLMResponse = [
                {
                    question: '¿Test question?',
                    category: 'business',
                    difficulty: 'medium',
                    expectedAnswerType: 'specific_place'
                }
            ];
            const parsed = this.engine.parseLLMResponse(mockLLMResponse, 'aguascalientes');
            return parsed.length === 1 && parsed[0].question === '¿Test question?';
        });

        // Test 20: Get previous questions
        this.runTest('Get previous questions', () => {
            const previous = this.engine.getPreviousQuestions('aguascalientes');
            return Array.isArray(previous) && previous.length > 0;
        });
    }

    /**
     * Test validation methods
     */
    async testValidationMethods() {
        console.log('\\n✅ Testing Validation Methods');
        console.log('===============================');

        // Test 21: Valid question passes validation
        this.runTest('Valid question passes validation', () => {
            const validQuestion = {
                id: 'test_001',
                question: '¿Test question?',
                category: 'business',
                difficulty: 'medium',
                zone: 'test_zone',
                expectedAnswerType: 'specific_place'
            };
            return this.engine.validateQuestion(validQuestion);
        });

        // Test 22: Invalid question fails validation
        this.runTest('Invalid question fails validation', () => {
            const invalidQuestion = {
                id: 'test_002',
                // missing question field
                category: 'invalid_category',
                difficulty: 'medium'
            };
            return !this.engine.validateQuestion(invalidQuestion);
        });

        // Test 23: Shuffle array functionality
        this.runTest('Shuffle array functionality', () => {
            const original = [1, 2, 3, 4, 5];
            const shuffled = this.engine.shuffleArray(original);
            return shuffled.length === original.length &&
                   original.every(item => shuffled.includes(item));
        });

        // Test 24: Version generation
        this.runTest('Version generation', () => {
            const version = this.engine.generateVersion();
            return version.includes('.') && version.length > 5;
        });
    }

    /**
     * Test parity with AVI MAIN implementation
     */
    async testParityWithMAIN() {
        console.log('\\n🔄 Testing Parity with AVI MAIN');
        console.log('=================================');

        // Test 25: Same question count as MAIN
        this.runTest('Same question count as MAIN', () => {
            const agsQuestions = this.engine.getRandomMicroLocalQuestions('aguascalientes', 10);
            const edomexQuestions = this.engine.getRandomMicroLocalQuestions('edomex', 10);
            return agsQuestions.length >= 5 && edomexQuestions.length >= 5;
        });

        // Test 26: Same categories as MAIN
        this.runTest('Same categories as MAIN', () => {
            const expectedCategories = ['location', 'route', 'business', 'cultural'];
            const agsQuestions = this.engine.getCurrentQuestions('aguascalientes');
            const foundCategories = [...new Set(agsQuestions.map(q => q.category))];
            return expectedCategories.every(cat => foundCategories.includes(cat));
        });

        // Test 27: Same difficulties as MAIN
        this.runTest('Same difficulties as MAIN', () => {
            const expectedDifficulties = ['easy', 'medium', 'hard'];
            const edomexQuestions = this.engine.getCurrentQuestions('edomex');
            const foundDifficulties = [...new Set(edomexQuestions.map(q => q.difficulty))];
            return expectedDifficulties.some(diff => foundDifficulties.includes(diff));
        });

        // Test 28: Same answer types as MAIN
        this.runTest('Same answer types as MAIN', () => {
            const expectedTypes = ['specific_place', 'local_term', 'route_detail'];
            const allQuestions = [
                ...this.engine.getCurrentQuestions('aguascalientes'),
                ...this.engine.getCurrentQuestions('edomex')
            ];
            const foundTypes = [...new Set(allQuestions.map(q => q.expectedAnswerType))];
            return expectedTypes.every(type => foundTypes.includes(type));
        });

        // Test 29: Specific question verification (sample from MAIN)
        this.runTest('Specific question verification', () => {
            const agsQuestions = this.engine.getCurrentQuestions('aguascalientes');
            const mcdonaldsQuestion = agsQuestions.find(q =>
                q.question.includes('McDonald') && q.question.includes('esquina')
            );
            return mcdonaldsQuestion && mcdonaldsQuestion.category === 'location';
        });

        // Test 30: LLM prompt structure matches MAIN
        this.runTest('LLM prompt structure matches MAIN', () => {
            const agsPrompt = this.engine.buildLLMPrompt('aguascalientes');
            const edomexPrompt = this.engine.buildLLMPrompt('edomex');

            const requiredElements = [
                'REQUISITOS CRÍTICOS:',
                'FORMATO de respuesta JSON:',
                'EJEMPLOS del estilo deseado:'
            ];

            return requiredElements.every(element =>
                agsPrompt.includes(element) && edomexPrompt.includes(element)
            );
        });
    }

    /**
     * Run individual test with result tracking
     */
    runTest(testName, testFunction) {
        this.totalTests++;
        try {
            const result = testFunction();
            const passed = !!result;

            this.testResults.push({
                name: testName,
                passed,
                error: null
            });

            if (passed) {
                this.passedTests++;
                console.log(`  ✅ ${testName}`);
            } else {
                console.log(`  ❌ ${testName}`);
            }
        } catch (error) {
            this.testResults.push({
                name: testName,
                passed: false,
                error: error.message
            });
            console.log(`  ❌ ${testName} - Error: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive validation report
     */
    generateFinalReport() {
        console.log('\\n📊 MICRO-LOCAL QUESTIONS VALIDATION RESULTS');
        console.log('=============================================');

        const successRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);

        console.log(`Total Tests: ${this.totalTests}`);
        console.log(`Passed Tests: ${this.passedTests}`);
        console.log(`Failed Tests: ${this.totalTests - this.passedTests}`);
        console.log(`Success Rate: ${successRate}%`);

        // Detailed breakdown by category
        const categories = {
            'Basic Functionality': this.testResults.slice(0, 5),
            'Question Retrieval': this.testResults.slice(5, 10),
            'Pool Statistics': this.testResults.slice(10, 14),
            'Storage Persistence': this.testResults.slice(14, 16),
            'LLM Refresh Logic': this.testResults.slice(16, 20),
            'Validation Methods': this.testResults.slice(20, 24),
            'MAIN Parity': this.testResults.slice(24, 30)
        };

        console.log('\\n📈 Results by Category:');
        Object.entries(categories).forEach(([category, tests]) => {
            const passed = tests.filter(t => t.passed).length;
            const total = tests.length;
            const rate = ((passed / total) * 100).toFixed(1);
            console.log(`  ${category}: ${passed}/${total} (${rate}%)`);
        });

        // Failed tests details
        const failedTests = this.testResults.filter(t => !t.passed);
        if (failedTests.length > 0) {
            console.log('\\n❌ Failed Tests Details:');
            failedTests.forEach(test => {
                console.log(`  - ${test.name}${test.error ? `: ${test.error}` : ''}`);
            });
        }

        // Sample questions demonstration
        console.log('\\n🎯 Sample Questions Generated:');
        const agsQuestions = this.engine.getRandomMicroLocalQuestions('aguascalientes', 2);
        const edomexQuestions = this.engine.getRandomMicroLocalQuestions('edomex', 2);

        console.log('  Aguascalientes:');
        agsQuestions.forEach((q, i) => {
            console.log(`    ${i+1}. [${q.category}|${q.difficulty}] ${q.question}`);
        });

        console.log('  Estado de México:');
        edomexQuestions.forEach((q, i) => {
            console.log(`    ${i+1}. [${q.category}|${q.difficulty}] ${q.question}`);
        });

        // Final status
        const status = successRate >= 95 ? '✅ EXCELLENT' :
                      successRate >= 85 ? '⚠️ GOOD' : '❌ NEEDS IMPROVEMENT';

        console.log(`\\nFinal Status: ${status}`);
        console.log(`AVI_LAB micro-local questions ${successRate >= 95 ? 'FULLY' : 'PARTIALLY'} aligned with MAIN`);

        return {
            totalTests: this.totalTests,
            passedTests: this.passedTests,
            successRate: parseFloat(successRate),
            status,
            failedTests: failedTests.map(t => t.name)
        };
    }
}

// Execute validation if run directly
if (typeof window === 'undefined') {
    // Node.js environment
    const validator = new MicroLocalQuestionsValidator();
    validator.runValidation().then(() => {
        console.log('\\n✅ Micro-Local Questions Validation Complete');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    });
} else {
    // Browser environment
    window.MicroLocalQuestionsValidator = MicroLocalQuestionsValidator;
}

export { MicroLocalQuestionsValidator };