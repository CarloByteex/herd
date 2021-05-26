import { handleSimpleShallow2Multi3, handleSimpleShallow2Multi2, handleSimpleShallow2Multi, raise, handleSimpleShallow2, assertCall, assert, assertEqual, pureCPS, log, isSquare, texture, intToString, intToFloat, floatToString, floatToInt, pow, round, TAU, PI, sqrt, abs, max, min, floor, ceil, mod, modInt, sin, ln, cos, tan, asin, acos, atan, atan2, concat, len, intEq, floatEq, stringEq } from "./prelude.mjs";
import { Handlers } from "./prelude.mjs";
type handle35f4b478 = [(arg_0: string, arg_1: (arg_0: handle35f4b478) => void) => void];
type handle22024b72 = [(arg_0: (arg_0: handle22024b72, arg_1: string) => void) => void];
type handle1da337a2 = [(arg_0: (arg_0: handle1da337a2, arg_1: string) => void) => void, (arg_0: string, arg_1: (arg_0: handle1da337a2) => void) => void];

/**
```
type Eq#553b4b8e<T#:0> = {
    "==": (T#:0, T#:0) ={}> bool,
}
```
*/
type t_553b4b8e<T_0> = {
  type: "553b4b8e";
  h553b4b8e_0: (arg_0: T_0, arg_1: T_0) => boolean;
};

/**
```
const log#eccbfbca: (string) ={Log#35f4b478}> void = (k#:0: string) ={Log#35f4b478}> raise!(
    Log#35f4b478.log(k#:0),
)
```
*/
export const hash_eccbfbca:
/*from cps lambda*/
(arg_0: string, arg_1: Handlers, arg_2: (arg_0: Handlers) => void) => void = (k: string, handlers: Handlers, done: (arg_0: Handlers) => void) => {
  raise(handlers, "35f4b478", 0, k, (handlers, value) => done(handlers, value));
};

/**
```
const farther#dd523212: (string) ={Stdio#1da337a2, Log#35f4b478}> string = (name#:0: string) ={
    Stdio#1da337a2,
    Log#35f4b478,
}> {
    log#eccbfbca(("yes please " ++ name#:0));
    raise!(Stdio#1da337a2.read());
}
```
*/
export const hash_dd523212:
/*from cps lambda*/
(arg_0: string, arg_1: Handlers, arg_2: (arg_0: Handlers, arg_1: string) => void) => void = (name: string, handlers: Handlers, done: (arg_0: Handlers, arg_1: string) => void) => {
  hash_eccbfbca("yes please " + name, handlers, (handlers: Handlers) => raise(handlers, "1da337a2", 0, null, (handlers, value) => done(handlers, value)));
};

/**
```
const inner#19effbea: (string) ={Stdio#1da337a2, Log#35f4b478}> void = (name#:0: string) ={
    Stdio#1da337a2,
    Log#35f4b478,
}> {
    log#eccbfbca((farther#dd523212("Folks") ++ " from farther"));
    log#eccbfbca("getting");
    log#eccbfbca(name#:0);
    log#eccbfbca(((raise!(Stdio#1da337a2.read()) ++ " and ") ++ raise!(Stdio#1da337a2.read())));
    log#eccbfbca(("And then " ++ raise!(Stdio#1da337a2.read())));
    log#eccbfbca("Dones");
}
```
*/
export const hash_19effbea:
/*from cps lambda*/
(arg_0: string, arg_1: Handlers, arg_2: (arg_0: Handlers) => void) => void = (name: string, handlers: Handlers, done$9: (arg_0: Handlers) => void) => {
  hash_dd523212("Folks", handlers, (handlers: Handlers, returnValue: string) => hash_eccbfbca(returnValue + " from farther", handlers, (handlers: Handlers) => hash_eccbfbca("getting", handlers, (handlers: Handlers) => hash_eccbfbca(name, handlers, (handlers: Handlers) => raise(handlers, "1da337a2", 0, null, (handlers, value) => ((handlers: Handlers, arg_lift_0: string) => raise(handlers, "1da337a2", 0, null, (handlers, value) => ((handlers: Handlers, arg_lift_1: string) => hash_eccbfbca(arg_lift_0 + " and " + arg_lift_1, handlers, (handlers: Handlers) => raise(handlers, "1da337a2", 0, null, (handlers, value) => ((handlers: Handlers, arg_lift_1$8: string) => hash_eccbfbca("And then " + arg_lift_1$8, handlers, (handlers: Handlers) => hash_eccbfbca("Dones", handlers, (handlers: Handlers) => done$9(handlers))))(handlers, value))))(handlers, value)))(handlers, value))))));
};

