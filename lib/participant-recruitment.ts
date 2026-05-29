// lib/participant-recruitment.ts
// Participant Recruitment and Management for CARTS Research Study
// Step 8: Real-World Study Preparation

import { StudyParticipant } from './longitudinal-study-infrastructure';

/**
 * Participant Recruitment Interfaces
 */
export interface ScreeningQuestionnaire {
  // Demographics
  age: number;
  nativeLanguage: string;
  countryOfResidence: string;
  educationLevel: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other';
  
  // English Learning Background
  englishLearningYears: number;
  previousEnglishCourses: string[];
  currentEnglishUse: 'daily' | 'weekly' | 'monthly' | 'rarely';
  
  // CEFR Self-Assessment
  selfAssessedLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  listeningConfidence: number; // 1-10 scale
  speakingConfidence: number;
  readingConfidence: number;
  writingConfidence: number;
  
  // Technology & Availability
  deviceTypes: ('desktop' | 'laptop' | 'tablet' | 'smartphone')[];
  internetReliability: 'excellent' | 'good' | 'fair' | 'poor';
  dailyAvailableTime: number; // minutes
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
  
  // Exclusion Criteria Screening
  hasLearningDisabilities: boolean;
  isNativeEnglishSpeaker: boolean;
  hasUsedSpacedRepetition: boolean;
  spacedRepetitionExperience: number; // months
  isInIntensiveEnglishProgram: boolean;
  
  // Consent and Contact
  email: string;
  phoneNumber?: string;
  preferredLanguage: 'english' | 'vietnamese';
  consentToParticipate: boolean;
  consentToDataCollection: boolean;
  consentToFollowUp: boolean;
}

export interface EligibilityCriteria {
  minAge: number;
  maxAge: number;
  excludedNativeLanguages: string[];
  maxSpacedRepetitionExperience: number; // months
  requiredDeviceTypes: string[];
  minDailyTime: number; // minutes
  requiredInternetQuality: string[];
}

export interface StratifiedQuota {
  algorithm: string;
  proficiencyLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  targetCount: number;
  currentCount: number;
  isComplete: boolean;
}

export interface ConsentFormData {
  participantId: string;
  consentVersion: string;
  consentDate: Date;
  ipAddress: string;
  userAgent: string;
  digitalSignature: string;
  witnessEmail?: string;
  language: 'english' | 'vietnamese';
}

export interface ParticipantProfile {
  participantId: string;
  anonymizedId: string;
  recruitmentDate: Date;
  screeningData: Omit<ScreeningQuestionnaire, 'email' | 'phoneNumber'>;
  assignedAlgorithm: string;
  assignedProficiencyLevel: string;
  eligibilityScore: number;
  dropoutRisk: 'low' | 'medium' | 'high';
  contactPreferences: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
    frequency: 'daily' | 'weekly' | 'biweekly';
  };
}

export interface DropoutPrediction {
  participantId: string;
  riskScore: number; // 0-1, higher = more likely to drop out
  riskFactors: string[];
  interventionRecommendations: string[];
  lastUpdated: Date;
}

/**
 * Participant Recruitment Manager
 */
export class ParticipantRecruitmentManager {
  private readonly TOTAL_TARGET = 200;
  private readonly ALGORITHMS = ['SM-2', 'HLR', 'KARL', 'LECTOR', 'DART', 'CARTS'];
  private readonly PROFICIENCY_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  private readonly TARGET_PER_CELL = Math.floor(this.TOTAL_TARGET / (this.ALGORITHMS.length * this.PROFICIENCY_LEVELS.length));

  private eligibilityCriteria: EligibilityCriteria = {
    minAge: 18,
    maxAge: 65,
    excludedNativeLanguages: ['english'],
    maxSpacedRepetitionExperience: 6, // months
    requiredDeviceTypes: ['desktop', 'laptop', 'tablet'],
    minDailyTime: 15, // minutes
    requiredInternetQuality: ['excellent', 'good']
  };

