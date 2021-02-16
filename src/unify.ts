// Unify it all

import { Term, Type, TypeConstraint } from './types';
import { fitsExpectation, walkTerm } from './typeExpr';
import { walkType } from './typeType';

export const unifyInTerm = (
    unified: { [key: string]: Type | null },
    term: Term,
) => {
    walkTerm(term, (term) => {
        const changed = walkType(term.is, (t: Type) => {
            if (t.type === 'var' && unified[t.sym.unique] != null) {
                return unified[t.sym.unique];
            }
            return null;
        });
        if (changed) {
            term.is = changed;
        }
    });
};

export const unifyInType = (
    unified: { [key: string]: Type | null },
    type: Type,
): Type | null => {
    return walkType(type, (t: Type) => {
        if (t.type === 'var' && unified[t.sym.unique] != null) {
            return unified[t.sym.unique];
        }
        return null;
    });
};

const unify = (one: Type | null, constraint: TypeConstraint): Type => {
    if (one == null) {
        return constraint.other;
    }
    if (one.type === 'var') {
        if (constraint.other.type === 'var') {
            throw new Error('what to do with two vars');
        }
        return constraint.other;
    }
    if (constraint.other.type === 'var') {
        return one;
    }
    // TODO functions with args that are vars will die.
    // or rather, they need to be updated.
    if (constraint.type === 'larger-than') {
        if (!fitsExpectation(null, constraint.other, one)) {
            throw new Error(
                `Unification error folks ${JSON.stringify(
                    one,
                )} : ${JSON.stringify(constraint)}`,
            );
        }
    } else {
        if (!fitsExpectation(null, one, constraint.other)) {
            throw new Error(
                `Unification error folks ${JSON.stringify(
                    one,
                )} : ${JSON.stringify(constraint)}`,
            );
        }
    }
    return one;
};

export default unify;