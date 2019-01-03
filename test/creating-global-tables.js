'use strict';

const CreateDynamoDBGlobalTables = require('../src/index.js');
const AWSMock = require('aws-sdk-mock');
require('chai').should();

describe('Creating a global dynamodb tables', () => {
  let serverless, options, plugin;

  describe.only('when the stack does not contain any dynamodb tables', () => {

    const createdGlobalTables = [];
    const addedReplicas = [];
    before(async () => {
      serverless = given_a_serverless_stack_without_any_tables();
      AWSMock.mock('DynamoDB', 'createGlobalTable', params => createdGlobalTables.push(params));
      AWSMock.mock('DynamoDB', 'updateGlobalTable', params => addedReplicas.push(params));
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    it('does not create any global tables', () => {
      createdGlobalTables.should.be.empty;
    });

    it('does not add any replicas', () => {
      addedReplicas.should.be.empty;
    });
  });

  describe('when the stack contains some dynamodb tables', () => {

    before(() => {
      serverless = given_a_serverless_stack_with_some_tables();

      plugin = new CreateDynamoDBGlobalTables(serverless);
    });

    it('enables them in the plugin', () => {

    });
  });

  describe('when the dynamodb global table already exists', () => {

    before(() => {
      serverless = given_a_serverless_stack_with_some_tables();
      serverless.service.custom.apiGatewayCloudWatchSettings = { metricsEnabled: false };

      plugin = new CreateDynamoDBGlobalTables(serverless);
    });

    it('disables them in the plugin', () => {
      expect(plugin.metricsEnabled).to.be.false;
    });
  });

  describe('when the replication group already exists', () => {

    before(() => {

      serverless = given_a_serverless_stack_with_some_tables();
      serverless.service.custom.apiGatewayCloudWatchSettings = { metricsEnabled: true };
      options = { stage: 'test', region: 'us-east-1' };

      plugin = new CreateDynamoDBGlobalTables(serverless, options);
    });

    it('uses the stage option', () => {
      expect(plugin.stage).to.equal(options.stage);
    });

    it('not use the provider stage', () => {
      expect(plugin.stage).to.not.equal(serverless.service.provider.stage);
    });

    it('uses the region option', () => {
      expect(plugin.region).to.equal(options.region);
    });

    it('not use the provider region', () => {
      expect(plugin.region).to.not.equal(serverless.service.provider.region);
    });
  });
});

const given_a_serverless_stack_without_any_tables = () => ({
  getProvider: () => ({ getRegion: () => 'eu-west-2' }),
  service: {
    resources: {
      Resources: {
        Type: 'AWS::SomeService::NotATable'
      }
    }
  }
});

const given_a_serverless_stack_with_some_tables = () => ({
  getProvider: () => ({ getRegion: () => 'eu-west-2' }),
  service: {
    resources: {
      Resources: {
        'table-one': {
          TableName: 'table-one',
          Type: 'AWS::DynamoDB::Table'
        },
        'table-two': {
          TableName: 'table-two',
          Type: 'AWS::DynamoDB::Table'
        }
      }
    }
  }
});