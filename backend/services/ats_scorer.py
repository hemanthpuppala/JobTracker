"""ATS (Applicant Tracking System) scoring engine.

Pure-function scoring: text in, score out. No DB, no API dependencies.
"""

import re
import math
from collections import Counter
from typing import Any

# --- Constants ---

STRONG_ACTION_VERBS = {
    "achieved", "administered", "advanced", "analyzed", "architected", "automated",
    "built", "championed", "collaborated", "consolidated", "contributed",
    "created", "decreased", "delivered", "deployed", "designed", "developed",
    "directed", "drove", "eliminated", "enabled", "engineered", "established",
    "executed", "expanded", "expedited", "facilitated", "formulated",
    "generated", "grew", "headed", "identified", "implemented", "improved",
    "increased", "influenced", "initiated", "integrated", "introduced",
    "launched", "led", "leveraged", "maintained", "managed", "maximized",
    "mentored", "migrated", "minimized", "modernized", "negotiated",
    "optimized", "orchestrated", "organized", "overhauled", "partnered",
    "pioneered", "planned", "produced", "programmed", "proposed",
    "published", "rebuilt", "reduced", "refactored", "reengineered",
    "resolved", "restructured", "revamped", "scaled", "secured",
    "simplified", "spearheaded", "standardized", "streamlined",
    "strengthened", "supervised", "surpassed", "synthesized", "tested",
    "trained", "transformed", "tripled", "unified", "upgraded",
}

WEAK_VERBS = {
    "assisted", "helped", "handled", "worked", "responsible",
    "participated", "involved", "tasked", "did", "made", "used",
    "supported", "contributed to",
}

STANDARD_SECTIONS = ["contact", "summary", "experience", "skills", "education", "projects"]

# Common stop words to exclude from keyword extraction
STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "shall", "this", "that",
    "these", "those", "i", "you", "he", "she", "it", "we", "they",
    "what", "which", "who", "when", "where", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such",
    "no", "not", "only", "own", "same", "so", "than", "too", "very",
    "just", "because", "as", "until", "while", "about", "between",
    "through", "during", "before", "after", "above", "below", "up",
    "down", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "any", "our", "your", "their", "its",
    "also", "into", "if", "etc", "e.g", "i.e", "per", "via",
    # Job posting fluff words
    "experience", "ability", "skills", "work", "team", "looking",
    "required", "preferred", "must", "strong", "excellent", "good",
    "great", "well", "including", "across", "within", "using",
    "working", "role", "position", "candidate", "opportunity",
    "responsibilities", "requirements", "qualifications", "years",
    "year", "company", "join", "us", "we're",
}

# Degree keywords for education matching
DEGREE_KEYWORDS = {
    "phd": 4, "ph.d": 4, "doctorate": 4,
    "master": 3, "masters": 3, "m.s.": 3, "m.s": 3, "ms": 3, "mba": 3, "m.a.": 3,
    "bachelor": 2, "bachelors": 2, "b.s.": 2, "b.s": 2, "bs": 2, "b.a.": 2, "ba": 2,
    "associate": 1,
}


def score_resume(resume_text: str, job_description: str) -> dict[str, Any]:
    """Main entry point: score a resume against a job description."""
    resume_lower = resume_text.lower()
    jd_lower = job_description.lower()

    # Extract data
    jd_keywords = extract_keywords(jd_lower)
    resume_keywords = extract_keywords(resume_lower)
    resume_bullets = extract_bullets(resume_text)

    # Calculate each category
    keyword_result = calculate_keyword_match(resume_keywords, jd_keywords, resume_lower, jd_lower)
    skills_result = calculate_skills_match(resume_lower, jd_lower)
    experience_result = calculate_experience_relevance(resume_lower, jd_lower)
    education_result = calculate_education_match(resume_lower, jd_lower)
    section_result = check_section_completeness(resume_text)
    quant_result = check_quantification(resume_bullets)
    verb_result = check_action_verbs(resume_bullets)

    categories = {
        "keyword_match": {**keyword_result, "weight": 35},
        "skills_match": {**skills_result, "weight": 20},
        "experience_relevance": {**experience_result, "weight": 15},
        "education_match": {**education_result, "weight": 5},
        "section_completeness": {**section_result, "weight": 10},
        "quantification": {**quant_result, "weight": 10},
        "action_verbs": {**verb_result, "weight": 5},
    }

    # Weighted overall score
    overall = sum(
        cat["score"] * cat["weight"] / 100
        for cat in categories.values()
    )
    overall = round(overall)

    suggestions = generate_suggestions(categories)

    return {
        "overall_score": overall,
        "categories": categories,
        "suggestions": suggestions,
    }


