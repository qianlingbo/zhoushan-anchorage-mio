import datetime

now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

with open("auto_update_log.txt", "w", encoding="utf-8") as f:
    f.write(f"Last auto update: {now}\n")

print("Updated at", now)
