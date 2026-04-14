#!/usr/bin/env python3
"""One-time arXiv backfill into CandidatePaper using local parsing + direct Postgres upserts.

Usage:
  python scripts/backfill-arxiv.py --max-papers 30000

Required env:
  DATABASE_URL=postgresql://...

Dependencies:
  pip install arxiv psycopg[binary]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import arxiv
import psycopg


DEFAULT_QUERY = "(" + " OR ".join(
    [
        "cat:cs.AI",
        "cat:cs.LG",
        "cat:cs.CL",
        "cat:cs.CV",
        "cat:cs.NE",
        "cat:stat.ML",
        "cat:q-bio",
        "cat:eess.SP",
    ]
) + ")"

DEFAULT_CATEGORIES = [
    "cs.AI",
    "cs.LG",
    "cs.CL",
    "cs.CV",
    "cs.NE",
    "stat.ML",
    "q-bio",
    "eess.SP",
]


INSERT_SQL = """
INSERT INTO "CandidatePaper" (
  "id",
  "doi",
  "arxivId",
  "title",
  "authors",
  "abstract",
  "url",
  "source",
  "publishedDate",
  "embeddedAt"
)
VALUES (
  %(id)s,
  %(doi)s,
  %(arxiv_id)s,
  %(title)s,
  %(authors)s,
  %(abstract)s,
  %(url)s,
  %(source)s,
  %(published_date)s,
  NULL
)
ON CONFLICT DO NOTHING
RETURNING "id";
"""


UPDATE_BY_ARXIV_SQL = """
UPDATE "CandidatePaper"
SET
  "arxivId" = COALESCE("CandidatePaper"."arxivId", %(arxiv_id)s),
  "doi" = COALESCE(%(doi)s, "CandidatePaper"."doi"),
  "title" = %(title)s,
  "authors" = %(authors)s,
  "abstract" = COALESCE(%(abstract)s, "CandidatePaper"."abstract"),
  "url" = COALESCE(%(url)s, "CandidatePaper"."url"),
  "source" = COALESCE(%(source)s, "CandidatePaper"."source"),
  "publishedDate" = COALESCE(%(published_date)s, "CandidatePaper"."publishedDate")
WHERE "arxivId" = %(arxiv_id)s
RETURNING "id";
"""


UPDATE_BY_DOI_SQL = """
UPDATE "CandidatePaper"
SET
  "arxivId" = COALESCE("CandidatePaper"."arxivId", %(arxiv_id)s),
  "doi" = COALESCE(%(doi)s, "CandidatePaper"."doi"),
  "title" = %(title)s,
  "authors" = %(authors)s,
  "abstract" = COALESCE(%(abstract)s, "CandidatePaper"."abstract"),
  "url" = COALESCE(%(url)s, "CandidatePaper"."url"),
  "source" = COALESCE(%(source)s, "CandidatePaper"."source"),
  "publishedDate" = COALESCE(%(published_date)s, "CandidatePaper"."publishedDate")
