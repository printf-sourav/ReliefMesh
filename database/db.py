import sqlite3
from contextlib import contextmanager
from threading import Lock

from utils.config import settings
from utils.schemas import ConflictError, StorageError

_init_lock = Lock()


def init_db() -> None:
    config = settings()
    with _init_lock:
        try:
            config.db_path.parent.mkdir(parents=True, exist_ok=True)
            config.upload_dir.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(config.db_path, timeout=5) as conn:
                conn.executescript("""
                    CREATE TABLE IF NOT EXISTS reports (
                        id TEXT PRIMARY KEY,
                        client_report_id TEXT NOT NULL UNIQUE,
                        request_hash TEXT NOT NULL,
                        cluster_id TEXT NOT NULL,
                        sync_status TEXT NOT NULL,
                        verification_status TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        record_json TEXT NOT NULL,
                        image_mime TEXT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS reports_cluster ON reports(cluster_id);
                    CREATE INDEX IF NOT EXISTS reports_sync ON reports(sync_status);
                    CREATE TABLE IF NOT EXISTS embeddings (
                        report_id TEXT NOT NULL REFERENCES reports(id),
                        model_id TEXT NOT NULL,
                        fingerprint TEXT NOT NULL,
                        vector_json TEXT NOT NULL,
                        PRIMARY KEY (report_id, model_id)
                    );
                    CREATE TABLE IF NOT EXISTS dismissals (
                        report_id TEXT NOT NULL REFERENCES reports(id),
                        other_report_id TEXT NOT NULL REFERENCES reports(id),
                        PRIMARY KEY (report_id, other_report_id)
                    );
                    CREATE TABLE IF NOT EXISTS revisions (
                        id INTEGER PRIMARY KEY,
                        report_id TEXT NOT NULL REFERENCES reports(id),
                        changed_at TEXT NOT NULL,
                        previous_record_json TEXT NOT NULL
                    );
                """)
        except (OSError, sqlite3.Error) as exc:
            raise StorageError("Local storage could not be initialized.") from exc


@contextmanager
def connection(*, write: bool = False):
    init_db()
    conn = None
    try:
        conn = sqlite3.connect(settings().db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        if write:
            conn.execute("BEGIN IMMEDIATE")
        yield conn
        conn.commit()
    except sqlite3.OperationalError as exc:
        if conn:
            conn.rollback()
        if "locked" in str(exc).lower():
            raise ConflictError("Storage is processing another request; retry shortly.",
                                code="REQUEST_IN_PROGRESS") from exc
        raise StorageError("Local storage operation failed.") from exc
    except (sqlite3.Error, OSError) as exc:
        if conn:
            conn.rollback()
        raise StorageError("Local storage operation failed.") from exc
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()
