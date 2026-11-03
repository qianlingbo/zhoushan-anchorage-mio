#!/usr/bin/env python3
"""Build 2027 Ningbo nautical-twilight data using a Timeanddate-calibrated ephemeris.

Run with:
    uv run --with ephem==4.2.1 python scripts/build_sun_data_2027.py
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo

import ephem


YEAR = 2027
LATITUDE = "29:52"
LONGITUDE = "121:33"
ELEVATION_METERS = 18
TIMEZONE = ZoneInfo("Asia/Shanghai")
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "ningbo-nautical-twilight-2027.json"

# PyEphem and Timeanddate can straddle a minute boundary by less than one second.
# This display calibration reproduces all 23 visible January rows in the user-supplied
# Timeanddate screenshot and six cross-season 2026 Timeanddate reference samples.
DISPLAY_CALIBRATION = dt.timedelta(seconds=-1)

JANUARY_SCREENSHOT_REFERENCE = {
    "2027-01-01": ("05:53", "18:00"),
    "2027-01-02": ("05:53", "18:01"),
    "2027-01-03": ("05:53", "18:02"),
    "2027-01-04": ("05:54", "18:03"),
    "2027-01-05": ("05:54", "18:03"),
    "2027-01-06": ("05:54", "18:04"),
    "2027-01-07": ("05:54", "18:05"),
    "2027-01-08": ("05:54", "18:05"),
    "2027-01-09": ("05:54", "18:06"),
    "2027-01-10": ("05:54", "18:07"),
    "2027-01-11": ("05:55", "18:08"),
    "2027-01-12": ("05:55", "18:08"),
    "2027-01-13": ("05:55", "18:09"),
    "2027-01-14": ("05:55", "18:10"),
    "2027-01-15": ("05:55", "18:11"),
    "2027-01-16": ("05:55", "18:11"),
    "2027-01-17": ("05:54", "18:12"),
    "2027-01-18": ("05:54", "18:13"),
    "2027-01-19": ("05:54", "18:14"),
    "2027-01-20": ("05:54", "18:14"),
    "2027-01-21": ("05:54", "18:15"),
    "2027-01-22": ("05:54", "18:16"),
    "2027-01-23": ("05:53", "18:17"),
}

TIMEANDDATE_CROSS_SEASON_REFERENCE = {
    "2026-01-23": ("05:53", "18:17"),
    "2026-06-01": ("03:54", "19:49"),
    "2026-10-01": ("04:55", "18:31"),
    "2026-10-11": ("05:01", "18:19"),
    "2026-12-01": ("05:35", "17:49"),
    "2026-12-06": ("05:39", "17:49"),
}


def observer_for(day: dt.date) -> tuple[ephem.Observer, dt.datetime]:
    local_midnight = dt.datetime.combine(day, dt.time.min, tzinfo=TIMEZONE)
    observer = ephem.Observer()
    observer.lat = LATITUDE
    observer.lon = LONGITUDE
    observer.elevation = ELEVATION_METERS
    observer.pressure = 0
    observer.horizon = "-12"
    observer.date = local_midnight.astimezone(dt.timezone.utc).replace(tzinfo=None)
    return observer, local_midnight


def to_local(event: ephem.Date) -> dt.datetime:
    utc = event.datetime().replace(tzinfo=dt.timezone.utc)
    return utc.astimezone(TIMEZONE) + DISPLAY_CALIBRATION


def nautical_twilight(day: dt.date) -> tuple[str, str]:
    observer, local_midnight = observer_for(day)
    sun = ephem.Sun()
    start = to_local(observer.next_rising(sun, use_center=True))

    observer.date = local_midnight.astimezone(dt.timezone.utc).replace(tzinfo=None)
    end = to_local(observer.next_setting(sun, use_center=True))
    return start.strftime("%H:%M"), end.strftime("%H:%M")


def assert_reference(name: str, reference: dict[str, tuple[str, str]]) -> None:
    mismatches = {}
    for iso, expected in reference.items():
        actual = nautical_twilight(dt.date.fromisoformat(iso))
        if actual != expected:
            mismatches[iso] = {"expected": expected, "actual": actual}
    if mismatches:
        raise RuntimeError(f"{name} calibration failed: {mismatches}")


def main() -> None:
    first = dt.date(YEAR, 1, 1)
    days: dict[str, dict[str, str]] = {}
    for offset in range(365):
        day = first + dt.timedelta(days=offset)
        start, end = nautical_twilight(day)
        days[day.isoformat()] = {"nauticalDawn": start, "nauticalDusk": end}

    assert_reference("Timeanddate January screenshot", JANUARY_SCREENSHOT_REFERENCE)
    assert_reference("Timeanddate cross-season", TIMEANDDATE_CROSS_SEASON_REFERENCE)

    payload = {
        "metadata": {
            "location": "Ningbo, China",
            "coordinates": {"latitude": 29.866667, "longitude": 121.55},
            "elevationMeters": ELEVATION_METERS,
            "timezone": "Asia/Shanghai",
            "year": YEAR,
            "definition": "Nautical twilight: solar center at -12° altitude.",
            "fields": {
                "nauticalDawn": "航海曙光始 / sunrise start",
                "nauticalDusk": "航海暮光终 / sunset end",
            },
            "status": "corrected_timeanddate_calibrated_calculation",
            "method": "PyEphem 4.2.1 high-precision ephemeris, displayed to Timeanddate's minute convention.",
            "referenceUrlTemplate": "https://www.timeanddate.com/sun/china/ningbo?month={MM}&year=2027",
            "validation": {
                "timeanddateScreenshot2027JanuaryVisibleRows": "23/23 matched",
                "timeanddateCrossSeason2026ReferenceSamples": "6/6 matched",
            },
            "note": "All 365 days were rebuilt with the calibrated ephemeris; the former simplified NOAA approximation is no longer used for this file.",
        },
        "days": days,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(days)} corrected days to {OUTPUT}")


if __name__ == "__main__":
    main()
