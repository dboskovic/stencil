import { Diagnostic, PackageJsonData, StencilSystem } from '../../util/interfaces';
import { createContext, runInContext } from './node-context';
import { createDom } from './node-dom';
import { normalizePath } from '../../compiler/util';


export function sys(packageDir: string) {
  const fs = require('fs');
  const path = require('path');
  const coreClientFileCache: {[key: string]: string} = {};


  function resolveModule(fromDir: string, moduleId: string) {
    const Module = require('module');

    fromDir = path.resolve(fromDir);
    const fromFile = path.join(fromDir, 'noop.js');

    let dir = Module._resolveFilename(moduleId, {
      id: fromFile,
      filename: fromFile,
      paths: Module._nodeModulePaths(fromDir)
    });

    const root = path.parse(fromDir).root;
    let packageJsonFilePath: any;

    while (dir !== root) {
      dir = path.dirname(dir);
      packageJsonFilePath = path.join(dir, 'package.json');

      try {
        fs.accessSync(packageJsonFilePath);
      } catch (e) {
        continue;
      }

      return normalizePath(packageJsonFilePath);
    }

    throw new Error(`error loading "${moduleId}" from "${fromDir}"`);
  }

  let packageJsonData: PackageJsonData;
  try {
    packageJsonData = require(path.join(packageDir, 'package.json'));
  } catch (e) {
    throw new Error(`unable to resolve "package.json" from: ${packageDir}`);
  }

  let typescriptPackageJson: PackageJsonData;
  try {
    typescriptPackageJson = require(resolveModule(packageDir, 'typescript')) as PackageJsonData;
  } catch (e) {
    throw new Error(`unable to resolve "typescript" from: ${packageDir}`);
  }

  const sysUtil = require(path.join(__dirname, './sys-util.js'));

  const sys: StencilSystem = {

    compiler: {
      name: packageJsonData.name,
      version: packageJsonData.version,
      typescriptVersion: typescriptPackageJson.version
    },

    copy(src, dest, opts) {
      return new Promise((resolve, reject) => {
        opts = opts || {};
        sysUtil.fsExtra.copy(src, dest, opts, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },

    createDom,

    emptyDir(dir: any) {
      return new Promise((resolve, reject) => {
        sysUtil.fsExtra.emptyDir(dir, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },

    ensureDir(dir: any) {
      return new Promise((resolve, reject) => {
        sysUtil.fsExtra.ensureDir(dir, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },

    ensureDirSync(dir: any) {
      sysUtil.fsExtra.ensureDirSync(dir);
    },

    ensureFile(file: any) {
      return new Promise((resolve, reject) => {
        sysUtil.fsExtra.ensureFile(file, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },

    fs: fs,

    generateContentHash(content, length) {
      const crypto = require('crypto');
      return crypto.createHash('sha1')
                    .update(content)
                    .digest('base64')
                    .replace(/\W/g, '')
                    .substr(0, length)
                    .toLowerCase();
    },

    getClientCoreFile(opts) {
      const filePath = path.join(packageDir, 'client', opts.staticName);

      return new Promise((resolve, reject) => {
        if (coreClientFileCache[filePath]) {
          resolve(coreClientFileCache[filePath]);

        } else {
          fs.readFile(filePath, 'utf-8', (err: Error, data: string) => {
            if (err) {
              reject(err);
            } else {
              coreClientFileCache[filePath] = data;
              resolve(data);
            }
          });
        }
      });
    },

    glob(pattern, opts) {
      return new Promise((resolve, reject) => {
        sysUtil.glob(pattern, opts, (err: any, files: string[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(files);
          }
        });
      });
    },

    isGlob(str: string) {
      return sysUtil.isGlob(str);
    },

    minifyCss(input) {
      const CleanCSS = require(path.join(__dirname, './clean-css.js')).cleanCss;
      const result = new CleanCSS().minify(input);
      const diagnostics: Diagnostic[] = [];

      if (result.errors) {
        result.errors.forEach((msg: string) => {
          diagnostics.push({
            header: 'Minify CSS',
            messageText: msg,
            level: 'error',
            type: 'build'
          });
        });
      }

      if (result.warnings) {
        result.warnings.forEach((msg: string) => {
          diagnostics.push({
            header: 'Minify CSS',
            messageText: msg,
            level: 'warn',
            type: 'build'
          });
        });
      }

      return {
        output: result.styles,
        sourceMap: result.sourceMap,
        diagnostics: diagnostics
      };
    },

    minifyJs(input, opts?: any) {
      const UglifyJS = require('uglify-es');
      const result = UglifyJS.minify(input, opts);
      const diagnostics: Diagnostic[] = [];

      if (result.error) {
        diagnostics.push({
          header: 'Minify JS',
          messageText: result.error.message,
          level: 'error',
          type: 'build'
        });
      }

      return {
        output: (result.code as string),
        sourceMap: result.sourceMap,
        diagnostics: diagnostics
      };
    },

    minimatch(filePath, pattern, opts) {
      return sysUtil.minimatch(filePath, pattern, opts);
    },

    path,

    remove(dir) {
      return new Promise((resolve, reject) => {
        sysUtil.fsExtra.remove(dir, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },

    resolveModule,

    semver: sysUtil.semver,

    vm: {
      createContext,
      runInContext
    },

    watch(paths, opts) {
      const chokidar = require('chokidar');
      return chokidar.watch(paths, opts);
    }

  };


  Object.defineProperties(sys, {
    // sys on-demand getters

    rollup: { get: () => {
        const rollup = require('rollup');
        rollup.plugins = {
          commonjs: require('rollup-plugin-commonjs'),
          nodeResolve: require('rollup-plugin-node-resolve')
        };
        return rollup;
      }
    },

    sass: { get: () => require('node-sass') },

    typescript: { get: () => require('typescript') },

    url: { get: () => require('url') },

    workbox: { get: () => require('workbox-build') }

  });

  return sys;
}
