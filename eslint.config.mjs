import { nodeConfiguration } from "@sharadox/es-lint-configuration-web-library/node";
import { databaseEsLintPlugin } from "@sharadox/database-web-library/es-lint-plugin";

export default [...nodeConfiguration(), ...databaseEsLintPlugin.configs.recommended];
