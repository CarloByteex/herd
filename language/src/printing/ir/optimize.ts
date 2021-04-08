import { idFromName } from '../../typing/env';
import { int, pureFunction, void_ } from '../../typing/preset';
import { Env, Id, Symbol, symbolsEqual } from '../../typing/types';
import {
    defaultVisitor,
    transformBlock,
    transformExpr,
    transformLambdaBody,
    transformStmt,
    Visitor,
} from './transform';
import {
    Apply,
    Block,
    callExpression,
    Expr,
    isTerm,
    Record,
    RecordSubType,
    ReturnStmt,
    Stmt,
    Tuple,
} from './types';
import { and, asBlock, builtin, iffe } from './utils';

const symName = (sym: Symbol) => `${sym.name}$${sym.unique}`;

export const optimizeDefine = (env: Env, expr: Expr, id: Id): Expr => {
    expr = optimize(expr);
    expr = optimizeTailCalls(env, expr, id);
    expr = optimize(expr);
    expr = arraySliceLoopToIndex(env, expr);
    return expr;
};

export const optimize = (expr: Expr): Expr => {
    const transformers: Array<(e: Expr) => Expr> = [
        removeUnusedVariables,
        removeNestedBlocksWithoutDefinesAndCodeAfterReturns,
        flattenNestedIfs,
        flattenIffe,
        foldConstantAssignments,
        foldConstantTuples,
        removeUnusedVariables,
        foldSingleUseAssignments,
    ];
    transformers.forEach((t) => (expr = t(expr)));
    return expr;
};

export const optimizer = (visitor: Visitor) => (expr: Expr): Expr =>
    transformRepeatedly(expr, visitor);

// This flattens IFFEs that are the bodies of a lambda expr, or
// the value of a return statement.
export const flattenIffe = optimizer({
    ...defaultVisitor,
    block: (block) => {
        const items: Array<Stmt> = [];
        let changed = false;
        block.items.forEach((stmt) => {
            if (
                stmt.type === 'Return' &&
                stmt.value.type === 'apply' &&
                stmt.value.args.length === 0 &&
                stmt.value.target.type === 'lambda'
            ) {
                items.push(...asBlock(stmt.value.target.body).items);
                changed = true;
            } else {
                items.push(stmt);
            }
        });
        return changed ? { ...block, items } : block;
    },
    expr: (expr) => {
        if (
            expr.type === 'lambda' &&
            expr.body.type === 'apply' &&
            expr.body.args.length === 0 &&
            expr.body.target.type === 'lambda'
        ) {
            return {
                ...expr,
                body: expr.body.target.body,
            };
            // return false
        }
        return null;
    },
});

// TODO: need an `&&` logicOp type. Or just a general binOp type?
// or something. Maybe have && be a builtin, binop.
export const flattenNestedIfs = (expr: Expr): Expr => {
    return transformRepeatedly(expr, {
        ...defaultVisitor,
        stmt: (stmt) => {
            if (stmt.type !== 'if') {
                return null;
            }
            if (stmt.no != null) {
                return null;
            }
            if (stmt.yes.items.length !== 1) {
                return null;
            }
            if (stmt.yes.items[0].type !== 'if') {
                return null;
            }
            if (stmt.yes.items[0].no !== null) {
                return null;
            }
            return {
                ...stmt,
                cond: and(stmt.cond, stmt.yes.items[0].cond, stmt.loc),
                yes: stmt.yes.items[0].yes,
            };
        },
    });
};

export const transformRepeatedly = (expr: Expr, visitor: Visitor): Expr => {
    while (true) {
        const nexp = transformExpr(expr, visitor);
        if (nexp === expr) {
            break;
        }
        expr = nexp;
    }
    return expr;
};

