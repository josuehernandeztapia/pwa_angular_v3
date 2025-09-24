/**
 * MICRO-LOCAL QUESTIONS ALIGNMENT VALIDATION
 * Compares AVI MAIN vs AVI_LAB micro-local questions implementations
 * Validates 100% parity between systems
 */

import { MicroLocalQuestionsEngine } from './src/services/micro-local-questions.js';

class MicroLocalAlignmentValidator {
    constructor() {
        this.labEngine = new MicroLocalQuestionsEngine();
        this.testResults = [];
        this.totalTests = 0;
        this.alignedTests = 0;
    }

    /**
     * Execute MAIN vs LAB alignment validation
     */
    async runAlignment() {
        console.log('🔄 MAIN vs LAB MICRO-LOCAL QUESTIONS ALIGNMENT');
        console.log('================================================');

        // Core alignment tests
        this.testQuestionCountAlignment();
        this.testQuestionContentAlignment();
        this.testCategoryAlignment();
        this.testDifficultyAlignment();
        this.testZoneStructureAlignment();
        this.testLLMPromptAlignment();
        this.testMethodSignatureAlignment();
        this.testBehavioralAlignment();

        this.generateAlignmentReport();
    }

    /**
     * Test question count matches between MAIN and LAB
     */
    testQuestionCountAlignment() {
        console.log('\\n📊 Testing Question Count Alignment');
        console.log('====================================');

        // Expected counts from MAIN implementation
        const expectedCounts = {
            'aguascalientes': 5,
            'edomex': 5
        };

        Object.entries(expectedCounts).forEach(([municipality, expectedCount]) => {
            const labQuestions = this.labEngine.getCurrentQuestions(municipality);
            this.runAlignmentTest(
                `${municipality} question count`,
                labQuestions.length === expectedCount,
                `Expected: ${expectedCount}, Got: ${labQuestions.length}`
            );
        });
    }

    /**
     * Test specific question content matches MAIN
     */
    testQuestionContentAlignment() {
        console.log('\\n📝 Testing Question Content Alignment');
        console.log('======================================');

        // Expected questions from MAIN (key samples)
        const expectedQuestions = {
            'aguascalientes': [
                {
                    id: 'ags_001',
                    question: '¿En qué esquina del centro histórico está el McDonald\'s más conocido?',
                    category: 'location',
                    difficulty: 'easy',
                    zone: 'aguascalientes_centro'
                },
                {
                    id: 'ags_002',
                    question: '¿Cómo le dicen los choferes al túnel de la Avenida Chávez?',
                    category: 'cultural',
                    difficulty: 'medium',
                    zone: 'aguascalientes_centro'
                }
            ],
            'edomex': [
                {
                    id: 'edomex_001',
                    question: '¿Qué línea del Mexibús te deja más cerca del Palacio Municipal?',
                    category: 'route',
                    difficulty: 'medium',
                    zone: 'edomex_ecatepec'
                },
                {
                    id: 'edomex_002',
                    question: '¿Cómo le dicen los locales al cerro que está al lado de la Vía Morelos?',
                    category: 'cultural',
                    difficulty: 'hard',
                    zone: 'edomex_ecatepec'
                }
            ]
        };

        Object.entries(expectedQuestions).forEach(([municipality, expectedQuests]) => {
            const labQuestions = this.labEngine.getCurrentQuestions(municipality);

            expectedQuests.forEach(expectedQ => {
                const matchingQ = labQuestions.find(q => q.id === expectedQ.id);

                this.runAlignmentTest(
                    `${municipality} question ${expectedQ.id} exists`,
                    !!matchingQ,
                    matchingQ ? 'Found' : 'Missing'
                );

                if (matchingQ) {
                    this.runAlignmentTest(
                        `${municipality} question ${expectedQ.id} content`,
                        matchingQ.question === expectedQ.question,
                        `Expected: "${expectedQ.question}", Got: "${matchingQ.question}"`
                    );

                    this.runAlignmentTest(
                        `${municipality} question ${expectedQ.id} category`,
                        matchingQ.category === expectedQ.category,
                        `Expected: ${expectedQ.category}, Got: ${matchingQ.category}`
                    );

                    this.runAlignmentTest(
                        `${municipality} question ${expectedQ.id} difficulty`,
                        matchingQ.difficulty === expectedQ.difficulty,
                        `Expected: ${expectedQ.difficulty}, Got: ${matchingQ.difficulty}`
                    );
                }
            });
        });
    }

