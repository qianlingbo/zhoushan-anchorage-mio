#!/usr/bin/env python3
"""Calculate Chinese tonnage dues from country, net tonnage and licence duration."""

from __future__ import annotations

import argparse
import json
import sys
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "references" / "tonnage-dues-data.json"
DEFAULT_COUNTRY = "中国"
DEFAULT_DURATION = 30


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="按船籍国、净吨位和执照期限计算中国船舶吨税。")
    parser.add_argument("--country", default=DEFAULT_COUNTRY, help="船籍国或地区，默认：中国")
    parser.add_argument("--tonnage", required=True, help="船舶净吨位（NT），必须大于 0")
    parser.add_argument("--duration", type=int, choices=(30, 90, 365), default=DEFAULT_DURATION, help="执照期限：30、90 或 365 日，默认 30")
    parser.add_argument("--vessel-type", choices=("standard", "tug", "barge"), default="standard", help="船型：standard、tug 或 barge，后两者按 50%% 计征")
    parser.add_argument("--json", action="store_true", help="输出 Agent 可读取的 JSON")
    parser.add_argument("--pretty", action="store_true", help="与 --json 一起使用，缩进输出")
    return parser.parse_args()


def money(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ",.2f")


def number(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ",.2f")


def percent(value: Decimal) -> str:
    raw = format(value * 100, "f")
    return raw.rstrip("0").rstrip(".") if "." in raw else raw


def load_data() -> dict:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def parse_tonnage(raw: str) -> Decimal:
    try:
        tonnage = Decimal(raw)
    except (InvalidOperation, TypeError) as error:
        raise ValueError("净吨位必须是数字。") from error
    if not tonnage.is_finite() or tonnage <= 0:
        raise ValueError("净吨位必须大于 0。")
    return tonnage


def is_preferential(country: str, data: dict) -> bool:
    name = country.strip() or DEFAULT_COUNTRY
    return name in data["china_aliases"] or name in data["preferential_countries"]


def bracket_for(tonnage: Decimal, brackets: list[dict]) -> tuple[int, dict]:
    for index, bracket in enumerate(brackets):
        maximum = bracket["max_tonnage"]
        if maximum is None or tonnage <= Decimal(str(maximum)):
            return index, bracket
    raise ValueError("无法匹配净吨位分档。")


def calculate(country: str, tonnage: Decimal, duration: int, vessel_type: str, data: dict) -> dict:
    if duration not in data["duration_days"]:
        raise ValueError("执照期限只能是 30、90 或 365 日。")
    if vessel_type not in data["vessel_type_factors"]:
        raise ValueError("船型只能是 standard、tug 或 barge。")

    preferential = is_preferential(country, data)
    category = "preferential" if preferential else "ordinary"
    bracket_index, bracket = bracket_for(tonnage, data["rates"][category])
    duration_index = data["duration_days"].index(duration)
    rate = Decimal(str(bracket["values"][duration_index]))
    factor = Decimal(str(data["vessel_type_factors"][vessel_type]))
    amount = (tonnage * rate * factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    type_label = {"standard": "普通船舶", "tug": "拖船", "barge": "非机动驳船"}[vessel_type]

    return {
        "country": country.strip() or DEFAULT_COUNTRY,
        "tax_type": "优惠税率" if preferential else "普通税率",
        "preferential": preferential,
        "tonnage_nt": float(tonnage),
        "duration_days": duration,
        "vessel_type": vessel_type,
        "vessel_type_label": type_label,
        "bracket": bracket_index + 1,
        "rate_yuan_per_nt": float(rate),
        "vessel_factor": float(factor),
        "amount_yuan": float(amount),
        "amount_display": money(amount),
        "formula": f"{number(tonnage)} × {rate:.2f} × {percent(factor)}%",
        "source": data["source"],
        "note": "结果四舍五入至 0.01 元，仅供申报前测算参考。",
    }


def text_report(result: dict) -> str:
    duration_label = "1 年" if result["duration_days"] == 365 else f"{result['duration_days']} 日"
    return "\n".join(
        [
            f"船籍：{result['country']}（{result['tax_type']}）",
            f"净吨位：{number(Decimal(str(result['tonnage_nt'])))} NT｜执照期限：{duration_label}｜船型：{result['vessel_type_label']}",
            f"适用税率：{result['rate_yuan_per_nt']:g} 元/净吨，船型系数：{percent(Decimal(str(result['vessel_factor'])))}%",
            f"应纳吨税：¥{result['amount_display']} 元",
            f"计算式：{result['formula']}",
            result["note"],
        ]
    )


def main() -> int:
    args = parse_args()
    try:
        data = load_data()
        result = calculate(args.country, parse_tonnage(args.tonnage), args.duration, args.vessel_type, data)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"错误：{error}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None))
    else:
        print(text_report(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
