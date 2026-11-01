# Firefox Android build and installation

InstaMind AI is a Firefox WebExtension, not an Android APK. Firefox for Android can run supported WebExtensions, so this project shares its extension source across desktop and mobile.

## Build
The repository workflow **Build Firefox Android package** runs WebExtension linting and creates a distributable archive. It can also request an unlisted Mozilla signature when both Actions secrets below are configured:

- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

Create these credentials in your Mozilla Add-ons developer account. Never put them in source files or commit them.

The unsigned ZIP is a build artifact for inspection only. Firefox Android installation requires the signed `.xpi`.

## Install a signed XPI on Android
1. Download the signed XPI to the device.
2. In Firefox Android, open **Settings → About Firefox**.
3. Tap the Firefox logo five times to reveal the install-from-file option.
4. Return to Settings, select **Install Extension from File**, and choose the signed XPI.
5. Confirm installation and open Instagram in Firefox.

Firefox menu labels and self-distribution support can vary by release. If the option is unavailable, publish the add-on through AMO and install it from Firefox Add-ons instead.

## Device smoke-test checklist
- Extension appears in Firefox Android's Extensions list.
- Popup opens and controls are usable at phone width.
- Following collection works after manually scrolling the list.
- Profile analysis works only after the user explicitly taps Analyze.
- CSV and JSON export trigger a browser download or save flow.
- Data remains local unless the user explicitly requests Gemini analysis.