export const removeNestedBlocksWithoutDefinesAndCodeAfterReturns = (
    expr: Expr,
): Expr => {
    return transformRepeatedly(expr, {
        ...defaultVisitor,
        block: (block) => {
            const items: Array<Stmt> = [];
            let changed = false;
            let hasReturned = false;
            block.items.forEach((item) => {
                if (hasReturned) {
                    changed = true;
                    return;
                }
                if (item.type === 'Return') {
                    items.push(item);
                    hasReturned = true;
                    return;
                }
                if (
                    item.type === 'Block' &&
                    !item.items.some((item) => item.type === 'Define')
                ) {
                    changed = true;
                    items.push(...item.items);
                } else {
                    items.push(item);
                }
            });
            return changed ? { ...block, items } : block;
        },
    });
};

export const foldConstantTuples = (expr: Expr): Expr => {
    let tupleConstants: { [v: string]: Tuple | null } = {};
    return transformExpr(expr, {
        ...defaultVisitor,
        // Don't go into lambdas
        expr: (value) => {
            if (value.type === 'tupleAccess') {
                if (value.target.type === 'var') {
                    const t = tupleConstants[symName(value.target.sym)];
                    if (t != null) {
                        if (isConstant(t.items[value.idx])) {
                            return t.items[value.idx];
                        }
                    }
                }
            }
            if (value.type === 'var') {
                const v = tupleConstants[symName(value.sym)];
                if (v != null) {
                    tupleConstants[symName(value.sym)] = null;
                }
            }
            return null;
        },
        stmt: (value) => {
            if (
                (value.type === 'Define' || value.type === 'Assign') &&
                value.value != null &&
                value.value.type === 'tuple'
            ) {
                tupleConstants[symName(value.sym)] = value.value;
            }
            return null;
        },
    });
};

// We need to ensure that
/*
let y = 1
let x = y
y = 3
z = x
*/
// doesn't end up with z being equal to 3.
// So we need to ensure that ... "nothing that is used by
// this thing gets reassigned"?
export const foldSingleUseAssignments = (expr: Expr): Expr => {
    let usages: { [v: string]: number } = {};
    let subUses: { [v: string]: { [key: string]: boolean } } = {};
    transformExpr(expr, {
        ...defaultVisitor,
        expr: (expr) => {
            if (expr.type === 'var') {
                usages[symName(expr.sym)] =
                    (usages[symName(expr.sym)] || 0) + 1;
            }
            return null;
        },
        stmt: (stmt) => {
            if (stmt.type === 'Assign') {
                const en = symName(stmt.sym);
                usages[en] = (usages[en] || 0) + 1;

                // We're reassigning something! Anything that uses
                // this variable, but that hasn't yet seen its first use,
                // should be "poisoned".
                Object.keys(subUses[en] || {}).forEach((k) => {
                    // Special case: if the value we're assigning to is the
                    // single-use variable itself, we're fine
                    if (
                        stmt.value.type === 'var' &&
                        symName(stmt.value.sym) === k
                    ) {
                        return;
                    }
                    if (usages[k] !== 1) {
                        usages[k] = 2; // disqualify from single-use
                    }
                });
            } else if (stmt.type === 'Define' && stmt.value != null) {
                const top = symName(stmt.sym);
                // const subs: {[key: string]: boolean} = {}
                transformExpr(stmt.value, {
                    ...defaultVisitor,
                    expr: (expr) => {
                        if (expr.type === 'var') {
                            const en = symName(expr.sym);
                            if (!subUses[en]) {
                                subUses[en] = {};
                            }
                            subUses[en][top] = true;
                        }
                        return null;
                    },
                });
                // subUses[symName(stmt.sym)] = subs
                return false;
            }
            return null;
        },
    });
    const singles: { [key: string]: boolean } = {};
    let found = false;
    Object.keys(usages).forEach((k) => {
        if (usages[k] === 1) {
            found = true;
            singles[k] = true;
        }
    });
    if (!found) {
        return expr;
    }
    const defns: { [key: string]: Expr } = {};
    return transformExpr(expr, {
        ...defaultVisitor,
        block: (block) => {
            const items: Array<Stmt> = [];
            block.items.forEach((item) => {
                if (item.type === 'Define' && singles[symName(item.sym)]) {
                    defns[symName(item.sym)] = item.value!;
                    return; // skip this
                }
                if (
                    item.type === 'Assign' &&
                    item.value.type === 'var' &&
                    symbolsEqual(item.sym, item.value.sym)
                ) {
                    return; // x = x, noop
                }
                items.push(item);
            });
            return items.length !== block.items.length
                ? { ...block, items }
                : block;
        },
        expr: (value) => {
            if (value.type === 'var') {
                const v = defns[symName(value.sym)];
                if (v != null) {
                    return v;
                }
            }
            return null;
        },
        // stmt: (value) => {
        //     if (
        //         (value.type === 'Define' || value.type === 'Assign') &&
        //         value.value != null &&
        //         isConstant(value.value)
        //     ) {
        //         constants[symName(value.sym)] = value.value;
        //     }
        //     return null;
        // },
    });
};

