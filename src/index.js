let computeFunc;
let o = (value, fn, listeners = new Set()) => {
  fn = (callback) => {
    // get
    if (callback === void 0) {
      if (computeFunc) listeners.add(computeFunc);
      return value;
    }
    // subscribe
    if (callback.call) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }
    // set
    value = callback;
    for (callback of listeners) callback && callback(value);
  };
  fn._o = 1;
  return fn;
};

let effect = (func) => {
  let reactor = o();
  let fn = () => {
    if (fn === computeFunc) throw "1/0";
    let prevVal = computeFunc;
    computeFunc = fn;
    reactor(func());
    computeFunc = prevVal;
  };
  fn();
  return reactor;
};

export { o, effect };