/**
 * 🧪 AVI Real Calibration Job
 * Enterprise-grade voice calibration with real audio samples
 * Meets quality gates: ≥30 samples, Accuracy ≥90%, F1 ≥0.90
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class AviRealCalibrationJob {
  constructor() {
    this.BFF_URL = process.env.BFF_URL || 'http://localhost:3001';
    this.DATABASE_URL = process.env.DATABASE_URL;
    this.calibrationResults = {
      timestamp: new Date().toISOString(),
      sampleCount: 0,
      accuracy: 0,
      f1Score: 0,
      precision: 0,
      recall: 0,
      consistency: 0,
      confusionMatrix: {
        truePositives: 0,
        trueNegatives: 0,
        falsePositives: 0,
        falseNegatives: 0
      },
      qualityGates: {
        minSamples: 30,
        minAccuracy: 0.90,
        minF1: 0.90,
        minConsistency: 0.90
      },
      gateStatus: 'PENDING'
    };
  }

  /**
   * Collect real audio samples from staging evaluations
   */
  async collectRealSamples() {
    console.log('📊 Collecting real audio samples from staging...');
    
    try {
      // Get audio evaluations from the last 30 days
      const response = await axios.get(`${this.BFF_URL}/api/voice/evaluations/recent`, {
        params: {
          days: 30,
          limit: 100,
          include_audio: true
        },
        timeout: 30000
      });

      const evaluations = response.data;
      console.log(`   Found ${evaluations.length} recent evaluations`);

      // Filter for complete evaluations with ground truth
      const validSamples = evaluations.filter(eval => 
        eval.audioData && 
        eval.groundTruth && 
        eval.humanVerified === true
      );

      console.log(`   Valid samples with ground truth: ${validSamples.length}`);
      
      if (validSamples.length < this.calibrationResults.qualityGates.minSamples) {
        throw new Error(`Insufficient samples: ${validSamples.length} < ${this.calibrationResults.qualityGates.minSamples}`);
      }

      return validSamples;
    } catch (error) {
      console.error('❌ Failed to collect real samples:', error.message);
      throw error;
    }
  }

  /**
   * Run calibration with collected samples
   */
  async runCalibration(samples) {
    console.log('🎯 Running AVI calibration with real samples...');
    
    const results = [];
    let truePositives = 0, trueNegatives = 0, falsePositives = 0, falseNegatives = 0;

    for (const sample of samples) {
      try {
        // Re-evaluate audio with current AVI model
        const evalResponse = await axios.post(`${this.BFF_URL}/api/voice/evaluate`, {
          audioData: sample.audioData,
          skipCache: true // Force fresh evaluation
        });

        const predicted = evalResponse.data.decision; // 'APPROVED' | 'REJECTED'
        const actual = sample.groundTruth;

        results.push({
          sampleId: sample.id,
          predicted,
          actual,
          match: predicted === actual,
          confidence: evalResponse.data.confidence,
          processingTime: evalResponse.data.processingTime
        });

        // Update confusion matrix
        if (actual === 'APPROVED' && predicted === 'APPROVED') truePositives++;
        else if (actual === 'REJECTED' && predicted === 'REJECTED') trueNegatives++;
        else if (actual === 'REJECTED' && predicted === 'APPROVED') falsePositives++;
        else if (actual === 'APPROVED' && predicted === 'REJECTED') falseNegatives++;

      } catch (error) {
        console.warn(`⚠️ Failed to evaluate sample ${sample.id}:`, error.message);
      }
    }

    // Calculate metrics
    const total = truePositives + trueNegatives + falsePositives + falseNegatives;
    const accuracy = (truePositives + trueNegatives) / total;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    // Calculate consistency (std deviation of confidence scores)
    const confidences = results.map(r => r.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - avgConfidence, 2), 0) / confidences.length;
    const consistency = 1 - Math.sqrt(variance); // Higher is better

    this.calibrationResults = {
      ...this.calibrationResults,
      sampleCount: total,
      accuracy: Math.round(accuracy * 10000) / 100, // Percentage with 2 decimals
      f1Score: Math.round(f1Score * 10000) / 100,
      precision: Math.round(precision * 10000) / 100,
      recall: Math.round(recall * 10000) / 100,
      consistency: Math.round(consistency * 10000) / 100,
      confusionMatrix: {
        truePositives,
        trueNegatives,
        falsePositives,
        falseNegatives
      },
      results,
      avgProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
    };

    console.log('📊 Calibration Results:');
    console.log(`   Sample Count: ${this.calibrationResults.sampleCount}`);
    console.log(`   Accuracy: ${this.calibrationResults.accuracy}%`);
    console.log(`   F1 Score: ${this.calibrationResults.f1Score}%`);
    console.log(`   Precision: ${this.calibrationResults.precision}%`);
    console.log(`   Recall: ${this.calibrationResults.recall}%`);
    console.log(`   Consistency: ${this.calibrationResults.consistency}%`);

    return this.calibrationResults;
  }

  /**
   * Evaluate quality gates
   */
  evaluateQualityGates() {
    const gates = this.calibrationResults.qualityGates;
    const results = this.calibrationResults;

    const gatesPassed = [
      results.sampleCount >= gates.minSamples,
      results.accuracy >= gates.minAccuracy * 100,
      results.f1Score >= gates.minF1 * 100,
      results.consistency >= gates.minConsistency * 100
    ];

    const allPassed = gatesPassed.every(gate => gate);
    this.calibrationResults.gateStatus = allPassed ? 'PASSED' : 'FAILED';

    console.log('🚦 Quality Gates:');
    console.log(`   ✓ Sample Count (≥${gates.minSamples}): ${gatesPassed[0] ? 'PASS' : 'FAIL'} (${results.sampleCount})`);
    console.log(`   ✓ Accuracy (≥${gates.minAccuracy * 100}%): ${gatesPassed[1] ? 'PASS' : 'FAIL'} (${results.accuracy}%)`);
    console.log(`   ✓ F1 Score (≥${gates.minF1 * 100}%): ${gatesPassed[2] ? 'PASS' : 'FAIL'} (${results.f1Score}%)`);
    console.log(`   ✓ Consistency (≥${gates.minConsistency * 100}%): ${gatesPassed[3] ? 'PASS' : 'FAIL'} (${results.consistency}%)`);
    console.log(`   🎯 Overall Status: ${this.calibrationResults.gateStatus}`);

    return allPassed;
  }

  /**
   * Persist calibration results to NEON database
   */
  async persistResults() {
    console.log('💾 Persisting calibration results to NEON...');
    
    try {
      const response = await axios.post(`${this.BFF_URL}/api/avi/calibration/results`, {
        calibrationResults: this.calibrationResults
      });

      console.log('✅ Calibration results persisted successfully');
      return response.data.calibrationId;
    } catch (error) {
      console.error('❌ Failed to persist results:', error.message);
      throw error;
    }
  }

  /**
   * Generate calibration report
   */
  async generateReport() {
    const reportPath = path.join(__dirname, '..', 'test-results', `avi-calibration-${Date.now()}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(this.calibrationResults, null, 2));
    console.log(`📋 Calibration report saved: ${reportPath}`);

    return reportPath;
  }

  /**
   * Run complete calibration job
   */
  async execute() {
    console.log('🚀 AVI Real Calibration Job Starting...');
    console.log('='.repeat(60));

    try {
      // 1. Collect real samples
      const samples = await this.collectRealSamples();
      
      // 2. Run calibration
      await this.runCalibration(samples);
      
      // 3. Evaluate quality gates
      const gatesPassed = this.evaluateQualityGates();
      
      // 4. Persist results
      const calibrationId = await this.persistResults();
      
      // 5. Generate report
      const reportPath = await this.generateReport();

      console.log('\n' + '='.repeat(60));
      console.log('🎉 AVI Real Calibration Job Complete!');
      console.log(`   Calibration ID: ${calibrationId}`);
      console.log(`   Status: ${this.calibrationResults.gateStatus}`);
      console.log(`   Report: ${reportPath}`);
      console.log('='.repeat(60));

      if (!gatesPassed) {
        console.error('⚠️ Quality gates failed! Review calibration parameters.');
        process.exit(1);
      }

      return this.calibrationResults;
    } catch (error) {
      console.error('❌ AVI Calibration Job Failed:', error.message);
      process.exit(1);
    }
  }
}

// Run job if called directly
if (require.main === module) {
  const job = new AviRealCalibrationJob();
  job.execute();
}

module.exports = { AviRealCalibrationJob };