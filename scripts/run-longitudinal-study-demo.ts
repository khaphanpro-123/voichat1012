#!/usr/bin/env ts-node
// scripts/run-longitudinal-study-demo.ts
// Demonstration script for CARTS Longitudinal Study Infrastructure

import {
  StudyOrchestrator,
  StudyConfiguration,
  DemographicData
} from '../lib/longitudinal-study-infrastructure';

/**
 * Demo script showing how to set up and run a CARTS longitudinal study
 */
async function runLongitudinalStudyDemo() {
  console.log('🚀 CARTS Longitudinal Study Demo');
  console.log('=====================================\n');

  // Step 1: Configure the study
  const studyConfig: StudyConfiguration = {
    studyId: 'CARTS_DEMO_2026',
    title: 'CARTS vs Baseline Algorithms - Demo Study',
    description: 'Demonstration of longitudinal study infrastructure for CARTS research',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-07-27'), // 8 weeks
    targetParticipants: 24, // Smaller demo size (4 per algorithm)
    vocabularySetSize: 50,  // Smaller vocabulary set for demo
    sessionFrequency: 'daily',
    minSessionsPerWeek: 5,
    maxSessionDuration: 20, // 20-minute sessions
    algorithms: [
      { name: 'SM-2', displayName: 'SM-2 Algorithm', description: 'Classic spaced repetition with ease factors' },
      { name: 'HLR', displayName: 'Half-Life Regression', description: 'Data-driven memory modeling' },
      { name: 'KARL', displayName: 'KARL', description: 'Semantic-aware knowledge tracing' },
      { name: 'LECTOR', displayName: 'LECTOR', description: 'Interference-aware scheduling' },
      { name: 'DART', displayName: 'DART', description: 'Difficulty-aware retrieval-type scheduling' },
      { name: 'CARTS', displayName: 'CARTS', description: 'Contextual adaptive retrieval-type scheduler (Deep RL)' }
    ],
    evaluationSchedule: {
      preTest: true,
      postTest: true,
      weeklyAssessments: true,
      contextTransferTests: [2, 4, 6, 8],
      retentionTests: [4, 8]
    }
  };

  // Step 2: Initialize study orchestrator
  console.log('📋 Initializing study...');
  const studyOrchestrator = new StudyOrchestrator(studyConfig);
  await studyOrchestrator.initializeStudy();
  console.log('✅ Study initialized successfully\n');

  // Step 3: Enroll demo participants
  console.log('👥 Enrolling demo participants...');
  const demoParticipants = [
    {
      userId: 'demo_user_001',
      demographics: {
        age: 25,
        gender: 'female' as const,
        nativeLanguage: 'Spanish',
        educationLevel: 'undergraduate' as const,
        englishLearningYears: 5,
        previousSRSExperience: false,
        studyMotivation: 'Academic improvement',
        timeZone: 'UTC-5'
      },
      proficiency: 'B1'
    },
    {
      userId: 'demo_user_002',
      demographics: {
        age: 28,
        gender: 'male' as const,
        nativeLanguage: 'French',
        educationLevel: 'graduate' as const,
        englishLearningYears: 8,
        previousSRSExperience: true,
        studyMotivation: 'Professional development',
        timeZone: 'UTC+1'
      },
      proficiency: 'B2'
    },
    {
      userId: 'demo_user_003',
      demographics: {
        age: 22,
        gender: 'other' as const,
        nativeLanguage: 'Japanese',
        educationLevel: 'undergraduate' as const,
        englishLearningYears: 6,
        previousSRSExperience: false,
        studyMotivation: 'Language certification',
        timeZone: 'UTC+9'
      },
      proficiency: 'A2'
    },
    {
      userId: 'demo_user_004',
      demographics: {
        age: 35,
        gender: 'female' as const,
        nativeLanguage: 'German',
        educationLevel: 'postgraduate' as const,
        englishLearningYears: 12,
        previousSRSExperience: true,
        studyMotivation: 'Research participation',
        timeZone: 'UTC+2'
      },
      proficiency: 'C1'
    },
    {
      userId: 'demo_user_005',
      demographics: {
        age: 30,
        gender: 'male' as const,
        nativeLanguage: 'Portuguese',
        educationLevel: 'graduate' as const,
        englishLearningYears: 10,
        previousSRSExperience: true,
        studyMotivation: 'Career advancement',
        timeZone: 'UTC-3'
      },
      proficiency: 'B2'
    },
    {
      userId: 'demo_user_006',
      demographics: {
        age: 24,
        gender: 'prefer-not-to-say' as const,
        nativeLanguage: 'Korean',
        educationLevel: 'undergraduate' as const,
        englishLearningYears: 4,
        previousSRSExperience: false,
        studyMotivation: 'Personal interest',
        timeZone: 'UTC+9'
      },
      proficiency: 'A2'
    }
  ];

  const enrolledParticipants = [];
  for (const demo of demoParticipants) {
    const participant = studyOrchestrator.enrollParticipant(
      demo.userId,
      demo.demographics,
      demo.proficiency,
      true // consent given
    );
    enrolledParticipants.push(participant);
    
    console.log(`  ✅ Enrolled ${participant.participantId} (${demo.proficiency}) → ${participant.assignedAlgorithm}`);
  }
  console.log(`\n📊 Total participants enrolled: ${enrolledParticipants.length}\n`);

  // Step 4: Simulate study progress
  console.log('⏱️  Simulating study progress...');
  
  // Simulate 3 days of study operations
  for (let day = 1; day <= 3; day++) {
    console.log(`\n📅 Day ${day} Operations:`);
    
    try {
      await studyOrchestrator.runDailyOperations();
      console.log(`  ✅ Completed daily operations for day ${day}`);
      
      // Generate progress report every day
      const report = await studyOrchestrator.generateProgressReport();
      console.log(`  📈 Sessions conducted: ${report.dataCollection.totalSessions}`);
      console.log(`  📊 Assessments completed: ${report.dataCollection.totalAssessments}`);
      
    } catch (error) {
      console.error(`  ❌ Error in day ${day} operations:`, error);
    }
  }

  // Step 5: Generate comprehensive progress report
  console.log('\n📊 Generating comprehensive progress report...');
  const finalReport = await studyOrchestrator.generateProgressReport();
  
  console.log('\n=== STUDY PROGRESS REPORT ===');
  console.log(`Study ID: ${finalReport.studyInfo.studyId}`);
  console.log(`Study Title: ${finalReport.studyInfo.title}`);
  console.log(`Days Elapsed: ${finalReport.studyInfo.daysElapsed}`);
  console.log(`\nParticipant Statistics:`);
  console.log(`  Total Participants: ${finalReport.participantStatistics.totalParticipants}`);
  console.log(`  Active Participants: ${finalReport.participantStatistics.activeParticipants}`);
  console.log(`  Completed Participants: ${finalReport.participantStatistics.completedParticipants}`);
  
  console.log(`\nAlgorithm Distribution:`);
  Object.entries(finalReport.participantStatistics.algorithmDistribution).forEach(([algorithm, count]) => {
    console.log(`  ${algorithm}: ${count} participants`);
  });
  
  console.log(`\nProficiency Distribution:`);
  Object.entries(finalReport.participantStatistics.proficiencyDistribution).forEach(([level, count]) => {
    console.log(`  ${level}: ${count} participants`);
  });
  
  console.log(`\nData Collection Summary:`);
  console.log(`  Total Sessions: ${finalReport.dataCollection.totalSessions}`);
  console.log(`  Total Assessments: ${finalReport.dataCollection.totalAssessments}`);
  console.log(`  Avg Sessions/Participant: ${finalReport.dataCollection.averageSessionsPerParticipant.toFixed(1)}`);

  // Step 6: Algorithm performance comparison
  console.log(`\n🔬 Algorithm Performance Analysis:`);
  Object.entries(finalReport.algorithmPerformance).forEach(([algorithm, stats]: [string, any]) => {
    console.log(`\n  ${algorithm}:`);
    console.log(`    Participants: ${stats.participantCount}`);
    console.log(`    Total Assessments: ${stats.totalAssessments}`);
    
    // Show weekly progression if available
    const weeks = Object.keys(stats.weeklyProgression).sort((a, b) => parseInt(a) - parseInt(b));
    if (weeks.length > 0) {
      console.log(`    Weekly Performance:`);
      weeks.forEach(week => {
        const weekStats = stats.weeklyProgression[week];
        if (weekStats.averageOverallScore) {
          console.log(`      Week ${week}: Overall=${weekStats.averageOverallScore.toFixed(3)}, Transfer=${weekStats.averageContextTransferScore.toFixed(3)}`);
        }
      });
    }
  });

  // Step 7: Export study data
  console.log('\n💾 Exporting study data...');
  
  try {
    const jsonData = await studyOrchestrator.exportStudyData('json');
    console.log(`  ✅ JSON export completed (${jsonData.length} characters)`);
    
    const csvData = await studyOrchestrator.exportStudyData('csv');
    console.log(`  ✅ CSV export completed (${csvData.split('\n').length} rows)`);
    
    // Save to files (in a real implementation)
    // fs.writeFileSync('study_data.json', jsonData);
    // fs.writeFileSync('study_data.csv', csvData);
    
  } catch (error) {
    console.error('  ❌ Error exporting data:', error);
  }

  // Step 8: Research insights summary
  console.log('\n🔍 Research Insights Summary:');
  console.log('=====================================');
  
  // Calculate some basic insights
  const algorithms = Object.keys(finalReport.algorithmPerformance);
  const totalSessions = finalReport.dataCollection.totalSessions;
  const totalAssessments = finalReport.dataCollection.totalAssessments;
  
  console.log(`✅ Successfully demonstrated longitudinal study infrastructure`);
  console.log(`✅ Tested ${algorithms.length} different scheduling algorithms`);
  console.log(`✅ Collected ${totalSessions} learning sessions across ${enrolledParticipants.length} participants`);
  console.log(`✅ Conducted ${totalAssessments} assessments with multi-dimensional scoring`);
  console.log(`✅ Validated data collection and export functionality`);
  
  console.log('\n📋 Next Steps for Full Study:');
  console.log('1. Scale to 200 participants (33-34 per algorithm)');
  console.log('2. Run for full 8-week duration');
  console.log('3. Implement real LLM-based ContextTransfer evaluation');
  console.log('4. Conduct statistical analysis with mixed-effects models');
  console.log('5. Generate publication-ready results and figures');
  
  console.log('\n🎯 Demo completed successfully!');
  console.log('=====================================\n');
}

/**
 * Error handling wrapper
 */
async function main() {
  try {
    await runLongitudinalStudyDemo();
  } catch (error) {
    console.error('❌ Demo failed with error:', error);
    process.exit(1);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  main();
}

export { runLongitudinalStudyDemo };