# Quiver Switcher

Quiver AI 账号快速切换 Chrome 扩展（MV3）。

> **本项目基于 [lueluelue2006/quiver_mv3_switcher_extension](https://github.com/lueluelue2006/quiver_mv3_switcher_extension) 二次开发，感谢原作者的工作。**

## 与原版的区别

**界面重设计**
- Popup 改为三栏 Tab 布局（状态 / 账号 / 管理），信息层次更清晰
- 状态页新增会话指示灯（绿/黄/红）和账号队列进度条
- 悬浮按钮改为可展开面板，内嵌账号列表

**功能增强**
- 账号历史上限 3 条 → 50 条
- 新增账号积分检测（单个 / 全部批量检测），积分状态颜色区分
- 新增账号备注字段
- 新增删除历史账号功能
- 悬浮窗去掉无意义的"待切"计数，"切换账号"改名为"注册新账号"，语义更准确
- 积分阈值基于 Quiver 20 上限调整（≥15 显示黄色警告，20 显示红色用完）

## 安装方式

1. 下载或克隆本仓库
2. 打开 `chrome://extensions`
3. 开启右上角**开发者模式**
4. 点击**加载已解压的扩展程序**，选择本项目目录

## 使用方法

- 打开 [app.quiver.ai](https://app.quiver.ai)，页面右上角出现悬浮窗
- **注册新账号**：点击"注册新账号"按钮，自动注册并切换（需等待约 1-2 分钟）
- **切换已有账号**：点击"账号 ▾"展开列表，点击对应账号右侧的"切换"
- **检测积分**：展开账号列表后点击"全部检测积分"，或在 Popup 账号 Tab 中单独检测
- **Cookie 管理**：点击工具栏扩展图标，在"管理"Tab 中导入/导出 Cookie

## 原始项目

- 原作者：[lueluelue2006](https://github.com/lueluelue2006)
- 原始仓库：https://github.com/lueluelue2006/quiver_mv3_switcher_extension
- 原始协议：请以原仓库为准

## License

本项目仅供学习交流使用。
