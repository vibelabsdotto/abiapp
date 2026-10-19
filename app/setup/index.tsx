// /setup opens the profile flow.

import React from "react";
import { Redirect } from "expo-router";

export default function SetupIndexScreen() {
  return <Redirect href="/setup/profile" />;
}
