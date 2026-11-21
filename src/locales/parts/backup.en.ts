// English strings for the cloud backup; keys follow backup.de.ts.

export const backupEN = {
  cloudBackup: {
    title: "{{cloud}} backup",
    info: "AbiApp backs up your subjects, grades and exams to your iCloud automatically. On your iPad or a new iPhone with the same Apple Account they show up by themselves. The backup lives only in your iCloud account, not with us. If you turn it off, the last copy stays in iCloud.",
    status: {
      synced: "Last backup: {{time}}",
      never: "Not backed up yet",
      unknown: "Checking …",
      syncing: "Syncing …",
      off: "Off",
      noAccount: "Not signed in to iCloud",
      unsupported: "Not available",
      tooLarge: "Too much data for {{cloud}}",
      tooNew: "Backup from a newer app version",
      conflict: "Sync needs a decision",
      error: "Backup failed",
    },
    footer: {
      noAccount:
        "Sign in with your Apple Account in the iOS Settings and turn on iCloud; AbiApp then backs up by itself.",
      tooLarge:
        "Export a backup file so your data also lives outside this device.",
      tooNew:
        "Another device runs a newer AbiApp. Update AbiApp to continue syncing.",
    },
    today: "today, {{time}}",
    yesterday: "yesterday, {{time}}",
    resolve: "Resolve sync",
    safetyCopy: "Bring back previous data",
    safetyCopySubtitle: "Safety copy: {{date}}",
    safetyCopyTitle: "Bring back previous data?",
    safetyCopyMessage:
      "Your data is replaced by the safety copy ({{date}}). The current data becomes the new safety copy.",
    safetyCopyConfirm: "Bring back",
    safetyCopyDone: "Previous data restored",
    safetyCopyFailed: "Could not bring it back",
    applied: "Updated from {{device}}",
    appliedText: "You can bring back the previous data in Settings.",
    conflictTitle: "Which data should win?",
    conflictMessage:
      "Since the last sync, something changed here and in {{cloud}}.\n\n{{local}}\n\n{{remote}}\n\nThe device whose data is replaced keeps it as a safety copy.",
    conflictSide:
      "{{label}}\n{{date}} · {{subjects}} subjects, {{grades}} grades",
    conflictRemoteLabel: "{{cloud}}, from {{device}}",
    keepLocal: "Keep {{device}}",
    takeRemote: "Use the {{cloud}} data",
    later: "Later",
    resolved: "Sync resolved",
    resolveFailed: "Sync failed",
    tooNewTitle: "Update AbiApp",
    tooNewMessage:
      "The backup in {{cloud}} comes from a newer app version. Update AbiApp so nothing gets overwritten.",
    deviceThis: {
      iphone: "This iPhone",
      ipad: "This iPad",
      androidPhone: "This phone",
      androidTablet: "This tablet",
      other: "This device",
    },
    deviceFrom: {
      iphone: "an iPhone",
      ipad: "an iPad",
      androidPhone: "an Android phone",
      androidTablet: "an Android tablet",
      other: "another device",
    },
    offer: {
      title: "Backup found in your {{cloud}}",
      saved: "Saved {{date}} from {{device}}",
      contents: "{{profile}} · {{subjects}} subjects, {{grades}} grades",
      restore: "Restore",
      decline: "Start fresh",
      done: "Backup restored",
      failed: "Restore failed",
    },
    deleteMessage:
      "This cannot be undone. If you keep the copy in {{cloud}}, AbiApp offers it again the next time you set up. Other devices keep their data and back it up again.",
    deleteWithCloud: "Also delete {{cloud}} copy",
    deleteLocalOnly: "Delete on this device only",
    android: {
      section: "Google account",
      title: "Android backup",
      value: "Automatic",
      info: "Android backs up AbiApp to your Google Account automatically when backup is on in the system settings (about once a day on Wi-Fi). On a new Android device with the same account your data is back after installing. There is no live sync between two Android devices; the backup file export covers that.",
    },
    dev: {
      provider: "Cloud provider",
      icloud: "iCloud",
      devFolder: "Test folder",
    },
  },
};