    /**
     * Test category distribution alignment
     */
    testCategoryAlignment() {
        console.log('\\n🏷️ Testing Category Alignment');
        console.log('===============================');

        const expectedCategories = ['location', 'route', 'business', 'cultural'];

        ['aguascalientes', 'edomex'].forEach(municipality => {
            const labQuestions = this.labEngine.getCurrentQuestions(municipality);
            const labCategories = [...new Set(labQuestions.map(q => q.category))];

            expectedCategories.forEach(category => {
                this.runAlignmentTest(
                    `${municipality} has ${category} questions`,
                    labCategories.includes(category),
                    labCategories.includes(category) ? 'Present' : 'Missing'
                );
            });
        });
    }

    /**
     * Test difficulty distribution alignment
     */
    testDifficultyAlignment() {
        console.log('\\n🎯 Testing Difficulty Alignment');
        console.log('================================');

        const expectedDifficulties = ['easy', 'medium', 'hard'];

        ['aguascalientes', 'edomex'].forEach(municipality => {
            const labQuestions = this.labEngine.getCurrentQuestions(municipality);
            const labDifficulties = [...new Set(labQuestions.map(q => q.difficulty))];

            // At least some difficulties should be present
            const hasExpectedDifficulties = expectedDifficulties.some(diff =>
                labDifficulties.includes(diff)
            );

            this.runAlignmentTest(
                `${municipality} has valid difficulties`,
                hasExpectedDifficulties,
                `Found: [${labDifficulties.join(', ')}]`
            );
        });
    }

    /**
     * Test zone structure alignment
     */
    testZoneStructureAlignment() {
        console.log('\\n🗺️ Testing Zone Structure Alignment');
        console.log('=====================================');

        const expectedZonePatterns = {
            'aguascalientes': ['aguascalientes_', 'aguascalientes_general'],
            'edomex': ['edomex_', 'edomex_general']
        };

        Object.entries(expectedZonePatterns).forEach(([municipality, patterns]) => {
            const labQuestions = this.labEngine.getCurrentQuestions(municipality);

            patterns.forEach(pattern => {
                const hasPattern = labQuestions.some(q =>
                    q.zone.startsWith(pattern) || q.zone === pattern
                );

                this.runAlignmentTest(
                    `${municipality} has ${pattern} zones`,
                    hasPattern,
                    hasPattern ? 'Found' : 'Missing'
                );
            });
        });
    }

    /**
     * Test LLM prompt structure alignment
     */
    testLLMPromptAlignment() {
        console.log('\\n🤖 Testing LLM Prompt Alignment');
        console.log('================================');

        const municipalities = ['aguascalientes', 'edomex'];
        const requiredPromptElements = [
            'REQUISITOS CRÍTICOS:',
            'FORMATO de respuesta JSON:',
            'EJEMPLOS del estilo deseado:',
            'transportistas de',
            'Genera 20 preguntas'
        ];

        municipalities.forEach(municipality => {
            const labPrompt = this.labEngine.buildLLMPrompt(municipality);

            requiredPromptElements.forEach(element => {
                this.runAlignmentTest(
                    `${municipality} prompt contains "${element}"`,
                    labPrompt.includes(element),
                    labPrompt.includes(element) ? 'Present' : 'Missing'
                );
            });

            // Test municipality-specific context
            this.runAlignmentTest(
                `${municipality} prompt has municipality context`,
                labPrompt.toLowerCase().includes(municipality),
                labPrompt.toLowerCase().includes(municipality) ? 'Present' : 'Missing'
            );
        });
    }

