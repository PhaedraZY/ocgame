# OC 小店引擎（engine/）

所有 OC 共用的代码。每个 OC 自己的东西（人物、文字、菜单、家具、图片、手绘）放在 OC 自己的文件夹里（比如 `guodong/`）。

```
ocgame/
  engine/                 ← 这里：所有 OC 共用，换 OC 不用改
    boot.js               读主题包 → window.THEME → 按顺序加载脚本（@ 开头的从 engine/ 读）；?studio 时叠加工作站草稿
    sketch.js             手绘笔（抖动线、水彩、纸纹）
    skin.js               「图片优先，没有图就用手绘」+ 所有可替换元素的清单（catalog）
    game.js               经营引擎：设备类型（source / bench / cooker / fill / plates / topping / bell）、流程、客人、每日、评分、自动教学提示
    home.js               小屋引擎：摆家具、吸附、互动、昼夜
    bgm.js                背景音乐 + 合成音效
    mobile.js             手机竖屏：镜头、订单条、按设备自动生成的操作盘
    style.css             页面样式（配色字体可被主题 ui 覆盖）
    studio.js/.css        工作站（换图、改菜单做法、改文字、导出主题包）
    templates.js          素材模板页
    tools.js              画模板、打 zip、压缩图片
  guodong/                ← 一个 OC
    index.html            页面（引用 ../engine/）
    studio.html           工作站入口（只在自己电脑上用）
    templates.html        素材模板页
    art.js, home-art.js   这个 OC 的默认手绘（主题包里没有图片的东西就用它画）
    assets/               人物图、音乐
    theme/                主题包：theme.json + dishes / kitchen / furniture / shop-decor / customers / text.json + images/（说明见 theme/README.md）
```

## 打开工作站
双击网站根目录的 **`打开工作站.cmd`**：自动在本机开服务器（端口 8796），用浏览器打开 `guodong/studio.html`。已经开着就直接打开浏览器；用完关掉黑窗口。
别的 OC：命令行运行 `打开工作站.cmd mimi`。草稿按网址保存，所以每次都用这个启动器打开（同一个地址），草稿才接得上。

## 做一个新 OC 的小店
1. 复制整个 `guodong/` 文件夹，改名（比如 `mimi/`）。
2. 改 `mimi/theme/theme.json`：`id`、`name`、`save` 里的三个存档名（**一定要改**，不然会和果冻的存档混在一起）、`page` 里的网页文字。
3. 打开 `mimi/studio.html`（用本地服务器），在工作站里：
   - 人物：上传身体、左右耳；
   - 素材图片：按模板重画店面、设备、菜、客人、家具……（没换的会继续用果冻的手绘，换完一张少一张）；
   - 菜单与做法、厨房设备：改成这个 OC 卖的东西；
   - 文字：便签、故事、台词全部换成 TA 的语气；
   - 界面与音乐：配色、字体、背景音乐。
4. 导出主题包，覆盖到 `mimi/theme/`，在根目录 `index.html`（OC 小宇宙）加一张卡片，推送。
5. 需要全新玩法（新的设备类型）时才改 `engine/game.js`，加一次所有 OC 都能用。

## 改引擎时
- 改了 engine 里的文件，把 `boot.js` 里的 `V` +1，再把各 OC 页面里 `boot.js?v=` 和 `style.css?v=` 改成同一个数字（浏览器缓存）。
- 不要在引擎里写某个 OC 的名字、菜名、台词——放进主题包的 `text.json`（`lines`、`voice`、`story`）。
