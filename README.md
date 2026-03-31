# byte-bicep — Start Hack 2026

An AI-powered Thesis Journey built for the **Studyond** challenge at START Hack 2026.

Students chat with an AI advisor that progressively learns about their interests, skills, and career goals through natural, LLM-driven dialogue. The advisor asks targeted follow-up questions based on what it already knows, building a rich student profile before generating a personalized, interactive graph of thesis pathways — combining matching topics, supervisors, companies, and industry experts, each scored with AI confidence ratings.

## Team

| GitHub | Role |
|--------|------|
| [MrFleix](https://github.com/MrFleix) | Backend, Architecture |
| [Chipi8704](https://github.com/Chipi8704) | Frontend, Architecture |
| [nicoe64](https://github.com/nicoe64) | Planning, Design,  |
| [Metax0](https://github.com/Metax0) | Planning, General |


## Project Previews

### Graph Overview
![Graph Overview](assets/graph_overview.png)

### Research Proposal Tool
![Research Proposal Tool](assets/research_proposal.png)

### Prototype (Figma)
<a href="https://www.figma.com/proto/GVtEYTsJ4MJZwFkKJWoLC0/Hackathon-2026?node-id=89-10&t=w6VbMVLPIPmx9BBo-1&scaling=scale-down&content-scaling=fixed&page-id=89%3A8&starting-point-node-id=89%3A10" target="_blank">
  <img src="assets/figma_prototype.png" alt="Figma Prototype" width="400"/>
</a>

**Key features:**
- LLM-driven conversational advisor that progressively builds a student profile through adaptive dialogue
- RAG-powered candidate search across 140+ real platform entities using semantic embeddings
- Interactive graph with multi-path exploration and node selection
- Research proposal editor with field-by-field AI guidance
- Live graph refinement — tell the AI you want a different direction and the graph updates instantly
- Profile dashboard with match distribution charts 

---

## Setup
```bash
python3.11 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows
pip install -r requirements.txt
```

## Starting Frontend
```bash
Install: https://nodejs.org/en/download
You have to open a new console and test with | npm -version
cd Frontend
npm install
npm run dev
```

## Starting Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
