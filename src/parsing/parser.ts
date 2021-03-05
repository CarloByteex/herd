import { Reference } from '../typing/types';
import { parse } from './grammar';

export type Toplevel = Define | Effect | Expression | TypeDef;

export type Effect = {
    type: 'effect';
    // TODO type variables!
    id: Identifier;
    constrs: Array<{ id: Identifier; type: LambdaType }>;
};

export type TypeDef = { type: 'TypeDef'; id: Identifier; decl: TypeDecl };

export type TypeDecl = RecordDecl;

export type RecordDecl = {
    type: 'Record';
    items: Array<RecordItem>;
};
export type RecordItem = RecordRow | RecordSpread;
export type RecordSpread = { type: 'Spread'; constr: Identifier };
export type RecordRow = { type: 'Row'; id: Identifier; rtype: Type };

export type Loc = { offset: number; line: number; column: number };
export type Location = { start: Loc; end: Loc };
export type Statement = Define | Expression;
export type Define = {
    type: 'define';
    id: Identifier;
    location: Location;
    expr: Expression;
    ann: Type | null;
};
// export type Deffect = {
//     type: 'deffect';
//     id: Identifier;
//     constrs: Array<{ id: Identifier; type: Type }>;
// };
// export type Deftype = Defenum | Defstruct;
// export type Defstruct = {
//     type: 'defstruct';
//     id: Identifier;
//     attrs: Array<{ id: Identifier; type: Type }>;
// };
// export type Defenum = {
//     type: 'defenum';
//     id: Identifier;
//     attrs: Array<{ id: Identifier; args: Array<Type> }>;
// };

export type Expression =
    | Literal
    | WithSuffix
    | Lambda
    | Raise
    | Ops
    | If
    | Block
    | Record
    | Handle;

export type Record = {
    type: 'Record';
    // spreads: Array<Expression>;
    id: Identifier;
    location: Location;
    // hmmmmm
    // So, record labels might be coming
    // from different sources
    // but maybe I don't worry about that just yet?
    rows: Array<
        | { type: 'Row'; id: Identifier; value: Expression }
        | { type: 'Spread'; value: Expression }
    >;
};

export type Ops = {
    type: 'ops';
    first: Expression;
    location: Location;
    rest: Array<{ op: string; right: Expression }>;
};
export type Block = {
    type: 'block';
    items: Array<Statement>;
    location: Location;
};

export type If = {
    type: 'If';
    cond: Expression;
    yes: Block;
    no: Block;
    location: Location;
};

export type Raise = {
    type: 'raise';
    name: Identifier;
    constr: Identifier;
    args: Array<Expression>;
    location: Location;
};
export type Handle = {
    type: 'handle';
    target: Expression;
    location: Location;
    cases: Array<{
        type: 'case';
        location: Location;
        name: Identifier;
        constr: Identifier;
        args: Array<Identifier> | null;
        k: Identifier;
        body: Expression;
    }>;
    pure: {
        arg: Identifier;
        body: Expression;
    };
};
export type TypeVbl = { id: Identifier; subTypes: Array<Identifier> };
export type Lambda = {
    type: 'lambda';
    location: Location;
    typevbls: Array<TypeVbl>;
    effvbls: Array<Identifier>;
    effects: null | Array<Identifier>;
    args: Array<{ id: Identifier; type: Type }>;
    rettype: Type | null;
    body: Expression;
};
export type Type = Identifier | LambdaType;
export type LambdaType = {
    type: 'lambda';
    args: Array<Type>;
    effects: Array<Identifier>;
    effvbls: Array<Identifier>;
    typevbls: Array<TypeVbl>;
    res: Type;
    location: Location;
};

export type Literal = Int | Identifier | String;
// export type IdentifierWithType = {
//     type: 'IdentifierWithType';
//     id: Identifier;
//     vbls: Array<Type>;
// };
export type Identifier = { type: 'id'; text: string; location: Location };
export type Int = { type: 'int'; value: number; location: Location };
export type String = { type: 'string'; text: string; location: Location };
export type WithSuffix = {
    type: 'WithSuffix';
    target: Expression;
    suffixes: Array<ApplySuffix | AttributeSuffix>;
    location: { start: Loc; end: Loc };
};
export type ApplySuffix = {
    type: 'Apply';
    args: Array<Expression>;
    typevbls: Array<Identifier>;
    effectVbls: Array<Identifier>;
};
export type AttributeSuffix = {
    type: 'Attribute';
    id: Identifier;
    location: Location;
};

export default (raw: string): Array<Toplevel> => parse(raw);