def extract_keywords(text: str) -> list[str]:
    """Extract meaningful keywords/phrases from text using TF-IDF-like importance."""
    # Tokenize: words and multi-word technical terms
    words = re.findall(r'[a-z][a-z0-9.+#\-]*(?:\s*[/&]\s*[a-z][a-z0-9.+#\-]*)?', text)

    # Filter stop words and short words
    keywords = [w.strip() for w in words if w.strip() not in STOP_WORDS and len(w.strip()) > 1]

    # Also extract capitalized multi-word terms (e.g., "Machine Learning") from original
    bigrams = re.findall(r'[a-z][a-z0-9.+#]*\s+[a-z][a-z0-9.+#]*', text)
    for bg in bigrams:
        parts = bg.split()
        if all(p not in STOP_WORDS for p in parts) and all(len(p) > 1 for p in parts):
            keywords.append(bg)

    return keywords


def extract_bullets(text: str) -> list[str]:
    """Extract bullet-point lines from resume text."""
    bullets = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith(("-", "*", "\u2022")):
            bullets.append(stripped.lstrip("-*\u2022 ").strip())
        elif re.match(r'^\d+[.)]\s', stripped):
            bullets.append(re.sub(r'^\d+[.)]\s*', '', stripped).strip())
    return [b for b in bullets if b]


def calculate_keyword_match(
    resume_kw: list[str], jd_kw: list[str],
    resume_lower: str, jd_lower: str,
) -> dict:
    """Keyword matching with frequency-based importance weighting."""
    # Count keyword frequency in JD (higher freq = more important)
    jd_counter = Counter(jd_kw)
    # Get unique JD keywords sorted by importance
    unique_jd = sorted(set(jd_kw), key=lambda k: -jd_counter[k])

    # Deduplicate: keep top N most important
    top_keywords = unique_jd[:80]

    resume_set = set(resume_kw)
    resume_text_check = set(resume_lower.split())

    matched = []
    missing = []

    for kw in top_keywords:
        # Exact match in keyword list or fuzzy presence in full text
        if kw in resume_set or kw in resume_lower:
            matched.append(kw)
        else:
            missing.append(kw)

    # Deduplicate results
    matched = list(dict.fromkeys(matched))[:30]
    missing = list(dict.fromkeys(missing))[:20]

    total = len(matched) + len(missing)
    score = round(len(matched) / total * 100) if total > 0 else 0

    return {"score": score, "matched": matched, "missing": missing}


def calculate_skills_match(resume_lower: str, jd_lower: str) -> dict:
    """Extract technical skills from JD and check against resume."""
    # Common technical skill patterns
    tech_patterns = [
        # Programming languages
        r'\b(?:python|java|javascript|typescript|c\+\+|c#|ruby|go|golang|rust|swift|kotlin|scala|php|perl|r|matlab|dart|lua)\b',
        # Frameworks/libraries
        r'\b(?:react|angular|vue|next\.?js|node\.?js|express|django|flask|fastapi|spring|rails|laravel|\.net|blazor|svelte|nuxt)\b',
        # Cloud/DevOps
        r'\b(?:aws|azure|gcp|docker|kubernetes|k8s|terraform|ansible|jenkins|circleci|github\s*actions|gitlab\s*ci|ci/cd|cd/ci)\b',
        # Databases
        r'\b(?:sql|mysql|postgresql|postgres|mongodb|redis|elasticsearch|dynamodb|cassandra|sqlite|oracle|neo4j|graphql)\b',
        # Tools/Platforms
        r'\b(?:git|jira|confluence|figma|tableau|power\s*bi|snowflake|airflow|kafka|rabbitmq|celery|nginx|linux)\b',
        # AI/ML
        r'\b(?:machine\s*learning|deep\s*learning|nlp|natural\s*language|computer\s*vision|tensorflow|pytorch|keras|scikit|pandas|numpy|llm|gpt|bert|transformer)\b',
        # Methodologies
        r'\b(?:agile|scrum|kanban|tdd|bdd|devops|microservices|rest|restful|api|soap|grpc|websocket)\b',
    ]

    jd_skills = set()
    resume_skills = set()

    for pattern in tech_patterns:
        jd_matches = re.findall(pattern, jd_lower)
        resume_matches = re.findall(pattern, resume_lower)
        jd_skills.update(m.strip() for m in jd_matches)
        resume_skills.update(m.strip() for m in resume_matches)

    matched = sorted(jd_skills & resume_skills)
    missing = sorted(jd_skills - resume_skills)

    total = len(jd_skills)
    score = round(len(matched) / total * 100) if total > 0 else 100

    return {"score": score, "matched": matched, "missing": missing}