  /**
   * Screen potential participant for eligibility
   */
  async screenParticipant(questionnaire: ScreeningQuestionnaire): Promise<{
    eligible: boolean;
    eligibilityScore: number;
    reasons: string[];
    recommendedLevel?: string;
  }> {
    // 1. Chốt chặn dữ liệu rỗng
    if (!questionnaire) {
      return { eligible: false, eligibilityScore: 0, reasons: ['Missing questionnaire data'] };
    }

    const reasons: string[] = [];
    let eligibilityScore = 100;

    // 2. Phòng thủ kiểm tra Tuổi an toàn
    const age = questionnaire.age;
    if (age === undefined || age < this.eligibilityCriteria.minAge || 
        age > this.eligibilityCriteria.maxAge) {
      reasons.push(`Age must be between ${this.eligibilityCriteria.minAge}-${this.eligibilityCriteria.maxAge}`);
      eligibilityScore -= 100;
    }

    // Native language check
    if (questionnaire.nativeLanguage && this.eligibilityCriteria.excludedNativeLanguages.includes(questionnaire.nativeLanguage.toLowerCase())) {
      reasons.push('Native English speakers are excluded from this study');
      eligibilityScore -= 100;
    }

    // 3. Phòng thủ kiểm tra kinh nghiệm Spaced Repetition an toàn (Tránh lỗi gọi .some trên undefined)
    const hasExtensiveExperience = questionnaire.spacedRepetitionExperience !== undefined && 
        questionnaire.spacedRepetitionExperience > this.eligibilityCriteria.maxSpacedRepetitionExperience;

    if (hasExtensiveExperience) {
      reasons.push(`Extensive spaced repetition experience (>${this.eligibilityCriteria.maxSpacedRepetitionExperience} months) excludes participation`);
      eligibilityScore -= 50;
    }

    // Device compatibility check
    if (questionnaire.deviceTypes && Array.isArray(questionnaire.deviceTypes)) {
      const hasCompatibleDevice = questionnaire.deviceTypes.some(device => 
        this.eligibilityCriteria.requiredDeviceTypes.includes(device)
      );
      if (!hasCompatibleDevice) {
        reasons.push('Compatible device (desktop, laptop, or tablet) required');
        eligibilityScore -= 30;
      }
    }

    // Time availability check
    if (questionnaire.dailyAvailableTime !== undefined && 
        questionnaire.dailyAvailableTime < this.eligibilityCriteria.minDailyTime) {
      reasons.push(`Minimum ${this.eligibilityCriteria.minDailyTime} minutes daily commitment required`);
      eligibilityScore -= 20;
    }

    // Internet reliability check
    if (questionnaire.internetReliability && 
        !this.eligibilityCriteria.requiredInternetQuality.includes(questionnaire.internetReliability)) {
      reasons.push('Reliable internet connection required');
      eligibilityScore -= 15;
    }

    // Learning disabilities check
    if (questionnaire.hasLearningDisabilities) {
      reasons.push('Participants with learning disabilities affecting memory are excluded');
      eligibilityScore -= 100;
    }

    // Intensive program check
    if (questionnaire.isInIntensiveEnglishProgram) {
      reasons.push('Concurrent intensive English program enrollment excludes participation');
      eligibilityScore -= 25;
    }

    // Consent checks
    if (!questionnaire.consentToParticipate || !questionnaire.consentToDataCollection) {
      reasons.push('Full informed consent required');
      eligibilityScore -= 100;
    }

    // Validate CEFR level assessment
    const recommendedLevel = this.validateCEFRLevel(questionnaire);

    const eligible = eligibilityScore >= 70 && reasons.length === 0;

    return {
      eligible,
      eligibilityScore: Math.max(0, eligibilityScore),
      reasons,
      recommendedLevel
    };
  }

