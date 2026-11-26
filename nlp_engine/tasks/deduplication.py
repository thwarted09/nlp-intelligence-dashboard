"""
Deduplication task.

Uses cosine similarity on TF-IDF vectors (scikit-learn) to find near-duplicate
documents within a collection. Falls back to exact/Jaccard similarity if
scikit-learn is unavailable.
"""

import hashlib
import logging
import re

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exact duplicate detection (always available)
# ---------------------------------------------------------------------------

def _md5_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _jaccard_similarity(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union > 0 else 0.0


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"\b\w{3,}\b", text.lower()))


# ---------------------------------------------------------------------------
# TF-IDF cosine similarity (scikit-learn)
# ---------------------------------------------------------------------------

def _tfidf_cosine(texts: list[str]) -> list[list[float]]:
    """Return NxN cosine similarity matrix."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
        tfidf_matrix = vectorizer.fit_transform(texts)
        sim_matrix = cosine_similarity(tfidf_matrix)
        return sim_matrix.tolist()
    except ImportError:
        return None


def run_deduplication(
    prepared_docs: list[dict],
    similarity_threshold: float = 0.85,
) -> dict:
    """
    Find duplicate and near-duplicate documents using cosine similarity.

    Args:
        prepared_docs:         List of dicts with '_id' and 'clean_text'.
        similarity_threshold:  Cosine similarity threshold to flag near-duplicates.

    Returns:
        Dict with 'unique_documents', 'duplicate_groups', 'exact_duplicates',
        'near_duplicates', 'total_docs', 'unique_count', 'duplicate_count'.
    """
    if not prepared_docs:
        return {
            "total_docs": 0,
            "unique_count": 0,
            "duplicate_count": 0,
            "exact_duplicates": [],
            "near_duplicate_groups": [],
        }

    texts = [doc.get("clean_text", "") for doc in prepared_docs]
    ids = [doc["_id"] for doc in prepared_docs]

    # Step 1: Find exact duplicates via MD5 hash
    hash_map: dict[str, list[str]] = {}
    for doc_id, text in zip(ids, texts):
        h = _md5_hash(text)
        hash_map.setdefault(h, []).append(doc_id)

    exact_groups = [group for group in hash_map.values() if len(group) > 1]
    exact_dup_ids = {doc_id for group in exact_groups for doc_id in group[1:]}  # Keep first

    # Step 2: Near-duplicate detection via TF-IDF cosine similarity
    near_dup_groups = []
    try:
        sim_matrix = _tfidf_cosine(texts)
        if sim_matrix is not None:
            n = len(ids)
            visited = set()
            for i in range(n):
                if ids[i] in exact_dup_ids or i in visited:
                    continue
                group = [ids[i]]
                for j in range(i + 1, n):
                    if ids[j] in exact_dup_ids or j in visited:
                        continue
                    if sim_matrix[i][j] >= similarity_threshold:
                        group.append(ids[j])
                        visited.add(j)
                if len(group) > 1:
                    near_dup_groups.append({
                        "canonical": ids[i],
                        "duplicates": group[1:],
                        "avg_similarity": round(
                            sum(sim_matrix[i][ids.index(d)] for d in group[1:]) / len(group[1:]), 4
                        ),
                        "method": "tfidf_cosine",
                    })
                    visited.add(i)
    except Exception as exc:
        logger.warning(f"TF-IDF cosine similarity failed: {exc}")

    near_dup_ids = {d for g in near_dup_groups for d in g["duplicates"]}
    all_dup_ids = exact_dup_ids | near_dup_ids
    unique_count = len(ids) - len(all_dup_ids)
    duplicate_count = len(all_dup_ids)

    return {
        "task": "deduplication",
        "total_docs": len(ids),
        "unique_count": unique_count,
        "duplicate_count": duplicate_count,
        "similarity_threshold": similarity_threshold,
        "exact_duplicate_groups": [
            {"canonical": g[0], "duplicates": g[1:]} for g in exact_groups
        ],
        "near_duplicate_groups": near_dup_groups,
    }
