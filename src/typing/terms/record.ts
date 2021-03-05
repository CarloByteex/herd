// For the record

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
    isRecord,
} from '../types';
import { Record } from '../../parsing/parser';
import { showType, fitsExpectation } from '../unify';
import { idName } from '../env';
import typeExpr, { showLocation } from '../typeExpr';
import typeType from '../typeType';

export const typeRecord = (env: Env, expr: Record): RecordTerm => {
    const names: { [key: string]: { i: number; id: Id | null } } = {};

    const subTypes: {
        [id: string]: {
            covered: boolean;
            spread: Term | null;
            rows: Array<{ type: Type; value: Term | null }>;
        };
    } = {};
    const subTypeTypes: { [id: string]: RecordDef } = {};

    let base: RecordBase<{ type: Type; value: Term | null }>;
    let subTypeIds: Array<Id>;
    let is: Type;

    if (env.local.typeVblNames[expr.id.text]) {
        const sym = env.local.typeVblNames[expr.id.text];
        const t = env.local.typeVbls[sym.unique];
        base = {
            type: 'Variable',
            var: env.local.typeVblNames[expr.id.text],
            spread: null as any,
        };
        subTypeIds = [];
        t.subTypes.forEach((id) => {
            const t = env.global.types[idName(id)];
            subTypeIds.push(...getAllSubTypes(env.global, t));
        });
        is = { type: 'var', sym, location: expr.id.location };
    } else {
        const id = env.global.typeNames[expr.id.text];
        if (!id) {
            throw new Error(
                `No Record type ${expr.id.text} at ${showLocation(
                    expr.location,
                )}`,
            );
        }
        const t = env.global.types[idName(id)];
        const ref: Reference = { type: 'user', id };
        const rows: Array<{ value: Term | null; type: Type }> = new Array(
            t.items.length,
        );

        t.items.forEach((type, i) => {
            rows[i] = { type, value: null };
        });

        // So we can detect missing items
        // rows.fill(null);
        base = { rows, ref, type: 'Concrete', spread: null };
        env.global.recordGroups[idName(id)].forEach(
            (name, i) => (names[name] = { i, id: null }),
        );

        // TODO: deduplicate
        subTypeIds = getAllSubTypes(env.global, t);
        is = {
            type: 'ref',
            ref,
            location: expr.id.location,
            typeVbls: expr.typeVbls.map((t) => typeType(env, t)),
            effectVbls: [], // STOPSHIP: allow effect variables to be specified for records
        };
    }

    // let spread = null;

    subTypeIds.forEach((id) => {
        const t = env.global.types[idName(id)];
        subTypeTypes[idName(id)] = t;
        const rows = new Array(t.items.length);
        t.items.forEach((type, i) => {
            rows[i] = { type, value: null };
        });
        subTypes[idName(id)] = {
            covered: false,
            spread: null,
            rows,
        };
        env.global.recordGroups[idName(id)].forEach(
            (name, i) => (names[name] = { i, id }),
        );
    });

    // How to indicate what spreads are covered?
    // and how are we codegenning this?
    // like with go, we won't be spreading, we'll
    // be specifying each item
    // ok, I think we need to

    // const names = env.global.recordGroups[idName(id)];
    expr.rows.forEach((row) => {
        if (row.type === 'Spread') {
            const v = typeExpr(env, row.value);
            if (base.type === 'Concrete') {
                if (isRecord(v.is, base.ref)) {
                    // STOPSHIP: check that type variables match up
                    Object.keys(subTypes).forEach(
                        (k) => (subTypes[k].covered = true),
                    );
                    base.spread = v;
                    return;
                }
            } else if (
                v.is.type === 'var' &&
                symbolsEqual(v.is.sym, base.var)
            ) {
                Object.keys(subTypes).forEach(
                    (k) => (subTypes[k].covered = true),
                );
                base.spread = v;
                return;
            }
            // ummm I kindof want to
            for (let id of subTypeIds) {
                if (
                    // ermmm we're gonna ignore type variables here
                    isRecord(v.is, { type: 'user', id })
                ) {
                    subTypes[idName(id)].spread = v;
                    subTypes[idName(id)].covered = true;
                    getAllSubTypes(
                        env.global,
                        subTypeTypes[idName(id)],
                    ).forEach((sid) => {
                        subTypes[idName(sid)].covered = true;
                    });
                    return;
                }
            }
            throw new Error(`Invalid spread ${showType(v.is)}`);
        }

        if (!names[row.id.text]) {
            throw new Error(
                `Unexpected attrbute name ${row.id.text} at ${showLocation(
                    row.id.location,
                )}`,
            );
        }
        const { i, id } = names[row.id.text];
        let rowsToMod =
            id == null && base.type === 'Concrete'
                ? base.rows
                : subTypes[idName(id!)].rows;
        const recordType =
            id == null && base.type === 'Concrete'
                ? env.global.types[idName(base.ref.id)]
                : subTypeTypes[idName(id!)];
        if (rowsToMod[i].value != null) {
            throw new Error(
                `Multiple values provided for ${names[i]} at ${showLocation(
                    row.id.location,
                )}`,
            );
        }
        const v = typeExpr(env, row.value);
        if (!fitsExpectation(env, v.is, rowsToMod[i].type)) {
            throw new Error(
                `Invalid type for attribute ${row.id.text} at ${showLocation(
                    row.value.location,
                )}. Expected ${showType(recordType.items[i])}, got ${showType(
                    v.is,
                )}`,
            );
        }
        rowsToMod[i].value = v;
    });
    // TODO: once I have subtyping, this will have to be more clever.
    // of course, `rows` will also need to be more clever.
    if (base.type === 'Concrete' && base.spread == null) {
        const r = base.ref;
        base.rows.forEach((row, i) => {
            if (row.value == null) {
                throw new Error(
                    `Record missing attribute "${
                        env.global.recordGroups[idName(r.id)][i]
                    }" at ${showLocation(expr.location)}`,
                );
            }
        });
    } else if (base.type === 'Variable' && base.spread == null) {
        throw new Error(`Cannot create a new record of a variable type.`);
    }

    const finishedSubTypes: {
        [id: string]: {
            covered: boolean;
            spread: Term | null;
            rows: Array<Term | null>;
        };
    } = {};

    Object.keys(subTypes).forEach((id) => {
        finishedSubTypes[id] = {
            ...subTypes[id],
            rows: subTypes[id].rows.map((r) => r.value),
        };

        if (!subTypes[id].covered) {
            subTypes[id].rows.forEach((row, i) => {
                if (row.value == null) {
                    throw new Error(
                        `Record missing attribute from subtype ${id} "${
                            env.global.recordGroups[id][i]
                        }" at ${showLocation(expr.location)}`,
                    );
                }
            });
        }
    });

    return {
        type: 'Record',
        location: expr.location,
        base:
            base.type === 'Concrete'
                ? { ...base, rows: base.rows.map((r) => r.value) }
                : base,
        // ref,
        is,
        subTypes: finishedSubTypes,
        // rows,
    };
};