/**
```
const respondWith#59070068: (string) ={}> <T#:0>{e#:0}(() ={Stdio#1da337a2, e#:0}> T#:0) ={
    Log#35f4b478,
    e#:0,
}> T#:0 = (responseValue#:0: string) ={}> <T#:0>{e#:0}(fn#:1: () ={Stdio#1da337a2, e#:0}> T#:0) ={
    Log#35f4b478,
    e#:0,
}> {
    handle! fn#:1 {
        Stdio.read#0(() => k#:3) => 59070068((responseValue#:0 ++ "."))<T#:0>{e#:0}(
            () ={Stdio#1da337a2, e#:0}> k#:3(responseValue#:0),
        ),
        Stdio.write#1((v#:4) => k#:5) => {
            log#eccbfbca(v#:4);
            59070068((responseValue#:0 ++ "-"))<T#:0>{e#:0}(() ={Stdio#1da337a2, e#:0}> k#:5());
        },
        pure(a#:2) => a#:2,
    };
}
```
*/
export const hash_59070068: (arg_0: string) =>
/*from cps lambda*/
<T_0>(arg_0:
/*from cps lambda*/
(arg_0: Handlers, arg_1: (arg_0: Handlers, arg_1: T_0) => void) => void, arg_1: Handlers, arg_2: (arg_0: Handlers, arg_1: T_0) => void) => void = (responseValue: string) => <T_0>(fn:
/*from cps lambda*/
(arg_0: Handlers, arg_1: (arg_0: Handlers, arg_1: T_0) => void) => void, handlers: Handlers, done$6: (arg_0: Handlers, arg_1: T_0) => void) => {
  handleSimpleShallow2<any, any, any>("1da337a2", fn, [(handlers, _, k$3:
  /*from cps lambda*/
  (arg_0: string, arg_1: Handlers, arg_2: (arg_0: Handlers, arg_1: T_0) => void) => void) => {
    hash_59070068(responseValue + ".")((handlers: Handlers, done$8: (arg_0: Handlers, arg_1: T_0) => void) => {
      k$3(responseValue, handlers, (handlers: Handlers, returnValue$10: T_0) => done$8(handlers, returnValue$10));
    }, handlers, (handlers: Handlers, returnValue$11: T_0) => done$6(handlers, returnValue$11));
  }, (handlers, v$4: string, k$5:
  /*from cps lambda*/
  (arg_0: Handlers, arg_1: (arg_0: Handlers, arg_1: T_0) => void) => void) => {
    hash_eccbfbca(v$4, handlers, (handlers: Handlers) => hash_59070068(responseValue + "-")((handlers: Handlers, done$13: (arg_0: Handlers, arg_1: T_0) => void) => {
      k$5(handlers, (handlers: Handlers, returnValue$15: T_0) => done$13(handlers, returnValue$15));
    }, handlers, (handlers: Handlers, returnValue$16: T_0) => done$6(handlers, returnValue$16)));
  }], (handlers: Handlers, a$2: T_0) => {
    done$6(handlers, a$2);
  }, handlers);
};

