import t, { is, ok, throws } from 'tst'
import { signal, computed, effect, batch, untracked } from './index.js'

// value
t('signal: readme', async t => {
  let log = []
  let v1 = signal(0)
  is(v1.value, 0)

  // subscribe
  let unsub = effect(() => log.push(v1.value))

  // set
  v1.value = 1
  is(v1.value, 1)
  // is(log, [0, '-', 1])
  unsub()

  // from value
  let v2 = computed(() => v1 * 2)
  log = []
  effect(() => log.push(v2.value))
  is(log, [2])
  is(v2.value, 2) // > 2
  is(v2.peek(), 2)
  is(v1.value, 1)
  is(log, [2])

  console.log('v1.value = 2')
  v1.value = 2
  is(log, [2, 4])

  // ignore unchanged
  v1.value = 2
  is(log, [2, 4])

  // initialize value
  let v3 = signal(v1)
  is(v3.value, v1) // v5

  // dispose
  // v2.dispose()
  // ;[v3, v2, v1].map(v => v[Symbol.dispose]())
})

t('signal: callstack trouble', t => {
  let v1 = signal(0)
  let v2 = computed(() => { console.log('v2.compute'); return v1.value })
  effect(() => { console.log('v2.subscribed'), v2.value })
  console.log('---- v1.value = 1')
  v1.value = 1
})

t('signal: core API', t => {
  // warmup
  let v1 = signal(0)
  let v2 = computed(() => v1 * 2)
  effect(() => (v2.value))
  v1.value = 2

  console.log('---start')
  let s = signal(0)
  let log = []
  effect(value => log.push(s.value))

  is(log, [0], 'should publish the initial state')

  is(+s, 0, 'toPrimitive')
  is(s.valueOf(), 0, 'valueOf')
  is(String(s.toString()), '0', 'toString')
  is(s.value, 0, 's()')


  s.value = 1
  is(+s, 1, 'state.current = value')

  s.value = 2
  is(+s, 2, 'state(value)')
  is(s.value, 2, 'state(value)')

  s.value += 1
  is(s.value, 3, 'state(state + value)')

  // observer 2
  let log2 = []
  effect(() => log2.push(s.value))

  is(log.slice(-1), [3], 'should track and notify first tick changes')
  is(log2, [3], 'should properly init set')
  s.value = 4
  is(log.slice(-1), [4], 'arbitrary change 1')
  s.value = 5
  is(log.slice(-1), [5], 'arbitrary change 2')
  is(log2.slice(-1), [5], 'secondary observer is fine')
})

t.skip('signal: should not expose technical/array symbols', async t => {
  let s = signal({ x: 1 })
  let log = []
  is(s.map, undefined)
  for (let p in s) { log.push(p) }
  is(log, [])
})

t('signal: multiple subscriptions should not inter-trigger', async t => {
  let value = signal(0)
  let log1 = [], log2 = [], log3 = []
  effect(v => log1.push(value.value))
  effect(v => log2.push(value.value))
  is(log1, [0])
  is(log2, [0])
  value.value = 1
  is(log1, [0, 1])
  is(log2, [0, 1])
  effect(v => log3.push(value.value))
  is(log1, [0, 1])
  is(log2, [0, 1])
  is(log3, [1])
  value.value = 2
  is(log1, [0, 1, 2])
  is(log2, [0, 1, 2])
  is(log3, [1, 2])
})

t('signal: stores arrays', async t => {
  let a = signal([])
  is(a.value, [])
  a.value = [1]
  is(a.value, [1])
  a.value = [1, 2]
  is(a.value, [1, 2])
  a.value = []
  is(a.value, [])

  let b = signal(0)
  a = signal([b])
  is(a.value, [b])
  b.value = 1
  is(a.value, [b])
  a.value = [b.value]
  is(a.value, [1])
})

t('signal: stringify', async t => {
  let v1 = signal(1), v2 = signal({ x: 1 }), v3 = signal([1, 2, 3])
  is(JSON.stringify(v1), '1')
  is(JSON.stringify(v2), `{"x":1}`)
  is(JSON.stringify(v3), '[1,2,3]')
})

