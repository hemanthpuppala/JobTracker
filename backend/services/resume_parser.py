"""Hybrid resume parser — combines regex heuristics with OpenResume's feature
scoring techniques for robust, AI-free resume extraction.

Handles PDF line-wrapping, pipe/tab-separated fields, multiple date formats,
institution-first education, and company/title disambiguation via keyword lists.
"""

import re
from typing import Any


# ---------------------------------------------------------------------------
# Keyword lists (ported from OpenResume's TypeScript parser)
# ---------------------------------------------------------------------------

# Job title keywords — used for title vs company disambiguation
JOB_TITLES = [
    "Accountant", "Administrator", "Advisor", "Agent", "Analyst", "Apprentice",
    "Architect", "Assistant", "Associate", "Auditor", "Bartender", "Biologist",
    "Bookkeeper", "Buyer", "Carpenter", "Cashier", "CEO", "Clerk", "Co-op",
    "Co-Founder", "Consultant", "Coordinator", "CTO", "Developer", "Designer",
    "Director", "Driver", "Editor", "Electrician", "Engineer", "Extern",
    "Founder", "Freelancer", "Head", "Intern", "Janitor", "Journalist",
    "Laborer", "Lawyer", "Lead", "Manager", "Mechanic", "Member", "Nurse",
    "Officer", "Operator", "Operation", "Photographer", "President", "Producer",
    "Recruiter", "Representative", "Researcher", "Sales", "Server", "Scientist",
    "Specialist", "Supervisor", "Teacher", "Technician", "Trader", "Trainee",
    "Treasurer", "Tutor", "Vice", "VP", "Volunteer", "Webmaster", "Worker",
]

# School keywords — for education institution detection
SCHOOLS = [
    "College", "University", "Institute", "School", "Academy", "Polytechnic",
    "BASIS", "Magnet",
]

# Degree keywords — for education degree detection
DEGREES = [
    "Associate", "Bachelor", "Master", "PhD", "Ph.D", "Doctorate", "Diploma",
    "Certificate", "B.S.", "B.A.", "M.S.", "M.A.", "B.Tech", "M.Tech",
    "B.E.", "M.E.", "MBA", "BBA", "Doctor",
]

_JOB_TITLE_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(t) for t in JOB_TITLES) + r")\b", re.IGNORECASE
)
_SCHOOL_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(s) for s in SCHOOLS) + r")\b", re.IGNORECASE
)
_DEGREE_RE = re.compile(
    r"\b(?:" + "|".join(re.escape(d) for d in DEGREES) + r")\b", re.IGNORECASE
)
# Also match degree abbreviation patterns like AA, B.S., MBA
_DEGREE_ABBREV_RE = re.compile(r"\b[ABM][A-Z.]{1,4}\b")


# ---------------------------------------------------------------------------
# Section header detection
# ---------------------------------------------------------------------------

_SECTION_HEADERS: dict[str, list[str]] = {
    "experience": [
        "experience", "work history", "employment", "professional experience",
        "work experience", "employment history", "career history",
        "relevant experience", "career experience",
    ],
    "education": [
        "education", "academic background", "academics", "academic history",
        "educational background", "qualifications",
    ],
    "skills": [
        "skills", "technical skills", "core competencies", "competencies",
        "technologies", "technical competencies", "areas of expertise",
        "technical proficiencies", "proficiencies", "tools and technologies",
        "skills and technologies", "technical expertise",
    ],
    "projects": [
        "projects", "key projects", "personal projects", "side projects",
        "notable projects", "selected projects", "academic projects",
    ],
    "summary": [
        "summary", "objective", "profile", "professional summary",
        "about me", "about", "career summary", "executive summary",
        "professional profile", "career objective", "overview",
    ],
    "certifications": [
        "certifications", "certificates", "licenses", "credentials",
        "professional certifications", "licenses and certifications",
    ],
    "publications": [
        "publications", "papers", "research",
    ],
    "awards": [
        "awards", "honors", "achievements", "honors and awards",
    ],
}

_SECTION_PATTERNS: list[tuple[str, re.Pattern]] = []
for _sec_type, _headers in _SECTION_HEADERS.items():
    alts = "|".join(re.escape(h) for h in _headers)
    _SECTION_PATTERNS.append((
        _sec_type,
        re.compile(rf"^\s*(?:{alts})\s*[:=\-—]*\s*$", re.IGNORECASE),
    ))


