// lib/irb-documentation.ts
// IRB Documentation and Compliance Framework for CARTS Research Study
// Step 8: Real-World Study Preparation

/**
 * IRB Application Data Structures
 */
export interface IRBApplication {
  protocolNumber: string;
  title: string;
  principalInvestigator: ResearcherInfo;
  coInvestigators: ResearcherInfo[];
  institution: InstitutionInfo;
  studyType: 'minimal_risk' | 'greater_than_minimal_risk';
  participantPopulation: ParticipantPopulation;
  studyProcedures: StudyProcedure[];
  riskAssessment: RiskAssessment;
  dataManagementPlan: DataManagementPlan;
  consentProcess: ConsentProcess;
  submissionDate: Date;
  approvalStatus: 'pending' | 'approved' | 'conditional' | 'denied';
  approvalDate?: Date;
  expirationDate?: Date;
}

export interface ResearcherInfo {
  name: string;
  title: string;
  institution: string;
  email: string;
  phone: string;
  qualifications: string[];
  humanSubjectsTraining: {
    completed: boolean;
    completionDate: Date;
    certificateNumber: string;
  };
}

export interface InstitutionInfo {
  name: string;
  address: string;
  irbContact: {
    name: string;
    email: string;
    phone: string;
  };
  federalWideAssurance: string;
}

export interface ParticipantPopulation {
  targetSize: number;
  ageRange: { min: number; max: number };
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  vulnerablePopulations: string[];
  recruitmentMethods: string[];
}

export interface StudyProcedure {
  name: string;
  description: string;
  duration: string;
  frequency: string;
  risks: string[];
  benefits: string[];
}

export interface RiskAssessment {
  physicalRisks: RiskCategory;
  psychologicalRisks: RiskCategory;
  socialRisks: RiskCategory;
  economicRisks: RiskCategory;
  privacyRisks: RiskCategory;
  overallRiskLevel: 'minimal' | 'minor_increase' | 'major_increase';
  riskMinimizationMeasures: string[];
}

export interface RiskCategory {
  level: 'none' | 'minimal' | 'minor' | 'major';
  description: string;
  likelihood: 'very_low' | 'low' | 'moderate' | 'high';
  mitigation: string[];
}
export interface DataManagementPlan {
  dataTypes: string[];
  collectionMethods: string[];
  storageLocation: string;
  encryptionMethods: string[];
  accessControls: string[];
  retentionPeriod: string;
  disposalMethods: string[];
  sharingPlan: string;
  backupProcedures: string[];
}

export interface ConsentProcess {
  consentType: 'written' | 'electronic' | 'verbal';
  consentLanguages: string[];
  consentElements: string[];
  assent: boolean;
  parentalPermission: boolean;
  witnessRequired: boolean;
  consentDocumentVersion: string;
}

/**
 * Privacy Compliance Interfaces
 */
export interface GDPRCompliance {
  lawfulBasis: 'consent' | 'legitimate_interest' | 'public_task' | 'vital_interests';
  dataProcessingPurpose: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  thirdCountryTransfers: boolean;
  retentionPeriod: string;
  dataSubjectRights: string[];
  privacyImpactAssessment: boolean;
  dataProtectionOfficer: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface VietnameseDataProtection {
  personalDataLaw: 'decree_13_2023' | 'cybersecurity_law_2018';
  consentRequirements: string[];
  crossBorderTransfer: {
    permitted: boolean;
    adequacyDecision: boolean;
    safeguards: string[];
  };
  dataLocalization: {
    required: boolean;
    exceptions: string[];
  };
  notificationRequirements: string[];
}

export interface DataPrivacyChecklist {
  gdprCompliance: {
    [key: string]: {
      completed: boolean;
      evidence: string;
      lastReviewed: Date;
    };
  };
  vietnameseCompliance: {
    [key: string]: {
      completed: boolean;
      evidence: string;
      lastReviewed: Date;
    };
  };
  overallCompliance: number; // percentage
}

/**
 * Informed Consent Templates
 */
export interface ConsentTemplate {
  language: 'english' | 'vietnamese';
  version: string;
  title: string;
  sections: ConsentSection[];
  signature: {
    participantName: string;
    participantSignature: string;
    date: Date;
    witnessName?: string;
    witnessSignature?: string;
  };
}

export interface ConsentSection {
  title: string;
  content: string;
  required: boolean;
  order: number;
}

/**
 * IRB Documentation Manager
 */
export class IRBDocumentationManager {
  private readonly PROTOCOL_NUMBER = 'CARTS-2024-001';
  private readonly STUDY_TITLE = 'Contextual Adaptive Retrieval-Type Scheduling for Second Language Vocabulary Learning';