  /**
   * Validate and potentially adjust CEFR level based on confidence scores
   */
  private validateCEFRLevel(questionnaire: ScreeningQuestionnaire): string {
    // Defensive programming: check if confidence scores exist
    if (!questionnaire || 
        questionnaire.listeningConfidence === undefined ||
        questionnaire.speakingConfidence === undefined ||
        questionnaire.readingConfidence === undefined ||
        questionnaire.writingConfidence === undefined) {
      return questionnaire?.selfAssessedLevel || 'B1'; // Default to B1 if no data
    }

    const avgConfidence = (
      questionnaire.listeningConfidence +
      questionnaire.speakingConfidence +
      questionnaire.readingConfidence +
      questionnaire.writingConfidence
    ) / 4;

    const levelMapping: Record<string, { minConfidence: number; maxConfidence: number }> = {
      'A1': { minConfidence: 1, maxConfidence: 3 },
      'A2': { minConfidence: 2, maxConfidence: 4 },
      'B1': { minConfidence: 3, maxConfidence: 6 },
      'B2': { minConfidence: 5, maxConfidence: 7 },
      'C1': { minConfidence: 6, maxConfidence: 9 },
      'C2': { minConfidence: 8, maxConfidence: 10 }
    };

    const selfAssessed = questionnaire.selfAssessedLevel;
    const expectedRange = levelMapping[selfAssessed];

    // Check if expectedRange exists before accessing properties
    if (expectedRange && avgConfidence >= expectedRange.minConfidence && avgConfidence <= expectedRange.maxConfidence) {
      return selfAssessed;
    }

    // Suggest adjustment based on confidence scores
    for (const [level, range] of Object.entries(levelMapping)) {
      if (avgConfidence >= range.minConfidence && avgConfidence <= range.maxConfidence) {
        return level;
      }
    }

    return selfAssessed || 'B1'; // Default to self-assessment or B1 if no clear match
  }

  /**
   * Check quota availability for stratified randomization
   */
  async checkQuotaAvailability(): Promise<StratifiedQuota[]> {
    const quotas: StratifiedQuota[] = [];

    for (const algorithm of this.ALGORITHMS) {
      for (const level of this.PROFICIENCY_LEVELS) {
        // In real implementation, this would query the database
        const currentCount = await this.getCurrentParticipantCount(algorithm, level);
        
        quotas.push({
          algorithm,
          proficiencyLevel: level as any,
          targetCount: this.TARGET_PER_CELL,
          currentCount,
          isComplete: currentCount >= this.TARGET_PER_CELL
        });
      }
    }

    return quotas;
  }

  /**
   * Assign participant to algorithm and proficiency level using stratified randomization
   */
  async assignParticipant(
    eligibleParticipant: ScreeningQuestionnaire,
    recommendedLevel: string
  ): Promise<{ algorithm: string; proficiencyLevel: string } | null> {
    const quotas = await this.checkQuotaAvailability();
    
    // Find available slots for the recommended proficiency level
    const availableSlots = quotas.filter(quota => 
      quota.proficiencyLevel === recommendedLevel && !quota.isComplete
    );

    if (availableSlots.length === 0) {
      // Try adjacent proficiency levels if recommended level is full
      const adjacentLevels = this.getAdjacentProficiencyLevels(recommendedLevel);
      const adjacentSlots = quotas.filter(quota => 
        adjacentLevels.includes(quota.proficiencyLevel) && !quota.isComplete
      );

      if (adjacentSlots.length === 0) {
        return null; // No available slots
      }

      // Randomly select from adjacent levels
      const selectedSlot = adjacentSlots[Math.floor(Math.random() * adjacentSlots.length)];
      return {
        algorithm: selectedSlot.algorithm,
        proficiencyLevel: selectedSlot.proficiencyLevel
      };
    }

    // Randomly assign to available algorithm for the proficiency level
    const selectedSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
    return {
      algorithm: selectedSlot.algorithm,
      proficiencyLevel: selectedSlot.proficiencyLevel
    };
  }

  /**
   * Generate anonymized participant ID
   */
  generateAnonymizedId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CARTS_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Create participant profile with anonymization
   */
  async createParticipantProfile(
    questionnaire: ScreeningQuestionnaire,
    assignment: { algorithm: string; proficiencyLevel: string },
    eligibilityScore: number
  ): Promise<ParticipantProfile> {
    const participantId = this.generateAnonymizedId();
    const anonymizedId = this.generateAnonymizedId();

    // Remove PII from screening data
    const { email, phoneNumber, ...anonymizedScreeningData } = questionnaire;

    const profile: ParticipantProfile = {
      participantId,
      anonymizedId,
      recruitmentDate: new Date(),
      screeningData: anonymizedScreeningData,
      assignedAlgorithm: assignment.algorithm,
      assignedProficiencyLevel: assignment.proficiencyLevel,
      eligibilityScore,
      dropoutRisk: this.calculateInitialDropoutRisk(questionnaire),
      contactPreferences: {
        email: true,
        sms: !!questionnaire.phoneNumber,
        inApp: true,
        frequency: 'weekly'
      }
    };

    return profile;
  }

