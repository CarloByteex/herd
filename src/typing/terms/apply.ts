// For the applys

import {
    Env,
    Type,
    Term,
    Reference,
    typesEqual,
    symbolsEqual,
    getAllSubTypes,
    Record as RecordTerm,
    Id,
    RecordDef,
    RecordBase,
    LambdaType,
    EffectRef,
} from '../types';
import { ApplySuffix, Record } from '../../parsing/parser';
import { showType, fitsExpectation } from '../unify';
import { idName, resolveEffect } from '../env';
import typeExpr, {
    applyEffectVariables,
    applyTypeVariables,
    showLocation,
} from '../typeExpr';
import typeType, { newTypeVbl } from '../typeType';

export const typeApply = (
    env: Env,
    target: Term,
    suffix: ApplySuffix,
): Term => {
    const { args, typevbls, effectVbls } = suffix;
    if (typevbls.length) {
        // HERMMM This might be illegal.
        // or rather, doing it like this
        // does weird things to the pretty-printing end.
        // Because we lose the `<T>`.
        target = {
            ...target,
            is: applyTypeVariables(
                env,
                target.is,
                typevbls.map((t) => typeType(env, t)),
            ) as LambdaType,
        };
    }

    const prevEffects = target.is.type === 'lambda' ? target.is.effects : [];
    const mappedVbls: null | Array<EffectRef> = effectVbls
        ? effectVbls.map((id) => resolveEffect(env, id))
        : null;
    if (mappedVbls != null) {
        const pre = target.is;
        target = {
            ...target,
            is: applyEffectVariables(env, target.is, mappedVbls) as LambdaType,
        };
        // console.log(
        //     `Mapped effect variables - ${showType(
        //         pre,
        //     )} ---> ${showType(target.is)}`,
        // );
    }
    const postEffects = target.is.type === 'lambda' ? target.is.effects : [];

    let is: LambdaType;
    if (target.is.type === 'var') {
        const argTypes: Array<Type> = [];
        for (let i = 0; i < args.length; i++) {
            argTypes.push(newTypeVbl(env));
        }
        is = {
            type: 'lambda',
            typeVbls: [],
            effectVbls: [],
            location: null,
            args: argTypes,
            effects: [], // STOPSHIP add effect vbls
            res: newTypeVbl(env),
            rest: null, // STOPSHIP(rest)
        };
        if (fitsExpectation(env, is, target.is) !== true) {
            throw new Error('we literally just created this');
        }
    } else {
        if (target.is.type !== 'lambda') {
            throw new Error(
                `Trying to call ${JSON.stringify(target)} but its a ${
                    target.is.type
                } : ${JSON.stringify(target.is)}`,
            );
        }
        if (target.is.args.length !== args.length) {
            throw new Error(
                `Wrong number of arguments ${JSON.stringify(target, null, 2)}`,
            );
        }
        is = target.is;
    }

    const resArgs: Array<Term> = [];
    args.forEach((term, i) => {
        const t: Term = typeExpr(env, term, is.args[i]);
        if (fitsExpectation(env, t.is, is.args[i]) !== true) {
            throw new Error(
                `Wrong type for arg ${i}: \nFound: ${showType(
                    t.is,
                )}\nbut expected ${showType(is.args[i])} : ${JSON.stringify(
                    location,
                )}`,
            );
        }
        resArgs.push(t);
    });

    return {
        type: 'apply',
        // STOPSHIP(sourcemap): this should be better
        location: target.location,
        hadAllVariableEffects:
            effectVbls != null &&
            prevEffects.length > 0 &&
            prevEffects.filter((e) => e.type === 'ref').length === 0,
        target,
        args: resArgs,
        is: is.res,
    };
};