  /**
   * Generate complete IRB application
   */
  generateIRBApplication(): IRBApplication {
    return {
      protocolNumber: this.PROTOCOL_NUMBER,
      title: this.STUDY_TITLE,
      principalInvestigator: this.getPrincipalInvestigator(),
      coInvestigators: this.getCoInvestigators(),
      institution: this.getInstitutionInfo(),
      studyType: 'minimal_risk',
      participantPopulation: this.getParticipantPopulation(),
      studyProcedures: this.getStudyProcedures(),
      riskAssessment: this.getRiskAssessment(),
      dataManagementPlan: this.getDataManagementPlan(),
      consentProcess: this.getConsentProcess(),
      submissionDate: new Date(),
      approvalStatus: 'pending'
    };
  }

  /**
   * Generate risk assessment framework
   */
  private getRiskAssessment(): RiskAssessment {
    return {
      physicalRisks: {
        level: 'none',
        description: 'No physical procedures or interventions involved',
        likelihood: 'very_low',
        mitigation: ['Study conducted entirely online', 'No physical contact required']
      },
      psychologicalRisks: {
        level: 'minimal',
        description: 'Potential mild frustration from learning challenges',
        likelihood: 'low',
        mitigation: [
          'Voluntary participation with right to withdraw',
          'Adaptive difficulty to prevent excessive frustration',
          'Support resources provided'
        ]
      },
      socialRisks: {
        level: 'none',
        description: 'No social stigma or discrimination risks',
        likelihood: 'very_low',
        mitigation: ['Anonymous participation', 'No sensitive personal information collected']
      },
      economicRisks: {
        level: 'none',
        description: 'No financial costs to participants',
        likelihood: 'very_low',
        mitigation: ['Free participation', 'No required purchases']
      },
      privacyRisks: {
        level: 'minimal',
        description: 'Learning performance data collection',
        likelihood: 'low',
        mitigation: [
          'Data anonymization',
          'Secure encrypted storage',
          'Limited data collection',
          'GDPR compliance'
        ]
      },
      overallRiskLevel: 'minimal',
      riskMinimizationMeasures: [
        'Comprehensive informed consent process',
        'Data anonymization and encryption',
        'Voluntary participation with withdrawal rights',
        'Regular ethics monitoring',
        'Participant support resources'
      ]
    };
  }

  /**
   * Generate GDPR compliance framework
   */
  generateGDPRCompliance(): GDPRCompliance {
    return {
      lawfulBasis: 'consent',
      dataProcessingPurpose: 'Educational research on vocabulary learning algorithms',
      dataCategories: [
        'Learning performance data',
        'Response times',
        'Session completion rates',
        'Demographic information (age, education level)',
        'Language proficiency assessments'
      ],
      dataSubjects: ['Adult language learners'],
      recipients: ['Research team members', 'Statistical analysis software'],
      thirdCountryTransfers: false,
      retentionPeriod: '5 years post-publication',
      dataSubjectRights: [
        'Right to access personal data',
        'Right to rectification',
        'Right to erasure',
        'Right to restrict processing',
        'Right to data portability',
        'Right to object',
        'Right to withdraw consent'
      ],
      privacyImpactAssessment: true,
      dataProtectionOfficer: {
        name: 'Research Data Protection Officer',
        email: 'dpo@research-institution.edu',
        phone: '+1-555-0123'
      }
    };
  }

  /**
   * Generate Vietnamese data protection compliance
   */
  generateVietnameseCompliance(): VietnameseDataProtection {
    return {
      personalDataLaw: 'decree_13_2023',
      consentRequirements: [
        'Explicit consent for data processing',
        'Clear purpose specification',
        'Right to withdraw consent',
        'Vietnamese language consent option'
      ],
      crossBorderTransfer: {
        permitted: true,
        adequacyDecision: false,
        safeguards: [
          'Standard contractual clauses',
          'Encryption in transit and at rest',
          'Limited data transfer scope'
        ]
      },
      dataLocalization: {
        required: false,
        exceptions: ['Research purposes', 'Educational activities']
      },
      notificationRequirements: [
        'Data breach notification within 72 hours',
        'Participant notification for high-risk breaches',
        'Regulatory authority notification'
      ]
    };
  }

