"""NLP result quality metrics."""


def classification_distribution(results: list[dict]) -> dict:
    """Count how many documents fall into each class label."""
    distribution: dict[str, int] = {}
    for r in results:
        label = r.get("top_label", "unknown")
        distribution[label] = distribution.get(label, 0) + 1
    return distribution


def sentiment_summary(results: list[dict]) -> dict:
    """Summarize sentiment distribution and average scores."""
    positive = [r for r in results if r.get("label") == "positive"]
    negative = [r for r in results if r.get("label") == "negative"]
    total = len(results)

    avg_score = round(sum(r.get("score", 0) for r in results) / total, 4) if total else 0.0

    return {
        "total": total,
        "positive": len(positive),
        "negative": len(negative),
        "positive_pct": round(len(positive) / total * 100, 1) if total else 0.0,
        "negative_pct": round(len(negative) / total * 100, 1) if total else 0.0,
        "avg_confidence": avg_score,
    }


def top_entities(results: list[dict], top_n: int = 20) -> dict[str, list[str]]:
    """Aggregate the most frequent entities across all NER results."""
    from collections import Counter
    entity_counts: dict[str, Counter] = {}
    for r in results:
        for entity_type, words in r.get("entities", {}).items():
            entity_counts.setdefault(entity_type, Counter())
            for word in words:
                entity_counts[entity_type][word] += 1

    return {
        entity_type: [word for word, _ in counter.most_common(top_n)]
        for entity_type, counter in entity_counts.items()
    }


def top_keywords_global(results: list[dict], top_n: int = 30) -> list[dict]:
    """Aggregate the most frequent keywords across all documents."""
    from collections import defaultdict
    score_map: dict[str, float] = defaultdict(float)
    count_map: dict[str, int] = defaultdict(int)

    for r in results:
        for kw in r.get("keywords", []):
            word = kw.get("word", "")
            score = kw.get("score", 0)
            score_map[word] += score
            count_map[word] += 1

    aggregated = [
        {"word": w, "avg_score": round(score_map[w] / count_map[w], 4), "doc_count": count_map[w]}
        for w in score_map
    ]
    aggregated.sort(key=lambda x: x["doc_count"], reverse=True)
    return aggregated[:top_n]
