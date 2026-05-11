import asyncpg


class BaseRepository:
    """
    All writes go through service_role connection (bypasses RLS).
    User-scoped reads use user connection (RLS enforced at DB level).
    Caller (service layer) provides the correct connection via
    get_service_conn() or get_user_conn(user_id) from core.database.
    """

    def __init__(self, conn: asyncpg.Connection) -> None:
        self.conn = conn
