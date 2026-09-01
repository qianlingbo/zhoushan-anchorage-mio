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
