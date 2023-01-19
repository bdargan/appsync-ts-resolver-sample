import { Context } from '@aws-appsync/utils'
import { util } from '@aws-appsync/utils'

type Demo = {
  id: string
  name: string
}

export function request(ctx: Context) {
  console.log('Hello from TS resolver')
  const id = util.autoId()
  console.log('generated id', id)
  const emptyResponse = { demos: [{ id: 'demo1', version: '0' }] }
  return {
    payload: emptyResponse,
    version: '2017-02-28'
  }
}

export function response(ctx: Context) {
  console.log('TS resolver request')
  return ctx.result
}
