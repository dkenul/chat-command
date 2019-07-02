const chatCommandFactory = require('../index.js')
const NAMESPACE = 'TEST'
const SHALLOW_ACTIONS = {
  staticOutput: 'staticOutput',
  stringOutput () {
    return 'stringOutput'
  },
  promiseOutput () {
    return Promise.resolve('promiseOutput')
  },
  get getterOutput () {
    return 'getterOutput'
  },
  singleArgumentOutput (arg) {
    return `singleArgumentOutput: ${arg}`
  },
  multiArgumentOutput (arg1, arg2, arg3) {
    return `multiArgumentOutput: ${arg1} - ${arg2} - ${arg3}`
  },
  'dangerous(Parens()Key(notTheArg)' (arg) {
    return `dangerousParensKey ${arg}`
  },
  '..delimiter.colliding..Key.' () {
    return 'delimiterCollidingKey'
  },
}
const ACTIONS = {
  ...SHALLOW_ACTIONS,
  nest1: {
    ...SHALLOW_ACTIONS,
    nest2: {
      ...SHALLOW_ACTIONS,
    }
  }
}

describe('chatCommandFactory', () => {
  it('returns a function', () => {
    expect(chatCommandFactory(NAMESPACE, ACTIONS)).toBeInstanceOf(Function)
  })

  it('treats an empty string as a "global" namespace', () => {
    const { parse } = chatCommandFactory('', ACTIONS)

    expect(parse('foo')).toEqual(['foo'])
    expect(parse('abcd singleArgumentOutput(a  b  c   d) efgh')).toEqual(['abcd', 'singleArgumentOutput(a  b  c   d)', 'efgh'])
  })

  describe('overrides', () => {
    const { execute } = chatCommandFactory(NAMESPACE, ACTIONS, {delimiter: '-', argumentDelimiter: '~'})

    it('respects delimiter override', () => {
      expect(execute('nest1-nest2-singleArgumentOutput(foo)')).toBe('singleArgumentOutput: foo')
    })

    it('respects argumentDelimiter override', () => {
      expect(execute('nest1-nest2-multiArgumentOutput(foo~bar~baz)')).toBe('multiArgumentOutput: foo - bar - baz')
    })

    it('respects includeLeadingDelimiter override', () => {
      const { parse } = chatCommandFactory('/', ACTIONS, {includeLeadingDelimiter: false})

      expect(parse('abcd /help efghi //help!')).toEqual(['help', '/help!'])
    })
  })
})

describe('chatCommand', () => {
  const ChatCommand = chatCommandFactory(NAMESPACE, ACTIONS)

  it('is a proxy for parseAndExecuteAll', () => {
    const commands = 'TEST.stringOutput TEST.promiseOutput'
    expect(ChatCommand(commands)).toEqual(ChatCommand.parseAndExecuteAll(commands))
  })

  describe('parse', () => {
    const { parse } = ChatCommand

    it('returns an empty array if no valid commands exist', () => {
      expect(parse('foo')).toEqual([])
    })

    it('parses a single command', () => {
      expect(parse('abc TEST.foo defg')).toEqual(['foo'])
    })

    it('parses a compound command', () => {
      expect(parse('abcd TEST.foo.bar.baz efgh')).toEqual(['foo.bar.baz'])
    })

    it('parses multiple commands', () => {
      expect(parse('abcd TEST.foo efg TEST.bar TEST.baz hijk')).toEqual(['foo', 'bar', 'baz'])
    })

    it('parses commands containing namespace', () => {
      expect(parse('abcd TEST.fooTEST.bar efgh TEST.foo.TEST.bar')).toEqual(['fooTEST.bar', 'foo.TEST.bar'])
    })

    it('parses all commands in multiline strings', () => {
      expect(parse('TEST.foo\nTEST.bar\nabcdefgTEST.baz\n   TEST.quxTEST.alsoQux'))
        .toEqual(['foo', 'bar', 'baz', 'quxTEST.alsoQux'])
    })

    it('respects the delimiter', () => {
      expect(parse('TEST.foo TESTabar TEST_baz')).toEqual(['foo'])
    })

    it('allows arguments to contain arbitrary break characters', () => {
      expect(parse('abcd TEST.singleArgumentOutput(a  b  c   d) efgh')).toEqual(['singleArgumentOutput(a  b  c   d)'])
    })
  })

  describe('execute', () => {
    const { execute } = ChatCommand

    it('returns undefined for a command that does not exist in actions', () => {
      expect(execute('deep.non.existant.command')).toBe(undefined)
    })

    it('returns undefined for malformed commands (ex: calling an action that is not a function)', () => {
      expect(execute('thisWouldBe(bad)')).toBe(undefined)
    })

    it('handles static outputs', () => {
      expect(execute('staticOutput')).toBe('staticOutput')
    })

    it('handles functions without arguments', () => {
      expect(execute('stringOutput')).toBe('stringOutput')
    })

    it('handles functions with a single argument', () => {
      expect(execute('singleArgumentOutput(test!!123)')).toBe('singleArgumentOutput: test!!123')
    })

    it('handles functions with multiple arguments', () => {
      expect(execute('multiArgumentOutput(a,b,c)')).toBe('multiArgumentOutput: a - b - c')
    })

    it('allows arguments to contain arbitrary break characters', () => {
      expect(execute('singleArgumentOutput(a  b  c   d)')).toEqual('singleArgumentOutput: a  b  c   d')
    })

    it('respects default argument delimiter for functions with multiple arguments', () => {
      expect(execute('multiArgumentOutput(a, b,c)')).toBe('multiArgumentOutput: a - b - c')
    })

    it('treats nested parens as part of the input', () => {
      expect(execute('singleArgumentOutput((x))')).toBe('singleArgumentOutput: (x)')
    })

    it('DOES NOT respect keys containing parens', () => {
      expect(execute('dangerous(Parens()Key(notTheArg)(theArg)')).toBe(undefined)
    })

    it('allows delimiter colliding keys', () => {
      expect(execute('..delimiter.colliding..Key.')).toBe('delimiterCollidingKey')
    })

    it('handles nested outputs', () => {
      expect(execute('nest1.nest2.stringOutput')).toBe('stringOutput')
    })
  })

  describe('executeAll', () => {
    const { execute, executeAll } = ChatCommand
    const commands = ['stringOutput', 'nest1.getterOutput']

    it('is the composition map(execute)(x)', () => {
      expect(executeAll(commands)).toEqual(commands.map(execute))
    })
  })

  describe('parseAndExecuteAll', () => {
    const { parse, executeAll, parseAndExecuteAll } = ChatCommand
    const text = 'abc stringOutput def nest1.getterOutput'
    it('is the composition (executeAll * parse)(x)', () => {
      expect(parseAndExecuteAll(text)).toEqual(executeAll(parse(text)))
    })

    it('handles multiline multiargument function execution', () => {
      const chatCommand = chatCommandFactory('math', {
        abs (a) {
          return Math.abs(Number(a))
        },
        add (a, b) {
          return Number(a) + Number(b)
        },
      })

      expect(chatCommand(`
        I'm too tired to do math
        math.add(1, 2)
        math.abs(-10)
      `)).toEqual([3, 10])
    })
  })
})

