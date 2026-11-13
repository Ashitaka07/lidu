# 两峰一江｜李杜诗句互文图谱

纯静态网站，适合 GitHub Pages。页面直接读取 `assets/lidu-relations.csv`，不包含编造的文本、时间或主题资料。

## 本地预览

可直接双击 `index.html` 预览。为兼容本地打开，网站同时载入 `assets/lidu-relations.js`，其中是对原始 CSV 的逐字转存；页面不依赖 localhost。`启动本地预览.cmd` 仅保留为可选的本地服务器方式。

## 发布到 GitHub Pages

1. 新建 GitHub 仓库并上传本文件夹所有内容。
2. 在仓库 **Settings → Pages** 中选择从分支部署，选择 `main` 与 `/ (root)`。
3. GitHub 发布完成后，网址通常为：`https://<你的 GitHub 用户名>.github.io/<仓库名>/`。

## 数据字段

每行 11 列且无表头：李白作者、诗题、诗句、杜甫作者、诗题、诗句、相似度 × 10000、李白诗歌 ID、李白句序、杜甫诗歌 ID、杜甫句序。

相似度用于呈现原始模型结果，不主张或暗示文本之间存在直接引用或影响关系。
