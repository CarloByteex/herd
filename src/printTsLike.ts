// print out into my temporary syntax I guess?
// mostly for debugging
//

import { Id, Reference, Symbol, Term, Type } from './types';
import { PP, items, args, block, atom } from './printer';

export const refToPretty = (ref: Reference) =>
    atom(ref.type === 'builtin' ? ref.name : idToString(ref.id));
export const idToString = (id: Id) => 'hash_' + id.hash + '_' + id.pos;
export const symToPretty = (sym: Symbol) => atom(`${sym.name}_${sym.unique}`);

export const declarationToPretty = (id: Id, term: Term): PP => {
    return items([
        atom('const '),
        atom(idToString(id)),
        atom(': '),
        typeToPretty(term.is),
        atom(' = '),
        termToPretty(term),
    ]);
};

export const typeToPretty = (type: Type): PP => {
    switch (type.type) {
        case 'ref':
            return refToPretty(type.ref);
        case 'lambda':
            return items([
                args(type.args.map(typeToPretty)),
                atom(' ='),
                args(type.effects.map(refToPretty), '{', '}'),
                atom('> '),
                typeToPretty(type.res),
            ]);
        case 'var':
            return symToPretty(type.sym);
        default:
            throw new Error(`Unexpected type ${JSON.stringify(type)}`);
    }
};

export const termToPretty = (term: Term): PP => {
    switch (term.type) {
        case 'int':
            return atom(term.value.toString());
        case 'string':
            return atom(JSON.stringify(term.text));
        case 'raise':
            return items([
                atom('raise!'),
                args([
                    items([
                        refToPretty(term.ref),
                        args(term.args.map(termToPretty)),
                    ]),
                ]),
            ]);
        case 'lambda':
            return items([
                args(
                    term.args.map((arg, i) =>
                        items([
                            symToPretty(arg),
                            atom(': '),
                            typeToPretty(term.is.args[i]),
                        ]),
                    ),
                ),
                atom(' => '),
                termToPretty(term.body),
            ]);
        case 'self':
            return atom('<self>');
        case 'sequence':
            return block(term.sts.map(termToPretty));
        case 'apply':
            if (isBinOp(term.target) && term.args.length === 2) {
                return items([
                    termToPretty(term.args[0]),
                    atom(' '),
                    termToPretty(term.target),
                    atom(' '),
                    termToPretty(term.args[1]),
                ]);
            }
            return items([
                termToPretty(term.target),
                args(term.args.map(termToPretty)),
            ]);
        case 'ref':
            return refToPretty(term.ref);
        case 'var':
            return symToPretty(term.sym);
        default:
            return atom('not yet printable');
    }
};

const isBinOp = (term: Term) =>
    term.type === 'ref' &&
    term.ref.type === 'builtin' &&
    !term.ref.name.match(/[\w_$]/);
