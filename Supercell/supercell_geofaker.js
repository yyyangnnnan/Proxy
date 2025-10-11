// supercell_geofaker_precise.js
// 更精确地处理 id.supercell.com/api/social/v3/session.init 的 application/x-www-form-urlencoded 请求体
// 将有关中国的字段替换为柬埔寨

const fakeCountry = "KH";                    // 国家代码
const fakeCountryName = "Cambodia";          // 国家英文名（若 body 中出现中文名或英文名）
const fakeTimezone = "Asia/Phnom_Penh";      // IANA 时区名
const targetUrlPart = "id.supercell.com/api/social/v3/session.init";

// Helper: 获取 headers（忽略大小写）
function getHeader(headers, name) {
  for (const k in headers) if (k.toLowerCase() === name.toLowerCase()) return headers[k];
  return undefined;
}

// Helper: 删除 content-length 让系统重新计算
function withoutContentLength(headers) {
  const out = {};
  for (const k in headers) {
    if (k.toLowerCase() !== "content-length") out[k] = headers[k];
  }
  return out;
}

// 尝试安全地解析 JSON（返回 null 表示无法解析）
function tryParseJson(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

// 递归地替换 JSON 对象内的国家/时区字段（保守替换：只针对常见 key）
function replaceGeoInObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  for (const k in obj) {
    const val = obj[k];
    const kl = k.toLowerCase();
    if (typeof val === "string") {
      // 针对常见字段名做替换
      if (kl.includes("country") || kl.includes("countrycode") || kl === "value" || kl.includes("countryname")) {
        // 替换 CN、zh-CN、zh_CN 等
        obj[k] = val.replace(/\bCN\b/gi, fakeCountry).replace(/zh[-_]CN/gi, `zh-${fakeCountry}`);
      } else if (kl.includes("time") || kl === "tz" || kl.includes("timezone")) {
        obj[k] = fakeTimezone;
      } else {
        // 其他字符串字段：若包含 Asia/Shanghai 则替换
        obj[k] = val.replace(/Asia\/Shanghai/gi, fakeTimezone).replace(/\bCN\b/gi, function(m){
          // 仅在出现 "CN" 且上下文不明显时保守处理：不盲目替换
          return m;
        });
      }
    } else if (Array.isArray(val)) {
      obj[k] = val.map(item => (typeof item === "object" ? replaceGeoInObject(item) : (typeof item === "string" ? item.replace(/Asia\/Shanghai/gi, fakeTimezone) : item)));
    } else if (typeof val === "object") {
      obj[k] = replaceGeoInObject(val);
    }
  }
  return obj;
}

