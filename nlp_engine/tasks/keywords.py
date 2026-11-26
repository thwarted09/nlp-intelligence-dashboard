"""
Keyword Extraction task.

Uses KeyBERT (backed by sentence-transformers) for semantic keyword extraction.
Falls back to simple TF-IDF based extraction if KeyBERT is unavailable.
"""

import logging
import re
from collections import Counter

logger = logging.getLogger(__name__)

_keybert_model = None
_keybert_error = None


def _get_keybert():
    global _keybert_model, _keybert_error
    if _keybert_model is not None:
        return _keybert_model
    if _keybert_error is not None:
        return None  # Fallback mode — don't raise

    try:
        from keybert import KeyBERT
        _keybert_model = KeyBERT()
        logger.info("KeyBERT model loaded (all-MiniLM-L6-v2)")
        return _keybert_model
    except ImportError:
        _keybert_error = "KeyBERT not installed"
        logger.warning("KeyBERT not available, using TF-IDF fallback.")
        return None
    except Exception as exc:
        _keybert_error = str(exc)
        logger.warning(f"KeyBERT failed to load: {exc}. Using TF-IDF fallback.")
        return None


# ---------------------------------------------------------------------------
# Simple TF-IDF fallback (no external deps)
# ---------------------------------------------------------------------------

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "to", "of", "in",
    "for", "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "up", "down", "out", "off", "about",
    "between", "this", "that", "these", "those", "it", "its", "not", "also",
    "just", "more", "other", "some", "such", "their", "there", "they", "than",
    "then", "when", "where", "which", "who", "how", "what", "all", "each",
    "both", "few", "him", "his", "her", "she", "he", "we", "us", "our", "i",
    "me", "my", "you", "your", "new", "one", "two", "s", "t", "re",
}


def _tfidf_keywords(text: str, top_n: int = 10) -> list[tuple[str, float]]:
    """Extract keywords using simple word frequency, filtered by stopwords."""
    words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    words = [w for w in words if w not in STOPWORDS]
    if not words:
        return []
    total = len(words)
    freq = Counter(words)
    scored = [(word, round(count / total, 4)) for word, count in freq.most_common(top_n)]
    return scored


def run_keywords(
    prepared_docs: list[dict],
    top_n: int = 10,
    ngram_range: tuple = (1, 2),
) -> list[dict]:
    """
    Extract top keywords from each document.

    Args:
        prepared_docs: List of dicts with '_id' and 'clean_text'.
        top_n:         Number of keywords to extract per document.
        ngram_range:   Tuple (min_n, max_n) for n-gram extraction.

    Returns:
        List of dicts with '_id', 'keywords' (list of {word, score}), 'method'.
    """
    if not prepared_docs:
        return []

    kb = _get_keybert()
    output = []

    for doc in prepared_docs:
        text = doc.get("clean_text", "").strip()
        doc_id = doc["_id"]

        if not text:
            output.append({
                "_id": doc_id,
                "task": "keywords",
                "keywords": [],
                "method": "none",
                "text_preview": "",
            })
            continue

        if kb is not None:
            try:
                raw = kb.extract_keywords(
                    text,
                    keyphrase_ngram_range=ngram_range,
                    top_n=top_n,
                    stop_words="english",
                )
                keywords = [{"word": kw, "score": round(sc, 4)} for kw, sc in raw]
                method = "keybert"
            except Exception as exc:
                logger.warning(f"KeyBERT failed on doc {doc_id}: {exc}. Falling back to TF-IDF.")
                raw = _tfidf_keywords(text, top_n)
                keywords = [{"word": kw, "score": sc} for kw, sc in raw]
                method = "tfidf_fallback"
        else:
            raw = _tfidf_keywords(text, top_n)
            keywords = [{"word": kw, "score": sc} for kw, sc in raw]
            method = "tfidf"

        output.append({
            "_id": doc_id,
            "task": "keywords",
            "keywords": keywords,
            "keyword_count": len(keywords),
            "method": method,
            "text_preview": text[:150],
        })

    return output
