# lzc-manifest.yml 规范文档

## 一、 概述
`lzc-manifest.yml` 是用于定义应用运行结构与部署相关配置的文件。 本文档将详细描述其结构和各字段的含义。

说明：自 LPK v2 起，静态包元数据统一放入 [package.yml](./package.md)，包括 `package`、`version`、`name`、`description`、`locales`、`author`、`license`、`homepage`、`min_os_version` 与 `unsupported_platforms`。`lzc-manifest.yml` 只保留运行结构相关字段。

## 二、 顶层数据结构 `ManifestConfig`

### 2.1 基本信息 {#basic-config}

| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `usage` | `string` | 应用的使用须知， 如果不为空， 则微服内每个用户第一次访问本应用时会自动渲染 |

### 2.2 其他配置
| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `ext_config` | `ExtConfig` | 实验性属性， 暂不对外公开 |
| `application` | `ApplicationConfig` | lzcapp 核心服务配置 |
| `services` | `map[string]ServiceConfig` | 传统 docker container 相关服务配置 |


## 三、 `IngressConfig` 配置
### 3.1 网络配置
| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `protocol` | `string` | 协议类型， 支持 `tcp` 或 `udp` |
| `port` | `int` | 目标端口号， 若为空， 则使用实际入站的端口 |
| `service` | `string` | 服务容器的名称， 若为空， 则为 `app` 这个特殊 service |
| `description` | `string` | 服务描述， 以便系统组件渲染应用服务给管理员查阅 |
| `publish_port` | `string` | 允许的入站端口号， 可以为具体的端口号或 `1000~50000` 这种端口范围 |
| `send_port_info` | `bool` | 以 little ending 发送 uint16 类型的实际入站端口给目标端口后再进行数据转发 |
| `yes_i_want_80_443`| `bool` | 为true则允许将80,443流量转发到应用，此时流量完全绕过系统，因此鉴权、唤醒等都不会生效|


## 四、 `ApplicationConfig` 配置
### 4.1 基础配置
| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `image` | `string` | 应用镜像，支持合法镜像引用，也支持 `embed:<alias>`（alias 由 `lzc-build.yml.images` 定义）；若无特殊要求请留空使用系统默认镜像(alpine3.21) |
| `subdomain` | `string` | 本应用的入站子域名，应用打开默认使用此子域名 |
| `multi_instance` | `bool` | 是否以多实例形式部署 |
| `usb_accel` | `bool` | 挂载相关设备到所有服务容器内的 `/dev/bus/usb` |
| `gpu_accel` | `bool` | 挂载相关设备到所有服务容器内的 `/dev/dri` |
| `kvm_accel` | `bool` | 挂载相关设备到所有服务容器内的 `/dev/kvm` 和 `/dev/vhost-net` |
| `vt` | `bool` | 是否为 lzcapp 启用物理显示器 VT，默认 `false`。启用时必须声明 `vt.display` 权限，且所有 service 均不能使用 `sysbox-runc`，详见 [物理显示器应用](../advanced-vt.md) |
| `depends_on` | `[]string` | 依赖的其他容器服务， 仅支持本应用内的其他服务， 且强制检测类型为 `healthly`， 可选 |

### 4.2 功能配置
| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `file_handler` | `FileHandlerConfig` | 声明本应用支持的扩展名， 以便其他应用在打开特定文件时可以调用本应用 |
| `entries` | `[]EntryConfig` | 应用入口声明，用于配置多个入口的名称和地址信息，详见 4.3 |
| `routes` | `[]string` | 简化版 http 相关路由规则 |
| `upstreams` | `[]UpstreamConfig` | 高级版本 http 相关路由规则，与routes共存 |
| `public_path` | `[]string` | 独立鉴权的 http 路径列表 |
| `injects` | `[]InjectConfig` | 脚本注入配置，用于在指定路径注入脚本（lzcinit） |
| `workdir` | `string` | `app` 容器启动时的工作目录 |
| `ingress` | `[]IngressConfig` | TCP/UDP 服务相关 |
| `environment` | `map[string]string \| []string` | `app` 容器的环境变量，支持 map 或 list 形式 |
| `health_check` | `AppHealthCheckExt` | `app` 容器的健康检测， 仅建议在开发调试阶段设置 `disable` 字段， 不建议进行替换， 否则系统默认注入的自动依赖检测逻辑会丢失 |
| `oidc_redirect_path` | `string` | 合法的 OIDC redirect path，完整域名会自动根据 subdomain 进行拼接 |
| `user` | `string` | `app` 容器运行用户，语法与 Docker Compose `user` 一致，可使用 UID、UID:GID、用户名或用户名:组名 |
| `run_as` | `string \| int` | `app` 容器运行的数字 UID/GID，同时启用 `/lzcapp` 持久目录的 owner 映射。格式见 4.5 |

