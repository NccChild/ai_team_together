# 人工智能专班任务平台 Git 协同开发操作说明

## 一、协作原则

本项目代码统一放在现有 private 仓库的 `ai_team_task_platform` 目录下。所有开发人员只在该目录内开发，不修改仓库其他目录内容。

协作采用 `main + feature 分支 + Pull Request` 方式：

- `main` 分支只保留稳定代码；
- 开发人员不得直接向 `main` 分支提交代码；
- 每个人基于自己的任务创建 `feature/*` 分支；
- 开发完成后提交 Pull Request；
- Pull Request 由梁伟晔、王硕审核后合并。

---

## 二、仓库与项目目录

| 项目 | 内容 |
|---|---|
| GitHub仓库 | `Neutrinos/ai_seed_team` |
| 项目目录 | `ai_team_task_platform` |
| 主分支 | `main` |
| 协作方式 | sparse checkout 只拉取项目目录 |
| 合并负责人 | 梁伟晔、王硕 |

---

## 三、首次拉取项目

### 方式一：HTTPS方式，推荐优先使用

在本地选择一个工作目录，执行：

```powershell
git clone --filter=blob:none --sparse https://github.com/Neutrinos/ai_seed_team.git
cd ai_seed_team
git sparse-checkout set ai_team_task_platform
```

执行完成后，本地主要看到：

```text
ai_seed_team/
└── ai_team_task_platform/
```

### 方式二：如果需要走本机 7890 代理

```powershell
git -c http.proxy=http://127.0.0.1:7890 `
    -c https.proxy=http://127.0.0.1:7890 `
    clone --filter=blob:none --sparse https://github.com/Neutrinos/ai_seed_team.git

