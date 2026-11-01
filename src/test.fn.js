import t, { is, ok, throws } from 'tst'
import { o, memo, effect, batch, untracked } from './fn.js'

// value
t('signal: readme', async t => {
  let log = []
  let v1 = o(0)
  is(v1(), 0)

  // subscribe
  let unsub = effect(() => log.push(v1()))

  // set
  v1(1)
  is(v1(), 1)
  // is(log, [0, '-', 1])
  unsub()

  // from value
  let v2 = memo(() => v1 * 2)
  log = []
  effect(() => log.push(v2()))
  is(log, [2])
  is(v2(), 2) // > 2
  is(v2.peek(), 2)
  is(v1(), 1)
  is(log, [2])

  console.log('v1(2)')
  v1(2)
  is(log, [2, 4])

  // ignore unchanged
  v1(2)
  is(log, [2, 4])

  // initialize value
  let v3 = o(v1)
  is(v3(), v1) // v5

  // dispose
  // v2.dispose()
  // ;[v3, v2, v1].map(v => v[Symbol.dispose]())
})

t('signal: callstack trouble', t => {
  let v1 = o(0)
  let v2 = memo(() => { console.log('v2.compute'); return v1() })
  effect(() => { console.log('v2.subscribed'), v2() })
  console.log('---- v1(1)')
  v1(1)
})

t('signal: core API', t => {
  // warmup
  let v1 = o(0)
  let v2 = memo(() => v1 * 2)
  effect(() => (v2()))
  v1(2)

  console.log('---start')
  let s = o(0)
  let log = []
  effect(value => log.push(s()))

  is(log, [0], 'should publish the initial state')

  is(+s, 0, 'toPrimitive')
  is(s.valueOf(), 0, 'valueOf')
  is(String(s.toString()), '0', 'toString')
  is(s(), 0, 's()')


  s(1)
  is(+s, 1, 'state.current = value')

  s(2)
  is(+s, 2, 'state(value)')
  is(s(), 2, 'state(value)')

  s(s() + 1)
  is(s(), 3, 'state(state + value)')

  // observer 2
  let log2 = []
  effect(() => log2.push(s()))

  is(log.slice(-1), [3], 'should track and notify first tick changes')
  is(log2, [3], 'should properly init set')
  s(4)
  is(log.slice(-1), [4], 'arbitrary change 1')
  s(5)
  is(log.slice(-1), [5], 'arbitrary change 2')
  is(log2.slice(-1), [5], 'secondary observer is fine')
})

t.skip('signal: should not expose technical/array symbols', async t => {
  let s = o({ x: 1 })
  let log = []
  is(s.map, undefined)
  for (let p in s) { log.push(p) }
  is(log, [])
})

t('signal: multiple subscriptions should not inter-trigger', async t => {
  let value = o(0)
  let log1 = [], log2 = [], log3 = []
  effect(v => log1.push(value()))
  effect(v => log2.push(value()))
  is(log1, [0])
  is(log2, [0])
  value(1)
  is(log1, [0, 1])
  is(log2, [0, 1])
  effect(v => log3.push(value()))
  is(log1, [0, 1])
  is(log2, [0, 1])
  is(log3, [1])
  value(2)
  is(log1, [0, 1, 2])
  is(log2, [0, 1, 2])
  is(log3, [1, 2])
})

t('signal: stores arrays', async t => {
  let a = o([])
  is(a(), [])
  a([1])
  is(a(), [1])
  a([1, 2])
  is(a(), [1, 2])
  a([])
  is(a(), [])

  let b = o(0)
  a = o([b])
  is(a(), [b])
  b(1)
  is(a(), [b])
  a([b()])
  is(a(), [1])
})

t('signal: stringify', async t => {
  let v1 = o(1), v2 = o({ x: 1 }), v3 = o([1, 2, 3])
  is(JSON.stringify(v1), '1')
  is(JSON.stringify(v2), `{"x":1}`)
  is(JSON.stringify(v3), '[1,2,3]')
})