def calculate_experience_relevance(resume_lower: str, jd_lower: str) -> dict:
    """Match job titles, years of experience, and industry terms."""
    score = 50  # Baseline
    details = []

    # Check for years of experience requirement
    yoe_match = re.search(r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)', jd_lower)
    if yoe_match:
        required_years = int(yoe_match.group(1))
        # Check if resume mentions years
        resume_years = re.findall(r'(\d{4})', resume_lower)
        if len(resume_years) >= 2:
            years_span = max(int(y) for y in resume_years) - min(int(y) for y in resume_years)
            if years_span >= required_years:
                score += 25
                details.append(f"Experience span (~{years_span}yr) meets {required_years}yr requirement")
            else:
                score += 10
                details.append(f"Experience span (~{years_span}yr) below {required_years}yr requirement")
    else:
        score += 15
        details.append("No specific years requirement in JD")

    # Check for job title keywords
    title_patterns = re.findall(
        r'\b(?:engineer|developer|architect|manager|lead|senior|junior|principal|staff|director|analyst|scientist|designer|intern)\b',
        jd_lower,
    )
    title_matches = sum(1 for t in set(title_patterns) if t in resume_lower)
    if title_patterns:
        title_ratio = title_matches / len(set(title_patterns))
        score += round(title_ratio * 25)
        if title_matches > 0:
            details.append(f"Matched {title_matches}/{len(set(title_patterns))} role-level keywords")

    score = min(100, max(0, score))
    return {"score": score, "details": "; ".join(details) if details else "Basic relevance check passed"}


def calculate_education_match(resume_lower: str, jd_lower: str) -> dict:
    """Check degree requirements from JD against resume."""
    # Find required degree level in JD
    jd_degree_level = 0
    jd_degree_name = ""
    for keyword, level in DEGREE_KEYWORDS.items():
        if keyword in jd_lower:
            if level > jd_degree_level:
                jd_degree_level = level
                jd_degree_name = keyword

    if jd_degree_level == 0:
        return {"score": 100, "details": "No specific degree requirement in JD"}

    # Find highest degree in resume
    resume_degree_level = 0
    resume_degree_name = ""
    for keyword, level in DEGREE_KEYWORDS.items():
        if keyword in resume_lower:
            if level > resume_degree_level:
                resume_degree_level = level
                resume_degree_name = keyword

    if resume_degree_level >= jd_degree_level:
        return {"score": 100, "details": f"Resume degree ({resume_degree_name}) meets requirement ({jd_degree_name})"}
    elif resume_degree_level > 0:
        return {"score": 60, "details": f"Resume degree ({resume_degree_name}) below requirement ({jd_degree_name})"}
    else:
        return {"score": 30, "details": f"No degree found in resume; JD requires {jd_degree_name}"}


