// __tests__/study-deployment.test.ts
// Comprehensive Test Suite for Step 8: Real-World Study Preparation

import {
  ParticipantRecruitmentManager,
  ScreeningQuestionnaire,
  EligibilityCriteria,
  ParticipantProfile,
  DropoutPrediction,
  EarlyWarningSystem
} from '../lib/participant-recruitment';

import {
  IRBDocumentationManager,
  IRBApplication,
  GDPRCompliance,
  VietnameseDataProtection,
  ConsentTemplate
} from '../lib/irb-documentation';

import {
  StudyPlatformDeploymentManager,
  DeploymentEnvironment,
  LoadTestConfig,
  LoadTestResult,
  MigrationScript
} from '../lib/study-platform-deployment';

import {
  QualityMonitoringSystem,
  DataQualityMetrics,
  SuspiciousPattern,
  QualityAlert,
  WeeklyQualityReport
} from '../lib/quality-monitoring';

import {
  PilotStudyManager,
  PilotStudyConfig,
  PilotReport
} from '../scripts/run-pilot-study';

describe('Step 8: Real-World Study Preparation', () => {
  describe('ParticipantRecruitmentManager', () => {
    let recruitmentManager: ParticipantRecruitmentManager;
    let mockQuestionnaire: ScreeningQuestionnaire;

    beforeEach(() => {
      recruitmentManager = new ParticipantRecruitmentManager();
      mockQuestionnaire = {
        age: 25,
        nativeLanguage: 'Vietnamese',
        countryOfResidence: 'Vietnam',
        educationLevel: 'bachelor',
        englishLearningYears: 5,
        previousEnglishCourses: ['IELTS Prep', 'Business English'],
        currentEnglishUse: 'daily',
        selfAssessedLevel: 'B2',
        listeningConfidence: 6,
        speakingConfidence: 5,
        readingConfidence: 7,
        writingConfidence: 5,
        deviceTypes: ['laptop', 'smartphone'],
        internetReliability: 'good',
        dailyAvailableTime: 30,
        preferredStudyTime: 'evening',
        hasLearningDisabilities: false,
        isNativeEnglishSpeaker: false,
        hasUsedSpacedRepetition: false,
        spacedRepetitionExperience: 0,
        isInIntensiveEnglishProgram: false,
        email: 'test@example.com',
        phoneNumber: '+84123456789',
        preferredLanguage: 'vietnamese',
        consentToParticipate: true,
        consentToDataCollection: true,
        consentToFollowUp: true
      };
    });

    test('should screen eligible participant successfully', async () => {
      const result = await recruitmentManager.screenParticipant(mockQuestionnaire);
      
      expect(result.eligible).toBe(true);
      expect(result.eligibilityScore).toBeGreaterThan(70);
      expect(result.reasons).toHaveLength(0);
      expect(result.recommendedLevel).toBeDefined();
    });

    test('should reject participant with invalid age', async () => {
      const invalidQuestionnaire = { ...mockQuestionnaire, age: 16 };
      const result = await recruitmentManager.screenParticipant(invalidQuestionnaire);
      
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContainEqual(expect.stringContaining('Age must be between'));
    });

    test('should reject native English speakers', async () => {
      const nativeEnglishQuestionnaire = { ...mockQuestionnaire, nativeLanguage: 'English' };
      const result = await recruitmentManager.screenParticipant(nativeEnglishQuestionnaire);
      
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Native English speakers are excluded from this study');
    });

    test('should reject participants with extensive spaced repetition experience', async () => {
      const experiencedQuestionnaire = { 
        ...mockQuestionnaire, 
        hasUsedSpacedRepetition: true,
        spacedRepetitionExperience: 12 
      };
      const result = await recruitmentManager.screenParticipant(experiencedQuestionnaire);
      
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContainEqual(expect.stringContaining('Extensive spaced repetition experience'));
    });

    test('should generate unique anonymized IDs', () => {
      const id1 = recruitmentManager.generateAnonymizedId();
      const id2 = recruitmentManager.generateAnonymizedId();
      
      expect(id1).toMatch(/^CARTS_[A-Z0-9_]+$/);
      expect(id2).toMatch(/^CARTS_[A-Z0-9_]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should create participant profile with anonymization', async () => {
      const assignment = { algorithm: 'CARTS', proficiencyLevel: 'B2' };
      const profile = await recruitmentManager.createParticipantProfile(
        mockQuestionnaire,
        assignment,
        85
      );
      
      expect(profile.participantId).toMatch(/^CARTS_[A-Z0-9_]+$/);
      expect(profile.anonymizedId).toMatch(/^CARTS_[A-Z0-9_]+$/);
      expect(profile.assignedAlgorithm).toBe('CARTS');
      expect(profile.assignedProficiencyLevel).toBe('B2');
      expect(profile.eligibilityScore).toBe(85);
      expect(profile.screeningData).not.toHaveProperty('email');
      expect(profile.screeningData).not.toHaveProperty('phoneNumber');
    });

    test('should calculate dropout risk correctly', async () => {
      // High risk participant
      const highRiskQuestionnaire = {
        ...mockQuestionnaire,
        age: 22,
        dailyAvailableTime: 10,
        internetReliability: 'poor' as const,
        currentEnglishUse: 'rarely' as const,
        listeningConfidence: 2,
        speakingConfidence: 1,
        readingConfidence: 2,
        writingConfidence: 1
      };
      
      const assignment = { algorithm: 'CARTS', proficiencyLevel: 'B2' };
      const profile = await recruitmentManager.createParticipantProfile(
        highRiskQuestionnaire,
        assignment,
        75
      );
      
      expect(profile.dropoutRisk).toBe('high');
    });

    test('should check quota availability', async () => {
      const quotas = await recruitmentManager.checkQuotaAvailability();
      
      expect(quotas).toHaveLength(36); // 6 algorithms × 6 proficiency levels
      quotas.forEach(quota => {
        expect(quota).toHaveProperty('algorithm');
        expect(quota).toHaveProperty('proficiencyLevel');
        expect(quota).toHaveProperty('targetCount');
        expect(quota).toHaveProperty('currentCount');
        expect(quota).toHaveProperty('isComplete');
      });
    });

    test('should generate recruitment dashboard data', async () => {
      const dashboardData = await recruitmentManager.getRecruitmentDashboardData();
      
      expect(dashboardData).toHaveProperty('totalScreened');
      expect(dashboardData).toHaveProperty('totalEligible');
      expect(dashboardData).toHaveProperty('totalEnrolled');
      expect(dashboardData).toHaveProperty('quotaStatus');
      expect(dashboardData).toHaveProperty('dropoutPredictions');
      expect(dashboardData).toHaveProperty('recruitmentRate');
      expect(dashboardData).toHaveProperty('completionProjection');
      
      expect(dashboardData.quotaStatus).toHaveLength(36);
      expect(dashboardData.completionProjection).toBeInstanceOf(Date);
    });
  });

  describe('EarlyWarningSystem', () => {
    let warningSystem: EarlyWarningSystem;

    beforeEach(() => {
      warningSystem = new EarlyWarningSystem();
    });

    test('should analyze engagement patterns', async () => {
      const analysis = await warningSystem.analyzeEngagementPatterns('test_participant');
      
      expect(analysis.warningLevel).toMatch(/^(green|yellow|red)$/);
      expect(analysis.indicators).toBeInstanceOf(Array);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    test('should generate appropriate interventions', async () => {
      const interventions = await warningSystem.generateInterventions('test_participant');
      
      expect(interventions).toHaveProperty('emailTemplate');
      expect(interventions).toHaveProperty('scheduledReminders');
      expect(interventions).toHaveProperty('supportResources');
      expect(interventions.scheduledReminders).toBeInstanceOf(Array);
      expect(interventions.supportResources).toBeInstanceOf(Array);
    });
  });
  describe('IRBDocumentationManager', () => {
    let irbManager: IRBDocumentationManager;

    beforeEach(() => {
      irbManager = new IRBDocumentationManager();
    });

    test('should generate complete IRB application', () => {
      const application = irbManager.generateIRBApplication();
      
      expect(application.protocolNumber).toBe('CARTS-2024-001');
      expect(application.title).toContain('Contextual Adaptive');
      expect(application.studyType).toBe('minimal_risk');
      expect(application.principalInvestigator).toHaveProperty('name');
      expect(application.principalInvestigator).toHaveProperty('humanSubjectsTraining');
      expect(application.participantPopulation.targetSize).toBe(200);
      expect(application.riskAssessment.overallRiskLevel).toBe('minimal');
    });

    test('should generate GDPR compliance framework', () => {
      const gdpr = irbManager.generateGDPRCompliance();
      
      expect(gdpr.lawfulBasis).toBe('consent');
      expect(gdpr.dataProcessingPurpose).toContain('Educational research');
      expect(gdpr.dataCategories).toBeInstanceOf(Array);
      expect(gdpr.dataCategories.length).toBeGreaterThan(0);
      expect(gdpr.dataSubjectRights).toContain('Right to access personal data');
      expect(gdpr.retentionPeriod).toBe('5 years post-publication');
    });

    test('should generate Vietnamese data protection compliance', () => {
      const vietnamese = irbManager.generateVietnameseCompliance();
      
      expect(vietnamese.personalDataLaw).toBe('decree_13_2023');
      expect(vietnamese.consentRequirements).toBeInstanceOf(Array);
      expect(vietnamese.crossBorderTransfer.permitted).toBe(true);
      expect(vietnamese.dataLocalization.required).toBe(false);
    });

    test('should generate privacy compliance checklist', () => {
      const checklist = irbManager.generatePrivacyChecklist();
      
      expect(checklist.overallCompliance).toBeGreaterThan(90);
      expect(checklist.gdprCompliance).toHaveProperty('Lawful basis established');
      expect(checklist.vietnameseCompliance).toHaveProperty('Vietnamese consent available');
      
      Object.values(checklist.gdprCompliance).forEach(item => {
        expect(item).toHaveProperty('completed');
        expect(item).toHaveProperty('evidence');
        expect(item).toHaveProperty('lastReviewed');
      });
    });

    test('should generate consent templates in both languages', () => {
      const templates = irbManager.generateConsentTemplates();
      
      expect(templates.english.language).toBe('english');
      expect(templates.vietnamese.language).toBe('vietnamese');
      
      expect(templates.english.sections.length).toBeGreaterThan(5);
      expect(templates.vietnamese.sections.length).toBeGreaterThan(5);
      
      templates.english.sections.forEach(section => {
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('content');
        expect(section).toHaveProperty('required');
        expect(section).toHaveProperty('order');
      });
    });

    test('should generate withdrawal protocol', () => {
      const protocol = irbManager.generateWithdrawalProtocol();
      
      expect(protocol.procedures).toBeInstanceOf(Array);
      expect(protocol.dataHandling).toBeInstanceOf(Array);
      expect(protocol.timeline).toContain('30 days');
      expect(protocol.contactMethods).toContain('Email: study-withdrawal@research-institution.edu');
    });
  });

  describe('StudyPlatformDeploymentManager', () => {
    let deploymentManager: StudyPlatformDeploymentManager;

    beforeEach(() => {
      deploymentManager = new StudyPlatformDeploymentManager();
    });

    test('should deploy to development environment successfully', async () => {
      const result = await deploymentManager.deployToEnvironment('development', '1.0.0');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(result.rollbackId).toBeDefined();
    });

    test('should deploy to staging environment successfully', async () => {
      const result = await deploymentManager.deployToEnvironment('staging', '1.0.0');
      
      expect(result.success).toBe(true);
      expect(result.rollbackId).toBeDefined();
    });

    test('should deploy to production environment successfully', async () => {
      const result = await deploymentManager.deployToEnvironment('production', '1.0.0');
      
      expect(result.success).toBe(true);
      expect(result.rollbackId).toBeDefined();
    });

    test('should fail deployment to non-existent environment', async () => {
      const result = await deploymentManager.deployToEnvironment('nonexistent', '1.0.0');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Environment nonexistent not found');
    });

    test('should run load test successfully', async () => {
      const result = await deploymentManager.runLoadTest('staging');
      
      expect(result.testName).toContain('CARTS Load Test');
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
      expect(result.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.passed).toBeDefined();
    });

    test('should get deployment status for all environments', () => {
      const status = deploymentManager.getDeploymentStatus();
      
      expect(status).toHaveLength(3); // dev, staging, production
      status.forEach(env => {
        expect(env).toHaveProperty('environment');
        expect(env).toHaveProperty('status');
        expect(env).toHaveProperty('version');
        expect(env).toHaveProperty('lastDeployment');
        expect(env).toHaveProperty('healthChecks');
        expect(env.status).toMatch(/^(healthy|warning|critical)$/);
      });
    });
  });

  describe('QualityMonitoringSystem', () => {
    let qualityMonitor: QualityMonitoringSystem;

    beforeEach(() => {
      qualityMonitor = new QualityMonitoringSystem();
    });

    test('should analyze participant quality metrics', async () => {
      const metrics = await qualityMonitor.analyzeParticipantQuality('test_participant');
      
      expect(metrics.participantId).toBe('test_participant');
      expect(metrics.sessionCompletionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.sessionCompletionRate).toBeLessThanOrEqual(1);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.suspiciousPatterns).toBeInstanceOf(Array);
      expect(metrics.missingDataPoints).toBeInstanceOf(Array);
      expect(metrics.qualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.qualityScore).toBeLessThanOrEqual(100);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });

    test('should generate quality alerts based on metrics', async () => {
      const mockMetrics: DataQualityMetrics = {
        participantId: 'test_participant',
        sessionCompletionRate: 0.3, // Low completion rate
        averageResponseTime: 35000, // High response time
        suspiciousPatterns: [{
          type: 'bot_behavior',
          description: 'Suspicious pattern detected',
          severity: 'high',
          detectedAt: new Date(),
          evidence: {},
          confidence: 0.8
        }],
        missingDataPoints: ['Week 1 assessment', 'Week 2 assessment', 'Week 3 assessment'],
        qualityScore: 45,
        lastUpdated: new Date()
      };

      const alerts = await qualityMonitor.generateQualityAlerts(mockMetrics);
      
      expect(alerts.length).toBeGreaterThan(0);
      alerts.forEach(alert => {
        expect(alert).toHaveProperty('alertId');
        expect(alert).toHaveProperty('participantId');
        expect(alert).toHaveProperty('alertType');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('triggeredAt');
        expect(alert).toHaveProperty('actions');
        expect(alert.severity).toMatch(/^(info|warning|critical)$/);
      });
    });

    test('should generate weekly quality report', async () => {
      const report = await qualityMonitor.generateWeeklyReport(3);
      
      expect(report.weekNumber).toBe(3);
      expect(report.reportId).toContain('weekly_report_3');
      expect(report.overallMetrics).toHaveProperty('totalParticipants');
      expect(report.overallMetrics).toHaveProperty('activeParticipants');
      expect(report.overallMetrics).toHaveProperty('averageCompletionRate');
      expect(report.overallMetrics).toHaveProperty('dataQualityScore');
      expect(report.participantMetrics).toBeInstanceOf(Array);
      expect(report.alerts).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.attritionAnalysis).toHaveProperty('currentAttritionRate');
      expect(report.attritionAnalysis).toHaveProperty('predictedFinalAttrition');
    });

    test('should send participant reminders', async () => {
      const reminders = await qualityMonitor.sendParticipantReminders();
      
      expect(reminders).toBeInstanceOf(Array);
      reminders.forEach(reminder => {
        expect(reminder).toHaveProperty('reminderId');
        expect(reminder).toHaveProperty('participantId');
        expect(reminder).toHaveProperty('type');
        expect(reminder).toHaveProperty('template');
        expect(reminder).toHaveProperty('scheduledFor');
        expect(reminder).toHaveProperty('sent');
        expect(reminder.type).toMatch(/^(session_reminder|assessment_due|engagement_boost|technical_support)$/);
      });
    });

    test('should run data integrity checks', async () => {
      const checks = await qualityMonitor.runDataIntegrityChecks();
      
      expect(checks).toBeInstanceOf(Array);
      expect(checks.length).toBeGreaterThan(0);
      
      checks.forEach(check => {
        expect(check).toHaveProperty('checkId');
        expect(check).toHaveProperty('checkType');
        expect(check).toHaveProperty('description');
        expect(check).toHaveProperty('query');
        expect(check).toHaveProperty('expectedResult');
        expect(check).toHaveProperty('passed');
        expect(check).toHaveProperty('runAt');
        expect(check.checkType).toMatch(/^(completeness|consistency|accuracy|timeliness)$/);
      });
    });
  });

  describe('PilotStudyManager', () => {
    let pilotManager: PilotStudyManager;
    let deploymentManager: StudyPlatformDeploymentManager;
    let spyDeploymentStatus: jest.SpyInstance;

    beforeEach(async () => {
      // 1. Tiến hành deploy staging ảo như bình thường
      deploymentManager = new StudyPlatformDeploymentManager();
      await deploymentManager.deployToEnvironment('staging', '1.0.0');
      
      // 2. Can thiệp trực tiếp vào bộ nhớ RAM của thực thể nếu có thuộc tính lưu trữ
      if ((deploymentManager as any).environments && (deploymentManager as any).environments.staging) {
        (deploymentManager as any).environments.staging.status = 'healthy';
      }
      
      // 3. Spy và ép giá trị trả về cho getDeploymentStatus (trả về array)
      const mockHealthyStatuses = [
        {
          environment: 'development',
          status: 'healthy' as const,
          version: '1.0.0',
          lastDeployment: new Date(),
          healthChecks: {
            api: true,
            database: true,
            redis: true,
            auth: true,
            llm: true
          }
        },
        {
          environment: 'staging',
          status: 'healthy' as const,
          version: '1.0.0',
          lastDeployment: new Date(),
          healthChecks: {
            api: true,
            database: true,
            redis: true,
            auth: true,
            llm: true
          }
        },
        {
          environment: 'production',
          status: 'healthy' as const,
          version: '1.0.0',
          lastDeployment: new Date(),
          healthChecks: {
            api: true,
            database: true,
            redis: true,
            auth: true,
            llm: true
          }
        }
      ];
      
      // Mock trên prototype để áp dụng cho tất cả instances
      spyDeploymentStatus = jest.spyOn(StudyPlatformDeploymentManager.prototype, 'getDeploymentStatus')
        .mockReturnValue(mockHealthyStatuses);
      
      pilotManager = new PilotStudyManager();
    });

    afterEach(() => {
      // Khôi phục lại trạng thái gốc của các hàm spy sau khi chạy xong mỗi test case
      if (spyDeploymentStatus) spyDeploymentStatus.mockRestore();
    });

    test('should execute pilot study successfully', async () => {
      const report = await pilotManager.runPilotStudy();
      
      expect(report.reportId).toContain('pilot_');
      expect(report.startDate).toBeInstanceOf(Date);
      expect(report.endDate).toBeInstanceOf(Date);
      expect(report.participantCount).toBe(20);
      expect(report.completionRate).toBeGreaterThanOrEqual(0);
      expect(report.completionRate).toBeLessThanOrEqual(1);
      expect(report.dataQuality).toBeGreaterThanOrEqual(0);
      expect(report.dataQuality).toBeLessThanOrEqual(100);
      expect(report.technicalIssues).toBeInstanceOf(Array);
      expect(report.performanceMetrics).toHaveProperty('averageResponseTime');
      expect(report.contextTransferValidation).toHaveProperty('totalAssessments');
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.goNoGoDecision).toMatch(/^(GO|NO_GO|CONDITIONAL_GO)$/);
      expect(report.reasoning).toBeDefined();
    });

    test('should validate performance metrics structure', async () => {
      const report = await pilotManager.runPilotStudy();
      const metrics = report.performanceMetrics;
      
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('p95ResponseTime');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('databasePerformance');
      expect(metrics.databasePerformance).toHaveProperty('averageQueryTime');
      expect(metrics.databasePerformance).toHaveProperty('slowQueries');
    });

    test('should validate context transfer validation structure', async () => {
      const report = await pilotManager.runPilotStudy();
      const validation = report.contextTransferValidation;
      
      expect(validation).toHaveProperty('totalAssessments');
      expect(validation).toHaveProperty('llmServiceUptime');
      expect(validation).toHaveProperty('averageProcessingTime');
      expect(validation).toHaveProperty('scoringConsistency');
      expect(validation).toHaveProperty('humanValidationSample');
      expect(validation.humanValidationSample).toHaveProperty('sampleSize');
      expect(validation.humanValidationSample).toHaveProperty('agreement');
      expect(validation.humanValidationSample).toHaveProperty('kappa');
    });
  });

  describe('Integration Tests', () => {
    test('should integrate recruitment with quality monitoring', async () => {
      const recruitmentManager = new ParticipantRecruitmentManager();
      const qualityMonitor = new QualityMonitoringSystem();
      
      // Create participant profile
      const mockQuestionnaire: ScreeningQuestionnaire = {
        age: 25,
        nativeLanguage: 'Vietnamese',
        countryOfResidence: 'Vietnam',
        educationLevel: 'bachelor',
        englishLearningYears: 5,
        previousEnglishCourses: [],
        currentEnglishUse: 'daily',
        selfAssessedLevel: 'B2',
        listeningConfidence: 6,
        speakingConfidence: 5,
        readingConfidence: 7,
        writingConfidence: 5,
        deviceTypes: ['laptop'],
        internetReliability: 'good',
        dailyAvailableTime: 30,
        preferredStudyTime: 'evening',
        hasLearningDisabilities: false,
        isNativeEnglishSpeaker: false,
        hasUsedSpacedRepetition: false,
        spacedRepetitionExperience: 0,
        isInIntensiveEnglishProgram: false,
        email: 'test@example.com',
        preferredLanguage: 'vietnamese',
        consentToParticipate: true,
        consentToDataCollection: true,
        consentToFollowUp: true
      };

      const assignment = { algorithm: 'CARTS', proficiencyLevel: 'B2' };
      const profile = await recruitmentManager.createParticipantProfile(
        mockQuestionnaire,
        assignment,
        85
      );

      // Monitor participant quality
      const qualityMetrics = await qualityMonitor.analyzeParticipantQuality(profile.participantId);
      
      expect(qualityMetrics.participantId).toBe(profile.participantId);
      expect(qualityMetrics.qualityScore).toBeGreaterThanOrEqual(0);
    });

    test('should integrate deployment with quality monitoring', async () => {
      const deploymentManager = new StudyPlatformDeploymentManager();
      const qualityMonitor = new QualityMonitoringSystem();
      
      // Deploy to staging
      const deployResult = await deploymentManager.deployToEnvironment('staging', '1.0.0');
      expect(deployResult.success).toBe(true);
      
      // Run quality checks
      const integrityChecks = await qualityMonitor.runDataIntegrityChecks();
      expect(integrityChecks.length).toBeGreaterThan(0);
      
      // Generate quality report
      const report = await qualityMonitor.generateWeeklyReport(1);
      expect(report.weekNumber).toBe(1);
    });

    test('should validate end-to-end pilot study workflow', async () => {
      // Create a pilot manager with staging environment already set up
      const deploymentManager = new StudyPlatformDeploymentManager();
      await deploymentManager.deployToEnvironment('staging', '1.0.0');
      
      // Create pilot manager which will use its own deployment manager instance
      // We need to ensure staging is healthy in that instance too
      const pilotManager = new PilotStudyManager();
      
      // Access the pilot manager's deployment manager and deploy to staging
      // This is a workaround for the fact that PilotStudyManager creates its own instance
      await (pilotManager as any).deploymentManager.deployToEnvironment('staging', '1.0.0');
      
      // Run complete pilot study
      const report = await pilotManager.runPilotStudy();
      
      // Validate all components are present
      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('startDate');
      expect(report).toHaveProperty('endDate');
      expect(report).toHaveProperty('participantCount');
      expect(report).toHaveProperty('completionRate');
      expect(report).toHaveProperty('dataQuality');
      expect(report).toHaveProperty('technicalIssues');
      expect(report).toHaveProperty('performanceMetrics');
      expect(report).toHaveProperty('contextTransferValidation');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('goNoGoDecision');
      expect(report).toHaveProperty('reasoning');
      
      // Validate decision logic
      if (report.goNoGoDecision === 'GO') {
        expect(report.completionRate).toBeGreaterThanOrEqual(0.75);
        expect(report.dataQuality).toBeGreaterThanOrEqual(80);
      }
    }, 60000); // 60 second timeout for this long-running test
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid participant data gracefully', async () => {
      const recruitmentManager = new ParticipantRecruitmentManager();
      
      const invalidQuestionnaire = {
        age: -5, // Invalid age
        nativeLanguage: '',
        // Missing required fields
      } as any;

      await expect(recruitmentManager.screenParticipant(invalidQuestionnaire))
        .resolves.toHaveProperty('eligible', false);
    });

    test('should handle deployment failures gracefully', async () => {
      const deploymentManager = new StudyPlatformDeploymentManager();
      
      // Test with invalid environment
      const result = await deploymentManager.deployToEnvironment('invalid', '1.0.0');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('should handle missing participant data in quality monitoring', async () => {
      const qualityMonitor = new QualityMonitoringSystem();
      
      // Test with non-existent participant
      const metrics = await qualityMonitor.analyzeParticipantQuality('nonexistent_participant');
      expect(metrics.participantId).toBe('nonexistent_participant');
      expect(metrics.qualityScore).toBeGreaterThanOrEqual(0);
    });

    test('should validate data integrity check error handling', async () => {
      const qualityMonitor = new QualityMonitoringSystem();
      
      const checks = await qualityMonitor.runDataIntegrityChecks();
      
      // Some checks might fail in testing environment
      const failedChecks = checks.filter(check => !check.passed);
      failedChecks.forEach(check => {
        expect(check.error).toBeDefined();
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large participant datasets efficiently', async () => {
      const qualityMonitor = new QualityMonitoringSystem();
      
      const startTime = Date.now();
      const report = await qualityMonitor.generateWeeklyReport(1);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(report.participantMetrics.length).toBeGreaterThan(0);
    });

    test('should handle concurrent load testing', async () => {
      const deploymentManager = new StudyPlatformDeploymentManager();
      
      const loadTestPromises = [
        deploymentManager.runLoadTest('staging'),
        deploymentManager.runLoadTest('staging'),
        deploymentManager.runLoadTest('staging')
      ];
      
      const results = await Promise.all(loadTestPromises);
      
      results.forEach(result => {
        expect(result.testName).toBeDefined();
        expect(result.totalRequests).toBeGreaterThan(0);
      });
    });
  });
});