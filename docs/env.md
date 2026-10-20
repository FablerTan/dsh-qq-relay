# 环境一键配置（P12 / v0.23.0；v0.25.0 起「一键修复」逐步补全）

把 [onebot-channel.md §3](./onebot-channel.md) 里「装 Docker / 起 Colima / 拉 NapCat /
扫码登录 / 写 OneBot 配置 / 回填插件配置」的手工步骤，收敛成插件面板里的**「环境」二级页**：
每步一个状态 + 按钮，新机器从零到 relay 连上，已装好的机器只做诊断。

- host：`lib/model/env.js`（纯逻辑）+ `lib/controller/env.js`（探测 / 动作），
  路由 `GET /dsh-qq-relay/api/env` 与 `POST /dsh-qq-relay/api/env/action`；
- client：`src/viewmodel/env.ts` + `src/view/panels/EnvPanel.tsx`，页签在
  「连接」之后（见 [client.md](./client.md) §2）；
- 配置段：`environment`（见 [config.md](./config.md) §2.13）。

## 1. 平台与前置

| 平台 | 支持 | 容器引擎 | 说明 |
|---|---|---|---|
| macOS | ✅ | Colima（`colima start`） | 默认路径；装 Colima 需要 Homebrew |
| Linux | ✅ | 已有 Docker daemon | 步骤 1 / 2 通常直接通过；不执行安装 |
| Windows / WSL | ❌ | — | 页面只显示「暂不支持」，不执行任何动作 |

只支持 **Docker + NapCat**；macOS 原生 Shell 方案不列入（见 [onebot-channel.md](./onebot-channel.md) §2）。

## 2. `environment` 配置段

| 字段 | 默认 | 取值 | 作用 | 配置页 | 生效 |
|---|---|---|---|---|---|
| `environment.enabled` | `true` | 布尔 | 环境页是否探测 / 允许动作；关闭后按钮全部禁用 | 可 | 保存后立即重探 |
| `environment.dir` | `~/napcat-docker` | 绝对路径或 `~/` 开头、无 `..`、≤200 字符 | NapCat 的 Docker 环境目录（`compose.yaml` + `data/`） | 可 | 保存后立即重探 |
| `environment.webuiToken` | `''` | ≤200 字符 | NapCat 的 `WEBUI_TOKEN`（**只写不读**：状态快照只给 `webuiTokenConfigured`） | 可 | 保存后立即重探 |

容错：目录 / token 非法时**不会**把整份配置判死（relay 不能因为环境页的笔误停摆），
只回退默认值；页面表单会在保存前先做同样的格式校验。

> 只写不读的实现与 `accessToken` 相同：`maskConfig` 不返回明文；保存覆盖时
> `lib/index.js` 会把已有 `environment.webuiToken` 与本次提交的子项合并，避免「保存一次目录
> 就清掉 token」。页面 token 输入框永远从空开始，留空表示不修改。

## 3. 页面结构

1. **NapCat Docker 环境**卡片：启用开关 / 环境目录 / WebUI token（密码框）+ 「保存并重连」；
2. **检查清单**卡片：7 步表格（步骤 / 状态 / 说明+证据 / 操作），顶部汇总计数与
   「一键修复 / 重新检测 / 打开 WebUI 扫码」，以及一行**修复计划**：
   「一键修复将依次执行：安装 Docker / Colima → 启动容器引擎 → 生成 Compose 文件 → 启动 NapCat 容器……
   下一步：QQ 登录 — 还没扫码登录」（来自 `fixPlan`，见 §6）；含安装 / 启动引擎 / 覆盖 compose 时
   点「一键修复」先弹一次确认；动作错误 / 提示行；
3. **动作日志**卡片：最近 60 条（命令回显、stdout / stderr 尾部、成功 / 失败 / 超时），
   token 在写入缓冲前已脱敏；
4. **安全边界**卡片：白名单命令、二次确认、备份、token 不外泄、Windows 不支持。

页面每 5 秒拉一次 `GET /api/env`（有动作在跑时 2 秒）；host 没有定时器，探测由轮询驱动
（超过 15 秒未探测则后台重探）。

## 4. 七个步骤

判定优先级从上到下；任一步的前置缺失时后面的步骤会 `skip`（不是失败）。