  /**
   * Generate data privacy compliance checklist
   */
  generatePrivacyChecklist(): DataPrivacyChecklist {
    const gdprItems = {
      'Lawful basis established': { completed: true, evidence: 'Consent forms', lastReviewed: new Date() },
      'Privacy notice provided': { completed: true, evidence: 'Consent documentation', lastReviewed: new Date() },
      'Data minimization applied': { completed: true, evidence: 'Data collection protocol', lastReviewed: new Date() },
      'Encryption implemented': { completed: true, evidence: 'Technical specifications', lastReviewed: new Date() },
      'Access controls configured': { completed: true, evidence: 'Security audit', lastReviewed: new Date() },
      'Retention policy defined': { completed: true, evidence: 'Data management plan', lastReviewed: new Date() },
      'Deletion procedures established': { completed: true, evidence: 'Data lifecycle policy', lastReviewed: new Date() }
    };

    const vietnameseItems = {
      'Vietnamese consent available': { completed: true, evidence: 'Translated consent forms', lastReviewed: new Date() },
      'Cross-border transfer safeguards': { completed: true, evidence: 'Transfer agreements', lastReviewed: new Date() },
      'Breach notification procedures': { completed: true, evidence: 'Incident response plan', lastReviewed: new Date() },
      'Local law compliance review': { completed: true, evidence: 'Legal consultation', lastReviewed: new Date() }
    };

    const totalItems = Object.keys(gdprItems).length + Object.keys(vietnameseItems).length;
    const completedItems = Object.values(gdprItems).filter(item => item.completed).length +
                          Object.values(vietnameseItems).filter(item => item.completed).length;

    return {
      gdprCompliance: gdprItems,
      vietnameseCompliance: vietnameseItems,
      overallCompliance: Math.round((completedItems / totalItems) * 100)
    };
  }

