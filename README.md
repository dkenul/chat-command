# Chat Command

Parse and execute commands from text based on supplied commands and namespace. This is intended to be consumed by anything that might want to run arbitrary commands (and provide output) based on text.

## Sample Usage

```js
const namespace = 'BOT'
const actions = {
  sayHello () {
    return 'Hello World'
  },
  sayHelloAsync () {
    return Promise.resolve('Hello Again World')
  }
}

const ChatCommand = require('chat-command')(namespace, actions)

// on receiving text
ChatCommand(text)
  .then(results => {
    // results => ['Hello World', 'Hello Again World']
  })
```