t('signal: subscribe value', async t => {
  let v1 = signal(1), log = []
  effect(v => log.push(v1.value))
  is(log, [1])
  v1.value = 2
  is(log, [1, 2])
})

t('signal: internal effects', async t => {
  const s1 = signal(1), s2 = signal(2)
  let log1 = [], log2 = []

  effect(() => {
    log1.push(s1.value)
    return effect(() => {
      log2.push(s2.value)
    })
  })

  is(log1, [1]), is(log2, [2])
  s1.value++
  is(log1, [1, 2]), is(log2, [2, 2])
  s1.value++
  is(log1, [1, 2, 3]), is(log2, [2, 2, 2])

  s2.value++
  is(log1, [1, 2, 3]), is(log2, [2, 2, 2, 3])
})

// error
t.todo('signal: error in mapper', async t => {
  // NOTE: actually mb useful to have blocking error in mapper
  let x = signal(1)
  let y = x.map(x => { throw Error('123') })
  t.ok(y.error)
})
t.todo('signal: error in subscription', async t => {
  let x = signal(1)
  x.subscribe(() => { throw new Error('x') })
})
t.todo('signal: error in init', async t => {
  let x = signal(() => { throw Error(123) })
})
t.todo('signal: error in set', async t => {
  let x = signal(1)
  x(x => { throw Error(123) })
})

// effect
t('effect: single', t => {
  // NOTE: we don't init from anything. Use strui/from
  let log = [], v1 = signal(1)
  effect(() => log.push(v1.value))
  is(log, [1])
  v1.value = 2
  is(log, [1, 2])
})

t('effect: teardown', t => {
  const a = signal(0)
  const log = []
  let dispose = effect(() => {
    log.push('in', a.value)
    const val = a.value
    return () => log.push('out', val)
  })
  // is(log, [])
  // a.value = 0
  is(log, ['in', 0])
  a.value = 1
  is(log, ['in', 0, 'out', 0, 'in', 1])
  dispose()
  is(log, ['in', 0, 'out', 0, 'in', 1, 'out', 1])
})


// computed
t('computed: single', t => {
  let v1 = signal(1), v2 = computed(() => v1.value)
  is(v2.value, 1)
  v1.value = 2
  is(v2.value, 2)
})

t('computed: multiple', t => {
  let v1 = signal(1), v2 = signal(1), v3 = computed(() => v1.value + v2.value)
  is(v3.value, 2)
  v1.value = 2
  is(v3.value, 3)
  v2.value = 2
  is(v3.value, 4)
})

t('computed: chain', t => {
  let a = signal(1),
    b = computed(() => (console.log('b'), a.value + 1)),
    c = computed(() => (console.log('c'), b.value + 1))

  is(c.value, 3)
  a.value = 2
  is(c.value, 4)
  a.value = 3
  is(c.value, 5)
})

// ---------------------------------------------------------------------------
// value / coercion
// ---------------------------------------------------------------------------

t('signal: peek', t => {
  let s = signal(1), log = []
  is(s.peek(), 1, 'peek returns the value')

  // peek must not subscribe
  effect(() => log.push(s.peek()))
  s.value = 2
  is(log, [1], 'peek does not create a dependency')
  is(s.peek(), 2, 'peek is always fresh')
})

t('signal: nothing special about falsy/NaN values', t => {
  let s = signal(NaN), log = []
  effect(() => log.push(s.value))

  s.value = NaN
  is(log.length, 1, 're-setting NaN is not a change')

  s.value = 0
  is(log.length, 2, 'NaN -> 0 is a change')
  ok(Object.is(log[0], NaN), 'NaN is published as is')
  is(log[1], 0)

  // undefined
  let u = signal(), seen = []
  effect(() => seen.push(u.value))
  is(u.value, undefined, 'signal() is undefined')
  u.value = undefined
  is(seen.length, 1, 'undefined -> undefined is not a change')
  u.value = 0
  is(seen, [undefined, 0])
})

