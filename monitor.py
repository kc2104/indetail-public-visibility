import csv
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus

import feedparser
import requests

ROOT = Path(__file__).parent
CONFIG = json.loads((ROOT / "config/keywords.json").read_text(encoding="utf-8"))
OUT = ROOT / "data"
OUT.mkdir(exist_ok=True)
CSV_PATH = OUT / "leads.csv"
JSON_PATH = OUT / "leads.json"
FIELDS = ["collected_at", "published_at", "source", "title", "url",
          "excerpt", "matched_keywords", "intent_score", "location_match"]
HEADERS = {"User-Agent": "INDETAIL-PublicDemandMonitor/1.0 (RSS reader; respectful low-volume access)"}


def clean_html(value):
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", value).strip()


def fetch_feed(url, source):
    try:
        response = requests.get(url, headers=HEADERS, timeout=20)
        response.raise_for_status()
        parsed = feedparser.parse(response.content)
        items = []
        for entry in parsed.entries[:30]:
            title = clean_html(entry.get("title", ""))
            summary = clean_html(entry.get("summary", entry.get("description", "")))
            link = entry.get("link", "")
            published = entry.get("published", entry.get("updated", ""))
            items.append({
                "source": source,
                "title": title,
                "url": link,
                "published_at": published,
                "excerpt": summary[:1200]
            })
        return items
    except Exception as exc:
        print(f"[WARN] Skipping {source}: {exc}")
        return []


def collect():
    found = []
    for query in CONFIG["queries"]:
        url = "https://news.google.com/rss/search?q=" + quote_plus(query) + "&hl=en-IN&gl=IN&ceid=IN:en"
        found.extend(fetch_feed(url, "Google News RSS"))
        time.sleep(1.0)

    subreddit = CONFIG.get("reddit_subreddit", "vadodara")
    for query in CONFIG["queries"]:
        reddit_url = (
            f"https://www.reddit.com/r/{subreddit}/search.rss?q={quote_plus(query)}"
            "&restrict_sr=1&sort=new"
        )
        found.extend(fetch_feed(reddit_url, f"Reddit r/{subreddit}"))
        time.sleep(1.5)

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    rows = {}
    for item in found:
        text = f"{item['title']} {item['excerpt']}".lower()
        matched = sorted({term for term in CONFIG["intent_terms"] if term.lower() in text})
        location_match = any(term.lower() in text for term in CONFIG["location_terms"])
        # Score is a triage aid only, not a probability or a personal profile.
        score = min(100, len(matched) * 12 + (25 if location_match else 0))
        if not item["url"] or not item["title"]:
            continue
        item.update({
            "collected_at": now,
            "matched_keywords": "; ".join(matched),
            "intent_score": score,
            "location_match": location_match
        })
        rows[item["url"]] = item

    previous = {}
    if CSV_PATH.exists():
        # utf-8-sig safely handles both plain UTF-8 and files with a BOM.
        with CSV_PATH.open(newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                url = row.get("url")
                if url:
                    previous[url] = row

    previous.update(rows)
    ordered = sorted(previous.values(), key=lambda r: (r.get("published_at", ""), r.get("collected_at", "")), reverse=True)

    with CSV_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(ordered)

    JSON_PATH.write_text(json.dumps(ordered, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Collected {len(rows)} unique current items; {len(ordered)} total saved.")
    print("Review source links manually. No private identities or contact details are inferred.")


if __name__ == "__main__":
    collect()
