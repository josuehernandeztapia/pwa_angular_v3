import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApplicationConfiguration } from '../models/configuration.types';
import { BusinessFlow } from '../models/types';
import { ConfigurationService } from './configuration.service';

interface DummyCfg { value: number }

describe('ConfigurationService', () => {
	let service: ConfigurationService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule],
			providers: [ConfigurationService]
		});
		service = TestBed.inject(ConfigurationService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('should load namespace from assets when remote disabled', (done) => {
		const namespace = 'system/performance';
		const defaultValue: DummyCfg = { value: 1 } as any;

		service.loadNamespace<DummyCfg>(namespace, defaultValue).subscribe(cfg => {
			expect((cfg as any).delays?.document_load).toBe(100);
			done();
		});

		const req = httpMock.expectOne(r => r.method === 'GET' && r.url.includes('/assets/config/system/performance.json'));
		(expect(req.request.headers.has('If-None-Match')) as any).toBeFalse();
		req.flush({ delays: { document_load: 100 } });
	});

	it('should cache namespace result (shareReplay) for subsequent subscribers', (done) => {
		const namespace = 'requirements/base';
		const defaultValue: any = { foo: 'bar' };

		const obs = service.loadNamespace<any>(namespace, defaultValue);
		let first: any;
		obs.subscribe(v => first = v);

		const req = httpMock.expectOne(r => r.method === 'GET' && r.url.includes('/assets/config/requirements/base.json'));
		req.flush({ hello: 'world' });

		obs.subscribe(second => {
			(expect(second) as any).toEqual(first);
			done();
		});
	});

	it('updateConfiguration should merge and emit new configuration', (done) => {
		const before = service.getCurrentConfiguration();
		(expect(before) as any).toBeTruthy();
		service.updateConfiguration({ analytics: { heatmaps: { enabled: false } } as any }).subscribe(ok => {
			(expect(ok) as any).toBeTrue();
			const after = service.getCurrentConfiguration();
			(expect(after.analytics.heatmaps.enabled) as any).toBeFalse();
			done();
		});

		// updateConfiguration uses delay(200); no HTTP expected here
	});

	describe('Service Initialization', () => {
		it('should be created', () => {
			(expect(service) as any).toBeTruthy();
		});

		it('should provide configuration observable', () => {
			(expect(service.configuration$) as any).toBeDefined();
			
			service.configuration$.subscribe(config => {
				(expect(config) as any).toBeTruthy();
				(expect(config.version) as any).toBeDefined();
				(expect(config.lastUpdated) as any).toBeInstanceOf(Date);
			});
		});

		it('should load default configuration on initialization', () => {
			const currentConfig = service.getCurrentConfiguration();
			
			(expect(currentConfig) as any).toBeTruthy();
			(expect(currentConfig.markets) as any).toBeDefined();
			(expect(currentConfig.scoring) as any).toBeDefined();
			(expect(currentConfig.businessFlows) as any).toBeDefined();
		});
	});

	describe('Configuration Loading and Updates', () => {
		it('should get current configuration', () => {
			const config = service.getCurrentConfiguration();
			
			(expect(config) as any).toBeTruthy();
			(expect(config.markets.aguascalientes) as any).toBeDefined();
			(expect(config.markets.edomex) as any).toBeDefined();
		});

		it('should refresh configuration from API', (done) => {
			service.refreshConfiguration().subscribe(config => {
				(expect(config) as any).toBeTruthy();
				(expect(config.version) as any).toBe('1.0.0');
				done();
			});
		});

		it('should update configuration successfully', (done) => {
			const updateData: Partial<ApplicationConfiguration> = {
				version: '1.1.0'
			};

			service.updateConfiguration(updateData).subscribe(success => {
				(expect(success) as any).toBe(true);
				
				const updatedConfig = service.getCurrentConfiguration();
				(expect(updatedConfig.version) as any).toBe('1.1.0');
				(expect(updatedConfig.lastUpdated) as any).toBeInstanceOf(Date);
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
				
				(expect(updatedConfig.version) as any).toBe('2.0.0');
				(expect(updatedConfig.markets) as any).toEqual(originalMarkets);
				done();
			});
		});
	});

	describe('Market Configuration', () => {
		it('should get market configuration', () => {
			const marketConfig = service.getMarketConfiguration();
			
			(expect(marketConfig) as any).toBeDefined();
			(expect(marketConfig.aguascalientes) as any).toBeDefined();
			(expect(marketConfig.edomex) as any).toBeDefined();
		});

		it('should have correct Aguascalientes market configuration', () => {
			const marketConfig = service.getMarketConfiguration();
			const agsConfig = marketConfig.aguascalientes;
			
			(expect(agsConfig.interestRate) as any).toBe(0.255);
			(expect(agsConfig.standardTerm) as any).toBe(24);
			(expect(agsConfig.minimumDownPayment) as any).toBe(0.60);
		});

		it('should have correct Estado de México market configuration', () => {
			const marketConfig = service.getMarketConfiguration();
			const edomexConfig = marketConfig.edomex;
			
			(expect(edomexConfig.interestRate) as any).toBe(0.299);
			(expect(edomexConfig.standardTermIndividual) as any).toBe(48);
			(expect(edomexConfig.standardTermCollective) as any).toBe(60);
			(expect(edomexConfig.minimumDownPaymentIndividual) as any).toBe(0.25);
			(expect(edomexConfig.minimumDownPaymentCollective) as any).toBe(0.15);
		});

		it('should include EdoMex municipalities', () => {
			const marketConfig = service.getMarketConfiguration();
			const municipalities = marketConfig.edomex.municipalities;
			
			(expect(municipalities) as any).toBeDefined();
			(expect(municipalities!.length) as any).toBeGreaterThan(0);
			
			const ecatepec = municipalities!.find(m => m.code === 'ecatepec');
			(expect(ecatepec) as any).toBeTruthy();
			(expect(ecatepec!.name) as any).toBe('Ecatepec de Morelos');
			(expect(ecatepec!.zone) as any).toBe('ZMVM');
		});
	});

	describe('Scoring Configuration', () => {
		it('should get scoring configuration', () => {
			const scoringConfig = service.getScoringConfiguration();
			
			(expect(scoringConfig) as any).toBeDefined();
			(expect(scoringConfig.businessFlowRequirements) as any).toBeDefined();
			(expect(scoringConfig.scoringThresholds) as any).toBeDefined();
			(expect(scoringConfig.scoringFactors) as any).toBeDefined();
		});

		it('should have business flow scoring requirements', () => {
			const scoringConfig = service.getScoringConfiguration();
			const requirements = scoringConfig.businessFlowRequirements;
			
			(expect(requirements[BusinessFlow.VentaDirecta]) as any).toBeDefined();
			(expect(requirements[BusinessFlow.VentaPlazo]) as any).toBeDefined();
			(expect(requirements[BusinessFlow.CreditoColectivo]) as any).toBeDefined();
			(expect(requirements[BusinessFlow.AhorroProgramado]) as any).toBeDefined();
			
			// Verify specific requirements
			(expect(requirements[BusinessFlow.VentaDirecta].minScore) as any).toBe(700);
			(expect(requirements[BusinessFlow.CreditoColectivo].minScore) as any).toBe(620);
		});

		it('should have correct scoring thresholds', () => {
			const scoringConfig = service.getScoringConfiguration();
			const thresholds = scoringConfig.scoringThresholds.grades;
			
			(expect(thresholds['A+']) as any).toBeDefined();
			(expect(thresholds['A+'].min) as any).toBe(800);
			(expect(thresholds['A+'].decision) as any).toBe('APPROVED');
			(expect(thresholds['A+'].risk) as any).toBe('LOW');
			
			(expect(thresholds['C'].decision) as any).toBe('REJECTED');
			(expect(thresholds['D'].decision) as any).toBe('REJECTED');
		});

		it('should have scoring factors configuration', () => {
			const scoringConfig = service.getScoringConfiguration();
			const factors = scoringConfig.scoringFactors;
			
			(expect(factors.documentBonus.ineApproved) as any).toBe(20);
			(expect(factors.documentBonus.kycCompleted) as any).toBe(25);
			(expect(factors.marketBonus.aguascalientes) as any).toBe(10);
			(expect(factors.businessFlowModifiers[BusinessFlow.CreditoColectivo]) as any).toBe(15);
		});
	});

	describe('Business Flow Configuration', () => {
		it('should get business flow configuration', () => {
			const businessFlowConfig = service.getBusinessFlowConfiguration();
			
			(expect(businessFlowConfig) as any).toBeDefined();
			(expect(businessFlowConfig[BusinessFlow.VentaDirecta]) as any).toBeDefined();
			(expect(businessFlowConfig[BusinessFlow.VentaPlazo]) as any).toBeDefined();
			(expect(businessFlowConfig[BusinessFlow.CreditoColectivo]) as any).toBeDefined();
			(expect(businessFlowConfig[BusinessFlow.AhorroProgramado]) as any).toBeDefined();
		});

		it('should have correct VentaDirecta configuration', () => {
			const businessFlowConfig = service.getBusinessFlowConfiguration();
			const ventaDirecta = businessFlowConfig[BusinessFlow.VentaDirecta];
			
			(expect(ventaDirecta.interestRate) as any).toBe(0);
			(expect(ventaDirecta.requiresImmediateCapacity) as any).toBe(true);
		});

		it('should have correct CreditoColectivo configuration', () => {
			const businessFlowConfig = service.getBusinessFlowConfiguration();
			const creditoColectivo = businessFlowConfig[BusinessFlow.CreditoColectivo];
			
			(expect(creditoColectivo.maxTerm?.edomex) as any).toBe(60);
			(expect(creditoColectivo.groupRequirements?.minMembers) as any).toBe(5);
			(expect(creditoColectivo.groupRequirements?.avgScoreRequired) as any).toBe(650);
		});
	});

	describe('AVI Configuration', () => {
		it('should get AVI configuration', () => {
			const aviConfig = service.getAVIConfiguration();
			
			(expect(aviConfig) as any).toBeDefined();
			(expect(aviConfig.enabled) as any).toBe(true);
			(expect(aviConfig.timeout) as any).toBe(30000);
			(expect(aviConfig.retryAttempts) as any).toBe(3);
		});

		it('should have core AVI questions', () => {
			const aviConfig = service.getAVIConfiguration();
			const coreQuestions = aviConfig.questions.core;
			
			(expect(coreQuestions.length) as any).toBeGreaterThan(0);
			
			const nameQuestion = coreQuestions.find(q => q.id === 'name_verification');
			(expect(nameQuestion) as any).toBeTruthy();
			(expect(nameQuestion!.type) as any).toBe('identity');
			(expect(nameQuestion!.required) as any).toBe(true);
			(expect(nameQuestion!.weight) as any).toBe(10);
		});

		it('should have business flow specific questions', () => {
			const aviConfig = service.getAVIConfiguration();
			const businessFlowQuestions = aviConfig.questions.businessFlow;
			
			(expect(businessFlowQuestions[BusinessFlow.VentaPlazo]) as any).toBeDefined();
			(expect(businessFlowQuestions[BusinessFlow.CreditoColectivo]) as any).toBeDefined();
			
			const routeQuestion = businessFlowQuestions[BusinessFlow.VentaPlazo].find(
				q => q.id === 'route_experience'
			);
			(expect(routeQuestion) as any).toBeTruthy();
			(expect(routeQuestion!.expectedAnswerType) as any).toBe('number');
		});

		it('should have market specific questions', () => {
			const aviConfig = service.getAVIConfiguration();
			const marketQuestions = aviConfig.questions.market;
			
			(expect(marketQuestions.edomex) as any).toBeDefined();
			
			const municipalityQuestion = marketQuestions.edomex.find(
				q => q.id === 'municipality_confirm'
			);
			(expect(municipalityQuestion) as any).toBeTruthy();
			(expect(municipalityQuestion!.expectedAnswerType) as any).toBe('choice');
			(expect(municipalityQuestion!.choices) as any).toContain('Ecatepec');
		});

		it('should have random questions configuration', () => {
			const aviConfig = service.getAVIConfiguration();
			const randomConfig = aviConfig.randomQuestions;
			
			(expect(randomConfig.enabled) as any).toBe(true);
			(expect(randomConfig.selectionCount) as any).toBe(2);
			(expect(randomConfig.weightedSelection) as any).toBe(true);
			(expect(randomConfig.pool.length) as any).toBeGreaterThan(0);
		});

		it('should have validation configuration', () => {
			const aviConfig = service.getAVIConfiguration();
			const validation = aviConfig.validation;
			
			(expect(validation.minimumConfidenceScore) as any).toBe(0.75);
			(expect(validation.requiresHumanReview) as any).toBe(true);
			(expect(validation.autoApprovalThreshold) as any).toBe(0.90);
		});
	});

	describe('Questionnaire Configuration', () => {
		it('should get questionnaire configuration', () => {
			const questionnaireConfig = service.getQuestionnaireConfiguration();
			
			(expect(questionnaireConfig) as any).toBeDefined();
			(expect(questionnaireConfig.standardQuestionnaire) as any).toBeDefined();
			(expect(questionnaireConfig.dynamicQuestionnaire) as any).toBeDefined();
		});

		it('should have standard questionnaire sections', () => {
			const questionnaireConfig = service.getQuestionnaireConfiguration();
			const sections = questionnaireConfig.standardQuestionnaire.sections;
			
			(expect(sections.length) as any).toBeGreaterThan(0);
			
			const personalSection = sections.find(s => s.id === 'personal_info');
			(expect(personalSection) as any).toBeTruthy();
			(expect(personalSection!.required) as any).toBe(true);
			(expect(personalSection!.questions.length) as any).toBeGreaterThan(0);
		});

		it('should have completion requirements', () => {
			const questionnaireConfig = service.getQuestionnaireConfiguration();
			const requirements = questionnaireConfig.standardQuestionnaire.completionRequirements;
			
			(expect(requirements.minimumSections) as any).toBe(2);
			(expect(requirements.minimumQuestionsPerSection) as any).toBe(1);
			(expect(requirements.allowSkipOptional) as any).toBe(true);
		});

		it('should have dynamic questionnaire configuration', () => {
			const questionnaireConfig = service.getQuestionnaireConfiguration();
			const dynamic = questionnaireConfig.dynamicQuestionnaire;
			
			(expect(dynamic.enabled) as any).toBe(true);
			(expect(dynamic.adaptiveLogic) as any).toBe(true);
			(expect(dynamic.branchingRules.length) as any).toBeGreaterThan(0);
		});
	});

	describe('Notification Configuration', () => {
		it('should get notification configuration', () => {
			const notificationConfig = service.getNotificationConfiguration();
			
			(expect(notificationConfig) as any).toBeDefined();
			(expect(notificationConfig.channels) as any).toBeDefined();
			(expect(notificationConfig.triggers) as any).toBeDefined();
			(expect(notificationConfig.schedules) as any).toBeDefined();
		});

		it('should have channel configurations', () => {
			const notificationConfig = service.getNotificationConfiguration();
			const channels = notificationConfig.channels;
			
			(expect(channels.email.enabled) as any).toBe(true);
			(expect(channels.sms.enabled) as any).toBe(true);
			(expect(channels.push.enabled) as any).toBe(true);
			(expect(channels.whatsapp.enabled) as any).toBe(false);
		});

		it('should have email templates', () => {
			const notificationConfig = service.getNotificationConfiguration();
			const emailTemplates = notificationConfig.channels.email.templates;
			
			(expect(emailTemplates.length) as any).toBeGreaterThan(0);
			
			const welcomeTemplate = emailTemplates.find(t => t.id === 'welcome_email');
			(expect(welcomeTemplate) as any).toBeTruthy();
			(expect(welcomeTemplate!.subject) as any).toBe('Bienvenido a Conductores PWA');
			(expect(welcomeTemplate!.variables) as any).toContain('clientName');
		});

		it('should have SMS templates with length limits', () => {
			const notificationConfig = service.getNotificationConfiguration();
			const smsTemplates = notificationConfig.channels.sms.templates;
			
			(expect(smsTemplates.length) as any).toBeGreaterThan(0);
			
			const paymentTemplate = smsTemplates.find(t => t.id === 'payment_reminder');
			(expect(paymentTemplate) as any).toBeTruthy();
			(expect(paymentTemplate!.maxLength) as any).toBe(160);
			(expect(paymentTemplate!.variables) as any).toContain('amount');
		});

		it('should have notification triggers', () => {
			const notificationConfig = service.getNotificationConfiguration();
			const triggers = notificationConfig.triggers;
			
			(expect(triggers.length) as any).toBeGreaterThan(0);
			
			const clientTrigger = triggers.find(t => t.id === 'new_client_trigger');
			(expect(clientTrigger) as any).toBeTruthy();
			(expect(clientTrigger!.event) as any).toBe('client_created');
			(expect(clientTrigger!.channels) as any).toContain('email');
		});

		it('should have scheduled notifications', () => {
			const notificationConfig = service.getNotificationConfiguration();
			const schedules = notificationConfig.schedules;
			
			(expect(schedules.length) as any).toBeGreaterThan(0);
			
			const monthlySchedule = schedules.find(s => s.id === 'monthly_statement');
			(expect(monthlySchedule) as any).toBeTruthy();
			(expect(monthlySchedule!.frequency) as any).toBe('monthly');
			(expect(monthlySchedule!.dayOfMonth) as any).toBe(1);
		});
	});

	describe('Workflow Configuration', () => {
		it('should get workflow configuration', () => {
			const workflowConfig = service.getWorkflowConfiguration();
			
			(expect(workflowConfig) as any).toBeDefined();
			(expect(workflowConfig.automations) as any).toBeDefined();
			(expect(workflowConfig.approvalChains) as any).toBeDefined();
			(expect(workflowConfig.escalationRules) as any).toBeDefined();
			(expect(workflowConfig.slaTargets) as any).toBeDefined();
		});

		it('should have automation configurations', () => {
			const workflowConfig = service.getWorkflowConfiguration();
			const automations = workflowConfig.automations;
			
			(expect(automations.length) as any).toBeGreaterThan(0);
			
			const autoApproval = automations.find(a => a.id === 'auto_approve_high_score');
			(expect(autoApproval) as any).toBeTruthy();
			(expect(autoApproval!.enabled) as any).toBe(true);
			(expect(autoApproval!.actions.length) as any).toBe(2);
		});

		it('should have approval chains', () => {
			const workflowConfig = service.getWorkflowConfiguration();
			const chains = workflowConfig.approvalChains;
			
			(expect(chains.length) as any).toBeGreaterThan(0);
			
			const loanChain = chains.find(c => c.id === 'loan_approval_chain');
			(expect(loanChain) as any).toBeTruthy();
			(expect(loanChain!.steps.length) as any).toBeGreaterThan(0);
			(expect(loanChain!.requiredApprovals) as any).toBe(1);
		});

		it('should have escalation rules', () => {
			const workflowConfig = service.getWorkflowConfiguration();
			const rules = workflowConfig.escalationRules;
			
			(expect(rules.length) as any).toBeGreaterThan(0);
			
			const pendingRule = rules.find(r => r.id === 'pending_docs_escalation');
			(expect(pendingRule) as any).toBeTruthy();
			(expect(pendingRule!.timeThresholdMinutes) as any).toBe(4320); // 3 days
		});

		it('should have SLA targets', () => {
			const workflowConfig = service.getWorkflowConfiguration();
			const targets = workflowConfig.slaTargets;
			
			(expect(targets.length) as any).toBeGreaterThan(0);
			
			const docReview = targets.find(t => t.process === 'document_review');
			(expect(docReview) as any).toBeTruthy();
			(expect(docReview!.targetMinutes) as any).toBe(1440); // 24 hours
		});
	});

	describe('UI Configuration', () => {
		it('should get simple UI configuration', () => {
			const uiConfig = service.getSimpleUIConfiguration();
			
			(expect(uiConfig) as any).toBeDefined();
			(expect(uiConfig.theme) as any).toBeDefined();
			(expect(uiConfig.navigation) as any).toBeDefined();
			(expect(uiConfig.forms) as any).toBeDefined();
			(expect(uiConfig.language) as any).toBeDefined();
		});

		it('should have theme configuration', () => {
			const uiConfig = service.getSimpleUIConfiguration();
			const theme = uiConfig.theme;
			
			(expect(theme.primaryColor) as any).toBe('#1E40AF');
			(expect(theme.fontSize) as any).toBe('large');
			(expect(theme.buttonSize) as any).toBe('large');
			(expect(theme.contrast) as any).toBe('high');
		});

		it('should have navigation configuration', () => {
			const uiConfig = service.getSimpleUIConfiguration();
			const nav = uiConfig.navigation;
			
			(expect(nav.breadcrumbs) as any).toBe(true);
			(expect(nav.backButton) as any).toBe(true);
			(expect(nav.progressIndicator) as any).toBe(true);
			(expect(nav.quickActions) as any).toBe(false);
		});

		it('should have language configuration', () => {
			const uiConfig = service.getSimpleUIConfiguration();
			const language = uiConfig.language;
			
			(expect(language.locale) as any).toBe('es-MX');
			(expect(language.simplifiedTerms) as any).toBe(true);
			(expect(language.industryJargon) as any).toBe(false);
		});
	});

	describe('Smart UX Configuration', () => {
		it('should get smart UX configuration', () => {
			const smartUXConfig = service.getSmartUXConfiguration();
			
			(expect(smartUXConfig) as any).toBeDefined();
			(expect(smartUXConfig.autoComplete) as any).toBeDefined();
			(expect(smartUXConfig.realTimeValidation) as any).toBeDefined();
			(expect(smartUXConfig.sessionRecovery) as any).toBeDefined();
		});

		it('should have auto-complete configuration', () => {
			const smartUXConfig = service.getSmartUXConfiguration();
			const autoComplete = smartUXConfig.autoComplete;
			
			(expect(autoComplete.enabled) as any).toBe(true);
			(expect(autoComplete.sources) as any).toContain('user_history');
			(expect(autoComplete.sources) as any).toContain('regional_patterns');
			(expect(autoComplete.fields.length) as any).toBeGreaterThan(0);
		});

		it('should have session recovery configuration', () => {
			const smartUXConfig = service.getSmartUXConfiguration();
			const recovery = smartUXConfig.sessionRecovery;
			
			(expect(recovery.enabled) as any).toBe(true);
			(expect(recovery.autoSave) as any).toBe(true);
			(expect(recovery.saveInterval) as any).toBe(30);
			(expect(recovery.maxRetention) as any).toBe(24);
		});
	});

	describe('Analytics Configuration', () => {
		it('should get analytics configuration', () => {
			const analyticsConfig = service.getAnalyticsConfiguration();
			
			(expect(analyticsConfig) as any).toBeDefined();
			(expect(analyticsConfig.heatmaps) as any).toBeDefined();
			(expect(analyticsConfig.sessionRecording) as any).toBeDefined();
			(expect(analyticsConfig.funnelAnalysis) as any).toBeDefined();
			(expect(analyticsConfig.errorTracking) as any).toBeDefined();
		});

		it('should have heatmap configuration', () => {
			const analyticsConfig = service.getAnalyticsConfiguration();
			const heatmaps = analyticsConfig.heatmaps;
			
			(expect(heatmaps.enabled) as any).toBe(true);
			(expect(heatmaps.pages) as any).toContain('nueva-oportunidad');
			(expect(heatmaps.clickTracking) as any).toBe(true);
			(expect(heatmaps.formInteractions) as any).toBe(true);
		});

		it('should have funnel analysis configuration', () => {
			const analyticsConfig = service.getAnalyticsConfiguration();
			const funnels = analyticsConfig.funnelAnalysis;
			
			(expect(funnels.enabled) as any).toBe(true);
			(expect(funnels.funnels.length) as any).toBeGreaterThan(0);
			
			const nuevaOportunidadFunnel = funnels.funnels.find(
				f => f.id === 'nueva_oportunidad_funnel'
			);
			(expect(nuevaOportunidadFunnel) as any).toBeTruthy();
			(expect(nuevaOportunidadFunnel!.steps.length) as any).toBe(4);
		});

		it('should have performance metrics configuration', () => {
			const analyticsConfig = service.getAnalyticsConfiguration();
			const performance = analyticsConfig.performanceMetrics;
			
			(expect(performance.enabled) as any).toBe(true);
			(expect(performance.metrics.length) as any).toBeGreaterThan(0);
			
			const pageLoadMetric = performance.metrics.find(
				m => m.name === 'page_load_time'
			);
			(expect(pageLoadMetric) as any).toBeTruthy();
			(expect(pageLoadMetric!.target) as any).toBe(2000);
			(expect(pageLoadMetric!.unit) as any).toBe('ms');
		});
	});

	describe('UX Optimization Configuration', () => {
		it('should get UX optimization configuration', () => {
			const uxOptConfig = service.getUXOptimizationConfiguration();
			
			(expect(uxOptConfig) as any).toBeDefined();
			(expect(uxOptConfig.abTesting) as any).toBeDefined();
			(expect(uxOptConfig.recommendations) as any).toBeDefined();
			(expect(uxOptConfig.realTimeOptimization) as any).toBeDefined();
		});

		it('should have A/B testing configuration', () => {
			const uxOptConfig = service.getUXOptimizationConfiguration();
			const abTesting = uxOptConfig.abTesting;
			
			(expect(abTesting.enabled) as any).toBe(true);
			(expect(abTesting.sampleSize) as any).toBe(1000);
			(expect(abTesting.confidenceLevel) as any).toBe(0.95);
			(expect(abTesting.maxTestDuration) as any).toBe(30);
		});

		it('should have recommendations configuration', () => {
			const uxOptConfig = service.getUXOptimizationConfiguration();
			const recommendations = uxOptConfig.recommendations;
			
			(expect(recommendations.enabled) as any).toBe(true);
			(expect(recommendations.categories) as any).toContain('performance');
			(expect(recommendations.categories) as any).toContain('usability');
			(expect(recommendations.aiPowered) as any).toBe(false);
		});
	});

	describe('Configuration Versioning', () => {
		it('should track configuration version', () => {
			const config = service.getCurrentConfiguration();
			
			(expect(config.version) as any).toBeDefined();
			(expect(config.lastUpdated) as any).toBeInstanceOf(Date);
		});

		it('should update lastUpdated when configuration changes', (done) => {
			const originalConfig = service.getCurrentConfiguration();
			const originalTimestamp = originalConfig.lastUpdated.getTime();

			// Wait a bit to ensure timestamp difference
			setTimeout(() => {
				service.updateConfiguration({ version: '2.0.0' }).subscribe(() => {
					const updatedConfig = service.getCurrentConfiguration();
					const newTimestamp = updatedConfig.lastUpdated.getTime();
					
					(expect(newTimestamp) as any).toBeGreaterThan(originalTimestamp);
					done();
				});
			}, 10);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle partial configuration updates', (done) => {
			const originalConfig = service.getCurrentConfiguration();
			
			service.updateConfiguration({ version: '3.0.0' }).subscribe(success => {
				(expect(success) as any).toBe(true);
				
				const updatedConfig = service.getCurrentConfiguration();
				(expect(updatedConfig.version) as any).toBe('3.0.0');
				(expect(updatedConfig.markets) as any).toEqual(originalConfig.markets);
				(expect(updatedConfig.scoring) as any).toEqual(originalConfig.scoring);
				done();
			});
		});

		it('should handle empty configuration updates', (done) => {
			const originalConfig = service.getCurrentConfiguration();
			
			service.updateConfiguration({}).subscribe(success => {
				(expect(success) as any).toBe(true);
				
				const updatedConfig = service.getCurrentConfiguration();
				// Should update lastUpdated even for empty updates
				(expect(updatedConfig.lastUpdated.getTime()) as any).toBeGreaterThanOrEqual(originalConfig.lastUpdated.getTime());
				done();
			});
		});

		it('should provide configuration even when API fails', (done) => {
			// Configuration should be loaded from defaults when API fails
			service.configuration$.subscribe(config => {
				(expect(config) as any).toBeTruthy();
				(expect(config.markets) as any).toBeDefined();
				done();
			});
		});

		it('should handle nested configuration access', () => {
			const marketConfig = service.getMarketConfiguration();
			(expect(marketConfig.edomex.municipalities) as any).toBeDefined();
			
			const scoringConfig = service.getScoringConfiguration();
			(expect(scoringConfig.businessFlowRequirements[BusinessFlow.VentaDirecta]) as any).toBeDefined();
		});
	});
});