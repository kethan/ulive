import t, { is, ok, throws } from 'tst'
import { signal, computed, effect, batch, untracked } from './index.js'

// This suite describes ulive/tiny, which is the original 1.x core: a separate implementation, not a
// subset of `ulive`. A test marked QUIRK pins a known defect that `ulive` fixes - it is here so
// nobody "fixes" tiny by accident and changes its size or its behaviour for existing users.

t('signal: value, read and write', t => {
  let a = signal(0)
  is(a.value, 0)
  a.value = 1
  is(a.value, 1)
  is(signal().value, undefined, 'no argument is undefined')
  is(signal('x').value, 'x', 'strings are fine')
})

t('signal: peek never subscribes', t => {
  let a = signal(1)
  is(a.peek(), 1)

  let runs = 0
  effect(() => { a.peek(); runs++ })
  is(runs, 1)
  a.value = 2
  is(runs, 1, 'peek did not subscribe')
  is(a.peek(), 2, 'peek is always fresh')
})

t('signal: coercion', t => {
  let a = signal(2)
  is(JSON.stringify(a), '2')
  is(`${a}`, '2')
  is(+a, 2)
  // QUIRK: then() ignores the resolver and always answers with the value, so `await` on a signal
  // never resolves. `ulive` resolves it.
  is(a.then(v => v), 2)
})

t('signal: subscribers are notified on change only', t => {
  let a = signal(0), runs = 0
  effect(() => { a.value; runs++ })
  is(runs, 1)
  a.value = 1
  is(runs, 2)
  a.value = 1
  is(runs, 2, 'same value does not notify')

  // QUIRK: the comparison is `===`, so NaN is a change every time. `ulive` uses Object.is.
  let n = signal(NaN), nanRuns = 0
  effect(() => { n.value; nanRuns++ })
  n.value = NaN
  is(nanRuns, 2)
})

t('effect: runs immediately, teardown, dispose', t => {
  let a = signal(0), log = [], off = effect(() => {
    log.push(a.value)
    return () => log.push('t' + a.value)
  })
  is(log, [0])

  a.value = 1
  // the write lands first, then the effect wrapper runs the previous teardown and the next body
  is(log, [0, 't1', 1])

  off()
  is(log, [0, 't1', 1, 't1'])
  a.value = 2
  is(log, [0, 't1', 1, 't1'], 'disposed effects stop running')
})

t('effect: dispose is not idempotent', t => {
  // QUIRK: the disposer calls the teardown again every time it is called. `ulive` disposes once.
  let teardowns = 0
  let off = effect(() => () => teardowns++)
  off()
  off()
  is(teardowns, 2)
})

t('computed: lazy, cached and glitchy', t => {
  let a = signal(1), runs = 0
  let c = computed(() => (runs++, a.value * 2))
  is(runs, 0, 'nothing runs until it is read')

  is(c.value, 2)
  is(runs, 1)
  is(c.value, 2)
  is(runs, 1, 'cached')

  a.value = 2
  is(c.value, 4)
  is(runs, 2)
})

t('computed: peek before the first read is undefined', t => {
  // QUIRK: peek is the inner signal's peek, which has no value until the producer has run.
  // `ulive` initializes on peek.
  let a = signal(1)
  let c = computed(() => a.value * 2)
  is(c.peek(), undefined)
  is(c.value, 2)
  is(c.peek(), 2)
})

t('computed: a diamond is delivered twice', t => {
  // QUIRK: an eager computed pushes through every path, so a join with two dirty inputs is
  // recomputed and delivered once per path - the first delivery is a half-updated graph.
  // `ulive` delivers the settled value once.
  let a = signal(1)
  let b = computed(() => a.value + 1)
  let c = computed(() => a.value * 2)
  let d = computed(() => b.value + c.value)
  is(d.value, 4)

  let log = []
  effect(() => log.push(d.value))
  a.value = 2
  is(log, [4, 5, 7], 'the 5 is the intermediate state')
})

t('computed: a self-reference overflows the stack', t => {
  // QUIRK: no circular guard. `ulive` throws Error('circular').
  let a = signal(1)
  let c = computed(() => c.value + a.value)
  throws(() => c.value, /Maximum call stack/)
})

t('computed: a throwing producer', t => {
  // QUIRK: the error surfaces at the writer (the computed runs in an internal effect), and the
  // computed stays usable afterwards. `ulive` surfaces it at the reader instead.
  let fail = signal(false)
  let c = computed(() => {
    if (fail.value) throw Error('nope')
    return 1
  })
  is(c.value, 1)
  throws(() => { fail.value = true }, /nope/)
  fail.value = false
  is(c.value, 1)
})

t('batch: defers effects to the end', t => {
  let a = signal(0), b = signal(0), log = []
  effect(() => log.push(a.value + '/' + b.value))
  is(log, ['0/0'])

  batch(() => { a.value = 1; b.value = 1 })
  is(log, ['0/0', '1/1'], 'one run for the whole batch')
})

t('batch: no return value, and nested batches stay open', t => {
  let a = signal(0), log = []
  effect(() => log.push(a.value))

  // QUIRK: the callback's result is discarded. `ulive` returns it.
  is(batch(() => 42), undefined)

  batch(() => {
    a.value = 1
    batch(() => { a.value = 2 })
    is(log, [0], 'the inner batch does not flush')
  })
  is(log, [0, 2])
})

t('batch: flushes even when the callback throws', t => {
  let a = signal(0), log = []
  effect(() => log.push(a.value))
  throws(() => batch(() => { a.value = 1; throw Error('boom') }), /boom/)
  is(log, [0, 1], 'the write is kept and delivered')
})

t('untracked: reads are not subscribed', t => {
  let a = signal(0), b = signal(0), runs = 0
  effect(() => { untracked(() => a.value); b.value; runs++ })
  is(runs, 1)

  a.value = 1
  is(runs, 1, 'untracked did not subscribe')
  b.value = 1
  is(runs, 2, 'tracked did')
})

t('untracked: returns the value, but does not restore tracking on throw', t => {
  let a = signal(1)
  is(untracked(() => 42), 42)
  is(untracked(() => a.value), 1, 'the value is returned')

  // QUIRK: there is no try/finally around the body, so a throwing callback leaves tracking off
  // for the rest of the current effect. `ulive` restores it.
  let b = signal(0), runs = 0
  effect(() => {
    try { untracked(() => { throw Error('x') }) } catch {}
    a.value
    runs++
  })
  is(runs, 1)
  a.value = 2
  is(runs, 1, 'the effect lost its dependency')
})
