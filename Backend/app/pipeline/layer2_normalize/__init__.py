from app.pipeline.layer1_ingest.types import IngestedItem
from app.pipeline.layer2_normalize.dimension_tagger import refine_dimension
from app.pipeline.layer2_normalize.source_profiles import get_source_profile
from app.pipeline.layer2_normalize.types import NormalizedItem, SourceProfile


def normalize(item: IngestedItem) -> NormalizedItem:
    profile = get_source_profile(item.source_type)
    refined_dim = refine_dimension(item, profile)
    profile = SourceProfile(
        source_type=profile.source_type,
        reliability=profile.reliability,
        structural_bias=profile.structural_bias,
        dimension=refined_dim,
    )
    return NormalizedItem(ingest=item, profile=profile)
