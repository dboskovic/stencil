import { BuildConfig, BuildContext } from '../../util/interfaces';
import { catchError, pathJoin } from '../util';
import { getGlobalStyleFilename } from './app-file-naming';


export async function generateGlobalStyles(config: BuildConfig, ctx: BuildContext) {
  const filePaths = config.globalStyle;
  if (!filePaths || !filePaths.length) {
    config.logger.debug(`"config.globalStyle" not found`);
    return;
  }

  let content = await readStyleContent(ctx, filePaths);
  if (ctx.appGlobalStyles.content === content) {
    return;
  }

  const timeSpan = config.logger.createTimeSpan(`compile global style start`);

  try {
    content = await compileGlobalSass(config, content);

    const fileName = getGlobalStyleFilename(config);

    if (config.generateWWW) {
      const wwwFilePath = pathJoin(config, config.buildDir, fileName);
      config.logger.debug(`www global style: ${wwwFilePath}`);
      await ctx.fs.writeFile(wwwFilePath, content);
    }

    if (config.generateDistribution) {
      const distFilePath = pathJoin(config, config.distDir, fileName);
      config.logger.debug(`dist global style: ${distFilePath}`);
      await ctx.fs.writeFile(distFilePath, content);
    }

  } catch (e) {
    catchError(ctx.diagnostics, e);
  }

  timeSpan.finish(`compile global style finish`);
}


function compileGlobalSass(config: BuildConfig, content: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sassConfig = {
      ...config.sassConfig,
      data: content,
      outputStyle: config.minifyCss ? 'compressed' : 'expanded',
    };

    config.sys.sass.render(sassConfig, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.css.toString());
      }
    });
  });
}


function readStyleContent(ctx: BuildContext, filePaths: string[]) {
  const promises = filePaths.map(filePath => ctx.fs.readFile(filePath));
  return Promise.all(promises).then(results => results.join('\n'));
}