| # | id | 判定 | ok / warn / error | 可用动作 |
|---|---|---|---|---|
| 1 | `docker-cli` | `docker --version` | ok = 退出码 0 | `install-docker`（仅 macOS，需确认） |
| 2 | `docker-daemon` | `docker info --format {{.ServerVersion}}` | 失败 = error「容器引擎未运行」 | `start-daemon`（仅 macOS，需确认） |
| 3 | `compose-file` | 环境目录存在 `compose.yaml` / `docker-compose.yml`，且含非空 `WEBUI_TOKEN` | 无文件 = error；缺 token = warn | `write-compose` |
| 4 | `container` | `docker inspect --format {{.State.Status}} <container_name>` | running = ok；存在但非 running = warn；不存在 = error | `compose-up` |
| 5 | `login` | `<dir>/data/config/onebot11_<uin>.json` 是否存在 | 存在 = ok（QQ 已登录）；否则 warn | `open-webui`（配置了 token 时） |
| 6 | `onebot` | 校验 OneBot 配置：启用、端口与插件 `wsUrl` 一致、token 非空、`messagePostFormat=array`、`reportSelfMessage=false` | 有问题 = error（逐条列出） | `write-onebot`（需确认） |
| 7 | `relay` | 插件配置（wsUrl / token / selfId）与连接状态 | 已连接 = ok；未启动 / 端口不一致 / 缺 token = warn / error | `backfill-config` |

- 步骤 3 只读文件，不依赖 docker 命令行；步骤 4 依赖 daemon；步骤 5–7 依赖登录 / 配置。
- 证据（evidence）显示实际命令输出摘要或文件路径，便于「复制命令自己跑」。
- `container_name` 从 compose 文件解析，解析不到按 `napcat`；OneBot 端口从插件 `wsUrl` 解析，
  解析不到按 `3001`。

### 4.1 一键修复怎么「逐步补全」（v0.25.0）

`skip` 表示**前置缺失**（例如引擎没起时无法检查 NapCat 容器），它本身不贡献任何动作——
这正是 v0.23.0 会「跳过 NapCat」的原因：序列在**点按钮那一刻**算一次，写完 compose 也不会
回头把容器步骤从 skip 变成 error，于是 `compose-up` 永远进不了那一次执行。

v0.25.0 起 `fix-all` 改成**逐轮推进**：

1. 探测 → 按 `computeFixSequence` 排计划（只取当前未通过步骤自己列出的动作，按
   `install-docker → start-daemon → write-compose → compose-up → write-onebot → backfill-config`）；
2. 执行计划里的**第一个**动作；
3. 重新探测，回到 1；被 skip 的步骤在前置补齐后自然变成 error，下一步动作随之出现；
4. 直到计划为空（或需要确认 / 动作失败 / 同一动作连续两次没有推进 / 卸载）；
5. 收尾把「下一步」写进日志：例如「可自动完成的步骤已跑完；下一步（QQ 登录）：还没扫码登录……」，
   全部通过则记「环境已就绪」。

安装 Docker / 启动容器引擎也进了计划（页面确认后执行），否则新机器一次点击只能写个 compose，
永远到不了 NapCat。安装 / 启动引擎 / 覆盖已存在的 compose 需要 `confirm: true`：
页面按 `fixPlan.needsConfirm` 弹一次确认，host 侧同样强制校验（不只靠页面）。

## 5. 动作清单（白名单）

host 只执行下表动作；命令一律 `spawn(bin, args, { shell: false })`，参数固定、不经 shell 拼接。

| 动作 id | 类型 | 实际执行 | 二次确认 | 说明 |
|---|---|---|---|---|
| `refresh` | none | 重新探测 | 否 | 不执行命令 |
| `install-docker` | command | `brew install colima docker docker-compose` | ✅ | 仅 macOS；耗时数分钟 |
| `start-daemon` | command | `colima start --cpu 4 --memory 4 --disk 60 --vm-type vz` | ✅ | 仅 macOS |
| `write-compose` | fs | 写 `<dir>/compose.yaml`（端口只绑 `127.0.0.1`，三个数据卷） | ✅ | 需要已配置 WebUI token；已存在文件时覆盖（页面总是先确认） |
| `compose-up` | command | `docker compose -f <dir>/compose.yaml up -d` | 否 | 首次会拉镜像 |
| `restart-napcat` | command | `docker compose -f <dir>/compose.yaml restart napcat` | 否 | 写 OneBot 配置后自动调用；**不在**「一键修复」序列里（避免多余重启） |
| `write-onebot` | fs | 补 `token` / `port` / `messagePostFormat=array` / `reportSelfMessage=false`，先备份 `.bak-<时间戳>`，再重启 NapCat | ✅ | 需要登录后的 `onebot11_<uin>.json`；token 取插件 access_token → OneBot 现有 token → 两边都空时生成随机 32 位 hex（随后回填） |
| `backfill-config` | callback | 用 OneBot 配置的端口 / token / 登录 QQ 号写插件 `wsUrl` / `accessToken` / `selfId`，然后重建连接 | 否 | 复用配置页的 `saveConfig`，两条路径一致 |
| `fix-all` | chain | **逐轮推进**：探测 → 计划里第一个动作 → 再探测；计划含 `install-docker / start-daemon / write-compose / compose-up / write-onebot / backfill-config` | 计划含安装 / 启动引擎 / 覆盖 compose 时 ✅ | 不含打开 WebUI（扫码只能手动）；每轮之间自动重探 |
| `open-webui` | link | 返回 `http://127.0.0.1:6099/webui?token=…` | 否 | token 来自 environment 配置 |