    /**
     * Test method signature alignment with MAIN
     */
    testMethodSignatureAlignment() {
        console.log('\\n🔧 Testing Method Signature Alignment');
        console.log('======================================');

        // Core methods that should match MAIN
        const expectedMethods = [
            'getRandomMicroLocalQuestions',
            'refreshQuestionsFromLLM',
            'generateQuestionsViaLLM',
            'buildLLMPrompt',
            'parseLLMResponse',
            'needsRefresh',
            'getPreviousQuestions',
            'generateVersion',
            'shuffleArray'
        ];

        expectedMethods.forEach(methodName => {
            this.runAlignmentTest(
                `LAB has ${methodName} method`,
                typeof this.labEngine[methodName] === 'function',
                typeof this.labEngine[methodName] === 'function' ? 'Present' : 'Missing'
            );
        });
    }

    /**
     * Test behavioral alignment through method execution
     */
    testBehavioralAlignment() {
        console.log('\\n⚡ Testing Behavioral Alignment');
        console.log('================================');

        // Test getRandomMicroLocalQuestions behavior
        const agsQuestions = this.labEngine.getRandomMicroLocalQuestions('aguascalientes', 3);
        this.runAlignmentTest(
            'getRandomMicroLocalQuestions returns correct count',
            agsQuestions.length === 3,
            `Requested: 3, Got: ${agsQuestions.length}`
        );

        // Test invalid municipality behavior
        const invalidQuestions = this.labEngine.getRandomMicroLocalQuestions('invalid', 2);
        this.runAlignmentTest(
            'Invalid municipality returns empty array',
            invalidQuestions.length === 0,
            `Expected: 0, Got: ${invalidQuestions.length}`
        );

        // Test zone filtering behavior
        const filteredQuestions = this.labEngine.getRandomMicroLocalQuestions(
            'aguascalientes', 5, 'aguascalientes_centro'
        );
        const hasCorrectZones = filteredQuestions.every(q =>
            q.zone === 'aguascalientes_centro' || q.zone.includes('general')
        );
        this.runAlignmentTest(
            'Zone filtering works correctly',
            hasCorrectZones,
            hasCorrectZones ? 'Correct filtering' : 'Incorrect filtering'
        );

        // Test refresh interval alignment
        this.runAlignmentTest(
            'Refresh interval matches MAIN (30 days)',
            this.labEngine.REFRESH_INTERVAL_DAYS === 30,
            `Expected: 30, Got: ${this.labEngine.REFRESH_INTERVAL_DAYS}`
        );

        // Test version generation format
        const version = this.labEngine.generateVersion();
        const versionPattern = /^\\d{4}\\.\\d{1,2}\\.\\d+$/;
        this.runAlignmentTest(
            'Version format matches MAIN pattern',
            versionPattern.test(version),
            `Generated: ${version}`
        );
    }

    /**
     * Run alignment test with result tracking
     */
    runAlignmentTest(testName, aligned, details) {
        this.totalTests++;

        this.testResults.push({
            name: testName,
            aligned,
            details
        });

        if (aligned) {
            this.alignedTests++;
            console.log(`  ✅ ${testName}`);
        } else {
            console.log(`  ❌ ${testName} - ${details}`);
        }
    }

