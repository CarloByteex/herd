import {
    Env,
    Type,
    Term,
    Reference,
    dedupEffects,
    getEffects,
    Symbol,
    Case,
    LambdaType,
    Let,
    typesEqual,
    refsEqual,
    symbolsEqual,
    EffectRef,
    getAllSubTypes,
    Record,
    Id,
    RecordDef,
    idsEqual,
    RecordBase,
    UserReference,
} from './types';
import { Expression, Identifier, Location, Statement } from '../parsing/parser';
import { subEnv, effectsMatch } from './types';
import typeType, { newTypeVbl, walkType } from './typeType';
import { showType, fitsExpectation } from './unify';
import { void_, bool } from './preset';
import { hasSubType, idName, resolveIdentifier } from './env';
import { typeLambda } from './terms/lambda';
import { typeHandle } from './terms/handle';
import { typeRecord } from './terms/record';
import { typeApply } from './terms/apply';

const expandEffectVars = (
    effects: Array<EffectRef>,
    vbls: { [unique: number]: Array<EffectRef> },
    nullIfUnchanged: boolean,
): null | Array<EffectRef> => {
    let changed = false;
    const result: Array<EffectRef> = [];
    effects.forEach((eff) => {
        if (eff.type === 'var' && vbls[eff.sym.unique] != null) {
            result.push(...vbls[eff.sym.unique]);
            changed = true;
        } else {
            result.push(eff);
        }
    });
    if (changed || !nullIfUnchanged) {
        return result;
    }
    return null;
};

const subtEffectVars = (
    t: Type,
    vbls: { [unique: number]: Array<EffectRef> },
): Type => {
    return (
        walkType(t, (t) => {
            if (t.type === 'lambda') {
                let changed = false;
                const effects = expandEffectVars(t.effects, vbls, true);
                if (effects != null) {
                    return {
                        ...t,
                        effects,
                    };
                }
            }
            return null;
        }) || t
    );
};

const subtTypeVars = (t: Type, vbls: { [unique: number]: Type }): Type => {
    return (
        walkType(t, (t) => {
            if (t.type === 'var') {
                if (vbls[t.sym.unique]) {
                    return vbls[t.sym.unique];
                }
                return t;
            }
            if (t.type === 'ref') {
                if (t.ref.type === 'builtin') {
                    return null;
                }
                throw new Error(`Not support yet ${JSON.stringify(t)}`);
            }
            return null;
        }) || t
    );
};

export const showLocation = (loc: Location | null) => {
    if (!loc) {
        return `<no location>`;
    }
    return `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}`;
};

export const applyEffectVariables = (
    env: Env,
    type: Type,
    vbls: Array<EffectRef>,
): Type => {
    if (type.type === 'lambda') {
        const t: LambdaType = type as LambdaType;

        const mapping: { [unique: number]: Array<EffectRef> } = {};

        if (type.effectVbls.length !== 1) {
            throw new Error(
                `Multiple effect variables not yet supported: ${showType(
                    type,
                )} : ${showLocation(type.location)}`,
            );
        }

        mapping[type.effectVbls[0]] = vbls;

        return {
            ...type,
            effectVbls: [],
            effects: expandEffectVars(type.effects, mapping, false)!,
            args: type.args.map((t) => subtEffectVars(t, mapping)),
            // TODO effects with type vars!
            rest: null, // TODO rest args
            res: subtEffectVars(type.res, mapping),
        };
    }
    // should I go full-on whatsit? maybe not yet.
    throw new Error(`Can't apply variables to non-lambdas just yet`);
};

