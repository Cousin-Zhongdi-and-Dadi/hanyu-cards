# HanYu Cards 发布检查清单

## 通用

- 使用 Node.js 22.12+ 执行 `npm ci`，确认 `npm run lint`、`npm run stylelint`、`npm run test:ci` 和 `npm run build` 全部通过。
- 将 `public/privacy.html` 部署到发布者域名，并核对 `THIRD_PARTY_NOTICES.md`。
- 从 `.env.mobile.example` 创建未提交的 `.env.mobile.local`，其中只填写已部署的 HTTPS 助教地址；Agicto key 只存在于后端 `.env`。
- 确认 App 名称 `HanYu Cards`、包标识 `com.hanyucards.app`、版本号和商店元数据一致。
- 默认发行版保持无账号、无广告、无追踪；披露本地学习进度以及用户主动发送给 AI 的消息和学习上下文。

## Android

- 使用 JDK 21、Android SDK/Build Tools 36 和 Capacitor 8；运行 `npm run mobile:android:debug` 并完成真机测试。
- 2026-08-31 起，Google Play 的新应用和更新需以 Android 16/API 36 为目标；发布前再次核对 [Google Play 官方要求](https://support.google.com/googleplay/android-developer/answer/11926878?hl=zh-Hans)。
- 递增 `versionCode`，设置四个 `HANYU_UPLOAD_*` 签名环境变量，运行 `npm run mobile:android:release` 生成签名 AAB。
- 用 Play App Signing 管理正式签名，检查权限、数据安全表、16 KB 页大小兼容性和 Android vitals。
- 验证 `allowBackup=false`、禁止明文流量，并确认没有把 API key 或签名信息打入安装包。

## iOS

- 在 macOS 上使用 Xcode 26+ 和 iOS 26 SDK；Apple 自 2026-04-28 起按此最低 SDK 接收上传，发布前再次核对 [Apple 官方提交要求](https://developer.apple.com/app-store/submitting/)。
- 运行 `npm run mobile:ios:release-check`，在 `ios/App` 执行 `pod install`，打开 `App.xcworkspace`。
- 设置 Apple Developer Team，确认版本/构建号、iOS 15 最低版本、UIScene 生命周期和 `PrivacyInfo.xcprivacy`。
- 在当前 iPhone 和 iPad 上测试，再通过 TestFlight 完成冷启动、前后台切换、分享和网络回退验收。

## 上架前 QA

- 离线首次启动及学习主流程可用，AI 不可用时明确显示本地回退。
- Today、Missions、Practice 和 Progress 的计数及进度随实际学习实时更新。
- 普通话朗读、触觉反馈、系统分享备份和 Android 返回键行为正确。
- 小屏、平板、横竖屏、字体放大、键盘和安全区不遮挡关键控件。
- 备份/恢复与重置均在测试数据上验证；升级安装不丢失现有本地进度。
- 隐私政策、商店隐私标签、第三方声明和实际网络请求保持一致。

更完整的构建、安装和签名步骤见 [mobile-build.md](mobile-build.md)。