export const foldConstantAssignments = (expr: Expr): Expr => {
    let constants: { [v: string]: Expr | null } = {};
    let tupleConstants: { [v: string]: Tuple } = {};
    return transformExpr(expr, {
        ...defaultVisitor,
        // Don't go into lambdas
        expr: (value) => {
            if (value.type === 'var') {
                const v = constants[symName(value.sym)];
                if (v != null) {
                    return v;
                }
            }
            return null;
        },
        stmt: (value) => {
            if (
                (value.type === 'Define' || value.type === 'Assign') &&
                value.value != null &&
                isConstant(value.value)
            ) {
                constants[symName(value.sym)] = value.value;
            }
            return null;
        },
    });
};

export const removeUnusedVariables = (expr: Expr): Expr => {
    const used: { [key: string]: boolean } = {};
    const visitor: Visitor = {
        ...defaultVisitor,
        expr: (value: Expr) => {
            switch (value.type) {
                case 'var':
                    used[symName(value.sym)] = true;
            }
            return null;
        },
    };
    if (transformExpr(expr, visitor) !== expr) {
        throw new Error(`Noop visitor somehow mutated`);
    }
    const remover: Visitor = {
        ...defaultVisitor,
        block: (block) => {
            const items = block.items.filter((stmt) => {
                const unused =
                    (stmt.type === 'Define' || stmt.type === 'Assign') &&
                    used[symName(stmt.sym)] !== true;
                return !unused;
            });
            return items.length !== block.items.length
                ? { ...block, items }
                : null;
        },
    };
    return transformExpr(expr, remover);
};

/// Optimizations for go, and possibly other languages

export const goOptimizations = (env: Env, expr: Expr): Expr => {
    const transformers: Array<(env: Env, e: Expr) => Expr> = [
        flattenRecordSpreads,
    ];
    transformers.forEach((t) => (expr = t(env, expr)));
    return expr;
};

const hasSpreads = (expr: Record) =>
    (expr.base.type === 'Concrete' && expr.base.spread != null) ||
    Object.keys(expr.subTypes).some((k) => expr.subTypes[k].spread != null);

export const flattenRecordSpreads = (env: Env, expr: Expr): Expr => {
    return transformRepeatedly(expr, {
        ...defaultVisitor,
        expr: (expr) => {
            if (expr.type !== 'record') {
                return null;
            }
            // nothing to flatten
            if (!hasSpreads(expr)) {
                return null;
            }
            return flattenRecordSpread(env, expr);
        },
    });
};

const isConstant = (arg: Expr) => {
    switch (arg.type) {
        case 'int':
        case 'float':
        case 'string':
        case 'term':
        case 'builtin':
        case 'var':
            return true;
        default:
            return false;
    }
};

