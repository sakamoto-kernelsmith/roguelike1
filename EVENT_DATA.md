# Rogue Depths イベント定義書

## 目的

この文書は、[CONTENT_IMPROVEMENT_PLAN.md](C:\MAMP\htdocs\tool\roguelike1\CONTENT_IMPROVEMENT_PLAN.md) で提案した連動イベント群を、実装へ直接渡せるデータ定義の形に落としたものである。

各イベントは、次の項目で管理する。

- `id`
- `line`
- `title`
- `floorRange`
- `trigger`
- `payload`
- `reward`
- `followUp`
- `notes`

---

## 共通仕様

### `id`

英字スネークケースで一意に管理する。

例:

- `expedition_campfire`
- `warden_order_board`
- `lich_truth_fragment`

### `line`

どのイベントラインに属するか。

候補:

- `expedition`
- `sealers`
- `merchants`
- `spirits`
- `civilians`
- `bloodline`

### `floorRange`

発生候補階。

例:

- `[1, 2]`
- `[7, 9]`

### `trigger`

発生条件。

候補:

- `on_floor_start`
- `on_enter_room`
- `on_search_wall`
- `on_open_chest`
- `on_meet_merchant`
- `on_boss_warning_floor`
- `on_interact_remains`

### `payload`

表示文や演出内容。

### `reward`

報酬や分岐の効果。

### `followUp`

後続イベントID。

### `notes`

実装上の補足。

---

## ラインA: 白冠同盟調査隊の最期

## A1

- `id`: `expedition_campfire`
- `line`: `expedition`
- `title`: `消えた焚き火`
- `floorRange`: `[1, 2]`
- `trigger`: `on_enter_room`
- `payload`:
  - `まだ新しい灰だ。おまえ以外にも、ここへ入った者がいる。`
- `reward`:
  - 食料1
  - 低確率で回復薬1
- `followUp`:
  - `expedition_scout_body`
- `notes`:
  - 序盤の探索導線として使う
  - 部屋イベント扱いでよい

## A2

- `id`: `expedition_scout_body`
- `line`: `expedition`
- `title`: `斥候の死体`
- `floorRange`: `[2, 3]`
- `trigger`: `on_interact_remains`
- `payload`:
  - `壁際に、同盟の斥候が倒れている。`
  - `「三階より下、罠の造りが変わる。誰かがまだ守っている」`
- `reward`:
  - 地図の巻物 or 隠し通路のヒント
- `followUp`:
  - `expedition_order_board`
- `notes`:
  - 調査隊ラインの認知イベント

## A3

- `id`: `expedition_order_board`
- `line`: `expedition`
- `title`: `隊長の命令板`
- `floorRange`: `[4, 5]`
- `trigger`: `on_enter_room`
- `payload`:
  - `急いで残された木板がある。`
  - `「門を抜けるな。角のあるものが巡回している」`
- `reward`:
  - ミノタウロス予兆フラグ
- `followUp`:
  - `expedition_broken_supply`
- `notes`:
  - Floor 5 ボス前の予兆

## A4

- `id`: `expedition_broken_supply`
- `line`: `expedition`
- `title`: `壊れた補給箱`
- `floorRange`: `[5, 6]`
- `trigger`: `on_enter_room`
- `payload`:
  - `ここで撤退が破綻したのだろう。物資だけが残されている。`
- `reward`:
  - 回復薬1〜2
  - 防具1
- `followUp`:
  - `expedition_captain_relic`
- `notes`:
  - ミノタウロス撃破後に出やすくしてもよい

## A5

- `id`: `expedition_captain_relic`
- `line`: `expedition`
- `title`: `隊長の遺品`
- `floorRange`: `[7, 8]`
- `trigger`: `on_interact_remains`
- `payload`:
  - `同盟隊長の遺品が残されている。`
  - `「司はまだ下にいる。あれを倒せば終わるわけではない」`
- `reward`:
  - 高品質な実用品1
  - ゴールド
- `followUp`:
  - `expedition_final_record`
- `notes`:
  - 終盤へ向けた意味反転の前振り

## A6

- `id`: `expedition_final_record`
- `line`: `expedition`
- `title`: `最後の記録`
- `floorRange`: `[9, 9]`
- `trigger`: `on_enter_room`
- `payload`:
  - `紙片に、最後の一文だけが残っている。`
  - `「もしここへ至る者がいるなら、核を壊すな。繋ぎ直せ」`
