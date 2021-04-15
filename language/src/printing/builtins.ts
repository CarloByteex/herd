// IMPORTANT: This must be kept in sync with builtins.ts.txt

// These are the new multi method

export const raiseMulti = (
    handler: HandlerMulti,
    // hash: string,
    idx: number,
    args: any,
    done: (handler: HandlerMulti, result: any) => void,
): void => {
    handler(idx, args, done);
};

type HandlerMulti = ShallowHandlerMulti<any, any>;

type ShallowHandlerMulti<Get, Set> = (
    idx: number,
    args: Set,
    returnIntoFn: (newHandler: HandlerMulti, value: Get) => void,
) => void;

export const handleSimpleShallow2Multi = <Get, Set, R>(
    fn: (
        handler: HandlerMulti,
        cb: (handler: HandlerMulti, fnReturnValue: R) => void,
    ) => void,
    handleEffect: Array<
        (
            value: Set,
            cb: (
                gotten: Get,
                newHandler: HandlerMulti,
                returnIntoHandler: (fnReturnValue: R) => void,
            ) => void,
        ) => void
    >,
    handlePure: (handlers: any, fnReturnValue: R) => void,
) => {
    let fnsReturnPointer = handlePure;
    const thisHandler: HandlerMulti = (idx, args, returnIntoFn) => {
        handleEffect[idx](
            args,
            (handlersValueToSend, newHandler, returnIntoHandler) => {
                if (returnIntoHandler === undefined) {
                    /// @ts-ignore
                    returnIntoHandler = newHandler;
                    /// @ts-ignore
                    newHandler = handlersValueToSend;
                    /// @ts-ignore
                    handlersValueToSend = null;
                }
                fnsReturnPointer = returnIntoHandler;

                returnIntoFn(newHandler, handlersValueToSend);
            },
        );
    };
    fn(thisHandler, (handler, fnsReturnValue) => {
        fnsReturnPointer(handler, fnsReturnValue);
    });
};

export const raise = (
    handlers: Array<Handler>,
    hash: string,
    idx: number,
    args: any,
    done: (handlers: Array<Handler>, result: any) => void,
): void => {
    for (let i = 0; i < handlers.length; i++) {
        if (handlers[i].hash === hash) {
            const otherHandlers = handlers.slice();
            otherHandlers.splice(i, 1);
            handlers[i].fn(otherHandlers, idx, args, done);
            break;
        }
    }
};

type Handler = { hash: string; fn: ShallowHandler<any, any> };

type Handlers = Array<Handler>;

type ShallowHandler<Get, Set> = (
    currentHandlers: Handlers,
    idx: number,
    args: Set,
    returnIntoFn: (newHandler: Handlers, value: Get) => void,
) => void;

export const handleSimpleShallow2 = <Get, Set, R>(
    hash: string,
    fn: (
        handler: Handlers,
        cb: (handlers: Handlers, fnReturnValue: R) => void,
    ) => void,
    handleEffect: Array<
        (
            handlers: Handlers,
            value: Set,
            cb: (
                gotten: Get,
                newHandler: Handlers,
                returnIntoHandler: (fnReturnValue: R) => void,
            ) => void,
        ) => void
    >,
    handlePure: (handlers: any, fnReturnValue: R) => void,
    otherHandlers: any | null,
) => {
    let fnsReturnPointer = handlePure;
    const thisHandler: Handler = {
        hash,
        fn: (currentHandlers, idx, args, returnIntoFn) => {
            handleEffect[idx](
                currentHandlers,
                args,
                (handlersValueToSend, newHandler, returnIntoHandler) => {
                    if (returnIntoHandler === undefined) {
                        /// @ts-ignore
                        returnIntoHandler = newHandler;
                        /// @ts-ignore
                        newHandler = handlersValueToSend;
                        /// @ts-ignore
                        handlersValueToSend = null;
                    }
                    fnsReturnPointer = returnIntoHandler;

                    const keep = currentHandlers.filter(
                        (k) => !newHandler.includes(k),
                    );
                    // OK FOLKS: in some cases, there is something from currentHandlers
                    // that we need to keep. In many cases, there is not.
                    // It seems like I should be able to engineer things such that
                    // I never have to keep any.

                    returnIntoFn(
                        keep.length ? newHandler.concat(keep) : newHandler,
                        handlersValueToSend,
                    );
                },
            );
        },
    };
    fn(
        otherHandlers ? [thisHandler].concat(otherHandlers) : [thisHandler],

        (handlers, fnsReturnValue) => {
            const idx = handlers.indexOf(thisHandler);
            const without = idx === -1 ? handlers : handlers.slice();
            if (idx !== -1) {
                without.splice(idx, 1);
            }
            fnsReturnPointer(without, fnsReturnValue);
        },
    );
};

export const assert = (x: boolean) => {
    if (!x) {
        throw new Error(`Assertion error.`);
    }
    return x;
};

export const assertEqual = <T>(a: T, b: T) => {
    if (a != b) {
        throw new Error(`Assertion error. ${a} should equal ${b}`);
    }
    console.log(`✅ Passed`);
    return true;
};

// When a pure function is used in a place that's expecting CPS.
export const pureCPS = (f: any) => {
    let res;
    f([], (_: any, v: any) => (res = v));
    return res;
};

/**
 * These are annotated with type signatures, and so are accessible
 * as builtins during type checking. The above functions can be used
 * by the compiler, but are not available directly.
 */

//: (string) => void
export const log = console.log;

// Just for the eff paper 🙃
//: (int) => bool
export const isSquare = (x: number) => {
    const m = Math.sqrt(x);
    return Math.floor(m) === m;
};

//: (int) => string
export const intToString = (x: number) => x.toString();
//: (int) => float
export const intToFloat = (x: number) => x;

//: (float) => string
export const floatToString = (x: number) => x.toString();
//: (float) => int
export const floatToInt = Math.floor;

//: (float, float) => float
export const pow = Math.pow;

//: float
export const TAU = Math.PI * 2,
    PI = Math.PI;

//: (float) => float
export const sqrt = Math.sqrt;
//: (float, float) => float
export const max = Math.max,
    min = Math.min;

//: (float) => float
export const sin = Math.sin,
    ln = Math.log,
    cos = Math.cos,
    tan = Math.tan,
    asin = Math.asin,
    acos = Math.acos,
    atan = Math.atan;
//: (float, float) => float
export const atan2 = Math.atan2;
//: <T>(Array<T>, Array<T>) => Array<T>
export const concat = <T>(a: Array<T>, b: Array<T>) => a.concat(b);

//: <T>(Array<T>) => int
export const len = <T>(a: Array<T>) => a.length;

//: (int, int) => bool
export const intEq = (a: number, b: number) => a === b;
//: (float, float) => bool
export const floatEq = (a: number, b: number) => a === b;
//: (string, string) => bool
export const stringEq = (a: number, b: number) => a === b;
