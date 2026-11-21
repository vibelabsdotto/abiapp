// German strings for the cloud backup (settings, prompts, restore offer).
// {{cloud}} is the provider name ("iCloud", in dev builds "Testordner").

export const backupDE = {
  cloudBackup: {
    title: "{{cloud}}-Backup",
    info: "AbiApp sichert deine Fächer, Noten und Prüfungen automatisch in deiner iCloud. Auf deinem iPad oder einem neuen iPhone mit demselben Apple-Account sind sie dann von selbst da. Die Sicherung liegt nur in deinem iCloud-Account, nicht bei uns. Schaltest du sie aus, bleibt die letzte Kopie in iCloud liegen.",
    status: {
      synced: "Zuletzt gesichert: {{time}}",
      never: "Noch nicht gesichert",
      unknown: "Wird geprüft …",
      syncing: "Wird abgeglichen …",
      off: "Aus",
      noAccount: "Nicht bei iCloud angemeldet",
      unsupported: "Nicht verfügbar",
      tooLarge: "Zu viele Daten für {{cloud}}",
      tooNew: "Backup aus einer neueren App-Version",
      conflict: "Abgleich offen",
      error: "Sicherung fehlgeschlagen",
    },
    footer: {
      noAccount:
        "Melde dich in den iOS-Einstellungen mit deinem Apple-Account an und schalte iCloud ein, dann sichert AbiApp von selbst.",
      tooLarge:
        "Exportiere ein Backup als Datei, damit deine Daten auch außerhalb des Geräts liegen.",
      tooNew:
        "Auf einem anderen Gerät läuft eine neuere AbiApp. Aktualisiere AbiApp, dann geht der Abgleich weiter.",
    },
    today: "heute, {{time}}",
    yesterday: "gestern, {{time}}",
    resolve: "Abgleich klären",
    safetyCopy: "Vorherigen Stand zurückholen",
    safetyCopySubtitle: "Sicherheitskopie: {{date}}",
    safetyCopyTitle: "Vorherigen Stand zurückholen?",
    safetyCopyMessage:
      "Deine Daten werden durch die Sicherheitskopie ({{date}}) ersetzt. Der aktuelle Stand wird zur neuen Sicherheitskopie.",
    safetyCopyConfirm: "Zurückholen",
    safetyCopyDone: "Vorheriger Stand zurückgeholt",
    safetyCopyFailed: "Zurückholen fehlgeschlagen",
    applied: "Aktualisiert von {{device}}",
    appliedText: "Den vorherigen Stand holst du in den Einstellungen zurück.",
    conflictTitle: "Welcher Stand soll gelten?",
    conflictMessage:
      "Seit dem letzten Abgleich wurde hier und in {{cloud}} etwas geändert.\n\n{{local}}\n\n{{remote}}\n\nDas Gerät, dessen Stand ersetzt wird, behält ihn als Sicherheitskopie.",
    conflictSide: "{{label}}\n{{date}} · {{subjects}} Fächer, {{grades}} Noten",
    conflictRemoteLabel: "{{cloud}}, von {{device}}",
    keepLocal: "{{device}} behalten",
    takeRemote: "Stand aus {{cloud}} übernehmen",
    later: "Später",
    resolved: "Abgleich erledigt",
    resolveFailed: "Abgleich fehlgeschlagen",
    tooNewTitle: "AbiApp aktualisieren",
    tooNewMessage:
      "Das Backup in {{cloud}} stammt aus einer neueren App-Version. Aktualisiere AbiApp, damit nichts überschrieben wird.",
    deviceThis: {
      iphone: "Dieses iPhone",
      ipad: "Dieses iPad",
      androidPhone: "Dieses Smartphone",
      androidTablet: "Dieses Tablet",
      other: "Dieses Gerät",
    },
    deviceFrom: {
      iphone: "einem iPhone",
      ipad: "einem iPad",
      androidPhone: "einem Android-Smartphone",
      androidTablet: "einem Android-Tablet",
      other: "einem anderen Gerät",
    },
    offer: {
      title: "Backup in deiner {{cloud}} gefunden",
      saved: "Gesichert {{date}} von {{device}}",
      contents: "{{profile}} · {{subjects}} Fächer, {{grades}} Noten",
      restore: "Wiederherstellen",
      decline: "Neu einrichten",
      done: "Backup wiederhergestellt",
      failed: "Wiederherstellen fehlgeschlagen",
    },
    deleteMessage:
      "Das lässt sich nicht rückgängig machen. Behältst du die Kopie in {{cloud}}, bietet AbiApp sie beim nächsten Einrichten wieder an. Andere Geräte behalten ihre Daten und sichern sie wieder.",
    deleteWithCloud: "Auch {{cloud}}-Kopie löschen",
    deleteLocalOnly: "Nur auf diesem Gerät löschen",
    android: {
      section: "Google-Konto",
      title: "Android-Sicherung",
      value: "Automatisch",
      info: "Android sichert AbiApp automatisch in deinem Google-Konto, wenn die Sicherung in den Systemeinstellungen an ist (etwa einmal am Tag im WLAN). Auf einem neuen Android-Gerät mit demselben Konto sind deine Daten nach der Installation wieder da. Einen laufenden Abgleich zwischen zwei Android-Geräten gibt es nicht; dafür bleibt der Export als Datei.",
    },
    drive: {
      notConnected: "Nicht verbunden",
      info: "Mit Google Drive gleicht AbiApp deine Fächer, Noten und Prüfungen zwischen deinen Android-Geräten ab. Die Daten liegen in einem versteckten App-Ordner deines eigenen Google Drive, den nur AbiApp sieht, nicht bei uns. Beim Einschalten fragt Google einmal je Gerät nach deiner Zustimmung. Unabhängig davon sichert Android die App über dein Google-Konto (Android-Sicherung).",
    },
    dev: {
      provider: "Cloud-Anbieter",
      icloud: "iCloud",
      googleDrive: "Google Drive",
      devFolder: "Testordner",
    },
  },
};
