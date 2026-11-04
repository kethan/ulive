import t, { is, ok, throws } from 'tst'
import { o, memo, effect, batch, untracked } from './fn.js'

// This suite describes ulive/tiny/fn, the original 1.x callable flavour. A test marked QUIRK pins
// a defect that `ulive/fn` fixes - it is here so nobody changes tiny by accident.

t('o: call, set and peek', t => {
  let a = o(0)
  is(a(), 0)
  a(10)
  is(a(), 10)
  is(o().peek(), undefined, 'no argument')
  is((a.peek()), 10, 'peek reads without tracking')
})

t('o: the setter returns nothing', t => {
  // QUIRK: `ulive/fn` returns the written value.
  let a = o(0)
  is(a(1), undefined)
})

t('o: coercion', t => {
  let a = o(2)
  is(JSON.stringify(a), '2')
  is(`${a}`, '2')
  is(+a, 2)
  // QUIRK: then() ignores the resolver, so `await o(1)` never resolves.
  is(a.then(v => v), 2)
})

t('o: notifies on change only', t => {
  let a = o(0), runs = 0
  effect(() => { a(); runs++ })
  is(runs, 1)
  a(1)
  is(runs, 2)
  a(1)
  is(runs, 2, 'same value does not notify')

  // QUIRK: `!==` means NaN is a change every time.
  let n = o(NaN), nanRuns = 0
  effect(() => { n(); nanRuns++ })
  n(NaN)
  is(nanRuns, 2)
})

t('o: subscribers receive the written value', t => {
  let a = o(0), seen = []
  effect(() => seen.push(a()))
  a(5)
  is(seen, [0, 5])
})

t('effect: teardown, dispose and its double call', t => {
  let a = o(0), log = []
  let off = effect(() => {
    log.push(a())
    return () => log.push('t' + a())
  })
  is(log, [0])

  a(1)
  is(log, [0, 't1', 1])

  off()
  // QUIRK: the same teardown runs again on every disposer call.
  off()
  is(log, [0, 't1', 1, 't1', 't1'])
})

t('memo: lazy, cached and glitchy', t => {
  let a = o(1), runs = 0
  let m = memo(() => (runs++, a() * 2))
  is(runs, 0, 'nothing runs until it is read')
  is(m(), 2)
  is(runs, 1)
  is(m(), 2)
  is(runs, 1, 'cached')

  a(2)
  is(m(), 4)
  is(runs, 2)
})

t('memo: peek before the first read is undefined', t => {
  // QUIRK: peek is the inner signal's peek. `ulive/fn` initializes on peek.
  let a = o(1)
  let m = memo(() => a() * 2)
  is(m.peek(), undefined)
  is(m(), 2)
  is(m.peek(), 2)
})

t('memo: writing to a memo is ignored', t => {
  let a = o(1)
  let m = memo(() => a() + 1)
  is(m(), 2)
  is(m(99), undefined, 'the setter is a no-op')
  is(m(), 2)
})

t('memo: a diamond is delivered twice', t => {
  // QUIRK: eager memos push through every path, so the join is delivered twice per write.
  let a = o(1)
  let b = memo(() => a() + 1)
  let c = memo(() => a() * 2)
  let d = memo(() => b() + c())
  is(d(), 4)

  let log = []
  effect(() => log.push(d()))
  a(2)
  is(log, [4, 5, 7], 'the 5 is the intermediate state')
})

t('memo: a self-reference overflows the stack', t => {
  // QUIRK: no circular guard. `ulive/fn` throws Error('circular').
  let a = o(1)
  let m = memo(() => m() + a())
  throws(() => m(), /Maximum call stack/)
})

t('memo: a throwing producer surfaces at the writer', t => {
  // QUIRK: the producer runs in an internal effect, so the write throws.
  let fail = o(false)
  let m = memo(() => {
    if (fail()) throw Error('nope')
    return 1
  })
  is(m(), 1)
  throws(() => { fail(true) }, /nope/)
  fail(false)
  is(m(), 1)
})

t('batch: defers effects, discards the result', t => {
  let a = o(0), b = o(0), log = []
  effect(() => log.push(a() + '/' + b()))
  is(log, ['0/0'])

  // QUIRK: the callback's value is dropped. `ulive/fn` returns it.
  is(batch(() => 42), undefined)
  batch(() => { a(1); b(1) })
  is(log, ['0/0', '1/1'])
})

t('batch: flushes when the callback throws', t => {
  let a = o(0), log = []
  effect(() => log.push(a()))
  throws(() => batch(() => { a(1); throw Error('boom') }), /boom/)
  is(log, [0, 1])
})

t('untracked: reads are not subscribed, and a throw leaks tracking', t => {
  let a = o(0), b = o(0), runs = 0
  effect(() => { untracked(() => a()); b(); runs++ })
  is(runs, 1)
  a(1)
  is(runs, 1, 'untracked did not subscribe')
  b(1)
  is(runs, 2)

  // QUIRK: no try/finally, so a throwing body leaves tracking off.
  let c = o(0), leaked = 0
  effect(() => {
    try { untracked(() => { throw Error('x') }) } catch {}
    c()
    leaked++
  })
  is(leaked, 1)
  c(1)
  is(leaked, 1, 'the effect lost its dependency')
})
