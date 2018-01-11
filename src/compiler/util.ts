import { BANNER } from '../util/constants';
import { BuildConfig, BuildContext, Diagnostic, StencilSystem } from '../util/interfaces';
import { BuildEvents } from './events';


export function getBuildContext(sys: StencilSystem, ctx: BuildContext = {}) {
  ctx.fs = ctx.fs || sys.createFileSystem();
  ctx.events = ctx.events || new BuildEvents();
  ctx.diagnostics = ctx.diagnostics || [];
  ctx.manifest = ctx.manifest || {};
  ctx.appFiles = ctx.appFiles || {};
  ctx.appGlobalStyles = ctx.appGlobalStyles || {};
  ctx.coreBuilds = ctx.coreBuilds || {};
  ctx.moduleFiles = ctx.moduleFiles || {};
  ctx.rollupCache = ctx.rollupCache || {};
  ctx.dependentManifests = ctx.dependentManifests || {};
  ctx.moduleBundleOutputs = ctx.moduleBundleOutputs || {};
  ctx.moduleBundleLegacyOutputs = ctx.moduleBundleLegacyOutputs || {};
  ctx.changedFiles = ctx.changedFiles || [];

  if (typeof ctx.buildCount !== 'number') {
    ctx.buildCount = 0;
  }

  return ctx;
}


export function resetBuildContext(ctx: BuildContext) {
  ctx.manifest = {};
  ctx.diagnostics = [];
  ctx.sassBuildCount = 0;
  ctx.transpileBuildCount = 0;
  ctx.indexBuildCount = 0;
  ctx.bundleBuildCount = 0;
  delete ctx.localPrerenderServer;
}


export function isTsFile(filePath: string) {
  const parts = filePath.toLowerCase().split('.');
  if (parts.length > 1) {
    if (parts[parts.length - 1] === 'ts' || parts[parts.length - 1] === 'tsx') {
      if (parts.length > 2 && (parts[parts.length - 2] === 'd' || parts[parts.length - 2] === 'spec')) {
        return false;
      }
      return true;
    }
  }
  return false;
}


export function isDtsFile(filePath: string) {
  const parts = filePath.toLowerCase().split('.');
  if (parts.length > 2) {
    return (parts[parts.length - 2] === 'd' && parts[parts.length - 1] === 'ts');
  }
  return false;
}


export function isJsFile(filePath: string) {
  const parts = filePath.toLowerCase().split('.');
  if (parts.length > 1) {
    if (parts[parts.length - 1] === 'js') {
      if (parts.length > 2 && parts[parts.length - 2] === 'spec') {
        return false;
      }
      return true;
    }
  }
  return false;
}


export function isSassFile(filePath: string) {
  const ext = filePath.split('.').pop().toLowerCase();
  return ext === 'scss' || ext === 'sass';
}


export function isCssFile(filePath: string) {
  return filePath.split('.').pop().toLowerCase() === 'css';
}


export function isHtmlFile(filePath: string) {
  const ext = filePath.split('.').pop().toLowerCase();
  return ext === 'html' || ext === 'htm';
}

export function isWebDevFile(filePath: string) {
  const ext = filePath.split('.').pop().toLowerCase();
  return (WEB_DEV_EXT.indexOf(ext) > -1 || isTsFile(filePath));
}
const WEB_DEV_EXT = ['js', 'jsx', 'html', 'htm', 'css', 'scss', 'sass'];


export function generatePreamble(config: BuildConfig) {
  let preamble: string[] = [];

  if (config.preamble) {
    preamble = config.preamble.split('\n');
  }

  preamble.push(BANNER);

  if (preamble.length > 1) {
    preamble = preamble.map(l => ` * ${l}`);

    preamble.unshift(`/*!`);
    preamble.push(` */`);

    return preamble.join('\n');
  }

  return `/*! ${BANNER} */`;
}


export function buildError(diagnostics: Diagnostic[]) {
  const d: Diagnostic = {
    level: 'error',
    type: 'build',
    header: 'build error',
    messageText: 'build error',
    relFilePath: null,
    absFilePath: null,
    lines: []
  };

  diagnostics.push(d);

  return d;
}


export function buildWarn(diagnostics: Diagnostic[]) {
  const d: Diagnostic = {
    level: 'warn',
    type: 'build',
    header: 'build warn',
    messageText: 'build warn',
    relFilePath: null,
    absFilePath: null,
    lines: []
  };

  diagnostics.push(d);

  return d;
}


export function catchError(diagnostics: Diagnostic[], err: Error) {
  const d: Diagnostic = {
    level: 'error',
    type: 'build',
    header: 'build error',
    messageText: 'build error',
    relFilePath: null,
    absFilePath: null,
    lines: []
  };

  if (err) {
    if (err.stack) {
      d.messageText = err.stack.toString();

    } else {
      if (err.message) {
        d.messageText = err.message.toString();

      } else {
        d.messageText = err.toString();
      }
    }
  }

  diagnostics.push(d);

  return d;
}


export function hasError(diagnostics: Diagnostic[]): boolean {
  if (!diagnostics) {
    return false;
  }
  return diagnostics.some(d => d.level === 'error' && d.type !== 'runtime');
}


export function pathJoin(config: BuildConfig, ...paths: string[]) {
  return normalizePath(config.sys.path.join.apply(config.sys.path, paths));
}


export function normalizePath(str: string) {
  // Convert Windows backslash paths to slash paths: foo\\bar ➔ foo/bar
  // https://github.com/sindresorhus/slash MIT
  // By Sindre Sorhus
  if (EXTENDED_PATH_REGEX.test(str) || NON_ASCII_REGEX.test(str)) {
    return str;
  }

  return str.replace(SLASH_REGEX, '/');
}

const EXTENDED_PATH_REGEX = /^\\\\\?\\/;
const NON_ASCII_REGEX = /[^\x00-\x80]+/;
const SLASH_REGEX = /\\/g;
