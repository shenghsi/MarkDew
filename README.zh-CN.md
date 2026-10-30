# MarkDew

[English](README.md) | 简体中文

MarkDew 是一款桌面 Markdown 编辑器。它提供实时预览，并且一次点击即可查看 Markdown 源码。

- 实时预览，可展开源码
- Markdown 与代码高亮
- 在实时预览中编辑带格式的 HTML 表格，不显示 HTML 标记
- 合并和拆分 HTML 表格单元格，也可拆分普通单元格
- 编辑 HTML 和 Markdown 表格，并调整表格大小
- MathJax 公式、Mermaid 图表和隔离的 HTML
- 浅色、深色和跟随系统主题
- 文件侧边栏、大纲，以及支持多文档的标签页
- 应用内更新

## 表格编辑

MarkDew 支持在实时预览中编辑 HTML 表格。单元格文字会保留格式，表格会保留尺寸。使用单元格菜单添加或删除行列、设置对齐方式、合并或拆分单元格。使用工具栏调整整个表格的大小和对齐方式。

Markdown 表格也支持实时单元格编辑。使用表格控件添加或删除行列、调整表格大小，以及设置行高或交替行颜色。在编辑器中右键，选择 **插入 > HTML 表格**，即可在文档中添加表格。

MarkDew 在 v1.0.10 及之前名为 MarkBend。Bend 编译器已不再属于本应用。早期版本和 Bend 的历史记录保存在原仓库
[shenghsi/MarkBend](https://github.com/shenghsi/MarkBend) 中。

## 安装

**Linux 和 macOS**：

```sh
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/shenghsi/MarkDew/releases/latest/download/markdew-installer.sh | sh
```

**Windows（PowerShell）**：

```powershell
irm https://github.com/shenghsi/MarkDew/releases/latest/download/markdew-installer.ps1 | iex
```

也可以从[最新发布版本](https://github.com/shenghsi/MarkDew/releases/latest)下载安装包：macOS
DMG（Apple Silicon 或 Intel）、Linux DEB 或 Windows EXE。

如需更新，请选择 **Tools > About MarkDew > Check for Updates**。参见 [UPDATES.md](UPDATES.md)。

## 开发

需要 Node.js、Rust 和 Tauri 平台工具。

```sh
npm ci
npm run desktop         # 运行应用
npm run desktop:build   # 构建安装包
npm test                # 运行检查
```

源码位于 `src/web/` 和 `src/desktop/`，测试位于 `tests/`。

更多文档：[TARGET.md](TARGET.md)、[ROADMAP.md](ROADMAP.md)、
[RELEASE.md](RELEASE.md)、[PORTABILITY.md](PORTABILITY.md)、
[BENCHMARKS.md](BENCHMARKS.md)。

## 许可证

MarkDew 采用双重许可：

- **开源和个人使用**：AGPL-3.0-or-later。
- **商业使用**：若将 MarkDew 用于商业运营、嵌入专有软件，或在不遵守 AGPL 义务的情况下提供托管服务，需要商业许可证。

参见 [LICENSE](LICENSE)。