export const applyTypeVariables = (
    env: Env,
    type: Type,
    vbls: Array<Type>,
): Type => {
    if (type.type === 'lambda') {
        const t: LambdaType = type as LambdaType;

        const mapping: { [unique: number]: Type } = {};
        if (vbls.length !== t.typeVbls.length) {
            console.log('the ones', t.typeVbls);
            throw new Error(
                `Wrong number of type variables: ${vbls.length} : ${t.typeVbls.length}`,
            );
        }
        vbls.forEach((typ, i) => {
            // STOPSHIP CHECK HERE
            const subs = t.typeVbls[i].subTypes;
            for (let sub of subs) {
                if (!hasSubType(env, typ, sub)) {
                    throw new Error(`Expected a subtype of ${idName(sub)}`);
                }
            }
            // if (hasSubType(typ, ))
            mapping[t.typeVbls[i].unique] = typ;
        });
        return {
            ...type,
            typeVbls: [], // TODO allow partial application!
            args: type.args.map((t) => subtTypeVars(t, mapping)),
            // TODO effects with type vars!
            rest: null, // TODO rest args
            res: subtTypeVars(type.res, mapping),
        };
    }
    // should I go full-on whatsit? maybe not yet.
    throw new Error(`Can't apply variables to non-lambdas just yet`);
};