- 命令类动作**后台执行**：HTTP 立即返回 `accepted:true`，页面靠 `status.running` +
  日志轮询进度；单条命令超时 10 分钟（`ENV_COMMAND_TIMEOUT_MS`），超时 SIGKILL 并记日志。
- 同时只允许一个动作在跑（`ENV_ACTION_RUNNING`）。
- `write-onebot` 是唯一会改 NapCat 数据的动作：先 `copyFileSync` 备份，再临时文件 + rename
  原子写入；只动「启用的那个 websocketServers 条目」的五个字段，其余配置原样保留。
- `fix-all` 的确认只针对系统类动作（安装 / 启动引擎 / 覆盖 compose）；链里的 `write-onebot`
  不逐个弹窗（用户点整条链即是意图），但写前仍备份并重启 NapCat。

## 6. HTTP 契约

两个 exact 路由（注册在 `lib/controller/config-routes.js`）：

```text
GET  /dsh-qq-relay/api/env          → { ok, value: EnvStatus }
POST /dsh-qq-relay/api/env/action   → body { action, confirm? } → { ok, value: { action, status, logCursor, accepted?, url? } }
```

`EnvStatus`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `supported` / `platform` | boolean / string | 平台是否支持（darwin / linux） |
| `enabled` / `dir` / `webuiTokenConfigured` | boolean / string / boolean | 来自 `environment` 配置段（token 不回显） |
| `checking` / `checkedAt` | boolean / number | 是否在探测 / 最近一次探测时间 |
| `running` | `{ action, startedAt } \| null` | 正在执行的命令类动作 |
| `summary` | `{ ok, warn, error, skip }` | 步骤计数 |
| `steps` | 数组 | `{ id, title, status, detail, evidence[], actions[] }` |
| `fixPlan` | 对象 | 一键修复计划（v0.25.0）：`{ sequence[], titles[], needsConfirm, next }`；`next` 是第一个未通过步骤 `{ id, title, status, detail }` 或 null |
| `actions` | 数组 | 动作目录 `{ id, title, kind, confirm, description }`（页面按它渲染按钮） |
| `log` | `{ cursor, entries[] }` | 日志尾部 60 条（已脱敏） |

错误码：`ENV_INVALID`(400) / `ENV_ACTION_UNKNOWN`(400) / `ENV_CONFIRM_REQUIRED`(400) /
`ENV_OVERWRITE_CONFIRM`(409) / `ENV_TOKEN_MISSING`(400) / `ENV_NOT_READY`(409) /
`ENV_ACTION_RUNNING`(409) / `ENV_PLATFORM_UNSUPPORTED`(400) / `ENV_ACTION_FAILED`(500)。

- **防 CSRF**：与既有路由一致——只接受 `content-type: application/json` 的 POST
  （浏览器跨站 JSON POST 会触发预检），没有额外 nonce。GUI 默认只绑 loopback。
- 环境动作的参数只有动作 id 与布尔 `confirm`：**不接受任意命令 / 路径**，
  目录取自服务端配置，token 取自服务端配置。

## 7. 实现位置