// 对 URL-encoded 的表单 body 进行处理：重点处理 applicationAccountToken 和 timezone
function processFormBody(formText) {
  // 解析成键值对（不依赖外部库）
  const pairs = formText.split("&").map(p => {
    const i = p.indexOf("=");
    if (i === -1) return {k: decodeURIComponent(p), v: ""};
    return {k: decodeURIComponent(p.slice(0, i)), v: p.slice(i+1)}; // v 保持原始编码状态（稍后 decode）
  });

  let changed = false;

  // 遍历字段
  for (let item of pairs) {
    const key = item.k;
    // 重点：applicationAccountToken（通常包含 URL-encoded 的 JSON 或嵌套数据）
    if (key === "applicationAccountToken" || key.toLowerCase().includes("token")) {
      // 先解码一次，尝试解析成 JSON
      let decoded = decodeURIComponent(item.v);
      // 有时 token 是前缀 + JSON 片段，尝试从第一个 "{" 开始到最后 "}" 截取
      let jsonPart = null;
      const firstBrace = decoded.indexOf("{");
      const lastBrace = decoded.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonPart = decoded.slice(firstBrace, lastBrace + 1);
      } else {
        // 如果没有明显的 json，还是尝试整体解析
        jsonPart = decoded;
      }

      const parsed = tryParseJson(jsonPart);
      if (parsed) {
        // 在 JSON 中替换
        const newObj = replaceGeoInObject(parsed);
        const newJson = JSON.stringify(newObj);
        // 把原 decoded 中的 jsonPart 替换为 newJson（保留 token 前后可能存在的其它部分）
        const newDecoded = decoded.slice(0, firstBrace) + newJson + decoded.slice(lastBrace + 1);
        item.v = encodeURIComponent(newDecoded);
        changed = true;
      } else {
        // 无法解析为 JSON，则做保守的字符串替换（仅替换明显的 CN / Asia/Shanghai）
        let newDecoded = decoded.replace(/"value"\s*:\s*"CN"/gi, `"value":"${fakeCountry}"`)
                                .replace(/"country"\s*:\s*"CN"/gi, `"country":"${fakeCountry}"`)
                                .replace(/Asia\/Shanghai/gi, fakeTimezone)
                                .replace(/%22value%22%3A%22CN%22/gi, `%22value%22%3A%22${fakeCountry}%22`)
                                .replace(/%22country%22%3A%22CN%22/gi, `%22country%22%3A%22${fakeCountry}%22`);
        if (newDecoded !== decoded) {
          item.v = encodeURIComponent(newDecoded);
          changed = true;
        }
      }
    } else if (key.toLowerCase() === "timezone" || key.toLowerCase() === "tz") {
      // 直接替换 timezone 字段（将编码后的时区写回）
      item.v = encodeURIComponent(fakeTimezone);
      changed = true;
    } else if (key.toLowerCase() === "country" || key.toLowerCase() === "countrycode") {
      item。v = encodeURIComponent(fakeCountry);
      changed = true;
    } else if (key.toLowerCase() === "locale") {
      // 替换 zh-CN -> zh-KH (保守)
      const decodedLocale = decodeURIComponent(item。v);
      item。v = encodeURIComponent(decodedLocale。替换(/zh[-_]?CN/gi, `zh-${fakeCountry}`));
      if (item.v) changed = true;
    }
  }

  // 如果没有变更则返回原文
  if (!changed) return {body: formText, changed: false};

  // 重新拼接
  const rebuilt = pairs.map(p => encodeURIComponent(p.k) + "=" + (p.v || "")).join("&");
  return {body: rebuilt, changed: true};
}

/* 主逻辑 */
try {
  const url = $request.url || "";
  const headers = $request.headers || {};
  let body = $request.body || "";

  if (!url.includes(targetUrlPart)) {
    $done({}); // 非目标请求不处理
  } else {
    console.log("Supercell geofaker: trigger for session.init");

    const contentType = getHeader(headers, "Content-Type") || getHeader(headers, "content-type") || "";

    // 只处理 application/x-www-form-urlencoded（根据 HAR，这正是目标请求的 content-type）
    if (contentType.indexOf("application/x-www-form-urlencoded") !== -1 && body && body.length > 0) {
      const result = processFormBody(body);
      if (result.changed) {
        console.log("Supercell geofaker: body modified (form). Returning new body.");
        $done({ body: result.body, headers: withoutContentLength(headers) });
      } else {
        console.log("Supercell geofaker: no replace needed in form body.");
        $done({});
      }
    } else {
      // 其他 content-types：做一个保守的字符串替换（尽量不误伤）
      let newBody = body;
      newBody = newBody.replace(/%22value%22%3A%22CN%22/gi, `%22value%22%3A%22${fakeCountry}%22`);
      newBody = newBody.replace(/%22country%22%3A%22CN%22/gi, `%22country%22%3A%22${fakeCountry}%22`);
      newBody = newBody.replace(/Asia\/Shanghai/gi, fakeTimezone);
      newBody = newBody.replace(/timezone=[^&]*/gi, `timezone=${encodeURIComponent(fakeTimezone)}`);

      if (newBody !== body) {
        console.log("Supercell geofaker: body modified (fallback).");
        $done({ body: newBody, headers: withoutContentLength(headers) });
      } else {
        $done({});
      }
    }
  }
} catch (err) {
  console.log("Supercell geofaker: error: " + err);
  $done({});
}