  /**
   * Generate informed consent templates
   */
  generateConsentTemplates(): { english: ConsentTemplate; vietnamese: ConsentTemplate } {
    const englishTemplate: ConsentTemplate = {
      language: 'english',
      version: '1.0',
      title: 'Informed Consent for Research Participation',
      sections: [
        {
          title: 'Study Title and Purpose',
          content: `You are being invited to participate in a research study titled "${this.STUDY_TITLE}". The purpose of this study is to evaluate different computer algorithms for helping people learn English vocabulary more effectively.`,
          required: true,
          order: 1
        },
        {
          title: 'What You Will Do',
          content: 'If you agree to participate, you will use an online vocabulary learning system for 15-20 minutes daily over 8 weeks. The system will present English words and ask you to practice them in different ways. You will also complete brief weekly assessments.',
          required: true,
          order: 2
        },
        {
          title: 'Risks and Benefits',
          content: 'There are minimal risks associated with this study - no greater than those encountered in daily computer use. You may experience mild frustration during challenging learning tasks. Benefits include free access to vocabulary learning tools and contributing to educational research.',
          required: true,
          order: 3
        },
        {
          title: 'Privacy and Confidentiality',
          content: 'Your identity will be kept confidential. You will be assigned a random ID number, and your name will not be connected to your responses. Data will be stored securely and encrypted. Only authorized research team members will have access to the data.',
          required: true,
          order: 4
        },
        {
          title: 'Voluntary Participation',
          content: 'Your participation is entirely voluntary. You may withdraw from the study at any time without penalty. You may also request that your data be deleted from the study.',
          required: true,
          order: 5
        },
        {
          title: 'Contact Information',
          content: 'If you have questions about this study, please contact [Principal Investigator] at [email] or [phone]. If you have questions about your rights as a research participant, contact the Institutional Review Board at [IRB contact].',
          required: true,
          order: 6
        }
      ],
      signature: {
        participantName: '',
        participantSignature: '',
        date: new Date()
      }
    };

    const vietnameseTemplate: ConsentTemplate = {
      language: 'vietnamese',
      version: '1.0',
      title: 'Đồng Ý Tham Gia Nghiên Cứu',
      sections: [
        {
          title: 'Tên và Mục Đích Nghiên Cứu',
          content: `Bạn được mời tham gia nghiên cứu có tên "${this.STUDY_TITLE}". Mục đích của nghiên cứu này là đánh giá các thuật toán máy tính khác nhau để giúp mọi người học từ vựng tiếng Anh hiệu quả hơn.`,
          required: true,
          order: 1
        },
        {
          title: 'Những Gì Bạn Sẽ Làm',
          content: 'Nếu bạn đồng ý tham gia, bạn sẽ sử dụng hệ thống học từ vựng trực tuyến trong 15-20 phút mỗi ngày trong 8 tuần. Hệ thống sẽ trình bày các từ tiếng Anh và yêu cầu bạn thực hành chúng theo nhiều cách khác nhau. Bạn cũng sẽ hoàn thành các bài đánh giá ngắn hàng tuần.',
          required: true,
          order: 2
        },
        {
          title: 'Rủi Ro và Lợi Ích',
          content: 'Có rủi ro tối thiểu liên quan đến nghiên cứu này - không lớn hơn những rủi ro gặp phải khi sử dụng máy tính hàng ngày. Bạn có thể cảm thấy hơi thất vọng trong các nhiệm vụ học tập khó khăn. Lợi ích bao gồm truy cập miễn phí vào các công cụ học từ vựng và đóng góp cho nghiên cứu giáo dục.',
          required: true,
          order: 3
        },
        {
          title: 'Quyền Riêng Tư và Bảo Mật',
          content: 'Danh tính của bạn sẽ được giữ bí mật. Bạn sẽ được gán một số ID ngẫu nhiên và tên của bạn sẽ không được kết nối với các phản hồi của bạn. Dữ liệu sẽ được lưu trữ an toàn và mã hóa. Chỉ các thành viên nhóm nghiên cứu được ủy quyền mới có quyền truy cập vào dữ liệu.',
          required: true,
          order: 4
        },
        {
          title: 'Tham Gia Tự Nguyện',
          content: 'Việc tham gia của bạn hoàn toàn tự nguyện. Bạn có thể rút khỏi nghiên cứu bất cứ lúc nào mà không bị phạt. Bạn cũng có thể yêu cầu xóa dữ liệu của mình khỏi nghiên cứu.',
          required: true,
          order: 5
        },
        {
          title: 'Thông Tin Liên Hệ',
          content: 'Nếu bạn có câu hỏi về nghiên cứu này, vui lòng liên hệ [Nghiên cứu viên chính] tại [email] hoặc [điện thoại]. Nếu bạn có câu hỏi về quyền của mình với tư cách là người tham gia nghiên cứu, hãy liên hệ với Hội đồng Đánh giá Thể chế tại [liên hệ IRB].',
          required: true,
          order: 6
        }
      ],
      signature: {
        participantName: '',
        participantSignature: '',
        date: new Date()
      }
    };

    return { english: englishTemplate, vietnamese: vietnameseTemplate };
  }

  /**
   * Generate withdrawal protocol
   */
  generateWithdrawalProtocol(): {
    procedures: string[];
    dataHandling: string[];
    timeline: string;
    contactMethods: string[];
  } {
    return {
      procedures: [
        'Participant can withdraw at any time without providing reason',
        'Withdrawal request can be submitted via email, phone, or study platform',
        'Confirmation of withdrawal sent within 24 hours',
        'Account access disabled immediately upon confirmation',
        'Data deletion completed within 30 days if requested'
      ],
      dataHandling: [
        'Data collected up to withdrawal point may be retained for analysis unless deletion requested',
        'Identifiable information removed immediately upon withdrawal',
        'Anonymized data may be retained for research purposes unless specifically requested for deletion',
        'Deletion confirmation provided to participant within 30 days'
      ],
      timeline: 'Immediate account deactivation, data deletion within 30 days if requested',
      contactMethods: [
        'Email: study-withdrawal@research-institution.edu',
        'Phone: +1-555-0123',
        'Study platform withdrawal button',
        'Postal mail to research office'
      ]
    };
  }

  /**
   * Helper methods for IRB application components
   */
  private getPrincipalInvestigator(): ResearcherInfo {
    return {
      name: 'Dr. Research Principal',
      title: 'Associate Professor',
      institution: 'Research University',
      email: 'principal@research-institution.edu',
      phone: '+1-555-0123',
      qualifications: ['PhD in Educational Technology', '10+ years research experience'],
      humanSubjectsTraining: {
        completed: true,
        completionDate: new Date('2024-01-15'),
        certificateNumber: 'HST-2024-001'
      }
    };
  }

