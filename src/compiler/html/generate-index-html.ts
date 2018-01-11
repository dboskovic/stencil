import { BuildConfig, BuildContext, ServiceWorkerConfig } from '../../util/interfaces';
import { catchError, hasError } from '../util';
import { injectRegisterServiceWorker, injectUnregisterServiceWorker } from '../service-worker/inject-sw-script';
import { generateServiceWorker } from '../service-worker/generate-sw';


export async function generateIndexHtml(config: BuildConfig, ctx: BuildContext) {

  if ((ctx.isRebuild && ctx.appFileBuildCount === 0) || hasError(ctx.diagnostics) || !config.generateWWW) {
    // no need to rebuild index.html if there were no app file changes
    return;
  }

  // generate the service worker
  await generateServiceWorker(config, ctx);

  // get the source index html content
  try {
    const indexSrcHtml = await ctx.fs.readFile(config.srcIndexHtml);

    try {
      setIndexHtmlContent(config, ctx, indexSrcHtml);
    } catch (e) {
      catchError(ctx.diagnostics, e);
    }

  } catch (e) {
    // it's ok if there's no index file
    config.logger.debug(`no index html: ${config.srcIndexHtml}: ${e}`);
  }
}


function setIndexHtmlContent(config: BuildConfig, ctx: BuildContext, indexHtml: string) {
  const swConfig = config.serviceWorker as ServiceWorkerConfig;

  if (!swConfig && config.devMode) {
    // if we're not generating a sw, and this is a dev build
    // then let's inject a script that always unregisters any service workers
    indexHtml = injectUnregisterServiceWorker(indexHtml);

  } else if (swConfig) {
    // we have a valid sw config, so we'll need to inject the register sw script
    indexHtml = injectRegisterServiceWorker(config, swConfig, indexHtml);
  }

  // add the prerendered html to our list of files to write
  ctx.fs.writeFile(config.wwwIndexHtml, indexHtml);

  config.logger.debug(`optimizeHtml, write: ${config.wwwIndexHtml}`);
}
