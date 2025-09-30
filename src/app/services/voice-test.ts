//  TESTING: Voice Evaluation System
// Run this in browser console to test voice evaluation logic

function createMockAudioBlob(duration: number = 10): Blob {
  const sampleRate = 16000;
  const arrayBuffer = new ArrayBuffer(sampleRate * duration * 2); // 16-bit
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Test scenarios
const testScenarios = {
  
  // Scenario 1: Good response (should be GO)
  goodResponse: {
    audioBlob: createMockAudioBlob(8),
    questionId: 'unit_substitution',
    contextId: 'test_ctx_001',
    municipality: 'cuautitlan_izcalli'
  },
  
  // Scenario 2: Too short response (should be REVIEW via fallback)  
  shortResponse: {
    audioBlob: createMockAudioBlob(1),
    questionId: 'seasonal_vulnerability', 
    contextId: 'test_ctx_002',
    municipality: 'ecatepec_morelos'
  },
  
  // Scenario 3: Too long response (should be REVIEW via fallback)
  longResponse: {
    audioBlob: createMockAudioBlob(35),
    questionId: 'route_security_issues',
    contextId: 'test_ctx_003', 
    municipality: 'nezahualcoyotl'
  }
};

// Test function (call from browser console)
async function testVoiceEvaluation(voiceValidationService: any) {
  console.info('[VoiceTest] Starting voice evaluation smoke test');
  
  // Clear previous evaluations
  voiceValidationService.clearVoiceEvaluations();
  
  // Test each scenario
  for (const [scenarioName, scenario] of Object.entries(testScenarios)) {
    try {
      console.groupCollapsed(`[VoiceTest] Scenario: ${scenarioName}`);
      
      const result = await voiceValidationService.evaluateAudio(
        scenario.audioBlob,
        scenario.questionId,
        scenario.contextId,
        scenario.municipality
      );
      
      console.log('[VoiceTest] Voice evaluation result', {
        decision: result.decision,
        score: result.voiceScore,
        flags: result.flags,
        fallback: result.fallback
      });
      console.groupEnd();
      
    } catch (error) {
      console.error(`[VoiceTest] Scenario ${scenarioName} failed`, error);
    }
  }
  
  // Test aggregation
  const summary = voiceValidationService.aggregateResilience();
  console.info('[VoiceTest] Aggregated voice resilience summary', summary);
  
  if (summary?.categoryBreakdown) {
    console.table(summary.categoryBreakdown);
  }
  
  return {
    evaluations: voiceValidationService.getVoiceEvaluations(),
    summary: summary
  };
}

// Export for console use
if (typeof window !== 'undefined') {
  (window as any).testVoiceEvaluation = testVoiceEvaluation;
  (window as any).createMockAudioBlob = createMockAudioBlob;
  console.info('%c[VoiceTest] Voice evaluation helpers attached to window', 'color:var(--accent-green-500)');
}
