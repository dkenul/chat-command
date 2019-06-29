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
      expect(parse('TEST.foo\nTEST.bar\nabcdefgTEST.bad\n   TEST.baz')).toEqual(['foo', 'bar', 'baz'])
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

    it('handles nested outputs', () => {
      expect(execute('nest1.nest2.stringOutput')).toBe('stringOutput')
    })
  })
})
