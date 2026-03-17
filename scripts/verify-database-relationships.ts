/**
 * Database Schema Relationship Verification Script
 * Kiểm tra mối quan hệ giữa các collections trong MongoDB
 */

import mongoose from 'mongoose';
import User from '../app/models/User';
import Document from '../app/models/Document';
import Vocabulary from '../app/models/Vocabulary';
import LearningSession from '../app/models/LearningSession';
import GrammarError from '../app/models/GrammarError';
import Analysis from '../app/models/Analysis';
import Assessment from '../app/models/assessment';
import Notification from '../app/models/Notification';
import UserApiKeys from '../app/models/UserApiKeys';
import UserProgress from '../app/models/UserProgress';

interface VerificationResult {
  collection: string;
  exists: boolean;
  relationships: {
    foreignKeys: string[];
    indexes: string[];
    uniqueConstraints: string[];
  };
  sampleCount: number;
}

interface RelationshipCheck {
  name: string;
  type: '1:1' | '1:N' | 'N:M';
  parent: string;
  child: string;
  foreignKey: string;
  isUnique?: boolean;
  status: 'PASS' | 'FAIL';
  details: string;
}

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voichat';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function verifyCollection(model: any, collectionName: string): Promise<VerificationResult> {
  try {
    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const exists = collections.some(col => col.name === collectionName);
    
    // Get schema info
    const schema = model.schema;
    const paths = schema.paths;
    
    const foreignKeys: string[] = [];
    const indexes: string[] = [];
    const uniqueConstraints: string[] = [];
    
    // Analyze schema paths
    Object.keys(paths).forEach(path => {
      const schemaType = paths[path];
      
      // Check for foreign keys (ObjectId references)
      if (schemaType.options?.ref || path.includes('Id') || path.includes('userId')) {
        foreignKeys.push(path);
      }
      
      // Check for unique constraints
      if (schemaType.options?.unique) {
        uniqueConstraints.push(path);
      }
    });
    
    // Get indexes
    const indexInfo = schema.indexes();
    indexInfo.forEach((index: any) => {
      const fields = Object.keys(index[0]).join(', ');
      indexes.push(fields);
    });
    
    // Get sample count
    const sampleCount = await model.countDocuments().limit(1000);
    
    return {
      collection: collectionName,
      exists,
      relationships: {
        foreignKeys,
        indexes,
        uniqueConstraints
      },
      sampleCount
    };
  } catch (error) {
    console.error(`Error verifying ${collectionName}:`, error);
    return {
      collection: collectionName,
      exists: false,
      relationships: { foreignKeys: [], indexes: [], uniqueConstraints: [] },
      sampleCount: 0
    };
  }
}

function checkRelationship(
  name: string,
  type: '1:1' | '1:N' | 'N:M',
  parent: string,
  child: string,
  foreignKey: string,
  isUnique: boolean = false,
  results: VerificationResult[]
): RelationshipCheck {
  const childResult = results.find(r => r.collection === child);
  
  if (!childResult) {
    return {
      name, type, parent, child, foreignKey, isUnique,
      status: 'FAIL',
      details: `Child collection ${child} not found`
    };
  }
  
  const hasForeignKey = childResult.relationships.foreignKeys.includes(foreignKey);
  const hasUniqueConstraint = childResult.relationships.uniqueConstraints.includes(foreignKey);
  
  let status: 'PASS' | 'FAIL' = 'PASS';
  let details = '';
  
  if (!hasForeignKey) {
    status = 'FAIL';
    details = `Foreign key ${foreignKey} not found in ${child}`;
  } else if (type === '1:1' && isUnique && !hasUniqueConstraint) {
    status = 'FAIL';
    details = `1:1 relationship requires unique constraint on ${foreignKey}`;
  } else {
    details = `✅ Relationship correctly implemented`;
  }
  
  return { name, type, parent, child, foreignKey, isUnique, status, details };
}