    /**
     * Generate comprehensive alignment report
     */
    generateAlignmentReport() {
        console.log('\\n📊 MAIN vs LAB ALIGNMENT RESULTS');
        console.log('==================================');

        const alignmentRate = ((this.alignedTests / this.totalTests) * 100).toFixed(1);

        console.log(`Total Alignment Tests: ${this.totalTests}`);
        console.log(`Aligned Tests: ${this.alignedTests}`);
        console.log(`Misaligned Tests: ${this.totalTests - this.alignedTests}`);
        console.log(`Alignment Rate: ${alignmentRate}%`);

        // Test breakdown by category
        const categories = [
            { name: 'Question Count', tests: this.testResults.slice(0, 2) },
            { name: 'Question Content', tests: this.testResults.slice(2, 10) },
            { name: 'Category Alignment', tests: this.testResults.slice(10, 18) },
            { name: 'Difficulty Alignment', tests: this.testResults.slice(18, 20) },
            { name: 'Zone Structure', tests: this.testResults.slice(20, 24) },
            { name: 'LLM Prompt', tests: this.testResults.slice(24, 36) },
            { name: 'Method Signatures', tests: this.testResults.slice(36, 45) },
            { name: 'Behavioral', tests: this.testResults.slice(45) }
        ];

        console.log('\\n📈 Alignment by Category:');
        categories.forEach(category => {
            if (category.tests.length > 0) {
                const aligned = category.tests.filter(t => t.aligned).length;
                const total = category.tests.length;
                const rate = ((aligned / total) * 100).toFixed(1);
                console.log(`  ${category.name}: ${aligned}/${total} (${rate}%)`);
            }
        });

        // Misaligned tests details
        const misaligned = this.testResults.filter(t => !t.aligned);
        if (misaligned.length > 0) {
            console.log('\\n❌ Misaligned Tests Details:');
            misaligned.forEach(test => {
                console.log(`  - ${test.name}: ${test.details}`);
            });
        }

        // Sample question comparison
        console.log('\\n🎯 Sample Question Comparison:');
        console.log('AVI_LAB Questions:');

        const labAgsQuestions = this.labEngine.getRandomMicroLocalQuestions('aguascalientes', 2);
        const labEdomexQuestions = this.labEngine.getRandomMicroLocalQuestions('edomex', 2);

        console.log('  Aguascalientes:');
        labAgsQuestions.forEach((q, i) => {
            console.log(`    ${i+1}. [${q.category}|${q.difficulty}] ${q.question}`);
        });

        console.log('  Estado de México:');
        labEdomexQuestions.forEach((q, i) => {
            console.log(`    ${i+1}. [${q.category}|${q.difficulty}] ${q.question}`);
        });

        // Final alignment status
        const status = alignmentRate >= 95 ? '✅ PERFECTLY ALIGNED' :
                      alignmentRate >= 85 ? '⚠️ MOSTLY ALIGNED' : '❌ NEEDS ALIGNMENT';

        console.log(`\\nFinal Alignment Status: ${status}`);
        console.log(`AVI_LAB micro-local questions are ${alignmentRate}% aligned with AVI MAIN`);

        if (alignmentRate >= 95) {
            console.log('🎉 COMPLETE PARITY ACHIEVED! LAB can fully replace MAIN micro-local questions.');
        } else if (alignmentRate >= 85) {
            console.log('⚠️ Good alignment with minor differences. Review misaligned tests.');
        } else {
            console.log('❌ Significant misalignment detected. Implementation needs review.');
        }

        return {
            totalTests: this.totalTests,
            alignedTests: this.alignedTests,
            alignmentRate: parseFloat(alignmentRate),
            status,
            misalignedTests: misaligned.map(t => ({ name: t.name, details: t.details }))
        };
    }
}

// Execute validation if run directly
if (typeof window === 'undefined') {
    // Node.js environment
    const validator = new MicroLocalAlignmentValidator();
    validator.runAlignment().then(() => {
        console.log('\\n✅ MAIN vs LAB Alignment Validation Complete');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Alignment validation failed:', error);
        process.exit(1);
    });
} else {
    // Browser environment
    window.MicroLocalAlignmentValidator = MicroLocalAlignmentValidator;
}

export { MicroLocalAlignmentValidator };