const chatCommandFactory = require('../index.js')
const NAMESPACE = 'TEST'
const ACTIONS = {
  stringOutput () {
    return 'OUTPUT A'
  },
  promiseOutput () {
    return Promise.resolve('OUTPUT B')
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
})
