import { Config, Diagnostic } from '../util/interfaces';
import { transpileModule } from '../compiler/transpile/transpile';


const TEST_CONFIG: Config = {
  sys: {
    path: require('path'),
    typescript: require('typescript'),
    url: require('url'),
    vm: require('vm')
  },
  rootDir: '/'
};


export function transpile(src: string, opts: any, path?: string) {
  const results: TranspileResults = { diagnostics: null, code: null };
  const transpileResults = transpileModule(TEST_CONFIG, opts, path, src);

  results.code = transpileResults.code;
  results.diagnostics = transpileResults.diagnostics;

  return results;
}


export interface TranspileResults {
  diagnostics: Diagnostic[];
  code?: string;
}
