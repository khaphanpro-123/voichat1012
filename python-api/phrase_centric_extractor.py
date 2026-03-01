
import re
import math
import os
from typing import List, Dict, Tuple, Optional
from collections import Counter, defaultdict
import numpy as np
from rank_bm25 import BM25Okapi
# Use embedding_utils for compatibility
from embedding_utils import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk import pos_tag, word_tokenize
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize

# Import centralized logger
try:
    from utils.logger import get_logger, log_summary, log_debug
    logger = get_logger(__name__)
    USE_LOGGER = True
except ImportError:
    # Fallback if logger not available
    USE_LOGGER = False
    logger = None

# Download NLTK data if needed
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('stopwords')

# Only log initialization in INFO mode
if USE_LOGGER:
    logger.info("Using NLTK for phrase extraction (Railway-compatible)")
else:
    print("Using NLTK for phrase extraction (Railway-compatible)")
class PhraseCentricExtractor:
    def __init__(self):
        self.embedding_model = None
        self.discourse_stopwords = {
            'well', 'may', 'even', 'another', 'lot', 'instead', 'spending',
            'prefer', 'many', 'much', 'very', 'really', 'quite', 'rather',
            'however', 'moreover', 'furthermore', 'therefore', 'thus',
            'hence', 'consequently', 'accordingly', 'besides', 'meanwhile'
        }
        self.technical_whitelist = {
            'co2', 'gdp', 'dna', 'rna', 'api', 'cpu', 'gpu',
            'deforestation', 'biodiversity', 'sustainability',
            'globalization', 'urbanization', 'industrialization'
        }
    def _nltk_pos_tag(self, text: str) -> List[Tuple[str, str]]:
        tokens = word_tokenize(text)
        return pos_tag(tokens)
    def _extract_noun_phrases_nltk(self, text: str) -> List[str]:
        tokens_pos = self._nltk_pos_tag(text) 
        noun_phrases = []
        current_phrase = []
        for word, pos in tokens_pos:
            # Noun phrase pattern: optional determiner, adjectives, nouns
            if pos.startswith('NN'):  # Noun
                current_phrase.append(word)
            elif pos.startswith('JJ') and current_phrase:  # Adjective (if after noun)
                current_phrase.append(word)
            elif pos in ['DT'] and not current_phrase:  # Determiner (start of phrase)
                current_phrase.append(word)
            else:
                # End of phrase
                if len(current_phrase) >= 2:  # At least 2 words
                    noun_phrases.append(' '.join(current_phrase))
                current_phrase = []
        
        # Add last phrase
        if len(current_phrase) >= 2:
            noun_phrases.append(' '.join(current_phrase))
        
        return noun_phrases
    
    def _is_english_text(self, text: str) -> bool:
        # Count ASCII alphabetic characters
        ascii_chars = sum(1 for c in text if c.isascii() and c.isalpha())
        
        # Count non-ASCII characters (Vietnamese, Chinese, etc.)
        non_ascii_chars = sum(1 for c in text if not c.isascii() and c.isalpha())
        
        total_chars = ascii_chars + non_ascii_chars
        
        if total_chars == 0:
            return True  # No letters, assume English
        
        # If more than 30% non-ASCII, likely not English
        non_ascii_ratio = non_ascii_chars / total_chars
        
        return non_ascii_ratio < 0.3
    
    def extract_vocabulary(
        self,
        text: str,
        document_title: str = "",
        max_phrases: int = 50,
        min_phrase_length: int = 2,
        max_phrase_length: int = 5
    ) -> List[Dict]:
        print(f"{'='*80}")
        print(f"PHRASE-CENTRIC EXTRACTION")
        print(f"{'='*80}")
        # ====================================================================
        # LANGUAGE CHECK: English only
        # ====================================================================
        if not self._is_english_text(text):
            print("⚠️  WARNING: Text appears to be non-English")
            print("⚠️  This extractor is optimized for English text only")
            print("⚠️  Results may be poor or empty for other languages")
            print("")
        # ====================================================================
        # STEP 1: Sentence-Level Analysis (NO TOKENIZATION YET)
        # ====================================================================
        print("[STEP 1] Sentence-Level Analysis...")
        
        sentences = self._split_sentences(text)
        headings = self._detect_headings(text)
        if USE_LOGGER:
            log_summary(logger, "STEP_1_ANALYSIS", {
                'sentences': len(sentences),
                'headings': len(headings)
            })
        else:
            print(f"  ✓ Extracted {len(sentences)} sentences")
            print(f"  ✓ Detected {len(headings)} headings")
        
        # ====================================================================
        # STEP 2: Candidate Phrase Extraction (CRITICAL)
        # ====================================================================
        if USE_LOGGER:
            logger.info("[STEP 2] Candidate Phrase Extraction...")
        else:
            print("[STEP 2] Candidate Phrase Extraction...")
        
        candidate_phrases = self._extract_phrases(
            sentences,
            min_length=min_phrase_length,
            max_length=max_phrase_length
        )
        if USE_LOGGER:
            log_summary(logger, "CANDIDATE_PHRASES", {
                'total': len(candidate_phrases),
                'top_10': [p['phrase'] for p in candidate_phrases[:10]]
            })
            # Only log all phrases in DEBUG mode
            log_debug(logger, "All candidate phrases", candidate_phrases)
        else:
            print(f"  ✓ Extracted {len(candidate_phrases)} candidate phrases")
        
        # ====================================================================
        # STEP 3: HARD FILTERING RULES (NON-NEGOTIABLE)
        # ====================================================================
        if USE_LOGGER:
            logger.info("[STEP 3] Hard Filtering Rules...")
        else:
            print(f"[STEP 3] Hard Filtering Rules...")
        
        filtered_phrases = self._hard_filter(
            candidate_phrases,
            min_words=min_phrase_length
        )
        
        # ✅ LOG SUMMARY ONLY
        removed = len(candidate_phrases) - len(filtered_phrases)
        if USE_LOGGER:
            log_summary(logger, "HARD_FILTER", {
                'before': len(candidate_phrases),
                'after': len(filtered_phrases),
                'removed': removed,
                'top_10': [p['phrase'] for p in filtered_phrases[:10]]
            })
            log_debug(logger, "All filtered phrases", filtered_phrases)
        else:
            print(f"✓ After hard filtering: {len(filtered_phrases)} phrases")
            if removed > 0:
                print(f"  ❌ Removed {removed} phrases (discourse/template/single-word)")
        # ====================================================================
        # STEP 3.2: Phrase Lexical Specificity Filter (NEW)
        # ====================================================================
        if USE_LOGGER:
            logger.info("[STEP 3.2] Phrase Lexical Specificity Filter...")
        else:
            print(f"[STEP 3.2] Phrase Lexical Specificity Filter...")
        before_spec = len(filtered_phrases)
        
        filtered_phrases = self._phrase_lexical_specificity_filter(filtered_phrases)
        
        # ✅ LOG SUMMARY ONLY
        removed = before_spec - len(filtered_phrases)
        if USE_LOGGER:
            log_summary(logger, "SPECIFICITY_FILTER", {
                'before': before_spec,
                'after': len(filtered_phrases),
                'removed': removed,
                'top_10': [p['phrase'] for p in filtered_phrases[:10]]
            })
            log_debug(logger, "All specificity filtered phrases", filtered_phrases)
        else:
            print(f"  ✓ After specificity filter: {len(filtered_phrases)} phrases")
            if removed > 0:
                print(f"  ❌ Removed {removed} phrases (generic head nouns/templates)")
    
        # ====================================================================
        # STEP 3B: Scoring-Based Learning System (REFACTORED)
        # ====================================================================
        print(f"[STEP 3B] Scoring-Based Learning System...")
        print(f"  ℹ️  Input: {len(filtered_phrases)} phrases from linguistic filtering")
        
        # Import PhraseScorer
        from phrase_scorer import PhraseScorer
        
        # Initialize scorer with shared embedding model
        scorer = PhraseScorer(embedding_model=self.embedding_model)
        
        # 3B.1: Compute all scores (semantic, frequency, length)
        print(f"[3B.1] Computing hybrid scores (semantic + frequency + length)...")
        filtered_phrases = scorer.compute_scores(
            phrases=filtered_phrases,
            document_text=text
        )
        print(f"  ✓ Computed scores for {len(filtered_phrases)} phrases")
        
        # 3B.2: Rank phrases by final score
        print(f"[3B.2] Ranking phrases by final score...")
        filtered_phrases = scorer.rank_phrases(
            phrases=filtered_phrases,
            top_k=None  # Keep all for now, will limit later
        )
        print(f"  ✓ Ranked {len(filtered_phrases)} phrases")
        
        # 3B.3: Semantic clustering for flashcards
        print(f"[3B.3] Semantic clustering for flashcard grouping...")
        if len(filtered_phrases) >= 2:
            filtered_phrases, cluster_info = scorer.cluster_phrases(
                phrases=filtered_phrases,
                threshold=0.4,  # Cosine distance threshold
                linkage='average'
            )
            
            # Validation: Check clustering results
            cluster_check = {}
            for p in filtered_phrases:
                cid = p.get('cluster_id', 0)
                cluster_check[cid] = cluster_check.get(cid, 0) + 1
            
            print(f"\n  🔍 VALIDATION - Cluster distribution:")
            for cid in sorted(cluster_check.keys()):
                print(f"     Cluster {cid}: {cluster_check[cid]} phrases")
            
            print(f"  ✅ Created {len(cluster_info)} semantic clusters")
            
            # Store cluster info for later use
            for phrase in filtered_phrases:
                cid = phrase.get('cluster_id', 0)
                matching_cluster = next((c for c in cluster_info if c['cluster_id'] == cid), None)
                if matching_cluster:
                    phrase['semantic_theme'] = matching_cluster['semantic_theme']
                    phrase['is_cluster_representative'] = (phrase['phrase'] == matching_cluster['top_phrase'])
        else:
            print(f"  ⚠️  Too few phrases ({len(filtered_phrases)}) for clustering, skipping")
            # Assign default cluster
            for phrase in filtered_phrases:
                phrase['cluster_id'] = 0
                phrase['semantic_theme'] = 'General'
                phrase['is_cluster_representative'] = True
        
        # 3B.4: Filter by score threshold
        print(f"[3B.4] Filtering by score threshold...")
        before_filter = len(filtered_phrases)
        score_threshold = 0.3  # Keep phrases with final_score >= 0.3
        filtered_phrases = [p for p in filtered_phrases if p.get('final_score', 0) >= score_threshold]
        removed_filter = before_filter - len(filtered_phrases)
        print(f"  ✓ Kept {len(filtered_phrases)} phrases (removed {removed_filter} with score < {score_threshold})")
        
        # 3B.5: Final cleaning (remove meaningless phrases)
        print(f"[3B.5] Final cleaning - removing meaningless phrases...")
        before_final = len(filtered_phrases)
        filtered_phrases = self._final_phrase_cleaning(filtered_phrases)
        removed_final = before_final - len(filtered_phrases)
        print(f"  ✓ Kept {len(filtered_phrases)} phrases (removed {removed_final} meaningless)")
        
        print(f"STEP 3B complete: {len(filtered_phrases)} phrases after scoring-based refinement")
        
        # STEP 3.3: Phrase Rarity Filter - DISABLED
        # ====================================================================
        print(f"[STEP 3.3] Phrase Rarity Filter - SKIPPED (disabled by user)")
        print(f"  ℹ️  Keeping all {len(filtered_phrases)} phrases without IDF filtering")
        
        # ====================================================================
        # RETURN FINAL PHRASES
        # ====================================================================
        return filtered_phrases
    
    def _split_sentences(self, text: str) -> List[Dict]:
        """
        Split text into sentences using NLTK (replaces spaCy)
        Preserve sentence integrity
        """
        from nltk.tokenize import sent_tokenize
        
        # Split into sentences using NLTK
        sentences_text = sent_tokenize(text)
        
        sentences = []
        current_pos = 0
        for i, sent_text in enumerate(sentences_text):
            # Find sentence position in original text
            start = text.find(sent_text, current_pos)
            end = start + len(sent_text)
            current_pos = end
            
            sentences.append({
                'id': f'S{i}',
                'text': sent_text.strip(),
                'start': start,
                'end': end
            })
        
        return sentences
    
    def _detect_headings(self, text: str) -> List[Dict]:
        """
        Detect headings in text
        Simple rule-based approach
        """
        headings = []
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Heading patterns
            if not line:
                continue
            
            # All caps
            if line.isupper() and len(line.split()) <= 10:
                headings.append({
                    'id': f'H{len(headings)}',
                    'text': line,
                    'level': 1,
                    'position': i
                })
            
            # Title case with short length
            elif line.istitle() and len(line.split()) <= 10 and not line.endswith('.'):
                headings.append({
                    'id': f'H{len(headings)}',
                    'text': line,
                    'level': 2,
                    'position': i
                })
            
            # Markdown style
            elif line.startswith('#'):
                level = len(line) - len(line.lstrip('#'))
                text = line.lstrip('#').strip()
                headings.append({
                    'id': f'H{len(headings)}',
                    'text': text,
                    'level': level,
                    'position': i
                })
        
        return headings
    
    def _extract_phrases(
        self,
        sentences: List[Dict],
        min_length: int = 2,
        max_length: int = 5
    ) -> List[Dict]:
        phrases = []
        phrase_to_sentences = defaultdict(list)
        
        for sent_dict in sentences:
            sent_text = sent_dict['text']
            sent_id = sent_dict['id']
            
            # Extract noun phrases using NLTK
            noun_phrases = self._extract_noun_phrases_nltk(sent_text)
            
            for phrase_text in noun_phrases:
                phrase_text = phrase_text.lower().strip()
                word_count = len(phrase_text.split())
                
                # Must be multi-word
                if word_count >= min_length and word_count <= max_length:
                    phrase_to_sentences[phrase_text].append({
                        'sentence_id': sent_id,
                        'sentence_text': sent_text,
                        'phrase_type': 'noun_phrase'
                    })
            
            # Extract Adj + Noun patterns using POS tags
            tokens_pos = self._nltk_pos_tag(sent_text)
            for i in range(len(tokens_pos) - 1):
                word1, pos1 = tokens_pos[i]
                word2, pos2 = tokens_pos[i + 1]
                
                if pos1.startswith('JJ') and pos2.startswith('NN'):  # ADJ + NOUN
                    phrase_text = f"{word1} {word2}".lower()
                    word_count = len(phrase_text.split())
                    
                    if word_count >= min_length and word_count <= max_length:
                        phrase_to_sentences[phrase_text].append({
                            'sentence_id': sent_id,
                            'sentence_text': sent_text,
                            'phrase_type': 'adj_noun'
                        })
            
            # Extract Verb + Noun patterns (simplified)
            for i in range(len(tokens_pos) - 1):
                word1, pos1 = tokens_pos[i]
                word2, pos2 = tokens_pos[i + 1]
                
                if pos1.startswith('VB') and pos2.startswith('NN'):  # VERB + NOUN
                    phrase_text = f"{word1} {word2}".lower()
                    word_count = len(phrase_text.split())
                    
                    if word_count >= min_length and word_count <= max_length:
                        phrase_to_sentences[phrase_text].append({
                            'sentence_id': sent_id,
                            'sentence_text': sent_text,
                            'phrase_type': 'verb_noun'
                        })
        
        # Convert to list format
        for phrase_text, occurrences in phrase_to_sentences.items():
            phrases.append({
                'phrase': phrase_text,
                'occurrences': occurrences,
                'frequency': len(occurrences),
                'sentence_count': len(set(occ['sentence_id'] for occ in occurrences))
            })
        
        return phrases
    
    def _hard_filter(
        self,
        phrases: List[Dict],
        min_words: int = 2
    ) -> List[Dict]:
        filtered = []
        
        for phrase_dict in phrases:
            phrase = phrase_dict['phrase']
            words = phrase.split()
            
            # Rule 1: Minimum word count
            if len(words) < min_words:
                # Check technical whitelist
                if phrase.lower() not in self.technical_whitelist:
                    continue
            
            # Rule 2: Discourse stopwords
            if any(word in self.discourse_stopwords for word in words):
                continue
            
            # Rule 3: Template phrases (repeated mechanically)
            if self._is_template_phrase(phrase):
                continue
            
            # Rule 4: Must form meaningful concept
            if not self._is_meaningful_concept(phrase):
                continue
            
            # Rule 5: Remove phrases with weird characters (not a-z, A-Z, space, hyphen)
            if re.search(r'[^a-zA-Z\s\-]', phrase):
                continue
            
            # Rule 6: Remove phrases with typo patterns (repeated characters)
            has_typo = False
            for word in words:
                if len(word) > 2:
                    # Check for 3+ repeated characters (e.g., "gget")
                    for i in range(len(word) - 2):
                        if word[i] == word[i+1] == word[i+2]:
                            has_typo = True
                            break
                if has_typo:
                    break
            if has_typo:
                continue
            
            # Rule 7: Remove non-English phrases (Vietnamese detection)
            # Vietnamese has specific patterns
            vietnamese_patterns = [
                'phu', 'thoi', 'nhu', 'nha', 'cho', 'cua', 'voi', 'thi', 'den',
                'anh huong', 'moi truong', 'thu gian', 'quen toot', 'bi o nhiem',
                'khong khi', 'suc khoe', 'tam ly', 'benh tat', 'nguoi dan'
            ]
            phrase_lower = phrase.lower()
            if any(pattern in phrase_lower for pattern in vietnamese_patterns):
                continue
            
            # Rule 8: Remove overly generic phrases
            generic_verbs = ['have', 'get', 'make', 'do', 'take', 'give']
            generic_nouns = ['information', 'knowledge', 'thing', 'way', 'time', 'people']
            if len(words) == 2:
                if words[0].lower() in generic_verbs and words[1].lower() in generic_nouns:
                    continue
            
            filtered.append(phrase_dict)
        
        return filtered

    
    def _pattern_matches(self, pos_pattern: List[str], valid_patterns: List[List[str]]) -> bool:
        """
        Check if POS pattern matches any valid pattern
        """
        for valid in valid_patterns:
            if len(pos_pattern) == len(valid):
                if all(p == v or v == 'NOUN' and p == 'PROPN' for p, v in zip(pos_pattern, valid)):
                    return True
        return False
    
    def _phrase_lexical_specificity_filter(self, phrases: List[Dict]) -> List[Dict]:
        generic_head_nouns = {
            'thing', 'problem', 'way', 'result', 'solution', 'cause',
            'issue', 'matter', 'aspect', 'factor', 'element', 'point',
            'reason', 'effect', 'impact', 'influence', 'situation',
            'case', 'example', 'instance', 'type', 'kind'
        }
        discourse_templates = [
            'one of the most',
            'in modern life',
            'this problem',
            'there are many',
            'it is clear that',
            'in my opinion',
            'i think that',
            'many people',
            'these days',
            'nowadays'
        ]
        
        filtered = []
        for phrase_dict in phrases:
            phrase = phrase_dict['phrase'].lower()
            
            # Check discourse templates
            if any(template in phrase for template in discourse_templates):
                continue
            
            # Check head noun (rightmost noun) using NLTK
            tokens_pos = self._nltk_pos_tag(phrase)
            head_noun = None
            
            # Find head noun (rightmost noun)
            for word, pos in reversed(tokens_pos):
                if pos.startswith('NN'):  # Noun
                    head_noun = word.lower()
                    break
            
            if head_noun and head_noun in generic_head_nouns:
                continue
            
            filtered.append(phrase_dict)
        
        return filtered
    
    def _phrase_rarity_filter(self, phrases: List[Dict], text: str, threshold: float = 1.5) -> List[Dict]:
        # Use NLTK for sentence splitting
        sentences = sent_tokenize(text)
        sentences = [sent.lower() for sent in sentences]
        N = len(sentences)
        
        if N == 0:
            return phrases
        
        filtered = []
        for phrase_dict in phrases:
            phrase = phrase_dict['phrase'].lower()
            
            # Calculate document frequency
            df = sum(1 for sent in sentences if phrase in sent)
            
            # Calculate IDF
            if df > 0:
                idf = math.log(N / df)
            else:
                idf = 0.0
            
            phrase_dict['phrase_idf'] = idf
            
            # Keep if rare enough OR appears in multiple sentences (important)
            if idf >= threshold or df >= 2:
                filtered.append(phrase_dict)
        
        return filtered
    
    def _is_template_phrase(self, phrase: str) -> bool:
        """
        Check if phrase is a template/boilerplate
        """
        template_patterns = [
            r'^in my opinion',
            r'^i think that',
            r'^it is clear that',
            r'^there are many',
            r'^on the one hand',
            r'^on the other hand',
            r'^in conclusion',
            r'^to sum up'
        ]
        
        for pattern in template_patterns:
            if re.match(pattern, phrase.lower()):
                return True
        
        return False
    
    def _is_meaningful_concept(self, phrase: str) -> bool:
        """
        Check if phrase forms a meaningful standalone concept (NLTK version)
        """
        # Must contain at least one noun or verb
        tokens_pos = self._nltk_pos_tag(phrase)
        
        has_content_word = any(
            pos.startswith('NN') or pos.startswith('VB') or pos.startswith('JJ') or pos.startswith('NNP')
            for word, pos in tokens_pos
        )
        
        return has_content_word
    
    def _semantic_filter(
        self,
        phrases: List[Dict],
        main_heading: str,
        threshold: float = 0.15  # ✅ LOWERED from 0.3 to 0.15
    ) -> List[Dict]:
        """
        Filter phrases by semantic alignment with heading
        
        ⚠️ IMPORTANT: Threshold lowered to 0.15 to avoid over-filtering
        """
        if not main_heading:
            # No heading → keep all phrases
            print("  ⚠️  No heading found, keeping all phrases")
            return phrases
        
        # Load embedding model if not loaded
        if self.embedding_model is None:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            except:
                print("  ⚠️  Embedding model not available, skipping semantic filtering")
                return phrases
        
        # Encode heading
        heading_embedding = self.embedding_model.encode([main_heading])[0]
        
        # Encode and score phrases
        filtered = []
        for phrase_dict in phrases:
            phrase = phrase_dict['phrase']
            phrase_embedding = self.embedding_model.encode([phrase])[0]
            
            # Cosine similarity
            similarity = np.dot(heading_embedding, phrase_embedding) / (
                np.linalg.norm(heading_embedding) * np.linalg.norm(phrase_embedding)
            )
            
            phrase_dict['heading_similarity'] = float(similarity)
            
            # Keep if above threshold
            if similarity >= threshold:
                filtered.append(phrase_dict)
        
        # ✅ SAFETY CHECK: If too few phrases remain, lower threshold
        if len(filtered) < 10 and len(phrases) > 20:
            print(f"  ⚠️  Only {len(filtered)} phrases passed semantic filter")
            print(f"  ⚠️  Lowering threshold to 0.10 to keep more phrases")
            
            filtered = []
            for phrase_dict in phrases:
                if phrase_dict['heading_similarity'] >= 0.10:
                    filtered.append(phrase_dict)
        
        return filtered
        # return phrases
    def _get_main_heading(self, headings: List[Dict]) -> str:
        """
        Get main heading from list
        """
        if not headings:
            return ""
        
        # Return first level-1 heading, or first heading
        for heading in headings:
            if heading['level'] == 1:
                return heading['text']
        
        return headings[0]['text'] if headings else ""
    
    def _contrastive_scoring(
        self,
        phrases: List[Dict],
        sentences: List[Dict],
        headings: List[Dict]
    ) -> List[Dict]:
        """
        Add contrastive learning signal
        
        Positive: phrases in sentences aligned with heading
        Negative: phrases in generic/template sentences
        """
        # Identify template sentences
        template_keywords = [
            'in my opinion', 'i think', 'i believe', 'many people',
            'nowadays', 'these days', 'in conclusion', 'to sum up'
        ]
        
        for phrase_dict in phrases:
            positive_count = 0
            negative_count = 0
            
            for occurrence in phrase_dict['occurrences']:
                sent_text = occurrence['sentence_text'].lower()
                
                # Check if template sentence
                is_template = any(kw in sent_text for kw in template_keywords)
                
                if is_template:
                    negative_count += 1
                else:
                    positive_count += 1
            
            # Contrastive score
            total = positive_count + negative_count
            if total > 0:
                phrase_dict['contrastive_score'] = (positive_count - negative_count) / total
            else:
                phrase_dict['contrastive_score'] = 0.0
        
        return phrases
    
    def _frequency_coverage(
        self,
        phrases: List[Dict],
        sentences: List[Dict]
    ) -> List[Dict]:
        """
        Add frequency and coverage scores
        """
        total_sentences = len(sentences)
        
        for phrase_dict in phrases:
            # Frequency score (normalized)
            freq = phrase_dict['frequency']
            phrase_dict['frequency_score'] = min(freq / 5.0, 1.0)  # Cap at 5
            
            # Coverage score (how many different sentences)
            coverage = phrase_dict['sentence_count'] / total_sentences
            phrase_dict['coverage_score'] = coverage
        
        return phrases
    
    def _final_ranking(self, phrases: List[Dict]) -> List[Dict]:
        """
        Final ranking using weighted combination
        
        Priorities:
        1. Semantic alignment with heading (35%)
        2. Phrase completeness (25%)
        3. Contrastive score (20%)
        4. Frequency (10%)
        5. Coverage (10%)
        """
        for phrase_dict in phrases:
            # Get scores
            heading_sim = phrase_dict.get('heading_similarity', 0.5)
            contrastive = phrase_dict.get('contrastive_score', 0.0)
            frequency = phrase_dict.get('frequency_score', 0.0)
            coverage = phrase_dict.get('coverage_score', 0.0)
            
            # Phrase completeness (based on length)
            phrase_length = len(phrase_dict['phrase'].split())
            completeness = min(phrase_length / 3.0, 1.0)  # Optimal: 3 words
            
            # Weighted combination
            final_score = (
                0.35 * heading_sim +
                0.25 * completeness +
                0.20 * (contrastive + 1.0) / 2.0 +  # Normalize to [0, 1]
                0.10 * frequency +
                0.10 * coverage
            )
            
            phrase_dict['importance_score'] = final_score
            
            # Get best supporting sentence
            if phrase_dict['occurrences']:
                phrase_dict['supporting_sentence'] = phrase_dict['occurrences'][0]['sentence_text']
            else:
                phrase_dict['supporting_sentence'] = ""
        
        # Sort by importance score
        ranked = sorted(phrases, key=lambda x: x['importance_score'], reverse=True)
        
        return ranked
    
    def _validate_output(self, phrases: List[Dict]) -> Dict:
        """
        Validate output before returning
        
        Checks:
        1. At least 80% multi-word phrases
        2. No single words (except technical)
        3. Every phrase appears in document
        4. Every phrase relevant to heading
        5. Every phrase usable in academic writing
        """
        if not phrases:
            return {
                'valid': False,
                'reason': 'NO_VALID_PHRASE_FOUND',
                'multi_word_percentage': 0,
                'avg_phrase_length': 0
            }
        
        # Count multi-word phrases
        multi_word_count = sum(
            1 for p in phrases
            if len(p['phrase'].split()) >= 2
        )
        
        multi_word_percentage = (multi_word_count / len(phrases)) * 100
        
        # Average phrase length
        avg_length = np.mean([len(p['phrase'].split()) for p in phrases])
        
        # Validation
        valid = multi_word_percentage >= 80.0
        reason = "OK" if valid else f"Only {multi_word_percentage:.1f}% multi-word phrases (need ≥80%)"
        
        return {
            'valid': valid,
            'reason': reason,
            'multi_word_percentage': multi_word_percentage,
            'avg_phrase_length': avg_length
        }



    # ========================================================================
    # STEP 3B: OLD METHODS (DEPRECATED - Kept for reference only)
    # ========================================================================
    # These methods were used in the old rule-based Step 3B implementation.
    # They have been replaced by the PhraseScorer module (phrase_scorer.py)
    # which uses a hybrid scoring system with supervised learning.
    # 
    # DO NOT USE THESE METHODS - They are kept only for reference.
    # ========================================================================
    
    def _compute_tfidf_scores(self, phrases: List[Dict], text: str) -> List[Dict]:
        """
        Compute TF-IDF scores for phrases using n-grams (2-5)
        """
        # Extract all phrases
        phrase_texts = [p['phrase'] for p in phrases]
        
        if not phrase_texts:
            return phrases
        
        # Create TF-IDF vectorizer for n-grams (2-5 words)
        vectorizer = TfidfVectorizer(
            ngram_range=(2, 5),
            lowercase=True,
            token_pattern=r'\b\w+\b'
        )
        
        try:
            # Fit on document text
            vectorizer.fit([text])
            
            # Transform phrases
            tfidf_matrix = vectorizer.transform(phrase_texts)
            
            # Get max TF-IDF score for each phrase
            for i, phrase_dict in enumerate(phrases):
                if tfidf_matrix[i].nnz > 0:  # Has non-zero values
                    phrase_dict['tfidf_score'] = float(tfidf_matrix[i].max())
                else:
                    phrase_dict['tfidf_score'] = 0.0
        except:
            # Fallback: assign default scores
            for phrase_dict in phrases:
                phrase_dict['tfidf_score'] = 0.5
        
        return phrases
    
    def _compute_phrase_embeddings(self, phrases: List[Dict]) -> Tuple[List[Dict], np.ndarray]:
        """
        Compute SBERT embeddings for phrases
        Returns: (phrases, embeddings_matrix)
        """
        # Load embedding model if not loaded
        if self.embedding_model is None:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            except:
                print("  ⚠️  SBERT model not available, using fallback")
                # Return dummy embeddings
                dummy_embeddings = np.random.rand(len(phrases), 384)
                return phrases, dummy_embeddings
        
        # Extract phrase texts
        phrase_texts = [p['phrase'] for p in phrases]
        
        # Encode phrases
        embeddings = self.embedding_model.encode(phrase_texts, show_progress_bar=False)
        
        # Store embeddings in each phrase dict
        for i, phrase_dict in enumerate(phrases):
            phrase_dict['embedding'] = embeddings[i].tolist()  # Convert to list for JSON serialization
        
        return phrases, embeddings
    
    def _cluster_phrases_with_elbow(
        self, 
        phrases: List[Dict], 
        embeddings: np.ndarray,
        min_k: int = 3,
        max_k: int = 10
    ) -> Tuple[int, List[Dict]]:
        """
        Use Elbow method to find optimal K and cluster phrases
        Returns: (optimal_k, phrases_with_cluster_ids)
        """
        # DEBUG logging disabled to reduce Railway rate limit
        # print(f"  🔍 DEBUG - Clustering input:")
        # print(f"     Phrases: {len(phrases)}")
        # print(f"     Embeddings shape: {embeddings.shape}")
        print(f"     K range: {min_k} to {max_k}")
        
        if len(phrases) < min_k:
            # Too few phrases, assign all to cluster 0
            print(f"  ⚠️  Too few phrases for clustering, assigning all to cluster 0")
            for phrase_dict in phrases:
                phrase_dict['cluster_id'] = 0
                phrase_dict['cluster'] = 0
            return 1, phrases
        
        # Limit max_k to number of phrases
        max_k = min(max_k, len(phrases))
        
        # Compute inertia for different K values
        inertias = []
        k_range = range(min_k, max_k + 1)
        
        print(f"  🔍 Computing inertias for K={min_k} to {max_k}...")
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(embeddings)
            inertias.append(kmeans.inertia_)
            print(f"     K={k}: inertia={kmeans.inertia_:.2f}")
        
        # Find elbow using rate of change
        if len(inertias) >= 2:
            # Calculate rate of change
            rates = []
            for i in range(1, len(inertias)):
                rate = (inertias[i-1] - inertias[i]) / inertias[i-1]
                rates.append(rate)
            
            # Find elbow: where rate of change drops significantly
            if rates:
                # Use threshold: elbow is where rate drops below 10% of max rate
                max_rate = max(rates)
                threshold = 0.1 * max_rate
                
                optimal_idx = 0
                for i, rate in enumerate(rates):
                    if rate < threshold:
                        optimal_idx = i
                        break
                
                optimal_k = list(k_range)[optimal_idx]
                print(f"  🔍 Elbow detected at K={optimal_k} (rate threshold: {threshold:.4f})")
            else:
                optimal_k = min_k
                print(f"  ⚠️  No clear elbow, using min_k={min_k}")
        else:
            optimal_k = min_k
            print(f"  ⚠️  Not enough data points, using min_k={min_k}")
        
        # Cluster with optimal K
        print(f"  🔍 Final clustering with K={optimal_k}...")
        kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings)
        
        print(f"  🔍 Cluster labels: {set(cluster_labels)}")
        print(f"  🔍 Cluster counts: {np.bincount(cluster_labels)}")
        
        # Assign cluster IDs to phrases
        for i, phrase_dict in enumerate(phrases):
            phrase_dict['cluster_id'] = int(cluster_labels[i])
            phrase_dict['cluster'] = int(cluster_labels[i])  # Also set 'cluster' for compatibility
            phrase_dict['cluster_centroid'] = kmeans.cluster_centers_[cluster_labels[i]].tolist()
        
        # DEBUG: Print cluster distribution
        from collections import Counter
        cluster_counts = Counter(cluster_labels)
        print(f"\n  📊 CLUSTER DISTRIBUTION:")
        for cluster_id in sorted(cluster_counts.keys()):
            count = cluster_counts[cluster_id]
            print(f"     Cluster {cluster_id}: {count} phrases")
        
        return optimal_k, phrases
    
    def _select_cluster_representatives(
        self,
        phrases: List[Dict],
        embeddings: np.ndarray,
        top_k_per_cluster: int = None,  # None = keep ALL phrases
        keep_only_centroids: bool = False  # True = keep only 1 per cluster
    ) -> List[Dict]:
        """
        Select representative phrases per cluster
        - If keep_only_centroids=True: Keep ONLY the closest phrase to centroid (1 per cluster)
        - Else: Keep ALL phrases with ranking metadata
        """
        # Group phrases by cluster
        clusters = defaultdict(list)
        for i, phrase_dict in enumerate(phrases):
            cluster_id = phrase_dict.get('cluster_id', 0)
            clusters[cluster_id].append((i, phrase_dict))
        
        all_phrases = []
        
        for cluster_id, cluster_phrases in clusters.items():
            # Get centroid for this cluster
            if cluster_phrases:
                centroid = cluster_phrases[0][1].get('cluster_centroid')
                
                if centroid is not None:
                    # Calculate distance to centroid for all phrases in cluster
                    cluster_indices = [idx for idx, _ in cluster_phrases]
                    cluster_embeddings = embeddings[cluster_indices]
                    
                    # Cosine similarity to centroid
                    similarities = cosine_similarity(cluster_embeddings, [centroid]).flatten()
                    
                    # Rank phrases by similarity
                    ranked_cluster = sorted(
                        zip(cluster_phrases, similarities),
                        key=lambda x: x[1],
                        reverse=True
                    )
                    
                    if keep_only_centroids:
                        # Keep ONLY the closest phrase (centroid representative)
                        (idx, phrase_dict), sim = ranked_cluster[0]
                        phrase_dict['cluster_rank'] = 1
                        phrase_dict['centroid_similarity'] = float(sim)
                        phrase_dict['is_representative'] = True
                        all_phrases.append(phrase_dict)
                    else:
                        # Keep ALL phrases with metadata
                        for rank, ((idx, phrase_dict), sim) in enumerate(ranked_cluster, 1):
                            phrase_dict['cluster_rank'] = rank
                            phrase_dict['centroid_similarity'] = float(sim)
                            phrase_dict['is_representative'] = (rank == 1)
                            all_phrases.append(phrase_dict)
                else:
                    # No centroid, keep all without ranking
                    for idx, phrase_dict in cluster_phrases:
                        phrase_dict['cluster_rank'] = 999
                        phrase_dict['centroid_similarity'] = 0.0
                        phrase_dict['is_representative'] = False
                        all_phrases.append(phrase_dict)
        
        return all_phrases
    
    def _remove_cluster_redundancy(
        self,
        phrases: List[Dict],
        embeddings: np.ndarray,
        similarity_threshold: float = 0.90
    ) -> List[Dict]:
        """
        Remove redundant phrases within each cluster
        Keep only diverse phrases (cosine similarity < threshold)
        """
        # Group by cluster
        clusters = defaultdict(list)
        for i, phrase_dict in enumerate(phrases):
            cluster_id = phrase_dict.get('cluster_id', 0)
            clusters[cluster_id].append((i, phrase_dict))
        
        kept_phrases = []
        
        for cluster_id, cluster_phrases in clusters.items():
            if len(cluster_phrases) <= 1:
                # Keep all if only 1 phrase
                kept_phrases.extend([p for _, p in cluster_phrases])
                continue
            
            # Get embeddings for this cluster
            cluster_indices = [idx for idx, _ in cluster_phrases]
            cluster_embeddings = embeddings[cluster_indices]
            
            # Compute pairwise similarity
            similarity_matrix = cosine_similarity(cluster_embeddings)
            
            # Greedy selection: keep diverse phrases
            selected_indices = [0]  # Always keep first (closest to centroid)
            
            for i in range(1, len(cluster_phrases)):
                # Check similarity with already selected phrases
                max_sim = max(similarity_matrix[i][j] for j in selected_indices)
                
                # Keep if not too similar to any selected phrase
                if max_sim < similarity_threshold:
                    selected_indices.append(i)
            
            # Add selected phrases
            for idx in selected_indices:
                kept_phrases.append(cluster_phrases[idx][1])
        
        return kept_phrases
    
    def _final_phrase_cleaning(self, phrases: List[Dict]) -> List[Dict]:
        """
        Final cleaning step to remove:
        1. Single words (unless domain-specific)
        2. Meaningless phrases (e.g., "many people", "modern life")
        3. Grammar errors
        """
        cleaned = []
        
        # Meaningless phrase patterns
        meaningless_patterns = [
            'many people', 'some people', 'most people',
            'modern life', 'daily life', 'real life',
            'important thing', 'good thing', 'bad thing',
            'long time', 'short time', 'same time',
            'different way', 'same way', 'new way',
            'big problem', 'main reason', 'good idea',
            'first time', 'last time', 'next time',
            'young people', 'old people',
            'good example', 'bad example',
            'important role', 'key role',
            'high level', 'low level',
            'large number', 'small number',
            'take part', 'give advice', 'make decision',
            'have energy', 'big hole', 'other people'
        ]
        
        for phrase_dict in phrases:
            phrase = phrase_dict['phrase'].lower()
            words = phrase.split()
            
            # Rule 1: Remove single words (unless technical)
            if len(words) == 1:
                if phrase not in self.technical_whitelist:
                    continue
            
            # Rule 2: Remove meaningless patterns
            if phrase in meaningless_patterns:
                continue
            
            # Rule 3: Remove phrases with grammar errors
            # Check for repeated words
            if len(words) != len(set(words)):
                continue
            
            # Rule 4: Remove phrases that are too generic
            # Check if all words are common
            common_words = {'get', 'make', 'take', 'give', 'have', 'do', 'go', 'come',
                          'thing', 'way', 'time', 'people', 'life', 'work', 'day'}
            if all(word in common_words for word in words):
                continue
            
            cleaned.append(phrase_dict)
        
        return cleaned


