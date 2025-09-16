// VOICE ANALYSIS ENGINE VALIDATION - 30+ AUDIO TESTS
// QA Lead + Data Scientist validation script

import { VoiceAnalysisEngine } from './src/services/voice-analysis-engine.js';

class VoiceValidationSuite {
    constructor() {
        this.engine = new VoiceAnalysisEngine();
        this.testResults = [];
        this.categories = {
            GO: { count: 0, range: [750, 1000] },
            REVIEW: { count: 0, range: [500, 749] },
            NO_GO: { count: 0, range: [0, 499] }
        };
    }

    // Generate realistic audio payload simulation
    generateAudioPayload(profile = 'honest') {
        const profiles = {
            'honest': {
                latencyRange: [1.2, 2.5],
                pitchVariance: [0.1, 0.3],
                hesitationRate: [0.0, 0.1],
                energyStability: [0.7, 0.9],
                honestyWords: ['exactamente', 'claro', 'seguro'],
                deceptionWords: []
            },
            'suspicious': {
                latencyRange: [0.5, 1.0],  // Too quick (prepared)
                pitchVariance: [0.4, 0.7], // High variance
                hesitationRate: [0.2, 0.4], // Many hesitations
                energyStability: [0.2, 0.5], // Unstable energy
                honestyWords: [],
                deceptionWords: ['tal_vez', 'creo_que', 'no_estoy_seguro']
            },
            'nervous': {
                latencyRange: [3.0, 5.0],  // Very slow response
                pitchVariance: [0.5, 0.8], // High pitch variance
                hesitationRate: [0.15, 0.3], // Moderate hesitations
                energyStability: [0.3, 0.6], // Low-medium stability
                honestyWords: ['definitivamente'],
                deceptionWords: ['no_recuerdo']
            },
            'deceptive': {
                latencyRange: [0.3, 0.8],  // Very quick (rehearsed)
                pitchVariance: [0.6, 0.9], // Very high variance
                hesitationRate: [0.3, 0.5], // High hesitation rate
                energyStability: [0.1, 0.4], // Very unstable
                honestyWords: [],
                deceptionWords: ['mas_o_menos', 'tal_vez', 'no_recuerdo', 'no_estoy_seguro']
            }
        };

        const p = profiles[profile];
        const answerDuration = 15 + Math.random() * 20; // 15-35 seconds

        return {
            latencySec: p.latencyRange[0] + Math.random() * (p.latencyRange[1] - p.latencyRange[0]),
            answerDurationSec: answerDuration,
            pitchSeriesHz: this.generatePitchSeries(p.pitchVariance[0], p.pitchVariance[1]),
            energySeries: this.generateEnergySeries(p.energyStability[0], p.energyStability[1]),
            words: this.generateWords(p.honestyWords, p.deceptionWords, p.hesitationRate[0], p.hesitationRate[1]),
            profile: profile
        };
    }

    generatePitchSeries(minVar, maxVar) {
        const baseFreq = 150 + Math.random() * 100; // 150-250 Hz base
        const variance = minVar + Math.random() * (maxVar - minVar);
        const series = [];

        for (let i = 0; i < 100; i++) {
            series.push(baseFreq + (Math.random() - 0.5) * baseFreq * variance);
        }
        return series;
    }

    generateEnergySeries(minStability, maxStability) {
        const stability = minStability + Math.random() * (maxStability - minStability);
        const baseEnergy = 0.5;
        const series = [];

        for (let i = 0; i < 100; i++) {
            const variation = (1 - stability) * (Math.random() - 0.5);
            series.push(Math.max(0.1, Math.min(1.0, baseEnergy + variation)));
        }
        return series;
    }

    generateWords(honestyWords, deceptionWords, minHesitation, maxHesitation) {
        const hesitationRate = minHesitation + Math.random() * (maxHesitation - minHesitation);
        const baseWords = ['trabajo', 'empresa', 'sueldo', 'experiencia', 'años'];
        const hesitationWords = ['eh', 'um', 'este', 'pues'];

        let words = [...baseWords];

        // Add honesty words
        if (honestyWords.length > 0) {
            words = words.concat(honestyWords.slice(0, 1 + Math.floor(Math.random() * 2)));
        }

        // Add deception words
        if (deceptionWords.length > 0) {
            words = words.concat(deceptionWords.slice(0, 1 + Math.floor(Math.random() * 3)));
        }

        // Add hesitations based on rate
        const hesitationCount = Math.floor(words.length * hesitationRate);
        for (let i = 0; i < hesitationCount; i++) {
            words.push(hesitationWords[Math.floor(Math.random() * hesitationWords.length)]);
        }

        return words;
    }

