"""
STAGE 4 - Knowledge Graph Construction - Comprehensive Test Suite

Tests all components of the knowledge graph system:
1. Entity creation and management
2. Relation creation and management
3. Graph construction from STAGE 2 output
4. Semantic queries
5. Graph statistics and export
6. Persistence (save/load)
7. Complete pipeline integration

Author: AI System
Date: 2026-02-02
"""

import unittest
import json
import os
from datetime import datetime
from knowledge_graph import (
    KnowledgeGraph,
    Entity,
    Relation,
    EntityType,
    RelationType,
    DocumentEntity,
    SentenceEntity,
    VocabularyTermEntity,
    ConceptEntity,
    FeedbackEntity
)


class TestKnowledgeGraphEntities(unittest.TestCase):
    """Test entity creation and validation"""
    
    def setUp(self):
        self.kg = KnowledgeGraph()
    
    def test_document_entity_creation(self):
        """Test Document entity creation"""
        doc = DocumentEntity(
            document_id="doc_001",
            title="Machine Learning Basics",
            content="Introduction to machine learning concepts.",
            metadata={"source": "textbook.pdf", "upload_date": "2026-02-02"}
        )
        
        self.assertEqual(doc.entity_type, EntityType.DOCUMENT)
        self.assertEqual(doc.properties['title'], "Machine Learning Basics")
        self.assertEqual(doc.properties['metadata']['source'], "textbook.pdf")
    
    def test_vocabulary_term_creation(self):
        """Test VocabularyTerm entity creation"""
        term = VocabularyTermEntity(
            term_id="term_001",
            word="algorithm",
            score=0.82,
            features={"pos_tag": "NOUN", "lemma": "algorithm", "frequency": 5, "tf_idf_score": 0.85},
            context_sentence="An algorithm is a step-by-step procedure.",
            sentence_id="sent_001",
            document_id="doc_001"
        )
        
        self.assertEqual(term.entity_type, EntityType.VOCABULARY_TERM)
        self.assertEqual(term.properties['word'], "algorithm")
        self.assertEqual(term.properties['score'], 0.82)
    
    def test_sentence_entity_creation(self):
        """Test Sentence entity creation"""
        sent = SentenceEntity(
            sentence_id="sent_001",
            text="An algorithm is a step-by-step procedure.",
            position=1,
            document_id="doc_001"
        )
        
        self.assertEqual(sent.entity_type, EntityType.SENTENCE)
        self.assertEqual(sent.properties['position'], 1)
        self.assertGreater(sent.properties['word_count'], 0)
    
    def test_concept_entity_creation(self):
        """Test Concept entity creation"""
        concept = ConceptEntity(
            concept_id="concept_001",
            name="Algorithms",
            definition="Step-by-step procedures for solving problems",
            domain="Computer Science"
        )
        
        self.assertEqual(concept.entity_type, EntityType.CONCEPT)
        self.assertEqual(concept.properties['domain'], "Computer Science")


class TestKnowledgeGraphOperations(unittest.TestCase):
    """Test graph operations: add, get, query"""
    
    def setUp(self):
        self.kg = KnowledgeGraph()
    
    def test_add_and_get_entity(self):
        """Test adding and retrieving entities"""
        doc = DocumentEntity(
            document_id="doc_001",
            title="Test Document",
            content="Test content",
            metadata={"source": "test.pdf"}
        )
        
        self.kg.add_entity(doc)
        retrieved = self.kg.get_entity("doc_001")
        
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.properties['title'], "Test Document")
    
    def test_add_relation(self):
        """Test adding relations between entities"""
        term = VocabularyTermEntity(
            term_id="term_001",
            word="test",
            score=0.75,
            features={"pos_tag": "NOUN"},
            context_sentence="This is a test sentence.",
            sentence_id="sent_001",
            document_id="doc_001"
        )
        sent = SentenceEntity(
            sentence_id="sent_001",
            text="This is a test sentence.",
            position=1,
            document_id="doc_001"
        )
        
        self.kg.add_entity(term)
        self.kg.add_entity(sent)
        
        self.kg.add_relation(
            RelationType.APPEARS_IN,
            "term_001",
            "sent_001",
            properties={"position": 4}
        )
        
        # Verify relation was added
        relations = self.kg.get_relations_by_source("term_001")
        self.assertEqual(len(relations), 1)
        self.assertEqual(relations[0].target_id, "sent_001")
    
    def test_query_entities_by_type(self):
        """Test querying entities by type"""
        doc1 = DocumentEntity(document_id="doc_001", title="Doc 1", content="Content 1")
        doc2 = DocumentEntity(document_id="doc_002", title="Doc 2", content="Content 2")
        term1 = VocabularyTermEntity(
            term_id="term_001",
            word="word1",
            score=0.8,
            features={"pos_tag": "NOUN"},
            context_sentence="Test",
            sentence_id="s1",
            document_id="doc_001"
        )
        
        self.kg.add_entity(doc1)
        self.kg.add_entity(doc2)
        self.kg.add_entity(term1)
        
        docs = self.kg.get_entities_by_type(EntityType.DOCUMENT)
        terms = self.kg.get_entities_by_type(EntityType.VOCABULARY_TERM)
        
        self.assertEqual(len(docs), 2)
        self.assertEqual(len(terms), 1)


