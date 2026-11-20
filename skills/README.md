# Agent Skills

[README に戻る](../README.md)

このフォルダーには、AI エージェント（Claude Code、Codex など）にこのリポジトリのデザインを別のアプリへ適用させるための Skill を置いています。形式は [Agent Skills の仕様](https://agentskills.io/specification)（`SKILL.md` と任意の `references/`・`assets/`）に合わせています。

| Skill | 内容 |
| --- | --- |
| [okinawa-thread-ui](okinawa-thread-ui/SKILL.md) | 「糸の交点」（宮古上布に着想した独自の沖縄テーマ・名称は仮称）を、新しい画面や既存の画面に適用する |

## 導入する

Skill は**使うアプリのリポジトリ（またはユーザーの設定フォルダー）にコピーしたときだけ**読み込まれます。このリポジトリが GitHub にあるだけでは、ほかのリポジトリの作業に自動では使われません。

フォルダー `okinawa-thread-ui` を丸ごと、次の場所へコピーします（シンボリックリンクは不要です。Windows でもエクスプローラーでのコピーで足ります）。

| エージェント | 対象のリポジトリだけで使う | 自分の全リポジトリで使う |
| --- | --- | --- |
| Claude Code | `<アプリのリポジトリ>/.claude/skills/okinawa-thread-ui/` | `~/.claude/skills/okinawa-thread-ui/` |
| Codex | `<アプリのリポジトリ>/.agents/skills/okinawa-thread-ui/` | `~/.agents/skills/okinawa-thread-ui/` |

コピー後の構成：

```text
.claude/skills/okinawa-thread-ui/   （Codex は .agents/skills/okinawa-thread-ui/）
├── SKILL.md
├── references/
│   ├── design-principles.md
│   └── patterns.md
└── assets/
    ├── tokens.css
    └── thread-pattern.svg
```

使うときは、依頼の中で「糸の交点で」「沖縄テーマ（糸の交点）で」と指定します。例：

```text
この画面（src/pages/memo.html）を「糸の交点」の見た目に改修してください。
保存・検証の処理は変えないでください。375px と 1280px で崩れないか確認してください。
```

Skill を更新したときは、コピー先も同じフォルダーで上書きします。コピーした側で値を変えた場合は、どちらを正とするかを対象リポジトリの設計メモなどに書いておきます。

## 互換性の確認状況

| 項目 | 状況 |
| --- | --- |
| Agent Skills の仕様（`name` の文字種・フォルダー名との一致、`description` の長さ、相対パス） | 確認済み（`npm test` のユニットテストで検査） |
| Claude Code の配置場所（`.claude/skills/`、`~/.claude/skills/`） | Claude Code の公式ドキュメントで確認 |
| Codex の配置場所（`.agents/skills/`、`~/.agents/skills/`） | 公式ドキュメントのページを取得できなかったため、Codex のソースコード（openai/codex）で確認 |
| Claude Code・Codex に実際に導入して、Skill が選ばれ・読まれること | **未確認** |
| 別のアプリへの適用 | 同じ作業の中で作った見本のみ（[examples/okinawa-thread-memo](../examples/okinawa-thread-memo/VERIFICATION.md)）。独立したエージェントのセッションでは試していない |

## 注意

- 「糸の交点」は宮古上布に着想したこのサイト独自のデザインで、公式の意匠・伝統工芸の再現・沖縄全域を代表する様式ではありません。
- Skill に入っているのは色・書体・罫のトークンと規則、最小の例だけです。比較サイトの CSS・HTML・JavaScript（`main.js`、`data-action` の規約など）は含まず、対象アプリの仕組みに合わせて書く前提です。
- 模様（`thread-pattern.svg`）は第三者の素材を含まない自作の図形です。このリポジトリには LICENSE ファイルがないため、組織の外へ再配布するときの条件はリポジトリの所有者に確認してください。