提示：`routes` 在转发时默认会去掉路径前缀。如需保留前缀，请使用 `upstreams` 并设置 `disable_trim_location: true`（lzcos v1.3.9+）。

### 4.3 多入口配置 {#entries}

`entries` 用于声明多个入口，系统可在启动器里展示多个入口。

| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `string` | 入口的唯一 ID |
| `title` | `string` | 入口标题 |
| `path` | `string` | 入口路径，通常以 `/` 开头。支持传递query参数 |
| `prefix_domain` | `string` | 入口域名前缀，最终域名表现为 `<prefix>-<subdomain>.<rootdomain>` |

入口标题支持通过 `locales` 配置 `entries.<entry_id>.title` 进行多语言本地化。

### 4.4 脚本注入配置 {#injects}

#### InjectConfig
| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `id` | `string` | 注入配置的唯一 ID |
| `on` | `string` | 阶段，支持 `browser`/`request`/`response`，默认 `browser` |
| `prefix_domain` | `string` | 域名前缀过滤，仅匹配 `<prefix>-<subdomain>...` |
| `auth_required` | `bool` | 是否要求请求带合法 `SAFE_UID`，默认 `true` |
| `when` | `[]string` | 命中条件（OR），至少 1 条；支持精确匹配或末尾 `*` 前缀匹配 |
| `unless` | `[]string` | 排除条件（OR），可选；支持精确匹配或末尾 `*` 前缀匹配 |
| `do` | `string \| []InjectScriptConfig` | 脚本定义，支持 short syntax 和 long syntax |

#### InjectScriptConfig
| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `src` | `string` | 脚本来源，支持 `builtin://...`、`file:///...`、inline script |
| `params` | `map[string]any` | 传递给脚本的参数 |

更多说明（阶段执行环境、`ctx` helper、内置脚本、排查与实践）见：[脚本注入（injects）](../advanced-injects.md)。

### 4.5 `run_as` 配置 {#run_as}

说明：`run_as` 需要 `lzcos v1.6.0+`。

`run_as` 用于声明容器内主进程使用的数字 UID/GID，并让系统按同一身份映射 `/lzcapp` 下的持久目录 owner。

支持格式：

| 写法 | 含义 |
| ---- | ---- |
| `1000` | 使用 UID `1000`，GID 同样为 `1000` |
| `"1000:1000"` | 使用 UID `1000`、GID `1000` |

规则：

1. `run_as` 只接受数字 UID/GID，不接受用户名或组名。
2. `application.run_as` 不得与 `application.user` 同时使用。
3. `services.<name>.run_as` 不得与同一 service 的 `user` 或 `setup_script` 同时使用。
4. `application.run_as` 只作用于内置 `app` service；不会自动作用到 `services` 中未声明 `run_as` 的其他 service。
5. 每个 service 可以单独声明自己的 `run_as`。不同 service 声明不同 UID/GID 时，会分别获得与自身身份一致的 `/lzcapp` 持久目录视图。
6. 使用 `run_as` 后，容器内看到的 `/lzcapp/document`、`/lzcapp/documents/<uid>`、`/lzcapp/var`、`/lzcapp/cache` 会按声明的 UID/GID 暴露 owner。容器内该 UID/GID 创建的新文件也会保持同一 owner 语义。
7. `/lzcapp/run` 是运行态目录，系统保证声明了 `run_as` 的容器仍可写入该目录。
8. 如果继续使用 `user` 字段，则只调整容器进程用户，不启用上述 `/lzcapp` 持久目录 owner 映射。

示例：

```yml
application:
  subdomain: demo
  run_as: "1000:1000"

services:
  worker:
    image: registry.lazycat.cloud/lzc/lzcapp:3.20.3
    run_as: "2000:2000"
```