class TestGraphConstruction(unittest.TestCase):
    """Test graph construction from STAGE 2 output"""
    
    def setUp(self):
        self.kg = KnowledgeGraph()
        
        # Sample STAGE 2 output
        self.stage2_output = {
            "document_id": "doc_001",
            "document_title": "Introduction to Ontology",
            "document_content": "Ontology is a formal representation of knowledge. It defines concepts and relationships.",
            "vocabulary_contexts": [
                {
                    "word": "ontology",
                    "finalScore": 0.82,
                    "contextSentence": "Ontology is a formal representation of knowledge.",
                    "sentenceId": "sent_001",
                    "sentenceScore": 0.80,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "ontology",
                        "frequency": 2,
                        "tf_idf_score": 0.85
                    }
                },
                {
                    "word": "representation",
                    "finalScore": 0.70,
                    "contextSentence": "Ontology is a formal representation of knowledge.",
                    "sentenceId": "sent_001",
                    "sentenceScore": 0.68,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "representation",
                        "frequency": 1,
                        "tf_idf_score": 0.72
                    }
                },
                {
                    "word": "relationships",
                    "finalScore": 0.65,
                    "contextSentence": "It defines concepts and relationships.",
                    "sentenceId": "sent_002",
                    "sentenceScore": 0.63,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "relationship",
                        "frequency": 1,
                        "tf_idf_score": 0.68
                    }
                }
            ]
        }
    
    def test_construct_graph_from_stage2(self):
        """Test complete graph construction from STAGE 2 output"""
        result = self.kg.build_from_vocabulary_contexts(
            vocabulary_contexts=self.stage2_output["vocabulary_contexts"],
            document_id=self.stage2_output["document_id"],
            document_title=self.stage2_output["document_title"],
            document_content=self.stage2_output["document_content"]
        )
        
        # Verify construction success
        self.assertGreater(result["entities_created"], 0)
        self.assertGreater(result["relations_created"], 0)
        
        # Verify document entity
        doc = self.kg.get_entity("doc_001")
        self.assertIsNotNone(doc)
        self.assertEqual(doc.properties['title'], "Introduction to Ontology")
        
        # Verify vocabulary terms
        term = self.kg.get_entity("term_doc_001_ontology")
        self.assertIsNotNone(term)
        self.assertEqual(term.properties['word'], "ontology")
        self.assertEqual(term.properties['score'], 0.82)
        
        # Verify relations
        term_relations = self.kg.get_relations_by_source("term_doc_001_ontology")
        self.assertGreater(len(term_relations), 0)
    
    def test_graph_traceability(self):
        """Test that all entities can be traced back to source document"""
        self.kg.build_from_vocabulary_contexts(
            vocabulary_contexts=self.stage2_output["vocabulary_contexts"],
            document_id=self.stage2_output["document_id"],
            document_title=self.stage2_output["document_title"],
            document_content=self.stage2_output["document_content"]
        )
        
        # Get all vocabulary terms
        terms = self.kg.get_entities_by_type(EntityType.VOCABULARY_TERM)
        
        for term in terms:
            # Each term should have APPEARS_IN relation to a sentence
            relations = self.kg.get_relations_by_source(term.entity_id)
            appears_in = [r for r in relations if r.relation_type == RelationType.APPEARS_IN]
            self.assertGreater(len(appears_in), 0, f"Term {term.properties['word']} has no APPEARS_IN relation")
            
            # Each sentence should have BELONGS_TO relation to document
            sent_id = appears_in[0].target_id
            sent_relations = self.kg.get_relations_by_source(sent_id)
            belongs_to = [r for r in sent_relations if r.relation_type == RelationType.BELONGS_TO]
            self.assertGreater(len(belongs_to), 0, f"Sentence {sent_id} has no BELONGS_TO relation")


