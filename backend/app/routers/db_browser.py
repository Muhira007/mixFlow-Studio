"""
mixFlow — DB Browser
GET /api/db  — Lihat semua isi database (read-only, untuk debugging)
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from app.database import get_db

router = APIRouter()

@router.get("", response_class=HTMLResponse)
async def browse_db():
    """Simple HTML page showing all database tables live."""
    conn = get_db()
    tables = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()

    html = """<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><title>mixFlow DB Browser</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0a0a14; color:#e0e0e0; font:13px/1.5 system-ui; padding:20px; }
  h1 { color:#6c5ce7; margin-bottom:8px; }
  h2 { color:#a855f7; margin:20px 0 8px; }
  table { width:100%; border-collapse:collapse; margin-bottom:16px; background:#111122; border-radius:8px; overflow:hidden; }
  th { background:#6c5ce7; color:#fff; padding:8px 12px; text-align:left; font-size:12px; text-transform:uppercase; }
  td { padding:6px 12px; border-bottom:1px solid #1a1a2e; max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  tr:hover td { background:#1a1a3e; }
  .meta { color:#888; font-size:12px; margin-bottom:16px; }
  .count { color:#a855f7; font-weight:bold; }
  .refresh { float:right; background:#6c5ce7; color:#fff; border:none; padding:6px 16px; border-radius:6px; cursor:pointer; font-weight:bold; }
  .refresh:hover { background:#7c7cf7; }
  .empty { color:#666; font-style:italic; padding:16px; }
</style></head>
<body>
  <button class="refresh" onclick="location.reload()">🔄 Refresh</button>
  <h1>📦 mixFlow Database Browser</h1>
  <p class="meta">Live view — backend/data/mixflow.db</p>
"""

    for table in tables:
        table_name = table["name"]
        rows = conn.execute(f"SELECT * FROM [{table_name}]").fetchall()
        columns = [d[0] for d in conn.execute(f"PRAGMA table_info([{table_name}])").fetchall()]

        html += f"<h2>📋 {table_name} <span class='count'>({len(rows)} rows)</span></h2>"

        if not rows:
            html += "<div class='empty'>Tabel kosong</div>"
        else:
            html += "<table><thead><tr>"
            for col in columns:
                html += f"<th>{col}</th>"
            html += "</tr></thead><tbody>"
            for row in rows:
                html += "<tr>"
                for col in columns:
                    val = str(row[col]) if row[col] is not None else "<i>NULL</i>"
                    if len(val) > 120:
                        val = val[:120] + "..."
                    html += f"<td>{val}</td>"
                html += "</tr>"
            html += "</tbody></table>"

    conn.close()
    html += "</body></html>"
    return HTMLResponse(content=html)
