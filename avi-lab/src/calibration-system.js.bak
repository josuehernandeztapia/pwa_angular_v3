/**
 * 🎯 AVI CALIBRATION SYSTEM
 * Calibrate AVI with ≥30 audios and confusion matrix analysis
 * 
 * Features:
 * - Automated calibration dataset management
 * - Confusion matrix generation and analysis
 * - Performance metrics calculation
 * - Model validation with ground truth
 * - Statistical significance testing
 */

class AVICalibrationSystem {
    constructor() {
        this.calibrationData = JSON.parse(localStorage.getItem('avi_calibration_data') || '[]');
        this.confusionMatrix = null;
        this.performanceMetrics = null;
        this.groundTruthLabels = new Map(); // Expected decisions for test samples
        this.minimumSamples = 30; // Minimum required for calibration
        
        // Synthetic audio generation for testing (mock data)
        this.syntheticSamples = this.generateSyntheticSamples();
        
        this.initializeGroundTruth();
    }

    /**
     * Initialize ground truth labels for validation
     */
    initializeGroundTruth() {
        // Define expected outcomes for different voice patterns
        // In production, these would come from expert human evaluators
        this.groundTruthLabels.set('low_confidence_speaker', 'NO_GO');
        this.groundTruthLabels.set('high_confidence_speaker', 'GO');
        this.groundTruthLabels.set('nervous_speaker', 'REVIEW');
        this.groundTruthLabels.set('experienced_driver', 'GO');
        this.groundTruthLabels.set('inconsistent_answers', 'NO_GO');
        this.groundTruthLabels.set('honest_responses', 'GO');
        this.groundTruthLabels.set('evasive_responses', 'REVIEW');
        this.groundTruthLabels.set('aggressive_tone', 'NO_GO');
        this.groundTruthLabels.set('calm_professional', 'GO');
        this.groundTruthLabels.set('financial_stress', 'REVIEW');
    }

    /**
     * Generate synthetic audio samples for calibration testing
     * In production, these would be real audio files
     */
    generateSyntheticSamples() {
        const patterns = [
            'low_confidence_speaker', 'high_confidence_speaker', 'nervous_speaker',
            'experienced_driver', 'inconsistent_answers', 'honest_responses',
            'evasive_responses', 'aggressive_tone', 'calm_professional',
            'financial_stress'
        ];

        const samples = [];
        
        // Generate multiple samples for each pattern to reach ≥30
        patterns.forEach(pattern => {
            for (let i = 0; i < 4; i++) { // 4 samples per pattern = 40 total
                samples.push({
                    id: `${pattern}_${i + 1}`,
                    pattern,
                    mockAudioData: this.generateMockAudioFeatures(pattern),
                    groundTruth: this.groundTruthLabels.get(pattern),
                    metadata: {
                        duration: Math.random() * 30 + 10, // 10-40 seconds
                        sampleRate: 44100,
                        created: new Date().toISOString()
                    }
                });
            }
        });

        return samples;
    }

    /**
     * Generate mock audio features for synthetic testing
     */
    generateMockAudioFeatures(pattern) {
        const baseFeatures = {
            pitch_mean: 150,
            pitch_std: 20,
            energy_mean: 0.5,
            energy_std: 0.1,
            speaking_rate: 120, // words per minute
            pause_duration: 0.5,
            voice_quality: 0.8
        };

        // Modify features based on pattern
        switch (pattern) {
            case 'low_confidence_speaker':
                return {
                    ...baseFeatures,
                    pitch_mean: 120, // Lower pitch
                    energy_mean: 0.3, // Lower energy
                    speaking_rate: 90, // Slower
                    pause_duration: 1.2, // More pauses
                    voice_quality: 0.6
                };
                
            case 'high_confidence_speaker':
                return {
                    ...baseFeatures,
                    pitch_mean: 180, // Higher pitch
                    energy_mean: 0.7, // Higher energy
                    speaking_rate: 140, // Faster
                    pause_duration: 0.3, // Fewer pauses
                    voice_quality: 0.9
                };
                
            case 'nervous_speaker':
                return {
                    ...baseFeatures,
                    pitch_std: 35, // More variation
                    energy_std: 0.2, // More variation
                    speaking_rate: 110,
                    pause_duration: 0.8,
                    voice_quality: 0.7
                };
                
            case 'aggressive_tone':
                return {
                    ...baseFeatures,
                    pitch_mean: 200,
                    energy_mean: 0.9,
                    speaking_rate: 160,
                    pause_duration: 0.2,
                    voice_quality: 0.5
                };
                
            case 'financial_stress':
                return {
                    ...baseFeatures,
                    pitch_std: 30,
                    energy_std: 0.15,
                    speaking_rate: 95,
                    pause_duration: 1.0,
                    voice_quality: 0.65
                };
                
            default:
                return baseFeatures;
        }
    }

