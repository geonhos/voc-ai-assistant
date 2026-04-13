"""Shared utility functions used across multiple service modules."""

from __future__ import annotations


def strip_markdown_code_block(text: str) -> str:
    """Remove surrounding ```json ... ``` or ``` ... ``` fences if present.

    Args:
        text: Raw LLM output that may contain Markdown code fences.

    Returns:
        Clean JSON string with fences stripped.
    """
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Drop the opening fence line (``` or ```json)
        start = 1
        # Drop the closing fence line if present
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        text = "\n".join(lines[start:end]).strip()
    return text
