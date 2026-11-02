/* global browser, chrome */
globalThis.browser = globalThis.browser || globalThis.chrome;
(() => {
  const base="https://www.instagram.com/";
  function username(href){
    try{
      const u=new URL(href,location.origin), p=u.pathname.split("/").filter(Boolean);
      if(u.origin!==location.origin||p.length!==1)return null;
      const s=p[0], reserved=["accounts","about","explore","direct","reels","stories","p","developer","legal","web"];
      return reserved.includes(s.toLowerCase())||! /^[a-zA-Z0-9._]{1,30}$/.test(s)?null:s;
    }catch(_){return null}
  }
  function collect(){
    const map=new Map();
    document.querySelectorAll("a[href]").forEach(a=>{
      const name=username(a.getAttribute("href")); if(!name)return;
      const r=a.getBoundingClientRect(); if(!r.width||!r.height)return;
      const card=a.closest("div")||a, img=a.querySelector("img")||card.querySelector("img");
      const text=(card.innerText||a.innerText||"").trim().replace(/\s+/g," ").slice(0,240);
      if(!map.has(name))map.set(name,{username:name,profileUrl:base+encodeURIComponent(name)+"/",displayText:text,avatarAlt:img?.alt||"",avatarUrl:img?.currentSrc||img?.src||"",collectedAt:new Date().toISOString()});
    });
    return [...map.values()];
  }
  function profile(){
    const parts=location.pathname.split("/").filter(Boolean), name=parts.length===1?username(location.pathname):null;
    if(!name)return null;
    const main=document.querySelector("main")||document.body, meta=document.querySelector('meta[property="og:description"]');
    const visibleText=(main.innerText||"").trim().slice(0,12000);
    const imgs=[...main.querySelectorAll("img")].filter(i=>{const r=i.getBoundingClientRect();return r.width>30&&r.height>30}).slice(0,24).map(i=>({alt:(i.alt||"").slice(0,240),caption:(i.getAttribute("aria-label")||"").slice(0,160)}));
    const followBackMatch=visibleText.match(/\bFollows you\b|Seni takip ediyor|شما را دنبال می‌کند|دنبال‌کننده شماست/i);
    return {username:name,profileUrl:base+encodeURIComponent(name)+"/",pageTitle:document.title,metaDescription:meta?.content||"",visibleText,visibleImageDescriptions:imgs,followsYouEvidence:followBackMatch?.[0]||null,collectedAt:new Date().toISOString()};
  }
  browser.runtime.onMessage.addListener(msg=>{
    if(msg?.type==="COLLECT_FOLLOWING")return Promise.resolve({ok:true,accounts:collect(),url:location.href});
    if(msg?.type==="READ_PROFILE")return Promise.resolve({ok:true,profile:profile(),url:location.href});
    return undefined;
  });
})();
