import { build } from '../build';
import { BuildConfig, BuildContext, BuildResults, ComponentRegistry } from '../../../util/interfaces';
import { Compiler } from '../../compiler';
import { mockBuildConfig, mockFs } from '../../../testing/mocks';
import { validateBuildConfig } from '../../../util/validate-config';
import * as path from 'path';


describe('build', () => {

  it('should build one component w/ styleUrl', async () => {
    c.config.bundles = [ { components: ['cmp-a'] } ];
    c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a', styleUrl: 'cmp-a.scss' }) export class CmpA {}`);
    c.fs.writeFileSync('/src/cmp-a.scss', `body { color: red; }`);

    const r = await c.build();
    expect(r.diagnostics.length).toBe(0);
    expect(r.stats.components.length).toBe(1);
    expect(r.stats.transpileBuildCount).toBe(1);
    expect(r.stats.sassBuildCount).toBe(1);
    expect(r.stats.bundleBuildCount).toBe(1);

    expect(wroteFile(r, 'cmp-a.js')).toBe(true);
  });

  it('should build one component w/ no styles', async () => {
    c.config.bundles = [ { components: ['cmp-a'] } ];
    c.fs.writeFileSync('/src/cmp-a.tsx', `@Component({ tag: 'cmp-a' }) export class CmpA {}`);

    const r = await c.build();
    expect(r.diagnostics.length).toBe(0);
    expect(r.stats.components.length).toBe(1);
    expect(r.stats.transpileBuildCount).toBe(1);
    expect(r.stats.sassBuildCount).toBe(0);
    expect(r.stats.bundleBuildCount).toBe(1);

    expect(wroteFile(r, 'cmp-a.js')).toBe(true);
    expect(r.stats.components.indexOf('cmp-a') > -1).toBe(true);
  });

  it('should build no components', async () => {
    const r = await c.build();
    expect(r.diagnostics.length).toBe(0);
    expect(r.stats.components.length).toBe(0);
    expect(r.stats.transpileBuildCount).toBe(0);
    expect(r.stats.sassBuildCount).toBe(0);
    expect(r.stats.bundleBuildCount).toBe(0);
  });


  var c: Compiler;

  beforeEach(() => {
    c = new Compiler(mockBuildConfig());

    c.fs.ensureDirSync('/src');
    c.fs.writeFileSync('/src/index.html', `<cmp-a></cmp-a>`);
  });


  function wroteFile(r: BuildResults, p: string) {
    const filename = path.basename(p);
    return r.stats.files.some(f => {
      return path.basename(f) === filename;
    });
  }

});
