import { registerDecorator, ValidationOptions } from 'class-validator';
import { cpf, cnpj } from 'cpf-cnpj-validator';

export function IsCPFOrCNPJ(validateOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsCPFOrCNPJ',
      target: object.constructor,
      propertyName: propertyName,
      options: validateOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          return cpf.isValid(value) || cnpj.isValid(value);
        },
        defaultMessage() {
          return 'O documento deve ser um CPF ou CNPJ válido.';
        },
      },
    });
  };
}