- `reward`:
  - エンディング理解フラグ
- `followUp`:
  - `sealer_late_confession`
- `notes`:
  - 最重要テキストの1つ

---

## ラインB: 封印司と王朝の真相

## B1

- `id`: `sealer_burned_archive`
- `line`: `sealers`
- `title`: `焼けた書庫`
- `floorRange`: `[4, 5]`
- `trigger`: `on_enter_room`
- `payload`:
  - `王朝の記録が焼かれている。隠したかったのは敗北ではなく、真実かもしれない。`
- `reward`:
  - 巻物1
- `followUp`:
  - `sealer_diagram_fragment`
- `notes`:
  - 王朝 lore の入口

## B2

- `id`: `sealer_diagram_fragment`
- `line`: `sealers`
- `title`: `封印図の破片`
- `floorRange`: `[6, 7]`
- `trigger`: `on_interact_remains`
- `payload`:
  - `淵火を囲む図が描かれている。`
  - `「淵火は討てぬ。囲い、縫い止め、眠らせよ」`
- `reward`:
  - 護符系アイテム候補
- `followUp`:
  - `sealer_echo`
- `notes`:
  - `壊すな` の意味を準備する

## B3

- `id`: `sealer_echo`
- `line`: `sealers`
- `title`: `封印司の残響`
- `floorRange`: `[7, 8]`
- `trigger`: `on_enter_room`
- `payload`:
  - `一瞬だけ、声が残る。`
  - `「門は落ちたか。ならば、まだ誰かが来たのだな」`
- `reward`:
  - なし
- `followUp`:
  - `sealer_prayer_rewritten`
- `notes`:
  - 敵でない霊的接触の初例

## B4

- `id`: `sealer_prayer_rewritten`
- `line`: `sealers`
- `title`: `書き換えられた祈り`
- `floorRange`: `[8, 9]`
- `trigger`: `on_enter_room`
- `payload`:
  - `祈祷文が途中から命令文に変わっている。`
  - `「鎮めよ」ではなく「持ちこたえよ」に変わっている。`
- `reward`:
  - なし
- `followUp`:
  - `sealer_late_confession`
- `notes`:
  - リッチの役割反転の直前

## B5

- `id`: `sealer_late_confession`
- `line`: `sealers`
- `title`: `司の告白`
- `floorRange`: `[10, 10]`
- `trigger`: `on_boss_warning_floor`
- `payload`:
  - `おまえもまた、繋ぐために来たのか。`
- `reward`:
  - リッチ戦専用フラグ
- `followUp`:
  - なし
- `notes`:
  - Floor 10 ボス前の短い演出に使う

---

## ラインC: 商人たちの人生

## C1

- `id`: `merchant_lost_cargo`
- `line`: `merchants`
- `title`: `失われた荷`
- `floorRange`: `[2, 4]`
- `trigger`: `on_meet_merchant`
- `payload`:
  - `商人が失くした荷を探している。`
- `reward`:
  - 荷を返す: 割引フラグ
  - 持ち去る: ゴールド or アイテム
- `followUp`:
  - `merchant_seris_secret`
- `notes`:
  - 分岐型イベント

## C2

- `id`: `merchant_seris_secret`
- `line`: `merchants`
- `title`: `セリスの偽り`
- `floorRange`: `[5, 7]`
- `trigger`: `on_meet_merchant`
- `payload`:
  - `あの女は、封を恐れているんじゃない。封が解ける時の値を見ている。`
- `reward`:
  - セリスの在庫変化フラグ
- `followUp`:
  - `merchant_halven_ledger`
- `notes`:
  - 商人の裏事情

## C3

- `id`: `merchant_drum_past`
- `line`: `merchants`
- `title`: `ドラムの過去`
- `floorRange`: `[4, 6]`
- `trigger`: `on_meet_merchant`
- `payload`:
  - `「俺も昔は下を目指した。片脚を置いてきて、それでやめた」`
- `reward`:
  - ボスヒント
  - 実用品割引
- `followUp`:
  - なし
- `notes`:
  - ドラム個別イベント

## C4

