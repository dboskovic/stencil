import { BuildConfig, BuildContext, BuildResults } from '../../util/interfaces';
import { catchError } from '../util';
import { copyComponentAssets } from '../component-plugins/assets-plugin';
import { generateDistribution } from './distribution';
import { writeAppManifest } from '../manifest/manifest-data';


export async function writeBuildFiles(config: BuildConfig, ctx: BuildContext, buildResults: BuildResults) {
  // serialize and write the manifest file if need be
  writeAppManifest(config, ctx);

  const timeSpan = config.logger.createTimeSpan(`writeBuildFiles started`, true);

  // congrats, another successful build
  ctx.buildCount++;

  let totalFilesWrote = 0;
  try {
    const files = await ctx.fs.commit();

    totalFilesWrote = files.length;

    if (config.logger.level === 'debug') {
      buildResults.stats.files = files;

      ctx.manifest.bundles.forEach(b => {
        b.components.forEach(c => buildResults.stats.components.push(c));
      });
      buildResults.stats.components.sort();

      buildResults.stats.buildCount = ctx.buildCount;
      buildResults.stats.bundleBuildCount = ctx.bundleBuildCount;
      buildResults.stats.transpileBuildCount = ctx.transpileBuildCount;
      buildResults.stats.sassBuildCount = ctx.sassBuildCount;
    }

  } catch (e) {
    catchError(ctx.diagnostics, e);
  }

  // kick off copying component assets
  // and copy www/build to dist/ if generateDistribution is enabled
  await Promise.all([
    copyComponentAssets(config, ctx),
    generateDistribution(config, ctx)
  ]);

  timeSpan.finish(`writeBuildFiles finished, files wrote: ${totalFilesWrote}`);
}


export function emptyDestDir(config: BuildConfig, ctx: BuildContext) {
  // empty promises :(
  const emptyPromises: Promise<any>[] = [];

  if (!ctx.isRebuild) {
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