  /**
   * Digital consent form processing
   */
  async processDigitalConsent(
    participantId: string,
    consentData: {
      version: string;
      language: 'english' | 'vietnamese';
      ipAddress: string;
      userAgent: string;
      digitalSignature: string;
    }
  ): Promise<ConsentFormData> {
    const consent: ConsentFormData = {
      participantId,
      consentVersion: consentData.version,
      consentDate: new Date(),
      ipAddress: consentData.ipAddress,
      userAgent: consentData.userAgent,
      digitalSignature: consentData.digitalSignature,
      language: consentData.language
    };

    // In real implementation, store in secure database with encryption
    await this.storeConsentRecord(consent);

    return consent;
  }

  /**
   * Predict dropout risk based on screening questionnaire
   */
  private calculateInitialDropoutRisk(questionnaire: ScreeningQuestionnaire): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Age factor (younger participants may have higher dropout)
    if (questionnaire.age < 25) riskScore += 1;
    if (questionnaire.age > 55) riskScore += 1;

    // Time availability factor
    if (questionnaire.dailyAvailableTime < 20) riskScore += 2;
    if (questionnaire.dailyAvailableTime < 15) riskScore += 1;

    // Internet reliability factor
    if (questionnaire.internetReliability === 'fair') riskScore += 1;
    if (questionnaire.internetReliability === 'poor') riskScore += 2;

    // English use frequency factor
    if (questionnaire.currentEnglishUse === 'rarely') riskScore += 2;
    if (questionnaire.currentEnglishUse === 'monthly') riskScore += 1;

    // Device compatibility factor
    if (!questionnaire.deviceTypes.includes('desktop') && !questionnaire.deviceTypes.includes('laptop')) {
      riskScore += 1;
    }

    // Confidence level factor (very low confidence may indicate frustration)
    const avgConfidence = (
      questionnaire.listeningConfidence +
      questionnaire.speakingConfidence +
      questionnaire.readingConfidence +
      questionnaire.writingConfidence
    ) / 4;

    if (avgConfidence < 3) riskScore += 2;
    if (avgConfidence < 2) riskScore += 1;

    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Generate dropout prediction with interventions
   */
  async generateDropoutPrediction(participantId: string): Promise<DropoutPrediction> {
    // In real implementation, this would use ML model based on engagement data
    const mockRiskScore = Math.random();
    const riskFactors: string[] = [];
    const interventions: string[] = [];

    if (mockRiskScore > 0.7) {
      riskFactors.push('Low session completion rate', 'Irregular login pattern');
      interventions.push('Send personalized encouragement email', 'Offer flexible scheduling');
    } else if (mockRiskScore > 0.4) {
      riskFactors.push('Declining performance trend');
      interventions.push('Provide additional learning resources');
    }

    return {
      participantId,
      riskScore: mockRiskScore,
      riskFactors,
      interventionRecommendations: interventions,
      lastUpdated: new Date()
    };
  }

  /**
   * Helper methods
   */
  private getAdjacentProficiencyLevels(level: string): string[] {
    const levels = this.PROFICIENCY_LEVELS;
    const index = levels.indexOf(level);
    const adjacent: string[] = [];

    if (index > 0) adjacent.push(levels[index - 1]);
    if (index < levels.length - 1) adjacent.push(levels[index + 1]);

    return adjacent;
  }

  private async getCurrentParticipantCount(algorithm: string, level: string): Promise<number> {
    // Mock implementation - in real app, query database
    return Math.floor(Math.random() * this.TARGET_PER_CELL);
  }

