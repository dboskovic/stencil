import { ComponentMeta } from '../../../util/interfaces';
import { getDeclarationParameters, isDecoratorNamed, isMethodWithDecorators } from './utils';
import * as ts from 'typescript';


export function getChangeDecoratorMeta(classNode: ts.ClassDeclaration, cmpMeta: ComponentMeta) {
  const methods = classNode.members.filter(isMethodWithDecorators);

  getChangeMetaByName(methods, cmpMeta, 'PropWillChange', 'willChange');
  getChangeMetaByName(methods, cmpMeta, 'PropDidChange', 'didChange');
}

function getChangeMetaByName(methods: ts.ClassElement[], cmpMeta: ComponentMeta, decoratorName: string, memberChangeName: 'willChange' | 'didChange') {
  methods.forEach(({decorators, name}) => {
    decorators
      .filter(isDecoratorNamed(decoratorName))
      .forEach(propChangeDecorator => {
        const [propName] = getDeclarationParameters<string>(propChangeDecorator);
        if (propName) {
          cmpMeta.membersMeta = cmpMeta.membersMeta || {};
          cmpMeta.membersMeta[propName] = cmpMeta.membersMeta[propName] || {};
          (cmpMeta.membersMeta[propName] as any)[memberChangeName] = (cmpMeta.membersMeta[propName] as any)[memberChangeName] || [];
          (cmpMeta.membersMeta[propName] as any)[memberChangeName].push(name.getText());
          (cmpMeta.membersMeta[propName] as any)[memberChangeName].sort();
        }
      });
  });
}
