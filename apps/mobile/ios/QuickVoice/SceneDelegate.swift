import React
import UIKit

/// Required starting with the iOS 27 SDK: a build against it that has no
/// scene configuration fails to launch at all —
/// "UIScene life cycle is required for apps built with this SDK" — before a
/// single line of AppDelegate or JS runs. AppDelegate still builds the React
/// Native factory (see reactNativeFactory/launchOptions there); this only
/// takes over creating the window once a real UIWindowScene exists, which is
/// the one piece the old application(_:didFinishLaunchingWithOptions:) path
/// can no longer do itself.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    appDelegate.window = window
    self.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)
  }
}
