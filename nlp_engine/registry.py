"""
NLP Task Registry.

Maps task names (strings) to their runner functions and metadata.
Each runner follows a consistent interface:
    run_<task>(prepared_docs: list[dict], **kwargs) -> list[dict] | dict

Usage:
    from nlp_engine.registry import TASK_REGISTRY, get_task_info
    runner = TASK_REGISTRY["sentiment"]["runner"]
    results = runner(prepared_docs)
"""

from nlp_engine.tasks.sentiment import run_sentiment
from nlp_engine.tasks.ner import run_ner
from nlp_engine.tasks.keywords import run_keywords
from nlp_engine.tasks.summarization import run_summarization
from nlp_engine.tasks.classification import run_classification
from nlp_engine.tasks.deduplication import run_deduplication
from nlp_engine.preprocessing.language_detection import batch_detect_language


# ---------------------------------------------------------------------------
# Registry definition
# ---------------------------------------------------------------------------

TASK_REGISTRY: dict[str, dict] = {
    "sentiment": {
        "name": "Sentiment Analysis",
        "description": "Classifies each document as positive or negative with a confidence score.",
        "runner": run_sentiment,
        "output_type": "per_document",
        "requires_transformers": True,
        "icon": "😊",
        "options": {
            "batch_size": {"type": "int", "default": 32, "min": 1, "max": 128, "label": "Batch Size"},
        },
    },
    "ner": {
        "name": "Named Entity Recognition",
        "description": "Identifies and groups named entities (PER, ORG, LOC, MISC) in each document.",
        "runner": run_ner,
        "output_type": "per_document",
        "requires_transformers": True,
        "icon": "🏷️",
        "options": {
            "batch_size": {"type": "int", "default": 16, "min": 1, "max": 64, "label": "Batch Size"},
        },
    },
    "keywords": {
        "name": "Keyword Extraction",
        "description": "Extracts top keywords and keyphrases from each document using KeyBERT or TF-IDF.",
        "runner": run_keywords,
        "output_type": "per_document",
        "requires_transformers": False,
        "icon": "🔑",
        "options": {
            "top_n": {"type": "int", "default": 10, "min": 1, "max": 30, "label": "Keywords per Doc"},
        },
    },
    "summarization": {
        "name": "Text Summarization",
        "description": "Generates an abstractive summary for each document using BART, with extractive fallback.",
        "runner": run_summarization,
        "output_type": "per_document",
        "requires_transformers": True,
        "icon": "📝",
        "options": {
            "max_length": {"type": "int", "default": 150, "min": 30, "max": 300, "label": "Max Summary Length"},
            "min_length": {"type": "int", "default": 40, "min": 10, "max": 100, "label": "Min Summary Length"},
        },
    },
    "classification": {
        "name": "Text Classification",
        "description": "Zero-shot classification of documents into custom topic labels.",
        "runner": run_classification,
        "output_type": "per_document",
        "requires_transformers": True,
        "icon": "🗂️",
        "options": {
            "candidate_labels": {
                "type": "list",
                "default": ["politics", "technology", "sports", "business", "health", "military", "environment", "science"],
                "label": "Topic Labels (comma-separated)",
            },
        },
    },
    "deduplication": {
        "name": "Deduplication",
        "description": "Finds exact and near-duplicate documents using cosine similarity on TF-IDF vectors.",
        "runner": None,  # Special: corpus-level task, handled separately
        "output_type": "corpus",
        "requires_transformers": False,
        "icon": "🔍",
        "options": {
            "similarity_threshold": {
                "type": "float", "default": 0.85, "min": 0.5, "max": 1.0, "label": "Similarity Threshold",
            },
        },
    },
    "language_detection": {
        "name": "Language Detection",
        "description": "Detects the language of each document with confidence score.",
        "runner": None,  # Special: uses batch_detect_language directly
        "output_type": "per_document",
        "requires_transformers": False,
        "icon": "🌐",
        "options": {},
    },
}


def get_task_info(task_name: str) -> dict | None:
    """Return task metadata without the runner function."""
    task = TASK_REGISTRY.get(task_name)
    if not task:
        return None
    return {k: v for k, v in task.items() if k != "runner"}


def list_tasks() -> list[dict]:
    """List all registered tasks with their metadata."""
    return [
        {"id": task_id, **{k: v for k, v in info.items() if k != "runner"}}
        for task_id, info in TASK_REGISTRY.items()
    ]