class TestSemanticQueries(unittest.TestCase):
    """Test semantic query capabilities"""
    
    def setUp(self):
        self.kg = KnowledgeGraph(storage_path="test_kg_semantic")
        
        # Build sample graph
        self.stage2_output = {
            "document_id": "doc_001",
            "document_title": "Machine Learning",
            "document_content": "Machine learning uses algorithms. Neural networks are powerful algorithms.",
            "vocabulary_contexts": [
                {
                    "word": "algorithm",
                    "finalScore": 0.78,
                    "contextSentence": "Machine learning uses algorithms.",
                    "sentenceId": "sent_001",
                    "sentenceScore": 0.75,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "algorithm",
                        "frequency": 2,
                        "tf_idf_score": 0.80
                    }
                },
                {
                    "word": "neural",
                    "finalScore": 0.72,
                    "contextSentence": "Neural networks are powerful algorithms.",
                    "sentenceId": "sent_002",
                    "sentenceScore": 0.70,
                    "features": {
                        "pos_tag": "ADJ",
                        "lemma": "neural",
                        "frequency": 1,
                        "tf_idf_score": 0.75
                    }
                }
            ]
        }
        self.kg.build_from_vocabulary_contexts(
            vocabulary_contexts=self.stage2_output["vocabulary_contexts"],
            document_id=self.stage2_output["document_id"],
            document_title=self.stage2_output["document_title"],
            document_content=self.stage2_output["document_content"]
        )
    
    def test_query_by_document(self):
        """Test querying all terms from a document"""
        result = self.kg.query_vocabulary_by_document("doc_001")
        
        self.assertGreater(len(result), 0)
        
        # Verify term structure
        term = result[0]
        self.assertIn("word", term.properties)
        self.assertIn("context_sentence", term.properties)
    
    def test_query_related_terms(self):
        """Test finding related terms (same document)"""
        term_id = "term_doc_001_algorithm"
        result = self.kg.query_related_terms(term_id)
        
        # Should find other terms in same document
        self.assertIsInstance(result, list)


class TestGraphStatistics(unittest.TestCase):
    """Test graph statistics and export"""
    
    def setUp(self):
        self.kg = KnowledgeGraph(storage_path="test_kg_stats")
        
        # Build sample graph
        stage2_output = {
            "document_id": "doc_001",
            "document_title": "Test",
            "document_content": "Test content.",
            "vocabulary_contexts": [
                {
                    "word": "test",
                    "finalScore": 0.68,
                    "contextSentence": "Test content.",
                    "sentenceId": "sent_001",
                    "sentenceScore": 0.65,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "test",
                        "frequency": 1,
                        "tf_idf_score": 0.70
                    }
                }
            ]
        }
        self.kg.build_from_vocabulary_contexts(
            vocabulary_contexts=stage2_output["vocabulary_contexts"],
            document_id=stage2_output["document_id"],
            document_title=stage2_output["document_title"],
            document_content=stage2_output["document_content"]
        )
    
    def test_get_statistics(self):
        """Test graph statistics generation"""
        stats = self.kg.get_statistics()
        
        self.assertIn("total_entities", stats)
        self.assertIn("total_relations", stats)
        self.assertIn("entities_by_type", stats)
        self.assertIn("relations_by_type", stats)
        
        self.assertGreater(stats["total_entities"], 0)
        self.assertGreater(stats["total_relations"], 0)
    
    def test_export_to_cypher(self):
        """Test Cypher export for Neo4j"""
        filepath = self.kg.export_to_cypher()
        
        self.assertTrue(os.path.exists(filepath))
        
        with open(filepath, 'r', encoding='utf-8') as f:
            cypher = f.read()
            self.assertIn("CREATE", cypher)


class TestPersistence(unittest.TestCase):
    """Test save and load functionality"""
    
    def setUp(self):
        self.kg = KnowledgeGraph(storage_path="test_kg_persist")
        self.test_dir = "test_kg_persist"
        
        # Build sample graph
        stage2_output = {
            "document_id": "doc_001",
            "document_title": "Persistence Test",
            "document_content": "Testing save and load.",
            "vocabulary_contexts": [
                {
                    "word": "persistence",
                    "finalScore": 0.73,
                    "contextSentence": "Testing save and load.",
                    "sentenceId": "sent_001",
                    "sentenceScore": 0.70,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "persistence",
                        "frequency": 1,
                        "tf_idf_score": 0.75
                    }
                }
            ]
        }
        self.kg.build_from_vocabulary_contexts(
            vocabulary_contexts=stage2_output["vocabulary_contexts"],
            document_id=stage2_output["document_id"],
            document_title=stage2_output["document_title"],
            document_content=stage2_output["document_content"]
        )
    
    def tearDown(self):
        # Clean up test files
        import shutil
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def test_save_and_load(self):
        """Test saving and loading graph"""
        # Save
        self.kg.save_graph()
        entities_file = os.path.join(self.test_dir, "entities.json")
        relations_file = os.path.join(self.test_dir, "relations.json")
        
        self.assertTrue(os.path.exists(entities_file))
        self.assertTrue(os.path.exists(relations_file))
        
        # Load into new graph
        new_kg = KnowledgeGraph(storage_path=self.test_dir)
        
        # Verify data integrity
        original_stats = self.kg.get_statistics()
        loaded_stats = new_kg.get_statistics()
        
        self.assertEqual(original_stats["total_entities"], loaded_stats["total_entities"])
        self.assertEqual(original_stats["total_relations"], loaded_stats["total_relations"])
        
        # Verify specific entity
        doc = new_kg.get_entity("doc_001")
        self.assertIsNotNone(doc)
        self.assertEqual(doc.properties['title'], "Persistence Test")


