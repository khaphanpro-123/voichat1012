/**
 * API Route để kiểm tra database schema
 * 
 * Usage: GET /api/verify-database
 */

import { NextResponse } from 'next/server';
import getClientPromise from '@/lib/mongodb';

interface RelationshipCheck {
  name: string;
  parentTable: string;
  childTable: string;
  parentField: string;
  childField: string;
  type: '1:1' | '1:N' | 'N:M';
  description: string;
}

const RELATIONSHIPS: RelationshipCheck[] = [
  // Nhóm 1:1
  {
    name: 'User ⟷ UserProgress',
    parentTable: 'users',
    childTable: 'user_progress',
    parentField: '_id',
    childField: 'userId',
    type: '1:1',
    description: 'Chứa level, XP và streak'
  },
  {
    name: 'User ⟷ UserApiKeys',
    parentTable: 'users',
    childTable: 'user_api_keys',
    parentField: '_id',
    childField: 'userId',
    type: '1:1',
    description: 'Lưu API keys'
  },
  
  // Nhóm 1:N
  {
    name: 'User ⟷ Document',
    parentTable: 'users',
    childTable: 'documents',
    parentField: '_id',
    childField: 'userId',
    type: '1:N',
    description: 'User có nhiều documents'
  },
  {
    name: 'User ⟷ Vocabulary',
    parentTable: 'users',
    childTable: 'vocabulary',
    parentField: '_id',
    childField: 'userId',
    type: '1:N',
    description: 'User có nhiều vocabulary'
  },
  {
    name: 'User ⟷ LearningSession',
    parentTable: 'users',
    childTable: 'learning_sessions',
    parentField: '_id',
    childField: 'userId',
    type: '1:N',
    description: 'Lịch sử học tập'
  },
  {
    name: 'User ⟷ GrammarError',
    parentTable: 'users',
    childTable: 'grammar_errors',
    parentField: '_id',
    childField: 'userId',
    type: '1:N',
    description: 'Lỗi ngữ pháp'
  },
  {
    name: 'User ⟷ Analysis',
    parentTable: 'users',
    childTable: 'analyses',
    parentField: '_id',
    childField: 'userId',
    type: '1:N',
    description: 'Phân tích học tập'
  },
  {
    name: 'User ⟷ Assessment',
    parentTable: 'users',
    childTable: 'assessments',
    parentField: '_id',
    childField: 'userId',
    type: '1:N',
    description: 'Bài kiểm tra'
  },
  {
    name: 'User ⟷ Notification (Creator)',
    parentTable: 'users',
    childTable: 'notifications',
    parentField: '_id',
    childField: 'createdBy',
    type: '1:N',
    description: 'Admin tạo thông báo'
  },
  
  // Liên kết chéo
  {
    name: 'Document ⟷ Vocabulary',
    parentTable: 'documents',
    childTable: 'vocabulary',
    parentField: '_id',
    childField: 'sourceDocument',
    type: '1:N',
    description: 'Document trích xuất vocabulary'
  },
  {
    name: 'User ⟷ Notification (Readers)',
    parentTable: 'users',
    childTable: 'notifications',
    parentField: '_id',
    childField: 'readBy',
    type: 'N:M',
    description: 'Nhiều user đọc notification'
  }
];

export async function GET() {
  try {
    const client = await getClientPromise();
    const db = client.db();
    
    const results = [];
    
    for (const rel of RELATIONSHIPS) {
      const result = await verifyRelationship(db, rel);
      results.push(result);
    }
    
    // Tính summary
    const passed = results.filter(r => r.status === 'PASS').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    
    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        passed,
        warnings,
        failed
      },
      results
    });
    
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function verifyRelationship(db: any, rel: RelationshipCheck) {
  const result: any = {
    relationship: rel.name,
    type: rel.type,
    status: 'PASS',
    issues: [],
    stats: {}
  };
  
  try {
    const parentCollection = db.collection(rel.parentTable);
    const childCollection = db.collection(rel.childTable);
    
    // Đếm số lượng
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
    
    // Kiểm tra orphaned children
    if (rel.type !== 'N:M' && childCount > 0) {
      const orphanedCount = await childCollection.countDocuments({
        [rel.childField]: { $exists: false }
      });
      
      if (orphanedCount > 0) {
        result.issues.push(`Found ${orphanedCount} orphaned children without ${rel.childField}`);
        result.status = 'FAIL';
      }
      result.stats.orphanedChildren = orphanedCount;
    }
    
    // Kiểm tra 1:1 cardinality
    if (rel.type === '1:1' && childCount > 0) {
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
    
    // Kiểm tra N:M array field
    if (rel.type === 'N:M' && childCount > 0) {
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
    result.issues.push(`Error: ${error.message}`);
    result.status = 'FAIL';
  }
  
  return result;
}