/**
```
const collect#2ce3943a: {e#:0}(() ={Log#35f4b478, e#:0}> void) ={e#:0}> string = {e#:0}(
    fn#:0: () ={Log#35f4b478, e#:0}> void,
) ={e#:0}> {
    handle! fn#:0 {
        Log.log#0((v#:2) => k#:3) => {
            ((v#:2 ++ "\n") ++ 2ce3943a{e#:0}(() ={Log#35f4b478, e#:0}> k#:3()));
        },
        pure(a#:1) => "end",
    };
}
```
*/
export const hash_2ce3943a: any = {
  effectful: (fn$13:
  /*from cps lambda*/
  (arg_0: Handlers, arg_1: (arg_0: Handlers) => void) => void, handlers: Handlers, done$14: (arg_0: Handlers, arg_1: string) => void) => {
    handleSimpleShallow2<any, any, any>("35f4b478", fn$13, [(handlers, v$15: string, k$16:
    /*from cps lambda*/
    (arg_0: Handlers, arg_1: (arg_0: Handlers) => void) => void) => {
      hash_2ce3943a.effectful((handlers: Handlers, done$18: (arg_0: Handlers) => void) => {
        k$16(handlers, (handlers: Handlers) => done$18(handlers));
      }, handlers, (handlers: Handlers, returnValue$19: string) => done$14(handlers, v$15 + "\n" + returnValue$19));
    }], (handlers: Handlers, a$17: void) => {
      done$14(handlers, "end");
    }, handlers);
  },
  direct: (fn$0:
  /*from cps lambda*/
  (arg_0: Handlers, arg_1: (arg_0: Handlers) => void) => void) => {
    let result: string = (null as any);
    handleSimpleShallow2<any, any, any>("35f4b478", fn$0, [(handlers, v$2: string, k$3:
    /*from cps lambda*/
    (arg_0: Handlers, arg_1: (arg_0: Handlers) => void) => void) => {
      result = v$2 + "\n" + hash_2ce3943a.direct((handlers: Handlers, done$6: (arg_0: Handlers) => void) => {
        k$3(handlers, (handlers: Handlers) => done$6(handlers));
      });
    }], (handlers: Handlers, a$1: void) => {
      result = "end";
    });
    return result;
  }
};

/**
```
const appendLog#0ea0eb0a: (() ={Log#35f4b478}> string) ={}> string = (
    fn#:0: () ={Log#35f4b478}> string,
) ={}> {
    handle! fn#:0 {
        Log.log#0((v#:2) => k#:3) => {
            ((v#:2 ++ "\n") ++ 0ea0eb0a(() ={Log#35f4b478}> k#:3()));
        },
        pure(a#:1) => a#:1,
    };
}
```
*/
export const hash_0ea0eb0a: (arg_0:
/*from cps lambda*/
(arg_0: Handlers, arg_1: (arg_0: Handlers, arg_1: string) => void) => void) => string = (fn$0:
/*from cps lambda*/
(arg_0: Handlers, arg_1: (arg_0: Handlers, arg_1: string) => void) => void) => {
  let result$4: string = (null as any);
  handleSimpleShallow2<any, any, any>("35f4b478", fn$0, [(handlers, v$2: string, k$3:
  /*from cps lambda*/
  (arg_0: Handlers, arg_1: (arg_0: Handlers, arg_1: string) => void) => void) => {
    result$4 = v$2 + "\n" + hash_0ea0eb0a((handlers: Handlers, done$5: (arg_0: Handlers, arg_1: string) => void) => {
      k$3(handlers, (handlers: Handlers, returnValue$7: string) => done$5(handlers, returnValue$7));
    });
  }], (handlers: Handlers, a$1: string) => {
    result$4 = a$1;
  });
  return result$4;
};

/**
```
const provide#5c316d50: <T#:0>(string, () ={Read#22024b72}> T#:0) ={}> T#:0 = <T#:0>(
    v#:0: string,
    fn#:1: () ={Read#22024b72}> T#:0,
) ={}> {
    handle! fn#:1 {
        Read.read#0(() => k#:3) => {
            5c316d50<T#:0>((("<" + v#:0) + ">"), () ={Read#22024b72}> k#:3(v#:0));
        },
        pure(a#:2) => a#:2,
    };
}
```
*/
export const hash_5c316d50: <T_0>(arg_0: string, arg_1:
/*from cps lambda*/
(arg_0: Handlers, arg_1: (arg_0: Handlers, arg_1: T_0) => void) => void) => T_0 = <T_0>(v: string, fn:
/*from cps lambda*/
(arg_0: Handlers, arg_1: (arg_0: Handlers, arg_1: T_0) => void) => void) => {
  let result$4: T_0 = (null as any);
  handleSimpleShallow2<any, any, any>("22024b72", fn, [(handlers, _, k$3:
  /*from cps lambda*/
  (arg_0: string, arg_1: Handlers, arg_2: (arg_0: Handlers, arg_1: T_0) => void) => void) => {
    result$4 = hash_5c316d50("<" + v + ">", (handlers: Handlers, done$5: (arg_0: Handlers, arg_1: T_0) => void) => {
      k$3(v, handlers, (handlers: Handlers, returnValue$7: T_0) => done$5(handlers, returnValue$7));
    });
  }], (handlers: Handlers, a$2: T_0) => {
    result$4 = a$2;
  });
  return result$4;
};