t('signal: subscribe value', async t => {
  let v1 = o(1), log = []
  effect(v => log.push(v1()))
  is(log, [1])
  v1(2)
  is(log, [1, 2])
})

t('signal: internal effects', async t => {
  const s1 = o(1), s2 = o(2)
  let log1 = [], log2 = []

  effect(() => {
    log1.push(s1())
    return effect(() => {
      log2.push(s2())
    })
  })

  is(log1, [1]), is(log2, [2])
  s1(s1() + 1)
  is(log1, [1, 2]), is(log2, [2, 2])
  s1(s1() + 1)
  is(log1, [1, 2, 3]), is(log2, [2, 2, 2])

  s2(s2() + 1)
  is(log1, [1, 2, 3]), is(log2, [2, 2, 2, 3])
})

// error
t.todo('signal: error in mapper', async t => {
  // NOTE: actually mb useful to have blocking error in mapper
  let x = o(1)
  let y = x.map(x => { throw Error('123') })
  t.ok(y.error)
})
t.todo('signal: error in subscription', async t => {
  let x = o(1)
  x.subscribe(() => { throw new Error('x') })
})
t.todo('signal: error in init', async t => {
  let x = o(() => { throw Error(123) })
})
t.todo('signal: error in set', async t => {
  let x = o(1)
  x(x => { throw Error(123) })
})

// effect
t('effect: single', t => {
  // NOTE: we don't init from anything. Use strui/from
  let log = [], v1 = o(1)
  effect(() => log.push(v1()))
  is(log, [1])
  v1(2)
  is(log, [1, 2])
})

t('effect: teardown', t => {
  const a = o(0)
  const log = []
  let dispose = effect(() => {
    log.push('in', a())
    const val = a()
    return () => log.push('out', val)
  })
  // is(log, [])
  // a(0)
  is(log, ['in', 0])
  a(1)
  is(log, ['in', 0, 'out', 0, 'in', 1])
  dispose()
  is(log, ['in', 0, 'out', 0, 'in', 1, 'out', 1])
})


// computed
t('computed: single', t => {
  let v1 = o(1), v2 = memo(() => v1())
  is(v2(), 1)
  v1(2)
  is(v2(), 2)
})

t('computed: multiple', t => {
  let v1 = o(1), v2 = o(1), v3 = memo(() => v1() + v2())
  is(v3(), 2)
  v1(2)
  is(v3(), 3)
  v2(2)
  is(v3(), 4)
})

t('computed: chain', t => {
  let a = o(1),
    b = memo(() => (console.log('b'), a() + 1)),
    c = memo(() => (console.log('c'), b() + 1))

  is(c(), 3)
  a(2)
  is(c(), 4)
  a(3)
  is(c(), 5)
})

// ---------------------------------------------------------------------------
// value / coercion
// ---------------------------------------------------------------------------

t('signal: peek', t => {
  let s = o(1), log = []
  is(s.peek(), 1, 'peek returns the value')

  // peek must not subscribe
  effect(() => log.push(s.peek()))
  s(2)
  is(log, [1], 'peek does not create a dependency')
  is(s.peek(), 2, 'peek is always fresh')
})

t('signal: nothing special about falsy/NaN values', t => {
  let s = o(NaN), log = []
  effect(() => log.push(s()))

  s(NaN)
  is(log.length, 1, 're-setting NaN is not a change')

  s(0)
  is(log.length, 2, 'NaN -> 0 is a change')
  ok(Object.is(log[0], NaN), 'NaN is published as is')
  is(log[1], 0)

  // falsy values are values too
  let f = o(false), seen = []
  effect(() => seen.push(f()))
  f(false)
  is(seen.length, 1, 'false -> false is not a change')
  f(undefined)
  is(seen, [false, undefined], 'false -> undefined is a change')
})

