window.__ModuleLoader__.load({
	id: "dsh-qq-relay",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		"use strict";Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const n=require("react/jsx-runtime"),p=require("react");function ge({tone:e}){return n.jsx("span",{className:"qqr-dot","data-tone":e,"aria-hidden":"true"})}function A(e){return n.jsx("button",{type:"button",className:"qqr-btn","data-variant":e.variant??"ghost",onClick:e.onClick,disabled:e.disabled===!0,title:e.title,children:e.children})}function E({children:e}){return n.jsx("div",{className:"qqr-card",children:e})}function x(e){return n.jsxs("div",{className:"qqr-row",children:[n.jsxs("div",{className:"qqr-row-text",children:[n.jsx("span",{className:"qqr-label",children:e.label}),e.hint!==void 0?n.jsx("span",{className:"qqr-hint",children:e.hint}):null]}),n.jsx("div",{className:"qqr-control",children:e.children})]})}function y({children:e}){return n.jsx("div",{className:"qqr-block",children:e})}function I(e){return n.jsx("p",{className:"qqr-line","data-tone":e.tone??"muted",role:e.role,children:e.children})}function be({line:e}){return n.jsxs("span",{className:"qqr-status",children:[n.jsx(ge,{tone:e.tone}),n.jsx("span",{children:e.text})]})}function Z(e){return n.jsx("button",{type:"button",role:"switch","aria-checked":e.checked,"aria-label":e.ariaLabel,className:"qqr-toggle","data-on":e.checked?"true":"false",disabled:e.disabled===!0,onClick:()=>{e.onChange(!e.checked)},children:n.jsx("span",{className:"qqr-toggle-knob","aria-hidden":"true"})})}function xe(e){return n.jsx("textarea",{className:"qqr-textarea",value:e.value,placeholder:e.placeholder,rows:e.rows??4,spellCheck:!1,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)}})}function V(e){return n.jsx("select",{className:"qqr-select",value:e.value,"aria-label":e.ariaLabel,onChange:s=>{e.onChange(s.target.value)},children:e.options.map(s=>n.jsx("option",{value:s.value,disabled:s.disabled===!0,title:s.title,children:s.label},s.value))})}function w(e){return n.jsx("input",{className:"qqr-input",type:e.type??"text",value:e.value,placeholder:e.placeholder,inputMode:e.inputMode,autoComplete:e.autoComplete??"off",spellCheck:!1,"aria-label":e.ariaLabel,disabled:e.disabled===!0,onChange:s=>{e.onChange(s.target.value)}})}const pe="dsh-qq-relay-client-style",Qe=`/* dsh-qq-relay 配置页样式：全部走宿主 ui-theme 的 --dsw-* 语义 token，
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
		`;function Ge(){p.useEffect(()=>{if(document.getElementById(pe)!==null)return;const e=document.createElement("style");return e.id=pe,e.textContent=Qe,document.head.appendChild(e),()=>{e.remove()}},[])}const Je="/dsh-qq-relay/api/status",Ye="/dsh-qq-relay/api/config",$e="/dsh-qq-relay/api/reconnect",Ve="/dsh-qq-relay/api/rebind",Xe="/dsh-qq-relay/api/cleanup",Ze="/dsh-qq-relay/api/messages",es="/dsh-qq-relay/api/mapping/delete",ss="/dsh-qq-relay/api/mapping/clear",ns="/dsh-qq-relay/api/presets",rs="/dsh-qq-relay/api/presets/delete",ts="/dsh-qq-relay/api/comfy/test",as="/dsh-qq-relay/api/env",is="/dsh-qq-relay/api/env/action";function u(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}function ls(e){return Array.isArray(e)?e.filter(u).map(s=>({groupId:typeof s.groupId=="number"?s.groupId:0,pending:typeof s.pending=="number"?s.pending:0,lastBotSpeakAt:typeof s.lastBotSpeakAt=="number"?s.lastBotSpeakAt:0,lastReplyAt:typeof s.lastReplyAt=="number"?s.lastReplyAt:0,lastUserMessageAt:typeof s.lastUserMessageAt=="number"?s.lastUserMessageAt:0,cooldownUntil:typeof s.cooldownUntil=="number"?s.cooldownUntil:0,evaluating:s.evaluating===!0,dshBusy:s.dshBusy===!0})):[]}function os(e){return Array.isArray(e)?e.filter(u).map(s=>({messageId:typeof s.messageId=="string"?s.messageId:"",time:typeof s.time=="number"?s.time:0,name:typeof s.name=="string"?s.name:"",text:typeof s.text=="string"?s.text:"",mentionsSelf:s.mentionsSelf===!0,replyToId:typeof s.replyToId=="string"?s.replyToId:"",media:Array.isArray(s.media)?s.media.filter(u).map(r=>({kind:typeof r.kind=="string"?r.kind:"",status:typeof r.status=="string"?r.status:"",path:typeof r.path=="string"?r.path:""})):[]})):[]}function cs(e){return Array.isArray(e)?e.filter(u).map(s=>({groupId:typeof s.groupId=="number"?s.groupId:0,sessionId:typeof s.sessionId=="string"?s.sessionId:"",error:typeof s.error=="string"?s.error:"",at:typeof s.at=="number"?s.at:0})).filter(s=>s.sessionId!==""):[]}function ce(e){return Array.isArray(e)?e.filter(u).map(s=>{const r=u(s.model)?s.model:{};return{id:typeof s.id=="string"?s.id:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:"",persona:typeof s.persona=="string"?s.persona:"",model:{provider:typeof r.provider=="string"?r.provider:"",model:typeof r.model=="string"?r.model:"",reasoningEffort:typeof r.reasoningEffort=="string"?r.reasoningEffort:""},permissionPreset:typeof s.permissionPreset=="string"?s.permissionPreset:"",order:typeof s.order=="number"?s.order:100}}).filter(s=>s.id!==""):[]}function ds(e){if(!u(e)||!Array.isArray(e.groups))return null;const s=e.groups.filter(u).map(t=>({id:typeof t.id=="string"?t.id:"",name:typeof t.name=="string"?t.name:"",models:Array.isArray(t.models)?t.models.filter(u).map(i=>{const a=u(i.reasoning)?i.reasoning:null;return{id:typeof i.id=="string"?i.id:"",name:typeof i.name=="string"?i.name:"",description:typeof i.description=="string"?i.description:"",efforts:a!==null&&Array.isArray(a.efforts)?a.efforts.filter(u).map(l=>({id:typeof l.id=="string"?l.id:"",name:typeof l.name=="string"?l.name:"",description:typeof l.description=="string"?l.description:""})):[],defaultEffort:a!==null&&typeof a.defaultEffort=="string"?a.defaultEffort:""}}):[]})),r=u(e.default)?e.default:{};return{groups:s,default:{provider:typeof r.provider=="string"?r.provider:"",model:typeof r.model=="string"?r.model:"",reasoningEffort:typeof r.reasoningEffort=="string"?r.reasoningEffort:""}}}function us(e){return!u(e)||!Array.isArray(e.options)?null:{options:e.options.filter(u).map(s=>({value:typeof s.value=="string"?s.value:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:""})).filter(s=>s.value!==""),defaultPreset:typeof e.defaultPreset=="string"?e.defaultPreset:""}}function ps(e){return Array.isArray(e)?e.filter(u).map(s=>({id:typeof s.id=="string"?s.id:"",name:typeof s.name=="string"?s.name:"",description:typeof s.description=="string"?s.description:"",broken:typeof s.broken=="string"?s.broken:""})).filter(s=>s.id!==""):[]}function de(e){return u(e)?{running:typeof e.running=="number"?e.running:0,pending:typeof e.pending=="number"?e.pending:0}:{running:0,pending:0}}function hs(e){return u(e)?{enabled:e.enabled===!0,baseUrl:typeof e.baseUrl=="string"&&e.baseUrl!==""?e.baseUrl:"http://192.168.1.10:8188",timeoutMs:typeof e.timeoutMs=="number"?e.timeoutMs:3e4,skillEnabled:e.skillEnabled!==!1}:{enabled:!1,baseUrl:"http://192.168.1.10:8188",timeoutMs:3e4,skillEnabled:!0}}function fs(e){if(Array.isArray(e.skills))return e.skills.filter(u).map(t=>({name:typeof t.name=="string"?t.name:"",loaded:t.loaded===!0,error:typeof t.error=="string"?t.error:""})).filter(t=>t.name!=="");const s=u(e.skill)?e.skill:null;if(s===null)return[];const r=typeof s.name=="string"?s.name:"";return r===""?[]:[{name:r,loaded:s.loaded===!0,error:typeof s.error=="string"?s.error:""}]}function ms(e){return u(e)?{enabled:e.enabled===!0,baseUrl:typeof e.baseUrl=="string"?e.baseUrl:"",timeoutMs:typeof e.timeoutMs=="number"?e.timeoutMs:3e4,skillEnabled:e.skillEnabled!==!1,supported:e.supported===!0,reachable:e.reachable===!0,checking:e.checking===!0,checkedAt:typeof e.checkedAt=="number"?e.checkedAt:0,error:typeof e.error=="string"?e.error:"",version:typeof e.version=="string"?e.version:"",device:typeof e.device=="string"?e.device:"",queue:de(e.queue),skills:fs(e)}:{enabled:!1,baseUrl:"",timeoutMs:3e4,skillEnabled:!1,supported:!1,reachable:!1,checking:!1,checkedAt:0,error:"",version:"",device:"",queue:{running:0,pending:0},skills:[]}}function gs(e,s){return u(e)?{target:typeof e.target=="string"?e.target:s.baseUrl,reachable:e.reachable===!0,version:typeof e.version=="string"?e.version:"",device:typeof e.device=="string"?e.device:"",queue:de(e.queue),error:typeof e.error=="string"?e.error:"",checkedAt:typeof e.checkedAt=="number"?e.checkedAt:0,latencyMs:typeof e.latencyMs=="number"?e.latencyMs:0}:{target:s.baseUrl,reachable:s.reachable,version:s.version,device:s.device,queue:de(s.queue),error:s.error,checkedAt:s.checkedAt,latencyMs:0}}function bs(e){return u(e)?{enabled:e.enabled!==!1,dir:typeof e.dir=="string"&&e.dir!==""?e.dir:"~/napcat-docker",webuiTokenConfigured:e.webuiTokenConfigured===!0}:{enabled:!0,dir:"~/napcat-docker",webuiTokenConfigured:!1}}function xs(e){return Array.isArray(e)?e.filter(u).map(s=>({id:typeof s.id=="string"?s.id:"",title:typeof s.title=="string"?s.title:"",status:typeof s.status=="string"?s.status:"skip",detail:typeof s.detail=="string"?s.detail:"",evidence:Array.isArray(s.evidence)?s.evidence.filter(r=>typeof r=="string"):[],actions:Array.isArray(s.actions)?s.actions.filter(r=>typeof r=="string"):[]})).filter(s=>s.id!==""):[]}function qs(e){return Array.isArray(e)?e.filter(u).map(s=>({id:typeof s.id=="string"?s.id:"",title:typeof s.title=="string"?s.title:"",kind:typeof s.kind=="string"?s.kind:"none",confirm:s.confirm===!0,description:typeof s.description=="string"?s.description:""})).filter(s=>s.id!==""):[]}function ys(e){return Array.isArray(e)?e.filter(u).map(s=>({seq:typeof s.seq=="number"?s.seq:0,at:typeof s.at=="number"?s.at:0,level:typeof s.level=="string"?s.level:"info",text:typeof s.text=="string"?s.text:""})):[]}function js(e){const s=u(e)?e:{},r=Array.isArray(s.sequence)?s.sequence.filter(a=>typeof a=="string"):[],t=Array.isArray(s.titles)?s.titles.filter(a=>typeof a=="string"):[],i=u(s.next)?s.next:null;return{sequence:r,titles:t.length===r.length?t:r,needsConfirm:s.needsConfirm===!0,next:i===null?null:{id:typeof i.id=="string"?i.id:"",title:typeof i.title=="string"?i.title:"",status:typeof i.status=="string"?i.status:"",detail:typeof i.detail=="string"?i.detail:""}}}function he(e){if(!u(e))return null;const s=u(e.summary)?e.summary:{},r=u(e.running)?e.running:null,t=u(e.log)?e.log:{};return{supported:e.supported===!0,platform:typeof e.platform=="string"?e.platform:"",enabled:e.enabled!==!1,dir:typeof e.dir=="string"?e.dir:"",webuiTokenConfigured:e.webuiTokenConfigured===!0,checking:e.checking===!0,checkedAt:typeof e.checkedAt=="number"?e.checkedAt:0,running:r===null?null:{action:typeof r.action=="string"?r.action:"",startedAt:typeof r.startedAt=="number"?r.startedAt:0},summary:{ok:typeof s.ok=="number"?s.ok:0,warn:typeof s.warn=="number"?s.warn:0,error:typeof s.error=="number"?s.error:0,skip:typeof s.skip=="number"?s.skip:0},steps:xs(e.steps),fixPlan:js(e.fixPlan),actions:qs(e.actions),log:{cursor:typeof t.cursor=="number"?t.cursor:0,entries:ys(t.entries)}}}function Q(e){if(!u(e))return null;const s=u(e.config)?e.config:{},r=u(e.login)?e.login:null,t=u(e.lock)?e.lock:null,i=Array.isArray(e.mappings)?e.mappings.filter(u):[];return{plugin:typeof e.plugin=="string"?e.plugin:"dsh-qq-relay",started:e.started===!0,connected:e.connected===!0,login:r===null?null:{userId:typeof r.userId=="number"?r.userId:0,nickname:typeof r.nickname=="string"?r.nickname:""},problems:Array.isArray(e.problems)?e.problems.filter(a=>typeof a=="string"):[],lock:t===null?null:{pid:typeof t.pid=="number"?t.pid:0,startedAt:typeof t.startedAt=="number"?t.startedAt:0,host:typeof t.host=="string"?t.host:void 0},config:{wsUrl:typeof s.wsUrl=="string"?s.wsUrl:"",selfId:typeof s.selfId=="number"?s.selfId:0,groups:Array.isArray(s.groups)?s.groups.filter(a=>typeof a=="number"):[],workspace:typeof s.workspace=="string"?s.workspace:"",groupWorkspaces:u(s.groupWorkspaces)?Object.fromEntries(Object.entries(s.groupWorkspaces).filter(([a,l])=>/^\d+$/u.test(a)&&typeof l=="string"&&l!=="").map(([a,l])=>[a,l])):{},chatRetentionDays:typeof s.chatRetentionDays=="number"?s.chatRetentionDays:0,gate:u(s.gate)?{debounceMs:typeof s.gate.debounceMs=="number"?s.gate.debounceMs:5e3,fastMinReplyIntervalMs:typeof s.gate.fastMinReplyIntervalMs=="number"?s.gate.fastMinReplyIntervalMs:45e3,jevThreshold:typeof s.gate.jevThreshold=="number"?s.gate.jevThreshold:.7,model:typeof s.gate.model=="string"&&s.gate.model!==""?s.gate.model:"typesafe/jev-1.14",jevEndpoint:typeof s.gate.jevEndpoint=="string"&&s.gate.jevEndpoint!==""?s.gate.jevEndpoint:"https://openrouter.ai/api/alpha/decisions",jevApiKeyConfigured:s.gate.jevApiKeyConfigured===!0,jevApiKeySource:s.gate.jevApiKeySource==="env"?"env":s.gate.jevApiKeySource==="config"||s.gate.jevApiKeyConfigured===!0?"config":"none",jevApiKeyEnv:typeof s.gate.jevApiKeyEnv=="string"&&s.gate.jevApiKeyEnv!==""?s.gate.jevApiKeyEnv:"OPENROUTER_API_KEY"}:{debounceMs:5e3,fastMinReplyIntervalMs:45e3,jevThreshold:.7,model:"typesafe/jev-1.14",jevEndpoint:"https://openrouter.ai/api/alpha/decisions",jevApiKeyConfigured:!1,jevApiKeySource:"none",jevApiKeyEnv:"OPENROUTER_API_KEY"},gateSupported:u(s.gate),proxyReply:u(s.proxyReply)?{enabled:s.proxyReply.enabled===!0,targets:Array.isArray(s.proxyReply.targets)?s.proxyReply.targets.filter(a=>typeof a=="string"&&a!==""):[],silenceWindowMs:typeof s.proxyReply.silenceWindowMs=="number"?s.proxyReply.silenceWindowMs:600*1e3}:{enabled:!1,targets:[],silenceWindowMs:600*1e3},agentPreset:typeof s.agentPreset=="string"?s.agentPreset:"",persona:u(s.persona)?{enabled:s.persona.enabled===!0,text:typeof s.persona.text=="string"?s.persona.text:""}:{enabled:!1,text:""},comfy:hs(s.comfy),comfySupported:s.comfySupported===!0,environment:bs(s.environment),environmentSupported:u(s.environment),sessionTitle:typeof s.sessionTitle=="string"?s.sessionTitle:"",replyChunkSize:typeof s.replyChunkSize=="number"?s.replyChunkSize:0,commandPrefixes:Array.isArray(s.commandPrefixes)?s.commandPrefixes.filter(a=>typeof a=="string"):[],accessTokenConfigured:s.accessTokenConfigured===!0,accessTokenSource:s.accessTokenSource==="settings"?"settings":"profile"},agentPresets:u(e.agentPresets)?{supported:e.agentPresets.supported===!0,items:ps(e.agentPresets.items),missing:e.agentPresets.missing===!0}:{supported:!1,items:[],missing:!1},presets:ce(e.presets),presetService:u(e.presetService)?{supported:e.presetService.supported===!0,registered:Array.isArray(e.presetService.registered)?e.presetService.registered.filter(a=>typeof a=="string"):[]}:{supported:!1,registered:[]},modelCatalog:ds(e.modelCatalog),permissionCatalog:us(e.permissionCatalog),comfy:ms(e.comfy),gate:u(e.gate)?{enabled:e.gate.enabled===!0,classifier:typeof e.gate.classifier=="string"?e.gate.classifier:null,model:typeof e.gate.model=="string"?e.gate.model:"",threshold:typeof e.gate.threshold=="number"?e.gate.threshold:0,slowTimer:typeof e.gate.slowTimer=="number"?e.gate.slowTimer:0,pendingMessages:typeof e.gate.pendingMessages=="number"?e.gate.pendingMessages:0,pendingGroups:typeof e.gate.pendingGroups=="number"?e.gate.pendingGroups:0,timers:typeof e.gate.timers=="number"?e.gate.timers:0,queue:typeof e.gate.queue=="number"?e.gate.queue:0,sendQueue:typeof e.gate.sendQueue=="number"?e.gate.sendQueue:0,groups:ls(e.gate.groups)}:null,workspace:{attachIssues:u(e.workspace)?cs(e.workspace.attachIssues):[]},mappings:i.map(a=>({groupId:typeof a.groupId=="number"?a.groupId:0,sessionId:typeof a.sessionId=="string"?a.sessionId:"",title:typeof a.title=="string"?a.title:"",workspacePath:typeof a.workspacePath=="string"?a.workspacePath:"",createdAt:typeof a.createdAt=="number"?a.createdAt:0}))}}async function _(e,s,r){let t;try{t=await e(s,{cache:"no-store",...r})}catch(l){return{ok:!1,error:{code:"NETWORK",message:"连不上 host"+(l instanceof Error&&l.message!==""?"："+l.message:"")}}}let i=null;try{i=await t.json()}catch{i=null}if(u(i)&&i.ok===!0)return{ok:!0,value:i.value};const a=u(i)&&u(i.error)?i.error:null;return{ok:!1,error:{code:a!==null&&typeof a.code=="string"?a.code:"HTTP_"+String(t.status),message:a!==null&&typeof a.message=="string"&&a.message!==""?a.message:"请求失败（HTTP "+String(t.status)+"）。"}}}function O(){return{ok:!1,error:{code:"BAD_PAYLOAD",message:"host 返回了无法识别的数据。"}}}function qe(e){const s=e.fetch;async function r(i,a){const l=await _(s,i,a);if(!l.ok)return l;const o=Q(l.value);return o!==null?{ok:!0,value:o}:O()}const t=i=>({method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(i)});return{getStatus:()=>r(Je),saveConfig:i=>r(Ye,t(i)),reconnect:()=>r($e,{method:"POST"}),rebind:i=>r(Ve,t({groupId:i})),async cleanup(i){const a=await _(s,Xe,t({days:i}));if(!a.ok)return a;const l=a.value,o=u(l)?Q(l.status):null,b=u(l)&&u(l.cleanup)?l.cleanup:null;return o===null||b===null?O():{ok:!0,value:{cleanup:{days:typeof b.days=="number"?b.days:i,chat:typeof b.chat=="number"?b.chat:0,media:typeof b.media=="number"?b.media:0,at:typeof b.at=="number"?b.at:0},status:o}}},async messages(i,a){const l=new URLSearchParams({groupId:String(i)});typeof a=="number"&&Number.isFinite(a)&&l.set("limit",String(a));const o=await _(s,Ze+"?"+l.toString());return o.ok?u(o.value)?{ok:!0,value:{groupId:typeof o.value.groupId=="number"?o.value.groupId:i,limit:typeof o.value.limit=="number"?o.value.limit:0,windowMs:typeof o.value.windowMs=="number"?o.value.windowMs:0,messages:os(o.value.messages)}}:O():o},async savePreset(i){const a=await _(s,ns,t({preset:i}));if(!a.ok)return a;const l=a.value,o=u(l)?Q(l.status):null;return o===null||!u(l)?O():{ok:!0,value:{presets:ce(l.presets),status:o}}},async deletePreset(i){const a=await _(s,rs,t({id:i}));if(!a.ok)return a;const l=a.value,o=u(l)?Q(l.status):null;return o===null||!u(l)?O():{ok:!0,value:{presets:ce(l.presets),status:o}}},async getEnv(){const i=await _(s,as);if(!i.ok)return i;const a=he(i.value);return a!==null?{ok:!0,value:a}:O()},async envAction(i){const a={action:i.action};i.confirm===!0&&(a.confirm=!0);const l=await _(s,is,t(a));if(!l.ok)return l;const o=l.value,b=u(o)?he(o.status):null;return b===null||!u(o)?O():{ok:!0,value:{action:typeof o.action=="string"?o.action:i.action,status:b,logCursor:typeof o.logCursor=="number"?o.logCursor:0,accepted:o.accepted===!0,url:typeof o.url=="string"?o.url:void 0}}},async testComfy(i){const a={};typeof(i==null?void 0:i.baseUrl)=="string"&&i.baseUrl.trim()!==""&&(a.baseUrl=i.baseUrl.trim()),typeof(i==null?void 0:i.timeoutMs)=="number"&&Number.isFinite(i.timeoutMs)&&(a.timeoutMs=i.timeoutMs);const l=await _(s,ts,t(a));if(!l.ok)return l;const o=l.value,b=u(o)?Q(o.status):null;return b===null||!u(o)?O():{ok:!0,value:{probe:gs(o.probe,b.comfy),status:b}}},async deleteMapping(i){const a=await _(s,es,t({groupId:i}));if(!a.ok)return a;const l=a.value,o=u(l)?Q(l.status):null,b=u(l)&&u(l.mapping)?l.mapping:null;return o===null||b===null?O():{ok:!0,value:{mapping:{groupId:typeof b.groupId=="number"?b.groupId:i,removed:b.removed===!0},status:o}}},async clearMappings(){const i=await _(s,ss,{method:"POST"});if(!i.ok)return i;const a=i.value,l=u(a)?Q(a.status):null,o=u(a)&&u(a.mappings)?a.mappings:null;return l===null||o===null?O():{ok:!0,value:{mappings:{cleared:typeof o.cleared=="number"?o.cleared:0},status:l}}}}}function vs(){return{wsUrl:"",accessToken:"",selfId:"",groups:"",workspace:"",chatRetentionDays:"",gateDebounce:"",gateFastMinReplyInterval:"",gateJevThreshold:"",gateJevModel:"",gateJevEndpoint:"",gateJevApiKey:"",sessionTitle:"",replyChunkSize:"",commandPrefixes:"",proxyEnabled:!1,proxyTargets:"",proxySilenceWindow:"",agentPreset:"",personaEnabled:!1,personaText:"",comfyEnabled:!1,comfyBaseUrl:"",comfyTimeout:"30s",comfySkillEnabled:!0,envEnabled:!0,envDir:"",envWebuiToken:""}}function ye(e){return{wsUrl:e.wsUrl,accessToken:"",selfId:e.selfId>0?String(e.selfId):"",groups:e.groups.join(", "),workspace:e.workspace,chatRetentionDays:String(e.chatRetentionDays),gateDebounce:te(e.gate.debounceMs),gateFastMinReplyInterval:te(e.gate.fastMinReplyIntervalMs),gateJevThreshold:String(e.gate.jevThreshold),gateJevModel:e.gate.model,gateJevEndpoint:e.gate.jevEndpoint,gateJevApiKey:"",sessionTitle:e.sessionTitle,replyChunkSize:e.replyChunkSize>0?String(e.replyChunkSize):"",commandPrefixes:e.commandPrefixes.join(", "),proxyEnabled:e.proxyReply.enabled,proxyTargets:e.proxyReply.targets.join(", "),proxySilenceWindow:te(e.proxyReply.silenceWindowMs),agentPreset:e.agentPreset,personaEnabled:e.persona.enabled,personaText:e.persona.text,comfyEnabled:e.comfy.enabled,comfyBaseUrl:e.comfy.baseUrl,comfyTimeout:te(e.comfy.timeoutMs),comfySkillEnabled:e.comfy.skillEnabled,envEnabled:e.environment.enabled,envDir:e.environment.dir,envWebuiToken:""}}function te(e){return!Number.isFinite(e)||e<=0?"0s":e%(3600*1e3)===0?String(e/(3600*1e3))+"h":e%(60*1e3)===0?String(e/(60*1e3))+"m":e%1e3===0?String(e/1e3)+"s":String(e)+"ms"}function ue(e,s=Date.now()){if(!Number.isFinite(e)||e<=0)return"";const r=Math.max(0,s-e);return r<60*1e3?"刚刚":r<3600*1e3?Math.floor(r/(60*1e3))+" 分钟前":r<1440*60*1e3?Math.floor(r/(3600*1e3))+" 小时前":Math.floor(r/(1440*60*1e3))+" 天前"}function je(e){if(!Number.isFinite(e)||e<=0)return"--:--:--";const s=new Date(e),r=t=>String(t).padStart(2,"0");return r(s.getHours())+":"+r(s.getMinutes())+":"+r(s.getSeconds())}function X(e){const s=/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/iu.exec(e.trim());if(s===null)return null;const t={ms:1,s:1e3,m:60*1e3,h:3600*1e3}[s[2].toLowerCase()];if(t===void 0)return null;const i=Number(s[1]);return!Number.isFinite(i)||i<0?null:Math.round(i*t)}function ks(e){return e.split(/[,，\s]+/u).map(s=>s.trim()).filter(s=>s!=="")}function ws(e){const s=[],r=[];for(const t of ks(e)){if(!/^\d+$/u.test(t)){s.push("群号必须是数字："+t);continue}const i=Number(t);if(!Number.isSafeInteger(i)||i<=0){s.push("群号必须是正整数："+t);continue}r.includes(i)||r.push(i)}return s.length>0?{ok:!1,problems:s}:{ok:!0,value:r}}function Cs(e){const s=[],r=new Set;for(const t of e.split(/[,，]/u)){const i=t.trim().replace(/^@/u,"").trim();if(i==="")continue;const a=i.toLowerCase();r.has(a)||(r.add(a),s.push(i))}return s}function Ns(e){return{ok:!0,value:e.split(/[,，]/u).map(r=>r.trim()).filter(r=>r!=="")}}function Ss(e){const s=[],r={},t=e.wsUrl.trim();t===""||(/^wss?:\/\//u.test(t)?r.wsUrl=t:s.push("wsUrl 必须是 ws:// 或 wss:// 地址")),e.accessToken.trim()!==""&&(r.accessToken=e.accessToken.trim());const i=e.selfId.trim();i===""||(!/^\d+$/u.test(i)||Number(i)<=0?s.push("selfId 必须是正整数"):r.selfId=Number(i));const a=ws(e.groups);a.ok?r.groups=a.value:s.push(...a.problems);const l=e.workspace.trim();l===""?s.push("workspace 必填"):r.workspace=l;const o=e.chatRetentionDays.trim(),b=o===""?"0":o,j=Number(b);!/^\d+$/u.test(b)||!Number.isInteger(j)||!(j===0||j>=7&&j<=3650)?s.push("聊天记录保留天数必须是 0（永不自动删除）或 7..3650 的整数"):r.chatRetentionDays=j;const C=e.sessionTitle.trim();C===""?s.push("sessionTitle 必填"):r.sessionTitle=C;const m=e.replyChunkSize.trim(),k=Number(m);!/^\d+$/u.test(m)||!Number.isInteger(k)||k<100||k>2e4?s.push("replyChunkSize 必须是 100..20000 的整数"):r.replyChunkSize=k;const v=Ns(e.commandPrefixes);r.commandPrefixes=v.value;const h=Cs(e.proxyTargets);e.proxyEnabled&&h.length===0&&s.push("开启代答时至少要填一个目标（QQ 号或群名片 / 昵称）");const N=e.proxySilenceWindow.trim(),q=X(N);q===null||q>1440*60*1e3?s.push("代答沉默窗口必须是 0..24h 的时长（如 10m / 30m；0s = 总是代答）"):r.proxyReply={enabled:e.proxyEnabled,targets:h,silenceWindow:N};const P=e.agentPreset.trim();r.agentPreset=P;const H=e.personaText.trim();e.personaEnabled&&H===""&&s.push("开启轻量人设时至少要填一段人设文本"),H.length>4e3&&s.push("轻量人设最多 4000 字符"),r.persona={enabled:e.personaEnabled,text:H};const F=e.comfyBaseUrl.trim();F===""&&s.push("ComfyUI 服务地址必填（如 http://192.168.1.10:8188）");const B=e.comfyTimeout.trim(),d=X(B);d===null||d<3e3||d>12e4?s.push("ComfyUI 超时必须是 3s..120s 的时长（如 30s）"):F!==""&&(r.comfy={enabled:e.comfyEnabled,baseUrl:F,timeoutMs:d,skillEnabled:e.comfySkillEnabled});const D=e.envDir.trim();if(D===""?s.push("环境目录必填（默认 ~/napcat-docker）"):D!=="~"&&!D.startsWith("~/")&&!D.startsWith("/")?s.push("环境目录必须是绝对路径或 ~/ 开头"):D.split("/").includes("..")&&s.push("环境目录不能包含 .."),D!==""&&!s.some(J=>J.startsWith("环境目录"))){const J={enabled:e.envEnabled,dir:D},ne=e.envWebuiToken.trim();ne!==""&&(J.webuiToken=ne),r.environment=J}const M={},ee=e.gateDebounce.trim(),z=X(ee);z===null||z>60*1e3?s.push("去抖窗口必须是 0..60s 的时长（如 3s / 500ms）"):M.debounce=ee;const se=e.gateFastMinReplyInterval.trim(),K=X(se);K===null||K>3600*1e3?s.push("最小发言间隔必须是 0..60m 的时长（如 10s / 45s）"):M.fastMinReplyInterval=se;const S=e.gateJevThreshold.trim(),L=Number(S);S===""||!Number.isFinite(L)||L<0||L>1?s.push("jev 阈值必须是 0..1 的数字（如 0.7）"):M.jevThreshold=L;const Y=e.gateJevModel.trim();Y===""?s.push("jev 模型 id 必填（默认 typesafe/jev-1.14）"):Y.length>200?s.push("jev 模型 id 最多 200 字符"):M.model=Y;const G=e.gateJevEndpoint.trim();G===""?s.push("jev 分类器地址必填（默认 https://openrouter.ai/api/alpha/decisions）"):/^https:\/\//iu.test(G)?G.length>300?s.push("jev 分类器地址最多 300 字符"):M.jevEndpoint=G:s.push("jev 分类器地址必须是 https:// 地址");const $=e.gateJevApiKey.trim();return $.length>256?s.push("OpenRouter API key 最多 256 字符"):$!==""&&(M.jevApiKey=$),r.gate=M,s.length>0?{ok:!1,problems:s}:{ok:!0,value:r}}function Is(e,s){const r=ye(s);return Object.keys(r).some(t=>e[t]!==r[t])}function ae(){return{id:"",name:"",description:"",persona:"",provider:"",model:"",reasoningEffort:"",permissionPreset:"",order:"100"}}function Ts(e){return{id:e.id,name:e.name,description:e.description,persona:e.persona,provider:e.model.provider,model:e.model.model,reasoningEffort:e.model.reasoningEffort,permissionPreset:e.permissionPreset,order:String(e.order)}}function As(e){const s=[],r=e.id.trim();/^[a-z0-9][a-z0-9-]{0,40}$/u.test(r)||s.push("预设 id 只能用小写字母 / 数字 / 连字符，且不超过 41 字符");const t=e.name.trim();t===""&&s.push("预设名称必填");const i=e.persona.trim();i===""&&s.push("人设文本必填"),i.length>4e3&&s.push("人设文本最多 4000 字符");const a=e.provider.trim(),l=e.model.trim();a===""!=(l==="")&&s.push("模型必须同时选 provider 与 model（或都留空）");const o=e.order.trim()===""?"100":e.order.trim(),b=Number(o);return(!/^\d+$/u.test(o)||!Number.isInteger(b)||b<1||b>1e4)&&s.push("预设排序必须是 1..10000 的整数"),s.length>0?{ok:!1,problems:s}:{ok:!0,value:{id:r,name:t,description:e.description.trim(),persona:i,model:{provider:a,model:l,reasoningEffort:a===""?"":e.reasoningEffort.trim()},permissionPreset:e.permissionPreset.trim(),order:b}}}function ve(e){const s=new Map,r=t=>{let i=s.get(t);return i===void 0&&(i={groupId:t,sessionId:"",sessionTitle:"",projectDir:""},s.set(t,i)),i};for(const t of e.config.groups)r(t);for(const[t,i]of Object.entries(e.config.groupWorkspaces)){const a=Number(t);!Number.isSafeInteger(a)||a<=0||(r(a).projectDir=i)}for(const t of e.mappings){const i=r(t.groupId);i.sessionId=t.sessionId,i.sessionTitle=t.title}return[...s.values()].sort((t,i)=>t.groupId-i.groupId)}function Es(e){const s={};for(const r of e){const t=r.projectDir.trim();t!==""&&(s[String(r.groupId)]=t)}return s}function Ps(e,s){const r=new Map(ve(s).map(t=>[t.groupId,t.projectDir]));return e.some(t=>(r.get(t.groupId)??"")!==t.projectDir.trim())}const R=qe({fetch:(e,s)=>globalThis.fetch(e,s)}),Ms=[{id:"connection",label:"连接"},{id:"env",label:"环境"},{id:"project",label:"项目"},{id:"behavior",label:"行为"},{id:"comfy",label:"画图 / 视频"},{id:"presets",label:"预设"},{id:"records",label:"记录"}];function W(e){return e.ok?"":e.error.message}function Us(e){if(e===null)return{tone:"muted",text:"加载中…"};if(!e.started)return e.lock!==null?{tone:"warn",text:"未启动：另一个实例（pid "+String(e.lock.pid)+"）正在运行"}:e.problems.length>0?{tone:"error",text:"未启动：配置待补全"}:{tone:"muted",text:"未启动（等待宿主就绪）"};if(e.connected){const s=e.login;return{tone:"ok",text:"已连接（"+(s!==null&&(s.nickname!==""||s.userId>0)?"QQ "+(s.nickname!==""?s.nickname:String(s.userId)):String(e.config.selfId))+"）"}}return{tone:"warn",text:"连接中…（断线自动重连）"}}function Ds(e){return e===null?"保存后生效":e.config.accessTokenConfigured?"已配置（来源："+(e.config.accessTokenSource==="settings"?"配置页保存值":"profile patch / 环境变量")+"）；留空表示不修改":"未配置；建议在 profile patch 里用 !!js 从环境变量读取"}function Ls(e){if(e===null)return{tone:"muted",text:"闸门状态读取中…"};if(!e.config.gateSupported)return{tone:"warn",text:"宿主还是旧版本（未加载支持闸门配置的版本）：下面参数暂时不会生效，重启该 profile 的 GUI 后再保存。"};const s=e.gate;return s===null?{tone:"muted",text:"闸门状态读取中…"}:s.enabled?s.classifier===null?{tone:"warn",text:"闸门已开启，但分类器未就绪：普通群消息不会接话（@ / 引用 / 命令仍直通）。"}:{tone:"ok",text:"闸门已开启 · 分类器 "+s.classifier+" · 阈值 "+String(s.threshold)+"；保存后立即重建闸门。"}:{tone:"muted",text:"闸门当前关闭（gate.enabled 来自 profile patch）：下面的参数会保存，开启后才生效。"}}function Rs(e){if(e===null)return{tone:"muted",text:"画图 / 视频状态读取中…"};const s=e.comfy;if(!s.enabled)return{tone:"muted",text:"画图 / 视频能力已关闭"};if(s.checking)return{tone:"muted",text:"正在检查 ComfyUI…"};if(!s.reachable)return{tone:"warn",text:"ComfyUI 连不上："+(s.error!==""?s.error:"尚未检查")};if(!s.supported)return{tone:"warn",text:"宿主没有 skills 服务，画图 / 视频 skill 无法加载"};const r=s.version!==""?s.version:"未知版本",t=s.skills.length;if(t===0)return{tone:"ok",text:"ComfyUI "+r+" 可用 · skill 状态未知"};const i=s.skills.filter(a=>a.loaded).map(a=>a.name);return i.length===t?{tone:"ok",text:"ComfyUI "+r+" 可用 · 已加载 "+i.join(" / ")}:i.length===0?{tone:"warn",text:"ComfyUI "+r+" 可用 · "+String(t)+" 个 skill 都未加载"}:{tone:"warn",text:"ComfyUI "+r+" 可用 · "+String(i.length)+"/"+String(t)+" 个 skill 已加载"}}const Ws={busy:!1,error:null,result:null},ie={groupId:null,items:[],busy:!1,error:null,windowMs:0};function Hs(){const[e,s]=p.useState(null),[r,t]=p.useState(vs),[i,a]=p.useState([]),[l,o]=p.useState(!0),[b,j]=p.useState(!1),[C,m]=p.useState(null),[k,v]=p.useState(null),[h,N]=p.useState("connection"),[q,P]=p.useState(ie),[H,F]=p.useState([]),[B,d]=p.useState(ae),[D,M]=p.useState(null),[ee,z]=p.useState(!1),[se,K]=p.useState(Ws),S=p.useCallback((c,f)=>{s(c),F(c.presets),f&&(t(ye(c.config)),a(ve(c)))},[]),L=p.useCallback(async(c,f=!0)=>{const g=await R.getStatus();o(!1),g.ok?(S(g.value,c),c&&f&&m(null)):f&&m(W(g))},[S]);p.useEffect(()=>{L(!0)},[L]),p.useEffect(()=>{const c=setInterval(()=>{L(!1,!1)},5e3);return()=>clearInterval(c)},[L]);const Y=p.useCallback((c,f)=>{t(g=>({...g,[c]:f}))},[]),G=p.useCallback(c=>{t(f=>({...f,proxyEnabled:c}))},[]),$=p.useCallback(c=>{t(f=>({...f,personaEnabled:c}))},[]),J=p.useCallback(c=>{t(f=>({...f,comfyEnabled:c}))},[]),ne=p.useCallback(c=>{t(f=>({...f,comfySkillEnabled:c}))},[]),ke=p.useCallback(c=>{t(f=>({...f,envEnabled:c}))},[]),we=p.useCallback((c,f)=>{a(g=>g.map(T=>T.groupId===c?{...T,projectDir:f}:T))},[]),Ce=p.useCallback(()=>{L(!0)},[L]),Ne=p.useCallback(async()=>{const c=Ss(r);if(!c.ok){v(null),m(c.problems.join("；"));return}const f=Es(i);j(!0),m(null),v(null);const g=await R.saveConfig({...c.value,groupWorkspaces:f});j(!1),g.ok?(S(g.value,!0),v(g.value.problems.length>0?"已保存（OneBot 连接信息还没配全，relay 暂不启动）。":"已保存并重建连接。")):m(W(g))},[r,i,S]),Se=p.useCallback(async()=>{j(!0),m(null),v(null);const c=await R.reconnect();j(!1),c.ok?(S(c.value,!1),v("已请求重新连接。")):m(W(c))},[S]),Ie=p.useCallback(async c=>{const f=globalThis.confirm;if(typeof f=="function"&&!f("重新绑定群 "+String(c)+`？
		会删除该群现有会话映射，下次消息按当前项目目录新建会话；旧项目里的聊天记录不会移动。`))return;j(!0),m(null),v(null);const g=await R.rebind(c);j(!1),g.ok?(S(g.value,!0),v("已重新绑定：下一条消息会按新项目建会话。")):m(W(g))},[S]),re=p.useCallback(async c=>{P(g=>({...g,groupId:c,busy:!0,error:null}));const f=await R.messages(c,20);f.ok?P({groupId:c,items:f.value.messages,busy:!1,error:null,windowMs:f.value.windowMs}):P({groupId:c,items:[],busy:!1,error:W(f),windowMs:0})},[]),Te=p.useCallback(c=>{re(c)},[re]),Ae=p.useCallback(()=>{P(ie)},[]),Ee=p.useCallback(()=>{q.groupId!==null&&re(q.groupId)},[re,q.groupId]),Pe=p.useCallback(async c=>{const f=globalThis.confirm;if(typeof f=="function"&&!f("解除群 "+String(c)+` 的会话绑定？
		旧会话保留在 GUI；下一条群消息会按当前项目目录新建会话。`))return;j(!0),m(null),v(null);const g=await R.deleteMapping(c);j(!1),g.ok?(S(g.value.status,!0),v(g.value.mapping.removed?"已解除群 "+String(c)+" 的会话绑定。":"群 "+String(c)+" 本来没有绑定。"),P(T=>T.groupId===c?ie:T)):m(W(g))},[S]),Me=p.useCallback(async()=>{const c=e===null?0:e.mappings.length;if(c===0)return;const f=globalThis.confirm;if(typeof f=="function"&&!f("清空全部 "+String(c)+` 条群映射？
		旧会话保留在 GUI；之后每个群的下一条消息都会重新建会话。`))return;j(!0),m(null),v(null);const g=await R.clearMappings();j(!1),g.ok?(S(g.value.status,!0),v("已清空 "+String(g.value.mappings.cleared)+" 条群映射。"),P(ie)):m(W(g))},[S,e]),Ue=p.useCallback(async()=>{const c=Number(r.chatRetentionDays.trim()===""?"0":r.chatRetentionDays.trim());if(!Number.isInteger(c)||c<1||c>3650){v(null),m("立即清理需要先在「保留天数」里填 1..3650 的整数（0 = 永不删除，不能清理）。");return}const f=globalThis.confirm;if(typeof f=="function"&&!f("立即清理超过 "+String(c)+` 天的聊天记录与媒体文件？
		删除后不可恢复；群映射与会话不受影响。`))return;j(!0),m(null),v(null);const g=await R.cleanup(c);if(j(!1),g.ok){const{cleanup:T,status:oe}=g.value;S(oe,!1),v("已清理：聊天记录 "+String(T.chat)+" 个文件、媒体 "+String(T.media)+" 个日期目录（保留 "+String(T.days)+" 天）。")}else m(W(g))},[r.chatRetentionDays,S]),De=p.useCallback(async()=>{const c=r.comfyBaseUrl.trim(),f=X(r.comfyTimeout.trim());if(f===null||f<3e3||f>12e4){K({busy:!1,error:"ComfyUI 超时必须是 3s..120s 的时长（如 30s）",result:null});return}K(oe=>({...oe,busy:!0,error:null}));const g={timeoutMs:f};c!==""&&(g.baseUrl=c);const T=await R.testComfy(g);T.ok?(S(T.value.status,!1),K({busy:!1,error:null,result:T.value.probe})):K({busy:!1,error:W(T),result:null})},[r.comfyBaseUrl,r.comfyTimeout,S]),Le=p.useCallback(()=>{M(""),d(ae()),m(null),v(null)},[]),Re=p.useCallback(c=>{const f=H.find(g=>g.id===c);f!==void 0&&(M(c),d(Ts(f)),m(null),v(null))},[H]),We=p.useCallback((c,f)=>{d(g=>({...g,[c]:f}))},[]),le=p.useCallback(()=>{M(null),d(ae()),m(null)},[]),He=p.useCallback(async()=>{const c=As(B);if(!c.ok){v(null),m(c.problems.join("；"));return}z(!0),m(null),v(null);const f=await R.savePreset(c.value);z(!1),f.ok?(S(f.value.status,!1),F(f.value.presets),M(null),d(ae()),v("预设已保存；新注册的 preset 对新会话生效。")):m(W(f))},[B,S]),_e=p.useCallback(async c=>{const f=globalThis.confirm;if(typeof f=="function"&&!f("删除预设「"+c+`」？
		已使用该预设的旧会话保留原组合；之后新建的会话不能再选它。`))return;z(!0),m(null),v(null);const g=await R.deletePreset(c);z(!1),g.ok?(S(g.value.status,!1),F(g.value.presets),D===c&&le(),v("已删除预设「"+c+"」。")):m(W(g))},[S,D,le]),Oe=p.useMemo(()=>e!==null&&(Is(r,e.config)||Ps(i,e)),[r,i,e]),Fe=p.useMemo(()=>Us(e),[e]),Be=p.useMemo(()=>Ls(e),[e]),ze=p.useMemo(()=>Rs(e),[e]),Ke=p.useMemo(()=>Ds(e),[e]);return{status:e,form:r,projectRows:i,loading:l,busy:b,error:C,notice:k,tab:h,dirty:Oe,statusLine:Fe,tokenHint:Ke,gateLine:Be,comfyLine:ze,comfyProbe:se,messages:q,setTab:N,updateField:Y,setProxyEnabled:G,setPersonaEnabled:$,setComfyEnabled:J,setComfySkillEnabled:ne,setEnvEnabled:ke,testComfy:()=>{De()},updateProjectRow:we,refresh:Ce,save:()=>{Ne()},reconnect:()=>{Se()},rebind:c=>{Ie(c)},deleteMapping:c=>{Pe(c)},clearMappings:()=>{Me()},cleanup:()=>{Ue()},openMessages:Te,closeMessages:Ae,reloadMessages:Ee,presets:H,presetDraft:B,presetEditingId:D,presetBusy:ee,newPreset:Le,editPreset:Re,updatePresetDraft:We,cancelPresetEdit:le,savePreset:()=>{He()},deletePreset:c=>{_e(c)}}}function _s({model:e}){var r;const s=((r=e.status)==null?void 0:r.gate)??null;return s===null||s.groups.length===0?null:n.jsx(E,{children:n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"闸门实时状态"}),n.jsxs("p",{className:"qqr-hint",children:["待评估 ",s.pendingMessages," 条 / ",s.pendingGroups," 群 · 活动定时器 ",s.timers," · ","待派发 ",s.queue," · 待发送 ",s.sendQueue]}),n.jsx("div",{className:"qqr-scroll",children:n.jsxs("table",{className:"qqr-table",children:[n.jsx("thead",{children:n.jsxs("tr",{children:[n.jsx("th",{className:"qqr-th",children:"群号"}),n.jsx("th",{className:"qqr-th",children:"待评估"}),n.jsx("th",{className:"qqr-th",children:"最近发言"}),n.jsx("th",{className:"qqr-th",children:"冷却"}),n.jsx("th",{className:"qqr-th",children:"状态"})]})}),n.jsx("tbody",{children:s.groups.map(t=>n.jsxs("tr",{children:[n.jsx("td",{className:"qqr-td",children:t.groupId}),n.jsx("td",{className:"qqr-td",children:t.pending}),n.jsx("td",{className:"qqr-td",children:ue(t.lastBotSpeakAt)||"未发言"}),n.jsx("td",{className:"qqr-td",children:t.cooldownUntil>Date.now()?"冷却至 "+je(t.cooldownUntil):"—"}),n.jsx("td",{className:"qqr-td",children:t.dshBusy?"忙（有轮次在跑）":t.evaluating?"评估中":"空闲"})]},t.groupId))})]})})]})})}function Os({model:e}){var C,m,k,v;const{form:s,updateField:r}=e,t=((C=e.status)==null?void 0:C.agentPresets)??null,i=(t==null?void 0:t.items)??[],a=[{value:"",label:"不指定（跟随 DSH 默认）"},...i.map(h=>({value:h.id,label:(h.name!==""?h.name:h.id)+(h.broken!==""?"（不可用）":""),disabled:h.broken!=="",title:h.broken!==""?h.broken:h.description}))];s.agentPreset!==""&&!i.some(h=>h.id===s.agentPreset)&&a.push({value:s.agentPreset,label:s.agentPreset+"（不在名册中）",disabled:!1});const l=((m=e.status)==null?void 0:m.config.gate)??null,o=(l==null?void 0:l.jevApiKeySource)??"none",b=o==="env"?"当前来自环境变量 "+((l==null?void 0:l.jevApiKeyEnv)??"OPENROUTER_API_KEY"):o==="config"?"当前来自本页保存的配置":"当前未配置",j=t===null||!t.supported?n.jsx(I,{tone:"warn",children:"当前宿主没有提供 agent preset 服务（可能版本过旧或不是 Web bundle）：预设选择不会生效，轻量人设仍可用。"}):t.missing?n.jsx(I,{tone:"warn",children:"配置里的预设不在当前名册里：下次建会话会退回 DSH 默认预设。"}):null;return n.jsxs("div",{className:"qqr-panel",children:[n.jsxs(E,{children:[n.jsx(x,{label:"回发文本切分上限",hint:"100..20000 字符；超长回复按此切分成多条",children:n.jsx(w,{value:s.replyChunkSize,onChange:h=>{r("replyChunkSize",h)},inputMode:"numeric",ariaLabel:"回发文本切分上限"})}),n.jsx(x,{label:"直通命令前缀",hint:"逗号分隔；群消息以此开头时绕过闸门直接进 DSH",children:n.jsx(w,{value:s.commandPrefixes,onChange:h=>{r("commandPrefixes",h)},placeholder:"/dsh",ariaLabel:"直通命令前缀"})})]}),n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"消息闸门"}),n.jsx(I,{tone:e.gateLine.tone==="ok"?"ok":e.gateLine.tone==="warn"?"warn":"muted",children:e.gateLine.text})]}),n.jsx(x,{label:"普通消息去抖窗口",hint:"同一波消息合并等待，0..60s（如 3s / 500ms）",children:n.jsx(w,{value:s.gateDebounce,onChange:h=>{r("gateDebounce",h)},placeholder:"5s",ariaLabel:"普通消息去抖窗口"})}),n.jsx(x,{label:"最小发言间隔",hint:"距上次发言不足该间隔时延后评估，0..60m（如 10s / 45s）",children:n.jsx(w,{value:s.gateFastMinReplyInterval,onChange:h=>{r("gateFastMinReplyInterval",h)},placeholder:"45s",ariaLabel:"最小发言间隔"})}),n.jsx(x,{label:"jev 接话阈值",hint:"0..1；越高越保守（默认 0.7）",children:n.jsx(w,{value:s.gateJevThreshold,onChange:h=>{r("gateJevThreshold",h)},inputMode:"decimal",placeholder:"0.7",ariaLabel:"jev 接话阈值"})}),n.jsx(x,{label:"jev 模型 id",hint:"决策模型 id（默认 typesafe/jev-1.14）；指向兼容代理时填对方的模型名",children:n.jsx(w,{value:s.gateJevModel,onChange:h=>{r("gateJevModel",h)},placeholder:"typesafe/jev-1.14",ariaLabel:"jev 模型 id"})}),n.jsx(x,{label:"jev 分类器地址",hint:"Decisions API 地址，必须 https（默认 OpenRouter；可指向兼容代理）",children:n.jsx(w,{value:s.gateJevEndpoint,onChange:h=>{r("gateJevEndpoint",h)},placeholder:"https://openrouter.ai/api/alpha/decisions",ariaLabel:"jev 分类器地址"})}),n.jsx(x,{label:"OpenRouter API key",hint:"只写不读；留空表示不修改。地址 / 模型 / key / 阈值保存后都立即热切换（不用重启）",children:n.jsx(w,{value:s.gateJevApiKey,onChange:h=>{r("gateJevApiKey",h)},type:"password",autoComplete:"new-password",placeholder:l!=null&&l.jevApiKeyConfigured?"已配置；留空表示不修改":"未配置",ariaLabel:"OpenRouter API key"})}),n.jsxs(I,{tone:o==="none"?(v=(k=e.status)==null?void 0:k.gate)!=null&&v.enabled?"warn":"muted":"ok",children:["jev API key：",b,"；不填时继续用环境变量兜底。"]})]}),n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"角色与人设"}),n.jsx("p",{className:"qqr-hint",children:"所有群共用一个 DSH agent preset；切换后只影响之后新建的会话（群里发 /new，或到「项目」页点「重新绑定」）。 下拉包含 DSH 内置预设和「预设」页里插件管理的预设（自带一个「QQ 群聊」）。"}),j]}),n.jsx(x,{label:"默认 Agent 预设",hint:"空 = 跟随 DSH 默认；preset 在会话创建时固定",children:n.jsx(V,{value:s.agentPreset,onChange:h=>{r("agentPreset",h)},options:a,ariaLabel:"默认 Agent 预设"})}),n.jsx(x,{label:"启用轻量人设",hint:"每轮 prompt 前注入；默认关闭；不依赖 profile 改动",children:n.jsx(Z,{checked:s.personaEnabled,onChange:e.setPersonaEnabled,ariaLabel:"启用轻量人设"})}),n.jsxs(y,{children:[n.jsx(xe,{value:s.personaText,onChange:h=>{r("personaText",h)},placeholder:"例如：你是群里的猫娘助手，说话带「喵」，可以偶尔发一个表情。",rows:4,ariaLabel:"轻量人设文本"}),n.jsx("p",{className:"qqr-hint",children:"人设文本最多 4000 字符，开启时不能为空；它叠加在系统提示词里的预设人设之上，适合补群内角色设定。 平台约定（最终回复自动回发、不要用 qq_send 往本群发）始终会附在 prompt 末尾。"})]})]}),n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"代答（@ 特定的人）"}),n.jsx("p",{className:"qqr-hint",children:"开启后，群里有人 @ 名单里的人、且 TA 最近没在本群说话时，机器人代 TA 回应（默认关闭）。 名单之外的 @ 别人消息只记聊天记录，不会触发会话。"})]}),n.jsx(x,{label:"开启代答",hint:"默认关闭；开启时下面至少填一个目标",children:n.jsx(Z,{checked:s.proxyEnabled,onChange:e.setProxyEnabled,ariaLabel:"开启代答"})}),n.jsx(x,{label:"代答目标",hint:"QQ 号或群名片 / 昵称，逗号分隔（如 10003, 群主）",children:n.jsx(w,{value:s.proxyTargets,onChange:h=>{r("proxyTargets",h)},placeholder:"10003, 群主",ariaLabel:"代答目标"})}),n.jsx(x,{label:"沉默窗口",hint:"TA 多久没在本群发言才代答；0s = 总是代答（如 10m / 30m）",children:n.jsx(w,{value:s.proxySilenceWindow,onChange:h=>{r("proxySilenceWindow",h)},placeholder:"10m",ariaLabel:"代答沉默窗口"})})]}),n.jsx(_s,{model:e})]})}const Fs={"comfy-image":"出图","comfy-video":"视频"};function Bs(e){const s=Fs[e];return s===void 0?e:e+"（"+s+"）"}function U({label:e,value:s}){return n.jsxs("tr",{children:[n.jsx("td",{className:"qqr-td",children:e}),n.jsx("td",{className:"qqr-td",children:s})]})}function zs({model:e}){const{form:s,updateField:r,status:t,comfyProbe:i}=e,a=(t==null?void 0:t.comfy)??null,l=i.result,o=t!==null&&!t.config.comfySupported?n.jsx(I,{tone:"warn",children:"宿主版本较旧，需重启该 profile 的 GUI 后此页才生效。"}):null,b=l===null?null:n.jsx("div",{className:"qqr-scroll",children:n.jsxs("table",{className:"qqr-table",children:[n.jsx("thead",{children:n.jsxs("tr",{children:[n.jsx("th",{className:"qqr-th",children:"项目"}),n.jsx("th",{className:"qqr-th",children:"结果"})]})}),n.jsxs("tbody",{children:[n.jsx(U,{label:"目标地址",value:l.target!==""?l.target:"（空）"}),n.jsx(U,{label:"可达",value:l.reachable?"是":"否"}),n.jsx(U,{label:"ComfyUI 版本",value:l.version!==""?l.version:"未知"}),n.jsx(U,{label:"GPU",value:l.device!==""?l.device:"未知"}),n.jsx(U,{label:"队列",value:String(l.queue.running)+" 运行 / "+String(l.queue.pending)+" 等待"}),n.jsx(U,{label:"延迟",value:String(l.latencyMs)+" ms"}),n.jsx(U,{label:"错误",value:l.error!==""?l.error:"—"})]})]})}),j=a===null?n.jsx(y,{children:n.jsx("p",{className:"qqr-empty",children:"状态读取中…"})}):a.enabled?n.jsx("div",{className:"qqr-scroll",children:n.jsxs("table",{className:"qqr-table",children:[n.jsx("thead",{children:n.jsxs("tr",{children:[n.jsx("th",{className:"qqr-th",children:"项目"}),n.jsx("th",{className:"qqr-th",children:"状态"})]})}),n.jsxs("tbody",{children:[n.jsx(U,{label:"可达",value:a.reachable?"是":"否"}),n.jsx(U,{label:"ComfyUI 版本",value:a.version!==""?a.version:"未知"}),n.jsx(U,{label:"设备",value:a.device!==""?a.device:"未知"}),n.jsx(U,{label:"队列",value:String(a.queue.running)+" 运行 / "+String(a.queue.pending)+" 等待"}),n.jsx(U,{label:"最近检查",value:ue(a.checkedAt)!==""?ue(a.checkedAt):"尚未检查"}),a.skills.length===0?n.jsxs("tr",{children:[n.jsx("td",{className:"qqr-td",children:"skill"}),n.jsx("td",{className:"qqr-td",children:n.jsx("span",{className:"qqr-hint",children:"宿主没有返回 skill 状态（旧版 host？）"})})]}):a.skills.map(k=>n.jsxs("tr",{children:[n.jsx("td",{className:"qqr-td",children:Bs(k.name)}),n.jsxs("td",{className:"qqr-td",children:[k.loaded?"已加载":"未加载",k.error!==""?n.jsx("span",{className:"qqr-hint qqr-mono-block",children:k.error}):null]})]},k.name))]})]})}):n.jsx(y,{children:n.jsx("p",{className:"qqr-empty",children:"画图 / 视频能力已关闭；启用并保存后显示运行状态。"})}),C=a===null?[]:a.skills.filter(k=>!k.loaded),m=a!==null&&a.enabled&&a.reachable&&C.length>0?a.skillEnabled?n.jsx(I,{tone:"warn",children:"有 skill 尚未加载："+C.map(k=>k.name).join(" / ")+"；保存配置或重启该 profile 的 GUI 后，host 连上 ComfyUI 会重新注册。"}):n.jsx(I,{tone:"muted",children:"画图 / 视频能力已开启，但「连接成功后加载 skill」是关闭的：打开上面的开关并保存后才会加载。"}):null;return n.jsxs("div",{className:"qqr-panel",children:[n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"ComfyUI 服务（出图 / 视频）"}),n.jsxs("p",{className:"qqr-hint",children:["host 在启用后定期探测这个地址（约 1 分钟一次）；连接成功后为 DSH 加载",n.jsx("code",{children:" comfy-image "}),"（出图）与",n.jsx("code",{children:" comfy-video "}),"（视频）两个 skill， 关闭画图 / 视频会注销它们。"]}),o]}),n.jsx(x,{label:"启用画图 / 视频",hint:"关闭时不探测，也不加载画图 / 视频 skill",children:n.jsx(Z,{checked:s.comfyEnabled,onChange:e.setComfyEnabled,ariaLabel:"启用画图 / 视频"})}),n.jsx(x,{label:"服务地址",hint:"ComfyUI HTTP 地址（无鉴权，只填可信网络里的地址）",children:n.jsx(w,{value:s.comfyBaseUrl,onChange:k=>{r("comfyBaseUrl",k)},placeholder:"http://192.168.1.10:8188",ariaLabel:"ComfyUI 服务地址"})}),n.jsx(x,{label:"探测超时",hint:"3s..120s；测试连接与后台探测都用它",children:n.jsx(w,{value:s.comfyTimeout,onChange:k=>{r("comfyTimeout",k)},placeholder:"30s",ariaLabel:"ComfyUI 探测超时"})}),n.jsx(x,{label:"连接成功后加载 skill",hint:"注册 comfy-image（出图）与 comfy-video（视频）；保存后立即按新配置探测",children:n.jsx(Z,{checked:s.comfySkillEnabled,onChange:e.setComfySkillEnabled,ariaLabel:"连接成功后加载 skill"})}),n.jsxs(y,{children:[n.jsxs("div",{className:"qqr-headline",children:[n.jsx(A,{variant:"outline",onClick:e.testComfy,disabled:i.busy,children:i.busy?"测试中…":"测试连接"}),n.jsx("span",{className:"qqr-hint",children:"用上面填的地址与超时探测一次（只探测，不保存配置）。"})]}),i.error!==null?n.jsx(I,{tone:"error",role:"alert",children:i.error}):null,b]})]}),n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"运行状态"}),n.jsx(be,{line:e.comfyLine}),a!==null&&a.enabled&&!a.reachable?n.jsx(I,{tone:"warn",children:"请检查服务地址与 ComfyUI 是否已启动；保存配置或等待下一轮探测。"}):null,m]}),j]}),n.jsx(E,{children:n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"在群里画图 / 做视频"}),n.jsxs("ul",{className:"qqr-list",children:[n.jsx("li",{children:"群里直接说「画一张……」或「生成一段……视频」即可触发对应 skill，例如「画一张夕阳下的猫」「让这张图动起来」。"}),n.jsxs("li",{children:["改图先发参考图，再说「改成……」；出图工作流：",n.jsx("code",{children:"qwen-t2i"})," 文生图、",n.jsx("code",{children:"qwen-i2i"})," 参考图、",n.jsx("code",{children:"qwen-edit"})," 编辑。"]}),n.jsxs("li",{children:["视频工作流：",n.jsx("code",{children:"h3-t2v"})," 文生视频、",n.jsx("code",{children:"h3-i2v"})," 首帧转视频、",n.jsx("code",{children:"h3-r2v"})," 参考图转视频（带原生音频）。"]}),n.jsxs("li",{children:["产物落在群项目 ",n.jsx("code",{children:"assets/comfy/output/"}),"；图片用 ",n.jsx("code",{children:"qq_send({ images: [...] })"})," 发回群，视频用 ",n.jsx("code",{children:"qq_send({ videos: [...] })"})," 发回群。"]}),n.jsx("li",{children:"ComfyUI 无鉴权，只在家用可信网络使用；不要在公网暴露。"})]})]})})]})}function Ks({model:e}){const{status:s}=e,r=(s==null?void 0:s.login)??null,t=r!==null&&(r.nickname!==""||r.userId>0)?(r.nickname!==""?r.nickname:"未取到昵称")+"（"+String(r.userId)+"）":"未登录",i=(s==null?void 0:s.lock)??null;return n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"运行状态"}),n.jsxs("p",{className:"qqr-hint",children:["协议端：",n.jsx("span",{className:"qqr-mono",children:(s==null?void 0:s.config.wsUrl)??"—"})]}),n.jsxs("p",{className:"qqr-hint",children:["登录账号：",t]}),n.jsxs("p",{className:"qqr-hint",children:["单实例锁：",i===null?"本进程持有":"另一个进程持有（pid "+String(i.pid)+"）"," · ","群映射：",s===null?0:s.mappings.length," 个"]})]}),s!==null&&s.problems.length>0?n.jsx(y,{children:n.jsx("ul",{className:"qqr-list",children:s.problems.map(a=>n.jsx("li",{children:n.jsx(I,{tone:"error",children:a})},a))})}):null]})}function Qs({model:e}){var t;const{form:s,updateField:r}=e;return n.jsxs("div",{className:"qqr-panel",children:[n.jsxs(E,{children:[n.jsx(x,{label:"协议端 WebSocket",hint:"NapCat 正向 WS，例如 ws://127.0.0.1:3001",children:n.jsx(w,{value:s.wsUrl,onChange:i=>{r("wsUrl",i)},placeholder:"ws://127.0.0.1:3001",ariaLabel:"协议端 WebSocket 地址"})}),n.jsx(x,{label:"Access Token",hint:e.tokenHint,children:n.jsx(w,{type:"password",value:s.accessToken,onChange:i=>{r("accessToken",i)},placeholder:((t=e.status)==null?void 0:t.config.accessTokenConfigured)===!0?"留空保持不变":"写入新的 token",ariaLabel:"Access Token"})}),n.jsx(x,{label:"机器人 QQ 号",hint:"连接后用 get_login_info 校验，不匹配会断开",children:n.jsx(w,{value:s.selfId,onChange:i=>{r("selfId",i)},inputMode:"numeric",ariaLabel:"机器人 QQ 号"})}),n.jsx(x,{label:"群白名单",hint:"逗号分隔的群号；未列出的群只记日志不回话",children:n.jsx(w,{value:s.groups,onChange:i=>{r("groups",i)},placeholder:"10002",ariaLabel:"群白名单"})})]}),n.jsx(Ks,{model:e})]})}const fe=qe({fetch:(e,s)=>globalThis.fetch(e,s)});function Gs(){const[e,s]=p.useState(null),[r,t]=p.useState(!1),[i,a]=p.useState(null),[l,o]=p.useState(null),[b,j]=p.useState(null),C=p.useRef(!0);p.useEffect(()=>(C.current=!0,()=>{C.current=!1}),[]);const m=p.useCallback(async(h=!1)=>{const N=await fe.getEnv();C.current&&(N.ok?(s(N.value),h&&a(null)):h&&a(N.error.message))},[]);p.useEffect(()=>{m(!0)},[m]),p.useEffect(()=>{const h=setInterval(()=>{m(!1)},5e3);return()=>clearInterval(h)},[m]);const k=r||e!==null&&e.running!==null;p.useEffect(()=>{if(!k)return;const h=setInterval(()=>{m(!1)},2e3);return()=>clearInterval(h)},[k,m]);const v=p.useCallback(async(h,N)=>{var P;t(!0),a(null),o(null),j(null);const q=await fe.envAction({action:h,confirm:(N==null?void 0:N.confirm)===!0});if(C.current){if(t(!1),!q.ok){a(q.error.message);return}s(q.value.status),q.value.url!==void 0?(j(q.value.url),o("已生成 WebUI 链接。")):q.value.accepted===!0?o("已开始执行；完成后会自动刷新（日志见下方）。"):o("动作已完成。"),(P=N==null?void 0:N.onDone)==null||P.call(N)}},[]);return{env:e,entries:e===null?[]:e.log.entries,busy:r,error:i,notice:l,webuiUrl:b,refresh:()=>{m(!0)},run:(h,N)=>{v(h,N)},openWebui:()=>{v("open-webui")}}}function Js(e){return e==="ok"?"ok":e==="warn"?"warn":e==="error"?"error":"muted"}function Ys(e){return e==="ok"?"正常":e==="warn"?"待处理":e==="error"?"未通过":"跳过"}function $s(e){const{action:s,disabled:r,env:t,onDone:i}=e,a=s.kind==="command"||s.kind==="chain"?"outline":"ghost",l=()=>{if(s.confirm){const o=globalThis.confirm;if(typeof o!="function"||!o(s.title+`

		`+s.description))return}t.run(s.id,{confirm:s.confirm,onDone:i})};return n.jsx(A,{variant:a,onClick:l,disabled:r,title:s.description,children:s.title})}function Vs(e){const{step:s,catalog:r,env:t,onDone:i}=e,a=t.busy||t.env!==null&&t.env.running!==null;return n.jsxs("tr",{children:[n.jsxs("td",{className:"qqr-td",children:[n.jsx(ge,{tone:Js(s.status)})," "+s.title]}),n.jsx("td",{className:"qqr-td",children:Ys(s.status)}),n.jsxs("td",{className:"qqr-td",children:[s.detail,s.evidence.length>0?n.jsx("div",{className:"qqr-mono-block",children:s.evidence.map((l,o)=>n.jsx("div",{children:l},String(o)))}):null]}),n.jsx("td",{className:"qqr-td",children:s.actions.map(l=>{const o=r.get(l);return o===void 0?null:n.jsx($s,{action:o,disabled:a,env:t,onDone:i},l)})})]})}function Xs({model:e}){var h,N;const s=Gs(),r=s.env,t=new Map;for(const q of(r==null?void 0:r.actions)??[])t.set(q.id,q);const i=()=>{e.refresh()},a=s.busy||r!==null&&r.running!==null,l=e.status!==null&&!e.status.config.environmentSupported?n.jsx(I,{tone:"warn",children:"宿主版本较旧，需重启该 profile 的 GUI 后此页才生效。"}):null;p.useEffect(()=>{if(s.webuiUrl===null)return;const q=globalThis.open;typeof q=="function"&&q(s.webuiUrl)},[s.webuiUrl]);const o=r===null?null:n.jsxs("span",{className:"qqr-hint",children:["正常 "+String(r.summary.ok)+" · 待处理 "+String(r.summary.warn)+" · 未通过 "+String(r.summary.error)+" · 跳过 "+String(r.summary.skip),r.checkedAt>0?"（最近检查 "+new Date(r.checkedAt).toLocaleTimeString()+"）":"",r.running!==null?" · 正在执行："+r.running.action:""]}),b=r===null?n.jsx(y,{children:n.jsx("p",{className:"qqr-empty",children:"环境状态读取中…"})}):r.checkedAt===0&&r.checking?n.jsx(y,{children:n.jsx("p",{className:"qqr-empty",children:"正在检查环境（docker / 文件 / OneBot 配置）…"})}):r.supported?r.enabled?n.jsx("div",{className:"qqr-scroll",children:n.jsxs("table",{className:"qqr-table",children:[n.jsx("thead",{children:n.jsxs("tr",{children:[n.jsx("th",{className:"qqr-th",children:"步骤"}),n.jsx("th",{className:"qqr-th",children:"状态"}),n.jsx("th",{className:"qqr-th",children:"说明"}),n.jsx("th",{className:"qqr-th",children:"操作"})]})}),n.jsx("tbody",{children:r.steps.map(q=>n.jsx(Vs,{step:q,catalog:t,env:s,onDone:i},q.id))})]})}):n.jsx(y,{children:n.jsx("p",{className:"qqr-empty",children:"环境页已关闭：打开上面的「启用环境页」并保存后开始探测。"})}):n.jsx(y,{children:n.jsx(I,{tone:"warn",children:"当前平台（"+(r.platform||"未知")+"）暂不支持环境页：只支持 macOS（Colima）与 Linux（Docker）。"})}),j=r===null?null:r.fixPlan,C=j===null?[]:j.titles,m=()=>{const q=j!==null&&j.needsConfirm;if(q){const P=globalThis.confirm;if(typeof P!="function"||!P(`一键修复会依次执行：
		`+C.join(" → ")+`

		其中安装 / 启动容器引擎或覆盖 compose 会修改系统，确认继续？`))return}s.run("fix-all",{confirm:q,onDone:i})},k=r===null||!r.supported||!r.enabled?null:n.jsxs("p",{className:"qqr-hint",children:[C.length>0?"一键修复将依次执行："+C.join(" → "):"当前没有可自动修复的步骤。",r.fixPlan.next!==null?" 下一步："+r.fixPlan.next.title+" — "+r.fixPlan.next.detail:""]}),v=r===null||!r.supported||!r.enabled?null:n.jsxs("div",{className:"qqr-headline",children:[n.jsx(A,{variant:"outline",onClick:m,disabled:a,title:C.length>0?"将执行："+C.join(" → "):"当前没有可自动修复的步骤",children:r.running!==null&&r.running.action==="fix-all"?"一键修复执行中…":"一键修复"}),n.jsx(A,{onClick:s.refresh,disabled:s.busy,children:"重新检测"}),r.webuiTokenConfigured?n.jsx(A,{variant:"outline",onClick:s.openWebui,disabled:a,children:"打开 WebUI 扫码"}):null]});return n.jsxs("div",{className:"qqr-panel",children:[n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"NapCat Docker 环境"}),n.jsxs("p",{className:"qqr-hint",children:["环境目录里放 ",n.jsx("code",{children:"compose.yaml"})," 与 ",n.jsx("code",{children:"data/"}),"（NapCat 的 QQ 配置）； host 只探测与执行白名单命令（固定 argv、不经 shell、不 sudo）。改完目录 / token 后 点页面顶部「保存并重连」落盘（token 只写不读）。"]}),l]}),n.jsx(x,{label:"启用环境页",hint:"关闭时不探测、也不允许执行任何动作",children:n.jsx(Z,{checked:e.form.envEnabled,onChange:e.setEnvEnabled,ariaLabel:"启用环境页"})}),n.jsx(x,{label:"环境目录",hint:"绝对路径或 ~/ 开头；默认 ~/napcat-docker",children:n.jsx(w,{value:e.form.envDir,onChange:q=>{e.updateField("envDir",q)},placeholder:"~/napcat-docker",ariaLabel:"环境目录"})}),n.jsx(x,{label:"WebUI token",hint:"只写不读；NapCat 的 WEBUI_TOKEN（compose 里那行）",children:n.jsx(w,{value:e.form.envWebuiToken,onChange:q=>{e.updateField("envWebuiToken",q)},placeholder:(h=e.status)!=null&&h.config.environment.webuiTokenConfigured?"已配置；留空表示不修改":"未配置",type:"password",ariaLabel:"WebUI token"})}),n.jsx(y,{children:n.jsxs("p",{className:"qqr-hint",children:["保存后 host 用新目录重新探测；token 用于生成 compose 文件与「打开 WebUI」。",(N=e.status)!=null&&N.config.environment.webuiTokenConfigured?" 当前已配置 token。":" 当前还没有 token。"]})})]}),n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"检查清单"}),o,v,k]}),b,s.error!==null?n.jsx(y,{children:n.jsx(I,{tone:"error",role:"alert",children:s.error})}):null,s.notice!==null?n.jsx(y,{children:n.jsx(I,{tone:"ok",role:"status",children:s.notice})}):null,s.webuiUrl!==null?n.jsx(y,{children:n.jsxs("p",{className:"qqr-hint",children:["WebUI 已在新的标签页打开（没反应就手动点）："," ",n.jsx("a",{href:s.webuiUrl,target:"_blank",rel:"noreferrer",children:s.webuiUrl})]})}):null]}),n.jsx(E,{children:n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"动作日志"}),s.entries.length===0?n.jsx("p",{className:"qqr-empty",children:"还没有动作记录：执行「一键修复」或任一步按钮后，这里显示命令输出（token 已脱敏）。"}):n.jsx("pre",{className:"qqr-mono-block",children:s.entries.map(q=>new Date(q.at).toLocaleTimeString()+" ["+q.level+"] "+q.text).join(`
		`)})]})}),n.jsx(E,{children:n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:"安全边界"}),n.jsxs("ul",{className:"qqr-list",children:[n.jsxs("li",{children:["只跑白名单命令（",n.jsx("code",{children:"docker"})," / ",n.jsx("code",{children:"docker compose"})," / ",n.jsx("code",{children:"brew"})," / ",n.jsx("code",{children:"colima"}),"），参数固定、不经 shell，不 ",n.jsx("code",{children:"sudo"}),"，不下载可执行文件。"]}),n.jsx("li",{children:"「一键修复」逐步补全：每完成一步自动重新探测并继续下一个能做的步骤；安装 / 启动引擎 / 覆盖 compose 会先弹一次确认。"}),n.jsxs("li",{children:["安装 Docker / Colima、启动容器引擎、写 OneBot 配置单独点击时都会二次确认（「一键修复」里的系统类动作同样先确认）；写 OneBot 前先备份 ",n.jsx("code",{children:".bak-时间戳"}),"。"]}),n.jsx("li",{children:"「打开 WebUI」把 token 拼进链接返回给页面（仅本机 loopback 访问）；状态快照里永远不返回 token 明文。"}),n.jsx("li",{children:"Windows / WSL 暂不支持：页面只显示说明，不执行动作。"})]})]})})]})}function Zs({model:e}){var B;const{status:s,presets:r,presetDraft:t,presetEditingId:i,presetBusy:a,updatePresetDraft:l}=e,o=(s==null?void 0:s.modelCatalog)??null,b=(o==null?void 0:o.groups)??[],j=b.find(d=>d.id===t.provider),C=(j==null?void 0:j.models)??[],m=C.find(d=>d.id===t.model),k=(m==null?void 0:m.efforts)??[],v=((B=s==null?void 0:s.permissionCatalog)==null?void 0:B.options)??[],h=[{value:"",label:"不指定（跟随 DSH 默认）"},...b.map(d=>({value:d.id,label:d.name!==""?d.name:d.id}))],N=[{value:"",label:"不指定"},...C.map(d=>({value:d.id,label:d.name!==""?d.name:d.id}))],q=[{value:"",label:"默认"},...k.map(d=>({value:d.id,label:d.name!==""?d.name:d.id}))],P=[{value:"",label:"不指定（跟随当前）"},...v.map(d=>({value:d.value,label:d.name!==""?d.name:d.value}))],H=i!==null,F=s!==null&&!s.presetService.supported?n.jsx(I,{tone:"warn",children:"宿主没有提供 agentPresets 服务（或尚未就绪）：预设会保存在本地，但暂时无法在 DSH 里选到，重启 GUI 后再看。"}):null;return n.jsxs("div",{className:"qqr-panel",children:[n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsxs("div",{className:"qqr-headline",children:[n.jsx("h4",{className:"qqr-subhead",children:"QQ 预设"}),n.jsx("span",{className:"qqr-inline-actions",children:n.jsx(A,{variant:"outline",onClick:e.newPreset,disabled:a,children:"新建预设"})})]}),n.jsx("p",{className:"qqr-hint",children:"预设 = 系统提示词人设（persona）+ 会话模型 / 思考层级 / 权限。保存后 host 动态注册成 DSH agent preset（无需重启 GUI）；已有群会话要发 /new 或「重新绑定」才会换过去。 插件自带的「QQ 群聊」也可以改。"}),F]}),n.jsx(y,{children:r.length===0?n.jsx("p",{className:"qqr-empty",children:"还没有预设。点「新建预设」开始。"}):n.jsx("div",{className:"qqr-scroll",children:n.jsxs("table",{className:"qqr-table",children:[n.jsx("thead",{children:n.jsxs("tr",{children:[n.jsx("th",{className:"qqr-th",children:"预设"}),n.jsx("th",{className:"qqr-th",children:"模型"}),n.jsx("th",{className:"qqr-th",children:"权限"}),n.jsx("th",{className:"qqr-th",children:"操作"})]})}),n.jsx("tbody",{children:r.map(d=>n.jsxs("tr",{children:[n.jsxs("td",{className:"qqr-td",children:[n.jsx("span",{children:d.name!==""?d.name:d.id}),n.jsx("span",{className:"qqr-mono qqr-mono-block",children:d.id}),s!==null&&s.presetService.supported&&!s.presetService.registered.includes(d.id)?n.jsx("span",{className:"qqr-hint",children:"（未注册：可能与 DSH 内置预设冲突）"}):null]}),n.jsx("td",{className:"qqr-td",children:d.model.provider===""?"跟随默认":d.model.provider+"/"+d.model.model+(d.model.reasoningEffort===""?"":" · "+d.model.reasoningEffort)}),n.jsx("td",{className:"qqr-td",children:d.permissionPreset===""?"跟随当前":d.permissionPreset}),n.jsx("td",{className:"qqr-td",children:n.jsxs("div",{className:"qqr-row-actions",children:[n.jsx(A,{variant:"outline",onClick:()=>{e.editPreset(d.id)},disabled:a,children:"编辑"}),n.jsx(A,{onClick:()=>{e.deletePreset(d.id)},disabled:a,children:"删除"})]})})]},d.id))})]})})})]}),H?n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsx("h4",{className:"qqr-subhead",children:i===""?"新建预设":"编辑预设："+i}),n.jsx("p",{className:"qqr-hint",children:"id 创建后不可修改（DSH 会话按它恢复）；人设会作为系统提示词的人设段。模型 / 权限只对 使用该预设的新会话生效。"})]}),n.jsx(x,{label:"预设 id",hint:"小写字母 / 数字 / 连字符；创建后不可改",children:n.jsx(w,{value:t.id,onChange:d=>{l("id",d)},placeholder:"catgirl",disabled:i!=="",ariaLabel:"预设 id"})}),n.jsx(x,{label:"名称",hint:"显示在 DSH preset 选择器里",children:n.jsx(w,{value:t.name,onChange:d=>{l("name",d)},placeholder:"猫娘",ariaLabel:"预设名称"})}),n.jsx(x,{label:"描述",hint:"可选；一句话说明这个预设的用途",children:n.jsx(w,{value:t.description,onChange:d=>{l("description",d)},placeholder:"群里的猫娘角色",ariaLabel:"预设描述"})}),n.jsxs(y,{children:[n.jsx("span",{className:"qqr-label",children:"人设（persona）"}),n.jsx(xe,{value:t.persona,onChange:d=>{l("persona",d)},placeholder:"你是群里的猫娘助手，说话带「喵」；直接输出最终回复即可，不要用 qq_send 往本群发。",rows:5,ariaLabel:"预设人设"}),n.jsx("p",{className:"qqr-hint",children:"建议保留「直接输出最终回复、不要用 qq_send 往本群发」——不然模型可能用工具回话导致双发。"})]}),o===null?n.jsxs(n.Fragment,{children:[n.jsx(x,{label:"模型 provider",hint:"宿主模型目录不可用，可手填（留空 = 跟随默认）",children:n.jsx(w,{value:t.provider,onChange:d=>{l("provider",d)},placeholder:"deepseek-account",ariaLabel:"模型 provider"})}),n.jsx(x,{label:"模型 id",hint:"留空 = 跟随默认",children:n.jsx(w,{value:t.model,onChange:d=>{l("model",d)},placeholder:"deepseek-flash",ariaLabel:"模型 id"})}),n.jsx(x,{label:"思考层级",hint:"留空 = 跟随模型默认",children:n.jsx(w,{value:t.reasoningEffort,onChange:d=>{l("reasoningEffort",d)},placeholder:"low / medium / high",ariaLabel:"思考层级"})})]}):n.jsxs(n.Fragment,{children:[n.jsx(x,{label:"模型 provider",hint:"留空 = 跟随 DSH 默认模型",children:n.jsx(V,{value:t.provider,onChange:d=>{l("provider",d),l("model",""),l("reasoningEffort","")},options:h,ariaLabel:"模型 provider"})}),n.jsx(x,{label:"模型",hint:"留空 = 不覆盖",children:n.jsx(V,{value:t.model,onChange:d=>{l("model",d),l("reasoningEffort","")},options:N,ariaLabel:"模型"})}),n.jsx(x,{label:"思考层级",hint:"留空 = 跟随模型默认",children:n.jsx(V,{value:t.reasoningEffort,onChange:d=>{l("reasoningEffort",d)},options:q,ariaLabel:"思考层级"})})]}),n.jsx(x,{label:"权限预设",hint:"沙箱 + 审批组合；留空 = 跟随当前",children:n.jsx(V,{value:t.permissionPreset,onChange:d=>{l("permissionPreset",d)},options:P,ariaLabel:"权限预设"})}),n.jsx(x,{label:"排序",hint:"DSH preset 列表里的位置（1..10000）",children:n.jsx(w,{value:t.order,onChange:d=>{l("order",d)},inputMode:"numeric",placeholder:"100",ariaLabel:"预设排序"})}),n.jsx(y,{children:n.jsxs("div",{className:"qqr-headline",children:[n.jsx(A,{variant:"primary",onClick:e.savePreset,disabled:a,children:a?"保存中…":"保存预设"}),n.jsx(A,{variant:"outline",onClick:e.cancelPresetEdit,disabled:a,children:"取消"})]})})]}):null]})}function me(e){const s={image:"图片",sticker:"表情",face:"表情",video:"视频",voice:"语音",file:"文件"};return e.map(r=>r.status==="failed"?r.kind==="file"?"[群文件下载失败]":"[媒体下载失败]":"["+(s[r.kind]??"媒体")+"]")}function en({model:e}){const{messages:s}=e;if(s.groupId===null)return null;const r=Math.max(1,Math.round(s.windowMs/36e5));return n.jsx(E,{children:n.jsxs(y,{children:[n.jsxs("div",{className:"qqr-headline",children:[n.jsxs("h4",{className:"qqr-subhead",children:["最近消息 · 群 ",s.groupId]}),n.jsxs("span",{className:"qqr-muted",children:["最近 ",r," 小时 · 最多 20 条"]}),n.jsxs("span",{className:"qqr-inline-actions",children:[n.jsx(A,{onClick:e.reloadMessages,disabled:s.busy,children:"刷新"}),n.jsx(A,{onClick:e.closeMessages,disabled:s.busy,children:"关闭"})]})]}),s.busy?n.jsx("p",{className:"qqr-muted",children:"读取中…"}):s.error!==null?n.jsx(I,{tone:"error",role:"alert",children:s.error}):s.items.length===0?n.jsx("p",{className:"qqr-muted",children:"最近 24 小时没有消息。"}):n.jsx("div",{children:s.items.map(t=>n.jsxs("div",{className:"qqr-msg",children:[n.jsxs("span",{className:"qqr-msg-meta",children:[je(t.time)," · ",t.name,t.mentionsSelf?"（@你）":"",t.replyToId!==""?"（引用 "+t.replyToId+"）":"",me(t.media).length>0?" "+me(t.media).join(" "):""]}),t.text!==""?n.jsx("span",{className:"qqr-msg-text",children:t.text}):null]},(t.messageId||String(t.time))+":"+String(t.time)))})]})})}function sn({model:e}){const{status:s,projectRows:r,busy:t,loading:i}=e;return n.jsxs(E,{children:[n.jsxs(y,{children:[n.jsxs("div",{className:"qqr-headline",children:[n.jsx("h4",{className:"qqr-subhead",children:"群项目目录"}),n.jsx("span",{className:"qqr-inline-actions",children:s!==null&&s.mappings.length>0?n.jsxs(A,{onClick:e.clearMappings,disabled:t||i,variant:"outline",children:["清空全部映射（",s.mappings.length,"）"]}):null})]}),n.jsxs("p",{className:"qqr-hint",children:["每个群的聊天记录写进该项目的 ",n.jsx("code",{children:".qq-relay/chat/<群号>/"}),"，DSH 会话也以它为工作目录； 留空表示跟随上面的默认项目。改目录只影响之后新建的会话——已建会话请点「重新绑定」 （旧项目里的聊天记录不会移动）。"]}),s!==null&&s.workspace.attachIssues.length>0?n.jsx(I,{tone:"warn",children:"有 "+String(s.workspace.attachIssues.length)+" 个会话没能挂到群项目的 workspace，会在 DSH 侧栏显示为「未分组」："+s.workspace.attachIssues.map(a=>"群 "+String(a.groupId)+"（"+a.error+"）").join("；")+"。保存配置或点「重新连接」会自动补挂一次。"}):null]}),s===null||r.length===0?n.jsx(y,{children:n.jsx("p",{className:"qqr-empty",children:"还没有群：把群号填进「群白名单」，或在群里 @ 机器人后会自动出现。"})}):n.jsx(y,{children:n.jsx("div",{className:"qqr-scroll",children:n.jsxs("table",{className:"qqr-table",children:[n.jsx("thead",{children:n.jsxs("tr",{children:[n.jsx("th",{className:"qqr-th",children:"群号"}),n.jsx("th",{className:"qqr-th",children:"会话"}),n.jsx("th",{className:"qqr-th",children:"项目目录"}),n.jsx("th",{className:"qqr-th",children:"操作"})]})}),n.jsx("tbody",{children:r.map(a=>n.jsxs("tr",{children:[n.jsx("td",{className:"qqr-td",children:a.groupId}),n.jsx("td",{className:"qqr-td",children:a.sessionId===""?n.jsx("span",{className:"qqr-muted",children:"未创建"}):n.jsxs(n.Fragment,{children:[n.jsx("span",{children:a.sessionTitle!==""?a.sessionTitle:"—"}),n.jsx("span",{className:"qqr-mono qqr-mono-block",children:a.sessionId})]})}),n.jsx("td",{className:"qqr-td qqr-col-dir",children:n.jsx(w,{value:a.projectDir,onChange:l=>{e.updateProjectRow(a.groupId,l)},placeholder:s.config.workspace,ariaLabel:"群 "+String(a.groupId)+" 的项目目录"})}),n.jsx("td",{className:"qqr-td",children:n.jsxs("div",{className:"qqr-row-actions",children:[n.jsx(A,{variant:"outline",onClick:()=>{e.rebind(a.groupId)},disabled:t||a.sessionId==="",children:"重新绑定"}),n.jsx(A,{onClick:()=>{e.openMessages(a.groupId)},disabled:t||i,children:"消息"}),n.jsx(A,{onClick:()=>{e.deleteMapping(a.groupId)},disabled:t||a.sessionId==="",children:"解除绑定"})]})})]},a.groupId))})]})})})]})}function nn({model:e}){const{form:s,updateField:r}=e;return n.jsxs("div",{className:"qqr-panel",children:[n.jsxs(E,{children:[n.jsx(x,{label:"默认项目目录",hint:"未单独配置群项目时，聊天记录与 DSH 会话使用的目录",children:n.jsx(w,{value:s.workspace,onChange:t=>{r("workspace",t)},placeholder:"~/dsh/qq-relay-ws",ariaLabel:"默认项目目录"})}),n.jsx(x,{label:"会话标题模板",hint:"可用 {groupName} / {groupId}",children:n.jsx(w,{value:s.sessionTitle,onChange:t=>{r("sessionTitle",t)},placeholder:"QQ群：{groupName}",ariaLabel:"会话标题模板"})})]}),n.jsx(sn,{model:e}),n.jsx(en,{model:e})]})}function rn({model:e}){const{form:s,updateField:r}=e;return n.jsx("div",{className:"qqr-panel",children:n.jsxs(E,{children:[n.jsx(x,{label:"聊天记录保留天数",hint:"0 = 永不自动删除；7..3650 = 自动清理天数（保存后生效）",children:n.jsx(w,{value:s.chatRetentionDays,onChange:t=>{r("chatRetentionDays",t)},inputMode:"numeric",placeholder:"0",ariaLabel:"聊天记录保留天数"})}),n.jsxs(y,{children:[n.jsxs("p",{className:"qqr-hint",children:["聊天记录与媒体文件默认",n.jsx("b",{children:"永不自动删除"}),"（保留天数 0）。填 7..3650 保存后， 宿主启动时与每天各清理一次超过该天数的 ",n.jsx("code",{children:".qq-relay/chat/"})," 日文件与",n.jsx("code",{children:" .qq-relay/media/"})," 日期目录。"]}),n.jsxs("div",{className:"qqr-headline",children:[n.jsx(A,{variant:"outline",onClick:e.cleanup,disabled:e.busy||e.loading,children:"立即清理"}),n.jsx("span",{className:"qqr-hint",children:"用上面的天数（1..3650）清一次，不改配置、不动群映射；删除后不可恢复。"})]})]})]})})}function tn(){const e=Hs();Ge();const s=e.tab==="connection"?n.jsx(Qs,{model:e}):e.tab==="env"?n.jsx(Xs,{model:e}):e.tab==="project"?n.jsx(nn,{model:e}):e.tab==="behavior"?n.jsx(Os,{model:e}):e.tab==="comfy"?n.jsx(zs,{model:e}):e.tab==="presets"?n.jsx(Zs,{model:e}):n.jsx(rn,{model:e});return n.jsxs("div",{className:"qqr-root","data-plugin":"dsh-qq-relay",children:[n.jsxs("div",{className:"qqr-head",children:[n.jsx(be,{line:e.statusLine}),n.jsxs("div",{className:"qqr-actions",children:[n.jsx(A,{onClick:e.refresh,disabled:e.loading||e.busy,children:"刷新"}),n.jsx(A,{variant:"outline",onClick:e.reconnect,disabled:e.loading||e.busy,children:"重新连接"}),n.jsx(A,{variant:"primary",onClick:e.save,disabled:e.loading||e.busy,children:"保存并重连"})]})]}),n.jsx("nav",{className:"qqr-tabs",role:"tablist","aria-label":"QQ 机器人配置",children:Ms.map(r=>n.jsx("button",{type:"button",role:"tab",id:"qqr-tab-"+r.id,className:"qqr-tab","data-active":e.tab===r.id,"aria-selected":e.tab===r.id,"aria-controls":"qqr-tabpanel",onClick:()=>{e.setTab(r.id)},children:r.label},r.id))}),e.tab==="env"?n.jsx(I,{tone:"muted",children:"环境页把 NapCat 的 Docker 安装步骤收敛成 7 个检查：环境目录、Docker CLI、容器引擎、 compose 文件、NapCat 容器、QQ 登录、OneBot 配置与插件回填。安装类动作执行前会二次确认。"}):null,e.tab==="comfy"?n.jsx(I,{tone:"muted",children:"ComfyUI 出图 / 视频：连接成功后 host 会为 DSH 加载 comfy-image（出图）与 comfy-video（视频）两个 skill。"}):null,e.error!==null?n.jsx(I,{tone:"error",role:"alert",children:e.error}):null,e.notice!==null?n.jsx(I,{tone:"ok",role:"status",children:e.notice}):null,e.dirty?n.jsx(I,{tone:"warn",children:"有未保存的修改。"}):null,n.jsx("div",{id:"qqr-tabpanel",role:"tabpanel","aria-labelledby":"qqr-tab-"+e.tab,children:s}),n.jsxs("p",{className:"qqr-footer",children:["配置来源：profile 的 ",n.jsx("code",{children:"cordis.patch.yml"}),"，本页保存的覆盖写入",n.jsx("code",{children:" ~/.dsh/storages/dsh-qq-relay/settings.json"}),"；预设写入同目录的",n.jsx("code",{children:"presets.json"})," 并在启动时动态注册；画图 / 视频 skill 由 host 在 ComfyUI 连接成功后动态注册（",n.jsx("code",{children:"lib/skills/comfy-image"})," 下的 SKILL.md 出图、 SKILL-video.md 视频），不需要重启 GUI。token 只写不读，页面永远看不到明文。"]})]})}const an="dsh-qq-relay",ln=["slots"],on="dsh-qq-relay";function cn(e){var t;const s=e,r=(t=s==null?void 0:s.get)==null?void 0:t.call(s,"slots");if(!(r===void 0||typeof r.inject!="function"||typeof r.register!="function"))try{r.inject("plugins.bundle.config",()=>r.register({name:"plugins.bundle.config",key:on},tn))}catch{}}exports.apply=cn;exports.inject=ln;exports.name=an;

		return module.exports;
	}
});