describe('README', () => {
  test('Example 0 (Setup)', () => {
    const chatCommand = chatCommandFactory('bot', {
      hello: 'hello',
      goodbye: () => 'goodbye'
    })

    expect(chatCommand('bot.hello bot.goodbye')).toEqual(['hello', 'goodbye'])
  })

  test('Example 1 (math)', () => {
    const chatCommand = chatCommandFactory('math', {
      abs (a) {
        return Math.abs(Number(a))
      },
      add (a, b) {
        return Number(a) + Number(b)
      },
    })

    expect(chatCommand(`
      I'm too tired to do math
      math.add(1,2)
      math.abs(-10)
    `)).toEqual([3, 10])
  })

  test('Example 1.1 (native Math)', () => {
    const nativeMathParser = chatCommandFactory('Math', Math)

    expect(nativeMathParser(`
      Math.min(1,2)
      Math.max(1,2)
      Math.abs(-10)
      Math.PI
    `)).toEqual([1, 2, 10, 3.141592653589793])
  })

  test('Example 2 (game)', () => {
    const players = []
    const chatCommand = chatCommandFactory('game', {
      players: {
        add (name) {
          players.push(name)
          return `Added ${name}`
        }
      },
      fight () {
        return `${players.join(' and ')} are fighting!`
      }
    })

    expect(chatCommand(`
      game.players.add(Bob)
      game.players.add(Bill)
      game.fight
    `)).toEqual(['Added Bob', 'Added Bill', 'Bob and Bill are fighting!'])
  })

  test('Example 4 (overrides)', () => {
    const chatCommand = chatCommandFactory('', {
      i: { love: { tildes: 'Me too!' } },
      andAmpersands (a, b, c) {
        return a + b + c
      }
    }, {
      delimiter: '~', // default: '.'
      argumentDelimiter: '&' // default: /, ?/
    })

    expect(chatCommand('i~love~tildes andAmpersands(a&b&c)')).toEqual(['Me too!', 'abc'])
  })

  test('Example 4.1 (includeLeadingDelimiter override)', () => {
    const slashCommand = chatCommandFactory('/', {
      help () {
        return 'I can try...'
      }
    }, {
      includeLeadingDelimiter: false
    })

    expect(slashCommand('/help')).toEqual(['I can try...'])
  })

  test('Example 5 (helpers)', () => {
    const { parse, execute } = chatCommandFactory('bot', {
      doThis: 'ok',
      dontDoThis: () => { throw Error('Bad') }
    })

    expect(parse('bot.doThis bot.dontDoThis')
      .filter(command => command !== 'dontDoThis')
      .map(execute)).toEqual(['ok'])
    // ['ok']

    expect(execute('doThis')).toBe('ok')
    // 'ok'
  })
})
