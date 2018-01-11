import { build } from './build';
import { BuildConfig, BuildContext, BuildResults } from '../../util/interfaces';
import { isCssFile, isHtmlFile, isSassFile, isTsFile } from '../util';


export function watchBuild(config: BuildConfig, ctx: BuildContext, requiresFullBuild: boolean, changedFiles: string[]): Promise<BuildResults> {
  // always reset to do a full build
  ctx.isRebuild = true;
  ctx.isChangeBuild = false;
  ctx.changeHasComponentModules = true;
  ctx.changeHasNonComponentModules = true;
  ctx.changeHasSass = true;
  ctx.changeHasCss = true;
  ctx.changedFiles = changedFiles;

  if (!ctx.lastBuildHadError && !requiresFullBuild && changedFiles.length) {
    let changeHasComponentModules = false;
    let changeHasNonComponentModules = false;
    ctx.changeHasSass = false;
    ctx.changeHasCss = false;

    changedFiles.forEach(changedFile => {

      if (isTsFile(changedFile)) {
        // we know there's a module change
        const moduleFile = ctx.moduleFiles[changedFile];
        if (moduleFile && moduleFile.cmpMeta) {
          // we've got a module file already in memory and
          // the changed file we already know is a component file
          changeHasComponentModules = true;

        } else {
          // not in cache, so let's consider it a module change
          changeHasNonComponentModules = true;
        }

        // remove its cached content
        delete ctx.moduleFiles[changedFile];

      } else if (isSassFile(changedFile)) {
        ctx.changeHasSass = true;

      } else if (isCssFile(changedFile)) {
        ctx.changeHasCss = true;

      } else if (isHtmlFile(changedFile)) {
        ctx.changeHasHtml = true;
      }
    });

    // if nothing is true then something is up
    // so let's do a full build if "isChangeBuild" ends up being false
    ctx.isChangeBuild = (changeHasComponentModules || changeHasNonComponentModules || ctx.changeHasSass || ctx.changeHasCss || ctx.changeHasHtml);

    if (ctx.isChangeBuild) {
      if (changeHasNonComponentModules && !changeHasComponentModules) {
        // there are module changes, but the changed modules
        // aren't components, when in doubt do a full rebuild
        ctx.changeHasNonComponentModules = true;
        ctx.changeHasComponentModules = false;

      } else if (!changeHasNonComponentModules && changeHasComponentModules) {
        // only modudle changes are ones that are components
        ctx.changeHasNonComponentModules = false;
        ctx.changeHasComponentModules = true;

      } else if (!changeHasNonComponentModules && !changeHasComponentModules) {
        // no modules were changed at all
        ctx.changeHasComponentModules = false;
        ctx.changeHasNonComponentModules = false;
      }
    }
  }

  if (!ctx.isChangeBuild) {
    // completely clear out the cache
    ctx.moduleFiles = {};
    ctx.jsFiles = {};
    ctx.moduleBundleOutputs = {};
    ctx.moduleBundleLegacyOutputs = {};
  }

  changedFiles.sort();
  const totalChangedFiles = changedFiles.length;

  if (totalChangedFiles > 6) {
    const trimmedChangedFiles = changedFiles.slice(0, 5);
    const otherFilesTotal = totalChangedFiles - trimmedChangedFiles.length;
    let msg = `changed files: ${trimmedChangedFiles.map(f => config.sys.path.basename(f)).join(', ')}`;
    if (otherFilesTotal > 0) {
      msg += `, +${otherFilesTotal} other${otherFilesTotal > 1 ? 's' : ''}`;
    }
    config.logger.info(msg);

  } else if (totalChangedFiles > 1) {
    const msg = `changed files: ${changedFiles.map(f => config.sys.path.basename(f)).join(', ')}`;
    config.logger.info(msg);

  } else if (totalChangedFiles > 0) {
    const msg = `changed file: ${changedFiles.map(f => config.sys.path.basename(f)).join(', ')}`;
    config.logger.info(msg);
  }

  return build(config, ctx);
}


export function watchConfigFileReload(config: BuildConfig) {
  config.logger.debug(`reload config file: ${config.configPath}`);

  try {
    const updatedConfig = config.sys.loadConfigFile(config.configPath);

    // just update the existing config in place
    // not everything should be overwritten or merged
    // pick and choose what's ok to update
    config._isValidated = false;
    config.buildDir = updatedConfig.buildDir;
    config.distDir = updatedConfig.distDir;
    config.bundles = updatedConfig.bundles;
    config.collectionDir = updatedConfig.collectionDir;
    config.collections = updatedConfig.collections;
    config.includeSrc = updatedConfig.includeSrc;
    config.excludeSrc = updatedConfig.excludeSrc;
    config.generateDistribution = updatedConfig.generateDistribution;
    config.generateWWW = updatedConfig.generateWWW;
    config.globalScript = updatedConfig.globalScript;
    config.globalStyle = updatedConfig.globalStyle;
    config.hashedFileNameLength = updatedConfig.hashedFileNameLength;
    config.hashFileNames = updatedConfig.hashFileNames;
    config.wwwIndexHtml = updatedConfig.wwwIndexHtml;
    config.srcIndexHtml = updatedConfig.srcIndexHtml;
    config.minifyCss = updatedConfig.minifyCss;
    config.minifyJs = updatedConfig.minifyJs;
    config.namespace = updatedConfig.namespace;
    config.preamble = updatedConfig.preamble;
    config.prerender = updatedConfig.prerender;
    config.publicPath = updatedConfig.publicPath;
    config.srcDir = updatedConfig.srcDir;
    config.watchIgnoredRegex = updatedConfig.watchIgnoredRegex;

  } catch (e) {
    config.logger.error(e);
  }
}
