/* 舟山锚地供油指数看板 - 渲染逻辑 */
(function () {
  "use strict";

  var DATA_URL = "./data/latest.json";

  var currentLanguage = "zh";
  var currentData = null;
  var currentError = null;

  var I18N = {
    zh: {
      documentTitle: "舟山锚地供油指数看板",
      pageStatusLabel: "页面状态",
      eyebrow: "API 数据 · 精细化预报",
      title: "舟山锚地供油指数看板",
      subtitle: "条帚门锚地、虾峙门外锚地、马峙锚地、秀山东锚地的 MIO 供油指数精细化预报一览。",
      sourceLabel: "数据来源",
      sourceName: "舟山海洋气象台 zs121.com.cn",
      sourceShortName: "舟山海洋气象台",
      publishTimeLabel: "预报发布时间",
      localUpdateLabel: "本地更新时间",
      loading: "等待数据",
      refreshLocalData: "重新读取本地数据",
      unknown: "未知",
      loaded: "已加载",
      weatherSummary: "天气概况：",
      dataReadFailed: "数据读取失败",
      readFailed: "读取失败",
      localDataUnavailable: "本地数据暂不可用",
      runScript: "请先运行 <code>python3 scripts/update_data.py</code> 生成数据文件。",
      tableTime: "时段",
      tableWindDirection: "风向",
      tableAverageWind: "平均风速",
      tableGust: "阵风",
      tableWave: "浪高",
      tableVisibility: "能见度",
      tableMio: "MIO评分",
      publishPrefix: "发布",
      currentPrefix: "当前",
      footerSource: "数据来源：",
      footerMio: " · MIO 评分：",
      rating4: "适宜",
      rating3: "一般",
      rating2: "较差",
      rating1: "恶劣",
      legendOrder: "● 顺序：风力 阵风 浪高 能见度",
      ratings: {
        4: "适宜",
        3: "一般",
        2: "较差",
        1: "恶劣",
      },
      mioLabels: ["风力", "阵风", "浪高", "能见度"],
    },
    en: {
      documentTitle: "Zhoushan Anchorage MIO Dashboard",
      pageStatusLabel: "Page status",
      eyebrow: "API Data · Fine-grained Forecast",
      title: "Zhoushan Anchorage MIO Dashboard",
      subtitle: "Fine-grained MIO bunkering forecasts for Tiaozhoumen, Outer Xiazhimen, Mazhi, and East Xiushan anchorages.",
      sourceLabel: "Data source",
      sourceName: "Zhoushan Marine Meteorological Observatory zs121.com.cn",
      sourceShortName: "Zhoushan Marine Meteorological Observatory",
      publishTimeLabel: "Forecast issued",
      localUpdateLabel: "Local update",
      loading: "Waiting for data",
      refreshLocalData: "Reload local data",
      unknown: "Unknown",
      loaded: "Loaded",
      weatherSummary: "Weather summary: ",
      dataReadFailed: "Failed to read data",
      readFailed: "Read failed",
      localDataUnavailable: "Local data unavailable",
      runScript: "Run <code>python3 scripts/update_data.py</code> first to generate the data file.",
      tableTime: "Period",
      tableWindDirection: "Wind",
      tableAverageWind: "Avg wind",
      tableGust: "Gust",
      tableWave: "Wave",
      tableVisibility: "Visibility",
      tableMio: "MIO rating",
      publishPrefix: "Issued",
      currentPrefix: "Current",
      footerSource: "Data source: ",
      footerMio: " · MIO rating: ",
      rating4: "Suitable",
      rating3: "Fair",
      rating2: "Poor",
      rating1: "Severe",
      legendOrder: "Order: wind, gust, wave, visibility",
      ratings: {
        4: "Suitable",
        3: "Fair",
        2: "Poor",
        1: "Severe",
      },
      mioLabels: ["Wind", "Gust", "Wave", "Visibility"],
    },
  };

  var ANCHOR_NAMES = {
    "条帚门锚地": "Tiaozhoumen Anchorage",
    "虾峙门外锚地": "Outer Xiazhimen Anchorage",
    "马峙锚地": "Mazhi Anchorage",
    "秀山东锚地": "East Xiushan Anchorage",
  };

  var WIND_DIRECTIONS = {
    "东风": "Easterly",
    "东南风": "Southeasterly",
    "南风": "Southerly",
    "西南风": "Southwesterly",
    "西风": "Westerly",
    "西北风": "Northwesterly",
    "北风": "Northerly",
    "东北风": "Northeasterly",
    "偏东风": "Easterly",
    "偏南风": "Southerly",
    "偏西风": "Westerly",
    "偏北风": "Northerly",
    "东到东南风": "East to southeast",
    "东到东北风": "East to northeast",
    "西到西南风": "West to southwest",
    "西到西北风": "West to northwest",
    "南到东南风": "South to southeast",
    "南到西南风": "South to southwest",
    "北到东北风": "North to northeast",
    "北到西北风": "North to northwest",
  };

  var MIO_COLORS = {
    4: { cls: "mio-4", bg: "#2f9d57" },
    3: { cls: "mio-3", bg: "#f5a623" },
    2: { cls: "mio-2", bg: "#f5732a" },
    1: { cls: "mio-1", bg: "#e53e3e" },
  };

  /* Data loading */

  function loadData() {
    if (window.__ANCHOR_DATA__) {
      return Promise.resolve(window.__ANCHOR_DATA__);
    }
    return fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("读取数据失败: " + r.status);
        return r.json();
      });
  }

  /* Language */

  function languagePack() {
    return I18N[currentLanguage] || I18N.zh;
  }

  function t(key) {
    var pack = languagePack();
    return pack[key] !== undefined ? pack[key] : I18N.zh[key] || key;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLanguage === "en" ? "en" : "zh-CN";
    document.title = t("documentTitle");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
    });
  }

  function updateLanguageButtons() {
    document.querySelectorAll("[data-lang]").forEach(function (button) {
      var active = button.getAttribute("data-lang") === currentLanguage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setLoadingText() {
    var publishTime = document.getElementById("publish-time");
    var lastUpdated = document.getElementById("last-updated");
    var status = document.getElementById("status-pill");

    if (publishTime) publishTime.textContent = t("loading");
    if (lastUpdated) lastUpdated.textContent = t("loading");
    if (status) status.textContent = t("loading");
  }

  function setLanguage(lang) {
    if (lang !== "zh" && lang !== "en") return;
    currentLanguage = lang;
    applyStaticTranslations();
    updateLanguageButtons();

    if (currentData) {
      render(currentData);
    } else if (currentError) {
      renderError(currentError);
    } else {
      setLoadingText();
    }
  }

  function setupLanguageSwitcher() {
    document.querySelectorAll("[data-lang]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLanguage(button.getAttribute("data-lang"));
      });
    });
    updateLanguageButtons();
  }

  /* Helpers */

  function parseRiskrating(str) {
    if (!str) return [0, 0, 0, 0];
    return str.trim().split(/\s+/).map(Number);
  }

  function overallRating(ratings) {
    var valid = ratings.filter(function (v) { return v > 0; });
    return valid.length ? Math.min.apply(null, valid) : 1;
  }

  function ratingLabel(val) {
    return languagePack().ratings[val] || I18N.zh.ratings[val] || I18N.zh.ratings[1];
  }

  function ratingColor(val) {
    var color = MIO_COLORS[val] || MIO_COLORS[1];
    return {
      cls: color.cls,
      bg: color.bg,
      label: ratingLabel(val),
    };
  }

  /**
   * Parse "26日08时-11时" into a comparable value to detect current slot.
   * Returns { day: number, startHour: number, endHour: number }
   */
  function parseTimeSlot(timeStr) {
    var m = String(timeStr || "").match(/(\d+)日(\d+)时.*?(\d+)时/);
    if (!m) return null;
    return {
      day: parseInt(m[1], 10),
      startHour: parseInt(m[2], 10),
      endHour: parseInt(m[3], 10),
    };
  }

  function getCurrentSlotIndex(forecasts) {
    var now = new Date();
    var day = now.getDate();
    var hour = now.getHours();

    for (var i = 0; i < forecasts.length; i++) {
      var slot = parseTimeSlot(forecasts[i].Time);
      if (!slot) continue;
      if (slot.day === day && hour >= slot.startHour && hour < slot.endHour) {
        return i;
      }
      if (slot.endHour <= slot.startHour) {
        if (slot.day === day && hour >= slot.startHour) return i;
        if (slot.day === day - 1 && hour < slot.endHour) return i;
      }
    }
    return 0;
  }

  function translateAnchorName(name) {
    if (currentLanguage === "zh") return name;
    return ANCHOR_NAMES[name] || name;
  }

  function formatWindDirection(forecast) {
    if (currentLanguage === "zh") return forecast.WindDirect || "";
    return WIND_DIRECTIONS[forecast.WindDirect] || forecast.wd_en || forecast.WindDirect || "";
  }

  function ordinalDay(day) {
    var mod100 = day % 100;
    if (mod100 >= 11 && mod100 <= 13) return day + "th";
    switch (day % 10) {
      case 1:
        return day + "st";
      case 2:
        return day + "nd";
      case 3:
        return day + "rd";
      default:
        return day + "th";
    }
  }

  function padHour(hour) {
    return String(hour).padStart(2, "0");
  }

  function formatTimeSlot(timeStr) {
    if (currentLanguage === "zh") return timeStr || "";

    var m = String(timeStr || "").match(/(\d+)日(\d+)时-(?:(\d+)日)?(\d+)时/);
    if (!m) return timeStr || "";

    var startDay = parseInt(m[1], 10);
    var startHour = parseInt(m[2], 10);
    var endDay = m[3] ? parseInt(m[3], 10) : startDay;
    var endHour = parseInt(m[4], 10);
    var endLabel = endDay === startDay ? "" : ordinalDay(endDay) + " ";

    return ordinalDay(startDay) + " " + padHour(startHour) + ":00-" + endLabel + padHour(endHour) + ":00";
  }

  function formatPublishTime(value) {
    if (!value) return t("unknown");
    if (currentLanguage === "zh") return value;

    var m = String(value).match(/(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})时/);
    if (!m) return value;

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var month = months[parseInt(m[2], 10) - 1] || m[2];
    return month + " " + parseInt(m[3], 10) + ", " + m[1] + " " + padHour(parseInt(m[4], 10)) + ":00";
  }

  function translateStatus(status) {
    if (!status) return t("loaded");
    if (currentLanguage === "zh") return status;

    var map = {
      "更新完成": "Updated",
      "部分更新": "Partially updated",
    };
    return map[status] || status;
  }

  function cleanWeatherText(raw) {
    return String(raw || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatWeatherText(raw) {
    var text = cleanWeatherText(raw);
    if (!text || currentLanguage === "zh") return text;
    return translateWeatherText(text);
  }

  function translateWeatherText(text) {
    var body = text.replace(/^天气预报：/, "");
    var sentences = body.split("。").map(function (sentence) {
      return sentence.trim();
    }).filter(Boolean);

    if (!sentences.length) return "Forecast unavailable.";

    return "Forecast: " + sentences.map(translateWeatherSentence).join(" ");
  }

  function translateWeatherSentence(sentence) {
    var temp = sentence.match(/^预计(今天|明天|后天)?最高气温([\d.-]+)摄氏度，(今天|明天|后天)?最低气温([\d.-]+)摄氏度$/);
    if (temp) {
      return dayPossessive(temp[1] || "今天") + " high is expected to be " + temp[2] + " deg C; " +
        dayPossessive(temp[3] || "明天").toLowerCase() + " low " + temp[4] + " deg C.";
    }

    var prefix = "";
    var prefixMatch = sentence.match(/^(今天|明天|后天)/);
    if (prefixMatch) {
      prefix = dayLabel(prefixMatch[1]);
      sentence = sentence.slice(prefixMatch[1].length);
    } else {
      prefixMatch = sentence.match(/^(\d{1,2})月(\d{1,2})日/);
      if (prefixMatch) {
        prefix = "On " + monthName(parseInt(prefixMatch[1], 10)) + " " + parseInt(prefixMatch[2], 10);
        sentence = sentence.slice(prefixMatch[0].length);
      } else {
        prefixMatch = sentence.match(/^(\d{1,2})日/);
        if (prefixMatch) {
          prefix = "On the " + ordinalDay(parseInt(prefixMatch[1], 10));
          sentence = sentence.slice(prefixMatch[0].length);
        }
      }
    }

    var timeMatch = sentence.match(/^(早晨|上午|中午|下午|傍晚|夜里)/);
    if (timeMatch) {
      var time = timeLabel(timeMatch[1]);
      if (prefix === "Today" && time === "morning") {
        prefix = "This morning";
      } else {
        prefix += (prefix ? " " : "") + time;
      }
      sentence = sentence.slice(timeMatch[1].length);
    }

    var clauses = sentence.split("，").map(function (clause) {
      return translateWeatherClause(clause.trim());
    }).filter(Boolean);

    var translated = clauses.join(", ");
    if (!translated) return prefix ? prefix + "." : "";
    return (prefix ? prefix + ", " : "") + translated + ".";
  }

  function dayLabel(value) {
    return {
      "今天": "Today",
      "明天": "Tomorrow",
      "后天": "The day after tomorrow",
    }[value] || value;
  }

  function dayPossessive(value) {
    return {
      "今天": "Today's",
      "明天": "Tomorrow's",
      "后天": "The day after tomorrow's",
    }[value] || "Expected";
  }

  function monthName(month) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[month - 1] || String(month);
  }

  function timeLabel(value) {
    return {
      "早晨": "morning",
      "上午": "morning",
      "中午": "noon",
      "下午": "afternoon",
      "傍晚": "evening",
      "夜里": "night",
    }[value] || value;
  }

  function translateWeatherClause(clause) {
    var exact = {
      "晴": "sunny",
      "多云": "cloudy",
      "阴": "overcast",
      "晴到多云": "sunny to cloudy",
      "晴转多云": "sunny, turning cloudy",
      "多云到晴": "cloudy to sunny",
      "阴到多云": "overcast to cloudy",
      "阴有阵雨": "overcast with showers",
      "阴有阵雨或雷雨": "overcast with showers or thunderstorms",
      "局部有阵雨": "isolated showers",
      "阵雨": "showers",
      "阵雨或雷雨": "showers or thunderstorms",
      "下午起阴有阵雨": "overcast with showers from the afternoon",
      "下午起阴有阵雨或雷雨": "overcast with showers or thunderstorms from the afternoon",
      "下午起阴有时有阵雨或雷雨": "overcast with occasional showers or thunderstorms from the afternoon",
      "夜里阴有阵雨或雷雨": "overcast with showers or thunderstorms at night",
      "上午转多云到晴": "turning cloudy to sunny in the morning",
      "多云转阴有阵雨": "cloudy, turning overcast with showers",
      "夜里雨量中等": "with moderate rainfall at night",
      "雨量中等": "with moderate rainfall",
      "雨量中到大": "with moderate to heavy rainfall",
      "雨止转多云到晴": "rain ending and turning cloudy to sunny",
      "下半夜转阴到多云": "turning overcast to cloudy after midnight",
      "局部有雾": "patchy fog",
      "有雾": "fog",
    };

    if (exact[clause]) return exact[clause];

    var translated = clause;
    [
      ["下午起", "from the afternoon "],
      ["夜里", "at night "],
      ["上午", "in the morning "],
      ["下半夜", "after midnight "],
      ["雨止转", "rain ending and turning "],
      ["有时有阵雨或雷雨", "occasional showers or thunderstorms"],
      ["有时有阵雨", "occasional showers"],
      ["阴有阵雨或雷雨", "overcast with showers or thunderstorms"],
      ["阴有阵雨", "overcast with showers"],
      ["阵雨或雷雨", "showers or thunderstorms"],
      ["雨量中到大", "with moderate to heavy rainfall"],
      ["雨量中等", "with moderate rainfall"],
      ["晴转多云", "sunny, turning cloudy"],
      ["晴到多云", "sunny to cloudy"],
      ["阴到多云", "overcast to cloudy"],
      ["多云到晴", "cloudy to sunny"],
      ["局部有雾", "patchy fog"],
      ["局部有阵雨", "isolated showers"],
      ["雷雨", "thunderstorms"],
      ["阵雨", "showers"],
      ["多云", "cloudy"],
      ["晴", "sunny"],
      ["阴", "overcast"],
      ["转", ", turning "],
      ["或", " or "],
    ].forEach(function (pair) {
      translated = translated.split(pair[0]).join(pair[1]);
    });

    return translated
      .replace(/(\d{1,2})月(\d{1,2})日/g, function (_, month, day) {
        return monthName(parseInt(month, 10)) + " " + parseInt(day, 10);
      })
      .replace(/(\d{1,2})日/g, function (_, day) {
        return "the " + ordinalDay(parseInt(day, 10));
      })
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
  }

  /* Rendering */

  function makeMioDots(ratings) {
    var labels = languagePack().mioLabels;
    var html = '<div class="mio-cell">';
    for (var i = 0; i < ratings.length; i++) {
      var val = ratings[i];
      var info = ratingColor(val);
      html += '<span class="mio-dot ' + info.cls + '" title="' + escapeHtml(labels[i] + ": " + info.label + " (" + val + ")") + '"></span>';
    }
    html += "</div>";
    return html;
  }

  function buildTable(forecasts, currentIdx) {
    var html = '<div class="forecast-table-wrap"><table class="forecast-table">';
    html += "<thead><tr>";
    html += "<th>" + escapeHtml(t("tableTime")) + "</th>";
    html += "<th>" + escapeHtml(t("tableWindDirection")) + "</th>";
    html += "<th>" + escapeHtml(t("tableAverageWind")) + "</th>";
    html += "<th>" + escapeHtml(t("tableGust")) + "</th>";
    html += "<th>" + escapeHtml(t("tableWave")) + "</th>";
    html += "<th>" + escapeHtml(t("tableVisibility")) + "</th>";
    html += "<th>" + escapeHtml(t("tableMio")) + "</th>";
    html += "</tr></thead><tbody>";

    var prevDay = null;

    for (var i = 0; i < forecasts.length; i++) {
      var f = forecasts[i];
      var ratings = parseRiskrating(f.Riskrating);
      var slot = parseTimeSlot(f.Time);
      var dayVal = slot ? slot.day : null;

      var rowClass = "";
      if (i === currentIdx) rowClass += " current-slot";
      if (prevDay !== null && dayVal !== null && dayVal !== prevDay) rowClass += " day-sep";
      prevDay = dayVal;

      html += '<tr class="' + rowClass.trim() + '">';
      html += "<td>" + escapeHtml(formatTimeSlot(f.Time)) + "</td>";
      html += "<td>" + escapeHtml(formatWindDirection(f)) + "</td>";
      html += "<td>" + escapeHtml(String(f.WindSpeedAvg)) + " m/s</td>";
      html += "<td>" + escapeHtml(String(f.WindSpeed)) + " m/s</td>";
      html += "<td>" + escapeHtml(f.WindWave) + "</td>";
      html += "<td>" + escapeHtml(f.Vis) + "</td>";
      html += "<td>" + makeMioDots(ratings) + "</td>";
      html += "</tr>";
    }

    html += "</tbody></table></div>";
    return html;
  }

  function buildCard(name, anchorData) {
    var forecasts = anchorData.PreciseForecast || [];
    var currentIdx = getCurrentSlotIndex(forecasts);

    var currentRatings = forecasts.length > 0 ? parseRiskrating(forecasts[currentIdx].Riskrating) : [0];
    var overall = overallRating(currentRatings);
    var overallInfo = ratingColor(overall);

    var card = document.createElement("article");
    card.className = "anchor-card";

    var headerHtml = '<header class="anchor-header">';
    headerHtml += "<div>";
    headerHtml += '<h2 class="anchor-name">' + escapeHtml(translateAnchorName(name)) + "</h2>";
    if (anchorData.PreciseForecastTime) {
      headerHtml += '<p class="anchor-publish-time">' + escapeHtml(t("publishPrefix")) + ": " + escapeHtml(formatPublishTime(anchorData.PreciseForecastTime)) + "</p>";
    }
    headerHtml += "</div>";
    headerHtml += '<span class="overall-badge" style="background:' + overallInfo.bg + '22;color:' + overallInfo.bg + '">';
    headerHtml += '<span class="dot" style="background:' + overallInfo.bg + '"></span>';
    headerHtml += escapeHtml(t("currentPrefix") + " " + overallInfo.label);
    headerHtml += "</span>";
    headerHtml += "</header>";

    card.innerHTML = headerHtml + buildTable(forecasts, currentIdx);

    var legend = document.createElement("div");
    legend.className = "mio-legend";
    legend.innerHTML =
      '<span class="mio-legend-item"><span class="mio-legend-dot" style="background:var(--mio-4)"></span>4 ' + escapeHtml(ratingLabel(4)) + "</span>" +
      '<span class="mio-legend-item"><span class="mio-legend-dot" style="background:var(--mio-3)"></span>3 ' + escapeHtml(ratingLabel(3)) + "</span>" +
      '<span class="mio-legend-item"><span class="mio-legend-dot" style="background:var(--mio-2)"></span>2 ' + escapeHtml(ratingLabel(2)) + "</span>" +
      '<span class="mio-legend-item"><span class="mio-legend-dot" style="background:var(--mio-1)"></span>1 ' + escapeHtml(ratingLabel(1)) + "</span>" +
      '<span class="mio-legend-item mio-legend-order">' + escapeHtml(t("legendOrder")) + "</span>";
    card.appendChild(legend);

    return card;
  }

  function render(data) {
    currentData = data;
    currentError = null;

    var grid = document.getElementById("anchor-grid");
    var publishTime = document.getElementById("publish-time");
    var lastUpdated = document.getElementById("last-updated");
    var status = document.getElementById("status-pill");
    var weatherText = document.getElementById("weather-text");

    publishTime.textContent = formatPublishTime(data.publishTime);
    lastUpdated.textContent = data.lastUpdated || t("unknown");
    status.textContent = translateStatus(data.status);

    var anchorNames = Object.keys(data.anchors || {});
    weatherText.textContent = "";
    if (anchorNames.length > 0) {
      var firstAnchor = data.anchors[anchorNames[0]];
      if (firstAnchor && firstAnchor.Text) {
        weatherText.innerHTML = "<strong>" + escapeHtml(t("weatherSummary")) + "</strong>" + escapeHtml(formatWeatherText(firstAnchor.Text));
      }
    }

    grid.innerHTML = "";

    for (var i = 0; i < anchorNames.length; i++) {
      var name = anchorNames[i];
      var card = buildCard(name, data.anchors[name]);
      grid.appendChild(card);
    }
  }

  function renderError(error) {
    currentError = error;
    currentData = null;

    var grid = document.getElementById("anchor-grid");
    var publishTime = document.getElementById("publish-time");
    var lastUpdated = document.getElementById("last-updated");
    var status = document.getElementById("status-pill");
    var weatherText = document.getElementById("weather-text");

    publishTime.textContent = t("unknown");
    lastUpdated.textContent = t("readFailed");
    status.textContent = t("localDataUnavailable");
    weatherText.textContent = "";
    grid.innerHTML =
      '<article class="anchor-card" style="grid-column:1/-1;padding:40px;text-align:center">' +
      '<h2 style="margin:0 0 12px;font-size:20px">' + escapeHtml(t("dataReadFailed")) + "</h2>" +
      '<p style="color:var(--muted)">' + escapeHtml(error.message) + "</p>" +
      '<p style="color:var(--muted);margin-top:12px">' + t("runScript") + "</p>" +
      "</article>";
  }

  function refresh() {
    loadData()
      .then(function (data) { render(data); })
      .catch(function (err) { renderError(err); });
  }

  setupLanguageSwitcher();
  applyStaticTranslations();
  setLoadingText();

  document.getElementById("refresh-button").addEventListener("click", function () {
    if (window.__ANCHOR_DATA__) {
      window.location.reload();
      return;
    }
    refresh();
  });

  refresh();
})();
