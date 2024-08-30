import { sayHello } from '.'

describe('example test', () => {
  it('should work', () => {
    const result = sayHello()
    expect(result).toEqual('Hello world')
  })
})
