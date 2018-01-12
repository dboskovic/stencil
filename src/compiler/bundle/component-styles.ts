import { CompilerCtx, Config, ComponentMeta, ModuleFile, StyleMeta, BuildCtx } from '../../util/interfaces';
import { buildError, isCssFile, isSassFile, normalizePath } from '../util';
import { ENCAPSULATION } from '../../util/constants';
import { scopeComponentCss } from '../css/scope-css';


export function generateComponentStyles(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, moduleFile: ModuleFile) {
  moduleFile.cmpMeta.stylesMeta = moduleFile.cmpMeta.stylesMeta || {};

  return Promise.all(Object.keys(moduleFile.cmpMeta.stylesMeta).map(async modeName => {
    // compile each style mode's sass/css
    const styles = await compileStyles(config, compilerCtx, buildCtx, moduleFile, moduleFile.cmpMeta.stylesMeta[modeName]);

    // format and set the styles for use later
    return setStyleText(config, compilerCtx, buildCtx, moduleFile.cmpMeta, moduleFile.cmpMeta.stylesMeta[modeName], styles);
  }));
}


async function compileStyles(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, moduleFile: ModuleFile, styleMeta: StyleMeta) {
  const styles = await compileExternalStyles(config, compilerCtx, buildCtx, moduleFile, styleMeta.absolutePaths);

  if (typeof styleMeta.styleStr === 'string') {
    // plain styles just in a string
    styles.push(styleMeta.styleStr);
  }

  return styles;
}


async function compileExternalStyles(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, moduleFile: ModuleFile, absStylePaths: string[]) {
  if (!Array.isArray(absStylePaths)) {
    return [];
  }

  return Promise.all(absStylePaths.map(filePath => {

    filePath = normalizePath(filePath);

    if (isSassFile(filePath)) {
      // sass file needs to be compiled
      return compileSassFile(config, compilerCtx, buildCtx, moduleFile.jsFilePath, filePath);
    }

    if (isCssFile(filePath)) {
      // plain ol' css file
      return readCssFile(compilerCtx, buildCtx, filePath);
    }

    // idk
    const d = buildError(buildCtx.diagnostics);
    d.messageText = `style url "${filePath}", in component "${moduleFile.cmpMeta.tagNameMeta}", is not a supported file type`;
    return '';
  }));
}


export function setStyleText(config: Config, _compilerCtx: CompilerCtx, buildCtx: BuildCtx, cmpMeta: ComponentMeta, styleMeta: StyleMeta, styles: string[]) {
  // join all the component's styles for this mode together into one line
  styleMeta.compiledStyleText = styles.join('\n\n').trim();

  if (config.minifyCss) {
    // minify css
    const minifyCssResults = config.sys.minifyCss(styleMeta.compiledStyleText);
    minifyCssResults.diagnostics.forEach(d => {
      buildCtx.diagnostics.push(d);
    });

    if (minifyCssResults.output) {
      styleMeta.compiledStyleText = minifyCssResults.output;
    }
  }

  if (requiresScopedStyles(cmpMeta.encapsulation)) {
    // only create scoped styles if we need to
    styleMeta.compiledStyleTextScoped = scopeComponentCss(buildCtx, cmpMeta, styleMeta.compiledStyleText);
  }

  styleMeta.compiledStyleText = cleanStyle(styleMeta.compiledStyleText);

  if (styleMeta.compiledStyleTextScoped) {
    styleMeta.compiledStyleTextScoped = cleanStyle(styleMeta.compiledStyleTextScoped);
  }
}


export function cleanStyle(style: string) {
  return style.replace(/\r\n|\r|\n/g, `\\n`)
              .replace(/\"/g, `\\"`)
              .replace(/\@/g, `\\@`);
}


export function requiresScopedStyles(encapsulation: ENCAPSULATION) {
  return (encapsulation === ENCAPSULATION.ScopedCss || encapsulation === ENCAPSULATION.ShadowDom);
}


async function compileSassFile(config: Config, _ctx: CompilerCtx, buildCtx: BuildCtx, _jsFilePath: string, absStylePath: string) {

  // if (ctx.isChangeBuild && !ctx.changeHasSass && await ctx.fs.access(absStylePath)) {
  //   // if this is a change build, but there wasn't specifically a sass file change
  //   // however we may still need to build sass if its typescript module changed

  //   // loop through all the changed typescript filename and see if there are corresponding js filenames
  //   // if there are no filenames that match then let's not run sass
  //   // yes...there could be two files that have the same filename in different directories
  //   // but worst case scenario is that both of them run sass, which isn't a performance problem
  //   const distFileName = config.sys.path.basename(jsFilePath, '.js');
  //   const hasChangedFileName = ctx.changedFiles.some(f => {
  //     const changedFileName = config.sys.path.basename(f);
  //     return (changedFileName === distFileName + '.ts' || changedFileName === distFileName + '.tsx');
  //   });

  //   if (!hasChangedFileName) {
  //     // don't bother running sass on this, none of the changed files have the same filename
  //     // use the cached version
  //     return ctx.fs.readFile(absStylePath);
  //   }
  // }

  return new Promise<string>(resolve => {
    const sassConfig = {
      ...config.sassConfig,
      file: absStylePath,
      outputStyle: config.minifyCss ? 'compressed' : 'expanded',
    };

    config.sys.sass.render(sassConfig, (err, result) => {
      if (err) {
        const d = buildError(buildCtx.diagnostics);
        d.absFilePath = absStylePath;
        d.messageText = err;
        resolve(`/** ${err} **/`);

      } else {
        // keep track of how many times sass builds
        buildCtx.styleBuildCount++;

        const css = result.css.toString();

        // resolve w/ our compiled sass
        resolve(css);
      }
    });
  });
}


async function readCssFile(compilerCtx: CompilerCtx, buildCtx: BuildCtx, absStylePath: string) {
  let styleText = '';

  try {
    // this is just a plain css file
    // only open it up for its content
    styleText = await compilerCtx.fs.readFile(absStylePath);

  } catch (e) {
    const d = buildError(buildCtx.diagnostics);
    d.messageText = `Error opening CSS file. ${e}`;
    d.absFilePath = absStylePath;
  }

  return styleText;
}
