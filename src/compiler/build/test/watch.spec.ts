import { BuildConfig } from '../../../util/interfaces';
import { mockBuildConfig } from '../../../testing/mocks';
import { validateBuildConfig } from '../../../util/validate-config';


describe('watch', () => {

  it('should ignore common web files not used in builds', () => {
    validateBuildConfig(config);
    const reg = config.watchIgnoredRegex;

    expect(reg.test('/asdf/.gitignore')).toBe(true);
    expect(reg.test('/.gitignore')).toBe(true);
    expect(reg.test('.gitignore')).toBe(true);
    expect(reg.test('/image.jpg')).toBe(true);
    expect(reg.test('image.jpg')).toBe(true);
    expect(reg.test('/asdf/image.jpg')).toBe(true);
    expect(reg.test('/asdf/image.jpeg')).toBe(true);
    expect(reg.test('/asdf/image.png')).toBe(true);
    expect(reg.test('/asdf/image.gif')).toBe(true);
    expect(reg.test('/asdf/image.woff')).toBe(true);
    expect(reg.test('/asdf/image.woff2')).toBe(true);
    expect(reg.test('/asdf/image.ttf')).toBe(true);
    expect(reg.test('/asdf/image.eot')).toBe(true);

    expect(reg.test('/asdf/image.ts')).toBe(false);
    expect(reg.test('/asdf/image.tsx')).toBe(false);
    expect(reg.test('/asdf/image.css')).toBe(false);
    expect(reg.test('/asdf/image.scss')).toBe(false);
    expect(reg.test('/asdf/image.sass')).toBe(false);
    expect(reg.test('/asdf/image.html')).toBe(false);
    expect(reg.test('/asdf/image.htm')).toBe(false);
  });


  var config: BuildConfig;

  beforeEach(() => {
    config = mockBuildConfig();
  });

});