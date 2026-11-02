const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("accounts.js", "utf8");
const start = source.indexOf('const $=id=>document.getElementById(id),PAGE_SIZE=25;');
const end = source.indexOf("function relationLabel(x)", start);
assert.notEqual(start, -1, "account import helpers must exist");
assert.notEqual(end, -1, "account import helper boundary must exist");

const sandbox = { URL, Date, Map, Set };
vm.runInNewContext(source.slice(start, end) + "\nglobalThis.importApi = { usernameFromUrl, extractJsonAccounts, reconcileFollowingSnapshot, relationshipState };", sandbox);
const { usernameFromUrl, extractJsonAccounts, reconcileFollowingSnapshot, relationshipState } = sandbox.importApi;

assert.equal(usernameFromUrl("https://www.instagram.com/_u/sanamiriartist"), "sanamiriartist");
assert.equal(usernameFromUrl("https://www.instagram.com/sanamiriartist/"), "sanamiriartist");
assert.equal(usernameFromUrl("https://www.instagram.com/p/ABC123/"), null);

const sample = {
  relationships_following: [{
    title: "sanamiriartist",
    string_list_data: [{ href: "https://www.instagram.com/_u/sanamiriartist", timestamp: 1793623442 }]
  }]
};
const parsedSample = extractJsonAccounts(sample, "following.json");
assert.equal(parsedSample.length, 1);
assert.equal(parsedSample[0].username, "sanamiriartist");
assert.equal(parsedSample[0].followingStatus, "following");
assert.equal(relationshipState(parsedSample[0]), "following");

const reconciled = reconcileFollowingSnapshot([
  { username: "still_here", relationshipTypes: ["following"], status: "keep" },
  { username: "not_here", relationshipTypes: ["following", "followers"] },
  { username: "follower_only", relationshipTypes: ["followers"] }
], [
  { username: "still_here", relationshipTypes: ["following"], importSources: ["following.json"] },
  { username: "new_following", relationshipTypes: ["following"] }
], "2026-11-03T00:00:00.000Z");
const byUsername = new Map(reconciled.records.map(item => [item.username, item]));
assert.equal(byUsername.get("still_here").followingStatus, "following");
assert.equal(byUsername.get("not_here").followingStatus, "pending_verification");
assert.equal(relationshipState(byUsername.get("not_here")), "pending_verification");
assert.deepEqual(Array.from(byUsername.get("not_here").relationshipTypes), ["followers"]);
assert.equal(relationshipState(byUsername.get("follower_only")), "pending_verification");
assert.equal(byUsername.get("new_following").followingStatus, "following");
assert.equal(relationshipState({ followingStatus: "unfollowed" }), "unfollowed");
assert.equal(relationshipState({ followingStatus: "pending_verification", relationshipTypes: ["following"] }), "pending_verification");
assert.equal(reconciled.imported, 1);
assert.equal(reconciled.duplicates, 1);
assert.deepEqual(Array.from(parsedSample[0].relationshipTypes), ["following"]);

const relationships_following = Array.from({ length: 30000 }, (_, i) => ({
  title: "account" + i,
  string_list_data: [{ href: "https://www.instagram.com/_u/account" + i, timestamp: 1793623442 }]
}));
const parsedLarge = extractJsonAccounts({ relationships_following }, "following.json");
assert.equal(parsedLarge.length, 30000);
assert.equal(parsedLarge[0].username, "account0");
assert.equal(parsedLarge[29999].username, "account29999");
console.log("Instagram JSON import tests passed (official _u links + 30,000 accounts).");
