"""RAG service — retrieves relevant knowledge articles via pgvector similarity search."""

import logging

from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding import generate_embedding

logger = logging.getLogger(__name__)


async def retrieve_context(
    db: AsyncSession,
    query: str,
    top_k: int = 3,
    similarity_threshold: float = 0.3,
) -> list[dict]:
    """Retrieve relevant KB articles using pgvector cosine distance.

    Uses: 1 - (embedding <=> query_embedding) as similarity score.
    The <=> operator computes cosine distance in [0, 2], so similarity
    = 1 - distance which falls in [-1, 1].  Articles below the threshold
    are filtered out so only genuinely relevant context is passed to the LLM.

    Args:
        db: Active async database session.
        query: Customer's question or message text.
        top_k: Maximum number of articles to return.
        similarity_threshold: Minimum similarity score required (exclusive).

    Returns:
        List of dicts with keys: id, title, content, category, similarity.
        Empty list on embedding generation failure.
    """
    try:
        query_embedding = await generate_embedding(query)
    except Exception as e:
        logger.error("Failed to generate query embedding: %s", e)
        return []

    # Build a literal vector string compatible with pgvector's cast syntax.
    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    result = await db.execute(
        sql_text("""
            SELECT id, title, content, category,
                   1 - (embedding <=> :embedding::vector) AS similarity
            FROM knowledge_articles
            WHERE active = true
              AND embedding IS NOT NULL
              AND 1 - (embedding <=> :embedding::vector) > :threshold
            ORDER BY embedding <=> :embedding::vector
            LIMIT :top_k
        """),
        {
            "embedding": embedding_str,
            "threshold": similarity_threshold,
            "top_k": top_k,
        },
    )

    rows = result.fetchall()
    return [
        {
            "id": row.id,
            "title": row.title,
            "content": row.content,
            "category": row.category,
            "similarity": float(row.similarity),
        }
        for row in rows
    ]


def format_context(articles: list[dict]) -> str:
    """Format retrieved articles as a context string for the AI system prompt.

    Args:
        articles: List of article dicts returned by :func:`retrieve_context`.

    Returns:
        Multi-section string ready to be interpolated into the system prompt.
        Returns a Korean fallback message when the list is empty.
    """
    if not articles:
        return "관련 Knowledge Base 문서를 찾지 못했습니다."

    parts = []
    for i, article in enumerate(articles, 1):
        parts.append(
            f"[문서 {i}] {article['title']} "
            f"(카테고리: {article['category']}, 유사도: {article['similarity']:.2f})\n"
            f"{article['content']}"
        )
    return "\n\n---\n\n".join(parts)
