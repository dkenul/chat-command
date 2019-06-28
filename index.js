const isPromise = p => p instanceof Promise
const isString = s => typeof s === 'string'
const isFunction = f => typeof f === 'function'

function chatCommandFactory (namespace, actions) {
  const parse = text => {
    const commands = []
    text.replace(new RegExp(`(?:\\b${namespace}\\.)([^\\n ]*)`, 'gm'), (_, cmd) => {
      commands.push(cmd)
    })
    return commands
  }

  const execute = command => command
    .split('.')
    .reduce((context, subcommand) => {
      if (isString(context) || isPromise(context)) return context

      if (subcommand.includes('(')) {
        const arg = subcommand.replace(/^.*\(([^()]*)\).*$/, '$1')
        const action = context[subcommand.split('(')[0]]

        return action(arg)
      } else {
        const action = context[subcommand]

        return isFunction(action) ? action() : action
      }
    }, actions)

  const executeAll = commands => Promise.all(commands.map(execute))
  const parseAndExecuteAll = text => executeAll(parse(text))

  function ChatCommand (text) {
    return parseAndExecuteAll(text)
  }

  ChatCommand.parse = parse
  ChatCommand.execute = execute
  ChatCommand.executeAll = executeAll
  ChatCommand.parseAndExecuteAll = parseAndExecuteAll

  return ChatCommand
}

module.exports = chatCommandFactory
