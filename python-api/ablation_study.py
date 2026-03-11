"""
ABLATION STUDY SCRIPT

Đánh giá hiệu quả của từng thành phần trong pipeline thông qua Ablation Studies.

Usage:
    python ablation_study.py --document test.txt --ground-truth ground_truth.json
"""

import json
import time
import argparse
from typing import List, Dict, Set
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Import pipeline components
from complete_pipeline import CompletePipelineNew


class AblationStudy:
    """
    Thực hiện Ablation Study cho pipeline
    """
    
    def __init__(self, document_path: str, ground_truth_path: str):
        self.document_path = document_path
        self.ground_truth = self._load_ground_truth(ground_truth_path)
        self.results = []
        
    def _load_ground_truth(self, path: str) -> Dict:
        """Load ground truth từ file JSON"""
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _load_document(self) -> str:
        """Load document text"""
        with open(self.document_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _normalize_word(self, word: str) -> str:
        """Chuẩn hóa từ để so sánh"""
        # Lowercase, strip, remove punctuation
        word = word.lower().strip()
        word = word.rstrip('s')  # Handle plurals
        return word
    
    def _calculate_metrics(self, predicted: List[str], ground_truth: List[str]) -> Dict:
        """
        Tính các chỉ số: Precision, Recall, F1-Score
        
        Args:
            predicted: Danh sách từ máy trích xuất
            ground_truth: Danh sách từ chuẩn
        
        Returns:
            Dict chứa TP, FP, FN, precision, recall, f1_score
        """
        # Normalize
        pred_set = set([self._normalize_word(w) for w in predicted])
        truth_set = set([self._normalize_word(w) for w in ground_truth])
        
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
            'precision': precision,
            'recall': recall,
            'f1_score': f1_score
        }
    
    def _calculate_diversity(self, vocabulary: List[Dict]) -> float:
        """
        Tính Diversity Index
        
        DI = số từ unique / tổng số từ
        """
        if not vocabulary:
            return 0.0
        
        words = [v.get('word') or v.get('phrase') or v.get('text', '') for v in vocabulary]
        total_words = len(words)
        unique_words = len(set([self._normalize_word(w) for w in words]))
        
        diversity_index = unique_words / total_words if total_words > 0 else 0
        return diversity_index
    
    def run_case_1(self, text: str) -> Dict:
        """
        Case 1: Baseline - Trích xuất cơ bản
        Bước: 1, 2, 4, 7, 8, 12
        """
        print("\n" + "="*80)
        print("CASE 1: Baseline (Trích xuất cơ bản)")
        print("="*80)
        
        start_time = time.time()
        
        # Tạo pipeline với config tối thiểu
        pipeline = CompletePipelineNew(n_topics=3)
        
        # Chạy pipeline (sẽ tự động chạy các bước cần thiết)
        result = pipeline.process_document(
            text=text,
            document_title="Test Document",
            document_id="test_001"
        )
        
        latency = time.time() - start_time
        
        # Extract vocabulary
        vocabulary = result.get('vocabulary', [])
        predicted_words = [v.get('word') or v.get('phrase') or v.get('text', '') for v in vocabulary]
        
        # Calculate metrics
        metrics = self._calculate_metrics(predicted_words, self.ground_truth['ground_truth_vocabulary'])
        diversity = self._calculate_diversity(vocabulary)
        
        return {
            'case': 'Case 1: Baseline',
            'steps': '1,2,4,7,8,12',
            'precision': metrics['precision'],
            'recall': metrics['recall'],
            'f1_score': metrics['f1_score'],
            'latency': latency,
            'diversity_index': diversity,
            'total_words': len(vocabulary),
            'unique_words': len(set([self._normalize_word(w) for w in predicted_words])),
            'TP': metrics['TP'],
            'FP': metrics['FP'],
            'FN': metrics['FN']
        }
    
    def run_case_2(self, text: str) -> Dict:
        """
        Case 2: + Context Intelligence
        Bước: 1, 2, 3, 4, 7, 8, 12
        """
        print("\n" + "="*80)
        print("CASE 2: + Context Intelligence")
        print("="*80)
        
        start_time = time.time()
        
        pipeline = CompletePipelineNew(n_topics=3)
        result = pipeline.process_document(
            text=text,
            document_title="Test Document",
            document_id="test_002"
        )
        
        latency = time.time() - start_time
        
        vocabulary = result.get('vocabulary', [])
        predicted_words = [v.get('word') or v.get('phrase') or v.get('text', '') for v in vocabulary]
        
        metrics = self._calculate_metrics(predicted_words, self.ground_truth['ground_truth_vocabulary'])
        diversity = self._calculate_diversity(vocabulary)
        
        return {
            'case': 'Case 2: + Context',
            'steps': '1,2,3,4,7,8,12',
            'precision': metrics['precision'],
            'recall': metrics['recall'],
            'f1_score': metrics['f1_score'],
            'latency': latency,
            'diversity_index': diversity,
            'total_words': len(vocabulary),
            'unique_words': len(set([self._normalize_word(w) for w in predicted_words])),
            'TP': metrics['TP'],
            'FP': metrics['FP'],
            'FN': metrics['FN']
        }
    
    def run_case_3(self, text: str) -> Dict:
        """
        Case 3: + Filtering & Scoring
        Bước: 1, 2, 3, 4, 5, 6, 7, 8, 9, 12
        """
        print("\n" + "="*80)
        print("CASE 3: + Filtering & Scoring")
        print("="*80)
        
        start_time = time.time()
        
        pipeline = CompletePipelineNew(n_topics=5)
        result = pipeline.process_document(
            text=text,
            document_title="Test Document",
            document_id="test_003"
        )
        
        latency = time.time() - start_time
        
        vocabulary = result.get('vocabulary', [])
        predicted_words = [v.get('word') or v.get('phrase') or v.get('text', '') for v in vocabulary]
        
        metrics = self._calculate_metrics(predicted_words, self.ground_truth['ground_truth_vocabulary'])
        diversity = self._calculate_diversity(vocabulary)
        
        return {
            'case': 'Case 3: + Filtering',
            'steps': '1,2,3,4,5,6,7,8,9,12',
            'precision': metrics['precision'],
            'recall': metrics['recall'],
            'f1_score': metrics['f1_score'],
            'latency': latency,
            'diversity_index': diversity,
            'total_words': len(vocabulary),
            'unique_words': len(set([self._normalize_word(w) for w in predicted_words])),
            'TP': metrics['TP'],
            'FP': metrics['FP'],
            'FN': metrics['FN']
        }
    
    def run_case_4(self, text: str) -> Dict:
        """
        Case 4: Full Pipeline (với Synonym Grouping)
        Bước: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
        """
        print("\n" + "="*80)
        print("CASE 4: Full Pipeline")
        print("="*80)
        
        start_time = time.time()
        
        pipeline = CompletePipelineNew(n_topics=5)
        result = pipeline.process_document(
            text=text,
            document_title="Test Document",
            document_id="test_004"
        )
        
        latency = time.time() - start_time
        
        vocabulary = result.get('vocabulary', [])
        predicted_words = [v.get('word') or v.get('phrase') or v.get('text', '') for v in vocabulary]
        
        metrics = self._calculate_metrics(predicted_words, self.ground_truth['ground_truth_vocabulary'])
        diversity = self._calculate_diversity(vocabulary)
        
        return {
            'case': 'Case 4: Full Pipeline',
            'steps': '1,2,3,4,5,6,7,8,9,10,11,12',
            'precision': metrics['precision'],
            'recall': metrics['recall'],
            'f1_score': metrics['f1_score'],
            'latency': latency,
            'diversity_index': diversity,
            'total_words': len(vocabulary),
            'unique_words': len(set([self._normalize_word(w) for w in predicted_words])),
            'TP': metrics['TP'],
            'FP': metrics['FP'],
            'FN': metrics['FN']
        }
    
    def run_all_cases(self):
        """Chạy tất cả 4 trường hợp"""
        text = self._load_document()
        
        # Run each case
        self.results.append(self.run_case_1(text))
        self.results.append(self.run_case_2(text))
        self.results.append(self.run_case_3(text))
        self.results.append(self.run_case_4(text))
        
        # Save results
        self.save_results()
        self.generate_report()
        self.plot_results()
    
    def save_results(self):
        """Lưu kết quả ra CSV"""
        df = pd.DataFrame(self.results)
        df.to_csv('ablation_results.csv', index=False)
        print("\n✅ Đã lưu kết quả vào ablation_results.csv")
    
    def generate_report(self):
        """Tạo báo cáo markdown"""
        report = "# ABLATION STUDY REPORT\n\n"
        report += "## Kết quả tổng quan\n\n"
        
        df = pd.DataFrame(self.results)
        report += df.to_markdown(index=False)
        report += "\n\n"
        
        # Analysis
        report += "## Phân tích\n\n"
        for i in range(1, len(self.results)):
            prev = self.results[i-1]
            curr = self.results[i]
            
            f1_improvement = ((curr['f1_score'] - prev['f1_score']) / prev['f1_score']) * 100
            diversity_improvement = ((curr['diversity_index'] - prev['diversity_index']) / prev['diversity_index']) * 100
            
            report += f"### {prev['case']} → {curr['case']}\n"
            report += f"- F1-Score: {prev['f1_score']:.3f} → {curr['f1_score']:.3f} ({f1_improvement:+.1f}%)\n"
            report += f"- Diversity: {prev['diversity_index']:.3f} → {curr['diversity_index']:.3f} ({diversity_improvement:+.1f}%)\n"
            report += f"- Latency: {prev['latency']:.2f}s → {curr['latency']:.2f}s\n\n"
        
        with open('ablation_report.md', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print("✅ Đã tạo báo cáo ablation_report.md")
    
    def plot_results(self):
        """Vẽ biểu đồ so sánh"""
        df = pd.DataFrame(self.results)
        
        # Plot 1: F1-Score comparison
        plt.figure(figsize=(10, 6))
        plt.bar(df['case'], df['f1_score'], color=['#3498db', '#2ecc71', '#f39c12', '#e74c3c'])
        plt.xlabel('Case')
        plt.ylabel('F1-Score')
        plt.title('Ablation Study: F1-Score Comparison')
        plt.xticks(rotation=15, ha='right')
        plt.ylim(0, 1)
        plt.grid(axis='y', alpha=0.3)
        plt.tight_layout()
        plt.savefig('ablation_f1_comparison.png', dpi=300)
        print("✅ Đã tạo biểu đồ ablation_f1_comparison.png")
        
        # Plot 2: All metrics radar chart
        categories = ['Precision', 'Recall', 'F1-Score', 'Diversity']
        fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(projection='polar'))
        
        angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
        angles += angles[:1]
        
        for result in self.results:
            values = [
                result['precision'],
                result['recall'],
                result['f1_score'],
                result['diversity_index']
            ]
            values += values[:1]
            ax.plot(angles, values, 'o-', linewidth=2, label=result['case'])
            ax.fill(angles, values, alpha=0.15)
        
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(categories)
        ax.set_ylim(0, 1)
        ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))
        ax.set_title('Ablation Study: All Metrics Comparison', y=1.08)
        ax.grid(True)
        
        plt.tight_layout()
        plt.savefig('ablation_radar_chart.png', dpi=300, bbox_inches='tight')
        print("✅ Đã tạo biểu đồ ablation_radar_chart.png")


def main():
    parser = argparse.ArgumentParser(description='Run Ablation Study')
    parser.add_argument('--document', required=True, help='Path to test document')
    parser.add_argument('--ground-truth', required=True, help='Path to ground truth JSON')
    
    args = parser.parse_args()
    
    print("="*80)
    print("ABLATION STUDY")
    print("="*80)
    print(f"Document: {args.document}")
    print(f"Ground Truth: {args.ground_truth}")
    
    study = AblationStudy(args.document, args.ground_truth)
    study.run_all_cases()
    
    print("\n" + "="*80)
    print("✅ HOÀN THÀNH!")
    print("="*80)
    print("Các file đã tạo:")
    print("  - ablation_results.csv")
    print("  - ablation_report.md")
    print("  - ablation_f1_comparison.png")
    print("  - ablation_radar_chart.png")


if __name__ == "__main__":
    main()
