"""Seed resume data if the profile table is empty."""
from sqlalchemy.orm import Session

from .models.db_models import (
    Profile, Experience, ExperienceBullet,
    Project, ProjectBullet, Skill, SkillItem, Education,
)


def seed_resume_data(session: Session) -> None:
    existing = session.query(Profile).first()
    if existing:
        return

    profile = Profile(
        id=1,
        full_name="HEMANTH PUPPALA",
        location="Redmond, WA",
        phone="(864) 765-7693",
        email="hemanthpuppala47@gmail.com",
        linkedin="LinkedIn",
        github="GitHub",
        portfolio="Portfolio",
        summary="AI Engineer with 3+ years of experience architecting and deploying production-grade agentic systems, RAG pipelines, and LLM-powered automation. Proven track record integrating AI into enterprise workflows via secure APIs, MCP-connected tools, and multi-agent orchestration frameworks. Strong foundation across the full AI stack: from open-source model fine-tuning and inference optimization to cloud deployment, MLOps, and responsible AI practices. M.S. in Computer Engineering, Clemson University.",
    )
    session.add(profile)

    experiences_data = [
        ("Denali Advanced Integration", "Innovation AI Developer", "Aug 2025", "Present", 0, [
            "Architected 3 production agentic AI systems using multi-agent orchestration and MCP-connected tool integrations, now piloted and scaling to 1,000+ inference units per project at an enterprise client.",
            "Built LangGraph-orchestrated voice AI agent with Claude API function calling for real-time order validation, inventory updates, and PO/SO generation, processing 200+ weekly transactions at 98% accuracy.",
            "Engineered end-to-end agentic workflow spanning conversation, validation, and ERP system integration, reducing manual processing time by 90% across 50+ weekly transactions with full observability via LangSmith.",
            "Developed LoRA SFT fine-tuning pipeline on 2,000+ production examples and quantization pipeline (INT8, GGUF, AWQ) improving model accuracy from 75% to 94% and cutting inference latency by 50%.",
            "Deployed production CV system on edge hardware processing 500+ daily items at 94% accuracy with 82% cycle time reduction (62s to 10s) via CUDA-optimized inference and hardware-aware model optimization.",
            "Established responsible AI development standards and AI peer review gates across all deployments, catching hallucinated output schemas and context drift before production merges.",
        ]),
        ("MendIt (Startup)", "Founder and Software Engineer", "Oct 2025", "Present", 1, [
            "Built full-stack on-demand marketplace platform with Node.js/NestJS backend, PostgreSQL, Redis, WebSocket/SSE real-time pipelines, and 15+ REST API endpoints across 12 modules as sole engineer.",
            "Integrated Stripe payments, Firebase FCM notifications, and PostGIS geolocation APIs into a Dockerized horizontally scalable architecture with automated CI/CD deployment pipelines.",
        ]),
        ("Clemson University", "Research Assistant", "Jan 2025", "Jul 2025", 2, [
            "First-authored TRB research paper on real-time edge AI achieving 98.84% mAP at sub-100ms latency on Jetson Orin Nano, integrating V2X communication protocols (SAE J2735 SDSM) for connected vehicle safety.",
            "Fine-tuned YOLOv8 on 40,000+ annotated images via transfer learning improving mAP from 0.72 to 0.94; designed statistical A/B testing framework evaluating model performance across training and quantization configs.",
        ]),
        ("RealPage", "Software Developer Intern", "Feb 2023", "Jul 2023", 3, [
            "Migrated legacy Node.js APIs to C# ASP.NET Core serving 10,000+ users with 40% performance improvement and 60% faster release cycles via automated Git-based CI/CD pipelines.",
        ]),
    ]
    for company, title, ds, de, order, bullets in experiences_data:
        exp = Experience(company=company, title=title, date_start=ds, date_end=de, sort_order=order)
        session.add(exp)
        session.flush()
        for i, text in enumerate(bullets):
            session.add(ExperienceBullet(experience_id=exp.id, text=text, sort_order=i))

    projects_data = [
        ("Context-Aware Multi-Agent RAG System", "Python, LangGraph, LangChain, MCP, FAISS, Pinecone, AWS Bedrock, LangSmith, FastAPI", 0, [
            "Designed stateful multi-agent system with LangGraph orchestration, MCP tool integration, function calling, and hybrid FAISS/Pinecone retrieval achieving 35% accuracy improvement over baseline.",
            "Implemented full LangSmith observability for agent decision path tracing, cost-per-query tracking, and automated drift detection, enabling continuous improvement without engineering intervention.",
        ]),
        ("EKAM-CLI: Unified Open-Source LLM Inference and Benchmarking Platform", "Python, PyTorch, vLLM, Ollama, LlamaCPP, HuggingFace, Qwen, Llama, Mistral, TypeScript", 1, [
            "Consolidated 4 open-source inference engines (HuggingFace, vLLM, Ollama, LlamaCPP) across CUDA, ROCm, CPU, and Apple Silicon with standardized p50/p99 latency, throughput, and memory test suites.",
            "Deployed and benchmarked open-weight models (Qwen, Llama, Mistral, DeepSeek) with selective quantization (INT8, GGUF, AWQ), reducing inference latency by 40 to 60% and cutting deployment decision time by 60%.",
        ]),
        ("AI-Powered Job Application Intelligence System", "Python, FastAPI, PostgreSQL, Tailscale, TypeScript, REST APIs", 2, [
            "Built autonomous full-stack system where AI agents parse job postings, extract structured requirements, and call a self-hosted FastAPI/PostgreSQL backend deployed locally via Tailscale for pipeline tracking and management.",
        ]),
    ]
    for name, tech, order, bullets in projects_data:
        proj = Project(name=name, tech_stack=tech, sort_order=order)
        session.add(proj)
        session.flush()
        for i, text in enumerate(bullets):
            session.add(ProjectBullet(project_id=proj.id, text=text, sort_order=i))

    skills_data = [
        ("Agent and Orchestration", 0, ["LangGraph", "LangChain", "MCP", "A2A Frameworks", "OpenAI Agents SDK", "Multi-Agent Systems", "Tool Use", "Function Calling", "RAG", "Prompt and Context Engineering", "LangSmith"]),
        ("LLMs and AI", 1, ["Anthropic Claude API", "OpenAI API", "Qwen", "Llama", "Mistral", "DeepSeek", "HuggingFace", "Fine-Tuning (LoRA, SFT)", "Quantization (INT8, GGUF, AWQ)", "vLLM", "Ollama", "LlamaCPP", "Embeddings", "FAISS", "Pinecone"]),
        ("Cloud and MLOps", 2, ["AWS (S3, SageMaker, Bedrock, EC2)", "GCP Vertex AI", "Docker", "Kubernetes", "MLflow", "CI/CD", "REST APIs", "WebSockets", "PostgreSQL", "Redis", "Firebase"]),
        ("Languages and Systems", 3, ["Python", "TypeScript", "JavaScript", "Node.js/NestJS", "C++", "SQL", "Microservices", "System Design", "API Integration"]),
    ]
    for category, order, items in skills_data:
        skill = Skill(category=category, sort_order=order)
        session.add(skill)
        session.flush()
        for i, item_text in enumerate(items):
            session.add(SkillItem(skill_id=skill.id, item=item_text, sort_order=i))

    education_data = [
        ("M.S. in Computer Engineering", "Clemson University", "3.76/4.0", "Aug 2023", "May 2025", True, 0),
        ("B.Tech in Electronics and Communication Engineering", "Geethanjali College of Engineering and Technology", None, "Aug 2019", "Jul 2023", True, 1),
    ]
    for degree, inst, gpa, ds, de, default_val, order in education_data:
        session.add(Education(degree=degree, institution=inst, gpa=gpa, date_start=ds, date_end=de, is_default=default_val, sort_order=order))

    session.commit()
