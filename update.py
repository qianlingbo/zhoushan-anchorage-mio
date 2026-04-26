import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

URL = "https://www.zs121.com.cn/Portarea/Portarea"

def fetch_data():
    r = requests.get(URL, timeout=30)
    r.encoding = "utf-8"
    soup = BeautifulSoup(r.text, "html.parser")

    result = {
        "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "anchorage": {}
    }

    # 页面里每个锚地都是一个模块，class 名基本一致
    blocks = soup.find_all("div", class_="port-item")

    for block in blocks:
        name_tag = block.find("div", class_="title")
        if not name_tag:
            continue

        anchorage_name = name_tag.get_text(strip=True)
        result["anchorage"][anchorage_name] = []

        rows = block.find_all("tr")

        for row in rows[1:]:
            cols = row.find_all("td")
            if len(cols) >= 2:
                time_text = cols[0].get_text(strip=True)
                index_text = cols[1].get_text(strip=True)

                result["anchorage"][anchorage_name].append({
                    "time": time_text,
                    "index": index_text
                })

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    fetch_data()