t('signal: truthiness helpers', async t => {
  let s = o(5)
  is(JSON.stringify(s), '5', 'JSON.stringify')
  is(+s, 5, 'unary plus')
  is(`${s}`, '5', 'template literal')
  is(s.then(), 5, 'then() without a resolver returns the value')
  is(await s, 5, 'await signal')
  is(s(1), undefined, 'the setter returns nothing')
})

// ---------------------------------------------------------------------------
// batch
// ---------------------------------------------------------------------------

t('batch: defers effects to the end of the batch', t => {
  let a = o(0), b = o(0)
  let mul = memo(() => a() * b())
  let log = []
  effect(() => log.push(mul()))

  batch(() => {
    a(2)
    b(3)
    is(log, [0], 'nothing runs while the batch is open')
  })

  is(log, [0, 6], 'effect runs once with the final values')
  is(mul(), 6)
})

t('batch: returns the callback result', t => {
  let a = o(0)
  effect(() => a())
  is(batch(() => 42), 42, 'top level')
  is(batch(() => batch(() => 7)), 7, 'nested')
  is(batch(() => { a(1) }), undefined, 'implicit undefined')
})

t('batch: no writes, no runs', t => {
  let a = o(0), runs = 0
  effect(() => { a(); runs++ })
  is(runs, 1)

  batch(() => { a(0) })
  is(runs, 1, 'unchanged value does not notify')

  batch(() => {})
  is(runs, 1, 'empty batch does nothing')
})

t('batch: nested batches flush once, at the outer end', t => {
  let a = o(0), c = o(0), log = []
  effect(() => log.push('a' + a()))
  effect(() => log.push('c' + c()))

  batch(() => {
    a(1)
    batch(() => { c(1) })
    is(log, ['a0', 'c0'], 'inner batch does not flush')
    log.push('inner done')
  })

  is(log, ['a0', 'c0', 'inner done', 'a1', 'c1'])
})

t('batch: an effect queued during the flush runs once', t => {
  let a = o(0), b = o(0), c = o(0), log = []
  effect(() => { log.push('E' + a()); c(a()) })
  effect(() => log.push('F' + c() + b()))

  batch(() => { a(1); b(1) })

  is(log, ['E0', 'F00', 'E1', 'F11'], 'F must not run twice')
})

t('batch: still flushes when the callback throws', t => {
  let a = o(0), log = []
  effect(() => log.push(a()))

  throws(() => batch(() => { a(1); throw Error('boom') }), /boom/)

  is(log, [0, 1], 'effects run before the error surfaces')
  is(a(), 1, 'the write is kept')
})

t('batch: an effect error does not wedge batching', t => {
  let a = o(0), log = []
  effect(() => {
    if (a() === 1) throw Error('explode')
    log.push(a())
  })

  throws(() => batch(() => { a(1) }), /explode/)

  a(2)
  is(log, [0, 2], 'later updates are still delivered')
  is(batch(() => 'ok'), 'ok', 'batching is still usable')
})

t('batch: runaway effect loops fail instead of hanging', t => {
  let a = o(0), b = o(0), on = o(false)
  effect(() => { let v = a(); on.peek() && b(v + 1) })
  effect(() => { let v = b(); on.peek() && a(v + 1) })
  on(true)

  throws(() => batch(() => { a(1) }), /depth/, 'bounded')
  is(batch(() => 'alive'), 'alive', 'batching recovers')
})

// ---------------------------------------------------------------------------
// untracked
// ---------------------------------------------------------------------------

t('untracked: reads are not subscribed', t => {
  let a = o(1), b = o(1), log = []
  effect(() => log.push([a(), untracked(() => b())]))

  is(log, [[1, 1]])
  b(2)
  is(log, [[1, 1]], 'b is untracked')
  a(2)
  is(log, [[1, 1], [2, 2]], 'a is tracked')
})

