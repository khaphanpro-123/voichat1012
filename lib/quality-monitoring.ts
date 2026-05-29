// lib/quality-monitoring.ts
// Real-time Data Quality Monitoring and Participant Management
// Step 8: Real-World Study Preparation

import { StudyParticipant, StudySession, AssessmentResult } from './longitudinal-study-infrastructure';

/**
 * Data Quality Monitoring Interfaces
 */
export interface DataQualityMetrics {
  participantId: string;
  sessionCompletionRate: number; // 0-1
  averageResponseTime: number; // milliseconds
  suspiciousPatterns: SuspiciousPattern[];
  missingDataPoints: string[];
  qualityScore: number; // 0-100
  lastUpdated: Date;
}

export interface SuspiciousPattern {
  type: 'bot_behavior' | 'too_fast_responses' | 'identical_responses' | 'unusual_timing' | 'impossible_accuracy';
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
  evidence: any;
  confidence: number; // 0-1
}

export interface QualityAlert {
  alertId: string;
  participantId: string;
  alertType: 'completion_rate_low' | 'response_time_outlier' | 'bot_detected' | 'missing_data' | 'engagement_drop';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actions: string[];
}

export interface WeeklyQualityReport {
  reportId: string;
  weekNumber: number;
  generatedAt: Date;
  overallMetrics: {
    totalParticipants: number;
    activeParticipants: number;
    averageCompletionRate: number;
    averageSessionDuration: number;
    dataQualityScore: number;
  };
  participantMetrics: DataQualityMetrics[];
  alerts: QualityAlert[];
  recommendations: string[];
  attritionAnalysis: AttritionAnalysis;
}

export interface AttritionAnalysis {
  currentAttritionRate: number; // percentage
  predictedFinalAttrition: number; // percentage
  riskFactors: { factor: string; impact: number }[];
  interventionRecommendations: string[];
  replacementNeeded: number;
}

export interface ParticipantReminder {
  reminderId: string;
  participantId: string;
  type: 'session_reminder' | 'assessment_due' | 'engagement_boost' | 'technical_support';
  template: string;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  opened?: boolean;
  openedAt?: Date;
  clicked?: boolean;
  clickedAt?: Date;
}

export interface DataIntegrityCheck {
  checkId: string;
  checkType: 'completeness' | 'consistency' | 'accuracy' | 'timeliness';
  description: string;
  query: string;
  expectedResult: any;
  actualResult?: any;
  passed: boolean;
  runAt: Date;
  error?: string;
}

/**
 * Real-time Quality Monitoring System
 */
export class QualityMonitoringSystem {
  private readonly TARGET_COMPLETION_RATE = 0.8; // 80%
  private readonly MAX_RESPONSE_TIME = 30000; // 30 seconds
  private readonly MIN_RESPONSE_TIME = 500; // 0.5 seconds
  private readonly BOT_DETECTION_THRESHOLD = 0.7;

  /**
   * Analyze participant data quality in real-time
   */
  async analyzeParticipantQuality(participantId: string): Promise<DataQualityMetrics> {
    // Mock data retrieval - in real implementation, query database
    const sessions = await this.getParticipantSessions(participantId);
    const assessments = await this.getParticipantAssessments(participantId);

    // Calculate completion rate
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.completed).length;
    const sessionCompletionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

    // Calculate average response time
    const responseTimes = sessions.flatMap(s => s.interactions?.map(i => i.responseTime) || []);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Detect suspicious patterns
    const suspiciousPatterns = await this.detectSuspiciousPatterns(participantId, sessions);

    // Check for missing data
    const missingDataPoints = this.checkMissingData(sessions, assessments);

    // Calculate overall quality score
    const qualityScore = this.calculateQualityScore({
      sessionCompletionRate,
      averageResponseTime,
      suspiciousPatterns,
      missingDataPoints
    });