t('signal: truthiness helpers', async t => {
  let s = signal(5)
  is(JSON.stringify(s), '5', 'JSON.stringify')
  is(+s, 5, 'unary plus')
  is(`${s}`, '5', 'template literal')
  is(s.then(), 5, 'then() without a resolver returns the value')
  is(await s, 5, 'await signal')
})

// ---------------------------------------------------------------------------
// batch
// ---------------------------------------------------------------------------

t('batch: defers effects to the end of the batch', t => {
  let a = signal(0), b = signal(0)
  let mul = computed(() => a.value * b.value)
  let log = []
  effect(() => log.push(mul.value))

  batch(() => {
    a.value = 2
    b.value = 3
    is(log, [0], 'nothing runs while the batch is open')
  })

  is(log, [0, 6], 'effect runs once with the final values')
  is(mul.value, 6)
})

t('batch: returns the callback result', t => {
  let a = signal(0)
  effect(() => a.value)
  is(batch(() => 42), 42, 'top level')
  is(batch(() => batch(() => 7)), 7, 'nested')
  is(batch(() => { a.value = 1 }), undefined, 'implicit undefined')
})

t('batch: no writes, no runs', t => {
  let a = signal(0), runs = 0
  effect(() => { a.value; runs++ })
  is(runs, 1)

  batch(() => { a.value = 0 })
  is(runs, 1, 'unchanged value does not notify')

  batch(() => {})
  is(runs, 1, 'empty batch does nothing')
})

t('batch: nested batches flush once, at the outer end', t => {
  let a = signal(0), c = signal(0), log = []
  effect(() => log.push('a' + a.value))
  effect(() => log.push('c' + c.value))

  batch(() => {
    a.value = 1
    batch(() => { c.value = 1 })
    is(log, ['a0', 'c0'], 'inner batch does not flush')
    log.push('inner done')
  })

  is(log, ['a0', 'c0', 'inner done', 'a1', 'c1'])
})

t('batch: an effect queued during the flush runs once', t => {
  let a = signal(0), b = signal(0), c = signal(0), log = []
  effect(() => { log.push('E' + a.value); c.value = a.value })
  effect(() => log.push('F' + c.value + b.value))

  batch(() => { a.value = 1; b.value = 1 })

  is(log, ['E0', 'F00', 'E1', 'F11'], 'F must not run twice')
})

t('batch: still flushes when the callback throws', t => {
  let a = signal(0), log = []
  effect(() => log.push(a.value))

  throws(() => batch(() => { a.value = 1; throw Error('boom') }), /boom/)

  is(log, [0, 1], 'effects run before the error surfaces')
  is(a.value, 1, 'the write is kept')
})

t('batch: an effect error does not wedge batching', t => {
  let a = signal(0), log = []
  effect(() => {
    if (a.value === 1) throw Error('explode')
    log.push(a.value)
  })

  throws(() => batch(() => { a.value = 1 }), /explode/)

  a.value = 2
  is(log, [0, 2], 'later updates are still delivered')
  is(batch(() => 'ok'), 'ok', 'batching is still usable')
})

t('batch: runaway effect loops fail instead of hanging', t => {
  let a = signal(0), b = signal(0), on = signal(false)
  effect(() => { let v = a.value; on.peek() && (b.value = v + 1) })
  effect(() => { let v = b.value; on.peek() && (a.value = v + 1) })
  on.value = true

  throws(() => batch(() => { a.value = 1 }), /depth/, 'bounded')
  is(batch(() => 'alive'), 'alive', 'batching recovers')
})

// ---------------------------------------------------------------------------
// untracked
// ---------------------------------------------------------------------------

t('untracked: reads are not subscribed', t => {
  let a = signal(1), b = signal(1), log = []
  effect(() => log.push([a.value, untracked(() => b.value)]))

  is(log, [[1, 1]])
  b.value = 2
  is(log, [[1, 1]], 'b is untracked')
  a.value = 2
  is(log, [[1, 1], [2, 2]], 'a is tracked')
})