t('untracked: return value, nesting and error safety', t => {
  let a = o(1), b = o(1)
  is(untracked(() => 42), 42, 'returns the value')
  is(untracked(() => untracked(() => b())), 1, 'nesting is fine')

  // a throw inside untracked must not disable tracking afterwards
  let log = []
  effect(() => {
    log.push(a())
    try { untracked(() => { throw Error('x') }) } catch {}
    b() // still tracked
  })

  is(log, [1])
  b(2)
  is(log, [1, 1], 'effect still tracks b after the throw')
  a(3)
  is(log, [1, 1, 3])
})

t('untracked: memo does not depend on untracked reads', t => {
  let a = o(1), b = o(10)
  let runs = 0
  let c = memo(() => { runs++; return a() + untracked(() => b()) })

  is(c(), 11)
  is(runs, 1)
  b(20)
  is(c(), 11, 'b is not a dependency')
  is(runs, 1, 'no recompute')
  a(2)
  is(c(), 22, 'recompute picks up the fresh b')
  is(runs, 2)
})

// ---------------------------------------------------------------------------
// effects: nesting, dispose
// ---------------------------------------------------------------------------

t('effect: dispose is idempotent', t => {
  let a = o(0), log = []
  let off = effect(() => {
    let v = a()
    log.push(v)
    return () => log.push('teardown' + v)
  })

  off()
  off()
  is(log, [0, 'teardown0'], 'teardown runs once')

  a(1)
  is(log, [0, 'teardown0'], 'disposed effect is silent')
})

t('effect: dispose inside a batch does not resurrect the effect', t => {
  let a = o(0), log = []
  let off = effect(() => log.push(a()))

  batch(() => {
    a(1)      // effect is queued
    off()     // ... and disposed before the flush
  })

  is(log, [0], 'nothing runs after dispose')
  a(2)
  is(log, [0], 'stays disposed')
})

t('effect: nested effect returned as teardown', t => {
  let a = o(0), b = o(0), log = []
  let off = effect(() => {
    log.push('outer' + a())
    return effect(() => log.push('inner' + b()))
  })

  is(log, ['outer0', 'inner0'], 'nested effect runs immediately')

  a(1)
  is(log, ['outer0', 'inner0', 'outer1', 'inner0'], 'fresh inner effect, the old one is disposed')

  b(1)
  is(log, ['outer0', 'inner0', 'outer1', 'inner0', 'inner1'], 'only the fresh inner reacts')

  off()
  b(2)
  is(log.length, 5, 'everything is gone')
})

t('effect: a throwing body does not wedge updates', t => {
  let a = o(0), log = []
  throws(() => effect(() => {
    if (a() === 0) throw Error('first run')
    log.push(a())
  }), /first run/)

  a(1)
  is(log, [1], 'the effect is still subscribed and current is restored')
})

t('effect: without dependencies it only runs once', t => {
  let runs = 0
  effect(() => runs++)
  is(runs, 1)
})

t('effect: nested effect does not leak into the parent deps', t => {
  let a = o(0), b = o(0), outer = [], inner = []
  effect(() => {
    outer.push(a())
    effect(() => inner.push(b()))
  })

  is(outer, [0])
  is(inner, [0])

  b(1)
  is(outer, [0], 'parent does not track child deps')
  is(inner, [0, 1], 'child is fine')

  a(1)
  is(outer, [0, 1])
  is(inner, [0, 1, 1], 'child re-created, old instance still alive')
})

// ---------------------------------------------------------------------------
// memo
// ---------------------------------------------------------------------------

t('computed: lazy and cached', t => {
  let runs = 0, a = o(1)
  let b = memo(() => (runs++, a() * 2))

  is(runs, 0, 'not evaluated until read')
  is(b(), 2)
  is(runs, 1)
  is(b(), 2)
  is(runs, 1, 'cached')
  is(b.peek(), 2)
  is(runs, 1, 'peek does not recompute')

  a(2)
  is(b(), 4)
  is(runs, 2)
})

