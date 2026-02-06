"""
STAGE 3 – Learning Feedback Loop (Pseudo-Training)

Mục tiêu:
- Thu thập phản hồi từ người học (keep/drop/star)
- Điều chỉnh trọng số ensemble động dựa trên phản hồi
- Cải thiện chất lượng trích xuất từ vựng theo thời gian
- Không sử dụng supervised ML training

Pipeline:
1. Thu thập phản hồi người dùng
2. Lưu vào Feedback Memory
3. Phân tích pattern phản hồi
4. Điều chỉnh trọng số ensemble
5. Áp dụng trọng số mới cho tài liệu sau
"""

import json
import os
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from collections import defaultdict
import numpy as np

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class VocabularyFeedback:
    """Phản hồi của người dùng về từ vựng"""
    feedback_id: str
    word: str
    document_id: str
    user_id: str
    
    # Điểm số từ các thuật toán
    scores: Dict[str, float]  # {tfidf, frequency, yake, rake}
    final_score: float
    
    # Hành động của người dùng
    user_action: str  # "keep", "drop", "star"
    
    # Metadata
    timestamp: str
    weights_used: Dict[str, float]  # Trọng số đã dùng khi trích xuất


@dataclass
class EnsembleWeights:
    """Trọng số ensemble"""
    tfidf: float
    frequency: float
    yake: float
    rake: float
    
    # Metadata
    version: int
    updated_at: str
    feedback_count: int
    
    def normalize(self):
        """Normalize weights to sum to 1.0"""
        total = self.tfidf + self.frequency + self.yake + self.rake
        if total > 0:
            self.tfidf /= total
            self.frequency /= total
            self.yake /= total
            self.rake /= total
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary for ensemble extractor"""
        return {
            'tfidf': self.tfidf,
            'frequency': self.frequency,
            'yake': self.yake,
            'rake': self.rake
        }


# ============================================================================
# BƯỚC 3.1 – THU THẬP PHẢN HỒI NGƯỜI DÙNG
# ============================================================================

class FeedbackCollector:
    """Thu thập và lưu phản hồi người dùng"""
    
    def __init__(self, storage_path: str = "feedback_data"):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
    
    def collect_feedback(
        self,
        word: str,
        document_id: str,
        user_id: str,
        scores: Dict[str, float],
        final_score: float,
        user_action: str,
        weights_used: Dict[str, float]
    ) -> VocabularyFeedback:
        """
        Thu thập phản hồi từ người dùng
        
        Args:
            word: Từ vựng
            document_id: ID tài liệu
            user_id: ID người dùng
            scores: Điểm từ các thuật toán {tfidf, frequency, yake, rake}
            final_score: Điểm tổng hợp
            user_action: "keep", "drop", hoặc "star"
            weights_used: Trọng số đã dùng
        
        Returns:
            VocabularyFeedback object
        """
        feedback_id = f"fb_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        feedback = VocabularyFeedback(
            feedback_id=feedback_id,
            word=word,
            document_id=document_id,
            user_id=user_id,
            scores=scores,
            final_score=final_score,
            user_action=user_action,
            timestamp=datetime.now().isoformat(),
            weights_used=weights_used
        )
        
        # Lưu vào file
        self._save_feedback(feedback)
        
        print(f"[Feedback] Collected: {word} → {user_action}")
        return feedback
    
    def _save_feedback(self, feedback: VocabularyFeedback):
        """Lưu feedback vào file JSON"""
        filepath = os.path.join(
            self.storage_path,
            f"{feedback.feedback_id}.json"
        )
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(asdict(feedback), f, ensure_ascii=False, indent=2)


# ============================================================================
# BƯỚC 3.2 – TỔ CHỨC KHO PHẢN HỒI (FEEDBACK MEMORY)
# ============================================================================

class FeedbackMemory:
    """Quản lý bộ nhớ phản hồi"""
    
    def __init__(self, storage_path: str = "feedback_data"):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)
    
    def load_all_feedback(self) -> List[VocabularyFeedback]:
        """Load tất cả feedback từ storage"""
        feedbacks = []
        
        if not os.path.exists(self.storage_path):
            return feedbacks
        
        for filename in os.listdir(self.storage_path):
            if filename.endswith('.json') and filename.startswith('fb_'):
                filepath = os.path.join(self.storage_path, filename)
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        feedback = VocabularyFeedback(**data)
                        feedbacks.append(feedback)
                except Exception as e:
                    print(f"[Warning] Failed to load {filename}: {e}")
        
        return feedbacks
    
    def get_feedback_by_user(self, user_id: str) -> List[VocabularyFeedback]:
        """Lấy feedback của một user cụ thể"""
        all_feedback = self.load_all_feedback()
        return [fb for fb in all_feedback if fb.user_id == user_id]
    
    def get_feedback_by_action(self, action: str) -> List[VocabularyFeedback]:
        """Lấy feedback theo action (keep/drop/star)"""
        all_feedback = self.load_all_feedback()
        return [fb for fb in all_feedback if fb.user_action == action]
    
    def get_statistics(self) -> Dict:
        """Thống kê feedback"""
        all_feedback = self.load_all_feedback()
        
        if not all_feedback:
            return {
                'total': 0,
                'keep': 0,
                'drop': 0,
                'star': 0
            }
        
        stats = {
            'total': len(all_feedback),
            'keep': sum(1 for fb in all_feedback if fb.user_action == 'keep'),
            'drop': sum(1 for fb in all_feedback if fb.user_action == 'drop'),
            'star': sum(1 for fb in all_feedback if fb.user_action == 'star')
        }
        
        return stats


# ============================================================================
# BƯỚC 3.3 – PHÂN TÍCH PHẢN HỒI (CORE LOGIC)
# ============================================================================

class FeedbackAnalyzer:
    """Phân tích pattern từ feedback để điều chỉnh trọng số"""
    
    def __init__(self):
        self.methods = ['tfidf', 'frequency', 'yake', 'rake']
    
    def analyze_feedback(
        self,
        feedbacks: List[VocabularyFeedback]
    ) -> Dict[str, Dict[str, float]]:
        """
        Phân tích feedback để xác định thuật toán nào đóng góp tích cực
        
        Returns:
            {
                'keep': {method: avg_score},
                'drop': {method: avg_score}
            }
        """
        if not feedbacks:
            return {'keep': {}, 'drop': {}}
        
        # Tách feedback theo action
        keep_feedbacks = [fb for fb in feedbacks if fb.user_action == 'keep']
        drop_feedbacks = [fb for fb in feedbacks if fb.user_action == 'drop']
        
        # Tính điểm trung bình của mỗi method cho keep/drop
        keep_scores = self._calculate_average_scores(keep_feedbacks)
        drop_scores = self._calculate_average_scores(drop_feedbacks)
        
        print(f"[Analysis] Keep feedbacks: {len(keep_feedbacks)}")
        print(f"[Analysis] Drop feedbacks: {len(drop_feedbacks)}")
        print(f"[Analysis] Keep scores: {keep_scores}")
        print(f"[Analysis] Drop scores: {drop_scores}")
        
        return {
            'keep': keep_scores,
            'drop': drop_scores
        }
    
    def _calculate_average_scores(
        self,
        feedbacks: List[VocabularyFeedback]
    ) -> Dict[str, float]:
        """Tính điểm trung bình của mỗi method"""
        if not feedbacks:
            return {method: 0.0 for method in self.methods}
        
        method_scores = defaultdict(list)
        
        for feedback in feedbacks:
            for method in self.methods:
                if method in feedback.scores:
                    method_scores[method].append(feedback.scores[method])
        
        # Tính trung bình
        avg_scores = {}
        for method in self.methods:
            if method_scores[method]:
                avg_scores[method] = np.mean(method_scores[method])
            else:
                avg_scores[method] = 0.0
        
        return avg_scores
    
    def identify_positive_methods(
        self,
        analysis: Dict[str, Dict[str, float]]
    ) -> List[str]:
        """
        Xác định methods nào đóng góp tích cực
        
        Logic:
        - Method có điểm cao trong keep và thấp trong drop → tích cực
        """
        keep_scores = analysis['keep']
        drop_scores = analysis['drop']
        
        positive_methods = []
        
        for method in self.methods:
            keep_score = keep_scores.get(method, 0)
            drop_score = drop_scores.get(method, 0)
            
            # Method tốt: keep_score cao, drop_score thấp
            if keep_score > drop_score:
                positive_methods.append(method)
        
        return positive_methods
    
    def identify_negative_methods(
        self,
        analysis: Dict[str, Dict[str, float]]
    ) -> List[str]:
        """
        Xác định methods nào gây nhiễu
        
        Logic:
        - Method có điểm cao trong drop và thấp trong keep → gây nhiễu
        """
        keep_scores = analysis['keep']
        drop_scores = analysis['drop']
        
        negative_methods = []
        
        for method in self.methods:
            keep_score = keep_scores.get(method, 0)
            drop_score = drop_scores.get(method, 0)
            
            # Method xấu: drop_score cao, keep_score thấp
            if drop_score > keep_score:
                negative_methods.append(method)
        
        return negative_methods


# ============================================================================
# BƯỚC 3.4 – ĐIỀU CHỈNH TRỌNG SỐ (PSEUDO-TRAINING)
# ============================================================================

class WeightAdjuster:
    """Điều chỉnh trọng số ensemble dựa trên feedback"""
    
    def __init__(
        self,
        learning_rate: float = 0.1,
        weights_file: str = "ensemble_weights.json"
    ):
        self.learning_rate = learning_rate
        self.weights_file = weights_file
        self.current_weights = self._load_weights()
    
    def _load_weights(self) -> EnsembleWeights:
        """Load trọng số hiện tại"""
        if os.path.exists(self.weights_file):
            try:
                with open(self.weights_file, 'r') as f:
                    data = json.load(f)
                    return EnsembleWeights(**data)
            except Exception as e:
                print(f"[Warning] Failed to load weights: {e}")
        
        # Default weights
        return EnsembleWeights(
            tfidf=0.25,
            frequency=0.25,
            yake=0.25,
            rake=0.25,
            version=0,
            updated_at=datetime.now().isoformat(),
            feedback_count=0
        )
    
    def _save_weights(self, weights: EnsembleWeights):
        """Lưu trọng số"""
        with open(self.weights_file, 'w') as f:
            json.dump(asdict(weights), f, indent=2)
        
        print(f"[Weights] Saved version {weights.version}")
    
    def adjust_weights(
        self,
        analysis: Dict[str, Dict[str, float]],
        feedback_count: int
    ) -> EnsembleWeights:
        """
        Điều chỉnh trọng số dựa trên phân tích feedback
        
        Logic:
        - Tăng trọng số của methods có điểm cao trong keep
        - Giảm trọng số của methods có điểm cao trong drop
        
        Args:
            analysis: Kết quả phân tích từ FeedbackAnalyzer
            feedback_count: Số lượng feedback đã xử lý
        
        Returns:
            EnsembleWeights mới
        """
        keep_scores = analysis['keep']
        drop_scores = analysis['drop']
        
        # Copy weights hiện tại
        new_weights = EnsembleWeights(
            tfidf=self.current_weights.tfidf,
            frequency=self.current_weights.frequency,
            yake=self.current_weights.yake,
            rake=self.current_weights.rake,
            version=self.current_weights.version + 1,
            updated_at=datetime.now().isoformat(),
            feedback_count=feedback_count
        )
        
        # Điều chỉnh từng method
        for method in ['tfidf', 'frequency', 'yake', 'rake']:
            keep_score = keep_scores.get(method, 0)
            drop_score = drop_scores.get(method, 0)
            
            # Tính delta: positive nếu method tốt, negative nếu method xấu
            delta = (keep_score - drop_score) * self.learning_rate
            
            # Cập nhật weight
            current_weight = getattr(new_weights, method)
            new_weight = max(0.05, current_weight + delta)  # Min weight = 0.05
            setattr(new_weights, method, new_weight)
            
            print(f"[Adjust] {method}: {current_weight:.3f} → {new_weight:.3f} (Δ={delta:.3f})")
        
        # Normalize weights
        new_weights.normalize()
        
        # Lưu weights
        self._save_weights(new_weights)
        self.current_weights = new_weights
        
        return new_weights
    
    def get_current_weights(self) -> EnsembleWeights:
        """Lấy trọng số hiện tại"""
        return self.current_weights


# ============================================================================
# BƯỚC 3.5 & 3.6 – MAIN FEEDBACK LOOP
# ============================================================================

class FeedbackLoop:
    """Main class quản lý toàn bộ feedback loop"""
    
    def __init__(
        self,
        storage_path: str = "feedback_data",
        learning_rate: float = 0.1
    ):
        self.collector = FeedbackCollector(storage_path)
        self.memory = FeedbackMemory(storage_path)
        self.analyzer = FeedbackAnalyzer()
        self.adjuster = WeightAdjuster(learning_rate)
    
    def process_feedback(
        self,
        word: str,
        document_id: str,
        user_id: str,
        scores: Dict[str, float],
        final_score: float,
        user_action: str
    ) -> Dict:
        """
        Xử lý một feedback mới
        
        Returns:
            {
                'feedback_saved': bool,
                'weights_updated': bool,
                'new_weights': dict,
                'explanation': str
            }
        """
        # Bước 1: Thu thập feedback
        current_weights = self.adjuster.get_current_weights()
        
        feedback = self.collector.collect_feedback(
            word=word,
            document_id=document_id,
            user_id=user_id,
            scores=scores,
            final_score=final_score,
            user_action=user_action,
            weights_used=current_weights.to_dict()
        )
        
        # Bước 2: Kiểm tra xem có đủ feedback để update weights chưa
        stats = self.memory.get_statistics()
        
        # Update weights sau mỗi 10 feedbacks
        should_update = stats['total'] % 10 == 0 and stats['total'] > 0
        
        result = {
            'feedback_saved': True,
            'weights_updated': False,
            'new_weights': current_weights.to_dict(),
            'explanation': f"Feedback saved. Total: {stats['total']}"
        }
        
        if should_update:
            # Bước 3: Phân tích feedback
            all_feedbacks = self.memory.load_all_feedback()
            analysis = self.analyzer.analyze_feedback(all_feedbacks)
            
            # Bước 4: Điều chỉnh trọng số
            new_weights = self.adjuster.adjust_weights(analysis, stats['total'])
            
            # Bước 5: Tạo explanation
            explanation = self._generate_explanation(
                current_weights,
                new_weights,
                analysis
            )
            
            result['weights_updated'] = True
            result['new_weights'] = new_weights.to_dict()
            result['explanation'] = explanation
        
        return result
    
    def _generate_explanation(
        self,
        old_weights: EnsembleWeights,
        new_weights: EnsembleWeights,
        analysis: Dict
    ) -> str:
        """Tạo explanation cho việc thay đổi trọng số"""
        explanations = []
        
        for method in ['tfidf', 'frequency', 'yake', 'rake']:
            old_w = getattr(old_weights, method)
            new_w = getattr(new_weights, method)
            
            if abs(new_w - old_w) > 0.01:
                keep_score = analysis['keep'].get(method, 0)
                drop_score = analysis['drop'].get(method, 0)
                
                if new_w > old_w:
                    explanations.append(
                        f"{method.upper()}: tăng {old_w:.3f}→{new_w:.3f} "
                        f"(keep={keep_score:.2f} > drop={drop_score:.2f})"
                    )
                else:
                    explanations.append(
                        f"{method.upper()}: giảm {old_w:.3f}→{new_w:.3f} "
                        f"(drop={drop_score:.2f} > keep={keep_score:.2f})"
                    )
        
        if not explanations:
            return "Trọng số không thay đổi đáng kể."
        
        return "Điều chỉnh trọng số: " + "; ".join(explanations)
    
    def get_current_weights(self) -> Dict[str, float]:
        """Lấy trọng số hiện tại để dùng cho extraction"""
        weights = self.adjuster.get_current_weights()
        return weights.to_dict()
    
    def get_statistics(self) -> Dict:
        """Lấy thống kê feedback"""
        stats = self.memory.get_statistics()
        weights = self.adjuster.get_current_weights()
        
        return {
            'feedback_stats': stats,
            'current_weights': weights.to_dict(),
            'weights_version': weights.version,
            'last_updated': weights.updated_at
        }


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING STAGE 3 - Learning Feedback Loop")
    print("=" * 80)
    
    # Initialize feedback loop
    loop = FeedbackLoop(storage_path="test_feedback_data", learning_rate=0.1)
    
    # Simulate user feedback
    test_feedbacks = [
        # Words with high TF-IDF → keep
        {
            'word': 'ontology',
            'scores': {'tfidf': 0.9, 'frequency': 0.3, 'yake': 0.7, 'rake': 0.6},
            'final_score': 0.85,
            'action': 'keep'
        },
        {
            'word': 'semantic',
            'scores': {'tfidf': 0.85, 'frequency': 0.4, 'yake': 0.75, 'rake': 0.65},
            'final_score': 0.82,
            'action': 'keep'
        },
        # Words with high frequency but low meaning → drop
        {
            'word': 'the',
            'scores': {'tfidf': 0.1, 'frequency': 0.95, 'yake': 0.2, 'rake': 0.15},
            'final_score': 0.45,
            'action': 'drop'
        },
        {
            'word': 'and',
            'scores': {'tfidf': 0.05, 'frequency': 0.9, 'yake': 0.1, 'rake': 0.1},
            'final_score': 0.4,
            'action': 'drop'
        },
    ]
    
    print("\n📊 Processing feedback...")
    for i, fb in enumerate(test_feedbacks, 1):
        print(f"\n--- Feedback {i} ---")
        result = loop.process_feedback(
            word=fb['word'],
            document_id='doc_test',
            user_id='user_test',
            scores=fb['scores'],
            final_score=fb['final_score'],
            user_action=fb['action']
        )
        
        print(f"Word: {fb['word']} → {fb['action']}")
        print(f"Weights updated: {result['weights_updated']}")
        if result['weights_updated']:
            print(f"Explanation: {result['explanation']}")
    
    # Get final statistics
    print("\n" + "=" * 80)
    print("📈 FINAL STATISTICS")
    print("=" * 80)
    stats = loop.get_statistics()
    print(f"\nFeedback stats: {stats['feedback_stats']}")
    print(f"\nCurrent weights:")
    for method, weight in stats['current_weights'].items():
        print(f"  {method}: {weight:.3f}")
    print(f"\nWeights version: {stats['weights_version']}")
    
    print("\n✅ Test completed!")
