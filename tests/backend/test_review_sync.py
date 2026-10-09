from uuid import uuid4

import pytest

from services.incident_service import create_report, get_report


def second_source(draft, **changes):
    return draft.model_copy(update={"client_report_id": str(uuid4())} | changes)


def test_sync_is_repeat_safe_and_survives_reopen(draft):
    from database.db import init_db
    from services.sync_service import get_pending_reports, sync_pending_reports

    source = create_report(draft, None, network_online=False)
    assert sync_pending_reports(network_online=False).synced_report_ids == []
    init_db()
    assert [item.id for item in get_pending_reports()] == [source.id]
    delivered = sync_pending_reports(network_online=True)
    assert delivered.synced_report_ids == [source.id]
    assert delivered.pending_count == 0
    assert sync_pending_reports(network_online=True).synced_report_ids == []
    assert get_report(source.id).analysis_mode == "deferred"


def test_correction_resets_verification_and_keeps_original(draft, analysis):
    from services.incident_service import update_report_analysis, verify_report

    source = create_report(draft, analysis, network_online=True)
    assert verify_report(source.id).verification_status == "verified"
    edited = analysis.analysis.model_copy(update={"people_affected": None})
    changed = update_report_analysis(source.id, edited)
    assert changed.verification_status == "pending"
    assert changed.original_analysis.people_affected == 4
    assert changed.analysis.people_affected is None


def test_grouping_requires_human_and_separation_preserves_sources(draft, analysis):
    from services.incident_service import get_cluster_reports, keep_report_separate, link_report, list_clusters

    first = create_report(draft, analysis, network_online=True)
    second = create_report(second_source(draft), analysis, network_online=True)
    assert len(list_clusters()) == 2
    grouped = link_report(second.id, first.cluster_id)
    assert grouped.cluster_id == first.cluster_id
    assert link_report(second.id, first.cluster_id).cluster_id == first.cluster_id
    cluster = list_clusters()[0]
    assert cluster.report_count == 2
    assert cluster.people_counts_by_report == {first.id: 4, second.id: 4}
    separate = keep_report_separate(second.id)
    assert separate.cluster_id != first.cluster_id
    assert keep_report_separate(second.id).cluster_id == separate.cluster_id
    assert len(get_cluster_reports(first.cluster_id)) == 1
    assert get_report(second.id).original_text == draft.original_text


def test_pending_sources_do_not_inflate_hub_cluster(draft, analysis):
    from services.incident_service import link_report, list_clusters, verify_report

    first = create_report(draft, analysis, network_online=True)
    verify_report(first.id)
    second = create_report(second_source(draft), analysis, network_online=False)
    link_report(second.id, first.cluster_id)
    hub = list_clusters()[0]
    assert hub.report_count == 1
    assert hub.photo_count == 1
    assert hub.verification_status == "pending"  # new source requires renewed review
    assert list_clusters(synced_only=False)[0].report_count == 2


def test_deferred_report_requires_analysis_and_uses_saved_image(draft, analysis, monkeypatch):
    from services import gemma_service
    from services.incident_service import analyze_saved_report, verify_report
    from utils.schemas import ConflictError

    saved = create_report(draft, None, network_online=True)
    with pytest.raises(ConflictError):
        verify_report(saved.id)

    def analyze(saved_draft):
        assert saved_draft.image_bytes == draft.image_bytes
        assert saved_draft.original_text == draft.original_text
        return analysis.model_copy(update={"analysis_mode": "live", "model_id": "tested-model"})

    monkeypatch.setattr(gemma_service, "analyze_report", analyze)
    analyzed = analyze_saved_report(saved.id)
    assert analyzed.analysis_mode == "live"
    assert analyzed.original_analysis.people_affected == 4
    assert verify_report(saved.id).verification_status == "verified"
