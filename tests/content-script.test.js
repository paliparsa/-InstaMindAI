(async () => {
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("content.js", "utf8");
let registered = [];
const anchor = {
  getAttribute: () => "/sample_account/",
  getBoundingClientRect: () => ({ width: 120, height: 32 }),
  closest: () => null,
  querySelector: () => null,
  innerText: "@sample_account"
};
const document = {
  title: "Sample profile",
  body: { innerText: "Sample visible Instagram profile text", querySelectorAll: () => [] },
  querySelector: () => null,
  querySelectorAll: () => [anchor]
};
const sandbox = {
  URL,
  Map,
  Date,
  location: { origin: "https://www.instagram.com", pathname: "/sample_account/" },
  document,
  browser: { runtime: { onMessage: { addListener: listener => registered.push(listener) } } }
};
vm.runInNewContext(source, sandbox);
vm.runInNewContext(source, sandbox);
assert.equal(registered.length, 1, "reinjection must not register duplicate message listeners");
const collected = await registered[0]({ type: "COLLECT_FOLLOWING" });
assert.equal(collected.ok, true);
assert.equal(collected.accounts.length, 1);
assert.equal(collected.accounts[0].username, "sample_account");
const profile = await registered[0]({ type: "READ_PROFILE" });
assert.equal(profile.profile.username, "sample_account");
console.log("Content-script messaging tests passed (collection, profile read, idempotent reinjection).");

})().catch(error => { console.error(error); process.exitCode = 1; });