  private async storeConsentRecord(consent: ConsentFormData): Promise<void> {
    // Mock implementation - in real app, store in encrypted database
    console.log(`Stored consent record for participant ${consent.participantId}`);
  }

  /**
   * Generate recruitment dashboard data
   */
  async getRecruitmentDashboardData(): Promise<{
    totalScreened: number;
    totalEligible: number;
    totalEnrolled: number;
    quotaStatus: StratifiedQuota[];
    dropoutPredictions: DropoutPrediction[];
    recruitmentRate: number;
    completionProjection: Date;
  }> {
    const quotas = await this.checkQuotaAvailability();
    const totalEnrolled = quotas.reduce((sum, quota) => sum + quota.currentCount, 0);
    const totalScreened = Math.floor(totalEnrolled * 1.5); // Assume 67% eligibility rate
    const totalEligible = Math.floor(totalScreened * 0.67);

    // Mock dropout predictions
    const dropoutPredictions: DropoutPrediction[] = [];
    for (let i = 0; i < Math.min(10, totalEnrolled); i++) {
      dropoutPredictions.push(await this.generateDropoutPrediction(`participant_${i}`));
    }

    const recruitmentRate = totalEnrolled / 7; // participants per day
    const remainingParticipants = this.TOTAL_TARGET - totalEnrolled;
    const daysToCompletion = Math.ceil(remainingParticipants / Math.max(1, recruitmentRate));
    const completionProjection = new Date();
    completionProjection.setDate(completionProjection.getDate() + daysToCompletion);

    return {
      totalScreened,
      totalEligible,
      totalEnrolled,
      quotaStatus: quotas,
      dropoutPredictions,
      recruitmentRate,
      completionProjection
    };
  }
}

/**
 * Early Warning System for Participant Retention
 */
export class EarlyWarningSystem {
  /**
   * Analyze participant engagement patterns
   */
  async analyzeEngagementPatterns(participantId: string): Promise<{
    warningLevel: 'green' | 'yellow' | 'red';
    indicators: string[];
    recommendations: string[];
  }> {
    // Mock implementation - in real app, analyze actual engagement data
    const mockEngagementScore = Math.random();
    
    if (mockEngagementScore < 0.3) {
      return {
        warningLevel: 'red',
        indicators: [
          'No sessions in past 3 days',
          'Completion rate below 50%',
          'Declining performance trend'
        ],
        recommendations: [
          'Send immediate intervention email',
          'Offer phone call support',
          'Provide study schedule adjustment options'
        ]
      };
    } else if (mockEngagementScore < 0.6) {
      return {
        warningLevel: 'yellow',
        indicators: [
          'Irregular session pattern',
          'Slower response times'
        ],
        recommendations: [
          'Send motivational reminder',
          'Provide progress summary'
        ]
      };
    }

    return {
      warningLevel: 'green',
      indicators: ['Regular participation', 'Consistent performance'],
      recommendations: ['Continue current engagement strategy']
    };
  }

  /**
   * Generate automated intervention recommendations
   */
  async generateInterventions(participantId: string): Promise<{
    emailTemplate: string;
    scheduledReminders: Date[];
    supportResources: string[];
  }> {
    const analysis = await this.analyzeEngagementPatterns(participantId);
    
    let emailTemplate = '';
    const scheduledReminders: Date[] = [];
    const supportResources: string[] = [];

    if (analysis.warningLevel === 'red') {
      emailTemplate = 'high_risk_intervention';
      // Schedule daily reminders for next 3 days
      for (let i = 1; i <= 3; i++) {
        const reminder = new Date();
        reminder.setDate(reminder.getDate() + i);
        scheduledReminders.push(reminder);
      }
      supportResources.push('Technical support contact', 'Study schedule flexibility options');
    } else if (analysis.warningLevel === 'yellow') {
      emailTemplate = 'gentle_encouragement';
      // Schedule reminder in 2 days
      const reminder = new Date();
      reminder.setDate(reminder.getDate() + 2);
      scheduledReminders.push(reminder);
      supportResources.push('Progress tracking dashboard', 'Learning tips guide');
    }

    return {
      emailTemplate,
      scheduledReminders,
      supportResources
    };
  }
}