t('untracked: return value, nesting and error safety', t => {
  let a = signal(1), b = signal(1)
  is(untracked(() => 42), 42, 'returns the value')
  is(untracked(() => untracked(() => b.value)), 1, 'nesting is fine')

  // a throw inside untracked must not disable tracking afterwards
  let log = []
  effect(() => {
    log.push(a.value)
    try { untracked(() => { throw Error('x') }) } catch {}
    b.value // still tracked
  })

  is(log, [1])
  b.value = 2
  is(log, [1, 1], 'effect still tracks b after the throw')
  a.value = 3
  is(log, [1, 1, 3])
})

t('untracked: computed does not depend on untracked reads', t => {
  let a = signal(1), b = signal(10)
  let runs = 0
  let c = computed(() => { runs++; return a.value + untracked(() => b.value) })

  is(c.value, 11)
  is(runs, 1)
  b.value = 20
  is(c.value, 11, 'b is not a dependency')
  is(runs, 1, 'no recompute')
  a.value = 2
  is(c.value, 22, 'recompute picks up the fresh b')
  is(runs, 2)
})

// ---------------------------------------------------------------------------
// effects: nesting, dispose
// ---------------------------------------------------------------------------

t('effect: dispose is idempotent', t => {
  let a = signal(0), log = []
  let off = effect(() => {
    let v = a.value
    log.push(v)
    return () => log.push('teardown' + v)
  })

  off()
  off()
  is(log, [0, 'teardown0'], 'teardown runs once')

  a.value = 1
  is(log, [0, 'teardown0'], 'disposed effect is silent')
})

t('effect: nested effect returned as teardown', t => {
  let a = signal(0), b = signal(0), log = []
  let off = effect(() => {
    log.push('outer' + a.value)
    return effect(() => log.push('inner' + b.value))
  })

  is(log, ['outer0', 'inner0'], 'nested effect runs immediately')

  a.value = 1
  is(log, ['outer0', 'inner0', 'outer1', 'inner0'], 'fresh inner effect, the old one is disposed')

  b.value = 1
  is(log, ['outer0', 'inner0', 'outer1', 'inner0', 'inner1'], 'only the fresh inner reacts')

  off()
  b.value = 2
  is(log.length, 5, 'everything is gone')
})

t('effect: dispose inside a batch does not resurrect the effect', t => {
  let a = signal(0), log = []
  let off = effect(() => log.push(a.value))

  batch(() => {
    a.value = 1 // effect is queued
    off()       // ... and disposed before the flush
  })

  is(log, [0], 'nothing runs after dispose')
  a.value = 2
  is(log, [0], 'stays disposed')
})

t('effect: a throwing body does not wedge updates', t => {
  let a = signal(0), log = []
  throws(() => effect(() => {
    if (a.value === 0) throw Error('first run')
    log.push(a.value)
  }), /first run/)

  a.value = 1
  is(log, [1], 'the effect is still subscribed and current is restored')
})

t('effect: without dependencies it only runs once', t => {
  let runs = 0
  effect(() => runs++)
  is(runs, 1)
})

t('effect: nested effect does not leak into the parent deps', t => {
  let a = signal(0), b = signal(0), outer = [], inner = []
  effect(() => {
    outer.push(a.value)
    effect(() => inner.push(b.value))
  })

  is(outer, [0])
  is(inner, [0])

  b.value = 1
  is(outer, [0], 'parent does not track child deps')
  is(inner, [0, 1], 'child is fine')

  a.value = 1
  is(outer, [0, 1])
  is(inner, [0, 1, 1], 'child re-created, old instance still alive')
})

// ---------------------------------------------------------------------------
// computed
// ---------------------------------------------------------------------------

t('computed: lazy and cached', t => {
  let runs = 0, a = signal(1)
  let b = computed(() => (runs++, a.value * 2))

  is(runs, 0, 'not evaluated until read')
  is(b.value, 2)
  is(runs, 1)
  is(b.value, 2)
  is(runs, 1, 'cached')
  is(b.peek(), 2)
  is(runs, 1, 'peek does not recompute')

  a.value = 2
  is(b.value, 4)
  is(runs, 2)
})

