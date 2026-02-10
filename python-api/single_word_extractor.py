"""
STAGE 7 – Single-Word Extraction (SECONDARY PIPELINE – SONG SONG)

Mục tiêu:
- Trích từ đơn có giá trị học tập
- KHÔNG cạnh tranh với phrase
- Chỉ bổ sung những từ đơn có giá trị mà phrase không cover

Pipeline:
7.1 POS Constraint (BẮT BUỘC) - Chỉ NOUN, VERB, ADJ
7.2 Stopword & Function-word Removal
7.3 IDF-based Rarity Filter (CHỐNG TỪ QUÁ PHỔ BIẾN)
7.4 Phrase Coverage Rule (CỰC KỲ QUAN TRỌNG)
7.5 Heading-aware Semantic Filter
7.6 Lexical Specificity Check

Author: Kiro AI
Date: 2026-02-07
"""

import re
import spacy
import math
from typing import List, Dict, Set, Tuple, Optional
from collections import Counter
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    HAS_EMBEDDINGS = True
except:
    HAS_EMBEDDINGS = False
    print("⚠️  sentence-transformers not available. Semantic filtering disabled.")

# Load spaCy
try:
    nlp = spacy.load("en_core_web_sm")
except:
    import os
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")


class SingleWordExtractor:
    """
    Extract valuable single words that supplement phrases
    
    Rules:
    - Phrase > Word (always)
    - Word only supplements
    - No overlap with phrases
    - Academic value only
    """
    
    def __init__(self):
        self.nlp = nlp
        self.embedding_model = None
        
        # 7.2 Stopwords & Function words
        self.stopwords = {
            # Articles
            'the', 'a', 'an',
            # Prepositions
            'of', 'in', 'for', 'with', 'on', 'at', 'to', 'from', 'by', 'about',
            'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
            'between', 'under', 'over', 'among', 'against', 'within', 'without',
            # Conjunctions
            'and', 'or', 'but', 'nor', 'so', 'yet', 'for',
            # Auxiliary verbs
            'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
            'have', 'has', 'had', 'having',
            'do', 'does', 'did', 'doing',
            # Modal verbs
            'can', 'could', 'may', 'might', 'must', 'shall', 'should',
            'will', 'would', 'ought',
            # Pronouns
            'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'her', 'its', 'our', 'their',
            'mine', 'yours', 'hers', 'ours', 'theirs',
            'this', 'that', 'these', 'those',
            'who', 'whom', 'whose', 'which', 'what',
            # Discourse markers
            'well', 'may', 'even', 'another', 'lot', 'instead', 'spending',
            'prefer', 'many', 'much', 'very', 'really', 'quite', 'rather',
            'however', 'moreover', 'furthermore', 'therefore', 'thus',
            'hence', 'consequently', 'accordingly', 'besides', 'meanwhile'
        }
        
        # 7.3 Generic academic words (high IDF threshold needed)
        self.generic_academic = {
            'important', 'significant', 'good', 'bad', 'major', 'minor',
            'effective', 'efficient', 'different', 'similar', 'various',
            'several', 'numerous', 'multiple', 'general', 'specific',
            'particular', 'certain', 'possible', 'necessary', 'essential'
        }
        
        # 7.6 Lexical form words (rỗng nội dung)
        self.lexical_form_words = {
            'make', 'take', 'give', 'get', 'put', 'set', 'go', 'come',
            'provide', 'offer', 'present', 'show', 'indicate', 'suggest',
            'thing', 'stuff', 'way', 'manner', 'method', 'approach',
            'issue', 'problem', 'matter', 'aspect', 'factor', 'element'
        }
        
        # Technical term whitelist (allowed single words)
        self.technical_whitelist = {
            'co2', 'gdp', 'dna', 'rna', 'api', 'cpu', 'gpu', 'sql', 'html',
            'deforestation', 'biodiversity', 'sustainability', 'photosynthesis',
            'globalization', 'urbanization', 'industrialization', 'democratization',
            'algorithm', 'database', 'network', 'protocol', 'encryption',
            'metabolism', 'ecosystem', 'chromosome', 'neuron', 'antibody'
        }
    
    def extract_single_words(
        self,
        text: str,
        phrases: List[Dict],
        headings: List[Dict],
        max_words: int = 20,
        idf_threshold: float = 1.5,  # ✅ LOWERED from 2.0 to 1.5
        semantic_threshold: float = 0.2  # ✅ LOWERED from 0.3 to 0.2
    ) -> List[Dict]:
        """
        Extract valuable single words that supplement phrases
        
        NEW APPROACH: Soft filtering with Learning Value Score
        
        Args:
            text: Document text
            phrases: List of extracted phrases
            headings: List of headings
            max_words: Maximum single words to return
            idf_threshold: Minimum IDF score (for hard stopword filter only)
            semantic_threshold: Minimum heading similarity
        
        Returns:
            List of single word dictionaries
        """
        print(f"\n{'='*80}")
        print(f"SINGLE-WORD EXTRACTION (SOFT FILTERING APPROACH)")
        print(f"{'='*80}\n")
        
        # ====================================================================
        # STEP 7.1: POS Constraint (NOUN, VERB, ADJ only)
        # ====================================================================
        print("[STEP 7.1] POS Constraint...")
        
        candidate_words = self._extract_by_pos(text)
        
        print(f"  ✓ Extracted {len(candidate_words)} candidates (NOUN, VERB, ADJ)")
        
        # ====================================================================
        # STEP 7.2: Stopword & Function-word Removal (HARD FILTER)
        # ====================================================================
        print("[STEP 7.2] Stopword & Function-word Removal...")
        
        filtered_words = self._remove_stopwords(candidate_words)
        
        print(f"  ✓ After stopword removal: {len(filtered_words)} words")
        
        # ====================================================================
        # STEP 7.3: Calculate Rarity Penalty (SOFT)
        # ====================================================================
        print("[STEP 7.3] Calculate Rarity Penalty (SOFT)...")
        
        words_with_rarity = self._calculate_rarity_penalty(filtered_words, text)
        
        print(f"  ✓ Calculated rarity penalties")
        
        # ====================================================================
        # STEP 7.4: Calculate Learning Value Score (CORE LOGIC)
        # ====================================================================
        print("[STEP 7.4] Calculate Learning Value Score (CORE)...")
        
        words_with_learning_value = self._calculate_learning_value(
            words_with_rarity,
            text,
            headings
        )
        
        print(f"  ✓ Calculated learning values")
        
        # ====================================================================
        # STEP 7.5: Calculate Phrase Coverage Penalty (SOFT)
        # ====================================================================
        print("[STEP 7.5] Calculate Phrase Coverage Penalty (SOFT)...")
        
        words_with_coverage = self._calculate_phrase_coverage_penalty(
            words_with_learning_value,
            phrases
        )
        
        print(f"  ✓ Calculated phrase coverage penalties")
        
        # ====================================================================
        # STEP 7.6: Heading-aware Semantic Filter (DISABLED)
        # ====================================================================
        print("[STEP 7.6] Heading-aware Semantic Filter - DISABLED")
        
        # DISABLED: This filter is too aggressive (removes 80-90% of words)
        # main_heading = self._get_main_heading(headings)
        # if main_heading and HAS_EMBEDDINGS:
        #     semantic_words = self._semantic_filter(
        #         words_with_coverage,
        #         main_heading,
        #         threshold=semantic_threshold
        #     )
        # else:
        semantic_words = words_with_coverage  # Keep all words
        print(f"  ⚠️  Semantic filter DISABLED - keeping all {len(semantic_words)} words")
        
        # print(f"  ✓ After semantic filtering: {len(semantic_words)} words")
        
        # ====================================================================
        # STEP 7.7: Lexical Specificity Check (HARD FILTER)
        # ====================================================================
        print("[STEP 7.7] Lexical Specificity Check...")
        
        specific_words = self._lexical_specificity_check(semantic_words)
        
        print(f"  ✓ After specificity check: {len(specific_words)} words")
        
        # ====================================================================
        # STEP 7.8: Final Scoring & Ranking (NEW)
        # ====================================================================
        print("[STEP 7.8] Final Scoring & Ranking...")
        
        scored_words = self._final_scoring(specific_words)
        
        # Limit to max_words
        final_words = scored_words[:max_words]
        
        # Add supporting sentences
        for word_dict in final_words:
            if word_dict.get('sentences'):
                word_dict['supporting_sentence'] = word_dict['sentences'][0]
            else:
                word_dict['supporting_sentence'] = ""
        
        print(f"  ✓ Final output: {len(final_words)} single words")
        
        print(f"\n{'='*80}")
        print(f"SINGLE-WORD EXTRACTION COMPLETE")
        print(f"  Total candidates: {len(candidate_words)}")
        print(f"  After all filters: {len(final_words)}")
        print(f"  Reduction: {(1 - len(final_words)/len(candidate_words))*100:.1f}%")
        print(f"{'='*80}\n")
        
        return final_words
    
    def _extract_by_pos(self, text: str) -> List[Dict]:
        """
        7.1 Extract words by POS tags (NOUN, VERB, ADJ only)
        """
        doc = self.nlp(text)
        
        candidates = []
        word_freq = Counter()
        word_sentences = {}
        
        for sent in doc.sents:
            for token in sent:
                # Only NOUN, VERB, ADJ
                if token.pos_ not in ['NOUN', 'VERB', 'ADJ', 'PROPN']:
                    continue
                
                # Lemmatize
                word = token.lemma_.lower()
                
                # Skip if too short
                if len(word) < 3:
                    continue
                
                # Skip if contains numbers
                if any(c.isdigit() for c in word):
                    continue
                
                # Count frequency
                word_freq[word] += 1
                
                # Store sentence
                if word not in word_sentences:
                    word_sentences[word] = []
                word_sentences[word].append(sent.text)
        
        # Convert to list
        for word, freq in word_freq.items():
            candidates.append({
                'word': word,
                'frequency': freq,
                'sentences': word_sentences[word][:3],  # Top 3 sentences
                'pos': 'NOUN'  # Simplified, can be enhanced
            })
        
        return candidates
    
    def _remove_stopwords(self, words: List[Dict]) -> List[Dict]:
        """
        7.2 Remove stopwords and function words
        """
        filtered = []
        
        for word_dict in words:
            word = word_dict['word']
            
            # Check stopwords
            if word in self.stopwords:
                continue
            
            # Check generic academic words
            if word in self.generic_academic:
                continue
            
            # Check lexical form words
            if word in self.lexical_form_words:
                continue
            
            filtered.append(word_dict)
        
        return filtered
    
    def _calculate_rarity_penalty(
        self,
        words: List[Dict],
        text: str
    ) -> List[Dict]:
        """
        7.3 Calculate rarity penalty (SOFT - not hard DROP)
        
        High IDF (rare) → low penalty
        Low IDF (common) → high penalty
        """
        # Split into sentences
        doc = self.nlp(text)
        sentences = [sent.text.lower() for sent in doc.sents]
        N = len(sentences)
        
        # Calculate IDF for all words
        idf_scores = []
        for word_dict in words:
            word = word_dict['word']
            
            # Check technical whitelist (always low penalty)
            if word in self.technical_whitelist:
                word_dict['idf_score'] = 10.0
                word_dict['rarity_penalty'] = 0.0
                continue
            
            # Calculate document frequency
            df = sum(1 for sent in sentences if word in sent)
            
            # Calculate IDF
            if df > 0:
                idf = math.log(N / df)
            else:
                idf = 0.0
            
            word_dict['idf_score'] = idf
            idf_scores.append(idf)
        
        # Normalize IDF to [0, 1]
        if idf_scores:
            max_idf = max(idf_scores)
            
            for word_dict in words:
                if 'rarity_penalty' in word_dict:
                    continue  # Already set for whitelist
                
                idf = word_dict.get('idf_score', 0)
                normalized_idf = idf / max_idf if max_idf > 0 else 0
                
                # Rarity penalty: 1 - normalized_idf
                # Rare words (high IDF) → low penalty
                # Common words (low IDF) → high penalty
                rarity_penalty = 1.0 - normalized_idf
                word_dict['rarity_penalty'] = rarity_penalty
        else:
            # No IDF scores, set default
            for word_dict in words:
                if 'rarity_penalty' not in word_dict:
                    word_dict['rarity_penalty'] = 0.5
        
        return words
    
    def _calculate_phrase_coverage_penalty(
        self,
        words: List[Dict],
        phrases: List[Dict]
    ) -> List[Dict]:
        """
        7.5 Calculate phrase coverage penalty (SOFT - not hard DROP)
        
        Word in phrase → penalty
        But can still be kept if learning_value is high
        
        Example:
        - Phrase: "environmental learning" (score: 0.85)
        - Word: "learning" → penalty = 0.785 → likely DROP (low learning_value)
        - Word: "mitigation" → penalty = 0 → KEEP (high learning_value)
        """
        # Load embedding model if not loaded
        if self.embedding_model is None:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            except:
                print("  ⚠️  Embedding model not available, using token-based fallback")
                return self._phrase_coverage_penalty_token(words, phrases)
        
        # Build phrase token set and embeddings
        phrase_tokens = set()
        phrase_embeddings = {}
        
        for phrase_dict in phrases:
            phrase = phrase_dict.get('phrase', phrase_dict.get('word', ''))
            score = phrase_dict.get('importance_score', phrase_dict.get('finalScore', 0))
            
            if score >= 0.5:
                tokens = phrase.lower().split()
                phrase_tokens.update(tokens)
                
                # Store phrase embedding for semantic check
                phrase_embeddings[phrase] = self.embedding_model.encode([phrase])[0]
        
        # Calculate penalty for each word
        for word_dict in words:
            word = word_dict['word']
            coverage_penalty = 0.0
            
            # Check 1: Token overlap
            if word in phrase_tokens:
                coverage_penalty += 0.5  # Moderate penalty
            
            # Check 2: Semantic overlap
            if phrase_embeddings:
                word_emb = self.embedding_model.encode([word])[0]
                
                max_similarity = 0.0
                for phrase_emb in phrase_embeddings.values():
                    similarity = np.dot(word_emb, phrase_emb) / (
                        np.linalg.norm(word_emb) * np.linalg.norm(phrase_emb)
                    )
                    max_similarity = max(max_similarity, similarity)
                
                word_dict['max_phrase_similarity'] = float(max_similarity)
                
                # High similarity → penalty
                if max_similarity >= 0.7:
                    coverage_penalty += 0.3 * max_similarity
            
            word_dict['coverage_penalty'] = coverage_penalty
        
        return words
    
    def _phrase_coverage_penalty_token(
        self,
        words: List[Dict],
        phrases: List[Dict]
    ) -> List[Dict]:
        """
        Fallback: Token-based phrase coverage penalty (old method)
        Used when embedding model is not available
        """
        # Extract all phrase tokens
        phrase_tokens = set()
        
        for phrase_dict in phrases:
            phrase = phrase_dict.get('phrase', phrase_dict.get('word', ''))
            tokens = phrase.lower().split()
            
            # Only add if phrase score is high enough
            score = phrase_dict.get('importance_score', phrase_dict.get('finalScore', 0))
            
            if score >= 0.5:  # Threshold θ
                phrase_tokens.update(tokens)
        
        # Calculate penalty for each word
        for word_dict in words:
            word = word_dict['word']
            
            # Check if word is in any phrase
            if word in phrase_tokens:
                word_dict['coverage_penalty'] = 0.5  # Moderate penalty
            else:
                word_dict['coverage_penalty'] = 0.0
        
        return words
    
    def _calculate_learning_value(
        self,
        words: List[Dict],
        text: str,
        headings: List[Dict]
    ) -> List[Dict]:
        """
        7.4 Calculate learning value for each word (CORE LOGIC)
        
        Formula:
        learning_value = concreteness + domain_specificity + morphological_richness - generality_penalty
        
        Example:
        - "mitigation": 0.9 + 0.8 + 0.9 - 0.0 = 0.86 (HIGH)
        - "important": 0.2 + 0.3 + 0.7 - 0.8 = 0.24 (LOW)
        """
        for word_dict in words:
            word = word_dict['word']
            
            # Components
            concreteness = self._calculate_concreteness(word)
            domain_spec = self._calculate_domain_specificity(word, headings)
            morph_rich = self._calculate_morphological_richness(word)
            generality_pen = self._calculate_generality_penalty(word)
            
            # Combined score (weighted)
            learning_value = (
                concreteness * 0.3 +
                domain_spec * 0.3 +
                morph_rich * 0.2 -
                generality_pen * 0.2
            )
            
            word_dict['learning_value'] = learning_value
            word_dict['concreteness'] = concreteness
            word_dict['domain_specificity'] = domain_spec
            word_dict['morphological_richness'] = morph_rich
            word_dict['generality_penalty'] = generality_pen
        
        return words
    
    def _calculate_concreteness(self, word: str) -> float:
        """
        Calculate concreteness score
        
        Concrete words are easier to learn and more valuable
        
        HIGH: mitigation, algorithm, photosynthesis (0.8-1.0)
        MEDIUM: learning, education, development (0.4-0.7)
        LOW: impact, important, significant (0.1-0.3)
        """
        # Check if word has specific meaning
        doc = self.nlp(word)
        if not doc:
            return 0.5
        
        token = doc[0]
        
        # 1. Technical terms (in whitelist) → very concrete
        if word in self.technical_whitelist:
            return 1.0
        
        # 2. Longer words tend to be more specific
        length_score = min(len(word) / 15.0, 1.0)
        
        # 3. Words with specific POS patterns
        if token.pos_ == 'NOUN' and len(word) > 6:
            return 0.8
        
        # 4. Generic words → low concreteness
        generic_words = {
            'impact', 'effect', 'result', 'cause',
            'important', 'significant', 'major', 'minor',
            'good', 'bad', 'big', 'small'
        }
        if word in generic_words:
            return 0.2
        
        return length_score
    
    def _calculate_domain_specificity(self, word: str, headings: List[Dict]) -> float:
        """
        Calculate domain specificity
        
        Domain-specific words are valuable for learning
        
        HIGH: photosynthesis (in biology doc) (0.8-1.0)
        MEDIUM: learning, education (0.4-0.7)
        LOW: problem, issue, thing (0.1-0.3)
        """
        # Check if word appears in headings
        heading_texts = ' '.join([h.get('text', '') for h in headings]).lower()
        
        if word in heading_texts:
            return 1.0
        
        # Check semantic similarity with headings
        if self.embedding_model and headings:
            main_heading = headings[0].get('text', '') if headings else ''
            if main_heading:
                try:
                    word_emb = self.embedding_model.encode([word])[0]
                    heading_emb = self.embedding_model.encode([main_heading])[0]
                    
                    similarity = np.dot(word_emb, heading_emb) / (
                        np.linalg.norm(word_emb) * np.linalg.norm(heading_emb)
                    )
                    return float(similarity)
                except:
                    pass
        
        return 0.5
    
    def _calculate_morphological_richness(self, word: str) -> float:
        """
        Calculate morphological richness
        
        Words with rich morphology are valuable for learning
        
        HIGH: mitigation (mitigate + -tion) (0.8-1.0)
        MEDIUM: learning (learn + -ing) (0.4-0.7)
        LOW: impact (simple) (0.1-0.3)
        """
        # Count syllables (proxy for morphological complexity)
        syllables = len(re.findall(r'[aeiou]+', word.lower()))
        
        # Check for common valuable suffixes
        valuable_suffixes = [
            'tion', 'sion', 'ment', 'ness', 'ity',
            'ance', 'ence', 'ism', 'ology', 'graphy',
            'able', 'ible', 'ful', 'less', 'ous'
        ]
        
        has_valuable_suffix = any(word.endswith(suffix) for suffix in valuable_suffixes)
        
        if has_valuable_suffix:
            return 0.9
        elif syllables >= 3:
            return 0.7
        elif syllables == 2:
            return 0.5
        else:
            return 0.3
    
    def _calculate_generality_penalty(self, word: str) -> float:
        """
        Calculate generality penalty
        
        Generic words get penalty
        
        HIGH PENALTY: important, significant, good (0.7-0.9)
        MEDIUM PENALTY: impact, effect, result (0.4-0.6)
        LOW PENALTY: mitigation, algorithm (0.0-0.2)
        """
        generic_words = {
            'important': 0.8,
            'significant': 0.8,
            'major': 0.7,
            'minor': 0.7,
            'good': 0.9,
            'bad': 0.9,
            'big': 0.8,
            'small': 0.8,
            'large': 0.7,
            'great': 0.8,
            'impact': 0.6,
            'effect': 0.6,
            'result': 0.5,
            'cause': 0.5,
            'reason': 0.5,
            'factor': 0.6
        }
        
        return generic_words.get(word, 0.0)
    
    def _semantic_filter(
        self,
        words: List[Dict],
        main_heading: str,
        threshold: float = 0.1
    ) -> List[Dict]:
        """
        7.5 Heading-aware semantic filter
        
        Only keep words semantically aligned with heading
        """
        # Load embedding model if not loaded
        if self.embedding_model is None:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            except:
                return words
        
        # Encode heading
        heading_embedding = self.embedding_model.encode([main_heading])[0]
        
        # Filter words
        filtered = []
        
        for word_dict in words:
            # ✅ FIX: Ensure word_dict is a dictionary
            if isinstance(word_dict, str):
                # Skip if it's a string (shouldn't happen, but defensive)
                continue
            
            word = word_dict.get('word', '')
            
            # Encode word
            word_embedding = self.embedding_model.encode([word])[0]
            
            # Cosine similarity
            similarity = np.dot(heading_embedding, word_embedding) / (
                np.linalg.norm(heading_embedding) * np.linalg.norm(word_embedding)
            )
            
            word_dict['heading_similarity'] = float(similarity)
            
            # Keep if above threshold
            if similarity >= threshold:
                filtered.append(word_dict)
        
        return filtered
    
    def _lexical_specificity_check(self, words: List[Dict]) -> List[Dict]:
        """
        7.6 Lexical specificity check
        
        Remove words that are:
        - Too generic (make, take, provide)
        - Academic form words (important, necessary)
        - Already filtered in 7.2, but double-check
        """
        filtered = []
        
        for word_dict in words:
            word = word_dict['word']
            
            # Check lexical form words (again)
            if word in self.lexical_form_words:
                continue
            
            # Check generic academic (again)
            if word in self.generic_academic:
                continue
            
            # Check if word has specific meaning
            # Heuristic: words with multiple syllables are more specific
            syllable_count = len(re.findall(r'[aeiou]+', word))
            
            if syllable_count >= 2:  # At least 2 syllables
                filtered.append(word_dict)
            elif word in self.technical_whitelist:
                filtered.append(word_dict)
        
        return filtered
    
    def _get_main_heading(self, headings: List[Dict]) -> str:
        """
        Get main heading from list
        """
        if not headings:
            return ""
        
        # Return first level-1 heading, or first heading
        for heading in headings:
            if heading.get('level') == 1:
                return heading.get('text', '')
        
        return headings[0].get('text', '') if headings else ""
    
    def _final_scoring(self, words: List[Dict]) -> List[Dict]:
        """
        Calculate final score for each word
        
        final_score = learning_value - penalties
        
        Where:
        - learning_value: core metric (concreteness + domain + morphology - generality)
        - penalties: rarity_penalty * 0.2 + coverage_penalty * 0.5
        
        Example:
        - "mitigation": 0.86 - (0.1*0.2 + 0*0.5) = 0.84 → KEEP
        - "important": 0.24 - (0.6*0.2 + 0*0.5) = 0.12 → DROP
        - "learning" (in phrase): 0.53 - (0.3*0.2 + 0.785*0.5) = 0.08 → DROP
        """
        for word_dict in words:
            learning_value = word_dict.get('learning_value', 0.5)
            rarity_penalty = word_dict.get('rarity_penalty', 0.0)
            coverage_penalty = word_dict.get('coverage_penalty', 0.0)
            
            # Weights
            weight_rarity = 0.2
            weight_coverage = 0.5
            
            # Final score
            final_score = learning_value - (
                rarity_penalty * weight_rarity +
                coverage_penalty * weight_coverage
            )
            
            word_dict['final_score'] = final_score
            word_dict['importance_score'] = final_score  # For compatibility
        
        # Sort by final score
        words.sort(key=lambda x: x['final_score'], reverse=True)
        
        return words


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING SINGLE-WORD EXTRACTOR (SOFT FILTERING)")
    print("=" * 80)
    
    test_text = """
# Climate Change and Environmental Protection

Climate change is one of the most pressing issues facing humanity today. 
The burning of fossil fuels releases greenhouse gases into the atmosphere, 
leading to global warming and extreme weather events.

Deforestation contributes significantly to environmental degradation. 
Photosynthesis is essential for carbon dioxide absorption. Biodiversity 
loss threatens ecosystem stability. Mitigation strategies are crucial.

## Solutions

Sustainability requires renewable energy adoption. Urbanization must be 
managed carefully. Industrialization should prioritize environmental protection.
The impact of climate change is significant and requires immediate action.
"""
    
    # Mock phrases (from Stage 4)
    test_phrases = [
        {'phrase': 'climate change', 'importance_score': 0.95},
        {'phrase': 'environmental protection', 'importance_score': 0.90},
        {'phrase': 'fossil fuels', 'importance_score': 0.85},
        {'phrase': 'greenhouse gases', 'importance_score': 0.85},
        {'phrase': 'global warming', 'importance_score': 0.80},
        {'phrase': 'renewable energy', 'importance_score': 0.80},
        {'phrase': 'environmental degradation', 'importance_score': 0.75}
    ]
    
    # Mock headings
    test_headings = [
        {'level': 1, 'text': 'Climate Change and Environmental Protection'},
        {'level': 2, 'text': 'Solutions'}
    ]
    
    # Initialize extractor
    extractor = SingleWordExtractor()
    
    # Extract single words
    result = extractor.extract_single_words(
        text=test_text,
        phrases=test_phrases,
        headings=test_headings,
        max_words=10
    )
    
    print("\n📊 EXTRACTED SINGLE WORDS (WITH SOFT FILTERING):")
    print("-" * 80)
    for i, word in enumerate(result, 1):
        print(f"\n{i}. {word['word']}")
        print(f"   Final Score: {word.get('final_score', 0):.3f}")
        print(f"   Learning Value: {word.get('learning_value', 0):.3f}")
        print(f"     - Concreteness: {word.get('concreteness', 0):.3f}")
        print(f"     - Domain Specificity: {word.get('domain_specificity', 0):.3f}")
        print(f"     - Morphological Richness: {word.get('morphological_richness', 0):.3f}")
        print(f"     - Generality Penalty: {word.get('generality_penalty', 0):.3f}")
        print(f"   Penalties:")
        print(f"     - Rarity Penalty: {word.get('rarity_penalty', 0):.3f}")
        print(f"     - Coverage Penalty: {word.get('coverage_penalty', 0):.3f}")
        print(f"   IDF: {word.get('idf_score', 0):.3f}")
        print(f"   Frequency: {word.get('frequency', 0)}")
        if word.get('supporting_sentence'):
            print(f"   Example: {word.get('supporting_sentence', '')[:80]}...")
    
    print("\n✅ Test completed!")

