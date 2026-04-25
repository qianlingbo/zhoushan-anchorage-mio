# Crontab 定时任务迁移教程

> 目标：在一台新 Mac（Mac mini 或其他）上配置 MIO 数据自动更新。  
> 预计耗时：10 分钟。

---

## 前置条件

新电脑需要：
- macOS 系统（任何版本）
- 能联网
- 有 GitHub 账号的 git push 权限（SSH key 或 HTTPS token）

---

## 第一步：克隆项目

打开终端（Terminal.app），执行：

```bash
cd ~
git clone https://github.com/qianlingbo/zhoushan-anchorage-mio.git zhoushan-mio
```

> ⚠️ 项目放在 `~/zhoushan-mio`（用户根目录下）。  
> **不要放在 `~/Documents/` 或 `~/Desktop/`**，这两个目录受 macOS TCC 权限保护，cron 无法访问。

---

## 第二步：安装 Python 依赖

macOS 自带 Python3，但需要装一个包：

```bash
pip3 install requests
```

验证：

```bash
python3 -c "import requests; print('OK')"
```

看到 `OK` 就行。

---

## 第三步：验证脚本能跑

```bash
cd ~/zhoushan-mio
python3 scripts/update_data.py
```

正常输出：

```
=== 舟山锚地供油指数数据更新 ===
抓取 条帚门锚地 ...
  ✓ 成功，24 条时段数据
...
全部完成！
```

---

## 第四步：验证 git push 能用

```bash
cd ~/zhoushan-mio
git status
```

如果刚才脚本跑过，会显示 `data/` 有改动。试推一次：

```bash
git add data/
git commit -m "测试推送"
git push
```

如果提示要输入用户名密码，说明需要配置 GitHub 认证：

### 方案 A：HTTPS + Token（推荐，简单）

1. 去 https://github.com/settings/tokens 生成一个 Personal Access Token（Classic）
2. 权限勾选 `repo`
3. push 时用户名填你的 GitHub 用户名，密码填这个 token
4. macOS 会自动保存到钥匙串，下次不用再输

### 方案 B：SSH Key

```bash
ssh-keygen -t ed25519 -C "你的邮箱"
cat ~/.ssh/id_ed25519.pub
```

把公钥添加到 https://github.com/settings/ssh/new，然后改远程地址：

```bash
cd ~/zhoushan-mio
git remote set-url origin git@github.com:qianlingbo/zhoushan-anchorage-mio.git
```

---

## 第五步：配置 Crontab

```bash
crontab -e
```

这会打开 vi 编辑器。操作方法：

1. 按 `i` 进入编辑模式
2. 粘贴以下内容（⌘V）：

```
# 舟山锚地MIO数据更新 — 每天 10:00 和 16:00
PATH=/usr/local/bin:/usr/bin:/bin
0 10 * * * cd /Users/你的用户名/zhoushan-mio && /usr/bin/python3 scripts/update_data.py && /usr/bin/git add data/ && /usr/bin/git diff --cached --quiet || (/usr/bin/git commit -m "🔄 更新MIO数据 $(date '+\%Y-\%m-\%d \%H:\%M')" && /usr/bin/git push) >> /tmp/mio-update.log 2>&1
0 16 * * * cd /Users/你的用户名/zhoushan-mio && /usr/bin/python3 scripts/update_data.py && /usr/bin/git add data/ && /usr/bin/git diff --cached --quiet || (/usr/bin/git commit -m "🔄 更新MIO数据 $(date '+\%Y-\%m-\%d \%H:\%M')" && /usr/bin/git push) >> /tmp/mio-update.log 2>&1
```

3. 按 `Esc` 退出编辑模式
4. 输入 `:wq` 回车保存退出

> ⚠️ 把 `你的用户名` 替换成实际的 macOS 用户名。不确定的话终端输入 `whoami` 查看。

---

## 第六步：验证 Crontab

```bash
crontab -l
```

应该能看到你刚才写入的两行。

---

## 第七步：处理 macOS 权限弹窗

首次触发 cron 时，macOS 可能会弹窗问你是否允许 cron 访问磁盘。**点允许**。

如果没弹窗但任务不执行，手动授权：

1. 打开 **系统设置**
2. → **隐私与安全性**
3. → **完全磁盘访问权限**
4. 点 🔒 解锁
5. 点 `+`，按 `Cmd + Shift + G`，输入 `/usr/sbin/cron`，回车，添加
6. 确保开关打开

---

## 验证一切正常

等到下一个 10:00 或 16:00 过后，检查日志：

```bash
cat /tmp/mio-update.log
```

看到 `全部完成！` 就说明一切正常。

也可以去 GitHub 看提交记录：  
https://github.com/qianlingbo/zhoushan-anchorage-mio/commits/main

---

## Crontab 语法速查

```
分 时 日 月 星期几
0  10 *  *  *        ← 每天 10:00
0  16 *  *  *        ← 每天 16:00
30 8  *  *  *        ← 每天 08:30
0  8,12,17 * * *     ← 每天 8:00、12:00、17:00
*/30 * * * *         ← 每 30 分钟
0  10 * * 1-5        ← 工作日（周一到周五）10:00
```

---

## 常用命令速查

| 操作 | 命令 |
|------|------|
| 查看定时任务 | `crontab -l` |
| 编辑定时任务 | `crontab -e` |
| 删除所有定时任务 | `crontab -r` |
| 查看执行日志 | `cat /tmp/mio-update.log` |
| 清空日志 | `> /tmp/mio-update.log` |
| 手动跑一次 | `cd ~/zhoushan-mio && python3 scripts/update_data.py && git add data/ && git commit -m "🔄 手动更新" && git push` |
| 查看 macOS 用户名 | `whoami` |

---

## 从旧电脑迁移的完整步骤

在旧电脑上：

```bash
# 1. 停掉旧电脑的定时任务
crontab -r
```

在新电脑上：

```bash
# 2. 按本教程第一步到第七步操作
# 3. 确认日志正常后，旧电脑的任务就不需要了
```

> 不需要从旧电脑拷贝任何文件，直接从 GitHub 克隆就是最新的。

---

## 注意事项

1. **电脑不能休眠**：合盖 / 休眠期间 cron 不执行。Mac mini 默认不休眠，所以很适合跑这个。
2. **网络要通**：断网时抓取会失败，但不影响下次执行。
3. **一台电脑跑就够了**：不要两台同时跑，会产生 git 冲突。
4. **项目路径不要变**：如果搬了目录，记得同步更新 `crontab -e` 里的路径。
