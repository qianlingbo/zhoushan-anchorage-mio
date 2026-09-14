---
name: chinese-tonnage-dues
description: Calculate Chinese vessel tonnage dues from a ship's flag country or region, net tonnage, licence duration, and optional vessel type. Use this skill whenever a user asks about 吨税、船舶吨税、定额税率、优惠税率, or wants to know the payable amount for 30 days, 90 days, or 1 year. It recognizes the current 77-country preferential list, treats China as preferential by default, excludes Panama from that list, and returns a precise amount in yuan.
compatibility: Requires Python 3.9+; uses only the standard library.
---

# Chinese Tonnage Dues

Use the bundled deterministic calculator so the rate table and the website stay consistent. Do not estimate a rate from memory or reverse the PDF's duration columns: the source order is **1 year → 90 days → 30 days**. The default query is China, 30 days, preferential rate, and ordinary vessel.

## Workflow

1. Collect the country or region, net tonnage, and licence duration. Accept 30, 90, or 365 days; if duration is omitted, use 30 days. If country is omitted, use 中国. The optional vessel type is `standard`, `tug`, or `barge`; tug and non-powered barge use a 50% factor.
2. Run the calculator from this skill directory (resolve the path relative to this `SKILL.md` when called elsewhere):

   ```bash
   python3 scripts/calculate_tonnage_dues.py --country 中国 --tonnage 10000 --duration 30 --json
   ```

3. Report the country, tax category, net tonnage, duration, vessel type, rate, factor, formula, final amount, and the returned RMB uppercase amount. Preserve the returned amount to two decimal places and use `¥`/`元`.
4. Include the calculator's note that the result is rounded to 0.01 yuan and is for pre-declaration estimation only.

## Tax rules

- Net-tonnage brackets are: ≤2,000; >2,000–≤10,000; >10,000–≤50,000; >50,000.
- Ordinary rates by bracket are `[1 year, 90 days, 30 days]`: `[12.6, 4.2, 2.1]`, `[24, 8, 4]`, `[27.6, 9.2, 4.6]`, `[31.8, 10.6, 5.3]` yuan/NT.
- Preferential rates by bracket are `[9, 3, 1.5]`, `[17.4, 5.8, 2.9]`, `[19.8, 6.6, 3.3]`, `[22.8, 7.6, 3.8]` yuan/NT.
- China aliases (`中国`, `中国大陆`, `中华人民共和国`) and the countries in `references/tonnage-dues-data.json` use preferential rates. Panama is intentionally not in that list and therefore uses ordinary rates.
- Amount = net tonnage × selected rate × vessel factor. Round the final amount half-up to 0.01 yuan.

## Output modes

- Use `--json` for downstream Agent calls. The JSON includes `amount_yuan`, `amount_display`, `amount_uppercase`, `rate_yuan_per_nt`, `tax_type`, `preferential`, `duration_days`, and `formula`.
- Omit `--json` for a concise Chinese report suitable for a user.
- Add `--pretty` with `--json` for indented JSON.

## Validation

If net tonnage is missing, non-numeric, non-finite, or not greater than zero, ask for/correct it. Reject durations other than 30, 90, and 365 days. Keep country names as provided for display; an unlisted country is valid input and is calculated at the ordinary rate.
