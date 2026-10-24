"""Schemas and result containers for NLP task outputs."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class NLPJobRequest:
    """Input specification for an NLP job."""
    connection_id: str
    database: str
    collection: str
    text_field: str
    task: str
    limit: int = 100
    options: dict = field(default_factory=dict)


@dataclass
class NLPJobResult:
    """Result container for a completed NLP job."""
    task: str
    collection: str
    database: str
    text_field: str
    total_documents: int
    processed_documents: int
    skipped_documents: int
    output_type: str          # 'per_document' | 'corpus'
    results: list[dict] | dict = field(default_factory=list)
    method: str = "unknown"
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "task": self.task,
            "collection": self.collection,
            "database": self.database,
            "text_field": self.text_field,
            "total_documents": self.total_documents,
            "processed_documents": self.processed_documents,
            "skipped_documents": self.skipped_documents,
            "output_type": self.output_type,
            "results": self.results,
            "method": self.method,
            "error": self.error,
        }