class TestCompletePipeline(unittest.TestCase):
    """Test complete STAGE 1-4 pipeline integration"""
    
    def test_realistic_document_processing(self):
        """Test processing a realistic document through the pipeline"""
        kg = KnowledgeGraph(storage_path="test_kg_pipeline")
        
        # Simulate realistic STAGE 2 output
        stage2_output = {
            "document_id": "doc_ml_intro",
            "document_title": "Introduction to Machine Learning",
            "document_content": """
            Machine learning is a subset of artificial intelligence. 
            It enables computers to learn from data without explicit programming.
            Supervised learning uses labeled datasets for training.
            Neural networks are inspired by biological neurons.
            """,
            "vocabulary_contexts": [
                {
                    "word": "machine learning",
                    "finalScore": 0.90,
                    "contextSentence": "Machine learning is a subset of artificial intelligence.",
                    "sentenceId": "sent_001",
                    "sentenceScore": 0.88,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "machine learning",
                        "frequency": 2,
                        "tf_idf_score": 0.92
                    }
                },
                {
                    "word": "artificial intelligence",
                    "finalScore": 0.85,
                    "contextSentence": "Machine learning is a subset of artificial intelligence.",
                    "sentenceId": "sent_001",
                    "sentenceScore": 0.83,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "artificial intelligence",
                        "frequency": 1,
                        "tf_idf_score": 0.88
                    }
                },
                {
                    "word": "supervised learning",
                    "finalScore": 0.80,
                    "contextSentence": "Supervised learning uses labeled datasets for training.",
                    "sentenceId": "sent_003",
                    "sentenceScore": 0.78,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "supervised learning",
                        "frequency": 1,
                        "tf_idf_score": 0.82
                    }
                },
                {
                    "word": "neural networks",
                    "finalScore": 0.76,
                    "contextSentence": "Neural networks are inspired by biological neurons.",
                    "sentenceId": "sent_004",
                    "sentenceScore": 0.74,
                    "features": {
                        "pos_tag": "NOUN",
                        "lemma": "neural network",
                        "frequency": 1,
                        "tf_idf_score": 0.78
                    }
                }
            ]
        }
        
        # Construct graph
        result = kg.build_from_vocabulary_contexts(
            vocabulary_contexts=stage2_output["vocabulary_contexts"],
            document_id=stage2_output["document_id"],
            document_title=stage2_output["document_title"],
            document_content=stage2_output["document_content"]
        )
        
        # Verify construction
        self.assertGreater(result["entities_created"], 0)
        self.assertGreater(result["relations_created"], 0)
        
        # Test semantic queries
        doc_terms = kg.query_vocabulary_by_document("doc_ml_intro")
        self.assertEqual(len(doc_terms), 4)
        
        # Test related terms
        term_id = "term_doc_ml_intro_machine_learning"
        related = kg.query_related_terms(term_id)
        self.assertIsInstance(related, list)
        
        # Test statistics
        stats = kg.get_statistics()
        self.assertGreater(stats["total_entities"], 0)
        self.assertGreater(stats["total_relations"], 0)
        
        print("\n=== PIPELINE TEST RESULTS ===")
        print(f"Entities created: {result['entities_created']}")
        print(f"Relations created: {result['relations_created']}")
        print(f"Total entities: {stats['total_entities']}")
        print(f"Total relations: {stats['total_relations']}")
        print(f"Entities by type: {stats['entities_by_type']}")
        
        # Cleanup
        import shutil
        if os.path.exists("test_kg_pipeline"):
            shutil.rmtree("test_kg_pipeline")


def run_all_tests():
    """Run all test suites and generate report"""
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestKnowledgeGraphEntities))
    suite.addTests(loader.loadTestsFromTestCase(TestKnowledgeGraphOperations))
    suite.addTests(loader.loadTestsFromTestCase(TestGraphConstruction))
    suite.addTests(loader.loadTestsFromTestCase(TestSemanticQueries))
    suite.addTests(loader.loadTestsFromTestCase(TestGraphStatistics))
    suite.addTests(loader.loadTestsFromTestCase(TestPersistence))
    suite.addTests(loader.loadTestsFromTestCase(TestCompletePipeline))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Generate summary
    print("\n" + "="*70)
    print("STAGE 4 - KNOWLEDGE GRAPH TEST SUMMARY")
    print("="*70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    print("="*70)
    
    return result


if __name__ == "__main__":
    run_all_tests()
