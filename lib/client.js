window.__ModuleLoader__.load({
	id: "dsh-qq-relay",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		"use strict";Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const r=require("react/jsx-runtime"),c=require("react");function ue({tone:e}){return r.jsx("span",{className:"qqr-dot","data-tone":e,"aria-hidden":"true"})}function w(e){return r.jsx("button",{type:"button",className:"qqr-btn","data-variant":e.variant??"ghost",onClick:e.onClick,disabled:e.disabled===!0,title:e.title,children:e.children})}function k({children:e}){return r.jsx("div",{className:"qqr-card",children:e})}function q(e){return r.jsxs("div",{className:"qqr-row",children:[r.jsxs("div",{className:"qqr-row-text",children:[r.jsx("span",{className:"qqr-label",children:e.label}),e.hint!==void 0?r.jsx("span",{className:"qqr-hint",children:e.hint}):null]}),r.jsx("div",{className:"qqr-control",children:e.children})]})}function S({children:e}){return r.jsx("div",{className:"qqr-block",children:e})}function A(e){return r.jsx("p",{className:"qqr-line","data-tone":e.tone??"muted",role:e.role,children:e.children})}function pe({line:e}){return r.jsxs("span",{className:"qqr-status",children:[r.jsx(ue,{tone:e.tone}),r.jsx("span",{children:e.text})]})}function he(e){return r.jsx("button",{type:"button",role:"switch","aria-checked":e.checked,"aria-label":e.ariaLabel,className:"qqr-toggle","data-on":e.checked?"true":"false",disabled:e.disabled===!0,onClick:()=>{e.onChange(!e.checked)},children:r.jsx("span",{className:"qqr-toggle-knob","aria-hidden":"true"})})}function y(e){return r.jsx("input",{className:"qqr-input",type:e.type??"text",value:e.value,placeholder:e.placeholder,inputMode:e.inputMode,autoComplete:e.autoComplete??"off",spellCheck:!1,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)}})}const O="dsh-qq-relay-client-style",ge=`/* dsh-qq-relay 配置页样式：全部走宿主 ui-theme 的 --dsw-* 语义 token，
		 * 不写字面色值、不定义主题分支；几何遵循 DSH 圆角规范（控件 R12 / 卡片 R20）。 */

		.qqr-root {
		  display: flex;
		  flex-direction: column;
		  gap: 12px;
		  min-width: 0;
		  max-width: 760px;
		  color: var(--dsw-alias-label-primary);
		  font-size: 13px;
		  line-height: 20px;
		}

		.qqr-head {
		  display: flex;
		  align-items: center;
		  gap: 12px;
		  flex-wrap: wrap;
		}

		.qqr-status {
		  display: inline-flex;
		  align-items: center;
		  gap: 8px;
		  min-width: 0;
		}

		.qqr-dot {
		  flex: none;
		  width: 8px;
		  height: 8px;
		  border-radius: 50%;
		  corner-shape: round;
		  background: var(--dsw-alias-state-idle-primary);
		}

		.qqr-dot[data-tone='ok'] { background: var(--dsw-alias-state-success-primary); }
		.qqr-dot[data-tone='warn'] { background: var(--dsw-alias-state-warn-primary); }
		.qqr-dot[data-tone='error'] { background: var(--dsw-alias-state-error-primary); }

		.qqr-actions {
		  display: flex;
		  align-items: center;
		  gap: 8px;
		  margin-left: auto;
		  flex-wrap: wrap;
		}

		.qqr-btn {
		  box-sizing: border-box;
		  display: inline-flex;
		  align-items: center;
		  justify-content: center;
		  gap: 4px;
		  height: 28px;
		  padding: 0 10px;
		  border: 0;
		  border-radius: var(--dsw-radius-sm);
		  background: transparent;
		  color: var(--dsw-alias-label-primary);
		  font: inherit;
		  font-size: 12px;
		  line-height: 18px;
		  cursor: pointer;
		  transition:
		    background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out),
		    color var(--ds-transition-duration-fast) var(--ds-ease-in-out);
		}

		.qqr-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
		.qqr-btn:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); }
		.qqr-btn:disabled { opacity: 0.4; cursor: not-allowed; }

		.qqr-btn[data-variant='primary'] {
		  background: var(--dsw-alias-button-primary-fill);
		  color: var(--dsw-alias-label-primary-foreground);
		}

		.qqr-btn[data-variant='primary']:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }

		.qqr-btn[data-variant='outline'] { border: 0.5px solid var(--dsw-alias-border-l3); }

		.qqr-btn:focus-visible {
		  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
		  outline-offset: 2px;
		}

		.qqr-tabs {
		  display: flex;
		  align-items: flex-end;
		  gap: 22px;
		  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
		  margin-top: 2px;
		}

		.qqr-tab {
		  position: relative;
		  border: 0;
		  padding: 7px 1px 9px;
		  background: transparent;
		  color: var(--dsw-alias-label-tertiary);
		  font: inherit;
		  font-size: 13px;
		  line-height: 20px;
		  cursor: pointer;
		}

		.qqr-tab:hover,
		.qqr-tab[data-active='true'] { color: var(--dsw-alias-label-primary); }

		.qqr-tab[data-active='true']::after {
		  position: absolute;
		  right: 0;
		  bottom: -1px;
		  left: 0;
		  height: 2px;
		  border-radius: 2px 2px 0 0;
		  background: var(--dsw-alias-label-primary);
		  content: '';
		}

		.qqr-tab:focus-visible {
		  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
		  outline-offset: 2px;
		  border-radius: 2px;
		  color: var(--dsw-alias-label-primary);
		}

		.qqr-panel {
		  display: flex;
		  flex-direction: column;
		  gap: 12px;
		  min-width: 0;
		}

		.qqr-card {
		  display: flex;
		  flex-direction: column;
		  min-width: 0;
		  border-radius: var(--dsw-radius-xl);
		  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
		  background: var(--dsw-alias-settings-card-fill);
		  overflow: hidden;
		}

		.qqr-row {
		  display: grid;
		  grid-template-columns: minmax(0, 1fr) minmax(0, 280px);
		  gap: 16px;
		  align-items: start;
		  padding: 10px 14px;
		}

		.qqr-row + .qqr-row { border-top: 0.5px solid var(--dsw-alias-border-l1); }

		.qqr-row-text {
		  display: flex;
		  flex-direction: column;
		  gap: 2px;
		  min-width: 0;
		}

		.qqr-label { color: var(--dsw-alias-label-primary); }

		.qqr-hint,
		.qqr-muted {
		  color: var(--dsw-alias-label-tertiary);
		  font-size: 12px;
		  line-height: 18px;
		}

		.qqr-control { min-width: 0; }

		.qqr-input {
		  box-sizing: border-box;
		  width: 100%;
		  height: 32px;
		  padding: 0 10px;
		  border: 0.5px solid var(--dsw-alias-border-l4);
		  border-radius: var(--dsw-radius-md);
		  background: var(--dsw-alias-bg-layer-1);
		  color: var(--dsw-alias-label-primary);
		  font: inherit;
		  font-size: 13px;
		  line-height: 20px;
		}

		.qqr-input::placeholder { color: var(--dsw-alias-label-dimmed); }

		.qqr-input:focus {
		  outline: none;
		  border-color: var(--dsw-alias-state-business-primary);
		}

		.qqr-toggle {
		  position: relative;
		  box-sizing: border-box;
		  width: 40px;
		  height: 24px;
		  padding: 0;
		  border: 0;
		  border-radius: 999px;
		  background: var(--dsw-alias-interactive-bg-active);
		  cursor: pointer;
		  transition: background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);
		}

		.qqr-toggle[data-on='true'] { background: var(--dsw-alias-state-success-primary); }
		.qqr-toggle:disabled { opacity: 0.4; cursor: not-allowed; }

		.qqr-toggle:focus-visible {
		  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
		  outline-offset: 2px;
		}

		.qqr-toggle-knob {
		  position: absolute;
		  top: 2px;
		  left: 2px;
		  width: 20px;
		  height: 20px;
		  border-radius: 50%;
		  background: var(--dsw-alias-label-primary-foreground);
		  box-shadow: 0 0.5px 1px var(--dsw-alias-border-l4);
		  transition: transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);
		}

		.qqr-toggle[data-on='true'] .qqr-toggle-knob { transform: translateX(16px); }

		.qqr-block {
		  display: flex;
		  flex-direction: column;
		  gap: 8px;
		  padding: 12px 14px;
		  min-width: 0;
		}

		.qqr-block + .qqr-block { border-top: 0.5px solid var(--dsw-alias-border-l1); }

		.qqr-headline {
		  display: flex;
		  align-items: center;
		  gap: 8px;
		  flex-wrap: wrap;
		}

		.qqr-subhead {
		  margin: 0;
		  font-size: 13px;
		  line-height: 20px;
		  font-weight: 500;
		  color: var(--dsw-alias-label-primary);
		}

		.qqr-row-actions {
		  display: flex;
		  gap: 6px;
		  flex-wrap: wrap;
		}

		.qqr-scroll {
		  min-width: 0;
		  overflow-x: auto;
		}

		.qqr-table {
		  width: 100%;
		  border-collapse: collapse;
		  font-size: 12px;
		  line-height: 18px;
		}

		.qqr-th {
		  padding: 6px 8px;
		  text-align: left;
		  font-weight: 500;
		  color: var(--dsw-alias-label-tertiary);
		  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
		  white-space: nowrap;
		}

		.qqr-td {
		  padding: 6px 8px;
		  border-top: 0.5px solid var(--dsw-alias-border-l1);
		  vertical-align: middle;
		}

		.qqr-table tbody tr:first-child .qqr-td { border-top: 0; }

		.qqr-mono {
		  font-family: var(--ds-font-family-code);
		  font-size: 11px;
		  line-height: 16px;
		  color: var(--dsw-alias-label-tertiary);
		  word-break: break-all;
		}

		.qqr-msg {
		  display: flex;
		  flex-direction: column;
		  gap: 2px;
		  padding: 8px 0;
		  border-top: 0.5px solid var(--dsw-alias-border-l1);
		}

		.qqr-msg:first-child { border-top: 0; }

		.qqr-msg-meta {
		  color: var(--dsw-alias-label-tertiary);
		  font-size: 12px;
		  line-height: 18px;
		}

		.qqr-msg-text {
		  white-space: pre-wrap;
		  word-break: break-word;
		}

		.qqr-line { margin: 0; }
		.qqr-line[data-tone='error'] { color: var(--dsw-alias-state-error-primary); }
		.qqr-line[data-tone='warn'] { color: var(--dsw-alias-state-warn-primary); }
		.qqr-line[data-tone='ok'] { color: var(--dsw-alias-state-success-primary); }

		.qqr-list {
		  margin: 0;
		  padding-left: 1.1rem;
		}

		.qqr-footer {
		  margin: 0;
		  color: var(--dsw-alias-label-tertiary);
		  font-size: 12px;
		  line-height: 18px;
		}

		.qqr-empty {
		  margin: 0;
		  color: var(--dsw-alias-label-tertiary);
		}

		.qqr-root code {
		  padding: 1px 4px;
		  border-radius: var(--dsw-radius-xs);
		  background: var(--dsw-alias-markdown-inline-code);
		  color: var(--dsw-alias-label-secondary);
		  font-family: var(--ds-font-family-code);
		  font-size: 11px;
		  line-height: 16px;
		}

		.qqr-inline-actions {
		  display: flex;
		  gap: 6px;
		  flex-wrap: wrap;
		  margin-left: auto;
		}

		.qqr-mono-block {
		  display: block;
		}

		.qqr-col-dir {
		  min-width: 200px;
		}

		@media (max-width: 680px) {
		  .qqr-row { grid-template-columns: minmax(0, 1fr); }
		}
		`;function fe(){c.useEffect(()=>{if(document.getElementById(O)!==null)return;const e=document.createElement("style");return e.id=O,e.textContent=ge,document.head.appendChild(e),()=>{e.remove()}},[])}const me="/dsh-qq-relay/api/status",be="/dsh-qq-relay/api/config",xe="/dsh-qq-relay/api/reconnect",qe="/dsh-qq-relay/api/rebind",ye="/dsh-qq-relay/api/cleanup",je="/dsh-qq-relay/api/messages",ve="/dsh-qq-relay/api/mapping/delete",we="/dsh-qq-relay/api/mapping/clear";function h(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function ke(e){return Array.isArray(e)?e.filter(h).map(s=>({groupId:typeof s.groupId=="number"?s.groupId:0,pending:typeof s.pending=="number"?s.pending:0,lastBotSpeakAt:typeof s.lastBotSpeakAt=="number"?s.lastBotSpeakAt:0,lastReplyAt:typeof s.lastReplyAt=="number"?s.lastReplyAt:0,lastUserMessageAt:typeof s.lastUserMessageAt=="number"?s.lastUserMessageAt:0,cooldownUntil:typeof s.cooldownUntil=="number"?s.cooldownUntil:0,evaluating:s.evaluating===!0,dshBusy:s.dshBusy===!0})):[]}function Se(e){return Array.isArray(e)?e.filter(h).map(s=>({messageId:typeof s.messageId=="string"?s.messageId:"",time:typeof s.time=="number"?s.time:0,name:typeof s.name=="string"?s.name:"",text:typeof s.text=="string"?s.text:"",mentionsSelf:s.mentionsSelf===!0,replyToId:typeof s.replyToId=="string"?s.replyToId:"",media:Array.isArray(s.media)?s.media.filter(h).map(t=>({kind:typeof t.kind=="string"?t.kind:"",status:typeof t.status=="string"?t.status:"",path:typeof t.path=="string"?t.path:""})):[]})):[]}function _(e){if(!h(e))return null;const s=h(e.config)?e.config:{},t=h(e.login)?e.login:null,n=h(e.lock)?e.lock:null,i=Array.isArray(e.mappings)?e.mappings.filter(h):[];return{plugin:typeof e.plugin=="string"?e.plugin:"dsh-qq-relay",started:e.started===!0,connected:e.connected===!0,login:t===null?null:{userId:typeof t.userId=="number"?t.userId:0,nickname:typeof t.nickname=="string"?t.nickname:""},problems:Array.isArray(e.problems)?e.problems.filter(a=>typeof a=="string"):[],lock:n===null?null:{pid:typeof n.pid=="number"?n.pid:0,startedAt:typeof n.startedAt=="number"?n.startedAt:0,host:typeof n.host=="string"?n.host:void 0},config:{wsUrl:typeof s.wsUrl=="string"?s.wsUrl:"",selfId:typeof s.selfId=="number"?s.selfId:0,groups:Array.isArray(s.groups)?s.groups.filter(a=>typeof a=="number"):[],workspace:typeof s.workspace=="string"?s.workspace:"",groupWorkspaces:h(s.groupWorkspaces)?Object.fromEntries(Object.entries(s.groupWorkspaces).filter(([a,o])=>/^\d+$/u.test(a)&&typeof o=="string"&&o!=="").map(([a,o])=>[a,o])):{},chatRetentionDays:typeof s.chatRetentionDays=="number"?s.chatRetentionDays:0,gate:h(s.gate)?{debounceMs:typeof s.gate.debounceMs=="number"?s.gate.debounceMs:5e3,fastMinReplyIntervalMs:typeof s.gate.fastMinReplyIntervalMs=="number"?s.gate.fastMinReplyIntervalMs:45e3,jevThreshold:typeof s.gate.jevThreshold=="number"?s.gate.jevThreshold:.7}:{debounceMs:5e3,fastMinReplyIntervalMs:45e3,jevThreshold:.7},gateSupported:h(s.gate),proxyReply:h(s.proxyReply)?{enabled:s.proxyReply.enabled===!0,targets:Array.isArray(s.proxyReply.targets)?s.proxyReply.targets.filter(a=>typeof a=="string"&&a!==""):[],silenceWindowMs:typeof s.proxyReply.silenceWindowMs=="number"?s.proxyReply.silenceWindowMs:600*1e3}:{enabled:!1,targets:[],silenceWindowMs:600*1e3},sessionTitle:typeof s.sessionTitle=="string"?s.sessionTitle:"",replyChunkSize:typeof s.replyChunkSize=="number"?s.replyChunkSize:0,commandPrefixes:Array.isArray(s.commandPrefixes)?s.commandPrefixes.filter(a=>typeof a=="string"):[],accessTokenConfigured:s.accessTokenConfigured===!0,accessTokenSource:s.accessTokenSource==="settings"?"settings":"profile"},gate:h(e.gate)?{enabled:e.gate.enabled===!0,classifier:typeof e.gate.classifier=="string"?e.gate.classifier:null,model:typeof e.gate.model=="string"?e.gate.model:"",threshold:typeof e.gate.threshold=="number"?e.gate.threshold:0,slowTimer:typeof e.gate.slowTimer=="number"?e.gate.slowTimer:0,pendingMessages:typeof e.gate.pendingMessages=="number"?e.gate.pendingMessages:0,pendingGroups:typeof e.gate.pendingGroups=="number"?e.gate.pendingGroups:0,timers:typeof e.gate.timers=="number"?e.gate.timers:0,queue:typeof e.gate.queue=="number"?e.gate.queue:0,sendQueue:typeof e.gate.sendQueue=="number"?e.gate.sendQueue:0,groups:ke(e.gate.groups)}:null,mappings:i.map(a=>({groupId:typeof a.groupId=="number"?a.groupId:0,sessionId:typeof a.sessionId=="string"?a.sessionId:"",title:typeof a.title=="string"?a.title:"",workspacePath:typeof a.workspacePath=="string"?a.workspacePath:"",createdAt:typeof a.createdAt=="number"?a.createdAt:0}))}}async function P(e,s,t){let n;try{n=await e(s,{cache:"no-store",...t})}catch(o){return{ok:!1,error:{code:"NETWORK",message:"连不上 host"+(o instanceof Error&&o.message!==""?"："+o.message:"")}}}let i=null;try{i=await n.json()}catch{i=null}if(h(i)&&i.ok===!0)return{ok:!0,value:i.value};const a=h(i)&&h(i.error)?i.error:null;return{ok:!1,error:{code:a!==null&&typeof a.code=="string"?a.code:"HTTP_"+String(n.status),message:a!==null&&typeof a.message=="string"&&a.message!==""?a.message:"请求失败（HTTP "+String(n.status)+"）。"}}}function D(){return{ok:!1,error:{code:"BAD_PAYLOAD",message:"host 返回了无法识别的数据。"}}}function Ne(e){const s=e.fetch;async function t(i,a){const o=await P(s,i,a);if(!o.ok)return o;const u=_(o.value);return u!==null?{ok:!0,value:u}:D()}const n=i=>({method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(i)});return{getStatus:()=>t(me),saveConfig:i=>t(be,n(i)),reconnect:()=>t(xe,{method:"POST"}),rebind:i=>t(qe,n({groupId:i})),async cleanup(i){const a=await P(s,ye,n({days:i}));if(!a.ok)return a;const o=a.value,u=h(o)?_(o.status):null,g=h(o)&&h(o.cleanup)?o.cleanup:null;return u===null||g===null?D():{ok:!0,value:{cleanup:{days:typeof g.days=="number"?g.days:i,chat:typeof g.chat=="number"?g.chat:0,media:typeof g.media=="number"?g.media:0,at:typeof g.at=="number"?g.at:0},status:u}}},async messages(i,a){const o=new URLSearchParams({groupId:String(i)});typeof a=="number"&&Number.isFinite(a)&&o.set("limit",String(a));const u=await P(s,je+"?"+o.toString());return u.ok?h(u.value)?{ok:!0,value:{groupId:typeof u.value.groupId=="number"?u.value.groupId:i,limit:typeof u.value.limit=="number"?u.value.limit:0,windowMs:typeof u.value.windowMs=="number"?u.value.windowMs:0,messages:Se(u.value.messages)}}:D():u},async deleteMapping(i){const a=await P(s,ve,n({groupId:i}));if(!a.ok)return a;const o=a.value,u=h(o)?_(o.status):null,g=h(o)&&h(o.mapping)?o.mapping:null;return u===null||g===null?D():{ok:!0,value:{mapping:{groupId:typeof g.groupId=="number"?g.groupId:i,removed:g.removed===!0},status:u}}},async clearMappings(){const i=await P(s,we,{method:"POST"});if(!i.ok)return i;const a=i.value,o=h(a)?_(a.status):null,u=h(a)&&h(a.mappings)?a.mappings:null;return o===null||u===null?D():{ok:!0,value:{mappings:{cleared:typeof u.cleared=="number"?u.cleared:0},status:o}}}}}function Te(){return{wsUrl:"",accessToken:"",selfId:"",groups:"",workspace:"",chatRetentionDays:"",gateDebounce:"",gateFastMinReplyInterval:"",gateJevThreshold:"",sessionTitle:"",replyChunkSize:"",commandPrefixes:"",proxyEnabled:!1,proxyTargets:"",proxySilenceWindow:""}}function $(e){return{wsUrl:e.wsUrl,accessToken:"",selfId:e.selfId>0?String(e.selfId):"",groups:e.groups.join(", "),workspace:e.workspace,chatRetentionDays:String(e.chatRetentionDays),gateDebounce:Q(e.gate.debounceMs),gateFastMinReplyInterval:Q(e.gate.fastMinReplyIntervalMs),gateJevThreshold:String(e.gate.jevThreshold),sessionTitle:e.sessionTitle,replyChunkSize:e.replyChunkSize>0?String(e.replyChunkSize):"",commandPrefixes:e.commandPrefixes.join(", "),proxyEnabled:e.proxyReply.enabled,proxyTargets:e.proxyReply.targets.join(", "),proxySilenceWindow:Q(e.proxyReply.silenceWindowMs)}}function Q(e){return!Number.isFinite(e)||e<=0?"0s":e%(3600*1e3)===0?String(e/(3600*1e3))+"h":e%(60*1e3)===0?String(e/(60*1e3))+"m":e%1e3===0?String(e/1e3)+"s":String(e)+"ms"}function Ie(e,s=Date.now()){if(!Number.isFinite(e)||e<=0)return"";const t=Math.max(0,s-e);return t<60*1e3?"刚刚":t<3600*1e3?Math.floor(t/(60*1e3))+" 分钟前":t<1440*60*1e3?Math.floor(t/(3600*1e3))+" 小时前":Math.floor(t/(1440*60*1e3))+" 天前"}function Y(e){if(!Number.isFinite(e)||e<=0)return"--:--:--";const s=new Date(e),t=n=>String(n).padStart(2,"0");return t(s.getHours())+":"+t(s.getMinutes())+":"+t(s.getSeconds())}function B(e){const s=/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/iu.exec(e.trim());if(s===null)return null;const n={ms:1,s:1e3,m:60*1e3,h:3600*1e3}[s[2].toLowerCase()];if(n===void 0)return null;const i=Number(s[1]);return!Number.isFinite(i)||i<0?null:Math.round(i*n)}function Me(e){return e.split(/[,，\s]+/u).map(s=>s.trim()).filter(s=>s!=="")}function Ce(e){const s=[],t=[];for(const n of Me(e)){if(!/^\d+$/u.test(n)){s.push("群号必须是数字："+n);continue}const i=Number(n);if(!Number.isSafeInteger(i)||i<=0){s.push("群号必须是正整数："+n);continue}t.includes(i)||t.push(i)}return s.length>0?{ok:!1,problems:s}:{ok:!0,value:t}}function Re(e){const s=[],t=new Set;for(const n of e.split(/[,，]/u)){const i=n.trim().replace(/^@/u,"").trim();if(i==="")continue;const a=i.toLowerCase();t.has(a)||(t.add(a),s.push(i))}return s}function Ae(e){return{ok:!0,value:e.split(/[,，]/u).map(t=>t.trim()).filter(t=>t!=="")}}function Pe(e){const s=[],t={},n=e.wsUrl.trim();n===""?s.push("wsUrl 必填"):t.wsUrl=n,e.accessToken.trim()!==""&&(t.accessToken=e.accessToken.trim());const i=e.selfId.trim();!/^\d+$/u.test(i)||Number(i)<=0?s.push("selfId 必须是正整数"):t.selfId=Number(i);const a=Ce(e.groups);a.ok?t.groups=a.value:s.push(...a.problems);const o=e.workspace.trim();o===""?s.push("workspace 必填"):t.workspace=o;const u=e.chatRetentionDays.trim(),g=u===""?"0":u,m=Number(g);!/^\d+$/u.test(g)||!Number.isInteger(m)||!(m===0||m>=7&&m<=3650)?s.push("聊天记录保留天数必须是 0（永不自动删除）或 7..3650 的整数"):t.chatRetentionDays=m;const L=e.sessionTitle.trim();L===""?s.push("sessionTitle 必填"):t.sessionTitle=L;const f=e.replyChunkSize.trim(),C=Number(f);!/^\d+$/u.test(f)||!Number.isInteger(C)||C<100||C>2e4?s.push("replyChunkSize 必须是 100..20000 的整数"):t.replyChunkSize=C;const x=Ae(e.commandPrefixes);t.commandPrefixes=x.value;const E=Re(e.proxyTargets);e.proxyEnabled&&E.length===0&&s.push("开启代答时至少要填一个目标（QQ 号或群名片 / 昵称）");const U=e.proxySilenceWindow.trim(),M=B(U);M===null||M>1440*60*1e3?s.push("代答沉默窗口必须是 0..24h 的时长（如 10m / 30m；0s = 总是代答）"):t.proxyReply={enabled:e.proxyEnabled,targets:E,silenceWindow:U};const v={},b=e.gateDebounce.trim(),N=B(b);N===null||N>60*1e3?s.push("去抖窗口必须是 0..60s 的时长（如 3s / 500ms）"):v.debounce=b;const z=e.gateFastMinReplyInterval.trim(),F=B(z);F===null||F>3600*1e3?s.push("最小发言间隔必须是 0..60m 的时长（如 10s / 45s）"):v.fastMinReplyInterval=z;const W=e.gateJevThreshold.trim(),R=Number(W);return W===""||!Number.isFinite(R)||R<0||R>1?s.push("jev 阈值必须是 0..1 的数字（如 0.7）"):v.jevThreshold=R,t.gate=v,s.length>0?{ok:!1,problems:s}:{ok:!0,value:t}}function De(e,s){const t=$(s);return Object.keys(t).some(n=>e[n]!==t[n])}function K(e){const s=new Map,t=n=>{let i=s.get(n);return i===void 0&&(i={groupId:n,sessionId:"",sessionTitle:"",projectDir:""},s.set(n,i)),i};for(const n of e.config.groups)t(n);for(const[n,i]of Object.entries(e.config.groupWorkspaces)){const a=Number(n);!Number.isSafeInteger(a)||a<=0||(t(a).projectDir=i)}for(const n of e.mappings){const i=t(n.groupId);i.sessionId=n.sessionId,i.sessionTitle=n.title}return[...s.values()].sort((n,i)=>n.groupId-i.groupId)}function Le(e){const s={};for(const t of e){const n=t.projectDir.trim();n!==""&&(s[String(t.groupId)]=n)}return s}function Ee(e,s){const t=new Map(K(s).map(n=>[n.groupId,n.projectDir]));return e.some(n=>(t.get(n.groupId)??"")!==n.projectDir.trim())}const T=Ne({fetch:(e,s)=>globalThis.fetch(e,s)}),Ue=[{id:"connection",label:"连接"},{id:"project",label:"项目"},{id:"behavior",label:"行为"},{id:"records",label:"记录"}];function I(e){return e.ok?"":e.error.message}function ze(e){if(e===null)return{tone:"muted",text:"加载中…"};if(!e.started)return e.lock!==null?{tone:"warn",text:"未启动：另一个实例（pid "+String(e.lock.pid)+"）正在运行"}:e.problems.length>0?{tone:"error",text:"未启动：配置待补全"}:{tone:"muted",text:"未启动（等待宿主就绪）"};if(e.connected){const s=e.login;return{tone:"ok",text:"已连接（"+(s!==null&&(s.nickname!==""||s.userId>0)?"QQ "+(s.nickname!==""?s.nickname:String(s.userId)):String(e.config.selfId))+"）"}}return{tone:"warn",text:"连接中…（断线自动重连）"}}function Fe(e){return e===null?"保存后生效":e.config.accessTokenConfigured?"已配置（来源："+(e.config.accessTokenSource==="settings"?"配置页保存值":"profile patch / 环境变量")+"）；留空表示不修改":"未配置；建议在 profile patch 里用 !!js 从环境变量读取"}function We(e){if(e===null)return{tone:"muted",text:"闸门状态读取中…"};if(!e.config.gateSupported)return{tone:"warn",text:"宿主还是旧版本（未加载支持闸门配置的版本）：下面参数暂时不会生效，重启该 profile 的 GUI 后再保存。"};const s=e.gate;return s===null?{tone:"muted",text:"闸门状态读取中…"}:s.enabled?s.classifier===null?{tone:"warn",text:"闸门已开启，但分类器未就绪：普通群消息不会接话（@ / 引用 / 命令仍直通）。"}:{tone:"ok",text:"闸门已开启 · 分类器 "+s.classifier+" · 阈值 "+String(s.threshold)+"；保存后立即重建闸门。"}:{tone:"muted",text:"闸门当前关闭（gate.enabled 来自 profile patch）：下面的参数会保存，开启后才生效。"}}const H={groupId:null,items:[],busy:!1,error:null,windowMs:0};function Ge(){const[e,s]=c.useState(null),[t,n]=c.useState(Te),[i,a]=c.useState([]),[o,u]=c.useState(!0),[g,m]=c.useState(!1),[L,f]=c.useState(null),[C,x]=c.useState(null),[E,U]=c.useState("connection"),[M,v]=c.useState(H),b=c.useCallback((l,p)=>{s(l),p&&(n($(l.config)),a(K(l)))},[]),N=c.useCallback(async(l,p=!0)=>{const d=await T.getStatus();u(!1),d.ok?(b(d.value,l),l&&p&&f(null)):p&&f(I(d))},[b]);c.useEffect(()=>{N(!0)},[N]),c.useEffect(()=>{const l=setInterval(()=>{N(!1,!1)},5e3);return()=>clearInterval(l)},[N]);const z=c.useCallback((l,p)=>{n(d=>({...d,[l]:p}))},[]),F=c.useCallback(l=>{n(p=>({...p,proxyEnabled:l}))},[]),W=c.useCallback((l,p)=>{a(d=>d.map(j=>j.groupId===l?{...j,projectDir:p}:j))},[]),R=c.useCallback(()=>{N(!0)},[N]),V=c.useCallback(async()=>{const l=Pe(t);if(!l.ok){x(null),f(l.problems.join("；"));return}const p=Le(i);m(!0),f(null),x(null);const d=await T.saveConfig({...l.value,groupWorkspaces:p});m(!1),d.ok?(b(d.value,!0),x("已保存并重建连接。")):f(I(d))},[t,i,b]),X=c.useCallback(async()=>{m(!0),f(null),x(null);const l=await T.reconnect();m(!1),l.ok?(b(l.value,!1),x("已请求重新连接。")):f(I(l))},[b]),Z=c.useCallback(async l=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("重新绑定群 "+String(l)+`？
		会删除该群现有会话映射，下次消息按当前项目目录新建会话；旧项目里的聊天记录不会移动。`))return;m(!0),f(null),x(null);const d=await T.rebind(l);m(!1),d.ok?(b(d.value,!0),x("已重新绑定：下一条消息会按新项目建会话。")):f(I(d))},[b]),G=c.useCallback(async l=>{v(d=>({...d,groupId:l,busy:!0,error:null}));const p=await T.messages(l,20);p.ok?v({groupId:l,items:p.value.messages,busy:!1,error:null,windowMs:p.value.windowMs}):v({groupId:l,items:[],busy:!1,error:I(p),windowMs:0})},[]),ee=c.useCallback(l=>{G(l)},[G]),se=c.useCallback(()=>{v(H)},[]),re=c.useCallback(()=>{M.groupId!==null&&G(M.groupId)},[G,M.groupId]),te=c.useCallback(async l=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("解除群 "+String(l)+` 的会话绑定？
		旧会话保留在 GUI；下一条群消息会按当前项目目录新建会话。`))return;m(!0),f(null),x(null);const d=await T.deleteMapping(l);m(!1),d.ok?(b(d.value.status,!0),x(d.value.mapping.removed?"已解除群 "+String(l)+" 的会话绑定。":"群 "+String(l)+" 本来没有绑定。"),v(j=>j.groupId===l?H:j)):f(I(d))},[b]),ne=c.useCallback(async()=>{const l=e===null?0:e.mappings.length;if(l===0)return;const p=globalThis.confirm;if(typeof p=="function"&&!p("清空全部 "+String(l)+` 条群映射？
		旧会话保留在 GUI；之后每个群的下一条消息都会重新建会话。`))return;m(!0),f(null),x(null);const d=await T.clearMappings();m(!1),d.ok?(b(d.value.status,!0),x("已清空 "+String(d.value.mappings.cleared)+" 条群映射。"),v(H)):f(I(d))},[b,e]),ae=c.useCallback(async()=>{const l=Number(t.chatRetentionDays.trim()===""?"0":t.chatRetentionDays.trim());if(!Number.isInteger(l)||l<1||l>3650){x(null),f("立即清理需要先在「保留天数」里填 1..3650 的整数（0 = 永不删除，不能清理）。");return}const p=globalThis.confirm;if(typeof p=="function"&&!p("立即清理超过 "+String(l)+` 天的聊天记录与媒体文件？
		删除后不可恢复；群映射与会话不受影响。`))return;m(!0),f(null),x(null);const d=await T.cleanup(l);if(m(!1),d.ok){const{cleanup:j,status:de}=d.value;b(de,!1),x("已清理：聊天记录 "+String(j.chat)+" 个文件、媒体 "+String(j.media)+" 个日期目录（保留 "+String(j.days)+" 天）。")}else f(I(d))},[t.chatRetentionDays,b]),ie=c.useMemo(()=>e!==null&&(De(t,e.config)||Ee(i,e)),[t,i,e]),le=c.useMemo(()=>ze(e),[e]),oe=c.useMemo(()=>We(e),[e]),ce=c.useMemo(()=>Fe(e),[e]);return{status:e,form:t,projectRows:i,loading:o,busy:g,error:L,notice:C,tab:E,dirty:ie,statusLine:le,tokenHint:ce,gateLine:oe,messages:M,setTab:U,updateField:z,setProxyEnabled:F,updateProjectRow:W,refresh:R,save:()=>{V()},reconnect:()=>{X()},rebind:l=>{Z(l)},deleteMapping:l=>{te(l)},clearMappings:()=>{ne()},cleanup:()=>{ae()},openMessages:ee,closeMessages:se,reloadMessages:re}}function _e({model:e}){var t;const s=((t=e.status)==null?void 0:t.gate)??null;return s===null||s.groups.length===0?null:r.jsx(k,{children:r.jsxs(S,{children:[r.jsx("h4",{className:"qqr-subhead",children:"闸门实时状态"}),r.jsxs("p",{className:"qqr-hint",children:["待评估 ",s.pendingMessages," 条 / ",s.pendingGroups," 群 · 活动定时器 ",s.timers," · ","待派发 ",s.queue," · 待发送 ",s.sendQueue]}),r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"群号"}),r.jsx("th",{className:"qqr-th",children:"待评估"}),r.jsx("th",{className:"qqr-th",children:"最近发言"}),r.jsx("th",{className:"qqr-th",children:"冷却"}),r.jsx("th",{className:"qqr-th",children:"状态"})]})}),r.jsx("tbody",{children:s.groups.map(n=>r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:n.groupId}),r.jsx("td",{className:"qqr-td",children:n.pending}),r.jsx("td",{className:"qqr-td",children:Ie(n.lastBotSpeakAt)||"未发言"}),r.jsx("td",{className:"qqr-td",children:n.cooldownUntil>Date.now()?"冷却至 "+Y(n.cooldownUntil):"—"}),r.jsx("td",{className:"qqr-td",children:n.dshBusy?"忙（有轮次在跑）":n.evaluating?"评估中":"空闲"})]},n.groupId))})]})})]})})}function He({model:e}){const{form:s,updateField:t}=e;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(k,{children:[r.jsx(q,{label:"回发文本切分上限",hint:"100..20000 字符；超长回复按此切分成多条",children:r.jsx(y,{value:s.replyChunkSize,onChange:n=>{t("replyChunkSize",n)},inputMode:"numeric",ariaLabel:"回发文本切分上限"})}),r.jsx(q,{label:"直通命令前缀",hint:"逗号分隔；群消息以此开头时绕过闸门直接进 DSH",children:r.jsx(y,{value:s.commandPrefixes,onChange:n=>{t("commandPrefixes",n)},placeholder:"/dsh",ariaLabel:"直通命令前缀"})})]}),r.jsxs(k,{children:[r.jsxs(S,{children:[r.jsx("h4",{className:"qqr-subhead",children:"消息闸门"}),r.jsx(A,{tone:e.gateLine.tone==="ok"?"ok":e.gateLine.tone==="warn"?"warn":"muted",children:e.gateLine.text})]}),r.jsx(q,{label:"普通消息去抖窗口",hint:"同一波消息合并等待，0..60s（如 3s / 500ms）",children:r.jsx(y,{value:s.gateDebounce,onChange:n=>{t("gateDebounce",n)},placeholder:"5s",ariaLabel:"普通消息去抖窗口"})}),r.jsx(q,{label:"最小发言间隔",hint:"距上次发言不足该间隔时延后评估，0..60m（如 10s / 45s）",children:r.jsx(y,{value:s.gateFastMinReplyInterval,onChange:n=>{t("gateFastMinReplyInterval",n)},placeholder:"45s",ariaLabel:"最小发言间隔"})}),r.jsx(q,{label:"jev 接话阈值",hint:"0..1；越高越保守（默认 0.7）",children:r.jsx(y,{value:s.gateJevThreshold,onChange:n=>{t("gateJevThreshold",n)},inputMode:"decimal",placeholder:"0.7",ariaLabel:"jev 接话阈值"})})]}),r.jsxs(k,{children:[r.jsxs(S,{children:[r.jsx("h4",{className:"qqr-subhead",children:"代答（@ 特定的人）"}),r.jsx("p",{className:"qqr-hint",children:"开启后，群里有人 @ 名单里的人、且 TA 最近没在本群说话时，机器人代 TA 回应（默认关闭）。 名单之外的 @ 别人消息只记聊天记录，不会触发会话。"})]}),r.jsx(q,{label:"开启代答",hint:"默认关闭；开启时下面至少填一个目标",children:r.jsx(he,{checked:s.proxyEnabled,onChange:e.setProxyEnabled,ariaLabel:"开启代答"})}),r.jsx(q,{label:"代答目标",hint:"QQ 号或群名片 / 昵称，逗号分隔（如 10003, 群主）",children:r.jsx(y,{value:s.proxyTargets,onChange:n=>{t("proxyTargets",n)},placeholder:"10003, 群主",ariaLabel:"代答目标"})}),r.jsx(q,{label:"沉默窗口",hint:"TA 多久没在本群发言才代答；0s = 总是代答（如 10m / 30m）",children:r.jsx(y,{value:s.proxySilenceWindow,onChange:n=>{t("proxySilenceWindow",n)},placeholder:"10m",ariaLabel:"代答沉默窗口"})})]}),r.jsx(_e,{model:e})]})}function Qe({model:e}){const{status:s}=e,t=(s==null?void 0:s.login)??null,n=t!==null&&(t.nickname!==""||t.userId>0)?(t.nickname!==""?t.nickname:"未取到昵称")+"（"+String(t.userId)+"）":"未登录",i=(s==null?void 0:s.lock)??null;return r.jsxs(k,{children:[r.jsxs(S,{children:[r.jsx("h4",{className:"qqr-subhead",children:"运行状态"}),r.jsxs("p",{className:"qqr-hint",children:["协议端：",r.jsx("span",{className:"qqr-mono",children:(s==null?void 0:s.config.wsUrl)??"—"})]}),r.jsxs("p",{className:"qqr-hint",children:["登录账号：",n]}),r.jsxs("p",{className:"qqr-hint",children:["单实例锁：",i===null?"本进程持有":"另一个进程持有（pid "+String(i.pid)+"）"," · ","群映射：",s===null?0:s.mappings.length," 个"]})]}),s!==null&&s.problems.length>0?r.jsx(S,{children:r.jsx("ul",{className:"qqr-list",children:s.problems.map(a=>r.jsx("li",{children:r.jsx(A,{tone:"error",children:a})},a))})}):null]})}function Be({model:e}){var n;const{form:s,updateField:t}=e;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(k,{children:[r.jsx(q,{label:"协议端 WebSocket",hint:"NapCat 正向 WS，例如 ws://127.0.0.1:3001",children:r.jsx(y,{value:s.wsUrl,onChange:i=>{t("wsUrl",i)},placeholder:"ws://127.0.0.1:3001",ariaLabel:"协议端 WebSocket 地址"})}),r.jsx(q,{label:"Access Token",hint:e.tokenHint,children:r.jsx(y,{type:"password",value:s.accessToken,onChange:i=>{t("accessToken",i)},placeholder:((n=e.status)==null?void 0:n.config.accessTokenConfigured)===!0?"留空保持不变":"写入新的 token",ariaLabel:"Access Token"})}),r.jsx(q,{label:"机器人 QQ 号",hint:"连接后用 get_login_info 校验，不匹配会断开",children:r.jsx(y,{value:s.selfId,onChange:i=>{t("selfId",i)},inputMode:"numeric",ariaLabel:"机器人 QQ 号"})}),r.jsx(q,{label:"群白名单",hint:"逗号分隔的群号；未列出的群只记日志不回话",children:r.jsx(y,{value:s.groups,onChange:i=>{t("groups",i)},placeholder:"10002",ariaLabel:"群白名单"})})]}),r.jsx(Qe,{model:e})]})}function J(e){const s={image:"图片",sticker:"表情",face:"表情",video:"视频",voice:"语音",file:"文件"};return e.map(t=>t.status==="failed"?t.kind==="file"?"[群文件下载失败]":"[媒体下载失败]":"["+(s[t.kind]??"媒体")+"]")}function Oe({model:e}){const{messages:s}=e;if(s.groupId===null)return null;const t=Math.max(1,Math.round(s.windowMs/36e5));return r.jsx(k,{children:r.jsxs(S,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsxs("h4",{className:"qqr-subhead",children:["最近消息 · 群 ",s.groupId]}),r.jsxs("span",{className:"qqr-muted",children:["最近 ",t," 小时 · 最多 20 条"]}),r.jsxs("span",{className:"qqr-inline-actions",children:[r.jsx(w,{onClick:e.reloadMessages,disabled:s.busy,children:"刷新"}),r.jsx(w,{onClick:e.closeMessages,disabled:s.busy,children:"关闭"})]})]}),s.busy?r.jsx("p",{className:"qqr-muted",children:"读取中…"}):s.error!==null?r.jsx(A,{tone:"error",role:"alert",children:s.error}):s.items.length===0?r.jsx("p",{className:"qqr-muted",children:"最近 24 小时没有消息。"}):r.jsx("div",{children:s.items.map(n=>r.jsxs("div",{className:"qqr-msg",children:[r.jsxs("span",{className:"qqr-msg-meta",children:[Y(n.time)," · ",n.name,n.mentionsSelf?"（@你）":"",n.replyToId!==""?"（引用 "+n.replyToId+"）":"",J(n.media).length>0?" "+J(n.media).join(" "):""]}),n.text!==""?r.jsx("span",{className:"qqr-msg-text",children:n.text}):null]},(n.messageId||String(n.time))+":"+String(n.time)))})]})})}function Je({model:e}){const{status:s,projectRows:t,busy:n,loading:i}=e;return r.jsxs(k,{children:[r.jsxs(S,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsx("h4",{className:"qqr-subhead",children:"群项目目录"}),r.jsx("span",{className:"qqr-inline-actions",children:s!==null&&s.mappings.length>0?r.jsxs(w,{onClick:e.clearMappings,disabled:n||i,variant:"outline",children:["清空全部映射（",s.mappings.length,"）"]}):null})]}),r.jsxs("p",{className:"qqr-hint",children:["每个群的聊天记录写进该项目的 ",r.jsx("code",{children:".qq-relay/chat/<群号>/"}),"，DSH 会话也以它为工作目录； 留空表示跟随上面的默认项目。改目录只影响之后新建的会话——已建会话请点「重新绑定」 （旧项目里的聊天记录不会移动）。"]})]}),s===null||t.length===0?r.jsx(S,{children:r.jsx("p",{className:"qqr-empty",children:"还没有群：把群号填进「群白名单」，或在群里 @ 机器人后会自动出现。"})}):r.jsx(S,{children:r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"群号"}),r.jsx("th",{className:"qqr-th",children:"会话"}),r.jsx("th",{className:"qqr-th",children:"项目目录"}),r.jsx("th",{className:"qqr-th",children:"操作"})]})}),r.jsx("tbody",{children:t.map(a=>r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:a.groupId}),r.jsx("td",{className:"qqr-td",children:a.sessionId===""?r.jsx("span",{className:"qqr-muted",children:"未创建"}):r.jsxs(r.Fragment,{children:[r.jsx("span",{children:a.sessionTitle!==""?a.sessionTitle:"—"}),r.jsx("span",{className:"qqr-mono qqr-mono-block",children:a.sessionId})]})}),r.jsx("td",{className:"qqr-td qqr-col-dir",children:r.jsx(y,{value:a.projectDir,onChange:o=>{e.updateProjectRow(a.groupId,o)},placeholder:s.config.workspace,ariaLabel:"群 "+String(a.groupId)+" 的项目目录"})}),r.jsx("td",{className:"qqr-td",children:r.jsxs("div",{className:"qqr-row-actions",children:[r.jsx(w,{variant:"outline",onClick:()=>{e.rebind(a.groupId)},disabled:n||a.sessionId==="",children:"重新绑定"}),r.jsx(w,{onClick:()=>{e.openMessages(a.groupId)},disabled:n||i,children:"消息"}),r.jsx(w,{onClick:()=>{e.deleteMapping(a.groupId)},disabled:n||a.sessionId==="",children:"解除绑定"})]})})]},a.groupId))})]})})})]})}function $e({model:e}){const{form:s,updateField:t}=e;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(k,{children:[r.jsx(q,{label:"默认项目目录",hint:"未单独配置群项目时，聊天记录与 DSH 会话使用的目录",children:r.jsx(y,{value:s.workspace,onChange:n=>{t("workspace",n)},placeholder:"~/dsh/qq-relay-ws",ariaLabel:"默认项目目录"})}),r.jsx(q,{label:"会话标题模板",hint:"可用 {groupName} / {groupId}",children:r.jsx(y,{value:s.sessionTitle,onChange:n=>{t("sessionTitle",n)},placeholder:"QQ群：{groupName}",ariaLabel:"会话标题模板"})})]}),r.jsx(Je,{model:e}),r.jsx(Oe,{model:e})]})}function Ye({model:e}){const{form:s,updateField:t}=e;return r.jsx("div",{className:"qqr-panel",children:r.jsxs(k,{children:[r.jsx(q,{label:"聊天记录保留天数",hint:"0 = 永不自动删除；7..3650 = 自动清理天数（保存后生效）",children:r.jsx(y,{value:s.chatRetentionDays,onChange:n=>{t("chatRetentionDays",n)},inputMode:"numeric",placeholder:"0",ariaLabel:"聊天记录保留天数"})}),r.jsxs(S,{children:[r.jsxs("p",{className:"qqr-hint",children:["聊天记录与媒体文件默认",r.jsx("b",{children:"永不自动删除"}),"（保留天数 0）。填 7..3650 保存后， 宿主启动时与每天各清理一次超过该天数的 ",r.jsx("code",{children:".qq-relay/chat/"})," 日文件与",r.jsx("code",{children:" .qq-relay/media/"})," 日期目录。"]}),r.jsxs("div",{className:"qqr-headline",children:[r.jsx(w,{variant:"outline",onClick:e.cleanup,disabled:e.busy||e.loading,children:"立即清理"}),r.jsx("span",{className:"qqr-hint",children:"用上面的天数（1..3650）清一次，不改配置、不动群映射；删除后不可恢复。"})]})]})]})})}function Ke(){const e=Ge();fe();const s=e.tab==="connection"?r.jsx(Be,{model:e}):e.tab==="project"?r.jsx($e,{model:e}):e.tab==="behavior"?r.jsx(He,{model:e}):r.jsx(Ye,{model:e});return r.jsxs("div",{className:"qqr-root","data-plugin":"dsh-qq-relay",children:[r.jsxs("div",{className:"qqr-head",children:[r.jsx(pe,{line:e.statusLine}),r.jsxs("div",{className:"qqr-actions",children:[r.jsx(w,{onClick:e.refresh,disabled:e.loading||e.busy,children:"刷新"}),r.jsx(w,{variant:"outline",onClick:e.reconnect,disabled:e.loading||e.busy,children:"重新连接"}),r.jsx(w,{variant:"primary",onClick:e.save,disabled:e.loading||e.busy,children:"保存并重连"})]})]}),r.jsx("nav",{className:"qqr-tabs",role:"tablist","aria-label":"QQ 机器人配置",children:Ue.map(t=>r.jsx("button",{type:"button",role:"tab",id:"qqr-tab-"+t.id,className:"qqr-tab","data-active":e.tab===t.id,"aria-selected":e.tab===t.id,"aria-controls":"qqr-tabpanel",onClick:()=>{e.setTab(t.id)},children:t.label},t.id))}),e.error!==null?r.jsx(A,{tone:"error",role:"alert",children:e.error}):null,e.notice!==null?r.jsx(A,{tone:"ok",role:"status",children:e.notice}):null,e.dirty?r.jsx(A,{tone:"warn",children:"有未保存的修改。"}):null,r.jsx("div",{id:"qqr-tabpanel",role:"tabpanel","aria-labelledby":"qqr-tab-"+e.tab,children:s}),r.jsxs("p",{className:"qqr-footer",children:["配置来源：profile 的 ",r.jsx("code",{children:"cordis.patch.yml"}),"，本页保存的覆盖写入",r.jsx("code",{children:" ~/.dsh/storages/dsh-qq-relay/settings.json"}),"。token 只写不读，页面永远看不到明文。"]})]})}const Ve="dsh-qq-relay",Xe=["slots"],Ze="dsh-qq-relay";function es(e){var n;const s=e,t=(n=s==null?void 0:s.get)==null?void 0:n.call(s,"slots");if(!(t===void 0||typeof t.inject!="function"||typeof t.register!="function"))try{t.inject("plugins.bundle.config",()=>t.register({name:"plugins.bundle.config",key:Ze},Ke))}catch{}}exports.apply=es;exports.inject=Xe;exports.name=Ve;

		return module.exports;
	}
});