    return {
      participantId,
      sessionCompletionRate,
      averageResponseTime,
      suspiciousPatterns,
      missingDataPoints,
      qualityScore,
      lastUpdated: new Date()
    };
  }

  /**
   * Detect suspicious patterns that might indicate bot behavior or data quality issues
   */
  private async detectSuspiciousPatterns(
    participantId: string, 
    sessions: StudySession[]
  ): Promise<SuspiciousPattern[]> {
    const patterns: SuspiciousPattern[] = [];

    // Check for too-fast responses
    const fastResponses = sessions.flatMap(s => 
      s.interactions?.filter(i => i.responseTime < this.MIN_RESPONSE_TIME) || []
    );
    
    if (fastResponses.length > 5) {
      patterns.push({
        type: 'too_fast_responses',
        description: `${fastResponses.length} responses faster than ${this.MIN_RESPONSE_TIME}ms`,
        severity: 'medium',
        detectedAt: new Date(),
        evidence: { count: fastResponses.length, threshold: this.MIN_RESPONSE_TIME },
        confidence: Math.min(fastResponses.length / 10, 1)
      });
    }

    // Check for identical response patterns
    const responses = sessions.flatMap(s => 
      s.interactions?.map(i => i.response) || []
    );
    const uniqueResponses = new Set(responses);
    
    if (responses.length > 20 && uniqueResponses.size / responses.length < 0.3) {
      patterns.push({
        type: 'identical_responses',
        description: 'High frequency of identical responses detected',
        severity: 'high',
        detectedAt: new Date(),
        evidence: { 
          totalResponses: responses.length, 
          uniqueResponses: uniqueResponses.size,
          diversity: uniqueResponses.size / responses.length
        },
        confidence: 1 - (uniqueResponses.size / responses.length)
      });
    }

    // Check for unusual timing patterns
    const sessionTimes = sessions.map(s => s.startTime.getHours());
    const nightSessions = sessionTimes.filter(hour => hour >= 2 && hour <= 5).length;
    
    if (nightSessions > sessions.length * 0.5) {
      patterns.push({
        type: 'unusual_timing',
        description: 'Unusual concentration of sessions during night hours (2-5 AM)',
        severity: 'low',
        detectedAt: new Date(),
        evidence: { nightSessions, totalSessions: sessions.length },
        confidence: nightSessions / sessions.length
      });
    }

    // Check for impossible accuracy
    const accuracyScores = sessions.flatMap(s => 
      s.interactions?.map(i => i.correct ? 1 : 0) || []
    );
    const averageAccuracy = accuracyScores.length > 0 
      ? accuracyScores.reduce((sum, acc) => sum + acc, 0) / accuracyScores.length 
      : 0;

    if (averageAccuracy > 0.95 && sessions.length > 10) {
      patterns.push({
        type: 'impossible_accuracy',
        description: 'Suspiciously high accuracy rate across multiple sessions',
        severity: 'high',
        detectedAt: new Date(),
        evidence: { accuracy: averageAccuracy, sessionCount: sessions.length },
        confidence: Math.min((averageAccuracy - 0.9) * 10, 1)
      });
    }

    return patterns;
  }

  /**
   * Check for missing data points
   */
  private checkMissingData(sessions: StudySession[], assessments: AssessmentResult[]): string[] {
    const missing: string[] = [];

    // Check for missing weekly assessments
    const currentWeek = Math.ceil((Date.now() - sessions[0]?.startTime.getTime() || 0) / (7 * 24 * 60 * 60 * 1000));
    const completedWeeks = new Set(assessments.map(a => a.week));
    
    for (let week = 1; week <= Math.min(currentWeek, 8); week++) {
      if (!completedWeeks.has(week)) {
        missing.push(`Week ${week} assessment`);
      }
    }

    // Check for missing session data
    const sessionsWithoutInteractions = sessions.filter(s => !s.interactions || s.interactions.length === 0);
    if (sessionsWithoutInteractions.length > 0) {
      missing.push(`${sessionsWithoutInteractions.length} sessions without interaction data`);
    }

    // Check for missing demographic data
    // This would check participant profile completeness in real implementation
    
    return missing;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(metrics: {
    sessionCompletionRate: number;
    averageResponseTime: number;
    suspiciousPatterns: SuspiciousPattern[];
    missingDataPoints: string[];
  }): number {
    let score = 100;

    // Completion rate factor (40% of score)
    const completionPenalty = (this.TARGET_COMPLETION_RATE - metrics.sessionCompletionRate) * 40;
    score -= Math.max(0, completionPenalty);

    // Response time factor (20% of score)
    if (metrics.averageResponseTime < this.MIN_RESPONSE_TIME || 
        metrics.averageResponseTime > this.MAX_RESPONSE_TIME) {
      score -= 20;
    }

    // Suspicious patterns factor (30% of score)
    const highSeverityPatterns = metrics.suspiciousPatterns.filter(p => p.severity === 'high').length;
    const mediumSeverityPatterns = metrics.suspiciousPatterns.filter(p => p.severity === 'medium').length;
    score -= (highSeverityPatterns * 15) + (mediumSeverityPatterns * 5);

    // Missing data factor (10% of score)
    score -= Math.min(metrics.missingDataPoints.length * 2, 10);

    return Math.max(0, Math.round(score));
  }

  /**
   * Generate quality alerts based on metrics
   */
  async generateQualityAlerts(metrics: DataQualityMetrics): Promise<QualityAlert[]> {
    const alerts: QualityAlert[] = [];

    // Low completion rate alert
    if (metrics.sessionCompletionRate < this.TARGET_COMPLETION_RATE) {
      alerts.push({
        alertId: `completion_${metrics.participantId}_${Date.now()}`,
        participantId: metrics.participantId,
        alertType: 'completion_rate_low',
        severity: metrics.sessionCompletionRate < 0.5 ? 'critical' : 'warning',
        message: `Session completion rate (${(metrics.sessionCompletionRate * 100).toFixed(1)}%) below target (${(this.TARGET_COMPLETION_RATE * 100)}%)`,
        triggeredAt: new Date(),
        resolved: false,
        actions: [
          'Send engagement reminder email',
          'Check for technical issues',
          'Offer flexible scheduling'
        ]
      });
    }

    // Response time outlier alert
    if (metrics.averageResponseTime > this.MAX_RESPONSE_TIME) {
      alerts.push({
        alertId: `response_time_${metrics.participantId}_${Date.now()}`,
        participantId: metrics.participantId,
        alertType: 'response_time_outlier',
        severity: 'warning',
        message: `Average response time (${(metrics.averageResponseTime / 1000).toFixed(1)}s) exceeds threshold (${this.MAX_RESPONSE_TIME / 1000}s)`,
        triggeredAt: new Date(),
        resolved: false,
        actions: [
          'Check internet connectivity',
          'Investigate technical performance',
          'Provide technical support'
        ]
      });
    }

    // Bot detection alert
    const highConfidencePatterns = metrics.suspiciousPatterns.filter(p => 
      p.confidence > this.BOT_DETECTION_THRESHOLD && p.severity === 'high'
    );
    
    if (highConfidencePatterns.length > 0) {
      alerts.push({
        alertId: `bot_detected_${metrics.participantId}_${Date.now()}`,
        participantId: metrics.participantId,
        alertType: 'bot_detected',
        severity: 'critical',
        message: `Potential bot behavior detected: ${highConfidencePatterns.map(p => p.type).join(', ')}`,
        triggeredAt: new Date(),
        resolved: false,
        actions: [
          'Manual review required',
          'Contact participant for verification',
          'Consider exclusion from study'
        ]
      });
    }

    // Missing data alert
    if (metrics.missingDataPoints.length > 2) {
      alerts.push({
        alertId: `missing_data_${metrics.participantId}_${Date.now()}`,
        participantId: metrics.participantId,
        alertType: 'missing_data',
        severity: 'warning',
        message: `Multiple missing data points: ${metrics.missingDataPoints.join(', ')}`,
        triggeredAt: new Date(),
        resolved: false,
        actions: [
          'Send completion reminder',
          'Check data collection pipeline',
          'Offer technical assistance'
        ]
      });
    }

    return alerts;
  }

  /**
   * Generate weekly quality report
   */
  async generateWeeklyReport(weekNumber: number): Promise<WeeklyQualityReport> {
    console.log(`📊 Generating weekly quality report for week ${weekNumber}...`);

    // Mock data - in real implementation, aggregate from database
    const allParticipants = await this.getAllParticipants();
    const participantMetrics = await Promise.all(
      allParticipants.map(p => this.analyzeParticipantQuality(p.participantId))
    );

    // Calculate overall metrics
    const activeParticipants = participantMetrics.filter(m => m.sessionCompletionRate > 0).length;
    const averageCompletionRate = participantMetrics.reduce((sum, m) => sum + m.sessionCompletionRate, 0) / participantMetrics.length;
    const averageSessionDuration = 18.5; // Mock value in minutes
    const dataQualityScore = participantMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / participantMetrics.length;

    // Generate alerts for all participants
    const allAlerts = await Promise.all(
      participantMetrics.map(m => this.generateQualityAlerts(m))
    );
    const alerts = allAlerts.flat();

    // Attrition analysis
    const attritionAnalysis = await this.analyzeAttrition(participantMetrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(participantMetrics, alerts, attritionAnalysis);

    return {
      reportId: `weekly_report_${weekNumber}_${Date.now()}`,
      weekNumber,
      generatedAt: new Date(),
      overallMetrics: {
        totalParticipants: allParticipants.length,
        activeParticipants,
        averageCompletionRate,
        averageSessionDuration,
        dataQualityScore
      },
      participantMetrics,
      alerts,
      recommendations,
      attritionAnalysis
    };
  }

  /**
   * Analyze attrition patterns and predict dropout risk
   */
  private async analyzeAttrition(participantMetrics: DataQualityMetrics[]): Promise<AttritionAnalysis> {
    const totalParticipants = participantMetrics.length;
    const inactiveParticipants = participantMetrics.filter(m => m.sessionCompletionRate === 0).length;
    const lowEngagementParticipants = participantMetrics.filter(m => 
      m.sessionCompletionRate > 0 && m.sessionCompletionRate < 0.3
    ).length;

    const currentAttritionRate = (inactiveParticipants / totalParticipants) * 100;
    const predictedFinalAttrition = currentAttritionRate + (lowEngagementParticipants / totalParticipants) * 50;

    const riskFactors = [
      { factor: 'Low completion rate', impact: lowEngagementParticipants },
      { factor: 'Technical issues', impact: participantMetrics.filter(m => m.averageResponseTime > 20000).length },
      { factor: 'Missing assessments', impact: participantMetrics.filter(m => m.missingDataPoints.length > 1).length }
    ];

    const interventionRecommendations = [
      'Increase reminder frequency for low-engagement participants',
      'Provide technical support for slow response times',
      'Implement flexible scheduling options',
      'Add gamification elements to boost engagement'
    ];

    const replacementNeeded = Math.max(0, Math.ceil(predictedFinalAttrition * 0.01 * totalParticipants) - inactiveParticipants);

    return {
      currentAttritionRate,
      predictedFinalAttrition,
      riskFactors,
      interventionRecommendations,
      replacementNeeded
    };
  }

  /**
   * Generate recommendations based on quality analysis
   */
  private generateRecommendations(
    participantMetrics: DataQualityMetrics[],
    alerts: QualityAlert[],
    attrition: AttritionAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Completion rate recommendations
    const lowCompletionCount = participantMetrics.filter(m => m.sessionCompletionRate < 0.6).length;
    if (lowCompletionCount > participantMetrics.length * 0.2) {
      recommendations.push(`${lowCompletionCount} participants have low completion rates - consider implementing engagement interventions`);
    }

    // Data quality recommendations
    const lowQualityCount = participantMetrics.filter(m => m.qualityScore < 70).length;
    if (lowQualityCount > 0) {
      recommendations.push(`${lowQualityCount} participants have quality scores below 70 - review data collection procedures`);
    }

    // Bot detection recommendations
    const botAlerts = alerts.filter(a => a.alertType === 'bot_detected').length;
    if (botAlerts > 0) {
      recommendations.push(`${botAlerts} potential bot behaviors detected - implement additional verification measures`);
    }

    // Attrition recommendations
    if (attrition.currentAttritionRate > 15) {
      recommendations.push(`Current attrition rate (${attrition.currentAttritionRate.toFixed(1)}%) exceeds target - implement retention strategies`);
    }

    if (attrition.replacementNeeded > 0) {
      recommendations.push(`Consider recruiting ${attrition.replacementNeeded} replacement participants to maintain target sample size`);
    }

    return recommendations;
  }

  /**
   * Send automated participant reminders
   */
  async sendParticipantReminders(): Promise<ParticipantReminder[]> {
    const participants = await this.getAllParticipants();
    const reminders: ParticipantReminder[] = [];

    for (const participant of participants) {
      const metrics = await this.analyzeParticipantQuality(participant.participantId);
      
      // Session reminder for inactive participants
      if (metrics.sessionCompletionRate < 0.5) {
        reminders.push({
          reminderId: `session_reminder_${participant.participantId}_${Date.now()}`,
          participantId: participant.participantId,
          type: 'session_reminder',
          template: 'session_completion_reminder',
          scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          sent: false
        });
      }

      // Assessment reminder for missing assessments
      if (metrics.missingDataPoints.some(point => point.includes('assessment'))) {
        reminders.push({
          reminderId: `assessment_reminder_${participant.participantId}_${Date.now()}`,
          participantId: participant.participantId,
          type: 'assessment_due',
          template: 'assessment_completion_reminder',
          scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          sent: false
        });
      }

      // Technical support for slow responses
      if (metrics.averageResponseTime > this.MAX_RESPONSE_TIME) {
        reminders.push({
          reminderId: `tech_support_${participant.participantId}_${Date.now()}`,
          participantId: participant.participantId,
          type: 'technical_support',
          template: 'technical_support_offer',
          scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          sent: false
        });
      }
    }

    // Mock sending reminders
    console.log(`📧 Scheduled ${reminders.length} participant reminders`);
    return reminders;
  }

  /**
   * Run data integrity validation pipeline
   */
  async runDataIntegrityChecks(): Promise<DataIntegrityCheck[]> {
    const checks: DataIntegrityCheck[] = [
      {
        checkId: `completeness_${Date.now()}`,
        checkType: 'completeness',
        description: 'Check for participants with complete session data',
        query: 'SELECT COUNT(*) FROM participants WHERE session_count > 0',
        expectedResult: { count: 200 },
        passed: false,
        runAt: new Date()
      },
      {
        checkId: `consistency_${Date.now()}`,
        checkType: 'consistency',
        description: 'Verify session timestamps are chronological',
        query: 'SELECT participant_id FROM sessions WHERE start_time > end_time',
        expectedResult: { count: 0 },
        passed: false,
        runAt: new Date()
      },
      {
        checkId: `accuracy_${Date.now()}`,
        checkType: 'accuracy',
        description: 'Validate response time ranges',
        query: 'SELECT COUNT(*) FROM interactions WHERE response_time < 0 OR response_time > 300000',
        expectedResult: { count: 0 },
        passed: false,
        runAt: new Date()
      }
    ];

    // Mock running checks
    for (const check of checks) {
      // Simulate check execution
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock results
      check.actualResult = check.expectedResult;
      check.passed = Math.random() > 0.1; // 90% pass rate
      
      if (!check.passed) {
        check.error = 'Mock validation error for testing';
      }
    }

    console.log(`✅ Completed ${checks.length} data integrity checks`);
    return checks;
  }

  /**
   * Helper methods
   */
  private async getAllParticipants(): Promise<StudyParticipant[]> {
    // Mock implementation - return sample participants
    return Array.from({ length: 200 }, (_, i) => ({
      participantId: `participant_${i + 1}`,
      anonymizedId: `ANON_${i + 1}`,
      algorithm: ['SM-2', 'HLR', 'KARL', 'LECTOR', 'DART', 'CARTS'][i % 6],
      proficiencyLevel: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][Math.floor(i / 33) % 6] as any,
      enrollmentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      currentWeek: Math.floor(Math.random() * 8) + 1,
      isActive: Math.random() > 0.1,
      vocabularySet: [],
      sessionHistory: [],
      weeklyAssessments: [],
      dropoutRisk: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
    }));
  }

  private async getParticipantSessions(participantId: string): Promise<StudySession[]> {
    // Mock implementation - return sample sessions
    const sessionCount = Math.floor(Math.random() * 20) + 5;
    return Array.from({ length: sessionCount }, (_, i) => ({
      sessionId: `session_${participantId}_${i + 1}`,
      participantId,
      startTime: new Date(Date.now() - (sessionCount - i) * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - (sessionCount - i) * 24 * 60 * 60 * 1000 + Math.random() * 30 * 60 * 1000),
      completed: Math.random() > 0.2,
      algorithm: 'CARTS',
      interactions: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, j) => ({
        interactionId: `interaction_${i}_${j}`,
        wordId: `word_${j}`,
        difficulty: Math.floor(Math.random() * 4),
        context: `context_${j}`,
        response: Math.random() > 0.3 ? 'correct' : 'incorrect',
        correct: Math.random() > 0.3,
        responseTime: Math.random() * 10000 + 1000,
        timestamp: new Date()
      }))
    }));
  }

  private async getParticipantAssessments(participantId: string): Promise<AssessmentResult[]> {
    // Mock implementation - return sample assessments
    const weekCount = Math.floor(Math.random() * 8) + 1;
    return Array.from({ length: weekCount }, (_, i) => ({
      assessmentId: `assessment_${participantId}_${i + 1}`,
      participantId,
      week: i + 1,
      completedAt: new Date(Date.now() - (weekCount - i) * 7 * 24 * 60 * 60 * 1000),
      scores: {
        overallScore: Math.random() * 0.4 + 0.6,
        contextTransferScore: Math.random() * 0.4 + 0.5,
        retentionRate: Math.random() * 0.3 + 0.7,
        learningEfficiency: Math.random() * 0.2 + 0.8
      },
      responses: [],
      duration: Math.random() * 600 + 300 // 5-15 minutes
    }));
  }
}