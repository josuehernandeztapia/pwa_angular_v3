/**
 * 📊 AVI CALIBRATION UI
 * User interface for AVI calibration system with ≥30 audios and confusion matrix
 */

class AVICalibrationUI {
    constructor(calibrationSystem) {
        this.calibrationSystem = calibrationSystem;
        this.isRunningCalibration = false;
        this.currentCalibrationResults = null;
        
        this.initializeUI();
        this.bindEvents();
    }

    initializeUI() {
        // Create calibration tab content
        const calibrationSection = document.getElementById('calibration');
        if (!calibrationSection) {
            console.warn('Calibration section not found in DOM');
            return;
        }

        calibrationSection.innerHTML = this.renderCalibrationInterface();
        
        // Initialize components
        this.updateCalibrationStatus();
        this.renderExistingResults();
    }

    renderCalibrationInterface() {
        return `
            <div class="calibration-container">
                <!-- Calibration Header -->
                <div class="calibration-header">
                    <h2>🎯 AVI Calibration System</h2>
                    <p>Calibrate AVI accuracy with ≥30 audio samples and confusion matrix analysis</p>
                </div>

                <!-- Status Panel -->
                <div class="calibration-status-panel">
                    <div id="calibration-status" class="status-card">
                        <div class="status-icon">⏳</div>
                        <div class="status-content">
                            <h3>Calibration Status</h3>
                            <p id="calibration-status-text">Ready to start calibration</p>
                            <div id="calibration-progress" class="progress-bar" style="display: none;">
                                <div class="progress-fill"></div>
                                <span class="progress-text">0/30</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Calibration Controls -->
                <div class="calibration-controls">
                    <div class="control-group">
                        <h3>🚀 Run Calibration</h3>
                        <p>Process synthetic audio samples to calibrate AVI system</p>
                        <button id="start-calibration-btn" class="btn primary large">
                            🎯 Start Calibration (40 samples)
                        </button>
                        <button id="quick-calibration-btn" class="btn secondary">
                            ⚡ Quick Test (10 samples)
                        </button>
                    </div>

                    <div class="control-group">
                        <h3>📊 Analysis Tools</h3>
                        <button id="generate-confusion-matrix-btn" class="btn secondary" disabled>
                            📈 Generate Confusion Matrix
                        </button>
                        <button id="export-calibration-btn" class="btn secondary" disabled>
                            💾 Export Calibration Data
                        </button>
                        <button id="validate-calibration-btn" class="btn secondary" disabled>
                            ✅ Validate Calibration
                        </button>
                    </div>

                    <div class="control-group">
                        <h3>🔄 Data Management</h3>
                        <button id="clear-calibration-btn" class="btn danger">
                            🗑️ Clear Calibration Data
                        </button>
                        <button id="load-sample-data-btn" class="btn outline">
                            📋 Load Sample Dataset
                        </button>
                    </div>
                </div>

                <!-- Results Dashboard -->
                <div id="calibration-results" class="calibration-results" style="display: none;">
                    <h3>📊 Calibration Results</h3>
                    <div class="results-grid">
                        <div class="result-card">
                            <h4>📈 Overall Performance</h4>
                            <div id="overall-metrics" class="metrics-display">
                                <div class="metric">
                                    <span class="metric-label">Accuracy</span>
                                    <span class="metric-value" id="accuracy-value">-</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Precision</span>
                                    <span class="metric-value" id="precision-value">-</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Recall</span>
                                    <span class="metric-value" id="recall-value">-</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">F1 Score</span>
                                    <span class="metric-value" id="f1-value">-</span>
                                </div>
                            </div>
                        </div>

                        <div class="result-card">
                            <h4>🎯 Confusion Matrix</h4>
                            <div id="confusion-matrix-display" class="matrix-display">
                                <p>Run calibration to see confusion matrix</p>
                            </div>
                        </div>

                        <div class="result-card">
                            <h4>📊 Class Performance</h4>
                            <div id="class-metrics" class="class-metrics">
                                <p>Run calibration to see class-specific metrics</p>
                            </div>
                        </div>

                        <div class="result-card">
                            <h4>🔍 Recommendations</h4>
                            <div id="recommendations" class="recommendations-list">
                                <p>Run calibration to get improvement recommendations</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Analysis -->
                <div id="detailed-analysis" class="detailed-analysis" style="display: none;">
                    <h3>🔬 Detailed Analysis</h3>
                    
                    <div class="analysis-tabs">
                        <button class="tab-btn active" data-tab="sample-distribution">📊 Sample Distribution</button>
                        <button class="tab-btn" data-tab="confidence-analysis">🎯 Confidence Analysis</button>
                        <button class="tab-btn" data-tab="error-analysis">❌ Error Analysis</button>
                    </div>

                    <div class="analysis-content">
                        <div id="sample-distribution" class="analysis-tab active">
                            <div id="sample-distribution-chart" class="chart-container">
                                <p>Sample distribution will appear here</p>
                            </div>
                        </div>

                        <div id="confidence-analysis" class="analysis-tab">
                            <div id="confidence-analysis-chart" class="chart-container">
                                <p>Confidence analysis will appear here</p>
                            </div>
                        </div>

                        <div id="error-analysis" class="analysis-tab">
                            <div id="error-analysis-details" class="error-details">
                                <p>Error analysis will appear here</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Calibration Log -->
                <div class="calibration-log">
                    <h3>📝 Calibration Log</h3>
                    <div id="calibration-log-content" class="log-content">
                        <p class="log-entry">🎯 AVI Calibration System initialized</p>
                        <p class="log-entry">📊 Ready to process audio samples</p>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Main calibration controls
        document.getElementById('start-calibration-btn')?.addEventListener('click', () => {
            this.startFullCalibration();
        });

        document.getElementById('quick-calibration-btn')?.addEventListener('click', () => {
            this.startQuickCalibration();
        });

        document.getElementById('generate-confusion-matrix-btn')?.addEventListener('click', () => {
            this.generateAndDisplayConfusionMatrix();
        });

        document.getElementById('export-calibration-btn')?.addEventListener('click', () => {
            this.exportCalibrationData();
        });

        document.getElementById('validate-calibration-btn')?.addEventListener('click', () => {
            this.validateCalibration();
        });

        document.getElementById('clear-calibration-btn')?.addEventListener('click', () => {
            this.clearCalibrationData();
        });

        document.getElementById('load-sample-data-btn')?.addEventListener('click', () => {
            this.loadSampleDataset();
        });

        // Analysis tab switching
        document.querySelectorAll('.analysis-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchAnalysisTab(e.target.dataset.tab);
            });
        });
    }

    async startFullCalibration() {
        if (this.isRunningCalibration) return;
        
        this.isRunningCalibration = true;
        this.updateCalibrationStatus('🚀 Starting full calibration...', 'running');
        this.disableCalibrationControls();
        
        try {
            const results = await this.runCalibrationWithProgress();
            this.currentCalibrationResults = results;
            
            this.updateCalibrationStatus('✅ Calibration completed successfully!', 'completed');
            this.displayCalibrationResults(results);
            this.enableAnalysisControls();
            
            this.addLogEntry(`✅ Full calibration completed: ${results.totalSamples} samples processed`);
            this.addLogEntry(`📊 Overall accuracy: ${(results.metrics.overall.accuracy * 100).toFixed(1)}%`);
            
        } catch (error) {
            this.updateCalibrationStatus(`❌ Calibration failed: ${error.message}`, 'error');
            this.addLogEntry(`❌ Calibration error: ${error.message}`);
            console.error('Calibration failed:', error);
        } finally {
            this.isRunningCalibration = false;
            this.enableCalibrationControls();
        }
    }

    async startQuickCalibration() {
        if (this.isRunningCalibration) return;
        
        this.isRunningCalibration = true;
        this.updateCalibrationStatus('⚡ Running quick calibration...', 'running');
        this.disableCalibrationControls();
        
        try {
            // Use only first 10 samples for quick test
            const originalSamples = [...this.calibrationSystem.syntheticSamples];
            this.calibrationSystem.syntheticSamples = originalSamples.slice(0, 10);
            
            const results = await this.runCalibrationWithProgress();
            
            // Restore original samples
            this.calibrationSystem.syntheticSamples = originalSamples;
            
            this.currentCalibrationResults = results;
            
            this.updateCalibrationStatus('⚡ Quick calibration completed!', 'completed');
            this.displayCalibrationResults(results);
            this.enableAnalysisControls();
            
            this.addLogEntry(`⚡ Quick calibration completed: ${results.totalSamples} samples processed`);
            
        } catch (error) {
            this.updateCalibrationStatus(`❌ Quick calibration failed: ${error.message}`, 'error');
            this.addLogEntry(`❌ Quick calibration error: ${error.message}`);
            console.error('Quick calibration failed:', error);
        } finally {
            this.isRunningCalibration = false;
            this.enableCalibrationControls();
        }
    }

    async runCalibrationWithProgress() {
        const progressBar = document.getElementById('calibration-progress');
        const progressFill = progressBar?.querySelector('.progress-fill');
        const progressText = progressBar?.querySelector('.progress-text');
        
        progressBar.style.display = 'block';
        
        // Override the calibration system's runCalibration to show progress
        const samples = this.calibrationSystem.syntheticSamples;
        const results = [];
        
        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            
            // Update progress
            const progress = ((i + 1) / samples.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${i + 1}/${samples.length}`;
            
            this.addLogEntry(`📊 Processing sample ${i + 1}/${samples.length}: ${sample.id}`);
            
            // Simulate AVI analysis
            const aviResult = await this.calibrationSystem.simulateAVIAnalysis(sample);
            
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
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        // Store results and generate analysis
        this.calibrationSystem.calibrationData = results;
        localStorage.setItem('avi_calibration_data', JSON.stringify(results));
        
        this.calibrationSystem.generateConfusionMatrix();
        this.calibrationSystem.calculatePerformanceMetrics();
        
        progressBar.style.display = 'none';
        
        return {
            totalSamples: results.length,
            confusionMatrix: this.calibrationSystem.confusionMatrix,
            metrics: this.calibrationSystem.performanceMetrics,
            calibrationData: results
        };
    }

