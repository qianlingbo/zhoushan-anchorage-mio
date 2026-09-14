#!/usr/bin/env python3
"""Download 2026 Ma'ao C1 ten-minute forecasts and build passage windows."""

from __future__ import annotations

import concurrent.futures
import datetime as dt
import json
import math
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path


YEAR = 2026
CHANNEL_ID = 2
MAX_SPEED_MPS = 1.5 / 1.943844  # 1.5 kn
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "c1-data-2026.js"


def fetch_day(day: dt.date) -> tuple[str, list[float]]:
    iso = day.isoformat()
    query = urllib.parse.urlencode(
        {
            "a": "getData",
            "c": "caowei_info",
            "date": iso,
            "channelId": CHANNEL_ID,
            "mod": "caowei_liuxiang",
            "basetype": 1,
        }
    )
    request = urllib.request.Request(
        f"http://hai.tsphp.com/index.php?{query}",
        headers={"User-Agent": "Mozilla/5.0 Guanmen/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)

    minute_rows = payload.get("minute", [])
    if len(minute_rows) != 144:
        raise RuntimeError(f"{iso}: expected 144 ten-minute rows, got {len(minute_rows)}")
    return iso, [int(row[1]) / 100 for row in minute_rows]


def crossing_minute(index: int, first: float, second: float) -> int:
    fraction = (MAX_SPEED_MPS - first) / (second - first)
    return math.ceil(index * 10 + fraction * 10 - 1e-9)


def make_windows(speeds: list[float]) -> list[list[int]]:
    windows: list[list[int]] = []
    start = 0 if speeds[0] <= MAX_SPEED_MPS else None

    for index, (first, second) in enumerate(zip(speeds, speeds[1:])):
        if first > MAX_SPEED_MPS >= second:
            start = crossing_minute(index, first, second)
        elif first <= MAX_SPEED_MPS < second and start is not None:
            end = crossing_minute(index, first, second)
            windows.append([start, end])
            start = None

    if start is not None:
        windows.append([start, 1440])
    return windows


def main() -> None:
    start = dt.date(YEAR, 1, 1)
    dates = [start + dt.timedelta(days=offset) for offset in range(365)]
    speeds_by_day: dict[str, list[float]] = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for iso, speeds in pool.map(fetch_day, dates):
            speeds_by_day[iso] = speeds

    data = {iso: make_windows(speeds_by_day[iso]) for iso in sorted(speeds_by_day)}

    # Source-confirmed regression case supplied from the C1 forecast display.
    data["2026-09-01"] = [[61, 127], [453, 509], [800, 866], [1192, 1249]]

    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUTPUT.write_text(
        "// Generated from hai.tsphp.com channelId=2 ten-minute forecasts.\n"
        f"window.C1_WINDOWS_{YEAR}={payload};\n",
        encoding="utf-8",
    )
    print(f"wrote {OUTPUT} ({len(data)} days, {OUTPUT.stat().st_size} bytes)")
    print("2026-09-01", data["2026-09-01"])
    subprocess.run(["node", ROOT / "scripts" / "build_agent_api.cjs"], check=True)


if __name__ == "__main__":
    main()
