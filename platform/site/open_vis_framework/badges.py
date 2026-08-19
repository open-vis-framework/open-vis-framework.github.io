"""Dynamic badges for public [open] vis records."""

from dataclasses import dataclass
from html import escape
from datetime import datetime, timedelta, timezone

from flask import current_app
from invenio_access.permissions import system_identity
from invenio_cache import current_cache
from invenio_pidstore.errors import PIDDoesNotExistError
from invenio_rdm_records.proxies import current_rdm_records
from invenio_rdm_records.services.errors import RecordDeletedException
from invenio_search import current_search_client
from invenio_search.utils import prefix_index


@dataclass(frozen=True)
class BadgeState:
    """Values needed to render one record badge."""

    current_rank: int | None = None
    peak_rank: int | None = None
    weekly_unique_views: int = 0
    total_public_records: int = 0

    @property
    def is_ranked(self):
        """Return whether this badge has enough activity to show a rank."""
        return self.current_rank is not None


class PublicRecordNotFound(Exception):
    """Raised when a badge does not belong to a public published record."""


def _calendar_week_start(now):
    """Return the Monday at 00:00 UTC for ``now``."""
    utc_now = now.astimezone(timezone.utc)
    return (utc_now - timedelta(days=utc_now.weekday())).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )


def _competition_rankings(scores):
    """Rank scores descending, giving tied scores the same position."""
    rankings = {}
    previous_score = None
    previous_rank = None

    for position, (record_id, score) in enumerate(
        sorted(scores.items(), key=lambda item: (-item[1], item[0])),
        start=1,
    ):
        if score != previous_score:
            previous_rank = position
            previous_score = score
        rankings[record_id] = previous_rank

    return rankings


def _public_parent_ids():
    """Return the parent IDs of the current public record versions."""
    max_records = current_app.config.get("OVF_BADGE_MAX_PUBLIC_RECORDS", 10000)
    result = current_rdm_records.records_service.search(
        system_identity,
        params={"q": "", "size": max_records, "sort": "newest"},
    )

    parent_ids = set()
    for record in result:
        if not record.get("is_published") or record.get("is_draft"):
            continue
        if record.get("access", {}).get("record") != "public":
            continue
        if record.get("deletion_status", {}).get("is_deleted"):
            continue
        if not record.get("versions", {}).get("is_latest", True):
            continue

        parent_id = record.get("parent", {}).get("id")
        if parent_id:
            parent_ids.add(parent_id)

    return parent_ids


def _weekly_unique_views(week_start):
    """Read this calendar week's per-record unique views from OpenSearch."""
    query = {
        "size": 0,
        "query": {
            "bool": {
                "filter": [
                    {
                        "range": {
                            "timestamp": {
                                "gte": week_start.isoformat(),
                                "lt": (week_start + timedelta(days=7)).isoformat(),
                            }
                        }
                    },
                    {"term": {"via_api": False}},
                ]
            }
        },
        "aggs": {
            "records": {
                "terms": {
                    "field": "parent_recid",
                    "size": current_app.config.get(
                        "OVF_BADGE_MAX_PUBLIC_RECORDS", 10000
                    ),
                },
                "aggs": {
                    "weekly_unique_views": {"sum": {"field": "unique_count"}}
                },
            }
        },
    }
    response = current_search_client.search(
        index=prefix_index("stats-record-view"),
        body=query,
    )
    buckets = response.get("aggregations", {}).get("records", {}).get("buckets", [])
    return {
        bucket["key"]: int(bucket["weekly_unique_views"]["value"])
        for bucket in buckets
    }


def _ranking_snapshot(now):
    """Return a cached weekly ranking snapshot for all public records."""
    week_start = _calendar_week_start(now)
    cache_key = f"ovf:badges:weekly:{week_start.date().isoformat()}"
    cached = current_cache.get(cache_key)
    if cached is not None:
        return cached

    public_parent_ids = _public_parent_ids()
    try:
        observed_scores = _weekly_unique_views(week_start)
    except Exception as error:  # A missing stats index should not break badges.
        current_app.logger.warning("Unable to calculate OVF badge rankings: %s", error)
        observed_scores = {}

    scores = {
        parent_id: observed_scores.get(parent_id, 0)
        for parent_id in public_parent_ids
    }
    snapshot = {
        "scores": scores,
        "rankings": _competition_rankings(scores),
        "total_public_records": len(public_parent_ids),
    }
    current_cache.set(
        cache_key,
        snapshot,
        timeout=current_app.config.get("OVF_BADGE_CACHE_SECONDS", 3600),
    )
    return snapshot


def _peak_rank_index():
    """Return the persistent OpenSearch index used for best achieved ranks."""
    return prefix_index("ovf-badge-rank-peaks-v1")


def _ensure_peak_rank_index():
    """Create the small peak-rank index on first use."""
    index = _peak_rank_index()
    if current_search_client.indices.exists(index=index):
        return index

    try:
        current_search_client.indices.create(
            index=index,
            body={
                "mappings": {
                    "dynamic": "strict",
                    "properties": {
                        "best_rank": {"type": "integer"},
                        "updated_at": {"type": "date"},
                    },
                }
            },
        )
    except Exception:
        # Two concurrent first requests can both attempt creation. Only
        # propagate when the index still does not exist after the race.
        if not current_search_client.indices.exists(index=index):
            raise
    return index