- `id`: `merchant_halven_ledger`
- `line`: `merchants`
- `title`: `ハルヴェンの帳簿`
- `floorRange`: `[6, 8]`
- `trigger`: `on_meet_merchant`
- `payload`:
  - `帳簿に、誰が何を買って下へ降りたか記されている。`
- `reward`:
  - 調査隊ライン補強
- `followUp`:
  - `expedition_captain_relic`
- `notes`:
  - 調査隊と商人ラインを接続

---

## ラインD: 亡霊に導かれる謎

## D1

- `id`: `spirit_harmless_shadow`
- `line`: `spirits`
- `title`: `無害な影`
- `floorRange`: `[5, 6]`
- `trigger`: `on_enter_room`
- `payload`:
  - `影が一度だけこちらを見て、攻撃もせずに消えた。`
- `reward`:
  - なし
- `followUp`:
  - `spirit_pointing_wall`
- `notes`:
  - 亡霊イベントの導入

## D2

- `id`: `spirit_pointing_wall`
- `line`: `spirits`
- `title`: `壁を指す亡霊`
- `floorRange`: `[6, 7]`
- `trigger`: `on_search_wall`
- `payload`:
  - `影が壁の前で止まり、消えた。`
- `reward`:
  - 隠し部屋発見
- `followUp`:
  - `spirit_false_warning`
- `notes`:
  - 隠し部屋と結びつけやすい

## D3

- `id`: `spirit_false_warning`
- `line`: `spirits`
- `title`: `誤った警告`
- `floorRange`: `[7, 8]`
- `trigger`: `on_enter_room`
- `payload`:
  - `かすれた声が残る。`
  - `「壊すな」`
- `reward`:
  - 謎フラグ
- `followUp`:
  - `spirit_warning_resolved`
- `notes`:
  - 意味が分からないまま残す

## D4

- `id`: `spirit_warning_resolved`
- `line`: `spirits`
- `title`: `警告の回収`
- `floorRange`: `[9, 10]`
- `trigger`: `on_enter_room`
- `payload`:
  - `亡霊の言葉の続きが、ようやく分かる。`
  - `「核を壊すな。繋ぎ直せ」`
- `reward`:
  - エンディング理解フラグ
- `followUp`:
  - なし
- `notes`:
  - 調査隊ラインの最後と重ねてもよい

---

## ラインE: 一般人の悲劇

## E1

- `id`: `civilian_fleeing_miner`
- `line`: `civilians`
- `title`: `逃亡坑夫`
- `floorRange`: `[2, 4]`
- `trigger`: `on_enter_room`
- `payload`:
  - `坑夫がこちらを見て怯えている。`
- `reward`:
  - 食料を渡す: 情報
  - 無視する: なし
- `followUp`:
  - `civilian_family_letter`
- `notes`:
  - 初期の人間味イベント

## E2

- `id`: `civilian_mad_pilgrim`
- `line`: `civilians`
- `title`: `狂った巡礼者`
- `floorRange`: `[5, 7]`
- `trigger`: `on_enter_room`
- `payload`:
  - `燈火教会の巡礼者だったものが、淵火に呑まれている。`
- `reward`:
  - 特殊ドロップ候補
- `followUp`:
  - なし
- `notes`:
  - 汚染人型導入に向く

## E3

- `id`: `civilian_family_letter`
- `line`: `civilians`
- `title`: `家族への手紙`
- `floorRange`: `[6, 8]`
- `trigger`: `on_interact_remains`
- `payload`:
  - `「春までには帰る、と書いた。たぶん届かない」`
- `reward`:
  - 小ゴールド
  - 感情的なフック
- `followUp`:
  - なし
- `notes`:
  - 報酬は薄くてよい

---

## ラインF: 主人公の血筋と役目

## F1

- `id`: `bloodline_old_seal`
- `line`: `bloodline`
- `title`: `古い印章`
- `floorRange`: `[3, 5]`
- `trigger`: `on_enter_room`
- `payload`:
  - `おまえの持つ紋と同じ刻印が、石に残っている。`
- `reward`:
  - 主人公血筋フラグ
- `followUp`:
  - `bloodline_pillar_reaction`
- `notes`:
  - 主人公の特別性の最初の提示

## F2

