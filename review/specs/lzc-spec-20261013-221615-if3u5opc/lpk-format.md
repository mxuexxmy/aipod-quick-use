# LPK 格式说明

本文描述当前 LPK v1 / v2 的文件组织、字段边界与兼容规则。

说明：

1. 本文中的 `LPK v2` 规则以 `lzcos v1.5.0+` 为前提。
2. 如需构建 `LPK v2`，请配合 `lzc-cli v2.0.0+`。

## 1. 顶层文件组织

典型 LPK 顶层结构：

```text
.
├── manifest.yml
├── package.yml
├── content.tar | content.tar.gz
├── images/
├── images.lock
├── exports/
└── META/
```

说明：

1. `manifest.yml`
   - 应用运行结构定义。
2. `package.yml`
   - 静态包元数据。
3. `content.tar` / `content.tar.gz`
   - 可选的内容归档；如果未配置 `contentdir`，可以不存在。
4. `images/` 与 `images.lock`
   - LPK v2 的 embed image 数据。
5. `exports/`
   - 可选；LPK 导出的静态资源。
6. `META/`
   - 归档元信息。

## 2. `manifest.yml`

`manifest.yml` 只描述运行结构，例如：

- `usage`
- `application`
- `services`
- `ext_config`

约束：

1. 构建阶段允许经过 `#@build` 预处理。
2. 打进最终 LPK 的必须是预处理后的 `manifest.yml`。
3. 部署阶段 render 只负责 `.U` / `.S` 等部署时参数。
4. 对于 LPK v2，以下静态字段不应再放在 `manifest.yml` 中：
   - `package`
   - `version`
   - `name`
   - `description`
   - `locales`
   - `author`
   - `license`
   - `homepage`
   - `min_os_version`
   - `unsupported_platforms`

## 3. `package.yml`

`package.yml` 承载静态包元数据。

字段定义与约束见 [package.yml 规范](./package.md)。

当前字段如下：

```yml
package: cloud.lazycat.app.demo
version: 0.0.1
name: Demo
description: Demo app
locales:
  en:
    name: Demo
    description: Demo app
author: demo
license: MIT
homepage: https://example.com
min_os_version: 1.0.0
unsupported_platforms:
  - ios
import_resources:
  - kind: skills
```

规则：

1. LPK v2（tar 格式）必须包含 `package.yml`。
2. LPK v1（zip 格式）仍兼容旧布局，允许这些静态字段继续留在 `manifest.yml`。
3. 新项目应统一把静态字段放在 `package.yml`。
4. `locales` 语义不变，只是从 `manifest.yml` 迁移到 `package.yml`。
5. `import_resources` 用于声明当前 LPK 希望在运行时导入的资源类型。

## 4. `content.tar` / `content.tar.gz`

规则：

1. 只有配置了非空 `contentdir`，或构建 hook 实际写入内容时，才会生成内容归档。
2. 如果 release 是 image-only 包，可以完全不带 `content.tar*`。
3. tar-based LPK v2 若同时存在 `images/`，内容归档可能被压缩为 `content.tar.gz`。

## 5. `images/` 与 `images.lock`

这部分用于 LPK v2 的 embed image 分发。

规则：

1. `images/` 保存 OCI layout。
2. `images.lock` 记录 alias、最终 digest 以及 upstream 信息。
3. `manifest.yml` 中的 `embed:<alias>@sha256:<digest>` 必须与 `images.lock` 对应记录一致。

## 6. 兼容性

1. zip / v1：继续兼容旧布局，允许静态字段仍位于 `manifest.yml`。
2. tar / v2：要求 `package.yml`，并按当前 v2 规则处理 `images/` 与 `images.lock`。
3. `lzc-os/pkgm` 安装 V1/V2 后，运行目录 `/lzcsys/data/system/pkgm/run/<deploy_id>/pkg/` 会统一按 V2 结构落盘：
   - `manifest.yml` 只保留运行结构
   - `package.yml` 保存静态元数据

## 7. Resource Export

LPK 可以通过固定路径导出静态资源：

```text
exports/<kind>/<resource-id>/...
```

规则：

1. `exports/` 是 LPK 内唯一的资源导出根目录。
2. `exports/<kind>/<resource-id>/` 整个目录就是该资源的 `payload`。
3. 系统只感知 `kind`、`resource-id` 与 `payload`。
4. 当前 LPK 需要消费哪些资源类型，由 `package.yml` 中的 `import_resources` 声明。
5. 运行时导入目录固定为 `/lzcapp/run/resources/<kind>/<package-id>/<resource-id>/...`。
6. 对应的 digest 元数据固定为 `/lzcapp/run/resources/.digest/<kind>/...`。

详细规则见 [LPK Resource Export 规范](./resource-export.md)。
