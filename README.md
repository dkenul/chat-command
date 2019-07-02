# Chat Command

Parse and execute commands from text in a flexible and configurable way. This is intended to be consumed by anything that might want to run arbitrary commands (and provide output) based on text.

_(currently) only intended for use in a Node environment._

- [Setup](#installation)
- [Examples](#examples)


## Setup

```sh
npm install -S chat-command
```

```js
/**
 * The default export is a higher order function  that should be
 * called with (namespace<string>, actions<object>, overrides<object?>)
 * This will return a function that executes commands from text
 * based on the initialization parameters
 */
const chatCommand = require('chat-command')('bot', {
  hello: 'hello',
  goodbye: () => 'goodbye'
})

chatCommand('bot.hello bot.goodbye')
// ['hello', 'goodbye']
```

## Examples

Call actions with arguments
```js
const chatCommandFactory = require('chat-command')

const customMathParser = chatCommandFactory('math', {
  abs (a) {
    return Math.abs(Number(a))
  },
  add (a, b) {
    return Number(a) + Number(b)
  },
})

customMathParser(`
  I'm too tired to do math
  math.add(1,2)
  math.abs(-10)
`)
// [3, 10]

// You can even use native objects if you're especially adventurous
const nativeMathParser = chatCommandFactory('Math', Math)

nativeMathParser(`
  Math.min(1,2)
  Math.max(1,2)
  Math.abs(-10)
  Math.PI
`)
// [1, 2, 10, 3.141592653589793]
```

Nest actions to create logical command structures
```js
const players = []
const chatCommand = require('chat-command')('game', {
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

chatCommand(`
  game.players.add(Bob)
  game.players.add(Bill)
  game.fight
`)
// ['Added Bob', 'Added Bill', 'Bob and Bill are fighting!']
```

Handle asynchronous actions
```js
const Database = require('...')
const chatCommand = require('chat-command')('db', {
  todos: {
    add (todo) {
      return new Promise((resolve) => {
        Database.insert(todo, () => {
          resolve('Added: ${todo}')
        })
      })
    }
  }
})

Promise.all(chatCommand('db.todos.add(Buy Groceries)'))
  .then(results => {
    results
    // ['Added: Buy Groceries']
  })
```

Override default parsing behavior and/or exclude namespace
```js
const chatCommandFactory = require('chat-command')

const tildeCommand = ('', {
  i: { love: { tildes: 'Me too!' } },
  andAmpersands (a, b, c) {
    return a + b + c
  }
}, {
  delimiter: '~', // default: '.'
  argumentDelimiter: '&' // default: /, ?/
})

tildeCommand('i~love~tildes andAmpersands(a&b&c)')
// ['Me too!', 'abc']

const slashCommand = chatCommandFactory('/', {
  help () {
    return 'I can try...'
  }
}, {
  includeLeadingDelimiter: false
})

slashCommand('/help')
// ['I can try...']
```

The logic is composed of helpers `parse` and `execute` which may also be accessed separately for more granular control
```js
const { parse, execute } = require('chat-command')('bot', {
  doThis: 'ok',
  dontDoThis: () => { throw Error('Bad') }
})

parse('bot.doThis bot.dontDoThis')
  .filter(command => command !== 'dontDoThis')
  .map(execute)
// ['ok']

execute('doThis')
// 'ok'
```