- `id`: `bloodline_pillar_reaction`
- `line`: `bloodline`
- `title`: `封印柱の反応`
- `floorRange`: `[6, 8]`
- `trigger`: `on_enter_room`
- `payload`:
  - `封印柱が、おまえの前でだけわずかに光る。`
- `reward`:
  - 一時バフ or lore
- `followUp`:
  - `bloodline_true_name`
- `notes`:
  - 主人公の役目を匂わせる

## F3

- `id`: `bloodline_true_name`
- `line`: `bloodline`
- `title`: `残響の呼称`
- `floorRange`: `[9, 10]`
- `trigger`: `on_enter_room`
- `payload`:
  - `残響が、おまえを「辺境守」と呼ぶ。`
- `reward`:
  - エンディング補強フラグ
- `followUp`:
  - なし
- `notes`:
  - 主人公の役目を確定させる

---

## 最初に実装すべきイベントセット

優先度が高いものだけを抜くと、この10本が最初のセットとして強い。

1. `expedition_campfire`
2. `expedition_scout_body`
3. `expedition_order_board`
4. `expedition_final_record`
5. `sealer_diagram_fragment`
6. `sealer_late_confession`
7. `merchant_lost_cargo`
8. `merchant_drum_past`
9. `spirit_false_warning`
10. `spirit_warning_resolved`

この10本だけでも、

- 調査隊の運命
- 商人の現実
- 王朝の封印
- リッチの意味反転
- 主人公の目的

の骨格をかなり自然に見せられる。

---

## 実装データ形式の推奨

最終的には、以下のような配列データへ落とすと扱いやすい。

```js
const EVENT_DEFS = [
  {
    id: 'expedition_campfire',
    line: 'expedition',
    floorRange: [1, 2],
    trigger: 'on_enter_room',
    messages: [
      'まだ新しい灰だ。おまえ以外にも、ここへ入った者がいる。'
    ],
    reward: { food: 1 },
    followUp: ['expedition_scout_body']
  }
];
```

これにより、後からイベントマネージャーを作る時も整理しやすい。

---

## 追加済み雛形ファイル

この定義書に対応する雛形ファイルは、すでに以下を追加してある。

### データ側

- [event-data.js](C:\MAMP\htdocs\tool\roguelike1\js\event-data.js)

役割:

- イベントライン定数
- トリガー定数
- 報酬タイプ定数
- `EVENT_DEFS`
- `getById`, `getForFloor`, `getByLine`

### 管理側

- [events.js](C:\MAMP\htdocs\tool\roguelike1\js\events.js)

役割:

- イベント状態管理
- 既読、完了、フラグ管理
- フロアとトリガーに応じたイベント候補選定
- メッセージ出力
- 基本報酬処理

---

## `events.js` の現状

現時点の [events.js](C:\MAMP\htdocs\tool\roguelike1\js\events.js) は、既存ゲームには未接続の雛形である。

できること:

- `EventManager.init()`
- `EventManager.reset()`
- `EventManager.trigger(trigger, payload, gameState)`
- `EventManager.getHistory()`
- フラグ管理

まだやっていないこと:

- マップ上のイベント配置
- 報酬アイテムの実スポーン
- NPCとの会話UI
- 条件分岐の詳細処理
- セーブ/ロード

---

## 接続ポイントの推奨

実際に組み込む時は、次の箇所に接続するとよい。

### `js/game.js`

- フロア開始時
  - `on_floor_start`
- 部屋侵入時
  - `on_enter_room`
- 遺体調査時
  - `on_interact_remains`
- ボス前階の警告
  - `on_boss_warning_floor`

### `js/input.js`

- 壁調査入力
  - `on_search_wall`

### `js/item.js`

- 宝箱開封
  - `on_open_chest`

### 商人処理側

- 初回遭遇時
  - `on_meet_merchant`

---

## 最初の実装ステップ

イベントを動かし始める最小構成は次の通り。

1. `index.html` に `js/event-data.js` と `js/events.js` を読み込む
2. `Game.start()` 時に `EventManager.reset()`
3. `generateFloor()` の後に `EventManager.trigger('on_floor_start', {}, this.state)`
4. プレイヤーが部屋へ入った時に `EventManager.trigger('on_enter_room', payload, this.state)`
5. メッセージが出ることを確認

この最小構成が動けば、イベントの追加は定義データ中心で進められる。
