import { BuildCtx, Config, CompilerCtx } from '../../util/interfaces';
import { catchError } from '../util';
import { copyComponentAssets } from '../component-plugins/assets-plugin';
import { generateDistribution } from './distribution';
import { writeAppManifest } from '../manifest/manifest-data';


export async function writeBuildFiles(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  // serialize and write the manifest file if need be
  writeAppManifest(config, compilerCtx, buildCtx);

  const timeSpan = config.logger.createTimeSpan(`writeBuildFiles started`, true);

  let totalFilesWrote = 0;

  try {
    buildCtx.filesWritten = await compilerCtx.fs.commit();

    totalFilesWrote = buildCtx.filesWritten.length;

    buildCtx.manifest.bundles.forEach(b => {
      b.components.forEach(c => buildCtx.components.push(c));
    });
    buildCtx.components.sort();

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  // kick off copying component assets
  // and copy www/build to dist/ if generateDistribution is enabled
  await Promise.all([
    copyComponentAssets(config, buildCtx),
    generateDistribution(config, compilerCtx, buildCtx)
  ]);

  timeSpan.finish(`writeBuildFiles finished, files wrote: ${totalFilesWrote}`);
}


export function emptyDestDir(config: Config, buildCtx: BuildCtx) {
  // empty promises :(
  const emptyPromises: Promise<any>[] = [];

  if (!buildCtx.isRebuild) {
    // don't bother emptying the directories when it's a rebuild

    if (config.generateWWW && config.emptyWWW) {
      config.logger.debug(`empty buildDir: ${config.buildDir}`);
      emptyPromises.push(config.sys.emptyDir(config.buildDir));
    }

    if (config.generateDistribution && config.emptyDist) {
      config.logger.debug(`empty distDir: ${config.distDir}`);
      emptyPromises.push(config.sys.emptyDir(config.distDir));
    }

  }

  // let's empty out the build dest directory
  return Promise.all(emptyPromises);
}
