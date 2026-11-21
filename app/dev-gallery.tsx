// Design-system gallery, development builds only (abiapp://dev-gallery).
// The import sits behind __DEV__, so release bundles contain only the
// redirect.

import React, { Suspense } from "react";
import { Redirect } from "expo-router";

const DevGallery = __DEV__
  ? React.lazy(() => import("@components/dev/DevGallery"))
  : null;

export default function DevGalleryRoute() {
  if (!DevGallery) return <Redirect href="/" />;
  return (
    <Suspense fallback={null}>
      <DevGallery />
    </Suspense>
  );
}
