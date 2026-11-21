// iCloud key-value storage for the cloud backup. The store syncs on its
// own between devices with the same Apple account; this module only reads,
// writes and reports external changes and account changes to JS.

import ExpoModulesCore
import Foundation

private let changeEvent = "onChange"

public class AbiappCloudModule: Module {
  private var observers: [NSObjectProtocol] = []

  private var store: NSUbiquitousKeyValueStore {
    NSUbiquitousKeyValueStore.default
  }

  public func definition() -> ModuleDefinition {
    Name("AbiappCloud")

    Events(changeEvent)

    OnCreate {
      // Apple: register for changes and synchronize shortly after launch.
      _ = NSUbiquitousKeyValueStore.default.synchronize()
    }

    OnStartObserving {
      self.startObserving()
    }

    OnStopObserving {
      self.stopObserving()
    }

    OnDestroy {
      self.stopObserving()
    }

    /// nil token: no Apple account, or iCloud is off for this device.
    Function("isSignedIn") { () -> Bool in
      FileManager.default.ubiquityIdentityToken != nil
    }

    /// False when the app lacks the key-value entitlement.
    Function("synchronize") { () -> Bool in
      self.store.synchronize()
    }

    /// Snapshot JSON, stored zlib-compressed as Data: the 1 MB limit
    /// counts the stored form, and a String could be stored as UTF-16.
    Function("getSnapshot") { (key: String) throws -> String? in
      guard let stored = self.store.data(forKey: key) else { return nil }
      let json = try (stored as NSData).decompressed(using: .zlib) as Data
      guard let text = String(data: json, encoding: .utf8) else {
        throw SnapshotEncodingException()
      }
      return text
    }

    /// Writes nothing when the compressed snapshot exceeds `maxBytes`.
    Function("setSnapshot") { (key: String, json: String, maxBytes: Int) throws -> [String: Any] in
      guard let data = json.data(using: .utf8) else {
        throw SnapshotEncodingException()
      }
      let compressed = try (data as NSData).compressed(using: .zlib) as Data
      if compressed.count > maxBytes {
        return ["written": false, "bytes": compressed.count, "synchronized": false]
      }
      self.store.set(compressed, forKey: key)
      return [
        "written": true,
        "bytes": compressed.count,
        "synchronized": self.store.synchronize(),
      ]
    }

    Function("remove") { (key: String) -> Bool in
      self.store.removeObject(forKey: key)
      return self.store.synchronize()
    }
  }

  private func startObserving() {
    guard observers.isEmpty else { return }
    let center = NotificationCenter.default
    observers.append(
      center.addObserver(
        forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
        object: NSUbiquitousKeyValueStore.default,
        queue: nil
      ) { [weak self] notification in
        let reason =
          notification.userInfo?[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int
        let keys =
          notification.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
        self?.sendEvent(changeEvent, [
          "reason": Self.reasonName(reason),
          "keys": keys,
        ])
      })
    observers.append(
      center.addObserver(
        forName: .NSUbiquityIdentityDidChange,
        object: nil,
        queue: nil
      ) { [weak self] _ in
        self?.sendEvent(changeEvent, ["reason": "identity", "keys": []])
      })
  }

  private func stopObserving() {
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    observers.removeAll()
  }

  private static func reasonName(_ reason: Int?) -> String {
    switch reason {
    case NSUbiquitousKeyValueStoreServerChange: return "server"
    case NSUbiquitousKeyValueStoreInitialSyncChange: return "initialSync"
    case NSUbiquitousKeyValueStoreQuotaViolationChange: return "quota"
    case NSUbiquitousKeyValueStoreAccountChange: return "account"
    default: return "unknown"
    }
  }
}

internal final class SnapshotEncodingException: Exception {
  override var reason: String {
    "The snapshot is not valid UTF-8"
  }
}
