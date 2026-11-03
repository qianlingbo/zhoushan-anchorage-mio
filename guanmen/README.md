# 灌门航窗

面向大型船舶的 2026 年灌门通航窗口可视化单页。无需构建工具，直接打开 `index.html`，或在目录运行：

```bash
python3 -m http.server 4173
```

随后访问 `http://localhost:4173`。

页面将日期、C1 站缓流窗口和宁波航海曙暮光统一到 24 小时路线轴。`c1-data-2026.js` 由 `scripts/update_c1_data.py` 从潮流潮位源站的 C1 十分钟预报生成，`app.js` 负责将缓流窗口与航海曙暮光时段取交集。

## Agent Skill 与按日 API

- 安装页：`/skill/`
- Skill：`/skill/guanmen-passage/SKILL.md`
- 按日 JSON：`/api/YYYY-MM-DD.json`
- API 元数据：`/api/index.json`

更新 C1 数据后，`scripts/update_c1_data.py` 会自动调用 `scripts/build_agent_api.cjs`，同步重建 2026 年 365 个按日 JSON 文件。

## 2027 航海曙暮光预留数据

`data/ningbo-nautical-twilight-2027.json` 保存宁波 2027 年 365 天的航海曙光始与暮光终时间。该文件由 `scripts/build_sun_data_2027.py` 使用 PyEphem 4.2.1 高精度星历生成，并按 timeanddate 的分钟显示口径校准：用户提供截图中可见的 2027 年 1 月 1–23 日为 23/23 一致，另以 2026 年 1、6、10、12 月跨季样本复核为 6/6 一致。运行命令：`uv run --with ephem==4.2.1 python scripts/build_sun_data_2027.py`。该数据暂不接入现有 2026 通航判定。