def _remember_peak_rank(parent_id, current_rank, now):
    """Atomically retain and return the best rank a record has achieved."""
    try:
        index = _ensure_peak_rank_index()
        current_search_client.update(
            index=index,
            id=parent_id,
            body={
                "script": {
                    "lang": "painless",
                    "source": (
                        "if (ctx._source.best_rank == null || "
                        "params.rank < ctx._source.best_rank) { "
                        "ctx._source.best_rank = params.rank; "
                        "ctx._source.updated_at = params.updated_at; }"
                    ),
                    "params": {
                        "rank": current_rank,
                        "updated_at": now.astimezone(timezone.utc).isoformat(),
                    },
                },
                "upsert": {
                    "best_rank": current_rank,
                    "updated_at": now.astimezone(timezone.utc).isoformat(),
                },
            },
        )
        peak = current_search_client.get(index=index, id=parent_id)
        return int(peak["_source"]["best_rank"])
    except Exception as error:
        # Ranking still works if peak storage is briefly unavailable.
        current_app.logger.warning("Unable to persist OVF badge peak rank: %s", error)
        return current_rank


def _read_public_record(record_id):
    """Read a record and ensure an embedded badge may reveal its existence."""
    try:
        record = current_rdm_records.records_service.read(
            system_identity,
            record_id,
        ).to_dict()
    except (PIDDoesNotExistError, RecordDeletedException) as error:
        raise PublicRecordNotFound from error

    if not record.get("is_published") or record.get("is_draft"):
        raise PublicRecordNotFound
    if record.get("access", {}).get("record") != "public":
        raise PublicRecordNotFound
    if record.get("deletion_status", {}).get("is_deleted"):
        raise PublicRecordNotFound
    return record


def get_badge_state(record_id, now=None):
    """Calculate the public badge state for one record."""
    now = now or datetime.now(timezone.utc)
    record = _read_public_record(record_id)
    parent_id = record.get("parent", {}).get("id")
    if not parent_id:
        raise PublicRecordNotFound

    snapshot = _ranking_snapshot(now)
    weekly_unique_views = int(snapshot["scores"].get(parent_id, 0))
    total_public_records = int(snapshot["total_public_records"])
    current_rank = snapshot["rankings"].get(parent_id)

    enough_records = total_public_records >= current_app.config.get(
        "OVF_BADGE_MIN_PUBLIC_RECORDS", 10
    )
    enough_views = weekly_unique_views >= current_app.config.get(
        "OVF_BADGE_MIN_WEEKLY_UNIQUE_VIEWS", 5
    )
    if not enough_records or not enough_views or current_rank is None:
        return BadgeState(
            weekly_unique_views=weekly_unique_views,
            total_public_records=total_public_records,
        )

    return BadgeState(
        current_rank=current_rank,
        peak_rank=_remember_peak_rank(parent_id, current_rank, now),
        weekly_unique_views=weekly_unique_views,
        total_public_records=total_public_records,
    )


def _display_rank(rank):
    """Keep large ranks readable inside the fixed-width badge."""
    if rank <= 999:
        return f"#{rank}"
    return f"#{rank // 1000}K+"


def render_badge_svg(state):
    """Render a self-contained, accessible SVG badge."""
    # The badge carries the site name, so read it from THEME_SITENAME
    # rather than hardcoding it - see invenio.cfg. Escaped because it is
    # interpolated straight into SVG markup below.
    sitename = escape(current_app.config["THEME_SITENAME"])
    eyebrow_brand = escape(current_app.config["THEME_SITENAME"].upper())
    if state.is_ranked:
        rank = _display_rank(state.current_rank)
        peak = _display_rank(state.peak_rank)
        accessible_label = (
            f"{sitename}: {rank} visualization this week; "
            f"best achieved rank {peak}"
        )
        left_content = f"""
    <text x="25" y="34" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#ffffff">{rank}</text>"""
        eyebrow = f"{eyebrow_brand} · WEEKLY"
        main_label = "Visualization this week"
        peak_label = f"PEAK {peak}"
    else:
        accessible_label = f"Visualization Sheet listed on {sitename}"
        left_content = """
    <circle cx="18" cy="28" r="6" fill="#ffffff" fill-opacity="0.96"/>
    <circle cx="32" cy="21" r="4" fill="#ffffff" fill-opacity="0.72"/>
    <circle cx="32" cy="35" r="4" fill="#ffffff" fill-opacity="0.72"/>"""
        eyebrow = eyebrow_brand
        main_label = "Visualization Sheet"
        peak_label = "LISTED"

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 290 55" width="290" height="55" role="img" aria-label="{accessible_label}">
  <title>{accessible_label}</title>
  <rect x="0.5" y="0.5" width="289" height="54" rx="8" fill="#ffffff" stroke="#3730a3"/>
  <path d="M8.5 .5h39.5v54H8.5a8 8 0 0 1-8-8v-38a8 8 0 0 1 8-8Z" fill="#3730a3"/>{left_content}
  <text x="61" y="19" font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="700" letter-spacing="0.8" fill="#6366a8">{eyebrow}</text>
  <text x="61" y="39" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#27225f">{main_label}</text>
  <rect x="235" y="29" width="43" height="15" rx="7.5" fill="#efeffb"/>
  <text x="256.5" y="39.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="7.5" font-weight="700" fill="#3730a3">{peak_label}</text>
</svg>"""