t('computed: peek initializes without subscribing', t => {
  let a = o(1), log = []
  let b = memo(() => a() + 1)

  is(b.peek(), 2, 'peek initializes the memo')

  effect(() => log.push(b.peek()))
  a(2)
  is(log, [2], 'peek never subscribes')
  is(b.peek(), 3)
  is(b(), 3)
})

t('computed: no recompute without a change', t => {
  let runs = 0, a = o(1)
  let b = memo(() => (runs++, a()))

  is(b(), 1)
  is(runs, 1)
  a(1)
  is(b(), 1)
  is(runs, 1, 'same value does not recompute')
})

t('computed: diamond dependencies', t => {
  let a = o(1)
  let b = memo(() => a() + 1)
  let c = memo(() => a() * 2)
  let d = memo(() => b() + c())

  is(d(), 4) // (1+1) + (1*2)

  let log = []
  effect(() => log.push(d()))

  a(2)
  // NB: a diamond read inside an effect can be observed twice, the 5 is the
  // intermediate state (b updated, c not yet). The final value is what counts.
  is(log, [4, 5, 7])
  is(log.at(-1), 7, 'final value') // (2+1) + (2*2)
  is(d(), 7)
})

t('computed: circular dependency is detected', t => {
  let base = o(1)
  let c = memo(() => c() + base())

  throws(() => c(), /circular/, 'self reference')
  throws(() => c(), /circular/, 'still detected, no stack overflow')

  let x, y
  x = memo(() => y() + 1)
  y = memo(() => x() + 1)
  throws(() => x(), /circular/, 'mutual reference')
})

t('computed: a throwing fn keeps the memo usable', t => {
  let fail = o(false), runs = 0
  let c = memo(() => {
    runs++
    if (fail()) throw Error('nope')
    return 1
  })

  is(c(), 1)
  is(runs, 1)

  throws(() => { fail(true) }, /nope/, 'the error surfaces to the writer')

  fail(false)
  is(c(), 1, 'still usable after the error')
  is(runs, 3, 'it recomputes again')
})

// ---------------------------------------------------------------------------
// mixed
// ---------------------------------------------------------------------------

t('mixed: batch + memo + untracked + effect', t => {
  let a = o(1), b = o(1)
  let product = memo(() => a() * b())
  let log = []

  effect(() => log.push(product() + untracked(() => a())))

  is(log, [2], '1*1 + 1')
  batch(() => { a(2); b(2) })
  is(log, [2, 6], 'one run per batch: 4 + 2')
})

t('mixed: batch inside an effect', t => {
  let a = o(0), b = o(0), log = []
  effect(() => log.push('a' + a()))
  effect(() => { batch(() => { b(a() * 10) }) })
  effect(() => log.push('b' + b()))

  is(log, ['a0', 'b0'])
  a(1)
  is(log, ['a0', 'b0', 'a1', 'b10'])
})

t('mixed: nested effects, memo and untracked', t => {
  let a = o(1), b = o(2), log = []
  let sum = memo(() => a() + b())
  let off = effect(() => {
    log.push('sum' + sum())
    let innerOff = effect(() => log.push('untracked b' + untracked(() => b())))
    return innerOff
  })

  is(log, ['sum3', 'untracked b2'])
  b(3)
  is(log, ['sum3', 'untracked b2', 'sum4', 'untracked b3'], 'memo tracked, b untracked')
  off()
  a(2)
  is(log.length, 4, 'all disposed')
})

t('mixed: effect created inside a batch runs immediately', t => {
  let a = o(0), log = []
  batch(() => {
    effect(() => log.push(a()))
    log.push('in batch')
  })
  is(log, [0, 'in batch'], 'only pending writes are deferred')
  a(1)
  is(log, [0, 'in batch', 1])
})

t('mixed: untracked writes still notify', t => {
  let a = o(0), log = []
  effect(() => log.push(a()))
  untracked(() => { a(1) })
  is(log, [0, 1], 'untracked only disables reads')
})
