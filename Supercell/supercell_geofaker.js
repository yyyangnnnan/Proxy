const url = $request.url;
let body = $request.body;

// --- 伪装目标 ---
const fakeCountry = "KH"; // 柬埔寨
const fakeTimezone = "Asia/Phnom_Penh"; // 金边
// -----------------

if (url.includes("id.supercell.com/api/social/v3/session.init")) {
    console.log("Supercell 模块: 脚本触发，开始伪造地理位置...");

    try {
        // 使用正则表达式的全局替换(g)，确保请求体中所有的 "CN" 都被替换
        body = body.replace(/%22value%22%3A%22CN%22/g, `%22value%22%3A%22${fakeCountry}%22`);
        
        // 替换时区
        body = body.replace(/timezone=[^&]+/g, `timezone=${encodeURIComponent(fakeTimezone)}`);

        console.log("伪造成功，修改后 Body: " + body);
        $done({body: body});
    } catch (error) {
        console.log("Supercell 模块: 脚本执行出错: " + error);
        $done({});
    }
} else {
    $done({});
}
