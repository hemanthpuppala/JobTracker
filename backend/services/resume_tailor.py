"""Resume tailoring pipeline — multi-step AI orchestration.

Each step makes a focused AI call for one section of the resume.
Yields progress events so the frontend can show real-time updates.
"""

import json
import logging
import re
from typing import Any, AsyncGenerator, Optional

from .ai_provider import get_ai_provider
from .ats_scorer import score_resume as ats_score_resume

logger = logging.getLogger("resume_tailor")

# Max iterations for the score → re-tailor loop
MAX_ITERATIONS = 2
SCORE_THRESHOLD = 80

# ---- Focused prompts per step ----

ANALYZE_JD_PROMPT = """\
You are a job description analyst. Extract the key requirements from this JD.

Output ONLY valid JSON:
{
  "role_title": "the role title",
  "must_have_skills": ["skill1", "skill2", ...],
  "nice_to_have_skills": ["skill1", ...],
  "key_responsibilities": ["resp1", "resp2", ...],
  "industry_keywords": ["kw1", "kw2", ...],
  "years_experience": "X+ years" or null,
  "education": "degree requirement" or null
}
"""

TAILOR_SUMMARY_PROMPT = """\
You are a resume summary writer. Write a 2-3 sentence professional summary tailored for this specific role.

Rules:
- Output ONLY the summary text, nothing else. No JSON, no quotes, no explanation.
- Mention the target role/domain naturally.
- Highlight the candidate's most relevant strengths for this role.
- Include 2-3 key skills/technologies from the JD.
- Be specific and metric-driven where possible.
- Do NOT invent credentials — only reference what's in the resume.
"""

TAILOR_EXPERIENCE_PROMPT = """\
You are a resume bullet point optimizer. Rewrite the bullet points for ONE work experience to be maximally relevant to the target job.

Rules:
- Output ONLY valid JSON: {"bullets": ["bullet1", "bullet2", ...], "included": true/false}
- Each bullet: single line, start with strong past-tense action verb, include metrics/numbers.
- Integrate relevant keywords from the JD naturally.
- Keep the same number of bullets or fewer (drop weak ones).
- Set "included": false ONLY if this role is completely irrelevant to the target job.
- Do NOT invent accomplishments — reframe existing ones to highlight relevance.
- Do NOT change the company name, job title, or dates.
"""

TAILOR_PROJECT_PROMPT = """\
You are a resume project description optimizer. Rewrite bullet points for ONE project to match the target job.

Rules:
- Output ONLY valid JSON: {"bullets": ["bullet1", ...], "included": true/false}
- Each bullet: single line, action verb, metrics where possible.
- Emphasize technologies and outcomes relevant to the JD.
- Set "included": false ONLY if this project is completely irrelevant.
- Do NOT invent features or metrics — reframe existing ones.
"""

TAILOR_SKILLS_PROMPT = """\
You are a resume skills optimizer. Optimize the skills section for the target job.

Rules:
- Output ONLY valid JSON: [{"id": <id>, "items": "comma-separated skills", "included": true/false}, ...]
- Reorder items within each category to put JD-relevant skills first.
- You may add skills ONLY if they clearly appear in the resume text elsewhere.
- Set "included": false for categories that are entirely irrelevant.
- Keep the same category names.
"""


def _extract_json(text: str) -> Any:
    """Extract JSON from AI response, handling markdown code blocks."""
    text = text.strip()
    if text.startswith(("{", "[")):
        return json.loads(text)
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1).strip())
    # Find first JSON-like structure
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        try:
            start = text.index(start_char)
            end = text.rindex(end_char) + 1
            return json.loads(text[start:end])
        except (ValueError, json.JSONDecodeError):
            continue
    raise ValueError(f"Could not extract JSON from: {text[:200]}...")


