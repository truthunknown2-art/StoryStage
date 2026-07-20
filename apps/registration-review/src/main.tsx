import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RegistrationReviewApp } from "./App";
import { emptyRegistrationReviewHost, fixtureRegistrationReviewHost } from "./host";
import { registrationReviewFixture } from "./fixture-model";

// Development-fixture entry point. The host adapter is the only production
// surface; here we mount the declared test fixture (banner is rendered by the
// app whenever the model carries isTestFixture). `?fixture=empty` selects the
// empty fixture variant so the unbound host state can be reviewed too.
const host =
  new URLSearchParams(window.location.search).get("fixture") === "empty"
    ? emptyRegistrationReviewHost
    : fixtureRegistrationReviewHost(registrationReviewFixture);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RegistrationReviewApp host={host} />
  </StrictMode>,
);
