const DEFAULTS = {
  delimiter: '.',
  argumentDelimiter: /, ?/,
  includeLeadingDelimiter: true,
}
const isFunction = f => typeof f === 'function'
const isPromise = p => p instanceof Promise
const isAnyObject = o => o instanceof Object
const flattenObject = (obj, delimiter, prefix = '') =>
  Object.getOwnPropertyNames(obj).reduce((result, key) => {
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
  const { delimiter, argumentDelimiter, includeLeadingDelimiter } = {...DEFAULTS, ...overrides}
  const flatActions = flattenObject(actions, delimiter)
  const maybeDelimitedNamespace = (
    (namespace && includeLeadingDelimiter) ? namespace + delimiter :
    namespace ? namespace :
    ''
  )
  const couldMatchNamespace = str => {
    for (let i = 0; i < str.length; i++) {
      if (str[i] !== maybeDelimitedNamespace[i]) return false
    }
    return true
  }

  const parse = text => {
    const commands = []

    let isCommand = !maybeDelimitedNamespace
    let isReadingArguments = false
    let substr = ''
    const addCommand = () => {
      commands.push(substr)
      substr = ''
      isCommand = !maybeDelimitedNamespace
      isReadingArguments = false
    }
    const isBreakChar = char =>  (/[\n ]/.test(char) || char == null)
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (isCommand) {
        if (!isBreakChar(char) || isReadingArguments) {
          substr += char
        }
        if (char === '(') {
          isReadingArguments = true
        } else if (isBreakChar(nextChar) && (!isReadingArguments || char === ')')) {
          addCommand()
        }
      } else if (substr === maybeDelimitedNamespace) {
        isCommand = true
        substr = char
      } else if (couldMatchNamespace(substr + char)) {
        substr += char
      } else if (couldMatchNamespace(char)) {
        substr = char
      } else {
        substr = ''
      }
    }

    if (substr && isCommand && !isReadingArguments) {
      addCommand(substr)
    }

    return commands
  }
  const execute = command => {
    const arg = command.replace(/^[^(]*\((.*)\)$/, '$1')
    const value = flatActions[arg ? command.split('(')[0] : command]

    if (!isFunction(value)) return value

    return arg ? value(...arg.split(argumentDelimiter)) : value()
  }
  const executeAll = commands => commands.map(execute)
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
