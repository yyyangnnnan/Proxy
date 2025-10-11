const url = $request.url;
let body = $request.body;

// --- Fake target ---
const fakeCountry = "KH"; // Cambodia
const fakeTimezone = "Asia/Phnom_Penh";

if (url.includes("id.supercell.com/api/social/v3/session.init")) {
  console.log("[Supercell GeoFaker] Intercepted session.init request");

  try {
    // Replace encoded country
    body = body.replace(/%22value%22%3A%22CN%22/g, '%22value%22%3A%22KH%22');
    // Replace unencoded country (fallback)
    body = body.replace(/"value"\s*:\s*"CN"/g, '"value":"KH"');
    // Replace timezone
    body = body.replace(/timezone=Asia%2FShanghai/g, "timezone=" + encodeURIComponent(fakeTimezone));
    body = body.replace(/Asia\/Shanghai/g, fakeTimezone);

    console.log("[Supercell GeoFaker] Modified body:\n" + body);
    $done({ body });
  } catch (error) {
    console.log("[Supercell GeoFaker] Error: " + error);
    $done({});
  }
} else {
  $done({});
}