  private getCoInvestigators(): ResearcherInfo[] {
    return [
      {
        name: 'Dr. Co Investigator',
        title: 'Assistant Professor',
        institution: 'Research University',
        email: 'co-investigator@research-institution.edu',
        phone: '+1-555-0124',
        qualifications: ['PhD in Computer Science', 'Machine Learning expertise'],
        humanSubjectsTraining: {
          completed: true,
          completionDate: new Date('2024-01-20'),
          certificateNumber: 'HST-2024-002'
        }
      }
    ];
  }

  private getInstitutionInfo(): InstitutionInfo {
    return {
      name: 'Research University',
      address: '123 Research Ave, Academic City, State 12345',
      irbContact: {
        name: 'IRB Administrator',
        email: 'irb@research-institution.edu',
        phone: '+1-555-0100'
      },
      federalWideAssurance: 'FWA00012345'
    };
  }

  private getParticipantPopulation(): ParticipantPopulation {
    return {
      targetSize: 200,
      ageRange: { min: 18, max: 65 },
      inclusionCriteria: [
        'Adults aged 18-65',
        'Non-native English speakers',
        'Basic computer literacy',
        'Regular internet access',
        'Commitment to 8-week study period'
      ],
      exclusionCriteria: [
        'Native English speakers',
        'Learning disabilities affecting memory',
        'Concurrent intensive English programs',
        'Extensive prior spaced repetition experience (>6 months)'
      ],
      vulnerablePopulations: [],
      recruitmentMethods: [
        'University language centers',
        'Online learning platforms',
        'Social media advertisements',
        'Email lists (with permission)'
      ]
    };
  }

  private getStudyProcedures(): StudyProcedure[] {
    return [
      {
        name: 'Initial Screening and Consent',
        description: 'Online questionnaire and digital consent process',
        duration: '15-20 minutes',
        frequency: 'Once at enrollment',
        risks: ['Minimal privacy risk from demographic data collection'],
        benefits: ['Ensures appropriate study fit']
      },
      {
        name: 'Daily Vocabulary Learning Sessions',
        description: 'Interactive vocabulary practice using assigned algorithm',
        duration: '15-20 minutes',
        frequency: 'Daily for 8 weeks',
        risks: ['Mild frustration from challenging tasks'],
        benefits: ['Vocabulary learning improvement', 'Personalized learning experience']
      },
      {
        name: 'Weekly Assessments',
        description: 'Context transfer evaluation using LLM-as-a-Judge framework',
        duration: '10-15 minutes',
        frequency: 'Weekly for 8 weeks',
        risks: ['Minimal performance anxiety'],
        benefits: ['Progress tracking', 'Skill assessment']
      }
    ];
  }

  private getDataManagementPlan(): DataManagementPlan {
    return {
      dataTypes: [
        'Learning performance metrics',
        'Response times',
        'Session completion data',
        'Assessment scores',
        'Demographic information (age, education, language background)'
      ],
      collectionMethods: [
        'Automated system logging',
        'Online questionnaires',
        'LLM-based assessments'
      ],
      storageLocation: 'Encrypted university servers with backup systems',
      encryptionMethods: ['AES-256 encryption', 'TLS 1.3 for data transmission'],
      accessControls: [
        'Multi-factor authentication',
        'Role-based access permissions',
        'Audit logging of all access'
      ],
      retentionPeriod: '5 years post-publication for replication purposes',
      disposalMethods: [
        'Secure deletion with overwriting',
        'Certificate of destruction for physical media'
      ],
      sharingPlan: 'Anonymized aggregate data may be shared for research replication',
      backupProcedures: [
        'Daily automated backups',
        'Geographically distributed backup locations',
        'Regular backup integrity testing'
      ]
    };
  }

  private getConsentProcess(): ConsentProcess {
    return {
      consentType: 'electronic',
      consentLanguages: ['english', 'vietnamese'],
      consentElements: [
        'Study purpose and procedures',
        'Risks and benefits',
        'Confidentiality protections',
        'Voluntary participation',
        'Right to withdraw',
        'Contact information'
      ],
      assent: false,
      parentalPermission: false,
      witnessRequired: false,
      consentDocumentVersion: '1.0'
    };
  }
}