| 层 | 文件 | 内容 |
|---|---|---|
| host Model | `lib/model/env.js` | 配置规范化 / 脱敏视图、compose 生成与解析、OneBot 校验、步骤求值、动作白名单与 argv、日志环形缓冲 |
| host Controller | `lib/controller/env.js` | 探测（docker / 文件 / OneBot）、动作执行（后台命令 / 写文件 / 回填）、状态快照 |
| host 装配 | `lib/index.js` | 创建 controller、`GET /api/env` 触发 `ensureFresh`、保存配置时排除 environment 的重连判定 |
| 路由 | `lib/controller/config-routes.js` | `ENV_PATH` / `ENV_ACTION_PATH` + 错误码映射 |
| client Model | `src/model/api.ts` · `form.ts` | `getEnv` / `envAction` 与 `environment` 表单字段 |
| client ViewModel | `src/viewmodel/env.ts` | 轮询 / 动作 / 日志 / WebUI 链接 |
| client View | `src/view/panels/EnvPanel.tsx`、`SettingsPage.tsx` | 「环境」二级页与页签 |
| 单测 | `test/env.test.js` | 配置 / compose / OneBot / 求值 / argv / 日志 / controller（桩执行器） |

## 8. 安全边界

- 只跑白名单命令：`docker`、`docker compose`、`brew`、`colima`；不 `sudo`，
  不下载可执行文件（brew 包与 docker 镜像除外），不执行用户输入的命令。
- 安装 / 启动引擎 / 写 compose / 写 OneBot 必须显式 `confirm: true`；页面用 `window.confirm`
  二次确认（`write-compose` 总是确认：已存在的 compose 文件会被覆盖）。
- 页面拿不到 `window.confirm`（非浏览器宿主 / 被禁用）时**不会**执行需要确认的动作——
  不会默认「同意」；host 侧同样拒绝没有 `confirm: true` 的请求。
- `environment.dir` 必须是绝对路径或 `~/…`，拒绝 `..` 与控制字符；`write-compose` 只写该目录下的
  `compose.yaml`（已存在 `docker-compose.yml` 时覆盖同目录既有文件，且需要确认）。
- WebUI token 只写不读：状态快照只给 `webuiTokenConfigured`；只有 `open-webui` 动作会把
  token 拼进返回链接（本机 loopback 访问）。
- 日志环形缓冲在写入前脱敏 `environment.webuiToken` / 插件 accessToken / OneBot token。
- 失败可读：每步保留证据与最后 N 行命令输出，用户可复制命令自己在终端跑。

## 9. 不做 / 待定

- **下载镜像 / 更新 NapCat 镜像**：没有单独动作；`compose-up` 会自动拉缺失镜像，
  更新镜像仍需用户手动 `docker compose pull`（避免「一键修复」意外升级导致登录态失效）。
- **卸载 / 重置环境**（删容器 + 数据卷）：危险操作，暂不做（roadmap P12 待定项）。
- **Windows / WSL**：暂不支持，页面只提示。
- **扫码自动化**：唯一不可自动化的一步——打开 WebUI 让用户扫码；登录成功靠
  `onebot11_<uin>.json` 出现判断。

## 10. 验证

- `pnpm test`：**294** 个用例全过（`test/env.test.js` 11 个：配置 / compose / OneBot / 求值 /
  argv / 日志 / controller 刷新 + 写 OneBot + 回填 + open-webui + 确认制 / 修复序列逐步展开 /
  一键修复逐步补全（装引擎 → 起容器）/ token 双空生成）。
- `pnpm check`：语法 + tsc + 文档配对全绿。
- 真机验收清单（重启 dwdev GUI 后）：
  1. 「环境」页 7 步全绿（本机已有 NapCat 环境时）；
  2. 改环境目录 → 保存 → 步骤按新目录重探；
  3. 点「打开 WebUI 扫码」→ 新标签页打开 `/webui?token=…`；
  4. 改 OneBot 配置（如端口）→ 写入并重启 → 步骤 6 恢复 ok、relay 自动重连；
  5. 不填 token 时 `write-compose` / `open-webui` 给出可读错误；未确认时安装类动作被拒绝；
  6. 停掉 Colima（`colima stop`）后刷新页面：NapCat 容器显示「跳过」且说明写明「先启动容器引擎」，
     修复计划提示「启动容器引擎 → …」，点「一键修复」弹确认 → 自动 `colima start` → 写 compose →
     `compose up -d`，日志给出「下一步：QQ 登录」；
  7. 扫码登录后点「一键修复」：自动写 OneBot 配置（重启 NapCat）→ 回填插件配置 → 步骤 7 变 ok。
- 命令类动作的真机执行（`brew install` / `colima start` / `compose up`）会改用户机器：
  验收时只对已就绪环境跑只读动作；安装路径用单测 + 手动命令确认。
