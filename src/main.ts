// um what now

// we want to parse things I guess?

import fs from 'fs';
import hash from 'hash-sum';
import { type } from 'os';
import cloner from 'rfdc';
import parse, { Expression, Define, Toplevel } from './parser';
import {
    declarationToString,
    printType,
    termToString,
} from './typeScriptPrinter';
import typeExpr, { walkTerm } from './typeExpr';
import typeType, { newTypeVbl, walkType } from './typeType';
import { newEnv, Type, TypeConstraint } from './types';
import unify from './unify';
import { printToString } from './printer';
import { declarationToPretty, termToPretty } from './printTsLike';

const clone = cloner();

// ok gonna do some pegjs I think for parsin

// --------- PEG Parser Types -----------

// ummmmmmmmm
// ok, so where is the ast? and where is the typed tree? and such?
// so there's the parse tree, which we immediately turn into a typed tree, right?
// in the web UI, it would be constructed interactively
// but here
// its like
// what
// some inference necessary
// and just like guessing?
// -----

/*

What's the process here?
we've got a Typed Tree that we're constructing.
In the IDE it'll be an interactive experience where you're constructing the typed tree directly.

but, when working with text file representation,
we first do a parse tree
and then a typed tree
and thats ok






*/

// herm being able to fmap over these automagically would be super nice

// const walk = (t: Expression, visitor) => {
//     switch (t.type) {
//         case 'text':
//             visitor.type(t);
//             return;
//         case 'int':
//             visitor.int(t);
//             return;
//         case 'id':
//             visitor.id(t);
//             return;
//         case 'apply':
//             visitor.apply(t);
//             t.terms.forEach((t) => walk(t, visitor));
//             return;
//     }
// };
// const rmloc = (t: any) => (t.location = null);
// const locationRemover = { type: rmloc, int: rmloc, id: rmloc, apply: rmloc };
// const hashDefine = (d: Define) => {
//     const res = clone(d);
//     walk(res.id, locationRemover);
//     walk(res.exp, locationRemover);
//     res.location = null;
//     return hash(res);
// };

const int: Type = { type: 'ref', ref: { type: 'builtin', name: 'int' } };
const string: Type = { type: 'ref', ref: { type: 'builtin', name: 'string' } };
const void_: Type = { type: 'ref', ref: { type: 'builtin', name: 'void' } };

