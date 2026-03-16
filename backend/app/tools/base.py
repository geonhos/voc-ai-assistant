"""Base classes for the Tool-Use pipeline: Tool, ToolResult, ToolRegistry."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ToolResult:
    """Result returned by any tool execution.

    Attributes:
        success: Whether the tool executed without error.
        data: Raw structured data to be sent to the frontend (serialisable).
        display_type: Frontend hint for rendering
            (transaction_card | settlement_table | error_code | api_log | text).
        summary: Human-readable summary injected into the LLM system prompt.
        error: Error message when ``success`` is False.
    """

    success: bool
    data: Any = None
    display_type: str = "text"
    summary: str = ""
    error: Optional[str] = None


class Tool(ABC):
    """Abstract base class for all tool implementations.

    Subclasses must declare class-level attributes ``name``, ``description``,
    and ``parameters_schema`` (JSON Schema dict) so that ToolRegistry can build
    the tool-description string fed to the LLM intent-classifier.
    """

    name: str
    description: str
    parameters_schema: dict

    @abstractmethod
    async def execute(
        self,
        db: Any,
        merchant_id: Optional[int],
        params: dict,
    ) -> ToolResult:
        """Execute the tool and return a :class:`ToolResult`.

        Args:
            db: Active async SQLAlchemy session.
            merchant_id: Authenticated merchant's database ID (None for public tools).
            params: Parsed parameters extracted by the intent classifier.

        Returns:
            A :class:`ToolResult` with structured data and a text summary.
        """


class ToolRegistry:
    """Registry that maps tool names to :class:`Tool` instances.

    All tools are registered at import time via :meth:`register`; the registry is
    consulted during both intent classification (to build the description string)
    and execution.
    """

    _tools: dict[str, Tool] = {}

    @classmethod
    def register(cls, tool: Tool) -> None:
        """Register a tool instance under its ``name``.

        Args:
            tool: A concrete :class:`Tool` instance.
        """
        cls._tools[tool.name] = tool

    @classmethod
    def get(cls, name: str) -> Optional[Tool]:
        """Return the tool registered under *name*, or None.

        Args:
            name: Tool name string.

        Returns:
            The matching :class:`Tool` or ``None`` if not found.
        """
        return cls._tools.get(name)

    @classmethod
    def all_tools(cls) -> list[Tool]:
        """Return all registered tools.

        Returns:
            List of all :class:`Tool` instances in registration order.
        """
        return list(cls._tools.values())

    @classmethod
    def get_tools_description(cls) -> str:
        """Generate a formatted tool-description block for the LLM system prompt.

        Returns:
            Multi-line string where each line describes one registered tool.
        """
        descriptions: list[str] = []
        for tool in cls._tools.values():
            props = tool.parameters_schema.get("properties", {})
            params_str = ", ".join(
                f"{k}: {v.get('description', v.get('type', ''))}"
                for k, v in props.items()
            )
            descriptions.append(f"- {tool.name}({params_str}): {tool.description}")
        return "\n".join(descriptions)
