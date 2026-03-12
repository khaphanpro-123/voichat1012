/**
 * DATABASE SCHEMA VERIFICATION SCRIPT
 * 
 * Kiểm tra tất cả các bảng và mối quan hệ trong MongoDB
 * So sánh với thiết kế dữ liệu đã định nghĩa
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voichat';

interface RelationshipCheck {
  name: string;
  parentTable: string;
  childTable: string;
  parentField: string;
  childField: string;
  parentCardinality: string;
  childCardinality: string;
  type: '1:1' | '1:N' | 'N:M';
  description: string;
}

// Định nghĩa tất cả các mối quan hệ cần kiểm tra
const RELATIONSHIPS: RelationshipCheck[] = [
  // Nhóm 1:1
  {
    name: 'User ⟷ UserProgress',
    parentTable: 'users',
    childTable: 'user_progress',
    parentField: '_id',
    childField: 'userId',
    parentCardinality: '1',
    childCardinality: '0..1',
    type: '1:1',
    description: 'Chứa level, XP và streak của người dùng'
  },
  {
    name: 'User ⟷ UserApiKeys',
    parentTable: 'users',
    childTable: 'user_api_keys',
    parentField: '_id',
    childField: 'userId',
    parentCardinality: '1',
    childCardinality: '0..1',
    type: '1:1',
    description: 'Lưu các key AI cá nhân (OpenAI, Gemini)'
  },
  
  // Nhóm 1:N
  {
    name: 'User ⟷ Document',
    parentTable: 'users',
    childTable: 'documents',
    parentField: '_id',
    childField: 'userId',
    parentCardinality: '1',
    childCardinality: '0..N',
    type: '1:N',
    description: 'Một người dùng có thể tải lên nhiều file'
  },
  {
    name: 'User ⟷ Vocabulary',
    parentTable: 'users',
    childTable: 'vocabulary',
    parentField: '_id',
    childField: 'userId',
    parentCardinality: '1',
    childCardinality: '0..N',
    type: '1:N',
    description: 'Một người dùng có kho từ vựng gồm nhiều từ'
  },
  {
    name: 'User ⟷ LearningSession',
    parentTable: 'users',
    childTable: 'learning_sessions',
    parentField: '_id',
    childField: 'userId',
    parentCardinality: '1',
    childCardinality: '0..N',
    type: '1:N',
    description: 'Lưu lịch sử nhiều buổi học của user'
  },
  {
    name: 'User ⟷ GrammarError',
    parentTable: 'users',
    childTable: 'grammar_errors',
    parentField: '_id',
    childField: 'userId',
    parentCardinality: '1',
    childCardinality: '0..N',
    type: '1:N',
    description: 'Danh sách các lỗi ngữ pháp user đã mắc'
  },
  {
    name: 'User ⟷ Analysis',
    parentTable: 'users',
    childTable: 'analyses',
    parentField: '_id',
    childField: 'userId',
    parentCardinality: '1',
    childCardinality: '0..N',
    type: '1:N',
    description: 'Các bài phân tích kết quả học tập'
  },
  {
    name: 'User ⟷ Assessment',
    parentTable: 'users',
    childTable: 'assessments',
    parentField: '_id',
    childField: 'userId',
    parentCardinality: '1',
    childCardinality: '0..N',
    type: '1:N',
    description: 'Các bài kiểm tra đánh giá năng lực'
  },
  {
    name: 'User ⟷ Notification (Creator)',
    parentTable: 'users',
    childTable: 'notifications',
    parentField: '_id',
    childField: 'createdBy',
    parentCardinality: '1',
    childCardinality: '0..N',
    type: '1:N',
    description: 'Một Admin có thể tạo nhiều thông báo'
  },
  
  // Nhóm liên kết chéo
  {
    name: 'Document ⟷ Vocabulary',
    parentTable: 'documents',
    childTable: 'vocabulary',
    parentField: '_id',
    childField: 'sourceDocument',
    parentCardinality: '1',
    childCardinality: '0..N',
    type: '1:N',
    description: 'Một tài liệu có thể trích xuất ra được nhiều từ vựng'
  },
  {
    name: 'User ⟷ Notification (Readers)',
    parentTable: 'users',
    childTable: 'notifications',
    parentField: '_id',
    childField: 'readBy',
    parentCardinality: '0..N',
    childCardinality: '0..N',
    type: 'N:M',
    description: 'Nhiều người dùng có thể cùng đọc một thông báo'
  }
];

interface VerificationResult {
  relationship: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  issues: string[];
  stats: {
    parentCount?: number;
    childCount?: number;
    orphanedChildren?: number;
    multipleChildren?: number;
  };
}

async function verifyDatabaseSchema() {
  console.log('🔍 DATABASE SCHEMA VERIFICATION');
  console.log('='.repeat(80));
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const results: VerificationResult[] = [];
    
    // Kiểm tra từng mối quan hệ
    for (const rel of RELATIONSHIPS) {
      console.log(`\n📊 Checking: ${rel.name}`);
      console.log('-'.repeat(80));
      
      const result = await verifyRelationship(db, rel);
      results.push(result);
      
      // In kết quả
      console.log(`Status: ${result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌'} ${result.status}`);
      
      if (result.issues.length > 0) {
        console.log('Issues:');
        result.issues.forEach(issue => console.log(`  - ${issue}`));
      }
      
      if (result.stats) {
        console.log('Statistics:');
        Object.entries(result.stats).forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}`);
        });
      }
    }
    
    // Tổng kết
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY');
    console.log('='.repeat(80));
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`⚠️  Warnings: ${warnings}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    
    // Tạo báo cáo chi tiết
    await generateReport(results);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function verifyRelationship(db: any, rel: RelationshipCheck): Promise<VerificationResult> {
  const result: VerificationResult = {
    relationship: rel.name,
    status: 'PASS',
    issues: [],
    stats: {}
  };
  
  try {
    const parentCollection = db.collection(rel.parentTable);
    const childCollection = db.collection(rel.childTable);
    
    // Đếm số lượng documents
    const parentCount = await parentCollection.countDocuments();
    const childCount = await childCollection.countDocuments();
    
    result.stats.parentCount = parentCount;
    result.stats.childCount = childCount;
    
    if (parentCount === 0) {
      result.issues.push(`Parent table '${rel.parentTable}' is empty`);
      result.status = 'WARNING';
    }
    
    if (childCount === 0) {
      result.issues.push(`Child table '${rel.childTable}' is empty`);
      result.status = 'WARNING';
    }
    
    // Kiểm tra orphaned children (children không có parent)
    if (rel.type !== 'N:M') {
      const orphanedCount = await childCollection.countDocuments({
        [rel.childField]: { $exists: false }
      });
      
      if (orphanedCount > 0) {
        result.issues.push(`Found ${orphanedCount} orphaned children without ${rel.childField}`);
        result.status = 'FAIL';
      }
      result.stats.orphanedChildren = orphanedCount;
    }
    
    // Kiểm tra cardinality
    if (rel.type === '1:1') {
      // Kiểm tra xem có parent nào có nhiều hơn 1 child không
      const pipeline = [
        {
          $group: {
            _id: `$${rel.childField}`,
            count: { $sum: 1 }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ];
      
      const multipleChildren = await childCollection.aggregate(pipeline).toArray();
      
      if (multipleChildren.length > 0) {
        result.issues.push(`Found ${multipleChildren.length} parents with multiple children (violates 1:1)`);
        result.status = 'FAIL';
      }
      result.stats.multipleChildren = multipleChildren.length;
    }
    
    // Kiểm tra foreign key references
    if (rel.type !== 'N:M' && childCount > 0) {
      const sampleChild = await childCollection.findOne({});
      
      if (sampleChild && sampleChild[rel.childField]) {
        const parentExists = await parentCollection.findOne({
          [rel.parentField]: sampleChild[rel.childField]
        });
        
        if (!parentExists) {
          result.issues.push(`Sample child references non-existent parent`);
          result.status = 'FAIL';
        }
      }
    }
    
    // Kiểm tra N:M relationship (array field)
    if (rel.type === 'N:M') {
      const sampleChild = await childCollection.findOne({
        [rel.childField]: { $exists: true, $ne: [] }
      });
      
      if (sampleChild) {
        const fieldValue = sampleChild[rel.childField];
        
        if (!Array.isArray(fieldValue)) {
          result.issues.push(`Field '${rel.childField}' should be an array for N:M relationship`);
          result.status = 'FAIL';
        }
      }
    }
    
  } catch (error: any) {
    result.issues.push(`Error checking relationship: ${error.message}`);
    result.status = 'FAIL';
  }
  
  return result;
}

async function generateReport(results: VerificationResult[]) {
  const report = `# DATABASE SCHEMA VERIFICATION REPORT

Generated: ${new Date().toISOString()}

## Summary

- Total Relationships: ${results.length}
- ✅ Passed: ${results.filter(r => r.status === 'PASS').length}
- ⚠️  Warnings: ${results.filter(r => r.status === 'WARNING').length}
- ❌ Failed: ${results.filter(r => r.status === 'FAIL').length}

## Detailed Results

${results.map(r => `
### ${r.relationship}

**Status**: ${r.status === 'PASS' ? '✅ PASS' : r.status === 'WARNING' ? '⚠️ WARNING' : '❌ FAIL'}

${r.issues.length > 0 ? `**Issues**:
${r.issues.map(i => `- ${i}`).join('\n')}` : ''}

**Statistics**:
${Object.entries(r.stats).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
`).join('\n---\n')}

## Recommendations

${results.filter(r => r.status !== 'PASS').map(r => `
### ${r.relationship}
${r.issues.map(i => `- Fix: ${i}`).join('\n')}
`).join('\n')}
`;

  const fs = require('fs');
  fs.writeFileSync('DATABASE_VERIFICATION_REPORT.md', report);
  console.log('\n✅ Report saved to DATABASE_VERIFICATION_REPORT.md');
}

// Run verification
verifyDatabaseSchema()
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