async def run_pipeline(
    resume_text: str,
    resume_structured: dict,
    job_description: str,
    custom_prompt: Optional[str] = None,
    cached_jd_analysis: Optional[dict] = None,
    pdf_page_count: Optional[int] = None,
) -> AsyncGenerator[dict, None]:
    """Multi-step tailoring pipeline. Yields progress events.

    Each event is: {"step": "step_name", "status": "running"|"done"|"error", "data": ...}
    """
    provider = get_ai_provider()
    provider_name = type(provider).__name__

    # Build extra context from user instructions + PDF state
    extra_context = ""
    if custom_prompt:
        extra_context += f"\n\n## USER INSTRUCTIONS (follow these strictly)\n{custom_prompt}"
    if pdf_page_count is not None:
        extra_context += f"\n\n## CURRENT PDF STATE\nThe resume currently renders to {pdf_page_count} page(s)."
        if pdf_page_count > 1:
            extra_context += (
                " The user needs this to fit on 1 page. You MUST aggressively cut content:"
                " set more items to included=false, reduce bullet counts, and shorten bullets."
            )

    # Accumulated result
    result: dict[str, Any] = {
        "summary": "",
        "experiences": [],
        "projects": [],
        "skills": [],
    }

    # ── Step 1: Analyze JD (skip if cached) ──
    if cached_jd_analysis:
        jd_analysis = cached_jd_analysis
        logger.info("Using cached JD analysis")
        yield {"step": "analyze_jd", "status": "done", "data": jd_analysis, "message": "Using cached JD analysis"}
    else:
        yield {"step": "analyze_jd", "status": "running", "message": "Analyzing job description..."}
        try:
            logger.info("=== Step 1: Analyze JD [%s] ===", provider_name)
            raw = await provider.generate(ANALYZE_JD_PROMPT, f"Job Description:\n{job_description}")
            jd_analysis = _extract_json(raw)
            logger.info("JD Analysis: %s", json.dumps(jd_analysis, indent=2))
            yield {"step": "analyze_jd", "status": "done", "data": jd_analysis}
        except Exception as e:
            logger.error("JD analysis failed: %s", e)
            yield {"step": "analyze_jd", "status": "error", "message": str(e)}
            jd_analysis = {"raw": job_description}

    jd_context = f"## Target Job Requirements\n{json.dumps(jd_analysis, indent=2)}\n\n## Full Job Description\n{job_description}"

    # ── Step 2: Initial ATS Score ──
    yield {"step": "initial_score", "status": "running", "message": "Scoring current resume..."}
    try:
        initial_ats = ats_score_resume(resume_text, job_description)
        initial_score = initial_ats["overall_score"]
        logger.info("Initial ATS score: %d", initial_score)
        yield {"step": "initial_score", "status": "done", "data": {
            "score": initial_score,
            "categories": initial_ats["categories"],
            "suggestions": initial_ats["suggestions"],
        }}
    except Exception as e:
        logger.error("Initial scoring failed: %s", e)
        initial_ats = None
        initial_score = 0
        yield {"step": "initial_score", "status": "error", "message": str(e)}

    ats_context = ""
    if initial_ats:
        ats_context = f"\n\n## Current ATS Gaps to Fix\nScore: {initial_score}/100\nMissing keywords: {initial_ats['categories'].get('keyword_match', {}).get('missing', [])}\nMissing skills: {initial_ats['categories'].get('skills_match', {}).get('missing', [])}\nSuggestions: {initial_ats['suggestions']}"

    # Append user instructions + PDF state to every section prompt
    ats_context += extra_context

    # Build system prompt suffix so user instructions appear in BOTH system + user prompts
    system_suffix = ""
    if custom_prompt:
        system_suffix += f"\n\nCRITICAL USER INSTRUCTION (you MUST follow this): {custom_prompt}"
    if pdf_page_count is not None and pdf_page_count > 1:
        system_suffix += f"\n\nCRITICAL: The resume is currently {pdf_page_count} pages. It MUST fit on 1 page. Aggressively cut content."

    # ── Step 3: Tailor Summary ──
    yield {"step": "tailor_summary", "status": "running", "message": "Tailoring professional summary..."}
    try:
        user_prompt = f"## Current Summary\n{resume_structured.get('summary', '(none)')}\n\n## Full Resume\n{resume_text}\n\n{jd_context}{ats_context}"
        logger.info("=== Step 3: Tailor Summary ===")
        raw = await provider.generate(TAILOR_SUMMARY_PROMPT + system_suffix, user_prompt)
        # Summary comes as plain text
        summary = raw.strip().strip('"').strip("'")
        result["summary"] = summary
        logger.info("Tailored summary: %s", summary[:100])
        yield {"step": "tailor_summary", "status": "done", "data": {"summary": summary}}
    except Exception as e:
        logger.error("Summary tailoring failed: %s", e)
        yield {"step": "tailor_summary", "status": "error", "message": str(e)}

    # ── Step 4: Tailor Experiences (one at a time) ──
    experiences = resume_structured.get("experiences", [])
    for i, exp in enumerate(experiences):
        step_name = f"tailor_exp_{exp['id']}"
        yield {"step": step_name, "status": "running", "message": f"Tailoring experience: {exp.get('title', '')} at {exp.get('company', '')} ({i+1}/{len(experiences)})..."}
        try:
            user_prompt = (
                f"## This Experience\n"
                f"Company: {exp['company']}\n"
                f"Title: {exp['title']}\n"
                f"Current bullets:\n" + "\n".join(f"- {b}" for b in exp.get("bullets", [])) +
                f"\n\n## Full Resume Context\n{resume_text}\n\n{jd_context}{ats_context}"
            )
            logger.info("=== Step 4.%d: Tailor Experience id=%d (%s at %s) ===", i, exp["id"], exp["title"], exp["company"])
            raw = await provider.generate(TAILOR_EXPERIENCE_PROMPT + system_suffix, user_prompt)
            exp_result = _extract_json(raw)
            exp_result["id"] = exp["id"]
            result["experiences"].append(exp_result)
            logger.info("Experience %d result: included=%s, bullets=%d", exp["id"], exp_result.get("included"), len(exp_result.get("bullets", [])))
            yield {"step": step_name, "status": "done", "data": exp_result}
        except Exception as e:
            logger.error("Experience %d tailoring failed: %s", exp["id"], e)
            result["experiences"].append({"id": exp["id"], "bullets": exp.get("bullets", []), "included": True})
            yield {"step": step_name, "status": "error", "message": str(e)}

    # ── Step 5: Tailor Projects (one at a time) ──
    projects = resume_structured.get("projects", [])
    for i, proj in enumerate(projects):
        step_name = f"tailor_proj_{proj['id']}"
        yield {"step": step_name, "status": "running", "message": f"Tailoring project: {proj.get('name', '')} ({i+1}/{len(projects)})..."}
        try:
            user_prompt = (
                f"## This Project\n"
                f"Name: {proj['name']}\n"
                f"Tech Stack: {proj.get('tech_stack', '')}\n"
                f"Current bullets:\n" + "\n".join(f"- {b}" for b in proj.get("bullets", [])) +
                f"\n\n## Full Resume Context\n{resume_text}\n\n{jd_context}{ats_context}"
            )
            logger.info("=== Step 5.%d: Tailor Project id=%d (%s) ===", i, proj["id"], proj["name"])
            raw = await provider.generate(TAILOR_PROJECT_PROMPT + system_suffix, user_prompt)
            proj_result = _extract_json(raw)
            proj_result["id"] = proj["id"]
            result["projects"].append(proj_result)
            logger.info("Project %d result: included=%s, bullets=%d", proj["id"], proj_result.get("included"), len(proj_result.get("bullets", [])))
            yield {"step": step_name, "status": "done", "data": proj_result}
        except Exception as e:
            logger.error("Project %d tailoring failed: %s", proj["id"], e)
            result["projects"].append({"id": proj["id"], "bullets": proj.get("bullets", []), "included": True})
            yield {"step": step_name, "status": "error", "message": str(e)}

    # ── Step 6: Tailor Skills ──
    yield {"step": "tailor_skills", "status": "running", "message": "Optimizing skills section..."}
    try:
        skills = resume_structured.get("skills", [])
        user_prompt = (
            f"## Current Skills\n{json.dumps(skills, indent=2)}\n\n"
            f"## Full Resume\n{resume_text}\n\n{jd_context}{ats_context}"
        )
        logger.info("=== Step 6: Tailor Skills ===")
        raw = await provider.generate(TAILOR_SKILLS_PROMPT + system_suffix, user_prompt)
        skills_result = _extract_json(raw)
        if isinstance(skills_result, list):
            result["skills"] = skills_result
        else:
            result["skills"] = skills_result.get("skills", skills_result)
        logger.info("Skills result: %d categories", len(result["skills"]))
        yield {"step": "tailor_skills", "status": "done", "data": result["skills"]}
    except Exception as e:
        logger.error("Skills tailoring failed: %s", e)
        yield {"step": "tailor_skills", "status": "error", "message": str(e)}

    # ── Step 7: Re-score ──
    yield {"step": "rescore", "status": "running", "message": "Re-scoring tailored resume..."}
    try:
        # Build updated resume text from results for scoring
        tailored_text = _rebuild_resume_text(resume_text, result, resume_structured)
        final_ats = ats_score_resume(tailored_text, job_description)
        final_score = final_ats["overall_score"]
        improvement = final_score - initial_score
        logger.info("Final ATS score: %d (was %d, +%d)", final_score, initial_score, improvement)
        yield {"step": "rescore", "status": "done", "data": {
            "score": final_score,
            "initial_score": initial_score,
            "improvement": improvement,
            "categories": final_ats["categories"],
            "suggestions": final_ats["suggestions"],
        }}

        # ── Step 8: Iterate if needed ──
        if final_score < SCORE_THRESHOLD and MAX_ITERATIONS > 0:
            yield {"step": "iterate", "status": "running", "message": f"Score {final_score} < {SCORE_THRESHOLD}, re-optimizing weak sections..."}

            # Find weakest areas
            weak_categories = {k: v for k, v in final_ats["categories"].items()
                             if v.get("score", 100) < 70}
            logger.info("Weak categories: %s", list(weak_categories.keys()))

            # Re-tailor experiences if keyword/skills match is weak
            if "keyword_match" in weak_categories or "skills_match" in weak_categories:
                missing_kw = final_ats["categories"].get("keyword_match", {}).get("missing", [])
                missing_sk = final_ats["categories"].get("skills_match", {}).get("missing", [])
                iteration_context = f"\n\n## CRITICAL: These keywords/skills are STILL MISSING after first pass. You MUST integrate them:\nMissing keywords: {missing_kw[:10]}\nMissing skills: {missing_sk[:10]}"

                # Re-tailor just the included experiences
                for exp_r in result["experiences"]:
                    if not exp_r.get("included", True):
                        continue
                    exp_orig = next((e for e in experiences if e["id"] == exp_r["id"]), None)
                    if not exp_orig:
                        continue
                    try:
                        user_prompt = (
                            f"## This Experience\n"
                            f"Company: {exp_orig['company']}\nTitle: {exp_orig['title']}\n"
                            f"Current bullets (from first tailoring pass):\n" +
                            "\n".join(f"- {b}" for b in exp_r.get("bullets", [])) +
                            f"\n\n{jd_context}{iteration_context}"
                        )
                        raw = await provider.generate(TAILOR_EXPERIENCE_PROMPT + system_suffix, user_prompt)
                        iter_result = _extract_json(raw)
                        exp_r["bullets"] = iter_result.get("bullets", exp_r["bullets"])
                    except Exception:
                        pass  # Keep first-pass result

            yield {"step": "iterate", "status": "done", "message": "Re-optimization complete"}
    except Exception as e:
        logger.error("Re-scoring failed: %s", e)
        yield {"step": "rescore", "status": "error", "message": str(e)}

    # ── Final: Emit complete result ──
    logger.info("=== PIPELINE COMPLETE ===")
    logger.info("Final result: %s", json.dumps(result, indent=2)[:500])
    yield {"step": "complete", "status": "done", "data": result}


