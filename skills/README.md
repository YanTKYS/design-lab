# Agent Skills

[README に戻る](../README.md)

このフォルダーには、AI エージェント（Claude Code、Codex など）に、このリポジトリの独自デザインを別のアプリへ適用させるための Skill を置いています。形式は [Agent Skills の仕様](https://agentskills.io/specification)（`SKILL.md` と任意の `references/`・`assets/`）に合わせています。

| Skill | 内容 | 依頼での呼び方の例 |
| --- | --- | --- |
| [okinawa-thread-ui](okinawa-thread-ui/SKILL.md) | 「糸の交点」（宮古上布に着想した独自の沖縄テーマ・仮称）：濃藍の地、本文左の格子帯、章の二重罫、「章｜項目名｜値」の軸 | 「糸の交点で」「沖縄テーマ（糸の交点）で」 |
| [h-prime-ui](h-prime-ui/SKILL.md) | 「折本」（H′案・折本に着想した独自デザイン・仮称）：生成りと葡萄色、右から左へ読む縦組みの面、右頁→左頁の見開きのフォーム、狭い幅では横組みへ | 「折本で」「H′で」 |
| [j-risograph-ui](j-risograph-ui/SKILL.md) | 「二色刷り」（J案・リソグラフの二色刷りに着想した独自デザイン・仮称）：生成りの紙に青の版（文字・罫・操作）と蛍光ピンクの版（版ずれ・網点・影の飾りと選択の地）、点線罫の表と行の直後の詳細、青の反転札と二重罫のエラー | 「二色刷りで」「J案で」 |

3つの Skill は、依頼でデザインの名前を指定したときだけ使われるように、`description` で使う場面を分けています（一般的な沖縄テーマ・縦書きの組版・印刷物風のレイアウトなどには使わない）。複数を同じリポジトリに入れても構いません。

**Skill の正本は、当面このリポジトリ（design-lab）の `skills/` です。** K・L を含めた Skill の独立リポジトリへの移行は、[親 Issue #81](https://github.com/YanTKYS/design-lab/issues/81) で判断します（今回は移行していません）。

## 導入する

Skill は**使うアプリのリポジトリ（またはユーザーの設定フォルダー）にコピーしたときだけ**読み込まれます。このリポジトリが GitHub にあるだけでは、ほかのリポジトリの作業に自動では使われません。

使う Skill のフォルダー（`okinawa-thread-ui`、`h-prime-ui`、`j-risograph-ui`）を丸ごと、次の場所へコピーします（シンボリックリンクは不要です。Windows でもエクスプローラーでのコピーで足ります）。

| エージェント | 対象のリポジトリだけで使う | 自分の全リポジトリで使う |
| --- | --- | --- |
| Claude Code | `<アプリのリポジトリ>/.claude/skills/<Skill 名>/` | `~/.claude/skills/<Skill 名>/` |
| Codex | `<アプリのリポジトリ>/.agents/skills/<Skill 名>/` | `~/.agents/skills/<Skill 名>/` |

コピー後の構成（Claude Code の例。Codex は `.claude/` を `.agents/` に読み替え）：

```text
.claude/skills/
├── okinawa-thread-ui/
│   ├── SKILL.md
│   ├── references/
│   │   ├── design-principles.md
│   │   └── patterns.md
│   └── assets/
│       ├── tokens.css
│       └── thread-pattern.svg
├── h-prime-ui/
│   ├── SKILL.md
│   ├── references/
│   │   ├── design-principles.md
│   │   └── patterns.md
│   └── assets/
│       └── tokens.css
└── j-risograph-ui/
    ├── SKILL.md
    ├── references/
    │   ├── design-principles.md
    │   └── patterns.md
    └── assets/
        └── tokens.css
```

コマンドでコピーする場合（アプリのリポジトリの直下で。`<design-lab>` は、このリポジトリを置いた場所）：

```bash
mkdir -p .claude/skills && cp -R <design-lab>/skills/h-prime-ui .claude/skills/
```

```bash
mkdir -p .agents/skills && cp -R <design-lab>/skills/h-prime-ui .agents/skills/
```

（`h-prime-ui` を `j-risograph-ui` などに読み替えます。）

使うときは、依頼の中でデザインの名前を指定します。例：

```text
この画面（src/pages/memo.html）を「糸の交点」の見た目に改修してください。
保存・検証の処理は変えないでください。375px と 1280px で崩れないか確認してください。
```

```text
施設予約の入力画面（src/booking/）を「折本」（H′）の見た目にしてください。
入力の検証・保存・URL は変えないでください。縦組みにするのは名前と章名だけにし、
1280px と 375px で、見た目の順と Tab の順がそろっているか確認してください。
```

```text
備品の貸出台帳（src/lending/）を「二色刷り」（J案）の見た目にしてください。
検索・並べ替え・保存は変えないでください。ピンクは飾りと選択の地だけにし、
1280px と 375px で、網点と文字が重ならないか、絞り込みや並べ替えの後にフォーカスが残るか確認してください。
```

Skill を更新したときは、コピー先も同じフォルダーで上書きします。コピーした側で値を変えた場合は、どちらを正とするかを対象リポジトリの設計メモなどに書いておきます。

## 互換性・動作の確認状況

| 項目 | okinawa-thread-ui | h-prime-ui | j-risograph-ui |
| --- | --- | --- | --- |
| Agent Skills の仕様（`name` の文字種・フォルダー名との一致、`description` の長さ、相対パス） | 確認済み（`npm test` のユニットテスト） | 確認済み（同じユニットテスト） | 確認済み（同じユニットテスト） |
| Claude Code の配置場所（`.claude/skills/`、`~/.claude/skills/`） | Claude Code の公式ドキュメントで確認 | 同左（配置の仕組みは Skill によらない） | 同左 |
| Codex の配置場所（`.agents/skills/`、`~/.agents/skills/`） | 公式ドキュメントのページを取得できなかったため、Codex のソースコード（openai/codex）で確認 | 同左 | 同左 |
| Claude Code・Codex に実際に導入して、Skill が選ばれ・読まれること | **未確認** | **未確認** | **未確認** |
| 別のアプリへの適用：Skill を書いた本人が同じ作業で作った見本 | あり（業務メモ。[検証記録](../examples/okinawa-thread-memo/VERIFICATION.md)） | あり（部屋の予約台帳。[検証記録](../examples/h-prime-room-booking/VERIFICATION.md)） | あり（備品の貸出台帳。[検証記録](../examples/j-risograph-equipment-lending/VERIFICATION.md)） |
| 別のアプリへの適用：別のセッションで Skill だけを渡した評価 | **未検証** | **未検証** | **未検証** |

## 注意

- 「糸の交点」は宮古上布に着想したこのサイト独自のデザインで、公式の意匠・伝統工芸の再現・沖縄全域を代表する様式ではありません。
- 「折本」は折本（蛇腹に折った本）に着想したこのサイト独自のデザインで、和本・経本の再現や公式のデザインシステムではありません。
- 「二色刷り」はリソグラフの二色刷りに着想したこのサイト独自のデザインで、特定の印刷所・製品・作品の再現や公式のデザインシステムではありません。
- Skill に入っているのは色・書体・罫のトークンと規則、最小の例だけです。比較サイトの CSS・HTML・JavaScript（`main.js`、`data-action` の規約、状態モデル、URL の規約など）は含まず、対象アプリの仕組みに合わせて書く前提です。
- `h-prime-ui` のトークンは、原本（比較サイトの `h-prime`）から補助文字と入力欄の枠の色だけを濃くしています（理由は [design-principles.md](h-prime-ui/references/design-principles.md#原本から変えた値)）。`j-risograph-ui` も補助文字と入力欄の例示文字の色を濃くし、大見出しの版ずれを文字の複製ではなく `text-shadow` にしています（[design-principles.md](j-risograph-ui/references/design-principles.md#原本から変えた値)）。比較サイトの `h-prime`・`j-risograph` は変えていません。
- 模様（`thread-pattern.svg`）と折本の印は第三者の素材を含まない自作の図形です。このリポジトリには LICENSE ファイルがないため、組織の外へ再配布するときの条件はリポジトリの所有者に確認してください。