export const flattenRecordSpread = (env: Env, expr: Record): Expr => {
    // console.log('flatten');
    const inits: Array<Stmt> = [];

    const subTypes: { [key: string]: RecordSubType } = { ...expr.subTypes };

    if (expr.base.type === 'Concrete') {
        const b = expr.base;
        if (expr.base.spread) {
            let target: Expr;
            if (isConstant(expr.base.spread)) {
                target = expr.base.spread;
            } else {
                const v: Symbol = { name: 'arg', unique: env.local.unique++ };
                inits.push({
                    type: 'Define',
                    sym: v,
                    value: expr.base.spread,
                    loc: expr.loc,
                    is: expr.is,
                });
                target = { type: 'var', sym: v, loc: expr.loc };
            }
            // const d = env.global.types[idName(expr.base.ref.id)] as RecordDef;
            const rows: Array<Expr> = expr.base.rows.map((row, i) => {
                if (row == null) {
                    return {
                        type: 'attribute',
                        target,
                        ref: b.ref,
                        idx: i,
                        loc: expr.loc,
                    };
                } else {
                    return row;
                }
            });
            expr = { ...expr, base: { ...expr.base, spread: null, rows } };

            Object.keys(expr.subTypes).forEach((k) => {
                const subType = expr.subTypes[k];
                const rows: Array<Expr> = subType.rows.map((row, i) => {
                    if (row == null) {
                        return {
                            type: 'attribute',
                            // TODO: check if this is complex,
                            // and if so, make a variable
                            target,
                            ref: { type: 'user', id: idFromName(k) },
                            idx: i,
                            loc: expr.loc,
                        };
                    } else {
                        return row;
                    }
                });
                subTypes[k] = { ...subType, rows };
            });
        } else if (expr.base.rows.some((r) => r == null)) {
            throw new Error(`No spread, but some null`);
        }
    } else {
        throw new Error('variable sorry');
    }

    Object.keys(expr.subTypes).forEach((k) => {
        const subType = expr.subTypes[k];
        if (subType.spread) {
            let target: Expr;
            if (isConstant(subType.spread)) {
                target = subType.spread;
            } else {
                const v: Symbol = {
                    name: 'st' + k,
                    unique: env.local.unique++,
                };
                inits.push({
                    type: 'Define',
                    sym: v,
                    value: subType.spread,
                    loc: subType.spread.loc,
                    is: {
                        type: 'ref',
                        ref: { type: 'user', id: idFromName(k) },
                        location: null,
                        // STOPSHIP: ???
                        typeVbls: [],
                        effectVbls: [],
                    },
                });
                target = { type: 'var', sym: v, loc: expr.loc };
            }
            const rows: Array<Expr> = subType.rows.map((row, i) => {
                if (row == null) {
                    return {
                        type: 'attribute',
                        // TODO: check if this is complex,
                        // and if so, make a variable
                        target,
                        ref: { type: 'user', id: idFromName(k) },
                        idx: i,
                        loc: expr.loc,
                    };
                } else {
                    return row;
                }
            });
            subTypes[k] = { ...subTypes[k], spread: null, rows };
        } else {
            subTypes[k] = subTypes[k];
        }
    });
    expr = { ...expr, subTypes };

    if (hasSpreads(expr)) {
        throw new Error('not gone');
    }

    if (inits.length) {
        return iffe(
            {
                type: 'Block',
                items: inits.concat({
                    type: 'Return',
                    loc: expr.loc,
                    value: expr,
                }),
                loc: expr.loc,
            },
            {
                type: 'ref',
                location: null,
                // @ts-ignore
                ref: expr.base.ref,
                typeVbls: [],
                effectVbls: [],
            },
        );
    } else {
        return expr;
    }
};

export const hasTailCall = (body: Block | Expr, self: Id): boolean => {
    let found = false;
    let hasLoop = false;
    transformLambdaBody(body, {
        ...defaultVisitor,
        stmt: (stmt) => {
            if (isSelfTail(stmt, self)) {
                found = true;
            } else if (stmt.type === 'Loop') {
                hasLoop = true;
            }
            return null;
        },
        expr: (expr) => {
            if (expr.type === 'lambda') {
                // don't recurse into lambdas
                return false;
            }
            // no changes, but do recurse
            return null;
        },
    });
    return found && !hasLoop;
};

