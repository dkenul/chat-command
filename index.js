const DEFAULTS = {
  delimiter: '.',
  argumentDelimiter: /, ?/,
}
const isFunction = f => typeof f === 'function'
const isPromise = p => p instanceof Promise
const isAnyObject = o => o instanceof Object
const isDefined = x => x != null
const flattenObject = (obj, delimiter, prefix = '') =>
  Object.keys(obj).reduce((result, key) => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key)

    if (descriptor.hasOwnProperty('value')) {
      const { value } = descriptor

      if (isFunction(value) || isPromise(value) || !isAnyObject(value)) {
        result[prefix + key] = value

        return result
      }

      return Object.assign(result, flattenObject(value, delimiter, prefix + key + delimiter))
    }

    return Object.defineProperty(result, key, descriptor)
  }, {})

function chatCommandFactory (namespace, actions, overrides) {
  const { delimiter, argumentDelimiter } = {...DEFAULTS, ...overrides}
  const flatActions = flattenObject(actions, delimiter)
  const maybeDelimitedNamespace = namespace ? `${namespace}\\${delimiter}` : ''
  const parse = text => {
    const commands = []
    if (!text.includes(namespace)) return commands

    text.replace(new RegExp(`(?:\\b${maybeDelimitedNamespace})([^\\n ]+)`, 'gm'), (_, cmd) => { commands.push(cmd)})
    return commands
  }
  const execute = command => {
    const arg = command.replace(/^[^(]*\((.*)\)$/, '$1')

    const value = flatActions[arg ? command.split('(')[0] : command]
    if (!isFunction(value)) return value

    return arg ? value(...arg.split(argumentDelimiter)) : value()
  }
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
