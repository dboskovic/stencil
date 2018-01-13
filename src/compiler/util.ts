import { BANNER } from '../util/constants';
import { Config, CompilerCtx, Diagnostic, StencilSystem } from '../util/interfaces';
import { BuildEvents } from './events';


export function getCompilerCtx(sys: StencilSystem, compilerCtx: CompilerCtx = {}) {
  // reusable data between builds
  compilerCtx.fs = compilerCtx.fs || sys.createFileSystem();
  compilerCtx.events = compilerCtx.events || new BuildEvents();
  compilerCtx.appFiles = compilerCtx.appFiles || {};
  compilerCtx.appGlobalStyles = compilerCtx.appGlobalStyles || {};
  compilerCtx.coreBuilds = compilerCtx.coreBuilds || {};
  compilerCtx.moduleFiles = compilerCtx.moduleFiles || {};
  compilerCtx.rollupCache = compilerCtx.rollupCache || {};
  compilerCtx.dependentManifests = compilerCtx.dependentManifests || {};
  compilerCtx.moduleBundleOutputs = compilerCtx.moduleBundleOutputs || {};
  compilerCtx.moduleBundleLegacyOutputs = compilerCtx.moduleBundleLegacyOutputs || {};

  if (typeof compilerCtx.activeBuildId !== 'number') {
    compilerCtx.activeBuildId = -1;
  }

  compilerCtx.lastBuildHadError = false;

  return compilerCtx;
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
  if (WEB_DEV_EXT.indexOf(ext) > -1) {
    return true;
  }
  return (WEB_DEV_EXT.indexOf(ext) > -1 || isTsFile(filePath));
}
const WEB_DEV_EXT = ['js', 'jsx', 'html', 'htm', 'css', 'scss', 'sass'];


export function generatePreamble(config: Config) {
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


export function pathJoin(config: Config, ...paths: string[]) {
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