def check_section_completeness(resume_text: str) -> dict:
    """Check for presence of standard ATS sections."""
    text_lower = resume_text.lower()

    section_checks = {
        "contact": bool(re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', text_lower) or re.search(r'\d{3}[\s.-]?\d{3}[\s.-]?\d{4}', text_lower)),
        "summary": any(h in text_lower for h in ["summary", "objective", "profile", "about"]),
        "experience": any(h in text_lower for h in ["experience", "employment", "work history"]),
        "skills": "skills" in text_lower or "technologies" in text_lower or "technical" in text_lower,
        "education": "education" in text_lower or "degree" in text_lower or "university" in text_lower,
        "projects": "projects" in text_lower or "portfolio" in text_lower,
    }

    present = [s for s, found in section_checks.items() if found]
    missing = [s for s, found in section_checks.items() if not found]

    score = round(len(present) / len(STANDARD_SECTIONS) * 100)
    return {"score": score, "present": present, "missing": missing}


def check_quantification(bullets: list[str]) -> dict:
    """Check percentage of bullets with numbers/metrics/quantified results."""
    if not bullets:
        return {"score": 0, "quantified_count": 0, "total_bullets": 0}

    quantified = 0
    for bullet in bullets:
        # Look for numbers, percentages, dollar amounts, multipliers
        if re.search(r'\d+[%xX]|\$[\d,]+|\d{2,}[\s,]|\b\d+\s*(?:million|billion|thousand|users|clients|customers|projects|team|members|applications|requests|endpoints|services)\b', bullet):
            quantified += 1

    total = len(bullets)
    # Target: 60%+ bullets quantified = 100 score
    ratio = quantified / total
    score = min(100, round(ratio / 0.6 * 100))

    return {"score": score, "quantified_count": quantified, "total_bullets": total}


def check_action_verbs(bullets: list[str]) -> dict:
    """Check usage of strong vs weak action verbs in bullets."""
    if not bullets:
        return {"score": 0, "strong_verbs": [], "weak_verbs": []}

    strong_found = set()
    weak_found = set()

    for bullet in bullets:
        words = bullet.lower().split()
        if not words:
            continue
        first_word = words[0].rstrip("ed,s")
        # Check first word and first few words
        for word in words[:3]:
            clean = word.rstrip("ed,s.")
            if clean in STRONG_ACTION_VERBS or word in STRONG_ACTION_VERBS:
                strong_found.add(word)
            elif clean in WEAK_VERBS or word in WEAK_VERBS:
                weak_found.add(word)

    total_verbs = len(strong_found) + len(weak_found)
    if total_verbs == 0:
        # Check if bullets start with verbs at all
        score = 50
    else:
        ratio = len(strong_found) / total_verbs
        score = round(ratio * 100)

    return {
        "score": score,
        "strong_verbs": sorted(strong_found),
        "weak_verbs": sorted(weak_found),
    }


def generate_suggestions(categories: dict) -> list[str]:
    """Generate actionable improvement suggestions based on scores."""
    suggestions = []

    # Keywords
    kw = categories["keyword_match"]
    if kw["score"] < 80 and kw.get("missing"):
        top_missing = kw["missing"][:5]
        suggestions.append(f"Add these missing keywords: {', '.join(top_missing)}")

    # Skills
    sk = categories["skills_match"]
    if sk["score"] < 80 and sk.get("missing"):
        top_missing = sk["missing"][:5]
        suggestions.append(f"Add these missing technical skills: {', '.join(top_missing)}")

    # Experience
    exp = categories["experience_relevance"]
    if exp["score"] < 60:
        suggestions.append("Tailor your job titles and descriptions to better match the target role")

    # Education
    edu = categories["education_match"]
    if edu["score"] < 60:
        suggestions.append(f"Education gap: {edu.get('details', 'Consider adding relevant education or certifications')}")

    # Sections
    sec = categories["section_completeness"]
    if sec.get("missing"):
        suggestions.append(f"Add missing resume sections: {', '.join(sec['missing'])}")

    # Quantification
    quant = categories["quantification"]
    if quant["score"] < 70:
        unquantified = quant["total_bullets"] - quant["quantified_count"]
        if unquantified > 0:
            suggestions.append(f"{unquantified} of {quant['total_bullets']} bullet points lack quantified results - add metrics, numbers, or percentages")

    # Action verbs
    verb = categories["action_verbs"]
    if verb["score"] < 70 and verb.get("weak_verbs"):
        suggestions.append(f"Replace weak verbs ({', '.join(verb['weak_verbs'][:3])}) with stronger action verbs")

    if not suggestions:
        suggestions.append("Great job! Your resume is well-optimized for this job description")

    return suggestions
