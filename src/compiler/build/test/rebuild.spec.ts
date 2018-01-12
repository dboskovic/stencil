import { build } from '../build';
import { Config, CompilerCtx, BuildResults } from '../../../util/interfaces';
import { mockConfig, mockFs } from '../../../testing/mocks';
import { validateBuildConfig } from '../../../util/validate-config';
import * as path from 'path';
import { Compiler } from '../../compiler';


describe('rebuild', () => {

  // it('should save app files, but not resave when unchanged', () => {
  //   config.bundles = [
  //     { components: ['cmp-a'] }
  //   ];
  //   config.watch = true;
  //   config.buildEs5 = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`);
  //   ctx.fs.writeFileSync('/src/index.html', `<cmp-a></cmp-a>`);

  //   return build(config, ctx).then(r => {
  //     expect(wroteFile(r, 'app.js')).toBe(true);
  //     expect(wroteFile(r, 'app.registry.json')).toBe(true);
  //     expect(wroteFile(r, 'app.core.pf.js')).toBe(true);
  //     expect(wroteFile(r, 'app.core.js')).toBe(true);

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.watcher.trigger('change', '/src/index.html');

  //     }).then((r: BuildResults) => {
  //       expect(wroteFile(r, 'app.js')).toBe(false);
  //       expect(wroteFile(r, 'app.registry.json')).toBe(false);
  //       expect(wroteFile(r, 'app.core.pf.js')).toBe(false);
  //       expect(wroteFile(r, 'app.core.js')).toBe(false);
  //     });
  //   });
  // });

  // it('should rebuild for two changed modules', () => {
  //   config.bundles = [
  //     { components: ['cmp-a'] },
  //     { components: ['cmp-b'] }
  //   ];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`);
  //   ctx.fs.writeFileSync('/src/cmp-b.tsx', `@Component({ tag: 'cmp-b' }) export class CmpB {}`);
  //   ctx.fs.writeFileSync('/src/cmp-c.tsx', `@Component({ tag: 'cmp-c' }) export class CmpC {}`);

  //   return build(config, ctx).then(() => {
  //     expect(ctx.isChangeBuild).toBeFalsy();

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA { constructor() { 'hi'; } }`);
  //       ctx.fs.writeFileSync('/src/cmp-b.tsx', `@Component({ tag: 'cmp-b' }) export class CmpB { constructor() { 'hi'; }}`);
  //       ctx.watcher.trigger('change', '/src/cmp-a.tsx');
  //       ctx.watcher.trigger('change', '/src/cmp-b.tsx');

  //     }).then((r: BuildResults) => {
  //       expect(ctx.isChangeBuild).toBe(true);
  //       expect(ctx.transpileBuildCount).toBe(2);
  //       expect(ctx.bundleBuildCount).toBe(2);

  //       expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //       expect(wroteFile(r, 'cmp-b.js')).toBe(true);
  //       expect(wroteFile(r, 'cmp-c.js')).toBe(false);
  //     });
  //   });
  // });

  // it('should do a full rebuild when 1 file changed, and 1 file added', () => {
  //   config.bundles = [
  //     { components: ['cmp-a'] }
  //   ];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`);

  //   return build(config, ctx).then(() => {
  //     expect(ctx.isChangeBuild).toBeFalsy();

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       config.bundles = [
  //         { components: ['cmp-a'] },
  //         { components: ['cmp-b'] }
  //       ];

  //       ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA { constructor() { window.alert(88); } }`);
  //       ctx.fs.writeFileSync('/src/cmp-b.tsx', `@Component({ tag: 'cmp-b' }) export class CmpB {}`);
  //       ctx.watcher.trigger('change', '/src/cmp-a.tsx');
  //       ctx.watcher.trigger('add', '/src/cmp-b.tsx');

  //     }).then((r: BuildResults) => {
  //       expect(ctx.isChangeBuild).toBeFalsy();
  //       expect(ctx.transpileBuildCount).toBe(2);
  //       expect(ctx.bundleBuildCount).toBe(2);

  //       expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //       expect(wroteFile(r, 'cmp-b.js')).toBe(true);
  //     });
  //   });
  // });

  // it('should do a full rebuild when files are deleted', () => {
  //   config.bundles = [
  //     { components: ['cmp-a'] },
  //     { components: ['cmp-b'] }
  //   ];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`);
  //   ctx.fs.writeFileSync('/src/cmp-b.tsx', `@Component({ tag: 'cmp-b' }) export class CmpB {}`);

  //   return build(config, ctx).then(() => {
  //     expect(ctx.isChangeBuild).toBeFalsy();

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       config.bundles = [ { components: ['cmp-a'] }];
  //       ctx.fs.clearCache();
  //       ctx.watcher.trigger('unlink', '/src/cmp-b.tsx');

  //     }).then((r: BuildResults) => {
  //       expect(ctx.isChangeBuild).toBeFalsy();
  //       expect(ctx.transpileBuildCount).toBe(1);
  //       expect(ctx.bundleBuildCount).toBe(1);

  //       expect(wroteFile(r, 'cmp-a.js')).toBe(false);
  //       expect(wroteFile(r, 'cmp-b.js')).toBe(false);
  //     });
  //   });
  // });

  // it('should do a full rebuild when files are added', () => {
  //   config.bundles = [ { components: ['cmp-a'] }];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`);

  //   return build(config, ctx).then(() => {
  //     expect(ctx.isChangeBuild).toBeFalsy();

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.fs.writeFileSync('/src/cmp-b.tsx', `@Component({ tag: 'cmp-b' }) export class CmpB {}`);
  //       config.bundles = [
  //         { components: ['cmp-a'] },
  //         { components: ['cmp-b'] }
  //       ];
  //       ctx.watcher.trigger('add', '/src/cmp-b.tsx');

  //     }).then((r: BuildResults) => {
  //       expect(ctx.isChangeBuild).toBeFalsy();
  //       expect(ctx.transpileBuildCount).toBe(2);
  //       expect(ctx.bundleBuildCount).toBe(2);

  //       expect(wroteFile(r, 'cmp-a.js')).toBe(false);
  //       expect(wroteFile(r, 'cmp-b.js')).toBe(true);
  //     });
  //   });
  // });

  // it('should build styles, but not rebuild on non-component file changes', () => {
  //   config.bundles = [
  //     { components: ['cmp-a'] },
  //     { components: ['cmp-b'] }
  //   ];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `import { MyService } from './service'; @Component({ tag: 'cmp-a', styleUrl: 'cmp-a.scss' }) export class CmpA { constructor() { var s = new MyService(); } }`);
  //   ctx.fs.writeFileSync('/src/cmp-a.scss', `body { color: red; }`);
  //   ctx.fs.writeFileSync('/src/cmp-b.tsx', `import { MyService } from './service'; @Component({ tag: 'cmp-b', styleUrl: 'cmp-b.scss' }) export class CmpB { constructor() { var s = new MyService(); } }`);
  //   ctx.fs.writeFileSync('/src/cmp-b.scss', `body { color: red; }`);
  //   ctx.fs.writeFileSync('/src/service.tsx', `export class MyService {}`);

  //   return build(config, ctx).then(r => {
  //     expect(r.diagnostics.length).toBe(0);
  //     expect(ctx.transpileBuildCount).toBe(3);
  //     expect(ctx.bundleBuildCount).toBe(2);
  //     expect(ctx.styleBuildCount).toBe(2);

  //     expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //     expect(wroteFile(r, 'cmp-b.js')).toBe(true);

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.fs.writeFileSync('/src/service.tsx', `export class MyService { constructor(){ window.alert(88); } }`);
  //       ctx.watcher.trigger('change', '/src/service.tsx');

  //     }).then((r: BuildResults) => {
  //       expect(ctx.isChangeBuild).toBe(true);
  //       expect(ctx.transpileBuildCount).toBe(1);
  //       expect(ctx.bundleBuildCount).toBe(2);
  //       expect(ctx.styleBuildCount).toBe(0);

  //       expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //       expect(wroteFile(r, 'cmp-b.js')).toBe(true);
  //     });
  //   });
  // });

  // it('should rebundle both cmp-a and cmp-b when non-component module has changed', async () => {
  //   config.bundles = [
  //     { components: ['cmp-a'] },
  //     { components: ['cmp-b'] }
  //   ];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `import { MyService } from './service'; @Component({ tag: 'cmp-a' }) export class CmpA { constructor() { var s = new MyService(); } }`);
  //   ctx.fs.writeFileSync('/src/cmp-b.tsx', `import { MyService } from './service'; @Component({ tag: 'cmp-b' }) export class CmpB { constructor() { var s = new MyService(); } }`);
  //   ctx.fs.writeFileSync('/src/service.tsx', `export class MyService {}`);

  //   return build(config, ctx).then(r => {
  //     expect(r.diagnostics.length).toBe(0);
  //     expect(ctx.transpileBuildCount).toBe(3);
  //     expect(ctx.bundleBuildCount).toBe(2);

  //     expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //     expect(wroteFile(r, 'cmp-b.js')).toBe(true);

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.fs.writeFileSync('/src/service.tsx', `export class MyService { constructor(){ window.alert(88); } }`);
  //       ctx.watcher.trigger('change', '/src/service.tsx');

  //     }).then((r: BuildResults) => {
  //       expect(ctx.isChangeBuild).toBe(true);
  //       expect(ctx.transpileBuildCount).toBe(1);
  //       expect(ctx.bundleBuildCount).toBe(2);

  //       expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //       expect(wroteFile(r, 'cmp-b.js')).toBe(true);
  //       expect(wroteFile(r, 'service.js')).toBe(false);
  //     });
  //   });
  // });

  // it('should not rebuild cmp-a when only cmp-b changed', () => {
  //   config.bundles = [
  //     { components: ['cmp-a'] },
  //     { components: ['cmp-b'] }
  //   ];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `import { MyService } from './service'; @Component({ tag: 'cmp-a' }) export class CmpA {}`);
  //   ctx.fs.writeFileSync('/src/cmp-b.tsx', `@Component({ tag: 'cmp-b' }) export class CmpB {}`);
  //   ctx.fs.writeFileSync('/src/service.tsx', `export class MyService { test() { 'test'; } }`);

  //   return build(config, ctx).then(r => {
  //     expect(r.diagnostics.length).toBe(0);
  //     expect(ctx.transpileBuildCount).toBe(3);
  //     expect(ctx.bundleBuildCount).toBe(2);

  //     expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //     expect(wroteFile(r, 'cmp-b.js')).toBe(true);
  //     expect(wroteFile(r, 'service.js')).toBe(false);

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.fs.writeFileSync('/src/cmp-b.tsx', `
  //         import { MyService } from './service';
  //         @Component({ tag: 'cmp-b' })
  //         export class CmpB {
  //           constructor() {
  //             const myService = new MyService();
  //             myService.test();
  //           }
  //         }`);
  //       ctx.watcher.trigger('change', '/src/cmp-b.tsx');

  //     }).then((r: BuildResults) => {
  //       expect(ctx.isChangeBuild).toBe(true);
  //       expect(ctx.transpileBuildCount).toBe(1);
  //       expect(ctx.bundleBuildCount).toBe(1);

  //       expect(wroteFile(r, 'cmp-a.js')).toBe(false);
  //       expect(wroteFile(r, 'cmp-b.js')).toBe(true);
  //       expect(wroteFile(r, 'service.js')).toBe(false);
  //     });
  //   });
  // });

  // it('should re-bundle styles when the changed sass file is not a direct component sass file', () => {
  //   config.bundles = [
  //     { components: ['cmp-a'] },
  //     { components: ['cmp-b'] }
  //   ];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a', styleUrl: 'cmp-a.scss' }) export class CmpA {}`);
  //   ctx.fs.writeFileSync('/src/cmp-a.scss', `@import "variables"; body { color: $color; }`);
  //   ctx.fs.writeFileSync('/src/cmp-b.tsx', `@Component({ tag: 'cmp-b', styleUrl: 'cmp-b.scss' }) export class CmpB {}`);
  //   ctx.fs.writeFileSync('/src/cmp-b.scss', `@import "variables"; body { color: $color; }`);
  //   ctx.fs.writeFileSync('/src/variables.scss', `$color: red;`);

  //   return build(config, ctx).then(() => {
  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.fs.writeFileSync('/src/variables.scss', `$color: blue;`);
  //       ctx.watcher.trigger('change', '/src/variables.scss');

  //     }).then((r: BuildResults) => {
  //       expect(r.diagnostics.length).toBe(0);
  //       expect(ctx.transpileBuildCount).toBe(0);
  //       expect(ctx.bundleBuildCount).toBe(0);
  //       expect(ctx.styleBuildCount).toBe(2);
  //     });
  //   });
  // });

  // it('should not re-transpile, re-bundle modules or re-bundle styles for cmp-b if only cmp-a module changed', () => {
  //   config.bundles = [
  //     { components: ['cmp-a'] },
  //     { components: ['cmp-b'] }
  //   ];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a', styleUrl: 'cmp-a.scss' }) export class CmpA {}`);
  //   ctx.fs.writeFileSync('/src/cmp-a.scss', `body { color: red; }`);
  //   ctx.fs.writeFileSync('/src/cmp-b.tsx', `@Component({ tag: 'cmp-b', styleUrl: 'cmp-b.scss' }) export class CmpB {}`);
  //   ctx.fs.writeFileSync('/src/cmp-b.scss', `body { color: blue; }`);

  //   return build(config, ctx).then(r => {
  //     expect(r.diagnostics.length).toBe(0);
  //     expect(ctx.transpileBuildCount).toBe(2);
  //     expect(ctx.bundleBuildCount).toBe(2);
  //     expect(ctx.styleBuildCount).toBe(2);

  //     expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //     expect(wroteFile(r, 'cmp-b.js')).toBe(true);

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a', styleUrl: 'cmp-a.scss' }) export class CmpA { constructor() { 'file change'; } }`);
  //       ctx.watcher.trigger('change', '/src/cmp-a.tsx');

  //     }).then((r: BuildResults) => {
  //       expect(r.diagnostics.length).toBe(0);
  //       expect(ctx.transpileBuildCount).toBe(1);
  //       expect(ctx.bundleBuildCount).toBe(1);
  //       expect(ctx.styleBuildCount).toBe(1);

  //       expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //       expect(wroteFile(r, 'cmp-b.js')).toBe(false);
  //     });
  //   });
  // });

  // it('should do a re-transpile, re-bundle module and re-bundle styles if component file change', () => {
  //   config.bundles = [ { components: ['cmp-a'] } ];
  //   config.watch = true;
  //   ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a', styleUrl: 'sass-a.scss' }) export class CmpA {}`);
  //   ctx.fs.writeFileSync('/src/sass-a.scss', `body { color: red; }`);

  //   return build(config, ctx).then(r => {
  //     expect(r.diagnostics.length).toBe(0);
  //     expect(ctx.transpileBuildCount).toBe(1);
  //     expect(ctx.bundleBuildCount).toBe(1);

  //     expect(wroteFile(r, 'cmp-a.js')).toBe(true);

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a', styleUrl: 'sass-a.scss' }) export class CmpA { constructor() { 'file change'; } }`);
  //       ctx.watcher.trigger('change', '/src/cmp-a.tsx');

  //     }).then((r: BuildResults) => {
  //       expect(r.diagnostics.length).toBe(0);
  //       expect(ctx.transpileBuildCount).toBe(1);
  //       expect(ctx.bundleBuildCount).toBe(1);
  //       expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //     });
  //   });
  // });

  // it('should not re-transpile or re-bundle module when only a sass change', () => {
  //   c.config.bundles = [ { components: ['cmp-a'] } ];
  //   c.config.watch = true;
  //   c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a', styleUrl: 'cmp-a.scss' }) export class CmpA {}`);
  //   c.fs.writeFileSync('/src/cmp-a.scss', `body { color: red; }`);

  //   const initialBuildResults = await c.build();

  //   return build(config, ctx).then(() => {
  //     console.log('build', ctx.watcher)

  //     return new Promise(resolve => {
  //       ctx.onFinish = resolve;
  //       ctx.fs.writeFileSync('/src/cmp-a.scss', `body { color: blue; }`);
  //       ctx.watcher.trigger('change', '/src/cmp-a.scss');

  //     }).then((r: BuildResults) => {
  //       expect(ctx.transpileBuildCount).toBe(0);
  //       expect(ctx.bundleBuildCount).toBe(0);
  //       expect(ctx.styleBuildCount).toBe(1);

  //       expect(r.files.length).toBe(1);
  //       expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  //     });
  //   });
  // });

  it('should not resave unchanged content', async () => {
    c.config.bundles = [ { components: ['cmp-a'] } ];
    c.config.watch = true;
    c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a', styleUrl: 'cmp-a.scss' }) export class CmpA {}`);
    c.fs.writeFileSync('/src/cmp-a.scss', `body { color: red; }`);

    // kick off the build, wait for it to finish
    const initialBuildResults = await c.build();

    // initial build finished
    expect(initialBuildResults.buildId).toBe(1);
    expect(initialBuildResults.stats.isRebuild).toBe(false);

    // create a rebuild listener
    const rebuildListener = c.once('rebuild');

    // kick off a rebuild
    c.trigger('fileChange', '/src/cmp-a.tsx');

    // wait for the rebuild to finish
    // get the rebuild results
    const rebuildResults = await rebuildListener;

    expect(rebuildResults.buildId).toBe(2);
    expect(rebuildResults.stats.isRebuild).toBe(true);
    expect(rebuildResults.stats.transpileBuildCount).toBe(1);
    expect(rebuildResults.stats.bundleBuildCount).toBe(1);
    expect(rebuildResults.stats.styleBuildCount).toBe(1);
    expect(rebuildResults.stats.filesWritten.length).toBe(0);
  });


  var c: Compiler;

  beforeEach(() => {
    c = new Compiler(mockConfig());
    c.fs.ensureDirSync('/src');
    c.fs.writeFileSync('/src/index.html', `<cmp-a></cmp-a>`);
  });


  function wroteFile(r: BuildResults, p: string) {
    const filename = path.basename(p);
    return r.stats.filesWritten.some(f => {
      return path.basename(f) === filename;
    });
  }

});
