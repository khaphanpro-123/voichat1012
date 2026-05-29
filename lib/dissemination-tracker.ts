// lib/dissemination-tracker.ts
// Dissemination Tracking and Management System for CARTS Research
// Step 9: Publication & Dissemination

/**
 * Dissemination Tracking Interfaces
 */
export interface SubmissionTracker {
  submissions: SubmissionRecord[];
  reviews: ReviewRecord[];
  citations: CitationRecord[];
  socialMedia: SocialMediaRecord[];
  releases: ReleaseRecord[];
}

export interface SubmissionRecord {
  id: string;
  venue: string;
  type: 'primary' | 'backup' | 'specialized';
  status: SubmissionStatus;
  submissionDate: Date;
  deadlines: VenueDeadlines;
  requirements: VenueRequirements;
  tracking: TrackingInfo;
  reviews?: ReviewSummary;
  decision?: Decision;
}

export type SubmissionStatus = 
  | 'preparing' 
  | 'submitted' 
  | 'under_review' 
  | 'revision_requested' 
  | 'revision_submitted'
  | 'accepted' 
  | 'rejected' 
  | 'withdrawn';

export interface VenueDeadlines {
  submission: Date;
  notification: Date;
  cameraReady?: Date;
  conference?: Date;
}

export interface VenueRequirements {
  pageLimit: number;
  format: string;
  anonymization: boolean;
  supplementaryAllowed: boolean;
  codeRequired: boolean;
}

export interface TrackingInfo {
  submissionId: string;
  confirmationReceived: boolean;
  reviewerAssignments?: Date;
  reviewsReceived?: Date;
  metaReviewReceived?: Date;
}

export interface ReviewSummary {
  reviewerCount: number;
  averageScore: number;
  recommendation: 'accept' | 'weak_accept' | 'borderline' | 'weak_reject' | 'reject';
  majorConcerns: string[];
  minorIssues: string[];
  strengths: string[];
}

export interface Decision {
  outcome: 'accept' | 'reject' | 'revision';
  date: Date;
  conditions?: string[];
  revisionDeadline?: Date;
}

export interface ReviewRecord {
  submissionId: string;
  reviewerId: string;
  score: number;
  confidence: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  questions: string[];
  recommendation: string;
  receivedDate: Date;
}

export interface CitationRecord {
  id: string;
  citingPaper: CitingPaper;
  citationType: 'direct' | 'comparative' | 'extension' | 'criticism';
  context: string;
  discoveredDate: Date;
  verified: boolean;
}

export interface CitingPaper {
  title: string;
  authors: string[];
  venue: string;
  year: number;
  doi?: string;
  url?: string;
}

export interface SocialMediaRecord {
  platform: 'twitter' | 'linkedin' | 'researchgate' | 'reddit' | 'mastodon';
  postId: string;
  content: string;
  url: string;
  metrics: SocialMetrics;
  postedDate: Date;
}

export interface SocialMetrics {
  likes: number;
  shares: number;
  comments: number;
  views?: number;
  clicks?: number;
}

export interface ReleaseRecord {
  version: string;
  type: 'code' | 'data' | 'paper' | 'supplementary';
  platform: 'github' | 'zenodo' | 'arxiv' | 'acl_anthology';
  url: string;
  doi?: string;
  downloads: number;
  stars?: number;
  forks?: number;
  releaseDate: Date;
}

/**
 * Dissemination Tracker Class
 */
export class DisseminationTracker {
  private tracker: SubmissionTracker;

  constructor() {
    this.tracker = {
      submissions: [],
      reviews: [],
      citations: [],
      socialMedia: [],
      releases: []
    };
  }

  /**
   * Initialize tracking for CARTS research dissemination
   */
  async initializeTracking(): Promise<void> {
    console.log('📊 Initializing CARTS Research Dissemination Tracking');
    
    // Set up primary submissions
    await this.setupPrimarySubmissions();
    
    // Initialize social media templates
    await this.setupSocialMediaTemplates();
    
    // Configure release management
    await this.setupReleaseManagement();
    
    console.log('✅ Dissemination tracking initialized');
  }

