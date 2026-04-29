#!/usr/bin/env python3
"""
舟山锚地供油指数数据抓取脚本
通过 API 获取四个锚地的精细化预报数据，输出到 data/ 目录。
依赖：requests
用法：python3 scripts/update_data.py
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

API_BASE = "https://www.zs121.com.cn/gh/SubjectiveForecast/groundAnchorageNew"

ANCHORS = [
    "条帚门锚地",
    "虾峙门外锚地",
    "马峙锚地",
    "秀山东锚地",
]

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds
SHANGHAI_TZ = ZoneInfo("Asia/Shanghai")
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; ZhoushanAnchorageMIO/1.0; "
        "+https://www.zsagent01.com)"
    ),
    "Accept": "application/json,text/plain,*/*",
}


def ensure_dirs() -> None:
    DATA_DIR.mkdir(exist_ok=True)


def now_shanghai() -> str:
    return datetime.now(SHANGHAI_TZ).strftime("%Y-%m-%d %H:%M:%S")


def load_existing_manifest() -> dict | None:
    json_path = DATA_DIR / "latest.json"
    if not json_path.exists():
        return None

    try:
        return json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"读取既有数据失败，将不使用缓存: {exc}", flush=True)
        return None


def write_manifest(manifest: dict) -> None:
    json_path = DATA_DIR / "latest.json"
    json_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n✓ 已写入 {json_path}", flush=True)

    js_path = DATA_DIR / "data.js"
    js_path.write_text(
        "window.__ANCHOR_DATA__ = "
        + json.dumps(manifest, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"✓ 已写入 {js_path}", flush=True)


def fetch_anchor(name: str) -> dict:
    """Fetch forecast data for a single anchorage with retry."""
    url = f"{API_BASE}?name={name}"
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"  [{attempt}/{MAX_RETRIES}] 请求 {name} ...", flush=True)
            resp = requests.get(url, headers=HEADERS, timeout=(8, 20))
            resp.raise_for_status()
            payload = resp.json()

            if payload.get("errCode") != "0":
                raise ValueError(f"API 返回错误: {payload.get('errMsg', '未知')}")

            return payload["data"]

        except Exception as exc:
            last_error = exc
            print(f"    ⚠ 失败: {exc}", flush=True)
            if attempt < MAX_RETRIES:
                print(f"    {RETRY_DELAY}s 后重试 ...", flush=True)
                time.sleep(RETRY_DELAY)

    raise RuntimeError(f"抓取 {name} 失败（已重试 {MAX_RETRIES} 次）: {last_error}")


def build_manifest(results: dict, errors: list[str], existing: dict | None) -> dict:
    checked_at = now_shanghai()

    if not results:
        if existing and existing.get("anchors"):
            manifest = dict(existing)
            manifest["status"] = "沿用上次数据"
            manifest["lastUpdated"] = checked_at
            manifest["lastChecked"] = checked_at
            manifest["sourceUnavailable"] = True
            manifest["errors"] = errors
            return manifest

        print("\n全部锚地抓取失败，且没有可沿用的既有数据。", file=sys.stderr)
        sys.exit(1)

    first_data = next(iter(results.values()))
    publish_time = first_data.get("PreciseForecastTime", "")
    publish_code = first_data.get("Time", "")
    existing_anchors = (existing or {}).get("anchors", {})

    manifest = {
        "status": "更新完成" if not errors else "部分更新",
        "lastUpdated": checked_at,
        "lastChecked": checked_at,
        "lastSuccessfulFetch": checked_at,
        "publishTime": publish_time,
        "publishCode": publish_code,
        "source": "https://www.zs121.com.cn/Portarea/Portarea",
        "apiBase": API_BASE,
        "sourceUnavailable": False,
        "anchors": {},
    }

    for name in ANCHORS:
        if name in results:
            manifest["anchors"][name] = results[name]
        elif name in existing_anchors:
            manifest["anchors"][name] = existing_anchors[name]

    if errors:
        manifest["errors"] = errors

    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="更新舟山锚地供油指数数据")
    parser.add_argument(
        "--no-cache-on-failure",
        action="store_true",
        help="全部抓取失败时退出失败，不沿用既有数据。",
    )
    parser.add_argument(
        "--cache-only",
        action="store_true",
        help="不联网抓取，仅沿用既有数据并记录本次检查时间。",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_dirs()
    existing = load_existing_manifest()

    if args.cache_only:
        print("=== 舟山锚地供油指数数据更新 ===", flush=True)
        print(f"时间: {now_shanghai()}", flush=True)
        print("\n数据源连续重试失败，沿用上次成功数据并记录本次检查时间。", flush=True)
        manifest = build_manifest(
            {},
            ["数据源连续重试失败，沿用上次成功数据。"],
            existing,
        )
        write_manifest(manifest)
        return

    print("=== 舟山锚地供油指数数据更新 ===", flush=True)
    print(f"时间: {now_shanghai()}", flush=True)

    results = {}
    errors = []

    for name in ANCHORS:
        print(f"\n抓取 {name} ...", flush=True)
        try:
            data = fetch_anchor(name)
            results[name] = data
            n = len(data.get("PreciseForecast", []))
            print(f"  ✓ 成功，{n} 条时段数据", flush=True)
        except RuntimeError as exc:
            errors.append(str(exc))
            print(f"  ✗ {exc}", flush=True)

    if not results:
        if args.no_cache_on_failure:
            print("\n全部锚地抓取失败，按要求不沿用缓存。", file=sys.stderr)
            sys.exit(1)

        print("\n全部锚地抓取失败，沿用上次成功数据并记录本次检查时间。", flush=True)

    manifest = build_manifest(results, errors, existing)
    write_manifest(manifest)

    if errors:
        print(f"\n⚠ {len(errors)} 个锚地抓取失败:")
        for e in errors:
            print(f"  - {e}")
    else:
        print("\n全部完成！")


if __name__ == "__main__":
    main()