    async runValidationSuite() {
        console.log('🧪 AVI_LAB Voice Algorithm Validation Suite');
        console.log('========================================');

        const testCases = [
            // HIGH CONFIDENCE CASES (Expected GO)
            { profile: 'honest', count: 10, expectedCategory: 'GO' },

            // MEDIUM CONFIDENCE CASES (Expected REVIEW)
            { profile: 'nervous', count: 8, expectedCategory: 'REVIEW' },

            // LOW CONFIDENCE CASES (Expected NO-GO)
            { profile: 'suspicious', count: 7, expectedCategory: 'NO_GO' },
            { profile: 'deceptive', count: 7, expectedCategory: 'NO_GO' }
        ];

        let totalTests = 0;
        let correctPredictions = 0;

        for (const testCase of testCases) {
            console.log(`\\n🎯 Testing ${testCase.profile} profile (${testCase.count} samples)`);
            console.log(`Expected category: ${testCase.expectedCategory}`);

            for (let i = 0; i < testCase.count; i++) {
                const payload = this.generateAudioPayload(testCase.profile);
                const result = this.engine.computeVoiceScore(payload);

                const decisionKey = result.decision.replace('-', '_');

                this.testResults.push({
                    testId: totalTests + 1,
                    profile: testCase.profile,
                    expected: testCase.expectedCategory,
                    actual: result.decision,
                    score: result.score,
                    metrics: result.metrics,
                    flags: result.flags.length,
                    correct: decisionKey === testCase.expectedCategory
                });

                this.categories[decisionKey].count++;
                if (decisionKey === testCase.expectedCategory) {
                    correctPredictions++;
                }

                totalTests++;

                console.log(`  Test ${totalTests}: Score=${result.score}, Decision=${result.decision}, Flags=${result.flags.length} ${decisionKey === testCase.expectedCategory ? '✅' : '❌'}`);
            }
        }

        this.generateReport(totalTests, correctPredictions);
    }

    generateReport(totalTests, correctPredictions) {
        const accuracy = ((correctPredictions / totalTests) * 100).toFixed(1);

        console.log('\\n📊 VALIDATION RESULTS SUMMARY');
        console.log('=====================================');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Correct Predictions: ${correctPredictions}`);
        console.log(`Accuracy: ${accuracy}%`);

        console.log('\\n📈 Score Distribution:');
        console.log(`  GO (≥750): ${this.categories.GO.count} tests`);
        console.log(`  REVIEW (500-749): ${this.categories.REVIEW.count} tests`);
        console.log(`  NO-GO (≤499): ${this.categories.NO_GO.count} tests`);

        console.log('\\n🔍 Detailed Metrics Analysis:');
        this.analyzeMetrics();

        console.log('\\n⚠️  Flag Analysis:');
        this.analyzeFlags();

        return {
            totalTests,
            correctPredictions,
            accuracy: parseFloat(accuracy),
            distribution: this.categories,
            detailedResults: this.testResults
        };
    }

    analyzeMetrics() {
        const metrics = ['latencyIndex', 'pitchVariability', 'disfluencyRate', 'energyStability', 'honestyLexicon'];

        for (const metric of metrics) {
            const values = this.testResults.map(r => r.metrics[metric]);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            console.log(`  ${metric}: avg=${avg.toFixed(3)}, range=[${min.toFixed(3)}, ${max.toFixed(3)}]`);
        }
    }

    analyzeFlags() {
        const flagCounts = this.testResults.map(r => r.flags);
        const avgFlags = flagCounts.reduce((a, b) => a + b, 0) / flagCounts.length;
        const maxFlags = Math.max(...flagCounts);
        const highFlagTests = this.testResults.filter(r => r.flags >= 3).length;

        console.log(`  Average flags per test: ${avgFlags.toFixed(1)}`);
        console.log(`  Maximum flags in one test: ${maxFlags}`);
        console.log(`  Tests with ≥3 flags (hard stop): ${highFlagTests}`);
    }
}

// Execute validation suite
if (typeof window === 'undefined') {
    // Node.js environment
    const validator = new VoiceValidationSuite();
    validator.runValidationSuite().then(results => {
        console.log('\\n✅ Voice Algorithm Validation Complete');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    });
} else {
    // Browser environment - attach to window for manual testing
    window.VoiceValidationSuite = VoiceValidationSuite;
}

export { VoiceValidationSuite };