window.__ModuleLoader__.load({
	id: "dsh-qq-relay",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		"use strict";Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const r=require("react/jsx-runtime"),m=require("react");function _e({tone:e}){return r.jsx("span",{className:"qqr-dot","data-tone":e,"aria-hidden":"true"})}function w(e){return r.jsx("button",{type:"button",className:"qqr-btn","data-variant":e.variant??"ghost",onClick:e.onClick,disabled:e.disabled===!0,title:e.title,children:e.children})}function S({children:e}){return r.jsx("div",{className:"qqr-card",children:e})}function b(e){return r.jsxs("div",{className:"qqr-row",children:[r.jsxs("div",{className:"qqr-row-text",children:[r.jsx("span",{className:"qqr-label",children:e.label}),e.hint!==void 0?r.jsx("span",{className:"qqr-hint",children:e.hint}):null]}),r.jsx("div",{className:"qqr-control",children:e.children})]})}function v({children:e}){return r.jsx("div",{className:"qqr-block",children:e})}function C(e){return r.jsx("p",{className:"qqr-line","data-tone":e.tone??"muted",role:e.role,children:e.children})}function ce({line:e}){return r.jsxs("span",{className:"qqr-status",children:[r.jsx(_e,{tone:e.tone}),r.jsx("span",{children:e.text})]})}function se(e){return r.jsx("button",{type:"button",role:"switch","aria-checked":e.checked,"aria-label":e.ariaLabel,className:"qqr-toggle","data-on":e.checked?"true":"false",disabled:e.disabled===!0,onClick:()=>{e.onChange(!e.checked)},children:r.jsx("span",{className:"qqr-toggle-knob","aria-hidden":"true"})})}function de(e){return r.jsx("textarea",{className:"qqr-textarea",value:e.value,placeholder:e.placeholder,rows:e.rows??4,spellCheck:!1,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)}})}function $(e){return r.jsx("select",{className:"qqr-select",value:e.value,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)},children:e.options.map(s=>r.jsx("option",{value:s.value,disabled:s.disabled===!0,title:s.title,children:s.label},s.value))})}function j(e){return r.jsx("input",{className:"qqr-input",type:e.type??"text",value:e.value,placeholder:e.placeholder,inputMode:e.inputMode,autoComplete:e.autoComplete??"off",spellCheck:!1,"aria-label":e.ariaLabel,disabled:e.disabled===!0,onChange:s=>{e.onChange(s.target.value)}})}const ie="dsh-qq-relay-client-style",Be=`/* dsh-qq-relay 配置页样式：全部走宿主 ui-theme 的 --dsw-* 语义 token，
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

		.qqr-select {
		  box-sizing: border-box;
		  width: 100%;
		  height: 32px;
		  padding: 0 8px;
		  border: 0.5px solid var(--dsw-alias-border-l4);
		  border-radius: var(--dsw-radius-md);
		  background: var(--dsw-alias-bg-layer-1);
		  color: var(--dsw-alias-label-primary);
		  font: inherit;
		  font-size: 13px;
		  line-height: 20px;
		}

		.qqr-select:focus {
		  outline: none;
		  border-color: var(--dsw-alias-state-business-primary);
		}

		.qqr-textarea {
		  box-sizing: border-box;
		  width: 100%;
		  min-height: 88px;
		  padding: 8px 10px;
		  border: 0.5px solid var(--dsw-alias-border-l4);
		  border-radius: var(--dsw-radius-md);
		  background: var(--dsw-alias-bg-layer-1);
		  color: var(--dsw-alias-label-primary);
		  font: inherit;
		  font-size: 13px;
		  line-height: 20px;
		  resize: vertical;
		}

		.qqr-textarea::placeholder { color: var(--dsw-alias-label-dimmed); }

		.qqr-textarea:focus {
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
		`;function Ge(){m.useEffect(()=>{if(document.getElementById(ie)!==null)return;const e=document.createElement("style");return e.id=ie,e.textContent=Be,document.head.appendChild(e),()=>{e.remove()}},[])}const Qe="/dsh-qq-relay/api/status",We="/dsh-qq-relay/api/config",Oe="/dsh-qq-relay/api/reconnect",$e="/dsh-qq-relay/api/rebind",Ye="/dsh-qq-relay/api/cleanup",Je="/dsh-qq-relay/api/messages",Ve="/dsh-qq-relay/api/mapping/delete",Ke="/dsh-qq-relay/api/mapping/clear",Xe="/dsh-qq-relay/api/presets",Ze="/dsh-qq-relay/api/presets/delete",es="/dsh-qq-relay/api/comfy/test";function h(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function ss(e){return Array.isArray(e)?e.filter(h).map(s=>({groupId:typeof s.groupId=="number"?s.groupId:0,pending:typeof s.pending=="number"?s.pending:0,lastBotSpeakAt:typeof s.lastBotSpeakAt=="number"?s.lastBotSpeakAt:0,lastReplyAt:typeof s.lastReplyAt=="number"?s.lastReplyAt:0,lastUserMessageAt:typeof s.lastUserMessageAt=="number"?s.lastUserMessageAt:0,cooldownUntil:typeof s.cooldownUntil=="number"?s.cooldownUntil:0,evaluating:s.evaluating===!0,dshBusy:s.dshBusy===!0})):[]}function rs(e){return Array.isArray(e)?e.filter(h).map(s=>({messageId:typeof s.messageId=="string"?s.messageId:"",time:typeof s.time=="number"?s.time:0,name:typeof s.name=="string"?s.name:"",text:typeof s.text=="string"?s.text:"",mentionsSelf:s.mentionsSelf===!0,replyToId:typeof s.replyToId=="string"?s.replyToId:"",media:Array.isArray(s.media)?s.media.filter(h).map(n=>({kind:typeof n.kind=="string"?n.kind:"",status:typeof n.status=="string"?n.status:"",path:typeof n.path=="string"?n.path:""})):[]})):[]}function ns(e){return Array.isArray(e)?e.filter(h).map(s=>({groupId:typeof s.groupId=="number"?s.groupId:0,sessionId:typeof s.sessionId=="string"?s.sessionId:"",error:typeof s.error=="string"?s.error:"",at:typeof s.at=="number"?s.at:0})).filter(s=>s.sessionId!==""):[]}function te(e){return Array.isArray(e)?e.filter(h).map(s=>{const n=h(s.model)?s.model:{};return{id:typeof s.id=="string"?s.id:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:"",persona:typeof s.persona=="string"?s.persona:"",model:{provider:typeof n.provider=="string"?n.provider:"",model:typeof n.model=="string"?n.model:"",reasoningEffort:typeof n.reasoningEffort=="string"?n.reasoningEffort:""},permissionPreset:typeof s.permissionPreset=="string"?s.permissionPreset:"",order:typeof s.order=="number"?s.order:100}}).filter(s=>s.id!==""):[]}function ts(e){if(!h(e)||!Array.isArray(e.groups))return null;const s=e.groups.filter(h).map(t=>({id:typeof t.id=="string"?t.id:"",name:typeof t.name=="string"?t.name:"",models:Array.isArray(t.models)?t.models.filter(h).map(l=>{const a=h(l.reasoning)?l.reasoning:null;return{id:typeof l.id=="string"?l.id:"",name:typeof l.name=="string"?l.name:"",description:typeof l.description=="string"?l.description:"",efforts:a!==null&&Array.isArray(a.efforts)?a.efforts.filter(h).map(i=>({id:typeof i.id=="string"?i.id:"",name:typeof i.name=="string"?i.name:"",description:typeof i.description=="string"?i.description:""})):[],defaultEffort:a!==null&&typeof a.defaultEffort=="string"?a.defaultEffort:""}}):[]})),n=h(e.default)?e.default:{};return{groups:s,default:{provider:typeof n.provider=="string"?n.provider:"",model:typeof n.model=="string"?n.model:"",reasoningEffort:typeof n.reasoningEffort=="string"?n.reasoningEffort:""}}}function as(e){return!h(e)||!Array.isArray(e.options)?null:{options:e.options.filter(h).map(s=>({value:typeof s.value=="string"?s.value:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:""})).filter(s=>s.value!==""),defaultPreset:typeof e.defaultPreset=="string"?e.defaultPreset:""}}function ls(e){return Array.isArray(e)?e.filter(h).map(s=>({id:typeof s.id=="string"?s.id:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:"",broken:typeof s.broken=="string"?s.broken:""})).filter(s=>s.id!==""):[]}function ae(e){return h(e)?{running:typeof e.running=="number"?e.running:0,pending:typeof e.pending=="number"?e.pending:0}:{running:0,pending:0}}function is(e){return h(e)?{enabled:e.enabled===!0,baseUrl:typeof e.baseUrl=="string"&&e.baseUrl!==""?e.baseUrl:"http://192.168.1.10:8188",timeoutMs:typeof e.timeoutMs=="number"?e.timeoutMs:3e4,skillEnabled:e.skillEnabled!==!1}:{enabled:!1,baseUrl:"http://192.168.1.10:8188",timeoutMs:3e4,skillEnabled:!0}}function os(e){if(!h(e))return{enabled:!1,baseUrl:"",timeoutMs:3e4,skillEnabled:!1,supported:!1,reachable:!1,checking:!1,checkedAt:0,error:"",version:"",device:"",queue:{running:0,pending:0},skill:{name:"",loaded:!1,error:""}};const s=h(e.skill)?e.skill:{};return{enabled:e.enabled===!0,baseUrl:typeof e.baseUrl=="string"?e.baseUrl:"",timeoutMs:typeof e.timeoutMs=="number"?e.timeoutMs:3e4,skillEnabled:e.skillEnabled!==!1,supported:e.supported===!0,reachable:e.reachable===!0,checking:e.checking===!0,checkedAt:typeof e.checkedAt=="number"?e.checkedAt:0,error:typeof e.error=="string"?e.error:"",version:typeof e.version=="string"?e.version:"",device:typeof e.device=="string"?e.device:"",queue:ae(e.queue),skill:{name:typeof s.name=="string"?s.name:"",loaded:s.loaded===!0,error:typeof s.error=="string"?s.error:""}}}function cs(e,s){return h(e)?{target:typeof e.target=="string"?e.target:s.baseUrl,reachable:e.reachable===!0,version:typeof e.version=="string"?e.version:"",device:typeof e.device=="string"?e.device:"",queue:ae(e.queue),error:typeof e.error=="string"?e.error:"",checkedAt:typeof e.checkedAt=="number"?e.checkedAt:0,latencyMs:typeof e.latencyMs=="number"?e.latencyMs:0}:{target:s.baseUrl,reachable:s.reachable,version:s.version,device:s.device,queue:ae(s.queue),error:s.error,checkedAt:s.checkedAt,latencyMs:0}}function G(e){if(!h(e))return null;const s=h(e.config)?e.config:{},n=h(e.login)?e.login:null,t=h(e.lock)?e.lock:null,l=Array.isArray(e.mappings)?e.mappings.filter(h):[];return{plugin:typeof e.plugin=="string"?e.plugin:"dsh-qq-relay",started:e.started===!0,connected:e.connected===!0,login:n===null?null:{userId:typeof n.userId=="number"?n.userId:0,nickname:typeof n.nickname=="string"?n.nickname:""},problems:Array.isArray(e.problems)?e.problems.filter(a=>typeof a=="string"):[],lock:t===null?null:{pid:typeof t.pid=="number"?t.pid:0,startedAt:typeof t.startedAt=="number"?t.startedAt:0,host:typeof t.host=="string"?t.host:void 0},config:{wsUrl:typeof s.wsUrl=="string"?s.wsUrl:"",selfId:typeof s.selfId=="number"?s.selfId:0,groups:Array.isArray(s.groups)?s.groups.filter(a=>typeof a=="number"):[],workspace:typeof s.workspace=="string"?s.workspace:"",groupWorkspaces:h(s.groupWorkspaces)?Object.fromEntries(Object.entries(s.groupWorkspaces).filter(([a,i])=>/^\d+$/u.test(a)&&typeof i=="string"&&i!=="").map(([a,i])=>[a,i])):{},chatRetentionDays:typeof s.chatRetentionDays=="number"?s.chatRetentionDays:0,gate:h(s.gate)?{debounceMs:typeof s.gate.debounceMs=="number"?s.gate.debounceMs:5e3,fastMinReplyIntervalMs:typeof s.gate.fastMinReplyIntervalMs=="number"?s.gate.fastMinReplyIntervalMs:45e3,jevThreshold:typeof s.gate.jevThreshold=="number"?s.gate.jevThreshold:.7}:{debounceMs:5e3,fastMinReplyIntervalMs:45e3,jevThreshold:.7},gateSupported:h(s.gate),proxyReply:h(s.proxyReply)?{enabled:s.proxyReply.enabled===!0,targets:Array.isArray(s.proxyReply.targets)?s.proxyReply.targets.filter(a=>typeof a=="string"&&a!==""):[],silenceWindowMs:typeof s.proxyReply.silenceWindowMs=="number"?s.proxyReply.silenceWindowMs:600*1e3}:{enabled:!1,targets:[],silenceWindowMs:600*1e3},agentPreset:typeof s.agentPreset=="string"?s.agentPreset:"",persona:h(s.persona)?{enabled:s.persona.enabled===!0,text:typeof s.persona.text=="string"?s.persona.text:""}:{enabled:!1,text:""},comfy:is(s.comfy),comfySupported:s.comfySupported===!0,sessionTitle:typeof s.sessionTitle=="string"?s.sessionTitle:"",replyChunkSize:typeof s.replyChunkSize=="number"?s.replyChunkSize:0,commandPrefixes:Array.isArray(s.commandPrefixes)?s.commandPrefixes.filter(a=>typeof a=="string"):[],accessTokenConfigured:s.accessTokenConfigured===!0,accessTokenSource:s.accessTokenSource==="settings"?"settings":"profile"},agentPresets:h(e.agentPresets)?{supported:e.agentPresets.supported===!0,items:ls(e.agentPresets.items),missing:e.agentPresets.missing===!0}:{supported:!1,items:[],missing:!1},presets:te(e.presets),presetService:h(e.presetService)?{supported:e.presetService.supported===!0,registered:Array.isArray(e.presetService.registered)?e.presetService.registered.filter(a=>typeof a=="string"):[]}:{supported:!1,registered:[]},modelCatalog:ts(e.modelCatalog),permissionCatalog:as(e.permissionCatalog),comfy:os(e.comfy),gate:h(e.gate)?{enabled:e.gate.enabled===!0,classifier:typeof e.gate.classifier=="string"?e.gate.classifier:null,model:typeof e.gate.model=="string"?e.gate.model:"",threshold:typeof e.gate.threshold=="number"?e.gate.threshold:0,slowTimer:typeof e.gate.slowTimer=="number"?e.gate.slowTimer:0,pendingMessages:typeof e.gate.pendingMessages=="number"?e.gate.pendingMessages:0,pendingGroups:typeof e.gate.pendingGroups=="number"?e.gate.pendingGroups:0,timers:typeof e.gate.timers=="number"?e.gate.timers:0,queue:typeof e.gate.queue=="number"?e.gate.queue:0,sendQueue:typeof e.gate.sendQueue=="number"?e.gate.sendQueue:0,groups:ss(e.gate.groups)}:null,workspace:{attachIssues:h(e.workspace)?ns(e.workspace.attachIssues):[]},mappings:l.map(a=>({groupId:typeof a.groupId=="number"?a.groupId:0,sessionId:typeof a.sessionId=="string"?a.sessionId:"",title:typeof a.title=="string"?a.title:"",workspacePath:typeof a.workspacePath=="string"?a.workspacePath:"",createdAt:typeof a.createdAt=="number"?a.createdAt:0}))}}async function H(e,s,n){let t;try{t=await e(s,{cache:"no-store",...n})}catch(i){return{ok:!1,error:{code:"NETWORK",message:"连不上 host"+(i instanceof Error&&i.message!==""?"："+i.message:"")}}}let l=null;try{l=await t.json()}catch{l=null}if(h(l)&&l.ok===!0)return{ok:!0,value:l.value};const a=h(l)&&h(l.error)?l.error:null;return{ok:!1,error:{code:a!==null&&typeof a.code=="string"?a.code:"HTTP_"+String(t.status),message:a!==null&&typeof a.message=="string"&&a.message!==""?a.message:"请求失败（HTTP "+String(t.status)+"）。"}}}function F(){return{ok:!1,error:{code:"BAD_PAYLOAD",message:"host 返回了无法识别的数据。"}}}function ds(e){const s=e.fetch;async function n(l,a){const i=await H(s,l,a);if(!i.ok)return i;const u=G(i.value);return u!==null?{ok:!0,value:u}:F()}const t=l=>({method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(l)});return{getStatus:()=>n(Qe),saveConfig:l=>n(We,t(l)),reconnect:()=>n(Oe,{method:"POST"}),rebind:l=>n($e,t({groupId:l})),async cleanup(l){const a=await H(s,Ye,t({days:l}));if(!a.ok)return a;const i=a.value,u=h(i)?G(i.status):null,d=h(i)&&h(i.cleanup)?i.cleanup:null;return u===null||d===null?F():{ok:!0,value:{cleanup:{days:typeof d.days=="number"?d.days:l,chat:typeof d.chat=="number"?d.chat:0,media:typeof d.media=="number"?d.media:0,at:typeof d.at=="number"?d.at:0},status:u}}},async messages(l,a){const i=new URLSearchParams({groupId:String(l)});typeof a=="number"&&Number.isFinite(a)&&i.set("limit",String(a));const u=await H(s,Je+"?"+i.toString());return u.ok?h(u.value)?{ok:!0,value:{groupId:typeof u.value.groupId=="number"?u.value.groupId:l,limit:typeof u.value.limit=="number"?u.value.limit:0,windowMs:typeof u.value.windowMs=="number"?u.value.windowMs:0,messages:rs(u.value.messages)}}:F():u},async savePreset(l){const a=await H(s,Xe,t({preset:l}));if(!a.ok)return a;const i=a.value,u=h(i)?G(i.status):null;return u===null||!h(i)?F():{ok:!0,value:{presets:te(i.presets),status:u}}},async deletePreset(l){const a=await H(s,Ze,t({id:l}));if(!a.ok)return a;const i=a.value,u=h(i)?G(i.status):null;return u===null||!h(i)?F():{ok:!0,value:{presets:te(i.presets),status:u}}},async testComfy(l){const a={};typeof(l==null?void 0:l.baseUrl)=="string"&&l.baseUrl.trim()!==""&&(a.baseUrl=l.baseUrl.trim()),typeof(l==null?void 0:l.timeoutMs)=="number"&&Number.isFinite(l.timeoutMs)&&(a.timeoutMs=l.timeoutMs);const i=await H(s,es,t(a));if(!i.ok)return i;const u=i.value,d=h(u)?G(u.status):null;return d===null||!h(u)?F():{ok:!0,value:{probe:cs(u.probe,d.comfy),status:d}}},async deleteMapping(l){const a=await H(s,Ve,t({groupId:l}));if(!a.ok)return a;const i=a.value,u=h(i)?G(i.status):null,d=h(i)&&h(i.mapping)?i.mapping:null;return u===null||d===null?F():{ok:!0,value:{mapping:{groupId:typeof d.groupId=="number"?d.groupId:l,removed:d.removed===!0},status:u}}},async clearMappings(){const l=await H(s,Ke,{method:"POST"});if(!l.ok)return l;const a=l.value,i=h(a)?G(a.status):null,u=h(a)&&h(a.mappings)?a.mappings:null;return i===null||u===null?F():{ok:!0,value:{mappings:{cleared:typeof u.cleared=="number"?u.cleared:0},status:i}}}}}function us(){return{wsUrl:"",accessToken:"",selfId:"",groups:"",workspace:"",chatRetentionDays:"",gateDebounce:"",gateFastMinReplyInterval:"",gateJevThreshold:"",sessionTitle:"",replyChunkSize:"",commandPrefixes:"",proxyEnabled:!1,proxyTargets:"",proxySilenceWindow:"",agentPreset:"",personaEnabled:!1,personaText:"",comfyEnabled:!1,comfyBaseUrl:"",comfyTimeout:"30s",comfySkillEnabled:!0}}function ue(e){return{wsUrl:e.wsUrl,accessToken:"",selfId:e.selfId>0?String(e.selfId):"",groups:e.groups.join(", "),workspace:e.workspace,chatRetentionDays:String(e.chatRetentionDays),gateDebounce:X(e.gate.debounceMs),gateFastMinReplyInterval:X(e.gate.fastMinReplyIntervalMs),gateJevThreshold:String(e.gate.jevThreshold),sessionTitle:e.sessionTitle,replyChunkSize:e.replyChunkSize>0?String(e.replyChunkSize):"",commandPrefixes:e.commandPrefixes.join(", "),proxyEnabled:e.proxyReply.enabled,proxyTargets:e.proxyReply.targets.join(", "),proxySilenceWindow:X(e.proxyReply.silenceWindowMs),agentPreset:e.agentPreset,personaEnabled:e.persona.enabled,personaText:e.persona.text,comfyEnabled:e.comfy.enabled,comfyBaseUrl:e.comfy.baseUrl,comfyTimeout:X(e.comfy.timeoutMs),comfySkillEnabled:e.comfy.skillEnabled}}function X(e){return!Number.isFinite(e)||e<=0?"0s":e%(3600*1e3)===0?String(e/(3600*1e3))+"h":e%(60*1e3)===0?String(e/(60*1e3))+"m":e%1e3===0?String(e/1e3)+"s":String(e)+"ms"}function le(e,s=Date.now()){if(!Number.isFinite(e)||e<=0)return"";const n=Math.max(0,s-e);return n<60*1e3?"刚刚":n<3600*1e3?Math.floor(n/(60*1e3))+" 分钟前":n<1440*60*1e3?Math.floor(n/(3600*1e3))+" 小时前":Math.floor(n/(1440*60*1e3))+" 天前"}function pe(e){if(!Number.isFinite(e)||e<=0)return"--:--:--";const s=new Date(e),n=t=>String(t).padStart(2,"0");return n(s.getHours())+":"+n(s.getMinutes())+":"+n(s.getSeconds())}function Y(e){const s=/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/iu.exec(e.trim());if(s===null)return null;const t={ms:1,s:1e3,m:60*1e3,h:3600*1e3}[s[2].toLowerCase()];if(t===void 0)return null;const l=Number(s[1]);return!Number.isFinite(l)||l<0?null:Math.round(l*t)}function ps(e){return e.split(/[,，\s]+/u).map(s=>s.trim()).filter(s=>s!=="")}function hs(e){const s=[],n=[];for(const t of ps(e)){if(!/^\d+$/u.test(t)){s.push("群号必须是数字："+t);continue}const l=Number(t);if(!Number.isSafeInteger(l)||l<=0){s.push("群号必须是正整数："+t);continue}n.includes(l)||n.push(l)}return s.length>0?{ok:!1,problems:s}:{ok:!0,value:n}}function ms(e){const s=[],n=new Set;for(const t of e.split(/[,，]/u)){const l=t.trim().replace(/^@/u,"").trim();if(l==="")continue;const a=l.toLowerCase();n.has(a)||(n.add(a),s.push(l))}return s}function fs(e){return{ok:!0,value:e.split(/[,，]/u).map(n=>n.trim()).filter(n=>n!=="")}}function gs(e){const s=[],n={},t=e.wsUrl.trim();t===""?s.push("wsUrl 必填"):n.wsUrl=t,e.accessToken.trim()!==""&&(n.accessToken=e.accessToken.trim());const l=e.selfId.trim();!/^\d+$/u.test(l)||Number(l)<=0?s.push("selfId 必须是正整数"):n.selfId=Number(l);const a=hs(e.groups);a.ok?n.groups=a.value:s.push(...a.problems);const i=e.workspace.trim();i===""?s.push("workspace 必填"):n.workspace=i;const u=e.chatRetentionDays.trim(),d=u===""?"0":u,y=Number(d);!/^\d+$/u.test(d)||!Number.isInteger(y)||!(y===0||y>=7&&y<=3650)?s.push("聊天记录保留天数必须是 0（永不自动删除）或 7..3650 的整数"):n.chatRetentionDays=y;const M=e.sessionTitle.trim();M===""?s.push("sessionTitle 必填"):n.sessionTitle=M;const g=e.replyChunkSize.trim(),D=Number(g);!/^\d+$/u.test(g)||!Number.isInteger(D)||D<100||D>2e4?s.push("replyChunkSize 必须是 100..20000 的整数"):n.replyChunkSize=D;const x=fs(e.commandPrefixes);n.commandPrefixes=x.value;const Q=ms(e.proxyTargets);e.proxyEnabled&&Q.length===0&&s.push("开启代答时至少要填一个目标（QQ 号或群名片 / 昵称）");const W=e.proxySilenceWindow.trim(),E=Y(W);E===null||E>1440*60*1e3?s.push("代答沉默窗口必须是 0..24h 的时长（如 10m / 30m；0s = 总是代答）"):n.proxyReply={enabled:e.proxyEnabled,targets:Q,silenceWindow:W};const T=e.agentPreset.trim();n.agentPreset=T;const A=e.personaText.trim();e.personaEnabled&&A===""&&s.push("开启轻量人设时至少要填一段人设文本"),A.length>4e3&&s.push("轻量人设最多 4000 字符"),n.persona={enabled:e.personaEnabled,text:A};const U=e.comfyBaseUrl.trim();U===""&&s.push("ComfyUI 服务地址必填（如 http://192.168.1.10:8188）");const R=e.comfyTimeout.trim(),c=Y(R);c===null||c<3e3||c>12e4?s.push("ComfyUI 超时必须是 3s..120s 的时长（如 30s）"):U!==""&&(n.comfy={enabled:e.comfyEnabled,baseUrl:U,timeoutMs:c,skillEnabled:e.comfySkillEnabled});const L={},z=e.gateDebounce.trim(),J=Y(z);J===null||J>60*1e3?s.push("去抖窗口必须是 0..60s 的时长（如 3s / 500ms）"):L.debounce=z;const _=e.gateFastMinReplyInterval.trim(),V=Y(_);V===null||V>3600*1e3?s.push("最小发言间隔必须是 0..60m 的时长（如 10s / 45s）"):L.fastMinReplyInterval=_;const B=e.gateJevThreshold.trim(),q=Number(B);return B===""||!Number.isFinite(q)||q<0||q>1?s.push("jev 阈值必须是 0..1 的数字（如 0.7）"):L.jevThreshold=q,n.gate=L,s.length>0?{ok:!1,problems:s}:{ok:!0,value:n}}function bs(e,s){const n=ue(s);return Object.keys(n).some(t=>e[t]!==n[t])}function Z(){return{id:"",name:"",description:"",persona:"",provider:"",model:"",reasoningEffort:"",permissionPreset:"",order:"100"}}function xs(e){return{id:e.id,name:e.name,description:e.description,persona:e.persona,provider:e.model.provider,model:e.model.model,reasoningEffort:e.model.reasoningEffort,permissionPreset:e.permissionPreset,order:String(e.order)}}function qs(e){const s=[],n=e.id.trim();/^[a-z0-9][a-z0-9-]{0,40}$/u.test(n)||s.push("预设 id 只能用小写字母 / 数字 / 连字符，且不超过 41 字符");const t=e.name.trim();t===""&&s.push("预设名称必填");const l=e.persona.trim();l===""&&s.push("人设文本必填"),l.length>4e3&&s.push("人设文本最多 4000 字符");const a=e.provider.trim(),i=e.model.trim();a===""!=(i==="")&&s.push("模型必须同时选 provider 与 model（或都留空）");const u=e.order.trim()===""?"100":e.order.trim(),d=Number(u);return(!/^\d+$/u.test(u)||!Number.isInteger(d)||d<1||d>1e4)&&s.push("预设排序必须是 1..10000 的整数"),s.length>0?{ok:!1,problems:s}:{ok:!0,value:{id:n,name:t,description:e.description.trim(),persona:l,model:{provider:a,model:i,reasoningEffort:a===""?"":e.reasoningEffort.trim()},permissionPreset:e.permissionPreset.trim(),order:d}}}function he(e){const s=new Map,n=t=>{let l=s.get(t);return l===void 0&&(l={groupId:t,sessionId:"",sessionTitle:"",projectDir:""},s.set(t,l)),l};for(const t of e.config.groups)n(t);for(const[t,l]of Object.entries(e.config.groupWorkspaces)){const a=Number(t);!Number.isSafeInteger(a)||a<=0||(n(a).projectDir=l)}for(const t of e.mappings){const l=n(t.groupId);l.sessionId=t.sessionId,l.sessionTitle=t.title}return[...s.values()].sort((t,l)=>t.groupId-l.groupId)}function ys(e){const s={};for(const n of e){const t=n.projectDir.trim();t!==""&&(s[String(n.groupId)]=t)}return s}function js(e,s){const n=new Map(he(s).map(t=>[t.groupId,t.projectDir]));return e.some(t=>(n.get(t.groupId)??"")!==t.projectDir.trim())}const I=ds({fetch:(e,s)=>globalThis.fetch(e,s)}),vs=[{id:"connection",label:"连接"},{id:"project",label:"项目"},{id:"behavior",label:"行为"},{id:"comfy",label:"画图"},{id:"presets",label:"预设"},{id:"records",label:"记录"}];function P(e){return e.ok?"":e.error.message}function ks(e){if(e===null)return{tone:"muted",text:"加载中…"};if(!e.started)return e.lock!==null?{tone:"warn",text:"未启动：另一个实例（pid "+String(e.lock.pid)+"）正在运行"}:e.problems.length>0?{tone:"error",text:"未启动：配置待补全"}:{tone:"muted",text:"未启动（等待宿主就绪）"};if(e.connected){const s=e.login;return{tone:"ok",text:"已连接（"+(s!==null&&(s.nickname!==""||s.userId>0)?"QQ "+(s.nickname!==""?s.nickname:String(s.userId)):String(e.config.selfId))+"）"}}return{tone:"warn",text:"连接中…（断线自动重连）"}}function ws(e){return e===null?"保存后生效":e.config.accessTokenConfigured?"已配置（来源："+(e.config.accessTokenSource==="settings"?"配置页保存值":"profile patch / 环境变量")+"）；留空表示不修改":"未配置；建议在 profile patch 里用 !!js 从环境变量读取"}function Ss(e){if(e===null)return{tone:"muted",text:"闸门状态读取中…"};if(!e.config.gateSupported)return{tone:"warn",text:"宿主还是旧版本（未加载支持闸门配置的版本）：下面参数暂时不会生效，重启该 profile 的 GUI 后再保存。"};const s=e.gate;return s===null?{tone:"muted",text:"闸门状态读取中…"}:s.enabled?s.classifier===null?{tone:"warn",text:"闸门已开启，但分类器未就绪：普通群消息不会接话（@ / 引用 / 命令仍直通）。"}:{tone:"ok",text:"闸门已开启 · 分类器 "+s.classifier+" · 阈值 "+String(s.threshold)+"；保存后立即重建闸门。"}:{tone:"muted",text:"闸门当前关闭（gate.enabled 来自 profile patch）：下面的参数会保存，开启后才生效。"}}function Cs(e){if(e===null)return{tone:"muted",text:"画图状态读取中…"};const s=e.comfy;if(!s.enabled)return{tone:"muted",text:"画图能力已关闭"};if(s.checking)return{tone:"muted",text:"正在检查 ComfyUI…"};if(!s.reachable)return{tone:"warn",text:"ComfyUI 连不上："+(s.error!==""?s.error:"尚未检查")};if(!s.supported)return{tone:"warn",text:"宿主没有 skills 服务，画图 skill 无法加载"};const n=s.version!==""?s.version:"未知版本",t=s.skill.loaded?"skill 已加载":"skill 未加载";return{tone:"ok",text:"ComfyUI "+n+" 可用 · "+t}}const Ns={busy:!1,error:null,result:null},ee={groupId:null,items:[],busy:!1,error:null,windowMs:0};function Is(){const[e,s]=m.useState(null),[n,t]=m.useState(us),[l,a]=m.useState([]),[i,u]=m.useState(!0),[d,y]=m.useState(!1),[M,g]=m.useState(null),[D,x]=m.useState(null),[Q,W]=m.useState("connection"),[E,T]=m.useState(ee),[A,U]=m.useState([]),[R,c]=m.useState(Z),[L,z]=m.useState(null),[J,_]=m.useState(!1),[V,B]=m.useState(Ns),q=m.useCallback((o,p)=>{s(o),U(o.presets),p&&(t(ue(o.config)),a(he(o)))},[]),O=m.useCallback(async(o,p=!0)=>{const f=await I.getStatus();u(!1),f.ok?(q(f.value,o),o&&p&&g(null)):p&&g(P(f))},[q]);m.useEffect(()=>{O(!0)},[O]),m.useEffect(()=>{const o=setInterval(()=>{O(!1,!1)},5e3);return()=>clearInterval(o)},[O]);const me=m.useCallback((o,p)=>{t(f=>({...f,[o]:p}))},[]),fe=m.useCallback(o=>{t(p=>({...p,proxyEnabled:o}))},[]),ge=m.useCallback(o=>{t(p=>({...p,personaEnabled:o}))},[]),be=m.useCallback(o=>{t(p=>({...p,comfyEnabled:o}))},[]),xe=m.useCallback(o=>{t(p=>({...p,comfySkillEnabled:o}))},[]),qe=m.useCallback((o,p)=>{a(f=>f.map(k=>k.groupId===o?{...k,projectDir:p}:k))},[]),ye=m.useCallback(()=>{O(!0)},[O]),je=m.useCallback(async()=>{const o=gs(n);if(!o.ok){x(null),g(o.problems.join("；"));return}const p=ys(l);y(!0),g(null),x(null);const f=await I.saveConfig({...o.value,groupWorkspaces:p});y(!1),f.ok?(q(f.value,!0),x("已保存并重建连接。")):g(P(f))},[n,l,q]),ve=m.useCallback(async()=>{y(!0),g(null),x(null);const o=await I.reconnect();y(!1),o.ok?(q(o.value,!1),x("已请求重新连接。")):g(P(o))},[q]),ke=m.useCallback(async o=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("重新绑定群 "+String(o)+`？
		会删除该群现有会话映射，下次消息按当前项目目录新建会话；旧项目里的聊天记录不会移动。`))return;y(!0),g(null),x(null);const f=await I.rebind(o);y(!1),f.ok?(q(f.value,!0),x("已重新绑定：下一条消息会按新项目建会话。")):g(P(f))},[q]),K=m.useCallback(async o=>{T(f=>({...f,groupId:o,busy:!0,error:null}));const p=await I.messages(o,20);p.ok?T({groupId:o,items:p.value.messages,busy:!1,error:null,windowMs:p.value.windowMs}):T({groupId:o,items:[],busy:!1,error:P(p),windowMs:0})},[]),we=m.useCallback(o=>{K(o)},[K]),Se=m.useCallback(()=>{T(ee)},[]),Ce=m.useCallback(()=>{E.groupId!==null&&K(E.groupId)},[K,E.groupId]),Ne=m.useCallback(async o=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("解除群 "+String(o)+` 的会话绑定？
		旧会话保留在 GUI；下一条群消息会按当前项目目录新建会话。`))return;y(!0),g(null),x(null);const f=await I.deleteMapping(o);y(!1),f.ok?(q(f.value.status,!0),x(f.value.mapping.removed?"已解除群 "+String(o)+" 的会话绑定。":"群 "+String(o)+" 本来没有绑定。"),T(k=>k.groupId===o?ee:k)):g(P(f))},[q]),Ie=m.useCallback(async()=>{const o=e===null?0:e.mappings.length;if(o===0)return;const p=globalThis.confirm;if(typeof p=="function"&&!p("清空全部 "+String(o)+` 条群映射？
		旧会话保留在 GUI；之后每个群的下一条消息都会重新建会话。`))return;y(!0),g(null),x(null);const f=await I.clearMappings();y(!1),f.ok?(q(f.value.status,!0),x("已清空 "+String(f.value.mappings.cleared)+" 条群映射。"),T(ee)):g(P(f))},[q,e]),Pe=m.useCallback(async()=>{const o=Number(n.chatRetentionDays.trim()===""?"0":n.chatRetentionDays.trim());if(!Number.isInteger(o)||o<1||o>3650){x(null),g("立即清理需要先在「保留天数」里填 1..3650 的整数（0 = 永不删除，不能清理）。");return}const p=globalThis.confirm;if(typeof p=="function"&&!p("立即清理超过 "+String(o)+` 天的聊天记录与媒体文件？
		删除后不可恢复；群映射与会话不受影响。`))return;y(!0),g(null),x(null);const f=await I.cleanup(o);if(y(!1),f.ok){const{cleanup:k,status:ne}=f.value;q(ne,!1),x("已清理：聊天记录 "+String(k.chat)+" 个文件、媒体 "+String(k.media)+" 个日期目录（保留 "+String(k.days)+" 天）。")}else g(P(f))},[n.chatRetentionDays,q]),Te=m.useCallback(async()=>{const o=n.comfyBaseUrl.trim(),p=Y(n.comfyTimeout.trim());if(p===null||p<3e3||p>12e4){B({busy:!1,error:"ComfyUI 超时必须是 3s..120s 的时长（如 30s）",result:null});return}B(ne=>({...ne,busy:!0,error:null}));const f={timeoutMs:p};o!==""&&(f.baseUrl=o);const k=await I.testComfy(f);k.ok?(q(k.value.status,!1),B({busy:!1,error:null,result:k.value.probe})):B({busy:!1,error:P(k),result:null})},[n.comfyBaseUrl,n.comfyTimeout,q]),Me=m.useCallback(()=>{z(""),c(Z()),g(null),x(null)},[]),Ee=m.useCallback(o=>{const p=A.find(f=>f.id===o);p!==void 0&&(z(o),c(xs(p)),g(null),x(null))},[A]),Ae=m.useCallback((o,p)=>{c(f=>({...f,[o]:p}))},[]),re=m.useCallback(()=>{z(null),c(Z()),g(null)},[]),Ue=m.useCallback(async()=>{const o=qs(R);if(!o.ok){x(null),g(o.problems.join("；"));return}_(!0),g(null),x(null);const p=await I.savePreset(o.value);_(!1),p.ok?(q(p.value.status,!1),U(p.value.presets),z(null),c(Z()),x("预设已保存；新注册的 preset 对新会话生效。")):g(P(p))},[R,q]),De=m.useCallback(async o=>{const p=globalThis.confirm;if(typeof p=="function"&&!p("删除预设「"+o+`」？
		已使用该预设的旧会话保留原组合；之后新建的会话不能再选它。`))return;_(!0),g(null),x(null);const f=await I.deletePreset(o);_(!1),f.ok?(q(f.value.status,!1),U(f.value.presets),L===o&&re(),x("已删除预设「"+o+"」。")):g(P(f))},[q,L,re]),Re=m.useMemo(()=>e!==null&&(bs(n,e.config)||js(l,e)),[n,l,e]),Le=m.useMemo(()=>ks(e),[e]),He=m.useMemo(()=>Ss(e),[e]),Fe=m.useMemo(()=>Cs(e),[e]),ze=m.useMemo(()=>ws(e),[e]);return{status:e,form:n,projectRows:l,loading:i,busy:d,error:M,notice:D,tab:Q,dirty:Re,statusLine:Le,tokenHint:ze,gateLine:He,comfyLine:Fe,comfyProbe:V,messages:E,setTab:W,updateField:me,setProxyEnabled:fe,setPersonaEnabled:ge,setComfyEnabled:be,setComfySkillEnabled:xe,testComfy:()=>{Te()},updateProjectRow:qe,refresh:ye,save:()=>{je()},reconnect:()=>{ve()},rebind:o=>{ke(o)},deleteMapping:o=>{Ne(o)},clearMappings:()=>{Ie()},cleanup:()=>{Pe()},openMessages:we,closeMessages:Se,reloadMessages:Ce,presets:A,presetDraft:R,presetEditingId:L,presetBusy:J,newPreset:Me,editPreset:Ee,updatePresetDraft:Ae,cancelPresetEdit:re,savePreset:()=>{Ue()},deletePreset:o=>{De(o)}}}function Ps({model:e}){var n;const s=((n=e.status)==null?void 0:n.gate)??null;return s===null||s.groups.length===0?null:r.jsx(S,{children:r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"闸门实时状态"}),r.jsxs("p",{className:"qqr-hint",children:["待评估 ",s.pendingMessages," 条 / ",s.pendingGroups," 群 · 活动定时器 ",s.timers," · ","待派发 ",s.queue," · 待发送 ",s.sendQueue]}),r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"群号"}),r.jsx("th",{className:"qqr-th",children:"待评估"}),r.jsx("th",{className:"qqr-th",children:"最近发言"}),r.jsx("th",{className:"qqr-th",children:"冷却"}),r.jsx("th",{className:"qqr-th",children:"状态"})]})}),r.jsx("tbody",{children:s.groups.map(t=>r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:t.groupId}),r.jsx("td",{className:"qqr-td",children:t.pending}),r.jsx("td",{className:"qqr-td",children:le(t.lastBotSpeakAt)||"未发言"}),r.jsx("td",{className:"qqr-td",children:t.cooldownUntil>Date.now()?"冷却至 "+pe(t.cooldownUntil):"—"}),r.jsx("td",{className:"qqr-td",children:t.dshBusy?"忙（有轮次在跑）":t.evaluating?"评估中":"空闲"})]},t.groupId))})]})})]})})}function Ts({model:e}){var u;const{form:s,updateField:n}=e,t=((u=e.status)==null?void 0:u.agentPresets)??null,l=(t==null?void 0:t.items)??[],a=[{value:"",label:"不指定（跟随 DSH 默认）"},...l.map(d=>({value:d.id,label:(d.name!==""?d.name:d.id)+(d.broken!==""?"（不可用）":""),disabled:d.broken!=="",title:d.broken!==""?d.broken:d.description}))];s.agentPreset!==""&&!l.some(d=>d.id===s.agentPreset)&&a.push({value:s.agentPreset,label:s.agentPreset+"（不在名册中）",disabled:!1});const i=t===null||!t.supported?r.jsx(C,{tone:"warn",children:"当前宿主没有提供 agent preset 服务（可能版本过旧或不是 Web bundle）：预设选择不会生效，轻量人设仍可用。"}):t.missing?r.jsx(C,{tone:"warn",children:"配置里的预设不在当前名册里：下次建会话会退回 DSH 默认预设。"}):null;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(S,{children:[r.jsx(b,{label:"回发文本切分上限",hint:"100..20000 字符；超长回复按此切分成多条",children:r.jsx(j,{value:s.replyChunkSize,onChange:d=>{n("replyChunkSize",d)},inputMode:"numeric",ariaLabel:"回发文本切分上限"})}),r.jsx(b,{label:"直通命令前缀",hint:"逗号分隔；群消息以此开头时绕过闸门直接进 DSH",children:r.jsx(j,{value:s.commandPrefixes,onChange:d=>{n("commandPrefixes",d)},placeholder:"/dsh",ariaLabel:"直通命令前缀"})})]}),r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"消息闸门"}),r.jsx(C,{tone:e.gateLine.tone==="ok"?"ok":e.gateLine.tone==="warn"?"warn":"muted",children:e.gateLine.text})]}),r.jsx(b,{label:"普通消息去抖窗口",hint:"同一波消息合并等待，0..60s（如 3s / 500ms）",children:r.jsx(j,{value:s.gateDebounce,onChange:d=>{n("gateDebounce",d)},placeholder:"5s",ariaLabel:"普通消息去抖窗口"})}),r.jsx(b,{label:"最小发言间隔",hint:"距上次发言不足该间隔时延后评估，0..60m（如 10s / 45s）",children:r.jsx(j,{value:s.gateFastMinReplyInterval,onChange:d=>{n("gateFastMinReplyInterval",d)},placeholder:"45s",ariaLabel:"最小发言间隔"})}),r.jsx(b,{label:"jev 接话阈值",hint:"0..1；越高越保守（默认 0.7）",children:r.jsx(j,{value:s.gateJevThreshold,onChange:d=>{n("gateJevThreshold",d)},inputMode:"decimal",placeholder:"0.7",ariaLabel:"jev 接话阈值"})})]}),r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"角色与人设"}),r.jsx("p",{className:"qqr-hint",children:"所有群共用一个 DSH agent preset；切换后只影响之后新建的会话（群里发 /new，或到「项目」页点「重新绑定」）。 下拉包含 DSH 内置预设和「预设」页里插件管理的预设（自带一个「QQ 群聊」）。"}),i]}),r.jsx(b,{label:"默认 Agent 预设",hint:"空 = 跟随 DSH 默认；preset 在会话创建时固定",children:r.jsx($,{value:s.agentPreset,onChange:d=>{n("agentPreset",d)},options:a,ariaLabel:"默认 Agent 预设"})}),r.jsx(b,{label:"启用轻量人设",hint:"每轮 prompt 前注入；默认关闭；不依赖 profile 改动",children:r.jsx(se,{checked:s.personaEnabled,onChange:e.setPersonaEnabled,ariaLabel:"启用轻量人设"})}),r.jsxs(v,{children:[r.jsx(de,{value:s.personaText,onChange:d=>{n("personaText",d)},placeholder:"例如：你是群里的猫娘助手，说话带「喵」，可以偶尔发一个表情。",rows:4,ariaLabel:"轻量人设文本"}),r.jsx("p",{className:"qqr-hint",children:"人设文本最多 4000 字符，开启时不能为空；它叠加在系统提示词里的预设人设之上，适合补群内角色设定。 平台约定（最终回复自动回发、不要用 qq_send 往本群发）始终会附在 prompt 末尾。"})]})]}),r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"代答（@ 特定的人）"}),r.jsx("p",{className:"qqr-hint",children:"开启后，群里有人 @ 名单里的人、且 TA 最近没在本群说话时，机器人代 TA 回应（默认关闭）。 名单之外的 @ 别人消息只记聊天记录，不会触发会话。"})]}),r.jsx(b,{label:"开启代答",hint:"默认关闭；开启时下面至少填一个目标",children:r.jsx(se,{checked:s.proxyEnabled,onChange:e.setProxyEnabled,ariaLabel:"开启代答"})}),r.jsx(b,{label:"代答目标",hint:"QQ 号或群名片 / 昵称，逗号分隔（如 10003, 群主）",children:r.jsx(j,{value:s.proxyTargets,onChange:d=>{n("proxyTargets",d)},placeholder:"10003, 群主",ariaLabel:"代答目标"})}),r.jsx(b,{label:"沉默窗口",hint:"TA 多久没在本群发言才代答；0s = 总是代答（如 10m / 30m）",children:r.jsx(j,{value:s.proxySilenceWindow,onChange:d=>{n("proxySilenceWindow",d)},placeholder:"10m",ariaLabel:"代答沉默窗口"})})]}),r.jsx(Ps,{model:e})]})}function N({label:e,value:s}){return r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:e}),r.jsx("td",{className:"qqr-td",children:s})]})}function Ms({model:e}){const{form:s,updateField:n,status:t,comfyProbe:l}=e,a=(t==null?void 0:t.comfy)??null,i=l.result,u=t!==null&&!t.config.comfySupported?r.jsx(C,{tone:"warn",children:"宿主版本较旧，需重启该 profile 的 GUI 后此页才生效。"}):null,d=i===null?null:r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"项目"}),r.jsx("th",{className:"qqr-th",children:"结果"})]})}),r.jsxs("tbody",{children:[r.jsx(N,{label:"目标地址",value:i.target!==""?i.target:"（空）"}),r.jsx(N,{label:"可达",value:i.reachable?"是":"否"}),r.jsx(N,{label:"ComfyUI 版本",value:i.version!==""?i.version:"未知"}),r.jsx(N,{label:"GPU",value:i.device!==""?i.device:"未知"}),r.jsx(N,{label:"队列",value:String(i.queue.running)+" 运行 / "+String(i.queue.pending)+" 等待"}),r.jsx(N,{label:"延迟",value:String(i.latencyMs)+" ms"}),r.jsx(N,{label:"错误",value:i.error!==""?i.error:"—"})]})]})}),y=a===null?r.jsx(v,{children:r.jsx("p",{className:"qqr-empty",children:"状态读取中…"})}):a.enabled?r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"项目"}),r.jsx("th",{className:"qqr-th",children:"状态"})]})}),r.jsxs("tbody",{children:[r.jsx(N,{label:"可达",value:a.reachable?"是":"否"}),r.jsx(N,{label:"ComfyUI 版本",value:a.version!==""?a.version:"未知"}),r.jsx(N,{label:"设备",value:a.device!==""?a.device:"未知"}),r.jsx(N,{label:"队列",value:String(a.queue.running)+" 运行 / "+String(a.queue.pending)+" 等待"}),r.jsx(N,{label:"最近检查",value:le(a.checkedAt)!==""?le(a.checkedAt):"尚未检查"}),r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:"画图 skill"}),r.jsxs("td",{className:"qqr-td",children:[(a.skill.name!==""?a.skill.name:"comfy-image")+" · "+(a.skill.loaded?"已加载":"未加载"),a.skill.error!==""?r.jsx("span",{className:"qqr-hint qqr-mono-block",children:a.skill.error}):null]})]})]})]})}):r.jsx(v,{children:r.jsx("p",{className:"qqr-empty",children:"画图能力已关闭；启用并保存后显示运行状态。"})}),M=a!==null&&a.enabled&&a.reachable&&!a.skill.loaded?a.skillEnabled?r.jsx(C,{tone:"warn",children:"画图 skill 尚未加载：保存配置或重启该 profile 的 GUI 后，host 连上 ComfyUI 会重新注册。"}):r.jsx(C,{tone:"muted",children:"画图能力已开启，但「连接成功后加载画图 skill」是关闭的：打开上面的开关并保存后才会加载。"}):null;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"ComfyUI 服务"}),r.jsxs("p",{className:"qqr-hint",children:["host 在启用后定期探测这个地址（约 1 分钟一次），连上 ComfyUI 且开关打开时把",r.jsx("code",{children:" comfy-image "}),"skill 动态注册给 DSH；关闭画图会注销 skill。"]}),u]}),r.jsx(b,{label:"启用画图",hint:"关闭时不探测，也不加载画图 skill",children:r.jsx(se,{checked:s.comfyEnabled,onChange:e.setComfyEnabled,ariaLabel:"启用画图"})}),r.jsx(b,{label:"服务地址",hint:"ComfyUI HTTP 地址（无鉴权，只填可信网络里的地址）",children:r.jsx(j,{value:s.comfyBaseUrl,onChange:g=>{n("comfyBaseUrl",g)},placeholder:"http://192.168.1.10:8188",ariaLabel:"ComfyUI 服务地址"})}),r.jsx(b,{label:"探测超时",hint:"3s..120s；测试连接与后台探测都用它",children:r.jsx(j,{value:s.comfyTimeout,onChange:g=>{n("comfyTimeout",g)},placeholder:"30s",ariaLabel:"ComfyUI 探测超时"})}),r.jsx(b,{label:"连接成功后加载画图 skill",hint:"注册成 DSH 的运行时 skill；保存后立即按新配置探测",children:r.jsx(se,{checked:s.comfySkillEnabled,onChange:e.setComfySkillEnabled,ariaLabel:"连接成功后加载画图 skill"})}),r.jsxs(v,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsx(w,{variant:"outline",onClick:e.testComfy,disabled:l.busy,children:l.busy?"测试中…":"测试连接"}),r.jsx("span",{className:"qqr-hint",children:"用上面填的地址与超时探测一次（只探测，不保存配置）。"})]}),l.error!==null?r.jsx(C,{tone:"error",role:"alert",children:l.error}):null,d]})]}),r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"运行状态"}),r.jsx(ce,{line:e.comfyLine}),a!==null&&a.enabled&&!a.reachable?r.jsx(C,{tone:"warn",children:"请检查服务地址与 ComfyUI 是否已启动；保存配置或等待下一轮探测。"}):null,M]}),y]}),r.jsx(S,{children:r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"在群里画图"}),r.jsxs("ul",{className:"qqr-list",children:[r.jsx("li",{children:"群里直接说「画一张……」即可触发画图 skill，例如「画一张夕阳下的猫」。"}),r.jsxs("li",{children:["改图先发参考图，再说「改成……」；工作流：",r.jsx("code",{children:"qwen-t2i"})," 文生图、",r.jsx("code",{children:"qwen-i2i"})," 参考图、",r.jsx("code",{children:"qwen-edit"})," 编辑。"]}),r.jsxs("li",{children:["产物落在群项目 ",r.jsx("code",{children:"assets/comfy/output/"}),"，agent 会用 ",r.jsx("code",{children:"qq_send"})," 把图发回群里。"]}),r.jsx("li",{children:"ComfyUI 无鉴权，只在家用可信网络使用；不要在公网暴露。"})]})]})})]})}function Es({model:e}){const{status:s}=e,n=(s==null?void 0:s.login)??null,t=n!==null&&(n.nickname!==""||n.userId>0)?(n.nickname!==""?n.nickname:"未取到昵称")+"（"+String(n.userId)+"）":"未登录",l=(s==null?void 0:s.lock)??null;return r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:"运行状态"}),r.jsxs("p",{className:"qqr-hint",children:["协议端：",r.jsx("span",{className:"qqr-mono",children:(s==null?void 0:s.config.wsUrl)??"—"})]}),r.jsxs("p",{className:"qqr-hint",children:["登录账号：",t]}),r.jsxs("p",{className:"qqr-hint",children:["单实例锁：",l===null?"本进程持有":"另一个进程持有（pid "+String(l.pid)+"）"," · ","群映射：",s===null?0:s.mappings.length," 个"]})]}),s!==null&&s.problems.length>0?r.jsx(v,{children:r.jsx("ul",{className:"qqr-list",children:s.problems.map(a=>r.jsx("li",{children:r.jsx(C,{tone:"error",children:a})},a))})}):null]})}function As({model:e}){var t;const{form:s,updateField:n}=e;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(S,{children:[r.jsx(b,{label:"协议端 WebSocket",hint:"NapCat 正向 WS，例如 ws://127.0.0.1:3001",children:r.jsx(j,{value:s.wsUrl,onChange:l=>{n("wsUrl",l)},placeholder:"ws://127.0.0.1:3001",ariaLabel:"协议端 WebSocket 地址"})}),r.jsx(b,{label:"Access Token",hint:e.tokenHint,children:r.jsx(j,{type:"password",value:s.accessToken,onChange:l=>{n("accessToken",l)},placeholder:((t=e.status)==null?void 0:t.config.accessTokenConfigured)===!0?"留空保持不变":"写入新的 token",ariaLabel:"Access Token"})}),r.jsx(b,{label:"机器人 QQ 号",hint:"连接后用 get_login_info 校验，不匹配会断开",children:r.jsx(j,{value:s.selfId,onChange:l=>{n("selfId",l)},inputMode:"numeric",ariaLabel:"机器人 QQ 号"})}),r.jsx(b,{label:"群白名单",hint:"逗号分隔的群号；未列出的群只记日志不回话",children:r.jsx(j,{value:s.groups,onChange:l=>{n("groups",l)},placeholder:"10002",ariaLabel:"群白名单"})})]}),r.jsx(Es,{model:e})]})}function Us({model:e}){var R;const{status:s,presets:n,presetDraft:t,presetEditingId:l,presetBusy:a,updatePresetDraft:i}=e,u=(s==null?void 0:s.modelCatalog)??null,d=(u==null?void 0:u.groups)??[],y=d.find(c=>c.id===t.provider),M=(y==null?void 0:y.models)??[],g=M.find(c=>c.id===t.model),D=(g==null?void 0:g.efforts)??[],x=((R=s==null?void 0:s.permissionCatalog)==null?void 0:R.options)??[],Q=[{value:"",label:"不指定（跟随 DSH 默认）"},...d.map(c=>({value:c.id,label:c.name!==""?c.name:c.id}))],W=[{value:"",label:"不指定"},...M.map(c=>({value:c.id,label:c.name!==""?c.name:c.id}))],E=[{value:"",label:"默认"},...D.map(c=>({value:c.id,label:c.name!==""?c.name:c.id}))],T=[{value:"",label:"不指定（跟随当前）"},...x.map(c=>({value:c.value,label:c.name!==""?c.name:c.value}))],A=l!==null,U=s!==null&&!s.presetService.supported?r.jsx(C,{tone:"warn",children:"宿主没有提供 agentPresets 服务（或尚未就绪）：预设会保存在本地，但暂时无法在 DSH 里选到，重启 GUI 后再看。"}):null;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsx("h4",{className:"qqr-subhead",children:"QQ 预设"}),r.jsx("span",{className:"qqr-inline-actions",children:r.jsx(w,{variant:"outline",onClick:e.newPreset,disabled:a,children:"新建预设"})})]}),r.jsx("p",{className:"qqr-hint",children:"预设 = 系统提示词人设（persona）+ 会话模型 / 思考层级 / 权限。保存后 host 动态注册成 DSH agent preset（无需重启 GUI）；已有群会话要发 /new 或「重新绑定」才会换过去。 插件自带的「QQ 群聊」也可以改。"}),U]}),r.jsx(v,{children:n.length===0?r.jsx("p",{className:"qqr-empty",children:"还没有预设。点「新建预设」开始。"}):r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"预设"}),r.jsx("th",{className:"qqr-th",children:"模型"}),r.jsx("th",{className:"qqr-th",children:"权限"}),r.jsx("th",{className:"qqr-th",children:"操作"})]})}),r.jsx("tbody",{children:n.map(c=>r.jsxs("tr",{children:[r.jsxs("td",{className:"qqr-td",children:[r.jsx("span",{children:c.name!==""?c.name:c.id}),r.jsx("span",{className:"qqr-mono qqr-mono-block",children:c.id}),s!==null&&s.presetService.supported&&!s.presetService.registered.includes(c.id)?r.jsx("span",{className:"qqr-hint",children:"（未注册：可能与 DSH 内置预设冲突）"}):null]}),r.jsx("td",{className:"qqr-td",children:c.model.provider===""?"跟随默认":c.model.provider+"/"+c.model.model+(c.model.reasoningEffort===""?"":" · "+c.model.reasoningEffort)}),r.jsx("td",{className:"qqr-td",children:c.permissionPreset===""?"跟随当前":c.permissionPreset}),r.jsx("td",{className:"qqr-td",children:r.jsxs("div",{className:"qqr-row-actions",children:[r.jsx(w,{variant:"outline",onClick:()=>{e.editPreset(c.id)},disabled:a,children:"编辑"}),r.jsx(w,{onClick:()=>{e.deletePreset(c.id)},disabled:a,children:"删除"})]})})]},c.id))})]})})})]}),A?r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsx("h4",{className:"qqr-subhead",children:l===""?"新建预设":"编辑预设："+l}),r.jsx("p",{className:"qqr-hint",children:"id 创建后不可修改（DSH 会话按它恢复）；人设会作为系统提示词的人设段。模型 / 权限只对 使用该预设的新会话生效。"})]}),r.jsx(b,{label:"预设 id",hint:"小写字母 / 数字 / 连字符；创建后不可改",children:r.jsx(j,{value:t.id,onChange:c=>{i("id",c)},placeholder:"catgirl",disabled:l!=="",ariaLabel:"预设 id"})}),r.jsx(b,{label:"名称",hint:"显示在 DSH preset 选择器里",children:r.jsx(j,{value:t.name,onChange:c=>{i("name",c)},placeholder:"猫娘",ariaLabel:"预设名称"})}),r.jsx(b,{label:"描述",hint:"可选；一句话说明这个预设的用途",children:r.jsx(j,{value:t.description,onChange:c=>{i("description",c)},placeholder:"群里的猫娘角色",ariaLabel:"预设描述"})}),r.jsxs(v,{children:[r.jsx("span",{className:"qqr-label",children:"人设（persona）"}),r.jsx(de,{value:t.persona,onChange:c=>{i("persona",c)},placeholder:"你是群里的猫娘助手，说话带「喵」；直接输出最终回复即可，不要用 qq_send 往本群发。",rows:5,ariaLabel:"预设人设"}),r.jsx("p",{className:"qqr-hint",children:"建议保留「直接输出最终回复、不要用 qq_send 往本群发」——不然模型可能用工具回话导致双发。"})]}),u===null?r.jsxs(r.Fragment,{children:[r.jsx(b,{label:"模型 provider",hint:"宿主模型目录不可用，可手填（留空 = 跟随默认）",children:r.jsx(j,{value:t.provider,onChange:c=>{i("provider",c)},placeholder:"deepseek-account",ariaLabel:"模型 provider"})}),r.jsx(b,{label:"模型 id",hint:"留空 = 跟随默认",children:r.jsx(j,{value:t.model,onChange:c=>{i("model",c)},placeholder:"deepseek-flash",ariaLabel:"模型 id"})}),r.jsx(b,{label:"思考层级",hint:"留空 = 跟随模型默认",children:r.jsx(j,{value:t.reasoningEffort,onChange:c=>{i("reasoningEffort",c)},placeholder:"low / medium / high",ariaLabel:"思考层级"})})]}):r.jsxs(r.Fragment,{children:[r.jsx(b,{label:"模型 provider",hint:"留空 = 跟随 DSH 默认模型",children:r.jsx($,{value:t.provider,onChange:c=>{i("provider",c),i("model",""),i("reasoningEffort","")},options:Q,ariaLabel:"模型 provider"})}),r.jsx(b,{label:"模型",hint:"留空 = 不覆盖",children:r.jsx($,{value:t.model,onChange:c=>{i("model",c),i("reasoningEffort","")},options:W,ariaLabel:"模型"})}),r.jsx(b,{label:"思考层级",hint:"留空 = 跟随模型默认",children:r.jsx($,{value:t.reasoningEffort,onChange:c=>{i("reasoningEffort",c)},options:E,ariaLabel:"思考层级"})})]}),r.jsx(b,{label:"权限预设",hint:"沙箱 + 审批组合；留空 = 跟随当前",children:r.jsx($,{value:t.permissionPreset,onChange:c=>{i("permissionPreset",c)},options:T,ariaLabel:"权限预设"})}),r.jsx(b,{label:"排序",hint:"DSH preset 列表里的位置（1..10000）",children:r.jsx(j,{value:t.order,onChange:c=>{i("order",c)},inputMode:"numeric",placeholder:"100",ariaLabel:"预设排序"})}),r.jsx(v,{children:r.jsxs("div",{className:"qqr-headline",children:[r.jsx(w,{variant:"primary",onClick:e.savePreset,disabled:a,children:a?"保存中…":"保存预设"}),r.jsx(w,{variant:"outline",onClick:e.cancelPresetEdit,disabled:a,children:"取消"})]})})]}):null]})}function oe(e){const s={image:"图片",sticker:"表情",face:"表情",video:"视频",voice:"语音",file:"文件"};return e.map(n=>n.status==="failed"?n.kind==="file"?"[群文件下载失败]":"[媒体下载失败]":"["+(s[n.kind]??"媒体")+"]")}function Ds({model:e}){const{messages:s}=e;if(s.groupId===null)return null;const n=Math.max(1,Math.round(s.windowMs/36e5));return r.jsx(S,{children:r.jsxs(v,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsxs("h4",{className:"qqr-subhead",children:["最近消息 · 群 ",s.groupId]}),r.jsxs("span",{className:"qqr-muted",children:["最近 ",n," 小时 · 最多 20 条"]}),r.jsxs("span",{className:"qqr-inline-actions",children:[r.jsx(w,{onClick:e.reloadMessages,disabled:s.busy,children:"刷新"}),r.jsx(w,{onClick:e.closeMessages,disabled:s.busy,children:"关闭"})]})]}),s.busy?r.jsx("p",{className:"qqr-muted",children:"读取中…"}):s.error!==null?r.jsx(C,{tone:"error",role:"alert",children:s.error}):s.items.length===0?r.jsx("p",{className:"qqr-muted",children:"最近 24 小时没有消息。"}):r.jsx("div",{children:s.items.map(t=>r.jsxs("div",{className:"qqr-msg",children:[r.jsxs("span",{className:"qqr-msg-meta",children:[pe(t.time)," · ",t.name,t.mentionsSelf?"（@你）":"",t.replyToId!==""?"（引用 "+t.replyToId+"）":"",oe(t.media).length>0?" "+oe(t.media).join(" "):""]}),t.text!==""?r.jsx("span",{className:"qqr-msg-text",children:t.text}):null]},(t.messageId||String(t.time))+":"+String(t.time)))})]})})}function Rs({model:e}){const{status:s,projectRows:n,busy:t,loading:l}=e;return r.jsxs(S,{children:[r.jsxs(v,{children:[r.jsxs("div",{className:"qqr-headline",children:[r.jsx("h4",{className:"qqr-subhead",children:"群项目目录"}),r.jsx("span",{className:"qqr-inline-actions",children:s!==null&&s.mappings.length>0?r.jsxs(w,{onClick:e.clearMappings,disabled:t||l,variant:"outline",children:["清空全部映射（",s.mappings.length,"）"]}):null})]}),r.jsxs("p",{className:"qqr-hint",children:["每个群的聊天记录写进该项目的 ",r.jsx("code",{children:".qq-relay/chat/<群号>/"}),"，DSH 会话也以它为工作目录； 留空表示跟随上面的默认项目。改目录只影响之后新建的会话——已建会话请点「重新绑定」 （旧项目里的聊天记录不会移动）。"]}),s!==null&&s.workspace.attachIssues.length>0?r.jsx(C,{tone:"warn",children:"有 "+String(s.workspace.attachIssues.length)+" 个会话没能挂到群项目的 workspace，会在 DSH 侧栏显示为「未分组」："+s.workspace.attachIssues.map(a=>"群 "+String(a.groupId)+"（"+a.error+"）").join("；")+"。保存配置或点「重新连接」会自动补挂一次。"}):null]}),s===null||n.length===0?r.jsx(v,{children:r.jsx("p",{className:"qqr-empty",children:"还没有群：把群号填进「群白名单」，或在群里 @ 机器人后会自动出现。"})}):r.jsx(v,{children:r.jsx("div",{className:"qqr-scroll",children:r.jsxs("table",{className:"qqr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"qqr-th",children:"群号"}),r.jsx("th",{className:"qqr-th",children:"会话"}),r.jsx("th",{className:"qqr-th",children:"项目目录"}),r.jsx("th",{className:"qqr-th",children:"操作"})]})}),r.jsx("tbody",{children:n.map(a=>r.jsxs("tr",{children:[r.jsx("td",{className:"qqr-td",children:a.groupId}),r.jsx("td",{className:"qqr-td",children:a.sessionId===""?r.jsx("span",{className:"qqr-muted",children:"未创建"}):r.jsxs(r.Fragment,{children:[r.jsx("span",{children:a.sessionTitle!==""?a.sessionTitle:"—"}),r.jsx("span",{className:"qqr-mono qqr-mono-block",children:a.sessionId})]})}),r.jsx("td",{className:"qqr-td qqr-col-dir",children:r.jsx(j,{value:a.projectDir,onChange:i=>{e.updateProjectRow(a.groupId,i)},placeholder:s.config.workspace,ariaLabel:"群 "+String(a.groupId)+" 的项目目录"})}),r.jsx("td",{className:"qqr-td",children:r.jsxs("div",{className:"qqr-row-actions",children:[r.jsx(w,{variant:"outline",onClick:()=>{e.rebind(a.groupId)},disabled:t||a.sessionId==="",children:"重新绑定"}),r.jsx(w,{onClick:()=>{e.openMessages(a.groupId)},disabled:t||l,children:"消息"}),r.jsx(w,{onClick:()=>{e.deleteMapping(a.groupId)},disabled:t||a.sessionId==="",children:"解除绑定"})]})})]},a.groupId))})]})})})]})}function Ls({model:e}){const{form:s,updateField:n}=e;return r.jsxs("div",{className:"qqr-panel",children:[r.jsxs(S,{children:[r.jsx(b,{label:"默认项目目录",hint:"未单独配置群项目时，聊天记录与 DSH 会话使用的目录",children:r.jsx(j,{value:s.workspace,onChange:t=>{n("workspace",t)},placeholder:"~/dsh/qq-relay-ws",ariaLabel:"默认项目目录"})}),r.jsx(b,{label:"会话标题模板",hint:"可用 {groupName} / {groupId}",children:r.jsx(j,{value:s.sessionTitle,onChange:t=>{n("sessionTitle",t)},placeholder:"QQ群：{groupName}",ariaLabel:"会话标题模板"})})]}),r.jsx(Rs,{model:e}),r.jsx(Ds,{model:e})]})}function Hs({model:e}){const{form:s,updateField:n}=e;return r.jsx("div",{className:"qqr-panel",children:r.jsxs(S,{children:[r.jsx(b,{label:"聊天记录保留天数",hint:"0 = 永不自动删除；7..3650 = 自动清理天数（保存后生效）",children:r.jsx(j,{value:s.chatRetentionDays,onChange:t=>{n("chatRetentionDays",t)},inputMode:"numeric",placeholder:"0",ariaLabel:"聊天记录保留天数"})}),r.jsxs(v,{children:[r.jsxs("p",{className:"qqr-hint",children:["聊天记录与媒体文件默认",r.jsx("b",{children:"永不自动删除"}),"（保留天数 0）。填 7..3650 保存后， 宿主启动时与每天各清理一次超过该天数的 ",r.jsx("code",{children:".qq-relay/chat/"})," 日文件与",r.jsx("code",{children:" .qq-relay/media/"})," 日期目录。"]}),r.jsxs("div",{className:"qqr-headline",children:[r.jsx(w,{variant:"outline",onClick:e.cleanup,disabled:e.busy||e.loading,children:"立即清理"}),r.jsx("span",{className:"qqr-hint",children:"用上面的天数（1..3650）清一次，不改配置、不动群映射；删除后不可恢复。"})]})]})]})})}function Fs(){const e=Is();Ge();const s=e.tab==="connection"?r.jsx(As,{model:e}):e.tab==="project"?r.jsx(Ls,{model:e}):e.tab==="behavior"?r.jsx(Ts,{model:e}):e.tab==="comfy"?r.jsx(Ms,{model:e}):e.tab==="presets"?r.jsx(Us,{model:e}):r.jsx(Hs,{model:e});return r.jsxs("div",{className:"qqr-root","data-plugin":"dsh-qq-relay",children:[r.jsxs("div",{className:"qqr-head",children:[r.jsx(ce,{line:e.statusLine}),r.jsxs("div",{className:"qqr-actions",children:[r.jsx(w,{onClick:e.refresh,disabled:e.loading||e.busy,children:"刷新"}),r.jsx(w,{variant:"outline",onClick:e.reconnect,disabled:e.loading||e.busy,children:"重新连接"}),r.jsx(w,{variant:"primary",onClick:e.save,disabled:e.loading||e.busy,children:"保存并重连"})]})]}),r.jsx("nav",{className:"qqr-tabs",role:"tablist","aria-label":"QQ 机器人配置",children:vs.map(n=>r.jsx("button",{type:"button",role:"tab",id:"qqr-tab-"+n.id,className:"qqr-tab","data-active":e.tab===n.id,"aria-selected":e.tab===n.id,"aria-controls":"qqr-tabpanel",onClick:()=>{e.setTab(n.id)},children:n.label},n.id))}),e.error!==null?r.jsx(C,{tone:"error",role:"alert",children:e.error}):null,e.notice!==null?r.jsx(C,{tone:"ok",role:"status",children:e.notice}):null,e.dirty?r.jsx(C,{tone:"warn",children:"有未保存的修改。"}):null,r.jsx("div",{id:"qqr-tabpanel",role:"tabpanel","aria-labelledby":"qqr-tab-"+e.tab,children:s}),r.jsxs("p",{className:"qqr-footer",children:["配置来源：profile 的 ",r.jsx("code",{children:"cordis.patch.yml"}),"，本页保存的覆盖写入",r.jsx("code",{children:" ~/.dsh/storages/dsh-qq-relay/settings.json"}),"；预设写入同目录的",r.jsx("code",{children:"presets.json"})," 并在启动时动态注册；画图 skill 由 host 在 ComfyUI 连接成功后动态注册（",r.jsx("code",{children:"lib/skills/comfy-image"}),"），不需要重启 GUI。 token 只写不读，页面永远看不到明文。"]})]})}const zs="dsh-qq-relay",_s=["slots"],Bs="dsh-qq-relay";function Gs(e){var t;const s=e,n=(t=s==null?void 0:s.get)==null?void 0:t.call(s,"slots");if(!(n===void 0||typeof n.inject!="function"||typeof n.register!="function"))try{n.inject("plugins.bundle.config",()=>n.register({name:"plugins.bundle.config",key:Bs},Fs))}catch{}}exports.apply=Gs;exports.inject=_s;exports.name=zs;

		return module.exports;
	}
});
