// __tests__/longitudinal-study-infrastructure.test.ts
// Test suite for Longitudinal Study Infrastructure

import {
  StudyOrchestrator,
  ParticipantManager,
  ABTestingFramework,
  DataCollectionPipeline,
  MockStudyDataStorage,
  StudyConfiguration,
  DemographicData,
  StudyParticipant,
  VocabularyItem
} from '../lib/longitudinal-study-infrastructure';

describe('Longitudinal Study Infrastructure Tests', () => {
  let studyConfig: StudyConfiguration;
  let studyOrchestrator: StudyOrchestrator;

  beforeEach(() => {
    studyConfig = {
      studyId: 'CARTS_STUDY_2026',
      title: 'CARTS vs Baseline Algorithms Comparison',
      description: 'Longitudinal study comparing CARTS with baseline spaced repetition algorithms',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-07-27'), // 8 weeks
      targetParticipants: 200,
      vocabularySetSize: 100,
      sessionFrequency: 'daily',
      minSessionsPerWeek: 5,
      maxSessionDuration: 30,
      algorithms: [
        { name: 'SM-2', displayName: 'SM-2 Algorithm', description: 'Classic spaced repetition' },
        { name: 'HLR', displayName: 'Half-Life Regression', description: 'Data-driven scheduling' },
        { name: 'KARL', displayName: 'KARL', description: 'Semantic-aware scheduling' },
        { name: 'LECTOR', displayName: 'LECTOR', description: 'Interference-aware scheduling' },
        { name: 'DART', displayName: 'DART', description: 'Difficulty-aware scheduling' },
        { name: 'CARTS', displayName: 'CARTS', description: 'Deep RL joint scheduling' }
      ],
      evaluationSchedule: {
        preTest: true,
        postTest: true,
        weeklyAssessments: true,
        contextTransferTests: [2, 4, 6, 8],
        retentionTests: [4, 8]
      }
    };

    studyOrchestrator = new StudyOrchestrator(studyConfig);
  });

  describe('Study Configuration', () => {
    test('should initialize study with correct configuration', async () => {
      await studyOrchestrator.initializeStudy();
      
      expect(studyConfig.studyId).toBe('CARTS_STUDY_2026');
      expect(studyConfig.algorithms).toHaveLength(6);
      expect(studyConfig.targetParticipants).toBe(200);
      expect(studyConfig.vocabularySetSize).toBe(100);
    });

    test('should validate study duration', () => {
      const durationMs = studyConfig.endDate.getTime() - studyConfig.startDate.getTime();
      const durationWeeks = durationMs / (1000 * 60 * 60 * 24 * 7);
      
      expect(durationWeeks).toBeCloseTo(8, 1); // Approximately 8 weeks
    });
  });

  describe('Participant Management', () => {
    let participantManager: ParticipantManager;

    beforeEach(() => {
      participantManager = new ParticipantManager(studyConfig);
    });

    test('should enroll participants with balanced algorithm assignment', () => {
      const demographicData: DemographicData = {
        age: 25,
        gender: 'female',
        nativeLanguage: 'Spanish',
        educationLevel: 'undergraduate',
        englishLearningYears: 5,
        previousSRSExperience: false,
        studyMotivation: 'Academic improvement',
        timeZone: 'UTC-5'
      };

      // Enroll multiple participants
      const participants: StudyParticipant[] = [];
      for (let i = 0; i < 12; i++) {
        const participant = participantManager.enrollParticipant(
          `user_${i}`,
          demographicData,
          'B1',
          true
        );
        participants.push(participant);
      }

      // Check algorithm distribution
      const algorithmCounts: Record<string, number> = {};
      participants.forEach(p => {
        algorithmCounts[p.assignedAlgorithm] = (algorithmCounts[p.assignedAlgorithm] || 0) + 1;
      });

      // Should be balanced (2 participants per algorithm)
      Object.values(algorithmCounts).forEach(count => {
        expect(count).toBe(2);
      });
    });

    test('should generate appropriate vocabulary sets', () => {
      const participant = participantManager.enrollParticipant(
        'test_user',
        {
          age: 30,
          gender: 'male',
          nativeLanguage: 'French',
          educationLevel: 'graduate',
          englishLearningYears: 8,
          previousSRSExperience: true,
          studyMotivation: 'Professional development',
          timeZone: 'UTC+1'
        },
        'B2',
        true
      );

      expect(participant.vocabularySet).toHaveLength(studyConfig.vocabularySetSize);
      
      // Check difficulty distribution
      const difficultyCount = {
        beginner: 0,
        intermediate: 0,
        advanced: 0
      };

      participant.vocabularySet.forEach(word => {
        difficultyCount[word.difficulty]++;
      });

      // Should have words from all difficulty levels
      expect(difficultyCount.beginner).toBeGreaterThan(0);
      expect(difficultyCount.intermediate).toBeGreaterThan(0);
      expect(difficultyCount.advanced).toBeGreaterThan(0);
    });

    test('should track participant statistics', () => {
      // Enroll participants with different statuses
      const participant1 = participantManager.enrollParticipant('user1', {} as DemographicData, 'A2', true);
      const participant2 = participantManager.enrollParticipant('user2', {} as DemographicData, 'B1', true);
      const participant3 = participantManager.enrollParticipant('user3', {} as DemographicData, 'B2', true);

      participantManager.updateParticipantStatus(participant1.participantId, 'active');
      participantManager.updateParticipantStatus(participant2.participantId, 'completed');

      const stats = participantManager.getStudyStatistics();

      expect(stats.totalParticipants).toBe(3);
      expect(stats.activeParticipants).toBe(1);
      expect(stats.completedParticipants).toBe(1);
      expect(stats.proficiencyDistribution).toEqual({
        A2: 1,
        B1: 1,
        B2: 1
      });
    });
  });

  describe('A/B Testing Framework', () => {
    let participantManager: ParticipantManager;
    let abTestFramework: ABTestingFramework;

    beforeEach(() => {
      participantManager = new ParticipantManager(studyConfig);
      abTestFramework = new ABTestingFramework(participantManager);
    });

    test('should conduct learning sessions', async () => {
      const participant = participantManager.enrollParticipant(
        'test_user',
        {} as DemographicData,
        'B1',
        true
      );

      const session = await abTestFramework.conductLearningSession(
        participant.participantId,
        10 // 10-minute session
      );

      expect(session.participantId).toBe(participant.participantId);
      expect(session.interactions.length).toBeGreaterThan(0);
      expect(session.sessionMetrics.totalInteractions).toBe(session.interactions.length);
      expect(session.sessionMetrics.correctResponses).toBeLessThanOrEqual(session.interactions.length);
      expect(session.sessionMetrics.averageResponseTime).toBeGreaterThan(0);
    });

    test('should simulate realistic learner performance', async () => {
      const participant = participantManager.enrollParticipant(
        'advanced_user',
        {
          age: 28,
          gender: 'other',
          nativeLanguage: 'German',
          educationLevel: 'postgraduate',
          englishLearningYears: 12,
          previousSRSExperience: true,
          studyMotivation: 'Research participation',
          timeZone: 'UTC+2'
        },
        'C1', // Advanced proficiency
        true
      );

      const session = await abTestFramework.conductLearningSession(
        participant.participantId,
        15
      );

      // Advanced learners should have higher accuracy
      const accuracy = session.sessionMetrics.correctResponses / session.sessionMetrics.totalInteractions;
      expect(accuracy).toBeGreaterThan(0.6); // Should be reasonably high for C1 level
    });

    test('should handle different algorithms correctly', async () => {
      const algorithms = ['SM-2', 'HLR', 'KARL', 'LECTOR', 'DART', 'CARTS'];
      
      for (const algorithm of algorithms) {
        const participant = participantManager.enrollParticipant(
          `user_${algorithm}`,
          {} as DemographicData,
          'B1',
          true
        );

        // Manually set algorithm for testing
        participant.assignedAlgorithm = algorithm;

        const session = await abTestFramework.conductLearningSession(
          participant.participantId,
          5 // Short session for testing
        );

        expect(session.interactions.length).toBeGreaterThan(0);
        expect(session.sessionMetrics).toBeDefined();
      }
    });
  });

  describe('Data Collection Pipeline', () => {
    let participantManager: ParticipantManager;
    let abTestFramework: ABTestingFramework;
    let dataStorage: MockStudyDataStorage;
    let dataCollectionPipeline: DataCollectionPipeline;

    beforeEach(() => {
      participantManager = new ParticipantManager(studyConfig);
      abTestFramework = new ABTestingFramework(participantManager);
      dataStorage = new MockStudyDataStorage();
      dataCollectionPipeline = new DataCollectionPipeline(
        participantManager,
        abTestFramework,
        dataStorage
      );
    });

    test('should conduct weekly assessments', async () => {
      const participant = participantManager.enrollParticipant(
        'assessment_user',
        {} as DemographicData,
        'B1',
        true
      );

      // Simulate some learning sessions first
      for (let i = 0; i < 5; i++) {
        await abTestFramework.conductLearningSession(participant.participantId, 10);
      }

      const assessment = await dataCollectionPipeline.conductWeeklyAssessment(
        participant.participantId,
        2 // Week 2
      );

      expect(assessment.participantId).toBe(participant.participantId);
      expect(assessment.weekNumber).toBe(2);
      expect(assessment.assessmentType).toBe('weekly');
      expect(assessment.scores.overallScore).toBeGreaterThan(0);
      expect(assessment.scores.overallScore).toBeLessThanOrEqual(1);
      expect(assessment.detailedResults.length).toBeGreaterThan(0);
    });

    test('should export participant data correctly', async () => {
      const participant = participantManager.enrollParticipant(
        'export_user',
        {
          age: 22,
          gender: 'female',
          nativeLanguage: 'Japanese',
          educationLevel: 'undergraduate',
          englishLearningYears: 6,
          previousSRSExperience: false,
          studyMotivation: 'Language certification',
          timeZone: 'UTC+9'
        },
        'A2',
        true
      );

      // Conduct some sessions and assessments
      await abTestFramework.conductLearningSession(participant.participantId, 15);
      await dataCollectionPipeline.conductWeeklyAssessment(participant.participantId, 1);

      const exportedData = await dataCollectionPipeline.exportParticipantData(participant.participantId);

      expect(exportedData.participant.participantId).toBe(participant.participantId);
      expect(exportedData.participant.userId).toBe('ANONYMIZED'); // Should be anonymized
      expect(exportedData.summary.totalSessions).toBeGreaterThan(0);
      expect(exportedData.summary.averageAccuracy).toBeGreaterThanOrEqual(0);
      expect(exportedData.summary.vocabularyMastery).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Study Orchestrator Integration', () => {
    test('should enroll participants through orchestrator', () => {
      const demographicData: DemographicData = {
        age: 26,
        gender: 'male',
        nativeLanguage: 'Portuguese',
        educationLevel: 'graduate',
        englishLearningYears: 7,
        previousSRSExperience: true,
        studyMotivation: 'Academic research',
        timeZone: 'UTC-3'
      };

      const participant = studyOrchestrator.enrollParticipant(
        'orchestrator_user',
        demographicData,
        'B2',
        true
      );

      expect(participant.participantId).toBeTruthy();
      expect(participant.assignedAlgorithm).toBeTruthy();
      expect(participant.vocabularySet.length).toBe(studyConfig.vocabularySetSize);
      expect(participant.consentGiven).toBe(true);
    });

    test('should generate progress reports', async () => {
      // Enroll some participants
      for (let i = 0; i < 6; i++) {
        studyOrchestrator.enrollParticipant(
          `progress_user_${i}`,
          {} as DemographicData,
          'B1',
          true
        );
      }

      const report = await studyOrchestrator.generateProgressReport();

      expect(report.studyInfo.studyId).toBe(studyConfig.studyId);
      expect(report.participantStatistics.totalParticipants).toBe(6);
      expect(report.algorithmPerformance).toBeDefined();
      expect(Object.keys(report.algorithmPerformance)).toHaveLength(6); // All algorithms
    });

    test('should export study data in different formats', async () => {
      // Enroll participant and generate some data
      const participant = studyOrchestrator.enrollParticipant(
        'export_test_user',
        {} as DemographicData,
        'B1',
        true
      );

      // Export as JSON
      const jsonData = await studyOrchestrator.exportStudyData('json');
      expect(() => JSON.parse(jsonData)).not.toThrow();

      // Export as CSV
      const csvData = await studyOrchestrator.exportStudyData('csv');
      expect(csvData).toContain('ParticipantID,Algorithm,Week,OverallScore,ContextTransferScore');
    });
  });

  describe('Data Storage', () => {
    let dataStorage: MockStudyDataStorage;

    beforeEach(() => {
      dataStorage = new MockStudyDataStorage();
    });

    test('should save and retrieve participants', async () => {
      const participant: StudyParticipant = {
        participantId: 'TEST_P_001',
        userId: 'user_001',
        studyId: 'TEST_STUDY',
        assignedAlgorithm: 'CARTS',
        enrollmentDate: new Date(),
        demographicData: {} as DemographicData,
        proficiencyLevel: 'B1',
        vocabularySet: [],
        sessionHistory: [],
        assessmentResults: [],
        status: 'enrolled',
        consentGiven: true,
        dataRetentionConsent: true
      };

      await dataStorage.saveParticipant(participant);
      const retrieved = await dataStorage.getParticipant('TEST_P_001');

      expect(retrieved).toEqual(participant);
    });

    test('should handle non-existent participants', async () => {
      const retrieved = await dataStorage.getParticipant('NON_EXISTENT');
      expect(retrieved).toBeNull();
    });

    test('should export data in CSV format correctly', async () => {
      // Create mock data
      const participant: StudyParticipant = {
        participantId: 'CSV_TEST_P_001',
        userId: 'csv_user_001',
        studyId: 'CSV_TEST_STUDY',
        assignedAlgorithm: 'DART',
        enrollmentDate: new Date(),
        demographicData: {} as DemographicData,
        proficiencyLevel: 'B2',
        vocabularySet: [],
        sessionHistory: [],
        assessmentResults: [],
        status: 'active',
        consentGiven: true,
        dataRetentionConsent: true
      };

      await dataStorage.saveParticipant(participant);

      const csvData = await dataStorage.exportStudyData('CSV_TEST_STUDY', 'csv');
      const lines = csvData.split('\n');
      
      expect(lines[0]).toBe('ParticipantID,Algorithm,Week,OverallScore,ContextTransferScore');
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('Vocabulary Management', () => {
    test('should generate diverse vocabulary sets', () => {
      const participantManager = new ParticipantManager(studyConfig);
      
      const participant1 = participantManager.enrollParticipant('user1', {} as DemographicData, 'A1', true);
      const participant2 = participantManager.enrollParticipant('user2', {} as DemographicData, 'C2', true);

      // Both should have the same number of words
      expect(participant1.vocabularySet.length).toBe(studyConfig.vocabularySetSize);
      expect(participant2.vocabularySet.length).toBe(studyConfig.vocabularySetSize);

      // But different words (due to randomization)
      const words1 = new Set(participant1.vocabularySet.map(w => w.wordId));
      const words2 = new Set(participant2.vocabularySet.map(w => w.wordId));
      const overlap = new Set([...words1].filter(w => words2.has(w)));
      
      // Should have some overlap but not be identical
      expect(overlap.size).toBeLessThan(words1.size);
      expect(overlap.size).toBeGreaterThan(0);
    });

    test('should include semantic embeddings for all words', () => {
      const participantManager = new ParticipantManager(studyConfig);
      const participant = participantManager.enrollParticipant('embedding_user', {} as DemographicData, 'B1', true);

      participant.vocabularySet.forEach(word => {
        expect(word.semanticEmbedding).toBeDefined();
        expect(word.semanticEmbedding.length).toBeGreaterThan(0);
        expect(word.contexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Simulation', () => {
    test('should simulate realistic learning curves', async () => {
      const participantManager = new ParticipantManager(studyConfig);
      const abTestFramework = new ABTestingFramework(participantManager);
      
      const participant = participantManager.enrollParticipant(
        'learning_curve_user',
        {} as DemographicData,
        'B1',
        true
      );

      // Conduct multiple sessions
      const sessions = [];
      for (let i = 0; i < 10; i++) {
        const session = await abTestFramework.conductLearningSession(participant.participantId, 10);
        sessions.push(session);
      }

      // Calculate accuracy progression
      const accuracies = sessions.map(session => 
        session.sessionMetrics.correctResponses / session.sessionMetrics.totalInteractions
      );

      // Should show some learning (later sessions generally better than earlier ones)
      const firstHalf = accuracies.slice(0, 5);
      const secondHalf = accuracies.slice(5);
      
      const firstHalfAvg = firstHalf.reduce((sum, acc) => sum + acc, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, acc) => sum + acc, 0) / secondHalf.length;
      
      // Learning should occur (though with some randomness)
      expect(secondHalfAvg).toBeGreaterThanOrEqual(firstHalfAvg - 0.1); // Allow for some variance
    });
  });
});