import json
import logging
from typing import Any
from groq import Groq
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.schemas.common import AnalystReport, ValidationResult

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.groq_client = Groq(api_key=self.settings.groq_api_key) if self.settings.groq_api_key else None
        self.openai_client = OpenAI(api_key=self.settings.openai_api_key) if self.settings.openai_api_key else None

    def _call_llm(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str | None:
        """Unified LLM call that tries Groq first, then OpenAI."""
        kwargs: dict[str, Any] = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 1000,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        if self.settings.llm_provider.lower() == "groq" and self.groq_client:
            try:
                completion = self.groq_client.chat.completions.create(
                    model=self.settings.groq_model, **kwargs
                )
                return completion.choices[0].message.content
            except Exception as e:
                logger.warning("Groq call failed: %s", e)

        if self.openai_client:
            try:
                completion = self.openai_client.chat.completions.create(
                    model=self.settings.openai_model, **kwargs
                )
                return completion.choices[0].message.content
            except Exception as e:
                logger.warning("OpenAI call failed: %s", e)

        return None

    # ── Analyst Agent (Iterative RAG via Tool Calling) ─────────────────────
    async def run_analyst_agent(
        self, prompt: str, rag_service: Any, feedback: str | None = None
    ) -> AnalystReport:
        """Autonomous agent that uses tool calling to research and generate a report."""
        if not self.groq_client:
            # Fallback if no Groq
            return AnalystReport(
                summary="Fallback report — LLM unavailable.",
                scientific_reasoning="Unable to generate AI reasoning.",
                recommended_action="Review telemetry data manually.",
                precautionary_measures="Maintain standard monitoring.",
                authority_action_needed=False,
                confidence=0.4,
            )

        system_prompt = (
            "You are an autonomous marine scientist AI. You must analyze the provided vision, "
            "environmental, and fusion data. Before finalizing your report, you MUST use the "
            "`search_qdrant_knowledge_base` tool to research relevant Scientific Guidelines and SOPs based on the data. "
            "After researching, provide your final report using the precise JSON format requested."
        )
        
        if feedback:
            system_prompt += f"\n\nCRITICAL: You are revising a previous report. Follow this feedback: {feedback}"

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "search_qdrant_knowledge_base",
                    "description": "Search the Qdrant knowledge base for SOPs and guidelines related to the reef's condition (e.g., 'Bleached coral SSTA 2.5').",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query."
                            }
                        },
                        "required": ["query"],
                    },
                },
            }
        ]

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        # Iterative tool calling loop (max 3 iterations)
        for _ in range(3):
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.settings.groq_model,
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=0.1,
                    max_tokens=1500,
                )
                
                message = response.choices[0].message
                messages.append(message)

                if message.tool_calls:
                    for tool_call in message.tool_calls:
                        if tool_call.function.name == "search_qdrant_knowledge_base":
                            args = json.loads(tool_call.function.arguments)
                            query = args.get("query", "")
                            # Execute the tool
                            docs = rag_service.search(query, top_k=3)
                            formatted_docs = "\n".join(f"[{d['source']}] {d['content']}" for d in docs)
                            messages.append({
                                "role": "tool",
                                "content": formatted_docs or "No relevant documents found.",
                                "tool_call_id": tool_call.id,
                            })
                    # Continue loop to get next LLM response
                    continue
                else:
                    # No more tool calls, we have our final text.
                    break
            except Exception as e:
                logger.warning("Analyst Agent Groq call failed: %s", e)
                break

        # Now force the output into the AnalystReport schema
        schema_prompt = (
            "Based on your research and analysis, provide the final report as a JSON object matching this schema:\n"
            "{\n"
            '  "summary": "1-2 sentence overview",\n'
            '  "scientific_reasoning": "Detailed scientific explanation referencing guidelines",\n'
            '  "recommended_action": "Specific, actionable steps",\n'
            '  "precautionary_measures": "Precautions to take",\n'
            '  "authority_action_needed": true/false,\n'
            '  "confidence": 0.0-1.0\n'
            "}\n"
        )
        messages.append({"role": "user", "content": schema_prompt})
        
        try:
            final_resp = self.groq_client.chat.completions.create(
                model=self.settings.groq_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=1000,
            )
            final_text = final_resp.choices[0].message.content
            if final_text:
                data = json.loads(final_text)
                return AnalystReport(**data)
        except Exception as e:
            logger.warning("Analyst Agent schema parsing failed: %s", e)

        # Fallback
        return AnalystReport(
            summary="Fallback report — Failed to parse AI output.",
            scientific_reasoning="Unable to generate AI reasoning.",
            recommended_action="Review telemetry data manually.",
            precautionary_measures="Maintain standard monitoring.",
            authority_action_needed=False,
            confidence=0.4,
        )

    # ── Critic Agent (Self-Reflection) ─────────────────────────────────────

    async def run_critic_agent(self, report: AnalystReport, original_data: str) -> ValidationResult:
        """Critic Agent validates the Analyst's report against the raw sensor data."""
        if not self.groq_client:
            return ValidationResult(is_valid=True, feedback="No validation performed (LLM unavailable).")

        system_prompt = (
            "You are a strict QA AI Validator. Your job is to compare an Analyst's report against "
            "the original raw sensor data. Verify if the recommended action and reasoning logically "
            "align with the data.\n\n"
            "Return a JSON object matching this schema EXACTLY:\n"
            "{\n"
            '  "is_valid": true/false,\n'
            '  "feedback": "Explanation of why it is valid or invalid",\n'
            '  "suggested_revisions": ["Point 1", "Point 2"]\n'
            "}"
        )
        
        user_prompt = (
            f"--- ORIGINAL SENSOR DATA ---\n{original_data}\n\n"
            f"--- ANALYST REPORT ---\n{report.model_dump_json(indent=2)}\n\n"
            "Assess validity."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        try:
            response = self.groq_client.chat.completions.create(
                model=self.settings.groq_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=500,
            )
            text = response.choices[0].message.content
            if text:
                data = json.loads(text)
                return ValidationResult(**data)
        except Exception as e:
            logger.warning("Critic Agent failed: %s", e)

        return ValidationResult(is_valid=True, feedback="Fallback to valid due to LLM error.")

    # ── Chat Response (conversational, context-aware) ──────────────────────

    def generate_chat_response(
        self,
        message: str,
        rag_context: list[dict],
        analysis_context: dict | None = None,
    ) -> str:
        """Generate a conversational response for the Reef Assistant chat."""
        context_parts = []

        if analysis_context:
            context_parts.append(
                f"The user's latest reef analysis:\n"
                f"- Vision Classification: {analysis_context.get('vision', {}).get('class_name', 'N/A')} "
                f"(confidence: {analysis_context.get('vision', {}).get('confidence', 'N/A')})\n"
                f"- Environmental Cluster: {analysis_context.get('environment', {}).get('cluster', 'N/A')}\n"
                f"- Fusion Risk Level: {analysis_context.get('fusion', {}).get('final_risk', 'N/A')}\n"
                f"- Recommended Action: {analysis_context.get('fusion', {}).get('recommended_action', 'N/A')}\n"
                f"- Report Summary: {analysis_context.get('report', {}).get('summary', 'N/A')}"
            )

        if rag_context:
            formatted = "\n".join(
                f"[{doc.get('source', 'unknown')}]: {doc.get('content', '')}" for doc in rag_context
            )
            context_parts.append(f"Relevant knowledge base documents:\n{formatted}")

        context_str = "\n\n---\n\n".join(context_parts) if context_parts else "No additional context available."

        system_prompt = (
            "You are CoralGuard Reef Assistant, an AI marine scientist helping users understand "
            "coral reef health, interpret analysis results, and take appropriate action.\n\n"
            "RULES:\n"
            "1. If the user has a recent analysis, reference it specifically in your response.\n"
            "2. Provide actionable advice based on the knowledge base guidelines.\n"
            "3. If the risk is Critical, emphasize urgency and provide authority contact information.\n"
            "4. Always mention precautionary measures relevant to the current risk level.\n"
            "5. Be conversational but scientifically accurate.\n"
            "6. If you don't have enough information, say so clearly rather than guessing.\n"
            "7. Keep responses concise — 2-4 paragraphs maximum."
        )

        user_prompt = f"Context:\n{context_str}\n\nUser question: {message}"

        response = self._call_llm(system_prompt, user_prompt, json_mode=False)
        if response:
            return response

        return (
            "I'm unable to connect to the AI service right now. "
            "Based on your latest analysis data, I recommend reviewing the precautionary measures "
            "in the Knowledge Base section and contacting your local marine park authority if "
            "the risk level is Elevated or Critical."
        )
