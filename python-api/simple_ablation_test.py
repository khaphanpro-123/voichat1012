import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))
def test_basic_import():
    """Test basic imports"""
    try:
        from ablation_study_runner import AblationStudyRunner, MetricsCalculator
        print(" Successfully imported AblationStudyRunner and MetricsCalculator")
        return True
    except ImportError as e:
        print(f" Import failed: {e}")
        return False

def test_metrics_calculator():
    """Test MetricsCalculator"""
    try:
        from ablation_study_runner import MetricsCalculator
        
        # Test metrics calculation
        predicted = ["machine learning", "artificial intelligence", "neural network"]
        ground_truth = ["machine learning", "deep learning", "neural network"]
        
        metrics = MetricsCalculator.calculate_metrics(predicted, ground_truth)
        
        print(f"   Metrics test:")
        print(f"   Predicted: {predicted}")
        print(f"   Ground truth: {ground_truth}")
        print(f"   Precision: {metrics['precision']}")
        print(f"   Recall: {metrics['recall']}")
        print(f"   F1-Score: {metrics['f1_score']}")
        
        return True
    except Exception as e:
        print(f" MetricsCalculator test failed: {e}")
        return False

def test_ablation_runner():
    """Test AblationStudyRunner"""
    try:
        from ablation_study_runner import AblationStudyRunner
        
        # Create runner
        runner = AblationStudyRunner()
        
        # Add test document
        runner.add_document(
            document_id="test1",
            title="Test Document",
            text="Machine learning is a subset of artificial intelligence.",
            ground_truth_vocabulary=["machine learning", "artificial intelligence"]
        )
        
        print(f" AblationStudyRunner created and document added")
        print(f"   Documents: {len(runner.documents)}")
        
        return True
    except Exception as e:
        print(f" AblationStudyRunner test failed: {e}")
        return False

def test_modular_pipeline():
    """Test modular pipeline availability"""
    try:
        from modular_semantic_pipeline import ABLATION_CONFIGURATIONS, create_pipeline_for_configuration
        
        print(f" Modular pipeline available")
        print(f"   Configurations: {list(ABLATION_CONFIGURATIONS.keys())}")
        
        # Test creating a pipeline
        pipeline = create_pipeline_for_configuration('V1_Baseline')
        print(f"    Created V1_Baseline pipeline")
        print(f"   Enabled modules: {pipeline.enabled_modules}")
        
        return True
    except ImportError as e:
        print(f" Modular pipeline not available: {e}")
        return False
    except Exception as e:
        print(f" Modular pipeline test failed: {e}")
        return False

def main():
    """Run all tests"""
    print(" SIMPLE ABLATION STUDY TEST")
    print("="*50)
    
    tests = [
        ("Basic Import", test_basic_import),
        ("MetricsCalculator", test_metrics_calculator),
        ("AblationStudyRunner", test_ablation_runner),
        ("Modular Pipeline", test_modular_pipeline)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n Testing {test_name}...")
        try:
            if test_func():
                passed += 1
                print(f"    {test_name} PASSED")
            else:
                print(f"    {test_name} FAILED")
        except Exception as e:
            print(f"    {test_name} ERROR: {e}")
    
    print(f"\n{'='*50}")
    print(f" RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print(" ALL TESTS PASSED!")
        return True
    else:
        print(" Some tests failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)