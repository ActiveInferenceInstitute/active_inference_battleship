import { verifyPackageBuild } from "./package-receipt";
import { projectRoot } from "./paths";

const result = await verifyPackageBuild(projectRoot);
console.log(
  JSON.stringify({
    sourceFiles: result.sourceFiles,
    artifactFiles: result.artifactFiles,
    specificationSha256: result.specificationSha256,
    releaseStatus: result.manifest.releaseStatus,
    performsPublication: false,
  }),
);