const main = (fname: string, dest: string) => {
    const raw = fs.readFileSync(fname, 'utf8');
    const parsed: Array<Toplevel> = parse(raw);

    const env = newEnv({
        name: 'global',
        type: { type: 'ref', ref: { type: 'builtin', name: 'never' } },
    });
    env.global.builtins['++'] = {
        type: 'lambda',
        args: [string, string],
        effects: [],
        rest: null,
        res: string,
    };
    env.global.builtins['+'] = {
        type: 'lambda',
        args: [int, int],
        effects: [],
        rest: null,
        res: int,
    };
    env.global.builtins['log'] = {
        type: 'lambda',
        args: [string],
        effects: [],
        rest: null,
        res: void_,
    };
    env.global.builtinTypes['unit'] = 0;
    env.global.builtinTypes['void'] = 0;
    env.global.builtinTypes['int'] = 0;
    env.global.builtinTypes['string'] = 0;

    const out = [
        `export {}`,
        'const log = console.log',
        `const raise = (handlers, hash, idx, args, done) => {
            handlers[hash](idx, args, done)
        }`,
        `type ShallowHandler<Get, Set> = (
            idx: number,
            args: Set,
            returnIntoFn: (newHandler: {[hash: string]: ShallowHandler<Get, Set>}, value: Get) => void,
        ) => void;`,
        `const handleSimpleShallow2 = <Get, Set, R>(
            hash: string,
            fn: (handler: {[hash: string]: ShallowHandler<Get, Set>}, cb: (fnReturnValue: R) => void) => void,
            handleEffect: Array<(
                value: Set,
                cb: (
                    gotten: Get,
                    newHandler: {[hash: string]: ShallowHandler<Get, Set>},
                    returnIntoHandler: (fnReturnValue: R) => void,
                ) => void,
            ) => void>,
            handlePure: (fnReturnValue: R) => void,
        ) => {
            let fnsReturnPointer = handlePure;
            fn(
                {[hash]: (idx, args, returnIntoFn) => {
                    handleEffect[idx](
                        args,
                        (handlersValueToSend, newHandler, returnIntoHandler) => {
                            if (returnIntoHandler === undefined) {
                                /// @ts-ignore
                                returnIntoHandler = newHandler
                                /// @ts-ignore
                                newHandler = handlersValueToSend
                                handlersValueToSend = null
                            }
                            fnsReturnPointer = returnIntoHandler;
                            returnIntoFn(newHandler, handlersValueToSend);
                        },
                    );
                }},
                (fnsReturnValue) => fnsReturnPointer(fnsReturnValue),
            );
        };`,
    ];
    for (const item of parsed) {
        if (item.type === 'define') {
            // ugh.
            // I really just need type inference? right?
            // or I mean
            // I could just shallowly check
            const typeVbls: { [key: string]: Array<TypeConstraint> } = {};
            const subEnv = {
                ...env,
                local: {
                    ...env.local,
                    // self,
                    typeVbls,
                },
            };
            const self = item.ann
                ? {
                      name: item.id.text,
                      type: typeType(env, item.ann),
                  }
                : { name: item.id.text, type: newTypeVbl(subEnv) };
            subEnv.local.self = self;
            const t = typeExpr(subEnv, item.expr);
            const unified: { [key: string]: Type | null } = {};
            for (let key of Object.keys(typeVbls)) {
                unified[key] = typeVbls[key].reduce(unify, null);
            }
            if (Object.keys(unified).length) {
                walkTerm(t, (term) => {
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
                const changed = walkType(self.type, (t: Type) => {
                    if (t.type === 'var' && unified[t.sym.unique] != null) {
                        return unified[t.sym.unique];
                    }
                    return null;
                });
                if (changed) {
                    self.type = changed;
                }
            }
            console.log('vbls', JSON.stringify(typeVbls, null, 2));
            console.log('unified', JSON.stringify(unified, null, 2));
            const h: string = hash(t);
            env.global.names[item.id.text] = { hash: h, size: 1, pos: 0 };
            env.global.terms[h] = t;
            // out.push(`// ${printType(env, t.is)}`);
            out.push(
                `/*\n${printToString(
                    declarationToPretty(
                        {
                            hash: h,
                            size: 1,
                            pos: 0,
                        },
                        t,
                    ),
                    100,
                    {
                        indent: 0,
                        pos: 0,
                    },
                )}\n*/`,
            );
            out.push(
                declarationToString(
                    {
                        ...env,
                        local: {
                            ...env.local,
                            self: { name: h, type: self.type },
                        },
                    },
                    h,
                    t,
                ),
            );
            // out.push(`const hash_${h} = ` + termToString(env, t));
            // } else if (item.type === 'deffect') {
            //     const h: string = hash(item);
            //     const constrs = [];
            //     item.constrs.forEach((constr, i) => {
            //         env.effectNames[constr.id.text] = { hash: h, idx: i };
            //         constrs.push(typeType(env, constr.type));
            //     });
            //     env.effects[h] = constrs;
        } else if (item.type === 'effect') {
            // console.log(item.constrs);
            // throw new Error('TODO');
            const constrs = item.constrs.map(({ type }) => {
                return {
                    args: type.args
                        ? type.args.map((a) => typeType(env, a))
                        : [],
                    ret: typeType(env, type.res),
                };
            });
            const h: string = hash(constrs);
            env.global.effectNames[item.id.text] = h;
            item.constrs.forEach((c, i) => {
                env.global.effectConstructors[c.id.text] = { idx: i, hash: h };
            });
            env.global.effects[h] = constrs;
        } else {
            const t = typeExpr(env, item);
            out.push(`// ${printType(env, t.is)}`);
            out.push(termToString(env, t));
        }
    }
    if (dest === '-' || !dest) {
        console.log(out.join('\n'));
    } else {
        fs.writeFileSync(dest, out.join('\n'));
    }
    fs.writeFileSync('./env.json', JSON.stringify(env, null, 2));
};

main(process.argv[2], process.argv[3]);
