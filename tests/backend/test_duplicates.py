from uuid import uuid4

import pytest

from services.incident_service import create_report


@pytest.fixture
def encoder(monkeypatch):
    from services import embedding_service

    class TestEncoder:
        calls = 0

        def encode(self, text, **kwargs):
            self.calls += 1
            return [0.0, 1.0] if "fire" in text.casefold() else [1.0, 0.0]

    fake = TestEncoder()
    monkeypatch.setenv("RELIEFMESH_EMBEDDING_MODE", "sentence_transformers")
    monkeypatch.setattr(embedding_service, "encoder", lambda model, download: fake)
    return fake


def test_suggestions_are_cached_location_gated_and_do_not_merge(draft, analysis, encoder):
    from services.incident_service import find_possible_duplicates, list_clusters

    first = create_report(draft, analysis, network_online=True)
    related = create_report(draft.model_copy(update={"client_report_id": str(uuid4())}), analysis, network_online=True)
    create_report(draft.model_copy(update={"client_report_id": str(uuid4()), "location": "Other Town"}), analysis, network_online=True)
    matches = find_possible_duplicates(first.id)
    assert [match.incident_id for match in matches] == [related.id]
    assert matches[0].similarity == 1
    assert len(list_clusters()) == 3
    find_possible_duplicates(first.id)
    assert encoder.calls == 2


def test_unrelated_semantics_and_distant_gps_do_not_match(draft, analysis, encoder):
    from services.incident_service import find_possible_duplicates

    source = create_report(draft.model_copy(update={"latitude": 13.0, "longitude": 77.0}), analysis, network_online=True)
    create_report(draft.model_copy(update={"client_report_id": str(uuid4()), "latitude": 14.0, "longitude": 77.0}), analysis, network_online=True)
    fire = analysis.model_copy(update={"analysis": analysis.analysis.model_copy(update={"incident_type": "Fire", "summary": "Building fire reported."})})
    create_report(draft.model_copy(update={"client_report_id": str(uuid4())}), fire, network_online=True)
    assert find_possible_duplicates(source.id) == []


def test_dismissal_does_not_reappear_and_correction_invalidates_embedding(draft, analysis, encoder):
    from services.incident_service import find_possible_duplicates, keep_report_separate, update_report_analysis

    first = create_report(draft, analysis, network_online=True)
    second = create_report(draft.model_copy(update={"client_report_id": str(uuid4())}), analysis, network_online=True)
    assert find_possible_duplicates(first.id)
    update_report_analysis(second.id, analysis.analysis.model_copy(update={"summary": "Building fire reported."}))
    assert find_possible_duplicates(first.id) == []
    assert encoder.calls == 3
    update_report_analysis(second.id, analysis.analysis)
    assert find_possible_duplicates(first.id)
    keep_report_separate(first.id)
    assert find_possible_duplicates(first.id) == []
    assert find_possible_duplicates(second.id) == []


def test_unavailable_matching_is_not_successful_zero_matches(draft, analysis):
    from services.incident_service import find_possible_duplicates
    from utils.schemas import MatchingUnavailableError

    first = create_report(draft, analysis, network_online=True)
    with pytest.raises(MatchingUnavailableError):
        find_possible_duplicates(first.id)
