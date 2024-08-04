import t, { is } from 'tst'
import { o, memo, effect } from './fn.js'

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