## 五、 `HealthCheckConfig` 配置
### 5.1 AppHealthCheckExt
| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `test_url` | `string` | 仅 application 字段下生效。 扩展的检测方式， 直接提供一个 http url 不依赖容器内部有 curl/wget 之类的命令行 |
| `disable` | `bool` | 禁用本容器的健康检测 |
| `start_period` | `string` | 启动等待阶段时间， 超出此时间范围后若还未进入 `healthly` 状态则会变为 `unhealthy` |
| `timeout` | `string` | 单次检测耗时超过`timeout`则认为检测失败 |


### 5.2 HealthCheckConfig

| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `test` | `[]string` | 在对应容器内执行什么命令进行检测， 如：`["CMD", "curl", "-f", "http://localhost"]`
| `timeout` | `string` | 单次检测耗时超过`timeout`则认为本次检测失败 |
| `interval` | `string` | 每次检测间隔时间 |
| `retries` | `int` | 连续多少次检测失败后让整个容器进入unhealthy状态。默认值1 |
| `start_period` | `string` | 启动等待阶段时间， 超出此时间范围后若还未进入 `healthly` 状态则会变为 `unhealthy` |
| `start_interval` | `string` | 在start_period时间内，每隔多久执行一次检测 |
| `disable` | `bool` | 禁用本容器的健康检测 |


## 六、 `ExtConfig` 配置 {#ext_config}

| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `enable_document_access` | `bool` | 如果为true则启用旧的用户文稿兼容路径`/lzcapp/run/mnt/home`（`v1.7.0` 起需管理员明确授权后才能访问） |
| `enable_media_access` | `bool` | 如果为true则将media目录挂载到/lzcapp/media |
| `enable_clientfs_access` | `bool` | 如果为true则将clientfs目录挂载到/lzcapp/clientfs |
| `disable_grpc_web_on_root` | `bool` | 如果为true则不再劫持应用的grpc-web流量。需要配合新版本lzc-sdk以便系统本身的grpc-web流量可以正常转发|
| `default_prefix_domain` | string | 会调整启动器中点击应用后打开的[最终域名](../advanced-secondary-domains)，可以写任何不含`.`的字符串 |
| `enable_bind_mime_globs` | `bool` | 如果为true则绑定系统的 mime globs 到容器内的 `/usr/share/mime/globs2` |



## 七、 `ServiceConfig` 配置

### 7.1 容器配置 {#container-config}

| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `image` | `string` | 对应容器的 docker 镜像，支持合法镜像引用，也支持 `embed:<alias>`（alias 由 `lzc-build.yml.images` 定义） |
| `environment` | `map[string]string \| []string` | 对应容器的环境变量，支持 map 或 list 形式 |
| `entrypoint` | `*string` | 对应容器的 entrypoint， 可选 |
| `command` | `*string` | 对应容器的 command， 可选 |
| `tmpfs` | `[]string` | 挂载 tmpfs volume， 可选 |
| `depends_on` | `[]string` | 依赖的其他容器服务(app这个名字除外)， 仅支持本应用内的其他服务， 且强制检测类型为 `healthly` 可选 |
| `healthcheck` | `*HealthCheckConfig` | 容器的健康检测策略, 老版本`health_check`已被废弃 |
| `user` | `*string` | 容器运行的 UID 或 username， 可选 |
| `run_as` | `string \| int` | 容器运行的数字 UID/GID，同时启用 `/lzcapp` 持久目录的 owner 映射。格式见 4.5 |
| `cpu_shares` | `int64` | CPU 份额 |
| `cpus` | `float32` | CPU 核心数 |
| `mem_limit`| `string\|int` | 容器的内存上限 |
| `shm_size`| `string\|int` | /dev/shm/大小 |
| `network_mode` | `string` | 网络模式， 目前只支持`host`或留空。 若为 `host` 则会容器的网络为宿主网络空间。 此模式下应用进行网络监听时务必注意鉴权， 非必要不要监听 `0.0.0.0` |
| `netadmin` | `bool` | 若为 `true`， 则容器具备 `NET_ADMIN` 权限， 可以操作网络相关系统调用， 如无必要请不要使用。 若使用此功能， 请务必小心不要扰乱 iptables 相关规则 |
|`setup_script` | `*string` | 配置脚本， 脚本内容会以 root 权限执行后， 再按照 OCI 的规范执行原始的 entrypoint 内容。 本字段和 entrypoint,command 字段冲突， 无法同时设置， 可选 |
| `binds` | `[]string` | lzcapp 容器的 rootfs 重启后会丢失， 仅 `/lzcapp/var`, `/lzcapp/cache` 路径下的数据会永久保留。 因此其他需要保留的目录需要 bind 到这两个目录之下。 此列表仅支持 `/lzcapp` 开头的路径 |
| `runtime` | `string` | 	指定OCI runtime。支持`runc`和`sysbox-runc`。sysbox-runc隔离程度更高，能跑完整的dockerd,systemd等。但不支持network_mode=host之类namespace共享相关的功能更|