# ---------------------------------------------------------------------------
# Contact patterns
# ---------------------------------------------------------------------------

_EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.\w{2,}")
_PHONE_RE = re.compile(
    r"(?:\+\d{1,3}[-.\s]?)?"
    r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
)
_LINKEDIN_RE = re.compile(
    r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+/?", re.IGNORECASE,
)
_GITHUB_RE = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/[\w-]+/?", re.IGNORECASE,
)
_URL_RE = re.compile(r"https?://[\w.\-/]+", re.IGNORECASE)
_LOCATION_RE = re.compile(r"\b[A-Z][a-zA-Z]+,\s*[A-Z]{2}\b")


# ---------------------------------------------------------------------------
# Date patterns
# ---------------------------------------------------------------------------

_MONTH = (
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
)
_MONTH_YEAR = rf"(?:{_MONTH}\s*\.?\s*\d{{4}}|\d{{1,2}}/\d{{4}}|\d{{4}})"
_DATE_END = rf"(?:{_MONTH_YEAR}|[Pp]resent|[Cc]urrent|[Oo]ngoing|[Nn]ow)"
_DATE_SEP = r"(?:\s*(?:[-–—]|to)\s*)"

_DATE_RANGE_RE = re.compile(
    rf"({_MONTH_YEAR}){_DATE_SEP}({_DATE_END})", re.IGNORECASE,
)
_SINGLE_DATE_RE = re.compile(rf"\b({_MONTH_YEAR})\b", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Bullet detection
# ---------------------------------------------------------------------------

_BULLET_MARKER_RE = re.compile(
    r"^\s*[•·\-\*\u00B7\u2022\u2023\u25E6\u2043\u25CF\u25CB\u2219○◦▪▸►]\s+"
)
_NUMBERED_BULLET_RE = re.compile(r"^\s*\d+[.)]\s+")


def _is_bullet(line: str) -> bool:
    return bool(_BULLET_MARKER_RE.match(line) or _NUMBERED_BULLET_RE.match(line))


def _clean_bullet(line: str) -> str:
    line = _BULLET_MARKER_RE.sub("", line)
    line = _NUMBERED_BULLET_RE.sub("", line)
    return line.strip()


# ---------------------------------------------------------------------------
# Line continuation joining — critical for PDF-extracted text
# ---------------------------------------------------------------------------

def _is_continuation_line(line: str) -> bool:
    """Check if a line is a continuation of the previous line (PDF wrapping).

    Continuation lines typically:
    - Start with a lowercase letter
    - Start with common continuation words (by, and, or, for, with, etc.)
    - Don't look like section headers, bullets, or entry headers
    """
    stripped = line.strip()
    if not stripped:
        return False
    # If it's a bullet, section header, or has a date range, it's not a continuation
    if _is_bullet(stripped):
        return False
    if _classify_line(stripped):
        return False
    # Starts with lowercase — very likely a continuation
    if stripped[0].islower():
        return True
    # Starts with a word that's typically mid-sentence
    first_word = stripped.split()[0] if stripped.split() else ""
    continuation_words = {
        "and", "or", "but", "by", "for", "with", "in", "on", "at", "to",
        "from", "of", "the", "a", "an", "as", "that", "which", "who",
        "through", "across", "into", "onto", "over", "under", "between",
    }
    if first_word.lower() in continuation_words:
        return True
    return False


def _is_continuation_line_contextual(prev_line: str, line: str) -> bool:
    """Enhanced continuation detection using context from the previous line.

    Catches cases like:
    - Previous line ends with "and" or comma → next line is continuation
    - "Hough Transform, integrated with..." after "...edge detection and"
    """
    stripped = line.strip()
    if not stripped:
        return False
    if _is_bullet(stripped):
        return False
    if _classify_line(stripped):
        return False

    # Check if previous line ends with connector — strongest continuation signal
    # (overrides date range and header checks)
    prev = prev_line.rstrip()
    prev_ends_with_connector = False
    if prev:
        if prev[-1] in (",", ";"):
            prev_ends_with_connector = True
        else:
            prev_words = prev.split()
            if prev_words:
                last_word = prev_words[-1].lower().rstrip(".,;:")
                trailing_connectors = {
                    "and", "or", "but", "by", "for", "with", "in", "on", "at", "to",
                    "from", "of", "the", "a", "an", "as", "that", "which", "who",
                    "through", "across", "into", "onto", "over", "under", "between",
                }
                if last_word in trailing_connectors:
                    prev_ends_with_connector = True

    if prev_ends_with_connector:
        # Even with connector, don't join if this line has a pipe + date range
        # AND contains a job title keyword (strong indicator of new job entry)
        has_pipe_with_date = (
            "|" in stripped and _DATE_RANGE_RE.search(stripped)
        )
        if has_pipe_with_date and _has_job_title(stripped):
            pass  # Don't join — it's a new job entry
        else:
            return True

    # If it has a date range, it's not a continuation
    if _DATE_RANGE_RE.search(stripped):
        return False
    # If it looks like an entry header (has pipe, etc.), not a continuation
    if _looks_like_entry_header(stripped):
        return False

    # Basic continuation check
    if _is_continuation_line(stripped):
        return True

    return False


def _join_continuation_lines(lines: list[str]) -> list[str]:
    """Join lines that are continuations of the previous line (PDF wrapping)."""
    if not lines:
        return lines
    result: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            result.append(line)
            continue
        # Find the previous non-empty line for contextual check
        prev = ""
        for i in range(len(result) - 1, -1, -1):
            if result[i].strip():
                prev = result[i]
                break
        if result and prev and _is_continuation_line_contextual(prev, stripped):
            for i in range(len(result) - 1, -1, -1):
                if result[i].strip():
                    result[i] = result[i].rstrip() + " " + stripped
                    break
            else:
                result.append(line)
        else:
            result.append(line)
    return result


# ---------------------------------------------------------------------------
# Section splitting
# ---------------------------------------------------------------------------

def _classify_line(line: str) -> str | None:
    stripped = line.strip().rstrip(":").rstrip("-").rstrip("=").strip()
    if not stripped or len(stripped) > 80:
        return None
    if len(stripped.split()) > 6:
        return None
    for section_type, pattern in _SECTION_PATTERNS:
        if pattern.match(line):
            return section_type
    return None


def _split_into_sections(lines: list[str]) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {"header": []}
    current = "header"
    for line in lines:
        sec_type = _classify_line(line)
        if sec_type:
            current = sec_type
            if current not in sections:
                sections[current] = []
        else:
            sections.setdefault(current, []).append(line)
    return sections


# ---------------------------------------------------------------------------
# Contact extraction
# ---------------------------------------------------------------------------

def _extract_contact(lines: list[str]) -> dict[str, str]:
    contact: dict[str, str] = {
        "fullName": "", "email": "", "phone": "", "location": "",
        "linkedin": "", "github": "", "portfolio": "",
    }
    if not lines:
        return contact

    all_tokens: list[str] = []
    raw_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        raw_lines.append(stripped)
        parts = re.split(r"\s*[|\t]\s*|\s{2,}", stripped)
        all_tokens.extend(p.strip() for p in parts if p.strip())

    # Name = first non-empty raw line's first token
    for raw in raw_lines:
        if _EMAIL_RE.match(raw) or _PHONE_RE.match(raw):
            continue
        parts = re.split(r"\s*[|\t]\s*|\s{2,}", raw)
        name_candidate = parts[0].strip()
        if _EMAIL_RE.match(name_candidate) or _PHONE_RE.match(name_candidate):
            continue
        if name_candidate.lower().startswith("http"):
            continue
        loc_match = _LOCATION_RE.search(name_candidate)
        if loc_match:
            loc_text = loc_match.group().strip()
            name_without_loc = name_candidate[:loc_match.start()].strip().rstrip(",").strip()
            if len(name_without_loc.split()) >= 2:
                name_candidate = name_without_loc
                if not contact["location"]:
                    contact["location"] = loc_text
        contact["fullName"] = name_candidate
        break

    token_text = "  ".join(all_tokens)

    m = _EMAIL_RE.search(token_text)
    if m:
        contact["email"] = m.group()
    m = _PHONE_RE.search(token_text)
    if m:
        contact["phone"] = m.group()
    m = _LINKEDIN_RE.search(token_text)
    if m:
        contact["linkedin"] = m.group()
    m = _GITHUB_RE.search(token_text)
    if m:
        contact["github"] = m.group()

    for token in all_tokens:
        if _EMAIL_RE.search(token) or _PHONE_RE.search(token):
            continue
        if _LINKEDIN_RE.search(token) or _GITHUB_RE.search(token):
            continue
        if token == contact["fullName"]:
            continue
        m = _LOCATION_RE.search(token)
        if m:
            contact["location"] = m.group().strip()
            break
        if re.match(r"^[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(\s+\d{5})?$", token.strip()):
            contact["location"] = token.strip()
            break

    for token in all_tokens:
        if token.lower() in ("portfolio", "website"):
            continue
        url_match = _URL_RE.search(token)
        if url_match:
            url = url_match.group()
            if "linkedin.com" not in url.lower() and "github.com" not in url.lower():
                contact["portfolio"] = url
                break

    return contact


# ---------------------------------------------------------------------------
# Experience parsing — with OpenResume's job title keyword scoring
# ---------------------------------------------------------------------------

def _has_date_range(line: str) -> re.Match | None:
    expanded = line.replace("\t", "    ")
    return _DATE_RANGE_RE.search(expanded)


def _has_job_title(text: str) -> bool:
    """Check if text contains a known job title keyword."""
    return bool(_JOB_TITLE_RE.search(text))


def _extract_title_company(text: str) -> tuple[str, str]:
    """Extract title and company using job title keyword scoring.

    Uses OpenResume's approach: the side with a job title keyword is the title,
    the other side is the company. Falls back to left=company, right=title
    for "Company | Title" format (most common in resumes).
    """
    text = text.strip()
    if not text:
        return ("", "")

    for sep_re in [
        re.compile(r"\s*\|\s*"),
        re.compile(r"\s*[—–]\s*"),
        re.compile(r"\s+at\s+", re.IGNORECASE),
    ]:
        parts = sep_re.split(text, maxsplit=1)
        if len(parts) == 2 and parts[0].strip() and parts[1].strip():
            left, right = parts[0].strip(), parts[1].strip()

            left_has_title = _has_job_title(left)
            right_has_title = _has_job_title(right)
            left_has_school = bool(_SCHOOL_RE.search(left))
            right_has_school = bool(_SCHOOL_RE.search(right))

            # If one side has job title keywords and the other doesn't, that's the title
            if right_has_title and not left_has_title:
                return (right, left)
            if left_has_title and not right_has_title:
                return (left, right)

            # Both or neither have title keywords — use company indicators
            company_re = re.compile(
                r"\b(?:Inc|LLC|Corp|Ltd|Company|Co|Group|Technologies|"
                r"Integration|Startup)\b", re.IGNORECASE,
            )
            if company_re.search(left) and not company_re.search(right):
                return (right, left)
            if company_re.search(right) and not company_re.search(left):
                return (left, right)
            if left_has_school:
                return (right, left)
            if right_has_school:
                return (left, right)

            # Default: left=company, right=title (common "Company | Title" format)
            return (right, left)

    # Comma separation fallback
    comma_parts = text.split(",", 1)
    if len(comma_parts) == 2:
        left, right = comma_parts[0].strip(), comma_parts[1].strip()
        if len(left.split()) <= 8 and len(right.split()) <= 8:
            if _has_job_title(right):
                return (right, left)
            if _has_job_title(left):
                return (left, right)
            return (left, right)

    return (text, "")


def _looks_like_entry_header(line: str) -> bool:
    """Heuristic: does this line look like a job/company header?"""
    if len(line) > 100:
        return False

    # Has a separator with reasonable parts on both sides
    for pattern in [r"\s*\|\s*", r"\s*[—–]\s*", r"\s+at\s+"]:
        parts = re.split(pattern, line, maxsplit=1)
        if len(parts) == 2 and 1 <= len(parts[0].split()) <= 8 and len(parts[1].strip()) >= 2:
            return True

    if "," in line and len(line) < 80:
        parts = line.split(",", 1)
        left, right = parts[0].strip(), parts[1].strip()
        if len(left.split()) <= 6 and len(right.split()) <= 6 and len(left) >= 3 and len(right) >= 2:
            # Reject if right side looks like a sentence (many words, starts with verb/preposition)
            if re.match(
                r"^(?:Led|Built|Designed|Developed|Implemented|Created|Managed|"
                r"Architected|Engineered|Deployed|Established|Integrated|Migrated|"
                r"Optimized|Reduced|Improved|Increased|Analyzed|Conducted|"
                r"Spearheaded|Streamlined|Automated|Collaborated|Coordinated|"
                r"integrated|ensuring|improving|reducing|including|using)\b",
                right, re.I,
            ):
                return False
            # At least one side should have a job title or company indicator
            if _has_job_title(left) or _has_job_title(right):
                return True
            company_re = re.compile(
                r"\b(?:Inc|LLC|Corp|Ltd|Company|Co|Group|Technologies|"
                r"Integration|Startup)\b", re.IGNORECASE,
            )
            if company_re.search(left) or company_re.search(right):
                return True

    return False


def _parse_experiences(lines: list[str]) -> list[dict[str, Any]]:
    """Parse experience section with continuation line joining."""
    # First join continuation lines
    lines = _join_continuation_lines(lines)

    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        date_match = _has_date_range(line)
        if date_match:
            date_text = date_match.group(0)
            expanded = line.replace("\t", "    ")
            rest = expanded.replace(date_text, "").strip()
            rest = re.sub(r"^\s*[|,]\s*|\s*[|,]\s*$", "", rest).strip()

            if rest:
                if current:
                    entries.append(current)
                title, company = _extract_title_company(rest)
                current = {
                    "company": company,
                    "title": title,
                    "dateStart": date_match.group(1).strip(),
                    "dateEnd": date_match.group(2).strip(),
                    "bullets": [],
                }
            else:
                if current and not current["dateStart"] and not current["bullets"]:
                    current["dateStart"] = date_match.group(1).strip()
                    current["dateEnd"] = date_match.group(2).strip()
                else:
                    if current:
                        entries.append(current)
                    current = {
                        "company": "", "title": "",
                        "dateStart": date_match.group(1).strip(),
                        "dateEnd": date_match.group(2).strip(),
                        "bullets": [],
                    }
            continue

        if _is_bullet(stripped):
            if current:
                current["bullets"].append(_clean_bullet(stripped))
            continue

        is_likely_header = _looks_like_entry_header(stripped)

        if current and current["dateStart"] and not is_likely_header:
            current["bullets"].append(stripped)
            continue

        if is_likely_header:
            if current:
                entries.append(current)
            tc_title, tc_company = _extract_title_company(stripped)
            current = {
                "company": tc_company, "title": tc_title,
                "dateStart": "", "dateEnd": "", "bullets": [],
            }
            continue

        if current:
            current["bullets"].append(stripped)
            continue

        tc_title, tc_company = _extract_title_company(stripped)
        current = {
            "company": tc_company, "title": tc_title,
            "dateStart": "", "dateEnd": "", "bullets": [],
        }

    if current:
        entries.append(current)
    return entries


# ---------------------------------------------------------------------------
# Project parsing
# ---------------------------------------------------------------------------

def _parse_projects(lines: list[str]) -> list[dict[str, Any]]:
    lines = _join_continuation_lines(lines)
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if _is_bullet(stripped):
            if current:
                current["bullets"].append(_clean_bullet(stripped))
            continue

        tech_match = re.match(
            r"^(?:Technologies?|Tech\s*Stack|Built\s*with|Tools?)\s*:\s*(.+)$",
            stripped, re.I,
        )
        if tech_match and current:
            current["techStack"] = tech_match.group(1).strip()
            continue

        # Detect project header: has pipe with tech stack, or parenthetical tech
        is_header = False
        if "|" in stripped:
            parts = stripped.split("|", 1)
            right = parts[1].strip()
            if right and len(right.split(",")) >= 2:
                is_header = True
        if not is_header and re.search(r"\(([^)]{5,})\)\s*$", stripped):
            is_header = True
        if not is_header and len(stripped) < 60 and not current:
            is_header = True

        if is_header and (current is None or current["bullets"]):
            if current:
                entries.append(current)

            name = stripped
            tech = ""

            dm = _DATE_RANGE_RE.search(stripped)
            if dm:
                name = stripped[:dm.start()].rstrip(" |,\t-–—") + stripped[dm.end():]
                name = name.strip()

            if "|" in name:
                parts = name.split("|", 1)
                name = parts[0].strip()
                tech = parts[1].strip()
            elif re.search(r"\(([^)]{5,})\)\s*$", name):
                m = re.search(r"\(([^)]{5,})\)\s*$", name)
                if m:
                    tech = m.group(1).strip()
                    name = name[:m.start()].strip()

            current = {"name": name, "techStack": tech, "bullets": []}
            continue

        if current:
            current["bullets"].append(stripped)
        else:
            current = {"name": stripped, "techStack": "", "bullets": []}

    if current:
        entries.append(current)
    return entries


# ---------------------------------------------------------------------------
# Skills parsing
# ---------------------------------------------------------------------------

def _parse_skills(lines: list[str]) -> list[dict[str, str]]:
    # Join continuation lines for skills too (multi-line skill lists)
    lines = _join_continuation_lines(lines)
    entries: list[dict[str, str]] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if _is_bullet(stripped):
            stripped = _clean_bullet(stripped)
            if not stripped:
                continue

        colon_match = re.match(r"^([^:]{2,50})\s*:\s*(.+)$", stripped)
        if colon_match:
            category = colon_match.group(1).strip()
            items = colon_match.group(2).strip()
            if len(category.split()) <= 8 and len(items) > 2:
                entries.append({"category": category, "items": items})
                continue

        dash_match = re.match(r"^(.{2,50})\s*[—–]\s*(.+)$", stripped)
        if dash_match:
            entries.append({
                "category": dash_match.group(1).strip(),
                "items": dash_match.group(2).strip(),
            })
            continue

        if "," in stripped and len(stripped.split(",")) >= 3:
            entries.append({"category": "General", "items": stripped})
        elif stripped:
            entries.append({"category": "General", "items": stripped})

    return entries


# ---------------------------------------------------------------------------
# Education parsing — with OpenResume's school/degree keyword detection
# ---------------------------------------------------------------------------

def _identify_degree_institution(text: str) -> tuple[str, str]:
    """Identify which part is the degree and which is the institution.

    Uses OpenResume's keyword lists: SCHOOLS for institutions, DEGREES for degrees.
    """
    if not text.strip():
        return ("", "")

    # Try splitting on common separators
    for sep in [" | ", "|", " — ", " – ", " - ", " at ", " from ", ", "]:
        if sep in text:
            parts = text.split(sep, 1)
            left, right = parts[0].strip(), parts[1].strip()
            if not left or not right:
                continue

            left_school = bool(_SCHOOL_RE.search(left))
            right_school = bool(_SCHOOL_RE.search(right))
            left_degree = bool(_DEGREE_RE.search(left) or _DEGREE_ABBREV_RE.search(left))
            right_degree = bool(_DEGREE_RE.search(right) or _DEGREE_ABBREV_RE.search(right))

            if left_school and not right_school:
                return (right, left)  # left=institution, right=degree
            if right_school and not left_school:
                return (left, right)  # right=institution
            if left_degree and not right_degree:
                return (left, right)
            if right_degree and not left_degree:
                return (right, left)

            # Default: first part = degree, second = institution
            return (left, right)

    # No separator — check if whole text is a school or degree
    return (text, "")


def _parse_education(lines: list[str]) -> list[dict[str, str]]:
    """Parse education with school/degree keyword detection."""
    lines = _join_continuation_lines(lines)
    entries: list[dict[str, str]] = []
    current: dict[str, str] | None = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        expanded = line.replace("\t", "    ")
        date_match = _DATE_RANGE_RE.search(expanded)
        single_date = _SINGLE_DATE_RE.search(expanded) if not date_match else None
        has_date = date_match or single_date

        # Check if line has a school keyword — strong indicator of new entry
        has_school = bool(_SCHOOL_RE.search(stripped))
        has_degree = bool(_DEGREE_RE.search(stripped) or _DEGREE_ABBREV_RE.search(stripped))

        if has_date:
            match_obj = date_match or single_date
            date_text = match_obj.group(0)  # type: ignore
            rest = expanded.replace(date_text, "").strip()
            rest = re.sub(r"^\s*[|,\t]\s*|\s*[|,\t]\s*$", "", rest).strip()

            gpa = ""
            gpa_match = re.search(r"\(?\s*GPA\s*:?\s*([\d.]+(?:\s*/\s*[\d.]+)?)\s*\)?", rest, re.I)
            if gpa_match:
                gpa = gpa_match.group(1).replace(" ", "")
                rest = rest[:gpa_match.start()] + rest[gpa_match.end():]
                rest = rest.strip().rstrip("|,").strip()

            # Also strip location patterns from end (e.g., "Clemson, SC")
            loc_match = re.search(r"\s+[A-Z][a-zA-Z]+,\s*[A-Z]{2}(?:,\s*\w+)?\s*$", rest)
            if loc_match:
                rest = rest[:loc_match.start()].strip()

            degree, institution = _identify_degree_institution(rest)

            # If no separator was found and text has school keyword, it's the institution
            if degree and not institution:
                if has_school and not has_degree:
                    institution = degree
                    degree = ""

            # Start new entry if this looks like a new institution or we have no current
            if not current or has_school or (has_degree and current.get("degree")):
                if current:
                    entries.append(current)
                current = {
                    "degree": degree,
                    "institution": institution,
                    "dateStart": date_match.group(1).strip() if date_match else (single_date.group(1).strip() if single_date else ""),
                    "dateEnd": date_match.group(2).strip() if date_match else "",
                    "gpa": gpa,
                }
            else:
                # Attach date to current entry
                current["dateStart"] = date_match.group(1).strip() if date_match else (single_date.group(1).strip() if single_date else "")
                current["dateEnd"] = date_match.group(2).strip() if date_match else ""
                if gpa:
                    current["gpa"] = gpa
                if degree and not current["degree"]:
                    current["degree"] = degree
                if institution and not current["institution"]:
                    current["institution"] = institution
            continue

        # Line with degree keywords — attach as degree to current or start new
        # (Check degree BEFORE GPA-only, since degree lines often contain inline GPA)
        if has_degree and current and not current["degree"]:
            deg_text = stripped
            # Strip location from end
            loc_match = re.search(r"\s+[A-Z][a-zA-Z]+,\s*[A-Z]{2}(?:,\s*\w+)?\s*$", deg_text)
            if loc_match:
                deg_text = deg_text[:loc_match.start()].strip()
            # Strip inline GPA
            gpa_m = re.search(r"\(?\s*GPA\s*:?\s*([\d.]+(?:\s*/\s*[\d.]+)?)\s*\)?", deg_text, re.I)
            if gpa_m:
                current["gpa"] = gpa_m.group(1).replace(" ", "")
                deg_text = deg_text[:gpa_m.start()] + deg_text[gpa_m.end():]
                deg_text = deg_text.strip().rstrip("|,()").strip()
            current["degree"] = deg_text
            continue

        # Non-date, non-degree line after institution — might contain degree info
        # e.g., "Master of Science in Computer Engineering (GPA: 3.76 / 4.0) Clemson, SC"
        if current and not current["degree"] and not has_school:
            deg_text = stripped
            loc_match = re.search(r"\s+[A-Z][a-zA-Z]+,\s*[A-Z]{2}(?:,\s*\w+)?\s*$", deg_text)
            if loc_match:
                deg_text = deg_text[:loc_match.start()].strip()
            gpa_m = re.search(r"\(?\s*GPA\s*:?\s*([\d.]+(?:\s*/\s*[\d.]+)?)\s*\)?", deg_text, re.I)
            if gpa_m:
                current["gpa"] = gpa_m.group(1).replace(" ", "")
                deg_text = deg_text[:gpa_m.start()] + deg_text[gpa_m.end():]
                deg_text = deg_text.strip().rstrip("|,()").strip()
            if deg_text:
                current["degree"] = deg_text
            continue

        # GPA on its own line (no degree keywords, no school keywords)
        gpa_match = re.search(r"GPA\s*:?\s*([\d.]+(?:\s*/\s*[\d.]+)?)", stripped, re.I)
        if gpa_match and current and not has_degree and not has_school:
            current["gpa"] = gpa_match.group(1).replace(" ", "")
            continue

        if has_school and (not current or current.get("institution")):
            # New institution without date on this line
            if current:
                entries.append(current)
            current = {"degree": "", "institution": stripped, "dateStart": "", "dateEnd": "", "gpa": ""}
            continue

        # Attach to current entry
        if current:
            if _is_bullet(stripped):
                continue
            if not current["institution"] and has_school:
                current["institution"] = stripped
            elif not current["degree"]:
                current["degree"] = stripped
            continue

        current = {"degree": stripped, "institution": "", "dateStart": "", "dateEnd": "", "gpa": ""}

    if current:
        entries.append(current)
    return entries


# ---------------------------------------------------------------------------
# Text preprocessing
# ---------------------------------------------------------------------------

def _preprocess_text(text: str) -> str:
    """Normalize text from PDFs: split inline bullets, insert line breaks
    before section headers and date ranges."""

    # Replace inline bullet chars with newline + bullet
    text = re.sub(r"\s*·\s+", "\n· ", text)

    # Insert newlines before known section headers appearing inline
    all_headers: list[str] = []
    for headers in _SECTION_HEADERS.values():
        all_headers.extend(headers)
    all_headers.sort(key=len, reverse=True)
    for header in all_headers:
        escaped = re.escape(header)
        pattern = re.compile(rf"(?<=\S)\s+({escaped})\s{{2,}}", re.IGNORECASE)
        text = pattern.sub(rf"\n\1\n", text)

    # ALL-CAPS headers after spaces
    text = re.sub(
        r"(?<=\S)\s{2,}([A-Z][A-Z\s&]{4,30}?)(?=\s{2,}|\n)",
        lambda m: f"\n{m.group(1).strip()}\n" if _classify_line(m.group(1).strip()) else m.group(0),
        text,
    )

    # Date ranges after double-spaces → tab-separated
    date_pattern = re.compile(
        rf"\s{{2,}}({_MONTH_YEAR}{_DATE_SEP}{_DATE_END})", re.IGNORECASE,
    )
    text = date_pattern.sub(r"\t\1", text)

    # Split concatenated entry headers at end of bullet lines
    new_lines = []
    for line in text.split("\n"):
        expanded = line.replace("\t", "    ")
        dm = _DATE_RANGE_RE.search(expanded)
        if dm and dm.start() > 40:
            before_date = expanded[:dm.start()]
            header_match = re.search(
                r"\s+((?:[A-Z][A-Za-z&.'()-]+\s*){1,5}\|\s*(?:[A-Za-z]+\s*){1,6})\s*$",
                before_date,
            )
            if header_match and header_match.start() > 20:
                bullet_part = line[:header_match.start()].strip()
                header_part = header_match.group(1).strip()
                date_part = expanded[dm.start():].strip()
                if bullet_part:
                    new_lines.append(bullet_part)
                new_lines.append(f"{header_part}\t{date_part}")
                continue

        if len(line) > 80 and "|" in line and _BULLET_MARKER_RE.match(line):
            last_pipe = line.rfind("|")
            if last_pipe > 40:
                after_pipe = line[last_pipe + 1:].strip()
                if after_pipe and len(after_pipe.split(",")) >= 2:
                    before_pipe = line[:last_pipe].rstrip()
                    split_idx = None
                    for match in re.finditer(r"\s{2,}(?=[A-Z])", before_pipe):
                        if match.start() > 20:
                            split_idx = match.start()
                    if split_idx is None:
                        for match in re.finditer(r"[.%\d]\s+(?=[A-Z][a-z])", before_pipe):
                            if match.start() > 20:
                                split_idx = match.start() + 1
                    if split_idx and split_idx > 20:
                        bullet_part = line[:split_idx].strip()
                        header_part = line[split_idx:].strip()
                        if bullet_part:
                            new_lines.append(bullet_part)
                        new_lines.append(header_part)
                        continue

        new_lines.append(line)

    text = "\n".join(new_lines)

    # Handle multi-entry education lines (multiple date ranges)
    final_lines = []
    for line in text.split("\n"):
        expanded = line.replace("\t", "    ")
        matches = list(_DATE_RANGE_RE.finditer(expanded))
        if len(matches) >= 2:
            parts = []
            last_end = 0
            for m in matches:
                before = expanded[last_end:m.start()]
                split_at = before.rfind("  ")
                if split_at > 0 and last_end + split_at > last_end:
                    parts.append(expanded[last_end:last_end + split_at].strip())
                    parts.append(expanded[last_end + split_at:m.end()].strip())
                else:
                    parts.append(expanded[last_end:m.end()].strip())
                last_end = m.end()
            if last_end < len(expanded):
                remaining = expanded[last_end:].strip()
                if remaining and parts:
                    parts[-1] += " " + remaining
            for p in parts:
                if p:
                    final_lines.append(p)
        else:
            final_lines.append(line)

    return "\n".join(final_lines)


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------

def parse_resume(text: str) -> dict[str, Any]:
    """Parse plain-text resume into structured data.

    Returns dict with keys: contact, summary, experiences, projects, skills, education.
    """
    text = _preprocess_text(text)
    lines = text.split("\n")
    sections = _split_into_sections(lines)

    contact = _extract_contact(sections.get("header", []))
    summary_lines = sections.get("summary", [])
    summary_joined = _join_continuation_lines(summary_lines)
    summary = "\n".join(l.strip() for l in summary_joined if l.strip())
    experiences = _parse_experiences(sections.get("experience", []))
    projects = _parse_projects(sections.get("projects", []))
    skills = _parse_skills(sections.get("skills", []))
    education = _parse_education(sections.get("education", []))

    return {
        "contact": contact,
        "summary": summary,
        "experiences": experiences,
        "projects": projects,
        "skills": skills,
        "education": education,
    }
