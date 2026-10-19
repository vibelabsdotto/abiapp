# Third-party assets

## Material Symbols and Material Icons (Google)

- `assets/android-menu-icons/menu_*.xml` (except `menu_letter_*.xml`): Material Symbols Outlined, weight 400, 24 px, converted to Android VectorDrawables by `scripts/generate-android-menu-icons.mjs`. Used as native menu icons on Android (`src/constants/menuIcons.ts`).
- `assets/icons/toolbar/*.xml`: Material Icons paths as VectorDrawables for Android header actions (`src/constants/toolbarIcons.ts`).

Source: <https://github.com/google/material-design-icons>
License: Apache License 2.0, <https://www.apache.org/licenses/LICENSE-2.0>
Copyright Google LLC.

`assets/android-menu-icons/menu_letter_d.xml` and `menu_letter_e.xml` are drawn for AbiApp and fall under the project's MIT license.