def _rebuild_resume_text(original_text: str, result: dict, structured: dict) -> str:
    """Rebuild plain text resume from tailored results for re-scoring."""
    lines = []
    # Keep header from original (contact info)
    for line in original_text.split("\n"):
        if line.strip().upper() in ("SUMMARY", "EXPERIENCE", "PROJECTS", "SKILLS", "EDUCATION"):
            break
        lines.append(line)

    if result.get("summary"):
        lines.append("SUMMARY")
        lines.append(result["summary"])
        lines.append("")

    lines.append("EXPERIENCE")
    for exp_r in result.get("experiences", []):
        if not exp_r.get("included", True):
            continue
        orig = next((e for e in structured.get("experiences", []) if e["id"] == exp_r["id"]), {})
        lines.append(f"{orig.get('title', '')}, {orig.get('company', '')}")
        for b in exp_r.get("bullets", []):
            lines.append(f"  - {b}")
        lines.append("")

    lines.append("PROJECTS")
    for proj_r in result.get("projects", []):
        if not proj_r.get("included", True):
            continue
        orig = next((p for p in structured.get("projects", []) if p["id"] == proj_r["id"]), {})
        lines.append(f"{orig.get('name', '')} | {orig.get('tech_stack', '')}")
        for b in proj_r.get("bullets", []):
            lines.append(f"  - {b}")
        lines.append("")

    lines.append("SKILLS")
    for sk_r in result.get("skills", []):
        if not sk_r.get("included", True):
            continue
        orig = next((s for s in structured.get("skills", []) if s["id"] == sk_r["id"]), {})
        lines.append(f"{orig.get('category', '')}: {sk_r.get('items', '')}")
    lines.append("")

    # Keep education from original
    in_edu = False
    for line in original_text.split("\n"):
        if line.strip().upper() == "EDUCATION":
            in_edu = True
        if in_edu:
            lines.append(line)

    return "\n".join(lines)