const isSelfTail = (stmt: Stmt, self: Id) =>
    stmt.type === 'Return' &&
    stmt.value.type === 'apply' &&
    isTerm(stmt.value.target, self);

export const optimizeTailCalls = (env: Env, expr: Expr, self: Id) => {
    if (expr.type === 'lambda') {
        const body = tailCallRecursion(
            env,
            expr.body,
            expr.args.map((a) => a.sym),
            self,
        );
        return body !== expr.body ? { ...expr, body } : expr;
    }
    return expr;
};

export const tailCallRecursion = (
    env: Env,
    body: Block | Expr,
    argNames: Array<Symbol>,
    self: Id,
): Block | Expr => {
    if (!hasTailCall(body, self)) {
        return body;
    }
    return {
        type: 'Block',
        loc: body.loc,
        items: [
            // This is where we would define any de-slicers
            {
                type: 'Loop',
                loc: body.loc,
                body: transformBlock(asBlock(body), {
                    ...defaultVisitor,
                    block: (block) => {
                        if (!block.items.some((s) => isSelfTail(s, self))) {
                            return null;
                        }

                        const items: Array<Stmt> = [];
                        block.items.forEach((stmt) => {
                            if (isSelfTail(stmt, self)) {
                                const apply = (stmt as ReturnStmt)
                                    .value as Apply;
                                const vbls = apply.args.map((arg, i) => {
                                    const sym: Symbol = {
                                        name: 'recur',
                                        unique: env.local.unique++,
                                    };
                                    // TODO: we need the type of all the things I guess...
                                    items.push({
                                        type: 'Define',
                                        sym,
                                        loc: arg.loc,
                                        value: arg,
                                        is: void_,
                                    });
                                    return sym;
                                });
                                vbls.forEach((sym, i) => {
                                    items.push({
                                        type: 'Assign',
                                        sym: argNames[i],
                                        loc: apply.args[i].loc,
                                        is: void_,
                                        value: {
                                            type: 'var',
                                            sym,
                                            loc: apply.args[i].loc,
                                        },
                                    });
                                });
                                items.push({ type: 'Continue', loc: stmt.loc });
                            } else {
                                items.push(stmt);
                            }
                        });
                        return { ...block, items };
                    },
                }),
            },
        ],
    };
};