## 八、`FileHandlerConfig` 配置
### 8.1 文件处理配置
| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `mime` | `[]string` | 支持的 MIME 类型列表 |
| `actions` | `map[string]string` | 动作映射 |

## 九、`HandlersConfig` 配置（已废弃）

### 9.1 处理程序配置（已废弃）
`application.handlers` 已废弃。请求和响应处理逻辑请使用 `application.injects` 的 `request` / `response` 阶段实现。

| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `acl_handler` | `string` | 已废弃，ACL 处理程序，可使用 `request inject` 替代 |
| `error_page_templates` | `map[string]string` | 已废弃，错误页面模板，可使用 `response inject` 替代，可选 |


## 十、`UpstreamConfig` 配置
| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `location` | `string` | 入口匹配的路径 |
| `disable_trim_location` | `bool` | 转发到`backend`时，不要自动去掉`location`前缀 (lzcos v1.3.9+)|
| `domain_prefix` | `string` | 入口匹配的域名前缀 |
| `backend` | `string` | 上游的地址，需要是一个合法的url，支持http,https,file三个协议 |
| `use_backend_host` | `bool` | 如果为true,则访问上游时http host header使用backend中的host，而非浏览器请求时的host |
| `backend_launch_command` | `string` | 自动启动此字段里的程序 |
| `trim_url_suffix` | `string` | 自动删除请求后端时url可能携带的指定字符 |
| `disable_backend_ssl_verify` | `bool` | 请求backend时不进行ssl安全验证 |
| `disable_auto_health_checking` | `bool` | 禁止系统自动针对此条目生成的健康检测 |
| `disable_url_raw_path` | `bool` | 如果为true则删除http header中的raw url |
| `remove_this_request_headers` | `[]string` | 删除这个列表内的http request header， 比如"Origin"、"Referer" |
| `fix_websocket_header` | `bool` | 自动将Sec-Websocket-xxx替换为Sec-WebSocket-xxx |
| `dump_http_headers_when_5xx` | `bool` | 如果http上游出现5xx, 则dump请求 |
| `dump_http_headers_when_paths` | `[]string` | 如果与到此路径下的http, 则dump请求 |



## 十一、本地化 `I10nConfigItem` 应用配置 {#i18n}

`locales` 用于让应用支持多语言，支持设置的 language key 规范可参考 [BCP 47 标准](https://en.wikipedia.org/wiki/IETF_language_tag)。自 LPK v2 起，`locales` 配置位于 `package.yml`，语义不变。

| 字段名 | 类型 | 描述 |
| ---- | ---- | ---- |
| `name` | `string` | 应用名称本地化字段 |
| `description` | `string` | 应用描述本地化字段 |
| `usage` | `string` | 应用的使用须知本地化字段 |
| `entries.<entry_id>.title` | `string` | 入口标题本地化字段，`entry_id` 需与 `application.entries` 中的 `id` 一致 |

说明：入口标题可通过 `locales` 配置 `entries.<entry_id>.title` 进行多语言本地化。

::: details 配置示例
```yml
# package.yml
package: cloud.lazycat.app.netatalk
version: 0.0.1
name: Apple 时间机器备份
description: Netatalk 服务可用于 Apple 时间机器备份
author: Netatalk
locales:
  zh:
    name: "Apple 时间机器备份"
    description: "Netatalk 服务可用于 Apple 时间机器备份"
  zh_CN:
    name: "Apple 时间机器备份"
    description: "Netatalk 服务可用于 Apple 时间机器备份"
  en:
    name: "Time Machine Server"
    description: "Netatalk service can be used for Apple Time Machine backup"
  ja:
    name: "タイムマシンサーバー"
    description: "Netatalk サービスは Apple Time Machine のバックアップに使用できます"
```

```yml
# lzc-manifest.yml
application:
  subdomain: netatalk3
```
:::
