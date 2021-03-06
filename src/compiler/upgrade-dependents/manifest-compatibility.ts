import { BuildConfig, Manifest } from '../../util/interfaces';


export function validateManifestCompatibility(config: BuildConfig, manifest: Manifest): number[] {
  if (!manifest.compiler) {
    // if there is no compiler data at all then this was probably
    // set on purpose and we should avoid doing any upgrading
    return [];
  }

  // fill in any default data if somehow it's missing entirely
  manifest.compiler.name = manifest.compiler.name || '@stencil/core';
  manifest.compiler.version = manifest.compiler.version || '0.0.1';
  manifest.compiler.typescriptVersion = manifest.compiler.typescriptVersion || '2.5.3';

  // figure out which compiler upgrades, if any, we need to do
  return calculateRequiredUpgrades(config, manifest.compiler.version);
}


export function calculateRequiredUpgrades(config: BuildConfig, collectionVersion: string) {
  // CUSTOM CHECKS PER KNOWN BREAKING CHANGES
  // UNIT TEST UNIT TEST UNIT TEST
  const upgrades: CompilerUpgrade[] = [];

  if (config.sys.semver.lte(collectionVersion, '0.0.6-10')) {
    // 2017-10-04
    // between 0.0.5 and 0.0.6-11 we no longer have a custom JSX parser
    upgrades.push(CompilerUpgrade.JSX_Upgrade_From_0_0_5);
  }

  if (config.sys.semver.lte(collectionVersion, '0.1.0')) {
    // 2017-12-27
    // from 0.1.0 and earlier, metadata was stored separately
    // from the component constructor. Now it puts the metadata
    // as static properties on each component constructor
    upgrades.push(CompilerUpgrade.Metadata_Upgrade_From_0_1_0);
  }

  return upgrades;
}


export const enum CompilerUpgrade {
  JSX_Upgrade_From_0_0_5,
  Metadata_Upgrade_From_0_1_0
}
