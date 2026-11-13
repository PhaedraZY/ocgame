# 主题包（theme/）说明

这个文件夹里放的是**这个 OC 自己的东西**：文字、价格、菜单、家具、客人、图片。引擎代码（`*.js`）不用动。
换人物 / 换画风 / 加商品，只改这里。

> 必须用本地服务器或线上地址打开网页（`python -m http.server`），直接双击 html 读不到 JSON。

## 文件

| 文件 | 内容 |
|---|---|
| `theme.json` | 总表：网页标题和文字（`page`）、存档名（`save`）、人物图（`oc`）、音乐（`audio`）、换掉的图片（`images`）、界面配色字体（`ui`）、其他文件的位置（`files`） |
| `dishes.json` | 菜单：`id`、`name`、`day`（第几天解锁）、`price`、`pat`（客人耐心倍数）、`ready`（做好了才上架） |
| `furniture.json` | 小屋家具：`categories` 分类名，`scale` 整体放大倍数，`items` 里每件：`name`、`cat`、`price`、`comfort`（舒适度）、`w`/`h`（尺寸）、`zone`（`floor` 地上 / `wall` 墙上 / `small` 小摆件 / `rug` 地毯）、`surf`（上面能放东西的台面）、`soft`、`limit`、`line`（果冻说的话） |
| `shop-decor.json` | 店里的装饰：`id`、`name`、`price`、`line` |
| `customers.json` | 客人：`id`、`name`、`pat`（耐心）、`tip`（小费）、`ok` / `bad` / `leave`（台词） |
| `text.json` | 便签（`notes`）、日记（`diary`）、新菜做法（`recipes`）、第一天开店便签（`intro`）、果冻的台词（`lines`） |
| `kitchen.json` | 厨房：物品（`items`）和设备（`stations`），见下面「做法」 |
| `images/` | 你画的图（见下） |

## 做法（菜谱 = 设备 + 流程）

`kitchen.json` 里每台设备有一个**类型**，物品在设备之间按规则流动：

| 类型 | 做什么 | 例子 | 关键字段 |
|---|---|---|---|
| `source` | 点它就拿一个原料，送到 `to` | 鸡蛋、面包篮 | `item`、`to` |
| `bench` | 放料，凑齐后连点 N 下，做出东西 | 搅拌碗、砧板 | `rules: [{ need, makes, taps, to }]`、`tap`（“搅”“切”） |
| `cooker` | 放料凑齐自动开始计时；可多格；放久会糊；可中途翻面 | 小锅、蒸笼、冰箱、平底锅 | `rules: [{ need, makes, cook, burn, flip, cook2, to }]`、`slots`、`verb` |
| `plates` | 出餐盘 | 3 个盘子 | `slots` |
| `topping` | 给盘子上的菜加料 | 焦糖、巧克力酱 | `item` |
| `fill` | 点它：果冻把杯子拿过来；**按住**灌，在绿色刻度里松手；灌满会溢出（赔原料） | 苏打水龙头 | `item`、`rate`（每秒涨多少）、`band`（[下限, 上限]）、`box`（灌的时候显示杯子的小气泡）、`gauge`（刻度条位置） |
| `bell` | 出餐铃 | | |

- `to` 写设备的 `id`，写 `plates` 就是装盘。
- `need` 是要放进去的东西（顺序无所谓）；同一个设备可以有好几条规则（碗：糖→布丁液，面粉→面糊），**不在同一条规则里的东西不能放一起**。
- 设备和规则都可以写 `need`（设备）/ `need_dish`（规则）= 某道菜的 id，那道菜解锁后才出现。
- `say` 里写这一步果冻说的话（`start` 开始、`done` 好了、`flip` 该翻面、`burnt` 糊了、`dump` 倒掉）。
- 物品的 `cost` 是倒掉时赔的钱；做出来的东西自动按原料加起来算。

`dishes.json` 里每道菜说清楚**成品是什么**：
- 装盘的菜：`"base": "pudding"`（哪个物品装盘），`"toppings": ["caramel"]`（还要加什么；加料可以来自加料瓶、`fill` 水龙头，或者别的设备做好送来，比如砧板切的青柠片）。
- 叠的菜：`"stack": ["bun", "lettuce", "friedPine", "friedEgg", "bun"]`（从下往上，叠错要重来）。
- `"melt": 20`：做好后 20 秒会化（饮料），化了没有小费。
- 每天菜单最多几道：`theme.json` 的 `"maxDishes"`（默认 5）。超过时每天轮换，新解锁的菜头两天一定上，另有一道「今日特供」×1.5。

教学提示是**自动算出来的**：从客人点的菜倒着找“哪台设备做这个、它还缺什么、缺的东西从哪来”，所以新菜不用另写提示。

> 只用现有设备类型组合的新菜：改 JSON + 画图就能上架。需要全新玩法（比如"按住灌苏打"）才要加代码，加一次以后都能复用。

## 换图

1. 打开 `templates.html`（和 `index.html` 同一个文件夹），能看到所有能换的东西（146 个），每个都写了**文件名、尺寸、规格**。
2. 下载模板（现在的手绘，已经是正确尺寸、2 倍清晰度、透明底），在上面重画。**文件名不变**。
3. 放进 `theme/images/`，把文件名写进 `theme.json`：
   ```json
   "images": ["shop.fridge.png", "dish.pudding.png", "ui.button.png"]
   ```
4. 刷新网页。没换的东西继续用手绘，换一半也不会坏。

### 规格（长边最大像素 / 文件大小）
| 类型 | 最大 | 说明 |
|---|---|---|
| 场景背景（`shop.room`、`shop.counter`、`room`） | 2400 px / 1.5 MB | 拉伸铺满 |
| 人物（`oc.body` 等，在 `theme.json` 的 `oc` 里） | 1600 px / 800 KB | 透明 PNG / WebP |
| 大物件（家具、冰箱、门……） | 1024 px / 400 KB | 按比例放，贴底居中 |
| 小物件（原料、设备、菜、客人、手上拿的） | 512 px / 200 KB | 按比例放，贴底居中 |
| 界面（`ui.*`：纸、按钮、便签、胶带、商品卡） | 512 px / 150 KB | 拉伸铺满；`ui.page` 平铺 |

### 名字的规律
- `shop.*` 店面里固定的东西；`decor.*` 店里买的装饰
- `stove.* / steamer.* / bowl.* / board.* / griddle / fry.* / magnet.*` 设备的每个状态
- `dish.*` 盘子上的成品（`.plain` = 还没淋酱）；`layer.*` 汉堡的每一层；`carry.*` 果冻手上拿的
- `customer.*` 客人（背影）
- `room`、`room.night`、`room.view`、`room.view.night` 小屋；`item.*` 家具（`.open` = 开着门）
- `ui.*` 网页界面

### 小屋整张换
`room.png` 的**窗户玻璃要挖空（透明）**，窗外风景用 `room.view.png` 单独画，这样白天 / 夜晚可以换不同的窗外。

## 配色和字体
```json
"ui": { "colors": { "--line": "#7a6c66", "--paper": "#fbf8f0", "--apple": "#bcd97a" },
        "fonts": { "--f-hand": "\"LXGW WenKai\", serif" } }
```
可以改的变量：`--line`（线条/文字）、`--soft`、`--apple`（主色）、`--apple-d`、`--pink`、`--mist`、`--dot`、`--paper`、`--dark`、`--f-hand`（正文字体）、`--f-cute`（标题字体）、`--f-en`（英文字体）。
