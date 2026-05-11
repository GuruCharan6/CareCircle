from __future__ import annotations
import json
from typing import Any

from pydantic import BaseModel, ConfigDict


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_record(cls, record: Any) -> Any:
        if record is None:
            return None
        data = dict(record)
        # asyncpg returns jsonb/json columns as raw strings when the type codec
        # is not active (e.g. Supabase pooler proxy resets codecs).
        # Parse any string values for fields typed as dict or list.
        parsed = {}
        for k, v in data.items():
            if isinstance(v, str) and len(v) > 0 and v[0] in ("{", "["):
                try:
                    parsed[k] = json.loads(v)
                except (json.JSONDecodeError, ValueError):
                    parsed[k] = v
            else:
                parsed[k] = v
        return cls(**parsed)
