import { TestBed } from '@angular/core/testing';
import { ConfigurationService } from './configuration.service';
import { BusinessFlow } from '../models/types';
import { ApplicationConfiguration } from '../models/configuration.types';

describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfigurationService]
    });
    service = TestBed.inject(ConfigurationService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should provide configuration observable', () => {
      expect(service.configuration$).toBeDefined();
      
      service.configuration$.subscribe(config => {
        expect(config).toBeTruthy();
        expect(config.version).toBeDefined();
        expect(config.lastUpdated).toBeInstanceOf(Date);
      });
    });

    it('should load default configuration on initialization', () => {
      const currentConfig = service.getCurrentConfiguration();
      
      expect(currentConfig).toBeTruthy();
      expect(currentConfig.markets).toBeDefined();
      expect(currentConfig.scoring).toBeDefined();
      expect(currentConfig.businessFlows).toBeDefined();
    });
  });

  describe('Configuration Loading and Updates', () => {
    it('should get current configuration', () => {
      const config = service.getCurrentConfiguration();
      
      expect(config).toBeTruthy();
      expect(config.markets.aguascalientes).toBeDefined();
      expect(config.markets.edomex).toBeDefined();
    });

    it('should refresh configuration from API', (done) => {
      service.refreshConfiguration().subscribe(config => {
        expect(config).toBeTruthy();
        expect(config.version).toBe('1.0.0');
        done();
      });
    });

    it('should update configuration successfully', (done) => {
      const updateData: Partial<ApplicationConfiguration> = {
        version: '1.1.0'
      };

      service.updateConfiguration(updateData).subscribe(success => {
        expect(success).toBe(true);
        
        const updatedConfig = service.getCurrentConfiguration();
        expect(updatedConfig.version).toBe('1.1.0');
        expect(updatedConfig.lastUpdated).toBeInstanceOf(Date);
        done();
      });
    });

    it('should preserve existing configuration when updating', (done) => {
      const originalConfig = service.getCurrentConfiguration();
      const originalMarkets = originalConfig.markets;

      const updateData: Partial<ApplicationConfiguration> = {
        version: '2.0.0'
      };

      service.updateConfiguration(updateData).subscribe(() => {
        const updatedConfig = service.getCurrentConfiguration();
        
        expect(updatedConfig.version).toBe('2.0.0');
        expect(updatedConfig.markets).toEqual(originalMarkets);
        done();
      });
    });
  });

  describe('Market Configuration', () => {
    it('should get market configuration', () => {
      const marketConfig = service.getMarketConfiguration();
      
      expect(marketConfig).toBeDefined();
      expect(marketConfig.aguascalientes).toBeDefined();
      expect(marketConfig.edomex).toBeDefined();
    });

    it('should have correct Aguascalientes market configuration', () => {
      const marketConfig = service.getMarketConfiguration();
      const agsConfig = marketConfig.aguascalientes;
      
      expect(agsConfig.interestRate).toBe(0.255);
      expect(agsConfig.standardTerm).toBe(24);
      expect(agsConfig.minimumDownPayment).toBe(0.60);
    });

    it('should have correct Estado de México market configuration', () => {
      const marketConfig = service.getMarketConfiguration();
      const edomexConfig = marketConfig.edomex;
      
      expect(edomexConfig.interestRate).toBe(0.299);
      expect(edomexConfig.standardTermIndividual).toBe(48);
      expect(edomexConfig.standardTermCollective).toBe(60);
      expect(edomexConfig.minimumDownPaymentIndividual).toBe(0.25);
      expect(edomexConfig.minimumDownPaymentCollective).toBe(0.15);
    });

    it('should include EdoMex municipalities', () => {
      const marketConfig = service.getMarketConfiguration();
      const municipalities = marketConfig.edomex.municipalities;
      
      expect(municipalities).toBeDefined();
      expect(municipalities!.length).toBeGreaterThan(0);
      
      const ecatepec = municipalities!.find(m => m.code === 'ecatepec');
      expect(ecatepec).toBeTruthy();
      expect(ecatepec!.name).toBe('Ecatepec de Morelos');
      expect(ecatepec!.zone).toBe('ZMVM');
    });
  });

  describe('Scoring Configuration', () => {
    it('should get scoring configuration', () => {
      const scoringConfig = service.getScoringConfiguration();
      
      expect(scoringConfig).toBeDefined();
      expect(scoringConfig.businessFlowRequirements).toBeDefined();
      expect(scoringConfig.scoringThresholds).toBeDefined();
      expect(scoringConfig.scoringFactors).toBeDefined();
    });

    it('should have business flow scoring requirements', () => {
      const scoringConfig = service.getScoringConfiguration();
      const requirements = scoringConfig.businessFlowRequirements;
      
      expect(requirements[BusinessFlow.VentaDirecta]).toBeDefined();
      expect(requirements[BusinessFlow.VentaPlazo]).toBeDefined();
      expect(requirements[BusinessFlow.CreditoColectivo]).toBeDefined();
      expect(requirements[BusinessFlow.AhorroProgramado]).toBeDefined();
      
      // Verify specific requirements
      expect(requirements[BusinessFlow.VentaDirecta].minScore).toBe(700);
      expect(requirements[BusinessFlow.CreditoColectivo].minScore).toBe(620);
    });

    it('should have correct scoring thresholds', () => {
      const scoringConfig = service.getScoringConfiguration();
      const thresholds = scoringConfig.scoringThresholds.grades;
      
      expect(thresholds['A+']).toBeDefined();
      expect(thresholds['A+'].min).toBe(800);
      expect(thresholds['A+'].decision).toBe('APPROVED');
      expect(thresholds['A+'].risk).toBe('LOW');
      
      expect(thresholds['C'].decision).toBe('REJECTED');
      expect(thresholds['D'].decision).toBe('REJECTED');
    });

    it('should have scoring factors configuration', () => {
      const scoringConfig = service.getScoringConfiguration();
      const factors = scoringConfig.scoringFactors;
      
      expect(factors.documentBonus.ineApproved).toBe(20);
      expect(factors.documentBonus.kycCompleted).toBe(25);
      expect(factors.marketBonus.aguascalientes).toBe(10);
      expect(factors.businessFlowModifiers[BusinessFlow.CreditoColectivo]).toBe(15);
    });
  });

  describe('Business Flow Configuration', () => {
    it('should get business flow configuration', () => {
      const businessFlowConfig = service.getBusinessFlowConfiguration();
      
      expect(businessFlowConfig).toBeDefined();
      expect(businessFlowConfig[BusinessFlow.VentaDirecta]).toBeDefined();
      expect(businessFlowConfig[BusinessFlow.VentaPlazo]).toBeDefined();
      expect(businessFlowConfig[BusinessFlow.CreditoColectivo]).toBeDefined();
      expect(businessFlowConfig[BusinessFlow.AhorroProgramado]).toBeDefined();
    });

    it('should have correct VentaDirecta configuration', () => {
      const businessFlowConfig = service.getBusinessFlowConfiguration();
      const ventaDirecta = businessFlowConfig[BusinessFlow.VentaDirecta];
      
      expect(ventaDirecta.interestRate).toBe(0);
      expect(ventaDirecta.requiresImmediateCapacity).toBe(true);
    });

    it('should have correct CreditoColectivo configuration', () => {
      const businessFlowConfig = service.getBusinessFlowConfiguration();
      const creditoColectivo = businessFlowConfig[BusinessFlow.CreditoColectivo];
      
      expect(creditoColectivo.maxTerm?.edomex).toBe(60);
      expect(creditoColectivo.groupRequirements?.minMembers).toBe(5);
      expect(creditoColectivo.groupRequirements?.avgScoreRequired).toBe(650);
    });
  });

  describe('AVI Configuration', () => {
    it('should get AVI configuration', () => {
      const aviConfig = service.getAVIConfiguration();
      
      expect(aviConfig).toBeDefined();
      expect(aviConfig.enabled).toBe(true);
      expect(aviConfig.timeout).toBe(30000);
      expect(aviConfig.retryAttempts).toBe(3);
    });

    it('should have core AVI questions', () => {
      const aviConfig = service.getAVIConfiguration();
      const coreQuestions = aviConfig.questions.core;
      
      expect(coreQuestions.length).toBeGreaterThan(0);
      
      const nameQuestion = coreQuestions.find(q => q.id === 'name_verification');
      expect(nameQuestion).toBeTruthy();
      expect(nameQuestion!.type).toBe('identity');
      expect(nameQuestion!.required).toBe(true);
      expect(nameQuestion!.weight).toBe(10);
    });

    it('should have business flow specific questions', () => {
      const aviConfig = service.getAVIConfiguration();
      const businessFlowQuestions = aviConfig.questions.businessFlow;
      
      expect(businessFlowQuestions[BusinessFlow.VentaPlazo]).toBeDefined();
      expect(businessFlowQuestions[BusinessFlow.CreditoColectivo]).toBeDefined();
      
      const routeQuestion = businessFlowQuestions[BusinessFlow.VentaPlazo].find(
        q => q.id === 'route_experience'
      );
      expect(routeQuestion).toBeTruthy();
      expect(routeQuestion!.expectedAnswerType).toBe('number');
    });

    it('should have market specific questions', () => {
      const aviConfig = service.getAVIConfiguration();
      const marketQuestions = aviConfig.questions.market;
      
      expect(marketQuestions.edomex).toBeDefined();
      
      const municipalityQuestion = marketQuestions.edomex.find(
        q => q.id === 'municipality_confirm'
      );
      expect(municipalityQuestion).toBeTruthy();
      expect(municipalityQuestion!.expectedAnswerType).toBe('choice');
      expect(municipalityQuestion!.choices).toContain('Ecatepec');
    });

    it('should have random questions configuration', () => {
      const aviConfig = service.getAVIConfiguration();
      const randomConfig = aviConfig.randomQuestions;
      
      expect(randomConfig.enabled).toBe(true);
      expect(randomConfig.selectionCount).toBe(2);
      expect(randomConfig.weightedSelection).toBe(true);
      expect(randomConfig.pool.length).toBeGreaterThan(0);
    });

    it('should have validation configuration', () => {
      const aviConfig = service.getAVIConfiguration();
      const validation = aviConfig.validation;
      
      expect(validation.minimumConfidenceScore).toBe(0.75);
      expect(validation.requiresHumanReview).toBe(true);
      expect(validation.autoApprovalThreshold).toBe(0.90);
    });
  });

  describe('Questionnaire Configuration', () => {
    it('should get questionnaire configuration', () => {
      const questionnaireConfig = service.getQuestionnaireConfiguration();
      
      expect(questionnaireConfig).toBeDefined();
      expect(questionnaireConfig.standardQuestionnaire).toBeDefined();
      expect(questionnaireConfig.dynamicQuestionnaire).toBeDefined();
    });

    it('should have standard questionnaire sections', () => {
      const questionnaireConfig = service.getQuestionnaireConfiguration();
      const sections = questionnaireConfig.standardQuestionnaire.sections;
      
      expect(sections.length).toBeGreaterThan(0);
      
      const personalSection = sections.find(s => s.id === 'personal_info');
      expect(personalSection).toBeTruthy();
      expect(personalSection!.required).toBe(true);
      expect(personalSection!.questions.length).toBeGreaterThan(0);
    });

    it('should have completion requirements', () => {
      const questionnaireConfig = service.getQuestionnaireConfiguration();
      const requirements = questionnaireConfig.standardQuestionnaire.completionRequirements;
      
      expect(requirements.minimumSections).toBe(2);
      expect(requirements.minimumQuestionsPerSection).toBe(1);
      expect(requirements.allowSkipOptional).toBe(true);
    });

    it('should have dynamic questionnaire configuration', () => {
      const questionnaireConfig = service.getQuestionnaireConfiguration();
      const dynamic = questionnaireConfig.dynamicQuestionnaire;
      
      expect(dynamic.enabled).toBe(true);
      expect(dynamic.adaptiveLogic).toBe(true);
      expect(dynamic.branchingRules.length).toBeGreaterThan(0);
    });
  });

  describe('Notification Configuration', () => {
    it('should get notification configuration', () => {
      const notificationConfig = service.getNotificationConfiguration();
      
      expect(notificationConfig).toBeDefined();
      expect(notificationConfig.channels).toBeDefined();
      expect(notificationConfig.triggers).toBeDefined();
      expect(notificationConfig.schedules).toBeDefined();
    });

    it('should have channel configurations', () => {
      const notificationConfig = service.getNotificationConfiguration();
      const channels = notificationConfig.channels;
      
      expect(channels.email.enabled).toBe(true);
      expect(channels.sms.enabled).toBe(true);
      expect(channels.push.enabled).toBe(true);
      expect(channels.whatsapp.enabled).toBe(false);
    });

    it('should have email templates', () => {
      const notificationConfig = service.getNotificationConfiguration();
      const emailTemplates = notificationConfig.channels.email.templates;
      
      expect(emailTemplates.length).toBeGreaterThan(0);
      
      const welcomeTemplate = emailTemplates.find(t => t.id === 'welcome_email');
      expect(welcomeTemplate).toBeTruthy();
      expect(welcomeTemplate!.subject).toBe('Bienvenido a Conductores PWA');
      expect(welcomeTemplate!.variables).toContain('clientName');
    });

    it('should have SMS templates with length limits', () => {
      const notificationConfig = service.getNotificationConfiguration();
      const smsTemplates = notificationConfig.channels.sms.templates;
      
      expect(smsTemplates.length).toBeGreaterThan(0);
      
      const paymentTemplate = smsTemplates.find(t => t.id === 'payment_reminder');
      expect(paymentTemplate).toBeTruthy();
      expect(paymentTemplate!.maxLength).toBe(160);
      expect(paymentTemplate!.variables).toContain('amount');
    });

    it('should have notification triggers', () => {
      const notificationConfig = service.getNotificationConfiguration();
      const triggers = notificationConfig.triggers;
      
      expect(triggers.length).toBeGreaterThan(0);
      
      const clientTrigger = triggers.find(t => t.id === 'new_client_trigger');
      expect(clientTrigger).toBeTruthy();
      expect(clientTrigger!.event).toBe('client_created');
      expect(clientTrigger!.channels).toContain('email');
    });

    it('should have scheduled notifications', () => {
      const notificationConfig = service.getNotificationConfiguration();
      const schedules = notificationConfig.schedules;
      
      expect(schedules.length).toBeGreaterThan(0);
      
      const monthlySchedule = schedules.find(s => s.id === 'monthly_statement');
      expect(monthlySchedule).toBeTruthy();
      expect(monthlySchedule!.frequency).toBe('monthly');
      expect(monthlySchedule!.dayOfMonth).toBe(1);
    });
  });

  describe('Workflow Configuration', () => {
    it('should get workflow configuration', () => {
      const workflowConfig = service.getWorkflowConfiguration();
      
      expect(workflowConfig).toBeDefined();
      expect(workflowConfig.automations).toBeDefined();
      expect(workflowConfig.approvalChains).toBeDefined();
      expect(workflowConfig.escalationRules).toBeDefined();
      expect(workflowConfig.slaTargets).toBeDefined();
    });

    it('should have automation configurations', () => {
      const workflowConfig = service.getWorkflowConfiguration();
      const automations = workflowConfig.automations;
      
      expect(automations.length).toBeGreaterThan(0);
      
      const autoApproval = automations.find(a => a.id === 'auto_approve_high_score');
      expect(autoApproval).toBeTruthy();
      expect(autoApproval!.enabled).toBe(true);
      expect(autoApproval!.actions.length).toBe(2);
    });

    it('should have approval chains', () => {
      const workflowConfig = service.getWorkflowConfiguration();
      const chains = workflowConfig.approvalChains;
      
      expect(chains.length).toBeGreaterThan(0);
      
      const loanChain = chains.find(c => c.id === 'loan_approval_chain');
      expect(loanChain).toBeTruthy();
      expect(loanChain!.steps.length).toBeGreaterThan(0);
      expect(loanChain!.requiredApprovals).toBe(1);
    });

    it('should have escalation rules', () => {
      const workflowConfig = service.getWorkflowConfiguration();
      const rules = workflowConfig.escalationRules;
      
      expect(rules.length).toBeGreaterThan(0);
      
      const pendingRule = rules.find(r => r.id === 'pending_docs_escalation');
      expect(pendingRule).toBeTruthy();
      expect(pendingRule!.timeThresholdMinutes).toBe(4320); // 3 days
    });

    it('should have SLA targets', () => {
      const workflowConfig = service.getWorkflowConfiguration();
      const targets = workflowConfig.slaTargets;
      
      expect(targets.length).toBeGreaterThan(0);
      
      const docReview = targets.find(t => t.process === 'document_review');
      expect(docReview).toBeTruthy();
      expect(docReview!.targetMinutes).toBe(1440); // 24 hours
    });
  });

  describe('UI Configuration', () => {
    it('should get simple UI configuration', () => {
      const uiConfig = service.getSimpleUIConfiguration();
      
      expect(uiConfig).toBeDefined();
      expect(uiConfig.theme).toBeDefined();
      expect(uiConfig.navigation).toBeDefined();
      expect(uiConfig.forms).toBeDefined();
      expect(uiConfig.language).toBeDefined();
    });

    it('should have theme configuration', () => {
      const uiConfig = service.getSimpleUIConfiguration();
      const theme = uiConfig.theme;
      
      expect(theme.primaryColor).toBe('#1E40AF');
      expect(theme.fontSize).toBe('large');
      expect(theme.buttonSize).toBe('large');
      expect(theme.contrast).toBe('high');
    });

    it('should have navigation configuration', () => {
      const uiConfig = service.getSimpleUIConfiguration();
      const nav = uiConfig.navigation;
      
      expect(nav.breadcrumbs).toBe(true);
      expect(nav.backButton).toBe(true);
      expect(nav.progressIndicator).toBe(true);
      expect(nav.quickActions).toBe(false);
    });

    it('should have language configuration', () => {
      const uiConfig = service.getSimpleUIConfiguration();
      const language = uiConfig.language;
      
      expect(language.locale).toBe('es-MX');
      expect(language.simplifiedTerms).toBe(true);
      expect(language.industryJargon).toBe(false);
    });
  });

  describe('Smart UX Configuration', () => {
    it('should get smart UX configuration', () => {
      const smartUXConfig = service.getSmartUXConfiguration();
      
      expect(smartUXConfig).toBeDefined();
      expect(smartUXConfig.autoComplete).toBeDefined();
      expect(smartUXConfig.realTimeValidation).toBeDefined();
      expect(smartUXConfig.sessionRecovery).toBeDefined();
    });

    it('should have auto-complete configuration', () => {
      const smartUXConfig = service.getSmartUXConfiguration();
      const autoComplete = smartUXConfig.autoComplete;
      
      expect(autoComplete.enabled).toBe(true);
      expect(autoComplete.sources).toContain('user_history');
      expect(autoComplete.sources).toContain('regional_patterns');
      expect(autoComplete.fields.length).toBeGreaterThan(0);
    });

    it('should have session recovery configuration', () => {
      const smartUXConfig = service.getSmartUXConfiguration();
      const recovery = smartUXConfig.sessionRecovery;
      
      expect(recovery.enabled).toBe(true);
      expect(recovery.autoSave).toBe(true);
      expect(recovery.saveInterval).toBe(30);
      expect(recovery.maxRetention).toBe(24);
    });
  });

  describe('Analytics Configuration', () => {
    it('should get analytics configuration', () => {
      const analyticsConfig = service.getAnalyticsConfiguration();
      
      expect(analyticsConfig).toBeDefined();
      expect(analyticsConfig.heatmaps).toBeDefined();
      expect(analyticsConfig.sessionRecording).toBeDefined();
      expect(analyticsConfig.funnelAnalysis).toBeDefined();
      expect(analyticsConfig.errorTracking).toBeDefined();
    });

    it('should have heatmap configuration', () => {
      const analyticsConfig = service.getAnalyticsConfiguration();
      const heatmaps = analyticsConfig.heatmaps;
      
      expect(heatmaps.enabled).toBe(true);
      expect(heatmaps.pages).toContain('nueva-oportunidad');
      expect(heatmaps.clickTracking).toBe(true);
      expect(heatmaps.formInteractions).toBe(true);
    });

    it('should have funnel analysis configuration', () => {
      const analyticsConfig = service.getAnalyticsConfiguration();
      const funnels = analyticsConfig.funnelAnalysis;
      
      expect(funnels.enabled).toBe(true);
      expect(funnels.funnels.length).toBeGreaterThan(0);
      
      const nuevaOportunidadFunnel = funnels.funnels.find(
        f => f.id === 'nueva_oportunidad_funnel'
      );
      expect(nuevaOportunidadFunnel).toBeTruthy();
      expect(nuevaOportunidadFunnel!.steps.length).toBe(4);
    });

    it('should have performance metrics configuration', () => {
      const analyticsConfig = service.getAnalyticsConfiguration();
      const performance = analyticsConfig.performanceMetrics;
      
      expect(performance.enabled).toBe(true);
      expect(performance.metrics.length).toBeGreaterThan(0);
      
      const pageLoadMetric = performance.metrics.find(
        m => m.name === 'page_load_time'
      );
      expect(pageLoadMetric).toBeTruthy();
      expect(pageLoadMetric!.target).toBe(2000);
      expect(pageLoadMetric!.unit).toBe('ms');
    });
  });

  describe('UX Optimization Configuration', () => {
    it('should get UX optimization configuration', () => {
      const uxOptConfig = service.getUXOptimizationConfiguration();
      
      expect(uxOptConfig).toBeDefined();
      expect(uxOptConfig.abTesting).toBeDefined();
      expect(uxOptConfig.recommendations).toBeDefined();
      expect(uxOptConfig.realTimeOptimization).toBeDefined();
    });

    it('should have A/B testing configuration', () => {
      const uxOptConfig = service.getUXOptimizationConfiguration();
      const abTesting = uxOptConfig.abTesting;
      
      expect(abTesting.enabled).toBe(true);
      expect(abTesting.sampleSize).toBe(1000);
      expect(abTesting.confidenceLevel).toBe(0.95);
      expect(abTesting.maxTestDuration).toBe(30);
    });

    it('should have recommendations configuration', () => {
      const uxOptConfig = service.getUXOptimizationConfiguration();
      const recommendations = uxOptConfig.recommendations;
      
      expect(recommendations.enabled).toBe(true);
      expect(recommendations.categories).toContain('performance');
      expect(recommendations.categories).toContain('usability');
      expect(recommendations.aiPowered).toBe(false);
    });
  });

  describe('Configuration Versioning', () => {
    it('should track configuration version', () => {
      const config = service.getCurrentConfiguration();
      
      expect(config.version).toBeDefined();
      expect(config.lastUpdated).toBeInstanceOf(Date);
    });

    it('should update lastUpdated when configuration changes', (done) => {
      const originalConfig = service.getCurrentConfiguration();
      const originalTimestamp = originalConfig.lastUpdated.getTime();

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        service.updateConfiguration({ version: '2.0.0' }).subscribe(() => {
          const updatedConfig = service.getCurrentConfiguration();
          const newTimestamp = updatedConfig.lastUpdated.getTime();
          
          expect(newTimestamp).toBeGreaterThan(originalTimestamp);
          done();
        });
      }, 10);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle partial configuration updates', (done) => {
      const originalConfig = service.getCurrentConfiguration();
      
      service.updateConfiguration({ version: '3.0.0' }).subscribe(success => {
        expect(success).toBe(true);
        
        const updatedConfig = service.getCurrentConfiguration();
        expect(updatedConfig.version).toBe('3.0.0');
        expect(updatedConfig.markets).toEqual(originalConfig.markets);
        expect(updatedConfig.scoring).toEqual(originalConfig.scoring);
        done();
      });
    });

    it('should handle empty configuration updates', (done) => {
      const originalConfig = service.getCurrentConfiguration();
      
      service.updateConfiguration({}).subscribe(success => {
        expect(success).toBe(true);
        
        const updatedConfig = service.getCurrentConfiguration();
        // Should update lastUpdated even for empty updates
        expect(updatedConfig.lastUpdated.getTime()).toBeGreaterThan(originalConfig.lastUpdated.getTime());
        done();
      });
    });

    it('should provide configuration even when API fails', (done) => {
      // Configuration should be loaded from defaults when API fails
      service.configuration$.subscribe(config => {
        expect(config).toBeTruthy();
        expect(config.markets).toBeDefined();
        done();
      });
    });

    it('should handle nested configuration access', () => {
      const marketConfig = service.getMarketConfiguration();
      expect(marketConfig.edomex.municipalities).toBeDefined();
      
      const scoringConfig = service.getScoringConfiguration();
      expect(scoringConfig.businessFlowRequirements[BusinessFlow.VentaDirecta]).toBeDefined();
    });
  });
});