t('computed: peek initializes without subscribing', t => {
  let a = signal(1), log = []
  let b = computed(() => a.value + 1)

  is(b.peek(), 2, 'peek initializes the computed')

  effect(() => log.push(b.peek()))
  a.value = 2
  is(log, [2], 'peek never subscribes')
  is(b.peek(), 3)
  is(b.value, 3)
})

t('computed: no recompute without a change', t => {
  let runs = 0, a = signal(1)
  let b = computed(() => (runs++, a.value))

  is(b.value, 1)
  is(runs, 1)
  a.value = 1
  is(b.value, 1)
  is(runs, 1, 'same value does not recompute')
})

t('computed: diamond dependencies', t => {
  let a = signal(1)
  let b = computed(() => a.value + 1)
  let c = computed(() => a.value * 2)
  let d = computed(() => b.value + c.value)

  is(d.value, 4) // (1+1) + (1*2)

  let log = []
  effect(() => log.push(d.value))

  a.value = 2
  // NB: a diamond read inside an effect can be observed twice, the 5 is the
  // intermediate state (b updated, c not yet). The final value is what counts.
  is(log, [4, 5, 7])
  is(log.at(-1), 7, 'final value') // (2+1) + (2*2)
  is(d.value, 7)
})

t('computed: circular dependency is detected', t => {
  let base = signal(1)
  let c = computed(() => c.value + base.value)

  throws(() => c.value, /circular/, 'self reference')
  throws(() => c.value, /circular/, 'still detected, no stack overflow')

  let x, y
  x = computed(() => y.value + 1)
  y = computed(() => x.value + 1)
  throws(() => x.value, /circular/, 'mutual reference')
})

t('computed: a throwing fn keeps the computed usable', t => {
  let fail = signal(false), runs = 0
  let c = computed(() => {
    runs++
    if (fail.value) throw Error('nope')
    return 1
  })

  is(c.value, 1)
  is(runs, 1)

  throws(() => { fail.value = true }, /nope/, 'the error surfaces to the writer')

  fail.value = false
  is(c.value, 1, 'still usable after the error')
  is(runs, 3, 'it recomputes again')
})

// ---------------------------------------------------------------------------
// mixed
// ---------------------------------------------------------------------------

t('mixed: batch + computed + untracked + effect', t => {
  let a = signal(1), b = signal(1)
  let product = computed(() => a.value * b.value)
  let log = []

  effect(() => log.push(product.value + untracked(() => a.value)))

  is(log, [2], '1*1 + 1')
  batch(() => { a.value = 2; b.value = 2 })
  is(log, [2, 6], 'one run per batch: 4 + 2')
})

t('mixed: batch inside an effect', t => {
  let a = signal(0), b = signal(0), log = []
  effect(() => log.push('a' + a.value))
  effect(() => { batch(() => { b.value = a.value * 10 }) })
  effect(() => log.push('b' + b.value))

  is(log, ['a0', 'b0'])
  a.value = 1
  is(log, ['a0', 'b0', 'a1', 'b10'])
})

t('mixed: nested effects, computed and untracked', t => {
  let a = signal(1), b = signal(2), log = []
  let sum = computed(() => a.value + b.value)
  let off = effect(() => {
    log.push('sum' + sum.value)
    let innerOff = effect(() => log.push('untracked b' + untracked(() => b.value)))
    return innerOff
  })

  is(log, ['sum3', 'untracked b2'])
  b.value = 3
  is(log, ['sum3', 'untracked b2', 'sum4', 'untracked b3'], 'computed tracked, b untracked')
  off()
  a.value = 2
  is(log.length, 4, 'all disposed')
})

t('mixed: effect created inside a batch runs immediately', t => {
  let a = signal(0), log = []
  batch(() => {
    effect(() => log.push(a.value))
    log.push('in batch')
  })
  is(log, [0, 'in batch'], 'only pending writes are deferred')
  a.value = 1
  is(log, [0, 'in batch', 1])
})

t('mixed: untracked writes still notify', t => {
  let a = signal(0), log = []
  effect(() => log.push(a.value))
  untracked(() => { a.value = 1 })
  is(log, [0, 1], 'untracked only disables reads')
})
