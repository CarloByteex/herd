// Ok

import {
    BinOp,
    BinOpRight,
    binopWithHash,
    File,
    Toplevel,
    WithUnary,
    WithSuffix,
    Apsub,
    BinOp_inner,
    Identifier,
} from '../parsing/parser-new';
import { hashObject, idFromName } from '../typing/env';
import { getOpLevel, organizeDeep } from '../typing/terms/ops';
import * as typed from '../typing/types';
import * as preset from '../typing/preset';
import { Term, Type } from '../typing/types';
import { reGroupOps, typeGroup } from './ops';
import { parseIdOrSym } from './hashes';
import { resolveNamedValue, resolveValue } from './resolve';
import { typeExpression } from './typeExpression';
import { Context } from './Context';

export const typeToplevel = (
    ctx: Context,
    top: Toplevel,
): null | typed.ToplevelT => {
    switch (top.type) {
        case 'ToplevelExpression': {
            const term = typeExpression(ctx, top.expr, []);
            if (!term) {
                return null;
            }
            return {
                type: 'Expression',
                id: idFromName(hashObject(term)),
                location: top.location,
                term,
            };
        }
        // case 'Define': {
        //     const t = top.ann ? typeType(ctx, )
        //     const term = typeExpression(ctx, top.expr,)
        // }
        // case 'DecoratorDef':
        // 	const defn = typeDecoratorDef(ctx, top.id, top.args, top.targetType)
        // 	return {
        // 		type: 'Decorator',
        // 		id: top.id,
        // 		location: top.location,
        // 		name: top.id.text,
        // 		defn: {
        // 			unique
        // 		}
        // 	}
    }
    throw new Error(`nope`);
};

export const typeFile = (ctx: Context, file: File) => {
    if (file.tops) {
        file.tops.items.forEach((top) => {
            if (top.decorators) {
                throw new Error(`not yet`);
            }
            const ttop = typeToplevel(ctx, top.top);
        });
    }
};