WHERE "doi" = %(doi)s
RETURNING "id";
"""


@dataclass
class Checkpoint:
    processed: int = 0
    inserted: int = 0
    updated: int = 0
    started_at: str | None = None
    last_saved_at: str | None = None
    stream_offsets: dict[str, int] | None = None


def load_local_env() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    for env_name in (".env.local", ".env"):
        env_path = repo_root / env_name
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            if line.startswith("export "):
                line = line[len("export ") :].strip()

            if "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if not key:
                continue

            if len(value) >= 2 and value[0] == value[-1] and value[0] in {"\"", "'"}:
                value = value[1:-1]

            os.environ.setdefault(key, value)


def sanitize_database_url(database_url: str) -> str:
    parsed = urlsplit(database_url)
    query_pairs = parse_qsl(parsed.query, keep_blank_values=True)
    unsupported_keys = {"pgbouncer"}
    removed = [k for k, _ in query_pairs if k.lower() in unsupported_keys]
    filtered_pairs = [(k, v) for k, v in query_pairs if k.lower() not in unsupported_keys]

    if removed:
        dropped = ", ".join(sorted(set(removed)))
        print(f"[arxiv-backfill] removed unsupported DATABASE_URL params: {dropped}")

    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(filtered_pairs, doseq=True), parsed.fragment))


def normalize_whitespace(text: str | None) -> str | None:
    if not text:
        return None
    cleaned = " ".join(str(text).split()).strip()
    return cleaned or None


def make_candidate_id(arxiv_id: str) -> str:
    digest = hashlib.sha1(arxiv_id.encode("utf-8")).hexdigest()[:24]
    return f"cp_{digest}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bulk backfill arXiv papers into CandidatePaper")
    parser.add_argument("--max-papers", type=int, default=30000, help="Maximum number of arXiv records to process")
    parser.add_argument("--batch-size", type=int, default=250, help="DB commit batch size")
    parser.add_argument("--page-size", type=int, default=100, help="arXiv API page size")
    parser.add_argument("--delay-seconds", type=float, default=3.5, help="Delay between arXiv API requests")
    parser.add_argument("--query", type=str, default=None, help="Single arXiv search query override")
    parser.add_argument(
        "--categories",
        type=str,
        default=",".join(DEFAULT_CATEGORIES),
        help="Comma-separated category list used when --query is omitted",
    )
    parser.add_argument(
        "--checkpoint-file",
        type=str,
        default="scripts/.arxiv-backfill-checkpoint.json",
        help="Checkpoint file path",
    )
    parser.add_argument("--reset-checkpoint", action="store_true", help="Delete prior checkpoint and restart")
    parser.add_argument("--dry-run", action="store_true", help="Parse arXiv results but do not write DB")
    return parser.parse_args()


def load_checkpoint(path: Path) -> Checkpoint:
    if not path.exists():
        return Checkpoint(started_at=datetime.utcnow().isoformat(), stream_offsets={})

    data = json.loads(path.read_text(encoding="utf-8"))
    return Checkpoint(
        processed=int(data.get("processed", 0)),
        inserted=int(data.get("inserted", 0)),
        updated=int(data.get("updated", 0)),
        started_at=data.get("started_at"),
        last_saved_at=data.get("last_saved_at"),
        stream_offsets={
            str(k): int(v)
            for k, v in (data.get("stream_offsets") or {}).items()
        },
    )


def save_checkpoint(path: Path, checkpoint: Checkpoint) -> None:
    checkpoint.last_saved_at = datetime.utcnow().isoformat()
    payload = {
        "processed": checkpoint.processed,
        "inserted": checkpoint.inserted,
        "updated": checkpoint.updated,
        "started_at": checkpoint.started_at,
        "last_saved_at": checkpoint.last_saved_at,
        "stream_offsets": checkpoint.stream_offsets or {},
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def result_to_row(result: arxiv.Result) -> dict[str, Any] | None:
    arxiv_id = normalize_whitespace(result.get_short_id())
    title = normalize_whitespace(result.title)
    if not arxiv_id or not title:
        return None

    authors = [normalize_whitespace(a.name) for a in result.authors]
    authors = [a for a in authors if a]

    doi = normalize_whitespace(result.doi)
    if doi:
        doi = doi.lower().removeprefix("https://doi.org/").removeprefix("doi:")

    primary_category = normalize_whitespace(getattr(result, "primary_category", None))
    source = f"arXiv:{primary_category}" if primary_category else "arXiv"

    return {
        "id": make_candidate_id(arxiv_id),
        "doi": doi,
        "arxiv_id": arxiv_id,
        "title": title,
        "authors": authors,
        "abstract": normalize_whitespace(result.summary),
        "url": normalize_whitespace(result.entry_id),
        "source": source,
        "published_date": result.published,
    }


def upsert_batch(conn: psycopg.Connection, rows: list[dict[str, Any]]) -> tuple[int, int]:
    inserted = 0
    updated = 0

    with conn.cursor() as cur:
        for row in rows:
            cur.execute(INSERT_SQL, row)
            insert_result = cur.fetchone()
            if insert_result:
                inserted += 1

                continue

            update_result = None
            if row.get("arxiv_id"):
                cur.execute(UPDATE_BY_ARXIV_SQL, row)
                update_result = cur.fetchone()

            if not update_result and row.get("doi"):
                cur.execute(UPDATE_BY_DOI_SQL, row)
                update_result = cur.fetchone()

            if update_result:
                updated += 1

    conn.commit()
    return inserted, updated


def allocate_targets(total: int, stream_keys: list[str]) -> dict[str, int]:
    if not stream_keys:
        return {}

    base = total // len(stream_keys)
    remainder = total % len(stream_keys)
    targets: dict[str, int] = {}
    for i, key in enumerate(stream_keys):
        targets[key] = base + (1 if i < remainder else 0)
    return targets


def main() -> int:
    args = parse_args()
    load_local_env()

    if args.max_papers <= 0:
        print("[arxiv-backfill] --max-papers must be > 0")
        return 1

    database_url = os.getenv("DATABASE_URL")
    if database_url:
        database_url = sanitize_database_url(database_url)
    if not database_url and not args.dry_run:
        print("[arxiv-backfill] Missing DATABASE_URL")
        return 1

    checkpoint_path = Path(args.checkpoint_file)
    if args.reset_checkpoint and checkpoint_path.exists():
        checkpoint_path.unlink()
        print(f"[arxiv-backfill] deleted checkpoint: {checkpoint_path}")

    checkpoint = load_checkpoint(checkpoint_path)
    if checkpoint.started_at is None:
        checkpoint.started_at = datetime.utcnow().isoformat()
    if checkpoint.stream_offsets is None:
        checkpoint.stream_offsets = {}

    categories = [c.strip() for c in args.categories.split(",") if c.strip()]
    if args.query:
        stream_items = [("query:custom", args.query)]
    else:
        stream_items = [(f"cat:{cat}", f"cat:{cat}") for cat in categories]

    stream_targets = allocate_targets(args.max_papers, [key for key, _ in stream_items])

    print("[arxiv-backfill] starting")
    if args.query:
        print(f"[arxiv-backfill] query={args.query}")
    else:
        print(f"[arxiv-backfill] categories={','.join(categories)}")
    print(f"[arxiv-backfill] max_papers={args.max_papers} batch_size={args.batch_size}")
    print(f"[arxiv-backfill] resume_processed={checkpoint.processed} (offset-based)")

    client = arxiv.Client(
        page_size=max(1, args.page_size),
        delay_seconds=max(0.0, args.delay_seconds),
        num_retries=5,
    )
    pending: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    conn: psycopg.Connection | None = None
    if not args.dry_run:
        conn = psycopg.connect(database_url)

    try:
        for stream_key, stream_query in stream_items:
            target = int(stream_targets.get(stream_key, 0))
            if target <= 0:
                continue

            offset = int((checkpoint.stream_offsets or {}).get(stream_key, 0))
            if offset >= target:
                print(f"[arxiv-backfill] stream={stream_key} already complete ({offset}/{target})")
                continue

            print(f"[arxiv-backfill] stream={stream_key} target={target} resume_offset={offset}")
            search = arxiv.Search(
                query=stream_query,
                max_results=target,
                sort_by=arxiv.SortCriterion.SubmittedDate,
                sort_order=arxiv.SortOrder.Descending,
            )

            iterator = client.results(search, offset=offset)

            for result in iterator:
                if offset >= target:
                    break

                row = result_to_row(result)
                offset += 1
                checkpoint.stream_offsets[stream_key] = offset

                if not row:
                    checkpoint.processed = sum(checkpoint.stream_offsets.values())
                    if offset % 100 == 0:
                        save_checkpoint(checkpoint_path, checkpoint)
                    continue

                if row["arxiv_id"] in seen_ids:
                    checkpoint.processed = sum(checkpoint.stream_offsets.values())
                    continue

                seen_ids.add(row["arxiv_id"])
                pending.append(row)
                checkpoint.processed = sum(checkpoint.stream_offsets.values())

                if len(pending) < args.batch_size:
                    if offset % 100 == 0:
                        save_checkpoint(checkpoint_path, checkpoint)
                    continue

                if args.dry_run:
                    print(
                        f"[arxiv-backfill] dry-run stream={stream_key} "
                        f"parsed batch size={len(pending)} at processed={checkpoint.processed}"
                    )
                else:
                    assert conn is not None
                    inserted, updated = upsert_batch(conn, pending)
                    checkpoint.inserted += inserted
                    checkpoint.updated += updated
                    print(
                        f"[arxiv-backfill] stream={stream_key} processed={checkpoint.processed} "
                        f"batch={len(pending)} inserted={inserted} updated={updated} "
                        f"totals(inserted={checkpoint.inserted}, updated={checkpoint.updated})"
                    )

                pending = []
                save_checkpoint(checkpoint_path, checkpoint)
                time.sleep(0.2)

        if pending:
            if args.dry_run:
                print(f"[arxiv-backfill] dry-run parsed final batch size={len(pending)}")
            else:
                assert conn is not None
                inserted, updated = upsert_batch(conn, pending)
                checkpoint.inserted += inserted
                checkpoint.updated += updated
                print(
                    f"[arxiv-backfill] final batch={len(pending)} inserted={inserted} updated={updated} "
                    f"totals(inserted={checkpoint.inserted}, updated={checkpoint.updated})"
                )

        save_checkpoint(checkpoint_path, checkpoint)
        print(
            f"[arxiv-backfill] done processed={checkpoint.processed} "
            f"inserted={checkpoint.inserted} updated={checkpoint.updated}"
        )

    finally:
        if conn is not None:
            conn.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