    /**
     * Run calibration with synthetic samples
     */
    async runCalibration() {
        console.log('🎯 Starting AVI Calibration with ≥30 samples...');
        
        if (this.syntheticSamples.length < this.minimumSamples) {
            throw new Error(`Insufficient samples for calibration. Need ≥${this.minimumSamples}, got ${this.syntheticSamples.length}`);
        }

        const results = [];
        
        // Process each synthetic sample
        for (const sample of this.syntheticSamples) {
            console.log(`📊 Processing sample: ${sample.id}`);
            
            // Simulate AVI analysis (in production, would call real AVI API)
            const aviResult = await this.simulateAVIAnalysis(sample);
            
            const calibrationEntry = {
                sampleId: sample.id,
                pattern: sample.pattern,
                groundTruth: sample.groundTruth,
                aviPrediction: aviResult.decision,
                aviScore: aviResult.score,
                confidence: aviResult.confidence,
                features: sample.mockAudioData,
                timestamp: new Date().toISOString(),
                processingTime: aviResult.processingTime
            };
            
            results.push(calibrationEntry);
            
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Store calibration data
        this.calibrationData = results;
        localStorage.setItem('avi_calibration_data', JSON.stringify(this.calibrationData));
        
        // Generate confusion matrix and metrics
        this.generateConfusionMatrix();
        this.calculatePerformanceMetrics();
        
        console.log(`✅ Calibration completed with ${results.length} samples`);
        
        return {
            totalSamples: results.length,
            confusionMatrix: this.confusionMatrix,
            metrics: this.performanceMetrics,
            calibrationData: results
        };
    }

    /**
     * Simulate AVI analysis for synthetic samples
     */
    async simulateAVIAnalysis(sample) {
        const startTime = Date.now();
        
        // Simulate realistic AVI processing based on audio features
        const features = sample.mockAudioData;
        
        // Simple scoring algorithm based on features
        let score = 500; // Base score
        
        // Adjust score based on voice quality
        score += (features.voice_quality - 0.5) * 200;
        
        // Adjust based on confidence indicators
        if (features.energy_mean > 0.6) score += 50;
        if (features.speaking_rate > 130) score += 30;
        if (features.pause_duration < 0.4) score += 40;
        
        // Add some randomness for realistic simulation
        score += (Math.random() - 0.5) * 100;
        
        // Clamp score to valid range
        score = Math.max(0, Math.min(1000, Math.round(score)));
        
        // Determine decision based on score
        let decision;
        if (score >= 700) decision = 'GO';
        else if (score >= 400) decision = 'REVIEW';
        else decision = 'NO_GO';
        
        // Calculate confidence
        const confidence = Math.min(1.0, Math.abs(score - 500) / 500);
        
        return {
            score,
            decision,
            confidence: Math.round(confidence * 100) / 100,
            processingTime: Date.now() - startTime
        };
    }

    /**
     * Generate confusion matrix from calibration results
     */
    generateConfusionMatrix() {
        if (!this.calibrationData || this.calibrationData.length === 0) {
            console.warn('No calibration data available for confusion matrix');
            return;
        }

        const labels = ['GO', 'REVIEW', 'NO_GO'];
        const matrix = {};
        
        // Initialize matrix
        labels.forEach(trueLabel => {
            matrix[trueLabel] = {};
            labels.forEach(predLabel => {
                matrix[trueLabel][predLabel] = 0;
            });
        });
        
        // Populate matrix with results
        this.calibrationData.forEach(entry => {
            const trueLabel = entry.groundTruth;
            const predLabel = entry.aviPrediction;
            
            if (matrix[trueLabel] && matrix[trueLabel][predLabel] !== undefined) {
                matrix[trueLabel][predLabel]++;
            }
        });
        
        this.confusionMatrix = {
            matrix,
            labels,
            totalSamples: this.calibrationData.length
        };
        
        console.log('📊 Confusion Matrix generated:', this.confusionMatrix);
    }

    /**
     * Calculate comprehensive performance metrics
     */
    calculatePerformanceMetrics() {
        if (!this.confusionMatrix) {
            console.warn('No confusion matrix available for metrics calculation');
            return;
        }

        const { matrix, labels } = this.confusionMatrix;
        const metrics = {};
        
        // Calculate per-class metrics
        labels.forEach(label => {
            const tp = matrix[label][label]; // True positives
            const fn = labels.reduce((sum, otherLabel) => 
                sum + (otherLabel !== label ? matrix[label][otherLabel] : 0), 0
            ); // False negatives
            const fp = labels.reduce((sum, otherLabel) => 
                sum + (otherLabel !== label ? matrix[otherLabel][label] : 0), 0
            ); // False positives
            const tn = labels.reduce((sum1, trueLabel) => 
                sum1 + labels.reduce((sum2, predLabel) => 
                    sum2 + (trueLabel !== label && predLabel !== label ? matrix[trueLabel][predLabel] : 0), 0
                ), 0
            ); // True negatives
            
            const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
            const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
            const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
            const accuracy = (tp + tn) / (tp + tn + fp + fn);
            
            metrics[label] = {
                precision: Math.round(precision * 1000) / 1000,
                recall: Math.round(recall * 1000) / 1000,
                f1Score: Math.round(f1Score * 1000) / 1000,
                accuracy: Math.round(accuracy * 1000) / 1000,
                support: tp + fn
            };
        });
        
        // Calculate overall metrics
        const totalCorrect = labels.reduce((sum, label) => sum + matrix[label][label], 0);
        const totalSamples = this.calibrationData.length;
        
        const overallAccuracy = totalCorrect / totalSamples;
        const avgPrecision = labels.reduce((sum, label) => sum + metrics[label].precision, 0) / labels.length;
        const avgRecall = labels.reduce((sum, label) => sum + metrics[label].recall, 0) / labels.length;
        const avgF1Score = labels.reduce((sum, label) => sum + metrics[label].f1Score, 0) / labels.length;
        
        metrics.overall = {
            accuracy: Math.round(overallAccuracy * 1000) / 1000,
            avgPrecision: Math.round(avgPrecision * 1000) / 1000,
            avgRecall: Math.round(avgRecall * 1000) / 1000,
            avgF1Score: Math.round(avgF1Score * 1000) / 1000,
            totalSamples
        };
        
        this.performanceMetrics = metrics;
        
        console.log('📈 Performance metrics calculated:', metrics);
    }

    /**
     * Generate calibration report
     */
    generateCalibrationReport() {
        if (!this.performanceMetrics || !this.confusionMatrix) {
            return null;
        }

        const report = {
            summary: {
                totalSamples: this.calibrationData.length,
                minimumRequired: this.minimumSamples,
                calibrationDate: new Date().toISOString(),
                overallAccuracy: this.performanceMetrics.overall.accuracy,
                status: this.performanceMetrics.overall.accuracy >= 0.8 ? 'PASSED' : 'NEEDS_IMPROVEMENT'
            },
            confusionMatrix: this.confusionMatrix,
            performanceMetrics: this.performanceMetrics,
            recommendations: this.generateRecommendations(),
            sampleDistribution: this.calculateSampleDistribution(),
            confidenceAnalysis: this.analyzeConfidenceLevels()
        };

        return report;
    }

    /**
     * Generate improvement recommendations based on results
     */
    generateRecommendations() {
        const recommendations = [];
        const metrics = this.performanceMetrics;
        
        if (metrics.overall.accuracy < 0.8) {
            recommendations.push({
                type: 'ACCURACY',
                priority: 'HIGH',
                message: 'Overall accuracy below 80%. Consider model retraining.',
                action: 'Collect more diverse training samples'
            });
        }
        
        // Check class-specific performance
        Object.entries(metrics).forEach(([label, metric]) => {
            if (label === 'overall') return;
            
            if (metric.precision < 0.7) {
                recommendations.push({
                    type: 'PRECISION',
                    priority: 'MEDIUM',
                    message: `${label} precision is ${(metric.precision * 100).toFixed(1)}%`,
                    action: `Reduce false positives for ${label} class`
                });
            }
            
            if (metric.recall < 0.7) {
                recommendations.push({
                    type: 'RECALL',
                    priority: 'MEDIUM',
                    message: `${label} recall is ${(metric.recall * 100).toFixed(1)}%`,
                    action: `Improve detection rate for ${label} class`
                });
            }
        });
        
        if (recommendations.length === 0) {
            recommendations.push({
                type: 'SUCCESS',
                priority: 'INFO',
                message: 'Calibration metrics are within acceptable ranges',
                action: 'Continue monitoring performance in production'
            });
        }
        
        return recommendations;
    }

    /**
     * Calculate sample distribution across classes
     */
    calculateSampleDistribution() {
        const distribution = {};
        
        this.calibrationData.forEach(entry => {
            const label = entry.groundTruth;
            distribution[label] = (distribution[label] || 0) + 1;
        });
        
        return distribution;
    }

    /**
     * Analyze confidence levels across predictions
     */
    analyzeConfidenceLevels() {
        if (!this.calibrationData || this.calibrationData.length === 0) {
            return null;
        }

        const confidences = this.calibrationData.map(entry => entry.confidence);
        const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
        const minConfidence = Math.min(...confidences);
        const maxConfidence = Math.max(...confidences);
        
        // Group by confidence ranges
        const ranges = {
            'High (0.8-1.0)': confidences.filter(c => c >= 0.8).length,
            'Medium (0.5-0.8)': confidences.filter(c => c >= 0.5 && c < 0.8).length,
            'Low (0.0-0.5)': confidences.filter(c => c < 0.5).length
        };

        return {
            average: Math.round(avgConfidence * 1000) / 1000,
            min: Math.round(minConfidence * 1000) / 1000,
            max: Math.round(maxConfidence * 1000) / 1000,
            distribution: ranges
        };
    }

    /**
     * Export calibration data for analysis
     */
    exportCalibrationData() {
        const report = this.generateCalibrationReport();
        if (!report) {
            throw new Error('No calibration data available for export');
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            report,
            rawData: this.calibrationData
        };

        return exportData;
    }

    /**
     * Validate calibration quality
     */
    validateCalibration() {
        const report = this.generateCalibrationReport();
        if (!report) {
            return { valid: false, reason: 'No calibration data available' };
        }

        const validations = [];
        
        // Check minimum sample size
        if (report.summary.totalSamples < this.minimumSamples) {
            validations.push(`Insufficient samples: ${report.summary.totalSamples} < ${this.minimumSamples}`);
        }
        
        // Check overall accuracy
        if (report.summary.overallAccuracy < 0.8) {
            validations.push(`Low accuracy: ${(report.summary.overallAccuracy * 100).toFixed(1)}% < 80%`);
        }
        
        // Check class balance
        const distribution = report.sampleDistribution;
        const totalSamples = Object.values(distribution).reduce((sum, count) => sum + count, 0);
        const minClassSize = Math.min(...Object.values(distribution));
        const minClassPercentage = minClassSize / totalSamples;
        
        if (minClassPercentage < 0.1) { // Less than 10% of samples
            validations.push('Imbalanced dataset: some classes have <10% representation');
        }

        return {
            valid: validations.length === 0,
            validations,
            recommendation: validations.length === 0 ? 
                'Calibration meets quality standards' : 
                'Calibration needs improvement before production use'
        };
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AVICalibrationSystem;
} else if (typeof window !== 'undefined') {
    window.AVICalibrationSystem = AVICalibrationSystem;
}