    displayCalibrationResults(results) {
        const resultsSection = document.getElementById('calibration-results');
        const detailedAnalysis = document.getElementById('detailed-analysis');
        
        resultsSection.style.display = 'block';
        detailedAnalysis.style.display = 'block';
        
        // Update overall metrics
        const metrics = results.metrics.overall;
        document.getElementById('accuracy-value').textContent = `${(metrics.accuracy * 100).toFixed(1)}%`;
        document.getElementById('precision-value').textContent = `${(metrics.avgPrecision * 100).toFixed(1)}%`;
        document.getElementById('recall-value').textContent = `${(metrics.avgRecall * 100).toFixed(1)}%`;
        document.getElementById('f1-value').textContent = `${(metrics.avgF1Score * 100).toFixed(1)}%`;
        
        // Display confusion matrix
        this.renderConfusionMatrix(results.confusionMatrix);
        
        // Display class metrics
        this.renderClassMetrics(results.metrics);
        
        // Display recommendations
        this.renderRecommendations();
        
        // Display detailed analysis
        this.renderDetailedAnalysis();
    }

    renderConfusionMatrix(confusionMatrix) {
        const container = document.getElementById('confusion-matrix-display');
        if (!confusionMatrix) {
            container.innerHTML = '<p>No confusion matrix data available</p>';
            return;
        }
        
        const { matrix, labels } = confusionMatrix;
        
        let html = '<div class="confusion-matrix">';
        
        // Header row
        html += '<div class="matrix-row header"><div class="matrix-cell"></div>';
        labels.forEach(label => {
            html += `<div class="matrix-cell header">Pred: ${label}</div>`;
        });
        html += '</div>';
        
        // Data rows
        labels.forEach(trueLabel => {
            html += `<div class="matrix-row"><div class="matrix-cell header">True: ${trueLabel}</div>`;
            labels.forEach(predLabel => {
                const value = matrix[trueLabel][predLabel];
                const isCorrect = trueLabel === predLabel;
                html += `<div class="matrix-cell ${isCorrect ? 'correct' : 'incorrect'}">${value}</div>`;
            });
            html += '</div>';
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderClassMetrics(metrics) {
        const container = document.getElementById('class-metrics');
        
        let html = '<div class="class-metrics-grid">';
        
        Object.entries(metrics).forEach(([className, metric]) => {
            if (className === 'overall') return;
            
            html += `
                <div class="class-metric-card">
                    <h5>${className}</h5>
                    <div class="metric-grid">
                        <div class="mini-metric">
                            <span class="label">Precision</span>
                            <span class="value">${(metric.precision * 100).toFixed(1)}%</span>
                        </div>
                        <div class="mini-metric">
                            <span class="label">Recall</span>
                            <span class="value">${(metric.recall * 100).toFixed(1)}%</span>
                        </div>
                        <div class="mini-metric">
                            <span class="label">F1 Score</span>
                            <span class="value">${(metric.f1Score * 100).toFixed(1)}%</span>
                        </div>
                        <div class="mini-metric">
                            <span class="label">Support</span>
                            <span class="value">${metric.support}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderRecommendations() {
        const report = this.calibrationSystem.generateCalibrationReport();
        const container = document.getElementById('recommendations');
        
        if (!report || !report.recommendations) {
            container.innerHTML = '<p>No recommendations available</p>';
            return;
        }
        
        let html = '<div class="recommendations-list">';
        
        report.recommendations.forEach(rec => {
            const priorityClass = rec.priority.toLowerCase();
            const iconMap = {
                'HIGH': '🚨',
                'MEDIUM': '⚠️',
                'LOW': 'ℹ️',
                'INFO': '✅'
            };
            
            html += `
                <div class="recommendation ${priorityClass}">
                    <div class="rec-header">
                        <span class="rec-icon">${iconMap[rec.priority] || 'ℹ️'}</span>
                        <span class="rec-type">${rec.type}</span>
                        <span class="rec-priority">${rec.priority}</span>
                    </div>
                    <div class="rec-message">${rec.message}</div>
                    <div class="rec-action"><strong>Action:</strong> ${rec.action}</div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderDetailedAnalysis() {
        // Sample Distribution
        this.renderSampleDistribution();
        
        // Confidence Analysis
        this.renderConfidenceAnalysis();
        
        // Error Analysis
        this.renderErrorAnalysis();
    }

    renderSampleDistribution() {
        const report = this.calibrationSystem.generateCalibrationReport();
        const container = document.getElementById('sample-distribution-chart');
        
        if (!report) {
            container.innerHTML = '<p>No distribution data available</p>';
            return;
        }
        
        const distribution = report.sampleDistribution;
        
        let html = '<div class="distribution-chart">';
        const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
        
        Object.entries(distribution).forEach(([label, count]) => {
            const percentage = (count / total * 100).toFixed(1);
            html += `
                <div class="distribution-bar">
                    <div class="bar-label">${label}</div>
                    <div class="bar-visual">
                        <div class="bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="bar-stats">${count} (${percentage}%)</div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderConfidenceAnalysis() {
        const report = this.calibrationSystem.generateCalibrationReport();
        const container = document.getElementById('confidence-analysis-chart');
        
        if (!report || !report.confidenceAnalysis) {
            container.innerHTML = '<p>No confidence data available</p>';
            return;
        }
        
        const confidence = report.confidenceAnalysis;
        
        let html = `
            <div class="confidence-stats">
                <div class="stat-group">
                    <h4>📊 Confidence Statistics</h4>
                    <div class="stat-row">
                        <span>Average:</span>
                        <span class="stat-value">${confidence.average.toFixed(3)}</span>
                    </div>
                    <div class="stat-row">
                        <span>Minimum:</span>
                        <span class="stat-value">${confidence.min.toFixed(3)}</span>
                    </div>
                    <div class="stat-row">
                        <span>Maximum:</span>
                        <span class="stat-value">${confidence.max.toFixed(3)}</span>
                    </div>
                </div>
                
                <div class="confidence-distribution">
                    <h4>📈 Confidence Distribution</h4>
        `;
        
        Object.entries(confidence.distribution).forEach(([range, count]) => {
            html += `
                <div class="confidence-range">
                    <span class="range-label">${range}</span>
                    <span class="range-count">${count} samples</span>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    renderErrorAnalysis() {
        const container = document.getElementById('error-analysis-details');
        
        if (!this.currentCalibrationResults) {
            container.innerHTML = '<p>No error analysis data available</p>';
            return;
        }
        
        const errors = this.currentCalibrationResults.calibrationData.filter(entry => 
            entry.groundTruth !== entry.aviPrediction
        );
        
        let html = `
            <div class="error-analysis">
                <h4>❌ Misclassified Samples</h4>
                <p>Total errors: ${errors.length} out of ${this.currentCalibrationResults.totalSamples}</p>
                
                <div class="error-list">
        `;
        
        errors.forEach(error => {
            html += `
                <div class="error-item">
                    <div class="error-header">
                        <strong>${error.sampleId}</strong>
                        <span class="pattern-tag">${error.pattern}</span>
                    </div>
                    <div class="error-details">
                        <span class="ground-truth">Expected: ${error.groundTruth}</span>
                        <span class="prediction">Got: ${error.aviPrediction}</span>
                        <span class="score">Score: ${error.aviScore}</span>
                        <span class="confidence">Confidence: ${error.confidence.toFixed(3)}</span>
                    </div>
                </div>
            `;
        });
        
        if (errors.length === 0) {
            html += '<p class="success">🎉 Perfect classification! No errors found.</p>';
        }
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    updateCalibrationStatus(message, status = 'ready') {
        const statusCard = document.getElementById('calibration-status');
        const statusText = document.getElementById('calibration-status-text');
        const statusIcon = statusCard.querySelector('.status-icon');
        
        statusText.textContent = message;
        
        // Update icon and styling based on status
        const statusConfig = {
            'ready': { icon: '⏳', class: 'status-ready' },
            'running': { icon: '🔄', class: 'status-running' },
            'completed': { icon: '✅', class: 'status-completed' },
            'error': { icon: '❌', class: 'status-error' }
        };
        
        const config = statusConfig[status] || statusConfig.ready;
        statusIcon.textContent = config.icon;
        
        // Reset classes and add new one
        statusCard.className = 'status-card ' + config.class;
        
        if (status === 'running') {
            statusIcon.style.animation = 'spin 1s linear infinite';
        } else {
            statusIcon.style.animation = '';
        }
    }

    disableCalibrationControls() {
        document.getElementById('start-calibration-btn').disabled = true;
        document.getElementById('quick-calibration-btn').disabled = true;
    }

    enableCalibrationControls() {
        document.getElementById('start-calibration-btn').disabled = false;
        document.getElementById('quick-calibration-btn').disabled = false;
    }

    enableAnalysisControls() {
        document.getElementById('generate-confusion-matrix-btn').disabled = false;
        document.getElementById('export-calibration-btn').disabled = false;
        document.getElementById('validate-calibration-btn').disabled = false;
    }

    addLogEntry(message) {
        const logContent = document.getElementById('calibration-log-content');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('p');
        logEntry.className = 'log-entry';
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        logContent.insertBefore(logEntry, logContent.firstChild);
        
        // Keep only last 20 entries
        while (logContent.children.length > 20) {
            logContent.removeChild(logContent.lastChild);
        }
    }

    switchAnalysisTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.analysis-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.analysis-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    generateAndDisplayConfusionMatrix() {
        if (!this.currentCalibrationResults) {
            alert('No calibration data available. Run calibration first.');
            return;
        }
        
        this.calibrationSystem.generateConfusionMatrix();
        this.renderConfusionMatrix(this.calibrationSystem.confusionMatrix);
        this.addLogEntry('📊 Confusion matrix regenerated');
    }

    exportCalibrationData() {
        try {
            const exportData = this.calibrationSystem.exportCalibrationData();
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `avi-calibration-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.addLogEntry('💾 Calibration data exported successfully');
        } catch (error) {
            alert(`Export failed: ${error.message}`);
            this.addLogEntry(`❌ Export failed: ${error.message}`);
        }
    }

    validateCalibration() {
        const validation = this.calibrationSystem.validateCalibration();
        
        let message = `Validation Result: ${validation.valid ? 'PASSED ✅' : 'FAILED ❌'}\n\n`;
        message += `Recommendation: ${validation.recommendation}\n`;
        
        if (validation.validations && validation.validations.length > 0) {
            message += '\nIssues found:\n';
            validation.validations.forEach((issue, index) => {
                message += `${index + 1}. ${issue}\n`;
            });
        }
        
        alert(message);
        this.addLogEntry(`🔍 Validation completed: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    }

    clearCalibrationData() {
        if (confirm('Are you sure you want to clear all calibration data?')) {
            this.calibrationSystem.calibrationData = [];
            localStorage.removeItem('avi_calibration_data');
            
            // Reset UI
            document.getElementById('calibration-results').style.display = 'none';
            document.getElementById('detailed-analysis').style.display = 'none';
            this.disableAnalysisControls();
            this.updateCalibrationStatus('Ready to start calibration');
            
            this.addLogEntry('🗑️ Calibration data cleared');
        }
    }

    loadSampleDataset() {
        // Simulate loading a pre-prepared dataset
        this.addLogEntry('📋 Loading sample dataset...');
        
        // This would typically load from a file or API
        setTimeout(() => {
            this.addLogEntry('📋 Sample dataset loaded: 40 synthetic samples');
            this.updateCalibrationStatus('Sample dataset loaded - ready for calibration');
        }, 1000);
    }

    renderExistingResults() {
        // Check if we have existing calibration data
        if (this.calibrationSystem.calibrationData.length > 0) {
            this.currentCalibrationResults = {
                totalSamples: this.calibrationSystem.calibrationData.length,
                confusionMatrix: this.calibrationSystem.confusionMatrix,
                metrics: this.calibrationSystem.performanceMetrics,
                calibrationData: this.calibrationSystem.calibrationData
            };
            
            if (this.currentCalibrationResults.metrics) {
                this.displayCalibrationResults(this.currentCalibrationResults);
                this.enableAnalysisControls();
                this.updateCalibrationStatus('Previous calibration data loaded');
                this.addLogEntry(`📊 Loaded existing calibration: ${this.currentCalibrationResults.totalSamples} samples`);
            }
        }
    }

    disableAnalysisControls() {
        document.getElementById('generate-confusion-matrix-btn').disabled = true;
        document.getElementById('export-calibration-btn').disabled = true;
        document.getElementById('validate-calibration-btn').disabled = true;
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AVICalibrationUI;
} else if (typeof window !== 'undefined') {
    window.AVICalibrationUI = AVICalibrationUI;
}