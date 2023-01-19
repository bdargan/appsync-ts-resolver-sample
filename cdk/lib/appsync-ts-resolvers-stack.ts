import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as appsync from '@aws-cdk/aws-appsync-alpha'
import * as path from 'path'
import { CfnFunctionConfiguration } from 'aws-cdk-lib/aws-appsync'
import * as fs from 'fs'

export interface AppsyncTsResolversStackProps extends cdk.StackProps {
  readonly schemaPath: string // path to schema file '../../shared/schema.graphql'
  readonly pipelineFnPath: string // ./src/js/mappings/pipeline.js // pipeline path
  readonly jsFnPath: string // ./src/js/mappings/getDemosJS.js
  readonly tsFnPath: string // ./src/ts/mappings/getDemosTS.ts
}

export class AppsyncTsResolversStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AppsyncTsResolversStackProps) {
    super(scope, id, props)
    const { schemaPath, jsFnPath, pipelineFnPath, tsFnPath } = props ?? {}
    if (!schemaPath || !jsFnPath || !pipelineFnPath || !tsFnPath) {
      throw new Error('schemaPath and jsFnPath and pipelineFnPath and tsFnPath are required')
    }

    const api = new appsync.GraphqlApi(this, 'Api', {
      name: 'appsync-ts-demo-api',
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, schemaPath)),
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM
          // apiKeyConfig: {
          //   expires: cdk.Expiration.after(cdk.Duration.days(35))
          // }
        }
      }
    })

    const staticResponse: string = `$util.toJson({ "demos": [{}] })`
    // JSON.stringify({
    //   demos: [
    //     {
    //       id: '1',
    //       name: 'demo1'
    //     },
    //     { id: '2', name: 'demo2' }
    //   ]
    // })

    const localDataSource = api.addNoneDataSource('NoneDataSource')

    const demosResolver = new appsync.Resolver(this, 'demoResolver', {
      api,
      typeName: 'Query',
      fieldName: 'getDemos',
      dataSource: localDataSource,
      requestMappingTemplate: appsync.MappingTemplate.fromString(`{
        "payload": ${staticResponse},
        "version": "2017-02-28",
      }`),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`$util.toJson($context.result)`)
    })

    const demoJSFn = new appsync.AppsyncFunction(this, 'demoJSFnResolver', {
      api,
      name: 'demoJSResolver',
      dataSource: localDataSource
    })

    const cfnDemoJSFn = demoJSFn.node.defaultChild as CfnFunctionConfiguration
    cfnDemoJSFn.runtime = { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' }
    cfnDemoJSFn.code = fs.readFileSync(jsFnPath, 'utf-8')

    const demosJSResolver = new appsync.Resolver(this, 'demoJSResolver', {
      api,
      typeName: 'Query',
      fieldName: 'getDemosJS',
      pipelineConfig: [demoJSFn]
    })

    const cfnDemoJSResolver = demosJSResolver.node.defaultChild as CfnFunctionConfiguration
    cfnDemoJSResolver.runtime = { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' }
    cfnDemoJSResolver.code = fs.readFileSync(pipelineFnPath, 'utf-8')

    demosJSResolver.node.addDependency(demoJSFn)

    //TS

    const demoTSFn = new appsync.AppsyncFunction(this, 'demoTSFnResolver', {
      api,
      name: 'demoTSResolver',
      dataSource: localDataSource
    })

    const cfnDemoTSFn = demoTSFn.node.defaultChild as CfnFunctionConfiguration
    cfnDemoTSFn.runtime = { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' }
    cfnDemoTSFn.code = fs.readFileSync(tsFnPath, 'utf-8')

    const demosTSResolver = new appsync.Resolver(this, 'demoTSResolver', {
      api,
      typeName: 'Query',
      fieldName: 'getDemosTS',
      pipelineConfig: [demoTSFn]
    })

    const cfnDemoTSResolver = demosTSResolver.node.defaultChild as CfnFunctionConfiguration
    cfnDemoTSResolver.runtime = { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' }
    cfnDemoTSResolver.code = fs.readFileSync(pipelineFnPath, 'utf-8')

    demosTSResolver.node.addDependency(demoTSFn)

    //
    new cdk.CfnOutput(this, 'url', {
      value: api.graphqlUrl || ''
    })
  }
}