export const arraySliceLoopToIndex = (env: Env, expr: Expr): Expr => {
    if (expr.type !== 'lambda') {
        console.log('not a lambda', expr.type);
        return expr;
    }
    // being fairly conservative here
    if (
        expr.body.type !== 'Block' ||
        expr.body.items.length !== 1 ||
        expr.body.items[0].type !== 'Loop'
    ) {
        console.log('not a block', expr.body.type);
        return expr;
    }
    const arrayArgs = expr.args.filter(
        (arg) =>
            arg.type.type === 'ref' &&
            arg.type.ref.type === 'builtin' &&
            arg.type.ref.name === 'Array',
    );
    if (!arrayArgs.length) {
        console.log('no arrays');
        return expr;
    }
    const argMap: { [key: string]: null | boolean } = {};
    // null = no slice
    // false = disqualified
    // true = slice
    // Valid state transitions:
    //   null -> true
    //   null -> false
    //   true -> false
    arrayArgs.forEach((a) => (argMap[symName(a.sym)] = null));
    // IF an array arg is used for anything other than
    // - arr.length
    // - arr[idx]
    // - arr.slice
    // Then it is disqualified
    // Also, if it's not used for arr.slice, we don't need to mess
    transformExpr(expr, {
        ...defaultVisitor,
        stmt: (stmt) => {
            if (
                stmt.type === 'Assign' &&
                stmt.value.type === 'slice' &&
                stmt.value.end === null &&
                stmt.value.value.type === 'var' &&
                symbolsEqual(stmt.sym, stmt.value.value.sym)
            ) {
                const n = symName(stmt.sym);
                if (argMap[n] !== false) {
                    argMap[n] = true;
                }
                return false;
            }
            return null;
        },
        expr: (expr) => {
            switch (expr.type) {
                case 'var':
                    console.log('Found a far!', expr);
                    argMap[symName(expr.sym)] = false;
                    return null;
                // Slices *are* disqualifying if they're not
                // a self-assign slice
                case 'arrayIndex':
                case 'arrayLen':
                    if (expr.value.type === 'var') {
                        // don't recurse, these are valid uses
                        return false;
                    }
                    return null;
            }
            return null;
        },
    });
    // I wonder if there's a more general optimization
    // that I can do that would remove the need for slices
    // even when it's not self-recursive.......
    const corrects = arrayArgs.filter((k) => argMap[symName(k.sym)] === true);
    if (!corrects.length) {
        console.log('no corrects', argMap);
        return expr;
    }
    const indexForSym: { [key: string]: Symbol } = {};
    const indices: Array<Symbol> = corrects.map((arg) => {
        const unique = env.local.unique++;
        const s = { name: arg.sym.name + '_i', unique };
        indexForSym[symName(arg.sym)] = s;
        return s;
    });
    const modified: Array<Expr> = [];
    const stmtTransformer: Visitor = {
        ...defaultVisitor,
        stmt: (stmt) => {
            if (
                stmt.type === 'Assign' &&
                stmt.value.type === 'slice' &&
                stmt.value.end === null &&
                stmt.value.value.type === 'var' &&
                symbolsEqual(stmt.sym, stmt.value.value.sym)
            ) {
                const n = symName(stmt.sym);
                if (argMap[n] === true) {
                    return {
                        ...stmt,
                        sym: indexForSym[n],
                        value: callExpression(
                            builtin('+', expr.loc),
                            pureFunction([int, int], int),
                            int,
                            [
                                {
                                    type: 'var',
                                    loc: expr.loc,
                                    sym: indexForSym[n],
                                },
                                stmt.value.start,
                            ],
                            expr.loc,
                        ),
                    };
                }
                return false;
            }
            return null;
        },
        expr: (expr) => {
            switch (expr.type) {
                case 'arrayIndex': {
                    if (expr.value.type === 'var') {
                        const n = symName(expr.value.sym);
                        if (argMap[n] === true) {
                            return {
                                ...expr,
                                idx: callExpression(
                                    builtin('+', expr.loc),
                                    pureFunction([int, int], int),
                                    int,
                                    [
                                        expr.idx,
                                        {
                                            type: 'var',
                                            loc: expr.loc,
                                            sym: indexForSym[n],
                                        },
                                    ],
                                    expr.loc,
                                ),
                            };
                        }
                    }
                    return null;
                }
                case 'arrayLen':
                    if (expr.value.type === 'var') {
                        if (modified.includes(expr)) {
                            return false;
                        }
                        const n = symName(expr.value.sym);
                        if (argMap[n] === true) {
                            modified.push(expr);
                            return callExpression(
                                builtin('-', expr.loc),
                                pureFunction([int, int], int),
                                int,
                                [
                                    expr,
                                    {
                                        type: 'var',
                                        loc: expr.loc,
                                        sym: indexForSym[n],
                                    },
                                ],
                                expr.loc,
                            );
                        }
                    }
                    return null;
            }
            return null;
        },
    };
    return {
        ...expr,
        body: {
            ...expr.body,
            items: indices
                .map(
                    (sym) =>
                        ({
                            type: 'Define',
                            loc: null,
                            is: int,
                            sym,
                            value: { type: 'int', value: 0, loc: null },
                        } as Stmt),
                )
                .concat(
                    expr.body.items.map((item) =>
                        transformStmt(item, stmtTransformer),
                    ),
                ),
        },
    };
};