const typeExpr = (env: Env, expr: Expression, hint?: Type | null): Term => {
    switch (expr.type) {
        case 'int':
            return {
                type: 'int',
                value: expr.value,
                location: expr.location,
                is: {
                    type: 'ref',
                    location: expr.location,
                    ref: { type: 'builtin', name: 'int' },
                },
            };
        case 'string':
            return {
                type: 'string',
                text: expr.text,
                location: expr.location,
                is: {
                    location: expr.location,
                    type: 'ref',
                    ref: { type: 'builtin', name: 'string' },
                },
            };
        case 'block': {
            const inner: Array<Term | Let> = [];
            let innerEnv = env;
            for (let item of expr.items) {
                if (item.type === 'define') {
                    const value = typeExpr(innerEnv, item.expr);
                    innerEnv = subEnv(innerEnv);

                    const type = item.ann
                        ? typeType(innerEnv, item.ann)
                        : value.is;
                    if (
                        item.ann &&
                        fitsExpectation(env, value.is, type) === false
                    ) {
                        throw new Error(
                            `Value of const doesn't match type annotation. ${showType(
                                value.is,
                            )}, expected ${showType(type)}`,
                        );
                    }
                    const unique = Object.keys(innerEnv.local.locals).length;
                    const sym: Symbol = { name: item.id.text, unique };
                    innerEnv.local.locals[item.id.text] = { sym, type };
                    inner.push({
                        type: 'Let',
                        location: item.location,
                        binding: sym,
                        value,
                        is: void_,
                    });
                } else {
                    inner.push(typeExpr(innerEnv, item));
                }
            }
            return {
                type: 'sequence',
                sts: inner,
                location: expr.location,
                is: inner[inner.length - 1].is,
            };
        }
        case 'If': {
            const cond = typeExpr(env, expr.cond);
            const yes = typeExpr(env, expr.yes);
            const no = expr.no ? typeExpr(env, expr.no) : null;
            if (fitsExpectation(env, cond.is, bool) !== true) {
                throw new Error(`Condition of if must be a boolean`);
            }

            if (fitsExpectation(env, yes.is, no ? no.is : void_) !== true) {
                throw new Error(`Branches of if dont agree`);
            }
            return {
                type: 'if',
                cond,
                yes,
                no,
                location: expr.location,
                is: yes.is,
            };
        }
        case 'ops': {
            // ok, left associative, right? I think so.
            let left: Term = typeExpr(env, expr.first);
            expr.rest.forEach(({ op, right }) => {
                let is = env.global.builtins[op];
                if (!is) {
                    throw new Error(`Unexpected binary op ${op}`);
                }
                if (is.type !== 'lambda') {
                    throw new Error(`${op} is not a function`);
                }
                if (is.args.length !== 2) {
                    throw new Error(`${op} is not a binary function`);
                }
                const rarg = typeExpr(env, right);

                if (is.typeVbls.length === 1) {
                    if (!typesEqual(env, left.is, rarg.is)) {
                        throw new Error(
                            `Binops must have same-typed arguments`,
                        );
                    }
                    is = applyTypeVariables(env, is, [left.is]) as LambdaType;
                }

                if (fitsExpectation(env, left.is, is.args[0]) !== true) {
                    throw new Error(`first arg to ${op} wrong type`);
                }
                if (fitsExpectation(env, rarg.is, is.args[1]) !== true) {
                    throw new Error(`second arg to ${op} wrong type`);
                }
                left = {
                    type: 'apply',
                    location: null,
                    target: {
                        location: null,
                        type: 'ref',
                        ref: { type: 'builtin', name: op },
                        is,
                    },
                    args: [left, rarg],
                    is: is.res,
                };
            });
            return left;
        }
        case 'WithSuffix': {
            // So, among the denormalizations that we have,
            // the fact that references copy over the type of the thing
            // being referenced might be a little odd.
            let target = typeExpr(env, expr.target);
            for (let suffix of expr.suffixes) {
                if (suffix.type === 'Apply') {
                    target = typeApply(env, target, suffix);
                } else if (suffix.type === 'Attribute') {
                    // OOOOKKK.
                    // So here we have some choices, right?
                    // first we find the object this is likely to be attached to
                    // ermmm yeah maybe this is where constraint solving becomes a thing?
                    // which, ugh
                    // So yeah, when parsing, if there are multiple things with the
                    // same name, tough beans I'm sorry.
                    // Oh maybe allow it to be "fully qualified"?
                    // like `.<Person>name`? or `.Person::name`?
                    // yeah that could be cool.
                    if (!env.global.attributeNames[suffix.id.text]) {
                        throw new Error(
                            `Unknown attribute name ${suffix.id.text}`,
                        );
                    }
                    const { id, idx } = env.global.attributeNames[
                        suffix.id.text
                    ];
                    const t = env.global.types[idName(id)];
                    if (t.type !== 'Record') {
                        throw new Error(`${idName(id)} is not a record type`);
                    }
                    const ref: Reference = { type: 'user', id };
                    if (
                        !typesEqual(env, target.is, {
                            type: 'ref',
                            ref,
                            location: null,
                        }) &&
                        !hasSubType(env, target.is, id)
                    ) {
                        throw new Error(
                            `Expression at ${showLocation(
                                suffix.location,
                            )} is not a ${idName(id)} or its supertype`,
                        );
                    }

                    target = {
                        type: 'Attribute',
                        target,
                        location: suffix.location,
                        idx,
                        ref,
                        is: t.items[idx],
                    };
                }
            }
            return target;
        }
        case 'id': {
            const term = resolveIdentifier(env, expr.text, expr.location);
            if (term != null) {
                // console.log(`${expr.text} : ${showType(term.is)}`);
                return term;
            }
            console.log(env.local.locals);
            throw new Error(
                `Identifier "${expr.text}" at ${showLocation(
                    expr.location,
                )} hasn't been defined anywhere.`,
            );
        }
        case 'lambda':
            return typeLambda(env, expr);

        case 'handle': {
            return typeHandle(env, expr);
        }
        case 'raise': {
            const key = expr.name.text + '.' + expr.constr.text;
            const effid = env.global.effectConstructors[key];
            if (!effid) {
                throw new Error(`Unknown effect ${key}`);
            }
            const eff = env.global.effects[effid.hash][effid.idx];
            if (eff.args.length !== expr.args.length) {
                throw new Error(`Effect constructor wrong number of args`);
            }
            const ref: Reference = {
                type: 'user',
                id: { hash: effid.hash, size: 1, pos: 0 },
            };
            const args: Array<Term> = [];
            expr.args.forEach((term, i) => {
                const t = typeExpr(env, term, eff.args[i]);
                if (fitsExpectation(env, t.is, eff.args[i]) !== true) {
                    throw new Error(
                        `Wrong type for arg ${i}: ${JSON.stringify(
                            t.is,
                        )}, expected ${JSON.stringify(eff.args[i])}`,
                    );
                }
                args.push(t);
            });

            return {
                type: 'raise',
                location: expr.location,
                ref,
                idx: effid.idx,
                args,
                is: eff.ret,
            };
        }
        case 'Record': {
            return typeRecord(env, expr);
        }
        default:
            let _x: never = expr;
            throw new Error(`Unexpected parse type ${(expr as any).type}`);
    }
};

export default typeExpr;