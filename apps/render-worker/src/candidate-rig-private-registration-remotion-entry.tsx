import { registerRoot, Still } from "remotion";
import {
  CANDIDATE_RIG_PRIVATE_REGISTRATION_DIAGNOSTIC_ID,
  CandidateRigPrivateRegistrationDiagnostic,
  type CandidateRigPrivateRegistrationDiagnosticProps,
} from "./CandidateRigPrivateRegistrationDiagnostic";

const CandidateRigPrivateRegistrationRoot = () => (
  <Still
    id={CANDIDATE_RIG_PRIVATE_REGISTRATION_DIAGNOSTIC_ID}
    component={CandidateRigPrivateRegistrationDiagnostic}
    width={1920}
    height={1080}
    defaultProps={{} as CandidateRigPrivateRegistrationDiagnosticProps}
  />
);

registerRoot(CandidateRigPrivateRegistrationRoot);
