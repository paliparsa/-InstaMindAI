/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
(async()=>{const d=await browser.storage.local.get(["provider","apiKey","model"]);$("provider").value=d.provider||"gemini";$("model").value=d.model||"gemini-2.0-flash";$("key").value=d.apiKey||"";function $(id){return document.getElementById(id)}$("save").onclick=async()=>{await browser.storage.local.set({provider:"gemini",apiKey:$("key").value.trim(),model:$("model").value.trim()||"gemini-2.0-flash"});$("status").textContent="Settings saved locally."}})();