cd ai_seed_team
git sparse-checkout set ai_team_task_platform
```

### 方式三：SSH方式

如果已经配置好 GitHub SSH Key，可以使用：

```powershell
git clone --filter=blob:none --sparse git@github.com:Neutrinos/ai_seed_team.git
cd ai_seed_team
git sparse-checkout set ai_team_task_platform
```

如果 SSH 提示 `Permission denied (publickey)`，说明本机未正确配置 GitHub SSH Key，可先改用 HTTPS。

---

## 四、首次配置个人 Git 身份

每个人必须使用自己的姓名和邮箱提交代码，便于后续统计工作量。

查看当前配置：

```powershell
git config user.name
git config user.email
```

如果没有配置，执行：

```powershell
git config user.name "你的姓名或GitHub用户名"
git config user.email "你的邮箱"
```

也可以配置为全局：

```powershell
git config --global user.name "你的姓名或GitHub用户名"
git config --global user.email "你的邮箱"
```

注意：不要多人共用同一个 Git 账号或同一个提交邮箱，否则后续无法准确统计个人贡献。

---

## 五、开发前先更新 main 分支

每次开始开发前，先确保本地 `main` 是最新的。

```powershell
git checkout main
git pull origin main
```

确认当前分支：

```powershell
git branch
```

当前分支前面带 `*`。

---

## 六、创建自己的开发分支

开发人员不要直接在 `main` 上修改代码，应先创建自己的功能分支。

分支命名格式：

```text
feature/姓名拼音-模块名称
```

示例：

```powershell
git checkout -b feature/zhaoxiaoxiang-core-backend-integration
```

---

## 七、各人员建议分支

| 人员 | 建议分支 | 主要任务 |
|---|---|---|
| 赵晓详 | `feature/zhaoxiaoxiang-core-backend-integration` | 项目骨架、后端核心接口、接口约定、集成联调 |
| 郭琛虎 | `feature/guochenhu-backend-base-mysql` | FastAPI基础框架、MySQL连接、数据库模型 |
| 蒋来来 | `feature/jianglailai-member-dict-test` | 人员管理、基础字典、接口测试与文档支撑 |
| 谭有为 | `feature/tanyouwei-frontend-layout` | 前端基础框架、页面风格、通用组件 |
| 李双佼 | `feature/lishuangjiao-task-delivery-pages` | 任务页面、人员页面、成果提交页面 |
| 聂啸林 | `feature/niexiaolin-evaluation-dashboard` | 首页看板、评价页面、统计汇总 |
| 王书波 | `feature/wangshubo-llm-weekly-export` | 大模型周报分析、成果库、导出、部署测试 |

创建分支示例：

```powershell
git checkout main
git pull origin main
git checkout -b feature/lishuangjiao-task-delivery-pages
```

---

## 八、日常开发操作流程

### 1. 查看当前状态

```powershell
git status
```

常见状态说明：

| 状态 | 含义 |
|---|---|
| `modified` | 文件已修改 |
| `untracked` | 新文件尚未加入 Git 管理 |
| `staged` | 文件已加入暂存区，准备提交 |
| `nothing to commit` | 当前没有需要提交的变更 |

### 2. 只添加项目目录下的文件

所有提交范围限定在 `ai_team_task_platform` 目录下。

```powershell
git add ai_team_task_platform
```

如果只想添加某个文件：

```powershell
git add ai_team_task_platform/frontend/src/App.tsx
```

如果当前仓库启用了 sparse checkout，且 Git 提示不在 sparse 范围内，可执行：

```powershell
git sparse-checkout add ai_team_task_platform
git add ai_team_task_platform
```

### 3. 提交代码

提交信息应简洁说明本次做了什么。

```powershell
git commit -m "feat: 完成任务列表页面"
```

常用提交前缀：

| 前缀 | 用途 | 示例 |
|---|---|---|
| `feat:` | 新功能 | `feat: 新增任务创建接口` |
| `fix:` | 修复问题 | `fix: 修复周统计积分计算错误` |
| `docs:` | 文档修改 | `docs: 补充接口调用说明` |
| `style:` | 样式调整 | `style: 优化首页卡片样式` |
| `refactor:` | 代码重构 | `refactor: 优化任务查询逻辑` |
| `chore:` | 工程配置 | `chore: 初始化前端工程` |
| `test:` | 测试相关 | `test: 补充任务接口测试样例` |

### 4. 推送到远程分支

第一次推送该分支：

```powershell
git push -u origin feature/你的分支名
```

示例：

```powershell
git push -u origin feature/lishuangjiao-task-delivery-pages
```

后续在同一分支继续提交后，只需要：

```powershell
git push
```

---

## 九、提交 Pull Request

代码推送到 GitHub 后，在网页上创建 Pull Request。

### PR创建要求

| 项目 | 要求 |
|---|---|
| Base分支 | `main` |
| Compare分支 | 自己的 `feature/*` 分支 |
| Reviewer | 梁伟晔、王硕 |
| PR标题 | 使用 `feat:`、`fix:`、`docs:`、`chore:` 等规范 |
| PR说明 | 写清楚完成内容、影响范围、测试情况、未完成事项 |

### PR标题示例

```text
feat: 完成任务列表和成果提交页面
```

```text
feat: 新增任务管理和周计划接口
```

```text
fix: 修复统计看板积分展示问题
```

### PR说明模板

```md
## 本次完成内容

1. 
2. 
3. 

## 主要修改文件

- 
- 

## 是否影响其他模块

- 是 / 否
- 影响说明：

## 本地测试情况

- [ ] 前端可正常启动
- [ ] 后端可正常启动
- [ ] 接口调用正常
- [ ] 页面功能验证通过

## 未完成事项

- 
```

如果 GitHub 上已经建立 Issue，可以在 PR 说明中写：

```text
Closes #任务编号
```

这样 PR 合并后，Issue 会自动关闭。

---

## 十、开发过程中同步 main 最新代码

如果开发时间较长，其他人的代码已经合并到 `main`，建议同步最新代码，减少后续冲突。

在自己的分支上执行：

```powershell
git checkout main
git pull origin main
git checkout feature/你的分支名
git merge main
```

如果没有冲突，直接继续开发即可。

如果有冲突，按提示打开冲突文件，保留正确内容后执行：

```powershell
git add ai_team_task_platform
git commit -m "fix: 解决合并main分支冲突"
git push
```

说明：为了降低操作复杂度，建议普通开发人员使用 `merge main`，暂不强制使用 `rebase`。

---

## 十一、PR合并后本地更新

自己的 PR 被合并后，本地应切回 `main` 并更新代码。

```powershell
git checkout main
git pull origin main
```

如果原 feature 分支已经不再使用，可以删除本地分支：

```powershell
git branch -d feature/你的分支名
```

如果远程分支也已在 GitHub 删除，可以清理远程引用：

```powershell
git fetch -p
```

如果需要继续做新任务，应重新从最新 `main` 创建新分支：

```powershell
git checkout main
git pull origin main
git checkout -b feature/新的任务分支名
```

---

## 十二、不要提交的内容

以下内容不得提交到仓库：

```text
node_modules/
dist/
build/
venv/
.venv/
__pycache__/
*.pyc
*.db
*.sqlite
*.sqlite3
*.log
.env
.env.local
```

如果误提交了大文件或无关文件，应及时在 PR 中删除，避免影响仓库体积和工作量统计。

---

## 十三、提交前检查清单

每次 `commit` 前建议检查：

| 检查项 | 是否完成 |
|---|---|
| 是否在自己的 `feature/*` 分支上开发 | 是 |
| 是否只修改了 `ai_team_task_platform` 目录 | 是 |
| 是否没有提交 `node_modules`、`dist`、`.venv` 等文件 | 是 |
| 是否执行过 `git status` 查看变更 | 是 |
| 提交信息是否清楚说明本次修改 | 是 |
| 本地是否至少完成基本运行或页面检查 | 是 |

查看当前分支：

```powershell
git branch
```

查看将要提交的文件：

```powershell
git status
```

查看具体修改内容：

```powershell
git diff
```

查看已加入暂存区的内容：

```powershell
git diff --cached
```

---

## 十四、常见问题处理

### 1. 提示 Permission denied

如果使用 SSH 地址 clone，提示：

```text
Permission denied (publickey)
```

说明本机 SSH Key 没有配置好。建议先改用 HTTPS 地址 clone。

---

### 2. GitHub 要求输入密码

GitHub HTTPS 方式不再使用网页登录密码，通常需要 Personal Access Token，或通过 Git Credential Manager 弹出浏览器授权。

---

### 3. git add 时提示 sparse checkout 问题

执行：

```powershell
git sparse-checkout add ai_team_task_platform
git add ai_team_task_platform
```

---

### 4. 不小心在 main 分支改了代码

不要直接提交到 main。可以先创建新分支保留修改：

```powershell
git checkout -b feature/临时分支名
```

然后再提交：

```powershell
git add ai_team_task_platform
git commit -m "feat: 描述本次修改"
git push -u origin feature/临时分支名
```

---

### 5. commit 后发现提交信息写错

如果还没有 push，可以修改最后一次提交信息：

```powershell
git commit --amend -m "feat: 正确的提交说明"
```

如果已经 push，不建议普通开发人员强行改历史，保持原样即可。

---

### 6. 想放弃某个文件的本地修改

谨慎执行，放弃后无法恢复。

```powershell
git checkout -- ai_team_task_platform/文件路径
```

---

## 十五、推荐日常操作命令汇总

### 首次拉取

```powershell
git clone --filter=blob:none --sparse https://github.com/Neutrinos/ai_seed_team.git
cd ai_seed_team
git sparse-checkout set ai_team_task_platform
```

### 创建开发分支

```powershell
git checkout main
git pull origin main
git checkout -b feature/你的分支名
```

### 提交代码

```powershell
git status
git add ai_team_task_platform
git commit -m "feat: 描述本次完成的功能"
git push -u origin feature/你的分支名
```

### 后续继续提交

```powershell
git status
git add ai_team_task_platform
git commit -m "fix: 描述本次修复的问题"
git push
```

### 同步 main 最新代码

```powershell
git checkout main
git pull origin main
git checkout feature/你的分支名
git merge main
```

### PR合并后更新本地

```powershell
git checkout main
git pull origin main
git branch -d feature/你的分支名
git fetch -p
```

---

## 十六、最终要求

每名开发人员按照以下流程执行：

```text
拉取项目目录
  → 配置个人Git身份
  → 从main创建feature分支
  → 在ai_team_task_platform目录内开发
  → git add
  → git commit
  → git push
  → GitHub提交Pull Request
  → 梁伟晔、王硕审核合并
```

该流程用于保证项目代码清晰、责任明确、提交可追踪、后续工作量可统计。