/**
```
const collectNew#4465c66a: (() ={Log#35f4b478}> void) ={}> string = (
    fn#:0: () ={Log#35f4b478}> void,
) ={}> {
    handle! fn#:0 {
        Log.log#0((v#:2) => k#:3) => {
            ((v#:2 ++ "\n") ++ 4465c66a(() ={Log#35f4b478}> k#:3()));
        },
        pure(a#:1) => "end",
    };
}
```
*/
export const hash_4465c66a: (arg_0:
/*from cps lambda*/
(arg_0: Handlers, arg_1: (arg_0: Handlers) => void) => void) => string = (fn$0:
/*from cps lambda*/
(arg_0: Handlers, arg_1: (arg_0: Handlers) => void) => void) => {
  let result$4: string = (null as any);
  handleSimpleShallow2<any, any, any>("35f4b478", fn$0, [(handlers, v$2: string, k$3:
  /*from cps lambda*/
  (arg_0: Handlers, arg_1: (arg_0: Handlers) => void) => void) => {
    result$4 = v$2 + "\n" + hash_4465c66a((handlers: Handlers, done$5: (arg_0: Handlers) => void) => {
      k$3(handlers, (handlers: Handlers) => done$5(handlers));
    });
  }], (handlers: Handlers, a$1: void) => {
    result$4 = "end";
  });
  return result$4;
};

/**
```
const StringEq#606c7034: Eq#553b4b8e<string> = Eq#553b4b8e<string>{"=="#553b4b8e#0: stringEq}
```
*/
export const hash_606c7034: t_553b4b8e<string> = ({
  type: "553b4b8e",
  h553b4b8e_0: stringEq
} as t_553b4b8e<string>);

/**
```
const test1#22486482: () ={Log#35f4b478}> void = () ={Log#35f4b478}> {
    respondWith#59070068("<read>")<void>{Log#35f4b478}(
        () ={Stdio#1da337a2, Log#35f4b478}> inner#19effbea("Yes"),
    );
}
```
*/
export const hash_22486482:
/*from cps lambda*/
(arg_0: Handlers, arg_1: (arg_0: Handlers) => void) => void = (handlers: Handlers, done: (arg_0: Handlers) => void) => {
  hash_59070068("<read>")((handlers: Handlers, done$3: (arg_0: Handlers) => void) => {
    hash_19effbea("Yes", handlers, (handlers: Handlers) => done$3(handlers));
  }, handlers, (handlers: Handlers, returnValue$5: T_0) => done(handlers));
};

/*
StringEq#606c7034."=="#553b4b8e#0(
    collectNew#4465c66a(
        () ={Log#35f4b478}> {
            raise!(Log#35f4b478.log("Hello"));
            raise!(Log#35f4b478.log("Folks"));
        },
    ),
    "Hello\nFolks\nend",
)
*/
assertCall(hash_606c7034.h553b4b8e_0, hash_4465c66a((handlers: Handlers, done$6: (arg_0: Handlers) => void) => {
  raise(handlers, "35f4b478", 0, "Hello", (handlers, value) => ((handlers: Handlers) => {
    raise(handlers, "35f4b478", 0, "Folks", (handlers, value) => done$6(handlers, value));
  })(handlers, value));
}), "Hello\nFolks\nend");

/*
StringEq#606c7034."=="#553b4b8e#0(
    provide#5c316d50<string>("Hello", () ={Read#22024b72}> raise!(Read#22024b72.read())),
    "Hello",
)
*/
assertCall(hash_606c7034.h553b4b8e_0, hash_5c316d50("Hello", (handlers: Handlers, done$7: (arg_0: Handlers, arg_1: string) => void) => {
  raise(handlers, "22024b72", 0, null, (handlers, value) => done$7(handlers, value));
}), "Hello");

