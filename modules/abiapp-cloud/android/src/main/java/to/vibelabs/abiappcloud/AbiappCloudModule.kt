// Google Drive authorization for the cloud backup: an OAuth access token
// for the drive.appdata scope (the app's hidden folder in the user's own
// Drive). The first call per device shows Google's consent sheet; later
// calls return a token without UI. The Drive requests themselves run in JS.

package to.vibelabs.abiappcloud

import android.app.Activity
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.ClearTokenRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata"
private const val REQUEST_AUTHORIZE = 0xAB1

class AbiappCloudModule : Module() {
  private var pendingPromise: Promise? = null

  private val context
    get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No React context", null)

  override fun definition() = ModuleDefinition {
    Name("AbiappCloud")

    // Resolves with the access token, or null when consent is needed but
    // `interactive` is false, or the user closed the consent sheet.
    AsyncFunction("authorizeDrive") { interactive: Boolean, promise: Promise ->
      val request = AuthorizationRequest.Builder()
        .setRequestedScopes(listOf(Scope(DRIVE_APPDATA_SCOPE)))
        .build()
      Identity.getAuthorizationClient(context)
        .authorize(request)
        .addOnSuccessListener { result ->
          if (!result.hasResolution()) {
            promise.resolve(result.accessToken)
            return@addOnSuccessListener
          }
          val activity = appContext.currentActivity
          val intent = result.pendingIntent
          if (!interactive || activity == null || intent == null) {
            promise.resolve(null)
            return@addOnSuccessListener
          }
          pendingPromise?.resolve(null)
          pendingPromise = promise
          try {
            activity.startIntentSenderForResult(
              intent.intentSender, REQUEST_AUTHORIZE, null, 0, 0, 0, null
            )
          } catch (error: Exception) {
            pendingPromise = null
            promise.reject(CodedException("ERR_DRIVE_CONSENT", error.message, error))
          }
        }
        .addOnFailureListener { error ->
          promise.reject(CodedException("ERR_DRIVE_AUTH", error.message, error))
        }
    }

    // Drops a cached token (after HTTP 401), so the next authorize call
    // fetches a fresh one.
    AsyncFunction("clearDriveToken") { token: String, promise: Promise ->
      Identity.getAuthorizationClient(context)
        .clearToken(ClearTokenRequest.builder().setToken(token).build())
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { error ->
          promise.reject(CodedException("ERR_DRIVE_CLEAR", error.message, error))
        }
    }

    OnActivityResult { activity, payload ->
      if (payload.requestCode != REQUEST_AUTHORIZE) return@OnActivityResult
      val promise = pendingPromise ?: return@OnActivityResult
      pendingPromise = null
      if (payload.resultCode != Activity.RESULT_OK) {
        promise.resolve(null)
        return@OnActivityResult
      }
      try {
        val result = Identity.getAuthorizationClient(activity)
          .getAuthorizationResultFromIntent(payload.data)
        promise.resolve(result.accessToken)
      } catch (error: ApiException) {
        promise.reject(CodedException("ERR_DRIVE_CONSENT", error.message, error))
      }
    }
  }
}