async function main() {
  console.log('🔍 Starting Database Schema Verification...\n');
  
  await connectToDatabase();
  
  // Define all models and their collection names
  const models = [
    { model: User, name: 'users' },
    { model: Document, name: 'documents' },
    { model: Vocabulary, name: 'vocabularies' },
    { model: LearningSession, name: 'learningsessions' },
    { model: GrammarError, name: 'grammarerrors' },
    { model: Analysis, name: 'analyses' },
    { model: Assessment, name: 'assessments' },
    { model: Notification, name: 'notifications' },
    { model: UserApiKeys, name: 'userapikeys' },
    { model: UserProgress, name: 'userprogresses' }
  ];
  
  // Verify each collection
  console.log('📊 COLLECTION VERIFICATION\n');
  const results: VerificationResult[] = [];
  
  for (const { model, name } of models) {
    const result = await verifyCollection(model, name);
    results.push(result);
    
    console.log(`${result.exists ? '✅' : '❌'} ${name}`);
    console.log(`   Foreign Keys: ${result.relationships.foreignKeys.join(', ') || 'None'}`);
    console.log(`   Indexes: ${result.relationships.indexes.join(', ') || 'None'}`);
    console.log(`   Unique Constraints: ${result.relationships.uniqueConstraints.join(', ') || 'None'}`);
    console.log(`   Sample Count: ${result.sampleCount}`);
    console.log('');
  }
  
  // Check relationships
  console.log('🔗 RELATIONSHIP VERIFICATION\n');
  
  const relationshipChecks: RelationshipCheck[] = [
    // 1:1 Relationships
    checkRelationship('User ⟷ UserProgress', '1:1', 'users', 'userprogresses', 'userId', true, results),
    checkRelationship('User ⟷ UserApiKeys', '1:1', 'users', 'userapikeys', 'userId', true, results),
    
    // 1:N Relationships
    checkRelationship('User ⟷ Document', '1:N', 'users', 'documents', 'userId', false, results),
    checkRelationship('User ⟷ Vocabulary', '1:N', 'users', 'vocabularies', 'userId', false, results),
    checkRelationship('User ⟷ LearningSession', '1:N', 'users', 'learningsessions', 'userId', false, results),
    checkRelationship('User ⟷ GrammarError', '1:N', 'users', 'grammarerrors', 'userId', false, results),
    checkRelationship('User ⟷ Analysis', '1:N', 'users', 'analyses', 'userId', false, results),
    checkRelationship('User ⟷ Assessment', '1:N', 'users', 'assessments', 'userId', false, results),
    checkRelationship('User ⟷ Notification', '1:N', 'users', 'notifications', 'createdBy', false, results),
    
    // Cross Relationships
    checkRelationship('Document ⟷ Vocabulary', '1:N', 'documents', 'vocabularies', 'sourceDocument', false, results),
  ];
  
  relationshipChecks.forEach(check => {
    console.log(`${check.status === 'PASS' ? '✅' : '❌'} ${check.name} (${check.type})`);
    console.log(`   ${check.details}`);
    console.log('');
  });
  
  // Summary
  const totalCollections = results.length;
  const existingCollections = results.filter(r => r.exists).length;
  const passedRelationships = relationshipChecks.filter(r => r.status === 'PASS').length;
  const totalRelationships = relationshipChecks.length;
  
  console.log('📈 SUMMARY\n');
  console.log(`Collections: ${existingCollections}/${totalCollections} (${Math.round(existingCollections/totalCollections*100)}%)`);
  console.log(`Relationships: ${passedRelationships}/${totalRelationships} (${Math.round(passedRelationships/totalRelationships*100)}%)`);
  
  if (existingCollections === totalCollections && passedRelationships === totalRelationships) {
    console.log('\n🎉 DATABASE SCHEMA VERIFICATION: PERFECT MATCH!');
  } else {
    console.log('\n⚠️  Some issues found. Please check the details above.');
  }
  
  await mongoose.disconnect();
}

// Run the verification
if (require.main === module) {
  main().catch(console.error);
}

export { main as verifyDatabaseSchema };