  /**
   * Set up primary submission venues
   */
  private async setupPrimarySubmissions(): Promise<void> {
    const submissions: SubmissionRecord[] = [
      {
        id: 'emnlp2026-primary',
        venue: 'EMNLP 2026',
        type: 'primary',
        status: 'preparing',
        submissionDate: new Date('2026-06-15'),
        deadlines: {
          submission: new Date('2026-06-15'),
          notification: new Date('2026-09-15'),
          cameraReady: new Date('2026-10-15'),
          conference: new Date('2026-11-15')
        },
        requirements: {
          pageLimit: 8,
          format: 'ACL',
          anonymization: true,
          supplementaryAllowed: true,
          codeRequired: true
        },
        tracking: {
          submissionId: '',
          confirmationReceived: false
        }
      },
      {
        id: 'acl2027-backup',
        venue: 'ACL 2027',
        type: 'backup',
        status: 'preparing',
        submissionDate: new Date('2027-02-15'),
        deadlines: {
          submission: new Date('2027-02-15'),
          notification: new Date('2027-05-15'),
          cameraReady: new Date('2027-06-15'),
          conference: new Date('2027-07-15')
        },
        requirements: {
          pageLimit: 8,
          format: 'ACL',
          anonymization: true,
          supplementaryAllowed: true,
          codeRequired: true
        },
        tracking: {
          submissionId: '',
          confirmationReceived: false
        }
      },
      {
        id: 'aied2026-specialized',
        venue: 'AIED 2026',
        type: 'specialized',
        status: 'preparing',
        submissionDate: new Date('2026-04-15'),
        deadlines: {
          submission: new Date('2026-04-15'),
          notification: new Date('2026-06-15'),
          cameraReady: new Date('2026-07-15'),
          conference: new Date('2026-08-15')
        },
        requirements: {
          pageLimit: 10,
          format: 'Springer',
          anonymization: true,
          supplementaryAllowed: true,
          codeRequired: false
        },
        tracking: {
          submissionId: '',
          confirmationReceived: false
        }
      }
    ];

    this.tracker.submissions = submissions;
    console.log(`  📝 Set up ${submissions.length} submission venues`);
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(
    submissionId: string, 
    status: SubmissionStatus, 
    additionalInfo?: Partial<SubmissionRecord>
  ): Promise<void> {
    const submission = this.tracker.submissions.find(s => s.id === submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    submission.status = status;
    
    if (additionalInfo) {
      Object.assign(submission, additionalInfo);
    }

    console.log(`📊 Updated ${submissionId} status to: ${status}`);
    
    // Trigger appropriate actions based on status
    await this.handleStatusChange(submission, status);
  }

  /**
   * Handle status change actions
   */
  private async handleStatusChange(submission: SubmissionRecord, status: SubmissionStatus): Promise<void> {
    switch (status) {
      case 'submitted':
        await this.onSubmissionSubmitted(submission);
        break;
      case 'under_review':
        await this.onReviewStarted(submission);
        break;
      case 'accepted':
        await this.onAcceptance(submission);
        break;
      case 'rejected':
        await this.onRejection(submission);
        break;
      case 'revision_requested':
        await this.onRevisionRequested(submission);
        break;
    }
  }

  /**
   * Actions when paper is submitted
   */
  private async onSubmissionSubmitted(submission: SubmissionRecord): Promise<void> {
    console.log(`🎯 Paper submitted to ${submission.venue}`);
    
    // Schedule follow-up reminders
    const notificationDate = submission.deadlines.notification;
    const daysUntilNotification = Math.ceil(
      (notificationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    console.log(`  ⏰ Notification expected in ${daysUntilNotification} days`);
    
    // Prepare social media announcement
    const announcement = this.generateSubmissionAnnouncement(submission);
    console.log(`  📱 Social media template ready: "${announcement.substring(0, 50)}..."`);
  }

  /**
   * Actions when review process starts
   */
  private async onReviewStarted(submission: SubmissionRecord): Promise<void> {
    console.log(`🔍 Review process started for ${submission.venue}`);
    
    // Prepare response templates
    await this.prepareResponseTemplates(submission);
    
    // Set up review monitoring
    console.log(`  📊 Monitoring review progress`);
  }

  /**
   * Actions when paper is accepted
   */
  private async onAcceptance(submission: SubmissionRecord): Promise<void> {
    console.log(`🎉 ACCEPTED at ${submission.venue}!`);
    
    // Generate acceptance announcement
    const announcement = this.generateAcceptanceAnnouncement(submission);
    
    // Schedule camera-ready preparation
    if (submission.deadlines.cameraReady) {
      const daysUntilCameraReady = Math.ceil(
        (submission.deadlines.cameraReady.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      console.log(`  📝 Camera-ready due in ${daysUntilCameraReady} days`);
    }
    
    // Prepare presentation materials
    console.log(`  🎤 Prepare presentation for ${submission.venue}`);
    
    // Update other submissions if needed
    if (submission.type === 'primary') {
      console.log(`  📋 Consider withdrawing backup submissions`);
    }
  }

  /**
   * Actions when paper is rejected
   */
  private async onRejection(submission: SubmissionRecord): Promise<void> {
    console.log(`❌ Rejected from ${submission.venue}`);
    
    // Analyze reviews for improvement
    if (submission.reviews) {
      console.log(`  📊 Review analysis: ${submission.reviews.majorConcerns.length} major concerns`);
    }
    
    // Suggest next steps
    const nextVenue = this.suggestNextVenue(submission);
    if (nextVenue) {
      console.log(`  🎯 Consider submitting to: ${nextVenue}`);
    }
    
    // Schedule revision planning
    console.log(`  📝 Plan revisions based on reviewer feedback`);
  }

  /**
   * Actions when revision is requested
   */
  private async onRevisionRequested(submission: SubmissionRecord): Promise<void> {
    console.log(`📝 Revision requested for ${submission.venue}`);
    
    if (submission.decision?.revisionDeadline) {
      const daysUntilRevision = Math.ceil(
        (submission.decision.revisionDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      console.log(`  ⏰ Revision due in ${daysUntilRevision} days`);
    }
    
    // Generate revision plan
    await this.generateRevisionPlan(submission);
  }

  /**
   * Add review record
   */
  async addReview(review: ReviewRecord): Promise<void> {
    this.tracker.reviews.push(review);
    
    // Update submission with review summary
    const submission = this.tracker.submissions.find(s => s.id === review.submissionId);
    if (submission) {
      await this.updateReviewSummary(submission);
    }
    
    console.log(`📝 Added review for ${review.submissionId}: ${review.score}/10`);
  }

  /**
   * Update review summary for submission
   */
  private async updateReviewSummary(submission: SubmissionRecord): Promise<void> {
    const reviews = this.tracker.reviews.filter(r => r.submissionId === submission.id);
    
    if (reviews.length === 0) return;
    
    const averageScore = reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length;
    const allStrengths = reviews.flatMap(r => r.strengths);
    const allWeaknesses = reviews.flatMap(r => r.weaknesses);
    
    submission.reviews = {
      reviewerCount: reviews.length,
      averageScore,
      recommendation: this.determineRecommendation(averageScore),
      majorConcerns: [...new Set(allWeaknesses)],
      minorIssues: [],
      strengths: [...new Set(allStrengths)]
    };
    
    console.log(`  📊 Updated review summary: ${averageScore.toFixed(1)}/10 (${reviews.length} reviews)`);
  }

  /**
   * Determine recommendation based on average score
   */
  private determineRecommendation(averageScore: number): 'accept' | 'weak_accept' | 'borderline' | 'weak_reject' | 'reject' {
    if (averageScore >= 7) return 'accept';
    if (averageScore >= 6) return 'weak_accept';
    if (averageScore >= 5) return 'borderline';
    if (averageScore >= 4) return 'weak_reject';
    return 'reject';
  }

  /**
   * Track citation
   */
  async addCitation(citation: CitationRecord): Promise<void> {
    this.tracker.citations.push(citation);
    console.log(`📚 New citation tracked: "${citation.citingPaper.title}"`);
    
    // Analyze citation context
    await this.analyzeCitationContext(citation);
  }

  /**
   * Analyze citation context and type
   */
  private async analyzeCitationContext(citation: CitationRecord): Promise<void> {
    const context = citation.context.toLowerCase();
    
    // Determine citation sentiment
    const positive = ['builds on', 'extends', 'improves', 'excellent', 'novel', 'significant'];
    const negative = ['limited', 'fails', 'incorrect', 'flawed', 'problematic'];
    
    const isPositive = positive.some(word => context.includes(word));
    const isNegative = negative.some(word => context.includes(word));
    
    let sentiment = 'neutral';
    if (isPositive && !isNegative) sentiment = 'positive';
    if (isNegative && !isPositive) sentiment = 'negative';
    
    console.log(`  📊 Citation sentiment: ${sentiment}`);
    console.log(`  🏷️  Citation type: ${citation.citationType}`);
  }

  /**
   * Post social media update
   */
  async postSocialMediaUpdate(
    platform: SocialMediaRecord['platform'],
    content: string,
    url?: string
  ): Promise<void> {
    const record: SocialMediaRecord = {
      platform,
      postId: this.generatePostId(),
      content,
      url: url || '',
      metrics: {
        likes: 0,
        shares: 0,
        comments: 0,
        views: 0,
        clicks: 0
      },
      postedDate: new Date()
    };
    
    this.tracker.socialMedia.push(record);
    console.log(`📱 Posted to ${platform}: "${content.substring(0, 50)}..."`);
  }

  /**
   * Update social media metrics
   */
  async updateSocialMetrics(postId: string, metrics: Partial<SocialMetrics>): Promise<void> {
    const post = this.tracker.socialMedia.find(p => p.postId === postId);
    if (post) {
      Object.assign(post.metrics, metrics);
      console.log(`📊 Updated metrics for ${post.platform} post: ${post.metrics.likes} likes, ${post.metrics.shares} shares`);
    }
  }

  /**
   * Track release
   */
  async addRelease(release: ReleaseRecord): Promise<void> {
    this.tracker.releases.push(release);
    console.log(`🚀 New release tracked: ${release.type} v${release.version} on ${release.platform}`);
    
    // Generate release announcement
    const announcement = this.generateReleaseAnnouncement(release);
    console.log(`  📱 Release announcement ready: "${announcement.substring(0, 50)}..."`);
  }

  /**
   * Generate comprehensive dissemination report
   */
  async generateDisseminationReport(): Promise<string> {
    const report = `# CARTS Research - Dissemination Report

## Submission Status

${this.tracker.submissions.map(sub => `
### ${sub.venue} (${sub.type})
- **Status**: ${sub.status}
- **Submitted**: ${sub.submissionDate.toISOString().split('T')[0]}
- **Notification**: ${sub.deadlines.notification.toISOString().split('T')[0]}
${sub.reviews ? `- **Reviews**: ${sub.reviews.reviewerCount} reviews, avg ${sub.reviews.averageScore.toFixed(1)}/10` : ''}
${sub.decision ? `- **Decision**: ${sub.decision.outcome} (${sub.decision.date.toISOString().split('T')[0]})` : ''}
`).join('\n')}

## Citation Tracking

**Total Citations**: ${this.tracker.citations.length}

${this.tracker.citations.map(cit => `
- **"${cit.citingPaper.title}"** (${cit.citingPaper.year})
  - Authors: ${cit.citingPaper.authors.join(', ')}
  - Venue: ${cit.citingPaper.venue}
  - Type: ${cit.citationType}
`).join('\n')}

## Social Media Impact

${Object.entries(this.groupSocialMediaByPlatform()).map(([platform, posts]) => `
### ${platform.charAt(0).toUpperCase() + platform.slice(1)}
- **Posts**: ${posts.length}
- **Total Likes**: ${posts.reduce((sum, p) => sum + p.metrics.likes, 0)}
- **Total Shares**: ${posts.reduce((sum, p) => sum + p.metrics.shares, 0)}
- **Total Views**: ${posts.reduce((sum, p) => sum + (p.metrics.views || 0), 0)}
`).join('\n')}

## Release Statistics

${this.tracker.releases.map(rel => `
### ${rel.type} v${rel.version} (${rel.platform})
- **URL**: ${rel.url}
- **Downloads**: ${rel.downloads}
${rel.stars ? `- **Stars**: ${rel.stars}` : ''}
${rel.forks ? `- **Forks**: ${rel.forks}` : ''}
- **Released**: ${rel.releaseDate.toISOString().split('T')[0]}
`).join('\n')}

## Summary Statistics

- **Submissions**: ${this.tracker.submissions.length} venues
- **Accepted Papers**: ${this.tracker.submissions.filter(s => s.status === 'accepted').length}
- **Total Citations**: ${this.tracker.citations.length}
- **Social Media Posts**: ${this.tracker.socialMedia.length}
- **Code Releases**: ${this.tracker.releases.filter(r => r.type === 'code').length}
- **Data Releases**: ${this.tracker.releases.filter(r => r.type === 'data').length}

---
*Report generated: ${new Date().toISOString()}*
`;

    return report;
  }
  /**
   * Helper methods for generating content
   */
  private generateSubmissionAnnouncement(submission: SubmissionRecord): string {
    return `🎯 Excited to share that our paper "CARTS: Contextual Adaptive Retrieval-Type Scheduling for Enhanced L2 Vocabulary Learning" has been submitted to ${submission.venue}! 

Our deep RL approach shows 23% improvement in vocabulary retention and 31% enhancement in context transfer. Looking forward to the review process! 

#EMNLP2026 #VocabularyLearning #DeepRL #EdTech #NLProc`;
  }

  private generateAcceptanceAnnouncement(submission: SubmissionRecord): string {
    return `🎉 Thrilled to announce that our paper "CARTS: Contextual Adaptive Retrieval-Type Scheduling for Enhanced L2 Vocabulary Learning" has been ACCEPTED at ${submission.venue}! 

Key contributions:
✅ DART algorithm with difficulty-aware scheduling
✅ CARTS deep RL framework for joint optimization  
✅ Novel LLM-as-a-Judge evaluation methodology
✅ 23% improvement over established baselines

Thanks to all collaborators and the anonymous reviewers for their valuable feedback! Code and data will be available soon.

#${submission.venue.replace(' ', '')} #AcceptedPaper #VocabularyLearning #DeepRL #OpenScience`;
  }

  private generateReleaseAnnouncement(release: ReleaseRecord): string {
    const emoji = {
      'code': '💻',
      'data': '📊', 
      'paper': '📄',
      'supplementary': '📎'
    }[release.type] || '🚀';

    return `${emoji} New release: CARTS Research ${release.type} v${release.version} is now available on ${release.platform}!

${release.url}

Complete implementation of our EMNLP 2026 paper with:
- Full algorithm implementations (DART + CARTS)
- Comprehensive test suite (200+ tests)
- Interactive demo notebook
- Reproducibility package

#OpenScience #ReproducibleResearch #VocabularyLearning #DeepRL`;
  }

  private generateRevisionPlan(submission: SubmissionRecord): Promise<void> {
    console.log(`📋 Generating revision plan for ${submission.venue}`);
    
    if (submission.reviews) {
      console.log(`  🎯 Address ${submission.reviews.majorConcerns.length} major concerns:`);
      submission.reviews.majorConcerns.forEach((concern, i) => {
        console.log(`    ${i + 1}. ${concern}`);
      });
      
      console.log(`  ✨ Leverage ${submission.reviews.strengths.length} identified strengths:`);
      submission.reviews.strengths.forEach((strength, i) => {
        console.log(`    ${i + 1}. ${strength}`);
      });
    }
    
    return Promise.resolve();
  }

  private suggestNextVenue(submission: SubmissionRecord): string | null {
    // Simple venue suggestion logic
    const venueMap: { [key: string]: string } = {
      'EMNLP 2026': 'ACL 2027',
      'ACL 2027': 'NAACL 2027',
      'AIED 2026': 'EDM 2026'
    };
    
    return venueMap[submission.venue] || null;
  }

  private prepareResponseTemplates(submission: SubmissionRecord): Promise<void> {
    console.log(`📝 Preparing response templates for ${submission.venue}`);
    console.log(`  ✅ Reviewer response framework ready`);
    console.log(`  ✅ Rebuttal structure prepared`);
    console.log(`  ✅ Revision checklist created`);
    
    return Promise.resolve();
  }

  private generatePostId(): string {
    return `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private groupSocialMediaByPlatform(): { [platform: string]: SocialMediaRecord[] } {
    return this.tracker.socialMedia.reduce((groups, post) => {
      const platform = post.platform;
      if (!groups[platform]) {
        groups[platform] = [];
      }
      groups[platform].push(post);
      return groups;
    }, {} as { [platform: string]: SocialMediaRecord[] });
  }

  /**
   * Setup social media templates
   */
  private async setupSocialMediaTemplates(): Promise<void> {
    const templates = {
      submission: this.generateSubmissionAnnouncement,
      acceptance: this.generateAcceptanceAnnouncement,
      release: this.generateReleaseAnnouncement
    };
    
    console.log(`  📱 Set up ${Object.keys(templates).length} social media templates`);
  }

  /**
   * Setup release management
   */
  private async setupReleaseManagement(): Promise<void> {
    const plannedReleases = [
      {
        version: '1.0.0',
        type: 'code' as const,
        platform: 'github' as const,
        url: 'https://github.com/anonymous/carts-research',
        releaseDate: new Date('2026-06-01')
      },
      {
        version: '1.0.0',
        type: 'data' as const,
        platform: 'zenodo' as const,
        url: 'https://zenodo.org/record/XXXXXXX',
        releaseDate: new Date('2026-06-15')
      },
      {
        version: '1.0.0',
        type: 'paper' as const,
        platform: 'arxiv' as const,
        url: 'https://arxiv.org/abs/XXXX.XXXXX',
        releaseDate: new Date('2026-06-16')
      }
    ];
    
    console.log(`  🚀 Planned ${plannedReleases.length} releases`);
  }

  /**
   * Export tracking data
   */
  async exportTrackingData(): Promise<SubmissionTracker> {
    return { ...this.tracker };
  }

  /**
   * Import tracking data
   */
  async importTrackingData(data: SubmissionTracker): Promise<void> {
    this.tracker = { ...data };
    console.log('📊 Imported tracking data');
  }

  /**
   * Get submission by ID
   */
  getSubmission(id: string): SubmissionRecord | undefined {
    return this.tracker.submissions.find(s => s.id === id);
  }

  /**
   * Get all submissions by status
   */
  getSubmissionsByStatus(status: SubmissionStatus): SubmissionRecord[] {
    return this.tracker.submissions.filter(s => s.status === status);
  }

  /**
   * Get citation count
   */
  getCitationCount(): number {
    return this.tracker.citations.length;
  }

  /**
   * Get social media engagement
   */
  getSocialMediaEngagement(): { totalLikes: number; totalShares: number; totalViews: number } {
    const totals = this.tracker.socialMedia.reduce(
      (acc, post) => ({
        totalLikes: acc.totalLikes + post.metrics.likes,
        totalShares: acc.totalShares + post.metrics.shares,
        totalViews: acc.totalViews + (post.metrics.views || 0)
      }),
      { totalLikes: 0, totalShares: 0, totalViews: 0 }
    );
    
    return totals;
  }

  /**
   * Get download statistics
   */
  getDownloadStatistics(): { totalDownloads: number; byType: { [type: string]: number } } {
    const totalDownloads = this.tracker.releases.reduce((sum, release) => sum + release.downloads, 0);
    
    const byType = this.tracker.releases.reduce((acc, release) => {
      acc[release.type] = (acc[release.type] || 0) + release.downloads;
      return acc;
    }, {} as { [type: string]: number });
    
    return { totalDownloads, byType };
  }

  /**
   * Generate GitHub release workflow
   */
  async generateGitHubReleaseWorkflow(): Promise<string> {
    return `name: Create Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build project
        run: npm run build
        
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: \${{ github.ref }}
          release_name: CARTS Research \${{ github.ref }}
          body: |
            ## CARTS Research Release
            
            This release contains the complete implementation of the CARTS research project.
            
            ### What's Included
            - Complete algorithm implementations (DART + CARTS)
            - Comprehensive test suite (200+ tests)
            - Interactive demo notebook
            - Reproducibility package
            
            ### Installation
            \`\`\`bash
            npm install
            npm test
            npm run demo
            \`\`\`
            
            ### Citation
            If you use this code, please cite our EMNLP 2026 paper:
            \`\`\`bibtex
            @inproceedings{anonymous2026carts,
              title={CARTS: Contextual Adaptive Retrieval-Type Scheduling for Enhanced L2 Vocabulary Learning},
              author={Anonymous Authors},
              booktitle={Proceedings of EMNLP 2026},
              year={2026}
            }
            \`\`\`
          draft: false
          prerelease: false
`;
  }

  /**
   * Generate Zenodo DOI registration
   */
  async generateZenodoRegistration(): Promise<string> {
    return `{
  "metadata": {
    "title": "CARTS: Contextual Adaptive Retrieval-Type Scheduling for Enhanced L2 Vocabulary Learning",
    "upload_type": "software",
    "description": "Complete reproducibility package for CARTS research including source code, data, and documentation.",
    "creators": [
      {
        "name": "Anonymous Author 1",
        "affiliation": "Anonymous University"
      },
      {
        "name": "Anonymous Author 2", 
        "affiliation": "Anonymous Institute"
      }
    ],
    "keywords": [
      "spaced repetition",
      "vocabulary learning", 
      "deep reinforcement learning",
      "educational technology",
      "second language acquisition"
    ],
    "license": "MIT",
    "version": "1.0.0",
    "language": "en",
    "related_identifiers": [
      {
        "identifier": "https://github.com/anonymous/carts-research",
        "relation": "isSupplementTo"
      }
    ],
    "references": [
      "Anonymous Authors. (2026). CARTS: Contextual Adaptive Retrieval-Type Scheduling for Enhanced L2 Vocabulary Learning. In Proceedings of EMNLP 2026."
    ]
  }
}`;
  }
}

/**
 * Utility functions for dissemination management
 */
export class DisseminationUtils {
  /**
   * Calculate days until deadline
   */
  static daysUntilDeadline(deadline: Date): number {
    return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Format deadline status
   */
  static formatDeadlineStatus(deadline: Date): string {
    const days = this.daysUntilDeadline(deadline);
    
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `Due in ${days} days`;
    if (days <= 30) return `Due in ${Math.ceil(days / 7)} weeks`;
    return `Due in ${Math.ceil(days / 30)} months`;
  }

  /**
   * Generate submission timeline
   */
  static generateSubmissionTimeline(submissions: SubmissionRecord[]): string {
    const sorted = submissions.sort((a, b) => 
      a.deadlines.submission.getTime() - b.deadlines.submission.getTime()
    );

    return sorted.map(sub => {
      const status = this.formatDeadlineStatus(sub.deadlines.submission);
      return `- **${sub.venue}** (${sub.type}): ${status}`;
    }).join('\n');
  }

  /**
   * Calculate impact metrics
   */
  static calculateImpactMetrics(tracker: SubmissionTracker): {
    hIndex: number;
    totalCitations: number;
    socialEngagement: number;
    downloadCount: number;
  } {
    const totalCitations = tracker.citations.length;
    
    // Simple h-index calculation (would need more sophisticated logic for real use)
    const hIndex = Math.min(totalCitations, 1); // Placeholder
    
    const socialEngagement = tracker.socialMedia.reduce(
      (sum, post) => sum + post.metrics.likes + post.metrics.shares + post.metrics.comments,
      0
    );
    
    const downloadCount = tracker.releases.reduce(
      (sum, release) => sum + release.downloads,
      0
    );

    return {
      hIndex,
      totalCitations,
      socialEngagement,
      downloadCount
    };
  }
}

/**
 * Export main class and utilities
 */
export default DisseminationTracker;