/*
StringEq#606c7034."=="#553b4b8e#0(
    provide#5c316d50<string>(
        "Hello",
        () ={Read#22024b72}> (raise!(Read#22024b72.read()) + raise!(Read#22024b72.read())),
    ),
    "Hello<Hello>",
)
*/
assertCall(hash_606c7034.h553b4b8e_0, hash_5c316d50("Hello", (handlers: Handlers, done$10: (arg_0: Handlers, arg_1: string) => void) => {
  raise(handlers, "22024b72", 0, null, (handlers, value) => ((handlers: Handlers, arg_lift_0$8: string) => raise(handlers, "22024b72", 0, null, (handlers, value) => ((handlers: Handlers, arg_lift_1$9: string) => done$10(handlers, arg_lift_0$8 + arg_lift_1$9))(handlers, value)))(handlers, value));
}), "Hello<Hello>");

/*
StringEq#606c7034."=="#553b4b8e#0(
    appendLog#0ea0eb0a(
        () ={Log#35f4b478}> {
            raise!(Log#35f4b478.log("Hello"));
            raise!(Log#35f4b478.log("Folks"));
            "Final value";
        },
    ),
    "Hello\nFolks\nFinal value",
)
*/
assertCall(hash_606c7034.h553b4b8e_0, hash_0ea0eb0a((handlers: Handlers, done$11: (arg_0: Handlers, arg_1: string) => void) => {
  raise(handlers, "35f4b478", 0, "Hello", (handlers, value) => ((handlers: Handlers) => {
    raise(handlers, "35f4b478", 0, "Folks", (handlers, value) => ((handlers: Handlers) => {
      done$11(handlers, "Final value");
    })(handlers, value));
  })(handlers, value));
}), "Hello\nFolks\nFinal value");

/*
StringEq#606c7034."=="#553b4b8e#0(
    collect#2ce3943a{}(() ={Log#35f4b478}> raise!(Log#35f4b478.log("Good news"))),
    "Good news\nend",
)
*/
assertCall(hash_606c7034.h553b4b8e_0, hash_2ce3943a.direct((handlers: Handlers, done$12: (arg_0: Handlers) => void) => {
  raise(handlers, "35f4b478", 0, "Good news", (handlers, value) => done$12(handlers, value));
}), "Good news\nend");

/*
StringEq#606c7034."=="#553b4b8e#0(
    provide#5c316d50<string>(
        "Folks",
        () ={Read#22024b72}> collect#2ce3943a{Read#22024b72}(
            () ={Read#22024b72, Log#35f4b478}> raise!(
                Log#35f4b478.log(("Good news " + raise!(Read#22024b72.read()))),
            ),
        ),
    ),
    "Good news Folks\nend",
)
*/
assertCall(hash_606c7034.h553b4b8e_0, hash_5c316d50("Folks", (handlers: Handlers, done$15: (arg_0: Handlers, arg_1: string) => void) => {
  hash_2ce3943a.effectful((handlers: Handlers, done$17: (arg_0: Handlers) => void) => {
    raise(handlers, "22024b72", 0, null, (handlers, value) => ((handlers: Handlers, arg_lift_1$14: string) => raise(handlers, "35f4b478", 0, "Good news " + arg_lift_1$14, (handlers, value) => done$17(handlers, value)))(handlers, value));
  }, handlers, (handlers: Handlers, returnValue$18: string) => done$15(handlers, returnValue$18));
}), "Good news Folks\nend");

/*
StringEq#606c7034."=="#553b4b8e#0(
    collect#2ce3943a{}(test1#22486482),
    "yes please Folks\n<read> from farther\ngetting\nYes\n<read>. and <read>..\nAnd then <read>...\nDones\nend",
)
*/
assertCall(hash_606c7034.h553b4b8e_0, hash_2ce3943a.direct(hash_22486482), "yes please Folks\n<read> from farther\ngetting\nYes\n<read>. and <read>..\nAnd then <read>...\nDones\nend");