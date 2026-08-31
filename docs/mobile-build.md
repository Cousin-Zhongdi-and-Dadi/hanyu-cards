# HanYu Cards 移动端构建指南

HanYu Cards 使用 Capacitor 8 将同一套 Vue 学习界面封装为 Android 和 iOS App。词库、学习记录、复习、任务、练习和进度统计随 App 本地运行；只有 AI 助教和场景语义评分需要访问已部署的 HanYu Assistant API。

## 当前原生能力

- 使用系统普通话语音朗读，浏览器版本仍使用 Web Speech 回退。
- 复习评分提供轻量触觉反馈。
- 学习数据备份通过系统分享面板导出 JSON 文件。
- Android 返回键依次关闭 AI 面板、返回上一页、回到 Today，最后最小化 App。
- 原生包不注册 PWA Service Worker，Web/PWA 版本仍保留离线缓存。
- AI 地址不是有效的公网 HTTPS 地址时，App 立即使用本地评估与助教回退，不会尝试访问 `localhost`。

## 环境要求

- Node.js 22.12 或更新的 Node 22 版本。
- Android：JDK 21、Android SDK Platform 36、Build Tools 36、Android Studio Otter 2025.2.1 或更新版本。
- iOS：macOS、Xcode 26 或更新版本、CocoaPods。当前 iOS 最低部署版本为 15.0。

项目标识为 `com.hanyucards.app`。Android 当前 `minSdk 24`、`compileSdk 36`、`targetSdk 36`；版本号为 `1.0.0 (1)`。

## AI 生产地址

复制移动端公开配置示例：

```bash
cp .env.mobile.example .env.mobile.local
```

仅设置已部署后端的公开 HTTPS 地址：

```dotenv
VITE_ASSISTANT_API_URL=https://assistant.your-domain.example
```

`AGICTO_API_KEY` 只放在后端运行环境的 `.env` 中，不能放进 `.env.mobile.local`，也不能使用 `VITE_` 前缀。后端的 `ALLOWED_ORIGINS` 需保留 `https://localhost`（Android）和 `capacitor://localhost`（iOS），生产 Web 域名另行加入白名单。

没有配置公网地址时也能构建和使用完整的离线学习功能，但安装包内的 AI 功能会明确进入本地回退模式。

## Android 调试包

Android Studio 通常会创建 `android/local.properties`。纯命令行环境也可先设置 `JAVA_HOME`、`ANDROID_HOME` 和 `ANDROID_SDK_ROOT`，然后运行：

```bash
npm run mobile:android:debug
```

生成文件：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

连接已开启 USB 调试的设备后安装：

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

调试 APK 使用 Android Debug 证书签名，可用于真机测试，不能提交应用商店。

## Android 正式发布

先使用绝对路径设置上传密钥环境变量；不要把密钥库或密码提交到仓库：

```bash
export HANYU_UPLOAD_STORE_FILE=/absolute/path/to/hanyu-upload.jks
export HANYU_UPLOAD_STORE_PASSWORD=...
export HANYU_UPLOAD_KEY_ALIAS=...
export HANYU_UPLOAD_KEY_PASSWORD=...
npm run mobile:android:release
```

该命令会先检查公网 AI 地址与签名变量，再生成：

```text
android/app/build/outputs/bundle/release/app-release.aab
```

每次发布前递增 `android/app/build.gradle` 中的 `versionCode`，并按需要更新 `versionName`。上传 Play Console 前还要在至少一台 Android 16 真机或模拟器上执行完整学习流程。当前包没有原生 `.so` 库，但仍应在 Play Console 对正式 AAB 再做 16 KB 页大小兼容检查。

## iOS 构建

Linux 可以完成 Web 构建、Capacitor 同步和配置检查，不能生成 iOS 归档。在 macOS 上执行：

```bash
npm ci
npm run mobile:ios:release-check
cd ios/App
pod install
open App.xcworkspace
```

在 Xcode 中设置 Apple Developer Team，选择真实设备完成运行测试，再使用 Product → Archive 上传 App Store Connect。工程已包含 iOS 15 部署目标、UIScene 生命周期、非豁免加密声明和 `PrivacyInfo.xcprivacy`。

## 真机验收

- 首次安装、冷启动、后台恢复和升级安装后均能正常进入 Today。
- 断网时可学习、复习、查词、做本地练习和查看进度；重启后数据仍在。
- `Due now`、每日完成数、任务完成数、路线探索度和 Progress 统计会随操作更新。
- 普通话朗读、复习触觉反馈、Android 返回键和系统分享备份均工作正常。
- 导出的 JSON 能在另一份测试数据上恢复；重置操作仍需二次确认。
- 配置公网 API 后，AI 助教与任务语义评分成功；关闭网络后能清楚切换至本地回退。
- 320 px 小屏、平板、横竖屏、键盘弹出和系统字体放大时，关键按钮不被安全区遮挡。
- Android 发布包仅包含预期权限；iOS 隐私清单和 App Store 隐私标签与实际数据流一致。
