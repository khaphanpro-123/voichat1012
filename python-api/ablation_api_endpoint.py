"""
ABLATION STUDY API ENDPOINT - FIXED VERSION

Tự động chạy ablation study với các pipeline configurations khác nhau

Endpoint: POST /api/ablation-study

FORCE REDEPLOY: 2026-03-14 - Fixed document_id parameter issue
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import time
import numpy as np
from configurable_pipeline import create_pipeline_for_case, ABLATION_CASES

router = APIRouter()


class AblationRequest(BaseModel):
    """Request body cho ablation study"""
    document_text: str
    ground_truth_vocabulary: List[str]
    document_title: Optional[str] = "Test Document"


class AblationResponse(BaseModel):
    """Response body cho ablation study"""
    success: bool
    summary: Dict
    results: List[Dict]
    execution_time: float


def normalize_word(word: str) -> str:
    """Chuẩn hóa từ để so sánh"""
    word = word.lower().strip()
    word = word.rstrip('s')  # Handle plurals
    return word


def calculate_metrics(predicted: List[str], ground_truth: List[str]) -> Dict:
    """
    Tính các chỉ số: Precision, Recall, F1-Score
    """
    # Normalize
    pred_set = set([normalize_word(w) for w in predicted])
    truth_set = set([normalize_word(w) for w in ground_truth])
    
    # Calculate TP, FP, FN
    TP = len(pred_set.intersection(truth_set))
    FP = len(pred_set - truth_set)
    FN = len(truth_set - pred_set)
    
    # Calculate metrics
    precision = TP / (TP + FP) if (TP + FP) > 0 else 0
    recall = TP / (TP + FN) if (TP + FN) > 0 else 0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    return {
        'TP': TP,
        'FP': FP,
        'FN': FN,
        'precision': round(precision, 4),
        'recall': round(recall, 4),
        'f1_score': round(f1_score, 4)
    }


def calculate_diversity(vocabulary: List[Dict]) -> float:
    """
    Tính Diversity Index
    DI = số từ unique / tổng số từ
    """
    if not vocabulary:
        return 0.0
    
    words = [v.get('word') or v.get('phrase') or v.get('text', '') for v in vocabulary]
    total_words = len(words)
    unique_words = len(set([normalize_word(w) for w in words]))
    
    diversity_index = unique_words / total_words if total_words > 0 else 0
    return round(diversity_index, 4)


def run_pipeline_case(
    text: str,
    document_title: str,
    case_id: int
) -> Dict:
    """
    Chạy pipeline cho một case cụ thể với stages configuration khác nhau
    
    Args:
        text: Document text
        document_title: Document title
        case_id: Case number (1-4)
    
    Returns:
        Pipeline result with vocabulary and metadata
    """
    start_time = time.time()
    
    print(f"\n{'='*80}")
    print(f"RUNNING ABLATION CASE {case_id}")
    print(f"{'='*80}")
    
    try:
        # Create pipeline for specific case
        pipeline = create_pipeline_for_case(case_id)
        
        # Get case configuration
        case_config = ABLATION_CASES[case_id]
        print(f"Case: {case_config['name']}")
        print(f"Description: {case_config['description']}")
        print(f"Enabled stages: {case_config['stages']}")
        
        # Debug: Print pipeline type and method signature
        print(f"Pipeline type: {type(pipeline)}")
        print(f"Pipeline method: {pipeline.process_document}")
        
        # Process document - ONLY pass supported parameters
        print(f"Calling process_document with text and document_title only...")
        result = pipeline.process_document(
            text=text,
            document_title=document_title
        )
        
        latency = time.time() - start_time
        
        vocabulary = result.get('vocabulary', [])
        predicted_words = [
            v.get('word') or v.get('phrase') or v.get('text', '') 
            for v in vocabulary
        ]
        
        print(f"\n📊 CASE {case_id} RESULTS:")
        print(f"  Vocabulary items: {len(vocabulary)}")
        print(f"  Predicted words: {len(predicted_words)}")
        print(f"  Latency: {latency:.2f}s")
        print(f"  Enabled stages: {case_config['stages']}")
        
        return {
            'vocabulary': vocabulary,
            'predicted_words': predicted_words,
            'latency': round(latency, 2),
            'total_words': len(vocabulary),
            'case_config': case_config
        }
        
    except Exception as e:
        print(f"❌ Error in run_pipeline_case: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise e


@router.post("/ablation-study", response_model=AblationResponse)
async def run_ablation_study(request: AblationRequest):
    """
    Chạy Ablation Study tự động
    
    Request body:
    {
        "document_text": "Machine learning is...",
        "ground_truth_vocabulary": ["machine learning", "algorithm", ...],
        "document_title": "ML Basics"
    }
    
    Response:
    {
        "success": true,
        "summary": {
            "best_case": "Case 4",
            "best_f1": 0.87,
            "improvement": "19.2%"
        },
        "results": [
            {
                "case": "Case 1",
                "precision": 0.65,
                "recall": 0.82,
                "f1_score": 0.73,
                ...
            }
        ]
    }
    """
    try:
        total_start = time.time()
        
        text = request.document_text
        ground_truth = request.ground_truth_vocabulary
        title = request.document_title
        
        results = []
        
        # ====================================================================
        # CASE 1: Baseline (Steps: 1,2,4,7,8,12)
        # ====================================================================
        print("\n[CASE 1] Baseline - Trích xuất cơ bản")
        case1_result = run_pipeline_case(text, title, 1)
        
        metrics1 = calculate_metrics(case1_result['predicted_words'], ground_truth)
        diversity1 = calculate_diversity(case1_result['vocabulary'])
        
        results.append({
            'case': 'Case 1: Baseline',
            'steps': '1,2,4,7,8,12',
            'description': 'Trích xuất cơ bản - chỉ phrases',
            **metrics1,
            'latency': case1_result['latency'],
            'diversity_index': diversity1,
            'total_words': case1_result['total_words'],
            'unique_words': len(set([normalize_word(w) for w in case1_result['predicted_words']]))
        })
        
        # ====================================================================
        # CASE 2: + Context Intelligence (Steps: 1,2,3,4,7,8,12)
        # ====================================================================
        print("\n[CASE 2] + Context Intelligence")
        case2_result = run_pipeline_case(text, title, 2)
        
        metrics2 = calculate_metrics(case2_result['predicted_words'], ground_truth)
        diversity2 = calculate_diversity(case2_result['vocabulary'])
        
        results.append({
            'case': 'Case 2: + Context',
            'steps': '1,2,3,4,7,8,12',
            'description': 'Thêm phân tích ngữ cảnh',
            **metrics2,
            'latency': case2_result['latency'],
            'diversity_index': diversity2,
            'total_words': case2_result['total_words'],
            'unique_words': len(set([normalize_word(w) for w in case2_result['predicted_words']]))
        })
        
        # ====================================================================
        # CASE 3: + Filtering & Scoring (Steps: 1,2,3,4,5,6,7,8,9,12)
        # ====================================================================
        print("\n[CASE 3] + Filtering & Scoring")
        case3_result = run_pipeline_case(text, title, 3)
        
        metrics3 = calculate_metrics(case3_result['predicted_words'], ground_truth)
        diversity3 = calculate_diversity(case3_result['vocabulary'])
        
        results.append({
            'case': 'Case 3: + Filtering',
            'steps': '1,2,3,4,5,6,7,8,9,12',
            'description': 'Thêm single words và topic modeling',
            **metrics3,
            'latency': case3_result['latency'],
            'diversity_index': diversity3,
            'total_words': case3_result['total_words'],
            'unique_words': len(set([normalize_word(w) for w in case3_result['predicted_words']]))
        })
        
        # ====================================================================
        # CASE 4: Full Pipeline (Steps: 1,2,3,4,5,6,7,8,9,10,11,12)
        # ====================================================================
        print("\n[CASE 4] Full Pipeline")
        case4_result = run_pipeline_case(text, title, 4)
        
        metrics4 = calculate_metrics(case4_result['predicted_words'], ground_truth)
        diversity4 = calculate_diversity(case4_result['vocabulary'])
        
        results.append({
            'case': 'Case 4: Full Pipeline',
            'steps': '1,2,3,4,5,6,7,8,9,10,11,12',
            'description': 'Hệ thống đầy đủ với tất cả features',
            **metrics4,
            'latency': case4_result['latency'],
            'diversity_index': diversity4,
            'total_words': case4_result['total_words'],
            'unique_words': len(set([normalize_word(w) for w in case4_result['predicted_words']]))
        })
        
        # ====================================================================
        # Tính Summary
        # ====================================================================
        best_case = max(results, key=lambda x: x['f1_score'])
        baseline_f1 = results[0]['f1_score']
        best_f1 = best_case['f1_score']
        improvement = ((best_f1 - baseline_f1) / baseline_f1 * 100) if baseline_f1 > 0 else 0
        
        summary = {
            'best_case': best_case['case'],
            'best_f1': best_f1,
            'baseline_f1': baseline_f1,
            'improvement_percent': round(improvement, 2),
            'total_execution_time': round(time.time() - total_start, 2),
            'ground_truth_size': len(ground_truth)
        }
        
        # Tính improvements giữa các cases
        for i in range(1, len(results)):
            prev_f1 = results[i-1]['f1_score']
            curr_f1 = results[i]['f1_score']
            improvement = ((curr_f1 - prev_f1) / prev_f1 * 100) if prev_f1 > 0 else 0
            results[i]['improvement_from_previous'] = round(improvement, 2)
        
        return AblationResponse(
            success=True,
            summary=summary,
            results=results,
            execution_time=round(time.time() - total_start, 2)
        )
        
    except Exception as e:
        print(f"❌ Error in ablation study: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ablation-study/example")
async def get_example_request():
    """
    Trả về ví dụ request body
    """
    return {
        "example_request": {
            "document_text": "Machine learning is a subset of artificial intelligence...",
            "ground_truth_vocabulary": [
                "machine learning",
                "artificial intelligence",
                "algorithm",
                "neural network",
                "deep learning"
            ],
            "document_title": "Machine Learning Basics"
        },
        "usage": "POST /api/ablation-study with the above JSON body"
    }
