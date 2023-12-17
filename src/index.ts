import { exec } from 'node:child_process';

import core from '@actions/core';

/**
 * References:\
 * https://github.com/pnpm/pnpm/blob/036afc632cb856b3a191c22484acd6e2c4439568/reviewing/plugin-commands-outdated/src/outdated.ts#L269
 * https://github.com/pnpm/pnpm/blob/036afc632cb856b3a191c22484acd6e2c4439568/reviewing/plugin-commands-outdated/src/recursive.ts#L176
 */
interface OutdatedPackageJSONOutput {
  current?: string;
  latest?: string;
  wanted: string;
  isDeprecated: boolean;
  dependencyType: 'optionalDependencies' | 'dependencies' | 'devDependencies';
  dependentPackages: Array<{ name: string; location: string }>;
}

(async () => {
  try {
    const outdatedJson = await new Promise<string>((resolve) => {
      exec('pnpm -r --format=json outdated', (_, stdout) => {
        resolve(stdout);
      });
    });
    const outdatedData: Record<string, OutdatedPackageJSONOutput> =
      JSON.parse(outdatedJson);
    const outdatedEntries = Object.entries(outdatedData);
    if (outdatedEntries.length > 0) {
      await core.summary
        .addHeading('Outdated Dependencies')
        .addTable([
          ['Package', 'Current', 'Latest', 'Dependents'].map((data) => ({
            data,
            header: true,
          })),
          ...outdatedEntries.map(([name, entry]) => [
            entry.dependencyType === 'devDependencies' ? `${name} (dev)` : name,
            entry.current ?? '',
            entry.latest ?? '',
            entry.dependentPackages.map(({ location }) => location).join(', '),
          ]),
        ])
        .write();
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : 'Unknown error');
  }
})();
