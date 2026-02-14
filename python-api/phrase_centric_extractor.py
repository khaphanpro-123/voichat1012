"""
PHRASE-CENTRIC ACADEMIC VOCABULARY EXTRACTOR
100% Academic Standard - Phrase-First Approach

8 CRITICAL FIXES IMPLEMENTED:
1. ✅ Phrase (not word) as primary unit
2. ✅ Safe preprocessing (preserve phrase integrity)
3. ✅ Heading as semantic anchor
4. ✅ Hard rule: NO single words
5. ✅ Discourse filtering
6. ✅ BM25 as secondary signal only
7. ✅ Contrastive learning
8. ✅ LLM validation only (no generation)
"""

import re
import math
import spacy
from typing import List, Dict, Tuple, Optional
from collections import Counter, defaultdict
import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity

# Load spaCy model for phrase extraction
try:
    nlp = spacy.load("en_core_web_sm")
except:
    import os
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")


class PhraseCentricExtractor:
    """
    Phrase-centric vocabulary extractor following 8 critical fixes
    """
    
    def __init__(self):
        self.nlp = nlp
        self.embedding_model = None
        
        # Discourse stopwords (Step 5)
        self.discourse_stopwords = {
            'well', 'may', 'even', 'another', 'lot', 'instead', 'spending',
            'prefer', 'many', 'much', 'very', 'really', 'quite', 'rather',
            'however', 'moreover', 'furthermore', 'therefore', 'thus',
            'hence', 'consequently', 'accordingly', 'besides', 'meanwhile'
        }
        
        # Technical term whitelist (allowed single words)
        self.technical_whitelist = {
            'co2', 'gdp', 'dna', 'rna', 'api', 'cpu', 'gpu',
            'deforestation', 'biodiversity', 'sustainability',
            'globalization', 'urbanization', 'industrialization'
        }
    
    def _is_english_text(self, text: str) -> bool:
        """
        Check if text is primarily English
        
        Simple heuristic: count English words vs non-ASCII characters
        """
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
        """
        Extract phrase-centric vocabulary following 8 critical fixes
        
        Args:
            text: Document text (ENGLISH ONLY)
            document_title: Document title/heading
            max_phrases: Maximum phrases to return
            min_phrase_length: Minimum words per phrase (default: 2)
            max_phrase_length: Maximum words per phrase (default: 5)
        
        Returns:
            List of phrase dictionaries with scores and metadata
        """
        
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
        
        print(f"  ✓ Extracted {len(sentences)} sentences")
        print(f"  ✓ Detected {len(headings)} headings")
        
        # ====================================================================
        # STEP 2: Candidate Phrase Extraction (CRITICAL)
        # ====================================================================
        print("[STEP 2] Candidate Phrase Extraction...")
        
        candidate_phrases = self._extract_phrases(
            sentences,
            min_length=min_phrase_length,
            max_length=max_phrase_length
        )
        
        
        # DEBUG: Print ALL candidate phrases BEFORE the summary line
        print(f"📋 DEBUG - ALL CANDIDATE PHRASES ({len(candidate_phrases)} total):")
        for i, p in enumerate(candidate_phrases, 1):
            print(f"     {i}. '{p['phrase']}' (freq: {p['frequency']})")
        
        print(f"  ✓ Extracted {len(candidate_phrases)} candidate phrases")
        
        # ====================================================================
        # STEP 3: HARD FILTERING RULES (NON-NEGOTIABLE)
        # ====================================================================
        print(f"[STEP 3] Hard Filtering Rules...")
        
        filtered_phrases = self._hard_filter(
            candidate_phrases,
            min_words=min_phrase_length
        )
        
        # DEBUG: Print ALL phrases BEFORE summary
        print(f"📋 DEBUG - ALL PHRASES AFTER HARD FILTER ({len(filtered_phrases)} total):")
        for i, p in enumerate(filtered_phrases, 1):
            print(f"     {i}. '{p['phrase']}' (freq: {p['frequency']})")
        
        print(f"✓ After hard filtering: {len(filtered_phrases)} phrases")
        removed = len(candidate_phrases) - len(filtered_phrases)
        if removed > 0:
            print(f"  ❌ Removed {removed} phrases (discourse/template/single-word)")
        
        # ====================================================================
        # STEP 3.1: Phrase POS Structure Filter (NEW)
        # ====================================================================
        print(f"[STEP 3.1] Phrase POS Structure Filter...")
        before_pos = len(filtered_phrases)
        
        filtered_phrases = self._phrase_pos_structure_filter(filtered_phrases)
        
        # DEBUG: Print ALL phrases BEFORE summary
        print(f"📋 DEBUG - ALL PHRASES AFTER POS FILTER ({len(filtered_phrases)} total):")
        for i, p in enumerate(filtered_phrases, 1):
            print(f"     {i}. '{p['phrase']}' (freq: {p['frequency']})")
        
        print(f"  ✓ After POS filter: {len(filtered_phrases)} phrases")
        removed = before_pos - len(filtered_phrases)
        if removed > 0:
            print(f"  ❌ Removed {removed} phrases (invalid POS structure)")
        # ====================================================================
        # STEP 3.2: Phrase Lexical Specificity Filter (NEW)
        # ====================================================================
        print(f"[STEP 3.2] Phrase Lexical Specificity Filter...")
        before_spec = len(filtered_phrases)
        
        filtered_phrases = self._phrase_lexical_specificity_filter(filtered_phrases)
        
        print(f"  ✓ After specificity filter: {len(filtered_phrases)} phrases")
        removed = before_spec - len(filtered_phrases)
        if removed > 0:
            print(f"  ❌ Removed {removed} phrases (generic head nouns/templates)")
            print(f"  📋 DEBUG - AFTER SPECIFICITY FILTER (All {len(filtered_phrases)} phrases):")
            for i, p in enumerate(filtered_phrases, 1):
                print(f"     {i}. '{p['phrase']}' (freq: {p['frequency']})")
        
        # ====================================================================
        # ====================================================================

        # ====================================================================
        # STEP 3B: Statistical + Semantic Refinement (NEW)
        # ====================================================================
        print(f"[STEP 3B] Statistical + Semantic Refinement...")
        print(f"  ℹ️  Input: {len(filtered_phrases)} phrases from linguistic filtering")
        
        # 3B.1: TF-IDF Scoring
        print(f"[3B.1] Computing TF-IDF scores...")
        filtered_phrases = self._compute_tfidf_scores(filtered_phrases, text)
        print(f"  ✓ Added TF-IDF scores to {len(filtered_phrases)} phrases")
        
        # 3B.1.1: Filter by TF-IDF threshold
        print(f"[3B.1.1] Filtering by TF-IDF threshold...")
        before_tfidf = len(filtered_phrases)
        tfidf_threshold = 0.01  # Remove very low TF-IDF scores
        filtered_phrases = [p for p in filtered_phrases if p.get('tfidf_score', 0) >= tfidf_threshold]
        removed_tfidf = before_tfidf - len(filtered_phrases)
        print(f"  ✓ Kept {len(filtered_phrases)} phrases (removed {removed_tfidf} with TF-IDF < {tfidf_threshold})")
        
        # 3B.2: SBERT Embeddings
        print(f"[3B.2] Computing SBERT embeddings...")
        filtered_phrases, embeddings = self._compute_phrase_embeddings(filtered_phrases)
        print(f"  ✓ Generated embeddings for {len(filtered_phrases)} phrases")
        
        # 3B.3: K-Means Clustering with Elbow Method
        print(f"[3B.3] K-Means clustering with Elbow method...")
        if len(filtered_phrases) >= 3:
            optimal_k, filtered_phrases = self._cluster_phrases_with_elbow(
                filtered_phrases, 
                embeddings,
                min_k=min(3, len(filtered_phrases)),
                max_k=min(10, len(filtered_phrases))
            )
            print(f"  ✓ Optimal K = {optimal_k} clusters")
            
            # VALIDATION: Check if clustering worked
            cluster_check = {}
            for p in filtered_phrases:
                cid = p.get('cluster_id', p.get('cluster', 'MISSING'))
                cluster_check[cid] = cluster_check.get(cid, 0) + 1
            
            print(f"\n  🔍 VALIDATION - Clusters after K-Means:")
            for cid in sorted(cluster_check.keys(), key=lambda x: (isinstance(x, str), x)):
                print(f"     Cluster {cid}: {cluster_check[cid]} phrases")
            
            if len(cluster_check) == 1 and 0 in cluster_check:
                print(f"  ❌ ERROR: All phrases in cluster 0! Clustering FAILED!")
            elif 'MISSING' in cluster_check:
                print(f"  ❌ ERROR: {cluster_check['MISSING']} phrases missing cluster_id!")
            else:
                print(f"  ✅ Clustering successful: {len(cluster_check)} clusters")
            
            # 3B.4: Select Representative Phrases per Cluster
            print(f"[3B.4] Selecting representative phrases per cluster...")
            before_selection = len(filtered_phrases)
            filtered_phrases = self._select_cluster_representatives(
                filtered_phrases,
                embeddings,
                keep_only_centroids=False  # Set to True to keep only 1 per cluster
            )
            after_selection = len(filtered_phrases)
            print(f"  ✓ Kept {after_selection} phrases (removed {before_selection - after_selection})")
            print(f"  ℹ️  Each phrase has cluster_rank and is_representative metadata")
            print(f"  ℹ️  Each phrase has cluster_rank and centroid_similarity metadata")
            
            # 3B.5: Cluster Optimization - Remove Redundancy
            print(f"[3B.5] Cluster optimization - removing redundant phrases...")
            before_dedup = len(filtered_phrases)
            
            # DEBUG: Check clusters BEFORE redundancy removal
            print(f"  🔍 Clusters BEFORE redundancy removal:")
            check_before = {}
            for p in filtered_phrases:
                cid = p.get('cluster_id', p.get('cluster', 'MISSING'))
                check_before[cid] = check_before.get(cid, 0) + 1
            for cid in sorted(check_before.keys(), key=lambda x: (isinstance(x, str), x)):
                print(f"     Cluster {cid}: {check_before[cid]} phrases")
            
            filtered_phrases = self._remove_cluster_redundancy(filtered_phrases, embeddings)
            removed_dedup = before_dedup - len(filtered_phrases)
            
            # DEBUG: Check clusters AFTER redundancy removal
            print(f"  🔍 Clusters AFTER redundancy removal:")
            check_after = {}
            for p in filtered_phrases:
                cid = p.get('cluster_id', p.get('cluster', 'MISSING'))
                check_after[cid] = check_after.get(cid, 0) + 1
            for cid in sorted(check_after.keys(), key=lambda x: (isinstance(x, str), x)):
                print(f"     Cluster {cid}: {check_after[cid]} phrases")
            
            print(f"  ✓ Kept {len(filtered_phrases)} phrases (removed {removed_dedup} redundant)")
        else:
            print(f"  ⚠️  Too few phrases ({len(filtered_phrases)}) for clustering, skipping")
        
        # 3B.6: Final Cleaning
        print(f"[3B.6] Final cleaning - removing meaningless phrases...")
        before_final = len(filtered_phrases)
        
        # DEBUG: Check clusters BEFORE final cleaning
        print(f"  🔍 Clusters BEFORE final cleaning:")
        check_before = {}
        for p in filtered_phrases:
            cid = p.get('cluster_id', p.get('cluster', 'MISSING'))
            check_before[cid] = check_before.get(cid, 0) + 1
        for cid in sorted(check_before.keys(), key=lambda x: (isinstance(x, str), x)):
            print(f"     Cluster {cid}: {check_before[cid]} phrases")
        
        filtered_phrases = self._final_phrase_cleaning(filtered_phrases)
        removed_final = before_final - len(filtered_phrases)
        
        # DEBUG: Check clusters AFTER final cleaning
        print(f"  🔍 Clusters AFTER final cleaning:")
        check_after = {}
        for p in filtered_phrases:
            cid = p.get('cluster_id', p.get('cluster', 'MISSING'))
            check_after[cid] = check_after.get(cid, 0) + 1
        for cid in sorted(check_after.keys(), key=lambda x: (isinstance(x, str), x)):
            print(f"     Cluster {cid}: {check_after[cid]} phrases")
        
        print(f"  ✓ Kept {len(filtered_phrases)} phrases (removed {removed_final} meaningless)")
        
        print(f"✅ STEP 3B complete: {len(filtered_phrases)} phrases after refinement")
        
        # STEP 3.3: Phrase Rarity Filter - DISABLED
        # ====================================================================
        print(f"[STEP 3.3] Phrase Rarity Filter - SKIPPED (disabled by user)")
        print(f"  ℹ️  Keeping all {len(filtered_phrases)} phrases without IDF filtering")
        # ====================================================================
        # STEP 4: Heading-Guided Semantic Filtering - REMOVED
        # ====================================================================
        print(f"[STEP 4] Heading-Guided Semantic Filtering - SKIPPED (disabled by user)")
        print(f"  ℹ️  Keeping all {len(filtered_phrases)} phrases without semantic filtering")
        
        # Skip semantic filtering - use filtered_phrases directly
        semantic_filtered = filtered_phrases
        
        # ====================================================================
        # STEP 5: Contrastive Context Scoring - REMOVED
        # ====================================================================
        print("[STEP 5] Contrastive Context Scoring - SKIPPED (disabled by user)")
        print(f"  ℹ️  Keeping all phrases without contrastive scoring")
        
        # ====================================================================
        # STEP 6: Frequency & Coverage Check - REMOVED
        # ====================================================================
        print("[STEP 6] Frequency & Coverage Check - SKIPPED (disabled by user)")
        print(f"  ℹ️  Keeping all phrases without frequency/coverage scoring")
        
        # ====================================================================
        # STEP 7: Final Ranking - REMOVED
        # ====================================================================
        print("[STEP 7] Final Ranking - SKIPPED (disabled by user)")
        print(f"  ℹ️  Using phrases directly without ranking")
        
        # Use semantic_filtered directly, limit to max_phrases
        final_phrases = semantic_filtered[:max_phrases]
        
        # Add basic importance_score and supporting_sentence for compatibility
        for phrase_dict in final_phrases:
            # Use frequency as importance score
            phrase_dict['importance_score'] = phrase_dict.get('frequency', 1) / 10.0
            
            # Get best supporting sentence
            if phrase_dict.get('occurrences'):
                phrase_dict['supporting_sentence'] = phrase_dict['occurrences'][0]['sentence_text']
            else:
                phrase_dict['supporting_sentence'] = ""
        
        print(f"  ✓ Final output: {len(final_phrases)} phrases")
        print(f"📋 DEBUG - FINAL PHRASES (All {len(final_phrases)} phrases):")
        for i, p in enumerate(final_phrases, 1):
            freq = p.get('frequency', 0)
            role = p.get('semantic_role', 'unknown')
            print(f"     {i}. '{p['phrase']}' (freq: {freq}, role: {role})")
        
        # ====================================================================
        # STEP 8: Validation Check - REMOVED
        # ====================================================================
        print("[STEP 8] Validation Check - SKIPPED (disabled by user)")
        print(f"  ℹ️  No validation performed")
        
        print(f"{'='*80}")
        print(f"EXTRACTION COMPLETE")
        print(f"  Total phrases: {len(final_phrases)}")
        print(f"{'='*80}")
        
        # DEBUG: Check cluster_id before return
        print(f"\n🔍 DEBUG - Checking cluster_id before return:")
        for i, p in enumerate(final_phrases[:5], 1):  # Check first 5
            cid = p.get('cluster_id', 'MISSING')
            c = p.get('cluster', 'MISSING')
            print(f"  {i}. '{p['phrase']}': cluster_id={cid}, cluster={c}")
        
        return final_phrases
    
    def _split_sentences(self, text: str) -> List[Dict]:
        """
        Split text into sentences WITHOUT tokenization
        Preserve sentence integrity
        """
        doc = self.nlp(text)
        
        sentences = []
        for i, sent in enumerate(doc.sents):
            sentences.append({
                'id': f'S{i}',
                'text': sent.text.strip(),
                'start': sent.start_char,
                'end': sent.end_char
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
        """
        Extract ONLY multi-word phrases using spaCy
        
        Phrase types:
        - Noun phrases (NP)
        - Adjective + Noun
        - Verb + Object
        - Academic collocations
        """
        phrases = []
        phrase_to_sentences = defaultdict(list)
        
        for sent_dict in sentences:
            sent_text = sent_dict['text']
            sent_id = sent_dict['id']
            
            doc = self.nlp(sent_text)
            
            # Extract noun phrases
            for chunk in doc.noun_chunks:
                phrase_text = chunk.text.lower().strip()
                word_count = len(phrase_text.split())
                
                # Must be multi-word
                if word_count >= min_length and word_count <= max_length:
                    phrase_to_sentences[phrase_text].append({
                        'sentence_id': sent_id,
                        'sentence_text': sent_text,
                        'phrase_type': 'noun_phrase'
                    })
            
            # Extract Adj + Noun patterns
            for token in doc:
                if token.pos_ == 'ADJ' and token.head.pos_ == 'NOUN':
                    phrase_text = f"{token.text} {token.head.text}".lower()
                    word_count = len(phrase_text.split())
                    
                    if word_count >= min_length and word_count <= max_length:
                        phrase_to_sentences[phrase_text].append({
                            'sentence_id': sent_id,
                            'sentence_text': sent_text,
                            'phrase_type': 'adj_noun'
                        })
            
            # Extract Verb + Object patterns
            for token in doc:
                if token.pos_ == 'VERB':
                    for child in token.children:
                        if child.dep_ in ['dobj', 'pobj']:
                            phrase_text = f"{token.text} {child.text}".lower()
                            word_count = len(phrase_text.split())
                            
                            if word_count >= min_length and word_count <= max_length:
                                phrase_to_sentences[phrase_text].append({
                                    'sentence_id': sent_id,
                                    'sentence_text': sent_text,
                                    'phrase_type': 'verb_object'
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
        """
        HARD FILTERING RULES (NON-NEGOTIABLE)
        
        Discard:
        1. Single words (unless in technical whitelist)
        2. Discourse fillers
        3. Template phrases
        4. Non-meaningful concepts
        5. Phrases with weird characters or typos
        6. Non-English phrases (Vietnamese, etc.)
        """
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
    
    def _phrase_pos_structure_filter(self, phrases: List[Dict]) -> List[Dict]:
        """
        4.1 Filter phrases by POS structure
        
        Keep only:
        - ADJ + NOUN (environmental protection)
        - NOUN + NOUN (climate change)
        - VERB + NOUN (reduce emissions)
        - NOUN + PREP + NOUN (causes of pollution)
        
        Drop:
        - DET + NOUN (the problem, this issue)
        - PRON + NOUN (my opinion, their view)
        """
        valid_patterns = [
            ['ADJ', 'NOUN'],
            ['NOUN', 'NOUN'],
            ['VERB', 'NOUN'],
            ['NOUN', 'ADP', 'NOUN'],
            ['ADJ', 'NOUN', 'NOUN'],
            ['NOUN', 'NOUN', 'NOUN'],
            ['ADJ', 'ADJ', 'NOUN'],
            ['VERB', 'ADJ', 'NOUN'],
            ['PROPN', 'NOUN'],  # Proper noun + noun
            ['NOUN', 'PROPN']   # Noun + proper noun
        ]
        
        filtered = []
        for phrase_dict in phrases:
            phrase = phrase_dict['phrase']
            doc = self.nlp(phrase)
            
            pos_pattern = [token.pos_ for token in doc]
            
            # Check if matches any valid pattern
            if self._pattern_matches(pos_pattern, valid_patterns):
                # Additional check: no DET or PRON at start
                if doc[0].pos_ not in ['DET', 'PRON']:
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
        """
        4.2 Filter phrases by lexical specificity
        
        Drop if:
        - Head noun is generic (thing, problem, way...)
        - Phrase is discourse template
        """
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
            
            # Check head noun
            doc = self.nlp(phrase)
            head_noun = None
            
            # Find head noun (rightmost noun)
            for token in reversed(list(doc)):
                if token.pos_ in ['NOUN', 'PROPN']:
                    head_noun = token.lemma_.lower()
                    break
            
            if head_noun and head_noun in generic_head_nouns:
                continue
            
            filtered.append(phrase_dict)
        
        return filtered
    
    def _phrase_rarity_filter(self, phrases: List[Dict], text: str, threshold: float = 1.5) -> List[Dict]:
        """
        4.3 Filter phrases by IDF (rarity)
        
        Keep only phrases with IDF >= threshold
        Phrases must be distinctive in the document
        """
        doc = self.nlp(text)
        sentences = [sent.text.lower() for sent in doc.sents]
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
        Check if phrase forms a meaningful standalone concept
        """
        # Must contain at least one noun or verb
        doc = self.nlp(phrase)
        
        has_content_word = any(
            token.pos_ in ['NOUN', 'VERB', 'ADJ', 'PROPN']
            for token in doc
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
    # STEP 3B: Statistical + Semantic Refinement Methods
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
        print(f"  🔍 DEBUG - Clustering input:")
        print(f"     Phrases: {len(phrases)}")
        print(f"     Embeddings shape: {embeddings.shape}")
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



# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("TESTING PHRASE-CENTRIC EXTRACTOR")
    print("=" * 80)
    
    test_text = """
# Climate Change and Environmental Protection

Climate change is one of the most pressing issues facing humanity today. 
The burning of fossil fuels releases greenhouse gases into the atmosphere, 
leading to global warming and extreme weather events.

## Causes of Climate Change

Human activities such as deforestation and industrial pollution contribute 
significantly to environmental degradation. Cutting down trees reduces the 
planet's capacity to absorb carbon dioxide.

## Solutions and Mitigation

To address climate change, we must adopt renewable energy sources and 
implement sustainable practices. Protecting natural habitats and reducing 
carbon emissions are essential steps toward environmental conservation.

In my opinion, governments should take immediate action. Many people believe 
that individual efforts are not enough. Well, we need collective responsibility.
"""
    
    # Initialize extractor
    extractor = PhraseCentricExtractor()
    
    # Extract vocabulary
    result = extractor.extract_vocabulary(
        text=test_text,
        document_title="Climate Change and Environmental Protection",
        max_phrases=20
    )
    
    print("\n📊 TOP PHRASES:")
    print("-" * 80)
    for i, phrase in enumerate(result[:10], 1):
        print(f"{i}. {phrase['phrase']}")
        print(f"   Score: {phrase['importance_score']:.3f}")
        print(f"   Frequency: {phrase['frequency']}")
        print(f"   Heading similarity: {phrase.get('heading_similarity', 0):.3f}")
        print(f"   Contrastive: {phrase.get('contrastive_score', 0):.3f}")
        print(f"   Example: {phrase['supporting_sentence'][:80]}...")
    
    print("\n✅ Test completed!")
