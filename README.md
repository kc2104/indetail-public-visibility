# INDETAIL Public Demand & Visibility Monitor

A lightweight, no-account-connection GitHub Actions project for INDETAIL Design Studio, Vadodara.

## What it does
- Runs daily on GitHub Actions (and can be run manually).
- Searches public RSS/search feeds for phrases related to interior design demand in Vadodara.
- Collects public post/article title, URL, date, source and a short text excerpt.
- Scores likely service-intent mentions and exports CSV + JSON.
- Keeps a rolling `data/leads.csv` and `data/leads.json` in the repository.

## What it does NOT do
- It does not reveal private Google searches or identify anonymous searchers.
- It does not access Instagram private data, DMs, private profiles, or account analytics.
- It does not harvest personal phone numbers or private email addresses.
- It does not message people, post comments, change INDETAIL's website, or publish social posts.
- Search result feeds are discovery signals, not proof that a person is a qualified lead.
- Search volume estimates are not provided. Use Google Trends/Keyword Planner directly if you need measured volume.

## Sources
The initial collector uses public RSS endpoints:
- Google News RSS query results (publicly indexed news/pages)
- Reddit search RSS for `r/vadodara` (availability depends on Reddit rate limits and feed access)

Respect each source's terms, robots policies, and rate limits. The collector makes a small number of requests and does not bypass access controls. If a source blocks RSS access, that source is skipped and the run continues.

## Setup
1. Create a GitHub repository and upload these files.
2. In **Settings → Actions → General**, allow the workflow to create and approve pull requests only if you later add PR-based reporting. This starter workflow only commits output to its own repository.
3. In **Settings → Actions → General → Workflow permissions**, select **Read and write permissions** so the workflow can update its CSV/JSON report.
4. Open **Actions → INDETAIL Public Demand Monitor → Run workflow** for the first run.
5. The workflow also runs daily at 03:30 UTC (09:00 India time).

No API keys, Instagram login, Google login, or connected business accounts are required.

## Local run
```bash
python -m pip install -r requirements.txt
python monitor.py
```

## Configure
Edit `config/keywords.json` to add/remove search phrases and service-intent terms. Keep queries local to Vadodara and nearby service areas.

## Output columns
`collected_at, published_at, source, title, url, excerpt, matched_keywords, intent_score, location_match`

Review every result manually before contacting anyone. Only use contact details that a person or business has intentionally published for contact.


## Dashboard
A static dashboard is included in `docs/` and is deployed by the `deploy-dashboard` job after each collection run.
- Go to **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
- Run **Actions → INDETAIL Public Demand Monitor → Run workflow**.
- Once the deployment job succeeds, open the Pages URL shown in the workflow's `Deploy dashboard` step.
- The dashboard reads `docs/data/leads.json`; it does not require a database, login, API key, or connected account.

The dashboard shows counts, intent-score bands, source mix, and filterable public-source results. It is a monitoring view, not a private-search tracker or a CRM.
