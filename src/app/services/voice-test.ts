// ✅ TESTING: Voice Evaluation System
// Run this in browser console to test voice evaluation logic

// removed by clean-audit
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
// removed by clean-audit
  
  // Clear previous evaluations
  voiceValidationService.clearVoiceEvaluations();
  
  // Test each scenario
  for (const [scenarioName, scenario] of Object.entries(testScenarios)) {
    try {
// removed by clean-audit
      
      const result = await voiceValidationService.evaluateAudio(
        scenario.audioBlob,
        scenario.questionId,
        scenario.contextId,
        scenario.municipality
      );
      
// removed by clean-audit
        decision: result.decision,
        score: result.voiceScore,
        flags: result.flags,
        fallback: result.fallback
      });
      
    } catch (error) {
// removed by clean-audit
    }
  }
  
  // Test aggregation
// removed by clean-audit
  const summary = voiceValidationService.aggregateResilience();
// removed by clean-audit
  
// removed by clean-audit
  
  return {
    evaluations: voiceValidationService.getVoiceEvaluations(),
    summary: summary
  };
}

// Export for console use
if (typeof window !== 'undefined') {
  (window as any).testVoiceEvaluation = testVoiceEvaluation;
  (window as any).createMockAudioBlob = createMockAudioBlob;
// removed by clean-audit
}
// removed by clean-audit