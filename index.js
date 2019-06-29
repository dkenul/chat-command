const isPromise = p => p instanceof Promise
const isString = s => typeof s === 'string'
const isFunction = f => typeof f === 'function'
const isAnyObject = o => o instanceof Object
const isDefined = x => x != null

const delimiter = '.'
function flattenObject (obj, prefix = '') {
  return Object.keys(obj).reduce((result, key) => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key)

    if (descriptor.hasOwnProperty('value')) {
      const { value } = descriptor

      if (isFunction(value) || isPromise(value) || !isAnyObject(value)) {
        result[prefix + key] = value

        return result
      }

      return Object.assign(result, flattenObject(value, prefix + key + delimiter))
    }

    return Object.defineProperty(result, key, descriptor)
  }, {})
}

function chatCommandFactory (namespace, actions) {
  const flatActions = flattenObject(actions)
  const parse = text => {
    const commands = []
    if (!text.includes(namespace)) return commands
    text.replace(new RegExp(`(?:\\b${namespace}\\.)([^\\n ]*)`, 'gm'), (_, cmd) => { commands.push(cmd)})
    return commands
  }
  const execute = command => {
    const hasArgs = command.includes('(')
    const value = flatActions[hasArgs ? command.split('(')[0] : command]
    if (!isFunction(value)) return value

    return hasArgs ? value(command.replace(/^.*\(([^()]*)\).*$/, '$1')) : value()
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