# ---- Legacy single-shot function (kept for backward compat) ----

SYSTEM_PROMPT = """\
You are an expert resume tailoring AI. Your job is to optimize a resume for a specific job description.

Rules:
- Output ONLY valid JSON matching the schema below. No markdown, no explanation.
- Keep the resume to ONE page worth of content.
- Every bullet point must be a single line, metric-driven, and impact-focused.
- Start each bullet with a strong action verb (past tense for past roles).
- Integrate keywords from the job description naturally.
- Rewrite bullets to highlight relevance to the target role.
- Set "included": false for items that are least relevant to the JD (to help fit one page).
- Rewrite the summary to be a 2-3 sentence pitch tailored to this specific role.
- For skills, keep all existing categories but mark less relevant ones as included: false.
- Do NOT invent experience, projects, or skills that don't exist in the original resume.
- Do NOT change company names, job titles, dates, project names, or education details.
"""

OUTPUT_SCHEMA = """\
Output JSON schema:
{
  "summary": "tailored professional summary string",
  "experiences": [
    {
      "id": <original id>,
      "bullets": ["rewritten bullet 1", "rewritten bullet 2", ...],
      "included": true/false
    }
  ],
  "projects": [
    {
      "id": <original id>,
      "bullets": ["rewritten bullet 1", ...],
      "included": true/false
    }
  ],
  "skills": [
    {
      "id": <original id>,
      "items": "rewritten comma-separated skills string",
      "included": true/false
    }
  ]
}
"""


async def tailor_resume(
    resume_text: str,
    resume_structured: dict,
    job_description: str,
    ats_result: Optional[dict] = None,
) -> dict[str, Any]:
    """Legacy single-shot tailoring. Use run_pipeline() for multi-step."""
    provider = get_ai_provider()
    parts = [
        "## Master Resume (plain text)\n" + resume_text,
        "\n## Resume Structure (JSON)\n" + json.dumps(resume_structured, indent=2),
        "\n## Target Job Description\n" + job_description,
    ]
    if ats_result:
        parts.append("\n## Current ATS Score Analysis\n" + json.dumps(ats_result, indent=2))
    parts.append("\n" + OUTPUT_SCHEMA)
    user_prompt = "\n".join(parts)

    logger.info("=== LEGACY TAILOR REQUEST [%s] ===", type(provider).__name__)
    raw = await provider.generate(SYSTEM_PROMPT, user_prompt)
    logger.info("=== LEGACY TAILOR RESPONSE ===\n%s", raw[:500])
    return _extract_json(raw)
